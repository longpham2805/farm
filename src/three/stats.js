// A small readout in the corner of what a frame costs, for measuring on a phone as much as on the desk: how many draw
// calls and triangles the renderer sent (shadow pass and effects included, since the count runs over the whole
// frame), the time a frame took and the frames a second, each averaged over the last SPAN frames. On when the page
// is opened with `?stats`; `window.farmStats` holds the latest numbers for scripts.
const SPAN = 60;

/** Counts frames of `renderer`; call begin() first thing in a frame and end() after the last render. */
export function frameStats(renderer) {
  const info = renderer.info;
  // Reset by begin(), not by each render() call, so the shadow pass and every effect pass add up.
  info.autoReset = false;
  const box = document.createElement('div');
  box.style.cssText = 'position:fixed;left:8px;top:8px;z-index:99;padding:4px 7px;background:rgba(0,0,0,0.6);color:#fff;font:12px/1.4 ui-monospace,Menlo,monospace;white-space:pre;pointer-events:none;border-radius:4px';
  document.body.appendChild(box);
  const frames = [];
  let started = 0;
  let last = performance.now();
  const stats = { calls: 0, triangles: 0, ms: 0, fps: 0 };
  window.farmStats = stats;
  return {
    begin() {
      info.reset();
      started = performance.now();
    },
    end() {
      const now = performance.now();
      frames.push({ ms: now - started, gap: now - last, calls: info.render.calls, triangles: info.render.triangles });
      last = now;
      if (frames.length > SPAN) frames.shift();
      const mean = (k) => frames.reduce((s, f) => s + f[k], 0) / frames.length;
      stats.calls = Math.round(mean('calls'));
      stats.triangles = Math.round(mean('triangles'));
      stats.ms = mean('ms');
      stats.fps = 1000 / mean('gap');
      box.textContent = `${stats.calls} calls  ${(stats.triangles / 1e6).toFixed(2)}M tris\n${stats.ms.toFixed(1)} ms  ${stats.fps.toFixed(0)} fps`;
    },
  };
}
