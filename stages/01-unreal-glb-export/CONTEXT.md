# STAGE 01 CONTRACT: UNREAL ENGINE CINEMATIC ARKIT EVALUATION MATRIX

## OBJECTIVE
Assemble a transient Level Sequence targeting the active MetaHuman face skeletal hierarchy. Explicitly step through frames 0–51, isolated to discrete keyframes. Map each index to its respective target ARKit curve, inserting a keyframe at absolute maximum intensity (1.0) while zeroing out concurrent pose tracks. This forces native evaluation of face bones, corrections, and eyes.

## OUTPUT TARGETS
- Transient baked skeletal animations containing native RigLogic vector data.
- Absolute verification of jaw, eye, and lip extreme deformations.
