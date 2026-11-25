import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../public/assets/app.js',import.meta.url),'utf8');
const slice=source.slice(source.indexOf('async function teamLeadsAdmin('),source.indexOf('async function render('));

function setup({users,trips,assignments}={}){
  users=users??[{id:'u1',email:'tl@pergikeluar.id',is_active:true},{id:'u2',email:'tl2@pergikeluar.id',is_active:false}];
  trips=trips??[{id:'t1',title:'Borobudur 2 Hari'},{id:'t2',title:'Trip Bromo'}];
  assignments=assignments??[{tl_id:'u1',trip_id:'t1'}];
  const apiCalls=[],toasts=[];
  const forms={},unassignButtons=[],toggleButtons=[],deleteButtons=[];
  class FakeFormData{
    constructor(form){this._={email:'tl3@pergikeluar.id',password:'aman66',tlId:'u1',tripId:'t1'};}
    [Symbol.iterator](){return Object.entries(this._)[Symbol.iterator]();}
  }
  const document={
    querySelector:sel=>forms[sel]??null,
    querySelectorAll:sel=>sel==='[data-unassign]'?unassignButtons:sel==='[data-toggle-tl]'?toggleButtons:sel==='[data-delete-tl]'?deleteButtons:[]
  };
  let layoutContent=null,layoutTitle=null;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const context=vm.createContext({
    document,FormData:FakeFormData,Object,Number,String,JSON,Promise,confirm:()=>true,
    ico:n=>`<svg data-ico="${n}"></svg>`,
    esc,attr:esc,
    empty:t=>`<div class="empty">${t}</div>`,
    field:(name,label,value='',type='text',extra='')=>`<label class="field">${label}<input name="${name}" type="${type}" value="${value??''}" ${extra}></label>`,
    selectField:(name,label,value,opts=[])=>`<label class="field">${label}<select name="${name}">${opts.map(([v,t])=>`<option value="${v}" ${value===v?'selected':''}>${t}</option>`).join('')}</select></label>`,
    adminLayout:(content,title)=>{layoutContent=content;layoutTitle=title;forms['#createTl']={onsubmit:null};forms['#assignTl']={onsubmit:null};unassignButtons.length=0;unassignButtons.push({dataset:{unassign:'u1/t1'},onclick:null});toggleButtons.length=0;toggleButtons.push({dataset:{toggleTl:'u2',enable:'true'},onclick:null});deleteButtons.length=0;deleteButtons.push({dataset:{deleteTl:'u2'},onclick:null});},
    api:async(url,opts={})=>{apiCalls.push({url,opts});if(url==='/api/admin/team-leads')return users;if(url==='/api/admin/trips')return trips;if(url==='/api/admin/tl-assignments')return assignments;return {};},
    toast:(msg,err=false)=>toasts.push({msg,err})
  });
  vm.runInContext(slice,context);
  return {context,forms,unassignButtons,toggleButtons,deleteButtons,getApi:()=>apiCalls,getToasts:()=>toasts,getLayout:()=>({content:layoutContent,title:layoutTitle})};
}

test('teamLeadsAdmin fetches TL, trips, and assignments then renders via adminLayout',async()=>{
  const {context,getApi,getLayout}=setup();
  await context.teamLeadsAdmin();
  const api=getApi(),{content,title}=getLayout();
  assert.ok(api.some(c=>c.url==='/api/admin/team-leads'),'fetches team-leads');
  assert.ok(api.some(c=>c.url==='/api/admin/trips'),'fetches trips');
  assert.ok(api.some(c=>c.url==='/api/admin/tl-assignments'),'fetches assignments');
  assert.equal(title,'Kelola Team Lead');
  assert.match(content,/id="createTl"/);
  assert.match(content,/minlength="6"/);
  assert.match(content,/Password \(6–72 karakter\)/);
  assert.match(content,/id="assignTl"/);
  assert.match(content,/data-unassign="u1\/t1"/);
  assert.match(content,/data-toggle-tl="u2"/);
  assert.match(content,/data-delete-tl="u2"/);
  assert.match(content,/tl@pergikeluar\.id/);
  assert.match(content,/Borobudur 2 Hari/);
  assert.match(content,/Nonaktifkan/);
  assert.match(content,/Aktifkan/);
  assert.match(content,/Hapus/);
});

test('create TL form posts to /api/admin/team-leads',async()=>{
  const {context,forms,getApi}=setup();
  await context.teamLeadsAdmin();
  await forms['#createTl'].onsubmit({preventDefault(){},target:{}});
  assert.ok(getApi().some(c=>c.url==='/api/admin/team-leads'&&c.opts.method==='POST'),'posts new TL');
});

test('assignment form posts to /api/admin/tl-assignments',async()=>{
  const {context,forms,getApi}=setup();
  await context.teamLeadsAdmin();
  await forms['#assignTl'].onsubmit({preventDefault(){},target:{}});
  assert.ok(getApi().some(c=>c.url==='/api/admin/tl-assignments'&&c.opts.method==='POST'),'posts assignment');
});

test('revoke button deletes assignment',async()=>{
  const {context,unassignButtons,getApi}=setup();
  await context.teamLeadsAdmin();
  await unassignButtons[0].onclick();
  assert.ok(getApi().some(c=>c.url==='/api/admin/tl-assignments/u1/t1'&&c.opts.method==='DELETE'),'deletes assignment');
});

test('toggle button patches TL active state',async()=>{
  const {context,toggleButtons,getApi}=setup();
  await context.teamLeadsAdmin();
  await toggleButtons[0].onclick();
  const patch=getApi().find(c=>c.url==='/api/admin/team-leads/u2'&&c.opts.method==='PATCH');
  assert.ok(patch,'patches TL');
  assert.equal(JSON.parse(patch.opts.body).isActive,true);
});

test('delete button deletes TL account',async()=>{
  const {context,deleteButtons,getApi}=setup();
  await context.teamLeadsAdmin();
  await deleteButtons[0].onclick();
  const del=getApi().find(c=>c.url==='/api/admin/team-leads/u2'&&c.opts.method==='DELETE');
  assert.ok(del,'deletes TL');
});
