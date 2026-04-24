'use client';
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

export interface Tab {
    id: string;
    label: string;
    icon: LucideIcon;
    badge?: string | number;
}

interface NavigationContextType {
    tabs: Tab[];
    activeTab: string;
    setTabs: (tabs: Tab[]) => void;
    setActiveTab: (tabId: string) => void;
    updateTabBadge: (tabId: string, badge?: string | number) => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export const useNavigation = () => {
    const context = useContext(NavigationContext);
    if (!context) {
        throw new Error('useNavigation must be used within a NavigationProvider');
    }
    return context;
};

export const NavigationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [tabs, setTabs] = useState<Tab[]>([]);
    const [activeTab, setActiveTab] = useState<string>('');

    const updateTabBadge = React.useCallback((tabId: string, badge?: string | number) => {
        setTabs(prev => {
            const tab = prev.find(t => t.id === tabId);
            if (tab && tab.badge === badge) return prev;
            return prev.map(t => t.id === tabId ? { ...t, badge } : t);
        });
    }, []);

    return (
        <NavigationContext.Provider value={{ tabs, activeTab, setTabs, setActiveTab, updateTabBadge }}>
            {children}
        </NavigationContext.Provider>
    );
};
