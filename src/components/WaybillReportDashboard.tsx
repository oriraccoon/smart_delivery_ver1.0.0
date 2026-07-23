import React, { useState } from 'react';
import { MatchingError, ProcessedOrder } from '../types';
import { AlertCircle, CheckCircle, HelpCircle, Package, Sparkles } from 'lucide-react';

interface WaybillReportDashboardProps {
  matchCount: number;
  softMatchCount: number;
  unfilledErrors: MatchingError[];
  unusedErrors: MatchingError[];
  totalInputRows: number;
  outputOrders?: ProcessedOrder[];
}

export default function WaybillReportDashboard({
  matchCount,
  softMatchCount,
  unfilledErrors,
  unusedErrors,
  totalInputRows,
  outputOrders = []
}: WaybillReportDashboardProps) {
  // 지능형 부분 매칭 건수가 있으면 기본적으로 지능형 부분 매칭 탭을 활성화
  const [activeTab, setActiveTab] = useState<'soft' | 'unfilled' | 'unused' | 'exact'>(
    softMatchCount > 0 ? 'soft' : 'unfilled'
  );

  const totalSuccess = matchCount + softMatchCount;
  const successRate = totalInputRows > 0 ? Math.round((totalSuccess / totalInputRows) * 100) : 0;

  const softMatchOrders = outputOrders.filter(o => o.matchType === 'soft');
  const exactMatchOrders = outputOrders.filter(o => o.matchType === 'exact');

  return (
    <div id="waybill-report-dashboard" className="bg-slate-50 border border-slate-200 rounded-xl p-6 space-y-6">
      
      {/* 요약 비주얼 카드 (클릭 시 해당 유형 탭으로 이동) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* 성공률 */}
        <div className="bg-white p-4 rounded-xl border border-slate-150 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-400">송장 매칭 성공률</div>
            <div className="text-xl font-bold text-slate-800 mt-0.5">{successRate}%</div>
            <div className="text-[10px] text-slate-400 mt-1">총 {totalSuccess} / {totalInputRows}건</div>
          </div>
        </div>

        {/* 일반 매칭 건수 */}
        <button
          onClick={() => setActiveTab('exact')}
          className={`p-4 rounded-xl border text-left transition flex items-center gap-4 cursor-pointer ${
            activeTab === 'exact'
              ? 'bg-indigo-50/80 border-indigo-300 shadow-sm ring-2 ring-indigo-500/20'
              : 'bg-white border-slate-150 shadow-sm hover:border-indigo-200'
          }`}
        >
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg shrink-0">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-400">일반 완전 매칭</div>
            <div className="text-xl font-bold text-slate-800 mt-0.5">{matchCount}건</div>
            <div className="text-[10px] text-indigo-600 font-medium mt-1">클릭 시 목록 조회 →</div>
          </div>
        </button>

        {/* 부분 매칭 건수 */}
        <button
          onClick={() => setActiveTab('soft')}
          className={`p-4 rounded-xl border text-left transition flex items-center gap-4 cursor-pointer ${
            activeTab === 'soft'
              ? 'bg-amber-50/80 border-amber-300 shadow-sm ring-2 ring-amber-500/20'
              : 'bg-white border-slate-150 shadow-sm hover:border-amber-200'
          }`}
        >
          <div className="p-3 bg-amber-50 text-amber-600 rounded-lg shrink-0">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-400">지능형 부분 매칭</div>
            <div className="text-xl font-bold text-slate-800 mt-0.5">{softMatchCount}건</div>
            <div className="text-[10px] text-amber-600 font-medium mt-1">클릭 시 목록 조회 →</div>
          </div>
        </button>

        {/* 미매칭 누락 건수 */}
        <button
          onClick={() => setActiveTab('unfilled')}
          className={`p-4 rounded-xl border text-left transition flex items-center gap-4 cursor-pointer ${
            activeTab === 'unfilled'
              ? 'bg-rose-50/80 border-rose-300 shadow-sm ring-2 ring-rose-500/20'
              : 'bg-white border-slate-150 shadow-sm hover:border-rose-200'
          }`}
        >
          <div className="p-3 bg-rose-50 text-rose-600 rounded-lg shrink-0">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-400">누락/미매칭 주문</div>
            <div className="text-xl font-bold text-slate-800 mt-0.5">{unfilledErrors.length}건</div>
            <div className="text-[10px] text-rose-600 font-medium mt-1">클릭 시 목록 조회 →</div>
          </div>
        </button>

      </div>

      {/* 매칭 상세 오류 내역 */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        
        {/* 내부 탭 */}
        <div className="flex flex-wrap border-b border-slate-150 bg-slate-50/50">
          <button
            onClick={() => setActiveTab('soft')}
            className={`flex-1 min-w-[140px] py-3 px-3 text-xs font-semibold text-center border-b-2 transition ${
              activeTab === 'soft'
                ? 'border-amber-500 text-amber-700 bg-amber-50/30'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            [유형 1] 지능형 부분 매칭 ({softMatchOrders.length}건) ✨
          </button>
          <button
            onClick={() => setActiveTab('unfilled')}
            className={`flex-1 min-w-[140px] py-3 px-3 text-xs font-semibold text-center border-b-2 transition ${
              activeTab === 'unfilled'
                ? 'border-rose-500 text-rose-700 bg-rose-50/30'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            [유형 2] 못 채운 값 ({unfilledErrors.length}건) - 송장 누락
          </button>
          <button
            onClick={() => setActiveTab('unused')}
            className={`flex-1 min-w-[140px] py-3 px-3 text-xs font-semibold text-center border-b-2 transition ${
              activeTab === 'unused'
                ? 'border-indigo-600 text-indigo-600 bg-indigo-50/30'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            [유형 3] 못 넣은 값 ({unusedErrors.length}건) - 미사용 송장
          </button>
          <button
            onClick={() => setActiveTab('exact')}
            className={`flex-1 min-w-[140px] py-3 px-3 text-xs font-semibold text-center border-b-2 transition ${
              activeTab === 'exact'
                ? 'border-emerald-600 text-emerald-700 bg-emerald-50/30'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            [유형 4] 일반 완전 매칭 ({exactMatchOrders.length}건)
          </button>
        </div>

        {/* 탭 테이블 콘텐츠 */}
        <div className="p-4">
          
          {/* 지능형 부분 매칭 탭 */}
          {activeTab === 'soft' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-600 flex items-center gap-1.5 bg-amber-50/80 p-3 rounded-lg border border-amber-150">
                <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  <strong>지능형 부분 매칭</strong>은 우편번호, 수령인 성명, 연락처, 품목명 텍스트의 유사성을 교차 대조하여 100% 문자가 일치하지 않더라도 정확한 대상을 안전하게 유추해 송장번호를 자동 부여한 내역입니다.
                </span>
              </p>

              <div className="overflow-x-auto border border-slate-150 rounded-lg">
                <table className="w-full text-xs text-left text-slate-600">
                  <thead className="bg-slate-50 text-slate-500 font-semibold uppercase border-b border-slate-150">
                    <tr>
                      <th className="px-3 py-2.5">수령인</th>
                      <th className="px-3 py-2.5">우편번호</th>
                      <th className="px-3 py-2.5">수량</th>
                      <th className="px-3 py-2.5">주문 품목명</th>
                      <th className="px-3 py-2.5">부여된 운송장번호</th>
                      <th className="px-3 py-2.5">지능형 매칭 유추 근거</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {softMatchOrders.map((ord, i) => (
                      <tr key={i} className="hover:bg-amber-50/30 transition">
                        <td className="px-3 py-2.5 font-bold text-slate-800">{ord.수령인}</td>
                        <td className="px-3 py-2.5 font-mono">{ord.우편번호}</td>
                        <td className="px-3 py-2.5 font-semibold text-slate-700">{ord.수량}</td>
                        <td className="px-3 py-2.5 max-w-xs truncate" title={ord.originalProductName || ord.상품명}>
                          {ord.originalProductName || ord.상품명}
                        </td>
                        <td className="px-3 py-2.5 font-mono font-bold text-amber-800 bg-amber-50/50 rounded">
                          {ord.trackingNumber || "-"}
                        </td>
                        <td className="px-3 py-2.5 text-amber-700 font-medium">
                          {ord.softMatchReason || "우편번호/수량 유추 매칭"}
                        </td>
                      </tr>
                    ))}
                    {softMatchOrders.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-3 py-8 text-center text-slate-400">
                          지능형 부분 매칭된 주문이 없습니다. (모두 완전 매칭되거나 미매칭 처리되었습니다.)
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 못 채운 값 탭 */}
          {activeTab === 'unfilled' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-500 flex items-center gap-1 bg-rose-50/50 p-3 rounded-lg border border-rose-150">
                <HelpCircle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>
                  인풋(주문)에는 정보가 존재하나 소스(재출력) 파일에 송장이 없는 주문들입니다. 소스 파일에 해당 주문이 누락되었거나 정보(수량/우편번호 등)가 서로 일치하지 않는 것이 원인입니다.
                </span>
              </p>

              <div className="overflow-x-auto border border-slate-150 rounded-lg">
                <table className="w-full text-xs text-left text-slate-600">
                  <thead className="bg-slate-50 text-slate-500 font-semibold uppercase border-b border-slate-150">
                    <tr>
                      <th className="px-3 py-2.5">수령인</th>
                      <th className="px-3 py-2.5">우편번호</th>
                      <th className="px-3 py-2.5">수량</th>
                      <th className="px-3 py-2.5">품목명 (일부)</th>
                      <th className="px-3 py-2.5">원인 진단</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {unfilledErrors.map((err, i) => (
                      <tr key={i} className="hover:bg-slate-50/50">
                        <td className="px-3 py-2.5 font-medium text-slate-800">{err.name}</td>
                        <td className="px-3 py-2.5 font-mono">{err.zipCode}</td>
                        <td className="px-3 py-2.5">{err.qty}</td>
                        <td className="px-3 py-2.5 max-w-xs truncate" title={err.prod}>{err.prod}</td>
                        <td className="px-3 py-2.5 text-rose-600 font-medium">{err.reason}</td>
                      </tr>
                    ))}
                    {unfilledErrors.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-3 py-8 text-center text-slate-400">
                          누락 주문이 존재하지 않습니다. 모든 주문에 운송장 매칭 완료! ✨
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 못 넣은 값 탭 */}
          {activeTab === 'unused' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-500 flex items-center gap-1 bg-slate-50 p-3 rounded-lg border border-slate-150">
                <HelpCircle className="w-4 h-4 text-indigo-500 shrink-0" />
                <span>
                  소스(재출력) 파일에는 송장이 존재하나, 인풋(주문) 파일에 매치 대상이 없는 건들입니다. 해당 고객이 주문을 전격 취소했거나 인풋 파일에서 이미 사전에 걸러진 항목일 확률이 대단히 높습니다.
                </span>
              </p>

              <div className="overflow-x-auto border border-slate-150 rounded-lg">
                <table className="w-full text-xs text-left text-slate-600">
                  <thead className="bg-slate-50 text-slate-500 font-semibold uppercase border-b border-slate-150">
                    <tr>
                      <th className="px-3 py-2.5">대상자</th>
                      <th className="px-3 py-2.5">우편번호</th>
                      <th className="px-3 py-2.5">수량</th>
                      <th className="px-3 py-2.5">품목명 (일부)</th>
                      <th className="px-3 py-2.5">원인 진단</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {unusedErrors.map((err, i) => (
                      <tr key={i} className="hover:bg-slate-50/50">
                        <td className="px-3 py-2.5 font-medium text-slate-800">{err.name}</td>
                        <td className="px-3 py-2.5 font-mono">{err.zipCode}</td>
                        <td className="px-3 py-2.5">{err.qty}</td>
                        <td className="px-3 py-2.5 max-w-xs truncate" title={err.prod}>{err.prod}</td>
                        <td className="px-3 py-2.5 text-amber-600 font-medium">{err.reason}</td>
                      </tr>
                    ))}
                    {unusedErrors.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-3 py-8 text-center text-slate-400">
                          미사용 송장이 존재하지 않습니다. 모든 송장이 주문과 정확히 매칭되었습니다!
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 일반 완전 매칭 탭 */}
          {activeTab === 'exact' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-600 flex items-center gap-1.5 bg-indigo-50/80 p-3 rounded-lg border border-indigo-150">
                <Package className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>
                  <strong>일반 완전 매칭</strong>은 성명, 우편번호/전화번호, 수량, 품목명이 100% 키 정보 대조되어 완벽하게 송장이 매칭된 주문 목록입니다.
                </span>
              </p>

              <div className="overflow-x-auto border border-slate-150 rounded-lg">
                <table className="w-full text-xs text-left text-slate-600">
                  <thead className="bg-slate-50 text-slate-500 font-semibold uppercase border-b border-slate-150">
                    <tr>
                      <th className="px-3 py-2.5">수령인</th>
                      <th className="px-3 py-2.5">우편번호</th>
                      <th className="px-3 py-2.5">수량</th>
                      <th className="px-3 py-2.5">주문 품목명</th>
                      <th className="px-3 py-2.5">부여된 운송장번호</th>
                      <th className="px-3 py-2.5">상태</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {exactMatchOrders.map((ord, i) => (
                      <tr key={i} className="hover:bg-indigo-50/30 transition">
                        <td className="px-3 py-2.5 font-bold text-slate-800">{ord.수령인}</td>
                        <td className="px-3 py-2.5 font-mono">{ord.우편번호}</td>
                        <td className="px-3 py-2.5 font-semibold text-slate-700">{ord.수량}</td>
                        <td className="px-3 py-2.5 max-w-xs truncate" title={ord.originalProductName || ord.상품명}>
                          {ord.originalProductName || ord.상품명}
                        </td>
                        <td className="px-3 py-2.5 font-mono font-bold text-indigo-800 bg-indigo-50/50 rounded">
                          {ord.trackingNumber || "-"}
                        </td>
                        <td className="px-3 py-2.5 text-emerald-600 font-semibold flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5" />
                          100% 완전 일치
                        </td>
                      </tr>
                    ))}
                    {exactMatchOrders.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-3 py-8 text-center text-slate-400">
                          완전 매칭된 주문이 없습니다.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}

// 미려한 회전 새로고침 아이콘 컴포넌트
function RefreshCwIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
      <path d="M16 16h5v5" />
    </svg>
  );
}
