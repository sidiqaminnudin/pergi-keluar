import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import pgUtils from 'pg/lib/utils.js';

// Evaluate the actual normalization functions without starting the server/database.
const source=fs.readFileSync(new URL('../server.js',import.meta.url),'utf8');
const helpers=source.split('\n').filter(line=>line.startsWith('const safe=')||line.startsWith('const arr=')||line.startsWith('function tripInput(')).join('\n');
const tripInput=vm.runInNewContext(helpers+'\ntripInput');
const fields=['days','destination_ids','stops','infos','gallery'];
const input={title:'Trip test',days:[{label:'Hari 1 — Sabtu',items:[{time:'17:00',title:'Check-in hotel',description:'Istirahat, acara "bebas" \\ hotel'}]},{label:'Hari 2',items:[]}],destination_ids:['destination-1'],stops:[{label:'Hotel',latitude:-7.6,longitude:111.1}],infos:[{title:'Catatan',body:'Bawa jaket'}],gallery:['/uploads/photo.webp']};

function checkParameters(value,expected){
  for(const field of fields){
    assert.equal(typeof value[field],'string',field+' must be a JSON string');
    assert.deepEqual(JSON.parse(pgUtils.prepareValue(value[field])),expected[field],field+' must survive pg serialization');
  }
}

test('create serializes all JSONB arrays, including nested agenda and escaped text',()=>{
  checkParameters(tripInput(input),input);
});
test('partial edit preserves existing JSONB arrays returned by PostgreSQL',()=>{
  const edited=tripInput({...input,title:'Updated title'});
  assert.equal(edited.title,'Updated title');
  checkParameters(edited,input);
});
test('editing itinerary replaces days without double serialization',()=>{
  const days=[{label:'Hari baru',items:[{title:'Agenda baru'}]}];
  checkParameters(tripInput({...input,days}),{...input,days});
});
test('missing or empty collections become valid JSON arrays',()=>{
  for(const value of [tripInput({title:'Empty'}),tripInput({title:'Empty',...Object.fromEntries(fields.map(k=>[k,[]]))})]){
    checkParameters(value,Object.fromEntries(fields.map(k=>[k,[]])));
  }
});
test('collection limits remain enforced',()=>{
  const value=tripInput({title:'Limits',days:Array(40).fill({items:[]}),gallery:Array(110).fill('photo')});
  assert.equal(JSON.parse(value.days).length,31);
  assert.equal(JSON.parse(value.gallery).length,100);
});
