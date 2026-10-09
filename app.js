const STORAGE_KEY = 'ruhejieOneSmallThingV2';
const LEGACY_STORAGE_KEY = 'ruhejieOneSmallThingV1';
const { cleanText, auditThing, buildSmallThing } = window.SmallThingReviewEngine;

const state = loadState();
let wizardStep = 0;
let currentCandidate = null;
let activeRecordId = null;

const progressLabels = [
  '先确定今天真正想推进什么',
  '找到最影响结果的一个卡点',
  '把目标收缩成今天能完成的动作',
  '明确做完以后留下什么',
  '安排一个真实的反馈来源'
];

const els = {
  todayBadge: document.getElementById('todayBadge'),
  tabs: [...document.querySelectorAll('.tab')],
  views: [...document.querySelectorAll('.view')],
  seedPanel: document.getElementById('seedPanel'),
  seedText: document.getElementById('seedText'),
  useSeedBtn: document.getElementById('useSeedBtn'),
  discoveryForm: document.getElementById('discoveryForm'),
  questionSteps: [...document.querySelectorAll('.question-step')],
  questionCounter: document.getElementById('questionCounter'),
  progressLabel: document.getElementById('progressLabel'),
  progressBar: document.getElementById('progressBar'),
  memberName: document.getElementById('memberName'),
  goalInput: document.getElementById('goalInput'),
  obstacleInput: document.getElementById('obstacleInput'),
  actionInput: document.getElementById('actionInput'),
  deliverableInput: document.getElementById('deliverableInput'),
  feedbackInput: document.getElementById('feedbackInput'),
  stepError: document.getElementById('stepError'),
  backBtn: document.getElementById('backBtn'),
  nextBtn: document.getElementById('nextBtn'),
  planCandidate: document.getElementById('planCandidate'),
  candidateStatus: document.getElementById('candidateStatus'),
  candidateText: document.getElementById('candidateText'),
  candidateChecks: document.getElementById('candidateChecks'),
  editAnswersBtn: document.getElementById('editAnswersBtn'),
  confirmPlanBtn: document.getElementById('confirmPlanBtn'),
  savedPlan: document.getElementById('savedPlan'),
  reviewEmpty: document.getElementById('reviewEmpty'),
  reviewForm: document.getElementById('reviewForm'),
  approvedThingText: document.getElementById('approvedThingText'),
  executionResult: document.getElementById('executionResult'),
  notCompleted: document.getElementById('notCompleted'),
  newBlockers: document.getElementById('newBlockers'),
  improvements: document.getElementById('improvements'),
  nextImprovement: document.getElementById('nextImprovement'),
  reviewResult: document.getElementById('reviewResult'),
  historyStats: document.getElementById('historyStats'),
  historyList: document.getElementById('historyList'),
  exportBtn: document.getElementById('exportBtn')
};

function todayKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function todayLabel() {
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'long',
    day: 'numeric',
    weekday: 'short'
  }).format(new Date());
}

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    const parsed = JSON.parse(saved || legacy || '{}');
    return {
      memberName: typeof parsed.memberName === 'string' ? parsed.memberName : '',
      records: Array.isArray(parsed.records) ? parsed.records : [],
      pendingSeed: normalizePendingSeed(parsed.pendingSeed)
    };
  } catch {
    return { memberName: '', records: [], pendingSeed: null };
  }
}

