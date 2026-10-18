import {matchResume,validEmail,clean} from './core.mjs';

export function quickApplyDraft({email,role,company='',jd='',resumeText='',sender=''}={}){
 if(!validEmail(email))throw Error('Enter a valid recruiter email');
 const title=clean(role,160);if(!title)throw Error('Enter the role or position');
 const organization=clean(company,160);
 const fit=jd.trim()?matchResume(resumeText,jd,title):null;
 const skills=(fit?.matched||[]).slice(0,4);
 const target=organization?' at '+organization:'';
 const summary=skills.length?'My relevant experience includes '+skills.join(', ')+'. ':resumeText.trim()?'My background and experience are outlined in the attached resume. ':'';
 const body='Hello,\n\nI am writing to express my interest in the '+title+' position'+target+'. '+summary+
 (jd.trim()?'After reviewing the opportunity, I would welcome a conversation about how my experience could contribute to your team. ':'I would appreciate your consideration for this opportunity. ')+
 'Please find my resume attached for your review.\n\nThank you for your time and consideration.\n\nBest regards,\n'+(clean(sender,100)||'Your name');
 return {to:email.trim(),subject:'Application for '+title+target,body,match:fit};
}
const base64=bytes=>{let out='';for(let i=0;i<bytes.length;i+=8192)out+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(out);};
const wrap=s=>s.match(/.{1,76}/g)?.join('\r\n')||'';
export async function gmailRawWithAttachment({to,subject,body,file}){
 if(!validEmail(to))throw Error('Invalid recipient');
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
  'To: '+to.replace(/[\r\n]/g,''),
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
