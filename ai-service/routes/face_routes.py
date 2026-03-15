"""
Face Recognition Routes
Endpoints for face detection, embedding generation, and background removal.
"""

from fastapi import APIRouter, HTTPException, UploadFile, File, Request, Response
from pydantic import BaseModel
from typing import Optional
import base64
import cv2
import numpy as np
import io
try:
    from rembg import remove
    REMBG_AVAILABLE = True
except ImportError:
    REMBG_AVAILABLE = False
    print("⚠️  rembg module not found - Background removal will be unavailable")
import os

router = APIRouter()

class RecognizeRequest(BaseModel):
    image: str  # Base64 encoded image

class RecognizeResponse(BaseModel):
    success: bool
    error: Optional[str] = None
    message: Optional[str] = None

@router.post("/recognize", response_model=RecognizeResponse)
async def recognize_face(request: Request, body: RecognizeRequest):
    """
    Detect if a face is present in the uploaded image using InsightFace.
    Used during registration to validate face photos.
    """
    try:
        # Decode base64 image
        image_data = body.image
        
        # Remove data URL prefix if present
        if ',' in image_data:
            image_data = image_data.split(',')[1]
        
        # Decode base64
        img_bytes = base64.b64decode(image_data)
        nparr = np.frombuffer(img_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            return RecognizeResponse(
                success=False,
                error="No face detected",
                message="Invalid image format"
            )

        # Access AI model from state
        if not hasattr(request.app.state, 'face_recognizer') or request.app.state.face_recognizer is None:
            return RecognizeResponse(
                success=False,
                error="Service initializing",
                message="AI models are still loading. Please wait a moment."
            )
        
        face_recognizer = request.app.state.face_recognizer
        
        # Detect faces using InsightFace (MUCH more accurate than Cascade)
        import asyncio
        loop = asyncio.get_event_loop()
        faces = await loop.run_in_executor(None, face_recognizer.app.get, img)
        
        if len(faces) == 0:
            return RecognizeResponse(
                success=False,
                error="No face detected",
                message="No face detected in image. Ensure your face is clearly visible."
            )
        
        # Get the largest face
        face = sorted(faces, key=lambda x: (x.bbox[2]-x.bbox[0])*(x.bbox[3]-x.bbox[1]), reverse=True)[0]
        
        # Quality Checks: Brightness & Sharpness
        # Convert to grayscale for analysis
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # 1. Brightness Check
        mean_brightness = np.mean(gray)
        print(f"[Quality] Face Brightness: {mean_brightness:.2f}")

        if mean_brightness < 40: # Dark threshold
            return RecognizeResponse(
                success=False,
                error="Image too dark",
                message=f"Image is too dark ({int(mean_brightness)}/255). Please find better lighting."
            )
        
        if mean_brightness > 240: # Flare threshold
             return RecognizeResponse(
                success=False,
                error="Image too bright",
                message=f"Image is too bright ({int(mean_brightness)}/255). Please avoid direct glare."
            )

        # 2. Sharpness Check (Laplacian Variance)
        laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
        print(f"[Quality] Face Sharpness: {laplacian_var:.2f}")
        
        if laplacian_var < 30: # Accurate blur threshold for 720p
             return RecognizeResponse(
                success=False,
                error="Image too blurry",
                message=f"Image is too blurry. Please hold steady and ensure focus."
            )

        return RecognizeResponse(
            success=True,
            message=f"Face detected successfully. Quality OK."
        )
        
    except Exception as e:
        return RecognizeResponse(
            success=False,
            error="Processing error",
            message=str(e)
        )

@router.post("/generate-embedding")
async def generate_embedding(request: Request, file: UploadFile = File(...)):
    """
    Generate face embedding for the uploaded image using InsightFace.
    """
    try:
        print(f"[Embedding] Received request for file: {file.filename}")
        contents = await file.read()
        print(f"[Embedding] File size: {len(contents)} bytes")
        
        # Access the global face_recognizer from app state
        if not hasattr(request.app.state, 'face_recognizer'):
            print("[Embedding] ERROR: face_recognizer not in app.state")
            raise HTTPException(status_code=503, detail="AI Model not initialized - face_recognizer not in app.state")
            
        if request.app.state.face_recognizer is None:
            print("[Embedding] ERROR: face_recognizer is None")
            raise HTTPException(status_code=503, detail="AI Model not ready - face_recognizer is None")

        print("[Embedding] Calling face_recognizer.get_embedding...")
        import asyncio
        loop = asyncio.get_event_loop()
        embedding = await loop.run_in_executor(
            None, 
            request.app.state.face_recognizer.get_embedding, 
            contents
        )
        
        if embedding is None:
            print("[Embedding] No face detected in image")
            return {"embedding": None, "error": "No face detected"}
        
        print(f"[Embedding] Successfully generated embedding of length {len(embedding)}")
        return {"embedding": embedding}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"[Embedding] EXCEPTION: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"{type(e).__name__}: {str(e)}")

@router.post("/generate-ensemble-embeddings")
async def generate_ensemble_embeddings(request: Request, file: UploadFile = File(...)):
    """
    Generate multiple embeddings from augmented versions of the image.
    Returns array of embeddings for ensemble matching.
    """
    try:
        print(f"[Ensemble] Received request for file: {file.filename}")
        contents = await file.read()
        
        # Access the global face_recognizer from app state
        if not hasattr(request.app.state, 'face_recognizer') or request.app.state.face_recognizer is None:
            raise HTTPException(status_code=503, detail="AI Model not initialized")
        
        face_recognizer = request.app.state.face_recognizer
        
        # Decode image
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            return {"embeddings": [], "error": "Invalid image"}
        
        # Generate augmented images
        augmented_images = face_recognizer.generate_augmented_images(img)
        
        # Generate embedding for each augmented image
        embeddings = []
        import asyncio
        loop = asyncio.get_event_loop()
        
        for aug_img in augmented_images:
            # Encode back to bytes
            _, buffer = cv2.imencode('.jpg', aug_img)
            img_bytes = buffer.tobytes()
            
            # Generate embedding
            embedding = await loop.run_in_executor(
                None,
                face_recognizer.get_embedding,
                img_bytes
            )
            
            if embedding is not None:
                embeddings.append(embedding)
        
        print(f"[Ensemble] Generated {len(embeddings)} embeddings from {len(augmented_images)} augmentations")
        return {"embeddings": embeddings, "count": len(embeddings)}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"[Ensemble] EXCEPTION: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/enhance-image")
