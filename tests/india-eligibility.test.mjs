import test from 'node:test';
import assert from 'node:assert/strict';
import {indiaEligibility} from '../src/lib/indiaEligibility.mjs';

test('rejects remote Brazil, US and Europe-only vacancies',()=>{
 assert.equal(indiaEligibility('Brazil','', 'Engineering Manager - Feegow (100% Remote within Brazil)').status,'excluded');
 assert.equal(indiaEligibility('United States','', 'Engineering Manager').status,'excluded');
 assert.equal(indiaEligibility('Remote - USA','','Senior Java Lead').status,'excluded');
 assert.equal(indiaEligibility('Europe','','Engineering Manager').status,'excluded');
 assert.equal(indiaEligibility('Worldwide','We hire globally excluding India','Engineering Manager').status,'excluded');
});
test('accepts India locations and explicitly worldwide hiring',()=>{
 assert.equal(indiaEligibility('Bengaluru, Karnataka, India','','Engineering Manager').status,'eligible');
 assert.equal(indiaEligibility('Remote - India','','Backend Lead').status,'eligible');
 assert.equal(indiaEligibility('Worldwide','','Engineering Manager').status,'eligible');
 assert.equal(indiaEligibility('Remote','Open to applicants worldwide','Engineering Manager').status,'eligible');
});
test('does not assume a generic remote or APAC listing accepts India-based applicants',()=>{
 assert.equal(indiaEligibility('Remote','','Engineering Manager').status,'unknown');
 assert.equal(indiaEligibility('APAC','','Engineering Manager').status,'unknown');
 assert.equal(indiaEligibility('','','Engineering Manager').status,'unknown');
});
