import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import XlsxPopulate from "xlsx-populate";

interface ProductMapping {
  rawName: string;
  mappedName: string;
}

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// 시스템 내장 기본 품목 매핑 리스트 (Default Mappings)
const DEFAULT_PRODUCT_MAPPINGS: ProductMapping[] = [
  { rawName: '국내제조 비린맛 없는 절단 돌산 간장 꽃게장', mappedName: '게장' },
  { rawName: '그린 웰빙 업소용 국산 반달 슬라이스 단무지', mappedName: '반달단무지' },
  { rawName: '그린이에프앤에스 업소용 양념깻잎', mappedName: '양념깻잎' },
  { rawName: '꼬들꼬들 간장무꼬들이 장아찌 무 장아찌', mappedName: '무꼬들' },
  { rawName: '늘푸른 뜨락 국내제조 업소용 알마늘지', mappedName: '알마늘' },
  { rawName: '더 맛있는 간장고추장아찌 고추장아찌', mappedName: '간장고추' },
  { rawName: '더 맛있는 간장고추지 업소용 고추장아찌', mappedName: '간장고추' },
  { rawName: '명태품은 백명란', mappedName: '명란' },
  { rawName: '볶아조린 국산서리태조림 업소용 콩조림', mappedName: '서리태조림' },
  { rawName: '볶아조린 대두콩조림 메주콩자반 업소용 콩조림', mappedName: '대두조림' },
  { rawName: '볶아조린 땅콩조림 업소용 콩조림', mappedName: '땅콩' },
  { rawName: '양념 반찬 여우마을 무말랭이 절임류', mappedName: '무말랭이' },
  { rawName: '업소용 대용량 단풍콩잎 장아찌', mappedName: '단풍콩잎' },
  { rawName: '업소용 매실청간장생깻잎 장아찌', mappedName: '매실깻잎' },
  { rawName: '여우마을 국내제조 국산 순태젓갈 갈치속젓', mappedName: '순태' },
  { rawName: '여우마을 국내제조 상큼상큼 오이피클', mappedName: '오이피클' },
  { rawName: '여우마을 노랑콩잎 단풍콩잎 장아찌', mappedName: '단풍콩잎' },
  { rawName: '여우마을 대구 북성로 냉동 완조리 간장 연탄불고기 5팩', mappedName: '간장연탄' },
  { rawName: '여우마을 명태품은 특 창란젓갈', mappedName: '양념창란' },
  { rawName: '여우마을 봄에새싹 명이나물 장아찌', mappedName: '명이나물' },
  { rawName: '여우마을 수제반찬 고추장 오징어실채 볶음', mappedName: '실채' },
  { rawName: '여우마을 수제반찬 국산 된장 청양고추 장아찌', mappedName: '국산된고' },
  { rawName: '여우마을 수제반찬 국산 양념 청양고추 장아찌', mappedName: '국산양고' },
  { rawName: '여우마을 수제반찬 달콤담백 양대콩조림 강낭콩조림', mappedName: '양대조림' },
  { rawName: '여우마을 수제반찬 더 맛있는 간장 청양고추장아찌', mappedName: '청양간장' },
  { rawName: '여우마을 수제반찬 더 맛있는 간장마늘쫑 업소용 마늘쫑장아찌', mappedName: '간장마늘쫑' },
  { rawName: '여우마을 수제반찬 된장깻잎 장아찌', mappedName: '된장깻잎' },
  { rawName: '여우마을 수제반찬 맛있는 오징어땅콩진미채 볶음', mappedName: '땅콩진미' },
  { rawName: '여우마을 수제반찬 매콤달콤 고추장양념 건새우볶음', mappedName: '건새우' },
  { rawName: '여우마을 수제반찬 매콤새콤 밥도둑 도라지무침 당일제조', mappedName: '도라지' },
  { rawName: '여우마을 수제반찬 볶아조린 국산서리태조림 국산 콩자반', mappedName: '서리태조림' },
  { rawName: '여우마을 수제반찬 볶아조린 대두콩조림 노란콩조림 메주콩자반', mappedName: '대두조림' },
  { rawName: '여우마을 수제반찬 볶아조린 땅콩조림 콩자반', mappedName: '땅콩' },
  { rawName: '여우마을 수제반찬 수제 완조리 냉동 소고기 육전', mappedName: '육전' },
  { rawName: '여우마을 수제반찬 아삭아삭 국산 연근조림', mappedName: '연근' },
  { rawName: '여우마을 수제반찬 아삭이고추 된장무침', mappedName: '아삭이고추' },
  { rawName: '여우마을 수제반찬 영양만점 모듬콩조림 견과류조림', mappedName: '여러콩' },
  { rawName: '여우마을 수제반찬 원하는 크기로 잘라먹는 양념 긴마늘쫑무침', mappedName: '긴마늘쫑' },
  { rawName: '여우마을 수제반찬 제주품은 국산 더덕무침', mappedName: '더덕' },
  { rawName: '여우마을 수제반찬 진짜 연탄에 구운 대구 북성로 완조리 연탄불고기 간장맛고추장맛 묶음 간장맛 고추장맛 1세트', mappedName: '연탄세트' },
  { rawName: '여우마을 수제반찬 진짜진짜 맛있는 고추장 진미채볶음', mappedName: '진미채' },
  { rawName: '여우마을 수제반찬 촌스러운 국산 우엉채조림 김밥용우엉', mappedName: '우엉' },
  { rawName: '여우마을 수제반찬 촌스러운 궁채장아찌', mappedName: '간장궁채' },
  { rawName: '여우마을 수제반찬 촌스러운 꽈리고추 고추장멸치볶음', mappedName: '멸치' },
  { rawName: '여우마을 수제반찬 촌스러운 된장고추무침 고추장아찌', mappedName: '된장고추' },
  { rawName: '여우마을 수제반찬 촌스러운 땅콩조림', mappedName: '생땅콩' },
  { rawName: '여우마을 수제반찬 촌스러운 양념고추장아찌 고추무침', mappedName: '양념고추' },
  { rawName: '여우마을 수제반찬 촌스러운 양념조개젓갈', mappedName: '양념조개' },
  { rawName: '여우마을 수제반찬 화끈하게 매운 된장땡초 청양고추무침', mappedName: '땡초' },
  { rawName: '여우마을 양념깻잎 무침 장아찌', mappedName: '양념깻잎' },
  { rawName: '여우마을 양념깻잎무침', mappedName: '양념깻잎' },
  { rawName: '여우마을 양념무말랭이 무침', mappedName: '무말랭이' },
  { rawName: '여우마을 업소용 매실청간장생깻잎 장아찌', mappedName: '매실깻잎' },
  { rawName: '여우마을 업소용 산고추', mappedName: '산고추' },
  { rawName: '여우마을 업소용 오징어젓갈', mappedName: '오징어' },
  { rawName: '여우마을 업소용 유림 양념 오징어젓갈 특오징어젓갈', mappedName: '오징어' },
  { rawName: '여우마을 자연곡물 청자5호 국산서리태 햇콩', mappedName: '곡물서리태' },
  { rawName: '여우마을 자연곡물 햇콩 붉은 강낭콩 양대콩', mappedName: '곡물강낭콩' },
  { rawName: '여우마을 쫄깃쫄깃 오징어젓갈', mappedName: '오징어' },
  { rawName: '원하프락교한양총알배송', mappedName: '락교' },
  { rawName: '지호 업소용 국내제조 고추채 절임', mappedName: '고추채' },
  { rawName: '촌스러운 양념고추장아찌 업소용 고추장아찌', mappedName: '양념고추' },
  { rawName: '하나 업소용 단무지 알밥용 김밥용', mappedName: '알밥단무지' },
  { rawName: '여우마을 수제반찬 곤약 꽈리고추 메추리알 장조림 당일제조', mappedName: '메추리알' },
  { rawName: '한정판매 국산 통마늘 장아찌 통마늘지', mappedName: '통마늘' },
  { rawName: '여우마을 대구 북성로 냉동 완조리 간장 연탄불고기 10팩', mappedName: '간장연탄' },
  { rawName: '여우마을 대구 북성로 냉동 완조리 고추장 연탄불고기', mappedName: '고추장연탄' },
  { rawName: '촌스러운 간장 궁채장아찌', mappedName: '간장궁채' },
  { rawName: '한양식품 일식 업소용 락교', mappedName: '락교' },
  { rawName: '탱글탱글 낙지젓 특낙지젓', mappedName: '낙지' },
  { rawName: '여우마을 수제반찬 국산 어슷우엉채조림', mappedName: '어슷우엉' },
  { rawName: '여우마을 강화도 국산 새우젓 김장용 추젓 MSG 무첨가 새우 비율 높은 새우젓', mappedName: '국산새우' },
  { rawName: '웰빙 창젓 양념창젓', mappedName: '웰빙창젓' },
  { rawName: '여우마을 국내제조 업소용 된장깻잎 장아찌', mappedName: '된장깻잎' },
  { rawName: '여우마을 수제반찬 국내산 통오이지 오이절임', mappedName: '통오이' },
  { rawName: '여우마을 자연곡물 국산 백태 메주콩 햇콩', mappedName: '곡물백태' },
  { rawName: '여우마을 밥에 비벼먹는 비빔 낙지젓갈 용기포장', mappedName: '비빔낙지' }
];

