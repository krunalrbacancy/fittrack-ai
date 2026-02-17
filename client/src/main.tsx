import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { registerServiceWorker } from './utils/pwa.ts'

// Disable StrictMode in development to prevent double renders that might cause issues
const root = ReactDOM.createRoot(document.getElementById('root')!);
if (import.meta.env.DEV) {
  root.render(<App />);
} else {
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

// Register Service Worker for PWA
registerServiceWorker()

