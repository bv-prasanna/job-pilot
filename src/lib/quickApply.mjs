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
export function quickApplyDraft({email,role,company='',jd='',resumeText='',sender='',recipientName=''}={}){
 const recipients=parseRecipients(email);
 const title=clean(role,160);if(!title)throw Error('Enter the role or position');
 const organization=clean(company,160),target=organization?' at '+organization:'';
 const description=clean(jd,18000),resume=clean(resumeText,60000);
 const fit=description&&resume?matchResume(resume,description,title):null;
 const skills=evidence(description||title,resume);
 const recruiter=clean(recipientName,80).replace(/[\r\n<>]/g,'').trim();
 const greeting=recruiter?'Hi '+recruiter+',':'Hello,';
 const senior=/manager|lead|director|head|architect/i.test(title);
 const intro=senior
  ?'With a background spanning software engineering, technical leadership, and the delivery of complex platforms, I am keen to contribute to a team that values engineering quality, clear execution, and collaboration.'
  :'I bring a strong interest in solving meaningful engineering problems, delivering reliable software, and collaborating across teams.';
 const technical=skills.length
  ?'After reviewing the requirements, I see particularly relevant alignment with '+skills.slice(0,4).join(', ')+'. These capabilities are reflected in my resume, and I would welcome the opportunity to discuss the specific projects and outcomes behind them.'
  :description&&resume
  ?'Having reviewed the position, I believe my broader engineering and delivery background merits a conversation about the team’s priorities. My resume provides details of the work I have undertaken.'
  :resume
  ?'My resume outlines the technologies, responsibilities, and project experience I would bring to the position. I would be pleased to discuss the most relevant examples with you.'
  :'I would appreciate the opportunity to discuss how my background aligns with your requirements.';
 const body=greeting+'\n\nI hope this message finds you well.\n\n'
  +'I am writing to express my interest in the '+title+' position'+target+'. '+intro
  +'\n\n'+technical
  +'\n\nPlease find my resume attached for your reference. I would welcome the opportunity to discuss how my experience can contribute to your organisation’s goals.'
  +'\n\nThank you for considering my application. I look forward to the possibility of connecting further.'
  +'\n\nWarm regards,\n'+(clean(sender,100)||'Prasanna Kumar BV')
  +'\n9844274556 | bv.prasannakumar@gmail.com | www.linkedin.com/in/prasannakumarbv';
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
