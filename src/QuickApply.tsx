import {useEffect,useState,type FormEvent} from 'react';
import {quickApplyDraft,gmailRawWithAttachment} from './lib/quickApply.mjs';
import {extractResumeText} from './lib/resume';
import {getResumeFile,saveResumeFile} from './lib/resumeStore';

type Props={resumeText:string;sender:string};
type Draft={to:string;recipients:string[];subject:string;body:string;match:{score:number|null;matched:string[];missing:string[]}|null};
declare global {interface Window {google?:{accounts:{oauth2:{initTokenClient:(options:{client_id:string;scope:string;callback:(result:{access_token?:string;error?:string})=>void})=>{requestAccessToken:()=>void}}}}}}
function loadGoogleScript():Promise<void>{
 if(window.google?.accounts?.oauth2)return Promise.resolve();
 return new Promise((resolve,reject)=>{
  const existing=document.querySelector<HTMLScriptElement>('script[data-google-gis]');
  const script=existing||document.createElement('script');
  if(!existing){script.src='https://accounts.google.com/gsi/client';script.async=true;script.dataset.googleGis='true';document.head.appendChild(script);}
  if(window.google?.accounts?.oauth2){resolve();return;}
  script.addEventListener('load',()=>resolve(),{once:true});
  script.addEventListener('error',()=>reject(Error('Unable to load Google authorization')),{once:true});
 });
}
export default function QuickApply({resumeText,sender}:Props){
 const[email,setEmail]=useState(''),[role,setRole]=useState(''),[recipientName,setRecipientName]=useState(''),[company,setCompany]=useState(''),[jd,setJd]=useState(''),[resumeForDraft,setResumeForDraft]=useState(resumeText);
 const[file,setFile]=useState<File|null>(null),[draft,setDraft]=useState<Draft|null>(null),[status,setStatus]=useState(''),[busy,setBusy]=useState(false);
 const clientId=import.meta.env.VITE_GOOGLE_CLIENT_ID as string|undefined;
 useEffect(()=>{if(clientId)void loadGoogleScript().catch(()=>{});},[clientId]);
 useEffect(()=>{let active=true;void getResumeFile().then(saved=>{if(active&&saved){setFile(saved);setStatus('Saved resume ready: '+saved.name+'. You do not need to upload it again.');}}).catch(()=>{});return()=>{active=false};},[]);
 useEffect(()=>{setResumeForDraft(resumeText);setDraft(null)},[resumeText]);
 const match=draft?.match;
 function prepare(e:FormEvent){e.preventDefault();try{setDraft(quickApplyDraft({email,role,company,jd,resumeText:resumeForDraft,sender,recipientName}));setStatus('Review the message carefully before sending. Resume attachment is required.')}catch(e){setStatus(e instanceof Error?e.message:'Unable to generate a draft')}}
 async function send(){
  if(!draft||busy)return;
  if(!clientId){setStatus('Gmail sending is not configured. Set VITE_GOOGLE_CLIENT_ID when deploying.');return;}
  if(!file){setStatus('Please attach your PDF, DOC or DOCX resume.');return;}
  if(!window.confirm('Send ONE application email to '+draft.recipients.length+' recipient(s): '+draft.to+' with resume '+file.name+' attached using your Google account?'))return;
  setBusy(true);setStatus('Connecting to Gmail securely...');
  try{
   if(!window.google?.accounts?.oauth2)throw Error('Google sign-in is still loading. Please try again.');
   const client=window.google.accounts.oauth2.initTokenClient({client_id:clientId,scope:'https://www.googleapis.com/auth/gmail.send',callback:async result=>{
     if(!result.access_token){setStatus('Google authorization was cancelled or rejected.');setBusy(false);return;}
     try{
      setStatus('Preparing the resume attachment...');
      const raw=await gmailRawWithAttachment({...draft,file});
      setStatus('Sending approved application with resume...');
      const response=await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send',{method:'POST',headers:{Authorization:'Bearer '+result.access_token,'Content-Type':'application/json'},body:JSON.stringify({raw})});
      const payload=await response.json().catch(()=>({}));
      if(!response.ok||!payload.id)throw Error(payload.error?.message||'Gmail did not confirm sending');
      setStatus('Sent through Gmail successfully. Gmail message ID: '+payload.id);
     }catch(e){setStatus(e instanceof Error?e.message:'Unable to send using Gmail');}
     finally{setBusy(false);}
   }});
   client.requestAccessToken();
  }catch(e){setStatus(e instanceof Error?e.message:'Unable to prepare the application');setBusy(false);}
 }
 const row={display:'grid',gap:6,marginBottom:14} as const;
 const full={width:'100%',padding:12,border:'1px solid #ccd6df',borderRadius:8,background:'transparent',color:'inherit'} as const;
 return <><div className="sectionhead"><div><h1>Apply to a Job by Email</h1><p>For your personal job search: paste the email from a job post, choose the role, and prepare your application. Nothing is sent without your approval.</p></div></div>
 <div className="panel" style={{padding:24,maxWidth:900}}>
  <form onSubmit={prepare}>
   <div style={row}><label htmlFor="qa-to">Email address from the job post *</label><input id="qa-to" type="text" required value={email} onChange={e=>{setEmail(e.target.value);setDraft(null)}} style={full} placeholder="hr@company.com"/></div>
   <div style={row}><label htmlFor="qa-contact">Contact name (optional)</label><input id="qa-contact" value={recipientName} onChange={e=>{setRecipientName(e.target.value);setDraft(null)}} style={full} placeholder="Amol"/></div>
   <p className="hint">Usually enter one address. If the same post lists multiple addresses, separate them with commas. They will receive one shared email, not separate applications.</p><div style={row}><label htmlFor="qa-role">Role or position *</label><input id="qa-role" required value={role} onChange={e=>{setRole(e.target.value);setDraft(null)}} style={full} placeholder="Engineering Manager"/></div>
   <div style={row}><label htmlFor="qa-company">Company (optional)</label><input id="qa-company" value={company} onChange={e=>{setCompany(e.target.value);setDraft(null)}} style={full} placeholder="Company name"/></div>
   <div style={row}><label htmlFor="qa-jd">Paste job description from the post (optional)</label><textarea id="qa-jd" value={jd} onChange={e=>{setJd(e.target.value);setDraft(null)}} rows={7} maxLength={18000} style={full} placeholder="Paste the job description if available. Without one, a generic role-specific message will be prepared."/></div>
   <div style={row}><label htmlFor="qa-resume-text">Your resume text (for matching the JD)</label><textarea id="qa-resume-text" rows={7} value={resumeForDraft} onChange={e=>{setResumeForDraft(e.target.value);setDraft(null)}} style={full} placeholder="Paste your actual resume text here or use the saved resume from your profile. This is only used to write a relevant draft."/></div>
   <div style={row}><label htmlFor="qa-file">Replace saved resume (optional)</label><input id="qa-file" type="file" accept=".pdf,.doc,.docx" onChange={e=>{const selected=e.target.files?.[0]||null;setFile(selected);setDraft(null);if(selected){void saveResumeFile(selected).then(()=>setStatus("Resume attachment saved for next applications.")).catch(err=>setStatus(err instanceof Error?err.message:"Unable to save file."));if(/\.(pdf|docx|txt|md)$/i.test(selected.name)){void extractResumeText(selected).then(text=>{setResumeForDraft(text);setStatus("Resume text extracted locally. Generate your tailored draft.")}).catch(err=>setStatus(err instanceof Error?err.message:"Resume could not be read."));}}}} style={full}/></div>
   <p className="hint">{file?'Saved attachment ready: '+file.name+'. Leave the file field empty to reuse it.':'No saved attachment yet: select your PDF/DOCX once. You can reuse it in later applications.'} Your saved profile resume text is used for drafting until you change it.</p>
   <button className="btn primary" type="submit">Generate email draft</button>
  </form>
  {draft&&<section style={{borderTop:'1px solid #ccd6df',marginTop:24,paddingTop:20}}>
   <h2>Review before sending</h2>
   <p><strong>To:</strong> {draft.to} ({draft.recipients.length} recipient(s), one shared email)</p>
   {match&&<p className="hint">{jd.trim()? 'Resume/JD keyword overlap: '+(match.score??'N/A')+'% (not an official ATS score)':'Generic role-specific message'}</p>}
   <div style={row}><label htmlFor="qa-subject">Subject</label><input id="qa-subject" style={full} value={draft.subject} onChange={e=>setDraft({...draft,subject:e.target.value})}/></div>
   <div style={row}><label htmlFor="qa-body">Message</label><textarea id="qa-body" style={full} rows={13} value={draft.body} onChange={e=>setDraft({...draft,body:e.target.value})}/></div>
   <p className="hint">Attached resume: {file?.name||'Not selected — upload once'}. Only the attached file is sent, not the saved resume text. Gmail account authorization is requested on send; no token is saved.</p>
   <button type="button" className="btn primary" disabled={busy||!file} onClick={send}>{busy?'Sending...':'Approve and send with Gmail'}</button>
  </section>}
  {status&&<p role="status" className="notice" style={{marginTop:18,padding:14}}>{status}</p>}
  <p className="hint">Google OAuth setup required: configure an authorized browser origin and VITE_GOOGLE_CLIENT_ID in your deployment. Every email requires your approval. No automatic bulk sending.</p>
 </div></>;
}
