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
  req.onsuccess=()=>resolve(req.result instanceof File?req.result:null);
  req.onerror=()=>reject(req.error||Error('Unable to read saved resume'));
 });
}
export async function saveResumeFile(file:File,id?:string,makeDefault=true):Promise<void>{
 if(!file||!/\.(pdf|docx|doc)$/i.test(file.name)||file.size>7*1024*1024||file.size===0)throw Error('Choose a PDF, DOCX or DOC resume smaller than 7 MB.');
 const db=await openDb();
 try{await transact(db,'readwrite',store=>{if(id)store.put(file,versionKey(id));if(makeDefault)store.put(file,KEY);});}
 finally{db.close();}
}
export async function getResumeFile():Promise<File|null>{
 const db=await openDb();
 try{return await read(db,KEY);}finally{db.close();}
}
export async function activateResumeFile(id:string):Promise<boolean>{
 const db=await openDb();
 try{
  const file=await read(db,versionKey(id));
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
