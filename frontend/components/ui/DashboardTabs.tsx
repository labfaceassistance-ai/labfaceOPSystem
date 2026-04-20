import React, { useEffect, useState } from 'react';
import { LucideIcon } from 'lucide-react';

interface Tab {
    id: string;
    label: string;
    icon: LucideIcon;
}

interface DashboardTabsProps {
    tabs: Tab[];
    activeTab: string;
    onTabChange: (tabId: any) => void;
}

const DashboardTabs: React.FC<DashboardTabsProps> = ({ tabs, activeTab, onTabChange }) => {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const handleTabClick = (tabId: string) => {
        onTabChange(tabId);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    if (isMobile) {
        return (
            <div className="fixed bottom-0 left-0 right-0 z-[60] bg-white/80 backdrop-blur-2xl border-t border-identity-sky/10 pb-safe shadow-[0_-10px_30px_rgba(4,28,60,0.05)] animate-in slide-in-from-bottom-full duration-500">
                <div className="flex justify-around items-center h-20 px-2 max-w-lg mx-auto">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => handleTabClick(tab.id)}
                                className={`flex flex-col items-center justify-center gap-1.5 transition-all w-16
                                    ${isActive ? 'text-identity-sky' : 'text-identity-navy/50'}
                                `}
                            >
                                <div className={`p-2 rounded-2xl transition-all ${isActive ? 'bg-identity-sky/10 scale-110' : ''}`}>
                                    <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                                </div>
                                <span className="text-[8px] font-black uppercase tracking-[0.15em]">{tab.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    }

    return (
        <div className="sticky top-20 z-40 bg-white/80 backdrop-blur-xl border-b border-identity-sky/10 mb-10 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-0 transition-all duration-300">
            <div className="flex gap-2 overflow-x-auto justify-start md:justify-center px-4 no-scrollbar">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => handleTabClick(tab.id)}
                            className={`px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] transition-all border-b-2 flex items-center gap-3 whitespace-nowrap group relative
                                ${isActive 
                                    ? 'text-identity-navy border-identity-sky bg-identity-sky/5' 
                                    : 'text-identity-navy/50 border-transparent hover:text-identity-navy hover:bg-identity-navy/5'
                                }
                            `}
                        >
                            <Icon size={16} className={`transition-transform group-hover:scale-110 ${isActive ? 'text-identity-sky' : 'opacity-50'}`} />
                            {tab.label}
                            {isActive && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-identity-sky animate-in fade-in duration-300" />
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default DashboardTabs;
