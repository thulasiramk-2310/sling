# Thiruvalluvar revision — 24 October checkpoint

The [25 October structural follow-up](coastal-limbs-review.md#25-october-structural-follow-up) supersedes the geometry counts and visual findings below.

Ram rejected the earlier statue's appearance. This revision replaces detached
facial parts with one original implicit carving and makes the figure readable
during the actual scroll journey. It does not establish realistic likeness or
the requested whole-site rating above 9/10.

The [district's frontal photograph](https://cdn.s3waas.gov.in/s38fe0093bb30d6f8c31474bd0764e6ac0/uploads/2024/11/2024112139.jpg)
was used for visual study. No photograph, scan or downloaded mesh is bundled.
The new geometry is generated in `src/scene/landmarks/poet-head.js` and assembled
in `poet-statue.js`.

## Changes

- Fused head, ears, nose, eye sockets, moustache, beard and tied hair into one
  sampled surface. Reduced the earlier exaggerated brow and hair bulge.
- Lowered the raised gesture to match the reference more closely, extended the
  beard and ear lobes, broadened the body, varied the two fold families and added
  a curved hanging cloth border. These remain artistic approximations.
- Added original object-space stone courses, tone variation and restrained
  grain. Screen-space filtering reduces subpixel seam/grain contrast.
- Fixed a clipped hair-knot cap, near-zero-area triangles and an offset cloth-cap
  center. Preserving native marching-cubes winding removes isolated face flips;
  position-welded, area-weighted normals preserve smooth surface lighting.
- Added a scroll-controlled approach after the Kanyakumari reading hold and
  before the sky ascent. The existing contact hold and six destinations remain.
  Actual-geometry projection tests require more than 450px statue height on
  desktop and 250px on phone during this approach.

## Evidence

The complete figure contains 125,764 desktop / 76,561 phone triangles in one draw
mesh. The head uses a finer 112-cell desktop field (70,334 triangles) and retains
the 72-cell phone field (28,875 triangles). This deliberately increases desktop
detail; the tests enforce separate 130k / 80k figure budgets and require the
phone mesh to remain materially smaller. These counts are not frame-rate proof.
Both head meshes have finite unit normals, one connected component, zero inverted or
collapsed faces, and zero shared-edge orientation disagreements in the reviewed
CPU audit. Tiny boundary edges remain; this is not a watertight fabrication mesh.

Vitest passes 65 tests. Oxlint and the production build pass. Native browser
interaction runs pass 16 checks each at 1440×900 and 390×844, with no recorded
exceptions or layout overflow. They include six sequential scroll arrivals,
reading holds, final ascent, actual project raycasting, keyboard focus, language,
game controls and actual WebGL context loss. They use reduced motion, so they
do not prove continuous normal-motion timing.

Studio evidence includes front, both angled views, side silhouette and facial
close-up. Desktop and phone ending captures are saved in the workspace's
`review-sculpture/`. The standalone studio page avoids loading a second full
world behind the sculpture preview. Capture scripts also record console errors,
including shader failures, in addition to exceptions. Two earlier renderer
reloads crashed; replacement captures use a fresh isolated browser.

All browser runs use software WebGL. No hardware FPS claim is made.

## Remaining visual failures

The independent review still sees a stylized sage rather than a convincing
reconstruction: smooth forehead/hair, indistinct eyes, repetitive beard relief,
cylindrical lower drape and separate-looking arm/hand joints. The surrounding
islands, foam and lighting also remain simplified. Its inspected sculpture
presentation was approximately 5.5–6/10 before the final normals and desktop
sampling refinement. Neutral clay comparisons isolate the remaining modeled
form problems from the stone shader; adding polygons alone does not resolve them.
Numerical mesh validity does not resolve those artistic failures.

The repeated native game-focus failure was subsequently addressed by an
explicit launch-button target and a deferred close lifecycle; see the coastal
and limb follow-up for the current browser evidence.

The full portfolio goal remains active and unmet.

The [coastal and limb follow-up](coastal-limbs-review.md) records the latest
arm/hand geometry, island supports, material correction and independent review.
