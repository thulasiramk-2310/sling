# Ram · From Tamil Nadu to the World

A scroll-driven 3D portfolio for **Thulasiram K. (Ram)**, a CS (AI & ML) student
from Chennai. Built with Vite, JavaScript, Three.js, GSAP ScrollTrigger and Lenis.

## Run

Requires Node.js 22.12 or newer and npm. From the Sling checkout:

```sh
cd portfolio
npm ci
npm run dev
```

Vite prints the local URL. For the deployed build:

```sh
npm test
npm run lint
npm run build
npm run preview
```

The enclosing development workspace also supports `npm run dev` directly; its
launcher points to `sling-product/portfolio/` rather than an older implementation.

## The journey

The modeled-auto loader opens through an original kolam aperture into a sky
greeting. Scrolling descends through a coastal bridge to Ram beside the parked
auto, then drives through a connected, curved Tamil Nadu landscape.

| Destination | Story and content |
| --- | --- |
| Chennai | Lighthouse, Central station, introduction, bio, education and resume stats |
| Mamallapuram | Shore Temple, Pancha Rathas, original stone elephant and skill collection |
| Thanjavur | Brihadeeswarar vimana, Nandi and seven interactive project exhibits |
| Madurai | Meenakshi Amman Temple compound, experience and achievements |
| Rameswaram | Pamban sea crossing and island temple |
| Kanyakumari | Rock Memorial, original Thiruvalluvar study, new dawn and final contact ascent |

These are editorial associations, not claims that Ram worked or studied in every
place. This is a compressed narrative landscape, not a geographically exact map.

**Scroll or swipe is the primary control.** Every stop occupies a reading interval:
the auto parks while you scroll through it and resumes at its end. Reverse
scrolling revisits the stops. Chapter dots and Skip ahead are optional shortcuts;
Continue clicks are never required. Acceleration, braking and camera movement are
bounded. Reduced motion removes drift and preserves the same stops.

Skills have readable names, usage descriptions and an accessible index. Journey
points count discoveries, not proficiency. Click or tap project installations to
open a case study; “Read this chapter” provides keyboard-accessible equivalents.
Escape closes readers and restores focus. Native modal handoffs preserve scroll
locking. English/Tamil, sound controls, consent settings and an original Canvas 2D
Auto Dash game are included. Sound starts muted and remembers an explicit choice.

## Edit content

- `src/content.js`: personal details, stats, education, experience, links and skills.
- `src/project-content.js`: bilingual case studies, technical stacks, screenshots,
  preview status and optional walkthrough links.
- `src/i18n.js`: shared interface translations.
- `public/models/models.json`: optional licensed GLB replacements for named slots.

ArkaOS is featured. TRX-AI, StudyFlow AI, VARA, kural-kv and SysOracle use public
README descriptions. CreditGuard AI remains a labeled concept with a search link;
RECALL X and Pahara are excluded. Actual ArkaOS, TRX-AI and StudyFlow screenshots,
source URLs, hashes and license records are bundled in `public/projects/`.
No missing screenshot or live demo is fabricated.

## World systems

Camera choreography (`src/scene/camera.js`), route/story mapping, vehicle physics,
landmarks, raycast exhibits and HTML readers are independent modules. Original
curved panels, wheel suspension and an articulated character form the vehicle
sequence. Static architecture is batched; repeated elements are instanced with
spatial culling and projected-size ornament LODs.

Desktop uses physically based materials, sky lighting, AO, shadows, water
reflection and bloom. Phones use lighter materials, geometry and effects. Slow
frames progressively reduce effects and DPR. `?quality=low` / `?quality=high`
override selection; `?fixed` disables adaptation for controlled comparisons.
Unsupported WebGL or actual context loss exposes a compact readable portfolio.
Without JavaScript, a minimal real profile and project/contact links remain usable.

## Original assets

World meshes, surface textures and synthesized audio are authored in code; the
photo is Ram's. No geometry, textures, sound or branding from the reference site
is copied. Elephant and poet GLBs are original. The poet is finished in Blender,
with source/output hashes in `public/models/poet-provenance.json`.

```sh
npm run export:elephant
node scripts/export-poet.mjs --out-dir /tmp/ram-poet-pipeline
# See scripts/finish-poet.py and docs/poet-assets-review.md for Blender finishing.
```

Fontsource UI fonts retain their SIL OFL licenses. `public/fonts/LICENSE` covers
the bundled Optimer lettering font. Check usage rights and credit any optional
replacement assets before adding them to the manifest.

## Verification and remaining limits

[Product readiness and evidence](docs/product-readiness.md) records the current
unit tests, native desktop/touch checks, actual WebGL captures and performance
limits. [The reference audit](docs/reference-audit.md) and later sculpture reviews
record the art comparison and historical checkpoints.

The scenes are original procedural architectural interpretations. They are not
scans, exact historical reconstructions or proven reference-level craftsmanship.
The requested above-9/10 visual standard remains unestablished. Hardware-GPU
60 FPS, physical iOS/Android performance and sound quality by listening are not
claimed. Static screenshots and reduced-motion tests are not FPS benchmarks.

For static QA, open `/?debug`, press Start and use `window.__trip.inspect(.245)`
(introduction), `.49` (Mamallapuram), `.915` (Kanyakumari) or `.947` (statue visit).
`story()`, `exhibits()`, `profile()` and `scrollState()` expose QA diagnostics.
Reload to resume ordinary navigation. Browser review scripts expect an HTTP
server on port 5174 and a task-owned Chromium CDP endpoint on port 9224.

## Deploy and package

Serve the contents of `dist/` from a static HTTP(S) host. The relative Vite base
supports subdirectory deployment. Enable compression for JavaScript, GLBs and
fonts. No backend, API keys or external font service is required. Analytics is
absent unless `VITE_PLAUSIBLE_DOMAIN` is configured at build time and consent is
granted; consent can be withdrawn through Cookie settings.

```sh
python scripts/package-release.py --out-dir ../../
python scripts/package-review.py
```

The first command produces standalone source, static deployment ZIPs and SHA-256
records. The second verifies a binary patch against `origin/claude/chat-session-ay91ey`
and proves unrelated Sling applications are unchanged. Changes are committed
locally under the user's configured identity without co-author trailers. Nothing
is pushed or published automatically.
