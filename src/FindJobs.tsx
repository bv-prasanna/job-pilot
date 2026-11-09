import {useMemo,useState} from 'react';
import {matchResume} from './lib/core.mjs';
import {titleRelevance} from './lib/titleRelevance.mjs';
import {extractResumeText} from './lib/resume';
import {indiaEligibility} from './lib/indiaEligibility.mjs';

type Job={id:string;title:string;company:string;location:string;description:string;url:string;salary:string;posted:string;source:string};
const plain=(s:string)=>s.replace(/<[^>]*>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
const searchUrl='/api/job-search';
type SavedResume={id:string;name:string;text:string;updatedAt:string};
export default function FindJobs({resumeText,savedResumes,defaultResumeId,onSave,onUploadResume,onManageResumes}:{resumeText:string;savedResumes:SavedResume[];defaultResumeId?:string;onSave:(job:Job)=>void;onUploadResume:(version:SavedResume,file:File)=>Promise<void>;onManageResumes:()=>void}){
 const [selectedResume,setSelectedResume]=useState(()=>defaultResumeId||savedResumes.find(v=>v.text===resumeText)?.id||'profile');
 const [uploading,setUploading]=useState(false),[uploadMessage,setUploadMessage]=useState(''),[showResumeUpload,setShowResumeUpload]=useState(!resumeText.trim()&&!savedResumes.length);
 const selectedVersion=savedResumes.find(v=>v.id===selectedResume);
 const resume=selectedVersion?.text||(selectedResume==='profile'?resumeText:'');
 const selectedName=selectedVersion?.name||(resumeText.trim()?'Current profile resume':'No resume saved');
 const [query,setQuery]=useState('Engineering Manager'),[jobs,setJobs]=useState<Job[]>([]);
 async function uploadResume(file:File|undefined){
  if(!file)return;
  setUploading(true);setUploadMessage('');
  try{
   if(/\.(pdf|docx)$/i.test(file.name)&&file.size>7*1024*1024)throw Error('For saved Gmail attachments, please use a PDF/DOCX smaller than 7 MB.');
   const text=await extractResumeText(file);
   if(!text.trim())throw Error('No readable text in this resume. Please upload a text-based PDF/DOCX or save the resume text in Resume Management.');
   const version:SavedResume={id:crypto.randomUUID(),name:file.name,text,updatedAt:new Date().toISOString()};
   await onUploadResume(version,file);
   setSelectedResume(version.id);
   setSearched(false);
   setUploadMessage('Saved '+file.name+'. It will be reused until you change it.');setShowResumeUpload(false);
  }catch(e){setUploadMessage(e instanceof Error?e.message:'Unable to upload resume');}
  finally{setUploading(false);}
 }
 const[busy,setBusy]=useState(false),[error,setError]=useState(''),[searched,setSearched]=useState(false);
 const [sourceCounts,setSourceCounts]=useState<Record<string,number>>({}),[sourceErrors,setSourceErrors]=useState<string[]>([]),[serverExcludedCount,setServerExcludedCount]=useState(0);
 const[onlyRelevant,setOnlyRelevant]=useState(false);const[sourceFilter,setSourceFilter]=useState('all');const[showUnconfirmed,setShowUnconfirmed]=useState(false);const[location,setLocation]=useState('');const[boards,setBoards]=useState('');
 const ranked=useMemo(()=>jobs.map(job=>{
  const match=matchResume(resume,job.description,job.title);
  const occupation=titleRelevance(query,job.title);
  const eligibility=indiaEligibility(job.location,job.description,job.title);
  const employer=/^(greenhouse|lever|ashby):/i.test(job.source);
  const indiaOffice=/\b(india|bengaluru|bangalore|pune|hyderabad|chennai|mumbai|delhi)\b/i.test(job.location);
  return {...job,match,occupation,eligibility,employer,relevance:occupation*100+(match.score??0),priority:(employer?100000:0)+(indiaOffice?30000:0)};
 }).filter(j=>j.occupation>0).sort((a,b)=>(b.priority+b.relevance)-(a.priority+a.relevance)),[jobs,resume,query]);
 const locationTerms=location.toLowerCase().split(/[,/]+/).map(v=>v.trim()).filter(Boolean);
 const eligible=ranked.filter(j=>j.eligibility.status==='eligible');
 const unconfirmed=ranked.filter(j=>j.eligibility.status==='unknown');
 const restrictedCount=serverExcludedCount+ranked.filter(j=>j.eligibility.status==='excluded').length;
 const possible=(showUnconfirmed?[...eligible,...unconfirmed]:eligible).filter(j=>sourceFilter==='all'||(sourceFilter==='employer'?j.employer:!j.employer));
 const filtered=possible.filter(j=>!locationTerms.length||locationTerms.some(v=>v==='anywhere'||(v==='remote'&&/remote|worldwide/i.test(j.location))||(j.location+' '+j.description.slice(0,250)).toLowerCase().includes(v)));
 const visible=onlyRelevant?filtered.filter(j=>j.match.score===null||j.match.score>=15):filtered;
 async function search(){
  if(busy)return;
  setBusy(true);setError('');setSearched(false);
  try{
   const q=query.trim().slice(0,80);if(!q)throw Error('Enter a position or search keyword.');
   const response=await fetch(searchUrl+'?search='+encodeURIComponent(q)+(boards.trim()?'&boards='+encodeURIComponent(boards.trim()):''),{headers:{Accept:'application/json'}});
   if(!response.ok)throw Error('Job source is temporarily unavailable (HTTP '+response.status+').');
   const payload=await response.json();
   if(!Array.isArray(payload.jobs))throw Error('Job source returned an unexpected response.');
   const items:Job[]=payload.jobs.slice(0,250).flatMap((v:Record<string,unknown>)=>{
    const url=String(v.url||'');
    if(!/^https:\/\//.test(url))return[];
    return[{id:String(v.id||url),title:String(v.title||'').slice(0,180),company:String(v.company||'').slice(0,140),location:String(v.location||'Remote').slice(0,160),description:plain(String(v.description||'')).slice(0,16000),url,salary:String(v.salary||'').slice(0,150),posted:String(v.posted||'').slice(0,40),source:String(v.source||'Public feed')}];
   });
   setJobs(items);setSourceCounts(payload.counts&&typeof payload.counts==='object'?payload.counts:{});setSourceErrors(Array.isArray(payload.errors)?payload.errors:[]);setServerExcludedCount(Number(payload.excludedCount)||0);setSearched(true);
  }catch(e){setError(e instanceof Error?e.message:'Search failed.');}
  finally{setBusy(false);}
 }

 return <><div className="sectionhead"><div><h1>Find jobs for me</h1><p>Personal job search from public listings. Compare openings with your resume, save interesting jobs, and apply on the employer site.</p></div></div>
 <section className="panel" style={{padding:24}}>
  <div className="field"><label className="field-label" htmlFor="jf-role">Search role or keywords</label><input id="jf-role" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Engineering Manager, Java Lead, Backend Manager" /></div>
  <div className="field"><label className="field-label" htmlFor="jf-resume">Resume used for matching</label>
  {resumeText.trim()||savedResumes.length?<select id="jf-resume" value={selectedVersion?selectedResume:'profile'} onChange={e=>{setSelectedResume(e.target.value);setSearched(false)}}>
   <option value="profile">{resumeText.trim()?'Current profile resume':'No profile resume saved'}</option>
   {savedResumes.map(v=><option key={v.id} value={v.id}>{v.name}</option>)}
  </select>:<p role="status">No resume uploaded yet. Upload a resume below to calculate job matches.</p>}
  <p className="hint">Selected: <strong>{selectedName}</strong>{resume.trim()?' ('+resume.length.toLocaleString()+' characters)':' — no readable resume text selected'}. Your uploaded resume stays in this browser.</p>
  <div style={{display:'flex',gap:12,alignItems:'center',flexWrap:'wrap'}}>
   {resume.trim()&&!showResumeUpload?<strong>Resume saved — upload not required</strong>:null}
   <button type="button" className="btn outline" onClick={()=>setShowResumeUpload(v=>!v)}>{showResumeUpload?'Cancel upload':'Upload / replace resume'}</button>
   <button type="button" className="btn outline" onClick={onManageResumes}>Manage all resumes</button>
  </div>
  {showResumeUpload&&<div className="field" style={{marginTop:12}}>
   <label className="field-label" htmlFor="jf-upload">Choose PDF/DOCX (under 7 MB), TXT or MD (only when adding/changing a resume)</label>
   <input id="jf-upload" type="file" accept=".pdf,.docx,.txt,.md" disabled={uploading} onChange={e=>{void uploadResume(e.target.files?.[0]);e.target.value='';}}/>
  </div>}
  {uploadMessage&&<p role="status" className="hint">{uploadMessage}</p>}
 </div>
  <div className="field"><label className="field-label" htmlFor="jf-location">Additional location keywords (optional)</label><input id="jf-location" value={location} onChange={e=>setLocation(e.target.value)} placeholder="Bengaluru, Hyderabad"/></div>
  <p className="hint">India eligibility is applied automatically. Jobs restricted to the US, Brazil or other foreign regions are excluded. Leaving this additional field empty includes Bengaluru, elsewhere in India and explicitly worldwide-eligible positions.</p>
  <div className="field"><label className="field-label" htmlFor="jf-boards">Optional company ATS boards</label><input id="jf-boards" value={boards} onChange={e=>setBoards(e.target.value)} placeholder="greenhouse:company-board, lever:company-board, ashby:company-board"/></div>
  <p className="hint">The board field accepts public Greenhouse, Lever or Ashby board identifiers from companies you want to follow. No accounts or paid keys are needed to read their published postings.</p>
  <p className="hint">JobPilot uses your saved resume automatically. Upload again only if you want to add or change it.</p>
  <p className="hint">Only matching job titles are shown; unrelated occupations are excluded before resume scoring.</p>
  <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:14}}><a className="btn outline" href={"https://www.google.com/search?q="+encodeURIComponent(query+" jobs "+(location||"Bengaluru India"))} target="_blank" rel="noopener noreferrer">Search Google Jobs ↗</a><a className="btn outline" href={"https://www.linkedin.com/jobs/search/?keywords="+encodeURIComponent(query)+"&location="+encodeURIComponent(location||"Bengaluru, Karnataka, India")} target="_blank" rel="noopener noreferrer">Search LinkedIn Jobs ↗</a></div>
  <p className="hint">Google and LinkedIn links open their own live job searches; they are not imported or counted as JobPilot results. Applications are free where the employer permits.</p>
  <p className="hint">Only the search keywords are sent to the jobs source through a Cloudflare Pages Function. Your resume stays in this browser; the displayed score is keyword overlap, not an ATS score. Listings may have geographic restrictions.</p>
  <div style={{display:'flex',gap:12,flexWrap:'wrap',alignItems:'center'}}><button className="btn primary" disabled={busy} onClick={()=>void search()}>{busy?'Searching...':'Search India-eligible jobs'}</button><label style={{display:'flex',gap:8,alignItems:'center'}}><input type="checkbox" checked={onlyRelevant} onChange={e=>setOnlyRelevant(e.target.checked)}/> Hide low resume overlaps</label><label style={{display:'flex',gap:8,alignItems:'center'}}><input type="checkbox" checked={showUnconfirmed} onChange={e=>setShowUnconfirmed(e.target.checked)}/> Also show location-unverified jobs</label></div>
  {error&&<p role="alert" style={{marginTop:12}}>{error}</p>}
 </section>
 {searched&&<section className="panel" style={{padding:24,marginTop:18}}><h2>{visible.length} India-relevant jobs shown</h2>
  <div style={{display:'flex',gap:12,alignItems:'center',flexWrap:'wrap',marginBottom:12}}><label htmlFor="jf-source">Show sources</label><select id="jf-source" value={sourceFilter} onChange={e=>setSourceFilter(e.target.value)}><option value="all">All eligible sources (employer postings first)</option><option value="employer">Direct employer career boards</option><option value="feeds">Remote job feeds</option></select></div>
  <p className="hint">Direct employer postings from public Greenhouse, Lever and Ashby boards are ranked ahead of aggregator listings. This does not guarantee an employer will accept every application.</p>
  <p className="hint">Eligibility: {eligible.length} explicitly India/worldwide · {unconfirmed.length} not verified (hidden by default) · {restrictedCount} excluded for foreign-location restrictions. JobPilot cannot independently guarantee employer eligibility; verify each live application page.</p>
  <p className="hint">Sources checked: {Object.entries(sourceCounts).map(([source,count])=>source+" ("+count+")").join(" · ")||"No source statistics available"}. Counts reflect candidate job titles after foreign-only roles are removed, before your additional location and resume filters.</p>
  {sourceErrors.length>0&&<p className="hint">Some sources could not be reached: {sourceErrors.join(", ")}. The other sources remain available.</p>}
  <p className="hint">Listings come from public company career boards and free remote-job sources including <a href="https://remotive.com/" target="_blank" rel="noreferrer">Remotive</a>, <a href="https://himalayas.app/" target="_blank" rel="noreferrer">Himalayas</a> and <a href="https://jobicy.com/" target="_blank" rel="noreferrer">Jobicy</a>. Check each employer application page and location eligibility before applying; no paid subscription is required for these public listings.</p>
  {!resume.trim()&&<p className="hint">Add your resume text above to calculate matches.</p>}
  {visible.map(j=><article key={j.id} style={{padding:'16px 0',borderBottom:'1px solid #dce6eb'}}>
   <h3 style={{marginBottom:6}}>{j.title}</h3><p>{j.company} · {j.location} · {j.source}{j.salary?' · '+j.salary:''}</p>
   <p className="hint">{j.eligibility.status==='eligible'?'India/worldwide eligibility indicated':'Location eligibility unverified'} · {j.match.score===null?'Resume match unavailable':j.match.score+'% resume keyword overlap'}{j.posted?' · Posted '+(Number(j.posted)?new Date(Number(j.posted)).toISOString().slice(0,10):j.posted.slice(0,10)):''}</p>
   <p>{j.description.slice(0,350)}{j.description.length>350?'…':''}</p>
   <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
    <a className="btn primary" href={j.url} target="_blank" rel="noopener noreferrer">Open job &amp; apply ↗</a>
    <button className="btn outline" onClick={()=>onSave(j)}>Save to my jobs</button>
   </div>
  </article>)}
  {!visible.length&&<p>No jobs with confirmed India/worldwide eligibility match these filters. You can optionally show location-unverified jobs, or try the Google Jobs and LinkedIn links above.</p>}
 </section>}
 </>;
}
