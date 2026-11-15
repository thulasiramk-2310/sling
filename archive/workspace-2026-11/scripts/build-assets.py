"""Original architectural studies. Rebuild: blender -b -t 2 --python scripts/build-assets.py
Units: metres. Blender Z-up; exporter converts to glTF Y-up. No third-party assets.
"""
import math, random, os
try: import bpy
except ImportError: bpy=None
try: from mathutils import Vector
except ImportError: from asset_backend import Vector, write_glb
from collections import defaultdict
random.seed(22)
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if bpy: bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
M={}; batches={}
def mat(name,color,rough=.8,metal=0):
 if not bpy:
  M[name]={'name':name,'pbrMetallicRoughness':{'baseColorFactor':[*color,1],'roughnessFactor':rough,'metallicFactor':metal},'doubleSided':name.startswith('leaf')};return
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
 p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal
 M[name]=m
for a,b in {'ivory':(.79,.72,.57),'white':(.87,.85,.76),'red':(.48,.075,.045),'stone':(.46,.29,.15),'stoneLight':(.62,.43,.25),'stoneDark':(.32,.22,.13),'sandstone':(.65,.48,.30),'ochre':(.56,.36,.18),'mint':(.38,.49,.40),'rose':(.57,.37,.30),'blue':(.27,.39,.43),'roof':(.28,.23,.19),'glass':(.06,.13,.14),'metal':(.17,.19,.17),'trunk':(.27,.21,.14),'leaf':(.12,.25,.12),'leafLight':(.25,.34,.13),'road':(.16,.17,.16),'trim':(.67,.65,.53),'gold':(.61,.40,.12)}.items():mat(a,b,.28 if a=='glass' else .83,.6 if a in ['metal','gold'] else 0)
def mesh(v,f,m):
 if m not in batches:batches[m]=[[],[]]
 vv,ff=batches[m];o=len(vv);vv.extend(v);ff.extend([tuple(o+j for j in face) for face in f])
def box(x,y,z,w,d,h,m):
 v=[(x+i*w/2,y+j*d/2,z+k*h/2) for k in [-1,1] for j in [-1,1] for i in [-1,1]]
 mesh(v,[(0,2,3,1),(4,5,7,6),(0,1,5,4),(1,3,7,5),(3,2,6,7),(2,0,4,6)],m)
def cyl(x,y,z,r,h,m,n=16,top=None):
 rt=r if top is None else top;v=[(x+math.cos(i*math.tau/n)*rr,y+math.sin(i*math.tau/n)*rr,z+zz) for zz,rr in [(-h/2,r),(h/2,rt)] for i in range(n)]
 f=[tuple(range(n-1,-1,-1)),tuple(range(n,n*2))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
 mesh(v,f,m)
def ball(x,y,z,r,m,n=10,rings=6,s=(1,1,1)):
 v=[(x+r*s[0]*math.sin(j*math.pi/rings)*math.cos(i*math.tau/n),y+r*s[1]*math.sin(j*math.pi/rings)*math.sin(i*math.tau/n),z+r*s[2]*math.cos(j*math.pi/rings)) for j in range(rings+1) for i in range(n)]
 f=[(j*n+i,(j+1)*n+i,(j+1)*n+(i+1)%n,j*n+(i+1)%n) for j in range(rings) for i in range(n)]
 mesh(v,f,m)
def rod(a,b,r,m,n=6):
 a,b=Vector(a),Vector(b);d=(b-a).normalized();u=d.cross(Vector((0,0,1)))
 if u.length<.01:u=d.cross(Vector((0,1,0)))
 u.normalize();w=d.cross(u);v=[tuple(p+r*(math.cos(i*math.tau/n)*u+math.sin(i*math.tau/n)*w)) for p in [a,b] for i in range(n)]
 mesh(v,[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)],m)
def export(name):
 global batches
 if not bpy:
  write_glb(ROOT+'/public/models/'+name+'.glb',batches,M);batches={};return
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
 for m,(v,f) in batches.items():
  data=bpy.data.meshes.new(name+'_'+m);data.from_pydata(v,[],f);data.materials.append(M[m]);data.update()
  obj=bpy.data.objects.new(name+'_'+m,data);bpy.context.collection.objects.link(obj)
  # Original metre-scaled triplanar-style UVs for optional replacement texture maps.
  uv=data.uv_layers.new(name='UVMap')
  for p in data.polygons:
   axis=max(range(3),key=lambda i:abs(p.normal[i]));axes=[i for i in range(3) if i!=axis]
   for li in p.loop_indices:
    co=data.vertices[data.loops[li].vertex_index].co;uv.data[li].uv=(co[axes[0]]*.2,co[axes[1]]*.2)
 bpy.ops.export_scene.gltf(filepath=ROOT+'/public/models/'+name+'.glb',export_format='GLB',export_yup=True,export_materials='EXPORT')
 print('EXPORTED',name,sum(len(v[0]) for v in batches.values()),'vertices');batches={}
