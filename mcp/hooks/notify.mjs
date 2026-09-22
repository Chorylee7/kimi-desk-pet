// Kimi Code hook：让宠物对会话事件做出反应。
// SessionStart → 启动（若未运行）并打招呼；PostToolUse(Bash) 失败 → 安慰，成功 → 小概率庆祝。
// 任何情况下都 exit 0，绝不阻塞主流程。
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PLUGIN_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const APP_DIR = path.join(PLUGIN_ROOT, 'app');
const COOLDOWN_MS = 20 * 1000;

const GREETS = [
  '开工！我在桌上陪你 💪', '喵～又见面了', '新的会话，一起加油 ✨',
  '我在这儿呢，随时叫我', '今天也要顺顺利利哦 🍀',
];
const CHEER_UP = [
  '别灰心，再试一次！', '报错而已，喝口水再战 🥤', '我陪你一起 debug 呢',
  '稳住，我们能赢 💪', '换个思路试试？',
];

function stateDir() {
  const base = process.env.KIMI_CODE_HOME || path.join(os.homedir(), '.kimi-code');
  const dir = path.join(base, 'desk-pet');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function readState() {
  try { return JSON.parse(fs.readFileSync(path.join(stateDir(), 'bridge.json'), 'utf8')); } catch { return null; }
}

function cooldownOk() {
  try {
    const { lastAt } = JSON.parse(fs.readFileSync(path.join(stateDir(), 'hook-cooldown.json'), 'utf8'));
    if (Date.now() - lastAt < COOLDOWN_MS) return false;
  } catch { /* ignore */ }
  fs.writeFileSync(path.join(stateDir(), 'hook-cooldown.json'), JSON.stringify({ lastAt: Date.now() }));
  return true;
}

// 记录最近一次下发的状态，避免 PostToolUse 高频重复推送
function currentStatus() {
  try { return JSON.parse(fs.readFileSync(path.join(stateDir(), 'status-state.json'), 'utf8')).state || null; } catch { return null; }
}

function writeStatus(state) {
  try { fs.writeFileSync(path.join(stateDir(), 'status-state.json'), JSON.stringify({ state, at: Date.now() })); } catch { /* ignore */ }
}

function electronBinary() {
  const nm = path.join(APP_DIR, 'node_modules', 'electron', 'dist');
  const candidates = {
    darwin: path.join(nm, 'Electron.app', 'Contents', 'MacOS', 'Electron'),
    win32: path.join(nm, 'electron.exe'),
    linux: path.join(nm, 'electron'),
  };
  const bin = candidates[process.platform];
  return bin && fs.existsSync(bin) ? bin : null;
}

async function ping(state) {
  try {
    const res = await fetch(`http://127.0.0.1:${state.port}/health`, { signal: AbortSignal.timeout(1000) });
    return res.ok;
  } catch { return false; }
}

async function ensurePet() {
  const existing = readState();
  if (existing && await ping(existing)) return existing;
  const bin = electronBinary();
  if (!bin) return null; // 未安装依赖时不自动装（避免 hook 耗时），交给 MCP server
  const child = spawn(bin, [APP_DIR], { detached: true, stdio: 'ignore', env: { ...process.env } });
  child.unref();
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 400));
    const state = readState();
    if (state && await ping(state)) return state;
  }
  return null;
}

async function send(action, payload) {
  const state = readState();
  if (!state || !(await ping(state))) return;
  await fetch(`http://127.0.0.1:${state.port}/${action}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${state.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {}),
    signal: AbortSignal.timeout(3000),
  }).catch(() => { /* ignore */ });
}

function readStdin() {
  return new Promise((resolve) => {
    let raw = '';
    process.stdin.on('data', (c) => { raw += c; });
    process.stdin.on('end', () => {
      try { resolve(JSON.parse(raw)); } catch { resolve({}); }
    });
    setTimeout(() => resolve({}), 3000); // 兜底
  });
}

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

async function main() {
  const data = await readStdin();
  const event = data.hook_event_name || data.event || '';
  const tool = data.tool_name || data.tool || '';

  if (event === 'SessionStart') {
    const state = await ensurePet();
    if (state) await send('say', { text: pick(GREETS), mood: 'happy' });
    return;
  }

  // 任务状态外显（对标 Codex 宠物）：思考中 → 工作中 → 待复核 / 出错
  const STATUS_MAP = {
    TurnStarted: 'thinking',  // 一轮开始，先思考
    StopFailure: 'error',     // 本轮失败 → ❌
    Interrupt: 'idle',        // 用户打断 → 收起
  };
  const status = STATUS_MAP[event];
  if (status) {
    await send('event', { state: status });
    writeStatus(status);
  } else if (event === 'PostToolUse' && currentStatus() === 'thinking') {
    // 第一个工具调用落地：从“思考中”升级为“工作中”（状态文件去重，不重复推送）
    await send('event', { state: 'working' });
    writeStatus('working');
  } else if (event === 'Stop') {
    // 本轮正常结束：进入“待复核”，持续显示直到用户点击宠物或开启新一轮
    await send('event', { state: 'review' });
    writeStatus('review');
  }

  if (event === 'StopFailure' || (event === 'PostToolUseFailure' && tool === 'Bash')) {
    if (cooldownOk()) await send('say', { text: pick(CHEER_UP), mood: 'sad' });
  } else if (event === 'Notification') {
    await send('event', { state: 'notice', text: '后台任务完成啦 🎉' });
    await send('mood', { mood: 'happy' });
  }
}

main().catch(() => { /* 绝不阻塞主流程 */ }).finally(() => process.exit(0));
