import type { VercelRequest, VercelResponse } from '@vercel/node';

// ============================================================================
// 타입 정의
// ============================================================================
interface Tool {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, { type: string; description: string; enum?: string[] }>;
    required?: string[];
  };
}

interface JsonRpcRequest {
  jsonrpc: string;
  id: number | string;
  method: string;
  params?: Record<string, unknown>;
}

interface EmergencyInfo {
  dutyName: string;       // 기관명
  dutyAddr: string;       // 주소
  dutyTel1: string;       // 대표전화
  dutyTel3: string;       // 응급실 전화
  hvec: string;           // 응급실 가용병상
  hvoc: string;           // 수술실 가용
  hvgc: string;           // 일반병상 가용
  hpid: string;           // 기관ID
  wgs84Lat: string;       // 위도
  wgs84Lon: string;       // 경도
  dutyEmclsName: string;  // 응급의료기관 분류
  dutyTime1c: string;     // 월요일 진료시작
  dutyTime1s: string;     // 월요일 진료종료
}

interface HospitalInfo {
  dutyName: string;       // 병원명
  dutyAddr: string;       // 주소
  dutyTel1: string;       // 전화번호
  dutyDivNam: string;     // 진료과목
  dutyTime1c: string;     // 진료시간
  dutyTime1s: string;
  wgs84Lat: string;       // 위도
  wgs84Lon: string;       // 경도
  hpid: string;           // 기관ID
}

interface PharmacyInfo {
  dutyName: string;       // 약국명
  dutyAddr: string;       // 주소
  dutyTel1: string;       // 전화번호
  dutyTime1c: string;     // 영업시간
  dutyTime1s: string;
  wgs84Lat: string;       // 위도
  wgs84Lon: string;       // 경도
  hpid: string;           // 기관ID
}

// ============================================================================
// 상수 정의
// ============================================================================
const API_KEY = process.env.DATA_GO_KR_API_KEY || '';

// 시도 코드
const SIDO_CODE: Record<string, string> = {
  '서울': '110000', '서울특별시': '110000',
  '부산': '210000', '부산광역시': '210000',
  '대구': '220000', '대구광역시': '220000',
  '인천': '230000', '인천광역시': '230000',
  '광주': '240000', '광주광역시': '240000',
  '대전': '250000', '대전광역시': '250000',
  '울산': '260000', '울산광역시': '260000',
  '세종': '290000', '세종특별자치시': '290000',
  '경기': '310000', '경기도': '310000',
  '강원': '320000', '강원도': '320000', '강원특별자치도': '320000',
  '충북': '330000', '충청북도': '330000',
  '충남': '340000', '충청남도': '340000',
  '전북': '350000', '전라북도': '350000', '전북특별자치도': '350000',
  '전남': '360000', '전라남도': '360000',
  '경북': '370000', '경상북도': '370000',
  '경남': '380000', '경상남도': '380000',
  '제주': '390000', '제주특별자치도': '390000',
};

// 진료과목 코드
const DEPARTMENT_CODE: Record<string, string> = {
  '내과': 'D001', '소아청소년과': 'D002', '신경과': 'D003', '정신건강의학과': 'D004',
  '피부과': 'D005', '외과': 'D006', '흉부외과': 'D007', '정형외과': 'D008',
  '신경외과': 'D009', '성형외과': 'D010', '산부인과': 'D011', '안과': 'D012',
  '이비인후과': 'D013', '비뇨의학과': 'D014', '영상의학과': 'D016', '마취통증의학과': 'D017',
  '재활의학과': 'D019', '가정의학과': 'D020', '응급의학과': 'D021', '치과': 'D022',
  '한방': 'D023', '한의원': 'D023',
};

// API 기본 URL
const API_BASE_URL = 'https://apis.data.go.kr/B552657';

// ============================================================================
// XML 파싱 유틸리티
// ============================================================================
function parseXMLValue(xml: string, tag: string): string {
  const regex = new RegExp(`<${tag}>([^<]*)</${tag}>`, 'i');
  const match = xml.match(regex);
  return match ? match[1].trim() : '';
}

