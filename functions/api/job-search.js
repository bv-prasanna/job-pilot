// Cloudflare Pages Function: server-side proxy to public Remotive job listings.
// No credentials or resume content are sent to the provider.
export async function onRequestGet({request}){
 const url=new URL(request.url);
 const q=(url.searchParams.get('search')||'').trim();
 const json=(status,body)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json','cache-control':'public, max-age=1800','x-content-type-options':'nosniff'}});
 if(!q||q.length>80)return json(400,{error:'Provide a search phrase up to 80 characters'});
 try{
  const remote=await fetch('https://remotive.com/api/remote-jobs?search='+encodeURIComponent(q)+'&limit=100',{headers:{accept:'application/json'},signal:AbortSignal.timeout(10000),cf:{cacheTtl:1800,cacheEverything:true}});
  if(!remote.ok)return json(502,{error:'Job source temporarily unavailable'});
  const raw=await remote.text();
  if(raw.length>3000000)return json(502,{error:'Job feed too large'});
  const payload=JSON.parse(raw);
  if(!Array.isArray(payload.jobs))return json(502,{error:'Invalid feed response'});
  return json(200,{jobs:payload.jobs.slice(0,100),source:'Remotive'});
 }catch{return json(502,{error:'Job search service unavailable'});}
}
