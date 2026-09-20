# Visual scene and replay contract — 21 September 2026

The seven 3D pages share one scene. Assets are made in Blender; Three.js
places them and animates the computed events. Keep the current render resolution and lighting.

## Space and assets

- Canonical coordinates are metres east (x), north (y), elevation (z). Three.js maps them
  to `(x - 1000, 3*z, 1000 - y)`. The threefold elevation is presentation only.
- Blender assets use metres, Z up, south-facing fronts, and a ground-centred origin.
  glTF exports Y up. Building roots have a unit footprint/height and are scaled to the
  original footprint. Drone scale is illustrative so it remains visible on the map.
- Named roots: `house_small`, `house_gable`, `house_terrace`, `house_apartment`, `kitchen`,
  `tower`, `charging_pad`, `drone_L`, `drone_H`. Drone children include `body`,
  `rotor_0`–`rotor_3`, and `parcel`; the kitchen has a `dispatch` anchor.
- `tools/models/build_assets.py` reproduces the original meshes, `slop-hill.blend` retains
  the source, and `public/models/slop-hill.glb` is the web asset. No external asset service,
  high-resolution textures or prerecorded successful flights are needed.

## Terrain

Both maps use elevation bands and contour lines from the unchanged height field. The
3D cut edge and oblique camera expose the slope. A rocky ridge ribbon follows the
existing blocked crossing belt; its central pass and both end crossings stay open.
The ribbon is a landscape cue, not an extra collision rule. Route text uses place
names; raw graph identifiers remain in exported data.

## Layout

Canonical obstacle footprints are retained. A separate deterministic visual layout adds
22 decorative houses, clear of every legal edge, address, waiting node, corridor and
canonical obstacle. They never enter `src/data` or the collision checker. Street ribbons
follow an explicitly labelled visual subset of street connections at terrain height;
they neither create nor certify a flight connection. Flight routes and optional graph
lines use separate layers. W4 identifies ridge/contour approaches, outbound and return.

W1 crops this same map to its ten-node teaching block. Its camera fits the whole block or
the selected connection and obstacle at either viewport size; a top view exposes the
footprint intersection. Selected connections use a screen-space stroke and ground
projection, because W1 tests building footprints, not roof clearance. Endpoint labels and
the blocked building stay visible when models finish loading or the view changes between
2D and 3D. The procedural fallback supports the same inspection. W1 has no flight replay
or search trace, so those controls are omitted. Canonical addresses and building models
keep their identities across the local crop and the full hill.

## Replay

The clock reads actual movements and task intervals. Ground states are idle/not ready,
loading, turnaround, pad queue and charging; airborne states are outbound, service,
return and recorded hovering. At half-open boundaries the next event wins. Before a
first event and after a last event the drone is stationary. Seeking is a pure function
of scene data and time, including rotor orientation, parcel and energy.

Rotors spin only in airborne states, parcels disappear after completed service, and drone
heading follows the current polyline segment. Ground/pad offsets are visible presentation
positions, while the readout keeps the canonical location and time. Camera follow is
optional and suppressed under reduced motion. The initial scene never auto-plays.

For full tasks, take-off and landing offsets ease over at most three seconds inside the
first/last movement. Docking and undocking offsets ease inside each recorded charge
reservation. These are illustrative transitions, explicitly labelled in the playback panel;
they add no simulation time, energy or occupancy. The parked pose joins every ground phase
continuously. Isolated W9 legs remain at flight height at both ends and invent no landing.
All poses are derived from the requested tick, including backwards seeking.

“First issue”, “Next wait”, selected-order focus and slow playback reveal recorded failures
and delays. They do not infer collision from pixels or confuse search steps with flight time.
Invalid plans remain diagnostic. A failed strategy does not acquire a successful animation.

## Acceptance

Check the layout clearances, asset roots/materials/size, phase and energy boundaries,
deterministic seeking, two viewports, optional mobile 3D, model-load fallback and navigation
cleanup. Target combined GLB size under 1.2 MB; measure renderer calls and geometry. Preserve
all canonical hashes, formal outcomes, protected course content and build hooks. Commit each
completed stage separately, with `pnpm check` before each commit. Publication is separate.

## Desktop teaching view — 21 September 2026

Twenty named customer homes now sit beside the canonical delivery points. Their placement
leaves legal flight edges and existing obstacles clear; a dotted doorstep link explains the
short visual offset. A teal plot distinguishes a customer home from background buildings.
The home number follows the original order address, including when an added order uses that
address. Display aliases replace graph IDs in normal labels; technical details and exported
plans retain the IDs.

Tutorials use `WeeklyExample.astro` and a dedicated controller. Each starts from the published
weekly input, independently of saved Lab settings, and recomputes its advertised change.
Inputs, strategy editors and saved records live in the separate Lab's three sections.
Expanded view keeps the same scene and clock, supports browser fullscreen or a full-window
fallback, traps keyboard focus, and returns with Escape. It does not restart or duplicate a
simulation. Desktop and laptop layouts take priority in this revision.
