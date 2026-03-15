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
                return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
            case 'professor':
                return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
            case 'class':
                return 'bg-green-500/20 text-green-400 border-green-500/30';
            case 'session':
                return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
            case 'notification':
                return 'bg-red-500/20 text-red-400 border-red-500/30';
            default:
                return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex items-start justify-center pt-32 p-4 animate-in fade-in duration-200">
            <div className="bg-slate-900 rounded-2xl shadow-2xl border border-slate-800 max-w-2xl w-full animate-in zoom-in duration-200">
                {/* Search Input */}
                <div className="p-4 border-b border-slate-800">
                    <div className="relative">
                        <Search className="absolute left-3 top-3.5 text-slate-400" size={20} />
                        <input
                            ref={inputRef}
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Search students, classes, sessions..."
                            className="w-full pl-11 pr-10 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all"
                        />
                        <button
                            onClick={() => setIsOpen(false)}
                            className="absolute right-3 top-3 text-slate-400 hover:text-white transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Results */}
                <div className="max-h-96 overflow-y-auto">
                    {isLoading ? (
                        <div className="p-8 text-center">
                            <div className="inline-block w-8 h-8 border-4 border-slate-700 border-t-brand-500 rounded-full animate-spin"></div>
                            <p className="text-slate-400 mt-4">Searching...</p>
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
                                        className={`w-full p-3 rounded-lg flex items-center gap-3 transition-all ${isSelected
                                            ? 'bg-brand-500/20 border border-brand-500/50'
                                            : 'hover:bg-slate-800 border border-transparent'
                                            }`}
                                    >
                                        <div className={`p-2 rounded-lg border ${getTypeColor(result.type)}`}>
                                            <Icon size={18} />
                                        </div>
                                        <div className="flex-1 text-left">
                                            <p className="text-white font-medium">{result.title}</p>
                                            <p className="text-sm text-slate-400">{result.subtitle}</p>
                                        </div>
                                        <ArrowRight size={18} className="text-slate-500" />
                                    </button>
                                );
                            })}
                        </div>
                    ) : query.trim() ? (
                        <div className="p-8 text-center">
                            <Search className="mx-auto text-slate-600 mb-4" size={48} />
                            <p className="text-slate-400">No results found for "{query}"</p>
                            <p className="text-sm text-slate-500 mt-2">Try searching for students, classes, or sessions</p>
                        </div>
                    ) : (
                        <div className="p-8 text-center">
                            <Search className="mx-auto text-slate-600 mb-4" size={48} />
                            <p className="text-slate-400">Start typing to search</p>
                            <div className="flex items-center justify-center gap-4 mt-4 text-xs text-slate-500">
                                <div className="flex items-center gap-1">
                                    <kbd className="px-2 py-1 bg-slate-800 rounded border border-slate-700">↑</kbd>
                                    <kbd className="px-2 py-1 bg-slate-800 rounded border border-slate-700">↓</kbd>
                                    <span>Navigate</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <kbd className="px-2 py-1 bg-slate-800 rounded border border-slate-700">Enter</kbd>
                                    <span>Select</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <kbd className="px-2 py-1 bg-slate-800 rounded border border-slate-700">Esc</kbd>
                                    <span>Close</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-3 border-t border-slate-800 bg-slate-900/50">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                        <div className="flex items-center gap-2">
                            <kbd className="px-2 py-1 bg-slate-800 rounded border border-slate-700">Ctrl</kbd>
                            <span>+</span>
                            <kbd className="px-2 py-1 bg-slate-800 rounded border border-slate-700">K</kbd>
                            <span>to open search</span>
                        </div>
                        <span>{results.length} results</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
