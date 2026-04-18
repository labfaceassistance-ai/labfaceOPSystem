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
import aiomysql  # type: ignore
import json
import time
from datetime import datetime
from minio import Minio  # type: ignore
from minio.error import S3Error  # type: ignore
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
RTSP_URL_1 = os.getenv("RTSP_URL_1", "")
if not RTSP_URL_1:
    print("⚠️  WARNING: RTSP_URL_1 not set in environment. Camera will not connect.")

BACKEND_URL = os.getenv("BACKEND_URL", "http://backend:5000")
DB_HOST = os.getenv("DB_HOST", "mariadb")
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "root")
DB_NAME = os.getenv("DB_NAME", "labface")

# Recognition threshold (higher = more lenient, better for distance/angles)
# Lowered to 0.65 for faster/more tolerant recognition per user request
FACE_THRESHOLD = float(os.getenv("FACE_RECOGNITION_THRESHOLD", "0.65"))

# Global cache for active sessions (student_id -> {session, timestamp})
session_cache = {}
SESSION_CACHE_TTL = 2 # seconds - Reduced from 10s for faster session detection

should_run = True

# Thread-safe(ish) shared state for Capture vs AI loops
latest_frames = {}           # { camera_id: np.array_frame }
latest_bytes = {}            # { camera_id: bytes_jpeg }
new_frame_events = {1: asyncio.Event()}
current_detections = {}      # { camera_id: [ {bbox, label, color} ] }
camera_status = {}           # { camera_id: bool }
unknown_log_cooldowns = {}   # { camera_id: timestamp }
last_detection_time = {}     # { camera_id: timestamp }

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
                # Move to executor to prevent blocking the event loop during heavy download
                face_enhancer = await asyncio.get_event_loop().run_in_executor(None, lambda: get_face_enhancer(use_gpu=False))
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

        # Capture Loop (CAM 01 Entrance ONLY)
        print("🚀 Starting capture worker (CAM 01)...")
        asyncio.create_task(capture_worker(RTSP_URL_1, 1))
        
        # AI Processing Loop (Single unified loop for CAM 01)
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
        
        # INCREASED AGGRESSION: If we have frames queued up, skip them
        if now - last_time < 0.05: # Target ~20 FPS for smoother motion
            await asyncio.sleep(0.005)
            continue
        
        setattr(capture_worker, f'_last_time_{camera_id}', now)

        # Optimized Resolution for Live Dashboards (Saves ~40% bandwidth)
        try:
            processed_frame = cv2.resize(frame, (640, 360))
        except Exception as e:
            logger.warning(f"[CAM {camera_id}] Frame resize failed: {e}")
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
                label = det.get('label', 'Detected')
                
                # Draw Face Box
                cv2.rectangle(display_frame, (x, y), (x + w, y + h), color, 2)
                
                # HUD TAG: Compute Health Tips
                g_code, g_text = get_face_guidance(processed_frame, (x, y, w, h))
                if g_code and g_code != "OPTIMAL":
                    # Draw a warning bar above the box
                    tip_y = max(20, y - 40)
                    cv2.rectangle(display_frame, (x, tip_y - 20), (x + w, tip_y), (0, 165, 255), -1) # Orange bar
                    cv2.putText(display_frame, g_text, (x + 5, tip_y - 5),
                               cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255, 255, 255), 1, cv2.LINE_AA)

                # Name Tag
                cv2.rectangle(display_frame, (x, y - 25), (x + w, y), color, -1)
                cv2.putText(display_frame, label, (x + 5, y - 7),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 2)
            except Exception as e:
                logger.warning(f"[CAM {camera_id}] Detection draw error: {e}")

        # Encode (Heavyish op, but better than AI)
        # Low quality (35) to ensure "Butter Smooth" streaming over Cloudflare tunnels
        ret, buffer = await loop.run_in_executor(None, lambda: cv2.imencode('.jpg', display_frame, [int(cv2.IMWRITE_JPEG_QUALITY), 35]))
        if ret:
            latest_bytes[camera_id] = buffer.tobytes()
            # Signal anyone waiting for this frame
            new_frame_events[camera_id].set()
            new_frame_events[camera_id].clear()
        
        # Clear detected faces older than 1 second to prevent "ghost" boxes
        if camera_id in last_detection_time and now - last_detection_time[camera_id] > 1.0:
            current_detections[camera_id] = []

        # Yield to event loop slightly to allow other tasks
        await asyncio.sleep(0.001) 


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
        
        # Process Camera 1 (Entrance)
        camera_id = 1
        frame = latest_frames.get(camera_id)
        if frame is not None:
                
            try:
                # Basic Single-scale detection
                faces = await loop.run_in_executor(None, face_recognizer.app.get, frame)
                
                # SEQUENTIAL PROCESSING: Handles multiple faces safely without deadlocking the AI model
                face_results = []
                for face in faces:
                    res = await process_face(face, camera_id, frame)
                    if res:
                        face_results.append(res)
                
                # Update shared state for overlay
                current_detections[camera_id] = face_results
                
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

