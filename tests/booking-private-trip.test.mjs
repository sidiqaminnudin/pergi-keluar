import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const app=readFileSync(new URL('../public/assets/app.js',import.meta.url),'utf8');
const server=readFileSync(new URL('../server.js',import.meta.url),'utf8');
const between=(src,a,b)=>src.slice(src.indexOf(a),src.indexOf(b));
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const helpers=between(app,'function rupiah(','\nasync function api(');
const helperCtx=(site={})=>{const ctx=vm.createContext({site});vm.runInContext(helpers,ctx);return ctx};

test('rupiah formats positive prices and hides empty/zero/invalid values',()=>{
  const {rupiah}=helperCtx();
  assert.equal(rupiah(350000),'Rp '+(350000).toLocaleString('id-ID'));
  for(const v of [null,undefined,'',0,-5,'abc'])assert.equal(rupiah(v),null);
});

test('ytId accepts raw IDs and common YouTube URL forms, rejects others',()=>{
  const {ytId}=helperCtx();
  assert.equal(ytId('hHD434conAE'),'hHD434conAE');
  assert.equal(ytId('https://www.youtube.com/watch?v=2AFOHF6_Kqk'),'2AFOHF6_Kqk');
  assert.equal(ytId('https://www.youtube.com/watch?feature=share&v=2AFOHF6_Kqk'),'2AFOHF6_Kqk');
  assert.equal(ytId('https://youtu.be/9L5u0Lc04wM?t=10'),'9L5u0Lc04wM');
  assert.equal(ytId('https://www.youtube.com/shorts/g6negoLzGKE'),'g6negoLzGKE');
  assert.equal(ytId('https://www.youtube-nocookie.com/embed/MXDPDm4kmsg'),'MXDPDm4kmsg');
  for(const v of ['','https://example.com/watch?v=2AFOHF6_Kqk','javascript:alert(1)',null])assert.equal(ytId(v),null);
});

test('ytWatch falls back to channel URL and lines splits multiline text',()=>{
  const {ytWatch,lines}=helperCtx({youtube:'https://www.youtube.com/@pergikeluar'});
  assert.equal(ytWatch('rv5gdEy6pQs'),'https://www.youtube.com/watch?v=rv5gdEy6pQs');
  assert.equal(ytWatch('javascript:alert(1)'),'https://www.youtube.com/@pergikeluar');
  assert.deepEqual([...lines('Hiace AC\r\n\n  Tiket masuk  \nMakan siang')],['Hiace AC','Tiket masuk','Makan siang']);
  assert.deepEqual([...lines(null)],[]);
});

test('tripCard and destCard render booking metadata and YouTube badges safely',()=>{
  const ctx=vm.createContext({esc,attr:esc,img:s=>s||'fallback.jpg',ico:n=>`[${n}]`,fmt:d=>d||'Jadwal menyusul',link:(p,t,c='')=>`<a href="${p}" class="${c}">${t}</a>`,site:{}});
  vm.runInContext(helpers+'\n'+between(app,'function tripCard(','function privateTripSection('),ctx);
  const base={slug:'borobudur-1-hari',title:'Borobudur <1 Hari>',description:'x',cover:'',start_date:'2026-10-27'};
  const plain=ctx.tripCard(base);
  assert.doesNotMatch(plain,/kursi|Mulai dari/);
  assert.match(plain,/Borobudur &lt;1 Hari&gt;/);
  const full=ctx.tripCard({...base,price_from:350000,seats_left:2});
  assert.match(full,/Mulai dari/);
  assert.match(full,/Sisa 2 kursi/);
  assert.match(full,/tag-right warn/);
  assert.match(ctx.tripCard({...base,seats_left:0}),/Kuota penuh/);
  assert.match(ctx.destCard({slug:'garut',name:'Garut',region:'Jawa Barat',category:'Alam',youtube_url:'MXDPDm4kmsg'}),/Episode YouTube/);
  assert.doesNotMatch(ctx.destCard({slug:'a',name:'A',region:'B',category:'Alam',youtube_url:''}),/Episode YouTube/);
});

test('private trip planner builds a WhatsApp message from the form and opens it',()=>{
  const values={dest:'Tawangmangu & Ngargoyoso (Karanganyar · Jawa Tengah)',date:'2026-12-20',duration:'2 Hari 1 Malam',pax:'12',origin:'Yogyakarta',notes:'Ramah lansia'};
  const listeners={};let opened=null;const toasts=[];
  const form={addEventListener:(ev,fn)=>{listeners[ev]=fn},onsubmit:null};const preview={textContent:''};
  const ctx=vm.createContext({
    document:{querySelector:s=>({'#privateTripForm':form,'#privateMsgPreview':preview}[s]??null)},
    FormData:class{get(k){return values[k]??null}},
    fmt:d=>'FMT('+d+')',
    wa:m=>'https://wa.me/6285111415311?text='+encodeURIComponent(m),
    toast:(m,e)=>toasts.push({m,e}),
    window:{open:(u)=>{opened=u}}
  });
  vm.runInContext(between(app,'function bindPrivatePlanner(','function privateTripPage('),ctx);
  ctx.bindPrivatePlanner();
  assert.match(preview.textContent,/Tujuan: Tawangmangu & Ngargoyoso/);
  assert.match(preview.textContent,/FMT\(2026-12-20\) \(2 Hari 1 Malam\)/);
  assert.match(preview.textContent,/Jumlah peserta: 12 orang/);
  assert.match(preview.textContent,/Kota keberangkatan: Yogyakarta/);
  assert.match(preview.textContent,/Catatan: Ramah lansia/);
  values.pax='20';listeners.input();
  assert.match(preview.textContent,/20 orang/);
  let prevented=false;form.onsubmit({preventDefault(){prevented=true}});
  assert.equal(prevented,true);
  assert.ok(opened.startsWith('https://wa.me/6285111415311?text='));
  assert.match(decodeURIComponent(opened.split('text=')[1]),/Private Trip[\s\S]*20 orang/);
  assert.equal(toasts.length,0);
});

test('tripInput normalizes booking metadata (nullable numbers, trimmed URL, length limits)',()=>{
  const src=server.split('\n').filter(l=>l.startsWith('const safe=')||l.startsWith('const arr=')||l.startsWith('function tripInput(')).join('\n');
  const tripInput=vm.runInNewContext(src+'\ntripInput');
  const empty=tripInput({title:'T',price_from:'',seats_left:null});
  assert.equal(empty.price_from,null);
  assert.equal(empty.seats_left,null);
  assert.equal(empty.meeting_point,'');
  assert.equal(empty.youtube_url,'');
  const v=tripInput({title:'T',price_from:'350000.9',seats_left:-3,meeting_point:'Stasiun Tugu',includes:'A\nB',excludes:'C',youtube_url:'  https://youtu.be/hHD434conAE  '});
  assert.equal(v.price_from,350000);
  assert.equal(v.seats_left,0);
  assert.equal(v.meeting_point,'Stasiun Tugu');
  assert.equal(v.includes,'A\nB');
  assert.equal(v.youtube_url,'https://youtu.be/hHD434conAE');
  assert.equal(tripInput({title:'T',price_from:'abc'}).price_from,null);
  assert.equal(tripInput({title:'T',includes:'x'.repeat(5000)}).includes.length,4000);
});
