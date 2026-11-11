import {useEffect,useRef,useState,type FormEvent} from 'react';
import {quickApplyDraft,gmailRawWithAttachment} from './lib/quickApply.mjs';
import {extractResumeText} from './lib/resume';
import {getResumeFile,getResumeVersionFile,resumeStorageStatus} from './lib/resumeStore';

type SavedResume={id:string;name:string;text:string;updatedAt:string};
type Props={resumeText:string;sender:string;defaultResumeId?:string;savedResumes:SavedResume[];onSaveResume:(version:SavedResume,file:File)=>Promise<void>;onChooseResume:(versionId:string)=>Promise<void>};
type Draft={to:string;recipients:string[];subject:string;body:string;match:{score:number|null;matched:string[];missing:string[]}|null};
declare global {interface Window {google?:{accounts:{oauth2:{initTokenClient:(options:{client_id:string;scope:string;callback:(result:{access_token?:string;expires_in?:number;error?:string})=>void})=>{requestAccessToken:()=>void}}}}}}
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
export default function QuickApply({resumeText,sender,defaultResumeId,savedResumes,onSaveResume,onChooseResume}:Props){
 const[email,setEmail]=useState(''),[role,setRole]=useState(''),[recipientName,setRecipientName]=useState(''),[company,setCompany]=useState(''),[jd,setJd]=useState(''),[resumeForDraft,setResumeForDraft]=useState(resumeText);
 const [selectedResumeId,setSelectedResumeId]=useState(defaultResumeId||'profile');
 const [storageInfo,setStorageInfo]=useState('');
 const [editResumeText,setEditResumeText]=useState(false);
 const[file,setFile]=useState<File|null>(null),[draft,setDraft]=useState<Draft|null>(null),[status,setStatus]=useState(''),[busy,setBusy]=useState(false),[checkingResume,setCheckingResume]=useState(true),[replaceResume,setReplaceResume]=useState(false);
 const sendingRef=useRef(false);
 const sentDraftRef=useRef<Draft|null>(null);
 const authRef=useRef<{token:string;expiresAt:number}|null>(null);
 const [lastSent,setLastSent]=useState<{to:string;role:string;company:string;time:string}|null>(null);
 const clientId=import.meta.env.VITE_GOOGLE_CLIENT_ID as string|undefined;
 useEffect(()=>{if(clientId)void loadGoogleScript().catch(()=>{});},[clientId]);
 useEffect(()=>{
  let active=true;
  const expectedName=savedResumes.find(v=>v.id===defaultResumeId)?.name;
  setCheckingResume(true);
  void (async()=>{
   const info=await resumeStorageStatus(defaultResumeId,expectedName);
   if(!active)return;
   setStorageInfo(info.detail);
   const saved=info.saved?await getResumeFile(defaultResumeId,expectedName):null;
   if(!active)return;
   setFile(saved);
   setStatus(saved?'Saved resume ready: '+saved.name:info.detail);
   setCheckingResume(false);
  })().catch(err=>{
   if(active){setFile(null);setCheckingResume(false);setStorageInfo('Browser storage check failed: '+(err instanceof Error?err.message:'Unknown error'));}
  });
  return()=>{active=false};
 },[defaultResumeId]);
 useEffect(()=>{setResumeForDraft(resumeText);setDraft(null)},[resumeText]);
 const match=draft?.match;
 function prepare(e:FormEvent){e.preventDefault();try{setDraft(quickApplyDraft({email,role,company,jd,resumeText:resumeForDraft,sender,recipientName}));setStatus(file?'Review the draft. Saved resume attachment: '+file.name:'Review the draft. Select a PDF/DOCX attachment before sending.')}catch(e){setStatus(e instanceof Error?e.message:'Unable to generate a draft')}}
 async function send(){
  // The send button itself is explicit approval. No second browser confirm popup.
  if(!draft||busy||sendingRef.current)return;
  if(sentDraftRef.current===draft){setStatus('This application was already sent. Enter the next job and generate a new draft.');return;}
  if(!clientId){setStatus('Gmail sending is not configured.');return;}
  if(!file){setStatus('A PDF or DOCX resume is required before sending.');return;}
  const approved={...draft,recipients:[...draft.recipients]};
  const approvedRole=role.trim();
  const approvedCompany=company.trim();
  const approvedFile=file;
  sendingRef.current=true;setBusy(true);
  setStatus('Preparing application for '+approved.to+' — '+approvedRole+'…');
  async function sendApproved(token:string){
   try{
    const raw=await gmailRawWithAttachment({...approved,file:approvedFile});
    setStatus('Sending email to '+approved.to+' for '+approvedRole+'…');
    const response=await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send',{
     method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({raw})
    });
    const payload=await response.json().catch(()=>({}));
    if(!response.ok||!payload.id)throw Error(payload.error?.message||'Gmail did not confirm sending');
    const time=new Date().toLocaleString();
    sentDraftRef.current=draft;
    setLastSent({to:approved.to,role:approvedRole,company:approvedCompany,time});
    setStatus('Email sent successfully to '+approved.to+' for '+approvedRole+(approvedCompany?' at '+approvedCompany:'')+'. The draft has been cleared.');
    setDraft(null);setEmail('');setRole('');setRecipientName('');setCompany('');setJd('');
   }catch(e){
    setStatus('Sending not confirmed for '+approved.to+' / '+approvedRole+': '+(e instanceof Error?e.message:'Unknown error')+'. Check Gmail Sent before retrying.');
   }finally{sendingRef.current=false;setBusy(false);}
  }
  try{
   const cached=authRef.current;
   if(cached&&cached.expiresAt>Date.now()+60000){await sendApproved(cached.token);return;}
   if(!window.google?.accounts?.oauth2)throw Error('Google authorization is still loading. Try again.');
   const client=window.google.accounts.oauth2.initTokenClient({
    client_id:clientId,scope:'https://www.googleapis.com/auth/gmail.send',
    callback:result=>{
     if(!result.access_token){
      setStatus('Google authorization was cancelled or rejected. No email was sent.');
      sendingRef.current=false;setBusy(false);return;
     }
     authRef.current={token:result.access_token,expiresAt:Date.now()+Math.max(0,result.expires_in??3000)*1000};
     void sendApproved(result.access_token);
    }
   });
   setStatus('Authorize Gmail to send the reviewed application to '+approved.to+' for '+approvedRole+'.');
   client.requestAccessToken();
  }catch(e){
   setStatus(e instanceof Error?e.message:'Unable to prepare the application');
   sendingRef.current=false;setBusy(false);
  }
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
   {resumeForDraft.trim()&&!editResumeText?
    <div style={row}><strong>Saved resume text ready ({resumeForDraft.length.toLocaleString()} characters)</strong><p className="hint">Used automatically to personalize your email. You do not need to paste it again.</p><button type="button" className="btn outline" onClick={()=>setEditResumeText(true)}>Edit resume text (optional)</button></div>
    :<div style={row}><label htmlFor="qa-resume-text">Resume text for personalizing the email</label><textarea id="qa-resume-text" rows={7} value={resumeForDraft} onChange={e=>{setResumeForDraft(e.target.value);setDraft(null)}} style={full} placeholder="Save a resume in Resume Management or paste its text here once."/>{resumeForDraft.trim()&&<button type="button" className="btn outline" onClick={()=>setEditResumeText(false)}>Use saved resume text</button>}</div>}
   {savedResumes.length>0&&<div style={row}><label htmlFor="qa-saved-resume">Saved resume for this application</label>
    <select id="qa-saved-resume" style={full} value={savedResumes.some(v=>v.id===selectedResumeId)?selectedResumeId:'profile'} onChange={e=>{
      const id=e.target.value;
      setSelectedResumeId(id);setDraft(null);
      if(id==='profile'){setResumeForDraft(resumeText);void getResumeFile(defaultResumeId,savedResumes.find(v=>v.id===defaultResumeId)?.name).then(saved=>{setFile(saved);setStatus(saved?'Using saved attachment: '+saved.name:'The current profile has no saved PDF/DOCX attachment.');}).catch(()=>setStatus('Could not load saved attachment.'));return;}
      const version=savedResumes.find(v=>v.id===id);if(!version)return;
      setResumeForDraft(version.text);
      void getResumeVersionFile(id).then(saved=>{setFile(saved);setStatus(saved?'Using saved resume: '+saved.name:'This version has text only; select a PDF/DOCX file once to send by Gmail.');}).catch(()=>setStatus('Could not read this saved attachment.'));
      void onChooseResume(id).catch(()=>{});
    }}>
     <option value="profile">Current profile resume</option>
     {savedResumes.map(v=><option value={v.id} key={v.id}>{v.name}</option>)}
    </select>
    <p className="hint">Your saved resume filename and content are reused. No upload is required while its attachment is available.</p>
   </div>}
   {savedResumes.length>0&&<p className="hint">Current saved resume: <strong>{savedResumes.find(v=>v.id===selectedResumeId)?.name||savedResumes.find(v=>v.id===defaultResumeId)?.name||'Profile resume'}</strong>. File attachment: <strong>{file?.name||'not available on this browser'}</strong>.</p>}
   {storageInfo&&<p className="hint" role="status">{storageInfo}</p>}
   {checkingResume?<p className="hint">Checking your saved resume attachment…</p>:file&&!replaceResume?
    <div style={row}><strong>Resume attachment ready: {file.name}</strong><p className="hint">It will be reused automatically. No upload is needed.</p><button type="button" className="btn outline" onClick={()=>setReplaceResume(true)}>Replace resume (optional)</button></div>
    :<div style={row}><label htmlFor="qa-file">{file?'Select replacement PDF/DOCX':'Choose a PDF/DOCX resume once for future emails'}</label>
    <input id="qa-file" type="file" accept=".pdf,.doc,.docx" onChange={e=>{const selected=e.target.files?.[0]||null;if(!selected)return;setDraft(null);void (async()=>{try{
 if(!/\.(pdf|docx)$/i.test(selected.name))throw Error('Please choose a PDF or DOCX resume.');
 const text=await extractResumeText(selected);
 const version:SavedResume={id:crypto.randomUUID(),name:selected.name,text,updatedAt:new Date().toISOString()};
 await onSaveResume(version,selected);
 setFile(selected);setResumeForDraft(text);setSelectedResumeId(version.id);setReplaceResume(false);
 setStatus('Saved '+selected.name+' for future applications. Attachment is ready.');
 }catch(err){setStatus(err instanceof Error?err.message:'Resume could not be saved.');}})();}} style={full}/>
    {file&&<button className="btn outline" type="button" onClick={()=>setReplaceResume(false)}>Keep saved resume</button>}</div>}
   <p className="hint">The saved resume is reused on this browser and website address. Your profile resume text is used for drafting until you replace it.</p>
   <button className="btn primary" type="submit">Generate email draft</button>
  </form>
  {draft&&<section style={{borderTop:'1px solid #ccd6df',marginTop:24,paddingTop:20}}>
   <h2>Review before sending</h2>
   <p><strong>To:</strong> {draft.to} ({draft.recipients.length} recipient(s), one shared email)</p>
   {match&&<p className="hint">{jd.trim()? 'Resume/JD keyword overlap: '+(match.score??'N/A')+'% (not an official ATS score)':'Generic role-specific message'}</p>}
   <div style={row}><label htmlFor="qa-subject">Subject</label><input id="qa-subject" style={full} value={draft.subject} onChange={e=>setDraft({...draft,subject:e.target.value})}/></div>
   <div style={row}><label htmlFor="qa-body">Message</label><textarea id="qa-body" style={full} rows={13} value={draft.body} onChange={e=>setDraft({...draft,body:e.target.value})}/></div>
   <p className="hint">Attached resume: {file?.name||'Not selected — upload once'}. Only the attached file is sent, not the saved resume text. Gmail account authorization is requested on send; no token is saved.</p>
   <button type="button" className="btn primary" disabled={busy||!file} onClick={()=>void send()}>{busy?'Sending — please do not click again':'Send reviewed email with Gmail'}</button>
  </section>}
  {lastSent&&<section role="status" className="notice" style={{marginTop:18,padding:14,border:'1px solid #b7e4c7'}}><strong>Last application email sent successfully</strong><p><strong>To:</strong> {lastSent.to}</p><p><strong>Role:</strong> {lastSent.role}{lastSent.company?' · '+lastSent.company:''}</p><p><strong>Sent:</strong> {lastSent.time}</p><p>The email draft has been cleared. Your resume is ready for the next application.</p></section>}
  {status&&<p role="status" className="notice" style={{marginTop:18,padding:14}}>{status}</p>}
  <p className="hint">Google OAuth setup required: configure an authorized browser origin and VITE_GOOGLE_CLIENT_ID in your deployment. Each email requires clicking Send. Google may still request authorization; access tokens remain in memory only. No automatic bulk sending.</p>
 </div></>;
}
