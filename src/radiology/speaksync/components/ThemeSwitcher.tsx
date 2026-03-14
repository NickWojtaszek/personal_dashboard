import React from 'react';
import { useTheme } from '../context/ThemeContext';

/**
 * Theme switcher dropdown component
 */
export const ThemeSwitcher: React.FC = () => {
  const { currentTheme, setTheme, availableThemes } = useTheme();
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-3 py-2 rounded-lg text-sm font-medium transition-colors"
        style={{
          backgroundColor: currentTheme.colors.bgTertiary,
          color: currentTheme.colors.textPrimary,
          border: `1px solid ${currentTheme.colors.borderColor}`,
        }}
        title="Switch theme"
      >
        {currentTheme.name}
      </button>

      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-48 rounded-lg shadow-lg z-50"
          style={{
            backgroundColor: currentTheme.colors.bgSecondary,
            border: `1px solid ${currentTheme.colors.borderColor}`,
          }}
        >
          {availableThemes.map((theme) => (
            <button
              key={theme.id}
              onClick={() => {
                setTheme(theme.id);
                setIsOpen(false);
              }}
              className="w-full text-left px-4 py-3 text-sm transition-colors flex items-center justify-between"
              style={{
                backgroundColor:
                  theme.id === currentTheme.id
                    ? currentTheme.colors.accentPrimary
                    : 'transparent',
                color: theme.id === currentTheme.id ? '#000' : currentTheme.colors.textPrimary,
              }}
            >
              <span>{theme.name}</span>
              {theme.id === currentTheme.id && <span>✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ThemeSwitcher;
