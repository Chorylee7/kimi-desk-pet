// 生成 GitHub social preview(1280×640):标题 + 代表形象一排 + 安装命令
// 用法: node scripts/make-social.mjs > app/preview/social-preview.svg
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PETS_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'app', 'pets');
const ROW = ['estp', 'intj', 'enfp', 'isfj', 'entj', 'infp'];

function petInner(id) {
  const raw = fs.readFileSync(path.join(PETS_DIR, `${id}.svg`), 'utf8');
  return raw.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
}

let pets = '';
ROW.forEach((id, i) => {
  const s = 0.78;
  const x = 690 + i * 88, y = 210 + (i % 2) * 22;
  pets += `<g transform="translate(${x}, ${y}) scale(${s})">${petInner(id)}</g>`;
});

console.log(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 640" shape-rendering="crispEdges">
<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#141a2e"/>
    <stop offset="1" stop-color="#2a1f3d"/>
  </linearGradient>
</defs>
<rect width="1280" height="640" fill="url(#bg)"/>
<text x="72" y="190" font-family="PingFang SC, system-ui, sans-serif" font-size="64" font-weight="700" fill="#FFFFFF">Kimi Code 桌面宠物</text>
<text x="72" y="258" font-family="PingFang SC, system-ui, sans-serif" font-size="28" fill="#9fb4d8">任务状态外显 · MBTI 十六型像素形象</text>
<rect x="72" y="330" width="560" height="64" rx="12" fill="#0d1220" stroke="#3b4a6b"/>
<text x="96" y="371" font-family="Menlo, monospace" font-size="22" fill="#7ee2a8">/plugins install Chorylee7/kimi-desk-pet</text>
<text x="72" y="470" font-family="PingFang SC, system-ui, sans-serif" font-size="20" fill="#6b7694">在桌面上养一只会互动的 AI 桌宠 —— 领走你自己那一型</text>
${pets}
</svg>`);