# Chennai lighthouse: triangular RCC shaft, 46m, red and white bands, gallery, lantern.
for i in range(11):cyl(30,7,2+i*3.6,4.1,3.6,'red' if i%2==0 else 'white',3)
for i in range(10):
 box(30,4.93,2.1+i*3.6,.7,.09,1.3,'glass');box(30,4.86,1.4+i*3.6,.95,.24,.13,'trim')
for z in [39.9,42.3]:
 cyl(30,7,z,5.1,.32,'white',24)
 for i in range(32):
  a=i*math.tau/32;cyl(30+4.9*math.cos(a),7+4.9*math.sin(a),z+.6,.045,1.2,'metal',5)
 for i in range(32):
  a=i*math.tau/32;b=(i+1)*math.tau/32;rod((30+4.9*math.cos(a),7+4.9*math.sin(a),z+1.15),(30+4.9*math.cos(b),7+4.9*math.sin(b),z+1.15),.055,'metal')
cyl(30,7,42,2.9,4.4,'glass',20)
for i in range(12):
 a=i*math.tau/12;cyl(30+2.94*math.cos(a),7+2.94*math.sin(a),42,.09,3.8,'white',6)
cyl(30,7,44.4,3.7,.4,'red',24);cyl(30,7,45.2,3.5,1.3,'red',24,top=.7);cyl(30,7,46.6,.18,2,'metal',8)
cyl(30,7,41.7,.6,1.5,'gold',20)
box(30,10,1,17,16,2,'ivory');box(30,12,4.3,14,10,4.7,'white');box(30,12,6.8,15,11,.4,'trim')
for x in [25,28,31,34]:box(x,6.9,4.4,1.2,.12,1.7,'glass')
for i in range(7):box(30,-2.5-i*.45,.15+i*.13,6,.5,.3+i*.26,'ivory')
# Road, central median, sidewalks and lampposts. Blender Y positive = Three Z negative.
box(0,26,.1,790,13,.2,'road')
for x in range(-390,400,9):box(x,26,.23,3,.16,.04,'white')
for y in [18,34]:
 box(0,y,.25,790,2,.5,'trim')
 for x in range(-360,380,27):
  cyl(x,y,4,.09,8,'metal',8);rod((x,y,8),(x,y-1.4,8.3),.07,'metal');box(x,y-1.5,8.25,.6,1,.12,'ivory')
# City: terraced homes, parapets, recessed shutters, balconies, rooftop tanks.
for row in range(5):
 for col in range(30):
  x=-360+col*25+random.uniform(-3,3);y=49+row*29;w=random.uniform(13,20);d=random.uniform(14,22);h=random.choice([6,9,12,15,18]);m=random.choice(['ivory','white','mint','rose','sandstone','blue'])
  box(x,y,h/2,w,d,h,m);box(x,y,h+.2,w+.7,d+.7,.5,'trim')
  for side in [-1,1]:box(x+side*w/2,y,h+.8,.2,d,1.1,m)
  for sy in [-1,1]:box(x,y+sy*d/2,h+.8,w,.2,1.1,m)
  for z in range(2,int(h),3):
   box(x,y-d/2-.18,z-.9,w+.4,.5,.22,'trim')
   for wx in range(int(-w/2)+2,int(w/2),3):
    box(x+wx,y-d/2-.04,z,1.35,.12,1.45,'glass');box(x+wx,y-d/2-.4,z+.9,1.9,.9,.16,'trim')
  cyl(x+w*.25,y,h+1.5,1.15,2.4,'roof',12);box(x-w*.25,y,h+1.1,3.5,4,2,'ivory')
