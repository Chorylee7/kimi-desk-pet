// bridge.js — 本地 HTTP 桥，让 Kimi Code MCP server / hooks 能驱动宠物。
// 仅绑定 127.0.0.1，随机端口 + 随机 token，状态写入 $KIMI_CODE_HOME/desk-pet/bridge.json。
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

function stateDir() {
  const base = process.env.KIMI_CODE_HOME || path.join(os.homedir(), '.kimi-code');
  const dir = path.join(base, 'desk-pet');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function stateFile() {
  return path.join(stateDir(), 'bridge.json');
}

function readState() {
  try { return JSON.parse(fs.readFileSync(stateFile(), 'utf8')); } catch { return null; }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (c) => {
      raw += c;
      if (raw.length > 64 * 1024) { req.destroy(); reject(new Error('body too large')); }
    });
    req.on('end', () => {
      if (!raw) return resolve({});
      try { resolve(JSON.parse(raw)); } catch { reject(new Error('invalid JSON body')); }
    });
    req.on('error', reject);
  });
}

// onCommand: (action, payload) => object | Promise<object>
function startBridge(onCommand) {
  const token = crypto.randomBytes(16).toString('hex');
  const server = http.createServer(async (req, res) => {
    const send = (code, obj) => {
      const body = JSON.stringify(obj);
      res.writeHead(code, { 'Content-Type': 'application/json' });
      res.end(body);
    };
    try {
      const url = (req.url || '/').split('?')[0];
      if (url === '/health') return send(200, { ok: true });

      if (req.headers.authorization !== `Bearer ${token}`) {
        return send(401, { error: 'unauthorized' });
      }

      const action = url.slice(1);
      const payload = req.method === 'POST' ? await readBody(req) : {};
      const result = await onCommand(action, payload);
      return send(200, { ok: true, result: result == null ? {} : result });
    } catch (e) {
      return send(500, { error: String((e && e.message) || e) });
    }
  });

  return new Promise((resolve, reject) => {
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      const state = { port, token, pid: process.pid, startedAt: new Date().toISOString() };
      const tmp = stateFile() + '.tmp';
      fs.writeFileSync(tmp, JSON.stringify(state, null, 2));
      fs.renameSync(tmp, stateFile());
      resolve({ port, token, close: () => server.close() });
    });
  });
}

function clearState() {
  try { fs.unlinkSync(stateFile()); } catch { /* ignore */ }
}

module.exports = { startBridge, readState, clearState };
