# Sculpture review — 20 October 2026

The Kanyakumari figure was previously a radial lathe body with a spherical head,
cone beard and a hand arrangement that disagreed with the visual reference. The
replacement is an original procedural study with a continuous shaped torso and
robe, shallow cloth relief, a profiled head and beard, visible feet, a chest-height
three-finger gesture and the manuscript in the other hand. Close-up WebGL review
rejected two intermediate versions: attached tube folds and separate chest
volumes looked artificial. Those features were integrated into the body surface.

Reference: [Kanniyakumari District administration — Thiruvalluvar Statue](https://kanniyakumari.nic.in/thiruvalluvar-statue/).
The district's photograph was used for visual study only and is not bundled.
Its dimensions inform the approximately 12m pedestal and 29m figure. This is
not a scan, an exact reconstruction or a photorealistic asset. The reference
site's artwork is not used.

The pedestal now has recessed bays, carved pillars and projecting cornices;
its repeating details use three instanced meshes. The statue is merged into one
draw mesh. A geometry test verifies finite positions/normals, its dimensions and
a maximum of 80,000 triangles. This budget is not an FPS measurement.

Low-quality gopurams previously populated only two sides. They now place figures
on all four sides with wider spacing. The recently corrected crown dimensions
are retained.

`node scripts/review-sculpture.mjs desktop`, `phone`, or `studio` captures the
current local build via a task-owned Chromium CDP connection on port 9224 and
Vite on port 5174. Outputs are saved to the workspace's `review-sculpture/`.
The script uses explicit scene inspection positions for visual review; it does
not test real scrolling, measure performance, or establish a whole-site rating.

The memorial was subsequently rebuilt from the [district memorial reference](https://kanniyakumari.nic.in/tourist-place/vivekananda-mandapam/): a raised rocky platform, long hall, recessed side bays, taller ribbed dome, corner pavilions, front stair and separate lower hall. These are original modeled interpretations; precise historical dimensions and every carving are not reproduced. Static architecture is batched by the existing world batching system.

Phone review rejected the reduced figure density on the temple's front. Its
original spacing was restored while retaining all four populated sides. The
coastal portrait lens was widened, then the camera moved slightly closer after
the existing auto-size regression caught a readability loss. All 56 tests pass
with the corrected camera. No camera-size assertion was weakened.

Desktop and phone landmark captures are visual inspection frames, not a full
scroll or interaction regression. The procedural sculpture, repetitive temple
detail, empty surroundings and uneven lighting still fall short of the reference.
This pass does not establish a whole-site score above 9/10 or measured hardware
GPU performance.

Final capture pass: 1440×900 high quality and 390×844 low quality completed for
Thanjavur, Madurai and Kanyakumari with no recorded JavaScript exceptions or
horizontal overflow. Both island buildings and the auto remain visible in the
portrait coastal shot. Vitest: 56 passed; oxlint and production build passed.
The statue studio mesh contains 73,556 triangles in one draw call. The staged
studio count excludes the rest of the world and its shadow/effect passes.
