# MotionFit

A virtual fitting room in the browser. Stand in front of your laptop camera and garments follow your body: the torso tracks your shoulders and hips, and each sleeve bends with your upper arm and forearm. Pose detection runs on-device with MediaPipe Pose Landmarker, so no video is uploaded. With the camera off, a mannequin models the clothes so the whole experience still works.

## Features

- **Live outfit preview**: procedurally painted garments (stripes, oxford, flannel check, denim, rib knit) are mapped onto a deformable mesh. The torso bilinearly fits the shoulder–hip quad, and the sleeves follow the shoulder → elbow → wrist chain with a soft bend at the elbow. If the hips are out of frame (common on laptops), they're estimated from the shoulder line.
- **Gesture shopping at mirror distance**: sweep a hand sideways to change looks, or hover a hand over the on-screen **Prev / Next / Save / Snap** air buttons for 0.9 s to press them. These are whole-arm gestures, because finger pinches aren't reliable from 1.5–2 m away. Mouse, touch and arrow keys work too.
- **Style comparison**: capture snapshots, pick two and view them side by side, then save the winner.
- **Complete the look**: explainable pairing suggestions (bottoms and shoes) based on the top's lightness, plus "you might also like".
- **8 pieces × 3 colourways** with fabric, fit and ₹ prices. Saved looks persist in local storage.
- **Size advisor**: height, weight and fit preference give a recommended size per garment (slim cuts lean a size up, boxy ones down). It flags between-size cases with both options, explains its reasoning, and refines the estimate with your shoulder-to-torso ratio when the camera can see your hips. A size chart highlights your size.
- **Layering**: jackets and overshirts can be worn open over a tee, polo or shirt. The outer garment is repainted with an open front, and the inner layer renders underneath.
- **Background**: Room, Blur or Studio, using Pose Landmarker's person segmentation mask (no extra model).
- **Bag and checkout**: sizes, quantities, free delivery over ₹1,999, a validated delivery form (6-digit PIN, phone, email) and an order confirmation. It's clearly labelled as a demo: no payment is taken.
- **Share card**: a 1080×1350 image of the look with names and prices, downloadable or shared through the system share sheet.
- **Try on anything from a link**: paste an Amazon, Flipkart, Myntra or AJIO product link (app share links like `amzn.in/d/…` and `fkrt.it/…` work, even with the share text around them), or a link from most other stores. The local server reads the page's photos, name and price (the Amazon gallery, Flipkart images, schema.org Product data, then Open Graph tags) and requests full-size images. You pick a photo from the product gallery and it's on you.
- **Or a photo, a paste, a drop**: choose a saved image, press Ctrl+V after **Copy image** on any store, or drag a photo or link onto the page.
- **Automatic fit points**: if a model is wearing the garment, Pose Landmarker finds their shoulders, elbows, wrists and hips. It places the six fit points from those, cuts the model out with the person mask, and keeps only the collar above the shoulder line (not the model's neck or hair). Flat-lay photos are fitted from the garment's outline instead. Sleeve length and category come from the product title, and you can nudge any point.
- **Your photo as the mirror**: no camera, or want the sharpest result? Use a full-length photo of yourself and try every look on it.
- **Stays on the body**: the camera frame is copied at the moment it's measured and drawn with its own landmarks, so the garment never trails a frame behind you. Frames are processed once each via `requestVideoFrameCallback`.
- Uploaded garments are warped into the same torso and sleeve texture layout as the built-in pieces and get soft side shading so they read as cloth, not a sticker. The backdrop is removed by an edge-in flood fill, so white prints and white shirts survive. Printed text is pre-flipped so it reads correctly in the mirror. Everything is stored in IndexedDB.

## Built around what shoppers expect

- **Trust before the camera opens**: a short explainer (stays on device, where to stand, download size, how to stop) appears before the browser's permission prompt, and the model download shows real progress.
- **Looks worn, not pasted**: garments are tinted to the room's brightness and colour cast from the camera, and cast a soft shadow on the body.
- **Sizing is never hidden**: the size guide link sits on every product next to the size buttons. Delivery date, free-delivery threshold, returns and care sit right by the buy buttons.
- **Larger photos**: the front flat-lay plus collar and fabric close-ups.

## Honest limits

This is a 2D approximation for style and colour. Real drape, fabric physics and accurate sizing can't be inferred from pose landmarks alone, and the app says so next to every product.

Product links need the bundled server (`npm run dev` or `npm run preview`). Browsers can't read another store's page or pixels themselves. The server only fetches public addresses, re-checks every redirect hop, and only relays images. Stores sometimes answer automated requests with a robot check. When that happens, the app says so and offers Copy image → Ctrl+V, which always works. On static hosting the same fallback is shown.

## Run

```bash
npm install
npm run dev     # http://localhost:5173
npm test        # body mapping, air controls, pairing, size advisor, bag, link parsing, pose fit points, address guard
npm run build
```

Stack: Vite, TypeScript, Three.js (orthographic deformable meshes), MediaPipe Tasks Vision (Pose Landmarker lite, bundled locally), Canvas 2D for the garment textures and mannequin.
