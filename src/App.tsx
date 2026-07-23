import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import { 
  FileSpreadsheet, 
  Settings, 
  ClipboardList, 
  Database, 
  ArrowRight, 
  Upload, 
  Download, 
  Check, 
  AlertCircle, 
  HelpCircle, 
  FileText, 
  Info,
  Trash2,
  RefreshCw,
  Sparkles,
  Layers,
  Truck,
  Eye
} from 'lucide-react';

import { PlatformConfig, ProductMapping, ProcessedOrder, MatchingError, ValidationIssue, StepValidationResult } from './types';
import { DEFAULT_PLATFORMS, DEFAULT_PRODUCT_MAPPINGS } from './utils/defaultData';
import { 
  parseAndProcessOrderExcel, 
  processRawRows,
  exportSummaryReportExcel,
  exportProductSortedExcel,
  processTrackingUpdate,
  processTrackingUpdateWithRows,
  exportFinalTrackingExcel,
  findBestOrderSheet,
  sortUnitsSmart
} from './utils/excelProcessor';
import { runComprehensiveValidation, ValidationInputStep1, ValidationInputStep2, OutputFileInfo } from './utils/validationEngine';

import PlatformSettings from './components/PlatformSettings';
import ProductMappingList from './components/ProductMappingList';
import WaybillReportDashboard from './components/WaybillReportDashboard';
import ExcelValidationDashboard from './components/ExcelValidationDashboard';
import ExcelPreviewModal, { ExcelPreviewFile } from './components/ExcelPreviewModal';