def get_human_confidence(sim, threshold):
    """
    Translate raw cosine similarity into a human-readable 0-100 percentage.
    """
    if sim >= 0.70: return min(99.9, 95 + (sim-0.70)*10)
    if sim >= threshold: return min(95.0, 75 + (sim-threshold)*50)
    return max(0, sim * 100)

def get_face_guidance(frame, bbox):
    """
    Returns (code, message) for real-time HUD tips.
    """
    x, y, w, h = bbox
    face_crop = frame[max(0, y):min(frame.shape[0], y+h), max(0, x):min(frame.shape[1], x+w)]
    
    if face_crop.size == 0:
        return None, None
        
    brightness = np.mean(face_crop)
    face_area = w * h
    
    if brightness < 60:
        return "TOO_DARK", "TOO DARK - NEED LIGHT"
    if brightness > 230:
        return "TOO_BRIGHT", "TOO BRIGHT - AVOID GLARE"
    if face_area < 8000:
        return "TOO_FAR", "TOO FAR - STEP CLOSER"
    
    return "OPTIMAL", "OPTIMAL QUALITY"

def calculate_ensemble_confidence(face_embedding, student_embeddings, threshold):
    """
    Looks at all 5 angles of a student to 'Boost' confidence.
    If multiple stored photos match reasonably well, it's a very strong identity proof.
    """
    best_sim = 0.0
    matches_above_floor = 0
    floor_threshold = threshold - 0.1  # More lenient for alternate angles
    
    for db_emb in student_embeddings:
        sim = face_recognizer.compare_faces(face_embedding, db_emb)
        if sim > best_sim:
            best_sim = sim
        if sim > floor_threshold:
            matches_above_floor += 1
            
    # ENSEMBLE BOOSTING: 
    # If we have matches across multiple stored angles, we boost the best_sim
    # 2 angles = +2% boost, 3+ angles = +4% boost
    boost = 0.0
    if matches_above_floor >= 3:
        boost = 0.04
    elif matches_above_floor >= 2:
        boost = 0.02
        
    final_score = min(0.99, best_sim + boost)
    return final_score, best_sim, matches_above_floor

