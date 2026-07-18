// math-data.js — Built-in Grade 1 math lesson library
//
// Source material: hand2mind Grade 1, Module 1 worksheets (see /images).
// Unlike reading/spelling, math content is generated procedurally: each lesson
// defines a generate() that emits problem objects on demand, so a fresh set of
// problems appears every session.
//
// Lesson shape:
//   {
//     id:      'add-ten-adjust',          // stable unique id
//     grade:   'grade1',                  // 'grade1' (more grades later)
//     topic:   'add' | 'subtract',        // grouping / icon
//     title:   'Use 10 and Adjust',       // shown on the lesson card
//     blurb:   'Add 9 and 8 the easy way',// one-line description
//     count:   8,                         // problems per session
//     generate() { return { prompt, answer, visual }; }
//   }
//
// Problem shape returned by generate():
//   {
//     prompt: '9 + 3',        // display string (answer entered on number pad)
//     answer: 12,             // integer, non-negative
//     visual: null | {        // optional concrete model (rendered by ps-17)
//       type: 'ten-frame' | 'number-path',
//       values: [ ... ],      // interpretation depends on type
//     },
//   }
//
// Phase 1 covers the four pure-arithmetic lessons. Word problems, telling time,
// data graphs, and ordering land in later phases.

function mathRandInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const MATH_LIBRARY = [

  // ── Use 10 and Adjust to Add (M1-115 / M1-109) ────────────────
  // Add 9 or 8 to a single digit — "make a ten, then adjust."
  {
    id: 'add-ten-adjust',
    grade: 'grade1',
    topic: 'add',
    title: 'Use 10 and Adjust',
    blurb: 'Add 9 and 8 the easy way',
    count: 8,
    generate() {
      const a = Math.random() < 0.5 ? 9 : 8;
      const b = mathRandInt(2, 9);
      return {
        prompt: `${a} + ${b}`,
        answer: a + b,
        visual: { type: 'ten-frame', values: [a, b] },
      };
    },
  },

  // ── Use Doubles for 3 Addends (M1-109) ────────────────────────
  // a + a + b — spot the double, then add the extra.
  {
    id: 'doubles-3-addends',
    grade: 'grade1',
    topic: 'add',
    title: 'Doubles + 1 More',
    blurb: 'Add three numbers using doubles',
    count: 8,
    generate() {
      const a = mathRandInt(1, 6);
      const b = mathRandInt(1, 6);
      return {
        prompt: `${a} + ${a} + ${b}`,
        answer: a + a + b,
        visual: null,
      };
    },
  },

  // ── Make 10 to Subtract (M1-15) ───────────────────────────────
  // Teen minus a number that crosses the ten, e.g. 15 - 7.
  {
    id: 'make-ten-subtract',
    grade: 'grade1',
    topic: 'subtract',
    title: 'Make 10 to Subtract',
    blurb: 'Break the ten to take away',
    count: 8,
    generate() {
      const minuend = mathRandInt(11, 18);
      const ones = minuend - 10;                 // 1..8
      const sub = mathRandInt(ones + 1, 9);      // crosses 10 → answer 1..9
      return {
        prompt: `${minuend} - ${sub}`,
        answer: minuend - sub,
        visual: { type: 'ten-frame', values: [minuend] },
      };
    },
  },

  // ── Counting Back (M1-123) ────────────────────────────────────
  // Subtract a small hop from a teen number on the number path.
  {
    id: 'counting-back',
    grade: 'grade1',
    topic: 'subtract',
    title: 'Counting Back',
    blurb: 'Hop back on the number path',
    count: 8,
    generate() {
      const minuend = mathRandInt(11, 20);
      const sub = mathRandInt(2, 5);
      return {
        prompt: `${minuend} - ${sub}`,
        answer: minuend - sub,
        visual: { type: 'number-path', values: [minuend, sub] },
      };
    },
  },

  // ── Add Story Problems (M1-115 flavor) ────────────────────────
  // "There are 9 creepers. 5 more spawn. How many now?" — 9+n / 8+n.
  {
    id: 'add-word',
    grade: 'grade1',
    topic: 'add',
    title: 'Add Story Problems',
    blurb: 'Read and add the mobs',
    count: 6,
    generate() {
      const a = Math.random() < 0.5 ? 9 : 8;
      const b = mathRandInt(2, 9);
      const mob = mathPick(MATH_MOBS);
      return {
        story: `There are ${a} ${mob}. Then ${b} more ${mob} spawn. How many ${mob} are there now?`,
        answer: a + b,
        visual: null,
      };
    },
  },

  // ── Subtract Story Problems (M1-15 flavor) ────────────────────
  // "There are 15 pigs. 7 wander off. How many are left?" — make 10.
  {
    id: 'subtract-word',
    grade: 'grade1',
    topic: 'subtract',
    title: 'Subtract Story Problems',
    blurb: 'Read and take some away',
    count: 6,
    generate() {
      const minuend = mathRandInt(11, 18);
      const ones = minuend - 10;
      const sub = mathRandInt(ones + 1, 9);
      const mob = mathPick(MATH_MOBS);
      const away = mathPick(MATH_AWAY);
      return {
        story: `There are ${minuend} ${mob}. Then ${sub} ${mob} ${away}. How many ${mob} are left?`,
        answer: minuend - sub,
        visual: null,
      };
    },
  },

  // ── Comparison Story Problems (M1-45 flavor) ──────────────────
  // "Steve has 12 diamonds. Alex has 5. How many more does Steve have?"
  {
    id: 'compare-word',
    grade: 'grade1',
    topic: 'subtract',
    title: 'Compare — More or Fewer',
    blurb: 'Read and find the difference',
    count: 6,
    generate() {
      const big = mathRandInt(6, 18);
      const small = mathRandInt(1, big - 1);
      const item = mathPick(MATH_ITEMS);
      const names = [...MATH_NAMES];
      const n1 = names.splice(Math.floor(Math.random() * names.length), 1)[0];
      const n2 = names.splice(Math.floor(Math.random() * names.length), 1)[0];
      const story = Math.random() < 0.5
        ? `${n1} has ${big} ${item}. ${n2} has ${small} ${item}. How many more ${item} does ${n1} have?`
        : `${n1} has ${big} ${item}. ${n2} has ${small} ${item}. How many fewer ${item} does ${n2} have?`;
      return { story, answer: big - small, visual: null };
    },
  },

  // ── Telling Time (M1-90) ──────────────────────────────────────
  // Read an analog clock (o'clock / half-past) and pick the digital time.
  {
    id: 'telling-time',
    grade: 'grade1',
    topic: 'time',
    title: 'What Time Is It?',
    blurb: 'Read the clock',
    count: 6,
    generate() {
      const hour = mathRandInt(1, 12);
      const minute = Math.random() < 0.5 ? 0 : 30;
      const answer = mathTimeStr(hour, minute);
      const choices = new Set([answer]);
      while (choices.size < 4) {
        choices.add(mathTimeStr(mathRandInt(1, 12), Math.random() < 0.5 ? 0 : 30));
      }
      return {
        input: 'choice',
        question: 'What time is it?',
        visual: { type: 'clock', values: [hour, minute] },
        answer,
        choices: mathShuffle([...choices]),
      };
    },
  },

  // ── Read a Bar Graph (M1-99 / M1-100) ─────────────────────────
  // Read counts off a bar chart: "how many" (number pad) or
  // "which most / fewest" (choice tiles).
  {
    id: 'bar-graph',
    grade: 'grade1',
    topic: 'data',
    title: 'Read the Graph',
    blurb: 'Answer from the bar chart',
    count: 6,
    generate() {
      const qType = mathPick(['count', 'most', 'fewest']);
      let data;
      do {
        const cats = mathShuffle([...DATA_LABELS]).slice(0, 4);
        data = cats.map(label => ({ label, value: mathRandInt(1, 8) }));
      } while (!uniqueExtreme(data, qType));

      if (qType === 'count') {
        const target = mathPick(data);
        return {
          input: 'pad',
          question: `How many ${target.label}?`,
          visual: { type: 'bar-chart', values: data },
          answer: target.value,
        };
      }
      const sorted = [...data].sort((a, b) => a.value - b.value);
      const answer = (qType === 'most' ? sorted[sorted.length - 1] : sorted[0]).label;
      return {
        input: 'choice',
        question: qType === 'most' ? 'Which has the most?' : 'Which has the fewest?',
        visual: { type: 'bar-chart', values: data },
        answer,
        choices: mathShuffle(data.map(d => d.label)),
      };
    },
  },

  // ── Order Numbers: Least to Greatest (M1-37) ──────────────────
  // Tap three distinct numbers in increasing order.
  {
    id: 'order-numbers',
    grade: 'grade1',
    topic: 'order',
    title: 'Least to Greatest',
    blurb: 'Tap in order, smallest first',
    count: 6,
    generate() {
      const set = new Set();
      while (set.size < 3) set.add(mathRandInt(1, 20));
      const numbers = mathShuffle([...set]);
      return {
        input: 'order',
        question: 'Tap from least to greatest',
        numbers,
        answer: [...numbers].sort((a, b) => a - b),
        visual: null,
      };
    },
  },

];

