import {useEffect,useState,type FormEvent} from 'react';
import {quickApplyDraft,gmailRawWithAttachment} from './lib/quickApply.mjs';

type Props={resumeText:string;sender:string};
type Draft={to:string;subject:string;body:string;match:{score:number|null;matched:string[];missing:string[]}|null};
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
 const[email,setEmail]=useState(''),[role,setRole]=useState(''),[company,setCompany]=useState(''),[jd,setJd]=useState('');
 const[file,setFile]=useState<File|null>(null),[draft,setDraft]=useState<Draft|null>(null),[status,setStatus]=useState(''),[busy,setBusy]=useState(false);
 const clientId=import.meta.env.VITE_GOOGLE_CLIENT_ID as string|undefined;
 useEffect(()=>{if(clientId)void loadGoogleScript().catch(()=>{});},[clientId]);
 const match=draft?.match;
 function prepare(e:FormEvent){e.preventDefault();try{setDraft(quickApplyDraft({email,role,company,jd,resumeText,sender}));setStatus('Review the message carefully before sending. Resume attachment is required.')}catch(e){setStatus(e instanceof Error?e.message:'Unable to generate a draft')}}
 async function send(){
  if(!draft||busy)return;
  if(!clientId){setStatus('Gmail sending is not configured. Set VITE_GOOGLE_CLIENT_ID when deploying.');return;}
  if(!file){setStatus('Please attach your PDF, DOC or DOCX resume.');return;}
  if(!window.confirm('Send this email to '+draft.to+' with resume '+file.name+' attached using your Google account?'))return;
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
 return <><div className="sectionhead"><div><h1>Quick Apply by Email</h1><p>Paste an opening, tailor the email from your saved resume, attach the actual file and approve sending.</p></div></div>
 <div className="panel" style={{padding:24,maxWidth:900}}>
  <form onSubmit={prepare}>
   <div style={row}><label htmlFor="qa-to">Recruiter email *</label><input id="qa-to" type="email" required value={email} onChange={e=>{setEmail(e.target.value);setDraft(null)}} style={full} placeholder="recruiter@company.com"/></div>
   <div style={row}><label htmlFor="qa-role">Role or position *</label><input id="qa-role" required value={role} onChange={e=>{setRole(e.target.value);setDraft(null)}} style={full} placeholder="Engineering Manager"/></div>
   <div style={row}><label htmlFor="qa-company">Company (optional)</label><input id="qa-company" value={company} onChange={e=>{setCompany(e.target.value);setDraft(null)}} style={full} placeholder="Company name"/></div>
   <div style={row}><label htmlFor="qa-jd">Job description (optional)</label><textarea id="qa-jd" value={jd} onChange={e=>{setJd(e.target.value);setDraft(null)}} rows={7} maxLength={18000} style={full} placeholder="Paste the job description if available. Without one, a generic role-specific message will be prepared."/></div>
   <div style={row}><label htmlFor="qa-file">Attach resume (PDF, DOC or DOCX; max 7 MB) *</label><input id="qa-file" type="file" accept=".pdf,.doc,.docx" onChange={e=>setFile(e.target.files?.[0]||null)} style={full}/></div>
   {!resumeText.trim()&&<p className="hint">Tip: Save your resume text under Resume & profile to personalize applications based on your experience.</p>}
   <button className="btn primary" type="submit">Generate email draft</button>
  </form>
  {draft&&<section style={{borderTop:'1px solid #ccd6df',marginTop:24,paddingTop:20}}>
   <h2>Review before sending</h2>
   <p><strong>To:</strong> {draft.to}</p>
   {match&&<p className="hint">{jd.trim()? 'JD keyword overlap: '+(match.score??'N/A')+'% (not an official ATS score)':'Generic role-specific message'}</p>}
   <div style={row}><label htmlFor="qa-subject">Subject</label><input id="qa-subject" style={full} value={draft.subject} onChange={e=>setDraft({...draft,subject:e.target.value})}/></div>
   <div style={row}><label htmlFor="qa-body">Message</label><textarea id="qa-body" style={full} rows={13} value={draft.body} onChange={e=>setDraft({...draft,body:e.target.value})}/></div>
   <p className="hint">Attached resume: {file?.name||'Not selected'}. Only the attached file is sent, not the saved resume text. Gmail account authorization is requested on send; no token is saved.</p>
   <button type="button" className="btn primary" disabled={busy||!file} onClick={send}>{busy?'Sending...':'Approve and send with Gmail'}</button>
  </section>}
  {status&&<p role="status" className="notice" style={{marginTop:18,padding:14}}>{status}</p>}
  <p className="hint">Google OAuth setup required: configure an authorized browser origin and VITE_GOOGLE_CLIENT_ID in your deployment. Every email requires your approval. No automatic bulk sending.</p>
 </div></>;
}
