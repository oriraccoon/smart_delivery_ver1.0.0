import { ProcessedOrder, ProductMapping, InspectionCheckItem, StepValidationResult } from '../types';

export interface ValidationInputStep1 {
  rawOrders: ProcessedOrder[];
  processedOrders: ProcessedOrder[];
  summaryDetailHeaders: string[]; // 요약보고서 '상세내역' 시트 헤더
  summaryDetailRows: { 용량: string; 상품명: string; 수량: number; 주문자: string; multiplier?: number; [key: string]: any }[];
  summaryGroupHeaders: string[]; // 요약보고서 '상품준비요약' 시트 헤더
  summaryGroupRows: { 상품분류: string; 총수량: number; 총kg?: number; [key: string]: any }[];
  sortedHeaders: string[]; // '품목별정렬' 시트 헤더
  sortedRows: ProcessedOrder[];
  productMappings: ProductMapping[];
}

export interface OutputFileInfo {
  fileName: string;
  platformName: string;
  totalRows: number;
  headers: string[];
  originalHeaders: string[];
  missingTrackingCount: number;
  missingCourierCount: number;
  duplicateDeliveryNCount: number; // 쿠팡 DeliveryList 합포장건(N) 중복 잔여 수
  missingTrackingRows?: number[];
  duplicateDeliveryNRows?: number[];
}

export interface ValidationInputStep2 {
  step1InputOrderCount: number;
  outputFiles: OutputFileInfo[];
}

