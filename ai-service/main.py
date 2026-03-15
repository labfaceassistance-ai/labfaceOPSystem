import os

# Set OpenCV FFMPEG options for low latency RTSP
os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = "rtsp_transport;tcp|fflags;nobuffer|flags;low_delay"

import logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

from fastapi import FastAPI, UploadFile, File, BackgroundTasks
from fastapi.responses import StreamingResponse
import io
from core.face_recognition import FaceRecognizer
from core.attendance_logic import AttendanceManager

# Optional imports for enhanced recognition (Phase 2-3)
# These require additional dependencies (torch, gfpgan, etc.)
try:
    from core.face_enhancer import get_face_enhancer
    from core.face_tracker import get_tracker
    ENHANCEMENTS_AVAILABLE = True
    print("✅ Enhancement modules loaded (GFPGAN + Tracking)")
except ImportError as e:
    print(f"⚠️ Enhancement modules not available: {e}")
    print("   Service will run in standard mode. Install dependencies: pip install gfpgan realesrgan facexlib basicsr torch")
    ENHANCEMENTS_AVAILABLE = False
    # Create dummy functions to avoid errors
    def get_face_enhancer(use_gpu=False):
        return None
    def get_tracker(camera_id):
        return None

import uvicorn
import cv2
import requests
import asyncio
import numpy as np
import aiomysql
import json
import time
from datetime import datetime
from minio import Minio
from minio.error import S3Error
from routes import face_routes

app = FastAPI()
app.include_router(face_routes.router, prefix="/api")
face_recognizer = None
attendance_manager = None
db_pool = None
minio_client = None
face_enhancer = None  # GFPGAN super-resolution

# Configuration
TEST_MODE = os.getenv("TEST_MODE", "false").lower() == "true"  # Enable test pattern for debugging
print(f"🔧 DEBUG: TEST_MODE env var = '{os.getenv('TEST_MODE', 'NOT_SET')}'")
print(f"🔧 DEBUG: TEST_MODE enabled = {TEST_MODE}")
RTSP_URL_1 = os.getenv("RTSP_URL_1", "rtsp://admin:glason27@192.168.1.220:554/cam/realmonitor?channel=1&subtype=1")
RTSP_URL_2 = os.getenv("RTSP_URL_2", "rtsp://admin:glason27@192.168.1.220:554/cam/realmonitor?channel=2&subtype=1")

BACKEND_URL = os.getenv("BACKEND_URL", "http://backend:5000")
DB_HOST = os.getenv("DB_HOST", "mariadb")
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "root")
DB_NAME = os.getenv("DB_NAME", "labface")

# Recognition threshold (higher = more lenient, better for distance/angles)
# Increased to 0.55 for far-distance recognition
FACE_THRESHOLD = float(os.getenv("FACE_RECOGNITION_THRESHOLD", "0.55"))

should_run = True

# Thread-safe(ish) shared state for Capture vs AI loops
latest_frames = {}           # { camera_id: np.array_frame }
latest_bytes = {}            # { camera_id: bytes_jpeg }
current_detections = {}      # { camera_id: [ {bbox, label, color} ] }
camera_status = {}           # { camera_id: bool }
unknown_log_cooldowns = {}   # { camera_id: timestamp }

# Database connection pool
async def init_db_pool():
    global db_pool
    try:
        db_pool = await aiomysql.create_pool(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            db=DB_NAME,
            autocommit=True,
            maxsize=10
        )
        print("Database pool initialized")
    except Exception as e:
        print(f"Database pool init error: {e}")

# MinIO client
def init_minio():
    global minio_client
    try:
        minio_endpoint = os.getenv("MINIO_ENDPOINT", "minio")
        minio_port = os.getenv("MINIO_PORT", "9000")
        
        # Ensure endpoint includes port if separated
        if ":" not in minio_endpoint:
            full_endpoint = f"{minio_endpoint}:{minio_port}"
        else:
            full_endpoint = minio_endpoint

        print(f"Initializing MinIO with endpoint: {full_endpoint}")
        minio_client = Minio(
            full_endpoint,
            access_key=os.getenv("MINIO_ACCESS_KEY", "minioadmin"),
            secret_key=os.getenv("MINIO_SECRET_KEY", "minioadmin"),
            secure=False
        )
        # Check for labface-snapshots bucket (created by docker-compose)
        if not minio_client.bucket_exists("labface-snapshots"):
            minio_client.make_bucket("labface-snapshots")
        print("MinIO client initialized")
    except Exception as e:
        print(f"MinIO initialization error: {e}")

