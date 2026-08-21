import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import { useGroupStore } from '@/store/useGroupStore';
import { useAuthStore } from '@/store/useAuthStore';

// Dev convenience: `?seed=1` loads the demo group on boot.
if (new URLSearchParams(window.location.search).get('seed') === '1') {
  useGroupStore.getState().loadSeedData();
}

// Read any persisted Supabase session and subscribe to auth changes before the
// first render, so route guards never see a stale 'loading' for longer than the
// session lookup actually takes.
useAuthStore.getState().init();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/* BASE_URL is '/' in dev and '/justsplit/' on GitHub Pages, so every route
        resolves correctly in both places without any hard-coded prefix. */}
    <BrowserRouter
      basename={import.meta.env.BASE_URL}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
