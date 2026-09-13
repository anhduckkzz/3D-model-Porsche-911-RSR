self.onmessage=async({data})=>{
 try{
  const base=data?.assetPath??'/model';
  if(!/^\/model(?:s\/\d{5})?$/.test(base))throw Error('Mã mô hình không hợp lệ.');
  const [a,b,c]=await Promise.all([fetch(base+'/model.json'),fetch(base+'/geometry.bin.gz'),fetch(base+'/assembly.json')]);
  if(!a.ok||!b.ok||!c.ok)throw new Error('Không tải được dữ liệu mô hình. Vui lòng thử lại.');
  const model=await a.json();model.assembly=await c.json();const compressed=await b.arrayBuffer();
  const bytes=new Uint8Array(compressed);const buffer=bytes[0]===31?await new Response(new Blob([compressed]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer():compressed;
  self.postMessage({model,buffer},[buffer]);
 }catch(e){self.postMessage({error:e.message||'Không đọc được mô hình 3D.'})}
};
