import { formatPercent, formatSignedWon, formatWon } from './formatters.js';

const clampText = (value, fallback = '-') => value ?? fallback;

const getTrendTone = (diff) => {
  if (diff > 0) return 'up';
  if (diff < 0) return 'down';
  return 'flat';
};

const getTrendWord = (diff, rate) => {
  if (diff > 0 && Math.abs(rate) >= 3) return '강한 상승세';
  if (diff > 0) return '완만한 상승세';
  if (diff < 0 && Math.abs(rate) >= 3) return '강한 하락세';
  if (diff < 0) return '완만한 하락세';
  return '보합세';
};

const getPositionText = (latest, average) => {
  if (!latest || !average) return '평균과 비교할 데이터가 부족합니다.';

  const gap = latest - average;
  const gapRate = average ? (gap / average) * 100 : 0;

  if (gap > 0) {
    return `현재가는 조회 기간 평균보다 ${formatWon(Math.abs(gap))} 높고, 평균 대비 ${formatPercent(gapRate)} 수준입니다.`;
  }

  if (gap < 0) {
    return `현재가는 조회 기간 평균보다 ${formatWon(Math.abs(gap))} 낮고, 평균 대비 ${formatPercent(gapRate)} 수준입니다.`;
  }

  return '현재가는 조회 기간 평균과 거의 같은 수준입니다.';
};

const getVolatility = (series) => {
  if (series.length < 2) {
    return {
      averageMove: 0,
      maxMove: 0,
      level: '낮음',
      description: '비교할 날짜가 부족해 변동성 판단이 어렵습니다.',
    };
  }

  const moves = series.slice(1).map((point, index) => Math.abs(Number(point.price) - Number(series[index].price)));
  const prices = series.map((point) => Number(point.price)).filter((price) => !Number.isNaN(price));
  const averagePrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
  const averageMove = moves.reduce((sum, move) => sum + move, 0) / moves.length;
  const maxMove = Math.max(...moves);
  const volatilityRate = averagePrice ? (averageMove / averagePrice) * 100 : 0;

  if (volatilityRate >= 4) {
    return {
      averageMove: Math.round(averageMove),
      maxMove,
      level: '높음',
      description: `일별 평균 변동폭이 ${formatWon(Math.round(averageMove))}로 큰 편입니다. 가격 흐름이 빠르게 바뀔 수 있어 추세 확인이 필요합니다.`,
    };
  }

  if (volatilityRate >= 1.5) {
    return {
      averageMove: Math.round(averageMove),
      maxMove,
      level: '보통',
      description: `일별 평균 변동폭이 ${formatWon(Math.round(averageMove))}입니다. 급등락보다는 완만한 움직임으로 볼 수 있습니다.`,
    };
  }

  return {
    averageMove: Math.round(averageMove),
    maxMove,
    level: '낮음',
    description: `일별 평균 변동폭이 ${formatWon(Math.round(averageMove))}로 낮은 편입니다. 가격이 비교적 안정적으로 움직이고 있습니다.`,
  };
};

const getPeakText = (series, stats) => {
  const highest = series.find((point) => Number(point.price) === Number(stats.max));
  const lowest = series.find((point) => Number(point.price) === Number(stats.min));

  return `조회 기간 최고가는 ${clampText(highest?.date)}의 ${formatWon(stats.max)}, 최저가는 ${clampText(lowest?.date)}의 ${formatWon(stats.min)}입니다.`;
};

const getRecommendation = (trendWord, volatilityLevel) => {
  if (trendWord.includes('상승') && volatilityLevel === '높음') {
    return '상승폭과 변동성이 함께 커지고 있어, 다음 갱신 데이터에서 상승이 이어지는지 확인하는 것이 좋습니다.';
  }

  if (trendWord.includes('상승')) {
    return '완만한 상승 흐름입니다. 평균가보다 높은 구간인지 함께 확인하면 가격 판단이 더 쉬워집니다.';
  }

  if (trendWord.includes('하락') && volatilityLevel === '높음') {
    return '하락폭이 크고 변동성도 높습니다. 단기 반등 여부보다 며칠간의 추가 흐름을 같이 보는 편이 안전합니다.';
  }

  if (trendWord.includes('하락')) {
    return '가격이 내려가는 흐름입니다. 최저가 근처인지, 평균보다 낮은 구간인지 확인하면 리포트 설명력이 좋아집니다.';
  }

  return '큰 변동이 없는 보합 구간입니다. 포트폴리오 설명에서는 안정적인 가격 흐름으로 정리할 수 있습니다.';
};

export function createCropReport({ item, series, stats, range }) {
  if (!item || !series.length) {
    return {
      title: 'AI 선생님 리포트',
      headline: '분석할 데이터가 아직 부족합니다.',
      tone: 'flat',
      badges: [],
      summary: ['품목 데이터가 로딩되면 가격 흐름 리포트를 자동으로 생성합니다.'],
      signals: [],
      recommendation: '데이터 파일을 먼저 확인해주세요.',
      copyText: '분석할 데이터가 아직 부족합니다.',
    };
  }

  const trendTone = getTrendTone(stats.diff);
  const trendWord = getTrendWord(stats.diff, stats.rate ?? 0);
  const volatility = getVolatility(series);
  const positionText = getPositionText(stats.latest, stats.average);
  const peakText = getPeakText(series, stats);
  const recommendation = getRecommendation(trendWord, volatility.level);

  const headline = `${item.name}은 최근 ${range}일 기준 ${trendWord}입니다. 현재가는 ${formatWon(stats.latest)}이며 전일 대비 ${formatSignedWon(stats.diff)}(${formatPercent(stats.rate)}) 변동했습니다.`;

  const summary = [
    headline,
    positionText,
    `${peakText} ${volatility.description}`,
  ];

  const signals = [
    {
      title: '가격 흐름',
      value: trendWord,
      description: `전일 대비 변동폭은 ${formatSignedWon(stats.diff)}이고 변동률은 ${formatPercent(stats.rate)}입니다.`,
    },
    {
      title: '평균 비교',
      value: formatWon(stats.average),
      description: positionText,
    },
    {
      title: '변동성',
      value: volatility.level,
      description: volatility.description,
    },
  ];

  const badges = [
    { label: '흐름', value: trendWord, tone: trendTone },
    { label: '변동성', value: volatility.level, tone: volatility.level === '높음' ? 'up' : volatility.level === '낮음' ? 'down' : 'flat' },
    { label: '조회 기간', value: `${range}일`, tone: 'flat' },
  ];

  const copyText = [
    `[${item.name} 가격 리포트]`,
    ...summary.map((line, index) => `${index + 1}. ${line}`),
    `관찰 포인트: ${recommendation}`,
    '※ 데모에서는 정적 JSON 데이터를 기반으로 자동 생성된 리포트입니다.',
  ].join('\n');

  return {
    title: `${item.name} AI 가격 리포트`,
    headline,
    tone: trendTone,
    badges,
    summary,
    signals,
    recommendation,
    copyText,
  };
}
