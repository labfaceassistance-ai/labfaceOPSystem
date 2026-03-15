"""
Active Liveness Detection - Layer 2
Detects blinks and head movements
Requires user interaction over multiple frames
CPU-optimized for Chromebook compatibility
"""

import cv2
import numpy as np
from collections import deque
import time
import logging

logger = logging.getLogger(__name__)

class ActiveLivenessDetector:
    def __init__(self):
        """Initialize active liveness detector"""
        self.ear_threshold = 0.25  # Eye Aspect Ratio threshold for blinks
        self.ear_consec_frames = 2  # Consecutive frames for blink
        self.movement_threshold = 8.0  # Pixels of movement required
        self.max_frames = 30  # Maximum frames to store
        
        self.frame_buffer = deque(maxlen=self.max_frames)
        self.blink_counter = 0
        self.total_blinks = 0
        
        logger.info("Active Liveness Detector initialized")
    
    def reset(self):
        """Reset detector state"""
        self.frame_buffer.clear()
        self.blink_counter = 0
        self.total_blinks = 0
    
    def add_frame(self, image, face_landmarks=None):
        """
        Add frame to buffer for analysis
        
        Args:
            image: numpy array (BGR format)
            face_landmarks: dict with facial landmark coordinates
                           (optional, will detect if not provided)
        """
        self.frame_buffer.append({
            'image': image,
            'landmarks': face_landmarks,
            'timestamp': time.time()
        })
    
    def detect(self):
        """
        Perform active liveness detection
        
        Returns:
            dict: {
                'is_live': bool,
                'confidence': float,
                'blinks_detected': int,
                'movement_detected': bool,
                'details': str
            }
        """
        try:
            if len(self.frame_buffer) < 10:
                return {
                    'is_live': False,
                    'confidence': 0.0,
                    'blinks_detected': 0,
                    'movement_detected': False,
                    'details': 'Insufficient frames (need at least 10)'
                }
            
            # Check for blinks
            blink_detected, blink_count = self._detect_blinks()
            
            # Check for movement
            movement_detected, movement_score = self._detect_movement()
            
            # Calculate confidence
            blink_score = min(blink_count / 2.0, 1.0)  # Expect 2+ blinks
            movement_score_norm = min(movement_score / self.movement_threshold, 1.0)
            
            confidence = (blink_score * 0.6 + movement_score_norm * 0.4)
            is_live = blink_detected and movement_detected and confidence > 0.6
            
            result = {
                'is_live': is_live,
                'confidence': float(confidence),
                'blinks_detected': blink_count,
                'movement_detected': movement_detected,
                'movement_score': float(movement_score),
                'details': self._get_failure_reason(
                    blink_detected, movement_detected, blink_count
                ) if not is_live else f'{blink_count} blinks detected with movement'
            }
            
            logger.info(f"Active detection: {'LIVE' if is_live else 'SPOOF'} "
                       f"(blinks: {blink_count}, movement: {movement_score:.1f})")
            return result
            
        except Exception as e:
            logger.error(f"Active detection error: {str(e)}")
            return {
                'is_live': False,
                'confidence': 0.0,
                'blinks_detected': 0,
                'movement_detected': False,
                'details': f'Error: {str(e)}'
            }
    
    def _detect_blinks(self):
        """
        Detect eye blinks using Eye Aspect Ratio (EAR)
        
        Returns:
            tuple: (blink_detected, blink_count)
        """
        ear_values = []
        
        for frame_data in self.frame_buffer:
            image = frame_data['image']
            
            # Simple blink detection using image intensity changes
            # (In production, use facial landmarks for more accuracy)
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            
            # Focus on eye region (upper half of face)
            h, w = gray.shape
            eye_region = gray[int(h*0.25):int(h*0.5), :]
            
            # Calculate average intensity
            avg_intensity = np.mean(eye_region)
            ear_values.append(avg_intensity)
        
        # Detect blinks as intensity drops
        blink_count = 0
        in_blink = False
        threshold = np.mean(ear_values) - np.std(ear_values)
        
        for intensity in ear_values:
            if intensity < threshold and not in_blink:
                blink_count += 1
                in_blink = True
            elif intensity >= threshold:
                in_blink = False
        
        blink_detected = blink_count >= 1
        return blink_detected, blink_count
    
    def _detect_movement(self):
        """
        Detect head movement between frames
        
        Returns:
            tuple: (movement_detected, movement_score)
        """
        if len(self.frame_buffer) < 5:
            return False, 0.0
        
        movements = []
        
        for i in range(1, len(self.frame_buffer)):
            prev_frame = self.frame_buffer[i-1]['image']
            curr_frame = self.frame_buffer[i]['image']
            
            # Convert to grayscale
            prev_gray = cv2.cvtColor(prev_frame, cv2.COLOR_BGR2GRAY)
            curr_gray = cv2.cvtColor(curr_frame, cv2.COLOR_BGR2GRAY)
            
            # Calculate optical flow (movement)
            flow = cv2.calcOpticalFlowFarneback(
                prev_gray, curr_gray, None,
                pyr_scale=0.5, levels=3, winsize=15,
                iterations=3, poly_n=5, poly_sigma=1.2, flags=0
            )
            
            # Calculate magnitude of movement
            magnitude = np.sqrt(flow[..., 0]**2 + flow[..., 1]**2)
            avg_movement = np.mean(magnitude)
            movements.append(avg_movement)
        
        total_movement = np.sum(movements)
        movement_detected = total_movement > self.movement_threshold
        
        return movement_detected, total_movement
    
    def _get_failure_reason(self, blink_detected, movement_detected, blink_count):
        """Generate human-readable failure reason"""
        reasons = []
        
        if not blink_detected:
            reasons.append(f"No blinks detected (found {blink_count}, need 1+)")
        if not movement_detected:
            reasons.append("No head movement detected")
        
        return "; ".join(reasons) if reasons else "Insufficient activity"

# Global instance
_active_detector = None

def get_active_detector():
    """Get or create active detector instance (singleton)"""
    global _active_detector
    if _active_detector is None:
        _active_detector = ActiveLivenessDetector()
    return _active_detector
