// Centralized API configuration for local dev and cloud deployment (e.g. Render)

const IS_PROD = import.meta.env.PROD;

// Backend (Express + WebSocket)
export const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL as string) || (
  IS_PROD 
    ? 'https://cyberquant-backend.onrender.com'
    : `http://${typeof window !== 'undefined' ? window.location.hostname || 'localhost' : 'localhost'}:3001`
);

// Derived WebSocket URL (ws:// for http, wss:// for https)
export const WS_URL = (import.meta.env.VITE_WS_URL as string) || (
  BACKEND_URL.startsWith('https://')
    ? BACKEND_URL.replace('https://', 'wss://')
    : BACKEND_URL.startsWith('http://')
      ? BACKEND_URL.replace('http://', 'ws://')
      : `ws://${typeof window !== 'undefined' ? window.location.hostname || 'localhost' : 'localhost'}:3001`
);

// Python AI Engine (FastAPI)
export const AI_ENGINE_URL = (import.meta.env.VITE_AI_ENGINE_URL as string) || (
  IS_PROD
    ? 'https://cyberquantai-ai.onrender.com'
    : 'http://127.0.0.1:8000'
);