def get_hud_guidance(frame, face):
    """
    Analyzes quality and returns actionable advice for 100% accuracy.
    """
    guidance = []
    bbox = face.bbox.astype(int)
    
    # 1. Size Check
    face_w = bbox[2] - bbox[0]
    if face_w < 100:
        guidance.append({"code": "TOO_FAR", "text": "Step closer to the camera"})
        
    # 2. Lighting Check
    face_crop = frame[max(0, bbox[1]):min(frame.shape[0], bbox[3]),
                      max(0, bbox[0]):min(frame.shape[1], bbox[2])]
    if face_crop.size > 0:
        gray = cv2.cvtColor(face_crop, cv2.COLOR_BGR2GRAY)
        brightness = np.mean(gray)
        if brightness < 60:
            guidance.append({"code": "TOO_DARK", "text": "Find a brighter area"})
        elif brightness > 220:
            guidance.append({"code": "TOO_BRIGHT", "text": "Avoid direct glare"})
            
        # 3. Sharpness Check
        laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
        if laplacian_var < 50:
            guidance.append({"code": "BLURRY", "text": "Hold steady / Clean lens"})
            
    return guidance

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
                        SELECT u.id, u.user_id, u.first_name, u.last_name, u.profile_picture, fp.embedding as angle_embedding
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
                                'profile_picture': row['profile_picture'],
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
    
    best_match = None
    best_score = 0.0
    
    # ADAPTIVE THRESHOLD: Calculate based on lighting and distance
    adaptive_threshold = get_adaptive_threshold(frame, face)
    
    # Identify - Ensemble Boosting Logic
    for student in students_cache:
        # Multi-angle check
        final_sim, best_raw, match_count = calculate_ensemble_confidence(embedding, student['embeddings'], adaptive_threshold)
        
        if final_sim > adaptive_threshold and final_sim > best_score:
            best_score = final_sim
            best_match = student
            
    # Result Data
    x, y, w, h = bbox[0], bbox[1], bbox[2]-bbox[0], bbox[3]-bbox[1]

    if best_match:
        # --- KNOWN STUDENT ---
        human_conf = get_human_confidence(best_score, adaptive_threshold)
        print(f"[AI CAM {camera_id}] ✅ MATCH: {best_match['first_name']} ({best_score:.4f} -> {human_conf:.1f}%)")
        name = f"{best_match['first_name']} ({int(human_conf)}%)"
        color = (0, 255, 0) # Green
        
        # Update Attendance Manager - Passing confidence score
        direction = attendance_manager.update(best_match['id'], (x,y,w,h), camera_id, confidence=best_score)
        if direction:
            logger.info(f"[AI CAM {camera_id}] ATTENDANCE EVENT: {best_match['first_name']} -> {direction}")
            # Background the event to avoid blocking the main AI loop for other faces in the frame
            asyncio.create_task(handle_attendance_event(best_match['id'], direction, camera_id, frame, (x,y,w,h)))
            # IMMEDIATELY mark event in manager to reset history and start cooldown
            attendance_manager.mark_event(best_match['id'])
            logger.info(f"[AI CAM {camera_id}] Attendance event backgrounded for {best_match['first_name']}")
            
    else:
        # --- UNKNOWN ---
        name = "Unknown"
        color = (0, 0, 255) # Red
        # Logic for Unknown - Backgrounded
        asyncio.create_task(handle_unknown_event(camera_id, frame, (x,y,w,h)))

    return {
        'bbox': (x, y, w, h),
        'label': name,
        'color': color
    }

async def handle_attendance_event(student_id, action, camera_id, frame, bbox):
    try:
        # Get active session
        logger.info(f"[Attendance] Event triggered: student={student_id}, action={action}, cam={camera_id}")
        session = await get_active_session_for_student(student_id)
        if not session:
            logger.error(f"[Attendance] FAILED: No active session for student {student_id}. Check: 1) Session started 2) Student enrolled 3) Cache TTL")
            return

        print(f"[Attendance] Found session {session['id']} for student {student_id}, marking {action}")

        # Crop & Upload
        x, y, w, h = bbox
        face_crop = frame[max(0, y):min(frame.shape[0], y+h), max(0, x):min(frame.shape[1], x+w)]
        if face_crop.size == 0:
            logger.warning(f"[Attendance] Empty face crop for student {student_id}, skipping snapshot")
            return

        # Pass session object directly to helper
        snapshot_url = await save_snapshot_to_minio(face_crop, student_id, session)

        # Mark API — use executor to avoid blocking the asyncio event loop
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(
            None,
            lambda: requests.post(
                f"{BACKEND_URL}/api/attendance/mark",
                json={
                    "sessionId": session['id'],
                    "studentId": student_id,
                    "direction": action,
                    "snapshotUrl": snapshot_url
                },
                timeout=5
            )
        )
        print(f"[Attendance] API response: {response.status_code}")
    except Exception as e:
        logger.error(f"[Attendance] Event error for student {student_id}: {e}")
        import traceback
        traceback.print_exc()

