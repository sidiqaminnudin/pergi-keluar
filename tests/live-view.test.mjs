import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const html=readFileSync(new URL('../public/tracking.html',import.meta.url),'utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
new vm.Script(script);
function setup(){const nodes=new Map();const document={querySelector(s){if(!nodes.has(s))nodes.set(s,{textContent:'',innerHTML:'',className:''});return nodes.get(s)}};const ctx=vm.createContext({document,location:{search:'?slug=demo'},URLSearchParams,Date,setInterval(){}});vm.runInContext(script.slice(0,script.indexOf('if(location.pathname===')),ctx);return {ctx,get:s=>document.querySelector(s)}}
const fresh=()=>({title:'Trip',status:'active',lastLocationAt:new Date().toISOString(),location:{latitude:-6,longitude:106,accuracyMeters:12},checkpoints:[{label:'Awal',status:'departed'},{label:'Tujuan',status:'upcoming'}],currentCheckpoint:1});
test('live location displays map and checkpoint progress',()=>{const {ctx,get}=setup();ctx.renderLive(fresh());assert.match(get('#liveMap').innerHTML,/<iframe/);assert.equal(get('#fresh').textContent,'Live');assert.equal(get('#checkpoint').textContent,'1 / 2');assert.match(get('#checkpoints').innerHTML,/current/)});
test('same coordinates preserve iframe markup between polls',()=>{const {ctx,get}=setup();ctx.renderLive(fresh());get('#liveMap').innerHTML='unchanged';ctx.renderLive(fresh());assert.equal(get('#liveMap').innerHTML,'unchanged')});
test('hidden, stale, completed, and invalid locations never claim Live',()=>{for(const change of [{location:null},{lastLocationAt:new Date(Date.now()-120001).toISOString()},{status:'completed'},{lastLocationAt:'invalid'},{location:{latitude:999,longitude:106}}]){const {ctx,get}=setup();ctx.renderLive({...fresh(),...change});assert.doesNotMatch(get('#liveMap').innerHTML,/<iframe/);assert.notEqual(get('#fresh').textContent,'Live')}});
test('network failure removes coordinates and map immediately',()=>{const {ctx,get}=setup();ctx.renderLive(fresh());ctx.showError(new Error('Offline'));assert.doesNotMatch(get('#liveMap').innerHTML,/<iframe/);assert.equal(get('#fresh').textContent,'Tidak tersambung');assert.equal(get('#location').textContent,'Tidak tersedia')});
