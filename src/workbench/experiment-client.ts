interface Snapshot { state: unknown; summary: string; status: string; result: string; time: string }
interface Notes { prediction: string; explanation: string; baseline?: Snapshot }
export function wireExperiment(root: HTMLElement, signal: AbortSignal) {
  const form = root.querySelector<HTMLElement>("[data-experiment]"); if (!form) return;
  const week = Number(form.dataset.experiment), key = `slop3969-experiment-v1-w${week}`;
  const status = form.querySelector<HTMLElement>("[data-experiment-status]")!;
  let notes: Notes = { prediction: "", explanation: "" };
  try { const saved = JSON.parse(localStorage.getItem(key) ?? "null"); if (saved && typeof saved === "object") notes = { ...notes, ...saved }; } catch { /* storage is optional */ }
  const snapshot = (): Snapshot => ({ state: JSON.parse(root.dataset.state!), summary: [...root.querySelectorAll(".wb-view .wb-summary")].map((e) => e.textContent?.trim()).join(" ").slice(0,2500), status: root.dataset.resultStatus ?? root.querySelector(".wb-status")!.textContent!, result: root.querySelector<HTMLElement>(".wb-view")!.innerText, time: new Date().toISOString() });
  const show = () => {
    form.querySelector<HTMLElement>("[data-baseline]")!.textContent = notes.baseline?.summary ?? "No baseline saved yet.";
    form.querySelector<HTMLElement>("[data-current]")!.textContent = snapshot().summary;
  };
  const save = () => { try { localStorage.setItem(key, JSON.stringify(notes)); status.textContent = "Saved in this browser. Export a copy to keep with your work."; } catch { status.textContent = "Browser storage is unavailable. Export your record before leaving."; } };
  for (const input of form.querySelectorAll<HTMLTextAreaElement>("[data-note]")) {
    const field = input.dataset.note as "prediction" | "explanation"; input.value = typeof notes[field] === "string" ? notes[field] : "";
    input.addEventListener("input", () => { notes[field] = input.value; save(); }, { signal });
  }
  form.addEventListener("toggle", show, { signal }); root.addEventListener("workbench:updated", show, { signal });
  form.addEventListener("click", (event) => {
    const action = (event.target as HTMLElement).closest<HTMLElement>("[data-experiment-action]")?.dataset.experimentAction; if (!action) return;
    if (action === "baseline") {
      if (root.dataset.resultStatus === "running") { status.textContent = "Wait for the current run to finish before saving a baseline."; return; }
      notes.baseline = snapshot(); save(); show();
    } else if (action === "link") {
      const field = form.querySelector<HTMLInputElement>("[data-experiment-link]")!;
      field.closest<HTMLElement>("label")!.hidden = false;
      field.value = location.href; field.focus(); field.select();
      status.textContent = "Copy this link to reproduce the settings. Your private notes are only in the exported record.";
    } else if (action === "export") {
      if (root.dataset.resultStatus === "running") { status.textContent = "Wait for the current run to finish before exporting."; return; }
      const data = { format: "slop3969-experiment", version: 1, week, case: root.dataset.case, url: location.href, ...notes, current: snapshot() };
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
      const a = document.createElement("a"); a.href = url; a.download = `slop3969-week-${week}-experiment.json`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      status.textContent = "Experiment record exported. This is a local record, not an assignment submission.";
    }
  }, { signal });
}
