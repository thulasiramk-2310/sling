# Story rebuild · 2026-10-19

## What changed in response to the reference

The prior revision was mostly a roadside drive with content chapters. The current
implementation separates story progress from road distance and stages these beats:

| Story progress | Scene / content |
| --- | --- |
| .00–.08 | Extruded “Hello, world.” above the Chennai coast |
| .08–.195 | Descent and flight through an original coastal bridge arch |
| .195–.32 | Ram beside the parked auto; bio, education and stats at the side |
| .32–.50 | Third-person ride through a terrace street; skill markers and journey points |
| .50–.64 | Clickable roadside project exhibits near Thanjavur |
| .64–.73 | Madurai / Meenakshi Amman Temple and experience |
| .73–.85 | Rameswaram / Pamban crossing |
| .85–.92 | Night gives way to dawn at the Kanyakumari promenade |
| .92–.93 | Brief coastal camera hold before ascent |
| .93–1.00 | Ascent, extruded farewell lettering and actual contact links |

The associations are editorial. They do not assert that Ram worked or studied in
all six places. Journey points count discovered skills, not ability or experience.

## Models and presentation

The auto now has a continuous curved front cowl, a rounded open passenger shell,
curved glazing and a modeled windshield gasket, canopy seams, side steps, bumper,
seats, mirrors and wheels. Desktop paint uses clearcoat. The existing exact
suspension update prevents numerical divergence on long render frames. An
original articulated character appears on the camera-facing side, boards during
the transition, and gives way to the seated driver during travel.

Madurai is now a single temple compound with cardinal gateways, open passages,
pillared halls, a stepped tank and two golden shrine interpretations. Existing
original three-pose figures, geometric niche frames and tapered tiers remain.
Kanyakumari adds original architectural / sculpture studies of Vivekananda Rock
Memorial and Thiruvalluvar, including a raised hand and manuscript posture. Inland ground has been extended behind Thanjavur and Madurai. Finer masking
of the shared ocean near the compressed geographical transitions remains visual work. The
Pamban road returns to land before Kanyakumari; an island mesh that overlapped and
buried the final road was lowered.

The first camera implementation overshot near parked and driving boundaries.
Shape-preserving cubic tangents now prevent that overshoot. The entrance flies
in world space; riding cameras follow offsets in the road's moving frame. Phone
framing blends continuously into and out of its wider parked composition.

## Checks actually performed

- **40 Vitest tests passed**, plus oxlint and the Vite production build.
- The additional Node scene regression runner passed all 15 cases.
- Camera checks sample 10,001 positions for finite values and water clearance,
  2,001 ride positions per desktop / phone viewport for vehicle visibility, shot
  velocity continuity, the phone entrance join and the under-bridge aperture.
- Tests cover the vehicle remaining parked through the introduction, all six
  chapter mappings, monotone road progress, and reaching Kanyakumari after
  Rameswaram. They also cover return-to-land bridge elevation, driving reversal,
  suspension stability, real curved auto surfaces and the earlier sculpture /
  GLB / stonework cases.
- Real Chromium with software WebGL captured 11 desktop story poses and 7 phone
  poses at 1440×900 and 390×844. Six desktop presentation poses were additionally
  captured with high-quality materials, AO, shadows, reflection and bloom enabled.
- Those captures were inspected and prompted fixes to camera overshoot, the
  avatar's camera-facing placement, phone framing, title sizing, text contrast,
  island / road clearance and Kanyakumari lighting.
- A real pointer click on the ArkaOS 3D exhibit opened the native project detail
  dialog with title `ArkaOS` and source `https://github.com/thulasiramk-2310/Arka`.
  No JavaScript exceptions were recorded in that check.
- Browser checks verified that chapter content dialogs open, Escape closes them,
  the language toggle changes the heading, and the checked desktop / phone
  layouts have no horizontal page overflow. The four contact / resume links and the
  project content remain driven by the existing configuration.

Snapshots use `?debug` and `window.__trip.inspect(progress)` to freeze a story
pose. Their timing statistics are **not an FPS benchmark**. The browser is run
outside the tool sandbox; earlier Chromium startup failures were due to the outer
syscall restrictions. Dependency installation is no longer a blocker.

## Reference research

The supplied 124.07-second Sébastien Lempens recording was reviewed with one-second
contact sheets across its duration. The supplied 30-second portfolio recording
was sampled across its full route, with full-resolution checks at 7.5, 13.5, 21.5
and 29.9 seconds. The latter records the older five-stop version, not this rebuild.

Primary research sources:

