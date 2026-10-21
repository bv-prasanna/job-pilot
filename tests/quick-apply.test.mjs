import test from 'node:test';
import assert from 'node:assert/strict';
import {quickApplyDraft,parseRecipients,gmailRawWithAttachment} from '../src/lib/quickApply.mjs';

test('quick apply generates generic message without JD',()=>{
 const d=quickApplyDraft({email:'hr@example.com',role:'Engineering Manager',sender:'Prasanna',resumeText:'Led Java teams'});
 assert.match(d.subject,/Engineering Manager/);
 assert.match(d.body,/attached my resume/);
 assert.match(d.body,/Prasanna/);
 assert.equal(d.match,null);
});
test('quick apply uses evidenced overlaps with supplied JD',()=>{
 const d=quickApplyDraft({email:'hr@example.com',role:'Java Lead',jd:'Java Spring Boot and Kafka experience',resumeText:'I have led Java Spring Boot teams',sender:'Applicant'});
 assert.ok(d.match);
 assert.ok(d.match.matched.includes('java'));
 assert.ok(!d.body.includes('Kafka,')&&!d.body.includes('includes Kafka'));
});
test('quick apply validates required recipient and role',()=>{
 assert.throws(()=>quickApplyDraft({email:'wrong',role:'Manager'}),/valid recruiter/);
 assert.throws(()=>quickApplyDraft({email:'hr@example.com',role:'   '}),/role or position/);
});
test('quick apply does not invent employer or qualifications',()=>{
 const d=quickApplyDraft({email:'hr@example.com',role:'Director',jd:'Kubernetes, GCP, Python',resumeText:'Java development'});
 assert.ok(!d.body.includes('Kubernetes'));
 assert.ok(!d.subject.includes(' at '));
});

test('supports multiple recruiter addresses and deduplicates recipients',()=>{
 const d=quickApplyDraft({email:'HR@example.com, hr@example.com; recruiter@company.com',role:'Engineering Manager'});
 assert.deepEqual(d.recipients,['hr@example.com','recruiter@company.com']);
 assert.equal(d.to,'hr@example.com, recruiter@company.com');
});
test('rejects invalid or excessive recruiter address lists',()=>{
 assert.throws(()=>parseRecipients('valid@example.com,not-an-address'),/valid email/);
 assert.throws(()=>parseRecipients(Array.from({length:11},(_,i)=>'hr'+i+'@example.com').join(',')),/1 to 10/);
});
test('JD evidence changes message content based on the actual resume',()=>{
 const jd='We need Java, Spring Boot, Kafka and Kubernetes engineering leadership';
 const first=quickApplyDraft({email:'hr@example.com',role:'Engineering Manager',jd,resumeText:'Led Java and Spring Boot services'});
 const second=quickApplyDraft({email:'hr@example.com',role:'Engineering Manager',jd,resumeText:'Managed Kubernetes environments and Kafka streaming'});
 assert.match(first.body,/Java/);
 assert.match(first.body,/Spring Boot/);
 assert.doesNotMatch(first.body,/Kubernetes/);
 assert.match(second.body,/Kubernetes/);
 assert.match(second.body,/Kafka/);
 assert.notEqual(first.body,second.body);
});

test('Gmail MIME includes multiple recipients and actual PDF attachment',async()=>{
 const bytes=Buffer.from('%PDF-1.4 example');
 const file={name:'resume.pdf',size:bytes.length,arrayBuffer:async()=>Uint8Array.from(bytes).buffer};
 const raw=await gmailRawWithAttachment({to:'a@example.com,b@example.com',subject:'Engineering Manager',body:'Please find my resume attached.',file});
 const mime=Buffer.from(raw,'base64url').toString('utf8');
 assert.match(mime,/To: a@example.com, b@example.com/);
 assert.match(mime,/filename="resume.pdf"/);
 assert.match(mime,/multipart\/mixed/);
 assert.match(mime,/JVBERi0xLjQ/);
});
test('Gmail MIME rejects invalid email lists and oversized resume',async()=>{
 const file={name:'resume.pdf',size:10,arrayBuffer:async()=>new Uint8Array([1,2,3]).buffer};
 await assert.rejects(gmailRawWithAttachment({to:'invalid, a@example.com',subject:'Test',body:'Hi',file}),/valid email/);
 await assert.rejects(gmailRawWithAttachment({to:'a@example.com',subject:'Test',body:'Hi',file:{...file,size:8*1024*1024}}),/smaller than 7/);
});

test('defaults signature to personal name rather than Applicant',()=>{
 const d=quickApplyDraft({email:'hr@example.com',role:'Engineering Manager'});
 assert.match(d.body,/Best regards,\nPrasanna Kumar$/);
 assert.doesNotMatch(d.body,/Applicant/);
});
test('saved profile name takes precedence in personal signature',()=>{
 const d=quickApplyDraft({email:'hr@example.com',role:'Java Lead',sender:'Prasanna Kumar BV'});
 assert.match(d.body,/Best regards,\nPrasanna Kumar BV$/);
});
