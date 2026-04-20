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
            <div className="identity-glass rounded-[2rem] md:rounded-[3rem] shadow-[0_32px_64px_-12px_rgba(4,28,60,0.3)] border border-identity-sky/10 max-w-2xl w-full overflow-hidden animate-scale-up font-outfit">
                {/* Search Input */}
                <div className="p-6 bg-white/40 border-b border-slate-100/50">
                    <div className="relative group">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-identity-sky group-focus-within:scale-110 transition-transform" size={20} />
                        <input
                            ref={inputRef}
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Search the system registry..."
                            className="w-full pl-16 pr-12 py-5 bg-white/60 border border-slate-200 rounded-2xl text-identity-navy placeholder-slate-300 focus:border-identity-sky/50 focus:ring-4 focus:ring-identity-sky/5 focus:outline-none transition-all font-black text-[11px] uppercase tracking-[0.2em] shadow-inner shadow-slate-100/50 italic"
                        />
                        <button
                            onClick={() => setIsOpen(false)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 p-3 min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-300 hover:text-identity-navy transition-colors bg-white/60 rounded-xl shadow-sm border border-slate-100"
                            title="Close Search"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Results */}
                <div className="max-h-96 overflow-y-auto p-4 custom-scrollbar">
                    {isLoading ? (
                        <div className="p-20 text-center">
                            <div className="inline-block w-12 h-12 border-4 border-identity-sky/10 border-t-identity-sky rounded-full animate-spin mb-6 shadow-sm"></div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] italic">Retrieving Node Data...</p>
                        </div>
                    ) : results.length > 0 ? (
                        <div className="space-y-2">
                            {results.map((result, index) => {
                                const Icon = getIcon(result.type);
                                const isSelected = index === selectedIndex;

                                return (
                                    <button
                                        key={result.id}
                                        onClick={() => handleSelect(result)}
                                        className={`w-full p-6 rounded-[1.5rem] flex items-center gap-6 transition-all border ${isSelected
                                            ? 'bg-identity-navy text-white border-identity-navy shadow-xl shadow-identity-navy/20 scale-[1.01]'
                                            : 'bg-white/40 hover:bg-white/60 border-transparent text-identity-navy'
                                            }`}
                                    >
                                        <div className={`p-3 rounded-xl border ${getTypeColor(result.type)} ${isSelected ? 'brightness-125 saturate-50' : ''}`}>
                                            <Icon size={18} />
                                        </div>
                                        <div className="flex-1 text-left">
                                            <p className={`font-black uppercase tracking-tight italic ${isSelected ? 'text-white' : 'text-identity-navy'}`}>{result.title}</p>
                                            <p className={`text-[10px] font-black uppercase tracking-[0.2em] mt-1 ${isSelected ? 'text-white/60' : 'text-slate-400'}`}>{result.subtitle}</p>
                                        </div>
                                        <ArrowRight size={18} className={isSelected ? 'text-white' : 'text-slate-200'} />
                                    </button>
                                );
                            })}
                        </div>
                    ) : query.trim() ? (
                        <div className="p-20 text-center">
                            <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
                                <Search className="text-slate-200" size={40} />
                            </div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] italic">Zero matching records detected.</p>
                            <p className="text-[8px] font-black text-slate-300 uppercase tracking-[0.2em] mt-3 italic">Verify the subject identifier or protocol name.</p>
                        </div>
                    ) : (
                        <div className="p-20 text-center">
                            <div className="w-24 h-24 bg-identity-sky/5 rounded-full flex items-center justify-center mx-auto mb-10 shadow-inner border border-identity-sky/10">
                                <Search className="text-identity-sky/40" size={48} />
                            </div>
                            <p className="text-[11px] font-black text-identity-navy uppercase tracking-[0.4em] italic mb-3">System Registry Search</p>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] italic">Enter query to scan the global system register</p>
                            
                            <div className="flex items-center justify-center gap-8 mt-12 text-[9px] font-black text-slate-300 uppercase tracking-[0.2em] italic">
                                <div className="flex items-center gap-3">
                                    <kbd className="px-3 py-2 bg-white rounded-xl border border-slate-100 shadow-sm font-outfit text-slate-500">↑↓</kbd>
                                    <span>Navigate</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <kbd className="px-4 py-2 bg-white rounded-xl border border-slate-100 shadow-sm font-outfit text-slate-500">Enter</kbd>
                                    <span>Select</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <kbd className="px-4 py-2 bg-white rounded-xl border border-slate-100 shadow-sm font-outfit text-slate-500">Esc</kbd>
                                    <span>Abort</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-5 bg-white/40 border-t border-slate-100/50">
                    <div className="flex items-center justify-between text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] italic">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-3">
                                <kbd className="px-3 py-2 bg-white rounded-xl border border-slate-200 shadow-sm text-slate-500 font-outfit">Ctrl + K</kbd>
                                <span className="text-identity-sky/40 font-black">Global Access Protocol</span>
                            </div>
                        </div>
                        <div className="text-identity-sky bg-identity-sky/10 px-4 py-2 rounded-full border border-identity-sky/20 shadow-sm">
                            {results.length} Active Node Link{results.length !== 1 ? 's' : ''}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