# Indo-Saracenic beachfront architectural study with colonnade, cornices, domes.
for bx in [-95,-165]:
 box(bx,47,5.5,48,17,11,'rose');box(bx,47,11.3,49,18,.6,'ivory')
 for i in range(12):
  xx=bx-22+i*4;box(xx,38.3,5.8,2.1,.2,6.8,'glass');cyl(xx-1.4,37.6,5,.3,10,'ivory',8)
  ball(xx,38.2,9,1.1,'ivory',10,6,s=(1,.2,.75))
 for xx in [bx-21,bx+21]:
  box(xx,47,13,6,7,5,'rose');cyl(xx,47,16,4,.7,'ivory',16);ball(xx,47,16.3,3.6,'ivory',16,8,s=(1,1,.8));cyl(xx,47,20,.15,2,'gold')
# Beach kiosks, umbrellas, fishing boats and seawall details.
for i in range(24):
 x=-270+i*24;y=random.uniform(-9,3)
 box(x,y,1.1,3,2,2.2,random.choice(['ivory','mint','rose']));box(x,y,2.3,3.6,2.8,.25,'roof')
 for dx in [-1.2,1.2]:cyl(x+dx,y-1.5,1,.05,2,'metal',6)
 cyl(x+5,y-7,1.3,.055,2.6,'trunk',6);cyl(x+5,y-7,2.7,2.1,.8,'red' if i%2 else 'ivory',12,top=.05)
for i in range(14):
 x=-240+i*34;y=-18-random.random()*8
 # Pointed wood hull with inner ribs, built as shaped mesh.
 v=[(x-3,y,0),(x-1.6,y-.9,.6),(x+2,y-.9,.6),(x+3,y,0),(x+2,y+.9,.6),(x-1.6,y+.9,.6),(x-2.5,y,-.1),(x+2.5,y,-.1)]
 mesh(v,[(0,1,2,3,7,6),(3,4,5,0,6,7),(1,5,4,2)],'blue' if i%2 else 'ochre')
export('chennai')
# Palm model: curved ringed trunk, double-sided curved pinnate fronds with individual leaflets.
for i in range(16):
 z=i*.6;x=.025*z*z;cyl(x,0,z+.3,.25-i*.006,.63,'trunk',9)
 if i%2==0:cyl(x,0,z+.56,.255-i*.006,.055,'ivory',9)
for j in range(11):
 a=j*math.tau/11;L=random.uniform(3.9,5.2)
 def point(t):return Vector((2.2+math.cos(a)*L*t,math.sin(a)*L*t,9.3+2*math.sin(t*2.6)-2*t))
 for k in range(12):
  t=k/12;rod(point(t),point(t+1/12),.026,'leaf',4)
  for side in [-1,1]:
   p=point(t);p1=point(min(1,t+.13));out=Vector((-math.sin(a),math.cos(a),-.45))*side
   tip=p+out*math.sin(t*math.pi)*1.05+Vector((math.cos(a),math.sin(a),-.45))*.55
   mesh([tuple(p),tuple(p1),tuple(tip)],[(0,1,2),(2,1,0)],'leaf' if k%3 else 'leafLight')
export('palm')
# Temple modeling grammar: sculpted plinth courses, pilasters, miniature shrine aedicules,
# tier cornices, octagonal shikhara, finials; architectural studies, not scans.
def deity(x,y,z,s,m='stoneLight'):
 ball(x,y,z+s*.5,s*.17,m,8,5,s=(.8,.7,1));cyl(x,y,z,s*.17,s*.65,m,7,top=s*.25)
 for side in [-1,1]:rod((x+side*s*.15,y,z+s*.25),(x+side*s*.34,y,z-.1*s),s*.055,m,5)
 box(x,y,z-s*.4,s*.6,s*.4,s*.15,'stoneDark')
