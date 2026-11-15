export const games = {
  'what-changed': { title: 'What Changed?', detail: 'Study the shelf. Spot the swap.', instructions: 'The setter swaps one object. The other player gets five seconds to study the original shelf, then taps the spot that changed.' },
  'draw-together': { title: 'Draw Together', detail: 'One drawing. Six turns.', instructions: 'Take turns adding a stroke. Lift your finger to see it, then tap Add my stroke to send it. After six turns, name the drawing together.' },
  warmer: { title: 'Warmer', detail: 'Hide a dot. Follow the heat.', instructions: 'The setter hides a dot. The seeker gets six taps. The rings and distance hints guide you to it.' },
  'hide-a-dot': { title: 'Hide a Dot', detail: 'Five taps to find it.', instructions: 'The setter hides a dot anywhere on the board. The seeker gets five taps to uncover it.' },
};

export const objects = ['🍋','🧃','🎲','🪁','🧦','🍄','🪴','🎨','🧩','🧸','🔑','🍿','🕶️','🎸','🌵','🧁','🍓','🌙'];
export const limit = kind => kind === 'warmer' ? 6 : 5;
const integer = (n,max) => Number.isInteger(n) && n >= 0 && n < max;
const pick = list => list[Math.floor(Math.random() * list.length)];

export function newRound(kind, round = 1) {
  const setter = (round - 1) % 2;
  const state = { kind, round, setter, turn:setter, rev:0, phase:'set' };
  if (kind === 'draw-together') return { ...state, phase:'draw', strokes:[] };
  if (kind !== 'what-changed') return { ...state, marks:[] };
  const available = objects.slice();
  const shelf = Array.from({length:6}, () => available.splice(Math.floor(Math.random()*available.length),1)[0]);
  return { ...state, shelf };
}

function validStroke(points) {
  return Array.isArray(points) && points.length >= 1 && points.length <= 300 &&
    points.every(p => Array.isArray(p) && p.length === 2 && p.every(n => Number.isFinite(n) && n >= 0 && n <= 1));
}

export function move(state, seat, action) {
  if (action.rev !== state.rev || action.round !== state.round || seat !== state.turn) return false;
  const { kind, phase } = state;
  const cell = action.cell;
  if (phase === 'draw' && action.type === 'stroke' && validStroke(action.points)) {
    state.strokes.push({ seat, points:action.points });
    state.turn = 1-seat;
    if (state.strokes.length === 6) state.phase = 'done';
  } else if (kind === 'what-changed' && phase === 'set' && action.type === 'cell' && integer(cell,6)) {
    state.answer = cell;
    state.changed = state.shelf.slice();
    state.changed[cell] = pick(objects.filter(object => !state.shelf.includes(object)));
    state.phase = 'ready';
    state.turn = 1-seat;
  } else if (phase === 'ready' && action.type === 'study') {
    state.phase = 'study';
  } else if (phase === 'study' && action.type === 'recall') {
    state.phase = 'guess';
  } else if (kind === 'what-changed' && phase === 'guess' && action.type === 'cell' && integer(cell,6)) {
    state.guess = cell;
    state.won = cell === state.answer;
    state.phase = 'done';
  } else if (kind !== 'what-changed' && phase === 'set' && action.type === 'cell' && integer(cell,49)) {
    state.answer = cell;
    state.phase = 'guess';
    state.turn = 1-seat;
  } else if (phase === 'guess' && action.type === 'cell' && integer(cell,49) && !state.marks.some(item=>item.cell===cell)) {
    const dx = cell%7 - state.answer%7;
    const dy = Math.floor(cell/7) - Math.floor(state.answer/7);
    const distance = Math.hypot(dx,dy);
    const heat = kind !== 'warmer' ? 'miss' : distance <= 1.5 ? 'hot' : distance <= 3 ? 'warm' : 'cold';
    state.marks.push({ cell, heat });
    state.won = cell === state.answer;
    if (state.won || state.marks.length >= limit(kind)) state.phase = 'done';
  } else {
    return false;
  }
  state.rev++;
  return true;
}

export function view(state, seat) {
  const {answer, shelf, changed, ...visible} = state;
  if (state.phase === 'done' || seat === state.setter) visible.answer = answer;
  if (state.kind === 'what-changed') {
    if (state.phase === 'done') {
      visible.shelf = changed;
      visible.original = shelf[answer];
    } else if (state.phase === 'guess') {
      visible.shelf = changed;
    } else if (state.phase === 'study' || (state.phase === 'set' && seat === state.setter)) {
      visible.shelf = shelf;
    }
  }
  return visible;
}
