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

    renderLessonList();
  }

  return { init };

})();

document.addEventListener('DOMContentLoaded', () => mathGame.init());