def shrine(x,y,base,width,height,tiers,m='stone'):
 # Raised plinth with five articulated courses.
 for i in range(5):box(x,y,base+i*.23,width+1.5-i*.18,width+1.5-i*.18,.22,m if i%2 else 'stoneLight')
 body=height*.23;box(x,y,base+1+body/2,width,width,body,m)
 for side in [-1,1]:
  for k in range(5):
   xx=(k-2)*width/5
   box(x+xx,y+side*(width/2+.12),base+body/2+1,.32,.36,body,'stoneLight')
   deity(x+xx,y+side*(width/2+.2),base+body*.6,.9)
   box(x+side*(width/2+.1),y+xx,base+body/2+1,.3,.32,body,'stoneLight')
 box(x,y-width/2-.12,base+body*.4,1.7,.2,body*.7,'stoneDark')
 start=base+1+body;step=(height-body-3)/tiers
 for i in range(tiers):
  w=width*(1-i/(tiers+1)*.84);zz=start+i*step
  box(x,y,zz+step*.43,w,w,step*.85,m)
  box(x,y,zz+step*.88,w+1,w+1,.2,'stoneDark');box(x,y,zz+step*.99,w+1.15,w+1.15,.18,'stoneLight')
  n=max(2,int(w/2))
  for side in [-1,1]:
   for k in range(n):
    xx=-w*.43+(k/(n-1))*w*.86
    for swap in [False,True]:
     px,py=(x+xx,y+side*(w/2+.13)) if not swap else (x+side*(w/2+.13),y+xx)
     box(px,py,zz+step*.45,.7,.45,step*.68,'stoneDark')
     deity(px,py-.05,zz+step*.45,min(step*.65,1.25))
     cyl(px,py,zz+step*.77,.48,.36,'stoneLight',8,top=.16)
  for sx in [-1,1]:
   for sy in [-1,1]:cyl(x+sx*w*.47,y+sy*w*.47,zz+step+.24,.45,.5,'stoneLight',8,top=.1)
 top=start+tiers*step
 cyl(x,y,top+.3,width*.22,.6,'stoneLight',8);ball(x,y,top+.9,width*.24,'stoneLight',12,8,s=(1,1,.75));cyl(x,y,top+width*.2+1,.16,1.1,'gold',10,top=.04)
def courtyard(w,d,m='stoneLight'):
 box(0,0,.05,w,d,.3,m)
 for xx in range(int(-w/2),int(w/2),4):box(xx,0,.22,.035,d,.015,'stoneDark')
 for yy in range(int(-d/2),int(d/2),4):box(0,yy,.22,w,.035,.015,'stoneDark')
 for side in [-1,1]:
  box(side*w/2,0,1,.8,d,2,'stone')
  for y in range(int(-d/2)+2,int(d/2),3):
   box(side*w/2,y,2.1,1.4,1.7,.4,'stoneLight');ball(side*w/2,y,2.65,.45,'stone',8,5,s=(1,1.3,.7));cyl(side*w/2,y,2.6,.15,.9,'stone',8)
courtyard(42,62);shrine(0,7,.2,11,23,7);shrine(0,-12,.2,8,16,5)
for side in [-1,1]:
 for y in range(-25,29,6):
  box(side*14,y,1.3,3.7,3.7,2,'stone');deity(side*14,y-1.9,2.8,1.7)
export('shore-temple')
courtyard(108,152,'sandstone');shrine(0,17,.2,24,61,13,'sandstone')
# Pillared mandapa extending towards entrance.
box(0,-12,2,20,42,3.8,'sandstone')
for side in [-1,1]:
 for y in range(-30,6,3):
  box(side*9.4,y,6,.65,.65,6,'stoneLight');box(side*9.4,y,8.8,1.2,1.2,.55,'stoneDark')
box(0,-12,9.2,22,43,.6,'stoneLight');box(0,-12,9.7,21,42,.4,'stone')
# Nandi pavilion with sculptural bull, horns, raised plinth.
box(0,-48,1.2,12,11,2,'stone')
for x in [-5,5]:
 for y in [-52,-44]:cyl(x,y,5,.4,6,'stoneLight',8)
box(0,-48,8.1,13,12,.7,'stoneLight');box(0,-48,8.7,11,10,.5,'stone')
ball(0,-48,3,2.5,'stoneDark',16,10,s=(.75,1.3,.65));ball(0,-50.5,4.2,1.3,'stoneDark',12,8,s=(.8,1,1.1));ball(0,-47,4,1,'stoneDark',12,8)
for x in [-.75,.75]:cyl(x,-50.9,5.4,.18,1.6,'stoneDark',8,top=.02)
# Courtyard cloisters.
for side in [-1,1]:
 box(side*48,0,6,10,149,.7,'stoneLight')
 for y in range(-70,73,4):box(side*43,y,3,.45,.45,5.5,'stoneLight')
# Entrance gopuram.
for x in [-5.5,5.5]:box(x,-72,3.5,6,8,7,'sandstone')
for i in range(6):
 w=18-i*2.3;box(0,-72,7.6+i*1.4,w,8-i*.65,1.2,'sandstone');box(0,-72,8.2+i*1.4,w+.8,9-i*.65,.22,'stoneLight')
 for k in range(max(2,int(w/2))):deity(-w/2+1+k*2,-76+i*.32,7.8+i*1.4,.9)
export('brihadisvara')
