import test from 'node:test';
import assert from 'node:assert/strict';
import {feedUrl,normalizeJobs,discover} from '../server/discovery.mjs';
test('only supported public feeds, strict board identifiers',()=>{
 assert.equal(feedUrl('greenhouse','sample'), 'https://boards-api.greenhouse.io/v1/boards/sample/jobs?content=true');
 assert.throws(()=>feedUrl('lever','../x'));
 assert.throws(()=>feedUrl('unknown','sample'));
});
test('Greenhouse job normalization removes HTML markup',()=>{
 const data=normalizeJobs('greenhouse',{jobs:[{id:1,title:'Manager',content:'<p>Java</p>',absolute_url:'https://example.com/1',location:{name:'Remote'}}]},'sample');
 assert.equal(data[0].description,'Java');assert.equal(data[0].location,'Remote');
});
test('Lever jobs normalize and reject unsafe links',()=>{
 const data=normalizeJobs('lever',[{id:'a',text:'Lead',hostedUrl:'https://jobs.lever.co/x',descriptionPlain:'Backend'},{text:'Bad',hostedUrl:'javascript:alert(1)'}],'sample');
 assert.equal(data.length,1);assert.equal(data[0].source,'lever');
});
test('discovery uses fixed HTTPS provider endpoint',async()=>{
 let called;
 const fetcher=async url=>{called=url;return {ok:true,headers:new Headers(),text:async()=>JSON.stringify({jobs:[]})}};
 assert.deepEqual(await discover({provider:'greenhouse',board:'test-board',fetcher}),[]);
 assert.match(called,/boards-api.greenhouse.io/);
});
test('discovery rejects oversized responses',async()=>{
 await assert.rejects(()=>discover({provider:'greenhouse',board:'demo',fetcher:async()=>({ok:true,headers:new Headers({'content-length':'3000000'})})}));
});