// True when the relevant extreme (most/fewest) is a single unambiguous bar.
function uniqueExtreme(data, qType) {
  if (qType === 'count') return true;
  const vals = data.map(d => d.value);
  const target = qType === 'most' ? Math.max(...vals) : Math.min(...vals);
  return vals.filter(v => v === target).length === 1;
}

// Minecraft flavor for word problems.
const MATH_MOBS  = ['creepers', 'pigs', 'cows', 'chickens', 'sheep', 'zombies', 'skeletons'];
const MATH_AWAY  = ['wander off', 'run away', 'despawn'];
const MATH_ITEMS = ['diamonds', 'apples', 'torches', 'arrows', 'cookies', 'emeralds', 'carrots'];
const MATH_NAMES = ['Steve', 'Alex', 'Zoe', 'Max'];
// Short labels so bar-chart columns stay legible without wrapping.
const DATA_LABELS = ['Gold', 'Iron', 'Coal', 'Wood', 'Rock', 'Fish'];

function mathPick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function mathShuffle(arr) {
  return arr.sort(() => Math.random() - 0.5);
}

function mathTimeStr(hour, minute) {
  return `${hour}:${minute === 0 ? '00' : '30'}`;
}

// Build a fixed-length set of problems for a lesson, avoiding immediate repeats.
function buildProblemSet(lesson) {
  const set = [];
  const seen = new Set();
  let guard = 0;
  while (set.length < lesson.count && guard < lesson.count * 30) {
    guard++;
    const p = lesson.generate();
    const key = p.prompt || p.story || `${p.question || ''}|${p.answer}`;
    if (seen.has(key)) continue;
    seen.add(key);
    set.push(p);
  }
  return set;
}
