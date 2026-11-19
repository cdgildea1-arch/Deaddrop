// Butterflies: a two-player question game that gets a little deeper each level.
// Two kinds of cards:
//  · "Read my mind": one of you (the mystery) answers about yourself, the other guesses. A match fills the jar with 3 🦋.
//  · "Open up": you both answer the same question, then see each other's answers together.
// After every reveal each of you can send a 🦋 for an answer that got you, which adds one more.
// It ends with a love note from each of you. The server (your-move-games) runs these same rules,
// so neither phone sees the other's answer until you've both answered.

// Two decks share these rules: Sweet (the Butterflies game) and After Dark (its own game on the home screen).
const sweetLevels = ['', 'First Flutter', 'Getting Closer', 'Head Over Heels', 'Love Note'];

// Wording tokens, so every question reads right on BOTH phones:
//   {M.s} {M.o} {M.p}  the person the question is about (the "mystery" in Read my mind)
//   {G.s} {G.o} {G.p}  the person guessing
//   {P.s} {P.o} {P.p}  "the other person" in Open up and the note (always he/him/his or she/her/her)
// s = subject, o = object, p = possessive. A ^ capitalizes: {^M.p}.
// When a token points at the person reading it, it becomes you/you/your in a question and I/me/my in an answer choice.
// Otherwise it becomes he/him/his or she/her/her. Verbs after {M.s} or {G.s} always use would/could/'d so they fit both.
const sweetMind = {
 1: [
  ['What would {M.p} perfect lazy Sunday start with?', ['Sleeping in way too late', 'A big breakfast', 'Coffee and quiet', 'Getting out of the house early']],
  ['If {M.s} could eat one meal forever, what would it be?', ['Tacos', 'Pizza', 'Burgers', 'Pasta']],
  ['Where would {M.s} rather wake up tomorrow?', ['A cabin in the mountains', 'A beach house', 'A fancy city hotel', 'Right at home']],
  ['Which superpower would {M.s} pick?', ['Flying', 'Teleporting', 'Reading minds', 'Pausing time']],
  ['What’s {M.p} ideal date night?', ['Dinner out somewhere nice', 'Takeout and a movie at home', 'Something active or adventurous', 'A long drive with no plan']],
  ['What would {M.p} dream vacation be?', ['Beach and do nothing', 'Explore a new city', 'Mountains and hiking', 'A road trip']],
  ['Which surprise would {M.s} love most?', ['A handwritten note', 'A favorite snack', 'A planned day out', 'A night off from everything']],
  ['If {M.s} won $10,000 tomorrow, what would {M.s} do first?', ['Save it', 'Book a trip', 'Pay something off', 'Splurge on something fun']],
  ['Which season fits {M.o} best?', ['Spring', 'Summer', 'Fall', 'Winter']],
  ['What’s {M.p} karaoke move?', ['Belt a power ballad', 'A duet, obviously', 'Something funny', 'Absolutely not singing']],
  ['What’s {M.p} go-to late-night snack?', ['Something sweet', 'Chips', 'Leftovers', 'Cereal']],
  ['Which would {M.s} rather have?', ['A really clean house', 'A really good meal', 'A really long nap', 'A really fun night out']],
 ],
 2: [
  ['After a hard day, what helps {M.o} most?', ['Talking it out', 'Quiet time alone', 'A distraction', 'A hug and no questions']],
  ['How would {M.s} most like to be shown love?', ['Kind words', 'Time together', 'Help with stuff', 'Hugs and closeness']],
  ['In an argument, what would {M.s} usually do?', ['Need space first', 'Try to fix it right away', 'Go quiet', 'Crack a joke']],
  ['Which compliment would mean the most to {M.o}?', ['“You make me laugh”', '“I trust you completely”', '“You’re so attractive”', '“You’re so good at what you do”']],
  ['Secretly, what makes {M.o} proudest?', ['{^M.p} work ethic', '{^M.p} kindness', 'Something {M.s} made or built', 'How far {M.s} came']],
  ['How would {M.s} usually say sorry?', ['Saying it out loud', 'Doing something nice', 'A long talk', 'A little treat']],
  ['Where would {M.s} rather spend an anniversary?', ['Somewhere fancy', 'Somewhere familiar', 'Somewhere brand new', 'At home, just the two of us']],
  ['What would {M.s} miss most after moving far away?', ['The people', 'The food', 'The routine', 'The house']],
  ['What’s {M.p} biggest pet peeve?', ['Lateness', 'Not being listened to', 'Messiness', 'Phones at dinner']],
  ['What recharges {M.o} fastest?', ['Sleep', 'Being outside', 'Time with people', 'Time alone']],
 ],
 3: [
  ['What makes {M.o} feel most loved?', ['Being chosen first', 'Being really listened to', 'Being taken care of', 'Being wanted']],
  ['What could {M.s} use more of right now?', ['Rest', 'Adventure', 'Reassurance', 'Fun']],
  ['What’s {M.p} biggest dream for the future mostly about?', ['Family', 'Freedom', 'Building something', 'Peace and quiet']],
  ['Picture growing old together. What would {M.s} hope for most?', ['A porch and slow mornings', 'Traveling everywhere', 'A full, loud house', 'Still chasing something new']],
  ['What would {M.s} love to hear from {G.o} more often?', ['“I’m proud of you”', '“I’ve got you”', '“I want you”', '“I’m sorry”']],
  ['What’s the scariest part of love for {M.o}?', ['Losing it', 'Getting hurt', 'Not being enough', 'Letting someone all the way in']],
  ['If {M.s} could relive one kind of moment together, which would it be?', ['The very beginning', 'A trip', 'An ordinary night in', 'A big milestone']],
  ['What brings {M.o} closest to {G.o}?', ['Laughing together', 'Talking late at night', 'Doing nothing together', 'Getting through something hard']],
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
  'What’s something you noticed about {P.o} early on that you still love?',
  'What’s one of {P.p} habits that’s secretly cute?',
  'What’s a memory of the two of you that you replay sometimes?',
  'What’s something small you’ve never told {P.o}?',
  'What do you wish people understood about you without having to explain?',
  'What’s one thing you two should do together this year?',
  'What’s the nicest thing anyone has ever done for you?',
  'What part of your day do you look forward to most?',
  'When did you last feel really proud of yourself?',
  'What’s something you’re working on in yourself right now?',
 ],
 3: [
  'When did you first know you were falling for {P.o}?',
  'What do you love about the two of you that you don’t say enough?',
  'When did you feel really seen by {P.o}?',
  'What do you hope you two are doing ten years from now?',
  'What’s something you’ve been afraid to ask {P.o} for?',
  'How has {P.s} changed you?',
  'What’s a promise you want to make {P.o}?',
  'What does {P.s} do that makes you feel safe?',
  'What’s your favorite version of {P.o}?',
  'If you could go back to your first date, what would you tell yourself?',
 ],
};

