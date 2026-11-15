export const colors=['red','yellow','green','blue'];
export const labels={skip:'Skip',reverse:'Reverse',two:'Draw Two',wild:'Wild',four:'Wild Draw Four',swap:'Wild Swap Hands',party:'Wild Everyone Draws'};
const makeDeck=extras=>{
 const cards=[];
 const add=(color,value,count)=>{for(let i=0;i<count;i++)cards.push({id:cards.length,color,value});};
 for(const color of colors){
  add(color,'0',1);
  for(let i=1;i<=9;i++)add(color,String(i),2);
  for(const type of ['skip','reverse','two'])add(color,type,2);
 }
 add(null,'wild',4);add(null,'four',4);
 if(extras){add(null,'swap',2);add(null,'party',2);}
 return cards;
};
function shuffle(cards){
 for(let i=cards.length-1;i>0;i--){
  const j=Math.floor(Math.random()*(i+1));[cards[i],cards[j]]=[cards[j],cards[i]];
 }
 return cards;
}
export function newGame(names,humans,extras){
 const deck=shuffle(makeDeck(extras));
 const hands=names.map(()=>deck.splice(0,7));
 const top=deck.splice(deck.findIndex(c=>/^\d$/.test(c.value)),1)[0];
 return {id:crypto.randomUUID(),rev:0,names,humans,extras,hands,deck,pile:[top],top,color:top.color,turn:Math.floor(Math.random()*names.length),direction:1,drawn:null,winner:null,called:false,last:'Match the color or number to begin.'};
}
export function legal(g,seat,c){
 return !!c&&(g.drawn===null||c.id===g.drawn)&&(
  c.color?c.color===g.color||c.value===g.top.value:
  c.value!=='four'||!g.hands[seat].some(card=>card.color===g.color)
 );
}
function draw(g,seat,count){
 let card=null;
 for(let i=0;i<count;i++){
  if(!g.deck.length&&g.pile.length>1)g.deck=shuffle(g.pile.splice(0,g.pile.length-1));
  if(!g.deck.length)break;
  card=g.deck.pop();g.hands[seat].push(card);
 }
 return card;
}
const next=(g,seat,steps=1)=>(seat+steps*g.direction+g.hands.length*2)%g.hands.length;
function advance(g,seat){g.turn=seat;g.drawn=null;g.called=false;}
export function action(g,seat,m){
 if(m.id!==g.id||m.rev!==g.rev||g.turn!==seat||g.winner!==null)throw Error('Wait for your turn.');
 const hand=g.hands[seat],name=g.names[seat];
 if(m.type==='call'){
  if(hand.length!==2||g.called)throw Error('Call UNO with two cards before your play.');
  g.called=true;g.last=name+' calls UNO!';
 }else if(m.type==='draw'&&g.drawn===null){
  const c=draw(g,seat,1);
  g.last=name+(c?' drew a card.':' passed. The draw pile is empty.');
  if(c&&legal(g,seat,c))g.drawn=c.id;else advance(g,next(g,seat));
 }else if(m.type==='pass'&&g.drawn!==null){
  g.last=name+' passed.';advance(g,next(g,seat));
 }else if(m.type==='play'){
  const c=hand.find(card=>card.id===m.card);
  if(!legal(g,seat,c))throw Error('Choose a matching card. Draw Four requires no card of the active color.');
  if(!c.color&&!colors.includes(m.color))throw Error('Choose the next color.');
  if(c.value==='swap'&&hand.length>1&&(!Number.isInteger(m.target)||!g.hands[m.target]||m.target===seat))throw Error('Choose someone to swap with.');
  hand.splice(hand.indexOf(c),1);
  g.pile.push(c);g.top=c;g.color=c.color||m.color;
  g.last=name+' played '+(labels[c.value]||c.value)+'.';
  let steps=1;
  if(c.value==='reverse'){g.direction*=-1;g.last+=' Direction reversed.';}
  if(c.value==='skip'){g.last+=' '+g.names[next(g,seat)]+' is skipped.';steps=2;}
  if(c.value==='two'||c.value==='four'){
   const count=c.value==='two'?2:4,target=next(g,seat);
   draw(g,target,count);g.last+=' '+g.names[target]+' draws '+count+' and is skipped.';steps=2;
  }
  if(c.value==='party'){
   for(let i=0;i<g.hands.length;i++)if(i!==seat)draw(g,i,1);
   g.last+=' Everyone else draws one.';
  }
  if(!hand.length)g.winner=seat;
  else{
   if(c.value==='swap'){
    [g.hands[seat],g.hands[m.target]]=[g.hands[m.target],hand];
    g.last+=' Hands swapped with '+g.names[m.target]+'.';
   }else if(hand.length===1&&!g.called){
    draw(g,seat,2);g.last+=' Missed UNO: draw two.';
   }
   advance(g,next(g,seat,steps));
  }
 }else throw Error('That move is unavailable.');
 g.rev++;
}
export function view(g,seat){
 const {deck,pile,hands,...publicState}=g;
 return {...publicState,deckCount:deck.length,hands:hands.map((hand,i)=>i===seat?hand:[]),counts:hands.map(h=>h.length),drawn:g.turn===seat?g.drawn:null};
}
export function botMove(g,seat){
 const hand=g.hands[seat],options=hand.filter(c=>legal(g,seat,c));
 if(!options.length)return {type:g.drawn===null?'draw':'pass'};
 if(hand.length===2&&!g.called)return {type:'call'};
 const target=g.hands.map((h,i)=>({count:h.length,i})).filter(p=>p.i!==seat).sort((a,b)=>a.count-b.count)[0];
 const weight=c=>c.value==='swap'?(target.count<hand.length-1?8:-6):c.color?(labels[c.value]?5:3):2;
 const selected=options.sort((a,b)=>weight(b)-weight(a))[0];
 const color=colors.map(c=>[c,hand.filter(card=>card.color===c&&card!==selected).length]).sort((a,b)=>b[1]-a[1])[0][0];
 return {type:'play',card:selected.id,color,target:target.i};
}
