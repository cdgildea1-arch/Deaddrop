export const rank = c => c % 13 + 1;
export const legal = (a,b) => { const d=Math.abs(rank(a)-rank(b)); return d===1 || d===12; };
export function shuffle(a, random=Math.random){ for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; }
export function deal(names, humans=1, random=Math.random){
  const deck=()=>shuffle(Array.from({length:52},(_,i)=>i),random);
  return {id:crypto.randomUUID(),rev:0,players:names.map((name,i)=>{const d=deck().slice(0,20);return {name,bot:i>=humans,hand:d.splice(0,5),stock:d,played:0};}),piles:deck().slice(0,names.length>2?4:2),winner:null,flips:0};
}
export function move(g,seat,card,pile,expected){
  const p=g.players[seat];
  if(g.winner!==null || !p || !Number.isInteger(pile) || pile<0 || pile>=g.piles.length || g.piles[pile]!==expected) return false;
  const i=p.hand.indexOf(card); if(i<0 || !legal(card,g.piles[pile])) return false;
  p.hand.splice(i,1);g.piles[pile]=card;p.played++; if(p.stock.length)p.hand.splice(i,0,p.stock.pop());
  if(!p.hand.length && !p.stock.length)g.winner=seat;
  g.rev++;return true;
}
export function available(g,seat){const p=g.players[seat];for(const c of p.hand)for(let i=0;i<g.piles.length;i++)if(legal(c,g.piles[i]))return {card:c,pile:i,expected:g.piles[i]};return null;}
export const stuck = g => g.winner===null && g.players.every((_,i)=>!available(g,i));
export function flip(g,random=Math.random){
  if(!stuck(g))return false;
  // A fresh center deal always offers at least one remaining card a legal move.
  g.piles=g.piles.map(()=>Math.floor(random()*52));
  const p=g.players.find(p=>p.hand.length), c=p.hand[Math.floor(random()*p.hand.length)];
  g.piles[0]=Math.floor(random()*4)*13+(rank(c)%13);
  g.flips++;g.rev++;return true;
}
export function view(g,seat){return {...g,players:g.players.map((p,i)=>({name:p.name,bot:p.bot,played:p.played,count:p.hand.length+p.stock.length,hand:i===seat?p.hand:[],stockCount:p.stock.length}))};}
