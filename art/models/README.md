# Plant models for Blender

The valley's plants are built in code from a seed (`src/three/plants/`). Any one of them can be taken into Blender,
edited by hand and put back; the rest keep coming from their seeds.

- `export/` (not in git): every placed model as a `.glb`, written by `node dev/export-models.mjs` — each `TREES` and
  `FLOWERS` entry of `src/three/valleyMap.js` as `<kind>-<seed>.glb` (`-2`, `-3`… when the same kind and seed come
  again; `placedModels()` in `src/three/plants/valley.js` lists the keys), at the entry's height, and each of the
  woods' models as `woods-<kind>-<n>.glb`. `node dev/export-models.mjs rock-3 woods-birch-1` writes only those.
- `edited/`: the ones edited by hand, saved from Blender under the same name. `node dev/edited-models.mjs` bakes them
  into `src/three/plants/editedModels.js`, and the game builds those in the generators' place (`plants/edited.js`),
  scaled to the entry's height if that changes, with the generators' own materials (by name: `flat`, `soft`,
  `soft glow 0.3`, `stone …`, and so on; a mesh keeps the material it was exported with).

Each `.glb` is one node per mesh, with positions, normals and a colour at each corner (the plants have no textures),
the rock's moss as the `_MOSS` attribute, and in the node's custom properties the material's name, its shadow flags
and, on the root, the height it was built at. In Blender's glTF export keep Include › Data › Custom Properties on,
and for a rock tick Data › Mesh › Attributes, or its moss is lost. Moving, turning or scaling an object in Blender is
baked into its corners on the way back; a model's foot should stay at the origin, where the game stands it.
