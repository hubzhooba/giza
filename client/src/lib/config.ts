// API Configuration
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// WebSocket URL (same as API URL for Socket.io)
export const WS_URL = API_URL;

// App URL
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';