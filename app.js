import questions from './questions.js';
import { calculateResult } from './engine.js';
import resultDetails from './result-details.js';

const app = document.querySelector('#app');

const axisMeta = [
  {
    key: 'c',
    label: '掌控傾向',
    description: '看妳在關係裡更想主導節奏，還是順著對方的步調流動。',
    positive: '偏主導',
    negative: '偏順勢'
  },
  {
    key: 'e',
    label: '情緒張力',
    description: '看妳更習慣強烈表達，還是以冷靜、克制的方式推進關係。',
    positive: '偏外放',
    negative: '偏克制'
  },
  {
    key: 'i',
    label: '依附方式',
    description: '看妳更迷戀征服與刺激，還是陪伴、融合與沉浸式靠近。',
    positive: '偏刺激 / 征服',
    negative: '偏陪伴 / 融合'
  }
];

const detailMeta = [
  { key: 'loveLike', label: '妳愛起來像' },
  { key: 'fear', label: '妳其實怕的是' },
  { key: 'misread', label: '別人最容易看錯妳的地方' },
  { key: 'desire', label: '妳真正想被怎麼愛' },
  { key: 'warning', label: '先別讓自己走到這裡' }
];

const state = {
  status: 'loading',
  currentIndex: 0,
  answers: Array(questions.length).fill(null),
  resultsMap: null,
  resultPayload: null,
  copied: false,
  pairCopied: false,
  pairSeed: null,
  errorMessage: ''
};

const axisMaximums = getAxisMaximums(questions);

init();

async function init() {
  try {
    const response = await fetch('./results.json');

    if (!response.ok) {
      throw new Error(`Failed to load results.json (${response.status})`);
    }

    state.resultsMap = await response.json();
    state.pairSeed = getPairSeedFromUrl();
    state.status = 'intro';
  } catch (error) {
    state.status = 'error';
    state.errorMessage = '載入結果庫失敗，請確認 GitHub Pages 已正確部署所有檔案。';
    console.error(error);
  }

  render();
}

app.addEventListener('click', async (event) => {
  const target = event.target.closest('[data-action]');

  if (!target) {
    return;
  }

  const { action } = target.dataset;

  if (action === 'start') {
    resetQuiz();
    state.status = 'question';
    render();
    return;
  }

  if (action === 'select') {
    const { optionIndex } = target.dataset;
    state.answers[state.currentIndex] = Number(optionIndex);
    render();
    return;
  }

  if (action === 'next') {
    if (state.answers[state.currentIndex] == null) {
      return;
    }

    if (state.currentIndex === questions.length - 1) {
      finishQuiz();
      return;
    }

    state.currentIndex += 1;
    render();
    return;
  }

  if (action === 'back') {
    state.currentIndex = Math.max(0, state.currentIndex - 1);
    render();
    return;
  }

  if (action === 'restart') {
    state.status = 'intro';
    resetQuiz();
    render();
    return;
  }

  if (action === 'share') {
    await copyResult();
    render();
    return;
  }

  if (action === 'share-pair') {
    await copyPairLink();
    render();
    return;
  }

  if (action === 'clear-pair') {
    clearPairSeed();
    render();
  }
});

function resetQuiz() {
  state.currentIndex = 0;
  state.answers = Array(questions.length).fill(null);
  state.resultPayload = null;
  state.copied = false;
  state.pairCopied = false;
  state.errorMessage = '';
}

function finishQuiz() {
  try {
    state.resultPayload = calculateResult(state.answers, state.resultsMap);
    state.status = 'result';
    state.copied = false;
  } catch (error) {
    state.status = 'error';
    state.errorMessage = '計算結果時發生問題，請重新整理後再試一次。';
    console.error(error);
  }

  render();
}

async function copyResult() {
  if (!state.resultPayload?.result) {
    return;
  }

  const { result, intensity } = state.resultPayload;
  const profile = getProfileCopy(result.attribute, intensity);
  const shareText = [
    `我的測驗結果是《${result.title}》`,
    `關係定位：${profile.role}`,
    `情感節奏：${profile.intensity}`,
    `推薦歌曲：${result.song}`,
    getBasePageUrl()
  ].join('\n');

  try {
    await navigator.clipboard.writeText(shareText);
    state.copied = true;
  } catch (error) {
    state.copied = false;
    console.error(error);
  }
}

