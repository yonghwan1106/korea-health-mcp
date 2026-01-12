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
const API_BASE_URL = 'http://apis.data.go.kr/B552657';

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
  const url = new URL(`${API_BASE_URL}${endpoint}`);
  url.searchParams.append('serviceKey', API_KEY);
  Object.entries(params).forEach(([key, value]) => {
    if (value) url.searchParams.append(key, value);
  });

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`API 요청 실패: ${response.status}`);
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
  <title>Korea Health MCP - 한국 의료정보 MCP 서버</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Noto Sans KR', sans-serif;
      background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f172a 100%);
      min-height: 100vh;
      color: #e2e8f0;
    }
    .container {
      max-width: 900px;
      margin: 0 auto;
      padding: 60px 20px;
    }
    .hero {
      text-align: center;
      margin-bottom: 60px;
    }
    .logo {
      font-size: 64px;
      margin-bottom: 20px;
    }
    h1 {
      font-size: 2.5rem;
      font-weight: 700;
      margin-bottom: 16px;
      background: linear-gradient(90deg, #60a5fa, #34d399);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .subtitle {
      font-size: 1.2rem;
      color: #94a3b8;
      margin-bottom: 30px;
    }
    .badge {
      display: inline-block;
      background: rgba(52, 211, 153, 0.2);
      color: #34d399;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 0.9rem;
    }
    .tools-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 20px;
      margin-bottom: 60px;
    }
    .tool-card {
      background: rgba(30, 41, 59, 0.8);
      border-radius: 16px;
      padding: 24px;
      border: 1px solid rgba(148, 163, 184, 0.1);
      transition: transform 0.3s, box-shadow 0.3s;
    }
    .tool-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
    }
    .tool-icon {
      font-size: 32px;
      margin-bottom: 12px;
    }
    .tool-name {
      font-size: 1.1rem;
      font-weight: 600;
      color: #f1f5f9;
      margin-bottom: 8px;
    }
    .tool-desc {
      font-size: 0.9rem;
      color: #94a3b8;
      line-height: 1.6;
    }
    .usage {
      background: rgba(30, 41, 59, 0.8);
      border-radius: 16px;
      padding: 30px;
      margin-bottom: 40px;
    }
    .usage h2 {
      font-size: 1.5rem;
      margin-bottom: 20px;
      color: #60a5fa;
    }
    .endpoint {
      background: #0f172a;
      padding: 16px 20px;
      border-radius: 8px;
      font-family: monospace;
      font-size: 0.95rem;
      color: #34d399;
      margin-bottom: 20px;
      overflow-x: auto;
    }
    .examples {
      margin-top: 20px;
    }
    .example {
      background: rgba(15, 23, 42, 0.6);
      padding: 12px 16px;
      border-radius: 8px;
      margin-bottom: 10px;
      color: #cbd5e1;
    }
    .footer {
      text-align: center;
      padding-top: 40px;
      border-top: 1px solid rgba(148, 163, 184, 0.1);
      color: #64748b;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="hero">
      <div class="logo">🏥</div>
      <h1>Korea Health MCP</h1>
      <p class="subtitle">한국 응급의료, 병원, 약국 정보 조회 MCP 서버</p>
      <span class="badge">5개 도구 지원</span>
    </div>

    <div class="tools-grid">
      <div class="tool-card">
        <div class="tool-icon">🚑</div>
        <div class="tool-name">health_search_emergency</div>
        <div class="tool-desc">응급의료기관(응급실) 검색. 권역외상센터, 응급의료센터 등을 찾을 수 있습니다.</div>
      </div>
      <div class="tool-card">
        <div class="tool-icon">📊</div>
        <div class="tool-name">health_get_realtime_er</div>
        <div class="tool-desc">응급실 실시간 가용병상 조회. 현재 이용 가능한 병상 수를 확인합니다.</div>
      </div>
      <div class="tool-card">
        <div class="tool-icon">🩺</div>
        <div class="tool-name">health_search_hospital</div>
        <div class="tool-desc">병원/의원 검색. 지역별, 진료과목별로 병원을 찾을 수 있습니다.</div>
      </div>
      <div class="tool-card">
        <div class="tool-icon">💊</div>
        <div class="tool-name">health_search_pharmacy</div>
        <div class="tool-desc">약국 검색. 지역별 약국 목록과 연락처를 조회합니다.</div>
      </div>
      <div class="tool-card">
        <div class="tool-icon">🗺️</div>
        <div class="tool-name">health_get_recommendations</div>
        <div class="tool-desc">의료시설 통합 추천. 응급실, 병원, 약국을 한번에 조회합니다.</div>
      </div>
    </div>

    <div class="usage">
      <h2>사용 방법</h2>
      <div class="endpoint">POST /mcp</div>
      <div class="examples">
        <p style="margin-bottom: 12px; color: #94a3b8;">대화 예시:</p>
        <div class="example">"서울 응급실 실시간 병상 현황 알려줘"</div>
        <div class="example">"강남구 내과 병원 찾아줘"</div>
        <div class="example">"부산 해운대구 약국 검색해줘"</div>
      </div>
    </div>

    <div class="footer">
      <p>Data Source: 공공데이터포털 (data.go.kr) - 국립중앙의료원 응급의료정보</p>
      <p style="margin-top: 8px;">Made with ❤️ for PlayMCP</p>
    </div>
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
