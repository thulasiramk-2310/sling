# Product integration review · 31 October 2026

The working application lives in `portfolio/` in a real checkout of
[`thulasiramk-2310/sling`](https://github.com/thulasiramk-2310/sling), branch
`claude/chat-session-ay91ey`. The integration baseline is
`0eb431b14610045026caf7d8239074b8895ae11f`. Other Sling applications are preserved.
The enclosing workspace's launcher now starts this checkout.

## Delivered experience

A real Three.js world connects Chennai, Mamallapuram, Thanjavur, Madurai,
Rameswaram and Kanyakumari. Start opens the kolam aperture into the sky greeting;
scrolling descends through the bridge to Ram and the parked auto, then drives
through skills, projects, experience, the Pamban crossing and the final dawn.

Scroll is the main control. Every destination has a reading interval where the
vehicle parks. Scrolling through its end resumes travel; reverse scrolling
revisits the same stops. Chapter navigation and Skip ahead are optional.
Project exhibits also have keyboard-accessible alternatives in the chapter reader.
The route is an original compressed narrative, not a geographical map.

Seven project case studies have editable bilingual descriptions, technical stacks,
source links and previous/next navigation. ArkaOS is featured and its preview
status is explicit. ArkaOS, TRX-AI and StudyFlow show genuine repository images;
VARA, kural-kv and SysOracle do not display invented screenshots. CreditGuard AI
remains a clearly labeled concept with a repository search link. RECALL X and
Pahara are excluded. See `src/project-content.js` and `public/projects/sources.json`.

English/Tamil, local fonts, muted-by-default synthesized music, a separate Canvas
2D Auto Dash game, consent-gated analytics, reduced motion and readable no-WebGL /
no-JavaScript content are integrated. There are no required API keys or backend.

## Failures found and corrected

- The final reading band was shorter than one screen; one large wheel event
  could consume the stop and ascent together. An explicit runway now gives the
  last chapter a full band and a separate ascent. Reduced-motion wheel steps
  stay immediate but large native deltas are bounded. Nested readers and zoom
  are respected.
- Reverse scrolling previously failed to re-arm earlier stops. Direction-aware
  gates now park at all six stops in both directions.
- A phone touch opened the project on pointer-up; the synthesized click then
  hit a newly inserted external link. The canvas now opens on click after the
  movement threshold check. All seven native exhibit taps are checked for
  correct source and absence of unintended external tabs.
- Opening a project from the chapter reader raced the native dialog's queued
  close event. A synchronous panel handoff now preserves scroll locking and
  the original world focus target. Cookie settings similarly waits for the
  chapter modal to close before focusing its live consent controls.
- Portrait reused the desktop camera and cropped monuments. Authored portrait
  tracks preserve recognizable landmarks, the caption and vehicle at every
  stop. Desktop Mamallapuram now has its own across-road arrival composition.
- Chennai and Mamallapuram now have modeled pedestrian approaches joining their
  landmarks to the road. Garden paving follows sampled terrain at construction
  time and uses one instanced draw.
- The close introduction used a road-sized shadow map targeted ahead of the
  parked auto. Its bounds and target now blend toward the vehicle, improving
  contact at the tires and feet without changing the sun direction.
- Readable fallback headings inherited white world-overlay colors. The fallback
  now has a paper background, dark typography, compact content and no blank
  cinematic scroll stretches. Reduced motion displays the whole role immediately.

## Verification

The source is installed using `npm ci` from its real lockfile. **125 tests in 27
files pass**, oxlint reports no warnings, and Vite's production build succeeds.
The native production input suite passes **21 checks at each width (42 total)**,
including both modal handoffs. Browser checks serve the
actual `dist/` through Vite preview, not a screenshot mockup.

An isolated official Chrome for Testing runs outside the outer syscall sandbox, which otherwise
blocks its startup socket operation. The browser uses SwiftShader because this
host exposes no `/dev/dri` hardware renderer. Phone evidence is a 390×844 touch
viewport in that desktop browser, not a physical phone.

Current evidence is saved beside the checkout:

| Evidence | Coverage |
| --- | --- |
| `review-madurai/desktop-interactions.json` | Native wheel, all six arrivals and reverse revisits, keyboard skills/language/sound, project details/media/pagination, seven pointer raycasts, modal handoffs, game focus and actual context loss |
| `review-madurai/phone-interactions.json` | Same route with touch exhibit activation and 390px layout |
| `review-product/performance-readable-results.json` | Actual low-frame-rate detection after adaptation, native keyboard selection, stopped renderer, live readable content and restored scrolling |
| `review-product/readable-fallback-results.json` | No JavaScript and no WebGL at 1440px and 390px; real links, project reader and no horizontal overflow |
| `review-sculpture/desktop-product-results.json` | Loader plus twenty authored camera poses; high-quality shaders, accepted GLBs and current sky-lighting checks |
| `review-sculpture/phone-product-results.json` | Same portrait route with lighter geometry/materials and low-cost water |
| `review-sculpture/normal-motion-desktop-after.json` | Actual normal-motion software-render cadence and adaptive quality changes at a fixed authored statue pose |

The interaction route uses reduced motion to make native input checks practical
on software rendering. Static inspections do not prove scroll smoothness or FPS.
Motion continuity and drive acceleration are additionally covered by source tests.

The latest fixed-pose sample rendered 24 frames over 20.00 seconds,
**1.20 FPS on SwiftShader**. This remains below a usable interactive rate.
Adaptive quality lowers DPR to .75 and disables AO, reflections, bloom and
shadows. If the measured rate still remains below 12 FPS after those reductions,
an optional “Read portfolio” button exposes the compact profile and stops 3D
rendering. This is a visitor choice; GPU-capable visits retain the normal journey.
The exact latest normal-motion sample and its renderer identity are bundled in
`verification/software-cadence.json`. The engine's recent-window FPS estimate
is not treated as the average over that sample. This host's SwiftShader result
**does not** establish the requested 60 FPS on a capable GPU.

## Asset provenance and art limits

World geometry, surface textures, character, auto and synthesized sound are
original code. Elephant and poet meshes are original GLBs; the latter are finished
through the reproducible Blender pipeline in `scripts/export-poet.mjs` and
`scripts/finish-poet.py`. Four figure-module hashes and output hashes are recorded
in `public/models/poet-provenance.json`. The [latest sculpture revision](poet-v6-review.md) rebuilds both original GLBs,
records their updated source/output hashes and adds a matching island terrace.

Project image sources and licenses are bundled in `public/projects/`; UI fonts
retain their licenses, and `public/fonts/LICENSE` covers the bundled Optimer font.
The reference recording supplies pacing and composition guidance; none of its
geometry, textures, sounds or branding is imported.

The [Chennai arrival review](chennai-arrival-review.md) records the rebuilt station,
physical driveway proof and measured phone submission reduction. Its independent
intro visual assessment is approximately **6.5/10**, below the requested finish.

The independent art reviews still identify simplified facial likeness, robe
folds, open terrain and architectural detail. These are procedural interpretations,
not photogrammetry or historically exact models. The requested **above-9/10
visual craftsmanship is not yet established**. Functional completion and a
successful production build do not erase that remaining art gap. Hardware-GPU
performance, physical iOS/Android and sound quality by listening remain unverified.

The official [Kanniyakumari district photographs](https://kanniyakumari.nic.in/thiruvalluvar-statue/)
continue to inform silhouette and stone color. The [Bajaj RE leaflet](https://cdn.globalbajaj.com/-/media/Myanmar/Documents/RE4S/RE4S-Petrol-Leaflet.pdf)
was used only to study body proportions and lamp placement. Original assets are
kept separate from these references.

## Run and deploy

From the Sling checkout:

```sh
cd portfolio
npm ci
npm run dev
```

Use Node 22.12 or newer, as declared by the package. Run `npm test`, `npm run lint`, `npm run build` and
`npm run preview` for local acceptance. A static host serves the contents of
`dist/`; the relative base supports subdirectory deployment. Enable HTTP compression
for JavaScript, fonts and GLBs. Serve through HTTP(S), not `file://`.

`python scripts/package-release.py --out-dir ../../` produces runnable source,
static deployment ZIPs and byte/SHA-256 records. `package-review.py` additionally
checks that unrelated Sling applications are unchanged and proves the binary
patch applies to the baseline origin branch. Commits use the user's configured
Git identity without co-author trailers. No push or public deployment is automatic.
