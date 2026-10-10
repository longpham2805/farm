import './styles.css';
import { App } from './app.js';
import { pullOnStart } from './game/cloud.js';

let app = null;
let installPrompt = null;

// Installable app: keep the browser's install prompt for the Settings button,
// and cache the game for offline play (only in the real build served over http/https).
window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  installPrompt = event;
  if (app) app.installPrompt = event;
});
window.addEventListener('appinstalled', () => {
  installPrompt = null;
  if (app) app.installPrompt = null;
});

// With a family code, first fetch the farm in case another device played since (a few seconds at most).
pullOnStart().finally(() => {
  app = new App();
  app.installPrompt = installPrompt;
  // Handy for debugging from the browser console.
  window.farm = app;
});
if ('serviceWorker' in navigator && import.meta.env.PROD && import.meta.env.MODE !== 'single' && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
