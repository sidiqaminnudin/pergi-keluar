import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../public/assets/app.js',import.meta.url),'utf8');
// `let draft` would be invisible to the vm context object, so expose it as a global var for the test.
const slice=source.slice(source.indexOf('function field('),source.indexOf('function editorRender(')).replace('let draft=null;','var draft=null;');

function createEnv({draftOverrides={},apiImpl}={}){
  const toasts=[];
  const calls=[];
  let renders=0;
  let clicked=false;
  const listeners={};
  const els={
    '#coverFile':{files:[],value:'',click(){clicked=true}},
    '#coverPick':{disabled:false,onclick:null},
    '#coverInput':{value:draftOverrides.cover||'',addEventListener(ev,fn){listeners[ev]=fn}},
    '#coverThumb':{src:''},
    '#coverStatus':{textContent:'Tempel URL di atas, atau upload JPG, PNG, WebP (maks. 5 MB) dari perangkat. File tersimpan di Media & Galeri.'},
    '.editor-preview':{style:{backgroundImage:''}},
    '#editorForm':{dataset:{}},
    '#editorForm [name="title"]':{value:draftOverrides.title??'Eksplorasi Lawu'}
  };
  const formValues={
    title:draftOverrides.title??'Eksplorasi Lawu',
    slug:draftOverrides.slug??'eksplorasi-lawu',
    subtitle:draftOverrides.subtitle??'Private trip',
    location:draftOverrides.location??'Karanganyar',
    cover:draftOverrides.cover??'',
    description:draftOverrides.description??'Deskripsi awal',
    reminder:draftOverrides.reminder??'',
    start_date:draftOverrides.start_date??'2026-06-01',
    end_date:draftOverrides.end_date??'2026-06-02',
    participant_min:String(draftOverrides.participant_min??4),
    participant_max:String(draftOverrides.participant_max??12)
  };
  class FakeFormData{
    constructor(form){this.entries={};if(form)Object.assign(this.entries,formValues)}
    append(k,v){this.entries[k]=v}
    get(k){return this.entries[k]??null}
    getAll(k){return this.entries[k]?[this.entries[k]]:[]}
    has(k){return Boolean(this.entries[k])}
  }
  const document={querySelector:sel=>els[sel]??null};
  const context=vm.createContext({
    document,FormData:FakeFormData,Number,String,JSON,editTab:'Informasi Dasar',destinations:[],
    ico:n=>`<svg data-ico="${n}"></svg>`,
    esc:v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),
    attr:v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),
    img:(s,f='https://default.test/fallback.jpg')=>s||f,
    empty:t=>`<div>${t}</div>`,
    toast:(msg,err=false)=>toasts.push({msg,err}),
    api:async(url,opts)=>{calls.push({url,opts});if(apiImpl)return apiImpl(url,opts);return {id:'m1',path:'/uploads/cover-local.webp',mime_type:'image/webp'}},
    editorRender:()=>{renders++;els['#coverInput'].value=context.draft.cover}
  });
  vm.runInContext(slice,context);
  context.draft={id:'trip-1',title:'Eksplorasi Lawu',slug:'eksplorasi-lawu',subtitle:'Private trip',location:'Karanganyar',cover:'',description:'Deskripsi awal',reminder:'',start_date:'2026-06-01',end_date:'2026-06-02',participant_min:4,participant_max:12,featured:false,status:'draft',visibility:'public',days:[{label:'Hari 1',items:[]}],destination_ids:[],stops:[],infos:[],gallery:[],...draftOverrides};
  return {context,els,formValues,toasts,calls,listeners,getClicked:()=>clicked,getRenders:()=>renders};
}


test('editorContent renders cover URL input and local file upload controls',()=>{
  const {context}=createEnv({draftOverrides:{cover:'/uploads/existing.jpg'}});
  const html=context.editorContent();
  assert.match(html,/id="coverInput"/);
  assert.match(html,/id="coverPick"/);
  assert.match(html,/id="coverFile"[^>]*accept="image\/jpeg,image\/png,image\/webp"/);
  assert.match(html,/Upload dari perangkat/);
  assert.match(html,/\/uploads\/existing\.jpg/);
});

test('clicking upload button opens file picker and typing URL updates previews',()=>{
  const {context,els,listeners,getClicked}=createEnv();
  context.bindCoverUpload();
  els['#coverPick'].onclick();
  assert.equal(getClicked(),true);
  els['#coverInput'].value='https://example.com/sampul.jpg';
  listeners.input();
  assert.equal(els['#coverThumb'].src,'https://example.com/sampul.jpg');
  assert.match(els['.editor-preview'].style.backgroundImage,/https:\/\/example\.com\/sampul\.jpg/);
});

test('rejects invalid format and oversized files before calling API',async()=>{
  const {context,els,toasts,calls}=createEnv();
  context.bindCoverUpload();
  els['#coverFile'].files=[{name:'dokumen.pdf',type:'application/pdf',size:1024}];
  await els['#coverFile'].onchange();
  assert.equal(calls.length,0);
  assert.equal(toasts.at(-1)?.err,true);
  assert.match(toasts.at(-1)?.msg||'',/JPG, PNG, atau WebP/);
  els['#coverFile'].files=[{name:'besar.png',type:'image/png',size:5*1024*1024+1}];
  await els['#coverFile'].onchange();
  assert.equal(calls.length,0);
  assert.match(toasts.at(-1)?.msg||'',/maksimal 5 MB/);
});

test('uploads valid local image, keeps unsaved form edits, and sets draft.cover',async()=>{
  const {context,els,formValues,toasts,calls,getRenders}=createEnv();
  context.bindCoverUpload();
  formValues.title='Judul Baru Belum Disimpan';
  els['#editorForm [name="title"]'].value='Judul Baru Belum Disimpan';
  const localFile={name:'sampul-lokal.webp',type:'image/webp',size:240000};
  els['#coverFile'].files=[localFile];
  await els['#coverFile'].onchange();
  assert.equal(calls.length,1);
  assert.equal(calls[0].url,'/api/admin/media');
  assert.equal(calls[0].opts.method,'POST');
  assert.equal(calls[0].opts.body.get('file'),localFile);
  assert.equal(calls[0].opts.body.get('alt_text'),'Sampul Judul Baru Belum Disimpan');
  assert.equal(context.draft.title,'Judul Baru Belum Disimpan');
  assert.equal(context.draft.cover,'/uploads/cover-local.webp');
  assert.equal(getRenders(),1);
  assert.equal(toasts.at(-1)?.err,false);
});

test('restores button and file input when upload fails',async()=>{
  const {context,els,toasts}=createEnv({apiImpl:async()=>{throw new Error('Gagal mengunggah ke server')}});
  context.bindCoverUpload();
  els['#coverFile'].files=[{name:'foto.jpg',type:'image/jpeg',size:12000}];
  await els['#coverFile'].onchange();
  assert.equal(els['#coverPick'].disabled,false);
  assert.equal(els['#coverFile'].value,'');
  assert.equal(toasts.at(-1)?.err,true);
  assert.match(toasts.at(-1)?.msg||'',/Gagal mengunggah ke server/);
});
