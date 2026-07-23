import React, { useState, useEffect } from 'react';
import { PlatformConfig, ColumnMapping } from '../types';
import { PLATFORM_PRESETS } from '../utils/defaultData';
import { Plus, Trash2, Edit3, Settings, HelpCircle, Save, Undo, ShoppingBag, AlertTriangle } from 'lucide-react';

// Excel Column Letter to 1-based Number (e.g. "A" -> 1, "AA" -> 27)
function letterToColNum(letter: string): number {
  let colNum = 0;
  const clean = letter.toUpperCase().replace(/[^A-Z]/g, '');
  for (let i = 0; i < clean.length; i++) {
    colNum = colNum * 26 + (clean.charCodeAt(i) - 64);
  }
  return colNum;
}

// 1-based Number to Excel Column Letter (e.g. 1 -> "A", 27 -> "AA")
function colNumToLetter(num: number): string {
  let letter = '';
  let temp = num;
  while (temp > 0) {
    const modulo = (temp - 1) % 26;
    letter = String.fromCharCode(65 + modulo) + letter;
    temp = Math.floor((temp - modulo) / 26);
  }
  return letter || '';
}

// Get column preview counterpart
function getColumnPreview(inputVal: string): { parsedZeroBased: number; displayPreview: string } {
  const clean = inputVal.trim().toUpperCase();
  if (!clean) {
    return { parsedZeroBased: 0, displayPreview: '' };
  }
  
  if (/^\d+$/.test(clean)) {
    const num = parseInt(clean, 10);
    if (num <= 0) {
      return { parsedZeroBased: 0, displayPreview: '→ A' };
    }
    const letter = colNumToLetter(num);
    return { parsedZeroBased: num - 1, displayPreview: `→ ${letter}` };
  } else {
    const letter = clean.replace(/[^A-Z]/g, '');
    if (!letter) {
      return { parsedZeroBased: 0, displayPreview: '' };
    }
    const num = letterToColNum(letter);
    return { parsedZeroBased: num - 1, displayPreview: `→ ${num}` };
  }
}

interface PlatformSettingsProps {
  platforms: PlatformConfig[];
  onChange: (updated: PlatformConfig[]) => void;
}