const sweetNotes = [
 'A note to {P.o}. Finish this: I fell for you because…',
 'A note to {P.o}. Finish this: The moment I knew was…',
 'A note to {P.o}. Finish this: My favorite thing about loving you is…',
];

const darkLevels = ['', 'Warming Up', 'Getting Hot', 'No Limits', 'Tonight'];
const darkMind = {
 1: [
  ['Where would {M.s} want {G.p} mouth first?', ['Neck', 'Lips', 'Chest', 'Lower']],
  ['What would {M.s} rather sleep in?', ['Nothing', 'Something tiny', 'One of {G.p} shirts and nothing else', 'Pajamas (for now)']],
  ['What turns {M.o} on fastest?', ['A deep kiss', '{^G.p} hands on {M.p} hips', 'Dirty talk in {M.p} ear', 'Being pinned down']],
  ['When’s the best time for sex, according to {M.o}?', ['Morning', 'Middle of the day', 'Late night', 'Right now']],
  ['Lights on or off, for {M.o}?', ['On', 'Off', 'Candles only', 'Doesn’t matter']],
  ['What would {M.s} rather do tonight?', ['Shower sex', 'An oil massage that turns into sex', 'Watch porn together', 'Skip straight to bed']],
  ['What’s {M.p} biggest weakness?', ['Neck kisses', 'Being teased', 'Being told what to do', 'Being wanted out loud']],
  ['Quickie or all night, for {M.o}?', ['Quickie', 'All night', 'Quickie now, all night later', 'Whatever gets started']],
 ],
 2: [
  ['What pace would {M.s} pick?', ['Slow and teasing', 'Fast and rough', 'Slow, then all at once', 'Depends on the mood']],
  ['Who should be on top, according to {M.o}?', ['{^M.o}', '{^G.o}', 'Switch halfway', 'Nobody. Bent over']],
  ['Where would {M.s} most want sex besides the bed?', ['The shower', 'The car', 'The kitchen counter', 'Somewhere risky']],
  ['What would {M.s} love to hear during sex?', ['{^M.p} name', 'How good it feels', 'What’s coming next', '“Don’t stop”']],
  ['Which tease would {M.s} pick?', ['A dirty text at work', 'A nude', 'A whisper in public', 'A hand under the table']],
  ['What would {M.s} try first?', ['A blindfold', 'Handcuffs', 'A vibrator together', 'Ice and wax']],
  ['In bed, how would {M.s} want {G.o}?', ['Gentle', 'Rough', 'In charge', 'Begging']],
  ['What’s {M.p} favorite thing to give?', ['Oral', 'A long massage', 'Hickeys', 'Orgasms, plural']],
  ['What’s {M.p} volume level in bed?', ['Silent', 'A little', 'Loud', 'The neighbors know']],
 ],
 3: [
  ['In bed, which fits {M.o} best?', ['Dom', 'Sub', 'Switch', 'Still figuring it out']],
  ['What does {M.p} biggest fantasy involve?', ['Role play', 'Being tied up', 'Tying {G.o} up', 'Getting caught']],
  ['How many rounds make {M.p} perfect night?', ['One, done right', 'Two', 'Three', 'Lost count']],
  ['What would {M.s} most want control over?', ['The pace', 'Who finishes, and when', 'What gets worn (or not)', 'Everything']],
  ['Which kink would {M.s} explore first?', ['Spanking', 'Hair pulling', 'Orgasm denial', 'Being watched']],
  ['What would make {M.o} blush the hardest?', ['Saying a fantasy out loud', 'Being watched', 'Hearing exactly what’s coming', 'Getting caught']],
  ['Afterward, what would {M.s} want?', ['To cuddle', 'Round two', 'Food', 'Sleep']],
  ['What would {M.s} say yes to tonight?', ['Something new', 'Somewhere new', 'Going all night', 'Anything. Just ask']],
 ],
};
const darkOpen = {
 1: [
  'What does {P.s} wear that makes you want to rip it off {P.o}?',
  'What’s the first thing you’d do if {P.s} walked in naked right now?',
  'What song would you want playing during sex?',
  'What’s a touch from {P.o} that turns you on instantly?',
  'From 1 to 10, how badly do you want {P.o} right now? Why?',
  'What would you text {P.o} to get {P.o} home early and into bed?',
  'Where’s the most random place you’ve pictured {P.o} naked?',
  'What’s your favorite thing {P.s} does with {P.p} mouth?',
 ],
 2: [
  'What memory of the two of you do you think about when you touch yourself?',
  'What do you want {P.o} to do to you more often?',
  'Walk {P.o} through your perfect night of sex together, start to finish.',
  'What have you wanted to try in bed but never asked for?',
  'Where’s the riskiest place you’d want to have sex with {P.o}?',
  'What part of {P.p} body do you think about the most?',
  'What dirty thing should {P.s} whisper to you next time?',
  'Write the text you’d send {P.o} if you wanted {P.o} right now.',
 ],
 3: [
  'What’s a fantasy you’ve never said out loud?',
  'Tell {P.o} exactly what you want done to you tonight.',
  'What’s the hottest sex you two have ever had, and what made it so good?',
  'If {P.s} tied you up tonight, what would you want {P.o} to do?',
  'What’s a kink you’re curious about that might surprise {P.o}?',
  'What’s a hard limit for you, and what’s a maybe?',
  'What should your safe word be?',
  'Describe what you’d do to {P.o} if {P.s} were next to you right now.',
  'Tell {P.o} exactly how you like to be touched.',
 ],
};
const darkNotes = [
 'A note to {P.o}. Finish this: Tonight I want you to…',
 'A note to {P.o}. Finish this: The thing I can’t stop thinking about doing to you is…',
 'A note to {P.o}. Finish this: Next time we’re alone, I’m going to…',
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

// Question text for the phone in `seat`, whose partner is `partner` ('him' or 'her').
// Returns the question (a string), or [question, choices] for Read my mind.
export const pronouns = { him: { s: 'he', o: 'him', p: 'his' }, her: { s: 'she', o: 'her', p: 'her' } };
const asQuestion = { s: 'you', o: 'you', p: 'your' }, asChoice = { s: 'I', o: 'me', p: 'my' };
const cap = w => w[0].toUpperCase() + w.slice(1);
export function words(text, seat, mystery, partner, choice = false) {
 const other = pronouns[partner] || pronouns.her;
 return text.replace(/\{(\^?)([MGP])\.([sop])\}/g, (_, up, who, form) => {
  const person = who === 'M' ? mystery : who === 'G' ? 1 - mystery : 1 - seat;
  const set = person === seat ? (choice ? asChoice : asQuestion) : other;
  const word = set[form];
  return up ? cap(word) : word;
 });
}
export function ask(card, mystery, seat, partner = 'her', deck = 'sweet') {
 const item = pool(card.kind, card.level, deck)[card.i];
 if (card.kind !== 'mind') return words(item, seat, mystery, partner);
 const [q, options] = item;
 return [words(q, seat, mystery, partner), options.map(o => words(o, seat, mystery, partner, true))];
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
