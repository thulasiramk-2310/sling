# Ram — The long way home

A JavaScript / Vite / Three.js road-trip portfolio for **Thulasiram K. (Ram)**. GSAP ScrollTrigger maps page travel to an auto-rickshaw route; Lenis controls smooth scrolling. The renderer is independent of content, interaction, privacy, music, and game systems.

## Repository status — important

Requested destination: `thulasiramk-2310/sling`, `portfolio/`, branch `claude/chat-session-ay91ey`.

That checkout is **not available in this execution session**. This directory is a standalone preparation copy inside `/home/Ram/Downloads/tamil-nadu-to-world/portfolio`. It has not been applied or committed to `sling`. No unrelated repository was initialized to impersonate the target branch.

The target checkout and resume path/URL were requested from the user. Integration must first read the target repository's AGENTS.md and existing portfolio files, reconcile this implementation with them, and preserve unrelated work. The commit should use the user's configured Git identity and contain no co-author trailer. Do not claim the requested commit exists until it is made in that actual checkout.

## Run with network access

Node.js 22+ and npm:

```sh
cd portfolio
npm install
npm run dev
```

Open the printed Vite URL in **Firefox**. For a GitHub Pages deployment, `base: './'` supports the nested portfolio directory.

```sh
npm run test    # Vitest
npm run lint    # oxlint
npm run build  # Vite production bundle
npm run preview
```

## Implemented in source

- Chennai: Marina lighthouse, original Chennai Central architectural interpretation, city streets, palms, sunrise.
- Mamallapuram: Shore Temple, original ratha studies, About stop, daytime sea.
- Thanjavur: Periya Kovil vimana, two gateways, cloisters, mandapa and Nandi pavilion, Projects stop, golden light.
- Madurai: colored gopuram studies, temple enclosure and tank, Experience stop, dusk lighting.
- Rameswaram: bridge with piers, railings and truss elements, boats, an island and temple gateway, Contact stop, night.
- Rickshaw built in code with body, cabin, windshield, seating, chassis and animated wheels. It accelerates and brakes through an independent velocity model. An alternative bike is available in Auto Dash.
- Gentle Lenis wheel input. ScrollTrigger settles to a stop only near that stop; it does not yank the user to an unrelated chapter. Native keyboard and touch access, Home/End, route navigation, and reduced-motion support.
- Desktop PBR materials, beveled architectural edges, locally synthesized surface maps, PMREM sky illumination, shadows, planar water reflections, SSAO and restrained bloom. Phones use a lower pixel ratio, fewer trees, no AO/bloom/shadows, and an infrequently refreshed sky reflection. Sustained low frame rates shed AO, reflections, bloom, shadows, then resolution.
- English/Tamil UI, Noto Sans Tamil, original code-drawn kolam motifs, optional synthesized plucked-string music, custom cursor on fine pointers, dialog transitions, accessible native dialogs, and WebGL-readable fallback.
- Auto Dash: a separate 3D mini game, rickshaw or bike, three lanes, collectible filter-coffee tumblers, obstacles, lives, score, keyboard and touch buttons, restart.
- Consent banner with Accept / Essential only, revocable choice, storage failure handling, and tested analytics gating. No analytics service or network beacon is configured by default. Supply a transport explicitly only if wanted.
- `src/content/models.js` allows opt-in licensed GLB replacements; default landmarks, surfaces and sound are made in code.

## Content and provenance

Edit `src/content/data.js` for personal details and project content.

Verified against primary GitHub READMEs:

- ArkaOS: https://github.com/thulasiramk-2310/Arka — privacy-first immutable Linux desktop, atomic updates, rollback, Rust privacy daemon.
- TRX-AI: https://github.com/thulasiramk-2310/TRX-AI — terminal-first hybrid AI assistant for debugging/code review, intent routing and multi-agent analysis.
- VARA: https://github.com/thulasiramk-2310/vara — transactional content-addressed version control in Go, SHA-256 objects, crash recovery and merging.
- LinkedIn URL verified from Ram's public GitHub profile: https://www.linkedin.com/in/thulasiram-k-60a864328/