function parseXMLItems(xml: string): string[] {
  const items: string[] = [];
  const regex = /<item>([\s\S]*?)<\/item>/gi;
  let match;
  while ((match = regex.exec(xml)) !== null) {
    items.push(match[1]);
  }
  return items;
}

function parseEmergencyFromXML(itemXml: string): EmergencyInfo {
  return {
    dutyName: parseXMLValue(itemXml, 'dutyName'),
    dutyAddr: parseXMLValue(itemXml, 'dutyAddr'),
    dutyTel1: parseXMLValue(itemXml, 'dutyTel1'),
    dutyTel3: parseXMLValue(itemXml, 'dutyTel3'),
    hvec: parseXMLValue(itemXml, 'hvec'),
    hvoc: parseXMLValue(itemXml, 'hvoc'),
    hvgc: parseXMLValue(itemXml, 'hvgc'),
    hpid: parseXMLValue(itemXml, 'hpid'),
    wgs84Lat: parseXMLValue(itemXml, 'wgs84Lat'),
    wgs84Lon: parseXMLValue(itemXml, 'wgs84Lon'),
    dutyEmclsName: parseXMLValue(itemXml, 'dutyEmclsName'),
    dutyTime1c: parseXMLValue(itemXml, 'dutyTime1c'),
    dutyTime1s: parseXMLValue(itemXml, 'dutyTime1s'),
  };
}

function parseHospitalFromXML(itemXml: string): HospitalInfo {
  return {
    dutyName: parseXMLValue(itemXml, 'dutyName'),
    dutyAddr: parseXMLValue(itemXml, 'dutyAddr'),
    dutyTel1: parseXMLValue(itemXml, 'dutyTel1'),
    dutyDivNam: parseXMLValue(itemXml, 'dutyDivNam'),
    dutyTime1c: parseXMLValue(itemXml, 'dutyTime1c'),
    dutyTime1s: parseXMLValue(itemXml, 'dutyTime1s'),
    wgs84Lat: parseXMLValue(itemXml, 'wgs84Lat'),
    wgs84Lon: parseXMLValue(itemXml, 'wgs84Lon'),
    hpid: parseXMLValue(itemXml, 'hpid'),
  };
}

function parsePharmacyFromXML(itemXml: string): PharmacyInfo {
  return {
    dutyName: parseXMLValue(itemXml, 'dutyName'),
    dutyAddr: parseXMLValue(itemXml, 'dutyAddr'),
    dutyTel1: parseXMLValue(itemXml, 'dutyTel1'),
    dutyTime1c: parseXMLValue(itemXml, 'dutyTime1c'),
    dutyTime1s: parseXMLValue(itemXml, 'dutyTime1s'),
    wgs84Lat: parseXMLValue(itemXml, 'wgs84Lat'),
    wgs84Lon: parseXMLValue(itemXml, 'wgs84Lon'),
    hpid: parseXMLValue(itemXml, 'hpid'),
  };
}

