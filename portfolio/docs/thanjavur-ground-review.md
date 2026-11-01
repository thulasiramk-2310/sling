# Thanjavur ground and Nandi presentation

Actual terrain rays found 344 of 930 courtyard samples above the modeled lawn,
with maximum terrain elevation1.9562m. Bounded grading in the quarter-turned
compound basis now keeps all 930 below the lawn (maximum approximately-.07494m).
The regression additionally samples 153 points along the axial path. Madurai
floor and bridge seabed regression checks remain passing. The smooth green lawn
is intentional; the removed darker triangular patches were terrain intrusion.

Nandi now appears through the open central pavilion bay. Its charcoal finish
uses roughness.55 and a lighter base color to retain detail in shade. An
independent review of eight production views confirms a clear silhouette and
no remaining terrain intrusion or new camera placement defect. The face,
anatomy and ornament are still simplified, and the uniform lawn needs artwork.

131 tests in 28 files, oxlint and Vite build pass. Eight actual WebGL captures
cover entry, approach, detail and exit at 1440px and 390px, with no runtime/shader
errors or horizontal overflow. The fuller frontal view raises phone renderer
triangle submissions at detail from 189,622 to 834,158 and draw calls from 68 to 401.
This is a material rendering-budget regression to address; no FPS gain or
hardware-GPU 60 FPS claim is made. Full-route/native-input reports from earlier
commits are historical rather than re-run for this revision. Overall 9/10
craftsmanship remains unproven.
