# sling

A collection of interactive 3D and motion-controlled web experiences. Each project is self-contained in its own folder with its own `package.json`.

| Project | What it is |
|---|---|
| [`orbit/`](orbit) | **ORBIT**: explore the solar system with bare-hand gestures through your webcam (MediaPipe hand tracking + React Three Fiber), with a mouse fallback. |
| [`calibre/`](calibre) | **CALIBRE**: a working mechanical watch movement in 3D, with real gear ratios, an exploded view and a guided tour of the power flow. |
| [`gestureos/`](gestureos) | **GestureOS**: a touch-free mouse for any website. A Chrome extension and a playground site that share one on-device gesture engine (pinch to click, two fingers to scroll, macros, dwell clicking). |
| [`motionfit/`](motionfit) | **MotionFit**: a virtual fitting room. Garments follow your shoulders, hips and arms via on-device pose tracking, with swipe and air-button shopping, snapshot comparison and outfit pairing. |
| [`portfolio/`](portfolio) | **Ram · Tamil Nadu road trip**: a 3D portfolio. Scrolling drives an auto-rickshaw from Chennai to the Pamban bridge as the day turns to night, with English/Tamil, kolam motifs, synthesised veena music and an Auto Dash mini game. |

Run any project:

```bash
cd <project>
npm install
npm run dev
```
