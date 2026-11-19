// Butterflies: a two-player question game that gets a little deeper each level.
// Two kinds of cards:
//  · "Read my mind": one of you (the mystery) answers about yourself, the other guesses. A match fills the jar with 3 🦋.
//  · "Open up": you both answer the same question, then see each other's answers together.
// After every reveal each of you can send a 🦋 for an answer that got you, which adds one more.
// It ends with a love note from each of you. The server (your-move-games) runs these same rules,
// so neither phone sees the other's answer until you've both answered.

// Two decks share these rules: Sweet (the Butterflies game) and After Dark (its own game on the home screen).
const sweetLevels = ['', 'First Flutter', 'Getting Closer', 'Head Over Heels', 'Love Note'];

// {you} {you:o} {your} {You} {Your} become "you/your" for the mystery and he/him/his or she/her/her for the guesser.
const sweetMind = {
 1: [
  ['{Your} perfect lazy Sunday starts with…', ['Sleeping in way too late', 'A big breakfast', 'Coffee and quiet', 'Getting out of the house early']],
  ['If {you} could eat one meal forever, which one?', ['Tacos', 'Pizza', 'Burgers', 'Pasta']],
  ['Where would {you} rather wake up tomorrow?', ['A cabin in the mountains', 'A beach house', 'A fancy city hotel', 'Right where I am']],
  ['Which superpower would {you} pick?', ['Flying', 'Teleporting', 'Reading minds', 'Pausing time']],
  ['{Your} ideal date night:', ['Dinner out somewhere nice', 'Takeout and a movie at home', 'Something active or adventurous', 'A long drive with no plan']],
  ['Pick {your} dream vacation:', ['Beach and do nothing', 'Explore a new city', 'Mountains and hiking', 'A road trip']],
  ['Which surprise would {you} love most?', ['A handwritten note', 'My favorite snack', 'A planned day out', 'A night off from everything']],
  ['If {you} won $10,000 tomorrow, first move?', ['Save it', 'Book a trip', 'Pay something off', 'Splurge on something fun']],
  ['Which season is most like {you:o}?', ['Spring', 'Summer', 'Fall', 'Winter']],
  ['{Your} karaoke move:', ['Belt a power ballad', 'A duet, obviously', 'Something funny', 'Absolutely not singing']],
  ['Pick {your} late-night snack:', ['Something sweet', 'Chips', 'Leftovers', 'Cereal']],
  ['{You} would rather have…', ['A really clean house', 'A really good meal', 'A really long nap', 'A really fun night out']],
 ],
 2: [
  ['After a hard day, what helps {you:o} most?', ['Talking it out', 'Quiet time alone', 'A distraction', 'A hug and no questions']],
  ['How would {you} most like to be shown love?', ['Kind words', 'Time together', 'Help with stuff', 'Hugs and closeness']],
  ['In an argument, {you} usually…', ['Need space first', 'Want to fix it right now', 'Go quiet', 'Crack a joke']],
  ['Which compliment would mean the most to {you:o}?', ['You make me laugh', 'I trust you completely', 'You’re so attractive', 'You’re so good at what you do']],
  ['Secretly, {your} proudest thing is…', ['How hard I work', 'How I treat people', 'Something I made or built', 'How far I’ve come']],
  ['{Your} way of saying sorry usually looks like…', ['Saying it out loud', 'Doing something nice', 'A long talk', 'A little treat']],
  ['Where would {you} rather spend an anniversary?', ['Somewhere fancy', 'Somewhere we’ve been before', 'Somewhere brand new', 'At home, just us']],
  ['What would {you} miss most if {you} moved far away?', ['The people', 'The food', 'The routine', 'The house']],
  ['{Your} biggest pet peeve:', ['Being late', 'Not being listened to', 'Messiness', 'Phones at dinner']],
  ['What recharges {you:o} fastest?', ['Sleep', 'Being outside', 'Time with people', 'Time alone']],
 ],
 3: [
  ['What makes {you:o} feel most loved?', ['Being chosen first', 'Being really listened to', 'Being taken care of', 'Being wanted']],
  ['What could {you} use more of right now?', ['Rest', 'Adventure', 'Reassurance', 'Fun']],
  ['{Your} biggest dream for the future is mostly about…', ['Family', 'Freedom', 'Building something', 'Peace and quiet']],
  ['Picture growing old together. {You}’d most hope for…', ['A porch and slow mornings', 'Traveling everywhere', 'A full, loud house', 'Still chasing something new']],
  ['Which would {you} love to hear more often?', ['I’m proud of you', 'I’ve got you', 'I want you', 'I’m sorry']],
  ['The scariest part of love for {you:o}:', ['Losing it', 'Getting hurt', 'Not being enough', 'Letting someone all the way in']],
  ['If {you} could relive one kind of moment with us, it’d be…', ['The very beginning', 'A trip we took', 'An ordinary night in', 'A big milestone']],
  ['What brings {you:o} closest to me?', ['Laughing', 'Talking late at night', 'Doing nothing together', 'Getting through something hard']],
 ],
};

