// math.js — Math module IIFE
// Depends on: db.js (getMobIndex, incrementMobIndex)
//             rewards.js (rewards.triggerBlockBurst, rewards.revealMob)
//             game.js (showScreen, showFeedback, escHtml, currentModule)
//             math-data.js (MATH_LIBRARY)
//
// Scaffold: screen wiring + session-state shape. Lesson picker, number pad,
// problem rendering, and champion integration are filled in by later tasks
// (ps-huz generators, ps-3je number pad, ps-cww session flow).

const mathGame = (() => {

  // ── state ─────────────────────────────────────────────────────
  let selectedLesson = null;

  let ms = {
    lesson: null,
    problems: [],
    problemIndex: 0,
    correctCount: 0,
    wrongProblems: [],
    results: [],
  };

  // ── setup screen ──────────────────────────────────────────────

  function renderLessonList() {
    const container = document.getElementById('math-lesson-list');
    const lessons = MATH_LIBRARY.filter(l => l.grade === 'grade1');

    if (!lessons.length) {
      container.innerHTML = '<p class="empty-state">No lessons yet.</p>';
      document.getElementById('math-start-btn').disabled = true;
      selectedLesson = null;
      return;
    }

    container.innerHTML = lessons.map(l => {
      const isSelected = selectedLesson && selectedLesson.id === l.id;
      return `
        <div class="math-lesson-item${isSelected ? ' math-lesson-item--selected' : ''}"
             data-id="${escHtml(l.id)}">
          <div class="math-lesson-info">
            <span class="math-lesson-title">${escHtml(l.title)}</span>
            <span class="math-lesson-blurb">${escHtml(l.blurb)}</span>
          </div>
        </div>`;
    }).join('');
  }

  function selectLesson(id) {
    selectedLesson = MATH_LIBRARY.find(l => l.id === id) || null;
    document.getElementById('math-start-btn').disabled = !selectedLesson;
    renderLessonList();
  }

  // ── number-pad input ──────────────────────────────────────────
  // Answers are typed on a 0-9 pixel keypad, mirroring the spelling
  // letter-slot model. Max answer in Grade 1 is 18, so two digits.

  let typedDigits = [];
  const MAX_ANSWER_DIGITS = 2;
  let onAnswerSubmit = null;   // wired by the session flow (ps-cww)

  function mountNumberPad() {
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'back', '0', 'ok'];
    document.getElementById('math-number-pad').innerHTML = keys.map(k => {
      if (k === 'back') return '<button class="num-key num-key--action" data-key="back">&#9003;</button>';
      if (k === 'ok')   return '<button class="num-key num-key--ok" data-key="ok">OK</button>';
      return `<button class="num-key" data-key="${k}">${k}</button>`;
    }).join('');
    updateAnswerSlots();
  }

  function updateAnswerSlots() {
    const slots = typedDigits.map(d => `<div class="answer-slot answer-slot--filled">${d}</div>`);
    if (typedDigits.length < MAX_ANSWER_DIGITS) {
      slots.push('<div class="answer-slot answer-slot--active"></div>');
    }
    document.getElementById('math-answer-slots').innerHTML = slots.join('');
  }

  function pressKey(key) {
    if (key === 'back') {
      typedDigits.pop();
    } else if (key === 'ok') {
      if (typedDigits.length && onAnswerSubmit) onAnswerSubmit(getTypedAnswer());
      return;
    } else if (typedDigits.length < MAX_ANSWER_DIGITS) {
      typedDigits.push(key);
    }
    updateAnswerSlots();
  }

  function clearAnswer() {
    typedDigits = [];
    updateAnswerSlots();
  }

  function getTypedAnswer() {
    return typedDigits.length ? parseInt(typedDigits.join(''), 10) : null;
  }

  // ── session flow (stubbed — see ps-cww) ───────────────────────

  function startSession() {
    if (!selectedLesson) return;
    // Full session flow implemented in ps-cww.
  }

  function endSession() {
    // Champion-screen integration implemented in ps-cww.
  }

  // ── init ──────────────────────────────────────────────────────

  function init() {
    document.getElementById('math-lesson-list').addEventListener('click', e => {
      const item = e.target.closest('.math-lesson-item');
      if (!item) return;
      selectLesson(item.dataset.id);
    });

    document.getElementById('math-start-btn').addEventListener('click', startSession);

    document.getElementById('math-quit-btn').addEventListener('click', () => {
      showScreen('math-screen');
    });

    // Number pad — static layout, event delegation for taps
    mountNumberPad();
    document.getElementById('math-number-pad').addEventListener('click', e => {
      const btn = e.target.closest('.num-key');
      if (btn) pressKey(btn.dataset.key);
    });

    // Keyboard support while the game screen is active
    document.addEventListener('keydown', e => {
      if (document.getElementById('math-game-screen').classList.contains('hidden')) return;
      if (/^[0-9]$/.test(e.key))      pressKey(e.key);
      else if (e.key === 'Backspace') { e.preventDefault(); pressKey('back'); }
      else if (e.key === 'Enter')     pressKey('ok');
    });

    renderLessonList();
  }

  return { init };

})();

document.addEventListener('DOMContentLoaded', () => mathGame.init());
