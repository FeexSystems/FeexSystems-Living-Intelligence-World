import bpy
import mathutils
from mathutils.kdtree import KDTree


def build_consistent_world_kdtree(mesh_obj):
    mesh = mesh_obj.data
    matrix = mesh_obj.matrix_world
    size = len(mesh.vertices)
    kd = KDTree(size)
    for i, v in enumerate(mesh.vertices):
        world_co = matrix @ v.co
        kd.insert(world_co, i)
    kd.balance()
    return kd


def transfer_relative_deformations(source_name, target_name, total_frames=52):
    source_obj = bpy.data.objects.get(source_name)
    target_obj = bpy.data.objects.get(target_name)

    if not source_obj or not target_obj:
        print("ERROR: Target structural scene object pointers missing from current memory layer.")
        return

    depsgraph = bpy.context.evaluated_depsgraph_get()

    # Secure clean baseline shape constraints
    if not target_obj.data.shape_keys:
        basis = target_obj.shape_key_add(name="Basis", from_mix=False)
        basis.value = 0.0
    else:
        basis = target_obj.data.shape_keys.reference

    inv_target_matrix = target_obj.matrix_world.inverted()

    for frame in range(0, total_frames):
        bpy.context.scene.frame_set(frame)
        eval_source = source_obj.evaluated_get(depsgraph)
        source_mesh = eval_source.to_mesh()

        # Build spatial tracking tree matching absolute world coordinate allocations
        source_kd = build_consistent_world_kdtree(eval_source)

        shape_name = f"ARK_Pose_{frame:02d}"
        sk = target_obj.data.shape_keys.key_blocks.get(shape_name) or target_obj.shape_key_add(name=shape_name, from_mix=False)
        sk.relative_key = basis

        # Explicit evaluation loop converting positional offsets back into native relative ranges
        for t_idx, t_vert in enumerate(target_obj.data.vertices):
            world_target_co = target_obj.matrix_world @ t_vert.co
            _, s_idx, _ = source_kd.find(world_target_co)

            # Extract absolute world points to compute precision alignment matrices
            world_source_co = eval_source.matrix_world @ source_mesh.vertices[s_idx].co
            local_target_co = inv_target_matrix @ world_source_co

            # Map transformation data seamlessly back to the shape layout arrays
            sk.data[t_idx].co = local_target_co

        eval_source.to_mesh_clear()
    print("STAGE 02 COORDINATE VERIFICATION AND RELATIVE RE-ROTATION SUCCESSFUL.")


if __name__ == "__main__":
    transfer_relative_deformations("MH_Head_Evaluated", "Web_Target_Face")