function normalizePendingSeed(seed) {
  if (!seed) return null;
  if (typeof seed === 'string') {
    return {
      text: seed,
      sourceDate: todayKey(),
      sourceThing: '',
      createdAt: new Date().toISOString()
    };
  }
  if (typeof seed === 'object' && typeof seed.text === 'string') return seed;
  return null;
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function uid() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function getSelectedTime() {
  return document.querySelector('input[name="time"]:checked')?.value || '60分钟';
}

function getAnswers() {
  return {
    name: cleanText(els.memberName.value),
    goal: cleanText(els.goalInput.value),
    obstacle: cleanText(els.obstacleInput.value),
    time: getSelectedTime(),
    action: cleanText(els.actionInput.value),
    deliverable: cleanText(els.deliverableInput.value),
    feedback: cleanText(els.feedbackInput.value)
  };
}

function renderWizardStep() {
  els.questionSteps.forEach((step, index) => {
    const active = index === wizardStep;
    step.hidden = !active;
    step.classList.toggle('is-active', active);
  });
  els.questionCounter.textContent = `问题 ${wizardStep + 1} / 5`;
  els.progressLabel.textContent = progressLabels[wizardStep];
  els.progressBar.style.width = `${((wizardStep + 1) / 5) * 100}%`;
  els.backBtn.hidden = wizardStep === 0;
  els.nextBtn.textContent = wizardStep === 4 ? '生成今天的一件小事' : '下一步';
  els.stepError.hidden = true;
}

function validateStep() {
  const answers = getAnswers();
  const rules = [
    [answers.name && answers.goal, '先写下你的名字和今天最想推进的结果。'],
    [answers.obstacle, '请只写一个当前最大的卡点。'],
    [answers.action, '请写下今天可以完成的一个最小动作。'],
    [answers.deliverable, '请写清做完以后会留下什么结果。'],
    [answers.feedback, '请写清你准备从哪里获得反馈。']
  ];
  const [valid, message] = rules[wizardStep];
  if (!valid) {
    els.stepError.textContent = message;
    els.stepError.hidden = false;
    return false;
  }
  return true;
}

function buildCandidate() {
  const answers = getAnswers();
  const text = buildSmallThing(answers);
  const audit = auditThing(text);
  currentCandidate = { answers, text, audit };

  els.discoveryForm.hidden = true;
  els.planCandidate.hidden = false;
  els.savedPlan.hidden = true;
  els.candidateText.textContent = text;
  els.candidateStatus.textContent = `${audit.score} / 6 项合格`;
  els.candidateStatus.className = `status-chip ${audit.passed ? 'pass' : 'revise'}`;
  els.confirmPlanBtn.disabled = !audit.passed;
  els.candidateChecks.innerHTML = audit.criteria
    .map((item) => `<li class="${item.passed ? 'is-pass' : 'is-fail'}"><span></span>${escapeHtml(item.name)}</li>`)
    .join('');
  els.planCandidate.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function createRecord(candidate) {
  const { answers, text, audit } = candidate;
  const existingIndex = state.records.findIndex(
    (record) => record.date === todayKey() && record.name === answers.name
  );
  const record = {
    id: existingIndex >= 0 ? state.records[existingIndex].id : uid(),
    date: todayKey(),
    createdAt: new Date().toISOString(),
    name: answers.name,
    goal: answers.goal,
    obstacle: answers.obstacle,
    originalText: text,
    approvedText: text,
    revised: false,
    answers,
    audit: audit.criteria.map(({ key, name, passed }) => ({ key, name, passed })),
    status: 'approved',
    review: null
  };
  if (existingIndex >= 0) state.records.splice(existingIndex, 1);
  state.records.unshift(record);
  state.memberName = answers.name;
  state.pendingSeed = null;
  activeRecordId = record.id;
  saveState();
  return record;
}

function findTodayRecord() {
  return state.records.find(
    (record) => record.date === todayKey() && ['approved', 'reviewed'].includes(record.status)
  );
}

function showSavedPlan(record) {
  els.discoveryForm.hidden = true;
  els.planCandidate.hidden = true;
  els.savedPlan.hidden = false;
  els.savedPlan.innerHTML = `
    <div class="result-title">
      <h3>今天的目标已经定下来</h3>
      <span class="status-chip ${record.status === 'reviewed' ? 'pass' : 'revise'}">${record.status === 'reviewed' ? '已闭环' : '待执行'}</span>
    </div>
    <p class="saved-plan-text">${escapeHtml(record.approvedText)}</p>
    <p class="result-note">${record.status === 'reviewed' ? '今天已经完成复盘，可以到成长记录查看。' : '先去做，做完以后到“做完复盘”填写真实结果。'}</p>
    <button id="restartTodayBtn" class="text-action" type="button">重新确定今天的一件小事</button>
  `;
  document.getElementById('restartTodayBtn').addEventListener('click', () => {
    els.savedPlan.hidden = true;
    els.discoveryForm.hidden = false;
    wizardStep = 0;
    renderWizardStep();
  });
}

function renderSeed() {
  const seed = state.pendingSeed;
  const hasSeed = Boolean(seed?.text && seed.sourceDate && seed.sourceDate < todayKey());
  els.seedPanel.hidden = !hasSeed;
  if (!hasSeed) return;
  els.seedText.textContent = seed.text;
}

function renderReview() {
  const record = findTodayRecord();
  activeRecordId = record?.id || null;
  els.reviewResult.hidden = true;
  if (!record) {
    els.reviewEmpty.hidden = false;
    els.reviewForm.hidden = true;
    return;
  }

  els.reviewEmpty.hidden = true;
  els.reviewForm.hidden = false;
  els.approvedThingText.textContent = record.approvedText;
  const review = record.review || {};
  els.executionResult.value = review.executionResult || '';
  els.notCompleted.value = review.notCompleted || review.wentWrong || '';
  els.newBlockers.value = review.newBlockers || review.feedbackEvidence || '';
  els.improvements.value = review.improvements || review.solidifyMethod || '';
  els.nextImprovement.value = review.nextImprovement || '';
  if (record.status === 'reviewed') renderReviewResult(record);
}

function renderReviewResult(record) {
  els.reviewResult.hidden = false;
  els.reviewResult.className = 'result-panel pass';
  els.reviewResult.innerHTML = `
    <div class="result-title">
      <h3>今天的闭环完成了</h3>
      <span class="status-chip pass">已复盘</span>
    </div>
    <div class="review-summary">
      <div><strong>真实结果</strong><p>${escapeHtml(record.review.executionResult)}</p></div>
      <div><strong>新的卡点</strong><p>${escapeHtml(record.review.newBlockers)}</p></div>
      <div><strong>明天只改一个点</strong><p>${escapeHtml(record.review.nextImprovement)}</p></div>
    </div>
    <div class="tomorrow-seed">
      <span>明日线索</span>
      <strong>${escapeHtml(record.review.nextImprovement)}</strong>
      <p>这条线索已经保存。最早明天再次打开工作台时，它才会出现，并从第 1 问重新判断。</p>
    </div>
  `;
}

function renderHistory() {
  const records = state.records;
  const reviewed = records.filter((record) => record.status === 'reviewed').length;
  els.historyStats.textContent = `共 ${records.length} 次行动 · 完成闭环 ${reviewed} 次`;
  els.historyList.innerHTML = '';

  if (!records.length) {
    els.historyList.innerHTML = '<div class="empty-state">还没有记录。完成第一次问答后，这里会留下你的行动轨迹。</div>';
    return;
  }

  records.forEach((record) => {
    const review = record.review || {};
    const article = document.createElement('article');
    article.className = 'history-item';
    const statusLabel = record.status === 'reviewed' ? '已闭环' : '待复盘';
    const statusClass = record.status === 'reviewed' ? 'pass' : 'revise';
    article.innerHTML = `
      <div class="history-head">
        <div>
          <strong>${escapeHtml(record.name)}</strong>
          <div class="history-meta">${record.date}${record.goal ? ` · ${escapeHtml(record.goal)}` : ''}</div>
        </div>
        <span class="status-chip ${statusClass}">${statusLabel}</span>
      </div>
      <p class="history-thing">${escapeHtml(record.approvedText)}</p>
      ${record.review ? `
        <details class="history-details">
          <summary>查看这次闭环</summary>
          <dl>
            <dt>实际做到</dt><dd>${escapeHtml(review.executionResult)}</dd>
            <dt>没有做到</dt><dd>${escapeHtml(review.notCompleted || review.wentWrong)}</dd>
            <dt>新的卡点</dt><dd>${escapeHtml(review.newBlockers || review.feedbackEvidence)}</dd>
            <dt>改进办法</dt><dd>${escapeHtml(review.improvements || review.solidifyMethod)}</dd>
            <dt>明天改一点</dt><dd>${escapeHtml(review.nextImprovement)}</dd>
          </dl>
        </details>
      ` : ''}
    `;
    els.historyList.appendChild(article);
  });
}

function switchView(viewName) {
  els.tabs.forEach((tab) => tab.classList.toggle('is-active', tab.dataset.view === viewName));
  els.views.forEach((view) => view.classList.toggle('is-active', view.id === `${viewName}View`));
  if (viewName === 'review') renderReview();
  if (viewName === 'history') renderHistory();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

els.tabs.forEach((tab) => tab.addEventListener('click', () => switchView(tab.dataset.view)));

els.nextBtn.addEventListener('click', () => {
  if (!validateStep()) return;
  if (wizardStep < 4) {
    wizardStep += 1;
    renderWizardStep();
    return;
  }
  buildCandidate();
});

els.backBtn.addEventListener('click', () => {
  wizardStep = Math.max(0, wizardStep - 1);
  renderWizardStep();
});

els.editAnswersBtn.addEventListener('click', () => {
  els.planCandidate.hidden = true;
  els.discoveryForm.hidden = false;
  wizardStep = 0;
  renderWizardStep();
});

els.confirmPlanBtn.addEventListener('click', () => {
  if (!currentCandidate?.audit.passed) return;
  const record = createRecord(currentCandidate);
  showSavedPlan(record);
  renderSeed();
  renderReview();
  renderHistory();
});

els.useSeedBtn.addEventListener('click', () => {
  const seed = state.pendingSeed;
  if (!seed?.text) return;
  els.goalInput.value = `推进上次复盘留下的改进点：${seed.text}`;
  els.obstacleInput.value = '';
  els.actionInput.value = '';
  els.deliverableInput.value = '';
  els.feedbackInput.value = '';
  els.discoveryForm.hidden = false;
  els.savedPlan.hidden = true;
  els.planCandidate.hidden = true;
  wizardStep = 0;
  renderWizardStep();
  els.discoveryForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

els.reviewForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const record = state.records.find((item) => item.id === activeRecordId);
  if (!record) return;
  record.review = {
    executionResult: cleanText(els.executionResult.value),
    notCompleted: cleanText(els.notCompleted.value),
    newBlockers: cleanText(els.newBlockers.value),
    improvements: cleanText(els.improvements.value),
    nextImprovement: cleanText(els.nextImprovement.value),
    reviewedAt: new Date().toISOString()
  };
  record.status = 'reviewed';
  state.pendingSeed = {
    text: record.review.nextImprovement,
    sourceDate: record.date,
    sourceThing: record.approvedText,
    createdAt: new Date().toISOString()
  };
  saveState();
  renderReviewResult(record);
  renderSeed();
  renderHistory();
  els.reviewResult.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

els.exportBtn.addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `一件小事记录-${todayKey()}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
});

els.todayBadge.textContent = todayLabel();
els.memberName.value = state.memberName;
renderWizardStep();
renderSeed();
renderReview();
renderHistory();

const todayRecord = findTodayRecord();
if (todayRecord) showSavedPlan(todayRecord);

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('./service-worker.js').catch(() => {});
}
