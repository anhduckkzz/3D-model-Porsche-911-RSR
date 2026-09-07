# Porsche 911 RSR — Interactive Assembly

A quiet, full-screen 3D workbench for LEGO Technic 42096. Vietnamese interface. Interaction inspired by [Human Atlas](https://github.com/ashemag/human-atlas).

## Experience

- **Explore:** rotate, zoom, select a piece, isolate an assembly, or inspect it up close.
- **Explode:** assembled car → widely separated assemblies → all 1,586 model elements laid out individually. Each element has a padded cell sized from its transformed geometry. At full expansion the camera faces the layout and drag becomes pan. Scroll or pinch to inspect smaller pieces.
- **Build:** 36 instance-level assemblies nested up to 3 levels. Follow 1,621 operations: introduce each of the 1,586 model elements once, then mount 35 completed subassemblies into their parents. A dedicated workbench, hierarchy navigator, breadcrumbs, parent context, assembled-unit preview and review/return navigation keep the construction understandable.
- **Drive:** a minimal manual-control console using the protocol supplied in `bluetooth.py`. Connect through the local Python BLE bridge or Web Bluetooth, arm explicitly, hold to drive, release to stop, and steer with calibrated time pulses.
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

`typecheck` checks the application and UI source. `npm test` validates model integrity, leaf and assembly coverage, LOD buffers, deterministic packing, group-cell containment, full-flat non-overlap, average movement speed across stages, command encoding, input ownership and stop priority. Python controller tests run separately with `python -m unittest discover -s controller -v`. It also reports a CPU-only instance-update benchmark. `npm run test:starter` is the inherited framework contract suite.

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
- Group cells are packed from real bounds and each group keeps its own inventory area. A single linear progress clock drives geometry and camera; the phase boundary is weighted by average path length. Packing is cached across slider changes. Selection uses instance IDs. The parts preview uses one shared secondary canvas instead of a renderer for every thumbnail.

GPU frame rate has not been measured on physical target devices. These measures reduce rendering cost; they are not a universal 60 FPS guarantee.

## Fidelity

The retained MPD by Philippe Hurbain supplies the real part geometry, final placements and construction sequence. The original 216 phases remain in the geometry metadata; the new guide restores the MPD hierarchy and expands it into 1,621 explicit part/mount operations. Neither timeline is **matched one-to-one to the official 503 instruction steps**. Every recovered leaf is checked against its rendered part name and transform. Factory-made parts remain atomic; the viewer does not invent assembly instructions inside them. Navigation groups are source-derived aids, not a certified mechanical decomposition. The 1,586 rendered elements differ from the retail count of 1,580 pieces. The source lacks the complete stickers.

Insertion paths are explanatory animations inferred from part orientation and position. They have not been validated as collision-free mechanical assembly paths. This application is an interactive model explorer and source-sequence visual guide.

## Source map

- `app/page.tsx`: compact workbench and assembly controls.
- `app/assembly-guide.ts` and `public/model/assembly.json`: hierarchy and construction state.
- `app/drive-console.tsx`, `app/vehicle-link.ts`, `app/vehicle-protocol.ts`: manual controls and transport.
- `controller/`: local BLE bridge, protocol and controller tests.
- `scripts/prepare-assembly.mjs`: hierarchy extraction with instance/transform verification.
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
npm run prepare:assembly
npm test
```

See `public/ATTRIBUTION.txt` and the retained LDraw license and credit files for upstream attribution and adaptation details. No Human Atlas application code or anatomy assets are copied. This independent viewer is not affiliated with LEGO or Porsche.


## Connect the physical car

The vehicle protocol is derived from the supplied Python script: characteristic `0000ae3b-0000-1000-8000-00805f9b34fb`, frame `AB CD 01 FB LR 00 00 checksum`, signed motor bytes, checksum `(FB + LR) & 255`. Drive magnitude is clamped to 25–100. Steering is bang-bang at ±100, with a 100–500 ms pulse; it is not a proportional steering-angle actuator.

### Python bridge (desktop)

Use Python 3.10+ on the **same computer running the browser**, with a BLE adapter:

```sh
pip install -r controller/requirements.txt
python controller/bridge.py --origin http://localhost:3000
```

For the deployed site, replace the origin with its exact `https://…vercel.app` origin, without a trailing slash. In **Điều khiển → Kết nối xe → Python local**, enter `ws://127.0.0.1:8765` and the temporary token printed by Python. The bridge discovers a QY / CB26 hub when connecting. If multiple hubs exist, pass `--address YOUR_HUB_ADDRESS` explicitly. Connecting only sends a stop frame; click **Bật điều khiển** before moving.

The bridge binds only to loopback, accepts the specified web origin and a per-run token, and allows one controlling client. A 350 ms command lease stops/disarms on lost heartbeat; steering pulse expiry is enforced independently of browser timers. Invalid and late commands stop the controller. Browser release, lost pointer capture, blur, page hiding, mode exit and disconnect also request a stop. Command acknowledgments are not measured speed or position telemetry.

A phone's `127.0.0.1` is the phone itself, not the computer. Use direct Bluetooth on a supported phone/browser instead. If an HTTPS page is blocked from connecting to the local WebSocket by browser policy, run the UI locally or use direct Bluetooth; do not disable browser security settings.

### Direct Web Bluetooth

Use a compatible browser on HTTPS or localhost. Select **Bluetooth trình duyệt**. The supplied script specifies a characteristic UUID but not its enclosing service UUID, so the app does not guess it. Obtain the actual value without moving the motors:

```sh
python controller/bridge.py --discover
```

Paste the printed Service UUID and choose the correct hub in the browser's device picker. Desktop Chrome/Edge and compatible Android Chrome installations can expose Web Bluetooth; support and permissions depend on browser and device. [Web Bluetooth access requirements](https://developer.mozilla.org/en-US/docs/Web/API/Web_Bluetooth_API).

Direct Bluetooth uses serialized writes and sends stop ahead of pending movement commands. It cannot provide a Python-side watchdog when the entire browser/OS is suspended. Neither transport can guarantee stopping a hub after the radio link is physically lost unless the hub firmware itself implements a watchdog. The bridge is preferred where available.

### Validation boundary

Protocol, controller timeout/pulse behavior, stop priority, hierarchy integrity and packing are tested with deterministic data and fake hardware. No physical hub connection or driving test was performed during this change. No telemetry, autonomy, collision avoidance or autonomous driving capability is claimed.
