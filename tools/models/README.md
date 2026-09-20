# Slop Hill models

These original, untextured meshes were made for this course with Blender 5.2.2 LTS.
No downloaded assets, external textures or baked flight animations are used.

Open Blender with this repository as the working directory and run `build_assets.py`
in its Python console, or use Blender MCP to execute the file. Set `PROJECT_ROOT`
to the repository's absolute path if the working directory differs. The script
owns only the `SlopAssets` scene and preserves other scenes. It writes a source
copy to `slop-hill.blend` and exports the active asset scene to
`public/models/slop-hill.glb`, with a manifest alongside it.

Building roots have a one-unit footprint and height. The web scene resets the
preview placement and scales instances to their intended dimensions. Blender
Z-up is exported to glTF Y-up. Drone size is illustrative; `body`, `parcel` and
`rotor_0` through `rotor_3` are stable extras anchors, independent of Blender's
unique object names. Flight, rotor and parcel states come from the computed
experiment timeline in the browser. See `docs/visual-model-contract.md`.

The GLB is under 40 KB; its source and generator are retained for editing.
