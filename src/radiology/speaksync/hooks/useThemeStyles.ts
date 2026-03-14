import { useTheme } from '../context/ThemeContext';

/**
 * Hook that provides theme-aware inline styles for components
 * This allows dynamic theme switching without rebuilding Tailwind
 */
export const useThemeStyles = () => {
  const { currentTheme } = useTheme();

  return {
    // Background styles
    bgPrimary: { backgroundColor: currentTheme.colors.bgPrimary },
    bgSecondary: { backgroundColor: currentTheme.colors.bgSecondary },
    bgTertiary: { backgroundColor: currentTheme.colors.bgTertiary },
    bgHover: { backgroundColor: currentTheme.colors.bgHover },

    // Text styles
    textPrimary: { color: currentTheme.colors.textPrimary },
    textSecondary: { color: currentTheme.colors.textSecondary },
    textMuted: { color: currentTheme.colors.textMuted },

    // Border styles
    borderColor: { borderColor: currentTheme.colors.borderColor },
    borderLight: { borderColor: currentTheme.colors.borderLight },

    // Combined styles
    mainBg: {
      backgroundColor: currentTheme.colors.bgPrimary,
      color: currentTheme.colors.textPrimary,
    },
    header: {
      backgroundColor: currentTheme.colors.bgPrimary,
      borderBottomColor: currentTheme.colors.borderColor,
    },
    nav: {
      backgroundColor: currentTheme.colors.bgSecondary,
    },
    editorBg: {
      backgroundColor: currentTheme.colors.editorBg,
      color: currentTheme.colors.textPrimary,
      borderColor: currentTheme.colors.editorBorder,
    },
    button: {
      backgroundColor: currentTheme.colors.buttonPrimary,
      color: '#fff',
    },
    buttonSecondary: {
      backgroundColor: currentTheme.colors.buttonSecondary,
      color: currentTheme.colors.textPrimary,
    },
    accentPrimary: { color: currentTheme.colors.accentPrimary },
    accentSuccess: { color: currentTheme.colors.accentSuccess },
    accentWarning: { color: currentTheme.colors.accentWarning },
    accentError: { color: currentTheme.colors.accentError },
  };
};

export default useThemeStyles;
