/**
 * Re-export ThemeBridgeProvider as ThemeContext.
 * This bridges the dashboard's theme to speaksync's theme system
 * so all existing imports work without modification.
 */
export { ThemeBridgeProvider as ThemeProvider, useTheme } from './ThemeBridgeProvider';
export { default as default } from './ThemeBridgeProvider';
