import { createHash } from 'node:crypto';
import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// `npm run build` makes the installable web app (PWA) in dist/.
// `npm run build:single` makes one self-contained dist-single/index.html (no PWA parts).
export default defineConfig(({ mode }) => {
  const single = mode === 'single';
  return {
    base: './',
    publicDir: single ? false : 'public',
    plugins: single ? [viteSingleFile(), stripPwaTags()] : [serviceWorker(), absoluteShareImage()],
    build: {
      outDir: single ? 'dist-single' : 'dist',
      chunkSizeWarningLimit: 1200,
    },
  };
});

const PUBLIC_FILES = [
  'manifest.webmanifest',
  'icons/icon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/maskable-512.png',
  'icons/apple-touch-icon.png',
];

/** Writes sw.js with the list of built files, so the game works offline after the first visit. */
function serviceWorker() {
  return {
    name: 'farm-service-worker',
    apply: 'build',
    enforce: 'post',
    generateBundle(_, bundle) {
      const files = [...new Set(['index.html', ...Object.keys(bundle), ...PUBLIC_FILES])].filter((f) => !f.endsWith('.map'));
      const version = createHash('sha1').update(files.join('|')).digest('hex').slice(0, 10);
      this.emitFile({ type: 'asset', fileName: 'sw.js', source: swSource(version, ['./', ...files.map((f) => `./${f}`)]) });
    },
  };
}

function stripPwaTags() {
  return {
    name: 'farm-strip-pwa',
    transformIndexHtml: (html) => html
      .replace(/^\s*<link rel="(manifest|apple-touch-icon|icon)"[^>]*>\n/gm, '')
      .replace(/^\s*<meta property="og:image"[^>]*>\n/gm, ''),
  };
}

/** Link previews (the iPhone share sheet, chat apps) need a full URL for og:image. SITE_URL is set by the Pages workflow. */
function absoluteShareImage() {
  const site = process.env.SITE_URL;
  return {
    name: 'farm-share-image',
    apply: 'build',
    enforce: 'post',
    transformIndexHtml: (html) => (site
      ? html.replace(/(<meta property="og:image" content=")\.?\/?([^"]+)"/, (_, head, path) => `${head}${new URL(path, site.replace(/\/?$/, '/'))}"`)
      : html),
  };
}

function swSource(version, assets) {
  return `// Generated at build time. Caches the game for offline play.
const CACHE = 'farm-${version}';
const FONTS = 'farm-fonts';
const ASSETS = ${JSON.stringify(assets, null, 2)};

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('farm-') && k !== CACHE && k !== FONTS).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === self.location.origin) {
    if (req.mode === 'navigate') {
      // Fresh page when online, cached page when offline.
      event.respondWith(
        fetch(req)
          .then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put('./index.html', copy));
            return res;
          })
          .catch(() => caches.match('./index.html')),
      );
      return;
    }
    event.respondWith(caches.match(req).then((hit) => hit || fetch(req)));
    return;
  }
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      caches.open(FONTS).then(async (c) => {
        const hit = await c.match(req);
        const net = fetch(req).then((res) => {
          c.put(req, res.clone());
          return res;
        }).catch(() => hit);
        return hit || net;
      }),
    );
  }
});
`;
}
