import time

class AttendanceManager:
    def __init__(self, cooldown_seconds=60):
        # Data structure:
        # { 
        #   face_id: { 
        #     'cam1': { 'history': [], 'last_active': ts, 'state': 'INIT' }, 
        #     'cam2': { 'history': [], 'last_active': ts, 'state': 'INIT' },
        #     'exit_intent_ts': 0,
        #     'last_event': 0 
        #   } 
        # }
        self.faces = {} 
        self.cooldown = cooldown_seconds
        
        # Tracking Config
        self.HISTORY_LEN = 10
        self.EXIT_INTENT_TTL = 30  # Seconds Camera 2 intent is valid
        self.MOVING_AWAY_THRESHOLD = 0.9  # Ratio check (current_area / initial_area)

    def update(self, face_id, bbox, camera_id):
        """
        Update tracker with new face bounding box.
        bbox: (x, y, w, h)
        camera_id: 1 (Entry/Exit Door) or 2 (Exit Corridor)
        Returns: 'ENTRY', 'EXIT', or None
        """
        now = time.time()
        x, y, w, h = bbox
        area = w * h
        center_x = x + w // 2
        
        if face_id not in self.faces:
            self.faces[face_id] = {
                'cam1': {'history': [], 'last_active': 0},
                'cam2': {'history': [], 'last_active': 0},
                'exit_intent_ts': 0,
                'last_event': 0
            }
        
        data = self.faces[face_id]
        cam_data = data[f'cam{camera_id}']
        cam_data['last_active'] = now
        cam_data['history'].append({'ts': now, 'area': area, 'cx': center_x})
        
        # Limit history
        if len(cam_data['history']) > self.HISTORY_LEN:
            cam_data['history'].pop(0)
            
        # Check Cooldown (global for this student)
        if now - data['last_event'] < self.cooldown:
            return None

        # LOGIC: CAMERA 2 - EXIT INTENT
        # Detect if person is in center and approaching (area getting bigger)
        if camera_id == 2:
            if len(cam_data['history']) >= 3:
                # Check Approach: Start Area < End Area
                start_area = cam_data['history'][0]['area']
                end_area = cam_data['history'][-1]['area']
                
                # Check Center Alignment (assuming 1280 width, center is 640. Range 400-880)
                is_centered = 400 < center_x < 880
                
                if end_area > start_area * 1.05 and is_centered:
                    # Valid Exit Intent
                    data['exit_intent_ts'] = now
                    print(f"[DEBUG] Exit Intent Detected for {face_id} on Cam 2")
                    return None # Just marking intent, not an event yet

        # LOGIC: CAMERA 1 - ENTRY vs EXIT CONFIRMATION
        if camera_id == 1:
            if len(cam_data['history']) >= 3:
                start_area = cam_data['history'][0]['area']
                end_area = cam_data['history'][-1]['area']
                
                # CHECK 1: EXIT CONFIRMATION
                # Requirement: Had recent Exit Intent from Cam 2 AND Moving Away on Cam 1 (Area shrinking)
                has_exit_intent = (now - data['exit_intent_ts']) < self.EXIT_INTENT_TTL
                is_moving_away = end_area < start_area * 0.95
                
                if has_exit_intent and is_moving_away:
                    # Confirmed Exit!
                    print(f"[DEBUG] EXIT CONFIRMED for {face_id}")
                    return "EXIT"
                
                # CHECK 2: ENTRY
                # Requirement: First appearance OR Moving Closer/Stable without Exit Intent
                # For robustness, we mostly treat "Not Exit" as Entry if they are clearly visible
                if not has_exit_intent:
                    # Simple Entry: Just being detected on Cam 1 without recent exit intent
                    # We accept this immediately to be responsive
                    print(f"[DEBUG] ENTRY Detected for {face_id}")
                    return "ENTRY"
                    
        return None

    def mark_event(self, face_id):
        if face_id in self.faces:
            self.faces[face_id]['last_event'] = time.time()
            # clear history for both cameras to prevent double trigger
            self.faces[face_id]['cam1']['history'] = []
            self.faces[face_id]['cam2']['history'] = []

    def cleanup(self):
        now = time.time()
        to_remove = []
        for fid, data in self.faces.items():
            # If inactive on both cameras for 5 mins
            last_active = max(data['cam1']['last_active'], data['cam2']['last_active'])
            if now - last_active > 300:
                to_remove.append(fid)
        for fid in to_remove:
            del self.faces[fid]
