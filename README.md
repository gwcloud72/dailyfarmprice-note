# 농산물 가격정보

> GitHub Actions로 KAMIS 공개 가격자료를 갱신하는 정적 서비스입니다.

KAMIS 가격 데이터를 GitHub Actions에서 정적 JSON으로 갱신하고, React 화면에서 전국 농산물 시세를 조회하는 정적 데이터 서비스입니다.

실제 API 응답이 없거나 오래된 데이터가 들어오면 임의 가격을 대신 보여주지 않고 데이터 연결 대기 화면을 표시합니다. 가격 정보 서비스에서 가장 중요한 기준은 “보기 좋은 화면”보다 “최신 데이터만 보여주는 신뢰성”이기 때문입니다.

---

## 핵심 가치

농산물 가격정보는 사용자가 오늘 장보기에 필요한 가격 흐름을 빠르게 판단하도록 돕는 서비스입니다.

- 품목별 가격 추이 확인
- 전국 및 17개 광역자치단체 기준 지역 비교
- 상승·하락·보합 의미 색상 통일
- 관심 품목 저장 및 선택 품목 차트 연동
---
- KAMIS 공식 동향과 구매 참고 역할 분리
- GitHub Actions 기반 자동 데이터 갱신


## 주요 화면

| 화면 | 내용 |
|---|---|
| 홈 | 검색, 빠른 품목 칩, 주요 품목, 가격 추이, 지역 비교 요약 |
| 품목별 시세 | 품목 선택, 등급 선택, 기간 탭, 최대 2개 라인 비교 |
| 지역별 비교 | 전국 + 17개 광역자치단체 기준 비교, 지도 점 선택, 지역 행 하이라이트 |
| 가격 리포트 | KAMIS 공식 동향, 구매 참고, 동향 전체 리포트 링크 |
| 관심 품목 | 관심 품목 목록, 별 토글, 클릭 시 차트 연동 |
| 데이터 안내 | 출처, 갱신 방식, 오래된 데이터 차단 기준, 면책 안내 |

---

## 데이터 정책

이 프로젝트는 운영 화면에서 임의 가격을 보여주지 않습니다.

```txt
KAMIS 데이터 있음
→ public/data/crop-prices.json 기준으로 화면 표시

KAMIS 데이터 없음
→ 데이터 연결 대기 화면 표시

KAMIS 데이터가 너무 오래됨
→ 배포 검증 실패 또는 화면 표시 차단
```

기본 freshness 기준은 다음과 같습니다.

| 항목 | 기준 |
|---|---|
| 가격 데이터 최대 허용 기간 | `KAMIS_MAX_DATA_AGE_DAYS`, 기본 7일 |
| 가격 출처 | KAMIS Open API |
| 보조 출처 | 통계청 |
| 화면 fetch | `cache: no-store` + `VITE_DATA_VERSION` 캐시 갱신 |

---

## 색상 의미 체계

가격 정보는 소비자 기준으로 해석합니다.

| 상태 | 의미 | 표시 |
|---|---|---|
| 상승 | 가격이 올라 소비자 부담 증가 | 빨강, `▲` |
| 하락 | 가격이 내려 소비자에게 유리 | 초록, `▼` |
| 보합 | 큰 변화 없음 | 회색, `—` |

적용 위치는 품목 카드, 가격 요약 패널, 관심 품목 수치, 지역별 비교표, 차트 라인입니다.

---

## 기술 스택

| 구분 | 사용 기술 |
|---|---|
| Frontend | React 18 |
| Build | Vite 5 |
| Styling | CSS, Tailwind 설정 파일 |
| Data | 정적 JSON |
| Automation | Node.js scripts |
| CI/CD | GitHub Actions |
| Deploy | GitHub Pages |

---

## 폴더 구조

```txt
.
├── .github/workflows/deploy-github-pages.yml
├── public/data/
│  ├── crop-prices.json
│  └── ai-reports.json
├── scripts/
│  ├── update-crop-prices.mjs
│  ├── generate-ai-reports.mjs
│  ├── validate-data.mjs
│  ├── data-contract-check.mjs
│  ├── runtime-ui-contract-check.mjs
│  └── render-check.mjs
├── src/
│  ├── assets/
│  ├── components/home.jsx
│  ├── App.jsx
│  ├── main.jsx
│  └── styles.css
├── package.json
└── vite.config.js
```

---


## 면책 안내

가격 데이터는 유통시장 상황, 조사 시점, 품목 등급, 지역 기준에 따라 달라질 수 있습니다. 화면의 정보는 장보기 판단을 돕기 위한 참고용이며, 실제 구매 전 판매처 가격을 확인해야 합니다.

---

## 라이선스

MIT License


## 수집 대상 품목

기본 KAMIS 수집 대상은 배추·무·양파·감자·대파·오이·사과·배·마늘·고구마·당근·토마토·양배추·시금치·상추·호박·풋고추·감귤까지 18개 품목입니다. 다만 KAMIS가 특정 기간에 응답을 제공하지 않는 품목은 지역별 반복 조회를 생략하고 수집 결과에서 제외합니다. 운영 화면은 실데이터가 들어온 품목만 가격 카드로 표시하며, 데이터가 없는 품목의 가격은 임의로 만들지 않습니다.
