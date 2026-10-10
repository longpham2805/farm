// The 3D farm: renderer, camera, lights, island, plants, effects and picking.
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { buildIsland, plotCenter, SOIL_TOP, PLANT_SCALE, cloud, butterfly } from './island.js';
import { buildPlant } from './models.js';
import { updateRainbow } from './materials.js';
import { glowTexture, starTexture, skyTexture, ringTexture, sunRaysTexture, sunFaceTexture } from './textures.js';
import { STYLES } from '../data/styles.js';
import { CROP_BY_ID } from '../data/crops.js';

const TAU = Math.PI * 2;
const DRY = new THREE.Color('#9b6440');
const WET = new THREE.Color('#5e3720');
const LOCKED = new THREE.Color('#7dc95a');
const CAM_DIR = new THREE.Vector3(1, 0.95, 1).normalize();

const easeOutBack = (t) => 1 + 2.4 * Math.pow(t - 1, 3) + 1.4 * Math.pow(t - 1, 2);
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
const easeInCubic = (t) => t * t * t;

export const HOME_THEME = {
  grass: '#86d460', grassDark: '#5fb346', fence: '#c98a4b', barn: '#ef6461', roof: '#8a4b3a', tree: '#4fb35a', tree2: '#7ccf5a',
};

export function npcTheme(npc) {
  return { ...HOME_THEME, fence: npc.fence, barn: npc.roof, roof: '#6b4a3a' };
}

function disposeFx(obj) {
  obj.traverse((o) => {
    if (o.userData.ownMaterial && o.material) o.material.dispose();
  });
}

export class FarmScene {
  constructor(canvas, { onPlot, onAction, onHover, quality = 'high' }) {
    this.canvas = canvas;
    this.onPlot = onPlot;
    this.onAction = onAction;
    this.onHover = onHover;
    this.frameHooks = [];
    this.tweens = [];
    this.particles = [];
    this.selected = null;
    this.target = null;
    this.hovered = null;
    this.plantMode = false;
    this.clock = new THREE.Timer();

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer = renderer;

    const scene = new THREE.Scene();
    scene.background = skyTexture('#86cbff', '#fff3bf', '#ffcf5c');
    this.scene = scene;

    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
    this.zoom = 1;
    this.pan = new THREE.Vector2();
    this.camera.position.copy(CAM_DIR).multiplyScalar(30);
    this.camera.lookAt(0, 0, 0);

    scene.add(new THREE.HemisphereLight('#fff6dc', '#86a85a', 1.2));
    const sun = new THREE.DirectionalLight('#fff0c4', 2.4);
    sun.position.set(3.5, 9, -1.2);
    sun.castShadow = true;
    sun.shadow.camera.left = -5.5;
    sun.shadow.camera.right = 5.5;
    sun.shadow.camera.top = 5.5;
    sun.shadow.camera.bottom = -5.5;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 25;
    sun.shadow.bias = -0.0006;
    sun.shadow.normalBias = 0.02;
    scene.add(sun);
    this.sun = sun;

    this.world = new THREE.Group();
    scene.add(this.world);
    this.plantsGroup = new THREE.Group();
    this.world.add(this.plantsGroup);
    this.fxGroup = new THREE.Group();
    this.world.add(this.fxGroup);

    this.slots = [];
    for (let i = 0; i < 16; i++) {
      const root = new THREE.Group();
      const c = plotCenter(i);
      root.position.set(c.x, SOIL_TOP, c.z);
      root.scale.setScalar(PLANT_SCALE);
      root.userData.plot = i;
      this.plantsGroup.add(root);
      this.slots.push({ root, holder: null, key: '', top: 0, wetUntil: 0, locked: false, empty: true, look: null, ripe: false, phase: Math.random() * TAU });
    }

    scene.add(this.camera);
    this.sunSprite = this.makeSun();
    this.camera.add(this.sunSprite);

    this.clouds = [];
    const cloudSpots = [[-7, -1.5, 2, 1.4], [6, 1.2, -5, 1.1], [-2, -4.5, 7, 1.8], [8, -3.5, 2, 1.5], [-8, 2.2, -4, 1], [3, -5, 8, 1.3], [-5, 3, -8, 1.2]];
    for (const [x, y, z, s] of cloudSpots) {
      const c = cloud(s);
      c.position.set(x, y, z);
      scene.add(c);
      this.clouds.push(c);
    }
    this.butterflies = ['#ff8fc1', '#ffd23f'].map((col, i) => {
      const b = butterfly(col);
      b.userData.phase = i * 3.1;
      this.world.add(b);
      return b;
    });

    this.setTheme(HOME_THEME);
    this.setQuality(quality);
    this.bindInput();
    this.resize();
    window.addEventListener('resize', () => this.resize());
    renderer.setAnimationLoop(() => this.frame());
  }

