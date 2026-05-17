// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  integrations: [react()],
  // Local INSECURE lab: allow form POST to /api/auth/* (login/logout).
  // Astro 5 defaults checkOrigin: true → "Cross-site POST form submissions are forbidden".
  security: {
    checkOrigin: false,
  },
});
