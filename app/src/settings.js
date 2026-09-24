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

async function init() {
  settings = await api.getSettings();
  selectedId = settings.pet;
  buildGallery();
  bind();
  renderControls();
  api.onSettingsChanged((s) => {
    settings = s;
    selectedId = s.pet;
    buildGallery();
    renderControls();
  });
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
}

function renderControls() {
  document.getElementById('sizeRange').value = settings.size;
  document.getElementById('sizeVal').textContent = settings.size + ' px';
  document.getElementById('wanderToggle').checked = !!settings.wander;
  document.getElementById('clickAction').value = settings.clickAction || 'focus';
}

init();
