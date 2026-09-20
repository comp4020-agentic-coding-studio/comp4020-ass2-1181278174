// Small HTML helpers shared by the server render and the client re-render.
// Every workbench view is a string of HTML, so the page carries the result
// before any script runs and the browser replaces it with the same markup.

export const esc = (s: unknown): string =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export interface Column {
  key: string;
  label: string;
  align?: "right";
}

export function table(columns: Column[], rows: Record<string, unknown>[], caption?: string, rowClass?: (row: Record<string, unknown>) => string): string {
  const head = columns.map((c) => `<th scope="col"${c.align ? ' class="num"' : ""}>${esc(c.label)}</th>`).join("");
  const body = rows
    .map((r) => {
      const cls = rowClass?.(r);
      const cells = columns.map((c) => `<td${c.align ? ' class="num"' : ""}>${esc(r[c.key] ?? "")}</td>`).join("");
      return `<tr${cls ? ` class="${esc(cls)}"` : ""}>${cells}</tr>`;
    })
    .join("");
  return `<div class="wb-table"><table>${caption ? `<caption>${esc(caption)}</caption>` : ""}<thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
}

export function fmtTicks(t: number): string {
  const m = Math.floor(t / 60), s = t % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Ticks after 18:00 as a clock time. */
export function clock(t: number): string {
  const total = 18 * 3600 + t;
  const h = Math.floor(total / 3600) % 24, m = Math.floor((total % 3600) / 60), s = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}${s ? ":" + String(s).padStart(2, "0") : ""}`;
}

export function kJ(j: number): string {
  return `${(j / 1000).toFixed(1)} kJ`;
}