async def enhance_image(file: UploadFile = File(...)):
    """
    Enhance image quality for better face recognition.
    Applies CLAHE, sharpening, and noise reduction.
    """
    try:
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            raise HTTPException(status_code=400, detail="Invalid image")
        
        # 1. Convert to LAB color space for better contrast enhancement
        lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
        l, a, b = cv2.split(lab)
        
        # 2. Apply CLAHE (Contrast Limited Adaptive Histogram Equalization) to L channel
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        l = clahe.apply(l)
        
        # 3. Merge channels and convert back to BGR
        enhanced = cv2.merge([l, a, b])
        enhanced = cv2.cvtColor(enhanced, cv2.COLOR_LAB2BGR)
        
        # 4. Apply bilateral filter for noise reduction while preserving edges
        enhanced = cv2.bilateralFilter(enhanced, 9, 75, 75)
        
        # 5. Apply unsharp mask for sharpening
        gaussian = cv2.GaussianBlur(enhanced, (0, 0), 2.0)
        enhanced = cv2.addWeighted(enhanced, 1.5, gaussian, -0.5, 0)
        
        # Encode back to JPEG
        _, buffer = cv2.imencode('.jpg', enhanced, [int(cv2.IMWRITE_JPEG_QUALITY), 95])
        
        return Response(content=buffer.tobytes(), media_type="image/jpeg")
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"[Enhance] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/refresh-cache")
async def refresh_cache(request: Request):
    """
    Force refresh of student embeddings cache.
    Call this after uploading new face photos to immediately load them.
    """
    try:
        # Import the refresh function from main
        import sys
        import importlib
        main_module = sys.modules.get('main')
        
        if main_module and hasattr(main_module, 'refresh_student_cache_if_needed'):
            # Force refresh by resetting last_cache_update
            if hasattr(main_module, 'last_cache_update'):
                main_module.last_cache_update = 0
            
            # Call refresh
            await main_module.refresh_student_cache_if_needed()
            
            student_count = len(main_module.students_cache) if hasattr(main_module, 'students_cache') else 0
            
            return {
                "success": True,
                "message": f"Cache refreshed successfully. Loaded {student_count} students."
            }
        else:
            raise HTTPException(status_code=503, detail="Cache refresh function not available")
            
    except Exception as e:
        print(f"[Cache Refresh] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/remove-background")
