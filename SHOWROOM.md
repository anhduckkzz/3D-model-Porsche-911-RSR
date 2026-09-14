# Technic showroom

The landing page presents one live 3D vehicle at a time. Each available car opens the full exploration/flattening viewer and a recursive assembly workbench. The owner-only Porsche controls and camera mount remain under **Xe của tôi**, accessible from both the showroom and viewer.

## Included data

| Set | Vehicle | State |
| --- | --- | --- |
| 42096 | Porsche 911 RSR | Existing geometry and assembly |
| 42056 | Porsche 911 GT3 RS | Geometry and recursive assembly |
| 42083 | Bugatti Chiron | Geometry and recursive assembly |
| 42115 | Lamborghini Sián FKP 37 | Geometry and recursive assembly |
| 42143 | Ferrari Daytona SP3 | Source linked; binary CAD download pending |
| 42172 | McLaren P1, jb70 MOD | Source linked; binary CAD download pending |
| 42156 | Peugeot 9X8 | Source linked; Studio file download pending |

Ferrari Enzo is excluded. Unavailable entries are explicitly marked and cannot open a fabricated or substituted model.

Guidelines cover every rendered atomic element, preparing child assemblies before attaching them. These are the authored CAD hierarchy/reference order, not a verified page-by-page replacement for the official instruction book. Flexible paths are retained as whole elements. Inserts illustrate movement; they are not collision-free mechanical trajectories. CAD element counts may differ from box piece counts because of compound parts, flexible elements and source omissions.

## Sources and regeneration

Per-car provenance is in `public/showroom.json`; the three added OMR files were retrieved from `vdirienzo/ldrawomr` at `99a10d3d5ec094277793eb5919f13163d279cf2e`. Original author and CCAL 2.0 notices remain inside `scripts/source/<set>.mpd.gz`. Their derived geometry and per-part credits are served under `public/models/<set>/`.

```sh
npm ci
npm run prepare:showroom -- /absolute/path/to/ldraw 42056
npm run prepare:showroom -- /absolute/path/to/ldraw 42143 /absolute/path/to/daytona.mpd
npm run test:showroom
npm run typecheck
npm run build
```

For a Studio `.io` source, export an LDraw MPD in Studio first. Supply the complete model and its custom parts. The import command enables a car only after geometry, atomic transforms, final assembly coverage and flatten-layout checks succeed. Asset preparation can require 6 GB Node heap; this is an offline process, not browser memory use.

Rendering retains instancing, a lower-detail index buffer, adaptive pixel density, worker decompression and on-demand frames. Switching cars terminates the old loader and disposes both renderers, instanced buffers and GPU resources. Large subassembly previews are also instanced.
