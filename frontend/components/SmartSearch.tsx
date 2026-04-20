/**
 * Smart Global Search Component
 * Keyboard shortcut: Ctrl+K or Cmd+K
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, User, BookOpen, Calendar, Bell, X, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { getToken } from '../utils/auth';

interface SearchResult {
    type: 'student' | 'professor' | 'class' | 'session' | 'notification';
    id: string;
    title: string;
    subtitle: string;
    url: string;
}

export default function SmartSearch() {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();

    // Keyboard shortcut: Ctrl+K or Cmd+K
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                setIsOpen(true);
            }
            if (e.key === 'Escape') {
                setIsOpen(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Focus input when opened
    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    // Search with debounce
    useEffect(() => {
        if (!query.trim()) {
            setResults([]);
            return;
        }

        setIsLoading(true);
        const timeoutId = setTimeout(async () => {
            try {
                const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000';
                const response = await axios.get(`${API_URL}/api/search`, {
                    params: { q: query },
                    headers: {
                        Authorization: `Bearer ${getToken()}`
                    }
                });
                setResults(response.data.results || []);
                setSelectedIndex(0);
            } catch (error) {
                console.error('Search error:', error);
                setResults([]);
            } finally {
                setIsLoading(false);
            }
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [query]);

    // Keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex((prev) => (prev + 1) % results.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex((prev) => (prev - 1 + results.length) % results.length);
        } else if (e.key === 'Enter' && results[selectedIndex]) {
            e.preventDefault();
            handleSelect(results[selectedIndex]);
        }
    };

    const handleSelect = (result: SearchResult) => {
        router.push(result.url);
        setIsOpen(false);
        setQuery('');
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'student':
            case 'professor':
                return User;
            case 'class':
                return BookOpen;
            case 'session':
                return Calendar;
            case 'notification':
                return Bell;
            default:
                return Search;
        }
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'student':
                return 'bg-emerald-50 text-emerald-600 border-emerald-100';
            case 'professor':
                return 'bg-identity-sky/10 text-identity-navy border-identity-sky/20';
            case 'class':
                return 'bg-amber-50 text-amber-600 border-amber-100';
            case 'session':
                return 'bg-identity-sky/10 text-identity-navy border-identity-sky/20';
            case 'notification':
                return 'bg-rose-50 text-rose-600 border-rose-100';
            default:
                return 'bg-slate-50 text-slate-400 border-slate-100';
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-identity-navy/40 backdrop-blur-md z-[100] flex items-start justify-center pt-32 p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-[2rem] shadow-[0_32px_64px_-12px_rgba(4,28,60,0.3)] border border-identity-sky/10 max-w-2xl w-full overflow-hidden animate-scale-up">
                {/* Search Input */}
                <div className="p-6 bg-slate-50/50 border-b border-slate-100">
                    <div className="relative group">
                        <Search className="absolute left-4 top-4 text-identity-sky group-focus-within:scale-110 transition-transform" size={20} />
                        <input
                            ref={inputRef}
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Search the campus nexus..."
                            className="w-full pl-12 pr-12 py-4 bg-white border border-slate-200 rounded-2xl text-identity-navy placeholder-slate-300 focus:border-identity-sky/50 focus:ring-4 focus:ring-identity-sky/5 focus:outline-none transition-all font-black text-[10px] uppercase tracking-widest shadow-inner shadow-slate-100/50"
                        />
                        <button
                            onClick={() => setIsOpen(false)}
                            className="absolute right-4 top-4 text-slate-300 hover:text-identity-navy transition-colors bg-slate-100/50 p-1 rounded-lg"
                        >
                            <X size={16} />
                        </button>
                    </div>
                </div>

                {/* Results */}
                <div className="max-h-96 overflow-y-auto p-2">
                    {isLoading ? (
                        <div className="p-20 text-center">
                            <div className="inline-block w-12 h-12 border-4 border-identity-sky/10 border-t-identity-sky rounded-full animate-spin mb-6 shadow-sm"></div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Accessing Neural Registry...</p>
                        </div>
                    ) : results.length > 0 ? (
                        <div className="space-y-1">
                            {results.map((result, index) => {
                                const Icon = getIcon(result.type);
                                const isSelected = index === selectedIndex;

                                return (
                                    <button
                                        key={result.id}
                                        onClick={() => handleSelect(result)}
                                        className={`w-full p-5 rounded-2xl flex items-center gap-4 transition-all border ${isSelected
                                            ? 'bg-identity-navy text-white border-identity-navy shadow-xl shadow-identity-navy/20 scale-[1.01]'
                                            : 'bg-white hover:bg-slate-50 border-transparent text-identity-navy'
                                            }`}
                                    >
                                        <div className={`p-2.5 rounded-xl border ${getTypeColor(result.type)} ${isSelected ? 'brightness-125 saturate-50' : ''}`}>
                                            <Icon size={18} />
                                        </div>
                                        <div className="flex-1 text-left">
                                            <p className={`font-black uppercase tracking-tight ${isSelected ? 'text-white' : 'text-identity-navy'}`}>{result.title}</p>
                                            <p className={`text-[10px] font-bold uppercase tracking-widest mt-0.5 ${isSelected ? 'text-white/60' : 'text-slate-400'}`}>{result.subtitle}</p>
                                        </div>
                                        <ArrowRight size={18} className={isSelected ? 'text-white' : 'text-slate-200'} />
                                    </button>
                                );
                            })}
                        </div>
                    ) : query.trim() ? (
                        <div className="p-20 text-center">
                            <Search className="mx-auto text-slate-100 mb-6" size={56} />
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No neural matches for "{query}"</p>
                            <p className="text-[8px] font-bold text-slate-300 uppercase tracking-widest mt-2">Check the subject identifier or section code</p>
                        </div>
                    ) : (
                        <div className="p-20 text-center">
                            <div className="w-20 h-20 bg-identity-sky/5 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner border border-identity-sky/10">
                                <Search className="text-identity-sky/40" size={40} />
                            </div>
                            <p className="text-[10px] font-black text-identity-navy uppercase tracking-[0.4em] italic mb-2">Smart Nexus Search</p>
                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Start typing to scan the campus global registry</p>
                            
                            <div className="flex items-center justify-center gap-6 mt-10 text-[8px] font-black text-slate-300 uppercase tracking-tighter">
                                <div className="flex items-center gap-2">
                                    <kbd className="px-2.5 py-1.5 bg-slate-50 rounded-lg border border-slate-100 shadow-sm font-outfit text-slate-500">↑</kbd>
                                    <kbd className="px-2.5 py-1.5 bg-slate-50 rounded-lg border border-slate-100 shadow-sm font-outfit text-slate-500">↓</kbd>
                                    <span>Navigate</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <kbd className="px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-100 shadow-sm font-outfit text-slate-500">Enter</kbd>
                                    <span>Select</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <kbd className="px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-100 shadow-sm font-outfit text-slate-500">Esc</kbd>
                                    <span>Close</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 bg-slate-50/50 border-t border-slate-100">
                    <div className="flex items-center justify-between text-[8px] font-black text-slate-400 uppercase tracking-widest">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <kbd className="px-2.5 py-1.5 bg-white rounded-lg border border-slate-200 shadow-sm text-slate-500 font-outfit">Ctrl</kbd>
                                <span className="text-slate-300">+</span>
                                <kbd className="px-2.5 py-1.5 bg-white rounded-lg border border-slate-200 shadow-sm text-slate-500 font-outfit">K</kbd>
                                <span className="ml-1 text-slate-300">Global Command</span>
                            </div>
                        </div>
                        <div className="text-identity-sky font-black italic">{results.length} Nexus Links</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
