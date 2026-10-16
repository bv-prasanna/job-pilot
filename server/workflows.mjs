import {matchResume} from '../src/lib/core.mjs';
const key=x=>String(x??'').trim().toLowerCase();
export function findContacts(contacts,job,{kind,limit=30}={}) {
 if(!job||!Array.isArray(contacts))throw Error('Job and contacts required');
 const company=key(job.company);
 return contacts.filter(c=>!kind||c.kind===kind).map(contact=>{
 const sameCompany=!!company&&key(contact.company)===company;
 const title=key(contact.title),role=key(job.title);
 const recruiter=/recruit|talent|human resources|\bhr\b/i.test(title);
 const manager=/hiring manager|engineering manager|director|head of engineering|vp engineering/i.test(title);
 const colleague=/former|colleague|coworker|known|friend/i.test(contact.relationship||'');
 const contactScore=(sameCompany?50:0)+(contact.email?15:0)+(contact.profileUrl?5:0)+(recruiter?12:0)+(manager&&/engineer|developer|platform/i.test(role)?8:0)+(colleague?10:0);
 return {...contact,sameCompany,contactScore,publiclyVerified:false};
 }).filter(c=>c.sameCompany).sort((a,b)=>b.contactScore-a.contactScore||key(a.name).localeCompare(key(b.name))).slice(0,Math.max(1,Math.min(100,limit)));
}
export function rankJobs(jobs,profile,{minimumScore=0,limit=100}={}){
 if(!Array.isArray(jobs))throw Error('Jobs must be an array');
 const resume=profile?.resumeText||'';
 return jobs.map(job=>({...job,match:matchResume(resume,job.description||'',job.title||'')}))
 .filter(j=>j.match.score!==null&&j.match.score>=minimumScore)
 .sort((a,b)=>b.match.score-a.match.score||key(a.title).localeCompare(key(b.title)))
 .slice(0,Math.max(1,Math.min(500,limit)));
}
export function followUps(outreach,{now=new Date(),afterDays=7}={}){
 const cutoff=Number(new Date(now));if(!Number.isFinite(cutoff))throw Error('Invalid date');
 return outreach.filter(v=>['Sent','Follow up'].includes(v.status)&&Number.isFinite(Date.parse(v.updatedAt||v.createdAt))&&(cutoff-Date.parse(v.updatedAt||v.createdAt))>=Math.max(1,afterDays)*86400000)
 .sort((a,b)=>Date.parse(a.updatedAt||a.createdAt)-Date.parse(b.updatedAt||b.createdAt));
}
export function overview(state){
 const counts=(items,field)=>items.reduce((r,x)=>(r[x[field]||'Unknown']=(r[x[field]||'Unknown']||0)+1,r),{});
 return {jobs:state.jobs.length,contacts:state.contacts.length,applications:state.applications.length,outreach:state.outreach.length,applicationStatuses:counts(state.applications,'status'),outreachStatuses:counts(state.outreach,'status')};
}