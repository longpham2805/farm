// Connects the game rules, the 3D scene and the HTML interface.
import * as G from './game/logic.js';
import { loadState, saveState, clearSave } from './game/store.js';
import { FarmScene, HOME_THEME, npcTheme } from './three/scene.js';
import { NPC_BY_ID, NPCS } from './data/npcs.js';
import { CROP_BY_ID, isPack } from './data/crops.js';
import { DAILY_LIMITS, PLOT_UNLOCK } from './config.js';
import { t, setLang, cropName, seedName, fmtNum } from './i18n.js';
import { initAudio, sfx, setSound, setMusic } from './audio.js';
import { Hud } from './ui/hud.js';
import { Bubbles } from './ui/bubbles.js';
import { Sheets } from './ui/sheets.js';
import { Popover } from './ui/popover.js';
import { toast, floatText, refreshModals, anyModal, closeAll } from './ui/overlay.js';
import { openShop } from './ui/shop.js';
import { openBarn } from './ui/barn.js';
import { openBook } from './ui/book.js';
import { openQuests } from './ui/quests.js';
import { openChests } from './ui/chests.js';
import { openUpgrade } from './ui/upgrade.js';
import { openSettings, openWelcome } from './ui/settings.js';
import { showReveal } from './ui/reveal.js';
import { prewarm } from './three/thumbs.js';
import { CROPS } from './data/crops.js';

