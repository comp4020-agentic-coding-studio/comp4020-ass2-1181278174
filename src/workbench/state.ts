import type { CaseDef } from "./case";

/** URL data is configuration, never executable rendering instructions. */
export function restoreState(def: CaseDef<any>, week: number, raw: string | null) {
  const initial = def.initial(week);
  if (!raw || raw.length > 16000) return initial;
  const value = JSON.parse(raw);
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Expected an experiment configuration");
  const state = { ...initial };
  for (const [key, fallback] of Object.entries(initial)) {
    if (key in value && typeof value[key] === typeof fallback) state[key] = value[key];
  }
  if (def.key === "search") {
    if (!["map", "four"].includes(state.graph)) throw new Error("Unknown search graph");
    if (!["zero", "example", "straight", "composed", "custom"].includes(state.heuristic)) throw new Error("Unknown heuristic");
    if (!Number.isInteger(state.shown) || state.shown < -1 || state.shown > 10000) throw new Error("Invalid expansion step");
    if (value.compose) {
      if (!["2d", "3d"].includes(value.compose.dist) || !["0.5", "1", "2"].includes(value.compose.factor)) throw new Error("Invalid heuristic settings");
      state.compose = { dist: value.compose.dist, factor: value.compose.factor };
    }
    if (typeof value.custom === "string" && value.custom.length <= 10000) state.custom = value.custom;
  }
  for (const control of def.controls(state, week)) {
    if (control.options && control.value !== undefined && !control.options.some((o) => o.value === control.value)) throw new Error(`Invalid ${control.label}`);
  }
  return state;
}
