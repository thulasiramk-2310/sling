# Coastal reveal and bridge passage

The original aerial sky greeting is retained. A lower coastal establishing beat
at story .09 now shows the full Marina-inspired lighthouse, bridge foreground
and shoreline/city behind. Desktop and portrait use distinct compositions. The
camera then approaches through the original bridge aperture and reaches the
existing parked introduction. The .172 framing beat was previously immediately
beside the exit arch; it now shows successive arch planes before passing through.

The flight pace is reduced across story .05–.18. A sustained end-scroll request
takes between six and twelve simulated seconds over that interval. This is a
source-level timing proof, not a measured real-time browser frame rate. All
six reading stops, their scroll bands and reverse navigation remain intact.

The bridge's original arch profiles now extrude through the full 8.1m depth,
replacing twelve thin arch-face instances with six solid arch instances. This
creates continuous curved soffits and solid piers using the same profile.
An intermediate overlapping liner was rejected after visible seam inspection.
Actual geometry raycasts check the clear centre aperture and circular underside,
including its modeled 0.13m bevel. Lighthouse projection tests check both
viewports at readable scale. Portrait arrival overrides are located by story
key rather than array index so inserted flight keys cannot retarget the character.

The independent matched-still review accepts the improved coastal composition
and bridge framing. The final solid-vault review finds the horizontal slot and
intermediate spandrel removed. This does not establish reference parity or a
new whole-site score. Uniform pale atmosphere, the sparse arrival landscape and
portrait content/world separation remain substantial craft gaps. The supplied
full reference MP4 is still absent; review uses the extracted reference sheets.

Next lighting investigation: source analysis finds approximately 34m of the 74m
bridge span outside the current ±110m directional shadow map because its target
is the parked auto plus 30m tangent. A fixed bridge anchor during opening should
be tested before palette changes. Phone has shadows disabled, so a separate,
road-bounded dawn atmosphere trial is needed there. Keep the parked opening's
road-domain clock coherent and preserve noon/sunset/final-dawn states.

Final validation: 136 tests in 29 files, oxlint and production build pass. The
final build passes 42 native interaction checks and 14 matched desktop/phone
opening views, plus both loaders. Native inputs use reduced motion on software
WebGL; no real-time smoothness or hardware-GPU FPS claim is made.
