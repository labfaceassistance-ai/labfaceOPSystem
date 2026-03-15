"""
Caching utilities for AI predictions
"""

import json
from datetime import datetime, timedelta
from typing import Any, Optional
import hashlib

class PredictionCache:
    """Simple in-memory cache for AI predictions"""
    
    def __init__(self, ttl_minutes=30):
        self.cache = {}
        self.ttl = timedelta(minutes=ttl_minutes)
    
    def _generate_key(self, data: dict) -> str:
        """Generate cache key from data"""
        data_str = json.dumps(data, sort_keys=True)
        return hashlib.md5(data_str.encode()).hexdigest()
    
    def get(self, key_data: dict) -> Optional[Any]:
        """Get cached prediction"""
        key = self._generate_key(key_data)
        
        if key in self.cache:
            entry = self.cache[key]
            if datetime.now() - entry['timestamp'] < self.ttl:
                return entry['data']
            else:
                # Expired, remove from cache
                del self.cache[key]
        
        return None
    
    def set(self, key_data: dict, value: Any):
        """Cache prediction"""
        key = self._generate_key(key_data)
        self.cache[key] = {
            'data': value,
            'timestamp': datetime.now()
        }
    
    def clear(self):
        """Clear all cache"""
        self.cache.clear()
    
    def clear_expired(self):
        """Remove expired entries"""
        now = datetime.now()
        expired_keys = [
            k for k, v in self.cache.items()
            if now - v['timestamp'] >= self.ttl
        ]
        for key in expired_keys:
            del self.cache[key]

# Global cache instances
prediction_cache = PredictionCache(ttl_minutes=30)
chatbot_cache = PredictionCache(ttl_minutes=5)
