import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { fileURLToPath } from 'node:url';

// React is loaded from cdnjs (see index.html), so the bundle only holds our code.
// The shims hand the global React/ReactDOM to `import ... from 'react'`.
const shim = (p: string) => fileURLToPath(new URL(`./src/shims/${p}`, import.meta.url));

export default defineConfig(({ mode }) => ({
  base: './',
  resolve: {
    alias: {
      'react-dom/client': shim('react-dom-client.ts'),
      react: shim('react.ts'),
    },
  },
  esbuild: { jsx: 'transform', jsxFactory: 'React.createElement', jsxFragment: 'React.Fragment' },
  plugins: mode === 'single' ? [viteSingleFile()] : [],
  build: { outDir: mode === 'single' ? 'dist-single' : 'dist' },
}));
