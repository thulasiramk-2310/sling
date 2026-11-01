# Original Nandi anatomy revision

This pass replaces the unstructured head/muzzle union with a sloping bridge,
separate lower jaw and recessed mouth. The broad muzzle is retained. Raised
almond eye surrounds, curved horn roots, folded knee/lower-leg/hoof volumes,
three neck cords and two bead rows are modeled geometry. No photo is used as
an application texture or traced surface. Horn-tip curvature remains an
interpretation, not a historically verified reconstruction.

Primary visual research: original photographs by
[Narsi88](https://commons.wikimedia.org/wiki/File:Narsii_-_Thanjavur_Big_Temple_Nandi(Bull).JPG)
(CC BY-SA 3.0), and Richard Mortel's
[front](https://www.flickr.com/photos/prof_richard/23644812478/) and
[side](https://www.flickr.com/photos/prof_richard/36827882033/) photographs
(CC BY 2.0). Research copies and source/license metadata remain outside the
application and release archives. These photographs informed the broad muzzle,
long bridge, raised eye sockets and layered neck ornaments.

The mouth cut originally disappeared between field samples, including on the
phone mesh. A real-mesh raycast regression now verifies that its mouth surface
lies at least 8cm behind the upper muzzle in both detail levels. Winding is
checked after transforming and normalizing the actual rendered geometry.
Neck cords taper across the chest to avoid floating above its surface.

Small rooftop bulls share the nearby geometry. Their proxies now retain the
same height envelope, and detailed roof ornaments are reserved for projected
heights of at least 30 CSS pixels. Their instance placement/count and the hero
sculpture's geometry selection remain covered by existing regression tests.
The hero meshes contain 19,856 desktop and 5,276 phone triangles. This adds
artwork; it is not a claim of free detail or measured FPS improvement.

132 tests across 28 files, oxlint and the production build pass. The accompanying
reports cover four Nandi poses at each viewport, rather than a fresh whole-trip
or native-input run. The overall above-9/10 goal remains unproven: proportions,
ear cavities, carved ornament and surface finish still need visual refinement.

The independent final review finds the muzzle, mouth separation, horns and
necklace more recognizable, especially on phone. No new clipping, floating
ornament or terrain intrusion was observed in the eight frames. Remaining
limitations: subdued facial features, rounded paw-like leg forms, weak shoulder
and cheek definition, and desktop lighting that hides much of the new detail.
This revision does not establish a 9/10 result.

## Folded legs and desktop readability

The next revision reduces round knee bulges and tucks the lower legs back toward
paired flattened hoof volumes. Their physical split survives the low-resolution
phone field. The meshes now contain 20,288 desktop and 5,460 phone triangles.
A desktop-only local bounce approximation (8cd,12m range) lifts the shaded face
without adding a shadow pass; it fades with the night factor. It adds lighting
work, and no FPS improvement is claimed. Phones retain the existing lighting.

The independent eight-frame review accepts the controlled nose highlight and
improved face/necklace readability. Hoof splits are visible, with no observed
floating pieces. Anatomy and fine facial definition remain simplified. 132 tests,
oxlint and build pass; current targeted reports are in verification/*-nandi-hooves-light.json.
