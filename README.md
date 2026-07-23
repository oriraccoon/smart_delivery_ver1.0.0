# 🚚 스마트 운송장 자동 변환 프로그램 (Smart Delivery Program)

스마트스토어, 쿠팡, 지마켓, 11번가 등 주요 이커머스 플랫폼의 주문 엑셀 파일을 업로드하면, **상품명을 자동으로 단축 품목명으로 변환 및 매핑**하고, **수량 분할 및 주소 유효성 검사**를 거쳐 각 택배사(CJ대한통운, 롯데택배, 한진택배, 우체국, 로젠택배 등)의 운송장 입력 양식에 맞게 즉시 변환해 주는 전용 데스크톱/웹 프로그램입니다.

---

## 🌟 주요 기능

1. **자동 품목명 대치 및 매핑 (Product Name Mapping)**
   - 복잡하고 긴 쇼핑몰 상품명을 한눈에 알아볼 수 있는 짧은 품목명으로 자동 대치합니다.
   - **기본 내장 매핑(Default List)**: 반찬, 젓갈, 연탄불고기 등 자주 사용되는 품목명이 코드에 기본 탑재되어 있어 별도 설정 없이 바로 동작합니다.
   - **사용자 정의 추가(Custom List)**: 사용자가 원하는 품목 대치 규칙을 자유롭게 추가/수정/삭제할 수 있으며, `%APPDATA%/smart-delivery/custom_mappings.json` 경로에 안전하게 저장됩니다.

2. **다중 이커머스 양식 지원**
   - 스마트스토어, 쿠팡, 지마켓, 옥션, 11번가, ESM 등 다양한 원본 엑셀 양식을 자동으로 감지 및 파싱합니다.

3. **스마트 수량 분할 및 데이터 검증**
   - 주문 수량에 따른 품목 분할, 수령인 주소 및 연락처 유효성 검사를 자동으로 처리합니다.
   - 미매핑 항목이나 오류 데이터가 있을 경우 대시보드에서 한눈에 확인하고 직접 수정할 수 있습니다.

4. **택배사 전용 엑셀 내보내기**
   - CJ대한통운, 롯데택배, 한진택배, 우체국택배, 로젠택배 등 각 택배사 프로그램(CNPlus 등) 업로드용 엑셀 파일로 바로 다운로드할 수 있습니다.

---

## 🚀 개발 환경 및 실행 방법

### 1. 사전 요구 사항 (Prerequisites)
- [Node.js](https://nodejs.org/) (v18 이상 권장)
- npm 또는 yarn / bun

### 2. 의존성 설치 (Install Dependencies)
```bash
npm install
```

### 3. 개발 모드 실행 (Development)
웹 브라우저 및 개발 서버 환경으로 실행:
```bash
# npm run dev
npm install --save-dev electron electron-builder
```

Electron 데스크톱 앱 개발 모드로 실행:
```bash
npm run electron:dev
```

---

## 📦 실행 파일 (EXE) 빌드 및 패키징 가이드

Windows용 `.exe` 설치 파일 또는 무설치 포터블(Portable) 실행 파일을 생성하는 방법입니다.

### 1. Electron 패키징 명령어
```bash
npm run electron:build
```
> 빌드가 완료되면 `dist-electron/` 디렉터리 내에 `.exe` 설치 파일 및 실행 파일이 생성됩니다.

---

## 💡 Windows 빌드 시 자주 발생하는 오류 해결 팁 (Troubleshooting)

### ❓ `winCodeSign` 관련 7-Zip 추출 및 심볼릭 링크 오류 (Cannot create symbolic link)
`npm run electron:build` 실행 시 아래와 같은 `winCodeSign` 심볼릭 링크 오류가 발생할 수 있습니다:
```text
errorOut=ERROR: Cannot create symbolic link : 클라이언트에 필요한 권한을 가지고 있지 않습니다.
```

**해결 방법:**
1. **관리자 권한으로 실행**: VS Code 또는 PowerShell / CMD를 **'관리자 권한으로 실행'**한 후 빌드 명령어를 입력하세요. Windows 10/11에서는 일반 사용자 권한으로 7-zip 추출 시 심볼릭 링크(symlink) 생성을 제한하기 때문에 발생하는 현상입니다.
2. **코드 서명 비활성화 설정 (package.json)**:
   `package.json`의 `build` 항목에 아래 옵션이 포함되어 있어 코드 서명 관련 오류를 방지합니다:
   ```json
   "build": {
     "win": {
       "target": ["nsis", "portable"],
       "verifyUpdateCodeSignature": false
     },
     "forceCodeSigning": false
   }
   ```

---

## 📁 데이터 저장 위치 안내

- **기본 품목 데이터 (Default)**: 프로그램에 안전하게 내장되어 삭제 위험이 없습니다.
- **사용자 추가 품목 데이터 (Custom)**: 
  - Windows: `C:\Users\<사용자계정>\AppData\Roaming\smart-delivery\custom_mappings.json`
  - 프로그램 업그레이드나 재설치 시에도 사용자 설정 데이터는 안전하게 유지됩니다.

---

## 📜 라이선스

Internal Business Tool - 스마트 운송장 관리 솔루션
