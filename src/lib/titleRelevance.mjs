// Occupation relevance has priority over resume keyword overlap.
// No arbitrary "engineer" matches across unrelated disciplines.
const noise=new Set(['job','jobs','role','position','senior','junior','lead','the','and','or','for','with','in','at','remote','bengaluru','bangalore','india']);
const groups=[
 ['civil','structural','construction','site engineer','highway','geotechnical'],
 ['software','backend','frontend','fullstack','full-stack','java','spring','developer','programmer','devops','platform','sre','cloud','data engineer'],
 ['mechanical','automotive','manufacturing','hvac'],
 ['electrical','electronics','embedded','power systems'],
 ['chemical','process engineer','petrochemical']
];
const normalize=s=>String(s||'').toLowerCase().replace(/[^a-z0-9+]+/g,' ').trim();
function domain(text){const t=' '+normalize(text)+' ';return groups.findIndex(words=>words.some(w=>t.includes(' '+w+' ')));}
export function titleRelevance(query,title){
 const q=normalize(query),t=normalize(title);
 if(!q||!t)return 0;
 const qdomain=domain(q),tdomain=domain(t);
 if(qdomain>=0&&tdomain>=0&&qdomain!==tdomain)return -1;
 const terms=q.split(' ').filter(v=>v.length>2&&!noise.has(v));
 const hits=terms.filter(term=>t.split(' ').includes(term)).length;
 if(t.includes(q))return 200+hits*30;
 if(terms.length&&hits===terms.length)return 150+hits*25;
 if(terms.length>1&&hits>=Math.ceil(terms.length*0.6))return 80+hits*20;
 if(terms.length===1&&hits===1)return 80;
 return 0;
}
