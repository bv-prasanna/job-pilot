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
