export const HOVER_RADIUS = 55;
export const HOVER_DELAY = 2000;

/** Closing a week suppresses it until the drone leaves that stop. */
export function createHoverEntry() {
  let candidate: number | undefined, blocked: number | undefined, started = 0;
  return {
    update(week: number | undefined, hovering: boolean, now: number): { remaining: number; open?: number } {
      if (week !== blocked) blocked = undefined;
      if (!hovering || !week || week === blocked) {
        candidate = undefined;
        return { remaining: 0 };
      }
      if (candidate !== week) { candidate = week; started = now; }
      const remaining = Math.max(0, HOVER_DELAY - (now - started));
      if (remaining) return { remaining };
      candidate = undefined; blocked = week;
      return { remaining: 0, open: week };
    },
    cancel() { candidate = undefined; },
    dismiss(week: number) { candidate = undefined; blocked = week; },
    reset() { candidate = undefined; blocked = undefined; },
  };
}
