# Porsche 42096 — chassis camera bridge, revision 03

This is my proposed **open-cockpit camera conversion** for the supplied stock model. It is not a mount that fits an otherwise untouched Porsche body. The design retains the two main chassis rails, engine, suspension and wheels, and replaces the obstructing upper-body arrangement with a braced camera support.

## Preparation — remove assemblies before installing the rig

Remove the roof assemblies, both doors and the seat1 assembly. Remove chassis6 and chassis9 (the side-body support subassemblies). Remove the upper-body assemblies introduced in source steps 159–162 and 213. Also remove these individual source instance IDs: 298, 299, 300, 301, 302, 303, 786, 787, 788, 789, 936, 937, 938, 939. The 13L uprights 298/301 are explicitly part of the conversion; do not leave their dependent upper-body structure in place.

The complete list is in [camera-bridge-clearance.json](camera-bridge-clearance.json): **292 original pieces are temporarily removed**. These are MPD source instance IDs and source assembly steps, not LEGO PDF page numbers. The original car remains intact in Explore and its assembly guide. Drive shows the converted configuration. The chassis inspection view additionally hides front/rear exterior groups for visibility.

This amount of disassembly is a deliberate tradeoff: the model's original roof, seat backs and side supports occupy the proposed low camera volume. Do not assemble the rig through them. Save removed subassemblies for reversing the conversion.

## Reference frame and real hardpoints

One Technic hole interval is 8 mm (20 LDraw units). Render scale is uniform: 1 world unit = 40 mm. The installation frame is calculated from the actual transformed holes of the stock model, including its slight authored pitch.

| Anchor | Original instance | Mould | Hole, 1-based |
|---|---:|---:|---:|
| H1 | 338 | 32278, 15L | 6 |
| H2 | 338 | 32278, 15L | 14 |
| H3 | 337 | 32278, 15L | 6 |
| H4 | 337 | 32278, 15L | 14 |

H1/H3 are the rear endpoints in this authored model. The two holes on each rail are 64 mm apart. Each new 9L base rail sits one 8 mm layer outside the existing rail. Four 2780 pins connect the two layers. The base rails cannot pivot freely because each has two separated hardpoints.

## Assembly sequence

1. **Base rails.** Attach the end holes of the two white 40490 9L beams at H1–H4 with four black 2780 pins. Insert before fitting the side trusses, while the outer side is accessible.
2. **Side triangles.** Each triangle uses base holes 2 and 8, a vertical 40490 9L and a diagonal 32525 11L. Hole-centre distances are exactly 48–64–80 mm (6–8–10 intervals). Put the vertical one layer outside the base, the diagonal one layer farther out. At the rear diagonal foot, fill the intermediate layer with 18654 and use a blue 6558 3L pin. At the front foot and apex use black 2780 2L pins. Finish all three joints before loading the triangle.
3. **Bridge.** Insert 15100 connectors into holes 5 and 7 of each vertical, with their integrated pins pointing into the beam and their female bores longitudinal. At each height, overlap two 41239 13L beams at three holes; use two black pins at the ends of the overlap. The left bar is one depth layer behind the right bar. A 18654 spacer plus 6558 pin bridges the extra right-side layer. The two crossbars are 16 mm apart vertically, rather than hanging the cradle from one hinge axis.
4. **Cradle.** Attach each 32525 side upright to both crossbars with two 2780 pins. Add two 32524 7L backrest spacers on the left, each with two pins, to make the left/right back surfaces flush. Four forward-facing 15100 bodies on the lower crossbar form short supporting ledges under the handset; their integrated pins plug into the backrest/bridge. They are not long, unsupported cantilever beams. Add two 15100 adapters per side upright at holes 4 and 9, then 32316 5L side rails in the next vertical layer with 2780 pins. The rail's end hole meets the adapter; it does not pass through the upright.
5. **Contact and retention.** Add four external EVA side pads, 6 mm thick, and two external back pads, 1 mm thick. Seat the handset landscape on the four short ledges and against the padded backrest. Wrap two elastic loops around **both handset and bridge**, avoiding the camera. The loops provide preload toward the backrest and down onto the ledges. The rail joints use friction pins; the pads and strap tension are part of retention, not decoration.

## Phone fit and load path

The supplied Aris GLB envelope in landscape is 156.55 × 76.175 × 10.71 mm. The cradle's outside upright hole centres are 176 mm apart. The inner side-rail faces are 168.8 mm apart; 6 mm pads on each side leave approximately 0.25 mm total nominal width clearance. That is a model dimension, not a claim about a phone with a protective case or manufacturing tolerances. The actual camera is forward-facing; the displayed sight lines are a clearance aid, not a calibrated lens model.

The ledges carry vertical weight into the lower crossbar. The upper crossbar and strap resist handset pitch. Both crossbars transfer load into the vertical legs; the diagonals restrain fore/aft sway. The base rails spread that load between the four chassis pins. Removing the original upper structure changes the vehicle's stiffness, so the assembled conversion needs a physical twist/rattle test as well as a mount-only test.

## Verification and limits

The socket audit checks 42 separate or integrated fasteners: centre alignment, bore direction, full engagement length, duplicate socket use, occupied chassis anchors and a continuous connection graph back to the chassis. All pass on the supplied model. No LEGO mould is stretched or generated procedurally.

The optional offline BVH check uses the full-resolution LDraw geometry. It finds no unexpected surface intersections between the rig and the prepared car, between non-fastener rig bodies, between the phone and rig, or between the phone and prepared car. Intentional friction-pin mating surfaces are excluded. The report records the required removals and actual stock-model interference IDs.

This does **not** certify insertion access for every pin, enclosed-volume containment, structural strength, real-part tolerances, clamp force, shock response or moving suspension/steering clearance. Fit the unladen rig first, test torsion by hand, then install the handset and test at low speed. The design and checks are based on the supplied stock model; an unmodelled motor, hub or cable route is outside this geometry.

## Reproduce the checks

Run `npm test` for socket and drive-motion checks. For the optional offline mesh check, install `three-mesh-bvh@0.9.15` in a temporary directory and set `LEGO_BVH_MODULE` to its `build/index.module.js`, then run `node scripts/validate-rig-clearance.mjs`. This dependency is not used or loaded by the web viewer.

LEGO geometry is reused from the project's LDraw assets; see [part credits](ldraw-part-credits.txt). EVA and elastic straps are separately identified non-LEGO accessories.
