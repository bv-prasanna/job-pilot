import test from 'node:test';
import assert from 'node:assert/strict';
import {quickApplyDraft,parseRecipients} from '../src/lib/quickApply.mjs';

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
