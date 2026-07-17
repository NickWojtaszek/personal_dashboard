import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        // Accept either name: VITE_GOOGLE_CLIENT_ID is what the hosted env (Railway)
        // sets and matches the VITE_ convention used by supabase.ts; GOOGLE_CLIENT_ID
        // is the older unprefixed name still used by some local .env files.
        'process.env.GOOGLE_CLIENT_ID': JSON.stringify(
          env.VITE_GOOGLE_CLIENT_ID || env.GOOGLE_CLIENT_ID || ''
        ),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, './src'),
        }
      }
    };
});
