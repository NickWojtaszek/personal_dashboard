import React from 'react';
import { useTheme } from '../context/ThemeContext';

const UserMenu: React.FC = () => {
  const { currentTheme } = useTheme();

  return (
    <div
      className="flex items-center gap-2 px-3 py-2 rounded-lg"
      style={{
        backgroundColor: currentTheme.colors.bgSecondary,
        borderColor: currentTheme.colors.borderColor,
        borderWidth: '1px',
      }}
    >
      <div
        className="flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold"
        style={{
          backgroundColor: currentTheme.colors.accentPrimary,
          color: '#fff',
        }}
      >
        N
      </div>
      <span
        className="text-sm font-medium hidden sm:inline"
        style={{ color: currentTheme.colors.textPrimary }}
      >
        Nick
      </span>
    </div>
  );
};

export default UserMenu;
