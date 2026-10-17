# ORBIT

**The solar system, at your fingertips.** A 3D solar system you explore with bare-hand gestures through your webcam. Everything runs in the browser and no video leaves the device. A mouse/touch mode is there as a fallback.

## Controls

| Hand | Mouse | Action |
|---|---|---|
| Pinch a world | Click a world | Fly to it and open its info panel |
| Pinch & drag empty space | Drag | Rotate the system |
| Pinch with both hands, spread/close | Scroll | Zoom |
| Hold an open palm (~0.7 s) | Esc | Go back |
| Pinch a button | Click | Use any button marked as hand-clickable (dock, speed, panel nav) |

## Stack

- **Vite + React + TypeScript**
- **Three.js / React Three Fiber / drei**: procedural GLSL planets (simplex-noise surfaces, atmospheres, Saturn's rings), an animated sun, bloom/vignette/grain post-processing
- **MediaPipe Tasks Vision `HandLandmarker`**: 21 landmarks per hand, up to two hands, GPU delegate with CPU fallback
- **One Euro filter** + pinch hysteresis so the cursor is steady at rest and responsive in motion
- **Framer Motion** for UI choreography, **Zustand** for UI state

The model (`public/models/hand_landmarker.task`) is in the repo. The MediaPipe WASM runtime is copied from `node_modules` into `public/mediapipe/` on `dev`/`build`, so the app runs fully offline after `npm install`. That matters on unreliable hackathon wifi.

## Run

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # production build in dist/
```

The camera needs a secure context: `localhost` works, and deployments must use HTTPS.

## Project layout

```
src/
  core/        input singleton (per-frame pointer state) + zustand store
  tracking/    webcam + HandLandmarker loop, gesture engine, One Euro filter
  scene/       R3F world, planets, sun, shaders, camera rig, raycast interaction
  ui/          intro, HUD (top bar, dock, guide), info panel, hand preview, cursor
  data/        planet data and facts
```