  setTheme(theme) {
    if (this.island) {
      this.world.remove(this.island.group);
      this.island.group.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
      });
      for (const p of this.island.plots) p.tile.material.dispose();
    }
    this.island = buildIsland(theme);
    this.world.add(this.island.group);
    this.island.plots.forEach((p, i) => {
      p.tile.userData.plot = i;
      this.slots[i].tile = p.tile;
      this.slots[i].hit = p.hit;
    });
    this.refreshTiles();
  }

  setQuality(q) {
    this.quality = q;
    const high = q === 'high';
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, high ? 2 : 1.25));
    this.sun.shadow.mapSize.set(high ? 2048 : 1024, high ? 2048 : 1024);
    if (this.sun.shadow.map) {
      this.sun.shadow.map.dispose();
      this.sun.shadow.map = null;
    }
    if (high && !this.composer) {
      this.composer = new EffectComposer(this.renderer);
      this.composer.addPass(new RenderPass(this.scene, this.camera));
      this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.32, 0.35, 0.97);
      this.composer.addPass(this.bloom);
      this.composer.addPass(new OutputPass());
    }
    this.resize();
  }

  resize() {
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.width = w;
    this.height = h;
    this.renderer.setSize(w, h, false);
    if (this.composer) {
      this.composer.setPixelRatio(this.renderer.getPixelRatio());
      this.composer.setSize(w, h);
    }
    this.applyView();
  }

  /** Frames the island for the screen shape, then applies the player's zoom and pan. */
  applyView() {
    const aspect = this.width / this.height;
    const portrait = aspect < 0.8;
    const needW = portrait ? 8.6 : 12.0;
    const needH = 8.0;
    const baseH = Math.max(needH, needW / aspect);
    const viewH = baseH / this.zoom;
    const viewW = viewH * aspect;
    // Keep the island a little above centre so the bottom bars do not cover it.
    const shiftY = (portrait ? 0.03 : 0.05) * baseH;
    const cx = this.pan.x;
    const cy = this.pan.y + shiftY;
    this.camera.left = cx - viewW / 2;
    this.camera.right = cx + viewW / 2;
    this.camera.top = cy + viewH / 2;
    this.camera.bottom = cy - viewH / 2;
    this.camera.updateProjectionMatrix();
    this.viewH = viewH;
    if (this.sunSprite) {
      this.sunSprite.position.set(this.camera.left + viewW * (portrait ? 0.2 : 0.14), this.camera.top - viewH * (portrait ? 0.2 : 0.25), -70);
      this.sunSprite.scale.setScalar(viewH * (portrait ? 0.16 : 0.22));
    }
  }

  setZoom(z) {
    this.zoom = Math.min(2.4, Math.max(0.8, z));
    this.clampPan();
    this.applyView();
  }

  panBy(dxPx, dyPx) {
    const unit = this.viewH / this.height;
    this.pan.x -= dxPx * unit;
    this.pan.y += dyPx * unit;
    this.clampPan();
    this.applyView();
  }

  clampPan() {
    const limit = 0.6 + (this.zoom - 1) * 3.2;
    this.pan.x = Math.min(limit, Math.max(-limit, this.pan.x));
    this.pan.y = Math.min(limit, Math.max(-limit, this.pan.y));
  }

  resetView() {
    this.zoom = 1;
    this.pan.set(0, 0);
    this.applyView();
  }

  // ── Plots ───────────────────────────────────────────────────

  /**
   * desc: null (empty) | { locked: true } | { crop, stage, variant, mystery }
   * opts.animate: pop the new model in
   */
  setPlot(i, desc, { animate = true } = {}) {
    const slot = this.slots[i];
    const key = !desc ? 'empty' : desc.locked ? 'locked' : `${desc.crop}|${desc.stage}|${desc.stage === 3 ? desc.variant : 0}|${desc.mystery && desc.stage < 3 ? 1 : 0}`;
    slot.locked = !!(desc && desc.locked);
    slot.empty = !desc || slot.locked;
    if (slot.key === key) return;
    slot.key = key;
    if (slot.holder) {
      const old = slot.holder;
      slot.root.remove(old);
      disposeFx(old);
      slot.holder = null;
    }
    slot.look = null;
    slot.ripe = false;
    slot.top = 0;
    if (desc && !desc.locked) {
      const holder = new THREE.Group();
      const model = buildPlant(desc.crop, desc.stage, desc.variant || 0, desc.mystery && desc.stage < 3);
      model.traverse((o) => {
        if (o.isMesh) o.castShadow = true;
      });
      holder.add(model);
      slot.top = model.userData.top;
      slot.look = model.userData.look;
      slot.ripe = desc.stage === 3;
      slot.halo = model.getObjectByName('halo') || null;
      if (slot.look) holder.add(this.makeAura(slot.look, slot.top));
      slot.root.add(holder);
      slot.holder = holder;
      if (animate) {
        holder.scale.setScalar(0.01);
        this.tween(desc.stage === 3 ? 650 : 420, (t) => holder.scale.setScalar(Math.max(0.01, easeOutBack(t))));
      }
    }
    this.refreshTiles();
  }

  makeAura(look, top) {
    const style = STYLES[look.style];
    const color = new THREE.Color(style.aura);
    const g = new THREE.Group();
    g.name = 'aura';
    const add = (o) => {
      o.userData.ownMaterial = true;
      g.add(o);
      return o;
    };
    const ground = add(new THREE.Mesh(
      new THREE.PlaneGeometry(1.1, 1.1),
      new THREE.MeshBasicMaterial({ map: glowTexture(), color, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false }),
    ));
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0.02;
    const aura = add(new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color, transparent: true, opacity: 0.35 + look.rank * 0.2, blending: THREE.AdditiveBlending, depthWrite: false })));
    aura.scale.set(1.1 + look.rank * 0.4, 1.2 + look.rank * 0.5, 1);
    aura.position.y = top * 0.5;
    aura.renderOrder = -1;
    const sparkles = [];
    const n = 4 + Math.round(look.rank * 6);
    for (let k = 0; k < n; k++) {
      const s = add(new THREE.Sprite(new THREE.SpriteMaterial({ map: starTexture(), color: color.clone().lerp(new THREE.Color('#ffffff'), 0.5), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })));
      s.userData.spark = { phase: Math.random() * TAU, r: 0.28 + Math.random() * 0.25, y: 0.1 + Math.random() * top, speed: 0.4 + Math.random() * 0.6, size: 0.07 + Math.random() * 0.06 };
      sparkles.push(s);
    }
    let beam = null;
    if (look.rank >= 0.99) {
      beam = add(new THREE.Mesh(
        new THREE.CylinderGeometry(0.16, 0.3, 2.2, 24, 1, true),
        new THREE.MeshBasicMaterial({ map: this.beamTexture(), color, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
      ));
      beam.position.y = 1.1;
    }
    g.userData.fx = { ground, aura, sparkles, beam, rank: look.rank };
    g.traverse((o) => {
      o.raycast = () => {};
    });
    return g;
  }

  makeSun() {
    const g = new THREE.Group();
    const add = (map, color, size, opacity) => {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map, color, transparent: true, opacity, depthWrite: false, fog: false }));
      sp.scale.setScalar(size);
      g.add(sp);
      return sp;
    };
    add(glowTexture(), '#ffd84a', 2.6, 0.55);
    this.sunRays = add(sunRaysTexture(), '#ffe066', 1.7, 0.9);
    add(glowTexture(), '#fff7c2', 0.95, 1);
    const face = add(sunFaceTexture(), '#ffffff', 0.62, 1);
    face.position.z = 0.01;
    g.renderOrder = -10;
    return g;
  }

  beamTexture() {
    if (this._beam) return this._beam;
    const c = document.createElement('canvas');
    c.width = 4;
    c.height = 128;
    const g = c.getContext('2d');
    const grad = g.createLinearGradient(0, 0, 0, 128);
    grad.addColorStop(0, 'rgba(255,255,255,0)');
    grad.addColorStop(0.7, 'rgba(255,255,255,0.35)');
    grad.addColorStop(1, 'rgba(255,255,255,0.9)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 4, 128);
    this._beam = new THREE.CanvasTexture(c);
    return this._beam;
  }

  setWet(i, ms = 4000) {
    this.slots[i].wetUntil = performance.now() + ms;
  }

  setSelected(i) {
    this.selected = i;
    this.refreshTiles();
  }

  /** The plot that the next seed goes into (shown with a pulsing glow). */
  setTarget(i) {
    this.target = i;
    this.refreshTiles();
  }

  setPlantMode(on) {
    this.plantMode = on;
    this.refreshTiles();
  }

  refreshTiles() {
    this.slots.forEach((slot, i) => {
      if (!slot.tile) return;
      const mat = slot.tile.material;
      slot.tile.position.y = slot.locked ? -0.01 : 0.05;
      slot.tile.scale.y = slot.locked ? 0.5 : 1;
      if (!slot.locked) mat.color.copy(DRY);
      else mat.color.copy(LOCKED);
      mat.emissive.set('#ffc94d');
      mat.emissiveIntensity = i === this.selected || i === this.target ? 0.45 : i === this.hovered && !slot.locked ? 0.18 : 0;
    });
  }

  /** Screen position (CSS px) of a point above plot i. */
  screenPos(i, above = null) {
    const slot = this.slots[i];
    const c = plotCenter(i);
    const y = SOIL_TOP + (above ?? (slot.top * PLANT_SCALE * (slot.holder ? slot.holder.scale.y : 1) + 0.12));
    const v = new THREE.Vector3(c.x, y, c.z).project(this.camera);
    return { x: ((v.x + 1) / 2) * this.width, y: ((1 - v.y) / 2) * this.height };
  }

  worldToScreen(v3) {
    const v = v3.clone().project(this.camera);
    return { x: ((v.x + 1) / 2) * this.width, y: ((1 - v.y) / 2) * this.height };
  }

  // ── Effects ─────────────────────────────────────────────────

  tween(duration, fn, done) {
    this.tweens.push({ start: performance.now(), duration, fn, done });
  }

  spawn(texture, color, pos, { n = 10, speed = 1.2, up = 1.5, gravity = 3, size = 0.12, life = 0.9, additive = true, spread = 0.25 } = {}) {
    for (let k = 0; k < n; k++) {
      const mat = new THREE.SpriteMaterial({ map: texture, color, transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending });
      const s = new THREE.Sprite(mat);
      s.position.set(pos.x + (Math.random() - 0.5) * spread, pos.y + Math.random() * 0.1, pos.z + (Math.random() - 0.5) * spread);
      const a = Math.random() * TAU;
      const v = new THREE.Vector3(Math.cos(a) * speed * Math.random(), up * (0.5 + Math.random() * 0.7), Math.sin(a) * speed * Math.random());
      s.scale.setScalar(size);
      this.fxGroup.add(s);
      this.particles.push({ s, v, life, age: 0, gravity, size });
    }
  }

  fxWater(i) {
    const c = plotCenter(i);
    const drop = new THREE.Color('#58c4ff');
    for (let k = 0; k < 14; k++) {
      setTimeout(() => {
        this.spawn(glowTexture(), drop, new THREE.Vector3(c.x + (Math.random() - 0.5) * 0.6, SOIL_TOP + 1.1, c.z + (Math.random() - 0.5) * 0.6), { n: 1, speed: 0, up: -0.5, gravity: 6, size: 0.09, life: 0.45, additive: false, spread: 0 });
      }, k * 30);
    }
    setTimeout(() => this.fxRing(i, '#9fe3ff'), 380);
    this.setWet(i);
  }

  fxRing(i, color) {
    const c = plotCenter(i);
    const ring = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: ringTexture(), color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(c.x, SOIL_TOP + 0.02, c.z);
    this.fxGroup.add(ring);
    this.tween(600, (t) => {
      ring.scale.setScalar(0.3 + t * 1.1);
      ring.material.opacity = 1 - t;
    }, () => {
      this.fxGroup.remove(ring);
      ring.geometry.dispose();
      ring.material.dispose();
    });
  }

  fxPlant(i) {
    const c = plotCenter(i);
    this.spawn(glowTexture(), new THREE.Color('#8a5a3a'), new THREE.Vector3(c.x, SOIL_TOP + 0.05, c.z), { n: 8, speed: 0.9, up: 1.2, gravity: 4, size: 0.1, life: 0.5, additive: false });
  }

  fxSparkle(i, color = '#fff3a0', n = 16) {
    const c = plotCenter(i);
    const slot = this.slots[i];
    this.spawn(starTexture(), new THREE.Color(color), new THREE.Vector3(c.x, SOIL_TOP + slot.top * 0.6, c.z), { n, speed: 1.6, up: 2.2, gravity: 2.5, size: 0.16, life: 1.1 });
  }

  /** Lifts the ripe plant off the plot and pops it. */
  fxHarvest(i) {
    const slot = this.slots[i];
    const holder = slot.holder;
    const color = slot.look ? STYLES[slot.look.style].aura : '#fff3a0';
    this.fxSparkle(i, color, slot.look ? 26 : 14);
    if (!holder) return;
    slot.holder = null;
    slot.key = '';
    const start = holder.position.y;
    this.tween(520, (t) => {
      const up = easeOutCubic(Math.min(1, t * 1.6));
      holder.position.y = start + up * 0.55;
      const s = t < 0.55 ? 1 + t * 0.35 : (1.19 * (1 - easeInCubic((t - 0.55) / 0.45)));
      holder.scale.setScalar(Math.max(0.001, s));
    }, () => {
      slot.root.remove(holder);
      disposeFx(holder);
    });
  }

  fxRipen(i) {
    const slot = this.slots[i];
    this.fxSparkle(i, slot.look ? STYLES[slot.look.style].aura : '#fff3a0', slot.look ? 30 : 10);
    if (slot.look) this.fxRing(i, STYLES[slot.look.style].aura);
  }

  // ── Input ───────────────────────────────────────────────────

  bindInput() {
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const pick = (ev) => {
      const rect = this.canvas.getBoundingClientRect();
      ndc.set(((ev.clientX - rect.left) / rect.width) * 2 - 1, -((ev.clientY - rect.top) / rect.height) * 2 + 1);
      ray.setFromCamera(ndc, this.camera);
      const targets = [...this.slots.map((s) => s.tile), ...this.slots.map((s) => s.root), ...this.island.clickables];
      const hits = ray.intersectObjects(targets, true);
      for (const h of hits) {
        let o = h.object;
        while (o && o.userData.plot === undefined && !o.userData.action) o = o.parent;
        if (!o) continue;
        if (o.userData.plot !== undefined) return { plot: o.userData.plot };
        return { action: o.userData.action };
      }
      return null;
    };
    // Taps pick plots; dragging pans; pinch or the mouse wheel zooms.
    const pointers = new Map();
    let down = null;
    let pinch = null;
    this.canvas.addEventListener('pointerdown', (ev) => {
      pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
      if (pointers.size === 1) down = { x: ev.clientX, y: ev.clientY, lastX: ev.clientX, lastY: ev.clientY, dragging: false };
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        pinch = { dist: Math.hypot(a.x - b.x, a.y - b.y), zoom: this.zoom };
        down = null;
      }
      this.canvas.setPointerCapture?.(ev.pointerId);
    });
    this.canvas.addEventListener('pointermove', (ev) => {
      if (!pointers.has(ev.pointerId)) return;
      pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
      if (pinch && pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinch.dist > 0) this.setZoom(pinch.zoom * (dist / pinch.dist));
        return;
      }
      if (!down) return;
      if (!down.dragging && Math.hypot(ev.clientX - down.x, ev.clientY - down.y) > 12) down.dragging = true;
      if (down.dragging) {
        this.panBy(ev.clientX - down.lastX, ev.clientY - down.lastY);
        down.lastX = ev.clientX;
        down.lastY = ev.clientY;
      }
    });
    const release = (ev) => {
      pointers.delete(ev.pointerId);
      if (pointers.size < 2) pinch = null;
    };
    this.canvas.addEventListener('pointerup', (ev) => {
      const wasTap = down && !down.dragging && pointers.size === 1;
      release(ev);
      down = null;
      if (!wasTap) return;
      const hit = pick(ev);
      if (hit && hit.plot !== undefined) this.onPlot(hit.plot, ev);
      else if (hit && hit.action) this.onAction(hit.action, ev);
      else this.onPlot(null, ev);
    });
    this.canvas.addEventListener('pointercancel', (ev) => {
      release(ev);
      down = null;
    });
    this.canvas.addEventListener('wheel', (ev) => {
      ev.preventDefault();
      this.setZoom(this.zoom * Math.exp(-ev.deltaY * 0.0015));
    }, { passive: false });
    this.canvas.addEventListener('pointermove', (ev) => {
      if (ev.pointerType !== 'mouse') return;
      const hit = pick(ev);
      const plot = hit && hit.plot !== undefined ? hit.plot : null;
      this.canvas.style.cursor = hit ? 'pointer' : 'default';
      if (plot !== this.hovered) {
        this.hovered = plot;
        this.refreshTiles();
        if (this.onHover) this.onHover(plot);
      }
    });
  }

  onFrame(fn) {
    this.frameHooks.push(fn);
  }

  // ── Frame loop ──────────────────────────────────────────────

  frame() {
    this.clock.update();
    const dt = Math.min(0.05, this.clock.getDelta());
    const t = this.clock.getElapsed();
    const now = performance.now();

    this.tweens = this.tweens.filter((tw) => {
      const k = Math.min(1, (now - tw.start) / tw.duration);
      tw.fn(k);
      if (k >= 1) {
        if (tw.done) tw.done();
        return false;
      }
      return true;
    });

    this.particles = this.particles.filter((p) => {
      p.age += dt;
      p.v.y -= p.gravity * dt;
      p.s.position.addScaledVector(p.v, dt);
      const k = p.age / p.life;
      p.s.material.opacity = 1 - k * k;
      p.s.scale.setScalar(p.size * (1 - k * 0.4));
      if (k >= 1) {
        this.fxGroup.remove(p.s);
        p.s.material.dispose();
        return false;
      }
      return true;
    });

    updateRainbow(t);

    this.slots.forEach((slot, i) => {
      if (slot.tile && !slot.locked) {
        const wet = slot.wetUntil > now ? Math.min(1, (slot.wetUntil - now) / 1500) : 0;
        slot.tile.material.color.copy(DRY).lerp(WET, wet);
        if (this.plantMode && i === this.target && slot.empty) {
          slot.tile.material.emissiveIntensity = 0.55 + 0.25 * Math.sin(t * 6);
        } else if (this.plantMode && slot.empty && i !== this.selected) {
          slot.tile.material.emissiveIntensity = 0.08;
        }
      }
      const h = slot.holder;
      if (!h) return;
      const model = h.children[0];
      if (model) {
        model.rotation.z = Math.sin(t * 1.4 + slot.phase) * 0.03;
        model.rotation.x = Math.cos(t * 1.1 + slot.phase) * 0.02;
        if (slot.ripe) model.position.y = Math.abs(Math.sin(t * 2.2 + slot.phase)) * 0.02;
      }
      if (slot.halo) slot.halo.rotation.z = t * 1.5;
      const aura = h.getObjectByName('aura');
      if (aura) {
        const fx = aura.userData.fx;
        const pulse = 0.5 + 0.5 * Math.sin(t * 2.4 + slot.phase);
        fx.ground.material.opacity = 0.3 + pulse * 0.25;
        fx.aura.material.opacity = (0.16 + fx.rank * 0.14) * (0.75 + pulse * 0.35);
        fx.sparkles.forEach((s) => {
          const sp = s.userData.spark;
          const a = sp.phase + t * sp.speed;
          s.position.set(Math.cos(a) * sp.r, sp.y + Math.sin(t * 1.3 + sp.phase) * 0.06, Math.sin(a) * sp.r);
          const tw = Math.max(0, Math.sin(t * 3 + sp.phase * 3));
          s.material.opacity = tw;
          s.scale.setScalar(sp.size * (0.5 + tw));
        });
        if (fx.beam) fx.beam.material.opacity = 0.1 + pulse * 0.12;
      }
    });

    if (this.sunRays) this.sunRays.material.rotation = t * 0.15;
    for (const c of this.clouds) {
      c.position.x += dt * 0.12;
      c.position.z -= dt * 0.12;
      if (c.position.x > 11) {
        c.position.x -= 20;
        c.position.z += 20;
      }
    }
    this.butterflies.forEach((b, k) => {
      const ph = t * 0.35 + b.userData.phase;
      const x = Math.sin(ph) * 2.6;
      const z = Math.sin(ph * 1.7 + k) * 2.2;
      const y = 1.0 + Math.sin(ph * 3.1) * 0.25;
      const nx = Math.sin(ph + 0.01) * 2.6;
      const nz = Math.sin((ph + 0.01) * 1.7 + k) * 2.2;
      b.position.set(x, y, z);
      b.rotation.z = Math.atan2(nx - x, nz - z) + Math.PI;
      const flap = Math.sin(t * 18 + k) * 0.9;
      b.userData.wings[0].rotation.y = flap;
      b.userData.wings[1].rotation.y = -flap;
    });

    for (const fn of this.frameHooks) fn(t);

    if (this.quality === 'high' && this.composer) this.composer.render(dt);
    else this.renderer.render(this.scene, this.camera);
  }
}

export { CROP_BY_ID };
