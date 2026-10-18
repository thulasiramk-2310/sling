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
| Thumbs up · peace · rock (held) | Macros: play/pause, mute, ±10 s, scroll to top, reload, next/previous tab |

## What makes it reliable

- **Smart intent**: the cursor anchors on the knuckles, which barely move when you pinch. Motion is also damped as the fingers close, and a click lands where the pinch *started*, so aiming and clicking don't fight each other.
- **Pose debouncing and hysteresis**: poses must hold for 3 frames, pinch uses separate on/off thresholds, and holds (wake, pause, macros) reset if the hand moves.
- **Snap to targets**: the cursor is pulled onto nearby buttons and links, and a snapped click hits the element's center.
- **Dwell to click**: optional. It clicks after hovering still over a clickable element, with no pinch needed.
- **Tunable**: sensitivity, smoothing, scroll speed, cursor size and dwell time, plus per-pose macros.

## Extension architecture

```
offscreen.html  ── webcam + HandLandmarker + GestureEngine ──► frames (~30 fps)
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
npm test                  # gesture engine unit tests (synthetic hands)
npm run build             # site → dist/
npm run build:extension   # extension → dist-extension/
```

Load the extension in `chrome://extensions`: turn on Developer mode, choose **Load unpacked** and select `dist-extension/`.

## Limits

- Browsers keep extensions inside web pages. GestureOS can't move the system cursor, control other apps or run on protected pages (`chrome://`, the Web Store). Whole-computer control would need a native desktop helper.
- Synthetic events can't trigger native HTML5 drag-and-drop or CSS `:hover`. GestureOS draws its own hover highlight instead.
- Pages that call `setPointerCapture` on synthetic pointers may ignore drags.
