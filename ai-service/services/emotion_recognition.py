"""
Emotion Recognition Service
Detect emotions and engagement from facial expressions
"""

import cv2
import numpy as np
from tensorflow.keras.models import load_model
import os

class EmotionRecognition:
    def __init__(self):
        self.emotions = ['Angry', 'Disgust', 'Fear', 'Happy', 'Sad', 'Surprise', 'Neutral']
        self.engagement_threshold = 0.6
        self.model = None
        self.load_model()
    
    def load_model(self):
        """Load emotion recognition model"""
        try:
            model_path = '/app/models/emotion_model.h5'
            if os.path.exists(model_path):
                self.model = load_model(model_path)
                print("✓ Emotion model loaded")
            else:
                print("⚠ Emotion model not found, using rule-based detection")
        except Exception as e:
            print(f"⚠ Error loading emotion model: {e}")
    
    def detect_emotion(self, face_image):
        """Detect emotion from face image"""
        try:
            if self.model is None:
                return self._rule_based_emotion(face_image)
            
            # Preprocess image
            face_gray = cv2.cvtColor(face_image, cv2.COLOR_BGR2GRAY)
            face_resized = cv2.resize(face_gray, (48, 48))
            face_normalized = face_resized / 255.0
            face_input = face_normalized.reshape(1, 48, 48, 1)
            
            # Predict emotion
            predictions = self.model.predict(face_input)[0]
            emotion_idx = np.argmax(predictions)
            emotion = self.emotions[emotion_idx]
            confidence = float(predictions[emotion_idx])
            
            return {
                'emotion': emotion,
                'confidence': confidence,
                'all_emotions': {
                    self.emotions[i]: float(predictions[i]) 
                    for i in range(len(self.emotions))
                }
            }
            
        except Exception as e:
            print(f"Error detecting emotion: {e}")
            return self._rule_based_emotion(face_image)
    
    def _rule_based_emotion(self, face_image):
        """Fallback rule-based emotion detection"""
        # Simple brightness-based estimation
        gray = cv2.cvtColor(face_image, cv2.COLOR_BGR2GRAY)
        brightness = np.mean(gray)
        
        # Very basic heuristic
        if brightness > 150:
            emotion = 'Happy'
            confidence = 0.6
        else:
            emotion = 'Neutral'
            confidence = 0.7
        
        return {
            'emotion': emotion,
            'confidence': confidence,
            'all_emotions': {e: 0.0 for e in self.emotions}
        }
    
    def analyze_engagement(self, emotion_data):
        """Analyze student engagement from emotion"""
        emotion = emotion_data['emotion']
        confidence = emotion_data['confidence']
        
        # Engagement scoring
        engagement_scores = {
            'Happy': 0.9,
            'Surprise': 0.8,
            'Neutral': 0.6,
            'Sad': 0.4,
            'Fear': 0.3,
            'Angry': 0.2,
            'Disgust': 0.2
        }
        
        base_score = engagement_scores.get(emotion, 0.5)
        engagement_score = base_score * confidence
        
        # Determine engagement level
        if engagement_score >= 0.7:
            level = 'high'
        elif engagement_score >= 0.5:
            level = 'medium'
        else:
            level = 'low'
        
        return {
            'engagement_score': float(engagement_score),
            'engagement_level': level,
            'emotion': emotion,
            'suggestions': self._get_engagement_suggestions(level, emotion)
        }
    
    def _get_engagement_suggestions(self, level, emotion):
        """Get suggestions based on engagement"""
        if level == 'high':
            return ["Student appears engaged and attentive"]
        elif level == 'medium':
            return [
                "Consider interactive activities to boost engagement",
                "Check if student needs clarification"
            ]
        else:
            suggestions = ["Low engagement detected"]
            
            if emotion in ['Sad', 'Fear']:
                suggestions.append("Student may need support or assistance")
            elif emotion == 'Angry':
                suggestions.append("Student may be frustrated - offer help")
            elif emotion == 'Neutral':
                suggestions.append("Try to make content more engaging")
            
            return suggestions
    
    def track_attention(self, face_landmarks):
        """Track student attention from face landmarks"""
        try:
            # Simple attention tracking based on face orientation
            # In production, use actual landmark analysis
            
            # Placeholder: Random attention score
            # In real implementation, analyze eye gaze, head pose, etc.
            attention_score = 0.75  # Placeholder
            
            if attention_score >= 0.7:
                status = 'focused'
            elif attention_score >= 0.4:
                status = 'partially_focused'
            else:
                status = 'distracted'
            
            return {
                'attention_score': float(attention_score),
                'attention_status': status,
                'looking_at_screen': attention_score > 0.5
            }
            
        except Exception as e:
            print(f"Error tracking attention: {e}")
            return {
                'attention_score': 0.5,
                'attention_status': 'unknown',
                'looking_at_screen': True
            }
    
    def analyze_classroom_mood(self, emotion_list):
        """Analyze overall classroom mood from multiple students"""
        try:
            if not emotion_list:
                return {'overall_mood': 'unknown', 'engagement': 0.5}
            
            # Count emotions
            emotion_counts = {}
            total_engagement = 0
            
            for emotion_data in emotion_list:
                emotion = emotion_data['emotion']
                emotion_counts[emotion] = emotion_counts.get(emotion, 0) + 1
                
                # Calculate engagement
                engagement = self.analyze_engagement(emotion_data)
                total_engagement += engagement['engagement_score']
            
            # Determine dominant emotion
            dominant_emotion = max(emotion_counts, key=emotion_counts.get)
            
            # Average engagement
            avg_engagement = total_engagement / len(emotion_list)
            
            # Overall mood
            if avg_engagement >= 0.7:
                overall_mood = 'positive'
            elif avg_engagement >= 0.5:
                overall_mood = 'neutral'
            else:
                overall_mood = 'needs_attention'
            
            return {
                'overall_mood': overall_mood,
                'dominant_emotion': dominant_emotion,
                'average_engagement': float(avg_engagement),
                'emotion_distribution': emotion_counts,
                'total_students': len(emotion_list)
            }
            
        except Exception as e:
            print(f"Error analyzing classroom mood: {e}")
            return {'overall_mood': 'unknown', 'engagement': 0.5}

# Global instance
emotion_recognition = EmotionRecognition()
