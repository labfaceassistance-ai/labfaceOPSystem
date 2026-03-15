"""
Face Tracking Module for Temporal Frame Aggregation
Tracks faces across frames and aggregates embeddings for robust recognition.
"""

import numpy as np
from typing import Dict, List, Optional, Tuple
from collections import deque
import time

class FaceTrack:
    """Represents a tracked face across multiple frames."""
    
    def __init__(self, track_id: int, bbox: np.ndarray, embedding: np.ndarray, quality: float):
        self.track_id = track_id
        self.bboxes = deque(maxlen=30)  # Last 30 bboxes
        self.embeddings = deque(maxlen=30)  # Last 30 embeddings
        self.qualities = deque(maxlen=30)  # Last 30 quality scores
        self.last_seen = time.time()
        self.identity = None  # Matched student ID
        self.identity_confidence = 0.0
        
        # Add first detection
        self.bboxes.append(bbox)
        self.embeddings.append(embedding)
        self.qualities.append(quality)
    
    def update(self, bbox: np.ndarray, embedding: np.ndarray, quality: float):
        """Update track with new detection."""
        self.bboxes.append(bbox)
        self.embeddings.append(embedding)
        self.qualities.append(quality)
        self.last_seen = time.time()
    
    def get_best_embeddings(self, top_k: int = 5) -> List[np.ndarray]:
        """Get top-k embeddings by quality score."""
        if len(self.embeddings) == 0:
            return []
        
        # Sort by quality
        sorted_indices = np.argsort(list(self.qualities))[::-1]
        top_indices = sorted_indices[:min(top_k, len(sorted_indices))]
        
        return [self.embeddings[i] for i in top_indices]
    
    def get_aggregated_embedding(self) -> Optional[np.ndarray]:
        """Get quality-weighted average embedding."""
        if len(self.embeddings) == 0:
            return None
        
        # Get best embeddings
        best_embeddings = self.get_best_embeddings(top_k=5)
        
        if len(best_embeddings) == 0:
            return None
        
        # Average them
        aggregated = np.mean(best_embeddings, axis=0)
        
        # Normalize
        aggregated = aggregated / np.linalg.norm(aggregated)
        
        return aggregated
    
    def get_current_bbox(self) -> Optional[np.ndarray]:
        """Get most recent bounding box."""
        return self.bboxes[-1] if len(self.bboxes) > 0 else None
    
    def is_stale(self, max_age: float = 2.0) -> bool:
        """Check if track is stale (not updated recently)."""
        return (time.time() - self.last_seen) > max_age


class FaceTracker:
    """
    Multi-object tracker for faces using IoU and appearance similarity.
    Enables temporal frame aggregation for robust recognition.
    """
    
    def __init__(self, iou_threshold: float = 0.3, max_age: float = 2.0):
        """
        Initialize face tracker.
        
        Args:
            iou_threshold: Minimum IoU for track association
            max_age: Maximum age (seconds) before track is removed
        """
        self.tracks: Dict[int, FaceTrack] = {}
        self.next_track_id = 0
        self.iou_threshold = iou_threshold
        self.max_age = max_age
    
    def _calculate_iou(self, bbox1: np.ndarray, bbox2: np.ndarray) -> float:
        """Calculate Intersection over Union between two bounding boxes."""
        x1_min, y1_min, x1_max, y1_max = bbox1
        x2_min, y2_min, x2_max, y2_max = bbox2
        
        # Intersection
        inter_x_min = max(x1_min, x2_min)
        inter_y_min = max(y1_min, y2_min)
        inter_x_max = min(x1_max, x2_max)
        inter_y_max = min(y1_max, y2_max)
        
        inter_area = max(0, inter_x_max - inter_x_min) * max(0, inter_y_max - inter_y_min)
        
        # Union
        bbox1_area = (x1_max - x1_min) * (y1_max - y1_min)
        bbox2_area = (x2_max - x2_min) * (y2_max - y2_min)
        union_area = bbox1_area + bbox2_area - inter_area
        
        if union_area == 0:
            return 0.0
        
        return inter_area / union_area
    
    def update(self, 
               detections: List[Tuple[np.ndarray, np.ndarray, float]]) -> Dict[int, FaceTrack]:
        """
        Update tracker with new detections.
        
        Args:
            detections: List of (bbox, embedding, quality) tuples
            
        Returns:
            Dictionary of active tracks
        """
        # Remove stale tracks
        stale_ids = [tid for tid, track in self.tracks.items() if track.is_stale(self.max_age)]
        for tid in stale_ids:
            del self.tracks[tid]
        
        if len(detections) == 0:
            return self.tracks
        
        # Match detections to existing tracks
        matched_tracks = set()
        matched_detections = set()
        
        for det_idx, (det_bbox, det_emb, det_qual) in enumerate(detections):
            best_iou = 0
            best_track_id = None
            
            for track_id, track in self.tracks.items():
                if track_id in matched_tracks:
                    continue
                
                track_bbox = track.get_current_bbox()
                if track_bbox is None:
                    continue
                
                iou = self._calculate_iou(det_bbox, track_bbox)
                
                if iou > self.iou_threshold and iou > best_iou:
                    best_iou = iou
                    best_track_id = track_id
            
            if best_track_id is not None:
                # Update existing track
                self.tracks[best_track_id].update(det_bbox, det_emb, det_qual)
                matched_tracks.add(best_track_id)
                matched_detections.add(det_idx)
        
        # Create new tracks for unmatched detections
        for det_idx, (det_bbox, det_emb, det_qual) in enumerate(detections):
            if det_idx not in matched_detections:
                new_track = FaceTrack(self.next_track_id, det_bbox, det_emb, det_qual)
                self.tracks[self.next_track_id] = new_track
                self.next_track_id += 1
        
        return self.tracks
    
    def get_track(self, track_id: int) -> Optional[FaceTrack]:
        """Get track by ID."""
        return self.tracks.get(track_id)
    
    def get_all_tracks(self) -> Dict[int, FaceTrack]:
        """Get all active tracks."""
        return self.tracks
    
    def clear(self):
        """Clear all tracks."""
        self.tracks.clear()
        self.next_track_id = 0


# Global tracker instances (one per camera)
_trackers: Dict[int, FaceTracker] = {}

def get_tracker(camera_id: int) -> FaceTracker:
    """
    Get or create tracker for a camera.
    
    Args:
        camera_id: Camera identifier
        
    Returns:
        FaceTracker instance
    """
    global _trackers
    if camera_id not in _trackers:
        _trackers[camera_id] = FaceTracker()
    return _trackers[camera_id]
