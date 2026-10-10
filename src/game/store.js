import { SAVE_KEY } from '../config.js';
import { newGame, hydrate } from './logic.js';

/** Loads the saved farm, or starts a new one. Storage may be blocked; the game still runs. */
export function loadState(now) {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) return { state: hydrate(JSON.parse(raw), now), fresh: false };
  } catch {
    // ignore unreadable saves
  }
  return { state: newGame(now), fresh: true };
}

export function saveState(state) {
  state.lastSeen = Date.now();
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function clearSave() {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    // nothing to clear
  }
}
