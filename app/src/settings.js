const api = window.petAPI;
const BUILTIN = [
  { id: 'robo',  label: '机器人', src: '../pets/robo.svg' },
  { id: 'cat',   label: '小猫',   src: '../pets/cat.svg' },
  { id: 'dog',   label: '小狗',   src: '../pets/dog.svg' },
  { id: 'slime', label: '史莱姆', src: '../pets/slime.svg' },
  { id: 'bunny', label: '小兔',   src: '../pets/bunny.svg' },
  { id: 'alien', label: '外星人', src: '../pets/alien.svg' },
  { id: 'intj',  label: '夜幕军师 · INTJ', src: '../pets/intj.svg' },
  { id: 'intp',  label: '奇思博士 · INTP', src: '../pets/intp.svg' },
  { id: 'entj',  label: '破阵统帅 · ENTJ', src: '../pets/entj.svg' },
  { id: 'entp',  label: '点子王 · ENTP', src: '../pets/entp.svg' },
  { id: 'infp',  label: '拾梦旅人 · INFP', src: '../pets/infp.svg' },
  { id: 'infj',  label: '星灯隐士 · INFJ', src: '../pets/infj.svg' },
  { id: 'enfj',  label: '篝火团长 · ENFJ', src: '../pets/enfj.svg' },
  { id: 'enfp',  label: '彩虹弹弹 · ENFP', src: '../pets/enfp.svg' },
  { id: 'isfj',  label: '暖灯管家 · ISFJ', src: '../pets/isfj.svg' },
  { id: 'istj',  label: '方格哨兵 · ISTJ', src: '../pets/istj.svg' },
  { id: 'estj',  label: '号令队长 · ESTJ', src: '../pets/estj.svg' },
  { id: 'esfj',  label: '甜甜班长 · ESFJ', src: '../pets/esfj.svg' },
  { id: 'estp',  label: '火花玩家 · ESTP', src: '../pets/estp.svg' },
  { id: 'isfp',  label: '慢画旅人 · ISFP', src: '../pets/isfp.svg' },
  { id: 'istp',  label: '扳手游侠 · ISTP', src: '../pets/istp.svg' },
  { id: 'esfp',  label: '闪光爱豆 · ESFP', src: '../pets/esfp.svg' },
  { id: 'bead',  label: '拼豆鸭', src: '../preview/duck-preview.png' },
];

let settings = null;
let selectedId = null;
let sizeTimer = null;

// 分享卡台词：每只形象一句签名
const SHARE_LINES = {
  robo: '哔哔——系统运转正常', cat: '喵～ 陪我玩会儿嘛', dog: '汪汪！出去玩吗',
  slime: '咕叽咕叽…', bunny: '蹦蹦跳跳真可爱', alien: '地球人，你好呀',
  bead: '嘎嘎！我出生啦 🦆', custom: '独一无二的自定义形象',
  intj: '这个方案我三年前就想到了', intp: '发呆中…不，是在思考', entj: '跟上我的节奏',
  entp: '哎我有个绝妙的点子！', infp: '在梦里给你留了位置', infj: '我看得见你心里的光',
  enfj: '你比自己想象的更厉害', enfp: '哇这个好玩那个也好玩！', isfj: '给你温了杯茶',
  istj: '一切尽在掌握', estj: '听我口令——行动！', esfj: '给你留了小饼干哦',
  estp: '墨镜戴好，出发！', isfp: '这束光的颜色真好看…', istp: '话不多，活不差',
  esfp: '生活就是要闪闪发光',
};

async function init() {
  settings = await api.getSettings();
  selectedId = settings.pet;
  buildGallery();
  bind();
  renderControls();
  renderShareCard();
  api.onSettingsChanged((s) => {
    settings = s;
    selectedId = s.pet;
    buildGallery();
    renderControls();
    renderShareCard();
  });
}

// 分享卡：当前形象 + 昵称 + 签名台词
function renderShareCard() {
  const entry = BUILTIN.find(p => p.id === selectedId);
  const img = document.getElementById('sharePetImg');
  if (selectedId === 'custom' && settings.customPetUrl) {
    img.src = settings.customPetUrl;
    document.getElementById('shareName').textContent = '自定义形象';
  } else if (entry) {
    img.src = entry.src;
    document.getElementById('shareName').textContent = entry.label;
  } else {
    img.src = '../pets/robo.svg';
    document.getElementById('shareName').textContent = '机器人';
  }
  document.getElementById('shareLine').textContent = `「${SHARE_LINES[selectedId] || SHARE_LINES.robo}」`;
}

function buildGallery() {
  const g = document.getElementById('gallery');
  g.innerHTML = '';
  BUILTIN.forEach(p => {
    const card = document.createElement('div');
    card.className = 'card' + (selectedId === p.id ? ' active' : '');
    card.dataset.id = p.id;
    card.innerHTML = `<img src="${p.src}" alt="${p.label}"><span>${p.label}</span>`;
    card.onclick = () => api.switchPet(p.id);
    g.appendChild(card);
  });
  if (settings.customPetUrl) {
    const card = document.createElement('div');
    card.className = 'card' + (selectedId === 'custom' ? ' active' : '');
    card.dataset.id = 'custom';
    card.innerHTML = `<img src="${settings.customPetUrl}" alt="自定义"><span>自定义</span>`;
    card.onclick = () => api.switchPet('custom');
    g.appendChild(card);
  }
}

function bind() {
  document.getElementById('importBtn').onclick = () => api.importImage();
  document.getElementById('closeBtn').onclick = () => window.close();

  const range = document.getElementById('sizeRange');
  range.oninput = () => {
    document.getElementById('sizeVal').textContent = range.value + ' px';
    clearTimeout(sizeTimer);
    sizeTimer = setTimeout(() => api.saveSettings({ size: parseInt(range.value, 10) }), 250);
  };

  document.getElementById('wanderToggle').onchange = (e) =>
    api.saveSettings({ wander: e.target.checked });

  document.getElementById('clickAction').onchange = (e) =>
    api.saveSettings({ clickAction: e.target.value });

  document.getElementById('shareBtn').onclick = async () => {
    const card = document.getElementById('shareCard');
    const r = card.getBoundingClientRect();
    const pad = 6;
    const rect = {
      x: Math.max(0, Math.round(r.x - pad)),
      y: Math.max(0, Math.round(r.y - pad)),
      width: Math.round(r.width + pad * 2),
      height: Math.round(r.height + pad * 2),
    };
    await api.exportShareCard(rect);
  };
}

function renderControls() {
  document.getElementById('sizeRange').value = settings.size;
  document.getElementById('sizeVal').textContent = settings.size + ' px';
  document.getElementById('wanderToggle').checked = !!settings.wander;
  document.getElementById('clickAction').value = settings.clickAction || 'focus';
}

init();
