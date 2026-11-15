// Lossless mesh buffer compression. Uses the same decoder configured by Drei useGLTF.
import fs from 'node:fs/promises';
import {MeshoptEncoder} from 'meshoptimizer/encoder';
await MeshoptEncoder.ready;
for(const file of (await fs.readdir('public/models')).filter(x=>x.endsWith('.glb'))){
 const p='public/models/'+file,b=await fs.readFile(p);const jsonLength=b.readUInt32LE(12);const doc=JSON.parse(b.subarray(20,20+jsonLength).toString());
 if(doc.extensionsUsed?.includes('EXT_meshopt_compression')){console.log(file,'already optimized');continue;}
 const bin=b.subarray(28+jsonLength);let offset=0;const chunks=[];
 for(let i=0;i<doc.bufferViews.length;i++){
  const view=doc.bufferViews[i],access=doc.accessors.find(a=>a.bufferView===i);if(!access)throw new Error('Unexpected unused buffer view');
  const index=access.type==='SCALAR';const stride=({VEC3:12,VEC2:8,SCALAR:4})[access.type];
  const source=new Uint8Array(bin.buffer,bin.byteOffset+(view.byteOffset||0),view.byteLength);
  const encoded=MeshoptEncoder.encodeGltfBuffer(source,access.count,stride,index?'TRIANGLES':'ATTRIBUTES');
  const padded=Buffer.alloc(Math.ceil(encoded.length/4)*4);padded.set(encoded);chunks.push(padded);
  view.buffer=1;view.extensions={EXT_meshopt_compression:{buffer:0,byteOffset:offset,byteLength:encoded.length,byteStride:stride,count:access.count,mode:index?'TRIANGLES':'ATTRIBUTES'}};offset+=padded.length;
 }
 const binary=Buffer.concat(chunks);doc.buffers=[{byteLength:binary.length},{byteLength:doc.buffers[0].byteLength,extensions:{EXT_meshopt_compression:{fallback:true}}}];
 doc.extensionsUsed=['EXT_meshopt_compression'];doc.extensionsRequired=['EXT_meshopt_compression'];
 let json=Buffer.from(JSON.stringify(doc));json=Buffer.concat([json,Buffer.alloc((4-json.length%4)%4,32)]);
 const header=Buffer.alloc(20);header.writeUInt32LE(0x46546c67,0);header.writeUInt32LE(2,4);header.writeUInt32LE(28+json.length+binary.length,8);header.writeUInt32LE(json.length,12);header.writeUInt32LE(0x4e4f534a,16);
 const binHeader=Buffer.alloc(8);binHeader.writeUInt32LE(binary.length,0);binHeader.writeUInt32LE(0x004e4942,4);await fs.writeFile(p,Buffer.concat([header,json,binHeader,binary]));
 console.log(`${file}: ${(b.length/1e6).toFixed(2)} MB → ${((28+json.length+binary.length)/1e6).toFixed(2)} MB`);
}
