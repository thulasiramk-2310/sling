# Original asset inventory

Every default model, surface map, motif and sound is built in `src/` at runtime. No model, photograph, texture, music, layout code or branding from another portfolio is copied.

- `world/landmarks.js`: lighthouse, Chennai Central interpretation, Shore Temple, rathas, Periya Kovil complex, Madurai gopurams, Pamban bridge, island gateway.
- `world/geometry.js`: original material batching and authored rickshaw/bike assembly.
- `world/environment.js`: road, palms, boats, neighborhood, water normal texture and sky environment.
- `world/materials.js`: local Canvas-generated material maps.
- `ui/app.js`: code-authored kolam SVG, no external motif asset.
- `audio/veena.js`: original Karplus–Strong plucked-string synthesis; not a recorded performance or a claim of authentic veena acoustics.
- `game/`: original Auto Dash mechanics and 3D scene.

Renderer utilities (Water, Sky, geometry merging and postprocessing) come from Three.js under its MIT license. The site uses GSAP and Lenis dependencies under their respective package licenses. Local fonts are unmodified Noto Serif Display, Noto Sans Tamil and Liberation Sans; included font license files accompany them.

Architectural references were used for interpretation only:

- DGLL Chennai lighthouse: https://www.dgll.nic.in/DGLL-light-house-location/about-chennai/chennai-lighthouse
- Shore Temple, Incredible India: https://www.incredibleindia.gov.in/en/tamil-nadu/mamallapuram/shore-temple
- Periya Kovil, Thanjavur District: https://thanjavur.nic.in/tourist-place/big-brihadeeshwara-temple/

Optional replacement models belong in `public/models/` and are configured in `src/content/models.js`. Record each model's source and license in its manifest entry. No replacement is fetched by default. Personal photo and resume are not supplied and are not fabricated.
