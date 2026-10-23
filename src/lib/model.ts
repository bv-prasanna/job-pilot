export type JobStatus='Saved'|'Applied'|'Contacted'|'Interview'|'Offer'|'Rejected';
export type ContactKind='recruiter'|'referral';
export type Contact={id:string;name:string;email:string;company:string;role:string;kind:ContactKind;source:string;profile:string;relationship:string;status:string;createdAt:string};
export type Job={id:string;title:string;company:string;location:string;remote:string;description:string;url:string;salary:string;status:JobStatus;createdAt:string;notes:string};
export type Log={id:string;jobId:string;contactId:string;kind:ContactKind;subject:string;body:string;status:string;createdAt:string};
export type ResumeVersion={id:string;name:string;text:string;updatedAt:string};
export type Data={resumes?:ResumeVersion[];candidate:{name:string;headline:string;location:string;resume:string};jobs:Job[];contacts:Contact[];logs:Log[]};
export const emptyData:Data={candidate:{name:'',headline:'Engineering Manager',location:'Bengaluru / Remote',resume:''},jobs:[],contacts:[],logs:[]};
const KEY='jobpilot.v1';
export function loadData():Data {try {const raw=localStorage.getItem(KEY);if(!raw)return structuredClone(emptyData);const v=JSON.parse(raw);if(!v||!Array.isArray(v.jobs)||!Array.isArray(v.contacts)||!Array.isArray(v.logs)||typeof v.candidate?.resume!=='string')return structuredClone(emptyData);return v as Data;}catch{return structuredClone(emptyData);}}
export function saveData(d:Data){localStorage.setItem(KEY,JSON.stringify(d));}
export function download(name:string,content:string,type='text/plain'){const url=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
export const newId=()=>crypto.randomUUID();
