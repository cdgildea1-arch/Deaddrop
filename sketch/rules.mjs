const words = ('backpack balloon banana bicycle butterfly cactus castle cat cloud cupcake dinosaur dolphin donut dragon drum elephant firetruck flamingo frog garlic ghost giraffe guitar hammer hamburger hat helicopter igloo jellyfish key kite ladder lantern lion lighthouse mermaid moon mushroom octopus owl panda pancake penguin piano pineapple pizza popcorn pumpkin rainbow robot rocket sailboat sandwich scarecrow shark skateboarding skeleton snowman soccer spider squirrel star strawberry submarine sunglasses taco telescope tent toaster toothbrush tornado train treasure turtle umbrella unicorn violin volcano waffle watermelon whale windmill wizard').split(' ');
export const ink = ['#231d2b','#d73558','#f08828','#338657','#286ac0','#8844bc','#fffaf3'];
export const duration = 60000;
export function round(number, scores, used = []) {
  const options = words.filter(word=>!used.includes(word));
  const choices = Array.from({length:3},()=>options.splice(Math.floor(Math.random()*options.length),1)[0]);
  return {number,drawer:(number-1)%2,scores:[...scores],used:[...used,...choices],choices,phase:'pick',word:'',end:0,lines:[],guesses:[],result:null,rev:0};
}
export function publicView(state, seat) {
  const {word, choices, used, ...visible}=state;
  if(state.phase==='result'||seat===state.drawer)visible.word=word;
  if(state.phase==='pick'&&seat===state.drawer)visible.choices=choices;
  if(word)visible.hint = '_ '.repeat(word.length).trim();
  return visible;
}
export function validLine(line) {
  return line && ink.includes(line.color) && Array.isArray(line.points) && line.points.length>0 && line.points.length<=200 &&
    line.points.every(pair=>Array.isArray(pair)&&pair.length===2&&pair.every(n=>Number.isFinite(n)&&n>=0&&n<=1));
}
export function act(state,seat,action,now=Date.now()) {
  if(action.number!==state.number)return false;
  if (state.phase==='pick' && seat===state.drawer && action.type==='pick' && state.choices.includes(action.word)){
    state.word=action.word;
    state.phase='draw';
    state.end=now+duration;
  } else if(state.phase==='draw'&&now>=state.end){
    state.phase='result';
    state.result='Time’s up';
  } else if(state.phase==='draw'&&seat===state.drawer&&action.type==='line'&&state.lines.length<75&&validLine(action.line)){
    state.lines.push(action.line);
  } else if(state.phase==='draw'&&seat===state.drawer&&action.type==='undo'){
    if(!state.lines.length)return false;
    state.lines.pop();
  } else if(state.phase==='draw'&&seat===state.drawer&&action.type==='clear'){
    if(!state.lines.length)return false;
    state.lines=[];
  } else if(state.phase==='draw'&&seat!==state.drawer&&action.type==='guess'&&typeof action.text==='string'){
    const text=action.text.trim().slice(0,40);
    if(!text)return false;
    if(text.toLowerCase().replace(/[^a-z]/g,'')===state.word){
      state.phase='result';
      state.result='Correct!';
      state.scores[seat]+=100+Math.ceil((state.end-now)/1000);
      state.scores[state.drawer]+=50;
    }else{
      state.guesses=[...state.guesses,text].slice(-3);
    }
  }else return false;
  state.rev++;
  return true;
}
