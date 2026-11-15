"""Original seamless surface maps; no external image assets."""
from PIL import Image, ImageFilter
import random, math, os
random.seed(19)
root=os.path.join(os.path.dirname(os.path.dirname(__file__)),'public','textures')
os.makedirs(root,exist_ok=True)
for name,base in [('sand',(181,157,113)),('granite',(191,180,157)),('plaster',(220,214,194))]:
 n=512;im=Image.new('RGB',(n,n));pix=im.load();heights=[]
 for y in range(n):
  row=[]
  for x in range(n):
   noise=random.gauss(0,8 if name=='sand' else 12)
   waves=3*math.sin(x*math.tau/128+math.sin(y*math.tau/256)*3) if name=='sand' else 0
   grain=noise+waves
   if name=='granite' and (y%86<2 or (x+((y//86)%2)*93)%173<2):grain-=23
   pix[x,y]=tuple(max(0,min(255,int(c+grain))) for c in base);row.append(grain)
  heights.append(row)
 im.save(root+'/'+name+'-color.webp',quality=90)
 normal=Image.new('RGB',(n,n));p=normal.load()
 for y in range(n):
  for x in range(n):
   dx=(heights[y][(x+1)%n]-heights[y][(x-1)%n])*.5;dy=(heights[(y+1)%n][x]-heights[(y-1)%n][x])*.5
   p[x,y]=(int(max(0,min(255,128-dx))),int(max(0,min(255,128-dy))),250)
 normal.save(root+'/'+name+'-normal.webp',quality=90)
print('Generated six original PBR surface maps')
