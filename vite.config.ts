import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  // PORT מגיע מסביבת ההרצה (כלי preview); ברירת המחדל 5174 עבור dev של Electron.
  server: { port: Number(process.env.PORT) || 5174, strictPort: true },
  build: { outDir: 'dist' },
  test: {
    environment: 'node',
    include: ['src/tests/**/*.test.ts'],
  },
});
