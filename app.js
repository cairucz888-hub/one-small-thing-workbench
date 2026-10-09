const STORAGE_KEY = 'ruhejieOneSmallThingV1';
const { cleanText, auditThing, guessDeliverable } = window.SmallThingReviewEngine;

const state = loadState();
let latestAudit = null;
let activeRecordId = null;

const els = {
  todayBadge: document.getElementById('todayBadge'),
  tabs: [...document.querySelectorAll('.tab')],
  views: [...document.querySelectorAll('.view')],
  planForm: document.getElementById('planForm'),
  memberName: document.getElementById('memberName'),
  smallThingInput: document.getElementById('smallThingInput'),
  thingCount: document.getElementById('thingCount'),
  auditResult: document.getElementById('auditResult'),
  revisionBuilder: document.getElementById('revisionBuilder'),
  revTime: document.getElementById('revTime'),
  revAction: document.getElementById('revAction'),
  revDeliverable: document.getElementById('revDeliverable'),
  revCheck: document.getElementById('revCheck'),
  revFeedback: document.getElementById('revFeedback'),
  generateRevisionBtn: document.getElementById('generateRevisionBtn'),
  revisionPreview: document.getElementById('revisionPreview'),
  revisionText: document.getElementById('revisionText'),
  approveRevisionBtn: document.getElementById('approveRevisionBtn'),
  reviewEmpty: document.getElementById('reviewEmpty'),
  reviewForm: document.getElementById('reviewForm'),
  approvedThingText: document.getElementById('approvedThingText'),
  executionResult: document.getElementById('executionResult'),
  wentWell: document.getElementById('wentWell'),
  wentWrong: document.getElementById('wentWrong'),
  feedbackEvidence: document.getElementById('feedbackEvidence'),
  nextImprovement: document.getElementById('nextImprovement'),
  solidifyMethod: document.getElementById('solidifyMethod'),
  reviewResult: document.getElementById('reviewResult'),
  historyStats: document.getElementById('historyStats'),
  historyList: document.getElementById('historyList'),
  exportBtn: document.getElementById('exportBtn'),
  criterionTemplate: document.getElementById('criterionTemplate')
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
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return {
      memberName: typeof parsed.memberName === 'string' ? parsed.memberName : '',
      records: Array.isArray(parsed.records) ? parsed.records : []
    };
  } catch {
    return { memberName: '', records: [] };
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function uid() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function createRecord({ name, originalText, approvedText, audit, revised }) {
  const existingIndex = state.records.findIndex((record) => record.date === todayKey() && record.name === name);
  const record = {
    id: existingIndex >= 0 ? state.records[existingIndex].id : uid(),
    date: todayKey(),
    createdAt: new Date().toISOString(),
    name,
    originalText,
    approvedText,
    revised,
    audit: audit.criteria.map(({ key, name: criterionName, passed }) => ({ key, name: criterionName, passed })),
    status: 'approved',
    review: null
  };
  state.memberName = name;
  if (existingIndex >= 0) {
    state.records.splice(existingIndex, 1);
  }
  state.records.unshift(record);
  activeRecordId = record.id;
  saveState();
  return record;
}

function findTodayApprovedRecord() {
  return state.records.find((record) => record.date === todayKey() && ['approved', 'reviewed'].includes(record.status));
}

function renderAudit(audit) {
  els.auditResult.hidden = false;
  els.auditResult.className = `result-panel ${audit.passed ? 'pass' : 'revise'}`;
  els.auditResult.innerHTML = '';

  const title = document.createElement('div');
  title.className = 'result-title';
  title.innerHTML = `
    <h3>${audit.passed ? '审核通过，可以开始做' : '暂不通过，需要再拆小一点'}</h3>
    <span class="status-chip ${audit.passed ? 'pass' : 'revise'}">${audit.score}/6 项通过</span>
  `;
  els.auditResult.appendChild(title);

  const list = document.createElement('ul');
  list.className = 'criteria-list';
  audit.criteria.forEach((criterion) => {
    const row = els.criterionTemplate.content.firstElementChild.cloneNode(true);
    row.classList.add(criterion.passed ? 'is-pass' : 'is-fail');
    row.querySelector('strong').textContent = criterion.name;
    row.querySelector('p').textContent = criterion.passed ? criterion.pass : criterion.fail;
    list.appendChild(row);
  });
  els.auditResult.appendChild(list);

  if (audit.passed) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'primary-action';
    button.style.marginTop = '16px';
    button.textContent = '确认并开始执行';
    button.addEventListener('click', () => {
      const name = cleanText(els.memberName.value);
      createRecord({
        name,
        originalText: audit.text,
        approvedText: audit.text,
        audit,
        revised: false
      });
      showSavedPlan(audit.text);
    });
    els.auditResult.appendChild(button);
    els.revisionBuilder.hidden = true;
  } else {
    els.revisionBuilder.hidden = false;
    prefillRevision(audit.text);
    els.revisionBuilder.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function prefillRevision(original) {
  els.revTime.value = '45分钟';
  els.revAction.value = original.replace(/^今天(我)?/, '').replace(/[。；;]$/, '') || '完成1个具体动作';
  els.revDeliverable.value = guessDeliverable(original);
  els.revCheck.value = '是否按数量完成、结果是否清楚、下次是否还能继续使用';
  els.revFeedback.value = '晚上自己复盘，并请AI或1位伙伴给出反馈';
  els.revisionPreview.hidden = true;
}

function buildRevisionText() {
  const time = cleanText(els.revTime.value);
  const action = cleanText(els.revAction.value);
  const deliverable = cleanText(els.revDeliverable.value);
  const check = cleanText(els.revCheck.value);
  const feedback = cleanText(els.revFeedback.value);
  if (![time, action, deliverable, check, feedback].every(Boolean)) return '';
  return `今天我用${time}，完成${action}，留下${deliverable}。做完后检查${check}；反馈方式是${feedback}。`;
}

function showSavedPlan(text) {
  els.auditResult.hidden = false;
  els.auditResult.className = 'result-panel pass';
  els.auditResult.innerHTML = `
    <div class="result-title">
      <h3>已保存，今天就围绕这一件事做</h3>
      <span class="status-chip pass">待执行</span>
    </div>
    <p>${escapeHtml(text)}</p>
    <p style="margin-bottom:0;color:var(--muted)">晚上回来填写真实结果，系统再帮你完成复盘。</p>
  `;
  els.revisionBuilder.hidden = true;
  renderReview();
  renderHistory();
}

function renderReview() {
  const record = findTodayApprovedRecord();
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
  els.wentWell.value = review.wentWell || '';
  els.wentWrong.value = review.wentWrong || '';
  els.feedbackEvidence.value = review.feedbackEvidence || '';
  els.nextImprovement.value = review.nextImprovement || '';
  els.solidifyMethod.value = review.solidifyMethod || '';

  if (record.status === 'reviewed') {
    renderReviewResult(record);
  }
}

function renderReviewResult(record) {
  els.reviewResult.hidden = false;
  els.reviewResult.className = 'result-panel pass';
  els.reviewResult.innerHTML = `
    <div class="result-title">
      <h3>今日闭环已完成</h3>
      <span class="status-chip pass">已复盘</span>
    </div>
    <div class="review-summary">
      <div><strong>做得好的地方</strong><p>${escapeHtml(record.review.wentWell)}</p></div>
      <div><strong>需要改进的地方</strong><p>${escapeHtml(record.review.wentWrong)}</p></div>
      <div><strong>明天只改一个点</strong><p>${escapeHtml(record.review.nextImprovement)}</p></div>
      <div><strong>可以固化的做法</strong><p>${escapeHtml(record.review.solidifyMethod)}</p></div>
    </div>
  `;
}

function renderHistory() {
  const records = state.records;
  const reviewed = records.filter((record) => record.status === 'reviewed').length;
  const revised = records.filter((record) => record.revised).length;
  els.historyStats.textContent = `共 ${records.length} 条 · 完成闭环 ${reviewed} 条 · 修改后通过 ${revised} 条`;
  els.historyList.innerHTML = '';

  if (!records.length) {
    els.historyList.innerHTML = '<div class="empty-state">还没有记录。完成第一次审核后，这里会留下你的行动轨迹。</div>';
    return;
  }

  records.forEach((record) => {
    const article = document.createElement('article');
    article.className = 'history-item';
    const statusLabel = record.status === 'reviewed' ? '已闭环' : '待复盘';
    const statusClass = record.status === 'reviewed' ? 'pass' : 'revise';
    article.innerHTML = `
      <div class="history-head">
        <div>
          <strong>${escapeHtml(record.name)}</strong>
          <div class="history-meta">${record.date}${record.revised ? ' · 修改后通过' : ' · 直接通过'}</div>
        </div>
        <span class="status-chip ${statusClass}">${statusLabel}</span>
      </div>
      <p class="history-thing">${escapeHtml(record.approvedText)}</p>
      ${record.review ? `
        <details class="history-details">
          <summary>查看复盘结果</summary>
          <dl>
            <dt>实际结果</dt><dd>${escapeHtml(record.review.executionResult)}</dd>
            <dt>做得好</dt><dd>${escapeHtml(record.review.wentWell)}</dd>
            <dt>卡点</dt><dd>${escapeHtml(record.review.wentWrong)}</dd>
            <dt>反馈</dt><dd>${escapeHtml(record.review.feedbackEvidence)}</dd>
            <dt>明天改进</dt><dd>${escapeHtml(record.review.nextImprovement)}</dd>
            <dt>固化沉淀</dt><dd>${escapeHtml(record.review.solidifyMethod)}</dd>
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

els.smallThingInput.addEventListener('input', () => {
  els.thingCount.textContent = els.smallThingInput.value.length;
});

els.planForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const name = cleanText(els.memberName.value);
  const text = cleanText(els.smallThingInput.value);
  if (!name || !text) return;
  latestAudit = auditThing(text);
  renderAudit(latestAudit);
});

els.generateRevisionBtn.addEventListener('click', () => {
  const text = buildRevisionText();
  if (!text) {
    els.revisionPreview.hidden = false;
    els.revisionText.textContent = '请先把五个字段补完整。';
    return;
  }
  els.revisionText.textContent = text;
  els.revisionPreview.hidden = false;
});

els.approveRevisionBtn.addEventListener('click', () => {
  const revisedText = buildRevisionText();
  if (!revisedText || !latestAudit) return;
  const finalAudit = auditThing(revisedText);
  createRecord({
    name: cleanText(els.memberName.value),
    originalText: latestAudit.text,
    approvedText: revisedText,
    audit: finalAudit,
    revised: true
  });
  showSavedPlan(revisedText);
});

els.reviewForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const record = state.records.find((item) => item.id === activeRecordId);
  if (!record) return;
  record.review = {
    executionResult: cleanText(els.executionResult.value),
    wentWell: cleanText(els.wentWell.value),
    wentWrong: cleanText(els.wentWrong.value),
    feedbackEvidence: cleanText(els.feedbackEvidence.value),
    nextImprovement: cleanText(els.nextImprovement.value),
    solidifyMethod: cleanText(els.solidifyMethod.value),
    reviewedAt: new Date().toISOString()
  };
  record.status = 'reviewed';
  saveState();
  renderReviewResult(record);
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
renderReview();
renderHistory();

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('./service-worker.js').catch(() => {});
}