@app.on_event("startup")
async def startup_event():
    print("=== Starting LabFace AI Service (Optimized) ===")
    async def load_and_start():
        global face_recognizer, attendance_manager, face_enhancer
        
        # 1. Init Infrastructure
        await init_db_pool()
        await asyncio.get_event_loop().run_in_executor(None, init_minio)
        
        # 2. Load Models
        try:
            print("Loading AI models (High Performance Mode)...")
            # Force using the Large model (buffalo_l) for maximum accuracy
            # wild_card=0 means use GPU (if available) or CPU
            face_recognizer = await asyncio.get_event_loop().run_in_executor(
                None, 
                lambda: FaceRecognizer(use_antelopev2=False) 
            )
            app.state.face_recognizer = face_recognizer
            attendance_manager = await asyncio.get_event_loop().run_in_executor(None, AttendanceManager)
            print("✓ Models loaded: Buffalo_L (Compatibility Mode)")
            
            # 3. Initialize GFPGAN Face Enhancer (Phase 2) - if available
            if ENHANCEMENTS_AVAILABLE:
                print("Initializing GFPGAN face enhancer...")
                face_enhancer = get_face_enhancer(use_gpu=False)  # Set True if GPU available
                if face_enhancer and face_enhancer.is_available():
                    print("✅ GFPGAN super-resolution enabled - Far-distance recognition active!")
                else:
                    print("⚠️ GFPGAN not available, using standard detection")
            else:
                print("⚠️ Enhancement modules not loaded, using standard detection")
                face_enhancer = None
                
        except Exception as e:
            print(f"Model loading error: {e}")
            print("⚠️  WARNING: AI models failed to load, but continuing with video streaming...")
            # Don't return - allow capture workers to start even without models

        # 3. Start Separate Loops
        # Capture Loops (One per camera)
        print("🚀 Starting capture workers...")
        asyncio.create_task(capture_worker(RTSP_URL_1, 1))
        asyncio.create_task(capture_worker(RTSP_URL_2, 2))
        
        # AI Processing Loop (Single unified loop or per cam - unified is better for resource control)
        asyncio.create_task(ai_worker())
        
        print("✓ Capture and AI Workers started")

    asyncio.create_task(load_and_start())

# --- WORKERS ---

