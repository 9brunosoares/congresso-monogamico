// Auditoria somente de leitura. Não cria contas, não altera dados e não imprime tokens.
const path=require('node:path');
const {context}=require('./firebase-context.cjs');
(async()=>{
 const c=await context();
 try{
  const collections=['people','agenda','points','expenses','tasks','cases','casePhotos','chat'];
  const counts=Object.fromEntries(await Promise.all(collections.map(async name=>[name,(await c.db.collection(name).count().get()).data().count])));
  console.log(JSON.stringify({edition:'STANDARD',project:'congresso-monogamico',documentCounts:counts},null,2));
  try{await c.db.collection('cases').where('status','==','ok').orderBy('createdAt','desc').limit(12).get();console.log('Índice do mural: consulta paginada disponível.');}
  catch(error){console.log('Índice do mural: ainda indisponível ('+(error.code||'erro')+').');}
  const {Client}=require(path.join(c.root,'lib/apiv2.js'));
  const client=new Client({urlPrefix:'https://monitoring.googleapis.com',apiVersion:'v3',auth:true});
  const end=new Date(),start=new Date(end.getTime()-86400000);
  const metrics={};
  for(const name of ['read_count','write_count','delete_count']){
   try{
    const result=await client.get('/projects/congresso-monogamico/timeSeries',{queryParams:{filter:`metric.type="firestore.googleapis.com/document/${name}"`,
     'interval.startTime':start.toISOString(),'interval.endTime':end.toISOString(),
     'aggregation.alignmentPeriod':'86400s','aggregation.perSeriesAligner':'ALIGN_SUM','aggregation.crossSeriesReducer':'REDUCE_SUM',view:'FULL'},skipLog:{body:true}});
    const series=result.body.timeSeries||[];
    metrics[name]=series.length?series.reduce((sum,s)=>sum+(s.points||[]).reduce((a,p)=>a+Number(p.value?.int64Value||p.value?.doubleValue||0),0),0):null;
   }catch(error){metrics[name]=null;}
  }
  console.log(JSON.stringify({window:'Últimas 24 horas; não equivale ao dia de quota do Pacífico',start:start.toISOString(),end:end.toISOString(),metrics,note:'null significa métrica indisponível, nunca zero presumido.'},null,2));
 }finally{await c.close();}
})().catch(error=>{console.error(error.message);process.exitCode=1;});