export function runComprehensiveValidation(
  step1Input?: ValidationInputStep1,
  step2Input?: ValidationInputStep2
): StepValidationResult {
  const step1Checks: InspectionCheckItem[] = [];
  const step2Checks: InspectionCheckItem[] = [];

  // ----------------------------------------------------
  // STEP 1 검증
  // ----------------------------------------------------
  if (step1Input) {
    const {
      rawOrders,
      processedOrders,
      summaryDetailHeaders,
      summaryDetailRows,
      summaryGroupRows,
      sortedHeaders,
      sortedRows,
      productMappings
    } = step1Input;

    const rawCount = rawOrders.length;

    // STEP1 ERROR 1: 요약보고서 상세내역 시트 포맷 [용량, 상품명, 수량, 주문자]
    const reqDetailHeaders = ['용량', '상품명', '수량', '주문자'];
    const detailHeaderFailures: string[] = [];
    reqDetailHeaders.forEach((h, idx) => {
      if (!summaryDetailHeaders[idx] || !summaryDetailHeaders[idx].includes(h)) {
        detailHeaderFailures.push(`컬럼 ${idx + 1}번째: '${h}' 필요 (현재: '${summaryDetailHeaders[idx] || '없음'}')`);
      }
    });

    step1Checks.push({
      id: 'step1_e1',
      step: 1,
      category: 'ERROR',
      code: 'STEP1_E1',
      title: '요약보고서 상세내역 시트 포맷 검사',
      status: detailHeaderFailures.length === 0 ? 'PASS' : 'FAIL',
      description: '상세내역 시트 포맷이 [용량, 상품명, 수량, 주문자]로 구성되었는지 확인',
      failCount: detailHeaderFailures.length,
      details: detailHeaderFailures.length === 0 ? ['정상 포맷 [용량, 상품명, 수량, 주문자] 준수함'] : detailHeaderFailures
    });

    // STEP1 ERROR 2: 요약보고서 상세내역 시트 누락 발생 여부
    const detailMissingDetails: string[] = [];
    summaryDetailRows.forEach((r, idx) => {
      if (!r.용량 || !r.상품명 || r.수량 === undefined || r.수량 === null || !r.주문자) {
        detailMissingDetails.push(`${idx + 1}행 [주문자: ${r.주문자 || '미입력'}, 상품명: ${r.상품명 || '미입력'}] 누락 필드 존재`);
      }
    });

    step1Checks.push({
      id: 'step1_e2',
      step: 1,
      category: 'ERROR',
      code: 'STEP1_E2',
      title: '요약보고서 상세내역 무결성 검사',
      status: detailMissingDetails.length === 0 ? 'PASS' : 'FAIL',
      description: '상세내역 시트에서 누락된 데이터(용량, 상품명, 수량, 주문자) 존재 여부 확인',
      failCount: detailMissingDetails.length,
      details: detailMissingDetails.length === 0 ? ['상세내역 누락 항목 없음 (100% 기입)'] : detailMissingDetails
    });

    // STEP1 ERROR 3: 요약보고서 상세내역 개수가 input(원 데이터)과 일치하지 않은 경우
    const detailCountDiff = Math.abs(summaryDetailRows.length - rawCount);
    const detailCountDetails: string[] = [];
    if (detailCountDiff !== 0) {
      detailCountDetails.push(`원본 업로드 건수(${rawCount}건) vs 요약보고서 상세내역 건수(${summaryDetailRows.length}건) 불일치 (오차: ${detailCountDiff}건)`);
    }

    step1Checks.push({
      id: 'step1_e3',
      step: 1,
      category: 'ERROR',
      code: 'STEP1_E3',
      title: '요약보고서 상세내역 총 수량 검사',
      status: detailCountDiff === 0 ? 'PASS' : 'FAIL',
      description: '요약보고서 상세내역 행 개수가 원본 업로드 건수와 일치하는지 확인',
      failCount: detailCountDiff,
      details: detailCountDiff === 0 ? [`원본 건수(${rawCount}건)와 완벽히 일치함`] : detailCountDetails
    });

    // STEP1 ERROR 4: 요약보고서 상품준비요약 시트의 개수가 상세내역 총 개수(C열 값 * A열 분리 갯수)와 일치하는지 검사
    // 사용자 지침: "kg은 패스하고 갯수만 맞는지 확인해. 상세내역 합계는 행 갯수가 아니라 (C열 값 * A열에서 분리한 갯수)들의 총합이야"
    let detailTotalQty = 0;
    summaryDetailRows.forEach(r => {
      const rowQty = Number(r.수량) || 0;
      const rowMult = Number(r.multiplier) || 1;
      detailTotalQty += rowQty * rowMult;
    });

    let groupTotalQty = 0;
    summaryGroupRows.forEach(r => {
      groupTotalQty += Number(r.총수량 || r.수량 || r['총 개수'] || r['개수']) || 0;
    });

    const qtyMismatch = Math.abs(detailTotalQty - groupTotalQty) > 0.01;
    const groupCalcDetails: string[] = [];
    if (qtyMismatch) {
      groupCalcDetails.push(`상세내역 총 개수(${detailTotalQty}개) != 상품준비요약 총수량(${groupTotalQty}개) 불일치`);
    }

    step1Checks.push({
      id: 'step1_e4',
      step: 1,
      category: 'ERROR',
      code: 'STEP1_E4',
      title: '상품준비요약 수량 합계 일치 검사',
      status: groupCalcDetails.length === 0 ? 'PASS' : 'FAIL',
      description: '상품준비요약 시트의 총 수량이 상세내역 수량 총합과 일치하는지 검증',
      failCount: groupCalcDetails.length,
      details: groupCalcDetails.length === 0 ? [`상세내역 및 상품준비요약 총 수량(${detailTotalQty}개) 일치함`] : groupCalcDetails
    });

    // STEP1 ERROR 5 (E5)는 사용자 요청에 따라 제외/삭제 처리됨

    // STEP1 ERROR 6: 품목별정렬 시트 포맷 [용량, 상품명, 수량(고정), 수량, 수령인, 연락처, 우편번호, 주소, 배송메세지]
    const reqSortedHeaders = ['용량', '상품명', '수량(고정)', '수량', '수령인', '연락처', '우편번호', '주소', '배송메세지'];
    const sortedHeaderFailures: string[] = [];
    reqSortedHeaders.forEach((h, idx) => {
      if (!sortedHeaders[idx] || !sortedHeaders[idx].includes(h.replace('(고정)', ''))) {
        sortedHeaderFailures.push(`컬럼 ${idx + 1}번째: '${h}' 필요 (현재: '${sortedHeaders[idx] || '없음'}')`);
      }
    });

    step1Checks.push({
      id: 'step1_e6',
      step: 1,
      category: 'ERROR',
      code: 'STEP1_E6',
      title: '품목별정렬 시트 포맷 검사',
      status: sortedHeaderFailures.length === 0 ? 'PASS' : 'FAIL',
      description: '품목별정렬 시트 헤더가 [용량, 상품명, 수량(고정), 수량, 수령인, 연락처, 우편번호, 주소, 배송메세지] 인지 확인',
      failCount: sortedHeaderFailures.length,
      details: sortedHeaderFailures.length === 0 ? ['표준 규격 포맷 준수 확인'] : sortedHeaderFailures
    });

    // STEP1 ERROR 7: 품목별정렬 C열 수량(고정)의 값이 1이 아닌 게 있는 경우
    // 사용자 지침: C열 수량(고정)은 엑셀 인쇄/양식용 1로 고정 기입됨.
    const nonOneCColDetails: string[] = [];
    sortedRows.forEach((r, idx) => {
      // 품목별정렬 C열 고정 수량값은 1이어야 함 (multiplier는 D열 수량 분리 배수임)
      const fixedQtyVal = r.fixedQty !== undefined ? r.fixedQty : 1; 
      if (fixedQtyVal !== 1) {
        nonOneCColDetails.push(`${idx + 1}행 [수령인: ${r.수령인 || '미입력'}]: C열 수량(고정) 값이 ${fixedQtyVal}로 1이 아닙니다.`);
      }
    });

    step1Checks.push({
      id: 'step1_e7',
      step: 1,
      category: 'ERROR',
      code: 'STEP1_E7',
      title: '품목별정렬 C열 수량(고정) 고정값(1) 검사',
      status: nonOneCColDetails.length === 0 ? 'PASS' : 'FAIL',
      description: '품목별정렬의 C열(수량 고정열)이 예외 없이 모두 1로 고정되었는지 확인',
      failCount: nonOneCColDetails.length,
      details: nonOneCColDetails.length === 0 ? ['C열 수량(고정) 모든 행이 1로 정방향 세팅됨'] : nonOneCColDetails
    });

    // STEP1 ERROR 8: 품목별정렬 내용 중 누락이 있는 경우
    const sortedMissingDetails: string[] = [];
    sortedRows.forEach((r, idx) => {
      const missingList: string[] = [];
      if (!r.수령인) missingList.push('수령인');
      if (!r.주소) missingList.push('주소');
      if (!r.연락처) missingList.push('연락처');
      if (!r.상품명) missingList.push('상품명');
      if (!r.수량) missingList.push('수량');

      if (missingList.length > 0) {
        sortedMissingDetails.push(`${idx + 1}행 [${r.sourceFileName || '원본'}] ${missingList.join(', ')} 정보 누락`);
      }
    });

    step1Checks.push({
      id: 'step1_e8',
      step: 1,
      category: 'ERROR',
      code: 'STEP1_E8',
      title: '품목별정렬 데이터 무결성 검사',
      status: sortedMissingDetails.length === 0 ? 'PASS' : 'FAIL',
      description: '품목별정렬 데이터 중 필수 배송/주문 정보(수령인, 주소, 연락처, 상품명, 수량) 누락 여부 확인',
      failCount: sortedMissingDetails.length,
      details: sortedMissingDetails.length === 0 ? ['모든 가공 데이터 누락 없음 (완벽 기입)'] : sortedMissingDetails
    });

    // STEP1 ERROR 9: 품목별정렬의 상품명이 대치 키워드로 잘못 변환된 경우
    // 품목별정렬에서는 원본/표준화 상품명이어야 하며, 대치 키워드(분류 카테고리명)로 변환되면 안 됨.
    const sortedReplacedDetails: string[] = [];
    sortedRows.forEach((r, idx) => {
      // r.category나 r.mappedCategory는 대치 키워드(분류명)임. 상품명(r.상품명)이 분류명과 동일하다면 변환 오류
      if (r.category && r.상품명 === r.category && r.originalProductName && r.originalProductName !== r.category) {
        sortedReplacedDetails.push(`${idx + 1}행 상품명 '${r.originalProductName}'가 품목별정렬 시트에 대치 키워드 '${r.상품명}'로 잘못 변환되었습니다.`);
      }
    });

    step1Checks.push({
      id: 'step1_e9',
      step: 1,
      category: 'ERROR',
      code: 'STEP1_E9',
      title: '품목별정렬 상품명 원본 유지 검사',
      status: sortedReplacedDetails.length === 0 ? 'PASS' : 'FAIL',
      description: '품목별정렬 시트의 상품명이 대치 키워드로 오변환되지 않고 올바르게 유지되었는지 확인',
      failCount: sortedReplacedDetails.length,
      details: sortedReplacedDetails.length === 0 ? ['상품명이 대치 키워드로 변환되지 않고 올바르게 유지됨'] : sortedReplacedDetails
    });

    // STEP1 WARNING 1: 요약보고서 상품준비요약 시트에서 상품 분류 중 대치 키워드를 발견하지 못한 경우
    const unmappedKeywordDetails: string[] = [];
    summaryGroupRows.forEach((r, idx) => {
      const clsName = String(r.상품분류 || r.분류 || "").trim();
      if (clsName === '미지정/기타' || clsName.includes('미매핑') || clsName.includes('미지정')) {
        unmappedKeywordDetails.push(`${idx + 1}행: 상품 분류를 찾을 수 없어 '미지정/기타'로 분류되었습니다.`);
      }
    });

    step1Checks.push({
      id: 'step1_w1',
      step: 1,
      category: 'WARNING',
      code: 'STEP1_W1',
      title: '상품준비요약 대치 키워드 미발견(미매핑) 검사',
      status: unmappedKeywordDetails.length === 0 ? 'PASS' : 'WARNING',
      description: '매핑 사전에 등록되어 있지 않아 대치 키워드를 찾지 못한 품목 존재 여부 확인',
      failCount: unmappedKeywordDetails.length,
      details: unmappedKeywordDetails.length === 0 ? ['모든 품목의 대치 키워드 완벽 발견/매핑 완료'] : unmappedKeywordDetails
    });
  }

  // ----------------------------------------------------
  // STEP 2 검증
  // ----------------------------------------------------
  if (step2Input && step2Input.outputFiles && step2Input.outputFiles.length > 0) {
    const { step1InputOrderCount, outputFiles } = step2Input;

    // STEP2 ERROR 1: output 생성 엑셀의 총 개수가 input 넣은 엑셀의 개수와 다른 경우
    let totalOutputOrderCount = 0;
    outputFiles.forEach(f => {
      totalOutputOrderCount += f.totalRows;
    });

    const outputCountDiff = Math.abs(totalOutputOrderCount - step1InputOrderCount);
    const countMismatchDetails: string[] = [];
    if (outputCountDiff !== 0) {
      countMismatchDetails.push(`1단계 input 주문 수량(${step1InputOrderCount}건) vs 2단계 output 주문 수량(${totalOutputOrderCount}건) 불일치 (오차: ${outputCountDiff}건)`);
    }

    step2Checks.push({
      id: 'step2_e1',
      step: 2,
      category: 'ERROR',
      code: 'STEP2_E1',
      title: '최종 발송 엑셀 총 주문 수량 일치 검사',
      status: outputCountDiff === 0 ? 'PASS' : 'FAIL',
      description: '생성된 output 엑셀들의 총 행 개수가 1단계 input 주문 건수와 일치하는지 확인',
      failCount: outputCountDiff,
      details: outputCountDiff === 0 ? [`Input 주문 수량(${step1InputOrderCount}건)과 100% 일치함`] : countMismatchDetails
    });

    // STEP2 ERROR 2: output 엑셀 포맷이 input 엑셀 포맷과 일치하지 않은 경우
    const formatMismatchDetails: string[] = [];
    outputFiles.forEach(f => {
      if (f.originalHeaders && f.originalHeaders.length > 0 && f.headers && f.headers.length > 0) {
        const h1 = f.originalHeaders.slice(0, 10).join(',');
        const h2 = f.headers.slice(0, 10).join(',');
        if (h1 !== h2) {
          formatMismatchDetails.push(`[${f.fileName}] 원본 컬럼 구조와 최종 output 엑셀의 컬럼 구조가 일치하지 않습니다.`);
        }
      }
    });

    step2Checks.push({
      id: 'step2_e2',
      step: 2,
      category: 'ERROR',
      code: 'STEP2_E2',
      title: '최종 output 엑셀 서식/컬럼 포맷 일치 검사',
      status: formatMismatchDetails.length === 0 ? 'PASS' : 'FAIL',
      description: '생성된 각 output 엑셀의 컬럼 구조 및 포맷이 1단계 input 엑셀 구조와 완벽히 일치하는지 확인',
      failCount: formatMismatchDetails.length,
      details: formatMismatchDetails.length === 0 ? ['모든 플랫폼별 output 엑셀 포맷 정상 보존 확인'] : formatMismatchDetails
    });

    // STEP2 ERROR 3: output 엑셀의 운송장번호 누락인 경우
    let totalMissingTracking = 0;
    const missingTrackingDetails: string[] = [];
    outputFiles.forEach(f => {
      if (f.missingTrackingCount > 0) {
        totalMissingTracking += f.missingTrackingCount;
        missingTrackingDetails.push(`[${f.fileName}] 운송장번호 미매핑/누락 ${f.missingTrackingCount}건`);
      }
    });

    step2Checks.push({
      id: 'step2_e3',
      step: 2,
      category: 'ERROR',
      code: 'STEP2_E3',
      title: '운송장번호 매핑 및 기입 누락 검사',
      status: totalMissingTracking === 0 ? 'PASS' : 'FAIL',
      description: '최종 발송 엑셀에서 운송장번호가 누락되거나 미입력된 건이 있는지 확인',
      failCount: totalMissingTracking,
      details: totalMissingTracking === 0 ? ['모든 주문건에 운송장번호 매핑 및 기입 완료'] : missingTrackingDetails
    });

    // STEP2 ERROR 4: 쿠팡 엑셀(DeliveryList)에서 합포장건(N)이 중복 제거 실패한 경우
    let totalDupN = 0;
    const dupNDetails: string[] = [];
    outputFiles.forEach(f => {
      if (f.duplicateDeliveryNCount > 0) {
        totalDupN += f.duplicateDeliveryNCount;
        dupNDetails.push(`[${f.fileName}] 쿠팡 분리배송 'N' 중복 잔여 ${f.duplicateDeliveryNCount}건 (중복 제거 미완료)`);
      }
    });

    step2Checks.push({
      id: 'step2_e4',
      step: 2,
      category: 'ERROR',
      code: 'STEP2_E4',
      title: '쿠팡 DeliveryList 합포장(N) 중복 제거 검사',
      status: totalDupN === 0 ? 'PASS' : 'FAIL',
      description: '쿠팡 엑셀에서 동일 주문(A열 번호)의 분리배송 N 중복 행이 정상적으로 단일화되었는지 확인',
      failCount: totalDupN,
      details: totalDupN === 0 ? ['쿠팡 합포장건(N) 중복 완전 제거 및 단일화 성공'] : dupNDetails
    });

    // STEP2 WARNING 1: output 엑셀의 택배사 누락인 경우
    let totalMissingCourier = 0;
    const missingCourierDetails: string[] = [];
    outputFiles.forEach(f => {
      if (f.missingCourierCount > 0) {
        totalMissingCourier += f.missingCourierCount;
        missingCourierDetails.push(`[${f.fileName}] 택배사명 미입력 ${f.missingCourierCount}건`);
      }
    });

    step2Checks.push({
      id: 'step2_w1',
      step: 2,
      category: 'WARNING',
      code: 'STEP2_W1',
      title: '택배사 정보 기입 검사',
      status: totalMissingCourier === 0 ? 'PASS' : 'WARNING',
      description: '생성된 각 output 엑셀에 택배사명이 정상 기입되었는지 확인',
      failCount: totalMissingCourier,
      details: totalMissingCourier === 0 ? ['모든 건에 택배사 명칭 기입 완료'] : missingCourierDetails
    });
  }

  // overall status 구하기
  const getStepStatus = (checks: InspectionCheckItem[]): 'PASS' | 'FAIL' | 'WARNING' => {
    if (checks.some(c => c.status === 'FAIL')) return 'FAIL';
    if (checks.some(c => c.status === 'WARNING')) return 'WARNING';
    return 'PASS';
  };

  const step1Status = getStepStatus(step1Checks);
  const step2Status = getStepStatus(step2Checks);

  const totalFailCount = [...step1Checks, ...step2Checks].filter(c => c.status === 'FAIL').length;
  const totalWarningCount = [...step1Checks, ...step2Checks].filter(c => c.status === 'WARNING').length;

  return {
    step1: step1Checks,
    step2: step2Checks,
    step1Status,
    step2Status,
    totalFailCount,
    totalWarningCount
  };
}