// 사용자 커스텀 매핑 JSON 저장 경로
function getCustomJsonPath(): string {
  let baseDir = process.cwd();
  if (process.env.APPDATA) {
    baseDir = path.join(process.env.APPDATA, "smart-delivery");
  }
  if (!fs.existsSync(baseDir)) {
    try {
      fs.mkdirSync(baseDir, { recursive: true });
    } catch (e) {
      console.error("데이터 디렉토리 생성 실패:", e);
    }
  }
  return path.join(baseDir, "custom_mappings.json");
}

// 사용자 커스텀 매핑 데이터 읽기
function readCustomMappings(): ProductMapping[] {
  const jsonPath = getCustomJsonPath();
  try {
    if (fs.existsSync(jsonPath)) {
      const data = fs.readFileSync(jsonPath, "utf-8");
      return JSON.parse(data);
    }
  } catch (error) {
    console.error("custom_mappings.json 읽기/파싱 오류:", error);
  }
  return [];
}

// 사용자 커스텀 매핑 데이터 저장
function writeCustomMappings(mappings: ProductMapping[]): void {
  const jsonPath = getCustomJsonPath();
  try {
    fs.writeFileSync(jsonPath, JSON.stringify(mappings, null, 2), "utf-8");
  } catch (error) {
    console.error("custom_mappings.json 쓰기 오류:", error);
  }
}

