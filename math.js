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
      const sym = l.topic === 'subtract' ? '&minus;'
                : l.topic === 'time'     ? '&#128336;'
                : l.topic === 'data'     ? '&#128202;'
                : '+';
      return `
        <div class="math-lesson-item${isSelected ? ' math-lesson-item--selected' : ''}"
             data-id="${escHtml(l.id)}">
          <span class="math-topic-chip math-topic-chip--${l.topic}">${sym}</span>
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

  // ── concrete-model visuals ────────────────────────────────────
  // Rendered above the prompt to match the worksheets' ten-frames and
  // number paths. Driven by the generator's `visual` descriptor; absent
  // or unknown → empty string (container collapses via CSS).

  function renderVisual(visual) {
    if (!visual) return '';
    if (visual.type === 'ten-frame')   return tenFrameHTML(visual.values);
    if (visual.type === 'number-path') return numberPathHTML(visual.values);
    if (visual.type === 'clock')       return clockSVG(visual.values[0], visual.values[1]);
    if (visual.type === 'bar-chart')   return barChartHTML(visual.values);
    return '';
  }

  // values: [{label, value}]. Vertical bars read against a 0..max y-axis
  // (no numbers on the bars, so "how many" requires reading the chart).
  function barChartHTML(data) {
    const UNIT = 22;
    const max = Math.max(...data.map(d => d.value), 1);
    let axis = '';
    for (let v = max; v >= 0; v--) axis += `<div class="bar-tick">${v}</div>`;
    const bars = data.map(d =>
      `<div class="bar-col">
         <div class="bar" style="height:${d.value * UNIT}px"></div>
         <span class="bar-label">${escHtml(d.label)}</span>
       </div>`).join('');
    return `<div class="bar-chart">
      <div class="bar-axis" style="height:${max * UNIT}px">${axis}</div>
      <div class="bar-plot" style="height:${max * UNIT}px;background-size:100% ${UNIT}px">${bars}</div>
    </div>`;
  }

  // Analog clock face with hour + minute hands (values: [hour, minute]).
  function clockSVG(hour, minute) {
    const cx = 90, cy = 90, r = 82;
    let marks = '';
    for (let n = 1; n <= 12; n++) {
      const ang = (n * 30 - 90) * Math.PI / 180;
      const nx = cx + Math.cos(ang) * (r - 16);
      const ny = cy + Math.sin(ang) * (r - 16);
      marks += `<text x="${nx.toFixed(1)}" y="${(ny + 6).toFixed(1)}" class="clock-num" text-anchor="middle">${n}</text>`;
    }
    const hourAng = ((hour % 12) + minute / 60) * 30 - 90;
    const minAng  = minute * 6 - 90;
    const hx = cx + Math.cos(hourAng * Math.PI / 180) * (r * 0.48);
    const hy = cy + Math.sin(hourAng * Math.PI / 180) * (r * 0.48);
    const mx = cx + Math.cos(minAng * Math.PI / 180) * (r * 0.72);
    const my = cy + Math.sin(minAng * Math.PI / 180) * (r * 0.72);
    return `<svg viewBox="0 0 180 180" class="clock-svg" width="180" height="180">
      <circle cx="${cx}" cy="${cy}" r="${r}" class="clock-face"/>
      ${marks}
      <line x1="${cx}" y1="${cy}" x2="${hx.toFixed(1)}" y2="${hy.toFixed(1)}" class="clock-hour"/>
      <line x1="${cx}" y1="${cy}" x2="${mx.toFixed(1)}" y2="${my.toFixed(1)}" class="clock-minute"/>
      <circle cx="${cx}" cy="${cy}" r="5" class="clock-pin"/>
    </svg>`;
  }

  // values: [a, b] (two addends, two colors) or [n] (single amount).
  // Dots fill left-to-right across one or two ten-frames.
  function tenFrameHTML(values) {
    const total      = values.reduce((a, b) => a + b, 0);
    const firstCount = values[0];
    const frames     = Math.min(2, Math.max(1, Math.ceil(total / 10)));
    let cells = '';
    for (let f = 0; f < frames; f++) {
      let frame = '';
      for (let c = 0; c < 10; c++) {
        const idx = f * 10 + c;
        const dot = idx < total
          ? `<span class="tf-dot tf-dot--${idx < firstCount ? 'a' : 'b'}"></span>`
          : '';
        frame += `<div class="tf-cell">${dot}</div>`;
      }
      cells += `<div class="ten-frame">${frame}</div>`;
    }
    return `<div class="ten-frames">${cells}</div>`;
  }

  // values: [minuend, sub]. Number path with the start (minuend) highlighted;
  // the child counts back to find the answer (answer is not pre-marked).
  function numberPathHTML(values) {
    const minuend = values[0];
    const lo = Math.max(1, minuend - 6);
    let cells = '';
    for (let n = lo; n <= minuend; n++) {
      cells += `<div class="np-cell${n === minuend ? ' np-cell--start' : ''}">${n}</div>`;
    }
    return `<div class="number-path">${cells}</div>`;
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

  // Render a sentence as tap-to-hear word tokens (reuses reading's pattern).
  function storyTokensHTML(text) {
    return text.trim().split(/\s+/).map(token => {
      const word = token.replace(/[^a-zA-Z']/g, '');
      return `<button class="word-token" data-word="${escHtml(word)}">${escHtml(token)}</button>`;
    }).join(' ');
  }

  function renderChoices(choices) {
    document.getElementById('math-choices').innerHTML = choices.map(c =>
      `<button class="math-choice" data-value="${escHtml(String(c))}">${escHtml(String(c))}</button>`
    ).join('');
  }

  function renderProblem() {
    const p = ms.problems[ms.problemIndex];
    if (!p) { endSession(); return; }
    inputLocked = false;
    clearAnswer();

    const mode    = p.input || 'pad';
    const usesPad = mode === 'pad';
    const isWord  = usesPad && !!p.story;
    const prompt  = document.getElementById('math-problem-prompt');
    const visual  = document.getElementById('math-problem-visual');

    // Toggle the input widgets and story panel for this problem.
    document.getElementById('math-answer-slots').classList.toggle('hidden', !usesPad);
    document.getElementById('math-number-pad').classList.toggle('hidden', !usesPad);
    document.getElementById('math-choices').classList.toggle('hidden', mode !== 'choice');
    document.getElementById('math-problem-story').classList.toggle('hidden', !isWord);

    if (isWord) {
      document.getElementById('math-story-tokens').innerHTML = storyTokensHTML(p.story);
      prompt.textContent = '';
      prompt.classList.remove('math-problem-prompt--question');
      visual.innerHTML = '';
      return;
    }

    visual.innerHTML = renderVisual(p.visual);
    if (p.question) {
      prompt.textContent = p.question;
      prompt.classList.add('math-problem-prompt--question');
    } else {
      prompt.textContent = `${p.prompt} =`;
      prompt.classList.remove('math-problem-prompt--question');
    }
    if (mode === 'choice') renderChoices(p.choices);
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

    // Word problems: read whole problem aloud, and tap-to-hear per word
    document.getElementById('math-read-aloud-btn').addEventListener('click', () => {
      const p = ms.problems[ms.problemIndex];
      if (p && p.story) speech.speak(p.story);
    });
    document.getElementById('math-story-tokens').addEventListener('click', e => {
      const btn = e.target.closest('.word-token');
      if (btn && btn.dataset.word) speech.speak(btn.dataset.word);
    });

    // Multiple-choice answer tiles (time / comparison lessons)
    document.getElementById('math-choices').addEventListener('click', e => {
      const btn = e.target.closest('.math-choice');
      if (btn && !inputLocked) checkAnswer(btn.dataset.value);
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
