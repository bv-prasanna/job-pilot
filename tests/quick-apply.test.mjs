import test from 'node:test';
import assert from 'node:assert/strict';
import {quickApplyDraft} from '../src/lib/quickApply.mjs';

test('quick apply generates generic message without JD',()=>{
 const d=quickApplyDraft({email:'hr@example.com',role:'Engineering Manager',sender:'Prasanna',resumeText:'Led Java teams'});
 assert.match(d.subject,/Engineering Manager/);
 assert.match(d.body,/resume attached/);
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
