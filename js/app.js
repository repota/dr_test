const STORAGE_PROGRESS = 'dr_test_progress';
const STORAGE_STATS = 'dr_test_stats';

const screens = {
  home: document.getElementById('screen-home'),
  menu: document.getElementById('screen-menu'),
  question: document.getElementById('screen-question'),
  stats: document.getElementById('screen-stats'),
};

const els = {
  homeTestButtons: document.getElementById('home-test-buttons'),
  menuTitle: document.getElementById('menu-test-title'),
  btnNew: document.getElementById('btn-new-test'),
  btnContinue: document.getElementById('btn-continue'),
  btnStatsMenu: document.getElementById('btn-stats-from-menu'),
  questionProgress: document.getElementById('question-progress'),
  questionText: document.getElementById('question-text'),
  questionImage: document.getElementById('question-image'),
  questionOptions: document.getElementById('question-options'),
  questionInputHint: document.getElementById('question-input-hint'),
  questionFeedback: document.getElementById('question-feedback'),
  btnCheck: document.getElementById('btn-check'),
  btnNext: document.getElementById('btn-next'),
  btnFinish: document.getElementById('btn-finish'),
  statsTitle: document.getElementById('stats-title'),
  statsSubtitle: document.getElementById('stats-subtitle'),
  statsList: document.getElementById('stats-list'),
  statsEmpty: document.getElementById('stats-empty'),
};

/** @type {{ tests: Array<{ id: string, title: string, questions: Array<any> }> } | null} */
let catalog = null;
/** @type {{ id: string, title: string, questions: Array<any> } | null} */
let currentTest = null;

function showScreen(name) {
  Object.values(screens).forEach((el) => el.classList.remove('is-active'));
  screens[name].classList.add('is-active');
}

function progressKey(testId) {
  return `${STORAGE_PROGRESS}_${testId}`;
}

