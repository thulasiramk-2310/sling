# Ram — From Tamil Nadu to the World

The active application is **`sling-product/portfolio/`**: the six-stop Three.js portfolio for Thulasiram K., from Chennai through Kanyakumari.

## Run from this workspace

Requires Node.js 22.12+ and npm.

```sh
npm run setup
npm run dev
```

The root commands now run the active application. Existing older implementations in the workspace are preserved; they are not the default launch target.

```sh
npm run verify
npm run preview
```

`verify` runs the active application's Vitest, oxlint and production build. `preview` serves its production output. The application and deployment instructions are in [the portfolio README](sling-product/portfolio/README.md).

## Source and assets

The portfolio uses Vite, JavaScript, Three.js, GSAP ScrollTrigger and Lenis. Six destinations share a continuous scroll journey; chapter content, project details, contact, privacy preferences and the mini game remain available through keyboard and touch interfaces.

Models, surface textures and audio are original code-authored assets. The bundled statue and elephant GLBs have reproducible export scripts. The README and asset-review documents distinguish delivered features from unverified performance and remaining art limitations.

The active application now lives in a real checkout of `thulasiramk-2310/sling`, branch `claude/chat-session-ay91ey`. Older archive copies remain preserved. Changes are reviewed and committed locally; nothing is pushed or published automatically.
