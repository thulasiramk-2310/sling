# Chennai forecourt framing

The left verandah now turns toward the arrival with a short, single-storey
garden return. Its six existing two-storey bays move forward 6.4m; two lower
bays complete the corner. The right wing, station, camera, character, vehicle
and scroll route retain their existing placement.

The return uses the original street geometry with actual portico columns,
shutters, trim and roof volumes. It shares the existing finish materials and
instances its repeated bays. This is an authored forecourt in the compressed
journey, not a surveyed addition to Chennai Central.

The building stays outside the central approach and between the existing
garden rows. Its threshold meets the side walkway at z=14.35 without coplanar
overlap. The existing tire/curb clearance test exercises the updated plaza
through 8,001 departure poses with all three wheel supports.

Matched desktop/phone review rejected a two-storey return because it masked
Central's lower-left façade. The lower version gives the forecourt a clearer
boundary while preserving the station towers, central entrance, avatar, auto,
reading text and visible departure route. Independent review accepts this
bounded improvement. The composition remains mostly frontal and the ground
still feels broad; this does not establish a deep enclosed square or the
requested whole-site score above 9/10.

Final verification covers ten arrival, walking, introduction, boarding and
departure views per viewport, plus both loaders. Current browser reports are
`verification/desktop-forecourt-framing.json` and
`verification/phone-forecourt-framing.json`. Tests, lint and production build
pass. These are software WebGL stills; hardware frame rate and real-time motion
quality remain unverified. The 42 native interaction checks from commit
9053bd9 are historical evidence; this pass changes environment geometry only.

At the introduction pose, primary geometry rises from 565,720 to 567,880
triangles on desktop and 167,664 to 169,824 on phone. Submitted draw calls
rise from 880 to 900 and 147 to 153 respectively. This is an explicit cost of
the separately instanced lower geometry, not evidence of an FPS improvement.
