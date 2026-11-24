"""
STAGE 02 VALIDATION: Morph delta range verifier.

Runs inside Blender (-b -P) against the assembled scene to verify that every
transferred shape key stays within anatomically plausible delta bounds before
the GLB export stage consumes the mesh.

Checks:
  1. Shape key count matches the ARKit-52 frame matrix.
  2. No NaN / infinite vertex coordinates in any key.
  3. Per-vertex positional delta from Basis stays under MAX_DELTA (meters).
  4. Dreadlock card vertices remain anchored (delta below HAIR_MAX_DELTA).

Usage:
  blender -b assembled.blend -P validate_morph_deltas.py
Exit code 0 = pass, 1 = fail.
"""

import bpy
import sys
import math

EXPECTED_KEY_COUNT = 52
MAX_DELTA = 0.05          # 5cm — generous upper bound for facial morphs
HAIR_MAX_DELTA = 0.02     # 2cm — hair cards should track, not fly
HAIR_NAME_TOKENS = ("dread", "hair", "loc")


def vertex_group_names(obj):
    return {g.name.lower() for g in obj.vertex_groups}


def is_hair_vertex(obj, vert_idx):
    names = vertex_group_names(obj)
    if not any(tok in n for n in names for tok in HAIR_NAME_TOKENS):
        return False
    for g in obj.vertex_groups:
        if any(tok in g.name.lower() for tok in HAIR_NAME_TOKENS):
            for v in g.index.values():
                if v.group == g.index and v.vertex_index == vert_idx:
                    return True
    return False


def validate_shape_keys(target_name):
    obj = bpy.data.objects.get(target_name)
    if not obj:
        print(f"FAIL: object '{target_name}' not found")
        return False

    if not obj.data.shape_keys:
        print(f"FAIL: '{target_name}' has no shape keys")
        return False

    keys = obj.data.shape_keys.key_blocks
    morph_keys = [k for k in keys if k.name != "Basis"]

    failures = []

    if len(morph_keys) != EXPECTED_KEY_COUNT:
        failures.append(
            f"key count {len(morph_keys)} != expected {EXPECTED_KEY_COUNT}"
        )

    basis = keys.reference
    basis_verts = basis.data

    for key in morph_keys:
        for i, pt in enumerate(key.data):
            co = pt.co
            if any(math.isnan(c) or math.isinf(c) for c in co):
                failures.append(f"{key.name} vert {i}: NaN/Inf coordinate")
                continue

            base = basis_verts[i].co
            delta = (co - base).length

            limit = HAIR_MAX_DELTA if is_hair_vertex(obj, i) else MAX_DELTA
            if delta > limit:
                failures.append(
                    f"{key.name} vert {i}: delta {delta:.4f}m exceeds {limit}m"
                )

    if failures:
        print(f"VALIDATION FAILED — {len(failures)} violation(s):")
        for f in failures[:50]:
            print(f"  - {f}")
        if len(failures) > 50:
            print(f"  ... and {len(failures) - 50} more")
        return False

    print(f"VALIDATION PASSED: {len(morph_keys)} morph keys within delta bounds.")
    return True


if __name__ == "__main__":
    ok = validate_shape_keys("Web_Target_Face")
    sys.exit(0 if ok else 1)
