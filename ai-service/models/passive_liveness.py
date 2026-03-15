"""
Passive Liveness Detection - Layer 1
Analyzes image texture, color, blur, and frequency patterns
No user interaction required - silent analysis
CPU-optimized for Chromebook compatibility
"""

import cv2
import numpy as np
from scipy import signal
from scipy.fftpack import fft2, fftshift
import logging

logger = logging.getLogger(__name__)

class PassiveLivenessDetector:
    def __init__(self):
        """Initialize passive liveness detector"""
        self.blur_threshold = 100.0
        self.color_entropy_threshold = 8.0
        self.texture_threshold = 30.0
        self.frequency_threshold = 500000.0
        
        logger.info("Passive Liveness Detector initialized")
    
    def detect(self, image):
        """
        Perform passive liveness detection
        
        Args:
            image: numpy array (BGR format)
            
        Returns:
            dict: {
                'is_live': bool,
                'confidence': float,
                'scores': dict,
                'details': str
            }
        """
        try:
            # Run all passive checks
            blur_score = self._check_blur(image)
            color_score = self._check_color_distribution(image)
            texture_score = self._check_texture(image)
            frequency_score = self._check_frequency(image)
            
            # Weighted combination
            weights = {
                'blur': 0.25,
                'color': 0.25,
                'texture': 0.25,
                'frequency': 0.25
            }
            
            total_score = (
                weights['blur'] * blur_score +
                weights['color'] * color_score +
                weights['texture'] * texture_score +
                weights['frequency'] * frequency_score
            )
            
            is_live = total_score > 0.6
            
            result = {
                'is_live': is_live,
                'confidence': float(total_score),
                'scores': {
                    'blur': float(blur_score),
                    'color': float(color_score),
                    'texture': float(texture_score),
                    'frequency': float(frequency_score)
                },
                'details': self._get_failure_reason(
                    blur_score, color_score, texture_score, frequency_score
                ) if not is_live else 'All checks passed'
            }
            
            logger.info(f"Passive detection: {'LIVE' if is_live else 'SPOOF'} (confidence: {total_score:.2f})")
            return result
            
        except Exception as e:
            logger.error(f"Passive detection error: {str(e)}")
            return {
                'is_live': False,
                'confidence': 0.0,
                'scores': {},
                'details': f'Error: {str(e)}'
            }
    
    def _check_blur(self, image):
        """
        Detect blur using Laplacian variance
        Photos/screens are often blurry compared to real faces
        """
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        laplacian = cv2.Laplacian(gray, cv2.CV_64F)
        variance = laplacian.var()
        
        # Normalize: higher variance = sharper = more likely real
        score = min(variance / self.blur_threshold, 1.0)
        return score
    
    def _check_color_distribution(self, image):
        """
        Analyze color histogram entropy
        Real faces have natural color distribution
        Photos/screens have compressed color range
        """
        hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
        
        # Calculate histogram
        hist = cv2.calcHist([hsv], [0, 1], None, [50, 60], [0, 180, 0, 256])
        hist_norm = hist.flatten() / (hist.sum() + 1e-7)
        
        # Calculate entropy
        entropy = -np.sum(hist_norm * np.log2(hist_norm + 1e-7))
        
        # Normalize: higher entropy = more natural colors = more likely real
        score = min(entropy / self.color_entropy_threshold, 1.0)
        return score
    
    def _check_texture(self, image):
        """
        Detect print/screen texture patterns using Gabor filters
        Printed photos have dot patterns
        Screens have pixel grids
        """
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Apply Gabor filter to detect regular patterns
        ksize = 31
        sigma = 4.0
        theta = np.pi / 4
        lambd = 10.0
        gamma = 0.5
        
        kernel = cv2.getGaborKernel((ksize, ksize), sigma, theta, lambd, gamma)
        filtered = cv2.filter2D(gray, cv2.CV_32F, kernel)
        
        # Calculate response
        response = np.mean(np.abs(filtered))
        
        # Normalize: low response = no regular pattern = likely real
        score = 1.0 - min(response / self.texture_threshold, 1.0)
        return score
    
    def _check_frequency(self, image):
        """
        Detect Moiré patterns using FFT
        Screens create interference patterns (Moiré effect)
        Real faces have random frequency distribution
        """
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        gray = cv2.resize(gray, (256, 256))  # Resize for faster FFT
        
        # Apply 2D FFT
        f = fft2(gray)
        fshift = fftshift(f)
        magnitude = np.abs(fshift)
        
        # Calculate variance in frequency domain
        # Regular patterns (screens) have high variance
        # Random patterns (real faces) have lower variance
        freq_variance = np.var(magnitude)
        
        # Normalize: lower variance = more random = likely real
        score = 1.0 - min(freq_variance / self.frequency_threshold, 1.0)
        return score
    
    def _get_failure_reason(self, blur, color, texture, frequency):
        """Generate human-readable failure reason"""
        reasons = []
        
        if blur < 0.5:
            reasons.append("Image too blurry (possible photo/screen)")
        if color < 0.5:
            reasons.append("Unnatural color distribution (possible photo)")
        if texture < 0.5:
            reasons.append("Regular texture pattern detected (possible print/screen)")
        if frequency < 0.5:
            reasons.append("Moiré pattern detected (possible screen)")
        
        return "; ".join(reasons) if reasons else "Multiple indicators failed"

# Global instance
_passive_detector = None

def get_passive_detector():
    """Get or create passive detector instance (singleton)"""
    global _passive_detector
    if _passive_detector is None:
        _passive_detector = PassiveLivenessDetector()
    return _passive_detector
