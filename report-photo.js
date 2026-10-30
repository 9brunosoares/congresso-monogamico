export const MAX_PHOTO_LENGTH=180000;
export function validReportPhoto(value){return typeof value==='string'&&value.length<=MAX_PHOTO_LENGTH&&/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(value);}
export async function prepareReportPhoto(file){
 if(!file||file.size>20*1024*1024)throw Error('Escolha uma foto de até 20 MB.');
 const url=URL.createObjectURL(file),image=new Image();
 try{
  await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(Error('Não consegui abrir esta foto. Tente uma imagem JPG ou PNG.'));image.src=url;});
  let side=960;
  while(side>=300){
   const scale=Math.min(1,side/Math.max(image.naturalWidth,image.naturalHeight)),canvas=document.createElement('canvas');
   canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
   const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);
   for(const quality of [.8,.65,.5,.35]){const result=canvas.toDataURL('image/jpeg',quality);if(validReportPhoto(result))return result;}
   side=Math.floor(side*.75);
  }
  throw Error('Esta foto ficou grande demais. Escolha outra imagem.');
 }finally{URL.revokeObjectURL(url);}
}
