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
                return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
            case 'professor':
                return 'bg-brand-gold/10 text-brand-gold border-brand-gold/20';
            case 'class':
                return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
            case 'session':
                return 'bg-brand-gold/10 text-brand-gold border-brand-gold/20';
            case 'notification':
                return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
            default:
                return 'bg-white/5 text-secondary/40 border-white/5';
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-start justify-center pt-32 p-4 animate-in fade-in duration-300">
            <div className="bg-maroon-950 rounded-2xl shadow-3xl border border-white/10 max-w-2xl w-full overflow-hidden animate-scale-up">
                {/* Search Input */}
                <div className="p-6 bg-black/40 border-b border-white/10">
                    <div className="relative group">
                        <Search className="absolute left-4 top-4 text-brand-gold group-focus-within:scale-110 transition-transform" size={20} />
                        <input
                            ref={inputRef}
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Search students, classes, sessions..."
                            className="w-full pl-12 pr-12 py-4 bg-black/40 border border-white/5 rounded-2xl text-white placeholder-secondary/20 focus:border-brand-gold/50 focus:outline-none transition-all font-black text-[10px] uppercase tracking-widest shadow-inner"
                        />
                        <button
                            onClick={() => setIsOpen(false)}
                            className="absolute right-4 top-4 text-secondary/40 hover:text-white transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Results */}
                <div className="max-h-96 overflow-y-auto">
                    {isLoading ? (
                        <div className="p-20 text-center">
                            <div className="inline-block w-12 h-12 border-4 border-brand-gold/10 border-t-brand-gold rounded-full animate-spin mb-6"></div>
                            <p className="text-[10px] font-black text-secondary/40 uppercase tracking-widest">Searching the campus...</p>
                        </div>
                    ) : results.length > 0 ? (
                        <div className="p-2">
                            {results.map((result, index) => {
                                const Icon = getIcon(result.type);
                                const isSelected = index === selectedIndex;

                                return (
                                    <button
                                        key={result.id}
                                        onClick={() => handleSelect(result)}
                                        className={`w-full p-5 rounded-2xl flex items-center gap-4 transition-all border shadow-inner ${isSelected
                                            ? 'bg-brand-gold text-black border-brand-gold shadow-brand-gold/20 scale-[1.02]'
                                            : 'bg-black/20 hover:bg-white/5 border-white/5 text-white'
                                            }`}
                                    >
                                        <div className={`p-2 rounded-lg border ${getTypeColor(result.type)}`}>
                                            <Icon size={18} />
                                        </div>
                                        <div className="flex-1 text-left">
                                            <p className={`font-black uppercase tracking-tight ${isSelected ? 'text-black' : 'text-white'}`}>{result.title}</p>
                                            <p className={`text-[10px] font-bold uppercase tracking-widest mt-0.5 ${isSelected ? 'text-black/60' : 'text-secondary/40'}`}>{result.subtitle}</p>
                                        </div>
                                        <ArrowRight size={18} className={isSelected ? 'text-black' : 'text-secondary/20'} />
                                    </button>
                                );
                            })}
                        </div>
                    ) : query.trim() ? (
                        <div className="p-20 text-center">
                            <Search className="mx-auto text-secondary/10 mb-6" size={56} />
                            <p className="text-[10px] font-black text-secondary/40 uppercase tracking-widest">No results found for "{query}"</p>
                            <p className="text-[8px] font-bold text-secondary/20 uppercase tracking-widest mt-2">Try searching for students, classes, or sessions</p>
                        </div>
                    ) : (
                        <div className="p-20 text-center">
                            <div className="w-20 h-20 bg-brand-gold/5 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner border border-brand-gold/10">
                                <Search className="text-brand-gold/40" size={40} />
                            </div>
                            <p className="text-[10px] font-black text-secondary/40 uppercase tracking-widest">LabFace Smart Search</p>
                            <p className="text-[8px] font-bold text-secondary/20 uppercase tracking-widest mt-2">Start typing to search the campus registry</p>
                            
                            <div className="flex items-center justify-center gap-6 mt-10 text-[8px] font-black text-secondary/20 uppercase tracking-tighter">
                                <div className="flex items-center gap-2">
                                    <kbd className="px-2.5 py-1.5 bg-black/40 rounded-lg border border-white/10 shadow-inner">↑</kbd>
                                    <kbd className="px-2.5 py-1.5 bg-black/40 rounded-lg border border-white/10 shadow-inner">↓</kbd>
                                    <span>Navigate</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <kbd className="px-3 py-1.5 bg-black/40 rounded-lg border border-white/10 shadow-inner">Enter</kbd>
                                    <span>Select</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <kbd className="px-3 py-1.5 bg-black/40 rounded-lg border border-white/10 shadow-inner">Esc</kbd>
                                    <span>Close</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 bg-black/60 border-t border-white/10">
                    <div className="flex items-center justify-between text-[8px] font-black text-secondary/20 uppercase tracking-widest">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <kbd className="px-2.5 py-1.5 bg-black/40 rounded-lg border border-white/10 shadow-inner text-white/40">Ctrl</kbd>
                                <span>+</span>
                                <kbd className="px-2.5 py-1.5 bg-black/40 rounded-lg border border-white/10 shadow-inner text-white/40">K</kbd>
                                <span className="ml-1">Global Shortcut</span>
                            </div>
                        </div>
                        <div className="text-brand-gold/40">{results.length} Registry Matches</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
