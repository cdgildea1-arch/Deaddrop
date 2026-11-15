export const suit=c=>Math.floor(c/13);
export const rank=c=>c%13;
export const penalty=c=>c===49?13:suit(c)===2?1:0;
export const directions=['Left','Right','Across','Hold'];
const offsets=[1,3,2,0];
export function newGame(names,humans){
 return deal({id:crypto.randomUUID(),rev:0,names,humans,scores:[0,0,0,0],round:0});
}
function deal(g){
 const cards=Array.from({length:52},(_,i)=>i);
 for(let i=51;i>0;i--){const j=Math.floor(Math.random()*(i+1));[cards[i],cards[j]]=[cards[j],cards[i]];}
 const hands=Array.from({length:4},(_,i)=>cards.slice(i*13,i*13+13).sort((a,b)=>a-b));
 return Object.assign(g,{round:g.round+1,hands,turn:hands.findIndex(h=>h.includes(0)),phase:g.round%4===3?'play':'pass',passes:Array(4).fill(null),trick:[],last:[],taken:[0,0,0,0],played:0,broken:false,winner:null,moon:null});
}
export function legal(g,seat){
 const hand=g.hands[seat];
 if(!g.played&&!g.trick.length)return hand.filter(c=>c===0);
 if(g.trick.length){
  const follow=hand.filter(c=>suit(c)===suit(g.trick[0].card));
  if(follow.length)return follow;
  if(!g.played){const safe=hand.filter(c=>!penalty(c));if(safe.length)return safe;}
 }else if(!g.broken){
  const safe=hand.filter(c=>suit(c)!==2);if(safe.length)return safe;
 }
 return hand;
}
export function action(g,seat,m){
 if(g.id!==m.id||seat<0||seat>3)throw Error('This game changed.');
 if(m.type==='pass'&&g.phase==='pass'){
  if(g.passes[seat]||!Array.isArray(m.cards)||m.cards.length!==3||new Set(m.cards).size!==3||!m.cards.every(c=>g.hands[seat].includes(c)))throw Error('Choose exactly three cards to pass.');
  g.passes[seat]=m.cards;
  if(g.passes.every(Boolean)){
   const offset=offsets[(g.round-1)%4];
   g.hands=g.hands.map((h,i)=>h.filter(c=>!g.passes[i].includes(c)).concat(g.passes[(i-offset+4)%4]).sort((a,b)=>a-b));
   g.turn=g.hands.findIndex(h=>h.includes(0));g.phase='play';
  }
 }else if(m.type==='next'&&g.phase==='summary'&&seat===0){
  deal(g);
 }else if(m.type==='play'&&g.phase==='play'&&g.turn===seat&&m.rev===g.rev&&legal(g,seat).includes(m.card)){
  g.hands[seat]=g.hands[seat].filter(c=>c!==m.card);
  g.trick.push({seat,card:m.card});
  if(suit(m.card)===2)g.broken=true;
  g.turn=(seat+1)%4;
  if(g.trick.length===4){
   const lead=suit(g.trick[0].card);
   const winner=g.trick.reduce((best,entry)=>suit(entry.card)===lead&&rank(entry.card)>rank(best.card)?entry:best).seat;
   g.taken[winner]+=g.trick.reduce((sum,e)=>sum+penalty(e.card),0);
   g.turn=winner;g.last=g.trick;g.trick=[];g.played++;
   if(g.played===13){
    const moon=g.taken.indexOf(26);g.moon=moon<0?null:moon;
    g.scores=g.scores.map((score,i)=>score+(moon<0?g.taken[i]:moon===i?0:26));
    const low=Math.min(...g.scores);
    g.winner=Math.max(...g.scores)>=100&&g.scores.filter(s=>s===low).length===1?g.scores.indexOf(low):null;
    g.phase=g.winner===null?'summary':'end';
   }
  }
 }else throw Error('That move is unavailable. Follow suit when you can.');
 g.rev++;
}
export function view(g,seat){
 return {...g,hands:g.hands.map((h,i)=>i===seat?h:[]),passes:g.passes.map(Boolean)};
}
const danger=c=>penalty(c)*4+rank(c)+(suit(c)===3&&rank(c)>10?24:0);
export function botMove(g,seat){
 if(g.phase==='pass')return {type:'pass',cards:[...g.hands[seat]].sort((a,b)=>danger(b)-danger(a)).slice(0,3)};
 const cards=legal(g,seat),lead=g.trick[0]?.card;
 if(lead===undefined)return {type:'play',card:[...cards].sort((a,b)=>rank(a)-rank(b))[0]};
 if(suit(cards[0])!==suit(lead))return {type:'play',card:[...cards].sort((a,b)=>danger(b)-danger(a))[0]};
 const high=Math.max(...g.trick.filter(e=>suit(e.card)===suit(lead)).map(e=>rank(e.card)));
 const under=cards.filter(c=>rank(c)<high).sort((a,b)=>rank(b)-rank(a));
 return {type:'play',card:under[0]??[...cards].sort((a,b)=>rank(a)-rank(b))[0]};
}
