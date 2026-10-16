/** Pure, deterministic, dependency-free domain functions. No network requests. */
export const STATES = Object.freeze(['Saved', 'Applied', 'Contacted', 'Interview', 'Offer', 'Rejected']);
export const OUTREACH = Object.freeze(['Draft', 'Sent', 'Replied', 'Follow up', 'Closed']);
const STOP = new Set('a an the and or for with of in to by on at from is are be as our your their you we i this that aable ability strong excellent good experience experienced years year job role team teams engineer engineering manager management software work working knowledge skills skill building build drive driving plus must required preferred including having using use who will can candidate candidates responsibilities qualification qualifications position hands high large scale within across end end-to-end'.split(/\s+/));
export const tokenize = text => [...new Set(String(text || '').toLowerCase().replace(/[^a-z0-9+#.\s-]/g, ' ').split(/[\s,/;:()\[\]{}]+/).map(x => x.trim()).filter(x => x.length > 2 && !STOP.has(x)))];
const SIGNALS = ['java','spring','spring boot','microservices','kubernetes','docker','aws','azure','gcp','react','typescript','javascript','python','postgresql','mysql','sql','redis','kafka','leadership','architecture','system design','cloud','agile','scrum','devops','ci/cd','ai','machine learning','mentoring','stakeholder','delivery','scalability','security','testing','distributed systems'];
const contains = (text, token) => new RegExp('(^|[^a-z0-9])' + token.replace(/[.*+?^${}()|[\]\\]/g,'\\$&').replace(/\s+/g,'\\s+') + '($|[^a-z0-9])','i').test(text);
export function matchResume(resume, description, title = '') {
  const r = String(resume || '').toLowerCase(); const jd = `${title} ${description || ''}`.toLowerCase();
  if (!r.trim() || !jd.trim()) return { score: null, matched: [], missing: [], analyzed: 0 };
  const keywords = SIGNALS.filter(s => contains(jd, s));
  const fallback = tokenize(jd).filter(k => k.length > 3).slice(0, 24);
  const terms = keywords.length >= 3 ? keywords : [...new Set([...keywords,...fallback])].slice(0,24);
  const matched = terms.filter(k => contains(r,k)); const missing = terms.filter(k => !contains(r,k));
  return {score: terms.length ? Math.round(100*matched.length/terms.length) : null, matched, missing, analyzed: terms.length};
}
export const validEmail = v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v||'').trim()) && String(v).length <= 254;
export const safeUrl = value => { try {const u=new URL(value); return ['https:','http:'].includes(u.protocol) ? u.toString() : '';} catch {return '';} };
export const clean = (v,max=5000) => String(v??'').trim().slice(0,max);
export function jobKey(j){return [clean(j.company,100),clean(j.title,100),clean(j.url,300)].join('|').toLowerCase();}
export function draftMessage({kind='recruiter',recipient='',name='',role='',company='',match=null,skills=[],sender='',custom=''}={}) {
  const greeting = `Hi ${clean(name,80) || 'there'},`;
  const shortRole=clean(role,120)||'the open position'; const shortCompany=clean(company,120)||'your organization';
  const skillText=skills.slice(0,4).map(s=>clean(s,50)).filter(Boolean).join(', ');
  const body = kind==='referral'
    ? `I hope you're doing well. I noticed the ${shortRole} opportunity at ${shortCompany}, and I'm interested in applying. If you're comfortable, would you consider referring me or pointing me to the right person?\n\n${skillText ? `My relevant experience includes ${skillText}.\n\n` : ''}I'm happy to share my resume and the job link. No pressure if it's not a fit.`
    : `I'm reaching out about the ${shortRole} role at ${shortCompany}. I'd welcome the opportunity to be considered.\n\n${skillText ? `My background includes ${skillText}, which appears relevant to the opening.\n\n`:''}I can share my resume and additional details if helpful.`;
  const subject = kind==='referral' ? `Referral request — ${shortRole} at ${shortCompany}` : `Application interest — ${shortRole} at ${shortCompany}`;
  return {subject, body: `${greeting}\n\n${clean(custom,1000) ? clean(custom,1000)+'\n\n' : ''}${body}\n\nThank you for your time.\n${clean(sender,100)||'Best regards'}`, recipient:clean(recipient,254), match};
}
export function mailtoLink(d){ const to=validEmail(d.recipient)?d.recipient:'';return `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(d.subject)}&body=${encodeURIComponent(d.body)}`; }
function csvField(v){ const text=String(v??''); return /[",\r\n]/.test(text)?'"'+text.replace(/"/g,'""')+'"':text; }
export function toCsv(records, keys){return [keys.join(','),...records.map(r=>keys.map(k=>csvField(r[k])).join(','))].join('\r\n');}
export function parseCsv(input){const rows=[];let row=[],field='',quoted=false;const s=String(input||'').replace(/^\uFEFF/,'');for(let i=0;i<s.length;i++){const c=s[i];if(quoted){if(c==='"'&&s[i+1]==='"'){field+='"';i++;}else if(c==='"')quoted=false;else field+=c;}else if(c==='"')quoted=true;else if(c===','){row.push(field);field='';}else if(c==='\n'||c==='\r'){if(c==='\r'&&s[i+1]==='\n')i++;row.push(field);field='';if(row.some(v=>v.trim()))rows.push(row);row=[];}else field+=c;}if(quoted)throw new Error('Invalid CSV: unclosed quote');row.push(field);if(row.some(v=>v.trim()))rows.push(row);if(!rows.length)return [];const headers=rows.shift().map(x=>x.trim().toLowerCase());return rows.map(cells=>Object.fromEntries(headers.map((h,i)=>[h,clean(cells[i]||'',5000)])));}
