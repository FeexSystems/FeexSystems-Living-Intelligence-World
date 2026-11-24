import os
import subprocess
import yaml
import sys


def execute_draco_compilation_pass():
    config_path = "_config/pipeline.yaml"
    if not os.path.exists(config_path):
        print("ERROR: Global configuration manifest missing from target verification workspace.")
        sys.exit(1)

    with open(config_path, "r") as f:
        config = yaml.safe_load(f)

    intermediate_glb = "./docs/characters/feex_sovereign/uncompressed.glb"
    final_output_path = os.path.join(config['paths']['output_dir'], "feex_sovereign.glb")

    if not os.path.exists(intermediate_glb):
        print("ERROR: Source target layout asset binary missing from export queue.")
        sys.exit(1)

    quant = config['optimization']['draco_quantization']

    # Process Draco structural configuration mappings using standard npx compression wrappers
    gltf_pipeline_cmd = [
        "npx", "gltf-pipeline",
        "-i", intermediate_glb,
        "-o", final_output_path,
        "-d",
        "--draco.compressionLevel", "10",
        "--draco.quantizePositionBits", str(quant['position']),
        "--draco.quantizeNormalBits", str(quant['normal']),
        "--draco.quantizeTexcoordBits", str(quant['uv']),
        "--draco.quantizeColorBits", str(quant['color']),
        "--draco.quantizeGenericBits", str(quant['generic'])
    ]

    try:
        subprocess.run(gltf_pipeline_cmd, check=True, shell=True)
        print(f"STAGE 03 COMPILATION PASS COMPLETE. Web deployment asset archived: {final_output_path}")
    except subprocess.CalledProcessError as err:
        print(f"CRITICALERROR: Draco optimization compiler failure encountered: {err}")
        sys.exit(1)


if __name__ == "__main__":
    execute_draco_compilation_pass()