async function copyPairLink() {
  if (!state.resultPayload?.result) {
    return;
  }

  const pairUrl = buildPairUrl(state.resultPayload);
  const shareText = [
    `我先測完了，換妳。`,
    '做完之後，網站會直接把我們的結果放在一起對照。',
    pairUrl
  ].join('\n');

  try {
    await navigator.clipboard.writeText(shareText);
    state.pairCopied = true;
  } catch (error) {
    state.pairCopied = false;
    console.error(error);
  }
}

function render() {
  document.body.dataset.view = state.status;

  if (state.status === 'loading') {
    app.innerHTML = renderLoading();
    return;
  }

  if (state.status === 'intro') {
    app.innerHTML = renderIntro();
    return;
  }

  if (state.status === 'question') {
    app.innerHTML = renderQuestion();
    return;
  }

  if (state.status === 'result') {
    app.innerHTML = renderResult();
    return;
  }

  app.innerHTML = renderError();
}

function renderLoading() {
  return `
    <section class="view-card view-card-centered">
      <div class="status-block">
        <span class="status-dot"></span>
        <p>正在讀取題庫與結果庫...</p>
      </div>
    </section>
  `;
}

function renderIntro() {
  return `
    <section class="view-card hero-card">
      <div class="hero-grid">
        <div>
          <p class="section-tag">開始之前</p>
          <h2>把妳的愛情，翻譯成一首歌的節奏。</h2>
          <p class="body-copy">
            每一題都會替三個軸向累積分數，最後組合出 16 種人格結果，附上分析、對白與推薦歌曲。
          </p>
          ${state.pairSeed ? renderPairHint() : ''}
          <div class="cta-row">
            <button class="button button-primary" data-action="start">${state.pairSeed ? '開始妳的部分' : '開始測驗'}</button>
            ${state.pairSeed ? '<button class="button button-secondary" data-action="clear-pair">先不要配對</button>' : ''}
          </div>
        </div>

        <div class="info-stack">
          <article class="info-card">
            <span class="info-kicker">題型</span>
            <strong>單題四選一</strong>
            <p>依直覺作答，整體結果會比單題更準。</p>
          </article>
          <article class="info-card">
            <span class="info-kicker">耗時</span>
            <strong>約 2 分鐘</strong>
            <p>手機上也能一路順暢答完，不需要安裝任何 App。</p>
          </article>
          <article class="info-card">
            <span class="info-kicker">結果</span>
            <strong>16 種人格分析</strong>
            <p>會顯示角色類型、情感強度、三軸分數與分享文案。</p>
          </article>
        </div>
      </div>
    </section>
  `;
}

function renderPairHint() {
  return `
    <article class="pair-hint">
      <span class="info-kicker">雙人模式</span>
      <strong>她先測出了《${state.pairSeed.title}》</strong>
      <p>這次輪到妳。做完後，網站會直接把妳們兩個的節奏放在一起看。</p>
    </article>
  `;
}

function renderQuestion() {
  const question = questions[state.currentIndex];
  const selectedAnswer = state.answers[state.currentIndex];
  const answeredCount = state.answers.filter((answer) => answer != null).length;
  const progressValue = ((state.currentIndex + 1) / questions.length) * 100;

  return `
    <section class="view-card question-card">
      <div class="progress-header">
        <div>
          <p class="section-tag">Question ${state.currentIndex + 1}</p>
          <h2>第 ${state.currentIndex + 1} 題 / 共 ${questions.length} 題</h2>
        </div>
        <p class="progress-copy">已作答 ${answeredCount} / ${questions.length}</p>
      </div>

      <div class="progress-track" aria-hidden="true">
        <span class="progress-fill" style="width: ${progressValue}%"></span>
      </div>

      <article class="question-block">
        <h3>${question.text}</h3>
        <div class="options-grid">
          ${question.options
            .map((option, optionIndex) => {
              const selectedClass = selectedAnswer === optionIndex ? 'is-selected' : '';

              return `
                <button
                  class="option-card ${selectedClass}"
                  type="button"
                  data-action="select"
                  data-option-index="${optionIndex}"
                >
                  <span class="option-index">0${optionIndex + 1}</span>
                  <span class="option-text">${option.text}</span>
                </button>
              `;
            })
            .join('')}
        </div>
      </article>

      <div class="nav-row">
        <button
          class="button button-secondary"
          type="button"
          data-action="back"
          ${state.currentIndex === 0 ? 'disabled' : ''}
        >
          上一題
        </button>
        <button
          class="button button-primary"
          type="button"
          data-action="next"
          ${selectedAnswer == null ? 'disabled' : ''}
        >
          ${state.currentIndex === questions.length - 1 ? '看結果' : '下一題'}
        </button>
      </div>
    </section>
  `;
}