const sweetOpen = {
 1: [
  'What’s a small thing that instantly makes your day better?',
  'What’s your most unpopular food opinion?',
  'What song plays when you walk into a room in the movie of your life?',
  'What were you obsessed with as a kid?',
  'What’s the best meal you’ve ever had?',
  'If you could master one skill overnight, what would it be?',
  'What’s a hill you would happily die on?',
  'What’s something that makes you laugh every single time?',
  'Describe your perfect day off in three words.',
  'What smell takes you right back to somewhere?',
 ],
 2: [
  'What’s something you noticed about me early on that you still love?',
  'What’s a habit of mine that’s secretly cute?',
  'What’s a memory of us you replay sometimes?',
  'What’s something small you’ve never told me?',
  'What do you wish people understood about you without having to explain?',
  'What’s one thing we should do together this year?',
  'What’s the nicest thing anyone has ever done for you?',
  'What part of your day do you look forward to most?',
  'When did you last feel really proud of yourself?',
  'What’s something you’re working on in yourself right now?',
 ],
 3: [
  'When did you first know you were falling for me?',
  'What do you love about us that you don’t say enough?',
  'When did you feel really seen by me?',
  'What do you hope we’re doing ten years from now?',
  'What’s something you’ve been afraid to ask me for?',
  'How have I changed you?',
  'What’s a promise you want to make me?',
  'What do I do that makes you feel safe?',
  'What’s your favorite version of me?',
  'If you could go back to our first date, what would you tell yourself?',
 ],
};

const sweetNotes = [
 'Finish this: I fell for you because…',
 'Finish this: The moment I knew was…',
 'Finish this: My favorite thing about loving you is…',
];