async def handle_unknown_event(camera_id, frame, bbox):
    """
    Unknown person logging is disabled per user request.
    Unknown faces are still detected visually (red box overlay) but not saved.
    """
    return

# --- DB & MINIO UTILS ---

async def get_active_session_for_student(student_id):
    global session_cache
    now = time.time()
    
    # 1. Check Cache
    if student_id in session_cache:
        cached_data, ts = session_cache[student_id]
        cache_age = now - ts
        if cache_age < SESSION_CACHE_TTL:
            if cached_data:
                logger.info(f"[SessionCache] HIT for student {student_id} (age: {cache_age:.1f}s, session: {cached_data['id']})")
            else:
                logger.info(f"[SessionCache] HIT for student {student_id} (age: {cache_age:.1f}s, NO SESSION)")
            return cached_data
        else:
            logger.info(f"[SessionCache] EXPIRED for student {student_id} (age: {cache_age:.1f}s)")

    # 2. Database Lookup
    if not db_pool: return None
    try:
        async with db_pool.acquire() as conn:
            async with conn.cursor(aiomysql.DictCursor) as cursor:
                # Flexible Check: Match by Student ID OR Student Number (Resilient Left Join)
                await cursor.execute("""
                    SELECT 
                        s.id, s.class_id, s.type, s.batch_students,
                        c.subject_code, c.subject_name, c.section,
                        ap.school_year, ap.semester
                    FROM sessions s
                    JOIN enrollments e ON s.class_id = e.class_id
                    JOIN classes c ON s.class_id = c.id
                    LEFT JOIN academic_periods ap ON c.academic_period_id = ap.id
                    LEFT JOIN users u ON u.id = %s
                    WHERE (e.student_id = %s OR 
                        (u.user_id IS NOT NULL AND 
                         REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(TRIM(e.student_number), '-', ''), ' ', ''), '.', ''), CHAR(9), ''), CHAR(13), ''), CHAR(10), '') = 
                         REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(TRIM(u.user_id), '-', ''), ' ', ''), '.', ''), CHAR(9), ''), CHAR(13), ''), CHAR(10), ''))
                    )
                    # Time-Graceful Check: Match by ID/Number and Started in the last 5 hours (Even if Ended)
                    AND s.monitoring_started_at >= DATE_SUB(NOW(), INTERVAL 5 HOUR)
                    ORDER BY s.monitoring_started_at DESC LIMIT 1
                """, (student_id, student_id))
                session = await cursor.fetchone()
                
                if session:
                    # For batch sessions, verify student is in the batch
                    if session['type'] == 'batch' and session['batch_students']:
                        try:
                            batch = json.loads(session['batch_students'])
                            await cursor.execute("""
                                SELECT e.id
                                FROM enrollments e
                                LEFT JOIN users u ON u.id = %s
                                WHERE e.class_id = %s
                                AND (
                                    e.student_id = %s OR
                                    (
                                        u.user_id IS NOT NULL AND
                                        REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(TRIM(e.student_number), '-', ''), ' ', ''), '.', ''), CHAR(9), ''), CHAR(13), ''), CHAR(10), '') =
                                        REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(TRIM(u.user_id), '-', ''), ' ', ''), '.', ''), CHAR(9), ''), CHAR(13), ''), CHAR(10), '')
                                    )
                                )
                                LIMIT 1
                            """, (student_id, session['class_id'], student_id))
                            enrollment = await cursor.fetchone()
                            if not enrollment or enrollment['id'] not in batch:
                                logger.info(
                                    "[Attendance] Batch membership mismatch for student %s in session %s "
                                    "(resolved_enrollment_id=%s, batch_size=%s)",
                                    student_id,
                                    session['id'],
                                    enrollment['id'] if enrollment else None,
                                    len(batch)
                                )
                                session = None # Not in batch
                        except Exception as e:
                            logger.warning(
                                "[Attendance] Failed batch membership check for student %s in session %s: %s",
                                student_id,
                                session.get('id'),
                                e
                            )
                            session = None
                            
                # 3. Update Cache
                session_cache[student_id] = (session, now)
                
                if session:
                    logger.info(f"[Attendance] Cache Updated: Found session {session['id']} for student {student_id}")
                else:
                    logger.warning(f"[Attendance] No active session found for student {student_id} - they may not be enrolled in any active class")
                return session
    except Exception as e:
        logger.error(f"Error in get_active_session_for_student: {e}")
        return None


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
    is_ready = face_recognizer is not None
    return {
        "status": "online" if is_ready else "initializing",
        "online": True, # The service is up even if models aren't ready
        "ready": is_ready,
        "message": "LabFace AI Service Optimized Ready" if is_ready else "AI Service is starting up and loading models..."
    }

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
        "uptime": time.time(),
        "session_cache_size": len(session_cache),
        "session_cache_ttl": SESSION_CACHE_TTL,
        "students_cache_size": len(students_cache)
    }

