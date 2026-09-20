import { profileSvg, type ProfileRoute } from "./profile";
import map from "../data/map.json";
import type { MapData } from "../data/schema";
import { mapSvg, type MinimapOptions } from "./minimap";

export function initMaps(root: HTMLElement, signal: AbortSignal) {
  for (const el of root.querySelectorAll<HTMLElement>("[data-map-options], [data-profile]")) {
    if (el.dataset.mapWired) continue;
    el.dataset.mapWired = "true";
    const options = el.dataset.mapOptions ? JSON.parse(el.dataset.mapOptions) as MinimapOptions : undefined;
    const profile = el.dataset.profile ? JSON.parse(el.dataset.profile) as ProfileRoute[] : undefined;
    let previous = 0;
    const observer = new ResizeObserver(() => {
      if (!el.isConnected) { observer.disconnect(); return; }
      const width = Math.floor(el.getBoundingClientRect().width);
      if (width < 200 || width === previous) return;
      previous = width; el.innerHTML = profile ? profileSvg(map as MapData, profile, width) : mapSvg(map as MapData, options!, width);
    });
    observer.observe(el); signal.addEventListener("abort", () => observer.disconnect(), { once: true });
  }
}
