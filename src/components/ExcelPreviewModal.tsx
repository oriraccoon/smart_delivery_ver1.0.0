import React, { useState, useMemo, useEffect } from 'react';
import { X, Search, Download, FileSpreadsheet, ChevronLeft, ChevronRight, CheckCircle2, Table, Layers } from 'lucide-react';

export interface ExcelPreviewSheet {
  sheetName: string;
  columns: string[];
  rows: (string | number | undefined | null)[][];
}

export interface ExcelPreviewFile {
  fileName: string;
  fileDescription?: string;
  sheets: ExcelPreviewSheet[];
  onDownload?: () => void;
}

interface ExcelPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  files: ExcelPreviewFile[];
  onDownloadAll?: () => void;
  downloadAllButtonText?: string;
}

// 엑셀 열 알파벳 변환 함수 (0 -> A, 1 -> B, 25 -> Z, 26 -> AA ...)
function getExcelColumnLabel(index: number): string {
  let label = '';
  let num = index;
  while (num >= 0) {
    label = String.fromCharCode((num % 26) + 65) + label;
    num = Math.floor(num / 26) - 1;
  }
  return label;
}

export default function ExcelPreviewModal({
  isOpen,
  onClose,
  title,
  subtitle = "실제 다운로드되는 엑셀 파일과 동일한 구조로 시트별 미리보기를 제공합니다.",
  files,
  onDownloadAll,
  downloadAllButtonText = "전체 파일 다운로드"
}: ExcelPreviewModalProps) {
  const [activeFileIndex, setActiveFileIndex] = useState(0);
  const [activeSheetIndex, setActiveSheetIndex] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;

  // 모달 오픈 시 또는 files 변경 시 상태 리셋
  useEffect(() => {
    setActiveFileIndex(0);
    setActiveSheetIndex(0);
    setCurrentPage(1);
    setSearchTerm('');
  }, [isOpen, files]);

  // 안전한 파일 및 시트 인덱스 계산
  const currentFile = files[activeFileIndex] || files[0];
  const currentSheets = currentFile?.sheets || [];
  const currentSheet = currentSheets[activeSheetIndex] || currentSheets[0];

  const filteredRows = useMemo(() => {
    if (!currentSheet || !currentSheet.rows) return [];
    if (!searchTerm.trim()) return currentSheet.rows;

    const term = searchTerm.trim().toLowerCase();
    return currentSheet.rows.filter(row =>
      row.some(cell => cell !== null && cell !== undefined && String(cell).toLowerCase().includes(term))
    );
  }, [currentSheet, searchTerm]);

  // 페이지네이션 로직
  const totalRows = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const safePage = Math.min(currentPage, totalPages);

  const paginatedRows = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, safePage, pageSize]);

  if (!isOpen || !files || files.length === 0 || !currentFile || !currentSheet) return null;

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center z-50 p-2 sm:p-5 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl h-[92vh] flex flex-col overflow-hidden border border-slate-300 font-sans">
        
        {/* Microsoft Excel 스타일 그린 타이틀 바 */}
        <div className="bg-[#107c41] text-white px-5 py-3 flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-lg backdrop-blur-xs text-white border border-white/20">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-tight">{title}</h2>
                <span className="text-[10px] bg-emerald-950/40 text-emerald-200 font-bold px-2 py-0.5 rounded border border-emerald-400/30">
                  실제 엑셀 구조 미리보기
                </span>
              </div>
              <p className="text-xs text-emerald-100/80 mt-0.5">{subtitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onDownloadAll && (
              <button
                onClick={onDownloadAll}
                className="px-4 py-2 bg-white text-[#107c41] hover:bg-emerald-50 rounded-xl text-xs font-bold transition shadow-md flex items-center gap-2 cursor-pointer border border-emerald-200"
              >
                <Download className="w-4 h-4" />
                {downloadAllButtonText}
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-emerald-100 hover:text-white hover:bg-emerald-800/80 rounded-lg transition"
              title="닫기"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 1단계: 생성되는 엑셀 파일 선택 탭 (다중 파일 지원) */}
        <div className="bg-slate-800 text-slate-200 px-4 py-2.5 flex items-center justify-between gap-3 shrink-0 border-b border-slate-700">
          <div className="flex items-center gap-2 overflow-x-auto py-0.5">
            <span className="text-xs font-bold text-slate-400 shrink-0 flex items-center gap-1 mr-1">
              <Layers className="w-3.5 h-3.5 text-emerald-400" />
              다운로드 파일 목록 ({files.length}개 파일):
            </span>

            {files.map((file, fIdx) => {
              const isSelected = activeFileIndex === fIdx;
              return (
                <button
                  key={fIdx}
                  onClick={() => {
                    setActiveFileIndex(fIdx);
                    setActiveSheetIndex(0);
                    setCurrentPage(1);
                  }}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                    isSelected
                      ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-400/40'
                      : 'bg-slate-700/80 text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  <FileSpreadsheet className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                  <span>{file.fileName}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${isSelected ? 'bg-emerald-700 text-emerald-100' : 'bg-slate-800 text-slate-400'}`}>
                    {file.sheets.length}개 시트
                  </span>
                </button>
              );
            })}
          </div>

          {currentFile.onDownload && (
            <button
              onClick={currentFile.onDownload}
              className="px-3 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-semibold transition shrink-0 flex items-center gap-1.5"
            >
              <Download className="w-3 h-3" />
              {currentFile.fileName} 개별 다운로드
            </button>
          )}
        </div>

        {/* 2단계: 현재 선택된 파일 내 서브 정보 및 검색 서브툴바 */}
        <div className="bg-slate-100 border-b border-slate-200 px-4 py-2 flex flex-col sm:flex-row items-center justify-between gap-2 shrink-0">
          
          <div className="flex items-center gap-2 text-xs text-slate-700 font-medium">
            <span className="bg-slate-200 text-slate-800 font-bold px-2 py-0.5 rounded text-[11px] flex items-center gap-1">
              <Table className="w-3.5 h-3.5 text-indigo-600" />
              {currentFile.fileName}
            </span>
            <span className="text-slate-400">|</span>
            <span className="text-slate-600 truncate max-w-md">
              현재 시트: <strong className="text-slate-900 font-bold">{currentSheet.sheetName}</strong> ({currentSheet.rows.length}행)
            </span>
          </div>

          {/* 실시간 셀 데이터 검색 */}
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="시트 내부 모든 셀 데이터 검색..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-8 pr-3 py-1 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#107c41] transition"
            />
          </div>

        </div>

        {/* 엑셀 그리드 메인 워크시트 영역 */}
        <div className="flex-1 overflow-auto bg-slate-200 p-2 relative">
          <div className="bg-white border border-slate-300 shadow-inner h-full flex flex-col">
            <div className="overflow-auto flex-1">
              <table className="w-full text-xs border-collapse font-sans text-slate-800">
                
                {/* 엑셀 열 라벨 (A, B, C, D...) 및 실제 컬럼명 2열 헤더 */}
                <thead className="sticky top-0 z-20 shadow-xs">
                  {/* 1행: 엑셀 알파벳 열 헤더 */}
                  <tr className="bg-slate-100 text-slate-500 font-mono text-[10px] select-none border-b border-slate-300">
                    <th className="w-12 bg-slate-200 border-r border-slate-300 py-1 text-center font-bold text-slate-600">
                      #
                    </th>
                    {currentSheet.columns.map((_, cIdx) => (
                      <th key={cIdx} className="border-r border-slate-300 px-3 py-1 text-center font-semibold bg-slate-100">
                        {getExcelColumnLabel(cIdx)}
                      </th>
                    ))}
                  </tr>

                  {/* 2행: 실제 데이터 컬럼명 헤더 */}
                  <tr className="bg-slate-800 text-white font-bold select-none border-b-2 border-[#107c41]">
                    <th className="w-12 bg-slate-900 border-r border-slate-700 py-2 text-center font-mono text-[11px] text-slate-400">
                      #
                    </th>
                    {currentSheet.columns.map((col, cIdx) => (
                      <th
                        key={cIdx}
                        className="border-r border-slate-700 px-3 py-2 text-left whitespace-nowrap text-xs tracking-tight"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>

                {/* 엑셀 데이터 셀 바디 */}
                <tbody className="divide-y divide-slate-200 font-normal">
                  {paginatedRows.map((row, rIdx) => {
                    const globalRowIndex = (safePage - 1) * pageSize + rIdx + 1;
                    return (
                      <tr key={rIdx} className="hover:bg-emerald-50/50 transition odd:bg-white even:bg-slate-50/80">
                        
                        {/* 엑셀 행 번호 (1, 2, 3...) */}
                        <td className="px-2 py-1.5 text-center text-slate-500 font-mono text-[10px] bg-slate-100 border-r border-slate-300 select-none font-medium">
                          {globalRowIndex}
                        </td>

                        {/* 셀 데이터 */}
                        {row.map((cell, cIdx) => {
                          const cellStr = cell !== null && cell !== undefined ? String(cell) : '';
                          const isNumeric = typeof cell === 'number';
                          const isMatchedBadge = cellStr === 'exact' || cellStr === 'soft' || cellStr === 'unmatched';
                          
                          return (
                            <td
                              key={cIdx}
                              className={`px-3 py-1.5 border-r border-slate-200 text-slate-800 whitespace-nowrap max-w-xs truncate text-[11px] ${
                                isNumeric ? 'text-right font-mono text-slate-900 font-semibold' : 'text-left'
                              }`}
                              title={cellStr}
                            >
                              {isMatchedBadge ? (
                                cellStr === 'exact' ? (
                                  <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded font-bold text-[10px]">
                                    완전 매칭
                                  </span>
                                ) : cellStr === 'soft' ? (
                                  <span className="bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 rounded font-bold text-[10px]">
                                    ✨ 부분 매칭
                                  </span>
                                ) : (
                                  <span className="bg-rose-100 text-rose-800 border border-rose-300 px-2 py-0.5 rounded font-bold text-[10px]">
                                    ⚠️ 미매칭
                                  </span>
                                )
                              ) : (
                                cellStr || <span className="text-slate-300 font-mono text-[10px] italic">N/A</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}

                  {paginatedRows.length === 0 && (
                    <tr>
                      <td colSpan={currentSheet.columns.length + 1} className="py-16 text-center text-slate-400 font-medium">
                        검색 조건에 해당되는 셀 데이터가 존재하지 않습니다.
                      </td>
                    </tr>
                  )}
                </tbody>

              </table>
            </div>
          </div>
        </div>

        {/* 선택된 파일 내부 시트 탭 바 (Sheet Tabs Footer) */}
        <div className="bg-slate-200 border-t-2 border-slate-300 px-3 py-2 flex items-center justify-between shrink-0 shadow-inner select-none">
          
          {/* 시트 탭 목록 */}
          <div className="flex items-center gap-1 overflow-x-auto max-w-3xl py-0.5">
            <span className="text-xs font-bold text-slate-700 mr-2 flex items-center gap-1 bg-slate-300 px-2 py-1 rounded">
              <Table className="w-3.5 h-3.5 text-[#107c41]" />
              선택 파일 시트:
            </span>

            {currentSheets.map((sheet, sIdx) => {
              const isActive = activeSheetIndex === sIdx;
              return (
                <button
                  key={sIdx}
                  onClick={() => {
                    setActiveSheetIndex(sIdx);
                    setCurrentPage(1);
                  }}
                  className={`px-4 py-1.5 text-xs font-bold transition flex items-center gap-2 rounded-t-md border-t-2 border-x border-b-0 cursor-pointer shadow-xs whitespace-nowrap ${
                    isActive
                      ? 'bg-white text-[#107c41] border-t-[#107c41] border-x-slate-300 ring-1 ring-emerald-500/10'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-50 border-t-transparent border-x-slate-300'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-[#107c41]' : 'bg-slate-400'}`} />
                  <span>{sheet.sheetName}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isActive ? 'bg-emerald-100 text-[#107c41]' : 'bg-slate-200 text-slate-600'}`}>
                    {sheet.rows.length}행
                  </span>
                </button>
              );
            })}
          </div>

          {/* 페이지 조작 & 상태 요약 */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="text-[11px] text-slate-600 font-medium hidden md:flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#107c41]" />
              <span>시트 데이터 총 <strong>{totalRows}</strong>행</span>
            </div>

            <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-md p-0.5 shadow-2xs">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                className="p-1 hover:bg-slate-100 disabled:opacity-30 rounded transition text-slate-700"
                title="이전 페이지"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-[11px] font-bold text-slate-800 px-2">
                {safePage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                className="p-1 hover:bg-slate-100 disabled:opacity-30 rounded transition text-slate-700"
                title="다음 페이지"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
