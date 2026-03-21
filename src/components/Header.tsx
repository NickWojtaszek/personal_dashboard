import React from 'react';
import type { Page } from '../types';
import Button from './ui/Button';
import { SunIcon, MoonIcon, DownloadIcon, UploadIcon } from './Icons';

interface HeaderProps {
    isAdminMode: boolean;
    onToggleAdminMode: () => void;
    theme: 'light' | 'dark';
    onToggleTheme: () => void;
    page: Page;
    onSetPage: (page: Page) => void;
    onExport: () => void;
    onImport: () => void;
    onManageUsers?: () => void;
}

const Header: React.FC<HeaderProps> = ({ isAdminMode, onToggleAdminMode, theme, onToggleTheme, page, onSetPage, onExport, onImport, onManageUsers }) => {
    
    // Helper to render nav buttons
    const renderNavButton = (targetPage: Page, label: string) => (
        <Button
            variant='ghost'
            size='sm'
            onClick={() => onSetPage(targetPage)}
            isActive={page === targetPage}
            className='whitespace-nowrap'
        >
            {label}
        </Button>
    );

    return (
        <header className='bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-30 border-b border-slate-200 dark:border-slate-800 transition-colors duration-300'>
            <div className='container mx-auto px-4 sm:px-6 lg:px-8'>
                <div className='flex items-center justify-between h-20'>
                    <div className='flex items-center overflow-hidden'>
                        <nav className='flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-x-auto no-scrollbar'>
                            {renderNavButton('general', 'General')}
                            {renderNavButton('launcher', 'Apps')}
                            {renderNavButton('claude', 'Claude')}
                            {renderNavButton('properties', 'Properties')}
                            {renderNavButton('insurance', 'Insurance')}
                            {renderNavButton('invoices', 'Invoices')}
                            {renderNavButton('vehicles', 'Rego')}
                            {renderNavButton('contracts', 'Contracts')}
                            {renderNavButton('correspondence', 'Email')}
                            {renderNavButton('radiology', 'Radiology')}
                            {renderNavButton('dictation', 'Dictation')}
                        </nav>
                    </div>

                    <div className='flex items-center space-x-2 flex-shrink-0 ml-4'>
                        <Button variant='ghost' size='icon' onClick={onExport} aria-label='Export data' title='Export JSON'>
                            <DownloadIcon />
                        </Button>
                        <Button variant='ghost' size='icon' onClick={onImport} aria-label='Import data' title='Import JSON'>
                            <UploadIcon />
                        </Button>
                        {onManageUsers && (
                            <Button variant='ghost' size='icon' onClick={onManageUsers} aria-label='Manage users' title='Manage allowed users'>
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
                                </svg>
                            </Button>
                        )}
                        <Button variant='ghost' size='icon' onClick={onToggleTheme} aria-label='Toggle theme'>
                            {theme === 'light' ? <MoonIcon /> : <SunIcon />}
                        </Button>
                        <div className='hidden sm:flex items-center space-x-3 ml-2 pl-2 border-l border-slate-200 dark:border-slate-700'>
                            <span className='text-sm font-medium text-slate-500 dark:text-gray-400'>Admin Mode</span>
                            <label htmlFor='admin-toggle' className='relative inline-flex items-center cursor-pointer'>
                                <input type='checkbox' id='admin-toggle' className='sr-only peer' checked={isAdminMode} onChange={onToggleAdminMode} />
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
