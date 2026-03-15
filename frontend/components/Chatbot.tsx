'use client';
import { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Sparkles } from 'lucide-react';
import { getToken } from '@/utils/auth';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

interface Message {
    id: string;
    text: string;
    sender: 'user' | 'bot';
    timestamp: Date;
}

export default function Chatbot() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [quickReplies, setQuickReplies] = useState<string[]>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Initial greeting
        setMessages([{
            id: '1',
            text: "Hello! I'm LabFace Assistant. How can I help you today?",
            sender: 'bot',
            timestamp: new Date()
        }]);

        // Load quick replies
        loadQuickReplies();
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const loadQuickReplies = async () => {
        try {
            const token = getToken();
            const response = await axios.get(`${API_URL}/api/ai/chatbot/quick-replies`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setQuickReplies(response.data.quick_replies || []);
        } catch (error) {
            console.error('Error loading quick replies:', error);
        }
    };

    const sendMessage = async (text: string) => {
        if (!text.trim()) return;

        // Add user message
        const userMessage: Message = {
            id: Date.now().toString(),
            text,
            sender: 'user',
            timestamp: new Date()
        };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setLoading(true);

        try {
            const token = getToken();
            const response = await axios.post(`${API_URL}/api/ai/chatbot/message`,
                { message: text },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            // Add bot response
            const botMessage: Message = {
                id: (Date.now() + 1).toString(),
                text: response.data.response,
                sender: 'bot',
                timestamp: new Date()
            };
            setMessages(prev => [...prev, botMessage]);
        } catch (error) {
            console.error('Error sending message:', error);
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                text: "Sorry, I encountered an error. Please try again.",
                sender: 'bot',
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        sendMessage(input);
    };

    const handleQuickReply = (reply: string) => {
        sendMessage(reply);
    };

    return (
        <div className="flex flex-col h-full bg-slate-900 rounded-xl border border-slate-700 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                    <Bot className="text-blue-600" size={24} />
                </div>
                <div>
                    <h3 className="text-white font-bold">LabFace Assistant</h3>
                    <p className="text-blue-100 text-sm">AI-Powered Help</p>
                </div>
                <Sparkles className="ml-auto text-yellow-300" size={20} />
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((message) => (
                    <div
                        key={message.id}
                        className={`flex items-start gap-3 ${message.sender === 'user' ? 'flex-row-reverse' : ''
                            }`}
                    >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${message.sender === 'user'
                            ? 'bg-blue-600'
                            : 'bg-purple-600'
                            }`}>
                            {message.sender === 'user' ? (
                                <User size={16} className="text-white" />
                            ) : (
                                <Bot size={16} className="text-white" />
                            )}
                        </div>
                        <div className={`max-w-[70%] ${message.sender === 'user' ? 'text-right' : ''
                            }`}>
                            <div className={`inline-block p-3 rounded-lg ${message.sender === 'user'
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-700 text-white'
                                }`}>
                                <p className="whitespace-pre-wrap">{message.text}</p>
                            </div>
                            <p className="text-xs text-slate-500 mt-1">
                                {message.timestamp.toLocaleTimeString()}
                            </p>
                        </div>
                    </div>
                ))}
                {loading && (
                    <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center">
                            <Bot size={16} className="text-white" />
                        </div>
                        <div className="bg-slate-700 p-3 rounded-lg">
                            <div className="flex gap-1">
                                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Quick Replies */}
            {quickReplies.length > 0 && messages.length <= 2 && (
                <div className="px-4 pb-2">
                    <p className="text-xs text-slate-400 mb-2">Quick questions:</p>
                    <div className="flex flex-wrap gap-2">
                        {quickReplies.slice(0, 3).map((reply, index) => (
                            <button
                                key={index}
                                onClick={() => handleQuickReply(reply)}
                                className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-full transition-colors"
                            >
                                {reply}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Input */}
            <form onSubmit={handleSubmit} className="p-4 bg-slate-800 border-t border-slate-700">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Type your message..."
                        className="flex-1 px-4 py-2 bg-slate-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={loading}
                    />
                    <button
                        type="submit"
                        disabled={loading || !input.trim()}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white rounded-lg transition-colors flex items-center gap-2"
                    >
                        <Send size={20} />
                    </button>
                </div>
            </form>
        </div>
    );
}
