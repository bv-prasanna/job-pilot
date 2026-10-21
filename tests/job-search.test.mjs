import test from 'node:test';
import assert from 'node:assert/strict';
import {onRequestGet} from '../functions/api/job-search.js';

test('job-search merges both feeds and keeps source labels',async()=>{
 const original=globalThis.fetch;
 globalThis.fetch=async url=>{
  const value=String(url);
  const body=value.includes('himalayas.app')
   ?{jobs:[{guid:'j2',title:'Java Engineering Manager',companyName:'Sample Two',description:'Java microservices',applicationLink:'https://himalayas.app/jobs/java-manager',locationRestrictions:[{name:'India'}]}]}
   :{jobs:[{id:1,title:'Backend Engineering Manager',company_name:'Sample One',description:'Java backend',url:'https://remotive.com/remote-jobs/software-dev/backend-manager',candidate_required_location:'Worldwide'}]};
  return {ok:true,text:async()=>JSON.stringify(body)};
 };
 try{
  const res=await onRequestGet({request:new Request('https://example.com/api/job-search?search=Engineering%20Manager')});
  const data=await res.json();
  assert.equal(res.status,200);
  assert.equal(data.jobs.length,2);
  assert.deepEqual(data.sources,['Remotive','Himalayas']);
  assert.equal(data.jobs[1].source,'Himalayas');
  assert.equal(data.jobs[1].location,'India');
 }finally{globalThis.fetch=original;}
});
test('job-search returns partial results when one source fails',async()=>{
 const original=globalThis.fetch;
 globalThis.fetch=async url=>{
  if(String(url).includes('himalayas.app'))throw Error('offline');
  return {ok:true,text:async()=>JSON.stringify({jobs:[{id:1,title:'Java Lead',company_name:'Example',url:'https://remotive.com/remote-jobs/java-lead'}]})};
 };
 try{
  const res=await onRequestGet({request:new Request('https://example.com/api/job-search?search=Java')});
  const data=await res.json();
  assert.equal(res.status,200);
  assert.equal(data.jobs.length,1);
  assert.ok(data.errors.includes('Himalayas unavailable'));
 }finally{globalThis.fetch=original;}
});

test('fetches public Greenhouse, Lever and Ashby job boards',async()=>{
 const original=globalThis.fetch;
 globalThis.fetch=async url=>{
  const u=String(url);
  let body={jobs:[]};
  if(u.includes('boards-api.greenhouse.io'))body={jobs:[{id:12,title:'Engineering Manager',absolute_url:'https://boards.greenhouse.io/demo/jobs/12',content:'Java',location:{name:'Bengaluru'}}]};
  if(u.includes('api.lever.co'))body=[{id:'l1',text:'Java Lead',hostedUrl:'https://jobs.lever.co/demo/l1',descriptionPlain:'Java',categories:{location:'India'}}];
  if(u.includes('api.ashbyhq.com'))body={jobs:[{id:'a1',title:'Backend Manager',jobUrl:'https://jobs.ashbyhq.com/demo/a1',descriptionPlain:'Microservices',location:'Remote'}]};
  return {ok:true,text:async()=>JSON.stringify(body)};
 };
 try{
  const res=await onRequestGet({request:new Request('https://example.com/api/job-search?search=Manager&boards=greenhouse:demo,lever:demo,ashby:demo')});
  const json=await res.json();
  assert.equal(res.status,200);
  assert.equal(json.jobs.length,3);
  assert.ok(json.sources.includes('greenhouse:demo'));
  assert.ok(json.sources.includes('lever:demo'));
  assert.ok(json.sources.includes('ashby:demo'));
 }finally{globalThis.fetch=original;}
});
test('rejects invalid or missing search terms',async()=>{
 const res=await onRequestGet({request:new Request('https://example.com/api/job-search')});
 assert.equal(res.status,400);
});