function loadProgress(testId) {
  try {
    const raw = localStorage.getItem(progressKey(testId));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveProgress(testId, data) {
  localStorage.setItem(progressKey(testId), JSON.stringify(data));
}

function clearProgress(testId) {
  localStorage.removeItem(progressKey(testId));
}

function loadAllStats() {
  try {
    const raw = localStorage.getItem(STORAGE_STATS);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function saveAllStats(entries) {
  localStorage.setItem(STORAGE_STATS, JSON.stringify(entries));
}

function hasActiveAttempt(testId) {
  return loadProgress(testId) != null;
}

function getQuestionState(progress, questionId) {
  if (!progress.questionStates[questionId]) {
    progress.questionStates[questionId] = {
      selected: [],
      checked: false,
      wasCorrect: null,
    };
  }
  return progress.questionStates[questionId];
}

function isAnswerCorrect(question, selectedIds) {
  const correct = question.correct;
  if (selectedIds.length !== correct.length) return false;
  const need = new Set(correct);
  return selectedIds.every((id) => need.has(id));
}

function optionTextsForIds(question, ids) {
  const map = new Map(question.options.map((o) => [o.id, o.text]));
  return ids.map((id) => map.get(id) || id).join(', ');
}

const TEST_HOME_ICONS = {
  cardiologist: './icons/cardio.png',
  therapist: './icons/therapy.png',
};

function renderHome() {
  els.homeTestButtons.innerHTML = '';
  catalog.tests.forEach((t) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn btn-test';
    const iconSrc = TEST_HOME_ICONS[t.id];
    if (iconSrc) {
      const img = document.createElement('img');
      img.src = iconSrc;
      img.alt = '';
      img.className = 'btn-test-icon';
      b.appendChild(img);
    }
    const label = document.createElement('span');
    label.className = 'btn-test-label';
    label.textContent = t.title;
    b.appendChild(label);
    b.addEventListener('click', () => openTestMenu(t.id));
    els.homeTestButtons.appendChild(b);
  });
}

function openTestMenu(testId) {
  currentTest = catalog.tests.find((t) => t.id === testId) || null;
  if (!currentTest) return;
  els.menuTitle.textContent = currentTest.title;
  els.btnContinue.disabled = !hasActiveAttempt(testId);
  showScreen('menu');
}

function startNewTest() {
  if (!currentTest) return;
  clearProgress(currentTest.id);
  const progress = {
    testId: currentTest.id,
    currentIndex: 0,
    questionStates: {},
  };
  saveProgress(currentTest.id, progress);
  showScreen('question');
  renderQuestion();
}

function continueTest() {
  if (!currentTest || !hasActiveAttempt(currentTest.id)) return;
  showScreen('question');
  renderQuestion();
}

function openStats() {
  if (!currentTest) return;
  els.statsTitle.textContent = 'Статистика';
  els.statsSubtitle.textContent = currentTest.title;
  const all = loadAllStats().filter((e) => e.testId === currentTest.id);
  all.sort((a, b) => b.completedAt - a.completedAt);
  els.statsList.innerHTML = '';
  if (all.length === 0) {
    els.statsEmpty.hidden = false;
    els.statsList.hidden = true;
  } else {
    els.statsEmpty.hidden = true;
    els.statsList.hidden = false;
    all.forEach((e) => {
      const li = document.createElement('li');
      li.className = 'stats-item';
      const date = new Date(e.completedAt);
      const dateStr = date.toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
      li.innerHTML = `<strong>${e.correct}/${e.total}</strong>Правильных ответов: ${e.percent}%<br /><span style="color:var(--muted);font-size:0.85rem">${dateStr}</span>`;
      els.statsList.appendChild(li);
    });
  }
  showScreen('stats');
}

function collectSelectedFromDom(question) {
  const inputs = els.questionOptions.querySelectorAll('input');
  const selected = [];
  inputs.forEach((input) => {
    if (input.checked) selected.push(input.value);
  });
  return selected;
}

function applySelectionToDom(question, selectedIds) {
  const inputs = els.questionOptions.querySelectorAll('input');
  inputs.forEach((input) => {
    input.checked = selectedIds.includes(input.value);
  });
}

function renderQuestion() {
  if (!currentTest) return;
  const progress = loadProgress(currentTest.id);
  if (!progress) {
    showScreen('menu');
    return;
  }
  const { questions } = currentTest;
  const idx = Math.min(progress.currentIndex, questions.length - 1);
  progress.currentIndex = idx;
  saveProgress(currentTest.id, progress);

  const q = questions[idx];
  const state = getQuestionState(progress, q.id);

  els.questionProgress.textContent = `Вопрос ${idx + 1} из ${questions.length}`;
  els.questionText.textContent = q.text || '';
  if (q.image) {
    els.questionImage.hidden = false;
    els.questionImage.src = q.image;
    els.questionImage.alt = 'Иллюстрация к вопросу';
  } else {
    els.questionImage.hidden = true;
    els.questionImage.removeAttribute('src');
  }

  els.questionInputHint.textContent =
    q.inputType === 'checkbox'
      ? 'Выберите один или несколько ответов'
      : 'Выберите один ответ';

  els.questionOptions.innerHTML = '';
  const inputName = `q-${q.id}`;
  const type = q.inputType === 'checkbox' ? 'checkbox' : 'radio';

  q.options.forEach((opt) => {
    const label = document.createElement('label');
    label.className = 'option';
    const input = document.createElement('input');
    input.type = type;
    input.name = inputName;
    input.value = opt.id;
    const span = document.createElement('span');
    span.textContent = opt.text;
    label.appendChild(input);
    label.appendChild(span);
    els.questionOptions.appendChild(label);
  });

  applySelectionToDom(q, state.selected);

  const inputs = els.questionOptions.querySelectorAll('input');
  const lockInputs = state.checked;
  inputs.forEach((inp) => {
    inp.disabled = lockInputs;
  });

  els.questionFeedback.classList.remove('is-visible', 'success', 'error');
  els.questionFeedback.textContent = '';

  if (state.checked) {
    if (state.wasCorrect) {
      els.questionFeedback.textContent = 'Верно!';
      els.questionFeedback.classList.add('is-visible', 'success');
    } else {
      els.questionFeedback.textContent =
        'Эхх... Правильный ответ: ' + optionTextsForIds(q, q.correct);
      els.questionFeedback.classList.add('is-visible', 'error');
    }
  }

  const isLast = idx === questions.length - 1;
  els.btnNext.hidden = isLast;
  els.btnFinish.hidden = !isLast;
  els.btnCheck.disabled = state.checked;
  if (state.checked) {
    els.btnNext.disabled = false;
  } else {
    els.btnNext.disabled = true;
  }
  els.btnFinish.disabled = !isLast;
}

function onCheck() {
  if (!currentTest) return;
  const progress = loadProgress(currentTest.id);
  if (!progress) return;
  const q = currentTest.questions[progress.currentIndex];
  const selected = collectSelectedFromDom(q);
  if (selected.length === 0) return;

  const correct = isAnswerCorrect(q, selected);
  const state = getQuestionState(progress, q.id);
  state.selected = selected;
  state.checked = true;
  state.wasCorrect = correct;
  saveProgress(currentTest.id, progress);

  els.questionFeedback.classList.remove('success', 'error');
  if (correct) {
    els.questionFeedback.textContent = 'Верно!';
    els.questionFeedback.classList.add('is-visible', 'success');
  } else {
    els.questionFeedback.textContent =
      'Эхх... Правильный ответ: ' + optionTextsForIds(q, q.correct);
    els.questionFeedback.classList.add('is-visible', 'error');
  }

  els.questionOptions.querySelectorAll('input').forEach((inp) => {
    inp.disabled = true;
  });
  els.btnCheck.disabled = true;
  els.btnNext.disabled = false;
}

function onNext() {
  if (!currentTest) return;
  const progress = loadProgress(currentTest.id);
  if (!progress) return;
  const next = progress.currentIndex + 1;
  if (next >= currentTest.questions.length) return;
  progress.currentIndex = next;
  saveProgress(currentTest.id, progress);
  renderQuestion();
}

function onFinish() {
  if (!currentTest) return;
  const progress = loadProgress(currentTest.id);
  if (!progress) return;
  const { questions } = currentTest;
  let correct = 0;
  questions.forEach((q) => {
    const st = progress.questionStates[q.id];
    if (st && st.wasCorrect === true) correct += 1;
  });
  const total = questions.length;
  const percent = total ? Math.round((correct / total) * 100) : 0;
  const entries = loadAllStats();
  entries.push({
    testId: currentTest.id,
    completedAt: Date.now(),
    correct,
    total,
    percent,
  });
  saveAllStats(entries);
  clearProgress(currentTest.id);
  openStats();
}

function goHome() {
  currentTest = null;
  showScreen('home');
  renderHome();
}

async function init() {
  const mainRes = await fetch('./data/tests.json', { cache: 'no-store' });
  if (!mainRes.ok) throw new Error('Не удалось загрузить тесты');
  const main = await mainRes.json();
  if (!main.tests || !Array.isArray(main.tests)) {
    throw new Error('Неверный формат tests.json');
  }
  const extra = [];
  /* Отладочный тест (data/debug-test.json) — раскомментируйте для включения
  try {
    const debugRes = await fetch('./data/debug-test.json', { cache: 'no-store' });
    if (debugRes.ok) {
      const dbg = await debugRes.json();
      if (dbg.tests && Array.isArray(dbg.tests)) extra.push(...dbg.tests);
    }
  } catch {
  }
  */
  catalog = { tests: [...main.tests, ...extra] };

  renderHome();

  document.querySelectorAll('[data-action="go-home"]').forEach((btn) => {
    btn.addEventListener('click', goHome);
  });

  els.btnNew.addEventListener('click', startNewTest);
  els.btnContinue.addEventListener('click', continueTest);
  els.btnStatsMenu.addEventListener('click', openStats);
  els.btnCheck.addEventListener('click', onCheck);
  els.btnNext.addEventListener('click', onNext);
  els.btnFinish.addEventListener('click', onFinish);
}

init().catch((err) => {
  console.error(err);
  document.body.innerHTML =
    '<div class="app"><p class="card">Ошибка загрузки. Откройте сайт через локальный сервер (не file://).</p></div>';
});