const darkLevels = ['', 'Warming Up', 'Getting Hot', 'No Limits', 'Tonight'];
const darkMind = {
 1: [
  ['Where do {you} want my mouth first?', ['Neck', 'Lips', 'Chest', 'Lower']],
  ['{Your} favorite thing to sleep in:', ['Nothing', 'Something tiny', 'Your shirt and nothing else', 'Pajamas (for now)']],
  ['What turns {you:o} on fastest?', ['A deep kiss', 'Hands on my hips', 'Dirty talk in my ear', 'Being pinned down']],
  ['Best time for sex, according to {you:o}?', ['Morning', 'Middle of the day', 'Late night', 'Right now']],
  ['Lights on or off for {you:o}?', ['On. I want to see everything', 'Off', 'Candles', 'Don’t care']],
  ['Which would {you} rather do tonight?', ['Shower sex', 'An oil massage that turns into sex', 'Watch porn together', 'Skip straight to bed']],
  ['{Your} biggest weakness:', ['Neck kisses', 'Being teased', 'Being told what to do', 'Hearing how bad you want me']],
  ['Quickie or all night, for {you:o}?', ['Quickie', 'All night', 'Quickie now, all night later', 'Whatever you start']],
 ],
 2: [
  ['{Your} pace:', ['Slow and teasing', 'Fast and rough', 'Slow, then all at once', 'Depends on the mood']],
  ['Who should be on top, according to {you:o}?', ['Me', 'You', 'Switch halfway', 'Neither. Bent over']],
  ['Where would {you} most want sex besides the bed?', ['The shower', 'The car', 'The kitchen counter', 'Somewhere we could get caught']],
  ['What would {you} love to hear during sex?', ['My name', 'How good it feels', 'What you’re going to do next', '“Don’t stop”']],
  ['Pick {your} tease:', ['A dirty text at work', 'A nude', 'A whisper in public', 'A hand under the table']],
  ['Which would {you} try first?', ['A blindfold', 'Handcuffs', 'A vibrator together', 'Ice and wax']],
  ['{You} like it more when I’m…', ['Gentle', 'Rough', 'In charge', 'Begging']],
  ['{Your} favorite thing to give:', ['Oral', 'A long massage', 'Hickeys', 'Orgasms, plural']],
  ['{Your} volume level:', ['Silent', 'A little', 'Loud', 'The neighbors know']],
 ],
 3: [
  ['In bed, {you}’re more of a…', ['Dom', 'Sub', 'Switch', 'Let’s find out']],
  ['{Your} biggest fantasy involves…', ['Role play', 'Being tied up', 'Tying you up', 'Getting caught']],
  ['How many rounds is {your} perfect night?', ['One, done right', 'Two', 'Three', 'Lost count']],
  ['What would {you} most want control over?', ['The pace', 'When you’re allowed to finish', 'What you wear (or don’t)', 'Everything']],
  ['Pick {your} kink to explore:', ['Spanking', 'Hair pulling', 'Orgasm denial', 'Being watched']],
  ['What would make {you:o} blush the hardest?', ['Saying my fantasy out loud', 'Being watched', 'Being told exactly what you’ll do', 'Getting caught']],
  ['Afterward, {you} want…', ['To cuddle', 'Round two', 'Food', 'Sleep']],
  ['What would {you} say yes to tonight?', ['Something new', 'Somewhere new', 'Going all night', 'Anything you ask']],
 ],
};
const darkOpen = {
 1: [
  'What do I wear that makes you want to rip it off me?',
  'What’s the first thing you’d do if I walked in naked right now?',
  'What song would you want playing during sex?',
  'What’s a touch from me that turns you on instantly?',
  'From 1 to 10, how badly do you want me right now? Why?',
  'What would you text me to get me home early and into bed?',
  'Where’s the most random place you’ve pictured me naked?',
  'What’s your favorite thing I do with my mouth?',
 ],
 2: [
  'What memory of us do you think about when you touch yourself?',
  'What do you want me to do to you more often?',
  'Walk me through your perfect night of sex with me, start to finish.',
  'What have you wanted to try in bed but never asked for?',
  'Where’s the riskiest place you’d want to have me?',
  'What part of my body do you think about the most?',
  'What dirty thing should I whisper to you next time?',
  'Write the text you’d send if you wanted me right now.',
 ],
 3: [
  'What’s a fantasy you’ve never said out loud?',
  'Tell me exactly what you want me to do to you tonight.',
  'What’s the hottest sex we’ve ever had, and what made it so good?',
  'If I tied you up tonight, what would you want me to do?',
  'What’s a kink you’re curious about that might surprise me?',
  'What’s a hard limit for you, and what’s a maybe?',
  'What should our safe word be?',
  'Describe what you’d do to me if I were next to you right now.',
  'Tell me exactly how you like to be touched.',
 ],
};
const darkNotes = [
 'Finish this: Tonight I want you to…',
 'Finish this: The thing I can’t stop thinking about doing to you is…',
 'Finish this: Next time we’re alone, I’m going to…',
];

export const decks = {
 sweet: { name: 'Sweet', levels: sweetLevels, mind: sweetMind, open: sweetOpen, notes: sweetNotes },
 dark: { name: 'After Dark', levels: darkLevels, mind: darkMind, open: darkOpen, notes: darkNotes },
};
const deckOf = g => decks[g?.deck] || decks.sweet;
export const levels = g => deckOf(g).levels;

// The shape of one game: three cards per level, then the love note.
export const plan = [['mind', 1], ['open', 1], ['mind', 1], ['open', 2], ['mind', 2], ['open', 2], ['mind', 3], ['open', 3], ['open', 3], ['note', 4]];
export const MATCH = 3;
export const maxJar = plan.filter(([k]) => k === 'mind').length * MATCH + plan.length * 2;

const pool = (kind, level, deck = 'sweet') => { const d = decks[deck] || decks.sweet; return kind === 'mind' ? d.mind[level] : kind === 'open' ? d.open[level] : d.notes; };

