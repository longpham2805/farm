const pos = (p, i) => p.evaluate((i) => {
  const r = window.farm.scene.canvas.getBoundingClientRect();
  const s = window.farm.scene.screenPos(i, 0.1);
  return { x: s.x + r.left, y: s.y + r.top };
}, i);
const travel = (p, ms) => p.evaluate((ms) => {
  const f = window.farm;
  f._offset = (f._offset || 0) + ms;
  f.now = () => Date.now() + f._offset;
  f.tick();
}, ms);

module.exports = {
  async intro(p, shot) {
    await shot('welcome');
    await p.fill('#farmer-name', 'Tí');
    await p.click('.avatars button:nth-child(6)');
    await p.click('text=Bắt đầu chơi');
    await p.waitForTimeout(700);
    await shot('seedbar');
    const bag = (n) => p.locator('.sheet .bag').nth(n);
    await bag(1).click();
    await p.waitForTimeout(250);
    await bag(1).click();
    await p.waitForTimeout(600);
    await shot('planted-two');
    for (let k = 0; k < 4; k++) { await bag(0).click({ timeout: 2000 }).catch(() => {}); await p.waitForTimeout(200); }
    await p.waitForTimeout(400);
    await shot('planted-all');
    // Jump to 60% of the rice's growth: past its thirsty point, not yet ripe.
    await p.evaluate(() => {
      const f = window.farm;
      const rice = f.state.plots.find((pl) => pl && pl.crop === 'rice');
      f._offset = rice.plantedAt + rice.growMs * 0.6 - Date.now();
      f.now = () => Date.now() + f._offset;
      f.tick();
    });
    await p.waitForTimeout(900);
    await shot('thirsty');
    await p.click('.pill-act:not(.harvest)');
    await p.waitForTimeout(1200);
    await travel(p, 11000);
    await p.waitForTimeout(1200);
    await shot('ripe');
    await p.click('.pill-act.harvest');
    await p.waitForTimeout(1800);
    await shot('reveal');
  },
  async menus(p, shot) {
    await p.evaluate(() => {
      const f = window.farm;
      const s = f.state;
      s.seenIntro = true;
      s.coins = 123456; s.level = 12; s.xp = 9000; s.energy = 64;
      s.chests = { green: 6, blue: 3, purple: 1, red: 1 };
      s.seeds = { rice: 12, sunflower: 30, pack2: 3, papaya: 4, corn: 2 };
      s.items = { 'rice:0': 30, 'rice:1': 4, 'sunflower:0': 22, 'sunflower:1': 3, 'sunflower:2': 2, 'papaya:2': 1, 'lettuce:0': 5, 'corn:0': 14, 'tomato:2': 3 };
      for (const k of Object.keys(s.items)) s.discovered[k] = Date.now();
      s.discovered['rice:2'] = Date.now();
      s.stats = { planted: 50, watered: 20, harvested: 300, sold: 50, bought: 20, mutations: 4, visits: 2, friendWater: 5 };
      s.quests.chapter = 1;
      document.querySelectorAll('.overlay').forEach((o) => o.remove());
      f.refresh();
    });
    const open = async (fn, label) => {
      await p.evaluate(fn);
      await p.waitForTimeout(900);
      await shot(label);
      await p.keyboard.press('Escape');
      await p.waitForTimeout(200);
    };
    await open(() => window.farm.go('shop'), 'shop');
    await open(() => window.farm.go('warehouse'), 'barn');
    await open(() => window.farm.go('book'), 'book');
    await open(() => window.farm.go('quests'), 'quests');
    await open(() => window.farm.go('chests'), 'chests');
    await p.evaluate(() => window.farm.go('chests'));
    await p.waitForTimeout(500);
    await p.click('.chest-info .btn');
    await p.waitForTimeout(700);
    await shot('chests-opened');
    await p.keyboard.press('Escape');
    await open(() => window.farm.go('upgrade'), 'upgrade');
    await open(() => window.farm.go('settings'), 'settings');
  },
  async friend(p, shot) {
    await p.evaluate(() => { window.farm.state.seenIntro = true; document.querySelectorAll('.overlay').forEach((o) => o.remove()); window.farm.openFriends(); });
    await p.waitForTimeout(500);
    await shot('friends-sheet');
    await p.evaluate(() => window.farm.visit('ech'));
    await p.waitForTimeout(1500);
    await shot('visit');
    const steal = await p.$('.bubble.steal');
    if (steal) { await steal.click({ force: true }); await p.waitForTimeout(900); await shot('stolen'); }
    await p.evaluate(() => window.farm.goHome());
    await p.waitForTimeout(800);
    await shot('home');
  },
  async mobile(p, shot) {
    await shot('welcome');
    await p.click('text=Bắt đầu chơi');
    await p.waitForTimeout(700);
    await shot('seedbar');
    await p.evaluate(() => {
      const f = window.farm;
      f.closeSheet();
      const s = f.state;
      s.level = 6; s.coins = 4321;
      const crops = ['sunflower', 'papaya', 'corn', 'tomato', 'rice', 'carrot', 'pepper', 'banana', 'potato', 'garlic', 'cucumber', 'mushroom'];
      let k = 0;
      s.plots = s.plots.map((_, i) => (f.describe(i) && f.describe(i).locked) ? null : ({ crop: crops[k++ % crops.length], pack: null, plantedAt: Date.now() - (i % 3 === 0 ? 1e9 : 3000), growMs: i % 3 === 0 ? 1000 : 60000, waters: 0, variant: i % 3 === 0 ? (i % 2) : null }));
      f.syncPlots(false);
      f.refresh();
    });
    await p.waitForTimeout(1400);
    await shot('farm');
    await p.evaluate(() => window.farm.go('shop'));
    await p.waitForTimeout(900);
    await shot('shop');
    await p.keyboard.press('Escape');
    await p.evaluate(() => window.farm.go('book'));
    await p.waitForTimeout(900);
    await shot('book');
    await p.keyboard.press('Escape');
    await p.evaluate(() => window.farm.openFriends());
    await p.waitForTimeout(500);
    await shot('friends');
  },
  async mutants(p, shot) {
    await p.evaluate(() => {
      const f = window.farm;
      const s = f.state;
      s.seenIntro = true; s.level = 12;
      document.querySelectorAll('.overlay').forEach((o) => o.remove());
      const crops = ['sunflower', 'papaya', 'corn', 'mangosteen', 'grape', 'orange', 'pumpkin', 'strawberry', 'tomato', 'ginger', 'lettuce', 'blueberry', 'dragonFruit', 'apple', 'broccoli', 'durian'];
      s.plots = crops.map((c, i) => ({ crop: c, pack: null, plantedAt: Date.now() - 1e9, growMs: 1000, waters: 2, variant: i % 4 === 0 ? 0 : (i % 3) + 1 }));
      f.syncPlots(false);
      f.refresh();
    });
    await p.waitForTimeout(1500);
    await shot('mutants');
    await p.evaluate(() => { window.farm.state.plots[9].plantedAt = Date.now(); window.farm.state.plots[9].growMs = 3600000; window.farm.state.plots[9].variant = null; window.farm.syncPlots(); });
    await p.waitForTimeout(600);
    await p.evaluate(() => window.farm.onPlot(9));
    await p.waitForTimeout(500);
    await shot('popover');
    await p.evaluate(() => { window.farm.popover.close(); window.farm.scene.setZoom(1.8); window.farm.scene.panBy(-120, 60); });
    await p.waitForTimeout(500);
    await shot('zoomed');
  },
};
module.exports.english = async (p, shot) => {
  await p.evaluate(() => {
    const f = window.farm;
    f.state.seenIntro = true;
    document.querySelectorAll('.overlay').forEach((o) => o.remove());
    f.setSetting('lang', 'en');
    const s = f.state;
    s.level = 5; s.coins = 2500; s.seeds = { rice: 4, carrot: 6, pack1: 2 };
    s.plots[5] = { crop: 'sunflower', pack: null, plantedAt: Date.now() - 1e9, growMs: 1000, waters: 2, variant: 2 };
    s.plots[6] = { crop: 'tomato', pack: null, plantedAt: Date.now() - 20000, growMs: 60000, waters: 0, variant: null };
    s.plots[9] = { crop: 'carrot', pack: 'pack1', plantedAt: Date.now() - 2000, growMs: 60000, waters: 0, variant: null };
    f.syncPlots(false);
    f.refresh();
    f.openSeeds();
  });
  await p.waitForTimeout(1200);
  await shot('farm');
  await p.evaluate(() => { window.farm.closeSheet(); window.farm.go('upgrade'); });
  await p.waitForTimeout(800);
  await shot('upgrade');
};
