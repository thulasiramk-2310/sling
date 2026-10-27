# Thiruvalluvar and island revision · 27 October 2026

This follows the product integration commit `1bacc62`. The working route,
readers and input logic are preserved. The original sculpture remains a stylized
architectural interpretation; these changes do not establish realistic likeness
or the requested above-9 visual rating.

## Modeled changes

The shared cloth field now has stronger unequal diagonal gathers, a broader
hanging fall and a clearer knee/supporting-thigh turn. The same deformation
continues onto the overlapping waist wrap. Both source figure bounds remain
unchanged, rather than enlarging the sculpture to fill the frame.

Five curved beard ridges replace the previous parallel lobes. The first candidate
became a flat fan after export and was rejected. The adopted revision deforms the
shared fan directly, with tapered ends and unequal depth. Shallower eye sockets,
rooted eye surfaces and small open recesses replace the earlier empty-looking
sockets. Eyelids and facial likeness remain simplified, especially on the phone mesh.

A separate original island terrace has a chamfered retaining foundation, pale
balustrade, paving joints and a clear entrance. It extends below the water line
and meets the rock shelf. Its two merged meshes total 2,208 triangles. It does not
add runtime lights, textures, individual repeated draw calls or animated geometry.
The final camera now includes more pedestal and island context; its portrait
lens was adjusted to preserve the existing 400px minimum statue-height check.

## Export and geometry proof

The source remains code-authored. Blender 4.5.9 LTS performs voxel union at .025m,
restrained smoothing (.2, two iterations), bounded decimation and explicit
triangulation. Both results have zero nonfinite values, zero boundary/nonmanifold
edges and zero reversed or collapsed triangles in the checked output. All sampled
raised-finger rows retain three separate bands without bridged gaps.

| Model | Source triangles | Finished triangles | GLB bytes |
| --- | ---: | ---: | ---: |
| Desktop | 121,472 | 109,450 | 1,979,832 |
| Phone | 63,010 | 54,724 | 995,292 |

Binary hashes and the four generator-module hashes are recorded in
`public/models/poet-provenance.json`. The previous v5 checkpoint is preserved in
that record. A regression test now checks actual shipped GLB bytes and runtime
source hashes against provenance. Numerical validity does not prove visual quality.

The complete build experiment, rejected first candidate, before/after studio
captures and validation JSON are saved outside the app in
`review-assets/poet-pipeline/2026-10-27-drapery-v6/`. Runtime model files contain
only the accepted finished outputs, with the original mineral shader reapplied
by the loader.

## Visual review and limits

An independent review accepted the high-detail revision as a local improvement:
cloth folds read more clearly, eyes feel less hollow and the beard edge is less
regular. Fresh phone-model studio captures confirmed that these changes survive
decimation without a new gross silhouette, hand, foot or continuity regression.
Older low-detail screenshots were explicitly rejected as evidence for this pass.

This is still a stylized figure. Capsule-shaped upper arms, regular garment
bands, ears, hair and brows limit resemblance. The whole portfolio's simpler
character and open terrain also remain below the supplied reference's asset craft.
Use the [product readiness review](product-readiness.md) and bundled verification
JSON for the actual final runtime checks and hardware-performance limits.
