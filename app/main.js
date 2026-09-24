const { app, BrowserWindow, Tray, Menu, ipcMain, dialog, nativeImage, screen } = require('electron');
const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');
const { loadSettings, saveSettings, DEFAULTS } = require('./config');
const { startBridge, clearState } = require('./bridge');

const SMOKE = process.argv.includes('--smoke-test');

let petWin = null;
let bubbleWin = null;
let settingsWin = null;
let tray = null;
let settings = loadSettings();
let isQuitting = false; // 退出流程中放行窗口关闭（见 createPetWindow / before-quit）

const PETS_DIR = path.join(__dirname, 'pets');
const CUSTOM_DIR = path.join(app.getPath('userData'), 'custom');

const BUILTIN_PETS = [
  { id: 'robo',  label: '机器人', file: 'robo.svg' },
  { id: 'cat',   label: '小猫',   file: 'cat.svg' },
  { id: 'dog',   label: '小狗',   file: 'dog.svg' },
  { id: 'slime', label: '史莱姆', file: 'slime.svg' },
  { id: 'bunny', label: '小兔',   file: 'bunny.svg' },
  { id: 'alien', label: '外星人', file: 'alien.svg' },
  { id: 'intj',  label: '夜幕军师 · INTJ', file: 'intj.svg' },
  { id: 'intp',  label: '奇思博士 · INTP', file: 'intp.svg' },
  { id: 'entj',  label: '破阵统帅 · ENTJ', file: 'entj.svg' },
  { id: 'entp',  label: '点子王 · ENTP', file: 'entp.svg' },
  { id: 'infp',  label: '拾梦旅人 · INFP', file: 'infp.svg' },
  { id: 'infj',  label: '星灯隐士 · INFJ', file: 'infj.svg' },
  { id: 'enfj',  label: '篝火团长 · ENFJ', file: 'enfj.svg' },
  { id: 'enfp',  label: '彩虹弹弹 · ENFP', file: 'enfp.svg' },
  { id: 'isfj',  label: '暖灯管家 · ISFJ', file: 'isfj.svg' },
  { id: 'istj',  label: '方格哨兵 · ISTJ', file: 'istj.svg' },
  { id: 'estj',  label: '号令队长 · ESTJ', file: 'estj.svg' },
  { id: 'esfj',  label: '甜甜班长 · ESFJ', file: 'esfj.svg' },
  { id: 'estp',  label: '火花玩家 · ESTP', file: 'estp.svg' },
  { id: 'isfp',  label: '慢画旅人 · ISFP', file: 'isfp.svg' },
  { id: 'istp',  label: '扳手游侠 · ISTP', file: 'istp.svg' },
  { id: 'esfp',  label: '闪光爱豆 · ESFP', file: 'esfp.svg' },
];

const IMAGE_EXTS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp'];

function withCustomUrl(s) {
  return { ...s, customPetUrl: s.customPet ? pathToFileURL(s.customPet).href : null };
}

function save() { saveSettings(settings); }

function throttle(fn, ms) {
  let last = 0;
  return (...args) => {
    const now = Date.now();
    if (now - last >= ms) { last = now; fn(...args); }
  };
}

function sendSettingsChanged() {
  const payload = withCustomUrl(settings);
  if (petWin && !petWin.isDestroyed()) petWin.webContents.send('settings-changed', payload);
  if (settingsWin && !settingsWin.isDestroyed()) settingsWin.webContents.send('settings-changed', payload);
}

