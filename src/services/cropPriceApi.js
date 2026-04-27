const DATA_URL = `${import.meta.env.BASE_URL}data/crop-prices.json`;
const AI_REPORT_URL = `${import.meta.env.BASE_URL}data/ai-reports.json`;

/**
 * React 화면에서 사용하는 AJAX 함수입니다.
 * GitHub Pages에서는 서버가 없으므로 외부 API를 직접 호출하지 않고,
 * GitHub Actions가 미리 생성한 정적 JSON 파일만 비동기로 읽습니다.
 */
export async function fetchCropPrices() {
  const response = await fetch(DATA_URL, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`농산물 가격 데이터 조회 실패 (${response.status})`);
  }

  return response.json();
}

/**
 * Gemini AI 리포트도 브라우저에서 Gemini API를 직접 호출하지 않습니다.
 * GitHub Actions가 생성한 public/data/ai-reports.json만 AJAX로 읽습니다.
 * 파일이 없거나 읽기 실패 시 화면은 데이터 기반 기본 리포트로 대체됩니다.
 */
export async function fetchAiReports() {
  try {
    const response = await fetch(AI_REPORT_URL, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      return null;
    }

    return response.json();
  } catch {
    return null;
  }
}
