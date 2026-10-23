import {useMemo,useState} from 'react';
import {matchResume} from './lib/core.mjs';
import {titleRelevance} from './lib/titleRelevance.mjs';

type Job={id:string;title:string;company:string;location:string;description:string;url:string;salary:string;posted:string;source:string};
const plain=(s:string)=>s.replace(/<[^>]*>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
const searchUrl='/api/job-search';
type SavedResume={id:string;name:string;text:string;updatedAt:string};
export default function FindJobs({resumeText,savedResumes,onSave}:{resumeText:string;savedResumes:SavedResume[];onSave:(job:Job)=>void}){
 const [selectedResume,setSelectedResume]=useState('profile');
 const resume=selectedResume==='profile'?resumeText:(savedResumes.find(v=>v.id===selectedResume)?.text||resumeText);
 const selectedName=selectedResume==='profile'?'Current profile resume':(savedResumes.find(v=>v.id===selectedResume)?.name||'Current profile resume');const[query,setQuery]=useState('Engineering Manager'),[jobs,setJobs]=useState<Job[]>([]);
 const[busy,setBusy]=useState(false),[error,setError]=useState(''),[searched,setSearched]=useState(false);
 const[onlyRelevant,setOnlyRelevant]=useState(false);const[location,setLocation]=useState('');const[boards,setBoards]=useState('');
 const ranked=useMemo(()=>jobs.map(job=>{const match=matchResume(resume,job.description,job.title);const occupation=titleRelevance(query,job.title);return {...job,match,occupation,relevance:occupation*100+(match.score??0)}}).filter(j=>j.occupation>0).sort((a,b)=>b.relevance-a.relevance),[jobs,resume,query]);
 const locationTerms=location.toLowerCase().split(/[,/]+/).map(v=>v.trim()).filter(Boolean);const filtered=ranked.filter(j=>!locationTerms.length||locationTerms.some(v=>v==='anywhere'||(v==='remote'&&/remote|worldwide/i.test(j.location))||(j.location+' '+j.description.slice(0,250)).toLowerCase().includes(v)));const visible=onlyRelevant?filtered.filter(j=>j.match.score===null||j.match.score>=15):filtered;
 async function search(){
  if(busy)return;
  setBusy(true);setError('');setSearched(false);
  try{
   const q=query.trim().slice(0,80);if(!q)throw Error('Enter a position or search keyword.');
   const response=await fetch(searchUrl+'?search='+encodeURIComponent(q)+(boards.trim()?'&boards='+encodeURIComponent(boards.trim()):''),{headers:{Accept:'application/json'}});
   if(!response.ok)throw Error('Job source is temporarily unavailable (HTTP '+response.status+').');
   const payload=await response.json();
   if(!Array.isArray(payload.jobs))throw Error('Job source returned an unexpected response.');
   const items:Job[]=payload.jobs.slice(0,200).flatMap((v:Record<string,unknown>)=>{
    const url=String(v.url||'');
    if(!/^https:\/\//.test(url))return[];
    return[{id:String(v.id||url),title:String(v.title||'').slice(0,180),company:String(v.company||'').slice(0,140),location:String(v.location||'Remote').slice(0,160),description:plain(String(v.description||'')).slice(0,16000),url,salary:String(v.salary||'').slice(0,150),posted:String(v.posted||'').slice(0,40),source:String(v.source||'Public feed')}];
   });
   setJobs(items);setSearched(true);
  }catch(e){setError(e instanceof Error?e.message:'Search failed.');}
  finally{setBusy(false);}
 }

 return <><div className="sectionhead"><div><h1>Find jobs for me</h1><p>Personal job search from public listings. Compare openings with your resume, save interesting jobs, and apply on the employer site.</p></div></div>
 <section className="panel" style={{padding:24}}>
  <div className="field"><label className="field-label" htmlFor="jf-role">Search role or keywords</label><input id="jf-role" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Engineering Manager, Java Lead, Backend Manager" /></div>
  <div className="field"><label className="field-label" htmlFor="jf-resume">Resume used for matching</label><select id="jf-resume" value={selectedResume} onChange={e=>{setSelectedResume(e.target.value);setSearched(false)}}><option value="profile">Current profile resume</option>{savedResumes.map(v=><option key={v.id} value={v.id}>{v.name}</option>)}</select><p className="hint">Using: <strong>{selectedName}</strong> ({resume.length.toLocaleString()} characters). {resume.trim()?"You can continue searching or choose another saved resume.":"No resume text saved yet; add one under Resume & profile."} Uploaded resumes are available here until you remove browser data.</p></div>
  <div className="field"><label className="field-label" htmlFor="jf-location">Location preferences (comma-separated; leave empty for all)</label><input id="jf-location" value={location} onChange={e=>setLocation(e.target.value)} placeholder="India, Bengaluru, Remote"/></div>
  <div className="field"><label className="field-label" htmlFor="jf-boards">Optional company ATS boards</label><input id="jf-boards" value={boards} onChange={e=>setBoards(e.target.value)} placeholder="greenhouse:company-board, lever:company-board, ashby:company-board"/></div>
  <p className="hint">The board field accepts public Greenhouse, Lever or Ashby board identifiers from companies you want to follow. No accounts or paid keys are needed to read their published postings.</p>
  <p className="hint">JobPilot reuses your selected saved resume. Import additional resume versions under Resume &amp; profile when needed.</p>
  <p className="hint">Only matching job titles are shown; unrelated occupations are excluded before resume scoring.</p>
  <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:14}}><a className="btn outline" href={"https://www.google.com/search?q="+encodeURIComponent(query+" jobs "+(location||"Bengaluru India"))} target="_blank" rel="noopener noreferrer">Search Google Jobs ↗</a><a className="btn outline" href={"https://www.linkedin.com/jobs/search/?keywords="+encodeURIComponent(query)+"&location="+encodeURIComponent(location||"Bengaluru, Karnataka, India")} target="_blank" rel="noopener noreferrer">Search LinkedIn Jobs ↗</a></div>
  <p className="hint">Google and LinkedIn links open their own live job searches; they are not imported or counted as JobPilot results. Applications are free where the employer permits.</p>
  <p className="hint">Only the search keywords are sent to the jobs source through a Cloudflare Pages Function. Your resume stays in this browser; the displayed score is keyword overlap, not an ATS score. Listings may have geographic restrictions.</p>
  <div style={{display:'flex',gap:12,flexWrap:'wrap',alignItems:'center'}}><button className="btn primary" disabled={busy} onClick={()=>void search()}>{busy?'Searching...':'Search open jobs'}</button><label style={{display:'flex',gap:8,alignItems:'center'}}><input type="checkbox" checked={onlyRelevant} onChange={e=>setOnlyRelevant(e.target.checked)}/> Hide low resume overlaps</label></div>
  {error&&<p role="alert" style={{marginTop:12}}>{error}</p>}
 </section>
 {searched&&<section className="panel" style={{padding:24,marginTop:18}}><h2>{visible.length} jobs found</h2>
  <p className="hint">Imported public listings: <a href="https://remotive.com/" target="_blank" rel="noreferrer">Remotive</a> and <a href="https://himalayas.app/" target="_blank" rel="noreferrer">Himalayas</a>. Remote roles may have country restrictions; check each listing before applying.</p>
  {!resume.trim()&&<p className="hint">Add your resume text above to calculate matches.</p>}
  {visible.map(j=><article key={j.id} style={{padding:'16px 0',borderBottom:'1px solid #dce6eb'}}>
   <h3 style={{marginBottom:6}}>{j.title}</h3><p>{j.company} · {j.location} · {j.source}{j.salary?' · '+j.salary:''}</p>
   <p className="hint">{j.match.score===null?'Match unavailable':j.match.score+'% keyword overlap'}{j.posted?' · Posted '+(Number(j.posted)?new Date(Number(j.posted)).toISOString().slice(0,10):j.posted.slice(0,10)):''}</p>
   <p>{j.description.slice(0,350)}{j.description.length>350?'…':''}</p>
   <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
    <a className="btn primary" href={j.url} target="_blank" rel="noopener noreferrer">Open job &amp; apply ↗</a>
    <button className="btn outline" onClick={()=>onSave(j)}>Save to my jobs</button>
   </div>
  </article>)}
  {!visible.length&&<p>No matching job titles were found from the connected public feeds. Try the Google Jobs or LinkedIn Jobs links above, or adjust your search terms.</p>}
 </section>}
 </>;
}
