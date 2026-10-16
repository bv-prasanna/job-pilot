import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createApp} from '../server/app.mjs';
import {createRateLimiter,validateEntityReferences} from '../server/security.mjs';
const token='a'.repeat(36);
test('rate limiter enforces window',()=>{let now=0;const f=createRateLimiter({max:2,windowMs:50,clock:()=>now});assert.equal(f('ip'),true);assert.equal(f('ip'),true);assert.equal(f('ip'),false);now=51;assert.equal(f('ip'),true);});
test('validates contact and job references',()=>{const s={jobs:[{id:'j'}],contacts:[{id:'c',email:'hr@example.com'}]};assert.throws(()=>validateEntityReferences(s,'outreach',{contactId:'bad'}));assert.throws(()=>validateEntityReferences(s,'applications',{jobId:'bad'}));assert.throws(()=>validateEntityReferences(s,'outreach',{contactId:'c',recipient:'wrong@example.com'}));assert.doesNotThrow(()=>validateEntityReferences(s,'outreach',{contactId:'c',recipient:'HR@example.com'}));});
test('authenticated REST CRUD, input checks, and disk persistence',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'jobpilot-'));const file=join(dir,'db.json');const server=createApp({file,token}).listen(0);await new Promise(r=>server.once('listening',r));const port=server.address().port;
 async function req(path,method='GET',body,auth=true){const res=await fetch('http://127.0.0.1:'+port+path,{method,headers:{...(auth?{authorization:'Bearer '+token}:{}),...(body?{'content-type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});return {status:res.status,data:res.status===204?null:await res.json()};}
 try{
 assert.equal((await req('/api/jobs')).status,200);
 assert.equal((await req('/api/jobs','GET',null,false)).status,401);
 assert.equal((await req('/api/jobs','POST',{title:'Manager',company:'Example'})).status,201);
 assert.equal((await req('/api/jobs','POST',{title:'Missing company'})).status,400);
 const job=(await req('/api/jobs')).data.items[0];
 assert.equal((await req('/api/applications','POST',{jobId:'bad'})).status,400);
 assert.equal((await req('/api/applications','POST',{jobId:job.id,status:'Saved'})).status,201);
 assert.equal((await req('/api/jobs/'+job.id,'PUT',{status:'Interview'})).status,200);
 assert.equal((await req('/api/jobs/'+job.id)).data.status,'Interview');
 const profile=(await req('/api/profiles','POST',{name:'Candidate',resumeText:'engineering management Java'})).data;
 assert.equal((await req('/api/jobs/'+job.id+'/match','POST',{profileId:profile.id})).status,200);
 assert.equal((await req('/api/jobs/'+job.id+'/match','POST',{profileId:'bad'})).status,404);
 assert.equal((await req('/api/overview')).data.jobs,1);
 assert.equal((await req('/api/rank','POST',{profileId:profile.id})).status,200);
 assert.equal((await req('/api/rank','POST',{profileId:profile.id,minimumScore:101})).status,400);
 assert.equal((await req('/api/rank','POST',{profileId:'missing'})).status,404);
 assert.equal((await req('/api/follow-ups?days=0')).status,400);
 assert.equal((await req('/api/follow-ups?days=7')).status,200);
 assert.equal((await req('/api/jobs/'+job.id+'/contacts')).status,200);
 assert.equal((await req('/api/jobs/'+job.id+'/contacts?kind=invalid')).status,400);
 
 assert.equal((await req('/api/jobs/'+job.id,'DELETE')).status,409);
 const application=(await req('/api/applications')).data.items[0];
 assert.equal((await req('/api/applications/'+application.id,'DELETE')).status,204);
 assert.equal((await req('/api/jobs/'+job.id,'DELETE')).status,204);
 assert.equal((await req('/api/jobs/'+job.id)).status,404);
 }finally{await new Promise(r=>server.close(r));await rm(dir,{recursive:true,force:true});}
});
