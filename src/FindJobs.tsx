import {useMemo,useState} from 'react';
import {matchResume} from './lib/core.mjs';

type Job={id:string;title:string;company:string;location:string;description:string;url:string;salary:string;posted:string;source:string};
const plain=(s:string)=>s.replace(/<[^>]*>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
const searchUrl='/api/job-search';
export default function FindJobs({resumeText,onSave}:{resumeText:string;onSave:(job:Job)=>void}){
 const resume=resumeText;const[query,setQuery]=useState('Engineering Manager'),[jobs,setJobs]=useState<Job[]>([]);
 const[busy,setBusy]=useState(false),[error,setError]=useState(''),[searched,setSearched]=useState(false);
 const[onlyRelevant,setOnlyRelevant]=useState(true);
 const ranked=useMemo(()=>jobs.map(job=>({...job,match:matchResume(resume,job.description,job.title)})).sort((a,b)=>(b.match.score??-1)-(a.match.score??-1)),[jobs,resume]);
 const visible=onlyRelevant?ranked.filter(j=>j.match.score===null||j.match.score>=15):ranked;
 async function search(){
  if(busy)return;
  setBusy(true);setError('');setSearched(false);
  try{
   const q=query.trim().slice(0,80);if(!q)throw Error('Enter a position or search keyword.');
   const response=await fetch(searchUrl+'?search='+encodeURIComponent(q),{headers:{Accept:'application/json'}});
   if(!response.ok)throw Error('Job source is temporarily unavailable (HTTP '+response.status+').');
   const payload=await response.json();
   if(!Array.isArray(payload.jobs))throw Error('Job source returned an unexpected response.');
   const items:Job[]=payload.jobs.slice(0,100).flatMap((v:Record<string,unknown>)=>{
    const url=String(v.url||'');
    if(!url.startsWith('https://remotive.com/'))return[];
    return[{id:'remotive-'+String(v.id||url),title:String(v.title||'').slice(0,180),company:String(v.company_name||'').slice(0,140),location:String(v.candidate_required_location||'Remote').slice(0,160),description:plain(String(v.description||'')).slice(0,16000),url,salary:String(v.salary||'').slice(0,150),posted:String(v.publication_date||'').slice(0,30),source:'Remotive'}];
   });
   setJobs(items);setSearched(true);
  }catch(e){setError(e instanceof Error?e.message:'Search failed.');}
  finally{setBusy(false);}
 }

 return <><div className="sectionhead"><div><h1>Find jobs for me</h1><p>Personal job search from public listings. Compare openings with your resume, save interesting jobs, and apply on the employer site.</p></div></div>
 <section className="panel" style={{padding:24}}>
  <div className="field"><label className="field-label" htmlFor="jf-role">Search role or keywords</label><input id="jf-role" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Engineering Manager, Java Lead, Backend Manager" /></div>
  <p className="hint">Matching automatically uses your saved Resume &amp; profile. You only need to upload or change it there once.</p>
  <p className="hint">Only the search keywords are sent to the jobs source through a Cloudflare Pages Function. Your resume stays in this browser; the displayed score is keyword overlap, not an ATS score. Listings may have geographic restrictions.</p>
  <div style={{display:'flex',gap:12,flexWrap:'wrap',alignItems:'center'}}><button className="btn primary" disabled={busy} onClick={()=>void search()}>{busy?'Searching...':'Search open jobs'}</button><label style={{display:'flex',gap:8,alignItems:'center'}}><input type="checkbox" checked={onlyRelevant} onChange={e=>setOnlyRelevant(e.target.checked)}/> Filter low matches</label></div>
  {error&&<p role="alert" style={{marginTop:12}}>{error}</p>}
 </section>
 {searched&&<section className="panel" style={{padding:24,marginTop:18}}><h2>{visible.length} jobs found</h2>
  <p className="hint">Source: <a href="https://remotive.com/" target="_blank" rel="noreferrer">Remotive</a>. Listings may appear up to 24 hours late. Recheck the live employer posting before applying.</p>
  {!resume.trim()&&<p className="hint">Add your resume text above to calculate matches.</p>}
  {visible.map(j=><article key={j.id} style={{padding:'16px 0',borderBottom:'1px solid #dce6eb'}}>
   <h3 style={{marginBottom:6}}>{j.title}</h3><p>{j.company} · {j.location}{j.salary?' · '+j.salary:''}</p>
   <p className="hint">{j.match.score===null?'Match unavailable':j.match.score+'% keyword overlap'}{j.posted?' · Posted '+j.posted.slice(0,10):''}</p>
   <p>{j.description.slice(0,350)}{j.description.length>350?'…':''}</p>
   <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
    <a className="btn primary" href={j.url} target="_blank" rel="noopener noreferrer">Open job &amp; apply ↗</a>
    <button className="btn outline" onClick={()=>onSave(j)}>Save to my jobs</button>
   </div>
  </article>)}
  {!visible.length&&<p>Nothing matched this search and filter. Try other keywords or disable filtering.</p>}
 </section>}
 </>;
}
