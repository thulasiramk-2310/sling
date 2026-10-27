"""Original sculpture union/polish experiment. Requires Blender 4.5+.

blender --background --factory-startup --python scripts/finish-poet.py -- \
  --input /tmp/ram-poet-pipeline/poet-source.glb \
  --output /tmp/ram-poet-pipeline/poet-finished.glb \
  --voxel .025 --triangles 110000

This exports an experiment only. A successful export is NOT visual acceptance.
Run export-poet.mjs --verify and compare studio captures before adoption.
"""
import argparse
import json
import math
import sys
from pathlib import Path

import bpy
import bmesh


def arguments():
    parser = argparse.ArgumentParser()
    parser.add_argument('--input', required=True)
    parser.add_argument('--output', required=True)
    parser.add_argument('--voxel', type=float, default=.025)
    parser.add_argument('--triangles', type=int, default=110000)
    parser.add_argument('--smooth', type=float, default=.2)
    parser.add_argument('--iterations', type=int, default=2)
    return parser.parse_args(sys.argv[sys.argv.index('--') + 1:])


def metrics(obj):
    mesh = obj.data
    mesh.calc_loop_triangles()
    coordinates = [obj.matrix_world @ vertex.co for vertex in mesh.vertices]
    minimum = [min(v[i] for v in coordinates) for i in range(3)]
    maximum = [max(v[i] for v in coordinates) for i in range(3)]
    bm = bmesh.new()
    bm.from_mesh(mesh)
    result = {
        'vertices': len(mesh.vertices), 'triangles': len(mesh.loop_triangles),
        'nonfinite': sum(not math.isfinite(x) for v in coordinates for x in v),
        'boundaryEdges': sum(edge.is_boundary for edge in bm.edges),
        'nonmanifoldEdges': sum(not edge.is_manifold for edge in bm.edges),
        'minimum': minimum, 'maximum': maximum,
        # Blender glTF importer converts glTF Y-up to Blender Z-up.
        'height': maximum[2] - minimum[2],
    }
    bm.free()
    return result


args = arguments()
if not .015 <= args.voxel <= .08:
    raise ValueError('Voxel experiment must stay in .015..08 metres')
if not 0 <= args.smooth <= .3 or not 0 <= args.iterations <= 4:
    raise ValueError('Only restrained smoothing is allowed')
output = Path(args.output).resolve()
output.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(Path(args.input).resolve()))
objects = [obj for obj in bpy.context.scene.objects if obj.type == 'MESH']
if not objects:
    raise ValueError('Source GLB has no mesh')
bpy.ops.object.select_all(action='DESELECT')
for obj in objects:
    obj.select_set(True)
bpy.context.view_layer.objects.active = objects[0]
if len(objects) > 1:
    bpy.ops.object.join()
obj = bpy.context.object
bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
before = metrics(obj)
if not 28 < before['height'] < 29:
    raise ValueError('Unexpected source scale/axis: ' + str(before))

remesh = obj.modifiers.new('Original carved volume union', 'REMESH')
remesh.mode = 'VOXEL'
remesh.voxel_size = args.voxel
remesh.use_smooth_shade = True
remesh.adaptivity = 0
bpy.ops.object.modifier_apply(modifier=remesh.name)
smooth = obj.modifiers.new('Restrained stone polish', 'SMOOTH')
smooth.factor = args.smooth
smooth.iterations = args.iterations
bpy.ops.object.modifier_apply(modifier=smooth.name)
intermediate = metrics(obj)
if intermediate['triangles'] > args.triangles:
    decimate = obj.modifiers.new('Bounded original mesh LOD', 'DECIMATE')
    decimate.ratio = args.triangles / intermediate['triangles'] * .995
    decimate.use_collapse_triangulate = True
    bpy.ops.object.modifier_apply(modifier=decimate.name)
triangulate = obj.modifiers.new('Explicit triangles', 'TRIANGULATE')
bpy.ops.object.modifier_apply(modifier=triangulate.name)
bm = bmesh.new()
bm.from_mesh(obj.data)
bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
bm.to_mesh(obj.data)
bm.free()
for polygon in obj.data.polygons:
    polygon.use_smooth = True
# Keep smooth curved stone while separating genuinely sharp valley/closure
# edges. Averaging across those edges can point a tiny LOD face's shading
# normal against its geometric surface, even with correct mesh winding.
obj.data.set_sharp_from_angle(angle=math.pi / 3)
obj.data.update()
after = metrics(obj)
if after['nonfinite'] or after['boundaryEdges'] or after['nonmanifoldEdges']:
    raise ValueError('Finished experiment is not finite/closed: ' + str(after))
if not 28 < after['height'] < 29 or after['triangles'] > args.triangles:
    raise ValueError('Finished experiment violates scale/budget: ' + str(after))
obj.name = 'Original poet carving — Blender union experiment'
bpy.ops.export_scene.gltf(filepath=str(output), export_format='GLB',
                          use_selection=True, export_yup=True, export_materials='EXPORT')
report = {'blender': bpy.app.version_string, 'input': str(Path(args.input).resolve()),
          'output': str(output), 'voxel': args.voxel, 'smooth': args.smooth,
          'iterations': args.iterations, 'targetTriangles': args.triangles,
          'normalCreaseDegrees': 60,
          'sourceTopologyNote': 'Source GLB is nonindexed triangle soup; raw before-edge counts do not test spatially welded closure.',
          'before': before, 'afterRemesh': intermediate, 'after': after,
          'visualApproval': False, 'origin': 'Original project geometry only'}
output.with_suffix('.finish.json').write_text(json.dumps(report, indent=2) + '\n')
print('POET_FINISH_REPORT ' + json.dumps(report), flush=True)
