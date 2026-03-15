"""
Predictive Analytics Service
ML models for student success prediction and attendance forecasting
"""

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier, GradientBoostingRegressor
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
import joblib
import os
from datetime import datetime, timedelta
import json
import logging

# Import error handling and caching
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from utils.error_handler import handle_ai_errors, InsufficientDataError, ModelNotLoadedError
from utils.cache import prediction_cache

logger = logging.getLogger(__name__)

class PredictiveAnalytics:
    def __init__(self):
        self.models_dir = '/app/models/ml'
        os.makedirs(self.models_dir, exist_ok=True)
        
        # Initialize models
        self.success_model = None
        self.attendance_model = None
        self.risk_model = None
        self.scaler = StandardScaler()
        
        # Load models if they exist
        self.load_models()
    
    def load_models(self):
        """Load pre-trained models"""
        try:
            success_path = os.path.join(self.models_dir, 'success_model.pkl')
            attendance_path = os.path.join(self.models_dir, 'attendance_model.pkl')
            risk_path = os.path.join(self.models_dir, 'risk_model.pkl')
            scaler_path = os.path.join(self.models_dir, 'scaler.pkl')
            
            if os.path.exists(success_path):
                self.success_model = joblib.load(success_path)
            if os.path.exists(attendance_path):
                self.attendance_model = joblib.load(attendance_path)
            if os.path.exists(risk_path):
                self.risk_model = joblib.load(risk_path)
            if os.path.exists(scaler_path):
                self.scaler = joblib.load(scaler_path)
                
            print("✓ ML models loaded successfully")
        except Exception as e:
            print(f"⚠ Models not found, will train on first use: {e}")
    
    def save_models(self):
        """Save trained models"""
        try:
            if self.success_model:
                joblib.dump(self.success_model, os.path.join(self.models_dir, 'success_model.pkl'))
            if self.attendance_model:
                joblib.dump(self.attendance_model, os.path.join(self.models_dir, 'attendance_model.pkl'))
            if self.risk_model:
                joblib.dump(self.risk_model, os.path.join(self.models_dir, 'risk_model.pkl'))
            joblib.dump(self.scaler, os.path.join(self.models_dir, 'scaler.pkl'))
            print("✓ ML models saved successfully")
        except Exception as e:
            print(f"✗ Error saving models: {e}")
    
    def extract_features(self, student_data):
        """Extract features from student data"""
        features = []
        
        # Attendance features
        attendance_rate = student_data.get('attendance_rate', 0)
        total_sessions = student_data.get('total_sessions', 0)
        attended = student_data.get('attended', 0)
        
        # Temporal features
        days_enrolled = student_data.get('days_enrolled', 0)
        recent_attendance_rate = student_data.get('recent_attendance_rate', 0)  # Last 2 weeks
        
        # Engagement features
        avg_confidence = student_data.get('avg_confidence', 0)
        late_arrivals = student_data.get('late_arrivals', 0)
        
        # Trend features
        attendance_trend = student_data.get('attendance_trend', 0)  # Increasing/decreasing
        consistency_score = student_data.get('consistency_score', 0)
        
        features = [
            attendance_rate,
            total_sessions,
            attended,
            days_enrolled,
            recent_attendance_rate,
            avg_confidence,
            late_arrivals,
            attendance_trend,
            consistency_score
        ]
        
        return np.array(features).reshape(1, -1)
    
    def predict_student_success(self, student_data):
        """Predict student success probability"""
        try:
            # Extract features
            features = self.extract_features(student_data)
            
            # Scale features
            features_scaled = self.scaler.transform(features)
            
            # If model not trained, use rule-based prediction
            if self.success_model is None:
                return self._rule_based_success_prediction(student_data)
            
            # Predict probability
            probability = self.success_model.predict_proba(features_scaled)[0][1]
            
            # Generate recommendations
            recommendations = self._generate_recommendations(student_data, probability)
            
            return {
                'success_probability': float(probability),
                'risk_level': self._get_risk_level(probability),
                'recommendations': recommendations,
                'confidence': 0.85
            }
            
        except Exception as e:
            print(f"Error in prediction: {e}")
            return self._rule_based_success_prediction(student_data)
    
    def _rule_based_success_prediction(self, student_data):
        """Fallback rule-based prediction"""
        attendance_rate = student_data.get('attendance_rate', 0)
        recent_rate = student_data.get('recent_attendance_rate', attendance_rate)
        
        # Simple scoring
        score = (attendance_rate * 0.6 + recent_rate * 0.4) / 100
        
        return {
            'success_probability': float(score),
            'risk_level': self._get_risk_level(score),
            'recommendations': self._generate_recommendations(student_data, score),
            'confidence': 0.70
        }
    
    def _get_risk_level(self, probability):
        """Determine risk level from probability"""
        if probability >= 0.8:
            return 'low'
        elif probability >= 0.6:
            return 'medium'
        else:
            return 'high'
    
    def _generate_recommendations(self, student_data, probability):
        """Generate personalized recommendations"""
        recommendations = []
        
        attendance_rate = student_data.get('attendance_rate', 0)
        recent_rate = student_data.get('recent_attendance_rate', attendance_rate)
        
        if attendance_rate < 75:
            recommendations.append({
                'type': 'attendance',
                'priority': 'high',
                'message': 'Your attendance is below 75%. Attend more classes to improve.',
                'action': 'Aim for 90%+ attendance in the next 2 weeks'
            })
        
        if recent_rate < attendance_rate - 10:
            recommendations.append({
                'type': 'trend',
                'priority': 'high',
                'message': 'Your recent attendance is declining.',
                'action': 'Schedule a meeting with your professor'
            })
        
        if student_data.get('late_arrivals', 0) > 5:
            recommendations.append({
                'type': 'punctuality',
                'priority': 'medium',
                'message': 'You have multiple late arrivals.',
                'action': 'Try to arrive 10 minutes early'
            })
        
        if probability >= 0.8:
            recommendations.append({
                'type': 'positive',
                'priority': 'low',
                'message': 'Great job! Keep up the excellent attendance.',
                'action': 'Maintain your current pace'
            })
        
        return recommendations
    
    def forecast_attendance(self, historical_data, days_ahead=7):
        """Forecast future attendance"""
        try:
            # Simple moving average forecast
            if len(historical_data) < 7:
                return self._simple_forecast(historical_data, days_ahead)
            
            # Use last 30 days for prediction
            recent_data = historical_data[-30:]
            
            # Calculate trend
            x = np.arange(len(recent_data))
            y = np.array([d['count'] for d in recent_data])
            
            # Linear regression for trend
            z = np.polyfit(x, y, 1)
            trend = z[0]
            
            # Forecast
            forecast = []
            last_value = y[-1]
            
            for i in range(days_ahead):
                predicted = last_value + (trend * (i + 1))
                predicted = max(0, predicted)  # No negative attendance
                
                forecast.append({
                    'day': i + 1,
                    'predicted_count': int(predicted),
                    'confidence': 0.75 - (i * 0.05)  # Decreasing confidence
                })
            
            return forecast
            
        except Exception as e:
            print(f"Error in forecasting: {e}")
            return self._simple_forecast(historical_data, days_ahead)
    
    def _simple_forecast(self, historical_data, days_ahead):
        """Simple average-based forecast"""
        if not historical_data:
            return []
        
        avg = np.mean([d['count'] for d in historical_data[-7:]])
        
        return [{
            'day': i + 1,
            'predicted_count': int(avg),
            'confidence': 0.60
        } for i in range(days_ahead)]
    
    def calculate_risk_score(self, student_data):
        """Calculate dropout/failure risk score"""
        try:
            features = self.extract_features(student_data)
            features_scaled = self.scaler.transform(features)
            
            if self.risk_model is None:
                return self._rule_based_risk_score(student_data)
            
            risk_score = self.risk_model.predict(features_scaled)[0]
            
            return {
                'risk_score': float(risk_score),
                'risk_level': self._get_risk_category(risk_score),
                'factors': self._identify_risk_factors(student_data)
            }
            
        except Exception as e:
            print(f"Error calculating risk: {e}")
            return self._rule_based_risk_score(student_data)
    
    def _rule_based_risk_score(self, student_data):
        """Rule-based risk scoring"""
        attendance_rate = student_data.get('attendance_rate', 100)
        recent_rate = student_data.get('recent_attendance_rate', attendance_rate)
        
        # Calculate risk (0-100, higher = more risk)
        risk = 100 - attendance_rate
        
        # Increase risk if declining
        if recent_rate < attendance_rate - 10:
            risk += 15
        
        # Cap at 100
        risk = min(100, risk)
        
        return {
            'risk_score': float(risk),
            'risk_level': self._get_risk_category(risk),
            'factors': self._identify_risk_factors(student_data)
        }
    
    def _get_risk_category(self, score):
        """Categorize risk score"""
        if score < 30:
            return 'low'
        elif score < 60:
            return 'medium'
        else:
            return 'high'
    
    def _identify_risk_factors(self, student_data):
        """Identify contributing risk factors"""
        factors = []
        
        if student_data.get('attendance_rate', 100) < 75:
            factors.append('Low overall attendance')
        
        if student_data.get('recent_attendance_rate', 100) < 70:
            factors.append('Recent attendance decline')
        
        if student_data.get('late_arrivals', 0) > 5:
            factors.append('Frequent late arrivals')
        
        if student_data.get('consistency_score', 100) < 60:
            factors.append('Inconsistent attendance pattern')
        
        return factors
    
    def train_models(self, training_data):
        """Train ML models with historical data"""
        try:
            # Prepare data
            X = []
            y_success = []
            y_risk = []
            
            for student in training_data:
                features = self.extract_features(student)
                X.append(features[0])
                y_success.append(student.get('success', 1))
                y_risk.append(student.get('risk_score', 0))
            
            X = np.array(X)
            y_success = np.array(y_success)
            y_risk = np.array(y_risk)
            
            # Scale features
            X_scaled = self.scaler.fit_transform(X)
            
            # Train success model
            self.success_model = RandomForestClassifier(n_estimators=100, random_state=42)
            self.success_model.fit(X_scaled, y_success)
            
            # Train risk model
            self.risk_model = GradientBoostingRegressor(n_estimators=100, random_state=42)
            self.risk_model.fit(X_scaled, y_risk)
            
            # Save models
            self.save_models()
            
            print("✓ ML models trained successfully")
            return True
            
        except Exception as e:
            print(f"✗ Error training models: {e}")
            return False

# Global instance
predictive_analytics = PredictiveAnalytics()
