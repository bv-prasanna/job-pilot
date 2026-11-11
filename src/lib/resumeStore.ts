// Resume attachments remain on this origin in IndexedDB; never sent to our job-search API.
const DB='jobpilot-private-files';
const STORE='attachments';
const KEY='default-resume';
const versionKey=(id:string)=>'resume-version:'+id;
function openDb():Promise<IDBDatabase>{
 return new Promise((resolve,reject)=>{
  if(!('indexedDB' in window)){reject(Error('Browser file storage unavailable'));return;}
  const req=indexedDB.open(DB,1);
  req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(STORE))req.result.createObjectStore(STORE);};
  req.onsuccess=()=>resolve(req.result);
  req.onerror=()=>reject(req.error||Error('Cannot open file storage'));
 });
}
function transact(db:IDBDatabase,mode:IDBTransactionMode,work:(store:IDBObjectStore)=>void):Promise<void>{
 return new Promise((resolve,reject)=>{
  const tx=db.transaction(STORE,mode);work(tx.objectStore(STORE));
  tx.oncomplete=()=>resolve();
  tx.onerror=()=>reject(tx.error||Error('Resume storage failed'));
  tx.onabort=()=>reject(tx.error||Error('Resume storage cancelled'));
 });
}
function read(db:IDBDatabase,key:string):Promise<File|null>{
 return new Promise((resolve,reject)=>{
  const tx=db.transaction(STORE,'readonly');
  const req=tx.objectStore(STORE).get(key);
  req.onsuccess=()=>{
   const value=req.result;
   if(value instanceof File){resolve(value);return;}
   if(value&&value.blob instanceof Blob&&typeof value.name==='string'){resolve(new File([value.blob],value.name,{type:value.blob.type,lastModified:value.lastModified||Date.now()}));return;}
   if(value instanceof Blob){resolve(new File([value],key===KEY?'resume.pdf':key.replace('resume-version:','')+'.pdf',{type:value.type,lastModified:Date.now()}));return;}
   resolve(null);
  };
  req.onerror=()=>reject(req.error||Error('Unable to read saved resume'));
 });
}
export async function saveResumeFile(file:File,id?:string,makeDefault=true):Promise<void>{
 if(!file||!/\.(pdf|docx|doc)$/i.test(file.name)||file.size>7*1024*1024||file.size===0)throw Error('Choose a PDF, DOCX or DOC resume smaller than 7 MB.');
 const db=await openDb();
 try{
  await transact(db,'readwrite',store=>{if(id)store.put(file,versionKey(id));if(makeDefault)store.put(file,KEY);});
  const check=await read(db,id?versionKey(id):KEY);
  if(!check||check.name!==file.name||check.size!==file.size)throw Error('Resume was not retained by browser storage. Check whether site data is being cleared or storage is blocked.');
 }finally{db.close();}
}
export async function getResumeFile(defaultResumeId?:string,expectedName?:string):Promise<File|null>{
 const db=await openDb();
 try{
  if(defaultResumeId){
   const version=await read(db,versionKey(defaultResumeId));
   if(version){await transact(db,'readwrite',store=>store.put(version,KEY));return version;}
  }
  // Legacy uploads were stored only under the default key before resume-version support.
  const legacy=await read(db,KEY);
  if(expectedName){
   if(legacy?.name===expectedName)return legacy;
   const recovered=await findNamedResume(db,expectedName);
   if(recovered){await transact(db,'readwrite',store=>store.put(recovered,KEY));return recovered;}
   return null;
  }
  return legacy;
 }finally{db.close();}
}
async function findNamedResume(db:IDBDatabase,expectedName:string):Promise<File|null>{
 const keys=await new Promise<IDBValidKey[]>((resolve,reject)=>{
  const req=db.transaction(STORE,'readonly').objectStore(STORE).getAllKeys();
  req.onsuccess=()=>resolve(req.result);
  req.onerror=()=>reject(req.error||Error('Could not inspect saved resumes'));
 });
 for(const key of keys){
  if(typeof key!=='string'||!key.startsWith('resume-version:'))continue;
  const file=await read(db,key);
  if(file?.name===expectedName)return file;
 }
 return null;
}
export async function resumeStorageStatus(defaultResumeId?:string,expectedName?:string):Promise<{saved:boolean;filename:string|null;detail:string}>{
 try{
  const file=await getResumeFile(defaultResumeId,expectedName);
  if(file)return {saved:true,filename:file.name,detail:'Resume attachment is saved in this browser.'};
  return {saved:false,filename:null,detail:expectedName?'Saved resume text found, but the matching PDF/DOCX file is missing in this browser. Restore this attachment once.':'No resume attachment has been saved on this website in this browser.'};
 }catch(err){return {saved:false,filename:null,detail:'Browser attachment storage failed: '+(err instanceof Error?err.message:String(err))};}
}
export async function getResumeVersionFile(id:string):Promise<File|null>{
 const db=await openDb();try{return await read(db,versionKey(id));}finally{db.close();}
}
export async function activateResumeFile(id:string):Promise<boolean>{
 const db=await openDb();
 try{
  const file=await read(db,versionKey(id));
  // Never send an unrelated attachment if the chosen resume contains only text.
  await transact(db,'readwrite',store=>{if(file)store.put(file,KEY);else store.delete(KEY);});
  return Boolean(file);
 }finally{db.close();}
}
export async function removeResumeVersionFile(id:string):Promise<void>{
 const db=await openDb();try{await transact(db,'readwrite',store=>store.delete(versionKey(id)));}finally{db.close();}
}
export async function clearResumeFile():Promise<void>{
 const db=await openDb();try{await transact(db,'readwrite',store=>store.delete(KEY));}finally{db.close();}
}
