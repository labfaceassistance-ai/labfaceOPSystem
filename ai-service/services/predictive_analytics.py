"""
Predictive Analytics Module for LabFace
Provides logical methods for attendance forecasting, risk calculation, 
and student success prediction based on historical data.
"""

from typing import List, Dict, Any
from datetime import datetime, timedelta

class PredictiveAnalytics:
    def __init__(self):
        pass

    def forecast_attendance(self, historical_data: List[Dict[str, Any]], days_ahead: int = 7) -> List[Dict[str, Any]]:
        """
        Forecast future attendance based on historical data using simple moving average/linear trends.
        """
        if not historical_data:
            # Fallback if no data provided
            return [{"day": i, "predicted_rate": 85.0} for i in range(1, days_ahead + 1)]
            
        # Extract attendance rates
        rates = [item.get('rate', 85.0) for item in historical_data]
        
        # Simple forecasting (moving average of last 3 if available, otherwise average)
        if len(rates) >= 3:
            base_pred = sum(rates[-3:]) / 3.0
        else:
            base_pred = sum(rates) / len(rates)
            
        # Generate forecast with slight variation
        forecast = []
        for i in range(1, days_ahead + 1):
            # Introduce a slight decay or stabilization towards 80% (just as a placeholder heuristic)
            pred = base_pred - (0.5 * i)
            pred = max(min(pred, 100.0), 50.0) # clamp between 50 and 100
            
            # Format date string
            future_date = datetime.now() + timedelta(days=i)
            
            forecast.append({
                "date": future_date.strftime("%Y-%m-%d"),
                "predicted_rate": round(pred, 2)
            })
            
        return forecast

    def calculate_risk_score(self, student_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Calculate risk of dropping out or failing based on attendance patterns.
        """
        attendance_rate = float(student_data.get("attendance_rate", 100.0))
        absences = int(student_data.get("absences", 0))
        lates = int(student_data.get("lates", 0))
        
        # Simple heuristic rule-based risk
        score = 0.0
        factors = []
        
        if attendance_rate < 80.0:
            score += 0.4
            factors.append("Low overall attendance rate")
        if absences > 3:
            score += 0.3
            factors.append("High number of absences")
        if lates > 5:
            score += 0.2
            factors.append("Frequent tardiness")
            
        # Determine level
        if score > 0.6:
            level = "High"
        elif score > 0.3:
            level = "Medium"
        else:
            level = "Low"
            
        return {
            "risk_score": min(score, 1.0),
            "risk_level": level,
            "factors": factors
        }

    def predict_student_success(self, student_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Predict probability of successfully completing the course/semester.
        """
        attendance_rate = float(student_data.get("attendance_rate", 85.0))
        engagement_score = float(student_data.get("engagement_score", 0.8))
        
        # Base probability depends heavily on attendance
        prob = (attendance_rate / 100.0) * 0.7 + engagement_score * 0.3
        
        factors = []
        if attendance_rate > 90:
            factors.append("Excellent attendance")
        elif attendance_rate < 75:
            factors.append("Poor attendance may impact success")
            
        if engagement_score > 0.8:
            factors.append("High engagement detected")
            
        return {
            "success_probability": round(min(prob, 1.0), 3),
            "factors": factors
        }

# Instantiate singleton
predictive_analytics = PredictiveAnalytics()