export default function App() {
  // ----------------------------------------------------
  // 1. 상태 선언 및 로컬스토리지 연동
  // ----------------------------------------------------
  const [platforms, setPlatforms] = useState<PlatformConfig[]>(() => {
    const saved = localStorage.getItem('s_waybill_platforms');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as PlatformConfig[];
        let migrated = false;
        const cleaned = parsed.map(p => {
          // '주문자'가 col_map에 있으면 제거하고 최신 사양으로 마이그레이션
          if (p.col_map && ('주문자' in p.col_map || Object.keys(p.col_map).length > 8)) {
            migrated = true;
            const newColMap = { ...p.col_map };
            delete (newColMap as any).주문자;

            // 표준 기본 플랫폼인 경우, 최신 defaultData 설정값과 동기화
            const defaultPlat = DEFAULT_PLATFORMS.find(dp => dp.id === p.id);
            if (defaultPlat) {
              return {
                ...p,
                col_map: { ...defaultPlat.col_map },
                tracking_col: defaultPlat.tracking_col
              };
            }

            return {
              ...p,
              col_map: newColMap
            };
          }
          return p;
        });

        if (migrated) {
          localStorage.setItem('s_waybill_platforms', JSON.stringify(cleaned));
          return cleaned;
        }
        return parsed;
      } catch (e) {
        return DEFAULT_PLATFORMS;
      }
    }
    return DEFAULT_PLATFORMS;
  });

  // 대치 규칙은 최초 빈 배열로 선언 후, useEffect를 통해 서버/로컬스토리지에서 비동기로 수집
  const [productMappings, setProductMappings] = useState<ProductMapping[]>([]);
  const [defaultRawNames, setDefaultRawNames] = useState<string[]>([]);
  const [isMappingsLoaded, setIsMappingsLoaded] = useState(false);

  const [activeTab, setActiveTab] = useState<'process' | 'platforms' | 'products' | 'backup'>('process');
  const [selectedPlatformId, setSelectedPlatformId] = useState<string>('');
  // 1단계 (주문 가공) 상태 (다중 파일 지원!)
  const [orderFiles, setOrderFiles] = useState<File[]>([]);
  const [customFilePlatforms, setCustomFilePlatforms] = useState<{ [fileName: string]: string }>({});
  const [isProcessingOrders, setIsProcessingOrders] = useState(false);
  const [orderParseResult, setOrderParseResult] = useState<any>(null);
  const [newItemsMappingForm, setNewItemsMappingForm] = useState<{ [key: string]: string }>({});

  // 2단계 (운송장 업데이트) 상태
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [isProcessingTracking, setIsProcessingTracking] = useState(false);
  const [trackingResult, setTrackingResult] = useState<any>(null);
  const [selectedCourier, setSelectedCourier] = useState<string>("한진택배");
  const [customCourier, setCustomCourier] = useState<string>("");

  // 종합 품질 검사 결과 상태
  const [stepValidationResult, setStepValidationResult] = useState<StepValidationResult | undefined>(undefined);

  // 실시간 종합 품질 검사 평가 계산기
  useEffect(() => {
    let step1Input: ValidationInputStep1 | undefined = undefined;
    let step2Input: ValidationInputStep2 | undefined = undefined;

    if (orderParseResult && orderParseResult.orders && orderParseResult.orders.length > 0) {
      const orders: ProcessedOrder[] = orderParseResult.orders;
      const rawOrders: ProcessedOrder[] = orderParseResult.orders;

      const summaryDetailHeaders = ["용량", "상품명", "수량", "주문자"];
      const summaryDetailRows = orders.map(o => ({
        용량: o.originalOptionName || "",
        상품명: o.originalProductName || "",
        수량: o.수량,
        주문자: o.주문자 || "",
        multiplier: o.multiplier || 1
      }));

      const unitSet = new Set<string>();
      const pivotMap: { [baseName: string]: { [unit: string]: number } } = {};
      orders.forEach(o => {
        const unit = o.용량 || "기본";
        const baseName = o.상품명 || "미분류";
        unitSet.add(unit);
        if (!pivotMap[baseName]) pivotMap[baseName] = {};
        pivotMap[baseName][unit] = (pivotMap[baseName][unit] || 0) + (o.수량 * (o.multiplier || 1));
      });
      const sortedUnits = sortUnitsSmart(Array.from(unitSet));
      const summaryGroupHeaders = ["상품 분류 (행 레이블)", ...sortedUnits, "총합계"];

      const summaryGroupRows: { 상품분류: string; 총수량: number; 총kg: number }[] = [];
      Object.keys(pivotMap).forEach(baseName => {
        let totalQty = 0;
        let totalKg = 0;
        sortedUnits.forEach(unit => {
          const q = pivotMap[baseName][unit] || 0;
          totalQty += q;
          let kgVal = 0;
          const uLower = unit.toLowerCase();
          if (uLower.includes("kg")) kgVal = parseFloat(uLower) || 0;
          else if (uLower.includes("g")) kgVal = (parseFloat(uLower) || 0) / 1000;
          totalKg += kgVal * q;
        });
        summaryGroupRows.push({
          상품분류: baseName,
          총수량: totalQty,
          총kg: totalKg
        });
      });

      const sortedHeaders = ["용량", "상품명", "수량(고정)", "수량", "수령인", "연락처", "우편번호", "주소", "배송메세지"];

      step1Input = {
        rawOrders,
        processedOrders: orders,
        summaryDetailHeaders,
        summaryDetailRows,
        summaryGroupHeaders,
        summaryGroupRows,
        sortedHeaders,
        sortedRows: orders,
        productMappings
      };
    }

    if (trackingResult && orderParseResult && orderParseResult.parsedFiles) {
      const outputFilesInfo: OutputFileInfo[] = [];
      const parsedFiles = orderParseResult.parsedFiles;
      const finalCourierName = selectedCourier === 'custom' ? customCourier : selectedCourier;

      parsedFiles.forEach((pf: any) => {
        const fileOrders = trackingResult.outputOrders ? trackingResult.outputOrders.filter(
          (o: any) => !o.sourceFileName || o.sourceFileName === pf.fileName || parsedFiles.length === 1
        ) : [];

        let missingTracking = 0;
        let missingCourier = 0;
        fileOrders.forEach((o: any) => {
          const effectiveCourier = o.courierName || finalCourierName;
          if (!o.trackingNumber) missingTracking++;
          if (!effectiveCourier || String(effectiveCourier).trim() === '') missingCourier++;
        });

        outputFilesInfo.push({
          fileName: pf.fileName,
          platformName: pf.detectedPlatform?.name || "알수없음",
          totalRows: fileOrders.length,
          headers: pf.headers || [],
          originalHeaders: pf.headers || [],
          missingTrackingCount: missingTracking,
          missingCourierCount: missingCourier,
          duplicateDeliveryNCount: trackingResult.dupNCount || 0
        });
      });

      step2Input = {
        step1InputOrderCount: orderParseResult.orders.length,
        outputFiles: outputFilesInfo
      };
    }

    if (step1Input || step2Input) {
      const result = runComprehensiveValidation(step1Input, step2Input);
      setStepValidationResult(result);
    } else {
      setStepValidationResult(undefined);
    }
  }, [orderParseResult, trackingResult, productMappings]);

  // 비밀번호 잠금 에러 상태
  const [passwordErrorFile, setPasswordErrorFile] = useState<'order' | 'tracking' | null>(null);

  // 엑셀 비밀번호 복호화 처리 상태
  interface PasswordPromptState {
    file: File;
    type: 'order' | 'tracking';
  }
  const [passwordPrompt, setPasswordPrompt] = useState<PasswordPromptState | null>(null);
  const [promptPassword, setPromptPassword] = useState('');
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [decryptedFilesCache, setDecryptedFilesCache] = useState<{ [fileName: string]: any[][] }>({});

  // 알림 메시지
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // 커스텀 확인 모달 상태 (confirm API 대리)
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const openConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmModal(null);
      }
    });
  };

  const isFirstSyncSkippedRef = React.useRef(false);

  // 최초 1회 백엔드 서버(품목리스트_추가.txt)로부터 대치 사전을 불러오기
  useEffect(() => {
    fetch('/api/mappings')
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.mappings)) {
          setProductMappings(data.mappings);
          if (Array.isArray(data.defaultRawNames)) {
            setDefaultRawNames(data.defaultRawNames);
          }
        } else {
          setProductMappings(DEFAULT_PRODUCT_MAPPINGS);
          setDefaultRawNames(DEFAULT_PRODUCT_MAPPINGS.map(m => m.rawName));
        }
        setIsMappingsLoaded(true);
      })
      .catch(err => {
        console.error("서버 대치 규칙 조회 실패:", err);
        setProductMappings(DEFAULT_PRODUCT_MAPPINGS);
        setDefaultRawNames(DEFAULT_PRODUCT_MAPPINGS.map(m => m.rawName));
        setIsMappingsLoaded(true);
      });
  }, []);

  // 로컬 스토리지 및 백엔드 실시간 동기화
  useEffect(() => {
    localStorage.setItem('s_waybill_platforms', JSON.stringify(platforms));
  }, [platforms]);

  // 대치 목록 변경 시 품목리스트_추가.txt 파일에만 실시간 보존 동기화
  useEffect(() => {
    if (!isMappingsLoaded) return; // 최초 비동기 로드 완료 전에는 서버에 덮어쓰기 동기화 금지

    // 첫 번째 로드 직후 렌더링 시에는 서버 sync를 건너뜀 (서버 데이터를 방금 받았으므로)
    if (!isFirstSyncSkippedRef.current) {
      isFirstSyncSkippedRef.current = true;
      return;
    }

    // 서버 동기화 요청 (/api/mappings/sync -> 품목리스트_추가.txt 전용 저장)
    fetch('/api/mappings/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mappings: productMappings })
    })
    .then(res => res.json())
    .then(data => {
      if (!data.success) {
        console.error("서버 대치 규칙 실시간 동기화 실패:", data.message);
      }
    })
    .catch(err => {
      console.error("서버 대치 규칙 실시간 동기화 중 통신 오류:", err);
    });
  }, [productMappings, isMappingsLoaded]);

  // 기본 플랫폼 선정
  useEffect(() => {
    if (platforms.length > 0 && !selectedPlatformId) {
      setSelectedPlatformId(platforms[0].id);
    }
  }, [platforms, selectedPlatformId]);

  const showNotification = (type: 'success' | 'error' | 'info', text: string) => {
    setNotification({ type, text });
    setTimeout(() => setNotification(null), 4000);
  };

  // ----------------------------------------------------
  // 2. 1단계: 주문서 파싱 및 가공 핸들러 (다중 파일 처리 지원)
  // ----------------------------------------------------
  const handleOrderFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const newFiles = Array.from(files);
    const updatedFiles = [...orderFiles, ...newFiles];
    setOrderFiles(updatedFiles);
    setOrderParseResult(null);
    setNewItemsMappingForm({});
    setPasswordErrorFile(null);
    await processMultipleOrderFiles(updatedFiles);
  };

  const handleRemoveOrderFile = async (indexToRemove: number) => {
    const updatedFiles = orderFiles.filter((_, idx) => idx !== indexToRemove);
    setOrderFiles(updatedFiles);
    if (updatedFiles.length === 0) {
      setOrderParseResult(null);
      setNewItemsMappingForm({});
      setCustomFilePlatforms({});
    } else {
      await processMultipleOrderFiles(updatedFiles);
    }
  };

  const handleFilePlatformChange = async (fileName: string, platformId: string) => {
    const updatedCustom = { ...customFilePlatforms, [fileName]: platformId };
    setCustomFilePlatforms(updatedCustom);
    await processMultipleOrderFiles(orderFiles, updatedCustom);
    const platName = platforms.find(p => p.id === platformId)?.name || '알 수 없음';
    showNotification('success', `"${fileName}" 파일의 쇼핑몰 양식을 "${platName}"(으)로 지정했습니다.`);
  };

  const processMultipleOrderFiles = async (
    files: File[], 
    customPlatforms: { [fileName: string]: string } = customFilePlatforms,
    cacheToUse: { [fileName: string]: any[][] } = decryptedFilesCache,
    mappingsToUse: ProductMapping[] = productMappings
  ) => {
    if (files.length === 0) {
      setOrderParseResult(null);
      return;
    }
    setIsProcessingOrders(true);
    setPasswordErrorFile(null);

    try {
      const parsedFilesList: {
        fileName: string;
        file?: File;
        originalBuffer?: any;
        detectedPlatform: PlatformConfig;
        orders: ProcessedOrder[];
        rawRows: any[][];
        headers: any[];
        newRawItems: string[];
        validationIssues?: ValidationIssue[];
      }[] = [];

      for (const file of files) {
        try {
          const forcedPlatId = customPlatforms[file.name];
          let result;

          if (cacheToUse[file.name]) {
            const workbook = XLSX.read(cacheToUse[file.name], { type: 'array' });
            const bestSheetName = findBestOrderSheet(workbook);
            const worksheet = workbook.Sheets[bestSheetName];
            const rawRows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1, defval: "" });
            result = processRawRows(rawRows, file.name, platforms, mappingsToUse, forcedPlatId);
          } else {
            result = await parseAndProcessOrderExcel(file, platforms, mappingsToUse, forcedPlatId);
          }

          const platform = result.detectedPlatform || platforms[0];
          
          parsedFilesList.push({
            fileName: file.name,
            file: file,
            originalBuffer: cacheToUse[file.name] || null,
            detectedPlatform: platform,
            orders: result.orders.map(order => ({
              ...order,
              sourceFileName: file.name,
              platformName: platform.name,
              platformId: platform.id
            })),
            rawRows: result.rawRows,
            headers: result.headers,
            newRawItems: result.newRawItems,
            validationIssues: result.validationIssues || []
          });
        } catch (err: any) {
          if (err.message === "PASSWORD_PROTECTED") {
            setPasswordPrompt({ file, type: 'order' });
            setPromptPassword('');
            showNotification('info', `"${file.name}" 파일에 비밀번호(암호)가 설정되어 있습니다. 비밀번호를 입력해주세요.`);
            setIsProcessingOrders(false);
            return;
          }
          const errMsg = String(err.message || err).toLowerCase();
          const isPassword = errMsg.includes('password') || errMsg.includes('decrypt') || errMsg.includes('protected') || errMsg.includes('encrypt') || errMsg.includes('unsupported file format') || errMsg.includes('bad signature') || errMsg.includes('corrupt');
          if (isPassword) {
            setPasswordPrompt({ file, type: 'order' });
            setPromptPassword('');
            showNotification('info', `"${file.name}" 파일에 비밀번호(암호)가 설정되어 있습니다. 비밀번호를 입력해주세요.`);
            setIsProcessingOrders(false);
            return;
          } else {
            showNotification('error', `"${file.name}" 분석 실패: ${err.message || '오류 발생'}`);
          }
        }
      }

      if (parsedFilesList.length === 0) {
        setOrderParseResult(null);
        return;
      }

      // Combine orders
      const combinedOrders: ProcessedOrder[] = [];
      parsedFilesList.forEach(pf => {
        combinedOrders.push(...pf.orders);
      });

      // Recalculate combinedId count for multiple platforms
      const idCounts: { [key: string]: number } = {};
      combinedOrders.forEach(o => {
        idCounts[o.combinedId] = (idCounts[o.combinedId] || 0) + 1;
      });

      combinedOrders.forEach(o => {
        o.isMulti = idCounts[o.combinedId] > 1;
      });

      // Stagger / sort combined orders
      const multiOrders = combinedOrders.filter(o => o.isMulti).sort((a, b) => {
        if (a.combinedId !== b.combinedId) return a.combinedId.localeCompare(b.combinedId);
        if (a.sortKey !== b.sortKey) return a.sortKey.localeCompare(b.sortKey);
        return a.상품명.localeCompare(b.상품명);
      });

      const singleOrders = combinedOrders.filter(o => !o.isMulti).sort((a, b) => {
        if (a.sortKey !== b.sortKey) return a.sortKey.localeCompare(b.sortKey);
        if (a.상품명 !== b.상품명) return a.상품명.localeCompare(b.상품명);
        return a.수령인.localeCompare(b.수령인);
      });

      const sortedCombinedOrders = [...multiOrders, ...singleOrders];

      // Extract unified new raw unique items & validation issues
      const allNewItemsSet = new Set<string>();
      const allValidationIssues: ValidationIssue[] = [];

      parsedFilesList.forEach(pf => {
        pf.newRawItems.forEach(item => allNewItemsSet.add(item));
        if (pf.validationIssues && pf.validationIssues.length > 0) {
          allValidationIssues.push(...pf.validationIssues);
        }
      });
      const uniqueNewRawItems = Array.from(allNewItemsSet);

      setOrderParseResult({
        orders: sortedCombinedOrders,
        newRawItems: uniqueNewRawItems,
        validationIssues: allValidationIssues,
        parsedFiles: parsedFilesList
      });

      // Set up mapping form
      if (uniqueNewRawItems.length > 0) {
        const initialForm: { [key: string]: string } = {};
        uniqueNewRawItems.forEach(item => {
          initialForm[item] = "";
        });
        setNewItemsMappingForm(initialForm);
      }
    } catch (err: any) {
      showNotification('error', `통합 처리 중 오류 발생: ${err.message || err}`);
    } finally {
      setIsProcessingOrders(false);
    }
  };

  // 발견된 신규 품목 실시간 즉시 매핑 처리
  const handleAddNewItemMappings = () => {
    const newMappingsToAdd: ProductMapping[] = [];
    Object.entries(newItemsMappingForm).forEach(([raw, mapped]) => {
      const mappedStr = String(mapped);
      if (mappedStr.trim()) {
        newMappingsToAdd.push({
          rawName: raw,
          mappedName: mappedStr.trim()
        });
      }
    });

    if (newMappingsToAdd.length === 0) {
      showNotification('info', "대치할 표준 품목명을 입력해주세요.");
      return;
    }

    const updatedMappings = [...newMappingsToAdd, ...productMappings];
    setProductMappings(updatedMappings);
    showNotification('success', `신규 품목 ${newMappingsToAdd.length}개의 정제 규칙이 사전에 등록되었습니다!`);

    if (orderFiles.length > 0) {
      processMultipleOrderFiles(orderFiles, customFilePlatforms, decryptedFilesCache, updatedMappings);
    }
  };

  // 요약보고서 다운로드
  const handleDownloadSummaryReport = async () => {
    if (!orderParseResult) return;
    try {
      await exportSummaryReportExcel(orderParseResult.orders);
      showNotification('success', "요약보고서 엑셀 파일을 성공적으로 다운로드했습니다.");
    } catch (err) {
      console.error("요약보고서 다운로드 실패:", err);
      showNotification('error', "요약보고서 다운로드 중 오류가 발생했습니다.");
    }
  };

  // 품목별정렬 다운로드
  const handleDownloadProductSorted = async () => {
    if (!orderParseResult) return;
    try {
      await exportProductSortedExcel(orderParseResult.orders);
      showNotification('success', "품목별정렬 엑셀 파일을 성공적으로 다운로드했습니다.");
    } catch (err) {
      console.error("품목별정렬 다운로드 실패:", err);
      showNotification('error', "품목별정렬 다운로드 중 오류가 발생했습니다.");
    }
  };

  // 한 번에 모두 다운로드 (2종)
  const handleDownloadAllProcessed = async () => {
    if (!orderParseResult) return;
    try {
      await exportSummaryReportExcel(orderParseResult.orders);
      await new Promise(resolve => setTimeout(resolve, 600));
      await exportProductSortedExcel(orderParseResult.orders);
      showNotification('success', "2종의 엑셀 파일(요약보고서 & 품목별정렬)을 전체 다운로드했습니다.");
    } catch (err) {
      console.error("전체 다운로드 실패:", err);
      showNotification('error', "다운로드 처리 중 오류가 발생했습니다.");
    }
  };

  // 엑셀 미리보기 모달 상태
  const [previewModal, setPreviewModal] = useState<{
    isOpen: boolean;
    title: string;
    subtitle?: string;
    files: ExcelPreviewFile[];
    onDownloadAll?: () => void;
    downloadAllButtonText?: string;
  }>({
    isOpen: false,
    title: '',
    files: []
  });

  // 1단계 가공된 주문 데이터 미리보기 (실제 생성되는 2개 파일 및 각각의 시트와 1:1 완벽 대조)
  const handlePreviewStep1Excel = () => {
    if (!orderParseResult || !orderParseResult.orders || orderParseResult.orders.length === 0) {
      showNotification('info', "미리볼 주문 가공 데이터가 없습니다. 먼저 1단계 주문 파일을 불러와주세요.");
      return;
    }

    const orders: ProcessedOrder[] = orderParseResult.orders;

    // --- [파일 1: 1. 요약보고서.xlsx] ---
    // 시트 1: 상세내역 (용량, 상품명, 수량, 주문자)
    const summarySheet1Columns = ["용량", "상품명", "수량", "주문자"];
    const summarySheet1Rows = orders.map(o => [
      o.originalOptionName || "",
      o.originalProductName || "",
      o.수량,
      o.주문자 || ""
    ]);

    // 시트 2: 상품준비요약 (상품 분류 (행 레이블), sortedUnits..., 총합계)
    const unitSet = new Set<string>();
    const pivotMap: { [baseName: string]: { [unit: string]: number } } = {};

    orders.forEach(o => {
      const unit = o.용량 || "기본";
      const baseName = o.상품명 || "미분류";
      unitSet.add(unit);

      if (!pivotMap[baseName]) {
        pivotMap[baseName] = {};
      }
      pivotMap[baseName][unit] = (pivotMap[baseName][unit] || 0) + (o.수량 * (o.multiplier || 1));
    });

    const sortedUnits = sortUnitsSmart(Array.from(unitSet));
    const sortedBaseNames = Object.keys(pivotMap).sort();

    const summarySheet2Columns = ["상품 분류 (행 레이블)", ...sortedUnits, "총합계"];
    const summarySheet2Rows: (string | number)[][] = [];

    sortedBaseNames.forEach(baseName => {
      const rowData: (string | number)[] = [baseName];
      let totalRowQty = 0;
      sortedUnits.forEach(unit => {
        const qty = pivotMap[baseName][unit] || 0;
        rowData.push(qty > 0 ? qty : "");
        totalRowQty += qty;
      });
      rowData.push(totalRowQty);
      summarySheet2Rows.push(rowData);
    });

    // 하단 총합계 행
    const totalRow: (string | number)[] = ["총합계"];
    let grandTotal = 0;
    sortedUnits.forEach(unit => {
      let colTotal = 0;
      sortedBaseNames.forEach(baseName => {
        colTotal += pivotMap[baseName][unit] || 0;
      });
      totalRow.push(colTotal > 0 ? colTotal : "");
      grandTotal += colTotal;
    });
    totalRow.push(grandTotal);
    summarySheet2Rows.push(totalRow);

    const summaryReportFile: ExcelPreviewFile = {
      fileName: "1. 요약보고서.xlsx",
      fileDescription: "상세내역 시트 및 상품준비요약(피벗 집계표) 시트로 구성된 엑셀 파일입니다.",
      sheets: [
        { sheetName: "상세내역", columns: summarySheet1Columns, rows: summarySheet1Rows },
        { sheetName: "상품준비요약", columns: summarySheet2Columns, rows: summarySheet2Rows }
      ],
      onDownload: () => {
        handleDownloadSummaryReport();
      }
    };

    // --- [파일 2: 2. 품목별정렬.xlsx] ---
    const sortedSheetColumns = ["용량", "상품명", "수량(고정)", "수량", "수령인", "연락처", "우편번호", "주소", "배송메시지"];
    const sortedSheetRows = orders.map(o => [
      o.originalOptionName || "",
      o.originalProductName || "",
      1,
      o.수량,
      o.수령인 || "",
      o.연락처 || "",
      o.우편번호 || "",
      o.주소 || "",
      o.배송메시지 || ""
    ]);

    const productSortedFile: ExcelPreviewFile = {
      fileName: "2. 품목별정렬.xlsx",
      fileDescription: "주소록 및 품목별 정렬이 완료된 원본 가공데이터 엑셀 파일입니다.",
      sheets: [
        { sheetName: "가공데이터", columns: sortedSheetColumns, rows: sortedSheetRows }
      ],
      onDownload: () => {
        handleDownloadProductSorted();
      }
    };

    setPreviewModal({
      isOpen: true,
      title: "1단계 가공 엑셀 파일 미리보기 (총 2개 파일)",
      subtitle: "다운로드되는 실제 엑셀 파일 및 시트 구조와 100% 동일한 미리보기 화면입니다.",
      files: [summaryReportFile, productSortedFile],
      onDownloadAll: () => {
        setPreviewModal(prev => ({ ...prev, isOpen: false }));
        handleDownloadAllProcessed();
      },
      downloadAllButtonText: "두 파일 한 번에 모두 다운로드"
    });
  };

  // 2단계 최종 운송장반영 배송엑셀 미리보기 (실제 다운로드되는 1개 파일과 100% 동일)
  const handlePreviewStep2Excel = () => {
    if (!trackingResult || !trackingResult.outputOrders || trackingResult.outputOrders.length === 0) {
      showNotification('info', "미리볼 운송장 매칭 결과가 없습니다. 먼저 운송장 매칭을 실행해주세요.");
      return;
    }

    const outputOrders: ProcessedOrder[] = trackingResult.outputOrders;
    const effectiveCourier = selectedCourier === 'custom' ? customCourier : selectedCourier;

    // 실제 파일 Sheet 1: 배송반영데이터 (단일 시트에 매칭상태 및 유추근거 열 포함)
    const sheetColumns = [
      "순번", "수령인", "우편번호", "주소", "연락처", "주문 품목명", "용량/옵션", "수량", "택배사", "운송장번호", "매칭상태", "지능형 매칭 유추 근거"
    ];

    const sheetRows = outputOrders.map((o, idx) => [
      idx + 1,
      o.수령인,
      o.우편번호,
      o.주소,
      o.연락처,
      o.originalProductName || o.상품명,
      o.originalOptionName || o.용량,
      o.수량,
      o.courierName || effectiveCourier,
      o.trackingNumber || "(미부여)",
      o.matchType || "unmatched",
      o.softMatchReason || (o.matchType === 'exact' ? '키 정보 100% 완전 일치' : '-')
    ]);

    const finalTrackingFile: ExcelPreviewFile = {
      fileName: "최종_운송장반영_배송데이터.xlsx",
      fileDescription: "운송장 번호가 매칭되어 부여된 최종 배송용 엑셀 파일입니다.",
      sheets: [
        { sheetName: "배송반영데이터", columns: sheetColumns, rows: sheetRows }
      ],
      onDownload: () => {
        handleDownloadFinalTracking();
      }
    };

    setPreviewModal({
      isOpen: true,
      title: "2단계 최종 운송장반영 배송엑셀 미리보기",
      subtitle: "실제 다운로드되는 배송 엑셀 파일과 동일한 단일 시트 데이터입니다.",
      files: [finalTrackingFile],
      onDownloadAll: () => {
        setPreviewModal(prev => ({ ...prev, isOpen: false }));
        handleDownloadFinalTracking();
      },
      downloadAllButtonText: "최종 배송엑셀 파일 다운로드"
    });
  };

  // ----------------------------------------------------
  // 3. 2단계: 운송장 업데이트 핸들러
  // ----------------------------------------------------
  const handleSourceFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSourceFile(file);
    setTrackingResult(null);
    setPasswordErrorFile(null);
  };

  const handleApplyTracking = async () => {
    if (!orderParseResult || !sourceFile) {
      showNotification('info', "먼저 1단계 주문서를 불러온 뒤, 운송장 소스 파일을 업로드하세요.");
      return;
    }

    setIsProcessingTracking(true);
    try {
      let result;
      if (decryptedFilesCache[sourceFile.name]) {
        const workbook = XLSX.read(decryptedFilesCache[sourceFile.name], { type: 'array' });
        const bestSheetName = findBestOrderSheet(workbook);
        const worksheet = workbook.Sheets[bestSheetName];
        const rawRows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1, defval: "" });
        result = processTrackingUpdateWithRows(orderParseResult.orders, rawRows, productMappings);
      } else {
        result = await processTrackingUpdate(orderParseResult.orders, sourceFile, productMappings);
      }
      setTrackingResult(result);
      showNotification('success', "운송장 일치 판별 및 자동 기입 처리가 완료되었습니다.");
    } catch (err: any) {
      if (err.message === "PASSWORD_PROTECTED") {
        setPasswordPrompt({ file: sourceFile, type: 'tracking' });
        setPromptPassword('');
        showNotification('info', `"${sourceFile.name}" 파일에 비밀번호(암호)가 설정되어 있습니다. 비밀번호를 입력해주세요.`);
        setIsProcessingTracking(false);
        return;
      }
      const errMsg = String(err.message || err).toLowerCase();
      const isPassword = errMsg.includes('password') || errMsg.includes('decrypt') || errMsg.includes('protected') || errMsg.includes('encrypt') || errMsg.includes('unsupported file format') || errMsg.includes('bad signature') || errMsg.includes('corrupt');
      if (isPassword) {
        setPasswordPrompt({ file: sourceFile, type: 'tracking' });
        setPromptPassword('');
        showNotification('info', `"${sourceFile.name}" 파일에 비밀번호(암호)가 설정되어 있습니다. 비밀번호를 입력해주세요.`);
      } else {
        showNotification('error', `송장 처리 중 에러 발생: ${err.message}`);
      }
    } finally {
      setIsProcessingTracking(false);
    }
  };

  // ----------------------------------------------------
  // 4. 비밀번호 보호 엑셀 서버 기반 복호화 핸들러
  // ----------------------------------------------------
  const handleDecryptFile = async () => {
    if (!passwordPrompt) return;
    setIsDecrypting(true);

    try {
      const fileToBase64 = (f: File): Promise<string> => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(f);
          reader.onload = () => {
            const result = reader.result as string;
            const base64 = result.split(',')[1];
            resolve(base64);
          };
          reader.onerror = error => reject(error);
        });
      };

      const base64Data = await fileToBase64(passwordPrompt.file);

      const response = await fetch('/api/decrypt-excel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fileData: base64Data,
          password: promptPassword
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "복호화 실패");
      }

      const base64Decrypted = data.decryptedData;
      const binaryString = window.atob(base64Decrypted);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const updatedCache = {
        ...decryptedFilesCache,
        [passwordPrompt.file.name]: bytes
      };
      setDecryptedFilesCache(updatedCache);
      
      showNotification('success', `"${passwordPrompt.file.name}" 파일 비밀번호 해제에 성공했습니다.`);
      const activeType = passwordPrompt.type;
      
      setPasswordPrompt(null);
      setPromptPassword('');

      if (activeType === 'order') {
        await processMultipleOrderFiles(orderFiles, customFilePlatforms, updatedCache);
      } else {
        setIsProcessingTracking(true);
        try {
          const workbook = XLSX.read(bytes, { type: 'array' });
          const bestSheetName = findBestOrderSheet(workbook);
          const worksheet = workbook.Sheets[bestSheetName];
          const rawRows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1, defval: "" });
          const result = processTrackingUpdateWithRows(orderParseResult.orders, rawRows, productMappings);
          setTrackingResult(result);
          showNotification('success', "운송장 일치 판별 및 자동 기입 처리가 완료되었습니다.");
        } catch (matchErr: any) {
          showNotification('error', `송장 매칭 가공 실패: ${matchErr.message}`);
        } finally {
          setIsProcessingTracking(false);
        }
      }
    } catch (err: any) {
      console.error("복호화 오류:", err);
      showNotification('error', err.message || "비밀번호가 올바르지 않거나 복호화에 실패했습니다.");
    } finally {
      setIsDecrypting(false);
    }
  };

  const handleDownloadFinalTracking = async () => {
    if (!trackingResult || !orderParseResult) return;
    
    try {
      const { parsedFiles } = orderParseResult;
      if (!parsedFiles || parsedFiles.length === 0) return;

      let downloadedCount = 0;
      const courierToUse = selectedCourier === "custom" ? customCourier.trim() || "한진택배" : selectedCourier;

      for (const pf of parsedFiles) {
        const fileOrders = trackingResult.outputOrders.filter(
          (o: any) => !o.sourceFileName || o.sourceFileName === pf.fileName || parsedFiles.length === 1
        );

        if (fileOrders.length > 0) {
          const today = new Date().toISOString().slice(0, 10);
          const customName = `최종송장_${pf.fileName.replace(/\.xlsx?$/i, '')}_${today}.xlsx`;
          
          await exportFinalTrackingExcel(
            fileOrders,
            pf.rawRows,
            pf.detectedPlatform,
            customName,
            pf.originalBuffer || pf.file,
            courierToUse
          );
          downloadedCount++;
        }
      }

      showNotification('success', `성공: 각 쇼핑몰 양식에 맞춰 최종 송장 파일 ${downloadedCount}개를 다운로드했습니다!`);
    } catch (err) {
      showNotification('error', "최종 송장 파일 저장 중 오류가 발생했습니다.");
    }
  };

  const handleResetProcess = () => {
    setOrderFiles([]);
    setCustomFilePlatforms({});
    setOrderParseResult(null);
    setNewItemsMappingForm({});
    setSourceFile(null);
    setTrackingResult(null);
    setPasswordErrorFile(null);
    showNotification('info', "작업 영역이 깔끔하게 리셋되었습니다.");
  };

  // ----------------------------------------------------
  // 4. 설정 백업 및 가져오기 핸들러
  // ----------------------------------------------------
  const handleExportBackup = () => {
    const backupData = {
      platforms,
      productMappings,
      version: "1.0",
      exportDate: new Date().toISOString()
    };
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(backupData, null, 2)
    )}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonString);
    downloadAnchor.setAttribute('download', `스마트운송장_설정백업_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showNotification('success', "전체 설정 파일(JSON) 백업 다운로드가 완료되었습니다.");
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.platforms && parsed.productMappings) {
          openConfirm(
            "백업 설정 복원",
            "기존에 저장된 모든 플랫폼 설정과 품목 대치 리스트가 업로드한 데이터로 대체됩니다. 정말 계속할까요?",
            () => {
              setPlatforms(parsed.platforms);
              setProductMappings(parsed.productMappings);
              showNotification('success', "백업 파일로부터 설정을 성공적으로 완벽 복원했습니다!");
            }
          );
        } else {
          showNotification('error', "잘못된 백업 파일 형식입니다.");
        }
      } catch (err) {
        showNotification('error', "파일 읽기 또는 파싱 중 에러가 발생했습니다.");
      }
    };
    reader.readAsText(file);
  };

  const handleResetToDefault = () => {
    openConfirm(
      "전체 기본 설정 초기화",
      "주의! 사용자가 임의로 추가하거나 수정한 플랫폼 설정과 품목 대치 사전 규칙이 모두 영구 삭제되고 초기 설치 상태로 복원됩니다. 정말 초기화할까요?",
      () => {
        setPlatforms(DEFAULT_PLATFORMS);
        localStorage.removeItem('s_waybill_platforms');
        localStorage.removeItem('s_waybill_mappings');

        // 서버 초기화 API 호출
        fetch('/api/mappings/reset', {
          method: 'POST'
        })
        .then(res => res.json())
        .then(data => {
          if (data.success && Array.isArray(data.mappings)) {
            setProductMappings(data.mappings);
            if (Array.isArray(data.defaultRawNames)) {
              setDefaultRawNames(data.defaultRawNames);
            }
            showNotification('success', "초기 기본 설정 및 품목리스트 복원이 완료되었습니다.");
          } else {
            setProductMappings(DEFAULT_PRODUCT_MAPPINGS);
            setDefaultRawNames(DEFAULT_PRODUCT_MAPPINGS.map(m => m.rawName));
            showNotification('success', "플랫폼 설정이 초기화되었으나, 서버 복원 중 에러가 있어 로컬 캐시를 적용했습니다.");
          }
        })
        .catch(err => {
          console.error("서버 대치 규칙 초기화 실패:", err);
          setProductMappings(DEFAULT_PRODUCT_MAPPINGS);
          setDefaultRawNames(DEFAULT_PRODUCT_MAPPINGS.map(m => m.rawName));
          showNotification('success', "플랫폼 설정이 초기화되었으나, 서버 연결 실패로 로컬 캐시를 적용했습니다.");
        });
      }
    );
  };

  return (
    <div id="app-root-wrapper" className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col">
      
      {/* 커스텀 전역 확인 모달 */}
      {confirmModal?.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 space-y-4 border border-slate-100">
            <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-indigo-600 shrink-0" />
              {confirmModal.title}
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
              {confirmModal.message}
            </p>
            <div className="flex justify-end gap-2 pt-3">
              <button
                onClick={() => setConfirmModal(null)}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition"
              >
                취소
              </button>
              <button
                onClick={confirmModal.onConfirm}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition shadow-md"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 엑셀 비밀번호 입력 모달 */}
      {passwordPrompt && (
        <div id="decrypt-password-modal" className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 space-y-4 border border-slate-100">
            <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-indigo-600 shrink-0" />
              엑셀 비밀번호 입력 필요
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
              선택한 <strong>"{passwordPrompt.file.name}"</strong> 파일은 암호(비밀번호)로 보호되어 있습니다. 
              파일을 읽고 가공하기 위해 비밀번호를 입력해주세요.
            </p>
            <div>
              <input
                id="decrypt-password-input"
                type="password"
                placeholder="비밀번호를 입력하세요"
                value={promptPassword}
                onChange={(e) => setPromptPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && promptPassword) {
                    handleDecryptFile();
                  }
                }}
                disabled={isDecrypting}
                autoFocus
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => {
                  setPasswordPrompt(null);
                  setPromptPassword('');
                }}
                disabled={isDecrypting}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition"
              >
                취소
              </button>
              <button
                onClick={handleDecryptFile}
                disabled={isDecrypting || !promptPassword}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition shadow-md flex items-center gap-1.5"
              >
                {isDecrypting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    해제 중...
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    암호 해제 및 확인
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 알림 배너 */}
      <AnimatePresence>
        {notification && (
          <motion.div
            id="notification-toast"
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl shadow-lg border text-sm font-medium flex items-center gap-2.5 ${
              notification.type === 'success' 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                : notification.type === 'error' 
                ? 'bg-rose-50 border-rose-200 text-rose-800'
                : 'bg-indigo-50 border-indigo-200 text-indigo-800'
            }`}
          >
            {notification.type === 'success' ? (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            )}
            {notification.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 대시보드 헤더 */}
      <header id="main-header" className="bg-slate-900 text-white shadow-md border-b border-slate-800 shrink-0">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          
          {/* 타이틀 로고 */}
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-xl shadow-inner">
              <FileSpreadsheet className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight">스마트 운송장 관리기</h1>
                <span className="text-[10px] bg-indigo-500/30 text-indigo-300 font-semibold px-2 py-0.5 rounded-full">v1.2 PRO</span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">다중 쇼핑몰 통합 가공 및 AI 스마트 운송장 매칭 대시보드</p>
            </div>
          </div>

          {/* 탭 네비게이션 */}
          <nav className="flex bg-slate-800 p-1 rounded-xl border border-slate-700/50">
            <button
              onClick={() => setActiveTab('process')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'process' 
                  ? 'bg-indigo-600 text-white shadow' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              대시보드 / 가공 & 매칭
            </button>
            <button
              onClick={() => setActiveTab('platforms')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'platforms' 
                  ? 'bg-indigo-600 text-white shadow' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              플랫폼 설정
            </button>
            <button
              onClick={() => setActiveTab('products')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'products' 
                  ? 'bg-indigo-600 text-white shadow' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ClipboardList className="w-3.5 h-3.5" />
              품목 정제 사전
            </button>
            <button
              onClick={() => setActiveTab('backup')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'backup' 
                  ? 'bg-indigo-600 text-white shadow' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              설정 백업
            </button>
          </nav>

        </div>
      </header>

      {/* 메인 본문 콘텐츠 */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 overflow-y-auto">
        <AnimatePresence mode="wait">
          
          {/* 탭 1: 가공 및 매칭 */}
          {activeTab === 'process' && (
            <motion.div
              key="process-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              
              {/* 비밀번호 보호 해결 가이드 배너 */}
              {passwordErrorFile && (
                <motion.div
                  id="password-error-guide"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-rose-50/80 border border-rose-200 rounded-xl p-5 space-y-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex gap-3">
                      <div className="p-2 bg-rose-100 text-rose-700 rounded-lg shrink-0">
                        <AlertCircle className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800 text-sm">
                          🔒 비밀번호(암호) 보호 처리된 엑셀 파일이 감지되었습니다!
                        </h3>
                        <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                          업로드하신 <strong>{passwordErrorFile === 'order' ? '쇼핑몰 주문 데이터' : '운송장 소스'}</strong> 파일에 비밀번호(암호 보호)가 설정되어 있어 브라우저 보안 샌드박스 내에서 파일을 파싱할 수 없습니다. 
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setPasswordErrorFile(null)}
                      className="text-xs text-slate-400 hover:text-slate-600 font-medium px-2 py-1 rounded hover:bg-slate-100"
                    >
                      닫기
                    </button>
                  </div>

                  <div className="bg-white rounded-lg p-4 border border-rose-100 space-y-3">
                    <div className="text-xs font-bold text-rose-700">💡 왜 이 작업이 필요하며, 어떻게 해결하나요?</div>
                    
                    {/* 안내 문구 */}
                    <div className="text-xs text-slate-600 space-y-2 leading-relaxed">
                      <p>
                        본 스마트 운송장 관리기는 <strong>고객님의 개인정보(수령인 이름, 주소, 연락처 등)를 외부 서버로 절대 전송하지 않고</strong>, 100% 사용자의 웹 브라우저 메모리 안에서만 가공/매칭합니다. 개인정보 보호를 최우선으로 하기 때문에, 암호를 강제로 해킹하거나 푸는 외부 서버용 복호화 엔진을 거치지 않습니다.
                      </p>
                      <p className="font-semibold text-slate-700">
                        따라서, 아래의 간단한 방법으로 암호를 일시 해제한 후 파일을 다시 업로드해 주세요 (단 3초 소요):
                      </p>
                    </div>

                    {/* 가이드 단계 */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-150 space-y-1.5">
                        <div className="text-xs font-bold text-indigo-600">방법 A. 엑셀(Excel)에서 해제</div>
                        <ol className="text-[11px] text-slate-500 list-decimal list-inside space-y-1">
                          <li>암호가 걸린 파일을 엑셀로 엽니다.</li>
                          <li>상단 메뉴 <strong className="text-slate-700">파일 &gt; 정보</strong>를 누릅니다.</li>
                          <li><strong className="text-slate-700">통합 문서 보호 &gt; 암호 설정</strong>을 클릭합니다.</li>
                          <li>기존 입력된 비밀번호를 <strong className="text-slate-700">모두 지우고 빈칸</strong>으로 만든 뒤 확인을 누릅니다.</li>
                          <li>파일을 <strong className="text-slate-700">저장(Ctrl + S)</strong>한 후 다시 업로드합니다.</li>
                        </ol>
                      </div>

                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-150 space-y-1.5">
                        <div className="text-xs font-bold text-indigo-600">방법 B. 구글 시트(Sheets)에서 해제</div>
                        <ol className="text-[11px] text-slate-500 list-decimal list-inside space-y-1">
                          <li>구글 드라이브에 파일을 올리고 구글 스프레드시트로 엽니다.</li>
                          <li><strong className="text-slate-700">파일 &gt; 다운로드 &gt; Microsoft Excel(.xlsx)</strong>을 누릅니다.</li>
                          <li>새로 다운로드된 파일은 암호가 풀린 상태가 됩니다. 해당 파일을 업로드하세요.</li>
                        </ol>
                      </div>

                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-150 space-y-1.5">
                        <div className="text-xs font-bold text-indigo-600">방법 C. 다른 이름으로 저장</div>
                        <ol className="text-[11px] text-slate-500 list-decimal list-inside space-y-1">
                          <li>암호가 걸린 파일을 엑셀로 엽니다.</li>
                          <li><strong className="text-slate-700">다른 이름으로 저장</strong>을 선택합니다.</li>
                          <li>저장 창의 하단 <strong className="text-slate-700">도구 &gt; 일반 옵션</strong>을 클릭합니다.</li>
                          <li>열기/쓰기 암호를 지운 뒤 저장하여 새로 파일을 생성하고 업로드합니다.</li>
                        </ol>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* 원스톱 작업 패널 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* 1단계 카드: 주문 데이터 가공 */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 text-xs font-extrabold flex items-center justify-center">1</span>
                      <h2 className="font-bold text-slate-800 text-sm">쇼핑몰 주문 데이터 불러오기 및 가공</h2>
                    </div>
                    {orderParseResult && (
                      <span className="text-[11px] bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded">
                        수령인 {orderParseResult.orders.length}건 정렬 완료
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-500 leading-relaxed">
                    네이버, 쿠팡 등에서 다운로드 받은 원본 주문 리스트(엑셀)를 업로드하세요. 업로드와 동시에 플랫폼을 지능형 자동 감지하고, 수량 고정 열 추가 및 다중 정렬(합포장 상단 우선 배치) 가공을 진행합니다.
                  </p>

                  {/* 드롭존 영역 */}
                  <div className="relative border-2 border-dashed border-slate-200 hover:border-indigo-500 rounded-xl p-6 bg-slate-50 text-center transition cursor-pointer">
                    <input
                      type="file"
                      multiple
                      accept=".xlsx, .xls"
                      onChange={handleOrderFileUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    {orderFiles.length > 0 ? (
                      <div className="space-y-1">
                        <div className="text-sm font-semibold text-slate-800">
                          {orderFiles.length}개의 주문 파일 불러옴
                        </div>
                        <div className="text-xs text-indigo-500 font-medium">
                          파일을 추가로 올리려면 클릭하세요
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="text-xs font-semibold text-slate-700">여기를 클릭하거나 파일을 끌어다 놓으세요</div>
                        <div className="text-[10px] text-slate-400 mt-1">다중 파일 동시 분석 지원 (.xlsx, .xls)</div>
                      </div>
                    )}
                  </div>

                  {/* 업로드된 파일 리스트 */}
                  {orderFiles.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                        <span>업로드된 주문 파일 ({orderFiles.length}개):</span>
                      </div>
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {orderFiles.map((file, idx) => {
                          const parsedInfo = orderParseResult?.parsedFiles?.find(
                            (p: any) => p.fileName === file.name
                          );
                          const detectedPlat = parsedInfo?.detectedPlatform;
                          
                          return (
                            <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs gap-2">
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                                <div className="min-w-0 flex-1">
                                  <div className="font-semibold text-slate-700 truncate" title={file.name}>
                                    {file.name}
                                  </div>
                                  <div className="text-[10px] text-slate-400">
                                    {(file.size / 1024).toFixed(1)} KB
                                    {detectedPlat && (
                                      <span className="ml-2 text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded font-medium">
                                        감지됨: {detectedPlat.name}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] text-slate-400 shrink-0">양식 보정:</span>
                                  <select
                                    value={detectedPlat?.id || ""}
                                    onChange={(e) => handleFilePlatformChange(file.name, e.target.value)}
                                    className="text-[11px] border border-slate-200 hover:border-slate-300 rounded px-1.5 py-0.5 bg-white font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                  >
                                    <option value="" disabled>-- 플랫폼 선택 --</option>
                                    {platforms.map(p => (
                                      <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                  </select>
                                </div>
                                <button
                                  onClick={() => openConfirm("주문 파일 삭제", `"${file.name}" 업로드 파일을 목록에서 삭제하시겠습니까?`, () => handleRemoveOrderFile(idx))}
                                  className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded transition shrink-0 ml-1"
                                  title="파일 삭제"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* 가공 완료 후 다운로드 버튼 및 신규 품목 스마트 매핑 */}
                  {orderParseResult && (
                    <div className="space-y-4">
                      {orderParseResult.newRawItems && orderParseResult.newRawItems.length > 0 && (
                        <div className="bg-amber-50/50 border border-amber-200 rounded-xl p-4 space-y-3">
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-amber-500 animate-bounce" />
                            <div>
                              <h3 className="font-bold text-slate-800 text-xs">새로 발견된 미지정 품목 ({orderParseResult.newRawItems.length}건)</h3>
                              <p className="text-[10px] text-slate-500 leading-relaxed">
                                대치 사전에 등록되지 않은 상품명이 업로드되었습니다. 아래에 요약 보고서에 기입하고 싶은 표준 품목명을 적어 사전에 등록하면, 정제가 바로 즉시 적용됩니다! (미입력 시 원본 유지)
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto pr-2">
                            {orderParseResult.newRawItems.map((item: string) => (
                              <div key={item} className="bg-white p-2.5 rounded-lg border border-amber-150 flex flex-col gap-1.5">
                                <div className="text-[10px] font-semibold text-slate-700 truncate" title={item}>
                                  원본: {item}
                                </div>
                                <input
                                  type="text"
                                  placeholder="대치할 표준 품목명 입력..."
                                  value={newItemsMappingForm[item] || ""}
                                  onChange={(e) => {
                                    setNewItemsMappingForm({
                                      ...newItemsMappingForm,
                                      [item]: e.target.value
                                    });
                                  }}
                                  className="text-[11px] border border-slate-200 rounded p-1 focus:outline-none focus:border-amber-400"
                                />
                              </div>
                            ))}
                          </div>

                          <div className="flex justify-end">
                            <button
                              onClick={handleAddNewItemMappings}
                              className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition shadow-sm"
                            >
                              작성한 대치 규칙 저장 및 현재 주문에 즉시 반영
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="bg-slate-50 rounded-xl p-4 border border-slate-150 space-y-3">
                        <div className="text-slate-700 font-bold text-[11px] mb-1">📥 가공 완료된 엑셀 파일 다운로드 (총 2종)</div>
                        <div className="space-y-2">
                          <button
                            onClick={handlePreviewStep1Excel}
                            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold transition shadow-2xs cursor-pointer"
                          >
                            <Eye className="w-4 h-4 text-indigo-600" />
                            👁️ 가공 엑셀 데이터 미리보기 (화면 확대 검수)
                          </button>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <button
                              onClick={handleDownloadSummaryReport}
                              className="flex items-center justify-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition shadow-sm"
                            >
                              <Download className="w-3.5 h-3.5" />
                              1. 요약보고서 다운로드
                            </button>
                            <button
                              onClick={handleDownloadProductSorted}
                              className="flex items-center justify-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition shadow-sm"
                            >
                              <Download className="w-3.5 h-3.5" />
                              2. 품목별정렬 다운로드
                            </button>
                          </div>
                          <button
                            onClick={handleDownloadAllProcessed}
                            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition shadow-sm"
                          >
                            <Layers className="w-3.5 h-3.5 text-indigo-400" />
                            두 개 파일 한 번에 모두 다운로드하기
                          </button>
                        </div>
                        <div id="iframe-download-tip-step1" className="bg-amber-50/70 border border-amber-150 rounded-lg p-3 flex items-start gap-2.5 text-[11px] text-amber-800 leading-relaxed">
                          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <div>
                            <strong className="font-semibold">⚠️ 다운로드 파일이 저장되지 않나요?</strong><br />
                            AI Studio 개발 미리보기(아이프레임) 보안 환경에 따라 브라우저가 파일 다운로드를 차단할 수 있습니다.<br />
                            화면 오른쪽 위의 <strong className="text-amber-900">새 탭에서 열기 (정방향 화살표 모양 아이콘)</strong> 버튼을 눌러 새 창에서 실행하시면 차단 없이 파일이 즉시 저장됩니다!
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {isProcessingOrders && (
                    <div className="flex items-center justify-center gap-2 text-xs text-indigo-600 py-2">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      주문 엑셀 데이터를 정밀 분석 및 다중 정렬 중...
                    </div>
                  )}

                  {/* 1단계 엑셀 품질 검사 대시보드 */}
                  {orderParseResult && stepValidationResult && (
                    <div className="pt-2">
                      <ExcelValidationDashboard
                        validationResult={stepValidationResult}
                        stepFilter={1}
                        totalOrderCount={orderParseResult.orders.length}
                      />
                    </div>
                  )}
                </div>

                {/* 2단계 카드: 운송장 매칭 */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 text-xs font-extrabold flex items-center justify-center">2</span>
                      <h2 className="font-bold text-slate-800 text-sm">운송장 소스 매칭 및 최종 발송엑셀 완성</h2>
                    </div>
                    {trackingResult && (
                      <span className="text-[11px] bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded">
                        완료: {trackingResult.matchCount + trackingResult.softMatchCount}건 매칭 성공
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-500 leading-relaxed">
                    CJ대한통운, 롯데, 한진 등 배송사 시스템으로부터 출력된 '송장정보 엑셀(재출력관리 등)'을 업로드하세요. 수령인, 상품명, 수량, 우편번호를 교차 대조하여 원래 주문서 엑셀에 운송장을 자동으로 기입합니다.
                  </p>

                  {/* 택배사 설정 영역 */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
                    <label className="block text-xs font-bold text-slate-700 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Truck className="w-4 h-4 text-indigo-600" />
                        기본 택배사 선택 / 입력
                      </span>
                      <span className="text-[10px] text-slate-400 font-normal">운송장 소스파일에 택배사가 있으면 자동 반영됩니다</span>
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <select
                        value={selectedCourier}
                        onChange={(e) => setSelectedCourier(e.target.value)}
                        className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="한진택배">한진택배</option>
                        <option value="CJ대한통운">CJ대한통운</option>
                        <option value="로젠택배">로젠택배</option>
                        <option value="우체국택배">우체국택배</option>
                        <option value="롯데택배">롯데택배</option>
                        <option value="경동화물">경동화물</option>
                        <option value="대신화물">대신화물</option>
                        <option value="custom">직접 입력...</option>
                      </select>
                      {selectedCourier === "custom" && (
                        <input
                          type="text"
                          placeholder="택배사명 직접 입력 (예: 한진택배)"
                          value={customCourier}
                          onChange={(e) => setCustomCourier(e.target.value)}
                          className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 flex-1"
                        />
                      )}
                    </div>
                  </div>

                  {/* 드롭존 영역 */}
                  <div className="relative border-2 border-dashed border-slate-200 hover:border-indigo-500 rounded-xl p-6 bg-slate-50 text-center transition cursor-pointer">
                    <input
                      type="file"
                      accept=".xlsx, .xls"
                      disabled={!orderParseResult}
                      onChange={handleSourceFileUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                    />
                    <Upload className={`w-8 h-8 mx-auto mb-2 ${orderParseResult ? 'text-slate-400' : 'text-slate-200'}`} />
                    {!orderParseResult ? (
                      <div className="text-[11px] text-slate-400 font-medium">1단계 주문 데이터를 먼저 업로드해주십시오</div>
                    ) : sourceFile ? (
                      <div className="space-y-1">
                        <div className="text-sm font-semibold text-slate-800">{sourceFile.name}</div>
                        <div className="text-xs text-slate-400">{(sourceFile.size / 1024).toFixed(1)} KB · 파일 재업로드 시 클릭</div>
                      </div>
                    ) : (
                      <div>
                        <div className="text-xs font-semibold text-slate-700">운송장 엑셀 파일을 여기에 올리세요</div>
                        <div className="text-[10px] text-slate-400 mt-1">우편번호/수량 자동검사 및 소프트매칭 지원</div>
                      </div>
                    )}
                  </div>

                  {/* 실행 영역 */}
                  {sourceFile && orderParseResult && (
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-150 space-y-3">
                      <div className="flex gap-2">
                        <button
                          onClick={handleApplyTracking}
                          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium transition"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-indigo-200 animate-pulse" />
                          운송장번호 자동 대조 매칭 실행
                        </button>
                      </div>

                      {trackingResult && (
                        <div className="space-y-2 w-full">
                          <button
                            onClick={handlePreviewStep2Excel}
                            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold transition shadow-2xs cursor-pointer"
                          >
                            <Eye className="w-4 h-4 text-indigo-600" />
                            👁️ 최종 운송장반영 엑셀 미리보기 (화면 확대 검수)
                          </button>
                          <button
                            onClick={handleDownloadFinalTracking}
                            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium transition"
                          >
                            <Download className="w-3.5 h-3.5" />
                            최종 운송장반영 배송엑셀 다운로드
                          </button>
                          <div id="iframe-download-tip-step2" className="bg-amber-50/70 border border-amber-150 rounded-lg p-3 flex items-start gap-2.5 text-[11px] text-amber-800 leading-relaxed">
                            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                            <div>
                              <strong className="font-semibold">⚠️ 다운로드 파일이 저장되지 않나요?</strong><br />
                              개발 미리보기(아이프레임) 환경에서는 브라우저가 보안을 위해 파일 저장을 제한할 수 있습니다.<br />
                              화면 오른쪽 상단의 <strong className="text-amber-900">새 탭에서 열기 (정방향 화살표 모양 아이콘)</strong> 버튼을 눌러 새 창에서 사용하시면 지연 없이 바로 정상 저장됩니다!
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {isProcessingTracking && (
                    <div className="flex items-center justify-center gap-2 text-xs text-indigo-600 py-2">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      고객명/주소/우편번호 교차 검증 및 지능형 매칭 대조 중...
                    </div>
                  )}

                  {/* 2단계 엑셀 품질 검사 대시보드 */}
                  {trackingResult && stepValidationResult && (
                    <div className="pt-2">
                      <ExcelValidationDashboard
                        validationResult={stepValidationResult}
                        stepFilter={2}
                        totalOrderCount={orderParseResult?.orders?.length || 0}
                      />
                    </div>
                  )}
                </div>

              </div>



              {/* 운송장 결과 보고서 대시보드 */}
              {trackingResult && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">운송장 매칭 통계 및 결과 보고서</h3>
                    <button
                      onClick={() => openConfirm("작업 영역 리셋", "현재 작업 중인 주문 데이터 및 운송장 매칭 결과가 모두 초기화됩니다. 정말 리셋하시겠습니까?", handleResetProcess)}
                      className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      작업 영역 리셋하고 처음부터 하기
                    </button>
                  </div>
                  
                  <WaybillReportDashboard
                    matchCount={trackingResult.matchCount}
                    softMatchCount={trackingResult.softMatchCount}
                    unfilledErrors={trackingResult.unfilledErrors}
                    unusedErrors={trackingResult.unusedErrors}
                    totalInputRows={orderParseResult ? orderParseResult.orders.length : 0}
                    outputOrders={trackingResult.outputOrders}
                  />
                </div>
              )}

              {/* 친절한 사용법 가이드 팁 */}
              {!orderParseResult && (
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                  <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5 border-b border-slate-100 pb-3">
                    <Info className="w-4 h-4 text-indigo-500" />
                    운송장 관리 자동화 워크플로우 안내
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                    <div className="space-y-1.5">
                      <div className="text-xs font-bold text-indigo-600">Step 1. 주문 가공 및 내보내기</div>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        주문서(스마트스토어/쿠팡 등) 파일을 불러오면, 상품명 표준화 및 합포장 다중 정렬이 완료됩니다. <strong>[가공정렬 & 요약보고서 다운로드]</strong>를 클릭해 가공된 파일을 받으세요.
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <div className="text-xs font-bold text-indigo-600">Step 2. 운송장 출력</div>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        내려받은 가공정렬 파일을 바탕으로 택배사 소프트웨어를 실행하여 운송장을 인쇄하고, 인쇄 결과 파일(송장번호가 들어있는 엑셀)을 보관합니다.
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <div className="text-xs font-bold text-indigo-600">Step 3. 운송장 대조 매칭</div>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        방금 받은 송장번호 엑셀을 우측 업로드란에 넣고 <strong>[운송장 대조 매칭]</strong>을 클릭하면 주문서에 송장번호가 1초 만에 기입된 완벽한 최종 발송 파일이 탄생합니다!
                      </p>
                    </div>
                  </div>
                </div>
              )}

            </motion.div>
          )}

          {/* 탭 2: 플랫폼 관리 */}
          {activeTab === 'platforms' && (
            <motion.div
              key="platforms-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <PlatformSettings 
                platforms={platforms} 
                onChange={setPlatforms} 
              />
            </motion.div>
          )}

          {/* 탭 3: 품목 정제 사전 */}
          {activeTab === 'products' && (
            <motion.div
              key="products-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <ProductMappingList 
                mappings={productMappings} 
                onChange={setProductMappings} 
              />
            </motion.div>
          )}

          {/* 탭 4: 설정 백업/동기화 */}
          {activeTab === 'backup' && (
            <motion.div
              key="backup-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-2xl mx-auto bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6"
            >
              <div>
                <h2 className="text-lg font-bold text-slate-800">설정 백업 및 데이터 안전 보존</h2>
                <p className="text-xs text-slate-500 mt-1">
                  작성해 둔 플랫폼들의 컬럼 인덱스 매핑 설정과 정밀 품목 대치 단어 사전을 파일로 내보내거나 가져올 수 있습니다. 다른 컴퓨터에서도 연속해서 안전하게 업무를 수행하세요.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* 백업 내보내기 */}
                <div className="bg-slate-50 p-5 rounded-xl border border-slate-150 flex flex-col justify-between space-y-4">
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm">설정 백업 파일로 저장</h3>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      현재 등록된 {platforms.length}개의 쇼핑몰 플랫폼 매핑 데이터 및 {productMappings.length}개의 대치 사전을 백업용 규격 파일(.json)로 즉시 다운로드합니다.
                    </p>
                  </div>
                  <button
                    onClick={handleExportBackup}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition"
                  >
                    <Download className="w-4 h-4" />
                    내보내기 실행 (.json)
                  </button>
                </div>

                {/* 백업 가져오기 */}
                <div className="bg-slate-50 p-5 rounded-xl border border-slate-150 flex flex-col justify-between space-y-4">
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm">백업된 파일에서 복원</h3>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      이전에 하드 드라이브나 다른 컴퓨터에서 백업해 두었던 설정 파일(.json)을 업로드하여 복원 작업을 빠르게 완료합니다.
                    </p>
                  </div>
                  <div className="relative">
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImportBackup}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <button
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition"
                    >
                      <Upload className="w-4 h-4 text-slate-400" />
                      백업 파일 가져오기
                    </button>
                  </div>
                </div>

              </div>

              {/* 디스크 초기화 */}
              <div className="border-t border-slate-150 pt-5 flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-xs font-bold text-slate-700">기본 설정 데이터로 전체 초기화</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">처음 설치했을 때의 네이버/쿠팡 및 샘플 품목 매핑 사전 데이터로 모두 되돌립니다.</p>
                </div>
                <button
                  onClick={handleResetToDefault}
                  className="px-4 py-2 border border-rose-100 hover:border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold rounded-lg transition"
                >
                  기본값으로 초기화
                </button>
              </div>

            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* 엑셀 데이터 미리보기 모달 */}
      <ExcelPreviewModal
        isOpen={previewModal.isOpen}
        onClose={() => setPreviewModal(prev => ({ ...prev, isOpen: false }))}
        title={previewModal.title}
        subtitle={previewModal.subtitle}
        files={previewModal.files}
        onDownloadAll={previewModal.onDownloadAll}
        downloadAllButtonText={previewModal.downloadAllButtonText}
      />

      {/* 하단 푸터 */}
      <footer id="main-footer" className="bg-slate-900 border-t border-slate-800 text-slate-500 py-3 text-center text-[10px] shrink-0 leading-relaxed">
        <div className="max-w-7xl mx-auto px-4">
          스마트 운송장 가공 및 매칭 시스템 · 본 브라우저 샌드박스 내부에서 100% 암호화 연산 처리되어 민감한 개인정보/주문 정보가 외부로 유출되지 않아 안전합니다.
        </div>
      </footer>

    </div>
  );
}