- [Sébastien Lempens portfolio](https://sebastien-lempens.com/)
- [Creator's project case study](https://pixila.net/projets/sebastien-lempens-portfolio):
  modeled scenes, Blender-authored camera animation and scroll synchronization.
- [Jesse Zhou's production case study](https://jesse-zhou.medium.com/jesses-ramen-case-study-77bae77ab5f0):
  authored scene modelling, lighting and baking workflow.
- [Bruno Simon's portfolio and production notes](https://bruno-simon.com/): content
  discovered through a vehicle-driven interactive world.
- [Bajaj RE specifications](https://www.bajajauto.com/three-wheelers/re/specifications):
  vehicle proportion reference; no brochure imagery or branding copied into the model.
- [Meenakshi Temple, Madurai district](https://madurai.nic.in/tourist-place/sri-meenakshi-sundareswarar-temple/)
- [Vivekananda Memorial and Thiruvalluvar, Kanniyakumari district](https://kanniyakumari.nic.in/tourist-place/vivekananda-mandapam/)
- [Thiruvalluvar statue, Kanniyakumari district](https://kanniyakumari.nic.in/thiruvalluvar-statue/)

## Rights and remaining limits

Environment geometry, avatar, auto, textures and audio are original code. Ram's
supplied photo and personal content are preserved. The Optimer typeface is the
licensed Three.js example font; its Magenta copyright / license is included in
`public/fonts/LICENSE` and the font metadata. UI fonts retain SIL OFL licenses.
No reference-site environment mesh, image, screenshot or sound is a product asset.

These remain procedural architectural and character studies, not scans, exact
historical reconstructions or a finished match for the reference's handcrafted
asset quality. Sculpture anatomy, environmental density, shore transitions,
material authoring and scene-to-scene art direction still need further refinement.
Project screenshots and live-demo links were not supplied and have not been
fabricated. The separate Auto Dash mini game remains separate from the portfolio
skill-discovery ride.

There is no verified hardware-GPU 60 FPS result, physical-phone test, complete
new live interactive walkthrough recording or verified audio-quality result.
Static browser captures and passing unit tests do not establish production
readiness. The supplied ZIP has no Git metadata: no commit or remote branch
update has been made.

## Kanyakumari dawn revision

The final stop now has its own sunrise palette after the preserved Pamban night.
An original curved stone promenade has radial paving joints, stepped edges, a
low parapet and benches. The memorial and statue remain separate offshore
architectural/sculptural studies, with subtle foam contours around their rocks.
The first browser screenshots exposed overlapping land: final coastal hills
and an oversized Rameswaram island. The coastal terrain now falls below the
water beyond the promenade, and the preceding island is contained around
its own temple. The memorial moved inward in the
composition to avoid clipping it at the right edge.

The road settles at the last stop and the camera holds its local position
between story progress .915 and .93 before lifting away. The contact dialog and
final social links remain available. English and Tamil captions describe a new
horizon, and interface contrast now follows sampled darkness rather than route
distance alone. These are original procedural studies, not photogrammetry or
finished realistic sculpture assets.

After these changes: 40 Vitest tests, oxlint, production build and the 15-case
Node scene runner pass. The timeline checks explicitly preserve night at
Rameswaram and assert dawn at Kanyakumari.

Browser checks for the dawn revision use Chromium with SwiftShader at
1440×900 (high quality) and 390×844 (low quality). Reviewed screenshots cover
the preserved Pamban night, arrival, coastal hold, ascent and connections.
The contact dialog opens, Escape closes it, the English/Tamil toggle updates
the heading, no horizontal overflow occurs, and no browser JavaScript errors
were collected. A wider portrait finale lens and a closer camera protect the
landmark composition while preserving readable vehicle scale; the automated
framing test uses the same lens calculation as the renderer. Physical phone
and hardware-GPU performance remain unmeasured.

## Stop acknowledgement / project revision

See [reference-audit.md](reference-audit.md) for the current interaction revision.
The current checks comprise 46 Vitest tests, oxlint and the production build,
plus the 15-case Node scene runner. The route now has significant left / right
bends, every stop requires Continue, skills have readable name / usage controls,
ArkaOS is featured and RECALL X has been replaced with verified repositories.
The earlier 40-test totals above describe prior revisions.

## Scroll-first correction and vehicle / street finish · October 20

The click-required Continue flow was replaced with reading bands in scroll
space. All six destinations and the ascent were reached in desktop and
phone-width browser checks using native wheel input, without clicking a
Continue control. Project and skill clicks remain optional content interactions.
Closing a project dialog restores scrolling. Native phone touch input was also
exercised. No JavaScript errors or horizontal page overflow were recorded.

The auto now has a crowned roof, an open rear-window aperture with glazing,
engine-cover louvres, rear lamp housings and bumper; street frontages now use
multiple original roofline / shop variants. Tests cover the window aperture,
canopy / street bounds and scroll-band mapping. The current total is 50 passing
Vitest tests, oxlint, production build and 15 passing Node scene checks.
Models remain procedural interpretations; the landmark sculptures still need
finer authored detail to approach the reference's craftsmanship.

## Loading, character and framing review · October 20

See [opening-review.md](opening-review.md) for the close reference analysis, new
modeled-auto loader, original aperture reveal and rendering evidence. Current
validation is 55 passing Vitest tests, oxlint and the production build. Desktop
and phone native scroll checks preserve all six stops and ascent without
Continue; a real pointer click on the ArkaOS world exhibit works. Historical
counts and the earlier click-required flow above describe superseded revisions.
The current craft improvements still do not establish a 9/10 visual result.
