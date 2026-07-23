import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  Info,
  Layers,
  Truck,
  X,
  ListFilter,
  ChevronRight
} from 'lucide-react';
import { InspectionCheckItem, StepValidationResult } from '../types';

interface ExcelValidationDashboardProps {
  validationResult?: StepValidationResult;
  stepFilter?: 1 | 2; // 1: 1단계 가공 검사만, 2: 2단계 발송엑셀 검사만
  totalOrderCount?: number;
}

export default function ExcelValidationDashboard({
  validationResult,
  stepFilter
}: ExcelValidationDashboardProps) {
  // 전체 검사 항목 팝업 모달 상태
  const [isFullListModalOpen, setIsFullListModalOpen] = useState(false);
  const [selectedDetailCheck, setSelectedDetailCheck] = useState<InspectionCheckItem | null>(null);

  if (!validationResult) {
    return null;
  }

  const { step1, step2, step1Status, step2Status } = validationResult;

  // 현재 stepFilter에 맞는 항목 및 상태 결정
  const currentStepChecks =
    stepFilter === 1 ? step1 : stepFilter === 2 ? step2 : [...step1, ...step2];

  const currentStepStatus =
    stepFilter === 1
      ? step1Status
      : stepFilter === 2
      ? step2Status
      : step1Status === 'FAIL' || step2Status === 'FAIL'
      ? 'FAIL'
      : step1Status === 'WARNING' || step2Status === 'WARNING'
      ? 'WARNING'
      : 'PASS';

  const failCount = currentStepChecks.filter((c) => c.status === 'FAIL').length;
  const warningCount = currentStepChecks.filter((c) => c.status === 'WARNING').length;

  // 이슈(ERROR, WARNING) 항목들만 필터링
  const issueChecks = currentStepChecks.filter((c) => c.status !== 'PASS');

  const getStatusBadge = (status: 'PASS' | 'FAIL' | 'WARNING') => {
    switch (status) {
      case 'PASS':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold bg-emerald-100 text-emerald-800 rounded-full border border-emerald-300 flex-shrink-0">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            PASS
          </span>
        );
      case 'FAIL':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold bg-rose-100 text-rose-800 rounded-full border border-rose-300 flex-shrink-0">
            <XCircle className="w-3 h-3 text-rose-600" />
            ERROR
          </span>
        );
      case 'WARNING':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold bg-amber-100 text-amber-800 rounded-full border border-amber-300 flex-shrink-0">
            <AlertTriangle className="w-3 h-3 text-amber-600" />
            WARNING
          </span>
        );
    }
  };

  const stepTitle =
    stepFilter === 1
      ? '1단계 주문 데이터 가공 품질 검사'
      : stepFilter === 2
      ? '2단계 최종 발송 엑셀 검증'
      : '엑셀 품질 및 무결성 종합 검사';

  const stepIcon = stepFilter === 2 ? <Truck className="w-5 h-5" /> : <Layers className="w-5 h-5" />;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6">
      {/* 1. 상단 요약 바 */}
      <div
        className={`px-4 py-3 flex flex-wrap items-center justify-between transition-colors ${
          failCount > 0
            ? 'bg-rose-50/80 border-b border-rose-100'
            : warningCount > 0
            ? 'bg-amber-50/80 border-b border-amber-100'
            : 'bg-emerald-50/80 border-b border-emerald-100'
        }`}
      >
        <div className="flex items-center gap-2.5">
          {failCount > 0 ? (
            <div className="p-2 bg-rose-100 text-rose-700 rounded-lg border border-rose-200 flex-shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
          ) : warningCount > 0 ? (
            <div className="p-2 bg-amber-100 text-amber-700 rounded-lg border border-amber-200 flex-shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
          ) : (
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg border border-emerald-200 flex-shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
          )}

          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5">
                {stepIcon}
                <span>{stepTitle}</span>
              </h3>
              {failCount > 0 ? (
                <span className="px-2 py-0.5 text-xs font-bold bg-rose-600 text-white rounded-full">
                  오류 {failCount}건
                </span>
              ) : warningCount > 0 ? (
                <span className="px-2 py-0.5 text-xs font-bold bg-amber-500 text-white rounded-full">
                  경고 {warningCount}건
                </span>
              ) : (
                <span className="px-2 py-0.5 text-xs font-bold bg-emerald-600 text-white rounded-full">
                  정상 (PASS)
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {currentStepChecks.length}개 항목 검사 완료 (진단 결과: {currentStepStatus})
            </p>
          </div>
        </div>

        {/* 전체 검사 리스트 팝업 버튼 */}
        <button
          onClick={() => setIsFullListModalOpen(true)}
          className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors mt-2 sm:mt-0"
        >
          <ListFilter className="w-3.5 h-3.5 text-indigo-600" />
          <span>전체 검사 항목 ({currentStepChecks.length})</span>
        </button>
      </div>

      {/* 2. 평소 메인 영역: 에러/경고 한 줄 슬림 목록 */}
      <div className="p-3">
        {issueChecks.length > 0 ? (
          <div className="space-y-1.5">
            <div className="text-[11px] font-bold text-slate-500 px-1 mb-1">
              ※ 클릭하면 상세 오류 내역을 확인할 수 있습니다.
            </div>

            <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden bg-white shadow-2xs">
              {issueChecks.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setSelectedDetailCheck(item)}
                  className={`px-3 py-2.5 flex items-center justify-between gap-2 cursor-pointer transition-colors hover:bg-slate-50 ${
                    item.status === 'FAIL' ? 'bg-rose-50/20' : 'bg-amber-50/20'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span
                      className={`px-1.5 py-0.5 text-[10px] font-mono font-extrabold rounded flex-shrink-0 ${
                        item.category === 'ERROR' ? 'bg-rose-600 text-white' : 'bg-amber-500 text-white'
                      }`}
                    >
                      {item.code}
                    </span>

                    <span className="text-xs font-bold text-slate-800 flex-shrink-0">
                      {item.title}
                    </span>

                    <span className="text-xs text-slate-500 truncate min-w-0">
                      - {item.description}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {getStatusBadge(item.status)}
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* 에러/경고가 전혀 없는 경우 */
          <div className="py-3 px-4 bg-emerald-50/50 rounded-lg border border-emerald-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span className="text-xs font-bold text-emerald-900">
                모든 검사를 완벽히 통과했습니다. (오류/경고 없음)
              </span>
            </div>
            <button
              onClick={() => setIsFullListModalOpen(true)}
              className="text-xs text-emerald-700 underline font-semibold hover:text-emerald-900"
            >
              전체 항목 보기
            </button>
          </div>
        )}
      </div>

      {/* 3. 전체 검사 리스트 팝업 모달 */}
      <AnimatePresence>
        {isFullListModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full overflow-hidden flex flex-col max-h-[85vh]"
            >
              {/* 모달 헤더 */}
              <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-2">
                  <ListFilter className="w-4 h-4 text-indigo-600" />
                  <h3 className="text-sm font-bold text-slate-800">
                    {stepTitle} 전체 항목 ({currentStepChecks.length}개)
                  </h3>
                </div>

                <button
                  onClick={() => setIsFullListModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* 모달 검사 리스트 테이블 */}
              <div className="p-4 overflow-y-auto flex-1">
                <div className="text-[11px] font-bold text-slate-500 mb-2">
                  ※ 각 검사 항목을 클릭하면 세부 규격 및 진단 기록을 확인할 수 있습니다.
                </div>
                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-xs text-left text-slate-700">
                    <thead className="bg-slate-100 text-slate-700 uppercase font-semibold border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-2 w-16 text-center">구분</th>
                        <th className="px-3 py-2 w-20 text-center">코드</th>
                        <th className="px-3 py-2 w-48">검사 항목명</th>
                        <th className="px-3 py-2">검사 세부 내용</th>
                        <th className="px-3 py-2 w-24 text-center">결과</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {currentStepChecks.map((item) => (
                        <tr
                          key={item.id}
                          onClick={() => setSelectedDetailCheck(item)}
                          className={`hover:bg-indigo-50/50 cursor-pointer transition-colors ${
                            item.status === 'FAIL'
                              ? 'bg-rose-50/30'
                              : item.status === 'WARNING'
                              ? 'bg-amber-50/30'
                              : ''
                          }`}
                        >
                          <td className="px-3 py-2.5 text-center font-bold">
                            {item.category === 'ERROR' ? (
                              <span className="px-1.5 py-0.5 text-[10px] font-extrabold bg-rose-100 text-rose-700 rounded border border-rose-200">
                                ERROR
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 text-[10px] font-extrabold bg-amber-100 text-amber-800 rounded border border-amber-200">
                                WARN
                              </span>
                            )}
                          </td>

                          <td className="px-3 py-2.5 text-center font-mono font-bold text-slate-600">
                            {item.code}
                          </td>

                          <td className="px-3 py-2.5 font-bold text-slate-800">
                            {item.title}
                          </td>

                          <td className="px-3 py-2.5 text-slate-600 truncate max-w-xs">
                            {item.description}
                          </td>

                          <td className="px-3 py-2.5 text-center">
                            {getStatusBadge(item.status)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 모달 푸터 */}
              <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
                <button
                  onClick={() => setIsFullListModalOpen(false)}
                  className="px-4 py-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors"
                >
                  닫기
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 4. 세부 로그 모달 팝업 */}
      <AnimatePresence>
        {selectedDetailCheck && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden"
            >
              {/* 모달 헤더 */}
              <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-2">
                  <Info className="w-5 h-5 text-indigo-600" />
                  <h4 className="text-sm font-bold text-slate-800">
                    검사 항목 세부 진단 결과 [{selectedDetailCheck.code}]
                  </h4>
                </div>
                <button
                  onClick={() => setSelectedDetailCheck(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* 모달 바디 */}
              <div className="p-5 max-h-[60vh] overflow-y-auto space-y-4">
                <div>
                  <div className="text-xs font-semibold text-slate-500">검사 항목명</div>
                  <div className="text-base font-bold text-slate-800 mt-0.5">
                    [{selectedDetailCheck.step}단계] {selectedDetailCheck.title}
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-xs font-medium text-slate-600">진단 상태</span>
                  <div>{getStatusBadge(selectedDetailCheck.status)}</div>
                </div>

                <div>
                  <div className="text-xs font-semibold text-slate-500 mb-1">검사 요구 조건 / 설명</div>
                  <p className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-200 leading-relaxed">
                    {selectedDetailCheck.description}
                  </p>
                </div>

                <div>
                  <div className="text-xs font-bold text-slate-700 mb-2 flex items-center justify-between">
                    <span>진단 및 세부 로깅 메시지</span>
                    <span className="text-[11px] text-slate-500 font-normal">
                      총 {selectedDetailCheck.details.length}건
                    </span>
                  </div>

                  <div className="bg-slate-900 text-slate-100 p-3 rounded-lg font-mono text-xs leading-relaxed space-y-1 max-h-48 overflow-y-auto border border-slate-800">
                    {selectedDetailCheck.details.map((dt, idx) => (
                      <div key={idx} className="flex gap-2">
                        <span className="text-slate-500 select-none flex-shrink-0">[{idx + 1}]</span>
                        <span
                          className={
                            selectedDetailCheck.status === 'FAIL'
                              ? 'text-rose-300'
                              : selectedDetailCheck.status === 'WARNING'
                              ? 'text-amber-300'
                              : 'text-emerald-300'
                          }
                        >
                          {dt}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 모달 푸터 */}
              <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
                <button
                  onClick={() => setSelectedDetailCheck(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors"
                >
                  닫기
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
