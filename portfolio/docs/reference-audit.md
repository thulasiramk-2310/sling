# Reference comparison and current implementation · 2026-10-20

## Review and remaining gap

Reviewed the supplied 124-second `sebastien-lempens.mp4` through sequential
frame sheets spanning the whole recording, plus full-size skill and project
frames. Compared those with actual local desktop and phone-width WebGL captures.
This is a visual frame review, not a claim to have interactively tested every
feature of the live reference. No reference assets or code were copied.

Subjective baseline visual assessment: reference **9/10**, previous local build
**3/10**. The current changes improve route, interaction and vehicle detail;
they do not establish reference-quality environment or sculpture craftsmanship.

| Aspect | Reference | Current changes / remaining work |
| --- | --- | --- |
| Spatial design | Enclosed streets, squares, passages and turns | Substantial left/right bends and varied terrace / gable / shop geometry; open landmark areas still need composition work |
| Rhythm | Distinct introduction, ride, skills, gallery and contact beats | Reading stretches park the auto in scroll space; scrolling onward resumes travel |
| Skills | Clear accumulated labels | Larger backed signs, slower ride, name / usage readout and selectable 12-skill index |
| Projects | Individually identifiable exhibits | ArkaOS is featured with real source and website links; remaining exhibits need richer presentation |
| Vehicle | Finished rider / scooter assembly | Crowned cloth roof, rear-window aperture, glazing, grille, lamp housings, bumper and fender trim; procedural model still needs refinement |
| Asset finish | Consistent architecture, character and lighting | Landmark figures, repeated architectural details, open ground and materials remain below target |

## Scroll is the primary control

Each destination spans a reading band in page space with constant camera / road
progress. Arrival cancels the previous wheel destination and briefly absorbs
its momentum. Scrolling through the band keeps the auto parked; scrolling past
it automatically resumes the trip. **No Continue click is required.** Small
Skip ahead buttons and chapter navigation are optional shortcuts. Backward
scrolling can revisit the reading bands.

Closing a project or content dialog restores scrolling. A line indicates reading
progress. Start resets restored page scroll so a reload does not begin a drive
from an old page position. Reduced motion retains the same reading-band model
while removing camera drift. The route is an authored interpretation, not an
accurate geographical road map.

The normal skill drive takes over 20 seconds in the drive simulation. Collection
records forward marker crossings once; debug / direct navigation seeks do not
manufacture points. Reduced-motion users can read the whole skill index.

## Content and model sources

- [ArkaOS](https://github.com/thulasiramk-2310/Arka): featured, correctly labeled
  as a developer preview; immutable Linux image, atomic updates, rollback,
  Rust / bootc / KDE, with source and real website links.
- [kural-kv](https://github.com/thulasiramk-2310/kural-kv): added from its README;
  a reproduction study of KV-cache eviction on small GQA models.
- [SysOracle](https://github.com/thulasiramk-2310/SysOracle): added from its README;
  Rust terminal system monitoring, graphs and Lua alerts.
- [TRX-AI](https://github.com/thulasiramk-2310/TRX-AI): CLI-first local-LLM assistant
  and hybrid routing. An unsupported accuracy number was removed in both languages.
- RECALL X and Pahara are excluded. CreditGuard AI remains visibly marked as a draft.
- [Bajaj RE specifications](https://www.bajajauto.com/three-wheelers/re/specifications)
  were checked for proportion reference. All new vehicle and street meshes are
  original code-generated geometry; no manufacturer images or models were imported.

## Verification

55 Vitest tests, oxlint and the production build pass, along with the 15-case
Node scene runner. Tests cover reading-band mapping and departure, route bends,
vehicle framing, driving cadence / reversal, the actual rear-window aperture,
finite canopy geometry and distinct bounded street variants.

Chromium with SwiftShader at 1440×900 and 390×844, reduced motion enabled:
native wheel input reached all six stops and the final ascent without clicking
Continue. Optional skill / project interactions, ArkaOS website / source links,
Escape, Tamil labels and a native phone touch gesture were also checked.
No JavaScript exceptions or horizontal page overflow were recorded.

A separate default-motion check used native wheel input to reach Chennai,
remained at story .245 while scrolling inside its reading band, then reached
.33005 after scrolling onward, without any navigation click. Browser results
and screenshots are saved outside the app in `review-scroll-first/`.

These checks do not prove 60 FPS or physical-phone performance. The full six-stop
interaction check uses reduced motion; normal acceleration and camera continuity
are covered separately. Further authored sculpture, material and street-detail
work is required for the requested visual craftsmanship.

The final high-quality desktop captures at story .245, .37 and .43 were
inspected for the new auto rear assembly, roofline variation and skill signage.
Those captures and a further dialog / Tamil check recorded no JavaScript errors.

The loading/reveal close review and latest character, forecourt, sculpture and
framing work are recorded in [opening-review.md](opening-review.md). The overall
visual rating remains below the requested 9/10 standard.
