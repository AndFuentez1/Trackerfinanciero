import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
    plugins: [react() as any],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    test: {
        environment: 'jsdom',
        globals: true,
        css: true,
        setupFiles: './src/test/setup.ts',
        include: ['src/**/*.test.{ts,tsx}'],
        exclude: [
            'e2e/**',
            'playwright.config.ts',
            'node_modules/**',
        ],
        coverage: {
            reporter: ['text', 'json', 'html'],
            exclude: [
                'node_modules/**',
                'dist/**',
                'dist_deploy/**',
                'src/test/**',
                'src/**/__tests__/**/helpers/**',
                'src/components/ui/**', // Skip shadcn components for now
            ],
        },
    },
});
