import React from 'react';
import type { Page } from '../types';

interface HeaderProps {
    isAdminMode: boolean;
    onToggleAdminMode: () => void;
    theme: 'light' | 'dark';
    onToggleTheme: () => void;
    page: Page;
    onSetPage: (page: Page) => void;
}

const SunIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
    </svg>
);
  
const MoonIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
    </svg>
);

const NavButton: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode, className?: string }> = ({ active, onClick, children, className }) => {
    const baseClasses = "px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center";
    const activeClasses = "bg-brand-primary/10 text-brand-primary dark:bg-brand-secondary/20 dark:text-brand-secondary";
    const inactiveClasses = "text-slate-500 hover:bg-slate-200 dark:text-gray-400 dark:hover:bg-slate-700";
    return (
        <button onClick={onClick} className={`${baseClasses} ${active ? activeClasses : inactiveClasses} ${className}`}>
            {children}
        </button>
    );
};


const Header: React.FC<HeaderProps> = ({ isAdminMode, onToggleAdminMode, theme, onToggleTheme, page, onSetPage }) => {
    return (
        <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-30 border-b border-slate-200 dark:border-slate-800">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-20">
                    <div className="flex items-center gap-4 sm:gap-8 overflow-x-auto no-scrollbar">
                         <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight whitespace-nowrap flex-shrink-0">
                            <span className="bg-clip-text text-transparent bg-gradient-to-r from-brand-primary to-brand-secondary">
                                Personal Launcher
                            </span>
                        </h1>
                        <nav className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-x-auto no-scrollbar">
                            <NavButton active={page === 'general'} onClick={() => onSetPage('general')}>General</NavButton>
                            <NavButton active={page === 'launcher'} onClick={() => onSetPage('launcher')}>Apps</NavButton>
                            <NavButton active={page === 'claude'} onClick={() => onSetPage('claude')}>Claude</NavButton>
                            <NavButton active={page === 'properties'} onClick={() => onSetPage('properties')}>Properties</NavButton>
                            <NavButton active={page === 'insurance'} onClick={() => onSetPage('insurance')}>Insurance</NavButton>
                            <NavButton active={page === 'invoices'} onClick={() => onSetPage('invoices')}>Invoices</NavButton>
                            <NavButton active={page === 'vehicles'} onClick={() => onSetPage('vehicles')}>Rego</NavButton>
                            <NavButton active={page === 'shopping'} onClick={() => onSetPage('shopping')}>Shopping</NavButton>
                            <NavButton active={page === 'radiology'} onClick={() => onSetPage('radiology')}>Radiology</NavButton>
                        </nav>
                    </div>

                    <div className="flex items-center space-x-4 flex-shrink-0">
                        <button onClick={onToggleTheme} aria-label="Toggle theme" className="p-2 rounded-full text-slate-500 dark:text-gray-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                            {theme === 'light' ? <MoonIcon /> : <SunIcon />}
                        </button>
                        <div className="hidden sm:flex items-center space-x-3">
                            <span className="text-sm font-medium text-slate-500 dark:text-gray-400">Admin Mode</span>
                            <label htmlFor="admin-toggle" className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" id="admin-toggle" className="sr-only peer" checked={isAdminMode} onChange={onToggleAdminMode} />
                                <div className="w-11 h-6 bg-slate-300 dark:bg-slate-700 rounded-full peer peer-focus:ring-2 peer-focus:ring-brand-primary peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-primary"></div>
                            </label>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;