async def capture_worker(rtsp_url, camera_id):
    """
    Dedicated worker to read frames and update stream cache.
    NO AI blocking here.
    """
    print(f"Starting Capture Worker for CAM {camera_id}")
    loop = asyncio.get_event_loop()
    cap = None
    
    # TEST MODE: Generate test pattern instead of RTSP
    if TEST_MODE:
        print(f"⚠️  TEST MODE ENABLED for CAM {camera_id} - Using test pattern")
        frame_count = 0
        while should_run:
            # Generate test pattern
            test_frame = np.zeros((480, 854, 3), dtype=np.uint8)
            for i in range(480):
                color_val = int((i / 480) * 255)
                test_frame[i, :] = [color_val, 100, 255 - color_val]
            
            cv2.putText(test_frame, f"TEST CAM {camera_id}", (50, 100), 
                       cv2.FONT_HERSHEY_SIMPLEX, 1.5, (255, 255, 255), 3)
            cv2.putText(test_frame, f"Frame: {frame_count}", (50, 200), 
                       cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
            
            x_pos = int((frame_count % 100) * 7.54)
            cv2.rectangle(test_frame, (x_pos, 300), (x_pos + 100, 400), (0, 255, 0), -1)
            
            latest_frames[camera_id] = test_frame
            camera_status[camera_id] = True
            
            ret, buffer = cv2.imencode('.jpg', test_frame, [int(cv2.IMWRITE_JPEG_QUALITY), 75])
            if ret:
                latest_bytes[camera_id] = buffer.tobytes()
            
            frame_count += 1
            await asyncio.sleep(0.033)
        return
    
    # NORMAL MODE: RTSP Stream
    while should_run:
        # Reconnection Logic
        if cap is None or not cap.isOpened():
            try:
                print(f"[CAM {camera_id}] Connecting to: {rtsp_url}")
                cap = await loop.run_in_executor(None, cv2.VideoCapture, rtsp_url)
                # Optimize buffer
                await loop.run_in_executor(None, cap.set, cv2.CAP_PROP_BUFFERSIZE, 1)
                
                if cap.isOpened():
                    camera_status[camera_id] = True
                    print(f"✅ CAM {camera_id} Connected")
                else:
                    camera_status[camera_id] = False
                    print(f"❌ CAM {camera_id} Failed to open")
                    await asyncio.sleep(5)
                    continue
            except Exception as e:
                camera_status[camera_id] = False
                print(f"❌ CAM {camera_id} Exception: {e}")
                await asyncio.sleep(5)
                continue

        # Read Frame
        ret, frame = await loop.run_in_executor(None, cap.read)
        if not ret:
            print(f"CAM {camera_id} Reading Error")
            camera_status[camera_id] = False
            cap.release()
            cap = None
            await asyncio.sleep(1)
            continue
            
        # FPS CAPPING: Only process for stream at ~15 FPS to save CPU
        # AI will still use latest_frames at its own pace
        now = time.time()
        last_time = getattr(capture_worker, f'_last_time_{camera_id}', 0)
        if now - last_time < 0.066: # ~15 FPS cap for encoding
            # Still update latest_frames for AI to have freshest data
            try:
                latest_frames[camera_id] = cv2.resize(frame, (1280, 720))
            except:
                latest_frames[camera_id] = frame
            await asyncio.sleep(0.01)
            continue
        
        setattr(capture_worker, f'_last_time_{camera_id}', now)

        # Resize for display/AI consistency 
        # Upgraded to 720p (1280x720) for better far-distance detail
        try:
            processed_frame = cv2.resize(frame, (1280, 720))
        except:
            processed_frame = frame

        # Update Latest Frame (Atomic assignment)
        latest_frames[camera_id] = processed_frame
        camera_status[camera_id] = True # Keep it True as long as we are reading!

        # --- DRAW & ENCODE FOR STREAM ---
        # Draw stale detections from AI worker
        display_frame = processed_frame.copy()
        detections = current_detections.get(camera_id, [])
        
        for det in detections:
            try:
                x, y, w, h = det['bbox']
                color = det['color']
                label = det['label']
                cv2.rectangle(display_frame, (x, y), (x+w, y+h), color, 2)
                cv2.rectangle(display_frame, (x, y-30), (x+w, y), color, -1)
                cv2.putText(display_frame, label, (x+5, y-5), 
                           cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
            except:
                pass

        # Encode (Heavyish op, but better than AI)
        # Lower quality from 65 to 55 for better streaming performance
        ret, buffer = cv2.imencode('.jpg', display_frame, [int(cv2.IMWRITE_JPEG_QUALITY), 55])
        if ret:
            latest_bytes[camera_id] = buffer.tobytes()

        # Yield to event loop slightly to allow other tasks
        await asyncio.sleep(0.005) # ~200fps theoretical max, regulated by cap.read speed


async def ai_worker():
    """
    Simplified AI Worker for debugging and stability.
    """
    print("🚀 Starting SIMPLIFIED AI Worker...")
    loop = asyncio.get_event_loop()
    
    # State validation
    while should_run:
        if face_recognizer is None or db_pool is None:
            await asyncio.sleep(1)
            continue
            
        start_time = time.time()
        
        # Refresh students cache occasionally
        await refresh_student_cache_if_needed()
        
        # Process Camera 1 then Camera 2
        for camera_id in [1, 2]:
            frame = latest_frames.get(camera_id)
            if frame is None:
                continue
                
            try:
                # Basic Single-scale detection
                faces = await loop.run_in_executor(None, face_recognizer.app.get, frame)
                
                if len(faces) > 0:
                    print(f"[AI CAM {camera_id}] 🔍 Detected {len(faces)} faces")
                
                new_detections = []
                for face in faces:
                    # Direct recognition
                    detection_data = await process_face(face, camera_id, frame)
                    if detection_data:
                        new_detections.append(detection_data)
                
                # Update shared state for overlay
                current_detections[camera_id] = new_detections
                
            except Exception as e:
                print(f"AI Worker Error Cam {camera_id}: {e}")
                import traceback
                traceback.print_exc()
        
        # Cleanup Logic
        if attendance_manager:
            attendance_manager.cleanup()
            
        # Regulate AI FPS and Log Performance
        elapsed = time.time() - start_time
        fps = 1.0 / elapsed if elapsed > 0 else 0
        if fps < 10:
             print(f"[AI Performance] {fps:.2f} FPS (Elapsed: {elapsed:.3f}s)")
            
        await asyncio.sleep(0.05)




# --- HELPERS ---

def non_maximum_suppression(faces, iou_threshold=0.3):
    """
    Remove duplicate face detections using Non-Maximum Suppression.
    Keeps the detection with highest confidence for overlapping faces.
    """
    if len(faces) == 0:
        return []
    
    # Extract bboxes and scores
    boxes = np.array([face.bbox for face in faces])
    scores = np.array([face.det_score if hasattr(face, 'det_score') else 0.9 for face in faces])
    
    # Calculate areas
    x1, y1, x2, y2 = boxes[:, 0], boxes[:, 1], boxes[:, 2], boxes[:, 3]
    areas = (x2 - x1) * (y2 - y1)
    
    # Sort by score (descending)
    order = scores.argsort()[::-1]
    
    keep = []
    while order.size > 0:
        i = order[0]
        keep.append(i)
        
        # Calculate IoU with remaining boxes
        xx1 = np.maximum(x1[i], x1[order[1:]])
        yy1 = np.maximum(y1[i], y1[order[1:]])
        xx2 = np.minimum(x2[i], x2[order[1:]])
        yy2 = np.minimum(y2[i], y2[order[1:]])
        
        w = np.maximum(0.0, xx2 - xx1)
        h = np.maximum(0.0, yy2 - yy1)
        intersection = w * h
        
        iou = intersection / (areas[i] + areas[order[1:]] - intersection)
        
        # Keep only boxes with IoU below threshold
        inds = np.where(iou <= iou_threshold)[0]
        order = order[inds + 1]
    
    return [faces[i] for i in keep]

def get_adaptive_threshold(frame, face):
    """
    Calculate adaptive recognition threshold based on detection quality.
    Returns lower threshold for poor conditions, higher for good conditions.
    """
    bbox = face.bbox.astype(int)
    
    # 1. Face size (distance proxy)
    face_area = (bbox[2] - bbox[0]) * (bbox[3] - bbox[1])
    
    # 2. Brightness analysis
    face_crop = frame[max(0, bbox[1]):min(frame.shape[0], bbox[3]),
                      max(0, bbox[0]):min(frame.shape[1], bbox[2])]
    
    if face_crop.size > 0:
        brightness = np.mean(face_crop)
    else:
        brightness = 128
    
    # 3. Determine threshold
    # Poor lighting (too dark or too bright)
    if brightness < 50 or brightness > 200:
        return 0.42  # Very lenient for bad light
    # Far away (small face)
    elif face_area < 5000:
        return 0.45  # Lenient for distance
    # Good conditions
    else:
        return 0.50  # Moderate (was 0.55)

students_cache = []
last_cache_update = 0

async def refresh_student_cache_if_needed():
    global students_cache, last_cache_update
    now = time.time()
    # Reduced from 300s (5min) to 60s (1min) for faster updates
    if now - last_cache_update > 60:
        try:
            async with db_pool.acquire() as conn:
                async with conn.cursor(aiomysql.DictCursor) as cursor:
                    # FETCH ALL EMBEDDINGS (from face_photos)
                    # Use JOIN to get student details + specific angle embedding
                    # Use LIKE to support multi-role users (e.g., 'student,admin')
                    await cursor.execute("""
                        SELECT u.id, u.user_id, u.first_name, u.last_name, fp.embedding as angle_embedding
                        FROM users u
                        JOIN face_photos fp ON u.id = fp.user_id
                        WHERE u.role LIKE '%student%' 
                        AND fp.embedding IS NOT NULL
                        AND fp.deleted_at IS NULL
                    """)
                    raw_rows = await cursor.fetchall()
                    
                    print(f"[Cache] Found {len(raw_rows)} face photo records")
                    
                    # Group by Student
                    temp_cache = {}
                    for row in raw_rows:
                        sid = row['id']
                        if sid not in temp_cache:
                            temp_cache[sid] = {
                                'id': row['id'],
                                'user_id': row['user_id'],
                                'first_name': row['first_name'],
                                'last_name': row['last_name'],
                                'embeddings': []
                            }
                        if row['angle_embedding']:
                            try:
                                embedding_data = json.loads(row['angle_embedding'])
                                
                                # Handle both single embedding and ensemble embeddings (array)
                                if isinstance(embedding_data, list):
                                    # Check if it's an array of embeddings (ensemble) or a single embedding
                                    if len(embedding_data) > 0 and isinstance(embedding_data[0], list):
                                        # Ensemble: array of embeddings
                                        for emb in embedding_data:
                                            temp_cache[sid]['embeddings'].append(emb)
                                    else:
                                        # Single embedding (legacy format)
                                        temp_cache[sid]['embeddings'].append(embedding_data)
                                else:
                                    print(f"[Cache] Warning: Unexpected embedding format for user {row['user_id']}")
                            except Exception as e:
                                print(f"[Cache] Failed to parse embedding for user {row['user_id']}: {e}")
                                
                    students_cache = list(temp_cache.values())
                    print(f"[Cache] Refreshed: {len(students_cache)} students loaded")
                    
                    # Debug: Show which students were loaded
                    for student in students_cache:
                        print(f"[Cache] Student: {student['first_name']} {student['last_name']} ({len(student['embeddings'])} embeddings)")
                    
            last_cache_update = now
        except Exception as e:
            print(f"Cache refresh failed: {e}")
            import traceback
            traceback.print_exc()

async def process_face(face, camera_id, frame):
    """
    Identify face and trigger events. Returns detection dict for overlay.
    Uses adaptive threshold and quality-aware matching.
    """
    embedding = face.embedding.tolist()
    bbox = face.bbox.astype(int)
    
    # ADAPTIVE THRESHOLD: Calculate based on lighting and distance
    adaptive_threshold = get_adaptive_threshold(frame, face)
    
    # QUALITY SCORE: Calculate for this detection
    quality_score = face_recognizer.calculate_quality_score(frame, face)
    
    best_match = None
    best_score = 0.0
    
    # Results
    # Identify - Debugging Enabled
    for student in students_cache:
        # Compare against ALL embeddings for this student
        for known_emb in student['embeddings']:
            try:
                score = face_recognizer.compare_faces(known_emb, embedding)
                # Debug print for close matches
                if score > 0.3:
                    print(f"Debug: Match score {score:.4f} for {student['first_name']} (threshold: {adaptive_threshold:.2f}, quality: {quality_score:.2f})")
                
                # Use adaptive threshold instead of fixed FACE_THRESHOLD
                if score > adaptive_threshold and score > best_score:
                    best_score = score
                    best_match = student
            except:
                continue
            
    # Result Data
    x, y, w, h = bbox[0], bbox[1], bbox[2]-bbox[0], bbox[3]-bbox[1]

    if best_match:
        # --- KNOWN STUDENT ---
        print(f"[AI CAM {camera_id}] ✅ MATCH: {best_match['first_name']} ({best_score:.4f})")
        name = f"{best_match['first_name']} ({int(best_score*100)}%)"
        color = (0, 255, 0) # Green
        
        # Update Attendance Manager
        direction = attendance_manager.update(best_match['id'], (x,y,w,h), camera_id)
        if direction:
            print(f"Event: {best_match['first_name']} -> {direction}")
            await handle_attendance_event(best_match['id'], direction, camera_id, frame, (x,y,w,h))
            
    else:
        # --- UNKNOWN ---
        name = "Unknown"
        color = (0, 0, 255) # Red
        # Logic for Unknown
        await handle_unknown_event(camera_id, frame, (x,y,w,h))

    return {
        'bbox': (x, y, w, h),
        'label': name,
        'color': color
    }

async def handle_attendance_event(student_id, action, camera_id, frame, bbox):
    try:
        # Get active session
        print(f"[Attendance] Looking for active session for student {student_id}")
        session = await get_active_session_for_student(student_id)
        if not session:
            print(f"[Attendance] No active session found for student {student_id}")
            return

        print(f"[Attendance] Found session {session['id']} for student {student_id}, marking {action}")

        # Crop & Upload
        x, y, w, h = bbox
        face_crop = frame[max(0, y):min(frame.shape[0], y+h), max(0, x):min(frame.shape[1], x+w)]
        if face_crop.size == 0: return
        
        if face_crop.size == 0: return
        
        # Pass session object directly to helper
        snapshot_url = await save_snapshot_to_minio(face_crop, student_id, session)
        
        # Mark API
        response = requests.post(
            f"{BACKEND_URL}/api/attendance/mark",
            json={
                "sessionId": session['id'],
                "studentId": student_id,
                "direction": action,
                "snapshotUrl": snapshot_url
            },
            timeout=5
        )
        print(f"[Attendance] API response: {response.status_code}")
    except Exception as e:
        print(f"Attendance event error: {e}")
        import traceback
        traceback.print_exc()

async def handle_unknown_event(camera_id, frame, bbox):
    """
    Log unknown person with rate limiting
    """
    # USER REQUEST: Stop saving unknown images to attendance folder.
    # We simply return early here to disable this feature.
    return

    # Original Logic (Disabled)
    # now = time.time()
    # last_log = unknown_log_cooldowns.get(camera_id, 0)
    # ...

# --- DB & MINIO UTILS ---

async def get_active_session_for_student(student_id):
    if not db_pool: return None
    async with db_pool.acquire() as conn:
        async with conn.cursor(aiomysql.DictCursor) as cursor:
            await cursor.execute("""
                SELECT 
                    s.id, s.class_id, s.type, s.batch_students,
                    c.subject_code, c.subject_name, c.section,
                    ap.school_year, ap.semester
                FROM sessions s
                JOIN enrollments e ON s.class_id = e.class_id
                JOIN classes c ON s.class_id = c.id
                LEFT JOIN academic_periods ap ON c.academic_period_id = ap.id
                WHERE e.student_id = %s
                AND s.monitoring_started_at IS NOT NULL
                AND s.monitoring_ended_at IS NULL
                ORDER BY s.start_time DESC LIMIT 1
            """, (student_id,))
            session = await cursor.fetchone()
            
            # For batch sessions, verify student is in the batch
            if session and session['type'] == 'batch' and session['batch_students']:
                try:
                    batch = json.loads(session['batch_students'])
                    # batch_students contains enrollment IDs, not student IDs
                    # Get the enrollment ID for this student in this class
                    await cursor.execute("""
                        SELECT id FROM enrollments 
                        WHERE student_id = %s AND class_id = %s
                    """, (student_id, session['class_id']))
                    enrollment = await cursor.fetchone()
                    if not enrollment or enrollment['id'] not in batch:
                        print(f"[Batch Check] Student {student_id} not in batch for session {session['id']}")
                        return None
                    print(f"[Batch Check] Student {student_id} verified in batch for session {session['id']}")
                except Exception as e:
                    print(f"[Batch Check] Error validating batch: {e}")
                    pass
            return session


async def get_any_active_session():
    if not db_pool: return None
    async with db_pool.acquire() as conn:
        async with conn.cursor(aiomysql.DictCursor) as cursor:
            await cursor.execute("""
                SELECT 
                    s.id,
                    c.subject_code, c.subject_name, c.section,
                    ap.school_year, ap.semester
                FROM sessions s
                JOIN classes c ON s.class_id = c.id
                LEFT JOIN academic_periods ap ON c.academic_period_id = ap.id
                WHERE monitoring_started_at IS NOT NULL 
                AND monitoring_ended_at IS NULL 
                ORDER BY start_time DESC LIMIT 1
            """)
            return await cursor.fetchone()

async def save_snapshot_to_minio(face_crop, student_id, session_data):
    if not minio_client: return None
    try:
        # Extract Metadata or Fallback
        sy = session_data.get('school_year', 'Unknown_SY')
        sem = session_data.get('semester', 'Unknown_Sem')
        subj_code = session_data.get('subject_code', 'Unknown_Code')
        subj_name = session_data.get('subject_name', 'Unknown_Subject')
        section = session_data.get('section', 'Unknown_Section')
        
        # Sanitize folder names (remove unsafe chars)
        def sanitize(s):
            if not s: return "Unknown"
            return "".join([c for c in str(s) if c.isalnum() or c in (' ', '-', '_')]).strip()

        sy = sanitize(sy)
        sem = sanitize(sem)
        # Combined Class Details: Code & Name & Section
        class_details = f"{sanitize(subj_code)} & {sanitize(subj_name)} & {sanitize(section)}"
        
        # Date Folder
        date_folder = datetime.now().strftime("%Y-%m-%d")
        
        # Compress Image
        _, buffer = cv2.imencode('.jpg', face_crop, [int(cv2.IMWRITE_JPEG_QUALITY), 85])
        image_bytes = io.BytesIO(buffer.tobytes())
        
        # Filename: StudentId_Time.jpg
        time_str = datetime.now().strftime("%H-%M-%S")
        filename_only = f"{student_id}_{time_str}.jpg"
        
        # Full Path: attendance/SY/Sem/ClassDetails/Date/Filename
        full_path = f"attendance/{sy}/{sem}/{class_details}/{date_folder}/{filename_only}"
        
        print(f"[Snapshot] Saving to: {full_path}")
        
        await asyncio.get_event_loop().run_in_executor(None, lambda: minio_client.put_object(
            "labface-snapshots", full_path, image_bytes, length=len(buffer), content_type="image/jpeg"
        ))
        
        # Return relative URL accessible via Nginx proxy
        return f"/minio/labface-snapshots/{full_path}"
    except Exception as e:
        print(f"Snapshot upload failed: {e}")
        return None

# --- FASTAPI ENDPOINTS ---

@app.get("/")
def read_root():
    return {"status": "online", "online": True, "message": "LabFace AI Service Optimized Ready"}

@app.get("/video_feed/{camera_id}")
async def video_feed(camera_id: int):
    return StreamingResponse(generate_frames(camera_id), media_type="multipart/x-mixed-replace; boundary=frame")

@app.get("/camera_status/{camera_id}")
async def get_camera_status(camera_id: int):
    """
    Returns the status from the background worker. Instant response.
    Checks both int and string keys for robustness.
    """
    # Check both integer and string keys to avoid type mismatch issues
    is_online = camera_status.get(camera_id, False) or camera_status.get(str(camera_id), False)
    
    # Also check if we have data in latest_bytes
    has_data = camera_id in latest_bytes or str(camera_id) in latest_bytes
    
    print(f"[StatusCheck] CAM {camera_id} - Online: {is_online}, Data: {has_data}")
    
    return {
        "camera_id": camera_id,
        "online": bool(is_online),
        "has_data": bool(has_data),
        "status": "online" if is_online else "offline",
        "test_mode": TEST_MODE,
        "timestamp": time.time()
    }

@app.get("/debug_state")
async def get_debug_state():
    return {
        "camera_status": camera_status,
        "latest_bytes_keys": list(latest_bytes.keys()),
        "latest_bytes_sizes": {k: len(v) for k, v in latest_bytes.items()},
        "latest_frames_keys": list(latest_frames.keys()),
        "test_mode": TEST_MODE,
        "uptime": time.time()
    }

async def generate_frames(camera_id):
    placeholder = np.zeros((720, 1280, 3), dtype=np.uint8)
    cv2.putText(placeholder, "Loading Feed...", (400, 360), cv2.FONT_HERSHEY_SIMPLEX, 1, (255,255,255), 2)
    _, p_bytes = cv2.imencode('.jpg', placeholder)
    p_frame = b'--frame\r\nContent-Type: image/jpeg\r\n\r\n' + p_bytes.tobytes() + b'\r\n'
    
    print(f"[Stream] Starting feed for CAM {camera_id}")
    
    last_log = 0
    while True:
        if camera_id in latest_bytes:
            frame_bytes = latest_bytes[camera_id]
            if time.time() - last_log > 10:
                print(f"[Stream] CAM {camera_id} - Sending frame, size: {len(frame_bytes)} bytes")
                last_log = time.time()
                
            yield (b'--frame\r\nContent-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
            await asyncio.sleep(0.066) # ~15 FPS matches capture cap
        else:
            yield p_frame
            await asyncio.sleep(0.5)

@app.on_event("shutdown")
async def shutdown_event():
    global should_run, db_pool
    should_run = False
    if db_pool:
        db_pool.close()
        await db_pool.wait_closed()

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
