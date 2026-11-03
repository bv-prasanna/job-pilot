// Cloudflare Pages Function: merge public remote-job sources with attribution.
// Only search keywords are sent upstream; candidate resumes stay on the device.
const reply=(status,body)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json','cache-control':'public,max-age=900','x-content-type-options':'nosniff'}});
import {titleRelevance} from '../../src/lib/titleRelevance.mjs';
import {indiaEligibility} from '../../src/lib/indiaEligibility.mjs';
const DEFAULT_BOARDS=[['greenhouse','stripe'],['greenhouse','gitlab'],['greenhouse','coinbase'],['greenhouse','airbnb'],['ashby','notion'],['ashby','ramp']];
const scrub=x=>String(x??'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
async function load(url){
 const response=await fetch(url,{headers:{accept:'application/json'},signal:AbortSignal.timeout(12000),cf:{cacheTtl:1800,cacheEverything:true}});
 if(!response.ok)throw Error('HTTP '+response.status);
 const body=await response.text();if(body.length>4000000)throw Error('Oversized feed');
 return JSON.parse(body);
}
export async function onRequestGet({request}){
 const search=new URL(request.url).searchParams.get('search')?.trim()||'';
 if(!search||search.length>80)return reply(400,{error:'Enter a search phrase up to 80 characters'});
 const remotive='https://remotive.com/api/remote-jobs?search='+encodeURIComponent(search)+'&limit=100';
 const himalayas='https://himalayas.app/jobs/api/search?q='+encodeURIComponent(search)+'&sort=recent&page=1';
 const params=new URL(request.url).searchParams;
 const jobicy='https://jobicy.com/api/jobs?count=100&tag='+encodeURIComponent(search.slice(0,50));
 const boardSpecs=(params.get('boards')||'').split(',').map(v=>v.trim()).filter(Boolean).slice(0,12);
 const publicBoards=boardSpecs.flatMap(value=>{
  const match=/^(greenhouse|lever|ashby):([a-zA-Z0-9_-]{2,80})$/.exec(value);
  if(!match)return [];
  const [,provider,board]=match;
  const url=provider==='greenhouse'?'https://boards-api.greenhouse.io/v1/boards/'+board+'/jobs?content=true':provider==='lever'?'https://api.lever.co/v0/postings/'+board+'?mode=json':'https://api.ashbyhq.com/posting-api/job-board/'+board;
  return [{provider,board,url}];
 });
 const automaticBoards=DEFAULT_BOARDS.map(([provider,board])=>({provider,board,url:provider==='greenhouse'?'https://boards-api.greenhouse.io/v1/boards/'+board+'/jobs?content=true':'https://api.ashbyhq.com/posting-api/job-board/'+board}));
 const boards=[...new Map([...automaticBoards,...publicBoards].map(b=>[b.provider+':'+b.board,b])).values()];
 const outcomes=await Promise.allSettled([load(remotive),load(himalayas),load(jobicy),...boards.map(b=>load(b.url))]);
 const jobs=[],sources=[],errors=[];
 if(outcomes[0].status==='fulfilled'){
  sources.push('Remotive');
  for(const j of (outcomes[0].value.jobs||[]).slice(0,100)){
   if(typeof j.url!=='string'||!j.url.startsWith('https://remotive.com/'))continue;
   jobs.push({id:'remotive-'+j.id,title:scrub(j.title),company:scrub(j.company_name),location:scrub(j.candidate_required_location||'Remote'),description:scrub(j.description).slice(0,16000),url:j.url,salary:scrub(j.salary),posted:j.publication_date||'',source:'Remotive'});
  }
 }else errors.push('Remotive unavailable');
 if(outcomes[1].status==='fulfilled'){
  sources.push('Himalayas');
  for(const j of (outcomes[1].value.jobs||[]).slice(0,100)){
   // Himalayas terms require their applicationLink and visible source attribution.
   const link=String(j.applicationLink||'');
   if(!link.startsWith('https://himalayas.app/'))continue;
   const salary=j.minSalary||j.maxSalary?[j.minSalary,j.maxSalary].filter(x=>x!==null&&x!==undefined).join('–')+' '+(j.currency||'')+' / '+(j.salaryPeriod||'year'):'';
   const locations=Array.isArray(j.locationRestrictions)?j.locationRestrictions.map(v=>v.name).filter(Boolean).join(', '):'';
   jobs.push({id:'himalayas-'+String(j.guid||link),title:scrub(j.title),company:scrub(j.companyName),location:locations||'Worldwide remote',description:scrub(j.description||j.excerpt).slice(0,16000),url:link,salary,posted:j.pubDate||'',source:'Himalayas'});
  }
 }else errors.push('Himalayas unavailable');
 if(outcomes[2].status==='fulfilled'){
  sources.push('Jobicy');
  for(const j of (outcomes[2].value.jobs||[]).slice(0,100)){
   const url=String(j.url||'');
   if(!url.startsWith('https://jobicy.com/'))continue;
   jobs.push({id:'jobicy-'+String(j.id||url),title:scrub(j.jobTitle||j.title),company:scrub(j.companyName),location:scrub(j.jobGeo||j.location||'Remote'),description:scrub(j.jobDescription||j.description).slice(0,16000),url,salary:scrub(j.annualSalaryMin||''),posted:j.pubDate||'',source:'Jobicy'});
  }
 }else errors.push('Jobicy unavailable');
 for(let i=0;i<boards.length;i++){
  const b=boards[i],outcome=outcomes[i+3];
  if(outcome.status!=='fulfilled'){errors.push(b.provider+' '+b.board+' unavailable');continue;}
  const data=outcome.value;
  const rows=b.provider==='lever'?data:data.jobs;
  if(!Array.isArray(rows)){errors.push(b.provider+' '+b.board+' invalid response');continue;}
  sources.push(b.provider+':'+b.board);
  for(const j of rows.slice(0,150)){
   const title=scrub(j.title||j.text),url=String(b.provider==='greenhouse'?j.absolute_url:b.provider==='lever'?j.hostedUrl:j.jobUrl||'');
   if(!title||!/^https:\/\//.test(url)||titleRelevance(search,title)<=0)continue;
   const description=scrub(b.provider==='greenhouse'?j.content:b.provider==='lever'?j.descriptionPlain||j.description:j.descriptionPlain||j.descriptionHtml);
   const location=scrub(b.provider==='greenhouse'?j.location?.name:b.provider==='lever'?j.categories?.location: j.location|| (j.isRemote?'Remote':''));
   jobs.push({id:b.provider+'-'+b.board+'-'+(j.id||j.id||url),title,company:scrub(j.company_name||j.companyName||b.board),location,description:description.slice(0,16000),url,salary:'',posted:j.first_published||j.publishedAt||j.createdAt||'',source:b.provider+':'+b.board});
  }
 }
 if(!sources.length)return reply(502,{error:'All job sources unavailable. Please try again later.'});
 const deduped=[...new Map(jobs.filter(j=>j.title&&j.url).map(j=>[j.source+'|'+j.url,j])).values()];
 const relevant=deduped.filter(j=>titleRelevance(search,j.title)>0).map(j=>({...j,eligibility:indiaEligibility(j.location,j.description,j.title)}));
 const excludedCount=relevant.filter(j=>j.eligibility.status==='excluded').length;
 const candidates=relevant.filter(j=>j.eligibility.status!=='excluded').sort((a,b)=>{
  const statusRank=s=>s==='eligible'?1:0;
  return statusRank(b.eligibility.status)-statusRank(a.eligibility.status)||titleRelevance(search,b.title)-titleRelevance(search,a.title);
 });
 const counts=Object.fromEntries(sources.map(src=>[src,candidates.filter(j=>j.source===src).length]));
 return reply(200,{jobs:candidates.slice(0,250),sources,counts,excludedCount,errors});
}
