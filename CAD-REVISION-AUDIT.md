# CAD revision audit

Reviewed on 2026-09-14. Repository baseline: fd9a8c3991dc228a199de0896ca21e2015db0560.

A successful MPD import proves neither that the source is the latest correction nor that its instruction order matches the official LEGO manual. Keep these checks separate.

## Published models

| Set | Evidence and comparison | Conclusion |
| --- | --- | --- |
| 42096 Porsche 911 RSR | The current author download was byte-identical to scripts/source/porsche.mpd. The 2019 thread identifies missing stickers. No later RSR correction was found in the reviewed thread. | Keep existing source. |
| 42056 Porsche 911 GT3 RS | The current OMR download was identical to the stored MPD after line-ending normalization. The thread nevertheless records later Brickshelf corrections; the author's linked download returned 404 during this review. | Current OMR copy confirmed; incorporation of all later author fixes remains unverified. Do not label this as the final corrected revision. |
| 42083 Bugatti Chiron | All FILE and type-1 reference records matched the current Philo download exactly. The thread explicitly confirms a windshield-bar correction on 2018-09-17. Header/whitespace differences exist. | Assembly references match the current author source. This is Philo's blue model, not Kevin Hendirckx's earlier black model. |
| 42115 Lamborghini Sian FKP 37 | Stored source includes the 2021-10-23 tire-color correction in HISTORY. Compared with the current author download, reference differences were two OMR-prefixed printed-part names and one matrix value rounded from 0.86592379 to 0.865924. | Tire correction confirmed. Sources are not byte-identical; preserve the distinction between OMR normalization and a new mechanical revision. |

### GT3 RS correction chain

Read the replies, not just the first download link:

- Initial post edit: paddle position and two rear flex axles corrected.
- 2016-08-30: engine-cover position corrected.
- 2019-01-03: upside-down 64782 in bodyframe corrected in OMR and Brickshelf.
- 2019-01-24: left-seat/bodyframe collision correction uploaded to Brickshelf.
- 2019-02-07: further errors reported by Marko corrected on Brickshelf.

The OMR copy matching the repository does **not** prove the January 24 and February 7 fixes were incorporated. Reacquire that author revision and compare before marking this issue resolved.

## Additional models processed locally, not published

These assets passed the existing geometry/assembly coverage and flatten-layout checks before the execution environment disconnected. They are **not present in the published commit above**.

| Set | Source selected | Local processing result | Revision status |
| --- | --- | --- | --- |
| 42143 Daytona SP3 | jb70's stock OMR MPD, linked in Technic 2022 post 18 | 3,789 rendered atomic elements; 271 assemblies; 4,059 operations | Current linked download retrieved. Thread states the unique serial-number printed tile is missing. Nearby floating-model replies concern 42126, not Daytona. |
| 42172 McLaren P1 | jb70 Pimp up my McLaren MOD | 4,017 elements; 640 assemblies; 4,656 operations | Download contains v1.1 labels. Publisher search results identify v1.1 dated 2025-12-18. Full Eurobricks reply review is incomplete because the site returned 403. Do not claim all replies were checked. |
| 42156 Peugeot 9X8 | Vito Tarantini's Studio archive linked in the dedicated thread | 1,773 elements; 5 assemblies; 1,777 operations | Dedicated thread contains one post and no correction replies. The current linked archive was retrieved. Lack of replies is not proof of mechanical correctness. |

Peugeot conversion used the archive's standard model.ldr stream, embedded CustomParts, and the archive's own 62821b geometry where the LDraw library lacked that part. No replacement geometry was invented. The 62821b render stream uses inherited color -1, converted to LDraw 16 for faces and 24 for edges. This conversion and its source must be preserved when publishing.

The Peugeot CAD hierarchy is shallow. Showing every rendered part does not establish a fully authored nested assembly manual. Its geometry buffer was approximately 73.97 MB unpacked, so device performance needs particular attention.

## Source links

- [Technic 2016 / GT3 RS discussion](https://forums.ldraw.org/thread-18214.html)
- [GT3 RS late correction, 2019-02-07](https://forums.ldraw.org/thread-18214-post-30939.html#pid30939)
- [Current GT3 RS OMR listing](https://library.ldraw.org/omr/sets/303)
- [Current GT3 RS OMR MPD](https://library.ldraw.org/library/omr/42056-1.mpd)
- [Author GT3 RS MPD, returned 404 during audit](https://www.brickshelf.com/gallery/Philo/SetModels/Set42056/42056_-_porsche_911_gt3_rs.mpd)
- [Technic 2018 / Chiron discussion](https://forums.ldraw.org/thread-22643.html)
- [Philo Chiron MPD](https://www.brickshelf.com/gallery/Philo/SetModels/Set42083/42083_-_bugatti_chiron.mpd)
- [Technic 2019 / RSR discussion](https://forums.ldraw.org/thread-23139.html)
- [Philo RSR MPD](https://www.brickshelf.com/gallery/Philo/SetModels/Set42096/42096_-_porsche_911_rsr.mpd)
- [Technic 2020 / Sian discussion](https://forums.ldraw.org/thread-23815.html)
- [jb70 Sian OMR MPD](https://bricksafe.com/files/jb70/42115-pimp-up-my-lamborghini/omr/42115%20-%20Lamborghini%20Sian%20FKP%2037.mpd)
- [Technic 2022 / Daytona discussion](https://forums.ldraw.org/thread-25913.html)
- [jb70 Daytona OMR MPD](https://bricksafe.com/files/jb70/42143-pimp-up-my-ferrari/omr/42143%20-%20Ferrari%20Daytona%20SP3.mpd)
- [P1 publisher release notes](https://rebrickable.com/mocs/MOC-198397/jb70/42172-pimp-up-my-mclaren/)
- [P1 discussion, v1.1 announcement indexed on page 7](https://www.eurobricks.com/forum/forums/topic/199596-42172-mclaren-p1-mods-and-improvements/page/7/)
- [jb70 current P1 MPD](https://bricksafe.com/files/jb70/42172-pimp-up-my-mclaren/42172%20-%20Pimp%20up%20my%20McLaren.mpd)
- [jb70 P1 historical versions](https://bricksafe.com/pages/jb70/42172-pimp-up-my-mclaren/history)
- [Peugeot dedicated thread](https://forums.ldraw.org/thread-28369.html)
- [Vito Peugeot Studio archive](https://drive.google.com/file/d/1tINweVh9KIOz8_FKhpO-6XzbxDldZVr2/view?usp=sharing)
- [Technic 2024, including a separate stock P1 author/version](https://forums.ldraw.org/thread-27891.html)

## Publication and verification gates

1. Recover the generated assets and conversion script; compare against the current main before publishing.
2. Record original source checksums, selected variant, revision evidence and unresolved corrections.
3. Resolve or explicitly retain the GT3 RS late-fix uncertainty. Never infer latest from download success alone.
4. Preserve author and license notices; do not assign a CC license to an archive that does not declare one.
5. Run source-to-render transform alignment, complete assembly coverage, flatten checks, typecheck and production build.
6. Verify the new model files are in the actual commit and deployment before announcing availability.

The existing four-car deployment completed successfully. Browser UI inspection confirmed collection selection and the owner menu, but GPU rendering could not be tested in the cloud browser: its WebGL backend reports GL_VENDOR/GL_RENDERER Disabled. No browser FPS guarantee or visual geometry sign-off is claimed.
