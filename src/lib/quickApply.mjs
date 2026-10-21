import {matchResume,validEmail,clean} from './core.mjs';

export function parseRecipients(value){
 const parts=String(value||'').split(/[;,\s]+/).map(x=>x.trim()).filter(Boolean);
 if(!parts.length||parts.length>10||parts.some(x=>!validEmail(x)))throw Error('Enter 1 to 10 valid email addresses, separated by commas or semicolons');
 return [...new Set(parts.map(x=>x.toLowerCase()))];
}
const EVIDENCE=[
 ['java','Java'],['spring boot','Spring Boot'],['microservices','microservices'],['kafka','Kafka'],['aws','AWS'],['azure','Azure'],['gcp','Google Cloud'],['cloud','cloud architecture'],['kubernetes','Kubernetes'],['docker','Docker'],['system design','system design'],['architecture','architecture'],['leadership','engineering leadership'],['mentoring','mentoring'],['stakeholder','stakeholder collaboration'],['delivery','delivery ownership'],['agile','Agile delivery'],['react','React'],['python','Python'],['sql','SQL'],['testing','quality engineering'],['security','application security'],['scalability','scalable systems'],['distributed systems','distributed systems']
];
function has(text,term){return new RegExp('(^|[^a-z0-9])'+term.replace(/[.*+?^${}()|[\]\\]/g,'\\$&').replace(/\s+/g,'\\s+')+'($|[^a-z0-9])','i').test(text);}
function evidence(jd,resume){
 return EVIDENCE.filter(([term])=>has(jd,term)&&has(resume,term)).map(([,display])=>display).slice(0,5);
}
export function quickApplyDraft({email,role,company='',jd='',resumeText='',sender=''}={}){
 const recipients=parseRecipients(email);
 const title=clean(role,160);if(!title)throw Error('Enter the role or position');
 const organization=clean(company,160),target=organization?' at '+organization:'';
 const description=clean(jd,18000),resume=clean(resumeText,60000);
 const fit=description&&resume?matchResume(resume,description,title):null;
 const skills=evidence(description||title,resume);
 let paragraph;
 if(description&&skills.length){
   paragraph='The position emphasizes '+skills.slice(0,3).join(', ')+'. My resume documents experience in these areas, and I would welcome the opportunity to apply that background to the role.';
 }else if(description&&resume){
   paragraph='I reviewed the responsibilities in the posting. My attached resume outlines my experience and career progression; I would appreciate an opportunity to discuss where it aligns with your team’s needs.';
 }else if(description){
   paragraph='I reviewed the job description and am interested in being considered. My attached resume provides my background for your evaluation.';
 }else if(resume){
   paragraph='My attached resume outlines my professional experience and skills for your consideration.';
 }else{
   paragraph='Please review my attached resume for details of my experience and qualifications.';
 }
 const opening=description?'I am applying for the '+title+' opportunity'+target+' following the opening you shared.':'I saw your post about the '+title+' opening'+target+' and would like to apply.';
 const body='Hello,\n\n'+opening+'\n\n'+paragraph+'\n\nI have attached my resume for your review. I would be glad to discuss the opportunity further.\n\nThank you for your consideration.\n\nBest regards,\n'+(clean(sender,100)||'Prasanna Kumar');
 return {to:recipients.join(', '),recipients,subject:'Application for '+title+target,body,match:fit};
}
const base64=bytes=>{let out='';for(let i=0;i<bytes.length;i+=8192)out+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(out);};
const wrap=s=>s.match(/.{1,76}/g)?.join('\r\n')||'';
export async function gmailRawWithAttachment({to,subject,body,file}){
 const recipients=parseRecipients(to);
 if(!subject.trim()||!body.trim())throw Error('Subject and message are required');
 if(!file||file.size===0||file.size>7*1024*1024)throw Error('Attach a resume smaller than 7 MB');
 const extension=file.name.toLowerCase().split('.').pop();
 if(!['pdf','doc','docx'].includes(extension))throw Error('Resume must be PDF, DOC or DOCX');
 const bytes=new Uint8Array(await file.arrayBuffer());
 const boundary='jobpilot_'+crypto.randomUUID().replace(/-/g,'');
 const mime=extension==='pdf'?'application/pdf':extension==='doc'?'application/msword':'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
 const safeName=file.name.replace(/[^a-zA-Z0-9._ -]/g,'_').slice(0,120);
 const safeSubject=base64(new TextEncoder().encode(subject.replace(/[\r\n]/g,' ').slice(0,300)));
 const parts=[
  'To: '+recipients.join(', '),
  'Subject: =?UTF-8?B?'+safeSubject+'?=',
  'MIME-Version: 1.0',
  'Content-Type: multipart/mixed; boundary="'+boundary+'"',
  '',
  '--'+boundary,
  'Content-Type: text/plain; charset=UTF-8',
  'Content-Transfer-Encoding: base64',
  '',
  wrap(base64(new TextEncoder().encode(body))),
  '--'+boundary,
  'Content-Type: '+mime+'; name="'+safeName+'"',
  'Content-Disposition: attachment; filename="'+safeName+'"',
  'Content-Transfer-Encoding: base64',
  '',
  wrap(base64(bytes)),
  '--'+boundary+'--',
  ''
 ];
 return base64(new TextEncoder().encode(parts.join('\r\n'))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
