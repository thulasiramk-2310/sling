# GestureOS

Use any website with your hands. GestureOS turns a webcam into a touch-free mouse: point to move, pinch to click, two fingers to scroll. Everything runs on-device with MediaPipe Hand Landmarker in WebAssembly. No video leaves the computer.

It ships as two things that share one engine:

- **Chrome extension** (`dist-extension/`): drives whichever tab is in front. YouTube, recipes, docs, slides.
- **Playground site** (`dist/`): teaches the gestures with seven hands-on cards and hosts the accessibility settings.

## Gestures

| Gesture | Action |
|---|---|
| Open palm, held still | Wake (activate) |
| Fist, held | Pause |
| Point / move hand | Move the cursor |
| Quick pinch (thumb + index) | Click |
| Pinch and move, or pinch and hold | Drag |
| Two fingers together, up/down | Scroll |
| Fast sideways open-hand sweep | Back / forward |
| Two-hand pinch, pull apart / together | Zoom in / out |
| Thumb to middle finger | Right-click |
| Two quick pinches | Double-click |
| Thumbs up · peace · rock (held) | Macros: play/pause, mute, ±10 s, scroll to top, reload, back/forward, next/previous tab, keyboard |
| Your own recorded poses | Anything above, plus press a key or open a website |

### Head mode (for limited hand mobility)

| Face | Action |
|---|---|
| Move your head | Steer the cursor |
| Open your mouth | Click (hold to drag) |
| Smile and hold | Right-click |
| Raise eyebrows + tilt | Scroll |
| Close your eyes ~1 s | Pause / resume |

## Personalization

- **Calibration wizard**: a 15-second guided routine records your comfortable reach (that area becomes the whole screen) and your natural pinch (that sets the click threshold).
- **Gesture studio**: record up to 15 static hand poses. They're stored as rotation/scale/position-invariant feature templates, recognized for either hand, checked for clashes with your other gestures and the built-in poses, and bound to actions.
- **On-screen keyboard**: large keys, word suggestions, symbols and caret keys. It types into the focused field using real input events, so React and Vue forms update. Open it from the ⌨ button on the status pill or bind it to a gesture.

## What makes it reliable

- **Smart intent**: the cursor anchors on the knuckles, which barely move when you pinch. Motion is also damped as the fingers close, and a click lands where the pinch *started*, so aiming and clicking don't fight each other.
- **Pose debouncing and hysteresis**: poses must hold for 3 frames, pinch uses separate on/off thresholds, and holds (wake, pause, macros) reset if the hand moves.
- **Snap to targets**: the cursor is pulled onto nearby buttons and links, and a snapped click hits the element's center.
- **Dwell to click**: optional. It clicks after hovering still over a clickable element, with no pinch needed.
- **Tunable**: sensitivity, smoothing, scroll speed, cursor size, dwell time and head speed, plus per-pose macros.
- **Video aware**: swiping over a video seeks ±10 s instead of navigating away.
- **Safe actions**: gesture-opened links are restricted to http/https.

## Comfort and trust

- **Low-effort pointer**: trackpad-style acceleration driven by raw hand speed, so the arm can stay low and still ("gorilla arm" is the top complaint with mid-air input). Posture tips and a 20-minute rest reminder are included.
- **Visible responsiveness**: the status pill shows live fps and camera-to-cursor delay, turning amber past ~100 ms, where pointer lag becomes noticeable.
- **Camera explainer** before the browser prompt and a byte-accurate model download progress bar.

## Extension architecture

```
offscreen.html  ── webcam + Hand/FaceLandmarker + Gesture/FaceEngine ──► frames (~30 fps)
     │                                       (paced by a Worker; hidden pages throttle timers)
background.js   ── relays frames to the active tab, tab zoom / switching, Alt+G shortcut
     │
content.js      ── Actuator: shadow-DOM cursor overlay, synthetic pointer/mouse events,
                   scrolling the right container, media macros, history navigation
```

The camera is granted once on the welcome page (a visible extension page). After that the hidden offscreen page can use it.

## Run

```bash
npm install
npm run dev               # playground at http://localhost:5173
npm test                  # engine tests: gestures, head mode, custom poses, calibration, URL safety
npm run build             # site → dist/
npm run build:extension   # extension → dist-extension/
```

Load the extension in `chrome://extensions`: turn on Developer mode, choose **Load unpacked** and select `dist-extension/`.

## Limits

- Browsers keep extensions inside web pages. GestureOS can't move the system cursor, control other apps or run on protected pages (`chrome://`, the Web Store). Whole-computer control would need a native desktop helper.
- Synthetic events can't trigger native HTML5 drag-and-drop or CSS `:hover`. GestureOS draws its own hover highlight instead.
- Pages that call `setPointerCapture` on synthetic pointers may ignore drags.