The exact StudyFlow AI repo and README could not be obtained. Its entry is explicitly pending confirmation and opens a repository search; it is not falsely marked verified. CreditGuard AI and RECALL X are marked drafts with search links. Pahara is excluded.

The brief supplied LeetCode 1826, top 7%, 635+ problems, two hackathon wins, and s2n-tls contribution. These are user-provided facts, not independently measured by the app. Experience names come from the brief. Presidio's PRIME program was also visible in a public indexed LinkedIn post attributed to Thulasiram K.

**Still needed from the resume:** actual photo, email, college, education dates, experience dates/responsibilities, award names/dates, resume URL and StudyFlow's real repository URL. These fields are empty or visibly marked pending. No invented personal data or fabricated photo was inserted.

## Verification in this session

- **13 core tests pass** using `npm run check:core`. The same shared test cases are wired to Vitest's test runner. Node's test registration runs directly in the current process because the execution sandbox blocks child-process test isolation.
- Checks cover acceleration/braking, reverse travel, frame-rate independence, stop selection, device budgets, daylight continuity, consent rejection/acceptance/revocation, disabled storage, coffee collection, barrier/game-over logic, project scope, road continuity/upward normals, and mixing indexed/beveled geometry in material batches.
- All 20 JavaScript source/test modules were syntax-transformed successfully.
- All eight landmark definitions and both vehicles instantiated successfully in a Node geometry check: landmarks form 43 material-batched meshes and about 349k triangles total, before frustum culling. This is a geometry count, **not** a GPU performance result.
- Full source dependency analysis succeeds when missing GSAP/Lenis imports are explicitly externalized for analysis only. This is **not** a successful production build.

**Required gates are not yet passing:** the host cannot resolve npm registry DNS. GSAP, Lenis, Vitest, and oxlint are not installed or cached. `npm install --offline` fails with ENOTCACHED for GSAP; `npm test` and `npm run lint` report missing executables; `npm run build` fails resolving GSAP. These errors were not bypassed with dummy libraries or renamed test commands. A lockfile must be generated by a successful real installation, then the required gates run.

**Browser QA remains unverified:** the host rejects local server socket binds. Firefox in the earlier attempt exits before producing a screenshot. Chromium is not being used, per the user's request. No screenshot quality, actual interaction success, shader compilation, responsive appearance or FPS result is claimed. After launch, `window.__roadtripMetrics` exposes runtime frame rate, draw calls, triangles and selected quality; collect device and resolution with any reported measurement.

## Firefox acceptance pass

After dependency installation and required tests/lint/build pass:

1. Inspect all five stops and their transitions. Ensure the rickshaw remains on the road, wheels rotate, Pamban crossing is above water, and forward/reverse navigation remains continuous.
2. Confirm sunrise/noon/golden-hour/dusk/night and compare screenshots at each stop on desktop and phone.
3. Open all portfolio dialogs and each project. Confirm real source links and drafts, resume/photo once configured, keyboard focus, Escape and mobile scrolling.
4. Toggle English/Tamil and reduced motion; test Home/End and chapter buttons. Music starts only after a click and mutes reliably.
5. Play Auto Dash using both vehicles, arrows/A-D/touch buttons, coffee and barrier collisions, game-over and restart.
6. Inspect network requests before any cookie choice and after rejection: no analytics calls. Test acceptance, revocation through Privacy, and blocked localStorage.
7. Test WebGL disabled and context loss. The complete content must remain reachable. Inspect console/shader errors and collect actual performance data before claiming quality or performance targets.

The models are original procedural **architectural studies**. They are not photogrammetry, scans or exact surveyed reconstructions. Route distances are deliberately compressed. More detailed sculptural source assets and browser-driven art direction are required to reach the requested finished realism.
