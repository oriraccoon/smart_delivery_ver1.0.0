import React, { useState } from 'react';
import { ProductMapping } from '../types';
import { Search, Plus, Trash2, Edit2, Check, X, FileText, ClipboardList, RefreshCw, Filter, CheckSquare, Square, AlertTriangle } from 'lucide-react';

interface ProductMappingListProps {
  mappings: ProductMapping[];
  onChange: (updated: ProductMapping[]) => void;
  defaultRawNames?: string[];
}

export default function ProductMappingList({ mappings, onChange }: ProductMappingListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [newRawName, setNewRawName] = useState('');
  const [newMappedName, setNewMappedName] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editRawName, setEditRawName] = useState('');
  const [editMappedName, setEditMappedName] = useState('');
  
  // 단일 항목 삭제 확인 모달용 상태
  const [singleDeleteTarget, setSingleDeleteTarget] = useState<string | null>(null);
  // 에러 알림 상태
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 벌크 편집 모드
  const [showBulkMode, setShowBulkMode] = useState(false);
  const [bulkText, setBulkText] = useState('');

  // 벌크 가져오기 확인 팝업 상태
  const [bulkImportConfirm, setBulkImportConfirm] = useState<{
    isOpen: boolean;
    parsed: ProductMapping[];
  } | null>(null);

  // 다중 선택 상태
  const [selectedRawNames, setSelectedRawNames] = useState<Set<string>>(new Set());

  // 필터 상태 ('all' | 'hasMapped' | 'noMapped')
  const [filterType, setFilterType] = useState<'all' | 'hasMapped' | 'noMapped'>('all');

  // 일괄/선택 삭제 확인 모달 상태
  const [showDeleteModal, setShowDeleteModal] = useState<{
    isOpen: boolean;
    type: 'selected' | 'all';
    count: number;
  } | null>(null);

  // 매핑 목록 필터링
  const filteredMappings = mappings.filter(item => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = (
      item.rawName.toLowerCase().includes(q) ||
      item.mappedName.toLowerCase().includes(q)
    );
    if (!matchesSearch) return false;

    if (filterType === 'hasMapped') {
      return !!item.mappedName;
    }
    if (filterType === 'noMapped') {
      return !item.mappedName;
    }
    return true;
  });

  // 개별 추가
  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRawName.trim()) return;

    const exists = mappings.some(m => m.rawName.trim() === newRawName.trim());
    if (exists) {
      setErrorMsg("이미 등록된 대치 대상 품목명입니다.");
      setTimeout(() => setErrorMsg(null), 3000);
      return;
    }

    const updated = [
      { rawName: newRawName.trim(), mappedName: newMappedName.trim() },
      ...mappings
    ];
    onChange(updated);
    setNewRawName('');
    setNewMappedName('');
  };

  // 단일 항목 삭제 실행
  const executeDelete = (rawName: string) => {
    const nextSelected = new Set(selectedRawNames);
    nextSelected.delete(rawName);
    setSelectedRawNames(nextSelected);

    onChange(mappings.filter(m => m.rawName !== rawName));
    setSingleDeleteTarget(null);
  };

  // 전체 선택 / 해제
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allNames = filteredMappings.map(m => m.rawName);
      setSelectedRawNames(new Set(allNames));
    } else {
      setSelectedRawNames(new Set());
    }
  };

  // 개별 행 선택 / 해제
  const handleSelectRow = (rawName: string, checked: boolean) => {
    const next = new Set(selectedRawNames);
    if (checked) {
      next.add(rawName);
    } else {
      next.delete(rawName);
    }
    setSelectedRawNames(next);
  };

  // 선택 삭제 실행
  const executeDeleteSelected = () => {
    const nextMappings = mappings.filter(m => !selectedRawNames.has(m.rawName));
    onChange(nextMappings);
    setSelectedRawNames(new Set());
    setShowDeleteModal(null);
  };

  // 전체 삭제 실행
  const executeDeleteAll = () => {
    onChange([]);
    setSelectedRawNames(new Set());
    setShowDeleteModal(null);
  };

  // 편집 시작
  const startEdit = (idx: number, item: ProductMapping) => {
    setEditingIndex(idx);
    setEditRawName(item.rawName);
    setEditMappedName(item.mappedName);
  };

  // 편집 저장
  const saveEdit = (idx: number) => {
    if (!editRawName.trim()) return;
    
    const updated = [...mappings];
    updated[idx] = {
      rawName: editRawName.trim(),
      mappedName: editMappedName.trim()
    };
    onChange(updated);
    setEditingIndex(null);
  };

  // 벌크 텍스트 생성 (품목리스트.txt 형태 호환)
  const generateBulkText = () => {
    const text = mappings.map(m => `'${m.rawName}' : '${m.mappedName}',`).join('\n');
    setBulkText(text);
    setShowBulkMode(true);
  };

  // 벌크 텍스트 파싱 적용
  const applyBulkText = () => {
    try {
      const lines = bulkText.split('\n');
      const parsed: ProductMapping[] = [];
      const seen = new Set<string>();

      lines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.includes(':')) return;

        const parts = trimmed.split(':');
        // '국내제조 비린맛 없는 절단 돌산 간장 꽃게장' : '게장', 형태 파싱
        const rawPart = parts[0].replace(/['",]/g, '').trim();
        const mappedPart = parts.slice(1).join(':').replace(/['",]/g, '').trim();

        if (rawPart && !seen.has(rawPart)) {
          seen.add(rawPart);
          parsed.push({ rawName: rawPart, mappedName: mappedPart });
        }
      });

      if (parsed.length === 0) {
        setErrorMsg("파싱된 데이터가 없습니다. 형식이 올바른지 확인해주세요. (예: '대치전' : '대치후',)");
        setTimeout(() => setErrorMsg(null), 4000);
        return;
      }

      // 모달창 띄워 confirm 대리 수행
      setBulkImportConfirm({
        isOpen: true,
        parsed
      });
    } catch (err) {
      setErrorMsg("벌크 텍스트 분석에 실패했습니다. 올바른 형식인지 다시 확인해주세요.");
      setTimeout(() => setErrorMsg(null), 4000);
    }
  };

  const handleBulkConfirmDecision = (overwrite: boolean) => {
    if (!bulkImportConfirm) return;
    const { parsed } = bulkImportConfirm;

    if (overwrite) {
      onChange(parsed);
    } else {
      // 중복 없이 이어붙이기
      const merged = [...mappings];
      parsed.forEach(p => {
        if (!merged.some(m => m.rawName === p.rawName)) {
          merged.push(p);
        }
      });
      onChange(merged);
    }

    setBulkImportConfirm(null);
    setShowBulkMode(false);
  };

  return (
    <div id="product-mapping-container" className="space-y-6">
      {/* 에러 및 경고 메시지 배너 */}
      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold rounded-lg flex items-center gap-2 animate-fade-in">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
          {errorMsg}
        </div>
      )}

      {/* 대량 텍스트 파싱 결과 합치기 확인 모달 */}
      {bulkImportConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="font-bold text-slate-800 text-base">품목 대치 대량 등록 확인</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              성공적으로 <strong className="text-indigo-600">{bulkImportConfirm.parsed.length}개</strong>의 품목 대치 규칙을 파싱했습니다. 
              기존 목록에 어떻게 반영할까요?
            </p>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => handleBulkConfirmDecision(false)}
                className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition"
              >
                기존 목록에 추가하기
              </button>
              <button
                onClick={() => handleBulkConfirmDecision(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition"
              >
                기존 목록 덮어쓰기 (전체 대치)
              </button>
            </div>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setBulkImportConfirm(null)}
                className="text-xs text-slate-400 hover:text-slate-600"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 단일 항목 삭제 확인 모달 팝업 */}
      {singleDeleteTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 space-y-4 border border-slate-100">
            <h3 className="font-bold text-slate-800 text-base flex items-center gap-1.5 text-rose-600">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              대치 규칙 삭제
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              '<strong className="text-slate-800">{singleDeleteTarget}</strong>' 대치 규칙을 삭제하시겠습니까?
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setSingleDeleteTarget(null)}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition"
              >
                취소
              </button>
              <button
                onClick={() => executeDelete(singleDeleteTarget)}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold transition shadow-md"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 일괄/전체 삭제 재확인 모달 */}
      {showDeleteModal?.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 space-y-4 border border-slate-100">
            <h3 className="font-bold text-slate-800 text-base flex items-center gap-1.5 text-rose-600">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              {showDeleteModal.type === 'all' ? '전체 대치 규칙 삭제' : '선택한 대치 규칙 삭제'}
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
              {showDeleteModal.type === 'all' 
                ? `주의! 현재 등록된 전체 ${mappings.length}개의 대치 규칙을 삭제하시겠습니까?`
                : `선택하신 ${showDeleteModal.count}개의 대치 규칙을 일괄 삭제하시겠습니까?`
              }
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowDeleteModal(null)}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition"
              >
                취소
              </button>
              <button
                onClick={showDeleteModal.type === 'all' ? executeDeleteAll : executeDeleteSelected}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold transition shadow-md"
              >
                삭제 진행
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-indigo-600" />
            품목 대치 사전 관리
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            복잡한 원본 상품명을 정제하고, 요약 보고서에 표시할 심플한 표준 상품명으로 매핑합니다.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={generateBulkText}
            className="flex items-center justify-center gap-2 px-3.5 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-medium transition"
          >
            <FileText className="w-4 h-4" />
            텍스트 대량 가져오기/내보내기
          </button>
        </div>
      </div>

      {/* 벌크 편집기 영역 */}
      {showBulkMode && (
        <div className="bg-slate-50 rounded-xl p-5 border border-indigo-200 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">텍스트 벌크 편집 / 호환 도구</h3>
              <p className="text-xs text-slate-500 mt-0.5">기존 '품목리스트.txt'의 내용을 복사해서 아래에 붙여넣어 가져오거나, 복사할 수 있습니다.</p>
            </div>
            <button
              onClick={() => setShowBulkMode(false)}
              className="text-slate-400 hover:text-slate-600 text-sm font-bold"
            >
              닫기 ✕
            </button>
          </div>

          <textarea
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            placeholder={`'국내제조 비린맛 없는 절단 돌산 간장 꽃게장' : '게장',\n'명태품은 백명란' : '명란',`}
            rows={10}
            className="w-full text-xs font-mono p-3 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />

          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowBulkMode(false)}
              className="px-3.5 py-1.5 text-xs text-slate-600 border border-slate-200 bg-white rounded-lg hover:bg-slate-50"
            >
              취소
            </button>
            <button
              onClick={applyBulkText}
              className="px-3.5 py-1.5 text-xs text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 font-medium"
            >
              목록에 적용하기
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* 새로운 매핑 추가 폼 */}
        <div className="lg:col-span-1">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <h3 className="font-bold text-slate-800 text-sm mb-4 flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-indigo-600" />
              대치 규칙 새로 추가
            </h3>

            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  대치 대상 원본 상품명 (일부 검색용)
                </label>
                <input
                  type="text"
                  required
                  placeholder="예: 국내제조 비린맛 없는 절단 돌산 간장 꽃게장"
                  value={newRawName}
                  onChange={(e) => setNewRawName(e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
                <p className="text-[10px] text-slate-400 mt-1">※ 업로드 상품명에 이 단어가 들어있으면 대치 처리됩니다.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  대치 후 표준 상품명 (보고서 표시용)
                </label>
                <input
                  type="text"
                  placeholder="예: 게장"
                  value={newMappedName}
                  onChange={(e) => setNewMappedName(e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition"
              >
                사전에 규칙 추가
              </button>
            </form>
          </div>
        </div>

        {/* 매핑 테이블 & 검색 */}
        <div className="lg:col-span-2 space-y-3">
          
          {/* 검색 및 필터, 작업 패널 */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
            
            {/* 검색창 */}
            <div className="flex items-center gap-2 flex-1 border border-slate-150 rounded-lg px-3 py-1.5 bg-slate-50/20">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="대치 규칙 검색 (원본 또는 변경명)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs border-none outline-none focus:ring-0 bg-transparent text-slate-700"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="text-xs text-slate-400 hover:text-slate-600">
                  지우기
                </button>
              )}
            </div>

            {/* 필터 및 삭제 작업 영역 */}
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              {/* 필터 셀렉트 */}
              <div className="flex items-center gap-1.5 border border-slate-150 rounded-lg px-2.5 py-1.5 bg-slate-50/50">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={filterType}
                  onChange={(e) => {
                    setFilterType(e.target.value as any);
                    setSelectedRawNames(new Set());
                  }}
                  className="text-xs border-none bg-transparent focus:ring-0 text-slate-600 font-semibold py-0 pl-0 pr-6 outline-none"
                >
                  <option value="all">전체 규칙 ({mappings.length}개)</option>
                  <option value="hasMapped">대치어 지정됨 ({mappings.filter(m => m.mappedName).length})</option>
                  <option value="noMapped">동일 정제 ({mappings.filter(m => !m.mappedName).length})</option>
                </select>
              </div>

              {/* 선택 삭제 버튼 */}
              {selectedRawNames.size > 0 && (
                <button
                  onClick={() => setShowDeleteModal({ isOpen: true, type: 'selected', count: selectedRawNames.size })}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-150 rounded-lg text-xs font-semibold transition cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  선택 삭제 ({selectedRawNames.size})
                </button>
              )}

              {/* 전체 삭제 버튼 */}
              {mappings.length > 0 && (
                <button
                  onClick={() => setShowDeleteModal({ isOpen: true, type: 'all', count: mappings.length })}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 rounded-lg text-xs font-semibold transition cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  전체 삭제
                </button>
              )}
            </div>

          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-slate-600">
                <thead className="bg-slate-50 text-slate-400 text-xs font-semibold uppercase border-b border-slate-150">
                  <tr>
                    <th className="px-4 py-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={filteredMappings.length > 0 && filteredMappings.every(m => selectedRawNames.has(m.rawName))}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="w-3.5 h-3.5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer"
                        title="현재 필터링된 항목 전체 선택 / 해제"
                      />
                    </th>
                    <th className="px-4 py-3">원본 상품명 키워드</th>
                    <th className="px-4 py-3">정제 후 표준 상품명</th>
                    <th className="px-4 py-3 text-right w-24">작업</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredMappings.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-xs text-slate-400 italic">
                        조건에 일치하는 대치 규칙이 존재하지 않습니다.
                      </td>
                    </tr>
                  ) : (
                    filteredMappings.map((item) => {
                      const globalIdx = mappings.findIndex(m => m.rawName === item.rawName);
                      const isEditing = editingIndex === globalIdx;
                      const isSelected = selectedRawNames.has(item.rawName);

                      return (
                        <tr 
                          key={item.rawName} 
                          className={`hover:bg-slate-50/50 transition-colors ${isSelected ? 'bg-indigo-50/20' : ''}`}
                        >
                          <td className="px-4 py-3 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => handleSelectRow(item.rawName, e.target.checked)}
                              className="w-3.5 h-3.5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer"
                            />
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-800">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editRawName}
                                onChange={(e) => setEditRawName(e.target.value)}
                                className="w-full text-xs border border-slate-200 rounded p-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              />
                            ) : (
                              item.rawName
                            )}
                          </td>
                          <td className="px-4 py-3 text-slate-700">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editMappedName}
                                onChange={(e) => setEditMappedName(e.target.value)}
                                className="w-full text-xs border border-slate-200 rounded p-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              />
                            ) : (
                              item.mappedName || (
                                <span className="text-slate-400 italic text-xs">동일 (입력 안 됨)</span>
                              )
                            )}
                          </td>
                        <td className="px-4 py-3 text-right">
                          {isEditing ? (
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => saveEdit(globalIdx)}
                                className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setEditingIndex(null)}
                                className="p-1 text-rose-500 hover:bg-rose-50 rounded"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => startEdit(globalIdx, item)}
                                className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded"
                                title="수정"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setSingleDeleteTarget(item.rawName)}
                                className="p-1 text-slate-400 hover:text-rose-500 hover:bg-slate-50 rounded"
                                title="삭제"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                      </td>
                    </tr>
                  );
                }))}
              </tbody>
              </table>
            </div>
            
            <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
              <span>총 {mappings.length}개의 정제 규칙 등록됨</span>
              {filteredMappings.length !== mappings.length && (
                <span>(검색 필터링 {filteredMappings.length}개 노출)</span>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
