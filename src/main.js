import './styles.css';
import { App } from './app.js';

const app = new App();
// Handy for debugging from the browser console.
window.farm = app;

// Installable app: keep the browser's install prompt for the Settings button,
// and cache the game for offline play (only in the real build served over http/https).
window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  app.installPrompt = event;
});
window.addEventListener('appinstalled', () => {
  app.installPrompt = null;
});
if ('serviceWorker' in navigator && import.meta.env.PROD && import.meta.env.MODE !== 'single' && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
