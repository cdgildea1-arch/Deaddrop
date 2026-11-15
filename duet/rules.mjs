const WORDS='ANCHOR APRICOT ARCH ARROW ATLAS AURORA AXE BADGE BALLOON BAMBOO BANJO BARREL BAT BEACH BEACON BEAR BELL BERRY BICYCLE BIRCH BLADE BLANKET BOAT BOOT BOTTLE BOW BRANCH BRASS BRIDGE BRUSH BUCKET BUTTON CABIN CACTUS CAMERA CANARY CANDLE CANOE CANYON CAPE CARPET CARROT CASTLE CEDAR CHALK CHESS CHERRY CIRCLE CLOUD CLOVER COAST COIN COMET COMPASS CONE CORAL CORK CRAB CRANE CROWN CRYSTAL CUBE CURTAIN DAISY DIAMOND DICE DISH DOLPHIN DRAGON DRUM DUNE EAGLE EARTH ECHO EGG ELBOW EMBER ENGINE FALCON FEATHER FENCE FERN FIELD FIRE FISH FLAG FLAME FLASK FLUTE FOREST FORK FOSSIL FOX FRAME FROG FROST FRUIT GARDEN GATE GEYSER GHOST GINGER GLASS GLOBE GLOVE GOLD GOOSE GRAPE GUITAR HAMMER HARBOR HARP HAT HAWK HAZEL HELMET HERON HILL HONEY HOOK HORSE ICE ISLAND IVY JACKET JADE JAR JAZZ JELLY JEWEL JUNGLE KEY KITE KNIFE LAGOON LAMP LANTERN LEAF LEMON LENS LILAC LIME LION LOCK LODGE LOTUS MAGNET MAP MARBLE MASK MEADOW MINT MIRROR MOON MOSS MOTH MOUNTAIN MUG NEEDLE NEST NET NIGHT NORTH OAK OAR OCEAN OLIVE ONION OPAL ORBIT OTTER OWL PAINT PALM PANDA PAPER PEACH PEAR PEARL PEN PENGUIN PEPPER PIANO PICKLE PILLOW PINE PLANET PLATE PLUM POND POPPY PORT POTATO PRISM PUDDLE PUMPKIN QUARTZ QUEEN QUILT RABBIT RACCOON RAFT RAIN RAVEN REEF RIBBON RING RIVER ROBIN ROCKET ROPE ROSE SADDLE SAIL SALT SAND SATURN SCARF SEAL SEED SHELL SHIP SHOE SHOVEL SILK SILVER SKATE SNAIL SNOW SOCK SPARK SPIDER SPOON SPRING STAR STONE STORM STRAW SUGAR SUN SWORD TABLE TEA TEMPLE THIMBLE THORN THREAD TIGER TOAST TOMATO TORCH TOWER TRAIN TRAY TREE TULIP TUNNEL TURTLE VALLEY VASE VELVET VIOLA VIOLET WALNUT WAVE WELL WHEAT WHISTLE WILLOW WIND WOLF WOOD YARN ZEBRA'.split(' ');
function shuffled(items){
 const a=[...items];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;
}
export function newGame(names,turns=9){
 // Each side has 9 agents, 3 assassins and 13 bystanders. Three agents overlap.
 const pairs=shuffled([
 ...Array(3).fill('AA'),...Array(5).fill('AN'),...Array(5).fill('NA'),
 'AX','XA','XX','XN','NX',...Array(7).fill('NN')
 ]);
 return {id:crypto.randomUUID(),rev:0,names,words:shuffled(WORDS).slice(0,25),keys:[pairs.map(p=>p[0]),pairs.map(p=>p[1])],found:[],misses:[[],[]],turns,giver:0,clue:null,guesses:0,phase:'clue',outcome:null,history:[]};
}
function finished(g,side){return g.keys[side].every((type,i)=>type!=='A'||g.found.includes(i));}
function endTurn(g){
 g.turns--;
 if(g.turns===0){g.phase='final';return}
 if(!finished(g,1-g.giver))g.giver=1-g.giver;
 g.phase='clue';g.clue=null;g.guesses=0;
}
export function action(g,seat,m){
 if(g.id!==m.id||g.rev!==m.rev||g.outcome)throw Error('The board changed. Try again.');
 if(m.type==='clue'&&g.phase==='clue'&&seat===g.giver){
  const clue=typeof m.clue==='string'?m.clue.trim():'';
  if(!/^\p{L}+$/u.test(clue)||clue.length>32||g.words.some((w,i)=>!g.found.includes(i)&&w===clue.toUpperCase())||!Number.isInteger(m.count)||m.count<1||m.count>9)throw Error('Use one word outside the board and a number from 1 to 9.');
  g.clue={word:clue,count:m.count};g.guesses=0;g.phase='guess';g.history.push(g.names[seat]+': '+clue+' '+m.count);
 }else if(m.type==='stop'&&g.phase==='guess'&&seat===1-g.giver&&g.guesses>0){endTurn(g);
 }else if(m.type==='guess'&&(g.phase==='final'||g.phase==='guess'&&seat===1-g.giver)){
  const i=m.index,side=1-seat;
  if(!Number.isInteger(i)||!g.words[i]||g.found.includes(i)||g.misses[seat].includes(i)||finished(g,side))throw Error('Choose an unrevealed word for your side.');
  const type=g.keys[side][i];
  g.history.push(g.names[seat]+' picked '+g.words[i]+' · '+({A:'Agent',N:'Bystander',X:'Assassin'})[type]);
  if(type==='X'||type==='N'&&g.phase==='final')g.outcome='lost';
  else if(type==='N'){g.misses[seat].push(i);endTurn(g);}
  else{
   g.found.push(i);g.guesses++;
   if(g.found.length===15)g.outcome='won';
   else if(g.phase==='guess'&&finished(g,side))endTurn(g);
  }
 }else throw Error('That move is unavailable.');
 g.rev++;
}
export function view(g,seat){
 const {keys,...state}=g;
 return {...state,key:keys[seat],canGuess:!finished(g,1-seat)};
}
