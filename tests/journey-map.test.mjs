import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../public/assets/app.js',import.meta.url),'utf8');
const helper=source.slice(source.indexOf('function enhanceJourneyMap('),source.indexOf('function linkMap('));
function setup(){
 const buttons=[];
 const frame={src:'https://maps.google.com/maps?output=embed&t=k&saddr=-6,106&daddr=-7,107+to:-8,108&dirflg=d'};
 const select={value:'m'},status={},reset={};
 const toolbar={querySelector:s=>s==='select'?select:s==='[role="status"]'?status:reset};
 const rows=[0,1,2].map(()=>({querySelector:s=>s==='span'?{prepend(){},append(b){buttons.push(b)}}:{}}));
 const box={querySelector:()=>frame,prepend(){},querySelectorAll:s=>s==='.route-stops li'?rows:buttons};
 const document={querySelector:()=>box,createElement:tag=>tag==='div'?toolbar:{dataset:{},setAttribute(k,v){this[k]=v}}};
 const context=vm.createContext({document,URL,Number,String});
 vm.runInContext(helper,context);
 context.enhanceJourneyMap([{label:'Awal',latitude:-6,longitude:106},{label:'Singgah',latitude:-7,longitude:107},{label:'Akhir',latitude:-8,longitude:108}]);
 return {buttons,frame,select,status,reset};
}
test('default road map preserves all route waypoints',()=>{
 const {frame,buttons}=setup();const url=new URL(frame.src);
 assert.equal(url.searchParams.get('t'),'m');assert.equal(url.searchParams.get('daddr'),'-7,107 to:-8,108');assert.equal(buttons.length,3);
});
test('focus middle stop and switch layer without losing location',()=>{
 const {frame,buttons,select,status}=setup();buttons[1].onclick();select.value='p';select.onchange();
 const url=new URL(frame.src);assert.equal(url.searchParams.get('q'),'-7,107');assert.equal(url.searchParams.get('t'),'p');assert.equal(url.searchParams.has('saddr'),false);assert.match(status.textContent,/Singgah/);assert.equal(buttons[1]['aria-pressed'],'true');
});
test('reset restores full route and keeps selected map layer',()=>{
 const {frame,buttons,select,reset}=setup();buttons[2].onclick();select.value='k';reset.onclick();
 const url=new URL(frame.src);assert.equal(url.searchParams.get('saddr'),'-6,106');assert.equal(url.searchParams.get('t'),'k');assert.equal(url.searchParams.has('q'),false);
});
 test('pages without a map are ignored',()=>{const context=vm.createContext({document:{querySelector:()=>null}});vm.runInContext(helper,context);context.enhanceJourneyMap([])});
