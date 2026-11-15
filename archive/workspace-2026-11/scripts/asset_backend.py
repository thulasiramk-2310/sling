"""Dependency-free fallback for deterministic GLB generation when host Blender cannot start.
Uses the same geometry definitions as Blender; never an external or unlicensed asset.
"""
import math, struct, json, os
class Vector:
 def __init__(self,a):self.a=list(a)
 def __iter__(self):return iter(self.a)
 def __add__(self,b):return Vector([a+c for a,c in zip(self.a,b.a)])
 def __sub__(self,b):return Vector([a-c for a,c in zip(self.a,b.a)])
 def __mul__(self,t):return Vector([a*t for a in self.a])
 def __rmul__(self,t):return self*t
 @property
 def length(self):return math.sqrt(sum(a*a for a in self.a))
 def normalize(self):self.a=[a/(self.length or 1) for a in self.a];return self
 def normalized(self):return Vector(self.a).normalize()
 def cross(self,b):
  x,y,z=self.a;u,v,w=b.a;return Vector((y*w-z*v,z*u-x*w,x*v-y*u))
def write_glb(path,batches,mats):
 binary=bytearray();views=[];access=[];meshes=[];materials=[]
 def add(values,fmt,type_,bounds=False):
  while len(binary)%4:binary.append(0)
  offset=len(binary)
  for v in values:binary.extend(struct.pack('<'+fmt,*v))
  views.append({'buffer':0,'byteOffset':offset,'byteLength':len(binary)-offset})
  a={'bufferView':len(views)-1,'componentType':5126 if 'f' in fmt else 5125,'count':len(values),'type':type_}
  if bounds:a.update(min=[min(v[i] for v in values) for i in range(3)],max=[max(v[i] for v in values) for i in range(3)])
  access.append(a);return len(access)-1
 for name,(vertices,faces) in batches.items():
  positions=[];normals=[];uv=[];indices=[]
  for face in faces:
   if len(face)<3:continue
   vv=[Vector(vertices[i]) for i in face];normal=(vv[1]-vv[0]).cross(vv[2]-vv[0]).normalized();nx,ny,nz=normal
   if normal.length<.001:continue
   offset=len(positions)
   for v in vv:
    x,y,z=v;positions.append((x,z,-y));normals.append((nx,nz,-ny));uv.append((x*.2,z*.2 if abs(ny)>.5 else y*.2))
   for i in range(1,len(vv)-1):indices.append((offset,offset+i,offset+i+1))
  materials.append(mats[name]);p=add(positions,'fff','VEC3',True);n=add(normals,'fff','VEC3');u=add(uv,'ff','VEC2');ind=add([(x,) for tri in indices for x in tri],'I','SCALAR')
  meshes.append({'name':name,'primitives':[{'attributes':{'POSITION':p,'NORMAL':n,'TEXCOORD_0':u},'indices':ind,'material':len(materials)-1}]})
 doc={'asset':{'version':'2.0','generator':'Tamil Nadu original architectural studies / deterministic fallback'},'scene':0,'scenes':[{'nodes':list(range(len(meshes)))}],'nodes':[{'mesh':i,'name':list(batches)[i]} for i in range(len(meshes))],'meshes':meshes,'materials':materials,'buffers':[{'byteLength':len(binary)}],'bufferViews':views,'accessors':access}
 encoded=json.dumps(doc,separators=(',',':')).encode();encoded+=b' '*((-len(encoded))%4);binary+=b'\0'*((-len(binary))%4)
 with open(path,'wb') as f:f.write(struct.pack('<III',0x46546c67,2,28+len(encoded)+len(binary))+struct.pack('<II',len(encoded),0x4e4f534a)+encoded+struct.pack('<II',len(binary),0x004e4942)+binary)
 print('EXPORTED',os.path.basename(path),os.path.getsize(path),'bytes')
