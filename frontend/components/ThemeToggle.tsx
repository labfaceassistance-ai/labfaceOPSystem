'use client';

import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from './ThemeProvider';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="p-2.5 rounded-xl bg-primary/5 hover:bg-primary/10 text-primary transition-all duration-300 border border-primary/10 shadow-sm group active:scale-90"
      aria-label="Toggle Theme"
    >
      <div className="relative w-5 h-5">
        <div className={`absolute inset-0 transition-all duration-500 transform ${theme === 'dark' ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 rotate-90 scale-0'}`}>
          <Sun size={20} className="text-secondary" />
        </div>
        <div className={`absolute inset-0 transition-all duration-500 transform ${theme === 'light' ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-0'}`}>
          <Moon size={20} className="text-brand-maroon" />
        </div>
      </div>
    </button>
  );
}
