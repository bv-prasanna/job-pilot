import test from 'node:test';
import assert from 'node:assert/strict';
import {titleRelevance} from '../src/lib/titleRelevance.mjs';
test('civil engineering does not match software roles',()=>{assert.equal(titleRelevance('Civil Engineer','Senior Software Engineer'),-1);assert.ok(titleRelevance('Civil Engineer','Civil Site Engineer')>0)});
test('software leadership matches the requested occupation',()=>{assert.ok(titleRelevance('Engineering Manager','Engineering Manager - Backend')>0);assert.ok(titleRelevance('Java Backend','Java Backend Developer')>0)});
test('unrelated occupations are excluded',()=>{assert.equal(titleRelevance('Civil Engineer','Sales Director'),0)});

test('Engineering Manager includes closely related software leadership roles',()=>{
 assert.ok(titleRelevance('Engineering Manager','Head of Engineering')>0);
 assert.ok(titleRelevance('Engineering Manager','Tech Lead Manager - Backend')>0);
 assert.ok(titleRelevance('Engineering Manager','Software Development Manager')>0);
 assert.equal(titleRelevance('Engineering Manager','Civil Engineering Manager'),-1);
 assert.equal(titleRelevance('Engineering Manager','Mechanical Engineering Manager'),-1);
});