// ---------- 宠物窗口 ----------
function createPetWindow() {
  const size = settings.size || DEFAULTS.size;
  petWin = new BrowserWindow({
    width: size,
    height: size,
    transparent: true,
    frame: false,
    resizable: false,
    movable: true,
    hasShadow: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    fullscreenable: false,
    focusable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });
  petWin.setAlwaysOnTop(true, 'screen-saver');
  if (process.platform === 'darwin') {
    petWin.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  }
  petWin.loadFile(path.join(__dirname, 'src', 'pet.html'));

  if (settings.position) {
    // 上次的位置可能落在已拔掉的显示器上，而宠物是 focusable:false、拖不回来就真找不回来了
    const [sx, sy] = settings.position;
    const wa = screen.getDisplayNearestPoint({ x: sx, y: sy }).workArea;
    petWin.setPosition(
      Math.round(Math.min(Math.max(sx, wa.x), wa.x + wa.width - size)),
      Math.round(Math.min(Math.max(sy, wa.y), wa.y + wa.height - size))
    );
  } else {
    // 默认出现在主屏中央
    const { workArea } = screen.getPrimaryDisplay();
    petWin.setPosition(
      Math.round(workArea.x + (workArea.width - size) / 2),
      Math.round(workArea.y + (workArea.height - size) / 2)
    );
  }

  petWin.on('move', throttle(() => {
    if (petWin && !petWin.isDestroyed()) settings.position = petWin.getPosition();
    save();
  }, 400));

  // 关闭时隐藏而非退出；退出流程中要放行，否则 app.quit() 会被取消
  petWin.on('close', (e) => {
    if (isQuitting) return;
    e.preventDefault();
    petWin.hide();
  });

  petWin.webContents.on('context-menu', () => popupTrayMenu());
}