function renderResult() {
  const { result, scores, intensity } = state.resultPayload;
  const profile = getProfileCopy(result.attribute, intensity);
  const songLinks = getSongLinks(result.song);
  const details = resultDetails[state.resultPayload.key];
  const pairAnalysis = state.pairSeed ? getPairAnalysis(state.resultPayload, state.pairSeed) : null;

  return `
    <section class="view-card result-card">
      <div class="result-hero">
        <div class="result-identity">
          <p class="section-tag">Result</p>
          <h2>${result.title}</h2>
          <p class="result-summary">${profile.summary}</p>
          <div class="meta-chips" aria-label="結果摘要">
            <span class="meta-chip">關係定位：${profile.role}</span>
            <span class="meta-chip">情感節奏：${profile.intensity}</span>
          </div>
        </div>
        <div class="result-toolbar" aria-label="結果操作">
          <button class="button button-primary button-compact" type="button" data-action="share">
            ${state.copied ? '已複製結果' : '複製結果文字'}
          </button>
          <button class="button button-secondary button-compact" type="button" data-action="restart">再測一次</button>
        </div>
      </div>

      <div class="result-overview">
        <article class="feature-block result-song-card">
          <span class="feature-label">推薦歌曲</span>
          <p class="feature-song">${result.song}</p>
          <div class="song-links">
            <a class="button button-secondary button-link button-compact" href="${songLinks.youtube}" target="_blank" rel="noreferrer">
              YouTube 試聽
            </a>
            <a class="button button-secondary button-link button-compact" href="${songLinks.spotify}" target="_blank" rel="noreferrer">
              Spotify 搜尋
            </a>
          </div>
        </article>

        <div class="result-overview-stack">
          <article class="copy-block result-spotlight">
            <div class="section-stack">
              <span class="feature-label">人格分析</span>
              <h3>妳的感情，不太會只是剛好而已</h3>
            </div>
            <p>${result.analysis}</p>
          </article>

          <article class="copy-block quote-block quote-card">
            <span class="feature-label">專屬對白</span>
            <blockquote>${result.dialogue}</blockquote>
          </article>
        </div>
      </div>

      <div class="result-body">
        <div class="result-main">
          ${details ? renderDetailBlock(details) : ''}
        </div>
        <aside class="result-side">
          <div class="score-card">
            <h3>妳的關係輪廓</h3>
            <p>這三個分數不是標準答案，而是用來看妳的愛情節奏會往哪個方向傾斜。</p>
            ${axisMeta.map((axis) => renderAxis(axis, scores[axis.key])).join('')}
          </div>
        </aside>
      </div>

      ${pairAnalysis ? renderPairPanel(pairAnalysis) : renderPairInvite()}
    </section>
  `;
}

function renderDetailBlock(details) {
  return `
    <article class="copy-block detail-block">
      <div class="section-stack">
        <span class="feature-label">再往下一點</span>
        <h3>那些妳嘴上不一定會先說的</h3>
      </div>
      <div class="detail-grid">
        ${detailMeta
          .map(
            (item) => `
              <div class="detail-card">
                <span class="detail-label">${item.label}</span>
                <p>${details[item.key]}</p>
              </div>
            `
          )
          .join('')}
      </div>
    </article>
  `;
}

