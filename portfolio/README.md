# Ram · A road trip across Tamil Nadu

Thulasiram K.'s (Ram) portfolio as a 3D road trip. Scrolling drives a yellow and black auto-rickshaw from Chennai to the Pamban bridge. Each section of the portfolio is one stop on the way, and the day passes as you go: sunrise, noon, sunset, night.

| Stop | Section | Landmarks | Time |
| --- | --- | --- | --- |
| Chennai | Hero | Marina Beach, the lighthouse, Chennai Central | Sunrise |
| Mamallapuram | About (photo, bio, stats, skills) | Shore Temple and the five rathas in Pallava style, carved rock wall, balanced boulder | Noon |
| Thanjavur | Projects | Periya Kovil (Brihadeeswarar): the 13-tier vimana with its octagonal cupola and gold kalasam, Keralantakan and Rajarajan gateways, the Nandi mandapam, halls and cloister | Noon |
| Madurai | Experience (timeline, awards) | Meenakshi-style gopurams with shrine parapets, lit windows and lamps | Dusk |
| Rameswaram | Contact | Pamban bridge with lift-span towers, the old rail bridge, boats, island temple | Night |

## What's in it

- **The trip:** Three.js scene, GSAP ScrollTrigger and Lenis smooth scroll. The middle of each section is pinned to its stop, so a landmark arrives with its text.
- **Driving, not teleporting:** the auto accelerates, brakes and has a top speed, so a hard flick of the wheel becomes a short drive. Wheel steps are gentle, each stop has plenty of scroll room, and when you stop scrolling near a stop the page glides the rest of the way. The camera follows with a little lag, leans into bends, rises to frame each landmark, drifts slowly while parked, and follows the mouse (parallax).
- **The auto:** reacts to scroll speed. Wheels spin, the body pitches and rattles, exhaust puffs, the headlight comes on at night, and a small engine sound rises with speed.
- **Cinematic look (desktop):** physically based materials lit by the sky itself (image-based lighting), granite with relief maps, ambient occlusion, soft sun shadows, distance haze, a reflective sea, bloom on real light sources, and a colour grade that ties each time of day to one palette, plus vignette and grain. Clouds take the colour of the sky, and birds fly by day. Leafy coconut palms, and an auto with clear-coated paint, chrome, real tyres and a TN number plate.
- **Loading screen:** a 000–100 counter driven by real build steps, a small auto beside it, a kolam that draws itself as the loading line, a Start button, and the note "Turn your sound on / Switch to desktop". Pressing Start unlocks sound.
- **Hero:** name, and a typing animation for the role.
- **Auto Dash mini game:** ride an auto or a bike, dodge buses, lorries, cars, taxis, other autos and the odd cow, and collect filter coffee. It has a score, coffee count, best score and restart, and works with arrow keys, swipes or taps.
- **Tamil touch:** an English / தமிழ் toggle (Noto Sans Tamil, bundled), temple gold, deep maroon, sea blue and kolam white, kolam section dividers, and soft veena-style music (raga Mohanam over a drone) with a sound button.
- **Motion:** power3.out easing throughout, text that slides up and fades in, a custom cursor that grows on hover, hover motion on every button and card, and a kolam curtain for page transitions between stops.
- **Cookie banner:** Accept or Reject. Analytics loads only after Accept. Set `VITE_PLAUSIBLE_DOMAIN` when building to enable Plausible; without it nothing is loaded at all.
- **Personal:** Ram's photo, bio, education, stats (LeetCode 1826, top 7%), skills, experience timeline (Presidio, Amazon ML Summer School, Cloud Computing Intern), awards and a resume link. These come from his resume and GitHub READMEs.
- **Phones and speed:** phones get a lighter scene. That means fewer palms, lamps, particles and clouds, no shadows, no reflections, no post-processing, half-size textures and a lower pixel ratio. Resolution also drops automatically if the frame rate sags. Browsers without WebGL get a clear message and the full content (and the game) without 3D. The 3D code loads as a separate chunk behind the loading screen.

## Real 3D models (optional)

The landmarks and the auto are built in code. They look architectural, but they can't look photoreal, and no free, accurately licensed models of these exact places exist today. Any real model you add replaces the hand-built one automatically:

1. Put the `.glb` file in `public/models/`, compressed: `npx gltfpack -i in.glb -o public/models/thanjavur.glb -cc` (WebP textures: `npx @gltf-transform/cli webp public/models/thanjavur.glb public/models/thanjavur.glb`).
2. List it in `public/models/models.json`:
   ```json
   { "thanjavur": { "file": "thanjavur.glb", "rotateY": 90, "credit": "Model name by Author, CC BY 4.0 (link)" } }
   ```
   The slots are `chennai-lighthouse`, `chennai-central`, `shore-temple`, `thanjavur` (the vimana), `madurai` (main gopuram) and `auto`. Each model is scaled to the real size, set on the ground and centred. Use `rotateY`, `scale` and `offset` to adjust. Credits appear in the footer, as CC BY licences require.

Paid options exist, for example a [Shore Temple](https://www.cgtrader.com/3d-models/architectural/floor/mamallapuram-shore-temple-0b26d8e0-da83-4355-8cfa-bb6ddfa545b2) on CGTrader, generic [gopurams on Fab](https://www.fab.com/listings/7956d40a-869a-4373-8e1c-3d198bfe3d2e) and [auto-rickshaws on CGTrader](https://www.cgtrader.com/3d-models/vehicle/other/tuk-tuk-auto-rickshaw). Photogrammetry of your own (for example with a phone scanning app) is another route.

## Quality switches

- `?quality=low` or `?quality=high` overrides the automatic choice (phones get low).
- On slow machines the site drops ambient occlusion first, then lowers the resolution. `?fixed` turns that off.

## Assets and licences

Every model, texture and sound is made in code: models from shapes and turned profiles, textures painted on canvases at 512 px or smaller (with relief maps generated from them), sound synthesised with the Web Audio API. The photo is Ram's own, from his portfolio repository. Nothing is downloaded or copied from other sites. The fonts (Noto Sans Tamil, Fraunces, DM Sans) are open-source (SIL Open Font License) and bundled via Fontsource.

## Edit the content

Everything you read on the site is in `src/content.js`, in English and Tamil. ArkaOS, TRX-AI, StudyFlow AI and VARA use their real READMEs and repositories. CreditGuard AI and RECALL X have no public repository yet, so their lines are drafts and their links search your repositories. The email address and resume link are set there too.

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # scroll mapping, time of day, kolam, game rules, content
npm run lint
npm run build      # outputs dist/
```

## Files

```
src/main.js          start-up: loader, scene, scroll, language, sound, game
src/content.js       all text (English and Tamil) and links
src/scroll.js        Lenis + ScrollTrigger, text reveals
src/mapping.js       scroll position → place on the road
src/loader.js        000–100 counter, kolam line, Start
src/audio.js         engine, veena music, game sounds (Web Audio)
src/game.js          Auto Dash drawing and controls
src/gameLogic.js     Auto Dash rules (tested)
src/i18n.js          English / Tamil switching
src/cursor.js        custom cursor and hover motion
src/transition.js    kolam curtain between stops
src/cookies.js       consent banner and analytics loader
src/kolam.js         kolam SVG patterns
src/scene/           the 3D world: route, sky, timeline, auto, world, post-processing, models (optional GLB slots), landmarks/
```
