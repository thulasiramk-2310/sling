# Combined review — 21 October 2026

Four initial independent workstreams reviewed the active Vite portfolio: visual
composition, temple geometry and rendering cost, interaction/accessibility,
and sculpture verification. The sculpture verifier was added at Ram's request.
All changes were combined in this source tree; no Git commit is claimed for the
supplied checkout, which has no Git metadata.

## Changes from the combined review

- Madurai now has a denser painted facade hierarchy: full figures, smaller
  seated reliefs, thin coloured courses and fewer large arch frames. The small
  reliefs have outward-facing noses and restrained facial detail (262 triangles
  each). All four tower faces retain modeled detail in phone mode.
- A granite forecourt, alternating enclosure bands and instanced stone benches
  connect the gateway to its approach. The bench assembly uses two draws rather
  than eighteen. A bounded neighborhood adds connected original terrace/shop
  rows using shared geometry: 48 buildings on phones, 67 on desktop. It does not
  change the global coastline or the bridge.
- The fill light now comes from the viewing side, improving shadow-side statue
  and temple readability. Madurai has a shallow angled desktop arrival and a
  separately eased portrait framing; roof/auto framing regressions remain intact.
- Loading and Auto Dash contain keyboard focus and make background controls
  inert while open. Closing the game restores focus to its launch control. Play
  is available in the phone header.
- Skill selection and project opening update their detail content without
  replacing the initiating buttons, preserving keyboard focus and Escape return.
- Consent withdrawal uses Plausible's supported exclusion flag. If storage is
  read-only, the clean-page fallback carries an explicit URL opt-out so stale
  acceptance cannot restart tracking. Reacceptance clears that fallback. The
  regression includes the read-only-storage case and duplicate-SDK prevention.
- The sculpture verifier found 54 poet-statue faces opposing their averaged
  normals. Neck relief taper, seam-normal averaging and narrower curled finger
  tubes bring reversed/collapsed counts to zero, retaining the 73,556-triangle
  budget, pose and dimensions. A new whole-mesh regression checks those faces.
- Native phone fallback testing found a 6% decorative pseudo-element extending
  past the hero panel. Its phone bounds now stay within the panel, preserving
  the requested 390px CSS viewport after actual WebGL context loss.

## Evidence and limits

Vitest: 60 tests pass. Oxlint and the production build pass. Native CDP input
checks exercise loading focus, sequential wheel arrival and reading holds at all
six stops, final ascent without Continue clicks, skill focus, ArkaOS source and
Escape focus return, language switching, game menu/running focus, and actual
WebGL context loss. The ArkaOS exhibit is also activated through the real 3D
raycaster with native touch on phone and pointer input on desktop. Check results
are saved in the workspace's `review-madurai/`; visual captures are under
`review-sculpture/`.

The traversal regression uses reduced motion to make stop-state checks
repeatable; it is not proof of normal-motion timing or a hardware FPS benchmark.
The captures use software WebGL. Real-device performance, every game-over state,
and unsupported-device startup have not all been revalidated in this pass.
Analytics tests verify lifecycle control; a configured production dashboard was
not contacted.

The independent visual audit rated the inspected images approximately 5.5–6/10
against a reference around 9/10. It identified repetitive composition, empty
surroundings, simplified surfaces and generic architectural figures. The new
neighborhood addresses one setting gap; it does not establish a rating above9.

The sculpture verifier passed finite/winding checks for the corrected poet,
Madurai reliefs, guardians, Nandi, elephant and sampled rocks. Visual fidelity
remains a separate gate: Nandi is hard to see from the reviewed Thanjavur stop;
Madurai figures are original decorative studies, not exact historical
iconography; the memorial and islands retain simplified forms. No claim of
photorealism or complete visual acceptance is made.

Architectural reference:
[Madurai District temple photographs](https://madurai.nic.in/tourist-place/sri-meenakshi-sundareswarar-temple/).
No photographs or third-party meshes were imported into the world.
Consent behavior follows [Plausible's documented exclusion mechanism](https://plausible.io/docs/excluding-localstorage), with a clean-page fallback when storage cannot be written.

## Final rendered review

Fresh 1440×900 desktop and 390×844 phone captures include Mamallapuram,
Thanjavur approach and stop, Madurai, and Kanyakumari. A fresh 1440×900 studio
capture checks the corrected poet at close range. All three capture modes
recorded zero JavaScript exceptions. The native interaction reports each contain
16 passed checks, zero exceptions and the exact requested viewport widths.

The visual reviewer confirmed that the town rows hide most of the inappropriate
Madurai water horizon, but still sees a repetitive low strip separated from the
road by empty ground. Its current visual judgment remains around 6/10. The
sculpture verifier accepted the visible poet correction and landmark recognition
at Kanyakumari, while retaining the following explicit failures/unverified items:

- Elephant and rathas are not shown at useful scale in the travel captures.
- Nandi remains hidden behind/cropped by the pavilion and colonnade views.
- Thanjavur's repeating dark recesses still read too much like windows.
- Madurai's decorative figures lack the variety of the historical facade.
- Kanyakumari rocks, foam and material separation retain simplified forms.

The next high-value work is authored scroll viewing arcs for elephant/rathas and
Nandi, plus varied connected urban blocks, foreground ground transitions and
stronger material/light separation. More geometry alone will not resolve assets
that the visitor cannot see. The full above-9/10 goal remains unmet and active.

## Sculpture viewing follow-up

A second independent sculpture verifier reviewed the source and rendered
evidence. The camera now makes short scroll-driven visits to the elephant,
five rathas, and Nandi, then returns to the vehicle before the reading stops.
Quintic blends preserve velocity and acceleration at visit boundaries;
an elevated courtyard entry/exit clears the cloister. Portrait screens have
their own wider ratha composition. The rathas now stand adjacent to the Shore
Temple in this authored interpretation rather than beyond the Mamallapuram stop.
The courtyard approach runs at a slower normal-motion pace.

The Nandi pavilion's four interior columns intersected the sculpture. It now
has twelve perimeter columns, with unchanged roof and overall dimensions.
The bull's plinth rests on the platform rather than floating above it.
The thirteen upper vimana tiers use granite courses rather than repeating the
lower-storey dark niche texture. Added modeled tier figures reuse the existing
instance groups: 52 phone / 92 desktop figures, adding approximately 58k / 296k
triangles respectively. This is a geometry cost, not proof of a frame-rate target.

Fresh `*-elephant-visit.png`, `*-rathas-visit.png`, `*-nandi-visit.png`,
`*-mamallapuram-return.png`, and `*-thanjavur-return.png` captures are saved
under `review-sculpture/`, at 1440×900 desktop/high and 390×844 phone/low.
Both capture runs recorded zero JavaScript exceptions and no horizontal overflow.
One earlier software-WebGL renderer crashed during a reload; a fresh isolated
browser completed the replacement captures. Static captures verify composition,
not normal-motion timing or real-device performance.

Vitest now passes 61 tests, including real elephant/ratha geometry projected
at useful screen scale, release of the camera anchor during visits, return at
all six stops, both aspect ratios across the full path, boundary velocity
continuity, and normal-paced camera tracking through hard scroll and reversal.
Oxlint and the production build pass.

The second verifier independently checked four sightlines to the Nandi body/head
and sampled the courtyard approach against the cloister envelope. It found no
blocking intersection in those checks. Fresh phone images make all three
sculpture subjects identifiable. Nandi still overlaps a foreground column and
its dark material loses detail; the elephant and rock shapes remain stylized.
This resolves the earlier lack of useful viewing angles, not the full visual
fidelity requirement. There is no new evidence supporting an above-9 rating.
