// Usa a sessão do Firebase CLI; nunca imprime nem grava tokens no repositório.
const fs=require('node:fs'),path=require('node:path');
const {initializeApp,deleteApp}=require('firebase-admin/app');
const {Firestore}=require(require.resolve('@google-cloud/firestore',{paths:[path.dirname(require.resolve('firebase-admin'))]}));
const {getAuth}=require('firebase-admin/auth');
function cliRoot(){
 if(process.env.FIREBASE_TOOLS_ROOT)return process.env.FIREBASE_TOOLS_ROOT;
 const cache=path.join(process.env.LOCALAPPDATA,'npm-cache','_npx');
 for(const item of fs.readdirSync(cache)){
  const candidate=path.join(cache,item,'node_modules','firebase-tools');
  if(fs.existsSync(path.join(candidate,'lib','auth.js')))return candidate;
 }
 throw Error('Instale firebase-tools com npx antes de executar.');
}
async function context(){
 const root=cliRoot(),cliAuth=require(path.join(root,'lib/auth.js'));
 const account=cliAuth.getGlobalDefaultAccount();if(!account)throw Error('Entre com o Firebase CLI primeiro.');
 await require(path.join(root,'lib/requireAuth.js')).requireAuth({project:'congresso-monogamico',...account});
 const credential={async getAccessToken(){const token=await cliAuth.getAccessToken(account.tokens.refresh_token,require(path.join(root,"lib/api.js")).getScopes());return {access_token:token.access_token,expires_in:token.expires_in||3600};}};
 const app=initializeApp({projectId:'congresso-monogamico',credential},'setup-'+Date.now());
 const api=require(path.join(root,'lib/api.js'));
 const db=new Firestore({projectId:'congresso-monogamico',preferRest:true,credentials:{type:'authorized_user',client_id:api.clientId(),client_secret:api.clientSecret(),refresh_token:account.tokens.refresh_token}});
 return {root,app,db,auth:getAuth(app),close:async()=>{await db.terminate();await deleteApp(app);},mcp:{projectId:'congresso-monogamico'}};
}
module.exports={context};