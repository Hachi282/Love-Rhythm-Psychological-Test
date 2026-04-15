import questions from './questions.js';
import { calculateResult } from './engine.js';

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

const state = {
  status: 'loading',
  currentIndex: 0,
  answers: Array(questions.length).fill(null),
  resultsMap: null,
  resultPayload: null,
  copied: false,
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
  }
});

function resetQuiz() {
  state.currentIndex = 0;
  state.answers = Array(questions.length).fill(null);
  state.resultPayload = null;
  state.copied = false;
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
    location.href
  ].join('\n');

  try {
    await navigator.clipboard.writeText(shareText);
    state.copied = true;
  } catch (error) {
    state.copied = false;
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
          <div class="cta-row">
            <button class="button button-primary" data-action="start">開始測驗</button>
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

  return `
    <section class="view-card result-card">
      <div class="result-heading">
        <div>
          <p class="section-tag">Result</p>
          <h2>${result.title}</h2>
          <p class="result-summary">${profile.summary}</p>
          <div class="meta-chips" aria-label="結果摘要">
            <span class="meta-chip">關係定位：${profile.role}</span>
            <span class="meta-chip">情感節奏：${profile.intensity}</span>
          </div>
        </div>
        <div class="result-actions">
          <button class="button button-primary button-compact" type="button" data-action="share">
            ${state.copied ? '已複製結果' : '複製分享文字'}
          </button>
          <button class="button button-secondary button-compact" type="button" data-action="restart">再測一次</button>
        </div>
      </div>

      <div class="result-layout">
        <div class="result-main">
          <article class="feature-block">
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

          <article class="copy-block">
            <h3>人格分析</h3>
            <p>${result.analysis}</p>
          </article>

          <article class="copy-block quote-block">
            <h3>專屬對白</h3>
            <blockquote>${result.dialogue}</blockquote>
          </article>
        </div>

        <aside class="result-side">
          <div class="score-card">
            <h3>妳的關係輪廓</h3>
            <p>這三個分數不是標準答案，而是用來看妳的愛情節奏會往哪個方向傾斜。</p>
            ${axisMeta.map((axis) => renderAxis(axis, scores[axis.key])).join('')}
          </div>
        </aside>
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
    'Omega / submissive': '深度依附型'
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
