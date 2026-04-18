import time

class AttendanceManager:
    def __init__(self, cooldown_seconds=300):
        # Data structure:
        # { 
        #   face_id: { 
        #     'history': [], 
        #     'last_active': ts, 
        #     'last_event': 0 
        #   } 
        # }
        self.faces = {} 
        self.cooldown = cooldown_seconds
        
        # Tracking Config
        self.HISTORY_LEN = 8
        self.MIN_FRAMES_FOR_TREND = 3 # Reduced for faster response
        self.TREND_THRESHOLD = 0.08  # Lowered from 0.2 for much faster motion detection
        self.CONFIRMATION_FRAMES = 3 # How many frames to confirm a stationary person

    def update(self, face_id, bbox, camera_id=1, confidence=0):
        """
        Update tracker with new face bounding box.
        Logic: 
        1. Persistence: If seen for X frames (stationary), log ENTRY.
        2. Trends: If movement detected, log ENTRY/EXIT.
        """
        now = time.time()
        x, y, w, h = bbox
        area = w * h
        center_x = x + w // 2
        
        if face_id not in self.faces:
            self.faces[face_id] = {
                'history': [],
                'last_active': 0,
                'last_event': 0,
                'match_count': 0
            }
        
        data = self.faces[face_id]
        data['last_active'] = now
        data['history'].append({'ts': now, 'area': area, 'cx': center_x})
        data['match_count'] += 1
        
        # Limit history
        if len(data['history']) > self.HISTORY_LEN:
            data['history'].pop(0)
            
        # Check Cooldown
        time_since_last = now - data['last_event']
        if time_since_last < self.cooldown:
            remaining = self.cooldown - time_since_last
            print(f"[Attendance] COOLDOWN ACTIVE for {face_id}: {remaining:.0f}s remaining (cooldown={self.cooldown}s)")
            return None

        # --- OPTION 1: PERSISTENCE (Instant Log for stationary students) ---
        # If we have seen them enough times (even if they haven't moved), log them.
        if data['match_count'] >= self.CONFIRMATION_FRAMES:
            print(f"[Attendance] Logic: PERSISTENCE Match for {face_id} after {data['match_count']} frames")
            return "ENTRY"

        # --- OPTION 2: MOVEMENT TRENDS ---
        if len(data['history']) < self.MIN_FRAMES_FOR_TREND:
            return None

        # Calculate Area Trend
        start_avg_area = sum(f['area'] for f in data['history'][:2]) / 2 # Use 2 instead of 3
        end_avg_area = sum(f['area'] for f in data['history'][-2:]) / 2
        
        # Catch zero area division
        if start_avg_area == 0: return None
        area_delta_ratio = (end_avg_area - start_avg_area) / start_avg_area

        # ENTRY: Person walking TOWARDS camera (Area gets BIGGER)
        if area_delta_ratio > self.TREND_THRESHOLD:
            print(f"[Attendance] Logic: DIRECTIONAL ENTRY for {face_id} (Trend: +{area_delta_ratio:.2f})")
            return "ENTRY"

        # EXIT: Person walking AWAY from camera (Area gets SMALLER)
        if area_delta_ratio < -self.TREND_THRESHOLD:
            print(f"[Attendance] Logic: DIRECTIONAL EXIT for {face_id} (Trend: {area_delta_ratio:.2f})")
            return "EXIT"

        return None

    def mark_event(self, face_id):
        if face_id in self.faces:
            self.faces[face_id]['last_event'] = time.time()
            self.faces[face_id]['history'] = []

    def cleanup(self):
        now = time.time()
        to_remove = []
        for fid, data in self.faces.items():
            if now - data['last_active'] > 300:
                to_remove.append(fid)
        for fid in to_remove:
            del self.faces[fid]

    def reset(self):
        """Reset all tracking state. Call this when a new session starts."""
        self.faces.clear()
        print("[AttendanceManager] STATE RESET - All face tracking data cleared")
