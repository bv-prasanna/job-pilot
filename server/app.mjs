import http from 'node:http';
import {randomUUID,timingSafeEqual} from 'node:crypto';
import {readFile,writeFile,rename,mkdir} from 'node:fs/promises';
import {dirname} from 'node:path';
import {matchResume,draftMessage,validEmail,safeUrl,clean} from '../src/lib/core.mjs';
import {createRateLimiter,validateEntityReferences} from './security.mjs';
import {discover} from './discovery.mjs';
import {findContacts,rankJobs,followUps,overview} from './workflows.mjs';
const types=['profiles','jobs','contacts','outreach','applications'];
const statuses=['Saved','Applied','Contacted','Interview','Offer','Rejected'];
const kinds=['recruiter','referral'];
const reply=(res,status,body)=>{res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'});res.end(JSON.stringify(body));};
const fail=(status,message)=>Object.assign(new Error(message),{status});
function secureEqual(a,b){const x=Buffer.from(a||'');const y=Buffer.from(b||'');return x.length===y.length&&timingSafeEqual(x,y);}
function scrub(type,input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw fail(400,'Expected JSON object');
 const fields={profiles:{name:120,email:254,resumeText:100000,headline:240,location:120,skills:2000,notes:2000},jobs:{title:180,company:160,description:40000,location:160,url:2000,source:160,status:40,notes:3000},contacts:{name:120,email:254,company:160,title:160,kind:30,profileUrl:2000,sourceUrl:2000,relationship:200,notes:2000},outreach:{jobId:80,contactId:80,subject:300,body:10000,recipient:254,kind:30,status:40,notes:2000},applications:{jobId:80,status:40,notes:3000,appliedAt:40}};
 const value={};for(const [k,max] of Object.entries(fields[type]))if(input[k]!=null)value[k]=clean(input[k],max);
 for(const k of ['email','recipient'])if(value[k]&&!validEmail(value[k]))throw fail(400,'Invalid email');
 for(const k of ['url','profileUrl','sourceUrl'])if(value[k]&&!safeUrl(value[k]))throw fail(400,'Invalid URL');
 if(value.kind&&!kinds.includes(value.kind))throw fail(400,'Invalid contact kind');
 if(value.status&&type==='outreach'&&!['Draft','Sent','Replied','Follow up','Closed'].includes(value.status))throw fail(400,'Invalid outreach status');
 if(value.status&&['jobs','applications'].includes(type)&&!statuses.includes(value.status))throw fail(400,'Invalid job status');
 return value;
}
async function parseBody(req,limit){if(!String(req.headers['content-type']||'').toLowerCase().startsWith('application/json'))throw fail(415,'JSON required');let data='';for await(const chunk of req){data+=chunk.toString();if(Buffer.byteLength(data)>limit)throw fail(413,'Body too large');}try{return JSON.parse(data);}catch{throw fail(400,'Invalid JSON');}}
export function createApp({file='./data/jobpilot.json',token=process.env.JOBPILOT_API_TOKEN,allowedOrigin=process.env.JOBPILOT_ALLOWED_ORIGIN||'',maxBody=200000}={}){
 if(!token||token.length<24)throw Error('JOBPILOT_API_TOKEN must be 24+ characters');
 let state=Object.fromEntries(types.map(t=>[t,[]])),loaded=false,queue=Promise.resolve();const allow=createRateLimiter();
 async function load(){if(loaded)return;try{const data=JSON.parse(await readFile(file,'utf8'));for(const t of types)state[t]=Array.isArray(data[t])?data[t]:[];}catch(e){if(e.code!=='ENOENT')throw e;}loaded=true;}
 async function save(){await mkdir(dirname(file),{recursive:true});const temp=file+'.'+randomUUID()+'.tmp';await writeFile(temp,JSON.stringify(state,null,2),{mode:0o600});await rename(temp,file);}
 function transaction(fn){const task=queue.then(async()=>{await load();const before=structuredClone(state);try{const result=fn();await save();return result;}catch(e){state=before;throw e;}});queue=task.catch(()=>{});return task;}
 async function handler(req,res){res.setHeader('x-frame-options','DENY');res.setHeader('referrer-policy','no-referrer');res.setHeader('content-security-policy',"default-src 'none'; frame-ancestors 'none'");
 const origin=req.headers.origin;if(origin&&origin===allowedOrigin){res.setHeader('access-control-allow-origin',origin);res.setHeader('vary','Origin');res.setHeader('access-control-allow-headers','Authorization, Content-Type');res.setHeader('access-control-allow-methods','GET, POST, PUT, DELETE, OPTIONS');}
 if(req.method==='OPTIONS'){res.writeHead(origin&&origin===allowedOrigin?204:403);res.end();return;}
 if(origin&&origin!==allowedOrigin)return reply(res,403,{error:'Origin not allowed'});
 if(!allow(req.socket.remoteAddress||'unknown'))return reply(res,429,{error:'Rate limit exceeded'});
 if(!secureEqual((req.headers.authorization||'').replace(/^Bearer /i,''),token))return reply(res,401,{error:'Unauthorized'});
 try{await queue;await load();const url=new URL(req.url,'http://localhost');const parts=url.pathname.split('/').filter(Boolean);
 if(url.pathname==='/api/health'&&req.method==='GET')return reply(res,200,{ok:true,version:1});
 if(parts[0]!=='api')throw fail(404,'Not found');const type=parts[1],id=parts[2];
 if(type==='discover'&&req.method==='POST'&&!id){const body=await parseBody(req,maxBody);try{const items=await discover({provider:body.provider,board:body.board});return reply(res,200,{items,count:items.length,imported:false});}catch(e){throw fail(/Invalid board|Unsupported provider/.test(e.message)?400:502,'Job feed unavailable');}}
 if(type==='match'&&req.method==='POST'&&!id){const b=await parseBody(req,maxBody);return reply(res,200,matchResume(b.resumeText,b.description,b.title));}
 if(type==='draft'&&req.method==='POST'&&!id){return reply(res,200,draftMessage(await parseBody(req,maxBody)));}
 if(type==='jobs'&&id&&parts[3]==='match'&&parts.length===4&&req.method==='POST'){const job=state.jobs.find(x=>x.id===id);if(!job)throw fail(404,'Job not found');const body=await parseBody(req,maxBody);const profile=state.profiles.find(x=>x.id===body.profileId);if(!profile)throw fail(404,'Profile not found');return reply(res,200,{jobId:job.id,profileId:profile.id,...matchResume(profile.resumeText||'',job.description||'',job.title||'')});}
 if(!types.includes(type)||parts.length>3)throw fail(404,'Not found');
 if(req.method==='GET'){if(id){const item=state[type].find(v=>v.id===id);if(!item)throw fail(404,'Not found');return reply(res,200,item);}return reply(res,200,{items:state[type],count:state[type].length});}
 if(req.method==='POST'&&!id){const input=scrub(type,await parseBody(req,maxBody));if(type==='jobs'&&(!input.title||!input.company))throw fail(400,'Title and company required');if(type==='contacts'&&!input.name)throw fail(400,'Contact name required');const result=await transaction(()=>{validateEntityReferences(state,type,input);const now=new Date().toISOString();const item={id:randomUUID(),...input,createdAt:now,updatedAt:now};state[type].push(item);return item;});return reply(res,201,result);}
 if(req.method==='PUT'&&id){const input=scrub(type,await parseBody(req,maxBody));const result=await transaction(()=>{const i=state[type].findIndex(v=>v.id===id);if(i<0)throw fail(404,'Not found');validateEntityReferences(state,type,input);state[type][i]={...state[type][i],...input,updatedAt:new Date().toISOString()};return state[type][i];});return reply(res,200,result);}
 if(req.method==='DELETE'&&id){await transaction(()=>{const i=state[type].findIndex(v=>v.id===id);if(i<0)throw fail(404,'Not found');state[type].splice(i,1);});res.writeHead(204);res.end();return;}
 throw fail(405,'Method not allowed');
 }catch(e){reply(res,e.status||500,{error:e.status?e.message:'Internal server error'});}}
 return {handler,listen:(port=8787,host='127.0.0.1')=>http.createServer(handler).listen(port,host)};
}