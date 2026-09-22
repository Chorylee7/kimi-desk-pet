// Desk Pet MCP server（stdio）。
// 管理常驻 Electron 宠物进程：复用已有实例（通过 $KIMI_CODE_HOME/desk-pet/bridge.json 发现），
// 否则自动安装依赖并 detached 拉起新实例，然后经本地 HTTP bridge 下发指令。
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const MCP_DIR = path.dirname(fileURLToPath(import.meta.url));
const PLUGIN_ROOT = path.resolve(MCP_DIR, '..');
const APP_DIR = path.join(PLUGIN_ROOT, 'app');

const MOODS = ['happy', 'sad', 'angry', 'dizzy', 'sleepy', 'think', 'love'];
const ANIMS = ['jump', 'spin', 'happy', 'shake'];

// ---------- 日志（stdout 是 JSON-RPC 通道，只能写文件） ----------
function log(...args) {
  try {
    fs.mkdirSync(stateDir(), { recursive: true });
    fs.appendFileSync(path.join(stateDir(), 'mcp.log'), `[${new Date().toISOString()}] ${args.join(' ')}\n`);
  } catch { /* ignore */ }
}

function stateDir() {
  const base = process.env.KIMI_CODE_HOME || path.join(os.homedir(), '.kimi-code');
  return path.join(base, 'desk-pet');
}

function stateFile() {
  return path.join(stateDir(), 'bridge.json');
}

function readState() {
  try { return JSON.parse(fs.readFileSync(stateFile(), 'utf8')); } catch { return null; }
}

// ---------- 依赖自动安装 ----------
function runNpmInstall(dir) {
  return new Promise((resolve) => {
    log(`npm install in ${dir}`);
    const out = path.join(stateDir(), 'npm-install.log');
    let fd;
    try { fd = fs.openSync(out, 'a'); } catch { fd = 'ignore'; }
    const child = spawn('npm', ['install', '--no-audit', '--no-fund'], {
      cwd: dir,
      stdio: ['ignore', fd, fd],
      env: process.env,
    });
    child.on('exit', (code) => { try { fs.closeSync(fd); } catch { /* ignore */ } resolve(code === 0); });
    child.on('error', (e) => { log('npm spawn error:', e.message); try { fs.closeSync(fd); } catch { /* ignore */ } resolve(false); });
  });
}

async function ensureDeps() {
  fs.mkdirSync(stateDir(), { recursive: true });
  const needMcp = !fs.existsSync(path.join(MCP_DIR, 'node_modules', '@modelcontextprotocol', 'sdk'));
  const needApp = !electronBinary();
  if (!needMcp && !needApp) return;
  if (needMcp && !(await runNpmInstall(MCP_DIR))) {
    throw new Error(`MCP 依赖安装失败（日志: ${path.join(stateDir(), 'npm-install.log')}），请手动在 ${MCP_DIR} 执行 npm install`);
  }
  if (!electronBinary() && !(await runNpmInstall(APP_DIR))) {
    throw new Error(`Electron 依赖安装失败（日志: ${path.join(stateDir(), 'npm-install.log')}）。国内网络可设置 ELECTRON_MIRROR=https://mirrors.huaweicloud.com/electron/ 后重试`);
  }
}

