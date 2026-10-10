// Small canvas-drawn textures, made once and shared.
import * as THREE from 'three';

const cache = new Map();

function canvasTex(key, w, h, draw, { srgb = true, repeat = null } = {}) {
  if (cache.has(key)) return cache.get(key);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const tex = new THREE.CanvasTexture(c);
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  if (repeat) {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(...repeat);
  }
  cache.set(key, tex);
  return tex;
}

export const glowTexture = () =>
  canvasTex('glow', 128, 128, (g, w) => {
    const grad = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.25, 'rgba(255,255,255,0.75)');
    grad.addColorStop(0.6, 'rgba(255,255,255,0.18)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, w, w);
  });

export const ringTexture = () =>
  canvasTex('ring', 128, 128, (g, w) => {
    const grad = g.createRadialGradient(w / 2, w / 2, w * 0.2, w / 2, w / 2, w / 2);
    grad.addColorStop(0, 'rgba(255,255,255,0)');
    grad.addColorStop(0.7, 'rgba(255,255,255,0.9)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, w, w);
  });

export const starTexture = () =>
  canvasTex('star', 64, 64, (g, w) => {
    const c = w / 2;
    const glow = g.createRadialGradient(c, c, 0, c, c, c);
    glow.addColorStop(0, 'rgba(255,255,255,0.9)');
    glow.addColorStop(0.3, 'rgba(255,255,255,0.25)');
    glow.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = glow;
    g.fillRect(0, 0, w, w);
    g.fillStyle = '#fff';
    g.beginPath();
    for (let i = 0; i < 8; i++) {
      const r = i % 2 === 0 ? c * 0.95 : c * 0.12;
      const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
      g.lineTo(c + Math.cos(a) * r, c + Math.sin(a) * r);
    }
    g.closePath();
    g.fill();
  });

export const skyTexture = (top = '#7fc8ff', mid = '#bfe6ff', bottom = '#ffe3f1') =>
  canvasTex(`sky${top}${mid}${bottom}`, 4, 256, (g, w, h) => {
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, top);
    grad.addColorStop(0.55, mid);
    grad.addColorStop(1, bottom);
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
  });

export const sunRaysTexture = () =>
  canvasTex('sunRays', 256, 256, (g, w) => {
    const c = w / 2;
    g.fillStyle = '#ffffff';
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      g.beginPath();
      g.moveTo(c + Math.cos(a - 0.12) * c * 0.42, c + Math.sin(a - 0.12) * c * 0.42);
      g.lineTo(c + Math.cos(a) * c * 0.98, c + Math.sin(a) * c * 0.98);
      g.lineTo(c + Math.cos(a + 0.12) * c * 0.42, c + Math.sin(a + 0.12) * c * 0.42);
      g.closePath();
      g.fill();
    }
  });

/** A smiling sun face. */
export const sunFaceTexture = () =>
  canvasTex('sunFace', 256, 256, (g, w) => {
    const c = w / 2;
    const grad = g.createRadialGradient(c * 0.8, c * 0.7, c * 0.1, c, c, c * 0.95);
    grad.addColorStop(0, '#fff6a0');
    grad.addColorStop(0.7, '#ffd21f');
    grad.addColorStop(1, '#ffb300');
    g.fillStyle = grad;
    g.beginPath();
    g.arc(c, c, c * 0.95, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#7a4a10';
    for (const x of [-0.3, 0.3]) {
      g.beginPath();
      g.ellipse(c + x * c, c - 0.12 * c, c * 0.075, c * 0.11, 0, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = 'rgba(255, 120, 80, 0.45)';
    for (const x of [-0.52, 0.52]) {
      g.beginPath();
      g.ellipse(c + x * c, c + 0.12 * c, c * 0.12, c * 0.07, 0, 0, Math.PI * 2);
      g.fill();
    }
    g.strokeStyle = '#7a4a10';
    g.lineWidth = c * 0.07;
    g.lineCap = 'round';
    g.beginPath();
    g.arc(c, c + 0.05 * c, c * 0.3, 0.2 * Math.PI, 0.8 * Math.PI);
    g.stroke();
  });

export const stripeTexture = () =>
  canvasTex('stripes', 128, 64, (g, w, h) => {
    g.fillStyle = '#5cbf4a';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#1f6b2a';
    for (let i = 0; i < 8; i++) {
      const x = (i / 8) * w;
      g.beginPath();
      g.moveTo(x, 0);
      for (let y = 0; y <= h; y += 4) g.lineTo(x + 4 + Math.sin(y * 0.4 + i) * 2.5, y);
      g.lineTo(x + 9, h);
      for (let y = h; y >= 0; y -= 4) g.lineTo(x + 11 + Math.sin(y * 0.4 + i) * 2.5, y);
      g.fill();
    }
  });

export const pineappleTexture = () =>
  canvasTex('pine', 128, 128, (g, w) => {
    g.fillStyle = '#f5b82e';
    g.fillRect(0, 0, w, w);
    g.strokeStyle = '#b8741a';
    g.lineWidth = 3;
    for (let i = -w; i < w * 2; i += 21) {
      g.beginPath();
      g.moveTo(i, 0);
      g.lineTo(i + w, w);
      g.stroke();
      g.beginPath();
      g.moveTo(i, w);
      g.lineTo(i + w, 0);
      g.stroke();
    }
    g.fillStyle = '#ffd86b';
    for (let x = 0; x < w; x += 21) for (let y = 10; y < w; y += 21) {
      g.beginPath();
      g.arc(x + 10, y, 2.5, 0, Math.PI * 2);
      g.fill();
    }
  });

export const kernelTexture = () =>
  canvasTex('corn', 64, 128, (g, w, h) => {
    g.fillStyle = '#e8a800';
    g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 9) for (let x = (y / 9) % 2 ? 4 : 0; x < w; x += 8) {
      const grad = g.createRadialGradient(x + 3, y + 3, 0, x + 4, y + 4, 5);
      grad.addColorStop(0, '#fff3a0');
      grad.addColorStop(1, '#ffc81e');
      g.fillStyle = grad;
      g.beginPath();
      g.ellipse(x + 4, y + 4.5, 3.6, 4, 0, 0, Math.PI * 2);
      g.fill();
    }
  });

export const soilTexture = () =>
  canvasTex('soil', 128, 128, (g, w) => {
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, w, w);
    let s = 7;
    const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 260; i++) {
      const v = 200 + r() * 55;
      g.fillStyle = `rgb(${v},${v},${v})`;
      g.beginPath();
      g.ellipse(r() * w, r() * w, 1 + r() * 4, 1 + r() * 2.5, r() * 3, 0, Math.PI * 2);
      g.fill();
    }
  });
