// math-data.js — Built-in Grade 1 math lesson library
//
// Source material: hand2mind Grade 1, Module 1 worksheets (see /images).
// Unlike reading/spelling, math content is generated procedurally: each lesson
// defines a generator that emits problem objects on demand, so a fresh set of
// problems appears every session.
//
// Lesson shape:
//   {
//     id:      'lesson-add-ten-adjust',   // stable unique id
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
//     visual: null,           // optional: { type: 'ten-frame'|'number-path', ... }
//   }
//
// Phase 1 (this file) covers the four pure-arithmetic lessons. Word problems,
// telling time, data graphs, and ordering land in later phases.

const MATH_LIBRARY = [];