// 首次安装要下载 Electron，耗时远超 MCP 握手超时（默认 30s）。
// 所以只跑一次并缓存 promise：启动时后台预热，真要拉起宠物时再 await。
let depsPromise = null;
function ensureDepsOnce() {
  if (!depsPromise) depsPromise = ensureDeps().catch((e) => { depsPromise = null; throw e; });
  return depsPromise;
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

// ---------- bridge 通信 ----------
async function ping(state) {
  try {
    const res = await fetch(`http://127.0.0.1:${state.port}/health`, { signal: AbortSignal.timeout(1200) });
    return res.ok;
  } catch { return false; }
}

async function postToBridge(state, action, payload) {
  const res = await fetch(`http://127.0.0.1:${state.port}/${action}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${state.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(6000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.ok === false) {
    // 桥正常应答但命令失败：属于业务错误，不能重试（避免副作用命令下发两次）
    const err = new Error(data.error || `bridge 返回 ${res.status}`);
    err.bridgeResponded = true;
    throw err;
  }
  return data.result || {};
}

async function bridgeCall(action, payload = {}) {
  try {
    return await postToBridge(await ensurePet(), action, payload);
  } catch (e) {
    if (e && e.bridgeResponded) throw e;
    // 连接层失败：宠物可能在会话中途被托盘退出或崩了，而 ensurePromise 还缓存着旧 port/token。
    // 丢掉缓存重新发现/拉起一次再试，否则本会话后续所有工具调用都会一直失败。
    ensurePromise = null;
    return await postToBridge(await ensurePet(), action, payload);
  }
}

// ---------- 宠物进程管理 ----------
let ensurePromise = null;

function ensurePet() {
  if (!ensurePromise) ensurePromise = doEnsurePet().catch((e) => { ensurePromise = null; throw e; });
  return ensurePromise;
}

async function doEnsurePet() {
  if (typeof fetch !== 'function') throw new Error('需要 Node.js >= 18（支持全局 fetch）');
  await ensureDepsOnce();

  const existing = readState();
  if (existing && existing.port && existing.token && await ping(existing)) return existing;

  const bin = electronBinary();
  if (!bin) throw new Error('未找到 Electron，请手动在 app/ 目录执行 npm install');

  log('spawning electron:', bin);
  const child = spawn(bin, [APP_DIR], {
    detached: true,
    stdio: 'ignore',
    env: { ...process.env },
  });
  child.unref();
  child.on('error', (e) => log('electron spawn error:', e.message));

  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 400));
    const state = readState();
    if (state && state.pid && state.pid !== process.pid && await ping(state)) return state;
  }
  throw new Error('Electron 宠物启动超时（30s）。可查看日志: ' + path.join(stateDir(), 'mcp.log'));
}

// ---------- MCP 工具 ----------
const text = (obj) => ({ content: [{ type: 'text', text: typeof obj === 'string' ? obj : JSON.stringify(obj, null, 2) }] });

async function main() {
  // 后台预热依赖：在这里 await 会让握手超过客户端启动超时（首次要下载 Electron）
  ensureDepsOnce().catch((e) => log('deps preinstall failed:', (e && e.message) || e));
  const { McpServer } = await import('@modelcontextprotocol/sdk/server/mcp.js');
  const { StdioServerTransport } = await import('@modelcontextprotocol/sdk/server/stdio.js');
  const { z } = await import('zod');

  const server = new McpServer({
    name: 'desk-pet',
    version: '0.4.1',
  });

  server.tool('pet_status', '查看桌面宠物状态（存活、形象、尺寸、位置、是否随机走动）', {}, async () => {
    return text(await bridgeCall('status'));
  });

  server.tool('pet_show', '显示桌面宠物窗口', {}, async () => {
    return text(await bridgeCall('show'));
  });

  server.tool('pet_hide', '隐藏桌面宠物窗口', {}, async () => {
    return text(await bridgeCall('hide'));
  });

  server.tool('pet_say', '让桌面宠物用气泡说一句话，可附带表情', {
    text: z.string().max(60).describe('说的话（60 字以内）'),
    mood: z.enum(MOODS).optional().describe('同时展示的表情'),
  }, async ({ text: t, mood }) => {
    return text(await bridgeCall('say', { text: t, mood }));
  });

  server.tool('pet_mood', '让桌面宠物展示一种表情/情绪动画', {
    mood: z.enum(MOODS).describe('情绪: happy/love/sad/angry/dizzy/sleepy/think'),
  }, async ({ mood }) => {
    return text(await bridgeCall('mood', { mood }));
  });

  server.tool('pet_animate', '让桌面宠物做一个动作', {
    anim: z.enum(ANIMS).describe('动作: jump 跳 / spin 转圈 / happy 开心摇摆 / shake 抖动'),
  }, async ({ anim }) => {
    return text(await bridgeCall('animate', { anim }));
  });

  server.tool('pet_move', '让桌面宠物平滑走到屏幕坐标；不传坐标则走到主屏幕中央', {
    x: z.number().optional().describe('目标屏幕 x 坐标'),
    y: z.number().optional().describe('目标屏幕 y 坐标'),
    center: z.boolean().optional().describe('true 时走到主屏幕中央'),
  }, async ({ x, y, center }) => {
    if (center === true || (x === undefined && y === undefined)) {
      return text(await bridgeCall('walk', { center: true }));
    }
    if (x === undefined || y === undefined) {
      throw new Error('pet_move 需要同时提供 x 和 y；只想走去屏幕中央就别传坐标');
    }
    return text(await bridgeCall('walk', { x, y }));
  });

  server.tool('pet_set', '设置桌面宠物：切换形象 / 调整尺寸 / 开关随机走动', {
    pet: z.enum(['robo', 'cat', 'dog', 'slime', 'bunny', 'alien', 'bead', 'custom']).optional().describe('形象（custom 需已在设置里导入过图片）'),
    size: z.number().min(80).max(400).optional().describe('窗口边长 px（80–400）'),
    wander: z.boolean().optional().describe('是否随机走动'),
  }, async (patch) => {
    return text(await bridgeCall('set', patch));
  });

  server.tool('pet_quit', '退出桌面宠物进程（托盘菜单也可退出）', {}, async () => {
    const r = await bridgeCall('quit');
    ensurePromise = null;
    return text(r);
  });

  server.tool('pet_task', '设置宠物任务状态徽标（Kimi Code 任务状态外显）', {
    state: z.enum(['thinking', 'working', 'done', 'review', 'error', 'notice', 'idle']).describe('thinking 思考中 / working 工作中 / done 完成一闪 / review 待复核(持续) / error 出错 / notice 提醒 / idle 隐藏'),
    text: z.string().max(60).optional().describe('随徽标显示的气泡文字（可选）'),
  }, async ({ state, text: t }) => {
    return text(await bridgeCall('event', { state, text: t }));
  });

  server.tool('pet_focus', '把 Kimi Code 窗口带到前台（等同点击宠物）', {}, async () => {
    return text(await bridgeCall('focus'));
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
  log('MCP server connected on stdio');
}

main().catch((e) => {
  log('fatal:', e && e.stack || e);
  process.stderr.write(`desk-pet MCP server failed: ${(e && e.message) || e}\n`);
  process.exit(1);
});
