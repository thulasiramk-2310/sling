# CALIBRE

A working mechanical watch movement in 3D. Open the caseback, explode the movement and follow the power from the mainspring to the balance wheel. The dial shows the real local time, and the hands are driven by the same gear train you see inside.

## What's real

- **Gear train ratios**: barrel 72 → center pinion 12, center 80 → third pinion 10, third 75 → fourth pinion 10, fourth 80 → escape pinion 5. So the center wheel turns once an hour (minute hand), the fourth wheel once a minute (seconds hand) and the escape wheel 16 times a minute.
- **Center distances** come from the tooth counts: `(z1 + z2) × module / 2` with module 0.1. Tooth phases are aligned so the wheels and pinions actually mesh while they turn.
- **Escapement**: 28,800 vph (4 Hz, 8 beats per second). The escape wheel jumps half a tooth per beat, the pallet fork flips on each beat, the balance swings ±280° and the hairspring breathes with it.
- **Finishing**: Côtes de Genève bridges, a perlage mainplate, blued screws, ruby jewels in gold chatons, all generated procedurally with no texture files.

## Controls

- **Views**: Dial, Movement (bridges on) and Exploded.
- **Explode slider**: separates the layers so you can see which wheel drives which pinion.
- **Power flow list**: 9 steps in the order energy moves through the watch. Select one to focus the camera on it and read its specs. **Play tour** steps through them automatically.
- **Speed**: Pause, Slow (watch the escapement lock and release) and Real time.
- Drag to orbit, scroll to zoom, click a part to select it, Esc to deselect.

## Run

```bash
npm install
npm run dev     # http://localhost:5173
npm run build
```

Stack: Vite, React, TypeScript, Three.js, React Three Fiber, drei (procedural Lightformer environment, no HDR downloads), postprocessing (N8AO ambient occlusion, SMAA), Framer Motion, Zustand.
