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

];

// Minecraft flavor for word problems.
const MATH_MOBS = ['creepers', 'pigs', 'cows', 'chickens', 'sheep', 'zombies', 'skeletons'];
const MATH_AWAY = ['wander off', 'run away', 'despawn'];

function mathPick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Build a fixed-length set of problems for a lesson, avoiding immediate repeats.
function buildProblemSet(lesson) {
  const set = [];
  const seen = new Set();
  let guard = 0;
  while (set.length < lesson.count && guard < lesson.count * 30) {
    guard++;
    const p = lesson.generate();
    const key = p.prompt || p.story;
    if (seen.has(key)) continue;
    seen.add(key);
    set.push(p);
  }
  return set;
}
