self.onmessage=async()=>{
 try{
  const [a,b]=await Promise.all([fetch('/model/model.json'),fetch('/model/geometry.bin.gz')]);
  if(!a.ok||!b.ok)throw new Error('Không tải được dữ liệu mô hình. Vui lòng thử lại.');
  const model=await a.json();const compressed=await b.arrayBuffer();
  const bytes=new Uint8Array(compressed);const buffer=bytes[0]===31?await new Response(new Blob([compressed]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer():compressed;
  self.postMessage({model,buffer},[buffer]);
 }catch(e){self.postMessage({error:e.message||'Không đọc được mô hình 3D.'})}
};
