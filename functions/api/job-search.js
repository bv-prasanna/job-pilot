// Cloudflare Pages Function: merge public remote-job sources with attribution.
// Only search keywords are sent upstream; candidate resumes stay on the device.
const reply=(status,body)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json','cache-control':'public,max-age=900','x-content-type-options':'nosniff'}});
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
 const outcomes=await Promise.allSettled([load(remotive),load(himalayas)]);
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
 if(!sources.length)return reply(502,{error:'All job sources unavailable. Please try again later.'});
 const deduped=[...new Map(jobs.filter(j=>j.title&&j.url).map(j=>[j.source+'|'+j.url,j])).values()];
 return reply(200,{jobs:deduped,sources,errors});
}
