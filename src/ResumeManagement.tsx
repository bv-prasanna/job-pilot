import {useState} from 'react';
import {extractResumeText} from './lib/resume';
import {saveResumeFile} from './lib/resumeStore';
import type {ResumeVersion} from './lib/model';
type Props={resumes:ResumeVersion[];currentText:string;onAdd:(resume:ResumeVersion,makeDefault:boolean)=>void;onSelect:(id:string)=>void;onDelete:(id:string)=>void};
export default function ResumeManagement({resumes,currentText,onAdd,onSelect,onDelete}:Props){
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[name,setName]=useState(''),[text,setText]=useState(''),[makeDefault,setMakeDefault]=useState(true);
 async function upload(file?:File){
  if(!file)return;
  setBusy(true);setMessage('');
  try{
   const extracted=await extractResumeText(file);
   if(!extracted.trim())throw Error('No readable resume content found.');
   const version={id:crypto.randomUUID(),name:file.name,text:extracted,updatedAt:new Date().toISOString()};
   onAdd(version,makeDefault);
   if(makeDefault&&/\.(pdf|docx|doc)$/i.test(file.name))await saveResumeFile(file);
   setMessage('Saved '+file.name+(makeDefault?' as the default resume.':' for future selection.'));
  }catch(error){setMessage(error instanceof Error?error.message:'Resume could not be imported.');}
  finally{setBusy(false);}
 }
 function savePasted(){
  if(!name.trim()||!text.trim()){setMessage('Enter a resume name and resume text.');return;}
  onAdd({id:crypto.randomUUID(),name:name.trim(),text:text.slice(0,60000),updatedAt:new Date().toISOString()},makeDefault);
  setName('');setText('');setMessage('Saved resume text. An attachment file must be selected once in Apply by Email if required.');
 }
 return <><div className="sectionhead"><div><h1>Resume Management</h1><p>Upload once, maintain different versions, and select a default for job matching and email drafts.</p></div></div>
 <section className="panel" style={{padding:24}}>
  <h2>Add a resume</h2>
  <div className="field"><label className="field-label" htmlFor="rm-file">Upload PDF, DOCX, TXT or MD (maximum 8 MB)</label><input id="rm-file" type="file" accept=".pdf,.docx,.txt,.md" disabled={busy} onChange={e=>void upload(e.target.files?.[0])}/></div>
  <label style={{display:'flex',gap:8,alignItems:'center',marginBottom:16}}><input type="checkbox" checked={makeDefault} onChange={e=>setMakeDefault(e.target.checked)}/> Make this my default resume</label>
  <p className="hint">Or save text as another resume version:</p>
  <div className="field"><label className="field-label" htmlFor="rm-name">Version name</label><input id="rm-name" value={name} onChange={e=>setName(e.target.value)} placeholder="Backend Engineering Manager resume"/></div>
  <div className="field"><label className="field-label" htmlFor="rm-text">Resume text</label><textarea id="rm-text" rows={5} value={text} onChange={e=>setText(e.target.value)} placeholder="Paste resume text here"/></div>
  <button type="button" className="btn primary" onClick={savePasted}>Save resume version</button>
  {message&&<p role="status" className="hint">{message}</p>}
 </section>
 <section className="panel" style={{padding:24,marginTop:18}}>
  <h2>Available resumes ({resumes.length+(currentText.trim()?1:0)})</h2>
  {currentText.trim()&&<article style={{padding:'14px 0',borderBottom:'1px solid #dce6eb'}}><strong>Current default profile resume</strong><p className="hint">{currentText.length.toLocaleString()} characters · Used automatically for search and email drafting</p></article>}
  {resumes.map(v=><article key={v.id} style={{padding:'16px 0',borderBottom:'1px solid #dce6eb'}}><strong>{v.name}</strong><p className="hint">{v.text.length.toLocaleString()} characters · Saved {new Date(v.updatedAt).toLocaleDateString()}</p><div style={{display:'flex',gap:10,flexWrap:'wrap'}}><button className="btn outline" type="button" onClick={()=>{onSelect(v.id);setMessage('Set as default: '+v.name+'. For Gmail, the saved attachment remains unchanged unless you upload the corresponding file.')}}>Use as default</button><button className="btn outline" type="button" onClick={()=>{if(window.confirm('Delete saved resume version '+v.name+'?'))onDelete(v.id)}}>Delete version</button></div></article>)}
  {!resumes.length&&<p className="hint">No additional versions yet. Upload a resume above to create one.</p>}
  <p className="hint">All resume text is stored locally in this browser. Selecting a version updates your default matching text; it does not silently switch the Gmail attachment to a different file.</p>
 </section></>;
}
