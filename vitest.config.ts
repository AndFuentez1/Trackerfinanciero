import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
    plugins: [],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    test: {
        pool: 'forks',
        environment: 'jsdom',
        globals: true,
        css: true,
        setupFiles: './src/test/setup.ts',
        include: ['src/**/*.test.{ts,tsx}'],
        exclude: [
            'e2e/**',
            'playwright.config.ts',
            'node_modules/**',
            'src/test/__tests_disabled__/**',
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

