'use client';
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

export interface Tab {
    id: string;
    label: string;
    icon: LucideIcon;
}

interface NavigationContextType {
    tabs: Tab[];
    activeTab: string;
    setTabs: (tabs: Tab[]) => void;
    setActiveTab: (tabId: string) => void;
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

    return (
        <NavigationContext.Provider value={{ tabs, activeTab, setTabs, setActiveTab }}>
            {children}
        </NavigationContext.Provider>
    );
};