// 최종 병합 매핑 목록 (Default + Custom)
function getAllMappings(): ProductMapping[] {
  const customList = readCustomMappings();
  const map = new Map<string, string>();

  // 1. Default 매핑 적용
  for (const item of DEFAULT_PRODUCT_MAPPINGS) {
    map.set(item.rawName, item.mappedName);
  }

  // 2. Custom 매핑 덮어쓰기 및 신규 추가
  for (const item of customList) {
    map.set(item.rawName, item.mappedName);
  }

  const result: ProductMapping[] = [];
  map.forEach((mappedName, rawName) => {
    result.push({ rawName, mappedName });
  });

  return result;
}

// 1. 대치 규칙 목록 조회 API (Default + Custom 병합)
app.get("/api/mappings", (req, res) => {
  const mappings = getAllMappings();
  const defaultRawNames = DEFAULT_PRODUCT_MAPPINGS.map((m) => m.rawName);
  res.json({ success: true, mappings, defaultRawNames });
});

// 2. 단일 대치 규칙 추가 API (Custom 매핑에 추가)
app.post("/api/mappings/add", (req, res) => {
  const { rawName, mappedName } = req.body;
  if (!rawName || !mappedName) {
    return res.status(400).json({ success: false, message: "잘못된 입력값입니다." });
  }

  try {
    const customList = readCustomMappings();
    const existingIndex = customList.findIndex((m) => m.rawName === rawName);
    if (existingIndex !== -1) {
      customList[existingIndex].mappedName = mappedName;
    } else {
      customList.push({ rawName, mappedName });
    }
    writeCustomMappings(customList);

    res.json({ success: true });
  } catch (error) {
    console.error("규칙 추가 오류:", error);
    res.status(500).json({ success: false, message: "서버 오류로 인해 규칙 추가에 실패했습니다." });
  }
});

