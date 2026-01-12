# Korea Health MCP

한국 응급의료, 병원, 약국 정보를 조회하는 MCP(Model Context Protocol) 서버입니다.

## 기능

| 도구명 | 설명 |
|--------|------|
| `health_search_emergency` | 응급의료기관(응급실) 검색 |
| `health_get_realtime_er` | 응급실 실시간 가용병상 조회 |
| `health_search_hospital` | 병원/의원 검색 (진료과목별) |
| `health_search_pharmacy` | 약국 검색 |
| `health_get_recommendations` | 의료시설 통합 추천 |

## 사용 예시

- "서울 응급실 실시간 병상 현황 알려줘"
- "강남구 내과 병원 찾아줘"
- "부산 해운대구 약국 검색해줘"

## API

**Endpoint**: `POST /mcp`

## 배포

```bash
npm install
vercel --prod
```

## 환경 변수

```env
DATA_GO_KR_API_KEY=your_api_key
```

## 데이터 출처

- 공공데이터포털 (data.go.kr)
- 국립중앙의료원 응급의료정보 조회 서비스

## 라이선스

MIT
