export function createRateLimiter({windowMs=60000,max=120,clock=()=>Date.now()}={}) {
 const buckets=new Map();
 return key=>{const now=clock();const old=buckets.get(key);const bucket=!old||now-old.started>=windowMs?{started:now,count:0}:old;bucket.count++;buckets.set(key,bucket);if(buckets.size>2048)for(const [k,v] of buckets)if(now-v.started>=windowMs)buckets.delete(k);return bucket.count<=max;};
}
export function validateEntityReferences(state,type,input) {
 for(const [field,collection] of (type==='outreach'?[['jobId','jobs'],['contactId','contacts']]:type==='applications'?[['jobId','jobs']]:[])){
 const id=input[field];if(id&&!state[collection].some(v=>v.id===id)){const e=new Error('Unknown '+collection+' reference');e.status=400;throw e;}
 }
 if(type==='outreach'&&input.contactId&&input.recipient){const c=state.contacts.find(v=>v.id===input.contactId);if(c?.email&&c.email.toLowerCase()!==input.recipient.toLowerCase()){const e=new Error('Recipient does not match contact');e.status=400;throw e;}}
}