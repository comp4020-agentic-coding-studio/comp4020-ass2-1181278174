import { esc } from "./html";
import type { CaseDef } from "./case.ts";
import { assignCase } from "./assign-case.ts";
import { corridorCase } from "./corridor-case.ts";
import { edgesCase } from "./edges-case.ts";
import { labelsCase } from "./labels-case.ts";
import { levelsCase } from "./levels-case.ts";
import { padsCase } from "./pads-case.ts";
import { priorityCase } from "./priority-case.ts";
import { replayCase } from "./replay-case.ts";
import { searchCase } from "./search-case.ts";
import { timetableCase } from "./timetable-case.ts";

const all: CaseDef<any>[] = [edgesCase, searchCase, labelsCase, timetableCase, assignCase, padsCase, corridorCase, priorityCase, levelsCase, replayCase];

export function caseByKey(key: string): CaseDef<any> | undefined {
  return all.find((c) => c.key === key);
}

export function caseFor(week: number): CaseDef<any> | undefined {
  return all.find((c) => c.weeks.includes(week));
}

export function renderControls(def: CaseDef<any>, state: unknown, week: number, id: string): string {
  return def
    .controls(state, week)
    .map((c) => {
      if (c.kind === "code") {
        return `<details class="wb-code" open><summary>Edit as code</summary><label class="wb-control"><span>${c.label}</span><textarea data-code-for="${c.id}" name="${id}-${c.id}" rows="4" spellcheck="false">${(c.value ?? "").replace(/[&<>]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[ch]!)}</textarea></label> <button type="button" class="wb-control" data-control="${c.id}" data-code-from="${c.id}">Run this function</button></details>`;
      }
      if (c.kind === "text") return `<label class="wb-control"><span>${esc(c.label)}</span><input type="text" data-control="${esc(c.id)}" name="${esc(id)}-${esc(c.id)}" value="${esc(c.value ?? "")}" /></label>`;
      if (c.kind === "radio") {
        const opts = (c.options ?? []).map((o) => `<label class="wb-radio"><input type="radio" name="${id}-${c.id}" data-control="${c.id}" value="${o.value}"${o.value === c.value ? " checked" : ""}> ${o.label}</label>`).join("");
        return `<fieldset class="wb-control wb-radios${c.primary ? " wb-primary-group" : ""}"><legend>${c.label}</legend>${opts}</fieldset>`;
      }
      if (c.kind === "select") {
        const opts = (c.options ?? []).map((o) => `<option value="${o.value}"${o.value === c.value ? " selected" : ""}>${o.label}</option>`).join("");
        return `<label class="wb-control"><span>${c.label}</span> <select data-control="${c.id}" name="${id}-${c.id}">${opts}</select></label>`;
      }
      return `<button type="button" class="wb-control${c.primary ? " wb-primary" : ""}" data-control="${c.id}">${c.label}</button>`;
    })
    .join(" ");
}
