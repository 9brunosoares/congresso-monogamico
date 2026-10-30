// Mantém cada consulta viva uma única vez; trocar de tela só altera o necessário.
export function subscriptionPool(open){
 const active=new Map();
 return {
  sync(specs){
   const wanted=new Set(specs.map(s=>s.key));
   for(const [key,stop] of active)if(!wanted.has(key)){stop();active.delete(key);}
   for(const spec of specs)if(!active.has(spec.key))active.set(spec.key,open(spec));
  },
  stop(){for(const stop of active.values())stop();active.clear();},
  keys(){return [...active.keys()];}
 };
}
export function lazyCollections(view,admin){
 return {chat:view==='fofoca',tasks:view==='placar',cases:view==='mural'||(view==='tribunal'&&admin)};
}
export function mergeRows(...groups){
 return [...new Map(groups.flat().map(item=>[item.id,item])).values()].sort((a,b)=>(a.createdAt?.toMillis?.()||0)-(b.createdAt?.toMillis?.()||0));
}
// Fotos são imutáveis. Reutiliza cache e pedidos simultâneos, com duas buscas por vez.
export function photoLoader(read,{valid,allowed,onValue,onError,max=24,concurrency=2}){
 const cache=new Map(),pending=new Map(),queue=[];let running=0,version=0;
 function pump(){
  while(running<concurrency&&queue.length){
   const job=queue.shift();running++;
   Promise.resolve().then(()=>{
    if(job.version!==version||!allowed(job.id))return null;
    return read(job.id);
   }).then(value=>{
    if(job.version!==version||!allowed(job.id))return;
    if(!valid(value))throw Error('Foto indisponível.');
    cache.delete(job.id);cache.set(job.id,value);
    while(cache.size>max)cache.delete(cache.keys().next().value);
    onValue(job.id,value);
   }).catch(error=>{if(job.version===version&&allowed(job.id))onError(job.id,error);})
   .finally(()=>{running--;if(pending.get(job.id)===job)pending.delete(job.id);job.resolve();pump();});
  }
 }
 return {
  load(id){
   if(!allowed(id))return Promise.resolve();
   if(cache.has(id)){const value=cache.get(id);cache.delete(id);cache.set(id,value);onValue(id,value);return Promise.resolve();}
   if(pending.has(id))return pending.get(id).promise;
   const job={id,version};job.promise=new Promise(resolve=>{job.resolve=resolve});pending.set(id,job);queue.push(job);pump();return job.promise;
  },
  clear(){version++;cache.clear();pending.clear();for(const job of queue)job.resolve();queue.length=0;}
 };
}