async def remove_background_endpoint(file: UploadFile = File(...)):
    """
    Remove background from the uploaded image using rembg.
    """
    if not REMBG_AVAILABLE:
        raise HTTPException(
            status_code=503, 
            detail="Background removal service is unavailable (rembg module not installed)"
        )
    try:
        contents = await file.read()
        output = remove(contents)
        return Response(content=output, media_type="image/png")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# --- CHATBOT ROUTES (MOCK) ---
@router.get("/chatbot/quick-replies")
async def get_quick_replies():
    return ["How do I register?", "Check my attendance", "What is LabFace?"]

class ChatMessage(BaseModel):
    message: str
    userId: Optional[str] = None

@router.post("/chatbot/message")
async def chat_message(msg: ChatMessage):
    return {
        "reply": f"I received your message: '{msg.message}'. (AI Chatbot is currently in demo mode)",
        "intent": "general"
    }

# --- FACENET ROUTES (MOCK - AntelopeV2 is primary) ---
@router.post("/facenet/embedding")
async def facenet_embedding(file: UploadFile = File(...)):
    # Fallback to standard embedding if legacy FaceNet called
    return {"embedding": [0.0]*128, "dimension": 128, "model": "facenet_mock"}

@router.post("/facenet/compare")
async def facenet_compare(data: dict):
    return {"is_match": True, "confidence": 0.99, "distance": 0.01}

@router.get("/facenet/health")
async def facenet_health():
    return {"status": "healthy", "ready": True, "model": "AntelopeV2-Bridge"}

# --- LIVENESS ROUTES (MOCK) ---
@router.get("/liveness/health")
async def liveness_health():
    return {"status": "online", "layers": 3, "method": "passive"}

@router.post("/liveness/passive")
async def liveness_passive(data: dict):
    return {"is_live": True, "confidence": 0.98, "method": "passive", "details": "Real face detected"}

@router.post("/liveness/check")
async def liveness_check(data: dict):
    return {"is_live": True, "confidence": 0.99, "method": "full", "layers": 3, "details": "3-layer verification passed"}

# --- EMOTION ROUTES (MOCK) ---
@router.post("/emotion/detect")
async def detect_emotion(data: dict):
    return {"emotion": "happy", "engagement": 0.95, "confidence": 0.88}

@router.post("/emotion/classroom-mood")
async def classroom_mood(data: dict):
    return {"average_mood": "positive", "engagement_score": 0.90}

# --- ANALYTICS ROUTES (MOCK) ---
@router.get("/status")
async def get_status():
    return {"status": "online", "gpu": False, "models_loaded": True}

@router.get("/student-insights/{student_id}")
async def get_student_insights(student_id: int):
    return {
        "attendance_rate": 95,
        "punctuality": "High",
        "risk_level": "Low",
        "engagement": "Active"
    }

@router.post("/predict/attendance")
async def predict_attendance(data: dict):
    return {"predicted_rate": 98.5, "confidence": 0.92}

@router.post("/predict/risk")
async def predict_risk(data: dict):
    return {"risk_score": 0.1, "risk_level": "Low", "factors": []}

@router.post("/predict/success")
async def predict_success(data: dict):
    return {"success_probability": 0.95, "factors": ["High Attendance", "Consistent Punctuality"]}
