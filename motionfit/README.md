# MotionFit

A virtual fitting room in the browser. Stand in front of your laptop camera and garments follow your body: the torso tracks your shoulders and hips, and each sleeve bends with your upper arm and forearm. Pose detection runs on-device with MediaPipe Pose Landmarker, so no video is uploaded. With the camera off, a mannequin models the clothes so the whole experience still works.

## Features

- **Live outfit preview**: procedurally painted garments (stripes, oxford, flannel check, denim, rib knit) are mapped onto a deformable mesh. The torso bilinearly fits the shoulder–hip quad, and the sleeves follow the shoulder → elbow → wrist chain with a soft bend at the elbow. If the hips are out of frame (common on laptops), they're estimated from the shoulder line.
- **Gesture shopping at mirror distance**: sweep a hand sideways to change looks, or hover a hand over the on-screen **Prev / Next / Save / Snap** air buttons for 0.9 s to press them. These are whole-arm gestures, because finger pinches aren't reliable from 1.5–2 m away. Mouse, touch and arrow keys work too.
- **Style comparison**: capture snapshots, pick two and view them side by side, then save the winner.
- **Complete the look**: explainable pairing suggestions (bottoms and shoes) based on the top's lightness, plus "you might also like".
- **8 pieces × 3 colourways** with fabric, fit and ₹ prices. Saved looks persist in local storage.

## Honest limits

This is a 2D approximation for style and colour. Real drape, fabric physics and accurate sizing can't be inferred from pose landmarks alone, and the app says so next to every product.

## Run

```bash
npm install
npm run dev     # http://localhost:5173
npm test        # body mapping, air controls and pairing rules
npm run build
```

Stack: Vite, TypeScript, Three.js (orthographic deformable meshes), MediaPipe Tasks Vision (Pose Landmarker lite, bundled locally), Canvas 2D for the garment textures and mannequin.
