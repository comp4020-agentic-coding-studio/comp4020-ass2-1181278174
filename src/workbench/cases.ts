import type { CaseDef } from "./case.ts";
import { labelsCase } from "./labels-case.ts";
import { searchCase } from "./search-case.ts";

const all: CaseDef<any>[] = [searchCase, labelsCase];

export function caseFor(week: number): CaseDef<any> | undefined {
  return all.find((c) => c.weeks.includes(week));
}

export function renderControls(def: CaseDef<any>, state: unknown, week: number, id: string): string {
  return def
    .controls(state, week)
    .map((c) => {
      if (c.kind === "select") {
        const opts = (c.options ?? []).map((o) => `<option value="${o.value}"${o.value === c.value ? " selected" : ""}>${o.label}</option>`).join("");
        return `<label class="wb-control"><span>${c.label}</span> <select data-control="${c.id}" name="${id}-${c.id}">${opts}</select></label>`;
      }
      return `<button type="button" class="wb-control${c.primary ? " wb-primary" : ""}" data-control="${c.id}">${c.label}</button>`;
    })
    .join(" ");
}
