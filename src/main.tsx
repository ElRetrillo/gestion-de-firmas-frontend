import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './index.css';

// Interceptor global para inyectar automáticamente el Bearer Token en todas las llamadas /api/
const originalFetch = window.fetch;
window.fetch = async (input, init = {}) => {
  const token = localStorage.getItem('access_token');
  let finalInit: RequestInit = { ...init };

  if (token && typeof input === 'string' && input.startsWith('/api/')) {
    const headers = new Headers(finalInit.headers || {});
    if (!headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    finalInit.headers = headers;
  }

  const res = await originalFetch(input, finalInit);

  // Si el token expira o es inválido, limpiar sesión automáticamente
  if (res.status === 401 && typeof input === 'string' && !input.includes('/auth/login')) {
    localStorage.removeItem('access_token');
  }

  return res;
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
);