// Question text for one seat. The guesser sees "he/him/his" or "she/her/her" (their partner) instead of "you".
export const pronouns = { him: { s: 'he', o: 'him', p: 'his' }, her: { s: 'she', o: 'her', p: 'her' } };
const cap = w => w[0].toUpperCase() + w.slice(1);
export function ask(card, mystery, seat, partner = 'her', deck = 'sweet') {
 if (card.kind !== 'mind') return pool(card.kind, card.level, deck)[card.i];
 const [q, options] = pool('mind', card.level, deck)[card.i];
 const self = seat === mystery, P = pronouns[partner] || pronouns.her;
 const fill = s => s.replace(/\{(you|your|You|Your)(:o)?\}/g, (_, w, o) => {
  if (self) return w;
  const word = w.toLowerCase() === 'your' ? P.p : o ? P.o : P.s;
  return w[0] === 'Y' ? cap(word) : word;
 });
 return [fill(q), options];
}

function deal(g) {
 const [kind, level] = plan[g.round - 1];
 const all = pool(kind, level, g.deck).map((_, i) => i), key = i => kind + level + ':' + i;
 let left = all.filter(i => !g.used.includes(key(i)));
 if (!left.length) { g.used = g.used.filter(k => !k.startsWith(kind + level + ':')); left = all; }
 const i = left[Math.floor(Math.random() * left.length)];
 g.used.push(key(i));
 g.card = { kind, level, i };
 g.answers = [null, null]; g.ready = [false, false]; g.hearts = [false, false]; g.phase = 'answer';
}

export function newGame(names, deck = 'sweet') {
 const g = { id: crypto.randomUUID(), rev: 0, names, deck: decks[deck] ? deck : 'sweet', round: 1, rounds: plan.length, mystery: Math.floor(Math.random() * 2),
  used: [], swaps: 2, jar: 0, history: [], phase: 'answer' };
 deal(g);
 return g;
}

export function action(g, seat, m) {
 // Answers and "next" only need to be for the current question, so you can both answer at the same moment.
 const stale = m.type === 'swap' ? m.rev !== g.rev : m.round !== g.round || (m.type === 'answer' && m.ci !== g.card?.kind + g.card?.i);
 if (m.id !== g.id || stale || g.phase === 'end' || (seat !== 0 && seat !== 1)) throw Error('The question changed. Take another look.');
 if (m.type === 'swap' && g.phase === 'answer') {
  if (g.answers.some(a => a !== null)) throw Error('Someone already answered this one.');
  if (g.swaps < 1) throw Error('No more swaps this game.');
  g.swaps--; deal(g);
 } else if (m.type === 'answer' && g.phase === 'answer' && g.answers[seat] === null) {
  if (g.card.kind === 'mind') {
   if (!Number.isInteger(m.pick) || m.pick < 0 || m.pick > 3) throw Error('Pick one of the four answers.');
   g.answers[seat] = m.pick;
  } else {
   const text = typeof m.text === 'string' ? m.text.trim().replace(/[ \t]+/g, ' ') : '';
   if (!text || text.length > 400) throw Error('Write an answer, up to 400 characters.');
   g.answers[seat] = text;
  }
  if (g.answers.every(a => a !== null)) {
   g.phase = 'reveal';
   g.match = g.card.kind === 'mind' && g.answers[0] === g.answers[1];
   if (g.match) g.jar += MATCH;
  }
 } else if (m.type === 'next' && g.phase === 'reveal' && !g.ready[seat]) {
  g.ready[seat] = true;
  if (m.heart === true) { g.hearts[seat] = true; g.jar++; }
  if (g.ready.every(Boolean)) {
   g.history.push({ round: g.round, card: g.card, mystery: g.mystery, answers: g.answers, match: !!g.match, hearts: g.hearts });
   g.match = false;
   if (g.round >= g.rounds) { g.phase = 'end'; g.card = null; }
   else { if (g.card.kind === 'mind') g.mystery = 1 - g.mystery; g.round++; deal(g); }
  }
 } else throw Error('That move is unavailable.');
 g.rev++;
}

// Your own answer is always yours to see; the other answer stays hidden until you've both answered.
export function view(g, seat) {
 const { used, ...rest } = g;
 const hide = g.phase === 'answer';
 return { ...rest, answers: hide ? g.answers.map((a, i) => i === seat ? a : null) : g.answers, answered: g.answers.map(a => a !== null), maxJar };
}

export const yourMove = (g, s) => g.phase === 'answer' ? g.answers[s] === null : g.phase === 'reveal' && !g.ready[s];
