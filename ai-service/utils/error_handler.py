"""
Error handling utilities for AI services
"""

from functools import wraps
import logging

logger = logging.getLogger(__name__)

class AIServiceError(Exception):
    """Base exception for AI service errors"""
    pass

class ModelNotLoadedError(AIServiceError):
    """Raised when ML model is not loaded"""
    pass

class PredictionError(AIServiceError):
    """Raised when prediction fails"""
    pass

class InsufficientDataError(AIServiceError):
    """Raised when there's not enough data for prediction"""
    pass

def handle_ai_errors(fallback_response=None):
    """Decorator for handling AI service errors gracefully"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            try:
                return await func(*args, **kwargs)
            except InsufficientDataError as e:
                logger.warning(f"Insufficient data: {e}")
                return fallback_response or {
                    'error': 'insufficient_data',
                    'message': 'Not enough data for prediction',
                    'fallback': True
                }
            except ModelNotLoadedError as e:
                logger.error(f"Model not loaded: {e}")
                return fallback_response or {
                    'error': 'model_not_loaded',
                    'message': 'AI model not available',
                    'fallback': True
                }
            except PredictionError as e:
                logger.error(f"Prediction failed: {e}")
                return fallback_response or {
                    'error': 'prediction_failed',
                    'message': 'Prediction failed, using fallback',
                    'fallback': True
                }
            except Exception as e:
                logger.error(f"Unexpected error in {func.__name__}: {e}")
                return fallback_response or {
                    'error': 'unknown',
                    'message': 'An unexpected error occurred',
                    'fallback': True
                }
        return wrapper
    return decorator
