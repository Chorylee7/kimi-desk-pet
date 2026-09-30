// 生成 16 型 4×4 拼图 SVG（内联各 pet SVG，避免 qlmanage 不解析外部引用）
// 用法: node scripts/make-grid.mjs > app/preview/mbti-grid.svg
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PETS_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'app', 'pets');

const GROUPS = [
  { name: 'NT 分析家', bg: '#F3EFFF', pets: [['intj', '夜幕军师 INTJ'], ['intp', '奇思博士 INTP'], ['entj', '破阵统帅 ENTJ'], ['entp', '点子王 ENTP']] },
  { name: 'NF 外交家', bg: '#FFF4E8', pets: [['infp', '拾梦旅人 INFP'], ['infj', '星灯隐士 INFJ'], ['enfj', '篝火团长 ENFJ'], ['enfp', '彩虹弹弹 ENFP']] },
  { name: 'SJ 守护者', bg: '#EDF3FF', pets: [['isfj', '暖灯管家 ISFJ'], ['istj', '方格哨兵 ISTJ'], ['estj', '号令队长 ESTJ'], ['esfj', '甜甜班长 ESFJ']] },
  { name: 'SP 探险家', bg: '#FFF8E1', pets: [['estp', '火花玩家 ESTP'], ['isfp', '慢画旅人 ISFP'], ['istp', '扳手游侠 ISTP'], ['esfp', '闪光爱豆 ESFP']] },
];

const CELL_W = 210, CELL_H = 246, PET = 190;

function petInner(id) {
  const raw = fs.readFileSync(path.join(PETS_DIR, `${id}.svg`), 'utf8');
  return raw.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
}

let cells = '';
GROUPS.forEach((g, row) => {
  g.pets.forEach(([id, label], col) => {
    const x = col * CELL_W, y = row * CELL_H;
    const px = x + (CELL_W - PET) / 2, py = y + 6;
    const s = PET / 200;
    cells += `
  <rect x="${x + 5}" y="${y + 5}" width="${CELL_W - 10}" height="${CELL_H - 10}" rx="18" fill="${g.bg}"/>
  <g transform="translate(${px}, ${py}) scale(${s})">${petInner(id)}</g>
  <text x="${x + CELL_W / 2}" y="${y + CELL_H - 18}" text-anchor="middle" font-family="PingFang SC, system-ui, sans-serif" font-size="15" font-weight="600" fill="#3a4152">${label}</text>`;
  });
});

const W = CELL_W * 4, H = CELL_H * 4;
console.log(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" shape-rendering="crispEdges">
<rect width="${W}" height="${H}" fill="#FFFFFF"/>${cells}
</svg>`);
