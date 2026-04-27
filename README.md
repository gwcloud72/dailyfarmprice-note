# 팜프라이스 노트

배추·무·양파·감자·대파·오이 가격 추이를 차트로 확인하고, Gemini 기반 AI  리포트로 가격 흐름을 요약하는 React 개인 프로젝트입니다.

## 프로젝트 개요

- React + Vite
- Ajax(fetch) 기반 정적 JSON 조회
- GitHub Pages 배포
- GitHub Actions에서 KAMIS 실데이터 수집
- GitHub Actions에서 Gemini AI 리포트 JSON 생성

```txt
GitHub Actions
→ public/data/crop-prices.json 생성
→ public/data/ai-reports.json 생성
→ React 빌드
→ GitHub Pages 배포
```

## 화면 기능

- 채소 중심 6개 품목 비교: 배추, 무, 양파, 감자, 대파, 오이
- 최근 7일 / 14일 / 30일 가격 추이 그래프
- 현재가, 전일 대비, 평균가, 최고가, 최저가 표시
- 관심 품목 저장
- 일자별 가격 테이블
- AI 리포트


## 

```txt
GitHub Actions가 정해진 주기로 농산물 가격 데이터와 AI 분석 리포트를 정적 JSON으로 생성하고,
React 화면은 Ajax(fetch)로 JSON 파일만 조회합니다.
샘플 가격 데이터는 배포하지 않고 KAMIS 실데이터 수집에 실패하면 workflow를 중단하도록 구성했습니다.
이를 통해 GitHub Pages 환경에서도 API Key 노출 없이 자동 갱신형 가격 분석 서비스를 구현했습니다.
```
