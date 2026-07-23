// electron.cjs (Electron 메인 프로세스)
const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

// 일렉트론 번들 실행 시 프로덕션 모드로 고정
process.env.NODE_ENV = 'production';

// 백엔드 서버 구동
try {
  const serverPath = path.join(__dirname, 'dist', 'server.cjs');
  if (fs.existsSync(serverPath)) {
    require(serverPath);
  } else {
    console.error('server.cjs를 찾을 수 없습니다:', serverPath);
  }
} catch (e) {
  console.error('백엔드 서버 실행 중 오류 발생:', e);
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    }
  });

  const url = 'http://localhost:3000';

  // 서버 준비 전 로드 실패 시 자동 재시도
  win.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.log(`서버 접속 재시도 중 (${errorDescription})...`);
    setTimeout(() => {
      win.loadURL(url);
    }, 1000);
  });

  // 로컬 백엔드 서버 접속
  setTimeout(() => {
    win.loadURL(url);
  }, 500);
}

app.whenReady().then(() => {
  createWindow();
});
