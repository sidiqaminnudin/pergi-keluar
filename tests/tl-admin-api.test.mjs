import 'dotenv/config';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import pg from 'pg';
import express from 'express';
import register,{validateLocation} from '../tl-tracking.js';

async function setup(){
  const pool=new pg.Pool({connectionString:process.env.DATABASE_URL});
  await pool.query(fs.readFileSync('db/schema.sql','utf8'));
  const admin=(await pool.query("INSERT INTO admins(email,password_hash,role) VALUES($1,'x','admin') RETURNING id",[crypto.randomUUID()+'@admin.test'])).rows[0].id;
  const app=express();app.use(express.json());
  const handle=fn=>(req,res,next)=>Promise.resolve(fn(req,res)).catch(next);
  app.use((req,res,next)=>{req.session={adminId:admin,csrf:'test'};next();});
  register({app,pool,handle,auth:(req,res,next)=>next(),csrf:(req,res,next)=>req.get('x-csrf-token')==='test'?next():res.status(403).json({error:'CSRF tidak valid'}),audit:async()=>{}});
  app.use((err,req,res,next)=>res.status(err.status||500).json({error:err.message}));
  const server=app.listen(0);await new Promise(r=>server.once('listening',r));
  return {pool,admin,server,base:'http://localhost:'+server.address().port};
}

test('location validation treats accuracyMeters as optional',()=>{
  assert.deepEqual(validateLocation({latitude:0,longitude:0,accuracyMeters:0}),[0,0,0]);
  assert.deepEqual(validateLocation({latitude:-7.85,longitude:110.48,accuracyMeters:160}),[-7.85,110.48,160]);
  assert.equal(validateLocation({latitude:-7.85,longitude:110.48,accuracyMeters:undefined})[2],null);
  assert.equal(validateLocation({latitude:-7.85,longitude:110.48,accuracyMeters:Infinity})[2],null);
  assert.throws(()=>validateLocation({latitude:null,longitude:0,accuracyMeters:1}));
  assert.throws(()=>validateLocation({latitude:91,longitude:0,accuracyMeters:1}));
});

test('admin TL create rejects duplicate email with friendly 409 (no raw pg error)',async()=>{
  const {pool,server,base}=await setup();
  let tl;
  try{
    const email=crypto.randomUUID()+'@tl.test',pwd='valid-password-12';
    const r1=await fetch(base+'/api/admin/team-leads',{method:'POST',headers:{'content-type':'application/json','x-csrf-token':'test'},body:JSON.stringify({email,password:pwd})});
    assert.equal(r1.status,201);
    tl=(await r1.json()).id;
    const dup=await fetch(base+'/api/admin/team-leads',{method:'POST',headers:{'content-type':'application/json','x-csrf-token':'test'},body:JSON.stringify({email,password:pwd})});
    assert.equal(dup.status,409);
    assert.match((await dup.json()).error,/Email TL sudah digunakan/);
  }finally{
    if(tl)await pool.query('DELETE FROM admins WHERE id=$1',[tl]);
    await server.close();await pool.end();
  }
});

test('admin TL create validates email and password length',async()=>{
  const {pool,server,base}=await setup();
  try{
    const bad=await fetch(base+'/api/admin/team-leads',{method:'POST',headers:{'content-type':'application/json','x-csrf-token':'test'},body:JSON.stringify({email:'not-an-email',password:'short'})});
    assert.equal(bad.status,400);
    assert.match((await bad.json()).error,/Email valid dan password/);
  }finally{await server.close();await pool.end();}
});
