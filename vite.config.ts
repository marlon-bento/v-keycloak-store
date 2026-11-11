// ========
// Configuracao de empacotamento da biblioteca v-keycloak-store via Vite.
// Compila arquivos TypeScript e componentes Single-File (.vue) em ES Module
// e gera as declaracoes de tipos (.d.ts) exclusivamente da pasta src.
// ========

import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import dts from 'vite-plugin-dts';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [
    vue(),
    dts({
      include: ['src/**/*.ts', 'src/**/*.vue'],
      insertTypesEntry: true,
      rollupTypes: true
    })
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'VKeycloakStore',
      fileName: 'index',
      formats: ['es']
    },
    rollupOptions: {
      external: ['vue', 'vue-router', 'pinia', 'oidc-client-ts', 'crypto-js']
    }
  }
});