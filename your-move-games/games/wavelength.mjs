// Wavelength: one player sees a hidden spot on a dial between two opposites and gives a clue;
// the other turns the dial to where they think the clue lands. You score together.
// The server (your-move-games) runs these same rules, so the target never reaches the guesser's phone.
export const spectrums = [
 ['Cold','Hot'],['Boring','Exciting'],['Cheap','Expensive'],['Useless','Useful'],['Quiet','Loud'],
 ['Easy to make','Hard to make'],['Overrated','Underrated'],['Bad gift','Great gift'],['Tiny','Huge'],['Healthy','Unhealthy'],
 ['Smells bad','Smells good'],['Scary','Comforting'],['Old-fashioned','Modern'],['Forgettable','Unforgettable'],['Rare','Common'],
 ['Soft','Hard'],['Sad song','Happy song'],['Weird','Normal'],['Bad habit','Good habit'],['Fancy','Casual'],
 ['Morning thing','Night thing'],['Indoor activity','Outdoor activity'],['Sweet','Savory'],['Relaxing','Stressful'],['Clean','Messy'],
 ['Slow','Fast'],['Light','Heavy'],['Funny','Serious'],['For kids','For adults'],['Bad movie','Great movie'],
 ['Smooth','Rough'],['Easy job','Hard job'],['Short-lived','Lasts forever'],['Hated food','Loved food'],['Simple','Complicated'],
 ['Dry','Wet'],['Dangerous','Safe'],['Ugly','Beautiful'],['Introvert thing','Extrovert thing'],['Cringe','Cool'],
 ['Unhelpful advice','Great advice'],['Low effort','High effort'],['Mild','Spicy'],['Small talk','Deep talk'],['Cheap date','Fancy date'],
 ['Worst chore','Best chore'],['Lazy Sunday','Busy Saturday'],['Guilty pleasure','Proud of it'],['Hard to say','Fun to say'],['Bad pet','Great pet'],
 ['Calm animal','Wild animal'],['Plain','Flashy'],['Dull superpower','Amazing superpower'],['Breakfast food','Dinner food'],['Underdressed','Overdressed'],
 ['Hated holiday','Favorite holiday'],['Bad smell','Good smell'],['Rarely used','Used daily'],['Bad first date','Great first date'],['Tastes bad','Tastes great'],
 ['Easy to forget','Hard to forget'],['Feels cheap','Feels luxurious'],['Not a sport','Definitely a sport'],['Not a sandwich','Definitely a sandwich'],['Bad vacation','Dream vacation'],
 ['Unromantic','Romantic'],['Gross','Delicious'],['Basic','Unique'],['Fragile','Indestructible'],['Annoying','Charming'],
 ['Mainstream','Niche'],['Bad song to sing','Great song to sing'],['Unknown','Famous'],['Hard to learn','Easy to learn'],['Bad invention','Great invention'],
 ['Silly','Wise'],['Painful','Pleasant'],['Short','Tall'],['Dark','Bright'],['Bad nickname','Great nickname'],
 ['Rude','Polite'],['Ordinary','Magical'],['Square','Round'],['Not worth it','Worth it'],['Messy eater food','Clean eater food'],
 ['Would never try','Would try today'],['Bad advice from a parent','Good advice from a parent'],['Ice cream flavor nobody wants','Best ice cream flavor'],['Small problem','Big problem'],['Normal pet name','Ridiculous pet name'],
];
export const ROUNDS = 8;
// How close the guess must be (on a 0 to 100 dial) for 4, 3 and 2 points.
export const bands = [[4, 4], [11, 3], [18, 2]];
export const points = distance => bands.find(([width]) => distance <= width)?.[1] ?? 0;

function deal(g) {
 let open = spectrums.map((_, i) => i).filter(i => !g.used.includes(i));
 if (!open.length) { g.used = []; open = spectrums.map((_, i) => i); }
 g.card = open[Math.floor(Math.random() * open.length)];
 g.used.push(g.card);
 g.target = 5 + Math.floor(Math.random() * 91);
 g.clue = null;
}
export function newGame(names, rounds = ROUNDS) {
 const g = { id: crypto.randomUUID(), rev: 0, names, rounds, round: 1, psychic: Math.floor(Math.random() * 2),
  phase: 'clue', used: [], card: 0, target: 0, clue: null, swaps: 2, score: 0, history: [] };
 deal(g);
 return g;
}
export function action(g, seat, m) {
 if (m.id !== g.id || m.rev !== g.rev || g.phase === 'end') throw Error('The dial moved. Take another look.');
 if (m.type === 'swap' && g.phase === 'clue' && seat === g.psychic) {
  if (g.swaps < 1) throw Error('No card swaps left this round.');
  g.swaps--; deal(g);
 } else if (m.type === 'clue' && g.phase === 'clue' && seat === g.psychic) {
  const clue = typeof m.clue === 'string' ? m.clue.trim().replace(/\s+/g, ' ') : '';
  if (!clue || clue.length > 60) throw Error('Give a clue of up to 60 characters.');
  g.clue = clue; g.phase = 'guess';
 } else if (m.type === 'guess' && g.phase === 'guess' && seat === 1 - g.psychic) {
  if (!Number.isInteger(m.value) || m.value < 0 || m.value > 100) throw Error('Turn the dial, then lock it in.');
  const earned = points(Math.abs(m.value - g.target));
  g.score += earned;
  g.history.push({ round: g.round, psychic: g.psychic, card: g.card, target: g.target, clue: g.clue, guess: m.value, points: earned });
  if (g.round >= g.rounds) { g.phase = 'end'; g.clue = null; }
  else { g.round++; g.psychic = 1 - g.psychic; g.swaps = 2; deal(g); g.phase = 'clue'; }
 } else throw Error('That move is unavailable.');
 g.rev++;
}
// Only the clue-giver sees where the target is, and only while it's still hidden.
export function view(g, seat) {
 const { used, target, ...rest } = g;
 return { ...rest, target: g.phase !== 'end' && seat === g.psychic ? target : null, maxScore: g.rounds * 4 };
}
