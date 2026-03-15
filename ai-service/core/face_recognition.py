"""
Phase 4: Model Upgrade to AntelopeV2
Enhanced FaceRecognizer with better far-distance recognition

INSTALLATION:
Replace the FaceRecognizer class in core/face_recognition.py with this version
"""

import cv2
import numpy as np
import insightface
from insightface.app import FaceAnalysis

class FaceRecognizer:
    def __init__(self, use_antelopev2=False, **kwargs):
        """
        Initialize InsightFace with optional AntelopeV2 model upgrade.
        
        Args:
            use_antelopev2: If True, uses antelopev2 (better for far-distance)
                           If False, uses buffalo_l (default)
            **kwargs: Support for legacy arguments (model_name, ctx_id, etc.)
        """
        # Support legacy argument 'model_name'
        model_name_arg = kwargs.get('model_name')
        if model_name_arg:
            use_antelopev2 = (model_name_arg == 'antelopev2')
            print(f"Using model_name override: {model_name_arg}")

        # PHASE 4: Model Upgrade with Fallback
        model_name = 'antelopev2' if use_antelopev2 else 'buffalo_l'
        
        print(f"Attempting to load face recognition model: {model_name}")
        
        ctx_id = kwargs.get('ctx_id', 0)
        
        try:
            # Initialize InsightFace
            self.app = FaceAnalysis(name=model_name, providers=['CPUExecutionProvider'])
            # PHASE 1: Enhanced detection parameters for far-distance
            self.app.prepare(ctx_id=ctx_id, det_size=(640, 640), det_thresh=0.45)
            print(f"✅ Face recognition initialized with {model_name}")
            if model_name == 'antelopev2':
                print("✅ AntelopeV2 model active - Enhanced far-distance recognition!")
        except Exception as e:
            print(f"⚠️ Failed to load {model_name}: {e}")
            if model_name == 'antelopev2':
                print("🔄 Falling back to 'buffalo_l' (Standard Model)...")
                try:
                    self.app = FaceAnalysis(name='buffalo_l', providers=['CPUExecutionProvider'])
                    self.app.prepare(ctx_id=ctx_id, det_size=(640, 640), det_thresh=0.45)
                    print("✅ Face recognition initialized with buffalo_l (Fallback)")
                except Exception as e2:
                    print(f"❌ Failed to load fallback model buffalo_l: {e2}")
                    raise e2
            else:
                raise e

    def normalize_lighting(self, img):
        """
        Normalize lighting using Multi-Scale Retinex with Color Restoration (MSRCR).
        Makes embeddings lighting-invariant.
        """
        # Convert to float
        img_float = img.astype(np.float64) + 1.0
        
        # Multi-scale Retinex
        scales = [15, 80, 250]
        retinex = np.zeros_like(img_float)
        
        for scale in scales:
            blurred = cv2.GaussianBlur(img_float, (0, 0), scale)
            retinex += np.log10(img_float) - np.log10(blurred)
        
        retinex = retinex / len(scales)
        
        # Normalize to 0-255
        retinex = (retinex - retinex.min()) / (retinex.max() - retinex.min()) * 255
        return retinex.astype(np.uint8)
    
    def enhance_face(self, img):
        """
        Comprehensive face enhancement pipeline.
        Applies lighting normalization, CLAHE, and sharpening.
        """
        # 1. Lighting normalization (Retinex)
        try:
            img = self.normalize_lighting(img)
        except:
            pass  # Fallback to original if Retinex fails
        
        # 2. CLAHE on LAB color space
        lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
        l, a, b = cv2.split(lab)
        clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
        l = clahe.apply(l)
        img = cv2.merge([l, a, b])
        img = cv2.cvtColor(img, cv2.COLOR_LAB2BGR)
        
        # 3. Sharpening (Unsharp mask)
        gaussian = cv2.GaussianBlur(img, (0, 0), 2.0)
        img = cv2.addWeighted(img, 1.5, gaussian, -0.5, 0)
        
        return img
    
    def align_face(self, img, face):
        """
        Align face to canonical frontal pose using landmarks.
        Makes embeddings angle-invariant.
        """
        if not hasattr(face, 'kps') or face.kps is None:
            return img  # No landmarks, return original
        
        # Get landmarks (5 points: left_eye, right_eye, nose, left_mouth, right_mouth)
        landmarks = face.kps.astype(np.float32)
        
        # Canonical landmark positions (frontal face at 112x112)
        canonical = np.array([
            [38.2946, 51.6963],  # Left eye
            [73.5318, 51.5014],  # Right eye
            [56.0252, 71.7366],  # Nose
            [41.5493, 92.3655],  # Left mouth
            [70.7299, 92.2041]   # Right mouth
        ], dtype=np.float32)
        
        # Calculate similarity transform
        transform = cv2.estimateAffinePartial2D(landmarks, canonical)[0]
        
        if transform is not None:
            # Warp face to canonical pose
            aligned = cv2.warpAffine(img, transform, (112, 112))
            return aligned
        
        return img
    
    def calculate_quality_score(self, img, face):
        """
        Calculate quality score for a face detection.
        Used for quality-aware matching and temporal aggregation.
        """
        bbox = face.bbox.astype(int)
        
        # 1. Face size (larger = better)
        face_area = (bbox[2] - bbox[0]) * (bbox[3] - bbox[1])
        size_score = min(face_area / 10000.0, 1.0)  # Normalize to 0-1
        
        # 2. Detection confidence
        conf_score = face.det_score if hasattr(face, 'det_score') else 0.8
        
        # 3. Blur detection (Laplacian variance)
        face_crop = img[max(0, bbox[1]):min(img.shape[0], bbox[3]),
                        max(0, bbox[0]):min(img.shape[1], bbox[2])]
        if face_crop.size > 0:
            gray = cv2.cvtColor(face_crop, cv2.COLOR_BGR2GRAY)
            blur_score = cv2.Laplacian(gray, cv2.CV_64F).var()
            blur_score = min(blur_score / 500.0, 1.0)  # Normalize
        else:
            blur_score = 0.5
        
        # 4. Lighting score (not too dark or bright)
        if face_crop.size > 0:
            brightness = np.mean(face_crop)
            if 50 <= brightness <= 200:
                light_score = 1.0
            elif brightness < 50:
                light_score = brightness / 50.0
            else:
                light_score = (255 - brightness) / 55.0
        else:
            light_score = 0.5
        
        # Weighted average
        quality = (size_score * 0.3 + conf_score * 0.3 + 
                   blur_score * 0.2 + light_score * 0.2)
        
        return quality
    
    def generate_augmented_images(self, img):
        """
        Generate augmented versions of an image for ensemble embeddings.
        Returns list of augmented images.
        """
        augmented = []
        
        # 1. Original
        augmented.append(img.copy())
        
        # 2. Brightness +20
        bright = cv2.convertScaleAbs(img, alpha=1.0, beta=20)
        augmented.append(bright)
        
        # 3. Brightness -20
        dark = cv2.convertScaleAbs(img, alpha=1.0, beta=-20)
        augmented.append(dark)
        
        # 4. Rotate +5 degrees
        h, w = img.shape[:2]
        center = (w // 2, h // 2)
        matrix = cv2.getRotationMatrix2D(center, 5, 1.0)
        rotated_pos = cv2.warpAffine(img, matrix, (w, h))
        augmented.append(rotated_pos)
        
        # 5. Rotate -5 degrees
        matrix = cv2.getRotationMatrix2D(center, -5, 1.0)
        rotated_neg = cv2.warpAffine(img, matrix, (w, h))
        augmented.append(rotated_neg)
        
        return augmented

    def get_embedding(self, image_bytes):
        # Convert bytes to numpy array
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            return None
        
        # ENHANCEMENT: Preprocess image before detection
        img = self.enhance_face(img)
        
        faces = self.app.get(img)
        if not faces:
            return None
        
        # Return the embedding of the largest face found
        # Sort by bounding box area
        faces = sorted(faces, key=lambda x: (x.bbox[2]-x.bbox[0]) * (x.bbox[3]-x.bbox[1]), reverse=True)
        
        # ENHANCEMENT: Align face before embedding
        best_face = faces[0]
        aligned_img = self.align_face(img, best_face)
        
        # Re-extract embedding from aligned face
        aligned_faces = self.app.get(aligned_img)
        if aligned_faces:
            return aligned_faces[0].embedding.tolist()
        
        # Fallback to original if alignment fails
        return best_face.embedding.tolist()

    def compare_faces(self, known_embedding, new_embedding):
        # Cosine Similarity
        # Compute cosine similarity between two vectors
        vec1 = np.array(known_embedding)
        vec2 = np.array(new_embedding)
        sim = np.dot(vec1, vec2) / (np.linalg.norm(vec1) * np.linalg.norm(vec2))
        return sim
