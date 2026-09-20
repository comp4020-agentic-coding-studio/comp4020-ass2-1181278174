import { caseByKey, renderControls } from "./cases";
import { renderSearchResults } from "./search-case";
import { restoreState } from "./state";
import { initMaps } from "./map-client";
import { wireExperiment } from "./experiment-client";
import type { Rendered } from "./case";

function wire(root: HTMLElement, signal: AbortSignal) {
  const week = Number(root.dataset.week), def = caseByKey(root.dataset.case ?? "");
  if (!def) return;
  const id = root.dataset.instance!, param = id;
  const url = new URL(location.href);
  const raw = url.searchParams.get(param) ?? (!location.pathname.includes("/lab/") ? url.searchParams.get(`wb-${def.key}`) : null);
  let state = def.initial(week), inputError = "";
  try { state = restoreState(def, week, raw); } catch { inputError = "The link contained invalid settings. The default case is shown."; }
  const controls = root.querySelector<HTMLElement>(".wb-controls")!;
  const view = root.querySelector<HTMLElement>(".wb-view")!;
  const status = root.querySelector<HTMLElement>(".wb-status")!;
  let worker: Worker | undefined, timer: ReturnType<typeof setTimeout> | undefined, revision = 0;
  const cancel = () => { worker?.terminate(); worker = undefined; clearTimeout(timer); root.removeAttribute("aria-busy"); };
  signal.addEventListener("abort", cancel, { once: true });
  const save = (writeUrl = true) => {
    root.dataset.state = JSON.stringify(state);
    const u = new URL(location.href);
    u.searchParams.set(param, JSON.stringify(state));
    if (writeUrl) history.replaceState(history.state, "", u);
    const lab = root.querySelector<HTMLAnchorElement>(".wb-lab a");
    if (lab) { const target = new URL(lab.href); target.searchParams.set(`wb-w${week}`, JSON.stringify(state)); lab.href = target.href; }
  };
  const show = (out: Rendered) => {
    view.innerHTML = out.html;
    status.textContent = out.status;
    root.dataset.resultStatus = out.status;
    initMaps(view, signal);
    root.dispatchEvent(new CustomEvent("workbench:updated"));
  };
  const fail = (message: string) => {
    view.replaceChildren();
    const p = document.createElement("p"); p.className = "wb-error wb-summary"; p.setAttribute("role", "alert");
    p.textContent = `${message} No result is reported. Edit the function or choose a preset.`; view.append(p);
    status.textContent = "not verified · no completed search result";
    root.dataset.resultStatus = status.textContent;
    root.dispatchEvent(new CustomEvent("workbench:updated"));
  };
  const update = (action?: { id: string; value?: string }, focusId?: string) => {
    cancel(); const thisRevision = ++revision;
    try {
      if (action) state = def.apply(state, action);
      controls.innerHTML = renderControls(def, state, week, id);
      save();
      if (def.key === "search" && state.heuristic === "custom" && state.graph === "map") {
        view.innerHTML = '<p class="wb-summary">Running your function…</p>';
        status.textContent = "running · 1 second limit"; root.dataset.resultStatus = "running"; root.setAttribute("aria-busy", "true");
        worker = new Worker(new URL("./search.worker.ts", import.meta.url), { type: "module" });
        worker.onmessage = (event) => { if (thisRevision !== revision || signal.aborted) return; cancel(); event.data?.ok === true ? show(renderSearchResults(state, event.data.values)) : fail(`Function not run: ${typeof event.data?.error === "string" ? event.data.error : "invalid runner response"}`); };
        worker.onerror = () => { cancel(); fail("The function could not be run."); };
        timer = setTimeout(() => { cancel(); fail("Function stopped after the 1 second limit."); }, 1000);
        worker.postMessage(state);
      } else show(def.render(state, week));
    } catch (error) { fail(error instanceof Error ? error.message : "Unable to run this configuration."); }
    if (focusId) {
      const candidates = [...root.querySelectorAll<HTMLElement>("[data-control]")].filter((x) => x.dataset.control === focusId);
      (candidates.find((x) => x instanceof HTMLInputElement && x.checked) ?? candidates[0])?.focus();
    }
  };
  wireExperiment(root, signal);
  if (raw && !inputError) update();
  else { initMaps(view, signal); save(false); if (inputError) status.textContent = inputError; }
  root.addEventListener("click", (event) => {
    const b = (event.target as HTMLElement).closest<HTMLButtonElement>("button[data-control]");
    if (!b) return;
    if (b.dataset.codeFrom) {
      const ta = controls.querySelector<HTMLTextAreaElement>(`textarea[data-code-for="${b.dataset.codeFrom}"]`);
      update({ id: b.dataset.control!, value: ta?.value ?? "" }, b.dataset.control);
    } else update({ id: b.dataset.control!, value: b.dataset.value }, b.dataset.control);
  }, { signal });
  root.addEventListener("change", (event) => {
    const el = (event.target as HTMLElement).closest<HTMLSelectElement | HTMLInputElement>("select[data-control], input[data-control]");
    if (el) update({ id: el.dataset.control!, value: el.value }, el.dataset.control);
  }, { signal });
}
let aborter: AbortController | undefined;
document.addEventListener("astro:page-load", () => {
  aborter?.abort(); aborter = new AbortController();
  document.querySelectorAll<HTMLElement>(".workbench[data-case]").forEach((root) => wire(root, aborter!.signal));
});
document.addEventListener("astro:before-swap", () => aborter?.abort());