export class App {
  constructor() {
    const now = Date.now();
    const { state, fresh } = loadState(now);
    this.state = state;
    this.fresh = fresh;
    if (fresh) state.settings.quality = guessQuality();
    setLang(state.settings.lang);
    setSound(state.settings.sound);
    setMusic(state.settings.music);

    this.view = { mode: 'home', npcId: null };
    this.sheet = null;
    this.seedSel = null;
    this.plantTarget = null;
    this.reveals = [];
    this.revealing = false;

    this.scene = new FarmScene(document.getElementById('scene'), {
      onPlot: (i) => this.onPlot(i),
      onAction: (a) => this.onSceneAction(a),
      quality: state.settings.quality,
    });
    this.hud = new Hud(this);
    this.bubbles = new Bubbles(this);
    this.sheets = new Sheets(this);
    this.popover = new Popover(this);
    this.scene.onFrame(() => {
      this.bubbles.frame();
      this.popover.frame();
    });

    // Plants that ripened while away just appear ripe.
    G.tick(state, now);
    const helped = G.catchUp(state, now);
    this.syncPlots(false);
    this.refresh();

    const unlock = () => initAudio();
    window.addEventListener('pointerdown', unlock, { passive: true });

    setInterval(() => this.tick(), 400);
    setInterval(() => this.maybeFriendHelp(), 45000);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.save(true);
    });
    window.addEventListener('pagehide', () => this.save(true));

    setTimeout(() => {
      const loading = document.getElementById('loading');
      loading.classList.add('gone');
      setTimeout(() => loading.remove(), 600);
      if (!state.seenIntro) openWelcome(this);
      prewarm(CROPS.map((c) => c.id));
      for (const [id, n] of Object.entries(helped)) toast(t('whileAway', { name: NPC_BY_ID[id].name, n }), 'good');
    }, 350);
  }

  now() {
    return Date.now();
  }

  // ── Persistence and refresh ─────────────────────────────────

  save(immediate = false) {
    clearTimeout(this.saveTimer);
    if (immediate) saveState(this.state);
    else this.saveTimer = setTimeout(() => saveState(this.state), 800);
  }

  /** Call after any change to the state. */
  refresh() {
    this.save();
    this.hud.update();
    this.syncPlots();
    this.sheets.render();
    refreshModals();
  }

  handleChests(chests) {
    for (const tier of chests || []) {
      toast(`🎁 ${t('newChest', { chest: t('chest_' + tier) })}`, 'good');
      sfx.chest();
    }
  }

  // ── Plots ───────────────────────────────────────────────────

  farmPlots() {
    if (this.view.mode === 'npc') return G.ensureNpc(this.state, this.view.npcId, this.now()).plots;
    return this.state.plots;
  }

  farmLevel() {
    return this.view.mode === 'npc' ? NPC_BY_ID[this.view.npcId].level : this.state.level;
  }

  describe(i, now = this.now()) {
    const level = this.farmLevel();
    if (!G.plotUnlocked(level, i)) return { locked: true };
    const plot = this.farmPlots()[i];
    if (!plot) return null;
    const info = G.plotInfo(plot, now);
    return { crop: plot.crop, stage: info.stage, variant: plot.variant ?? 0, mystery: !!plot.pack, info, plot };
  }

  syncPlots(animate = true) {
    const now = this.now();
    for (let i = 0; i < 16; i++) {
      const d = this.describe(i, now);
      this.scene.setPlot(i, d, { animate });
    }
    this.bubbles.sync();
  }

  tick() {
    const now = this.now();
    if (G.ensureDaily(this.state, now)) this.refresh();
    if (this.view.mode === 'home') {
      const ripened = G.tick(this.state, now);
      if (ripened.length) {
        this.syncPlots();
        for (const i of ripened) {
          this.scene.fxRipen(i);
          if (this.state.plots[i].variant) sfx.mutate();
        }
        sfx.ripe();
        this.save();
      }
    }
    this.syncPlots();
    this.hud.update();
    this.popover.update();
  }

  maybeFriendHelp() {
    if (this.view.mode !== 'home' || Math.random() > 0.35) return;
    const r = G.friendHelp(this.state, this.now());
    if (!r) return;
    this.scene.fxWater(r.index);
    toast(`${NPC_BY_ID[r.npc].avatar} ${t('friendHelped', { name: NPC_BY_ID[r.npc].name })}`, 'good');
    this.refresh();
  }

  plotScreen(i, above) {
    const rect = this.scene.canvas.getBoundingClientRect();
    const p = this.scene.screenPos(i, above);
    return { x: p.x + rect.left, y: p.y + rect.top };
  }

  // ── Input ───────────────────────────────────────────────────

  onPlot(i) {
    if (i === null) {
      this.popover.close();
      this.scene.setSelected(null);
      return;
    }
    if (this.view.mode === 'npc') return this.onNpcPlot(i);
    const d = this.describe(i);
    if (d && d.locked) {
      this.popover.close();
      sfx.error();
      toast(`🔒 ${t('plotLocked', { n: lockLevel(i) })}`);
      return;
    }
    if (!d) {
      // Empty plot: it becomes the plot the next seed goes into.
      this.popover.close();
      if (this.sheet !== 'seeds') this.openSeeds(i);
      else {
        sfx.tap();
        this.setTarget(i);
        this.sheets.render();
      }
      return;
    }
    if (d.info.mature) return this.harvest(i);
    if (d.info.thirsty) return this.water(i);
    sfx.tap();
    this.popover.open(i);
  }

  onNpcPlot(i) {
    const d = this.describe(i);
    if (!d || d.locked) return;
    if (d.info.mature) {
      if (d.plot.stolen) {
        toast(t('stealTaken'));
        sfx.error();
        return;
      }
      return this.steal(i);
    }
    if (d.info.thirsty) return this.npcWater(i);
    sfx.tap();
    this.popover.open(i);
  }

  onSceneAction(a) {
    if (this.view.mode !== 'home') return;
    if (a === 'barn') openBarn(this);
    if (a === 'frog') {
      sfx.tap();
      openQuests(this);
    }
  }

  // ── Home actions ────────────────────────────────────────────

  plant(i, seedId, { quiet = false } = {}) {
    const r = G.plant(this.state, i, seedId, this.now());
    if (!r.ok) {
      if (!quiet) {
        sfx.error();
        if (r.err === 'noSeeds') toast(t('noSeeds'), 'warn');
      }
      return false;
    }
    this.scene.setSelected(null);
    this.syncPlots();
    this.scene.fxPlant(i);
    if (!quiet) sfx.plant();
    if (G.seedCount(this.state, seedId) <= 0) this.seedSel = null;
    this.handleChests(r.chests);
    this.refresh();
    return true;
  }

  plantAll(seedId) {
    let n = 0;
    for (let i = 0; i < 16; i++) {
      if (!G.plotUnlocked(this.state.level, i) || this.state.plots[i]) continue;
      if (G.seedCount(this.state, seedId) <= 0) break;
      if (this.plant(i, seedId, { quiet: true })) n++;
    }
    if (n) {
      sfx.plant();
      toast(t('planted', { n }), 'good');
      this.setTarget(this.nextEmptyPlot());
      this.sheets.render();
      if (this.plantTarget == null) this.closeSheetSoon();
    } else {
      sfx.error();
      toast(G.seedCount(this.state, seedId) > 0 ? t('noEmpty') : t('noSeeds'), 'warn');
    }
  }

  water(i, { quiet = false } = {}) {
    const r = G.water(this.state, i, this.now());
    if (!r.ok) return false;
    this.scene.fxWater(i);
    if (!quiet) sfx.water();
    const p = this.plotScreen(i);
    floatText(p.x, p.y - 20, '💧+1');
    this.handleChests(r.chests);
    this.refresh();
    return true;
  }

  waterAll() {
    let n = 0;
    for (let i = 0; i < 16; i++) {
      const plot = this.state.plots[i];
      if (plot && G.plotInfo(plot, this.now()).thirsty) {
        setTimeout(() => this.water(i, { quiet: true }), n * 90);
        n++;
      }
    }
    if (n) sfx.water();
  }

  harvest(i, { quiet = false } = {}) {
    const plot = this.state.plots[i];
    const r = G.harvest(this.state, i, this.now());
    if (!r.ok) return false;
    this.popover.close();
    this.scene.fxHarvest(i);
    const p = this.plotScreen(i);
    floatText(p.x, p.y - 10, `+${r.count} ${shortName(r.crop)}`, r.variant ? 'pink' : '');
    if (r.xp) setTimeout(() => floatText(p.x + 30, p.y + 16, `⭐+${r.xp}`, 'gold'), 180);
    if (!quiet) (r.variant ? sfx.mutate : sfx.harvest)();
    if (r.newDiscovery || (plot && plot.pack)) {
      this.queueReveal({ crop: r.crop, variant: r.variant, newDiscovery: r.newDiscovery, pack: plot && plot.pack });
    }
    if (this.sheet === 'seeds' && this.plantTarget == null) this.setTarget(i);
    this.handleChests(r.chests);
    this.refresh();
    return true;
  }

  harvestAll() {
    let n = 0;
    let mutated = false;
    for (let i = 0; i < 16; i++) {
      const plot = this.state.plots[i];
      if (plot && G.plotInfo(plot, this.now()).mature) {
        if (plot.variant) mutated = true;
        setTimeout(() => this.harvest(i, { quiet: true }), n * 110);
        n++;
      }
    }
    if (n) (mutated ? sfx.mutate : sfx.harvest)();
  }

  removePlant(i) {
    G.removePlant(this.state, i);
    this.scene.fxPlant(i);
    this.popover.close();
    toast(t('removed'));
    this.refresh();
  }

  // ── Neighbours ──────────────────────────────────────────────

  visit(npcId) {
    this.popover.close();
    closeAll();
    this.view = { mode: 'npc', npcId };
    this.sheet = 'friends';
    G.bump(this.state, 'visits');
    this.scene.setTheme(npcTheme(NPC_BY_ID[npcId]));
    this.scene.setSelected(null);
    this.scene.setPlantMode(false);
    for (let i = 0; i < 16; i++) this.scene.setPlot(i, undefined, { animate: false });
    this.syncPlots(false);
    sfx.open();
    this.refresh();
  }

  goHome() {
    this.popover.close();
    this.view = { mode: 'home', npcId: null };
    this.sheet = null;
    this.scene.setTheme(HOME_THEME);
    for (let i = 0; i < 16; i++) this.scene.setPlot(i, undefined, { animate: false });
    this.syncPlots(false);
    sfx.open();
    this.refresh();
  }

  steal(i) {
    const id = this.view.npcId;
    const r = G.npcSteal(this.state, id, i, this.now());
    if (!r.ok) {
      sfx.error();
      toast(r.err === 'limit' ? t('stealLimit') : r.err === 'taken' ? t('stealTaken') : t('notRipeFriend'), 'warn');
      return;
    }
    this.scene.fxSparkle(i, r.variant ? '#ff8fc1' : '#fff3a0', 12);
    const p = this.plotScreen(i);
    floatText(p.x, p.y - 10, `+${r.count} ${shortName(r.crop)}`, r.variant ? 'pink' : '');
    (r.variant ? sfx.mutate : sfx.harvest)();
    toast(t('stoleOk', { n: r.count, name: cropName(r.crop, r.variant) }), 'good');
    if (r.newDiscovery) this.queueReveal({ crop: r.crop, variant: r.variant, newDiscovery: true });
    this.handleChests(r.chests);
    this.refresh();
  }

  npcWater(i) {
    const r = G.npcWater(this.state, this.view.npcId, i, this.now());
    if (!r.ok) return;
    this.scene.fxWater(i);
    sfx.water();
    const p = this.plotScreen(i);
    if (r.rewarded) floatText(p.x, p.y - 10, `🪙+${r.coins}`, 'gold');
    else toast(t('helpedFriend'));
    this.handleChests(r.chests);
    this.refresh();
  }

  stealLeft(npcId) {
    const def = NPC_BY_ID[npcId];
    return def.stranger
      ? { n: DAILY_LIMITS.stealStranger - this.state.daily.stealStranger, max: DAILY_LIMITS.stealStranger, stranger: true }
      : { n: DAILY_LIMITS.stealFriend - this.state.daily.stealFriend, max: DAILY_LIMITS.stealFriend, stranger: false };
  }

  // ── Panels ──────────────────────────────────────────────────

  /** Opens the seed bar. `target` is the plot to plant first (default: first empty one). */
  openSeeds(target = null) {
    this.popover.close();
    this.sheet = 'seeds';
    if (!this.seedSel || G.seedCount(this.state, this.seedSel) <= 0) this.seedSel = this.defaultSeed();
    this.scene.setPlantMode(true);
    this.setTarget(target ?? this.nextEmptyPlot());
    sfx.open();
    this.sheets.render();
    this.bubbles.sync();
    this.hud.update();
  }

  defaultSeed() {
    const owned = Object.entries(this.state.seeds).filter(([, n]) => n > 0).map(([id]) => id);
    const crops = owned.filter((id) => !isPack(id)).sort((a, b) => CROP_BY_ID[b].tier - CROP_BY_ID[a].tier);
    return crops[0] || owned[0] || 'radish';
  }

  closeSheet() {
    if (this.view.mode === 'npc') return;
    this.sheet = null;
    this.setTarget(null);
    this.scene.setPlantMode(false);
    this.scene.setSelected(null);
    this.sheets.render();
    this.bubbles.sync();
    this.hud.update();
  }

  /** Tapping a seed plants it in the glowing plot, then moves the glow to the next empty plot. */
  selectSeed(id) {
    this.seedSel = id;
    let i = this.plantTarget;
    if (i == null || this.state.plots[i] || !G.plotUnlocked(this.state.level, i)) i = this.nextEmptyPlot();
    if (i == null) {
      sfx.tap();
      toast(t('noEmpty'));
      this.sheets.render();
      return;
    }
    if (!this.plant(i, id)) return;
    const next = this.nextEmptyPlot(i);
    this.setTarget(next);
    this.sheets.render();
    if (next == null) {
      toast(`🌱 ${t('allPlanted')}`, 'good');
      this.closeSheetSoon();
    }
  }

  closeSheetSoon() {
    setTimeout(() => {
      if (this.sheet === 'seeds' && this.nextEmptyPlot() == null) this.closeSheet();
    }, 900);
  }

  /** Next open, empty plot after `from`, wrapping round; null when the field is full. */
  nextEmptyPlot(from = -1) {
    for (let k = 1; k <= 16; k++) {
      const i = (from + k + 16) % 16;
      if (G.plotUnlocked(this.state.level, i) && !this.state.plots[i]) return i;
    }
    return null;
  }

  setTarget(i) {
    this.plantTarget = i;
    this.scene.setTarget(i);
    this.bubbles.sync();
  }

  go(where) {
    closeAll();
    if (where === 'shop') openShop(this);
    else if (where === 'warehouse') openBarn(this);
    else if (where === 'book') openBook(this);
    else if (where === 'chests') openChests(this);
    else if (where === 'upgrade') openUpgrade(this);
    else if (where === 'friends') this.openFriends();
    else if (where === 'seeds') this.openSeeds();
    else if (where === 'quests') openQuests(this);
    else if (where === 'settings') openSettings(this);
  }

  openFriends() {
    this.popover.close();
    this.sheet = this.sheet === 'friends' ? null : 'friends';
    this.scene.setPlantMode(false);
    sfx.open();
    this.sheets.render();
    this.bubbles.sync();
    this.hud.update();
  }

  queueReveal(item) {
    this.reveals.push(item);
    if (!this.revealing) setTimeout(() => this.nextReveal(), 650);
    this.revealing = true;
  }

  async nextReveal() {
    const item = this.reveals.shift();
    if (!item) {
      this.revealing = false;
      return;
    }
    await showReveal(this, item);
    this.nextReveal();
  }

  // ── Settings ────────────────────────────────────────────────

  setSetting(key, value) {
    this.state.settings[key] = value;
    if (key === 'lang') setLang(value);
    if (key === 'sound') setSound(value);
    if (key === 'music') setMusic(value);
    if (key === 'quality') this.scene.setQuality(value);
    this.hud.build();
    this.refresh();
  }

  resetGame() {
    clearSave();
    this.state = null;
    location.reload();
  }

  hasModal() {
    return anyModal();
  }
}

function guessQuality() {
  const cores = navigator.hardwareConcurrency || 4;
  const mem = navigator.deviceMemory || 4;
  return cores <= 4 || mem <= 3 ? 'low' : 'high';
}

export const lockLevel = (i) => PLOT_UNLOCK[i];

const shortName = (cropId) => cropName(cropId);

export { G, seedName, fmtNum, NPCS };