// ============================================================================
// API 호출 함수
// ============================================================================
async function fetchAPI(endpoint: string, params: Record<string, string>): Promise<string> {
  // 공공데이터포털 API 키는 이미 URL 인코딩되어 있으므로 직접 문자열로 구성
  const queryParams = Object.entries(params)
    .filter(([, value]) => value)
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join('&');

  const url = `${API_BASE_URL}${endpoint}?serviceKey=${API_KEY}${queryParams ? '&' + queryParams : ''}`;

  const response = await fetch(url);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API 요청 실패: ${response.status} - ${text.substring(0, 200)}`);
  }
  return response.text();
}

// ============================================================================
// 도구 핸들러
// ============================================================================

// 1. 응급의료기관 검색
async function searchEmergency(region: string, city?: string): Promise<string> {
  const sidoCode = SIDO_CODE[region];
  if (!sidoCode) {
    return JSON.stringify({
      success: false,
      error: `지원하지 않는 지역입니다: ${region}. 지원 지역: ${Object.keys(SIDO_CODE).filter(k => !k.includes('시') && !k.includes('도')).join(', ')}`,
    });
  }

  try {
    const xml = await fetchAPI('/ErmctInfoInqireService/getEgytListInfoInqire', {
      STAGE1: region,
      STAGE2: city || '',
      pageNo: '1',
      numOfRows: '20',
    });

    const items = parseXMLItems(xml);
    if (items.length === 0) {
      return JSON.stringify({
        success: true,
        message: `${region}${city ? ' ' + city : ''} 지역에 응급의료기관 정보가 없습니다.`,
        data: [],
      });
    }

    const emergencies = items.map(parseEmergencyFromXML);

    const markdown = `## ${region}${city ? ' ' + city : ''} 응급의료기관 목록\n\n` +
      emergencies.map((e, i) =>
        `### ${i + 1}. ${e.dutyName}\n` +
        `- **분류**: ${e.dutyEmclsName || '응급의료기관'}\n` +
        `- **주소**: ${e.dutyAddr}\n` +
        `- **대표전화**: ${e.dutyTel1}\n` +
        `- **응급실 전화**: ${e.dutyTel3 || '-'}\n`
      ).join('\n');

    return JSON.stringify({
      success: true,
      count: emergencies.length,
      markdown,
      data: emergencies,
    });
  } catch (error) {
    return JSON.stringify({
      success: false,
      error: `응급의료기관 검색 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
    });
  }
}

// 2. 응급실 실시간 가용병상 조회
async function getRealtimeER(region: string, city?: string): Promise<string> {
  const sidoCode = SIDO_CODE[region];
  if (!sidoCode) {
    return JSON.stringify({
      success: false,
      error: `지원하지 않는 지역입니다: ${region}`,
    });
  }

  try {
    const xml = await fetchAPI('/ErmctInfoInqireService/getEmrrmRltmUsefulSckbdInfoInqire', {
      STAGE1: region,
      STAGE2: city || '',
      pageNo: '1',
      numOfRows: '20',
    });

    const items = parseXMLItems(xml);
    if (items.length === 0) {
      return JSON.stringify({
        success: true,
        message: `${region}${city ? ' ' + city : ''} 지역에 실시간 응급실 정보가 없습니다.`,
        data: [],
      });
    }

    const emergencies = items.map(parseEmergencyFromXML);

    const markdown = `## ${region}${city ? ' ' + city : ''} 응급실 실시간 병상 현황\n\n` +
      `> 실시간 정보로, 상황에 따라 변동될 수 있습니다.\n\n` +
      emergencies.map((e, i) => {
        const hvec = parseInt(e.hvec) || 0;
        const status = hvec > 5 ? '🟢 여유' : hvec > 0 ? '🟡 혼잡' : '🔴 만석';
        return `### ${i + 1}. ${e.dutyName} ${status}\n` +
          `- **응급실 병상**: ${e.hvec || '0'}개 가용\n` +
          `- **수술실**: ${e.hvoc || '-'}\n` +
          `- **일반병상**: ${e.hvgc || '-'}\n` +
          `- **주소**: ${e.dutyAddr}\n` +
          `- **응급실 전화**: ${e.dutyTel3 || e.dutyTel1}\n`;
      }).join('\n');

    return JSON.stringify({
      success: true,
      count: emergencies.length,
      markdown,
      data: emergencies,
    });
  } catch (error) {
    return JSON.stringify({
      success: false,
      error: `실시간 응급실 조회 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
    });
  }
}

// 3. 병원/의원 검색
async function searchHospital(region: string, city?: string, department?: string): Promise<string> {
  try {
    const params: Record<string, string> = {
      Q0: region,
      Q1: city || '',
      pageNo: '1',
      numOfRows: '20',
    };

    // 진료과목이 있으면 추가
    if (department) {
      const deptCode = DEPARTMENT_CODE[department];
      if (deptCode) {
        params.QD = deptCode;
      }
    }

    const xml = await fetchAPI('/HsptlAsembySearchService/getHsptlMdcncListInfoInqire', params);

    const items = parseXMLItems(xml);
    if (items.length === 0) {
      return JSON.stringify({
        success: true,
        message: `${region}${city ? ' ' + city : ''}${department ? ' ' + department : ''} 검색 결과가 없습니다.`,
        data: [],
      });
    }

    const hospitals = items.map(parseHospitalFromXML);

    const markdown = `## ${region}${city ? ' ' + city : ''} 병원 검색 결과${department ? ' (' + department + ')' : ''}\n\n` +
      hospitals.map((h, i) =>
        `### ${i + 1}. ${h.dutyName}\n` +
        `- **진료과목**: ${h.dutyDivNam || '-'}\n` +
        `- **주소**: ${h.dutyAddr}\n` +
        `- **전화**: ${h.dutyTel1}\n`
      ).join('\n');

    return JSON.stringify({
      success: true,
      count: hospitals.length,
      markdown,
      data: hospitals,
    });
  } catch (error) {
    return JSON.stringify({
      success: false,
      error: `병원 검색 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
    });
  }
}

// 4. 약국 검색
async function searchPharmacy(region: string, city?: string): Promise<string> {
  try {
    const xml = await fetchAPI('/ErmctInsttInfoInqireService/getParmacyListInfoInqire', {
      Q0: region,
      Q1: city || '',
      pageNo: '1',
      numOfRows: '20',
    });

    const items = parseXMLItems(xml);
    if (items.length === 0) {
      return JSON.stringify({
        success: true,
        message: `${region}${city ? ' ' + city : ''} 지역에 약국 정보가 없습니다.`,
        data: [],
      });
    }

    const pharmacies = items.map(parsePharmacyFromXML);

    const markdown = `## ${region}${city ? ' ' + city : ''} 약국 목록\n\n` +
      pharmacies.map((p, i) =>
        `### ${i + 1}. ${p.dutyName}\n` +
        `- **주소**: ${p.dutyAddr}\n` +
        `- **전화**: ${p.dutyTel1}\n`
      ).join('\n');

    return JSON.stringify({
      success: true,
      count: pharmacies.length,
      markdown,
      data: pharmacies,
    });
  } catch (error) {
    return JSON.stringify({
      success: false,
      error: `약국 검색 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
    });
  }
}

// 5. 의료시설 통합 추천
async function getRecommendations(region: string, city?: string): Promise<string> {
  try {
    // 병렬로 응급실, 병원, 약국 정보 조회
    const [emergencyResult, hospitalResult, pharmacyResult] = await Promise.allSettled([
      searchEmergency(region, city),
      searchHospital(region, city),
      searchPharmacy(region, city),
    ]);

    const emergency = emergencyResult.status === 'fulfilled' ? JSON.parse(emergencyResult.value) : null;
    const hospital = hospitalResult.status === 'fulfilled' ? JSON.parse(hospitalResult.value) : null;
    const pharmacy = pharmacyResult.status === 'fulfilled' ? JSON.parse(pharmacyResult.value) : null;

    let markdown = `## ${region}${city ? ' ' + city : ''} 의료시설 통합 정보\n\n`;

    // 응급의료기관
    markdown += `### 🏥 응급의료기관\n`;
    if (emergency?.success && emergency.data?.length > 0) {
      const topEmergencies = emergency.data.slice(0, 3);
      topEmergencies.forEach((e: EmergencyInfo, i: number) => {
        markdown += `${i + 1}. **${e.dutyName}** - ${e.dutyTel3 || e.dutyTel1}\n   ${e.dutyAddr}\n`;
      });
    } else {
      markdown += `정보 없음\n`;
    }
    markdown += '\n';

    // 병원
    markdown += `### 🩺 병원/의원\n`;
    if (hospital?.success && hospital.data?.length > 0) {
      const topHospitals = hospital.data.slice(0, 3);
      topHospitals.forEach((h: HospitalInfo, i: number) => {
        markdown += `${i + 1}. **${h.dutyName}** - ${h.dutyTel1}\n   ${h.dutyAddr}\n`;
      });
    } else {
      markdown += `정보 없음\n`;
    }
    markdown += '\n';

    // 약국
    markdown += `### 💊 약국\n`;
    if (pharmacy?.success && pharmacy.data?.length > 0) {
      const topPharmacies = pharmacy.data.slice(0, 3);
      topPharmacies.forEach((p: PharmacyInfo, i: number) => {
        markdown += `${i + 1}. **${p.dutyName}** - ${p.dutyTel1}\n   ${p.dutyAddr}\n`;
      });
    } else {
      markdown += `정보 없음\n`;
    }

    return JSON.stringify({
      success: true,
      markdown,
      summary: {
        emergency: emergency?.count || 0,
        hospital: hospital?.count || 0,
        pharmacy: pharmacy?.count || 0,
      },
    });
  } catch (error) {
    return JSON.stringify({
      success: false,
      error: `통합 조회 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
    });
  }
}

// ============================================================================
// MCP 도구 정의
// ============================================================================
const TOOLS: Tool[] = [
  {
    name: 'health_search_emergency',
    description: '응급의료기관(응급실)을 검색합니다. 지역별로 응급실, 권역외상센터 등 응급의료기관 목록을 조회합니다.',
    inputSchema: {
      type: 'object',
      properties: {
        region: {
          type: 'string',
          description: '시/도 (예: 서울, 부산, 경기)',
        },
        city: {
          type: 'string',
          description: '시/군/구 (선택, 예: 강남구, 해운대구)',
        },
      },
      required: ['region'],
    },
  },
  {
    name: 'health_get_realtime_er',
    description: '응급실 실시간 가용병상 정보를 조회합니다. 현재 이용 가능한 응급실 병상 수를 확인할 수 있습니다.',
    inputSchema: {
      type: 'object',
      properties: {
        region: {
          type: 'string',
          description: '시/도 (예: 서울, 부산, 경기)',
        },
        city: {
          type: 'string',
          description: '시/군/구 (선택, 예: 강남구, 해운대구)',
        },
      },
      required: ['region'],
    },
  },
  {
    name: 'health_search_hospital',
    description: '병원/의원을 검색합니다. 지역별, 진료과목별로 병원을 찾을 수 있습니다.',
    inputSchema: {
      type: 'object',
      properties: {
        region: {
          type: 'string',
          description: '시/도 (예: 서울, 부산, 경기)',
        },
        city: {
          type: 'string',
          description: '시/군/구 (선택, 예: 강남구, 해운대구)',
        },
        department: {
          type: 'string',
          description: '진료과목 (선택, 예: 내과, 외과, 소아청소년과, 정형외과, 산부인과, 안과, 이비인후과, 피부과, 치과, 한의원)',
        },
      },
      required: ['region'],
    },
  },
  {
    name: 'health_search_pharmacy',
    description: '약국을 검색합니다. 지역별로 약국 목록과 연락처를 조회합니다.',
    inputSchema: {
      type: 'object',
      properties: {
        region: {
          type: 'string',
          description: '시/도 (예: 서울, 부산, 경기)',
        },
        city: {
          type: 'string',
          description: '시/군/구 (선택, 예: 강남구, 해운대구)',
        },
      },
      required: ['region'],
    },
  },
  {
    name: 'health_get_recommendations',
    description: '주변 의료시설을 통합 추천합니다. 응급의료기관, 병원, 약국 정보를 한번에 조회합니다.',
    inputSchema: {
      type: 'object',
      properties: {
        region: {
          type: 'string',
          description: '시/도 (예: 서울, 부산, 경기)',
        },
        city: {
          type: 'string',
          description: '시/군/구 (선택, 예: 강남구, 해운대구)',
        },
      },
      required: ['region'],
    },
  },
];

// ============================================================================
// MCP JSON-RPC 핸들러
// ============================================================================
async function handleMCPRequest(request: JsonRpcRequest): Promise<unknown> {
  const { method, params, id } = request;

  switch (method) {
    case 'initialize':
      return {
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: {},
          },
          serverInfo: {
            name: 'korea-health-mcp',
            version: '1.0.0',
          },
        },
      };

    case 'tools/list':
      return {
        jsonrpc: '2.0',
        id,
        result: {
          tools: TOOLS,
        },
      };

    case 'tools/call': {
      const toolName = (params as { name: string })?.name;
      const args = (params as { arguments?: Record<string, string> })?.arguments || {};

      let result: string;

      switch (toolName) {
        case 'health_search_emergency':
          result = await searchEmergency(args.region, args.city);
          break;
        case 'health_get_realtime_er':
          result = await getRealtimeER(args.region, args.city);
          break;
        case 'health_search_hospital':
          result = await searchHospital(args.region, args.city, args.department);
          break;
        case 'health_search_pharmacy':
          result = await searchPharmacy(args.region, args.city);
          break;
        case 'health_get_recommendations':
          result = await getRecommendations(args.region, args.city);
          break;
        default:
          return {
            jsonrpc: '2.0',
            id,
            error: {
              code: -32601,
              message: `Unknown tool: ${toolName}`,
            },
          };
      }

      const parsed = JSON.parse(result);
      return {
        jsonrpc: '2.0',
        id,
        result: {
          content: [
            {
              type: 'text',
              text: parsed.markdown || JSON.stringify(parsed, null, 2),
            },
          ],
        },
      };
    }

    default:
      return {
        jsonrpc: '2.0',
        id,
        error: {
          code: -32601,
          message: `Method not found: ${method}`,
        },
      };
  }
}

// ============================================================================
// 랜딩페이지 HTML
// ============================================================================
const LANDING_HTML = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>K-Health MCP | 한국 의료정보 AI 서버</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&family=Noto+Sans+KR:wght@300;400;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --primary: #00D4AA;
      --primary-dark: #00B894;
      --accent: #FF6B6B;
      --bg-dark: #0A0F1C;
      --bg-card: #111827;
      --text: #F8FAFC;
      --text-muted: #94A3B8;
      --gradient-1: linear-gradient(135deg, #00D4AA 0%, #00B4D8 100%);
      --gradient-2: linear-gradient(135deg, #667EEA 0%, #764BA2 100%);
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    body {
      font-family: 'Outfit', 'Noto Sans KR', sans-serif;
      background: var(--bg-dark);
      color: var(--text);
      min-height: 100vh;
      overflow-x: hidden;
    }
    /* Animated Background */
    .bg-pattern {
      position: fixed;
      inset: 0;
      background:
        radial-gradient(circle at 20% 20%, rgba(0, 212, 170, 0.08) 0%, transparent 50%),
        radial-gradient(circle at 80% 80%, rgba(102, 126, 234, 0.08) 0%, transparent 50%),
        radial-gradient(circle at 50% 50%, rgba(255, 107, 107, 0.05) 0%, transparent 60%);
      z-index: 0;
    }
    .pulse-ring {
      position: fixed;
      width: 600px;
      height: 600px;
      border: 1px solid rgba(0, 212, 170, 0.1);
      border-radius: 50%;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      animation: pulse 4s ease-in-out infinite;
    }
    .pulse-ring:nth-child(2) { animation-delay: 1s; width: 800px; height: 800px; }
    .pulse-ring:nth-child(3) { animation-delay: 2s; width: 1000px; height: 1000px; }
    @keyframes pulse {
      0%, 100% { opacity: 0.3; transform: translate(-50%, -50%) scale(1); }
      50% { opacity: 0.1; transform: translate(-50%, -50%) scale(1.1); }
    }
    .container {
      position: relative;
      z-index: 1;
      max-width: 1100px;
      margin: 0 auto;
      padding: 0 24px;
    }
    /* Header */
    header {
      padding: 80px 0 60px;
      text-align: center;
    }
    .logo-wrap {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 100px;
      height: 100px;
      background: var(--gradient-1);
      border-radius: 28px;
      margin-bottom: 32px;
      box-shadow: 0 20px 60px rgba(0, 212, 170, 0.3);
      animation: float 3s ease-in-out infinite;
    }
    @keyframes float {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-10px); }
    }
    .logo-wrap svg {
      width: 56px;
      height: 56px;
      fill: white;
    }
    h1 {
      font-size: 3.5rem;
      font-weight: 700;
      letter-spacing: -0.02em;
      margin-bottom: 16px;
      background: var(--gradient-1);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .tagline {
      font-size: 1.25rem;
      color: var(--text-muted);
      font-weight: 300;
      margin-bottom: 28px;
    }
    .badge-row {
      display: flex;
      justify-content: center;
      gap: 12px;
      flex-wrap: wrap;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      background: rgba(0, 212, 170, 0.1);
      border: 1px solid rgba(0, 212, 170, 0.2);
      border-radius: 100px;
      font-size: 0.875rem;
      color: var(--primary);
    }
    .badge.accent {
      background: rgba(255, 107, 107, 0.1);
      border-color: rgba(255, 107, 107, 0.2);
      color: var(--accent);
    }
    /* Tools Section */
    .section-title {
      font-size: 1.5rem;
      font-weight: 600;
      margin-bottom: 32px;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .section-title::before {
      content: '';
      width: 4px;
      height: 24px;
      background: var(--gradient-1);
      border-radius: 2px;
    }
    .tools-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 20px;
      margin-bottom: 64px;
    }
    .tool-card {
      background: var(--bg-card);
      border-radius: 20px;
      padding: 28px;
      border: 1px solid rgba(255, 255, 255, 0.05);
      transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      overflow: hidden;
    }
    .tool-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: var(--gradient-1);
      opacity: 0;
      transition: opacity 0.3s;
    }
    .tool-card:hover {
      transform: translateY(-8px);
      box-shadow: 0 30px 60px rgba(0, 0, 0, 0.4);
      border-color: rgba(0, 212, 170, 0.2);
    }
    .tool-card:hover::before { opacity: 1; }
    .tool-icon {
      width: 52px;
      height: 52px;
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 26px;
      margin-bottom: 18px;
      background: linear-gradient(135deg, rgba(0, 212, 170, 0.15), rgba(0, 180, 216, 0.15));
    }
    .tool-card:nth-child(2) .tool-icon { background: linear-gradient(135deg, rgba(255, 107, 107, 0.15), rgba(255, 159, 67, 0.15)); }
    .tool-card:nth-child(3) .tool-icon { background: linear-gradient(135deg, rgba(102, 126, 234, 0.15), rgba(118, 75, 162, 0.15)); }
    .tool-card:nth-child(4) .tool-icon { background: linear-gradient(135deg, rgba(0, 206, 201, 0.15), rgba(0, 212, 170, 0.15)); }
    .tool-card:nth-child(5) .tool-icon { background: linear-gradient(135deg, rgba(253, 203, 110, 0.15), rgba(255, 159, 67, 0.15)); }
    .tool-name {
      font-size: 1.1rem;
      font-weight: 600;
      margin-bottom: 8px;
      font-family: 'Outfit', monospace;
    }
    .tool-desc {
      font-size: 0.9rem;
      color: var(--text-muted);
      line-height: 1.7;
    }
    /* Usage Section */
    .usage-section {
      background: var(--bg-card);
      border-radius: 24px;
      padding: 40px;
      margin-bottom: 64px;
      border: 1px solid rgba(255, 255, 255, 0.05);
    }
    .endpoint-box {
      background: var(--bg-dark);
      border-radius: 12px;
      padding: 20px 24px;
      margin-bottom: 28px;
      display: flex;
      align-items: center;
      gap: 16px;
      border: 1px solid rgba(0, 212, 170, 0.2);
    }
    .method-tag {
      background: var(--gradient-1);
      color: var(--bg-dark);
      padding: 6px 14px;
      border-radius: 6px;
      font-weight: 600;
      font-size: 0.875rem;
    }
    .endpoint-url {
      font-family: 'Outfit', monospace;
      font-size: 1.1rem;
      color: var(--primary);
    }
    .examples-title {
      font-size: 1rem;
      color: var(--text-muted);
      margin-bottom: 16px;
    }
    .example-item {
      background: rgba(0, 212, 170, 0.05);
      border-left: 3px solid var(--primary);
      padding: 14px 20px;
      border-radius: 0 10px 10px 0;
      margin-bottom: 12px;
      font-size: 0.95rem;
      transition: all 0.3s;
    }
    .example-item:hover {
      background: rgba(0, 212, 170, 0.1);
      transform: translateX(4px);
    }
    /* Footer */
    footer {
      text-align: center;
      padding: 40px 0 60px;
      border-top: 1px solid rgba(255, 255, 255, 0.05);
    }
    .footer-text {
      color: var(--text-muted);
      font-size: 0.9rem;
      margin-bottom: 8px;
    }
    .footer-brand {
      font-size: 0.875rem;
      color: var(--primary);
    }
    /* Responsive */
    @media (max-width: 768px) {
      h1 { font-size: 2.5rem; }
      .tools-grid { grid-template-columns: 1fr; }
      .usage-section { padding: 28px; }
    }
  </style>
</head>
<body>
  <div class="bg-pattern"></div>
  <div class="pulse-ring"></div>
  <div class="pulse-ring"></div>
  <div class="pulse-ring"></div>

  <div class="container">
    <header>
      <div class="logo-wrap">
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-1 11h-4v4h-4v-4H6v-4h4V6h4v4h4v4z"/>
        </svg>
      </div>
      <h1>K-Health MCP</h1>
      <p class="tagline">AI 기반 한국 의료정보 조회 서버</p>
      <div class="badge-row">
        <span class="badge">5개 도구</span>
        <span class="badge">실시간 데이터</span>
        <span class="badge accent">공공데이터 연동</span>
      </div>
    </header>

    <section>
      <h2 class="section-title">도구 목록</h2>
      <div class="tools-grid">
        <div class="tool-card">
          <div class="tool-icon">🚑</div>
          <div class="tool-name">health_search_emergency</div>
          <div class="tool-desc">응급의료기관 검색. 권역외상센터, 응급의료센터 등 전국 응급실 정보를 조회합니다.</div>
        </div>
        <div class="tool-card">
          <div class="tool-icon">📊</div>
          <div class="tool-name">health_get_realtime_er</div>
          <div class="tool-desc">응급실 실시간 가용병상 조회. 현재 이용 가능한 병상 수를 실시간으로 확인합니다.</div>
        </div>
        <div class="tool-card">
          <div class="tool-icon">🩺</div>
          <div class="tool-name">health_search_hospital</div>
          <div class="tool-desc">병원/의원 검색. 지역별, 진료과목별로 원하는 병원을 찾을 수 있습니다.</div>
        </div>
        <div class="tool-card">
          <div class="tool-icon">💊</div>
          <div class="tool-name">health_search_pharmacy</div>
          <div class="tool-desc">약국 검색. 지역별 약국 목록과 연락처, 운영시간을 조회합니다.</div>
        </div>
        <div class="tool-card">
          <div class="tool-icon">🗺️</div>
          <div class="tool-name">health_get_recommendations</div>
          <div class="tool-desc">의료시설 통합 추천. 응급실, 병원, 약국 정보를 한번에 조회합니다.</div>
        </div>
      </div>
    </section>

    <section class="usage-section">
      <h2 class="section-title">사용 방법</h2>
      <div class="endpoint-box">
        <span class="method-tag">POST</span>
        <span class="endpoint-url">/mcp</span>
      </div>
      <p class="examples-title">대화 예시</p>
      <div class="example-item">"서울 응급실 실시간 병상 현황 알려줘"</div>
      <div class="example-item">"강남구 내과 병원 찾아줘"</div>
      <div class="example-item">"부산 해운대구 약국 검색해줘"</div>
    </section>

    <footer>
      <p class="footer-text">Data Source: 공공데이터포털 (data.go.kr) - 국립중앙의료원 응급의료정보</p>
      <p class="footer-brand">Made for PlayMCP Competition</p>
    </footer>
  </div>
</body>
</html>`;

// ============================================================================
// Vercel 핸들러
// ============================================================================
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS 헤더
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const path = req.url?.split('?')[0];

  // 헬스체크
  if (path === '/health') {
    return res.status(200).json({
      status: 'ok',
      server: 'korea-health-mcp',
      version: '1.0.0',
      tools: TOOLS.length,
    });
  }

  // MCP 엔드포인트
  if (path === '/mcp' && req.method === 'POST') {
    try {
      const body = req.body as JsonRpcRequest;
      const result = await handleMCPRequest(body);
      return res.status(200).json(result);
    } catch (error) {
      return res.status(500).json({
        jsonrpc: '2.0',
        id: null,
        error: {
          code: -32603,
          message: `Internal error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      });
    }
  }

  // 랜딩페이지
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.status(200).send(LANDING_HTML);
}
