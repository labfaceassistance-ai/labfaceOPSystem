"""
Chatbot Service
AI-powered chatbot for student queries
"""

import re
from datetime import datetime
import json

class Chatbot:
    def __init__(self):
        self.intents = self._load_intents()
        self.context = {}
    
    def _load_intents(self):
        """Load chatbot intents and responses"""
        return {
            'greeting': {
                'patterns': [
                    r'\b(hi|hello|hey|good morning|good afternoon)\b',
                    r'\bhow are you\b'
                ],
                'responses': [
                    "Hello! I'm LabFace Assistant. How can I help you today?",
                    "Hi there! What would you like to know about your attendance?",
                    "Hello! I'm here to help with your attendance queries."
                ]
            },
            'attendance_rate': {
                'patterns': [
                    r'\b(what|whats|what\'s).*(my|attendance|rate)\b',
                    r'\bhow.*(doing|performing)\b',
                    r'\bmy.*attendance\b'
                ],
                'responses': [
                    "I'll check your attendance rate for you.",
                    "Let me look up your attendance statistics."
                ],
                'action': 'get_attendance_rate'
            },
            'next_class': {
                'patterns': [
                    r'\b(when|what time).*(next|upcoming).*class\b',
                    r'\bnext.*session\b',
                    r'\bupcoming.*class\b'
                ],
                'responses': [
                    "Let me check your upcoming classes.",
                    "I'll find your next scheduled session."
                ],
                'action': 'get_next_class'
            },
            'attendance_history': {
                'patterns': [
                    r'\b(show|view|see).*(history|records|logs)\b',
                    r'\bpast.*attendance\b',
                    r'\battendance.*history\b'
                ],
                'responses': [
                    "I can show you your attendance history.",
                    "Let me retrieve your attendance records."
                ],
                'action': 'get_attendance_history'
            },
            'help': {
                'patterns': [
                    r'\b(help|assist|support)\b',
                    r'\bwhat can you do\b',
                    r'\bcommands\b'
                ],
                'responses': [
                    "I can help you with:\n- Check your attendance rate\n- View upcoming classes\n- See attendance history\n- Get recommendations\n- Answer attendance questions\n\nJust ask me anything!"
                ]
            },
            'recommendations': {
                'patterns': [
                    r'\b(recommend|suggestion|advice|improve)\b',
                    r'\bhow.*improve\b',
                    r'\bwhat.*should.*do\b'
                ],
                'responses': [
                    "Let me generate personalized recommendations for you.",
                    "I'll analyze your data and provide suggestions."
                ],
                'action': 'get_recommendations'
            },
            'thanks': {
                'patterns': [
                    r'\b(thank|thanks|appreciate)\b'
                ],
                'responses': [
                    "You're welcome! Let me know if you need anything else.",
                    "Happy to help! Feel free to ask more questions.",
                    "Anytime! I'm here to assist you."
                ]
            },
            'goodbye': {
                'patterns': [
                    r'\b(bye|goodbye|see you|exit|quit)\b'
                ],
                'responses': [
                    "Goodbye! Have a great day!",
                    "See you later! Keep up the good attendance!",
                    "Bye! Don't forget to attend your classes!"
                ]
            }
        }
    
    def process_message(self, message, user_data=None):
        """Process user message and generate response"""
        try:
            message_lower = message.lower().strip()
            
            # Find matching intent
            intent = self._classify_intent(message_lower)
            
            if not intent:
                return {
                    'response': "I'm not sure I understand. Could you rephrase that? You can ask about your attendance, upcoming classes, or say 'help' to see what I can do.",
                    'intent': 'unknown',
                    'action': None
                }
            
            # Get response template
            response_template = self._get_random_response(intent)
            
            # Check if action needed
            action = self.intents[intent].get('action')
            
            if action and user_data:
                # Execute action and get data
                action_result = self._execute_action(action, user_data)
                response = self._format_response(response_template, action_result)
            else:
                response = response_template
            
            return {
                'response': response,
                'intent': intent,
                'action': action,
                'data': action_result if action and user_data else None
            }
            
        except Exception as e:
            print(f"Error processing message: {e}")
            return {
                'response': "Sorry, I encountered an error. Please try again.",
                'intent': 'error',
                'action': None
            }
    
    def _classify_intent(self, message):
        """Classify user intent from message"""
        for intent_name, intent_data in self.intents.items():
            for pattern in intent_data['patterns']:
                if re.search(pattern, message, re.IGNORECASE):
                    return intent_name
        return None
    
    def _get_random_response(self, intent):
        """Get a random response for the intent"""
        import random
        responses = self.intents[intent]['responses']
        return random.choice(responses)
    
    def _execute_action(self, action, user_data):
        """Execute action and return data"""
        if action == 'get_attendance_rate':
            return {
                'attendance_rate': user_data.get('attendance_rate', 0),
                'total_sessions': user_data.get('total_sessions', 0),
                'attended': user_data.get('attended', 0)
            }
        
        elif action == 'get_next_class':
            return {
                'next_class': user_data.get('next_class', 'No upcoming classes'),
                'time': user_data.get('next_class_time', 'N/A')
            }
        
        elif action == 'get_attendance_history':
            return {
                'recent_attendance': user_data.get('recent_attendance', [])
            }
        
        elif action == 'get_recommendations':
            return {
                'recommendations': user_data.get('recommendations', [])
            }
        
        return {}
    
    def _format_response(self, template, data):
        """Format response with action data"""
        if 'attendance_rate' in data:
            return f"{template}\n\nYour current attendance rate is {data['attendance_rate']:.1f}%. You've attended {data['attended']} out of {data['total_sessions']} sessions."
        
        elif 'next_class' in data:
            return f"{template}\n\nYour next class is: {data['next_class']} at {data['time']}"
        
        elif 'recent_attendance' in data:
            history = data['recent_attendance'][:5]
            history_text = "\n".join([f"- {record['course']}: {record['date']} ({record['status']})" for record in history])
            return f"{template}\n\nRecent attendance:\n{history_text}"
        
        elif 'recommendations' in data:
            recs = data['recommendations']
            if recs:
                rec_text = "\n".join([f"- {rec['message']}" for rec in recs])
                return f"{template}\n\nRecommendations:\n{rec_text}"
            else:
                return f"{template}\n\nYou're doing great! Keep up the good work."
        
        return template
    
    def get_quick_replies(self, intent=None):
        """Get suggested quick replies"""
        quick_replies = [
            "What's my attendance rate?",
            "When is my next class?",
            "Show my attendance history",
            "Give me recommendations",
            "Help"
        ]
        
        return quick_replies

# Global instance
chatbot = Chatbot()