@app.post("/api/invalidate-session-cache")
async def invalidate_session_cache():
    """
    Clear the session cache and reset attendance manager state.
    Call this when starting/stopping a session to ensure immediate attendance detection.
    """
    global session_cache, attendance_manager

    # Clear session cache
    session_cache.clear()
    logger.info("[SessionCache] INVALIDATED - All session cache entries cleared")

    # Reset attendance manager to clear cooldowns and tracking state
    if attendance_manager:
        attendance_manager.reset()
        logger.info("[AttendanceManager] RESET - All face tracking and cooldowns cleared")

    return {"success": True, "message": "Session cache and attendance state cleared"}

async def generate_frames(camera_id):
    placeholder = np.zeros((480, 854, 3), dtype=np.uint8)
    cv2.putText(placeholder, "Loading Feed...", (300, 240), cv2.FONT_HERSHEY_SIMPLEX, 1, (255,255,255), 2)
    _, p_bytes = cv2.imencode('.jpg', placeholder, [int(cv2.IMWRITE_JPEG_QUALITY), 30])
    p_frame = b'--frame\r\nContent-Type: image/jpeg\r\n\r\n' + p_bytes.tobytes() + b'\r\n'
    
    print(f"[Stream] Starting feed for CAM {camera_id}")
    
    last_log = 0
    while True:
        # Wait for a NEW frame to be ready (Event-driven delivery)
        try:
            await asyncio.wait_for(new_frame_events[camera_id].wait(), timeout=2.0)
            frame_bytes = latest_bytes.get(camera_id)
            
            if frame_bytes:
                yield (b'--frame\r\nContent-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
            
            # Small throttle to prevent CPU thrashing on 100+ FPS cams
            await asyncio.sleep(0.04) # Max ~25 FPS delivery
            
        except asyncio.TimeoutError:
            # Send placeholder if camera goes quiet
            yield p_frame
            await asyncio.sleep(0.5)

# ==========================================
# TEMPORARY CAMERA TEST TOOL START
# ==========================================
from pydantic import BaseModel
import base64

class TestFrameRequest(BaseModel):
    image: str

@app.post("/api/test-frame")
async def test_frame(request: TestFrameRequest):
    """
    Temporary endpoint to test accuracy against the loaded cache using local webcam frames.
    """
    try:
        if not face_recognizer:
            return {"success": False, "error": "AI is still initializing (loading models). Please wait 1-2 minutes after deployment."}
            
        # Decode base64
        image_data = request.image
        if ',' in image_data:
            image_data = image_data.split(',')[1]
            
        img_bytes = base64.b64decode(image_data)
        nparr = np.frombuffer(img_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            return {"success": False, "error": "Invalid image format"}
            
        h, w = img.shape[:2]
        cv2.imwrite("debug_boxes.jpg", img) # Replaced with cleaner save later
            
        t_start = time.time()
        # Detect faces
        faces = face_recognizer.get_faces_two_stage(img)
        t_detect = time.time()
        
        # DEBUG: Draw boxes and save locally
        debug_img = img.copy()
        for f in faces:
            b = [int(n) for n in f.bbox]
            cv2.rectangle(debug_img, (b[0], b[1]), (b[2], b[3]), (0, 0, 255), 2)
        cv2.imwrite("debug_boxes.jpg", debug_img)
        
        print(f"[CameraDiagnostic] 🔍 Detected {len(faces)} faces (Detect: {int((t_detect-t_start)*1000)}ms)")
        results = []
        
        for face in faces:
            bbox = [int(n) for n in face.bbox] # x1, y1, x2, y2
            print(f"[CameraDiagnostic] - Face found at {bbox}")
            embedding = face.embedding
            
            # --- Generate Thumbnail for Log ---
            # Add some padding to crop
            pad = 20
            fy1 = max(0, bbox[1] - pad)
            fy2 = min(img.shape[0], bbox[3] + pad)
            fx1 = max(0, bbox[0] - pad)
            fx2 = min(img.shape[1], bbox[2] + pad)
            face_crop = img[fy1:fy2, fx1:fx2]
            
            thumbnail_b64 = ""
            if face_crop.size > 0:
                try:
                    res, thumb_buf = cv2.imencode('.jpg', face_crop, [int(cv2.IMWRITE_JPEG_QUALITY), 70])
                    if res:
                        thumbnail_b64 = f"data:image/jpeg;base64,{base64.b64encode(thumb_buf.tobytes()).decode('utf-8')}"
                except:
                    pass
            
            # Use the same adaptive threshold logic as the CCTV background worker
            threshold = get_adaptive_threshold(img, face)
            
            # Identify - Ensemble Boosting Logic for Diagnostic Tool
            best_match = None
            max_sim = 0.0
            best_raw = 0.0
            match_count = 0
            
            for student in students_cache:
                final_sim, raw_sim, m_count = calculate_ensemble_confidence(embedding, student['embeddings'], threshold)
                if final_sim > threshold and final_sim > max_sim:
                    max_sim = final_sim
                    best_raw = raw_sim
                    match_count = m_count
                    best_match = student

            is_match = bool(best_match and max_sim > threshold)
            human_conf = get_human_confidence(max_sim, threshold)
            guidance = get_hud_guidance(img, face)
            
            res_item = {
                "bbox": bbox,
                "match": is_match,
                "confidence": float(round(human_conf, 1)),
                "raw_similarity": float(round(best_raw, 4)),
                "ensemble_count": match_count,
                "threshold_used": float(threshold),
                "guidance": guidance,
                "thumbnail": thumbnail_b64,
                "timestamp": datetime.now().isoformat()
            }
            
            if is_match:
                res_item.update({
                    "name": f"{best_match['first_name']} {best_match['last_name']}",
                    "student_id": best_match['user_id'],
                    "profile_picture": best_match['profile_picture']
                })
            else:
                res_item.update({
                    "name": "Unknown",
                    "student_id": "N/A",
                    "profile_picture": None
                })
                
            results.append(res_item)
                
        return {
            "success": True, 
            "faces": results,
            "source_width": w,
            "source_height": h,
            "raw_latency": int((time.time() - t_start) * 1000)
        }
        
    except Exception as e:
        return {"success": False, "error": str(e)}

# ==========================================
# TEMPORARY CAMERA TEST TOOL END
# ==========================================

@app.on_event("shutdown")
async def shutdown_event():
    global should_run, db_pool
    should_run = False
    if db_pool:
        db_pool.close()
        await db_pool.wait_closed()

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
