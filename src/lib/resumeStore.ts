const DB='jobpilot-private-files';
const STORE='attachments';
const KEY='default-resume';
function openDb():Promise<IDBDatabase>{
 return new Promise((resolve,reject)=>{
  if(!('indexedDB' in window)){reject(Error('Browser file storage unavailable'));return;}
  const req=indexedDB.open(DB,1);
  req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(STORE))req.result.createObjectStore(STORE);};
  req.onsuccess=()=>resolve(req.result);
  req.onerror=()=>reject(req.error||Error('Cannot open file storage'));
 });
}
export async function saveResumeFile(file:File):Promise<void>{
 if(!file||!/\.(pdf|docx|doc)$/i.test(file.name)||file.size>7*1024*1024||file.size===0)throw Error('Choose a PDF, DOCX or DOC resume smaller than 7 MB.');
 const db=await openDb();
 try{await new Promise<void>((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(file,KEY);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error||Error('Unable to save resume'));tx.onabort=()=>reject(tx.error||Error('Resume save cancelled'));});}
 finally{db.close();}
}
export async function getResumeFile():Promise<File|null>{
 const db=await openDb();
 try{return await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readonly');const req=tx.objectStore(STORE).get(KEY);req.onsuccess=()=>resolve(req.result instanceof File?req.result:null);req.onerror=()=>reject(req.error||Error('Unable to read saved resume'));});}
 finally{db.close();}
}
export async function clearResumeFile():Promise<void>{
 const db=await openDb();
 try{await new Promise<void>((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).delete(KEY);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error||Error('Unable to delete resume'));});}
 finally{db.close();}
}
