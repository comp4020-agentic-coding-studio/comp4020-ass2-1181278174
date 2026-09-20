"""Original low-poly course assets. Run in Blender with the repository as cwd.
The live user's scene is preserved; only a previously generated SlopAssets scene is rebuilt.
"""
import bpy, math, json, os
from pathlib import Path
from mathutils import Quaternion
import io_scene_gltf2

ROOT = Path(globals().get('PROJECT_ROOT', os.getcwd()))
NAME = 'SlopAssets'
old = bpy.data.scenes.get(NAME)
if old:
    if not old.get('slop_asset_library'):
        raise RuntimeError('SlopAssets already belongs to the user')
    for obj in list(old.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    scene = old
else:
    scene = bpy.data.scenes.new(NAME)
scene['slop_asset_library'] = True
bpy.context.window.scene = scene
materials = {}
for name, hexcolor in {'cream':'e6ddc1','roof':'856d62','glass':'506d72','door':'645c49','teal':'218a7a','gold':'d8a73c','stone':'8a9888','white':'edf0df','parcel':'c3925d'}.items():
    mat = bpy.data.materials.new('slop_' + name)
    rgb = tuple((int(hexcolor[i:i+2],16)/255)**2.2 for i in (0,2,4))
    mat.diffuse_color = (*rgb,1)
    mat.use_nodes = True
    shader = next(n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    next(s for s in shader.inputs if s.identifier == 'Base Color').default_value = (*rgb,1)
    next(s for s in shader.inputs if s.identifier == 'Roughness').default_value = .9
    materials[name] = mat
mesh_cache = {}
def empty(name, parent=None):
    obj=bpy.data.objects.new(name,None);scene.collection.objects.link(obj);obj.parent=parent
    obj['anchor']=name
    return obj

def mesh(name, verts, faces, material, parent, position=(0,0,0), scale=(1,1,1), cache=None):
    key=(cache,material)
    data=mesh_cache.get(key) if cache else None
    if data is None:
        data=bpy.data.meshes.new('mesh_'+name);data.from_pydata(verts,[],faces);data.update();data.materials.append(materials[material])
        if cache:mesh_cache[key]=data
    obj=bpy.data.objects.new(name,data);scene.collection.objects.link(obj);obj.parent=parent;obj.location=position;obj.scale=scale
    return obj

cube_verts=[(-.5,-.5,-.5),(.5,-.5,-.5),(.5,.5,-.5),(-.5,.5,-.5),(-.5,-.5,.5),(.5,-.5,.5),(.5,.5,.5),(-.5,.5,.5)]
cube_faces=[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)]
def box(name, p, size, material, parent):
    return mesh(name,cube_verts,cube_faces,material,parent,p,size,'cube')
def cylinder(name,p,radius,depth,material,parent,n=12):
    vertices=[(math.cos(i*math.tau/n),math.sin(i*math.tau/n),z) for z in [-.5,.5] for i in range(n)]
    faces=[tuple(reversed(range(n))),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
    return mesh(name,vertices,faces,material,parent,p,(radius,radius,depth),'cylinder'+str(n))
def roof(parent, width=1, depth=1, base=.72, peak=1, x=0):
    v=[(-width/2+x,-depth/2,base),(width/2+x,-depth/2,base),(x,-depth/2,peak),(-width/2+x,depth/2,base),(width/2+x,depth/2,base),(x,depth/2,peak)]
    return mesh('roof',v,[(0,2,1),(3,4,5),(0,3,5,2),(1,2,5,4),(0,1,4,3)],'roof',parent)
def windows(parent, floors=1, columns=2):
    for floor in range(floors):
        for col in range(columns):
            x=-.34+col*.68/max(1,columns-1)
            box('window',(x,-.502,.3+floor*.23),(.15,.012,.14),'glass',parent)
    box('door',(0,-.503,.13),(.14,.016,.26),'door',parent)

roots=[]
for kind in ['house_small','house_gable','house_terrace','house_apartment','kitchen','tower','charging_pad','drone_L','drone_H']:
    root=empty(kind);root['asset']=kind;roots.append(root)
    if kind.startswith('house'):
        box('walls',(0,0,.36),(1,1,.72),'cream',root)
        if kind=='house_small':box('flat_roof',(0,0,.84),(1,1,.32),'roof',root)
        elif kind=='house_terrace':
            for x in [-1/3,0,1/3]:roof(root,width=1/3,x=x)
        elif kind=='house_apartment':
            box('upper_floor',(0,0,.825),(1,1,.21),'cream',root);box('flat_roof',(0,0,.965),(1,1,.07),'roof',root)
        else:roof(root)
        windows(root,3 if kind=='house_apartment' else 2 if kind=='house_terrace' else 1,3 if kind=='house_terrace' else 2)
    elif kind=='kitchen':
        box('walls',(0,0,.4),(1,1,.8),'cream',root);box('flat_roof',(0,0,.9),(1,1,.2),'gold',root)
        box('dispatch_door',(0,-.505,.26),(.48,.015,.52),'teal',root)
        box('sign',(0,-.517,.65),(.6,.025,.1),'gold',root)
        box('vent',(.28,.25,.91),(.15,.15,.18),'stone',root)
        anchor=empty('dispatch',root);anchor.location=(0,-.5,0)
    elif kind=='tower':
        box('walls',(0,0,.5),(1,1,1),'stone',root)
        for z in [.3,.6,.9]:box('tower_band',(0,-.504,z),(.82,.01,.04),'glass',root)
    elif kind=='charging_pad':
        cylinder('pad',(0,0,.025),.5,.05,'stone',root,16)
        box('pad_mark',(-.12,0,.055),(.05,.4,.01),'gold',root);box('pad_mark',(.12,0,.055),(.05,.4,.01),'gold',root)
        box('pad_mark',(0,0,.055),(.24,.045,.01),'gold',root)
        anchor=empty('dock',root);anchor.location=(0,0,.07)
    else:
        heavy=kind=='drone_H';colour='gold' if heavy else 'teal'
        box('body',(0,0,.3),(.62,.86 if heavy else .56,.23),colour,root)['anchor']='body'
        box('nose',(0,-.38 if heavy else -.23,.33),(.28,.16,.11),'white',root)
        box('arm_x',(0,0,.36),(1.45,.09,.07),'stone',root);box('arm_y',(0,0,.36),(.09,1.45,.07),'stone',root)
        for i,(x,y) in enumerate([(-.7,-.7),(-.7,.7),(.7,-.7),(.7,.7)]):
            arm=box('diagonal_arm',(x/2,y/2,.36),(1.0,.07,.06),'stone',root);arm.rotation_euler.z=math.atan2(y,x)
            rotor=empty('rotor_'+str(i),root);rotor.location=(x,y,.42)
            cylinder('rotor_hub',(0,0,0),.09,.08,colour,rotor)
            box('blade',(0,0,.05),(.55,.055,.018),'door',rotor)
        box('parcel',(0,0,.09),(.43 if heavy else .28,.48 if heavy else .3,.16),'parcel',root)['anchor']='parcel'
        for x in [-.3,.3]:box('landing_foot',(x,0,.035),(.04,.72,.07),'stone',root)

# Preview layout only. Consumers reset root placement when instancing these prototypes.
for i,root in enumerate(roots):root.location=((i%3)*2.8,(i//3)*2.8,0)
scene.world=bpy.data.worlds.new('SlopAssetWorld');scene.world.color=(.35,.35,.35)
for obj in scene.objects:obj.select_set(True)
bpy.context.view_layer.objects.active=roots[0]
for area in bpy.context.screen.areas:
    if area.type=='VIEW_3D':
        region=area.spaces.active.region_3d
        region.view_location=(2.8,2.8,.2);region.view_distance=14
        region.view_rotation=Quaternion((.82,.35,.2,.4)).normalized()
        area.spaces.active.overlay.show_overlays=False
        modes=[i.identifier for i in area.spaces.active.shading.bl_rna.properties['color_type'].enum_items]
        area.spaces.active.shading.color_type=next(m for m in modes if m.lower()=='material')
formats=io_scene_gltf2.get_format_items(None,bpy.context)
binary=next(item[0] for item in formats if '.glb' in item[1])
out=ROOT/'public/models/slop-hill.glb';out.parent.mkdir(parents=True,exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(out),export_format=binary,use_active_scene=True,export_extras=True,export_animations=False)
source=ROOT/'tools/models/slop-hill.blend'
bpy.ops.wm.save_as_mainfile(filepath=str(source),copy=True)
manifest={'version':1,'generator':'Blender '+bpy.app.version_string,'author':'Original course assets generated by build_assets.py','units':'metres; normalized building footprints; illustrative drone size','asset':out.name,'source':'tools/models/slop-hill.blend','roots':[r.name for r in roots],'droneAnchors':['body','rotor_0','rotor_1','rotor_2','rotor_3','parcel'],'bytes':out.stat().st_size,'textures':0}
(ROOT/'public/models/manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps(manifest))
