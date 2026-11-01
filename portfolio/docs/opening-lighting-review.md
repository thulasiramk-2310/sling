# Opening light and shadow coverage

The bridge now owns the directional shadow target during the coastal flight.
Previously, targeting the parked auto left approximately 34m of the bridge's
74m span outside the shadow camera. The new anchor covers its bounds, then
hands control back smoothly before the character introduction. A geometry test
projects the bridge bounds through the actual opening light direction and
shadow-camera extent; the existing character shadow focus is retained.

The Chennai dawn uses a cooler sky, fog and reflected ambient light against
the warm sun. Its profile follows road progress, so the parked greeting,
flight and introduction share one clock. It fades completely by road .24.
A fixture captured before this change verifies exact preservation of fifteen
later lighting samples, including inland noon, sunset, night and final dawn.
Sun elevation, bearing and direct-light intensity remain unchanged.

Viewing-side fill lifts smoothly as the introduction figure becomes the focus.
The independent review accepts the improved separation of masonry and distant
shore from the warm horizon. The desktop figure is discernible but still
underlit; it remains small and dark on phones. The phone vault underside is
nearly a silhouette, and the sparse arrival ground still weakens the sequence.
This is a bounded improvement, not a claim of visual completion or a 9/10 score.

Validation: 139 tests across 30 files, oxlint and production build pass.
Eight matched WebGL views per viewport, plus both loaders, report no browser
errors or layout overflow. Final introduction captures are dated November 1,
2026 at 18:27:48 (desktop) and 18:28:00 (phone), after the final source change
at 18:26:23. Reports are stored as `verification/*-opening-lighting.json`.
Software WebGL captures do not establish hardware frame rate or real-time
smoothness. Broad-route visual reports remain historical.

The current build also passes 42 native interaction checks across desktop and
phone: forward/reverse reading stops, seven exhibit raycasts, project details,
keyboard language/audio, game focus handling and actual WebGL context loss.
These checks use reduced motion on software WebGL.
