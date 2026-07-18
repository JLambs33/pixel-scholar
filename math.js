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
  let inputLocked = false;   // true while feedback is showing

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
    if (inputLocked) return;
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

  // ── session flow ──────────────────────────────────────────────

  function startSession() {
    if (!selectedLesson) return;

    ms = {
      lesson: selectedLesson,
      problems: buildProblemSet(selectedLesson),
      problemIndex: 0,
      correctCount: 0,
      wrongProblems: [],
      results: [],
    };

    currentModule = 'math';
    onAnswerSubmit = checkAnswer;
    document.getElementById('change-words-btn').innerHTML = '&#8592; Change Lesson';

    showScreen('math-game-screen');
    ambientMobs.start('math-mob-canvas');
    updateProgress();
    renderProblem();
  }

  function renderProblem() {
    const p = ms.problems[ms.problemIndex];
    if (!p) { endSession(); return; }
    inputLocked = false;
    clearAnswer();
    document.getElementById('math-problem-prompt').textContent = `${p.prompt} =`;
    // Concrete-model visuals (ten-frame / number path) are rendered by ps-17;
    // the container stays empty until then and collapses via CSS.
    document.getElementById('math-problem-visual').innerHTML = '';
  }

  function checkAnswer(value) {
    if (inputLocked) return;
    const p = ms.problems[ms.problemIndex];
    inputLocked = true;

    if (value === p.answer) {
      ms.correctCount++;
      ms.results.push('correct');
      rewards.triggerBlockBurst();
      showFeedback('correct', '&#10003; Correct!', advanceProblem);
    } else {
      ms.wrongProblems.push(p.prompt);
      ms.results.push('wrong');
      showFeedback('wrong', `&#10007; It was ${p.answer}`, advanceProblem);
    }

    updateProgress();
  }

  function advanceProblem() {
    ms.problemIndex++;
    if (ms.problemIndex >= ms.problems.length) {
      endSession();
    } else {
      renderProblem();
    }
  }

  function updateProgress() {
    const row = document.getElementById('math-progress-row');
    if (!row) return;
    row.innerHTML = Array.from({ length: ms.problems.length }, (_, i) => {
      if (i < ms.results.length) {
        const r = ms.results[i];
        return `<div class="progress-pip progress-pip--${r}">${r === 'correct' ? '&#10003;' : '&#10007;'}</div>`;
      }
      return `<div class="progress-pip progress-pip--pending"></div>`;
    }).join('');
  }

  function endSession() {
    onAnswerSubmit = null;
    ambientMobs.stop();
    const perfect = ms.wrongProblems.length === 0;

    document.getElementById('champion-title').textContent    = perfect ? 'YOU DID IT!' : 'NICE TRY!';
    document.getElementById('champion-subtitle').textContent = perfect ? 'Math Champion!' : 'Keep Practicing!';
    document.getElementById('champion-score').innerHTML =
      `${ms.correctCount} out of ${ms.problems.length} problems correct!` +
      (ms.wrongProblems.length
        ? `<br><br>Solve all correctly to unlock a BONUS GAME!<br><br>Practice these:<br>${ms.wrongProblems.map(escHtml).join(', ')}`
        : '');

    document.getElementById('play-again-btn').classList.toggle('hidden', perfect);
    document.getElementById('bonus-picker').classList.toggle('hidden', !perfect);
    if (perfect) renderBestScores();

    showScreen('champion-screen');
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
      ambientMobs.stop();
      onAnswerSubmit = null;
      inputLocked = false;
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
