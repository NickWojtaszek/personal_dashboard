/**
 * Color theme definitions for SpeakSync XR
 */

export interface Theme {
  id: string;
  name: string;
  colors: {
    // Background colors
    bgPrimary: string;
    bgSecondary: string;
    bgTertiary: string;
    bgHover: string;

    // Text colors
    textPrimary: string;
    textSecondary: string;
    textMuted: string;

    // Border colors
    borderColor: string;
    borderLight: string;

    // Accent colors
    accentPrimary: string;
    accentSuccess: string;
    accentWarning: string;
    accentError: string;

    // UI specific
    editorBg: string;
    editorBorder: string;
    buttonPrimary: string;
    buttonPrimaryHover: string;
    buttonSecondary: string;
    buttonSecondaryHover: string;
  };
}

export const themes: Record<string, Theme> = {
  dark: {
    id: 'dark',
    name: '🌙 Dark',
    colors: {
      bgPrimary: '#0f172a',
      bgSecondary: '#1e293b',
      bgTertiary: '#334155',
      bgHover: '#475569',

      textPrimary: '#f1f5f9',
      textSecondary: '#cbd5e1',
      textMuted: '#94a3b8',

      borderColor: '#334155',
      borderLight: '#475569',

      accentPrimary: '#3b82f6',
      accentSuccess: '#10b981',
      accentWarning: '#f59e0b',
      accentError: '#ef4444',

      editorBg: '#1e293b',
      editorBorder: '#334155',
      buttonPrimary: '#3b82f6',
      buttonPrimaryHover: '#2563eb',
      buttonSecondary: '#475569',
      buttonSecondaryHover: '#64748b',
    },
  },
  light: {
    id: 'light',
    name: '☀️ Light',
    colors: {
      bgPrimary: '#f9f7f4',
      bgSecondary: '#f0ede8',
      bgTertiary: '#e8dfd5',
      bgHover: '#ddd2c8',

      textPrimary: '#2c2520',
      textSecondary: '#4a423c',
      textMuted: '#8b7d76',

      borderColor: '#d4c9bd',
      borderLight: '#e8dfd5',

      accentPrimary: '#9ccc65',
      accentSuccess: '#9ccc65',
      accentWarning: '#d4a574',
      accentError: '#d75a5a',

      editorBg: '#f9f7f4',
      editorBorder: '#d4c9bd',
      buttonPrimary: '#9ccc65',
      buttonPrimaryHover: '#8bc34a',
      buttonSecondary: '#e8ddf5',
      buttonSecondaryHover: '#ddd2c8',
    },
  },
  cyberpunk: {
    id: 'cyberpunk',
    name: '⚡ Cyberpunk',
    colors: {
      bgPrimary: '#0d0221',
      bgSecondary: '#1a0033',
      bgTertiary: '#2d0a4e',
      bgHover: '#3d1a5f',

      textPrimary: '#00ff88',
      textSecondary: '#00ffff',
      textMuted: '#ff006e',

      borderColor: '#00ff88',
      borderLight: '#00ffff',

      accentPrimary: '#ff006e',
      accentSuccess: '#00ff88',
      accentWarning: '#ffbe0b',
      accentError: '#ff006e',

      editorBg: '#0d0221',
      editorBorder: '#00ff88',
      buttonPrimary: '#ff006e',
      buttonPrimaryHover: '#ff3385',
      buttonSecondary: '#00ff88',
      buttonSecondaryHover: '#33ffaa',
    },
  },
  forest: {
    id: 'forest',
    name: '🌲 Forest',
    colors: {
      bgPrimary: '#0f2818',
      bgSecondary: '#1a3a2a',
      bgTertiary: '#2d5a3d',
      bgHover: '#3d6a4d',

      textPrimary: '#e6f3e6',
      textSecondary: '#b3e0b3',
      textMuted: '#7fb07f',

      borderColor: '#2d5a3d',
      borderLight: '#3d6a4d',

      accentPrimary: '#4ade80',
      accentSuccess: '#22c55e',
      accentWarning: '#eab308',
      accentError: '#f87171',

      editorBg: '#1a3a2a',
      editorBorder: '#2d5a3d',
      buttonPrimary: '#4ade80',
      buttonPrimaryHover: '#22c55e',
      buttonSecondary: '#2d5a3d',
      buttonSecondaryHover: '#3d6a4d',
    },
  },
};

export type ThemeId = keyof typeof themes;
