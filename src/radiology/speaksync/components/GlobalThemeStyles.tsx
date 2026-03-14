import React from 'react';
import { useTheme } from '../context/ThemeContext';

/**
 * Scoped theme styles for SpeakSync within the dashboard.
 * All selectors are scoped under .speaksync-root to prevent
 * leaking into the parent dashboard's styling.
 */
export const GlobalThemeStyles: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentTheme } = useTheme();

  return (
    <div
      style={{
        backgroundColor: currentTheme.colors.bgPrimary,
        color: currentTheme.colors.textPrimary,
        transition: 'background-color 0.3s ease, color 0.3s ease',
      }}
      className="w-full h-full"
    >
      <style>
        {`
          /* Scoped SpeakSync theme — all selectors under .speaksync-root */

          .speaksync-root {
            background-color: ${currentTheme.colors.bgPrimary};
            color: ${currentTheme.colors.textPrimary};
          }

          .speaksync-root main,
          .speaksync-root section {
            background-color: ${currentTheme.colors.bgPrimary};
          }

          .speaksync-root header {
            background-color: ${currentTheme.colors.bgPrimary};
            border-bottom-color: ${currentTheme.colors.borderColor};
          }

          /* GRAY BACKGROUNDS */
          .speaksync-root .bg-gray-50 { background-color: ${currentTheme.colors.bgPrimary} !important; }
          .speaksync-root .bg-gray-100 { background-color: ${currentTheme.colors.bgPrimary} !important; }
          .speaksync-root .bg-gray-200 { background-color: ${currentTheme.colors.bgSecondary} !important; }
          .speaksync-root .bg-gray-300 { background-color: ${currentTheme.colors.bgSecondary} !important; }
          .speaksync-root .bg-gray-400 { background-color: ${currentTheme.colors.bgTertiary} !important; }
          .speaksync-root .bg-gray-500 { background-color: ${currentTheme.colors.bgHover} !important; }
          .speaksync-root .bg-gray-600 { background-color: ${currentTheme.colors.bgTertiary} !important; }
          .speaksync-root .bg-gray-700 { background-color: ${currentTheme.colors.bgTertiary} !important; }
          .speaksync-root .bg-gray-800 { background-color: ${currentTheme.colors.bgSecondary} !important; }
          .speaksync-root .bg-gray-900 { background-color: ${currentTheme.colors.bgPrimary} !important; }

          /* GRAY WITH OPACITY */
          .speaksync-root .bg-gray-50\\/50,
          .speaksync-root .bg-gray-100\\/50 { background-color: ${currentTheme.colors.bgPrimary} !important; }
          .speaksync-root .bg-gray-200\\/50,
          .speaksync-root .bg-gray-300\\/50 { background-color: ${currentTheme.colors.bgSecondary}80 !important; }
          .speaksync-root .bg-gray-600\\/50 { background-color: ${currentTheme.colors.bgTertiary}80 !important; }
          .speaksync-root .bg-gray-700\\/50 { background-color: ${currentTheme.colors.bgTertiary}80 !important; }
          .speaksync-root .bg-gray-800\\/50 { background-color: ${currentTheme.colors.bgSecondary}80 !important; }
          .speaksync-root .bg-gray-900\\/50 { background-color: ${currentTheme.colors.bgSecondary}80 !important; }
          .speaksync-root .bg-gray-900\\/20 { background-color: ${currentTheme.colors.bgSecondary}40 !important; }

          /* BLUE/INDIGO BACKGROUNDS */
          .speaksync-root .bg-blue-50,
          .speaksync-root .bg-indigo-50 { background-color: ${currentTheme.colors.bgPrimary} !important; }
          .speaksync-root .bg-blue-100,
          .speaksync-root .bg-indigo-100 { background-color: ${currentTheme.colors.bgSecondary} !important; }
          .speaksync-root .bg-blue-400,
          .speaksync-root .bg-blue-500,
          .speaksync-root .bg-blue-600,
          .speaksync-root .bg-blue-700,
          .speaksync-root .bg-indigo-500,
          .speaksync-root .bg-indigo-600 {
            background-color: ${currentTheme.colors.buttonPrimary} !important;
          }
          .speaksync-root .bg-blue-400\\/20,
          .speaksync-root .bg-blue-500\\/20,
          .speaksync-root .bg-blue-600\\/20,
          .speaksync-root .bg-blue-600\\/30 {
            background-color: ${currentTheme.colors.buttonPrimary}25 !important;
          }

          /* GREEN BACKGROUNDS */
          .speaksync-root .bg-green-400,
          .speaksync-root .bg-green-500,
          .speaksync-root .bg-green-600,
          .speaksync-root .bg-green-700 {
            background-color: ${currentTheme.colors.accentSuccess} !important;
          }
          .speaksync-root .bg-green-600\\/20 { background-color: ${currentTheme.colors.accentSuccess}25 !important; }

          /* RED BACKGROUNDS */
          .speaksync-root .bg-red-600,
          .speaksync-root .bg-red-700,
          .speaksync-root .bg-red-800 { background-color: ${currentTheme.colors.accentError} !important; }

          /* TEXT COLORS */
          .speaksync-root .text-gray-50,
          .speaksync-root .text-gray-100,
          .speaksync-root .text-gray-200,
          .speaksync-root .text-gray-300 {
            color: ${currentTheme.colors.textPrimary} !important;
          }
          .speaksync-root .text-gray-400,
          .speaksync-root .text-gray-500,
          .speaksync-root .text-gray-600 {
            color: ${currentTheme.colors.textMuted} !important;
          }
          .speaksync-root .text-gray-700,
          .speaksync-root .text-gray-800,
          .speaksync-root .text-gray-900,
          .speaksync-root .text-white {
            color: ${currentTheme.colors.textPrimary} !important;
          }

          .speaksync-root .text-blue-200,
          .speaksync-root .text-blue-300,
          .speaksync-root .text-blue-400 {
            color: ${currentTheme.colors.accentPrimary} !important;
          }
          .speaksync-root .text-green-200,
          .speaksync-root .text-green-300,
          .speaksync-root .text-green-400 {
            color: ${currentTheme.colors.accentSuccess} !important;
          }
          .speaksync-root .text-red-300,
          .speaksync-root .text-red-400 {
            color: ${currentTheme.colors.accentError} !important;
          }

          /* BORDERS */
          .speaksync-root .border-gray-600,
          .speaksync-root .border-gray-700,
          .speaksync-root .border-gray-800 {
            border-color: ${currentTheme.colors.borderColor} !important;
          }
          .speaksync-root .border-blue-500,
          .speaksync-root .border-blue-600 {
            border-color: ${currentTheme.colors.accentPrimary} !important;
          }
          .speaksync-root .border-green-500,
          .speaksync-root .border-green-600 {
            border-color: ${currentTheme.colors.accentSuccess} !important;
          }

          /* INPUTS (scoped) */
          .speaksync-root input,
          .speaksync-root textarea,
          .speaksync-root select {
            color: ${currentTheme.colors.textPrimary} !important;
            background-color: ${currentTheme.colors.bgSecondary} !important;
            border-color: ${currentTheme.colors.borderColor} !important;
          }
          .speaksync-root input:focus,
          .speaksync-root textarea:focus,
          .speaksync-root select:focus {
            border-color: ${currentTheme.colors.accentPrimary} !important;
            outline: none !important;
            box-shadow: 0 0 0 3px ${currentTheme.colors.accentPrimary}30 !important;
          }
          .speaksync-root input::placeholder,
          .speaksync-root textarea::placeholder {
            color: ${currentTheme.colors.textMuted} !important;
          }

          /* HOVER STATES */
          .speaksync-root .hover\\:bg-gray-700:hover { background-color: ${currentTheme.colors.bgHover} !important; }
          .speaksync-root .hover\\:bg-gray-600:hover { background-color: ${currentTheme.colors.bgTertiary} !important; }
          .speaksync-root .hover\\:text-white:hover { color: ${currentTheme.colors.textPrimary} !important; }
          .speaksync-root .hover\\:text-blue-300:hover { color: ${currentTheme.colors.accentPrimary} !important; }

          /* TEMPLATE BUTTON ICON STYLING */
          .speaksync-root .template-btn-icon { background-color: transparent; }
          .speaksync-root .template-btn-icon:hover { background-color: ${currentTheme.colors.bgTertiary} !important; }

          /* SCROLLBARS (scoped) */
          .speaksync-root ::-webkit-scrollbar { width: 8px; height: 8px; }
          .speaksync-root ::-webkit-scrollbar-track { background-color: ${currentTheme.colors.bgSecondary}; }
          .speaksync-root ::-webkit-scrollbar-thumb { background-color: ${currentTheme.colors.borderColor}; }
          .speaksync-root ::-webkit-scrollbar-thumb:hover { background-color: ${currentTheme.colors.textMuted}; }
        `}
      </style>
      {children}
    </div>
  );
};

export default GlobalThemeStyles;