export default function PlatformSettings({ platforms, onChange }: PlatformSettingsProps) {
  const [editingPlatform, setEditingPlatform] = useState<PlatformConfig | null>(null);
  const [showPresetModal, setShowPresetModal] = useState(false);
  const [deletingPlatform, setDeletingPlatform] = useState<PlatformConfig | null>(null);

  // 1-based / 알파벳 열 입력을 위한 로컬 상태
  const [startRowInput, setStartRowInput] = useState<string>('');
  const [trackingColInput, setTrackingColInput] = useState<string>('');
  const [courierColInput, setCourierColInput] = useState<string>('');
  const [colMapInputs, setColMapInputs] = useState<Record<string, string>>({});

  // 플랫폼 선택 시 로컬 입력 상태 동기화 (기본적으로 읽기 쉬운 알파벳 문자로 노출)
  useEffect(() => {
    if (editingPlatform) {
      setStartRowInput(String(editingPlatform.start_row + 1));
      setTrackingColInput(colNumToLetter(editingPlatform.tracking_col + 1));
      setCourierColInput(editingPlatform.courier_col !== undefined ? colNumToLetter(editingPlatform.courier_col + 1) : '');
      
      const newColMapInputs: Record<string, string> = {};
      Object.entries(editingPlatform.col_map).forEach(([field, val]) => {
        newColMapInputs[field] = colNumToLetter((val as number) + 1);
      });
      setColMapInputs(newColMapInputs);
    } else {
      setStartRowInput('');
      setTrackingColInput('');
      setCourierColInput('');
      setColMapInputs({});
    }
  }, [editingPlatform?.id]);

  const handleStartRowChange = (val: string) => {
    setStartRowInput(val);
    const parsedRow = parseInt(val, 10);
    if (!isNaN(parsedRow) && parsedRow > 0) {
      setEditingPlatform(prev => prev ? { ...prev, start_row: parsedRow - 1 } : null);
    }
  };

  const handleTrackingColChange = (val: string) => {
    setTrackingColInput(val);
    const { parsedZeroBased } = getColumnPreview(val);
    setEditingPlatform(prev => prev ? { ...prev, tracking_col: parsedZeroBased } : null);
  };

  const handleCourierColChange = (val: string) => {
    setCourierColInput(val);
    if (!val.trim()) {
      setEditingPlatform(prev => prev ? { ...prev, courier_col: undefined } : null);
    } else {
      const { parsedZeroBased } = getColumnPreview(val);
      setEditingPlatform(prev => prev ? { ...prev, courier_col: parsedZeroBased } : null);
    }
  };

  const handleColMapChange = (field: string, val: string) => {
    setColMapInputs(prev => ({ ...prev, [field]: val }));
    const { parsedZeroBased } = getColumnPreview(val);
    setEditingPlatform(prev => {
      if (!prev) return null;
      return {
        ...prev,
        col_map: {
          ...prev.col_map,
          [field]: parsedZeroBased
        }
      };
    });
  };

  const savePlatform = (updated: PlatformConfig) => {
    const exists = platforms.some(p => p.id === updated.id);
    if (exists) {
      onChange(platforms.map(p => p.id === updated.id ? updated : p));
    } else {
      onChange([...platforms, updated]);
    }
    setEditingPlatform(null);
  };

  const executeDeletePlatform = (id: string) => {
    onChange(platforms.filter(p => p.id !== id));
    if (editingPlatform?.id === id) {
      setEditingPlatform(null);
    }
    setDeletingPlatform(null);
  };

  const applyPreset = (preset: typeof PLATFORM_PRESETS[0]) => {
    const newId = preset.id.replace('_preset', '') + '_' + Date.now();
    const newConfig: PlatformConfig = {
      id: newId,
      name: preset.name + ' (복사본)',
      identifier: preset.config.identifier,
      start_row: preset.config.start_row,
      col_map: { ...preset.config.col_map },
      tracking_col: preset.config.tracking_col,
      filepath_pattern: preset.config.filepath_pattern
    };
    setEditingPlatform(newConfig);
    setShowPresetModal(false);
  };

  const createEmptyPlatform = () => {
    const newConfig: PlatformConfig = {
      id: 'custom_' + Date.now(),
      name: '새로운 배송 플랫폼',
      identifier: '식별고유단어',
      start_row: 1,
      col_map: {
        용량: 0,
        상품명: 1,
        수량: 2,
        수령인: 3,
        연락처: 4,
        우편번호: 5,
        주소: 6,
        배송메시지: 7
      },
      tracking_col: 8,
      filepath_pattern: "input/*.xlsx"
    };
    setEditingPlatform(newConfig);
    setShowPresetModal(false);
  };

  return (
    <div id="platform-settings-container" className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-indigo-600" />
            연동 플랫폼 관리
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            엑셀 파일을 업로드했을 때, 자동으로 어떤 쇼핑몰 양식인지 구분하고 데이터를 올바르게 추출하기 위해 시작 줄 번호와 열 이름/번호를 설정합니다.
          </p>
        </div>
        
        <button
          id="btn-add-platform"
          onClick={() => setShowPresetModal(true)}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition shadow-sm hover:shadow"
        >
          <Plus className="w-4 h-4" />
          플랫폼 추가하기
        </button>
      </div>

      {/* 프리셋 선택 모달 */}
      {showPresetModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800">새 플랫폼 추가 마법사</h3>
              <button 
                onClick={() => setShowPresetModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-500">
                자주 사용하는 쇼핑몰 템플릿(프리셋)을 선택하여 설정을 빠르게 시작하세요. 원하는 프리셋이 없다면 완전 빈 설정을 만들 수 있습니다.
              </p>
              
              <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto">
                {PLATFORM_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => applyPreset(preset)}
                    className="flex items-center justify-between p-4 border border-slate-150 hover:border-indigo-500 hover:bg-indigo-50/30 rounded-lg text-left transition"
                  >
                    <div>
                      <div className="font-semibold text-slate-800 text-sm">{preset.name}</div>
                      <div className="text-xs text-slate-400 mt-0.5">식별 고유어: "{preset.config.identifier}"</div>
                    </div>
                    <span className="text-xs text-indigo-600 bg-indigo-50 px-2 py-1 rounded">불러오기</span>
                  </button>
                ))}
              </div>

              <div className="border-t border-slate-100 pt-4 flex justify-between items-center">
                <button
                  onClick={createEmptyPlatform}
                  className="text-sm text-slate-600 hover:text-slate-900 border border-slate-200 px-3 py-1.5 rounded"
                >
                  템플릿 없이 새로 만들기
                </button>
                <button
                  onClick={() => setShowPresetModal(false)}
                  className="text-sm text-slate-400 hover:text-slate-600"
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 플랫폼 삭제 확인 모달 팝업 */}
      {deletingPlatform && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 space-y-4 border border-slate-100">
            <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" />
              연동 플랫폼 삭제 확인
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              <strong>"{deletingPlatform.name}"</strong> 플랫폼 설정을 목록에서 삭제하시겠습니까?
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setDeletingPlatform(null)}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition"
              >
                취소
              </button>
              <button
                onClick={() => executeDeletePlatform(deletingPlatform.id)}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold transition shadow-md"
              >
                삭제하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 리스트 및 편집 영역 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* 플랫폼 카드 목록 */}
        <div className="lg:col-span-1 space-y-3">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">등록된 플랫폼 목록</div>
          {platforms.map((plat) => {
            const isActive = editingPlatform?.id === plat.id;
            return (
              <div
                key={plat.id}
                className={`p-4 rounded-xl border transition-all ${
                  isActive
                    ? 'border-indigo-500 bg-indigo-50/20 shadow-sm'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="cursor-pointer" onClick={() => setEditingPlatform({ ...plat })}>
                    <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                      {plat.name}
                    </h4>
                    <p className="text-xs text-slate-500 mt-1">
                      엑셀 식별 단어: <span className="bg-slate-100 px-1 py-0.5 rounded text-slate-700 font-mono">"{plat.identifier}"</span>
                    </p>
                    {plat.filepath_pattern && (
                      <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5 flex-wrap">
                        <span className="text-slate-400 font-medium shrink-0">파일명 인식 키워드:</span>
                        <span className="bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-100 font-mono text-[10px] max-w-full truncate" title={plat.filepath_pattern}>
                          {plat.filepath_pattern}
                        </span>
                      </p>
                    )}
                    <p className="text-xs text-slate-400 mt-1">
                      시작 행: <span className="font-mono">{plat.start_row + 1}</span> / 송장 기입 열: <span className="font-mono">{colNumToLetter(plat.tracking_col + 1)} ({plat.tracking_col + 1}번째)</span>
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEditingPlatform({ ...plat })}
                      title="수정"
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded transition"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeletingPlatform(plat)}
                      title="삭제"
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-50 rounded transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {platforms.length === 0 && (
            <div className="p-8 text-center border border-dashed border-slate-200 rounded-xl bg-white text-slate-400 text-sm">
              등록된 플랫폼이 없습니다. <br /> 플랫폼을 먼저 추가해주세요.
            </div>
          )}
        </div>

        {/* 설정 세부 편집 폼 */}
        <div className="lg:col-span-2">
          {editingPlatform ? (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-indigo-600" />
                  <h3 className="font-bold text-slate-800 text-base">{editingPlatform.name} 설정 편집</h3>
                </div>
                <span className="text-xs text-slate-400 font-mono">ID: {editingPlatform.id}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">플랫폼 표시 이름</label>
                  <input
                    type="text"
                    value={editingPlatform.name}
                    onChange={(e) => setEditingPlatform({ ...editingPlatform, name: e.target.value })}
                    className="w-full text-sm border border-slate-200 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1">
                    엑셀 자동감지 식별고유단어
                    <span className="group relative cursor-pointer">
                      <HelpCircle className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600" />
                      <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 hidden group-hover:block bg-slate-800 text-white text-[10px] p-2 rounded shadow-lg w-56 z-10 font-normal leading-relaxed">
                        업로드된 엑셀 파일 상단 5행 중에서 이 텍스트가 정확히 발견되면 본 플랫폼 템플릿으로 자동 감지합니다.
                      </span>
                    </span>
                  </label>
                  <input
                    type="text"
                    value={editingPlatform.identifier}
                    onChange={(e) => setEditingPlatform({ ...editingPlatform, identifier: e.target.value })}
                    className="w-full text-sm border border-slate-200 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div className="md:col-span-2 bg-indigo-50/20 border border-indigo-100/50 rounded-xl p-3.5 space-y-2">
                  <label className="block text-xs font-semibold text-slate-700 flex items-center gap-1">
                    📂 파일 이름 자동 매칭 키워드 (쉼표로 구분)
                    <span className="group relative cursor-pointer">
                      <HelpCircle className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600" />
                      <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 hidden group-hover:block bg-slate-800 text-white text-[10px] p-2.5 rounded shadow-lg w-64 z-10 font-normal leading-relaxed">
                        업로드하는 엑셀 파일명에 포함되어 있을 경우, 본 플랫폼 양식으로 자동 매칭됩니다. 쉼표(,)로 여러 개를 나열해 보세요.<br />(예: naver, 스마트스토어, smartstore)
                      </span>
                    </span>
                  </label>
                  <input
                    type="text"
                    value={editingPlatform.filepath_pattern || ''}
                    placeholder="예: smartstore, naver, 스마트스토어, 발주발송"
                    onChange={(e) => setEditingPlatform({ ...editingPlatform, filepath_pattern: e.target.value })}
                    className="w-full text-sm border border-slate-200 bg-white rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 placeholder-slate-400 font-mono"
                  />
                  <p className="text-[10px] text-slate-500 leading-normal">
                    💡 <strong>사용팁:</strong> 여기에 지정된 키워드가 파일명에 있으면, 시트 안의 특정 셀을 일일이 읽지 않고 즉시 플랫폼 형식을 찾아냅니다.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center justify-between">
                    <span>데이터 시작 줄 번호 (엑셀 행 번호)</span>
                    <span className="text-[10px] text-slate-400 font-normal">엑셀 줄 번호 그대로 입력 (1부터 시작)</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={startRowInput}
                    onChange={(e) => handleStartRowChange(e.target.value)}
                    placeholder="예: 3"
                    className="w-full text-sm border border-slate-200 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center justify-between">
                    <span>운송장번호 기입할 열 (알파벳 또는 숫자)</span>
                    <span className="text-[10px] text-slate-400 font-normal">A, B... 또는 1, 2...</span>
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      value={trackingColInput}
                      onChange={(e) => handleTrackingColChange(e.target.value)}
                      placeholder="예: I 또는 9"
                      className="w-full text-sm border border-slate-200 rounded-lg p-2 pr-16 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono"
                    />
                    {getColumnPreview(trackingColInput).displayPreview && (
                      <span className="absolute right-3 text-xs bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-mono font-medium pointer-events-none">
                        {getColumnPreview(trackingColInput).displayPreview}
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center justify-between">
                    <span>택배사명 기입할 열 (알파벳 또는 숫자)</span>
                    <span className="text-[10px] text-slate-400 font-normal">H, E... 또는 없으면 빈칸</span>
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      value={courierColInput}
                      onChange={(e) => handleCourierColChange(e.target.value)}
                      placeholder="예: H 또는 8"
                      className="w-full text-sm border border-slate-200 rounded-lg p-2 pr-16 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono"
                    />
                    {getColumnPreview(courierColInput).displayPreview && (
                      <span className="absolute right-3 text-xs bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-mono font-medium pointer-events-none">
                        {getColumnPreview(courierColInput).displayPreview}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* 컬럼 인덱스 매핑 카드 */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-150">
                <div className="text-xs font-semibold text-slate-700 mb-3 flex items-center justify-between">
                  <span>추출용 데이터 매핑 설정 (엑셀 열 이름/번호)</span>
                  <span className="text-[10px] text-slate-400 font-normal">알파벳(예: Y) 혹은 1부터 시작하는 숫자(예: 25)로 적으시면 자동 변환됩니다.</span>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {Object.entries(editingPlatform.col_map).map(([field, value]) => {
                    const currentVal = colMapInputs[field] || '';
                    const preview = getColumnPreview(currentVal).displayPreview;
                    return (
                      <div key={field} className="bg-white p-2.5 rounded-lg border border-slate-200">
                        <label className="block text-[11px] font-medium text-slate-500 mb-1">{field}</label>
                        <div className="relative flex items-center">
                          <input
                            type="text"
                            value={currentVal}
                            onChange={(e) => handleColMapChange(field, e.target.value)}
                            placeholder="예: A"
                            className="w-full text-xs border border-slate-200 rounded p-1 pr-14 font-mono focus:outline-none focus:border-indigo-500"
                          />
                          {preview && (
                            <span className="absolute right-1 text-[10px] bg-indigo-50 text-indigo-700 px-1 py-0.5 rounded font-mono font-medium pointer-events-none">
                              {preview}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 하단 제어 */}
              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <button
                  onClick={() => setEditingPlatform(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg text-sm font-medium transition"
                >
                  취소
                </button>
                <button
                  onClick={() => savePlatform(editingPlatform)}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition shadow-sm hover:shadow"
                >
                  <Save className="w-4 h-4" />
                  변경사항 저장
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-12 text-center text-slate-500 flex flex-col items-center justify-center h-full min-h-[300px]">
              <Settings className="w-10 h-10 text-slate-300 mb-3" />
              <p className="font-semibold text-slate-600">선택된 플랫폼이 없습니다.</p>
              <p className="text-xs text-slate-400 mt-1">좌측 플랫폼 카드에서 수정하려는 항목을 클릭하거나 새 플랫폼을 추가하세요.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
