import React, { createContext, useContext } from 'react';
import { themes, type Theme, type ThemeId } from '../data/themes';

/**
 * Bridge that maps the dashboard's light/dark theme to SpeakSync's theme system.
 * Provides the same ThemeContext interface that speaksync components expect.
 */

interface ThemeContextType {
    currentTheme: Theme;
    themeId: ThemeId;
    setTheme: (themeId: ThemeId) => void;
    availableThemes: Theme[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeBridgeProviderProps {
    theme: 'light' | 'dark';
    children: React.ReactNode;
}

export const ThemeBridgeProvider: React.FC<ThemeBridgeProviderProps> = ({ theme, children }) => {
    const themeId: ThemeId = theme === 'light' ? 'light' : 'dark';
    const currentTheme = themes[themeId];
    const availableThemes = Object.values(themes);

    const value: ThemeContextType = {
        currentTheme,
        themeId,
        setTheme: () => {}, // No-op — theme is controlled by the dashboard
        availableThemes,
    };

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = (): ThemeContextType => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within ThemeBridgeProvider');
    }
    return context;
};

export default ThemeContext;
