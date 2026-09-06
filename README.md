# Porsche 911 RSR — Interactive Assembly

A quiet, full-screen 3D workbench for LEGO Technic 42096. Vietnamese interface. Interaction inspired by [Human Atlas](https://github.com/ashemag/human-atlas).

## Experience

- **Explore:** rotate, zoom, select a piece, isolate an assembly, or inspect it up close.
- **Explode:** assembled car → widely separated assemblies → all 1,586 model elements laid out individually. Each element has a padded cell sized from its transformed geometry. At full expansion the camera faces the layout and drag becomes pan. Scroll or pinch to inspect smaller pieces.
- **Build:** 216 source-derived 3D construction steps, highlighted new parts, illustrative insertion arrows and animation, replay, an interactive preview of required parts, camera follow, step scrubbing and adjustable playback speed.
- Responsive controls, keyboard shortcuts, reduced-motion support and demand-driven rendering.

There is no PDF reader or rasterized instruction-page dependency.

## Run locally

Requires Node.js 22.13+ and npm. The checked-in model assets are ready to use; rebuilding them is optional.

```sh
npm ci
npm run dev
```

Open the local address printed by Next.js. The default scripts use native Next.js so the project can be deployed directly to Vercel. The existing Vinext/Cloudflare workflow is still available through the `*:cloudflare` scripts and `.openai/hosting.json` is preserved.

```sh
npm run typecheck
npm test
npm run build
```

`typecheck` checks the application and UI source. `npm test` validates model integrity, step coverage, LOD buffers, deterministic packing and non-overlapping transformed bounds at five aspect ratios. It also reports a CPU-only instance-update benchmark. `npm run test:starter` is the inherited framework contract suite.

## Deploy to Vercel

Import this repository into Vercel and keep the project root at the repository root. Vercel should detect **Next.js** automatically.

Recommended settings:

- Framework Preset: `Next.js`
- Install Command: `npm ci`
- Build Command: `npm run build`
- Output Directory: leave empty/default
- Node.js: 22.x or newer compatible with the package engine

No runtime API key is required for the 3D viewer. The geometry and model metadata are served from `public/model/` as static assets.

If the Vercel project was previously created with Vite/Other as its framework preset, change the preset to Next.js or create a fresh Vercel project from this repository.

### Cloudflare/Vinext compatibility

The previous hosting path has not been removed:

```sh
npm run dev:cloudflare
npm run build:cloudflare
npm run start:cloudflare
```

## Rendering design

- 190 shared geometry/color batches render 1,586 individually selectable model elements through `InstancedMesh`.
- A Web Worker fetches and decompresses the geometry; no PDF processing happens at runtime.
- Geometry download: approximately 4.4 MB gzip. High detail: 2,521,990 scene triangles; low detail: 1,358,270.
- Low-detail indices are generated offline with meshoptimizer. Mobile starts with these; sustained slow frames lower detail and then pixel ratio.
- The render loop sleeps after camera motion and transitions settle, and pauses when the document is hidden.
- Packing is cached across slider changes. Selection uses instance IDs. The parts preview uses one shared secondary canvas instead of a renderer for every thumbnail.

GPU frame rate has not been measured on physical target devices. These measures reduce rendering cost; they are not a universal 60 FPS guarantee.

## Fidelity

The retained MPD by Philippe Hurbain supplies the real part geometry, final placements and construction sequence. Its 216 generated phases are **not matched one-to-one to the official 503 instruction steps**. Navigation groups are source-derived aids, not a certified mechanical decomposition. The 1,586 rendered elements differ from the retail count of 1,580 pieces. The source lacks the complete stickers.

Insertion paths are explanatory animations inferred from part orientation and position. They have not been validated as collision-free mechanical assembly paths. This application is an interactive model explorer and source-sequence visual guide.

## Source map

- `app/page.tsx`: compact workbench and assembly controls.
- `app/scene.tsx`: instanced rendering, transitions, cameras and selection.
- `app/explosion-layout.ts`: deterministic flattening, assembly offsets and illustrative insertion vectors.
- `public/model-worker.js`: asynchronous model loading.
- `scripts/prepare-model.mjs`: reproducible geometry conversion.
- `scripts/source/porsche.mpd`: retained upstream model with original headers.
- `scripts/validate-assets.mjs`: asset and packing validation.

## Rebuild geometry

Download and extract the [official LDraw library](https://library.ldraw.org/). Then run:

```sh
node scripts/prepare-model.mjs /absolute/path/to/ldraw
npm test
```

See `public/ATTRIBUTION.txt` and the retained LDraw license and credit files for upstream attribution and adaptation details. No Human Atlas application code or anatomy assets are copied. This independent viewer is not affiliated with LEGO or Porsche.
