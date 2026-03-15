"""
Depth Liveness Detection - Layer 3
Estimates face depth to detect flat surfaces (photos, screens)
Uses monocular depth estimation (single camera)
CPU-optimized for Chromebook compatibility
"""

import cv2
import numpy as np
import logging

logger = logging.getLogger(__name__)

class DepthLivenessDetector:
    def __init__(self):
        """Initialize depth liveness detector"""
        self.depth_variance_threshold = 0.05  # Minimum depth variation for real face
        self.flatness_threshold = 0.8  # Maximum flatness score for real face
        
        logger.info("Depth Liveness Detector initialized")
    
    def detect(self, image):
        """
        Perform depth-based liveness detection
        
        Args:
            image: numpy array (BGR format)
            
        Returns:
            dict: {
                'is_live': bool,
                'confidence': float,
                'depth_variance': float,
                'flatness_score': float,
                'details': str
            }
        """
        try:
            # Estimate depth map
            depth_map = self._estimate_depth(image)
            
            # Analyze depth characteristics
            depth_variance = self._calculate_depth_variance(depth_map)
            flatness_score = self._calculate_flatness(depth_map)
            
            # Real faces have depth variation
            # Flat surfaces (photos/screens) have uniform depth
            has_depth_variation = depth_variance > self.depth_variance_threshold
            not_flat = flatness_score < self.flatness_threshold
            
            is_live = has_depth_variation and not_flat
            
            # Calculate confidence
            variance_score = min(depth_variance / (self.depth_variance_threshold * 2), 1.0)
            flatness_score_norm = 1.0 - flatness_score
            confidence = (variance_score * 0.6 + flatness_score_norm * 0.4)
            
            result = {
                'is_live': is_live,
                'confidence': float(confidence),
                'depth_variance': float(depth_variance),
                'flatness_score': float(flatness_score),
                'details': self._get_failure_reason(
                    has_depth_variation, not_flat, depth_variance, flatness_score
                ) if not is_live else 'Depth analysis passed'
            }
            
            logger.info(f"Depth detection: {'LIVE' if is_live else 'SPOOF'} "
                       f"(variance: {depth_variance:.3f}, flatness: {flatness_score:.2f})")
            return result
            
        except Exception as e:
            logger.error(f"Depth detection error: {str(e)}")
            return {
                'is_live': False,
                'confidence': 0.0,
                'depth_variance': 0.0,
                'flatness_score': 1.0,
                'details': f'Error: {str(e)}'
            }
    
    def _estimate_depth(self, image):
        """
        Estimate depth map using simple monocular cues
        (In production, use MiDaS or similar for better accuracy)
        
        Args:
            image: BGR image
            
        Returns:
            numpy array: Depth map (normalized 0-1)
        """
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Method 1: Use gradient magnitude as depth proxy
        # (Objects closer to camera have sharper edges)
        sobelx = cv2.Sobel(gray, cv2.CV_64F, 1, 0, ksize=5)
        sobely = cv2.Sobel(gray, cv2.CV_64F, 0, 1, ksize=5)
        gradient_magnitude = np.sqrt(sobelx**2 + sobely**2)
        
        # Method 2: Use blur as depth proxy
        # (Objects closer to camera are sharper)
        laplacian = cv2.Laplacian(gray, cv2.CV_64F)
        sharpness = np.abs(laplacian)
        
        # Combine methods
        depth_estimate = 0.5 * gradient_magnitude + 0.5 * sharpness
        
        # Normalize to 0-1
        depth_map = cv2.normalize(depth_estimate, None, 0, 1, cv2.NORM_MINMAX)
        
        # Apply Gaussian blur to smooth
        depth_map = cv2.GaussianBlur(depth_map, (5, 5), 0)
        
        return depth_map
    
    def _calculate_depth_variance(self, depth_map):
        """
        Calculate variance in depth map
        Real faces have varying depth (nose closer than ears)
        Flat surfaces have uniform depth
        """
        # Focus on face region (center 60%)
        h, w = depth_map.shape
        face_region = depth_map[
            int(h*0.2):int(h*0.8),
            int(w*0.2):int(w*0.8)
        ]
        
        variance = np.var(face_region)
        return variance
    
    def _calculate_flatness(self, depth_map):
        """
        Calculate how flat the surface is
        Uses standard deviation of depth values
        
        Returns:
            float: 0 = very 3D, 1 = very flat
        """
        # Focus on face region
        h, w = depth_map.shape
        face_region = depth_map[
            int(h*0.2):int(h*0.8),
            int(w*0.2):int(w*0.8)
        ]
        
        std_dev = np.std(face_region)
        
        # Normalize: low std = flat surface
        # High std = 3D surface
        flatness = 1.0 - min(std_dev * 5, 1.0)
        
        return flatness
    
    def _get_failure_reason(self, has_depth, not_flat, variance, flatness):
        """Generate human-readable failure reason"""
        reasons = []
        
        if not has_depth:
            reasons.append(f"Insufficient depth variation (variance: {variance:.3f})")
        if not not_flat:
            reasons.append(f"Surface too flat (flatness: {flatness:.2f})")
        
        return "; ".join(reasons) if reasons else "Depth analysis failed"

# Global instance
_depth_detector = None

def get_depth_detector():
    """Get or create depth detector instance (singleton)"""
    global _depth_detector
    if _depth_detector is None:
        _depth_detector = DepthLivenessDetector()
    return _depth_detector
