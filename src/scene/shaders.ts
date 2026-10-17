// Ashima Arts 3D simplex noise (MIT) + fbm.
const noise = /* glsl */ `
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0);const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.0-g;vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857;vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z);vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0;vec4 s1=floor(b1)*2.0+1.0;vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
float fbm(vec3 p){float a=0.5;float s=0.0;for(int i=0;i<5;i++){s+=a*snoise(p);p*=2.03;a*=0.5;}return s;}
`

export const planetVertex = /* glsl */ `
varying vec3 vObjN;
varying vec3 vWorldN;
varying vec3 vWorldPos;
void main(){
  vObjN = normal;
  vWorldN = normalize(mat3(modelMatrix) * normal);
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldPos = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`

export const planetFragment = /* glsl */ `
uniform vec3 uA; uniform vec3 uB; uniform vec3 uC; uniform vec3 uAtmo;
uniform float uKind; uniform float uTime; uniform float uSeed; uniform float uHover;
varying vec3 vObjN; varying vec3 vWorldN; varying vec3 vWorldPos;
${noise}
void main(){
  vec3 n = normalize(vObjN);
  vec3 p = n + uSeed;
  vec3 col;
  if (uKind < 0.5) {
    float h = fbm(p * 2.5) * 0.5 + 0.5;
    float c = fbm(p * 9.0) * 0.5 + 0.5;
    col = mix(uA, uB, smoothstep(0.3, 0.65, h));
    col = mix(col, uC, smoothstep(0.55, 0.85, c) * 0.6);
  } else if (uKind < 1.5) {
    float h = fbm(p * 1.8) * 0.5 + 0.5;
    vec3 ocean = mix(uA * 0.55, uA, smoothstep(0.2, 0.52, h));
    vec3 land = mix(uB, uC, smoothstep(0.5, 0.8, fbm(p * 5.0) * 0.5 + 0.5));
    col = mix(ocean, land, smoothstep(0.52, 0.545, h));
    col = mix(col, vec3(0.93), smoothstep(0.78, 0.86, abs(n.y)));
    float cl = smoothstep(0.55, 0.78, fbm(p * 3.0 + vec3(uTime * 0.02, 0.0, 0.0)) * 0.5 + 0.5);
    col = mix(col, vec3(1.0), cl * 0.85);
  } else {
    float freq = uKind < 2.5 ? 16.0 : 7.0;
    float warp = fbm(p * vec3(1.5, 5.0, 1.5) + uTime * 0.01);
    float b = sin(n.y * freq + warp * 2.6) * 0.5 + 0.5;
    col = mix(uA, uB, b);
    col = mix(col, uC, smoothstep(0.55, 1.0, fbm(p * 3.0) * 0.5 + 0.5) * 0.55);
  }
  vec3 N = normalize(vWorldN);
  vec3 L = normalize(-vWorldPos);
  vec3 V = normalize(cameraPosition - vWorldPos);
  float ndl = dot(N, L);
  float light = smoothstep(-0.12, 0.35, ndl) * max(ndl, 0.0) * 1.15 + smoothstep(-0.2, 0.2, ndl) * 0.08;
  vec3 lit = col * (0.025 + light);
  float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0);
  lit += uAtmo * fres * (0.2 + smoothstep(-0.3, 0.5, ndl) * 0.9 + uHover * 0.8);
  gl_FragColor = vec4(lit, 1.0);
  #include <colorspace_fragment>
}
`

export const haloVertex = /* glsl */ `
varying vec3 vViewN; varying vec3 vViewPos; varying vec3 vWorldPos; varying vec3 vCenter;
void main(){
  vViewN = normalize(normalMatrix * normal);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vViewPos = mv.xyz;
  vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
  vCenter = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  gl_Position = projectionMatrix * mv;
}
`

export const haloFragment = /* glsl */ `
uniform vec3 uColor; uniform float uStrength; uniform float uLit;
varying vec3 vViewN; varying vec3 vViewPos; varying vec3 vWorldPos; varying vec3 vCenter;
void main(){
  float k = clamp(-dot(normalize(vViewN), normalize(-vViewPos)), 0.0, 1.0);
  float glow = pow(k, 1.6) * uStrength;
  float day = mix(1.0, smoothstep(-0.4, 0.6, dot(normalize(vWorldPos - vCenter), normalize(-vCenter))), uLit);
  gl_FragColor = vec4(uColor * glow * (0.15 + day), glow);
  #include <colorspace_fragment>
}
`

export const sunFragment = /* glsl */ `
uniform float uTime;
varying vec3 vObjN; varying vec3 vWorldN; varying vec3 vWorldPos;
${noise}
void main(){
  vec3 n = normalize(vObjN);
  float a = fbm(n * 2.5 + vec3(0.0, uTime * 0.04, 0.0));
  float b = fbm(n * 9.0 - vec3(uTime * 0.08));
  float t = clamp(a * 0.6 + 0.5 + b * 0.25, 0.0, 1.0);
  vec3 col = mix(vec3(1.0, 0.28, 0.03), vec3(1.0, 0.78, 0.35), t);
  col = mix(col, vec3(1.0, 0.97, 0.85), smoothstep(0.75, 1.0, t));
  vec3 V = normalize(cameraPosition - vWorldPos);
  float fres = pow(1.0 - max(dot(normalize(vWorldN), V), 0.0), 2.0);
  col += vec3(1.0, 0.55, 0.15) * fres * 1.2;
  gl_FragColor = vec4(col * 2.4, 1.0);
}
`

export const ringVertex = /* glsl */ `
varying float vR; varying vec3 vWorldPos;
void main(){
  vR = length(position.xy);
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldPos = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`

export const ringFragment = /* glsl */ `
uniform float uInner; uniform float uOuter; uniform vec3 uColor;
varying float vR; varying vec3 vWorldPos;
void main(){
  float t = (vR - uInner) / (uOuter - uInner);
  float bands = 0.55 + 0.45 * sin(t * 90.0) * sin(t * 23.0 + 1.3);
  float gap = smoothstep(0.58, 0.6, t) * (1.0 - smoothstep(0.63, 0.65, t));
  float edge = smoothstep(0.0, 0.06, t) * (1.0 - smoothstep(0.92, 1.0, t));
  float alpha = edge * bands * (1.0 - gap * 0.9) * 0.85;
  gl_FragColor = vec4(uColor * (0.35 + bands * 0.6), alpha);
  #include <colorspace_fragment>
}
`
