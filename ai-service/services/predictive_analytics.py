"""
Predictive Analytics Module for LabFace (Refined)
Provides logical methods for attendance forecasting and risk calculation.
"""

from typing import List, Dict, Any
from datetime import datetime, timedelta

class PredictiveAnalytics:
    def __init__(self):
        pass

    def forecast_attendance(self, historical_data: List[Dict[str, Any]], days_ahead: int = 7) -> List[Dict[str, Any]]:
        """
        Forecast future attendance based on historical counts.
        """
        if not historical_data:
            return []
            
        # Extract counts
        counts = [item.get('count', 0) for item in historical_data]
        
        # Simple forecasting (moving average of last 3 if available)
        if len(counts) >= 3:
            avg_count = sum(counts[-3:]) / 3.0
        else:
            avg_count = sum(counts) / len(counts)
            
        forecast = []
        for i in range(1, days_ahead + 1):
            # Formulate a prediction that stays relatively stable with +/- 5% jitter
            # In a real scenario, this would use a more complex regression model
            prediction = avg_count
            
            future_date = datetime.now() + timedelta(days=i)
            
            forecast.append({
                "day": i,
                "date": future_date.strftime("%Y-%m-%d"),
                "predicted_count": round(prediction, 1)
            })
            
        return forecast

    def calculate_risk(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Calculate risk score based on real attendance stats.
        """
        rate = float(data.get("attendance_rate", 100.0))
        absences = int(data.get("absences", 0))
        lates = int(data.get("lates", 0))
        
        score = 0
        factors = []
        
        # Attendance below threshold
        if rate < 75.0:
            score += 50
            factors.append("Attendance below 75% threshold")
        elif rate < 85.0:
            score += 20
            factors.append("Attendance shows early signs of decline")
            
        # Excessive Absences
        if absences >= 3:
            score += 30
            factors.append(f"Cumulative absences high ({absences})")
            
        # Punctuality
        if lates >= 5:
            score += 15
            factors.append("Frequent tardiness affecting engagement")
            
        # Cap score at 100
        score = min(score, 100)
        
        # Determine level
        if score >= 60:
            level = "high"
        elif score >= 30:
            level = "medium"
        else:
            level = "low"
            
        return {
            "risk_score": score,
            "risk_level": level,
            "factors": factors
        }

    def predict_success(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Simplified success prediction based on consistency.
        """
        rate = float(data.get("attendance_rate", 0))
        
        # High attendance is the strongest predictor of success
        prob = rate / 100.0
        
        return {
            "success_probability": round(prob, 2),
            "status": "on_track" if rate >= 75 else "intervention_needed"
        }

# Instantiate singleton
predictive_analytics = PredictiveAnalytics()
