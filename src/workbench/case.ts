// A workbench case: one week's instance. The same module runs at build time
// (the page carries the result before any script) and in the browser (the
// same functions recompute when a control changes). State is plain JSON so
// the page can hand it to the script in a data attribute.

export interface ControlOption {
  value: string;
  label: string;
}

export interface Control {
  id: string;
  label: string;
  kind: "select" | "button" | "radio" | "code" | "text";
  options?: ControlOption[];
  value?: string;
  /** The one control the page leads with. */
  primary?: boolean;
}

export interface Rendered {
  html: string;
  /** One line under the result: what was computed and how big it was. */
  status: string;
}

export interface Caption {
  decision: string;
  breaks: string;
}

export interface CaseDef<S = unknown> {
  key: string;
  weeks: number[];
  caption: (week: number) => Caption;
  initial: (week: number) => S;
  controls: (state: S, week: number) => Control[];
  apply: (state: S, action: { id: string; value?: string }) => S;
  render: (state: S, week: number) => Rendered;
}