function renderPairInvite() {
  return `
    <section class="pair-panel pair-panel-invite">
      <div class="pair-panel-head">
        <div>
          <p class="section-tag">Pair Mode</p>
          <h3>想看她跟妳是不是同一種瘋法？</h3>
          <p>把專屬連結丟給她。她做完之後，網站會直接把妳們兩個的結果放在一起對照。</p>
        </div>
        <div class="pair-actions">
          <button class="button button-primary button-compact" type="button" data-action="share-pair">
            ${state.pairCopied ? '已複製配對連結' : '丟給她來測'}
          </button>
        </div>
      </div>
    </section>
  `;
}

function renderPairPanel(pairAnalysis) {
  return `
    <section class="pair-panel">
      <div class="pair-panel-head">
        <div>
          <p class="section-tag">Pair Mode</p>
          <h3>妳們兩個放在一起看</h3>
          <p>${pairAnalysis.summary}</p>
        </div>
        <div class="pair-actions">
          <span class="pair-mode">${pairAnalysis.mode}</span>
          <span class="pair-outlook">${pairAnalysis.outlook}</span>
          <button class="button button-secondary button-compact" type="button" data-action="clear-pair">清掉她的結果</button>
        </div>
      </div>

      <div class="pair-pill-row">
        <span class="pair-pill">她先測出：${state.pairSeed.title}</span>
        <span class="pair-pill">妳這次是：${state.resultPayload.result.title}</span>
      </div>

      <div class="pair-grid">
        ${pairAnalysis.cards
          .map(
            (card) => `
              <article class="pair-card">
                <span class="detail-label">${card.label}</span>
                <p>${card.text}</p>
              </article>
            `
          )
          .join('')}
      </div>
    </section>
  `;
}

function renderAxis(axis, value) {
  const max = axisMaximums[axis.key] || 1;
  const width = `${(Math.abs(value) / max) * 100}%`;
  const directionClass = value >= 0 ? 'is-positive' : 'is-negative';
  const signedValue = value > 0 ? `+${value}` : `${value}`;
  const tendency = value >= 0 ? axis.positive : axis.negative;

  return `
    <div class="axis-row">
      <div class="axis-head">
        <div class="axis-copy">
          <span class="axis-label">${axis.label}</span>
          <p class="axis-description">${axis.description}</p>
        </div>
        <div class="axis-value">
          <strong>${signedValue}</strong>
          <span>${tendency}</span>
        </div>
      </div>
      <div class="axis-track">
        <span class="axis-fill ${directionClass}" style="width: ${width}"></span>
      </div>
    </div>
  `;
}

function renderError() {
  return `
    <section class="view-card view-card-centered">
      <div class="error-block">
        <p class="section-tag">Error</p>
        <h2>頁面沒有成功初始化</h2>
        <p>${state.errorMessage || '請重新整理頁面，或確認所有檔案都已經上傳。'}</p>
        <button class="button button-primary" type="button" data-action="restart">回到首頁</button>
      </div>
    </section>
  `;
}

function getAxisMaximums(questionList) {
  return questionList.reduce(
    (totals, question) => {
      const localMax = { c: 0, e: 0, i: 0 };

      question.options.forEach((option) => {
        localMax.c = Math.max(localMax.c, Math.abs(option.score.c));
        localMax.e = Math.max(localMax.e, Math.abs(option.score.e));
        localMax.i = Math.max(localMax.i, Math.abs(option.score.i));
      });

      totals.c += localMax.c;
      totals.e += localMax.e;
      totals.i += localMax.i;

      return totals;
    },
    { c: 0, e: 0, i: 0 }
  );
}

function getProfileCopy(attribute, intensity) {
  const roleMap = {
    'Alpha / Dom': '溫柔主導型',
    'Alpha / Dominant': '強勢主導型',
    'Omega / Switch': '流動切換型',
    'Omega / submissive': '深度依附型',
    '領奏者 (The Lead)': '領奏者',
    '轉調者 (The Modulator)': '轉調者',
    '和聲者 (The Harmony)': '和聲者'
  };

  const intensityMap = {
    MOD: '穩定堆疊型',
    EXT: '高張力爆發型'
  };

  const role = roleMap[attribute] || attribute;
  const intensityLabelText = intensityMap[intensity] || intensity;

  return {
    role,
    intensity: intensityLabelText,
    summary: `妳在關係裡偏向 ${role}，情感表達則更接近 ${intensityLabelText}。`
  };
}

