"""
Face Enhancement Module using GFPGAN
Upscales and enhances low-resolution faces for better recognition at distance.
"""

import cv2
import numpy as np
import torch
from typing import Optional, Tuple
import logging

logger = logging.getLogger(__name__)

class FaceEnhancer:
    """
    AI-powered face enhancement using GFPGAN for super-resolution.
    Dramatically improves recognition quality for distant/small faces.
    """
    
    def __init__(self, use_gpu: bool = True):
        """
        Initialize GFPGAN face enhancer.
        
        Args:
            use_gpu: Whether to use GPU acceleration (requires CUDA)
        """
        self.device = 'cuda' if use_gpu and torch.cuda.is_available() else 'cpu'
        self.model = None
        self.cache = {}  # Cache enhanced faces to avoid re-processing
        self.cache_max_size = 100
        
        try:
            from gfpgan import GFPGANer
            from basicsr.archs.rrdbnet_arch import RRDBNet
            
            # Initialize GFPGAN v1.4 model
            # Check for local model first, then download
            import os
            local_model_path = os.path.join('/app/models', 'GFPGANv1.4.pth')
            if os.path.exists(local_model_path):
                model_path = local_model_path
                logger.info(f"Using local GFPGAN model: {model_path}")
            else:
                model_path = 'https://github.com/TencentARC/GFPGAN/releases/download/v1.3.0/GFPGANv1.4.pth'
                logger.info(f"Downloading GFPGAN model from: {model_path}")
            
            self.model = GFPGANer(
                model_path=model_path,
                upscale=2,  # 2x upscaling
                arch='clean',
                channel_multiplier=2,
                bg_upsampler=None,  # Don't upscale background, only face
                device=self.device
            )
            
            logger.info(f"✅ GFPGAN initialized on {self.device}")
            
        except ImportError as e:
            logger.warning(f"⚠️ GFPGAN not available: {e}")
            logger.warning("Install with: pip install gfpgan realesrgan facexlib")
            self.model = None
        except Exception as e:
            logger.error(f"❌ Failed to initialize GFPGAN: {e}")
            self.model = None
    
    def is_available(self) -> bool:
        """Check if GFPGAN is available and loaded."""
        return self.model is not None
    
    def should_enhance(self, face_bbox: np.ndarray, min_size: int = 80) -> bool:
        """
        Determine if a face should be enhanced based on size.
        
        Args:
            face_bbox: Face bounding box [x1, y1, x2, y2]
            min_size: Minimum face size threshold (pixels)
            
        Returns:
            True if face should be enhanced
        """
        width = face_bbox[2] - face_bbox[0]
        height = face_bbox[3] - face_bbox[1]
        face_size = min(width, height)
        
        return face_size < min_size
    
    def enhance_face(self, 
                     frame: np.ndarray, 
                     face_bbox: np.ndarray,
                     use_cache: bool = True) -> Optional[np.ndarray]:
        """
        Enhance a face region using GFPGAN super-resolution.
        
        Args:
            frame: Full frame image
            face_bbox: Face bounding box [x1, y1, x2, y2]
            use_cache: Whether to use cached results
            
        Returns:
            Enhanced face image or None if enhancement fails
        """
        if not self.is_available():
            return None
        
        try:
            # Extract face region
            x1, y1, x2, y2 = face_bbox.astype(int)
            x1, y1 = max(0, x1), max(0, y1)
            x2, y2 = min(frame.shape[1], x2), min(frame.shape[0], y2)
            
            face_crop = frame[y1:y2, x1:x2].copy()
            
            if face_crop.size == 0:
                return None
            
            # Check cache
            cache_key = f"{x1}_{y1}_{x2}_{y2}_{hash(frame.tobytes())}"
            if use_cache and cache_key in self.cache:
                return self.cache[cache_key]
            
            # Enhance with GFPGAN
            # Returns: cropped_faces, restored_faces, restored_img
            _, restored_faces, _ = self.model.enhance(
                face_crop,
                has_aligned=False,
                only_center_face=True,
                paste_back=False
            )
            
            if restored_faces is not None and len(restored_faces) > 0:
                enhanced = restored_faces[0]
                
                # Cache result
                if use_cache:
                    if len(self.cache) >= self.cache_max_size:
                        # Remove oldest entry
                        self.cache.pop(next(iter(self.cache)))
                    self.cache[cache_key] = enhanced
                
                return enhanced
            
            return None
            
        except Exception as e:
            logger.warning(f"Face enhancement failed: {e}")
            return None
    
    def enhance_frame_faces(self, 
                           frame: np.ndarray, 
                           faces: list,
                           min_size: int = 80) -> Tuple[np.ndarray, list]:
        """
        Enhance all small faces in a frame.
        
        Args:
            frame: Input frame
            faces: List of detected faces (InsightFace format)
            min_size: Minimum face size to trigger enhancement
            
        Returns:
            Tuple of (enhanced_frame, list of enhanced face flags)
        """
        if not self.is_available():
            return frame, [False] * len(faces)
        
        enhanced_frame = frame.copy()
        enhanced_flags = []
        
        for face in faces:
            bbox = face.bbox.astype(int)
            
            if self.should_enhance(bbox, min_size):
                enhanced_face = self.enhance_face(frame, bbox)
                
                if enhanced_face is not None:
                    # Resize enhanced face to original bbox size
                    h, w = bbox[3] - bbox[1], bbox[2] - bbox[0]
                    enhanced_face = cv2.resize(enhanced_face, (w, h))
                    
                    # Paste back into frame
                    x1, y1, x2, y2 = bbox
                    enhanced_frame[y1:y2, x1:x2] = enhanced_face
                    enhanced_flags.append(True)
                else:
                    enhanced_flags.append(False)
            else:
                enhanced_flags.append(False)
        
        return enhanced_frame, enhanced_flags
    
    def clear_cache(self):
        """Clear the enhancement cache."""
        self.cache.clear()
        logger.info("Enhancement cache cleared")


# Global instance
_face_enhancer = None

def get_face_enhancer(use_gpu: bool = True) -> FaceEnhancer:
    """
    Get or create global FaceEnhancer instance.
    
    Args:
        use_gpu: Whether to use GPU acceleration
        
    Returns:
        FaceEnhancer instance
    """
    global _face_enhancer
    if _face_enhancer is None:
        _face_enhancer = FaceEnhancer(use_gpu=use_gpu)
    return _face_enhancer
