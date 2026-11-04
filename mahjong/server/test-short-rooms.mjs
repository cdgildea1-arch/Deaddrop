import assert from 'node:assert/strict';import {randomBytes} from 'node:crypto';import {Engine} from './engine.js';
const id=()=>randomBytes(12).toString('hex');const url='https://lecudeiafwhyhufceurv.supabase.co/functions/v1/mahjong-rooms';
async function api(b,status=200){const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)}),d=await r.json();assert.equal(r.status,status,JSON.stringify(d));return d}
const code='98437162',host=id(),guest=id();let h=await api({op:'join',code,secret:host,name:'Short-code test host',rules:'mini'});assert.equal(h.seat,0);assert.equal(h.game.rules,'mini');
let g=await api({op:'join',code,secret:guest,name:'Short-code test guest'});assert.equal(g.seat,1);
h=await api({op:'get',code,secret:host});h=await api({op:'action',code,secret:host,rev:h.rev,action:{kind:'draw'}});h=await api({op:'action',code,secret:host,rev:h.rev,action:{kind:'discard',index:0}});
g=await api({op:'get',code,secret:guest});assert.equal(g.game.turn,1);g=await api({op:'action',code,secret:guest,rev:g.rev,action:{kind:'draw'}});assert.equal(g.code,code);
await api({op:'join',code,secret:id(),name:'Third'},403);h=await api({op:'join',code,secret:host,name:'Returning host'});assert.equal(h.seat,0);assert.equal(h.rev,g.rev);
await api({op:'get',code:'10',secret:host},400);
console.log('Reserved short code: first/second seats, absent-opponent play, return by code, full-room and incomplete-code rejection passed');
