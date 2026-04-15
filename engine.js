import questions from './questions.js';

export function calculateScores(userAnswers) {
  const scores = { c: 0, e: 0, i: 0 };

  userAnswers.forEach((answerIndex, questionIndex) => {
    if (answerIndex == null) {
      return;
    }

    const question = questions[questionIndex];
    const option = question?.options?.[answerIndex];

    if (!option) {
      throw new Error(`Invalid answer index at question ${questionIndex + 1}`);
    }

    scores.c += option.score.c;
    scores.e += option.score.e;
    scores.i += option.score.i;
  });

  return scores;
}

export function getResultKey(scores) {
  const cDir = scores.c >= 0 ? 'P' : 'N';
  const eDir = scores.e >= 0 ? 'P' : 'N';
  const iDir = scores.i >= 0 ? 'P' : 'N';
  const totalIntensity = Math.abs(scores.c) + Math.abs(scores.e) + Math.abs(scores.i);
  const intensity = totalIntensity > 7 ? 'EXT' : 'MOD';

  return {
    key: `RES_${cDir}${eDir}${iDir}_${intensity}`,
    fallbackKey: `RES_${cDir}${eDir}${iDir}_MOD`,
    intensity
  };
}

export function calculateResult(userAnswers, resultMap) {
  if (!resultMap) {
    throw new Error('calculateResult requires a result map.');
  }

  const scores = calculateScores(userAnswers);
  const { key, fallbackKey, intensity } = getResultKey(scores);

  return {
    key,
    result: resultMap[key] || resultMap[fallbackKey],
    scores,
    intensity
  };
}
