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
        <div className="flex gap-2 p-1 bg-slate-800 rounded-lg">
            {themes.map(({ value, icon: Icon, label }) => (
                <button
                    key={value}
                    onClick={() => updatePreference('theme', value)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md transition-all ${preferences.theme === value
                            ? 'bg-brand-500 text-white'
                            : 'text-slate-400 hover:text-white hover:bg-slate-700'
                        }`}
                    title={label}
                >
                    <Icon size={18} />
                    <span className="text-sm">{label}</span>
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
            className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
        >
            <option value="en">English</option>
            <option value="fil">Filipino</option>
        </select>
    );
}

// Preferences Panel Component
export function PreferencesPanel() {
    const { preferences, updatePreference, resetPreferences } = usePersonalization();

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 space-y-6">
            <h3 className="text-xl font-bold text-white">Preferences</h3>

            {/* Theme */}
            <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Theme</label>
                <ThemeSwitcher />
            </div>

            {/* Language */}
            <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Language</label>
                <LanguageSwitcher />
            </div>

            {/* Dashboard Layout */}
            <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Dashboard Layout</label>
                <div className="flex gap-2">
                    <button
                        onClick={() => updatePreference('dashboardLayout', 'compact')}
                        className={`flex-1 px-4 py-2 rounded-lg transition-all ${preferences.dashboardLayout === 'compact'
                                ? 'bg-brand-500 text-white'
                                : 'bg-slate-800 text-slate-400 hover:text-white'
                            }`}
                    >
                        Compact
                    </button>
                    <button
                        onClick={() => updatePreference('dashboardLayout', 'detailed')}
                        className={`flex-1 px-4 py-2 rounded-lg transition-all ${preferences.dashboardLayout === 'detailed'
                                ? 'bg-brand-500 text-white'
                                : 'bg-slate-800 text-slate-400 hover:text-white'
                            }`}
                    >
                        Detailed
                    </button>
                </div>
            </div>

            {/* Notifications */}
            <div>
                <label className="block text-sm font-medium text-slate-400 mb-3">Notifications</label>
                <div className="space-y-3">
                    <label className="flex items-center gap-3">
                        <input
                            type="checkbox"
                            checked={preferences.emailNotifications}
                            onChange={(e) => updatePreference('emailNotifications', e.target.checked)}
                            className="w-5 h-5 text-brand-600 bg-slate-800 border-slate-700 rounded"
                        />
                        <span className="text-white">Email Notifications</span>
                    </label>
                    <label className="flex items-center gap-3">
                        <input
                            type="checkbox"
                            checked={preferences.pushNotifications}
                            onChange={(e) => updatePreference('pushNotifications', e.target.checked)}
                            className="w-5 h-5 text-brand-600 bg-slate-800 border-slate-700 rounded"
                        />
                        <span className="text-white">Push Notifications</span>
                    </label>
                </div>
            </div>

            {/* Notification Frequency */}
            <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Notification Frequency</label>
                <select
                    value={preferences.notificationFrequency}
                    onChange={(e) => updatePreference('notificationFrequency', e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                >
                    <option value="all">All Notifications</option>
                    <option value="important">Important Only</option>
                    <option value="none">None</option>
                </select>
            </div>

            {/* Reset */}
            <button
                onClick={resetPreferences}
                className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
                Reset to Defaults
            </button>
        </div>
    );
}