function getSongLinks(song) {
  const query = encodeURIComponent(song);

  return {
    youtube: `https://www.youtube.com/results?search_query=${query}`,
    spotify: `https://open.spotify.com/search/${query}`
  };
}

function getBasePageUrl() {
  const url = new URL(window.location.href);
  url.search = '';
  url.hash = '';
  return url.toString();
}

function buildPairUrl(resultPayload) {
  const url = new URL(getBasePageUrl());
  url.searchParams.set('pair', encodePairPayload(getPairPayload(resultPayload)));
  return url.toString();
}

function getPairPayload(resultPayload) {
  return {
    key: resultPayload.key,
    title: resultPayload.result.title,
    attribute: resultPayload.result.attribute,
    intensity: resultPayload.intensity,
    scores: resultPayload.scores
  };
}

function getPairSeedFromUrl() {
  const url = new URL(window.location.href);
  const raw = url.searchParams.get('pair');

  if (!raw) {
    return null;
  }

  try {
    const payload = decodePairPayload(raw);
    return isValidPairPayload(payload) ? payload : null;
  } catch (error) {
    console.error(error);
    return null;
  }
}

function clearPairSeed() {
  state.pairSeed = null;
  state.pairCopied = false;

  const url = new URL(window.location.href);
  url.searchParams.delete('pair');
  window.history.replaceState({}, '', url.toString());
}

function encodePairPayload(payload) {
  const json = JSON.stringify(payload);
  const bytes = new TextEncoder().encode(json);
  let binary = '';

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function decodePairPayload(encoded) {
  const normalized = encoded.replace(/-/g, '+').replace(/_/g, '/');
  const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
  const binary = atob(normalized + padding);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));

  return JSON.parse(new TextDecoder().decode(bytes));
}

function isValidPairPayload(payload) {
  return Boolean(
    payload &&
      typeof payload.key === 'string' &&
      typeof payload.title === 'string' &&
      typeof payload.attribute === 'string' &&
      typeof payload.intensity === 'string' &&
      payload.scores &&
      ['c', 'e', 'i'].every((axis) => typeof payload.scores[axis] === 'number')
  );
}

function getPairAnalysis(currentPayload, partnerPayload) {
  const diffs = axisMeta.map((axis) => ({
    ...axis,
    diff: Math.abs(currentPayload.scores[axis.key] - partnerPayload.scores[axis.key])
  }));
  const [closestAxis] = [...diffs].sort((left, right) => left.diff - right.diff);
  const [widestAxis] = [...diffs].sort((left, right) => right.diff - left.diff);
  const totalGap = diffs.reduce((sum, axis) => sum + axis.diff, 0);
  const closeAxisCount = diffs.filter((axis) => axis.diff <= 1).length;
  const wideAxisCount = diffs.filter((axis) => axis.diff >= 3).length;
  const sameSideCount = axisMeta.filter((axis) => {
    const left = Math.sign(currentPayload.scores[axis.key]);
    const right = Math.sign(partnerPayload.scores[axis.key]);
    return left === right;
  }).length;
  const mode = getPairMode(totalGap, sameSideCount, closeAxisCount, wideAxisCount, currentPayload, partnerPayload);

  return {
    mode: mode.label,
    outlook: mode.outlook,
    summary: getPairSummary(mode.key, totalGap, sameSideCount, currentPayload, partnerPayload),
    cards: [
      {
        label: '這組真的合得來的地方',
        text: getPairFitLine(mode.key, closestAxis.key, currentPayload, partnerPayload)
      },
      {
        label: '先把妳們吸住的地方',
        text: getPairAttractionLine(closestAxis.key, currentPayload, partnerPayload)
      },
      {
        label: '之後最容易卡住的地方',
        text: getPairFrictionLine(widestAxis.key, currentPayload, partnerPayload)
      },
      {
        label: '真的走音時會怎樣',
        text: getPairConflictLine(currentPayload, partnerPayload)
      },
      {
        label: '如果想走久一點',
        text: getPairAdviceLine(widestAxis.key, currentPayload, partnerPayload)
      }
    ]
  };
}

