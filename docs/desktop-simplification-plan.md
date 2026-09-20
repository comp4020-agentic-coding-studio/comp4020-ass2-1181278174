# Desktop teaching interface — 21 September 2026

The owner requested a simpler desktop experience and a clear order-to-home map.

1. Give delivery addresses named homes and visible doorstep markers. Use readable place
   names in the interface, with canonical node IDs available in technical details. Clicking
   an order selects its home and computed route. Keep all simulation coordinates and rules.
2. Replace tutorial workspaces with a dedicated weekly example: one question, a starting
   case, one meaningful change, the actual result and a small set of relevant evidence.
   Editors, scenario management and archives belong in the separate Lab.
3. Simplify the Lab's navigation and controls, and add a desktop full-window presentation
   mode for the same live example, with a large map, order selection and compact playback.

Each part is committed separately after `pnpm check`. Verify desktop layout and the main
interactions on the built local site; retain usable mobile fallbacks without a separate
mobile redesign. Publication and process-account checks are outside this task.