// ---------- 气泡窗口 ----------
function ensureBubble() {
  if (bubbleWin && !bubbleWin.isDestroyed()) return bubbleWin;
  bubbleWin = new BrowserWindow({
    width: 200,
    height: 60,
    transparent: true,
    frame: false,
    resizable: false,
    hasShadow: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    focusable: false,
    webPreferences: {
      preload: path.join(__dirname, 'bubble-preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });
  bubbleWin.setAlwaysOnTop(true, 'screen-saver');
  if (process.platform === 'darwin') bubbleWin.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  bubbleWin.loadFile(path.join(__dirname, 'src', 'bubble.html'));
  bubbleWin.setIgnoreMouseEvents(true, { forward: true });
  return bubbleWin;
}

let bubbleTimer = null;
function showBubble(text) {
  if (!petWin || petWin.isDestroyed()) return;
  const txt = String(text || '').trim().slice(0, 60);
  if (!txt) return;
  const w = Math.max(100, Math.min(300, Math.round(txt.length * 15 + 48)));
  const h = 60;
  const win = ensureBubble();
  win.setContentSize(w, h);
  const [px, py] = petWin.getPosition();
  const [pw, ph] = petWin.getSize();
  // 默认贴在宠物上方；顶上放不下就翻到下方，再整体钳制到当前屏幕的工作区内
  const wa = screen.getDisplayNearestPoint({ x: px, y: py }).workArea;
  let bx = Math.round(px + pw / 2 - w / 2);
  let by = py - h - 8;
  if (by < wa.y) by = py + ph + 8;
  bx = Math.min(Math.max(bx, wa.x), wa.x + wa.width - w);
  by = Math.min(Math.max(by, wa.y), wa.y + wa.height - h);
  win.setPosition(bx, by, false);
  win.webContents.send('bubble-text', txt);
  win.showInactive();
  clearTimeout(bubbleTimer);
  bubbleTimer = setTimeout(() => { if (bubbleWin && !bubbleWin.isDestroyed()) bubbleWin.hide(); }, 3200);
}

// ---------- 设置窗口 ----------
function openSettings() {
  if (settingsWin && !settingsWin.isDestroyed()) { settingsWin.show(); settingsWin.focus(); return; }
  settingsWin = new BrowserWindow({
    width: 480,
    height: 600,
    title: '桌面宠物 · 设置',
    autoHideMenuBar: true,
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });
  settingsWin.loadFile(path.join(__dirname, 'src', 'settings.html'));
  settingsWin.on('closed', () => { settingsWin = null; });
}

// ---------- 自定义图片导入 ----------
async function importImage() {
  const r = await dialog.showOpenDialog({
    title: '选择宠物图片',
    properties: ['openFile'],
    filters: [{ name: '图片', extensions: IMAGE_EXTS }],
  });
  if (r.canceled || !r.filePaths[0]) return null;
  return importFile(r.filePaths[0]);
}

function importFile(srcPath) {
  const ext = (path.extname(srcPath) || '.png').toLowerCase().replace('.', '');
  if (!IMAGE_EXTS.includes(ext)) return withCustomUrl(settings);
  fs.mkdirSync(CUSTOM_DIR, { recursive: true });
  const dest = path.join(CUSTOM_DIR, `custom-${Date.now()}.${ext}`);
  fs.copyFileSync(srcPath, dest);
  settings.customPet = dest;
  settings.pet = 'custom';
  save();
  sendSettingsChanged();
  return withCustomUrl(settings);
}

function switchPet(id) {
  if (id === 'custom' && !settings.customPet) { importImage(); return; }
  settings.pet = id;
  save();
  sendSettingsChanged();
}

// ---------- 托盘 ----------
// 宠物可见性：agent 可以 pet_hide，用户得能从托盘把它找回来
function petVisible() {
  return !!(petWin && !petWin.isDestroyed() && petWin.isVisible());
}

function setPetVisible(on) {
  if (!petWin || petWin.isDestroyed()) return;
  if (on) petWin.showInactive(); else petWin.hide();
}

function createTray() {
  const icon = nativeImage.createFromPath(path.join(__dirname, 'assets', 'tray.png'));
  if (process.platform === 'darwin') icon.setTemplateImage(true);
  tray = new Tray(icon);
  tray.setToolTip('桌面宠物');
  tray.on('click', () => popupTrayMenu());
  tray.on('right-click', () => popupTrayMenu());
}

function popupTrayMenu() {
  if (!tray) return;
  const petSub = BUILTIN_PETS.map(p => ({
    label: p.label,
    type: 'radio',
    checked: settings.pet === p.id,
    click: () => switchPet(p.id),
  }));
  petSub.push({ type: 'separator' });
  petSub.push({
    label: settings.customPet ? '自定义图片' : '导入自定义图片…',
    type: 'radio',
    checked: settings.pet === 'custom',
    click: () => { if (settings.customPet) switchPet('custom'); else importImage(); },
  });
  petSub.push({ type: 'separator' });
  petSub.push({
    label: '拼豆鸭 🦆',
    type: 'radio',
    checked: settings.pet === 'bead',
    click: () => switchPet('bead'),
  });

  const menu = Menu.buildFromTemplate([
    { label: '选择形象', submenu: petSub },
    { type: 'separator' },
    { label: '显示宠物', type: 'checkbox', checked: petVisible(), click: (mi) => setPetVisible(mi.checked) },
    { label: '随机走动', type: 'checkbox', checked: !!settings.wander, click: (mi) => { settings.wander = mi.checked; save(); sendSettingsChanged(); } },
    { label: '重新拼豆', visible: settings.pet === 'bead', click: () => { settings.beadProgress = 0; save(); sendSettingsChanged(); } },
    { label: '设置…', click: () => openSettings() },
    { type: 'separator' },
    { label: '退出', click: () => app.quit() },
  ]);
  tray.popUpContextMenu(menu);
}

// ---------- IPC ----------
function registerIpc() {
  ipcMain.handle('getSettings', () => withCustomUrl(settings));

  ipcMain.handle('saveSettings', (_e, patch) => {
    const oldSize = settings.size;
    settings = { ...settings, ...(patch || {}) };
    if (petWin && !petWin.isDestroyed() && patch && patch.size && patch.size !== oldSize) {
      const [x, y] = petWin.getPosition();
      const [w, h] = petWin.getSize();
      const cx = x + w / 2, cy = y + h / 2;
      const s = patch.size;
      petWin.setContentSize(s, s);
      petWin.setPosition(Math.round(cx - s / 2), Math.round(cy - s / 2));
    }
    save();
    sendSettingsChanged();
    return withCustomUrl(settings);
  });

  ipcMain.handle('getWindowPosition', () => (petWin && !petWin.isDestroyed()) ? petWin.getPosition() : [0, 0]);
  ipcMain.handle('setWindowPosition', (_e, x, y) => {
    if (petWin && !petWin.isDestroyed()) petWin.setPosition(Math.round(x), Math.round(y));
  });
  ipcMain.handle('getDisplays', () => screen.getAllDisplays().map(d => ({ ...d.workArea })));
  ipcMain.handle('getCursorPosition', () => screen.getCursorScreenPoint());
  ipcMain.handle('getPetSvg', (_e, id) => {
    const p = BUILTIN_PETS.find(x => x.id === id);
    if (!p) return '';
    try { return fs.readFileSync(path.join(PETS_DIR, p.file), 'utf8'); } catch { return ''; }
  });
  ipcMain.handle('getBeadPattern', () => {
    try { return JSON.parse(fs.readFileSync(path.join(PETS_DIR, 'duck.json'), 'utf8')); } catch { return null; }
  });
  ipcMain.handle('resizeWindow', (_e, w, h) => {
    if (!petWin || petWin.isDestroyed()) return;
    const [x, y] = petWin.getPosition();
    const [cw, ch] = petWin.getSize();
    const cx = x + cw / 2, cy = y + ch / 2;
    petWin.setContentSize(Math.round(w), Math.round(h));
    petWin.setPosition(Math.round(cx - w / 2), Math.round(cy - h / 2));
  });
  ipcMain.handle('showBubble', (_e, text) => showBubble(text));
  ipcMain.handle('hideBubble', () => { if (bubbleWin && !bubbleWin.isDestroyed()) bubbleWin.hide(); });
  ipcMain.handle('openSettings', () => openSettings());
  ipcMain.handle('importImage', () => importImage());
  ipcMain.handle('importFile', (_e, srcPath) => importFile(srcPath));
  ipcMain.handle('switchPet', (_e, id) => switchPet(id));
  ipcMain.handle('toggleWander', (_e, on) => { settings.wander = !!on; save(); sendSettingsChanged(); });
  ipcMain.handle('pet-clicked', async () => {
    // Codex 式“待复核”：点击即“看过结果”，先清徽标，与点击行为无关
    if (currentStatus === 'review') {
      currentStatus = null;
      sendAgentEvent({ type: 'status', state: 'idle' });
    }
    const action = settings.clickAction || 'focus';
    if (action === 'play') return { skipped: true };
    return focusKimiCode();
  });
  ipcMain.handle('quit', () => app.quit());
}

// ---------- MCP / hooks 桥 ----------
const BRIDGE_PETS = ['robo', 'cat', 'dog', 'slime', 'bunny', 'alien', 'bead', 'intj', 'intp', 'entj', 'entp', 'infp', 'infj', 'enfj', 'enfp', 'isfj', 'istj', 'estj', 'esfj', 'estp', 'isfp', 'istp', 'esfp'];

// 聚焦 Kimi Code 窗口（点击宠物时用；macOS 走 AppleScript，Windows 走 PowerShell）
function focusKimiCode() {
  return new Promise((resolve) => {
    if (process.platform === 'darwin') {
      const script = [
        'tell application "System Events"',
        // 优先精确命中 Kimi Code Desktop，再退到模糊匹配（CLI 场景下可能找不到）
        'set matchList to name of every process whose background only is false and name is "Kimi Code"',
        'if (count of matchList) is 0 then',
        'set matchList to name of every process whose background only is false and name contains "kimi"',
        'end if',
        'end tell',
        'if (count of matchList) is 0 then return "not-found"',
        'tell application (item 1 of matchList) to activate',
        'return "ok"',
      ].join('\n');
      execFile('osascript', ['-e', script], { timeout: 5000 }, (err, stdout) => {
        if (err) return resolve({ focused: false, error: String(err) });
        resolve({ focused: stdout.trim() === 'ok' });
      });
    } else if (process.platform === 'win32') {
      const ps = "(New-Object -ComObject WScript.Shell).AppActivate((Get-Process | Where-Object { $_.MainWindowTitle -match 'kimi' } | Select-Object -First 1).Id)";
      execFile('powershell', ['-NoProfile', '-NonInteractive', '-Command', ps], { timeout: 5000 }, (err, stdout) => {
        resolve({ focused: !err && String(stdout).trim() === 'True' });
      });
    } else {
      resolve({ focused: false, error: 'unsupported platform' });
    }
  });
}

function sendAgentEvent(payload) {
  if (petWin && !petWin.isDestroyed()) petWin.webContents.send('agent-event', payload);
}

let currentStatus = null; // 最近一次任务状态（review 点击后清除）

async function handleBridgeCommand(action, payload) {
  switch (action) {
    case 'status':
      return {
        running: true,
        pet: settings.pet,
        size: settings.size || DEFAULTS.size,
        wander: !!settings.wander,
        visible: petVisible(),
        position: (petWin && !petWin.isDestroyed()) ? petWin.getPosition() : null,
        task: currentStatus,
      };
    case 'say': {
      const text = String((payload && payload.text) || '').trim().slice(0, 60);
      if (text) showBubble(text);
      const mood = payload && payload.mood;
      if (mood) sendAgentEvent({ type: 'mood', mood });
      return { said: text };
    }
    case 'mood':
      sendAgentEvent({ type: 'mood', mood: String((payload && payload.mood) || 'happy') });
      return {};
    case 'animate':
      sendAgentEvent({ type: 'animate', anim: String((payload && payload.anim) || 'jump') });
      return {};
    case 'walk': {
      let x = Number(payload && payload.x), y = Number(payload && payload.y);
      if (payload && payload.center) {
        const wa = screen.getPrimaryDisplay().workArea;
        const s = settings.size || DEFAULTS.size;
        x = wa.x + (wa.width - s) / 2;
        y = wa.y + (wa.height - s) / 2;
      }
      if (!Number.isFinite(x) || !Number.isFinite(y)) throw new Error('walk 需要数值 x、y 或 center=true');
      sendAgentEvent({ type: 'walk', x: Math.round(x), y: Math.round(y) });
      return { to: [Math.round(x), Math.round(y)] };
    }
    case 'set': {
      const p = payload || {};
      if (p.pet !== undefined) {
        const id = String(p.pet);
        if (BRIDGE_PETS.includes(id)) switchPet(id);
        else if (id === 'custom' && settings.customPet) switchPet('custom');
        else throw new Error(`未知形象: ${id}（可选: ${BRIDGE_PETS.join('/')}，custom 需已导入图片）`);
      }
      if (p.size !== undefined || p.wander !== undefined) {
        const patch = {};
        if (p.size !== undefined) {
          const s = Number(p.size);
          if (!Number.isFinite(s) || s < 80 || s > 400) throw new Error('size 需在 80–400 之间');
          patch.size = Math.round(s);
        }
        if (p.wander !== undefined) patch.wander = !!p.wander;
        settings = { ...settings, ...patch };
        save();
        if (patch.size && petWin && !petWin.isDestroyed()) {
          const [x, y] = petWin.getPosition();
          const [w, h] = petWin.getSize();
          const cx = x + w / 2, cy = y + h / 2;
          petWin.setContentSize(patch.size, patch.size);
          petWin.setPosition(Math.round(cx - patch.size / 2), Math.round(cy - patch.size / 2));
        }
        sendSettingsChanged();
      }
      return { pet: settings.pet, size: settings.size, wander: !!settings.wander };
    }
    case 'show':
      if (petWin && !petWin.isDestroyed()) petWin.showInactive();
      return {};
    case 'hide':
      if (petWin && !petWin.isDestroyed()) petWin.hide();
      return {};
    case 'event':
      currentStatus = String((payload && payload.state) || 'idle');
      sendAgentEvent({ type: 'status', state: currentStatus, text: payload && payload.text });
      return {};
    case 'focus':
      return focusKimiCode();
    case 'quit':
      setTimeout(() => app.quit(), 50);
      return {};
    default:
      throw new Error(`未知指令: ${action}`);
  }
}

// ---------- 生命周期 ----------
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => { if (petWin && !petWin.isDestroyed()) petWin.show(); });

  app.whenReady().then(async () => {
    fs.mkdirSync(CUSTOM_DIR, { recursive: true });
    registerIpc();
    createPetWindow();
    createTray();
    if (!SMOKE) {
      try { await startBridge(handleBridgeCommand); } catch (e) { console.error('bridge 启动失败:', e); }
    }
    if (SMOKE) {
      setTimeout(() => { console.log('SMOKE OK'); app.exit(0); }, 3000);
    }
  });

  app.on('window-all-closed', () => { /* 常驻托盘，不退出 */ });
  app.on('before-quit', () => { isQuitting = true; clearState(); save(); });
}