function getPairMode(totalGap, sameSideCount, closeAxisCount, wideAxisCount, currentPayload, partnerPayload) {
  if (currentPayload.key === partnerPayload.key) {
    return { key: 'mirror', label: '鏡像共振', outlook: '很合拍，但會互相放大' };
  }

  if (totalGap <= 3 || (closeAxisCount >= 2 && sameSideCount >= 2 && totalGap <= 5)) {
    return { key: 'steady', label: '穩定同頻', outlook: '最容易順著愛下去' };
  }

  if (sameSideCount === 3 && totalGap <= 7) {
    return { key: 'aligned', label: '默契靠近', outlook: '磨合成本低' };
  }

  if (sameSideCount <= 1 && wideAxisCount >= 2) {
    return { key: 'contrast', label: '高張反差', outlook: '火花強，衝擊也強' };
  }

  if (sameSideCount <= 1) {
    return { key: 'complement', label: '互補成形', outlook: '有機會補到彼此的缺口' };
  }

  return { key: 'tension', label: '曖昧拉扯', outlook: '能不能合，要看會不會講清楚' };
}

function getPairSummary(modeKey, totalGap, sameSideCount, currentPayload, partnerPayload) {
  if (modeKey === 'mirror') {
    return '妳們像是同一首歌的不同段落。懂彼此很快，踩到彼此最敏感的地方也會很快。';
  }

  if (modeKey === 'steady') {
    return '這組是真的偏合得來。不是沒有摩擦，而是妳們大多數時候用的是相近的語言，很多事不用硬翻譯。';
  }

  if (modeKey === 'aligned') {
    return '妳們的底色很接近，靠近的方式也差不多。這種組合通常不難開始，難的是別把默契當成理所當然。';
  }

  if (modeKey === 'contrast') {
    return '這組不是沒有可能，只是很吃成熟度。妳們很容易被彼此沒有的那一塊吸住，但也很容易因為差太多而磨到發燙。';
  }

  if (modeKey === 'complement') {
    return '妳們不是同一種人，反而有機會把對方缺的那一塊補起來。這種組合能不能走久，關鍵不在相不像，而在會不會翻譯彼此。';
  }

  return '妳們有幾處真的對得上，也保留幾處很容易錯拍的反差。這不是注定會撞的組合，但確實需要比別人更會說清楚。';
}

function getPairFitLine(modeKey, axisKey, currentPayload, partnerPayload) {
  const current = currentPayload.scores[axisKey];
  const partner = partnerPayload.scores[axisKey];

  if (modeKey === 'mirror') {
    return '妳們最合得來的，是很多細節幾乎不用解釋。她懂妳不是靠猜，而是因為她自己也差不多就是這樣愛人的。';
  }

  if (axisKey === 'c') {
    if (Math.sign(current) === Math.sign(partner) && current >= 0) {
      return '妳們都不怕把節奏抓在手裡，做決定的速度和態度很像，所以很多事不需要互相拖著走。';
    }

    if (Math.sign(current) === Math.sign(partner) && current < 0) {
      return '妳們都不是非得壓場才安心的人，反而比較會在留白和舒服的節奏裡慢慢靠近。';
    }

    return '一個比較會定方向，一個比較會接節奏。搭得好時，這種分工反而很穩。';
  }

  if (axisKey === 'e') {
    if (current > 0 && partner > 0) {
      return '妳們對情緒濃度的接受度差不多，很多熱烈和直接，在彼此這裡反而不需要被縮小。';
    }

    if (current < 0 && partner < 0) {
      return '妳們都懂那種不必把每句話都喊出來的靠近，所以相處起來比較不需要硬撐場面。';
    }

    return '一個比較敢把情緒打開，一個比較會把場面收穩。對得上的時候，剛好能讓關係不至於失控。';
  }

  if (current > 0 && partner > 0) {
    return '妳們對拉扯、刺激和心動感的想像很接近，很多別人覺得太燙的節奏，妳們反而覺得剛好。';
  }

  if (current < 0 && partner < 0) {
    return '妳們都更懂陪伴型的靠近，願意把關係養深。這種組合通常不是最快上頭，卻常常最能沉下去。';
  }

  return '妳們靠近的方式不同，但剛好各自帶著對方沒有的那一面，所以相處得好時，反而很完整。';
}

