export const BACKEND_HTTP = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:8000'
export const BACKEND_WS = BACKEND_HTTP.replace(/^http/, 'ws')
