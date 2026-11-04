import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {Engine} from './engine.js';
const code=()=>randomBytes(12).toString('hex'),url='https://lecudeiafwhyhufceurv.supabase.co/functions/v1/mahjong-rooms';
async function api(p,expected=200){const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(p)}),data=await r.json();assert.equal(r.status,expected,JSON.stringify(data));return data}
for(const rules of ['pairs','mini','full']){
 const c=code(),host=code(),guest=code();let h=await api({op:'create',code:c,secret:host,name:'Test host',rules,level:'easy'});assert.equal(h.seat,0);
 // Host sends no further requests until the guest has joined and played.
 let g=await api({op:'join',code:c,secret:guest,name:'Test guest'});assert.equal(g.seat,1);assert.equal(g.game.names[1],'Test guest');
 await api({op:'join',code:c,secret:code(),name:'Third'},403);
 h=await api({op:'get',code:c,secret:host});const action=rules==='pairs'?{kind:'match',ids:Engine.pairs(h.game.tiles)[0]}:{kind:'draw'};
 const first=await api({op:'action',code:c,secret:host,rev:h.rev,action});
 await api({op:'action',code:c,secret:host,rev:h.rev,action},409);
 if(rules!=='pairs'){h=await api({op:'action',code:c,secret:host,rev:first.rev,action:{kind:'discard',index:0}})}else h=first;
 g=await api({op:'get',code:c,secret:guest});assert.equal(g.game.turn,1);assert.equal(g.rev,h.rev);
 const secondAction=rules==='pairs'?{kind:'match',ids:Engine.pairs(g.game.tiles)[0]}:{kind:'draw'};
 g=await api({op:'action',code:c,secret:guest,rev:g.rev,action:secondAction});
 const msgid=code();g=await api({op:'message',code:c,secret:guest,id:msgid,text:'Saved-room test message'});
 const duplicate=await api({op:'message',code:c,secret:guest,id:msgid,text:'Saved-room test message'});assert.equal(duplicate.messages.length,1);
 // Fresh request with same seat key restores state, code, and messages.
 h=await api({op:'get',code:c,secret:host});assert.equal(h.code,c);assert.equal(h.rev,g.rev);assert.equal(h.messages.length,1);
 await api({op:'get',code:c,secret:code()},403);
 console.log(rules+': offline join, alternating turns, seat restore, stale-write rejection, full-room denial, saved messages passed');
}