function getPairAttractionLine(axisKey, currentPayload, partnerPayload) {
  const current = currentPayload.scores[axisKey];
  const partner = partnerPayload.scores[axisKey];

  if (axisKey === 'c') {
    if (Math.sign(current) === Math.sign(partner) && current >= 0) {
      return '妳們都不太肯把主導權白白讓出去，所以會先被彼此那種「她不是好惹的」的感覺吸住。';
    }

    if (Math.sign(current) === Math.sign(partner) && current < 0) {
      return '妳們都不是一上來就想壓場的人，反而容易在那種不用逞強的鬆裡慢慢靠近。';
    }

    return '一個習慣掌舵，一個比較順勢，這種分工本身就很容易讓人上癮。';
  }

  if (axisKey === 'e') {
    if (current > 0 && partner > 0) {
      return '妳們對情緒濃度都不低，火花會來得很快，也很難裝作沒事。';
    }

    if (current < 0 && partner < 0) {
      return '妳們都不愛亂灑情緒，所以真正吸引人的，反而是那種不用說太多就懂的默契。';
    }

    return '一個會把氣氛點起來，一個會讓節奏穩住，這種反差很容易互相著迷。';
  }

  if (current > 0 && partner > 0) {
    return '妳們都吃刺激和拉扯，所以曖昧期特別容易上頭。';
  }

  if (current < 0 && partner < 0) {
    return '妳們都比較懂陪伴式的靠近，感情會在不聲不響裡慢慢沉下去。';
  }

  return '一個迷戀拉扯，一個渴望貼近，最先讓妳們心動的就是這種不一樣。';
}

function getPairFrictionLine(axisKey, currentPayload, partnerPayload) {
  if (axisKey === 'c') {
    return '最容易卡住的是誰來定節奏。靠太近時，一個會覺得自己被壓住，另一個會覺得對方怎麼總是不肯講清楚。';
  }

  if (axisKey === 'e') {
    return '最容易走音的是情緒濃度。一個要把感受放到檯面上，一個習慣先收住，久了誰都覺得自己沒被懂。';
  }

  return '最容易失手的是對親密的理解。一個想要刺激感，一個想要安穩感，越愛越容易各自翻譯。';
}

function getPairConflictLine(currentPayload, partnerPayload) {
  const currentE = currentPayload.scores.e;
  const partnerE = partnerPayload.scores.e;

  if (currentE - partnerE >= 2) {
    return '真的吵起來，多半是妳先把情緒拉高，她比較像先退、先收，或者先裝作沒事。';
  }

  if (partnerE - currentE >= 2) {
    return '真的吵起來，通常是她先把張力往上推，妳反而會先想把場面收住。';
  }

  if (currentE > 0 && partnerE > 0) {
    return '妳們兩個都不是省火的人，一旦撞到點上，很容易越講越烈，誰都不想先退。';
  }

  if (currentE < 0 && partnerE < 0) {
    return '妳們最危險的不是大吵，而是兩個人都悶著不說，表面很平，底下其實全在積水。';
  }

  return '妳們吵起來不一定很大聲，但節奏很容易一個急、一個慢，誰都覺得自己有說，卻沒被接到。';
}

function getPairAdviceLine(axisKey) {
  if (axisKey === 'c') {
    return '如果想走久一點，最先要講清楚的不是愛不愛，而是誰決定節奏、誰又可以喊停。';
  }

  if (axisKey === 'e') {
    return '如果想走久一點，情緒高的那個要學會留白，情緒低的那個也要學會把話說明白。';
  }

  return '如果想走久一點，要先對齊妳們對親密的想像，不然越投入，越容易各自在不同語言裡受傷。';
}
