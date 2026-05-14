import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import laravel from 'laravel-vite-plugin';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    const frontendPort = env.FRONTEND_PORT || '5173';
    const webPort = env.WEB_PORT || '8081';
    
    return {
        plugins: [
            laravel({
                input: ['resources/css/app.css', 'resources/js/app.tsx'],
                ssr: 'resources/js/ssr.tsx',
                refresh: true,
                valetTls: false,
            }),
            react({
                babel: {
                    plugins: ['babel-plugin-react-compiler'],
                },
            }),
            tailwindcss(),
        ],
        esbuild: {
            jsx: 'automatic',
        },
        server: {
            host: '0.0.0.0',
            port: 5173,
            strictPort: true,
            hmr: {
                host: 'localhost',
                port: parseInt(frontendPort),
                protocol: 'ws',
            },
            origin: `http://localhost:${frontendPort}`,
            // CORS для Vite сервера
            cors: {
                origin: [
                    `http://localhost:${webPort}`,
                    `http://localhost:${frontendPort}`,
                    /\.localhost:\d+$/  // все localhost порты
                ],
                credentials: true,
                methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
                allowedHeaders: ['Content-Type', 'Authorization'],
            },
        },
        preview: {
            host: '0.0.0.0',
            port: 5173,
            strictPort: true,
            cors: {
                origin: `http://localhost:${webPort}`,
                credentials: true,
            },
        },
    };
});