// 3. 대치 규칙 목록 동기화 API (수정 및 삭제 반영)
app.post("/api/mappings/sync", (req, res) => {
  const { mappings } = req.body;
  if (!Array.isArray(mappings)) {
    return res.status(400).json({ success: false, message: "잘못된 데이터 형식입니다." });
  }

  try {
    // 요청된 전체 매핑 목록 중 Default와 차이가 있는 항목 및 신규 항목만 Custom에 반영
    const defaultMap = new Map<string, string>();
    for (const d of DEFAULT_PRODUCT_MAPPINGS) {
      defaultMap.set(d.rawName, d.mappedName);
    }

    const newCustomList: ProductMapping[] = [];
    for (const item of mappings as ProductMapping[]) {
      const defaultVal = defaultMap.get(item.rawName);
      // 기본 매핑에 없거나, 기본 매핑과 바뀐 경우 커스텀에 보관
      if (defaultVal === undefined || defaultVal !== item.mappedName) {
        newCustomList.push({ rawName: item.rawName, mappedName: item.mappedName });
      }
    }

    writeCustomMappings(newCustomList);
    res.json({ success: true });
  } catch (error) {
    console.error("규칙 동기화 오류:", error);
    res.status(500).json({ success: false, message: "서버 오류로 인해 규칙 저장에 실패했습니다." });
  }
});

// 4. 대치 규칙 초기화 API (Custom 매핑 완전 삭제 후 Default 원복)
app.post("/api/mappings/reset", (req, res) => {
  try {
    writeCustomMappings([]);
    const mappings = getAllMappings();
    res.json({ success: true, mappings });
  } catch (error) {
    console.error("규칙 초기화 오류:", error);
    res.status(500).json({ success: false, message: "서버 오류로 인해 규칙 초기화에 실패했습니다." });
  }
});

// 5. 비밀번호 걸린 엑셀 복호화 및 데이터 추출 API
app.post("/api/decrypt-excel", async (req, res) => {
  const { fileData, password } = req.body;
  if (!fileData) {
    return res.status(400).json({ success: false, message: "파일 데이터가 없습니다." });
  }

  try {
    const buffer = Buffer.from(fileData, "base64");
    // xlsx-populate로 암호 해제 시도
    const workbook = await XlsxPopulate.fromDataAsync(buffer, { password });
    
    // 암호가 풀린 표준 .xlsx 바이너리 버퍼 생성
    const decryptedBuffer = await workbook.outputAsync();

    res.json({ 
      success: true, 
      decryptedData: decryptedBuffer.toString("base64") 
    });
  } catch (error: any) {
    console.error("엑셀 암호 복호화 오류:", error);
    const errMsg = error.message || "";
    // 상세한 에러 메시지를 제공하여 비밀번호 오류 또는 포맷 오류 원인을 파악할 수 있도록 함
    if (
      errMsg.toLowerCase().includes("password") || 
      errMsg.toLowerCase().includes("decrypt") || 
      errMsg.toLowerCase().includes("invalid") || 
      errMsg.toLowerCase().includes("code") ||
      errMsg.toLowerCase().includes("wrong")
    ) {
      return res.status(400).json({ 
        success: false, 
        message: `비밀번호가 일치하지 않거나 지원하지 않는 암호화 포맷입니다.\n(상세 오류: ${errMsg})` 
      });
    }
    res.status(500).json({ 
      success: false, 
      message: `엑셀 복호화 처리 중 오류가 발생했습니다.\n(상세 오류: ${errMsg})` 
    });
  }
});

// Vite 및 정적 파일 서버 연동
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // 빌드된 server.cjs 위치는 dist/server.cjs 입니다.
    // electron/asar 패키징 시 index.html 등 정적 파일도 dist/ 내부에 위치합니다.
    let distPath = __dirname;
    if (!fs.existsSync(path.join(distPath, "index.html"))) {
      distPath = path.join(process.cwd(), "dist");
    }

    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
