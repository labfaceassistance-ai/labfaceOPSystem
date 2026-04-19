/**
 * Theme and Personalization System
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Theme = 'dark' | 'light' | 'auto';
type Language = 'en' | 'fil';
type DashboardLayout = 'compact' | 'detailed';

interface UserPreferences {
    theme: Theme;
    language: Language;
    dashboardLayout: DashboardLayout;
    emailNotifications: boolean;
    pushNotifications: boolean;
    notificationFrequency: 'all' | 'important' | 'none';
}

interface PersonalizationContextType {
    preferences: UserPreferences;
    updatePreference: <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => void;
    resetPreferences: () => void;
}

const defaultPreferences: UserPreferences = {
    theme: 'dark',
    language: 'en',
    dashboardLayout: 'detailed',
    emailNotifications: true,
    pushNotifications: true,
    notificationFrequency: 'all'
};

const PersonalizationContext = createContext<PersonalizationContextType | undefined>(undefined);

export const usePersonalization = () => {
    const context = useContext(PersonalizationContext);
    if (!context) {
        throw new Error('usePersonalization must be used within PersonalizationProvider');
    }
    return context;
};

export function PersonalizationProvider({ children }: { children: ReactNode }) {
    const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences);

    // Load preferences from localStorage
    useEffect(() => {
        const saved = localStorage.getItem('userPreferences');
        if (saved) {
            setPreferences(JSON.parse(saved));
        }
    }, []);

    // Apply theme
    useEffect(() => {
        const root = document.documentElement;

        if (preferences.theme === 'auto') {
            const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            root.classList.toggle('dark', isDark);
        } else {
            root.classList.toggle('dark', preferences.theme === 'dark');
        }
    }, [preferences.theme]);

    // Apply language
    useEffect(() => {
        document.documentElement.lang = preferences.language;
    }, [preferences.language]);

    const updatePreference = <K extends keyof UserPreferences>(
        key: K,
        value: UserPreferences[K]
    ) => {
        const updated = { ...preferences, [key]: value };
        setPreferences(updated);
        localStorage.setItem('userPreferences', JSON.stringify(updated));
    };

    const resetPreferences = () => {
        setPreferences(defaultPreferences);
        localStorage.setItem('userPreferences', JSON.stringify(defaultPreferences));
    };

    return (
        <PersonalizationContext.Provider value={{ preferences, updatePreference, resetPreferences }}>
            {children}
        </PersonalizationContext.Provider>
    );
}

// Theme Switcher Component
import { Sun, Moon, Monitor } from 'lucide-react';

export function ThemeSwitcher() {
    const { preferences, updatePreference } = usePersonalization();

    const themes: { value: Theme; icon: any; label: string }[] = [
        { value: 'light', icon: Sun, label: 'Light' },
        { value: 'dark', icon: Moon, label: 'Dark' },
        { value: 'auto', icon: Monitor, label: 'Auto' }
    ];

    return (
        <div className="flex gap-2 p-1.5 bg-black/40 rounded-xl border border-white/5 shadow-inner">
            {themes.map(({ value, icon: Icon, label }) => (
                <button
                    key={value}
                    onClick={() => updatePreference('theme', value)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all text-[10px] font-black uppercase tracking-widest ${preferences.theme === value
                            ? 'bg-brand-gold text-black shadow-lg shadow-brand-gold/10'
                            : 'text-secondary/40 hover:text-white hover:bg-white/5'
                        }`}
                    title={label}
                >
                    <Icon size={16} />
                    <span>{label}</span>
                </button>
            ))}
        </div>
    );
}

// Language Switcher Component
export function LanguageSwitcher() {
    const { preferences, updatePreference } = usePersonalization();

    return (
        <select
            value={preferences.language}
            onChange={(e) => updatePreference('language', e.target.value as Language)}
            className="px-4 py-2 bg-black/40 border border-white/5 rounded-xl text-white text-[10px] font-black uppercase tracking-widest outline-none focus:border-brand-gold/50 transition-all shadow-inner"
        >
            <option value="en" className="bg-maroon-950">English</option>
            <option value="fil" className="bg-maroon-950">Filipino</option>
        </select>
    );
}

// Preferences Panel Component
export function PreferencesPanel() {
    const { preferences, updatePreference, resetPreferences } = usePersonalization();

    return (
        <div className="bg-maroon-950 border border-white/10 rounded-2xl p-8 space-y-10 shadow-2xl">
            <h3 className="text-xl font-black text-white uppercase tracking-tight">Preferences</h3>

            {/* Theme */}
            <div className="space-y-3">
                <label className="block text-[10px] font-black text-secondary/40 uppercase tracking-widest">Visual Theme</label>
                <ThemeSwitcher />
            </div>

            {/* Language */}
            <div className="space-y-3">
                <label className="block text-[10px] font-black text-secondary/40 uppercase tracking-widest">System Language</label>
                <LanguageSwitcher />
            </div>

            {/* Dashboard Layout */}
            <div className="space-y-3">
                <label className="block text-[10px] font-black text-secondary/40 uppercase tracking-widest">Dashboard Layout</label>
                <div className="flex gap-3">
                    <button
                        onClick={() => updatePreference('dashboardLayout', 'compact')}
                        className={`flex-1 px-6 py-3 rounded-xl transition-all text-[10px] font-black uppercase tracking-widest border shadow-inner ${preferences.dashboardLayout === 'compact'
                                ? 'bg-brand-gold text-black border-brand-gold'
                                : 'bg-black/40 text-secondary/40 border-white/5 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        Compact
                    </button>
                    <button
                        onClick={() => updatePreference('dashboardLayout', 'detailed')}
                        className={`flex-1 px-6 py-3 rounded-xl transition-all text-[10px] font-black uppercase tracking-widest border shadow-inner ${preferences.dashboardLayout === 'detailed'
                                ? 'bg-brand-gold text-black border-brand-gold'
                                : 'bg-black/40 text-secondary/40 border-white/5 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        Detailed
                    </button>
                </div>
            </div>

            {/* Notifications */}
            <div className="space-y-4">
                <label className="block text-[10px] font-black text-secondary/40 uppercase tracking-widest">Alert Channels</label>
                <div className="space-y-4">
                    <label className="flex items-center gap-3 cursor-pointer group">
                        <div className="relative flex items-center">
                            <input
                                type="checkbox"
                                checked={preferences.emailNotifications}
                                onChange={(e) => updatePreference('emailNotifications', e.target.checked)}
                                className="peer w-6 h-6 opacity-0 absolute cursor-pointer"
                            />
                            <div className="w-6 h-6 bg-black/40 border border-white/10 rounded-lg flex items-center justify-center peer-checked:bg-brand-gold peer-checked:border-brand-gold transition-all shadow-inner">
                                <div className="w-2 h-2 bg-black rounded-sm opacity-0 peer-checked:opacity-100 transition-opacity"></div>
                            </div>
                        </div>
                        <span className="text-[10px] font-black text-white uppercase tracking-widest group-hover:text-brand-gold transition-colors">Email Alerts</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer group">
                        <div className="relative flex items-center">
                            <input
                                type="checkbox"
                                checked={preferences.pushNotifications}
                                onChange={(e) => updatePreference('pushNotifications', e.target.checked)}
                                className="peer w-6 h-6 opacity-0 absolute cursor-pointer"
                            />
                            <div className="w-6 h-6 bg-black/40 border border-white/10 rounded-lg flex items-center justify-center peer-checked:bg-brand-gold peer-checked:border-brand-gold transition-all shadow-inner">
                                <div className="w-2 h-2 bg-black rounded-sm opacity-0 peer-checked:opacity-100 transition-opacity"></div>
                            </div>
                        </div>
                        <span className="text-[10px] font-black text-white uppercase tracking-widest group-hover:text-brand-gold transition-colors">Neural Push Notifications</span>
                    </label>
                </div>
            </div>

            {/* Notification Frequency */}
            <div className="space-y-3">
                <label className="block text-[10px] font-black text-secondary/40 uppercase tracking-widest">Update Frequency</label>
                <select
                    value={preferences.notificationFrequency}
                    onChange={(e) => updatePreference('notificationFrequency', e.target.value as any)}
                    className="w-full px-4 py-2 bg-black/40 border border-white/5 rounded-xl text-white text-[10px] font-black uppercase tracking-widest outline-none focus:border-brand-gold/50 transition-all shadow-inner"
                >
                    <option value="all" className="bg-maroon-950">Intensive (All)</option>
                    <option value="important" className="bg-maroon-950">Selective (Important)</option>
                    <option value="none" className="bg-maroon-950">Muted (None)</option>
                </select>
            </div>

            {/* Reset */}
            <button
                onClick={resetPreferences}
                className="w-full px-6 py-4 bg-white/5 border border-rose-500/20 text-rose-500/60 hover:text-rose-500 hover:bg-rose-500/10 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-inner active:scale-95"
            >
                Reset Persistence Layer
            </button>
        </div>
    );
}
