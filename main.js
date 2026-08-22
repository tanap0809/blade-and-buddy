/**
 * Blade & Buddy - 3D Dungeon Action RPG
 * Title Screen & Options + Collision Physics + Boss Victory Celebration + Seamless Stage Progression + 5-Element Magic
 */

// =============================================================================
// 1. ゲーム設定 & グローバル状態
// =============================================================================
const CONFIG = {
  playerSpeed: 7.5,
  playerTurnSpeed: 14.0,
  playerRadius: 0.75,
  playerMaxHp: 100,
  playerMaxMp: 100,
  mpRegenRate: 6.0,
  attackCooldown: 0.30,
  attackRange: 2.8,
  attackAngle: Math.PI * 0.65,
  cameraOffset: new THREE.Vector3(0, 5.2, -6.5),
  cameraLookOffset: new THREE.Vector3(0, 1.2, 2.0),
  cameraLerp: 0.1,
  petOffsets: [
    new THREE.Vector3(-1.4, 1.8, -1.2),
    new THREE.Vector3(1.4, 1.8, -1.2),
    new THREE.Vector3(0.0, 2.4, -1.8),
  ],
  petFollowSpeed: 6.0,
  petAttackRange: 12.0,
  spawnInterval: 2.3,
  maxRegularEnemies: 12,

  // ダッシュ設定
  dashSpeed: 24.0,          // ダッシュ時の速度 (通常の約3倍)
  dashDuration: 0.22,       // ダッシュ持続時間 (秒)
  dashCooldown: 3.0,        // ダッシュクールダウン (秒)

  // 回復アイテム設定
  itemSpawnInterval: 8.0,   // アイテムスポーン間隔 (秒)
  maxItems: 5,              // フィールド上の最大アイテム数
  itemPickupRadius: 1.8,    // アイテム取得判定半径
};

const GAME_MODE = {
  TITLE: 'title',
  PLAYING: 'playing',
  PAUSED: 'paused',
  VICTORY: 'victory',
  GAMEOVER: 'gameover',
};

const STAGES_DATA = [
  {
    id: 1,
    name: '崩落の古代遺跡',
    subName: 'Ancient Ruins',
    killTarget: 10,
    bossType: 'king_goblin',
    floorColor: 0x1c1f26,
    fogColor: 0x090b10,
    ambientColor: 0x1e293b,
    torchColor: 0xf97316,
    sporeColor1: [0.96, 0.65, 0.2],
    sporeColor2: [0.3, 0.8, 0.5],
  },
  {
    id: 2,
    name: '灼熱の溶岩回廊',
    subName: 'Lava Corridor',
    killTarget: 12,
    bossType: 'demon',
    floorColor: 0x2b0e0e,
    fogColor: 0x1c0606,
    ambientColor: 0x450a0a,
    torchColor: 0xef4444,
    sporeColor1: [1.0, 0.2, 0.1],
    sporeColor2: [1.0, 0.6, 0.1],
  },
  {
    id: 3,
    name: '深淵の魔導聖堂',
    subName: 'Abyss Sanctuary',
    killTarget: 15,
    bossType: 'demon_lord',
    floorColor: 0x170b24,
    fogColor: 0x0f051a,
    ambientColor: 0x2e1065,
    torchColor: 0xa855f7,
    sporeColor1: [0.75, 0.35, 1.0],
    sporeColor2: [0.2, 0.8, 1.0],
  },
];

const state = {
  mode: GAME_MODE.TITLE,
  kills: 0,
  stageKills: 0,
  currentStageIdx: 0,
  coins: 0,
  playerHp: 100,
  playerMp: 100,
  isAttacking: false,
  attackTimer: 0,
  canAttack: true,
  hitStopTimer: 0,
  slowMoTimer: 0,
  moveVector: new THREE.Vector2(0, 0),
  keys: { forward: false, backward: false, left: false, right: false, dash: false, guard: false },
  controlSensitivity: 1.0,

  // ダッシュ状態
  isDashing: false,
  dashTimer: 0,
  dashCooldownTimer: 0,
  dashDirection: new THREE.Vector3(),

  // ガード (盾構え) 状態
  isGuarding: false,

  // オンラインマルチプレイ状態
  isMultiplayer: false,
  isHost: false,
  peerId: null,
  p2Hp: 100,
  p2MaxHp: 100,
};

// 5大属性魔法定義 (Lv1〜Lv3)
const MAGIC_DATA = {
  explosion: {
    id: 'explosion', name: '爆発魔法 (Explosion)', element: 'explosion', icon: '💥', cost: 30, color: 0xf97316,
    tiers: [
      { level: 1, name: 'エクスプロージョン', desc: '指定地点に強力な大爆発を起こし吹き飛ばす。', damage: 45, radius: 4.2, cost: 30, price: 0 },
      { level: 2, name: 'メガエクスプロージョン', desc: '広域に連続3段誘爆を発生させ大ダメージ。', damage: 80, radius: 6.5, cost: 30, price: 80 },
      { level: 3, name: 'ギガエクスプロージョン', desc: '全画面を揺るがす核爆発級の超巨大爆風。', damage: 140, radius: 11.0, cost: 30, price: 180 },
    ],
  },
  flame: {
    id: 'flame', name: '炎魔法 (Flame)', element: 'flame', icon: '🔥', cost: 20, color: 0xef4444,
    tiers: [
      { level: 1, name: 'ファイアボール', desc: '前方へ貫通する灼熱火球を放つ。', damage: 35, speed: 18.0, cost: 20, price: 0 },
      { level: 2, name: 'ファイアピラー', desc: '周囲に3本の巨大火柱を召喚し敵を焼き払う。', damage: 65, radius: 5.5, cost: 20, price: 80 },
      { level: 3, name: 'インフェルノ・フレア', desc: '巨大な業火の渦が敵を引きずり込み炎上。', damage: 110, radius: 9.0, cost: 20, price: 180 },
    ],
  },
  ice: {
    id: 'ice', name: '氷魔法 (Ice)', element: 'ice', icon: '❄️', cost: 25, color: 0x38bdf8,
    tiers: [
      { level: 1, name: 'アイススパイク', desc: '扇状に3本の氷槍を射出。敵を減速させる。', damage: 28, cost: 25, price: 0 },
      { level: 2, name: 'フロストノヴァ', desc: '全方位360度を瞬時に凍結し、敵の動きを完全停止。', damage: 50, radius: 6.0, cost: 25, price: 80 },
      { level: 3, name: 'アブソリュート・ゼロ', desc: '天空から超巨大氷山が落下し完全凍結粉砕。', damage: 95, radius: 9.5, cost: 25, price: 180 },
    ],
  },
  wind: {
    id: 'wind', name: '風魔法 (Wind)', element: 'wind', icon: '🌪️', cost: 20, color: 0x10b981,
    tiers: [
      { level: 1, name: 'ウインドカッター', desc: '鋭い真空刃を高速3連射する。', damage: 30, cost: 20, price: 0 },
      { level: 2, name: 'ゲイルスラッシュ', desc: '巨大な竜巻を放ち、周囲の敵を巻き込んで集敵。', damage: 55, radius: 6.0, cost: 20, price: 80 },
      { level: 3, name: 'タイフーン・テンペスト', desc: '全方位に大嵐を巻き起こし、敵全員を宙へ吹き飛ばす。', damage: 90, radius: 10.0, cost: 20, price: 180 },
    ],
  },
  thunder: {
    id: 'thunder', name: '雷魔法 (Thunder)', element: 'thunder', icon: '⚡', cost: 25, color: 0xeab308,
    tiers: [
      { level: 1, name: 'サンダーボルト', desc: '前方直線状に電撃ビームを突き抜く。', damage: 38, cost: 25, price: 0 },
      { level: 2, name: 'チェインライトニング', desc: '敵から敵へ最大5回跳躍する連鎖雷撃。', damage: 60, cost: 25, price: 80 },
      { level: 3, name: '神鳴・トールハンマー', desc: '天空から無数の神雷が降り注ぐ全天電撃天罰。', damage: 120, radius: 10.5, cost: 25, price: 180 },
    ],
  },
};

// ショップ商品データ (衣装, 頭部, 刀スキン, ペット)
const ITEMS_DATA = {
  outfits: {
    default: {
      id: 'default',
      name: 'ロイヤルブルー騎士',
      price: 0,
      desc: '王国騎士団の正装クロークと重装甲プレートアーマー。',
      icon: '🛡️',
      cloakColor: 0x1d4ed8,
      armorColor: 0x475569,
      visorColor: 0x38bdf8,
    },
    crimson: {
      id: 'crimson',
      name: 'クリムゾンバーサーカー',
      price: 50,
      desc: '紅蓮の闘志を宿した真紅の鎧。攻撃的な装飾が施されている。',
      icon: '🔴',
      cloakColor: 0xdc2626,
      armorColor: 0x7f1d1d,
      visorColor: 0xfca5a5,
    },
    shadow: {
      id: 'shadow',
      name: 'シャドウアサシン',
      price: 100,
      desc: '暗闇に溶け込む漆黒のステルスアーマー。',
      icon: '🥷',
      cloakColor: 0x1e293b,
      armorColor: 0x0f172a,
      visorColor: 0xa855f7,
    },
    gold: {
      id: 'gold',
      name: '黄金聖騎士 (ゴールド)',
      price: 200,
      desc: '純金の輝きを放つ最高峰の栄誉プレートアーマー。',
      icon: '👑',
      cloakColor: 0xd97706,
      armorColor: 0xf59e0b,
      visorColor: 0xfef08a,
    },
    neon_green: {
      id: 'neon_green',
      name: 'エメラルドガーディアン',
      price: 120,
      desc: '生命力を高める神秘的なエメラルドグリーンアーマー。',
      icon: '🟢',
      cloakColor: 0x059669,
      armorColor: 0x064e3b,
      visorColor: 0x6ee7b7,
    },
  },
  heads: {
    none: {
      id: 'none',
      name: '標準バイザーヘルメット',
      price: 0,
      desc: '王道スタイルの標準バイザー付き兜。',
      icon: '👤',
    },
    sunglasses: {
      id: 'sunglasses',
      name: 'クールサングラス',
      price: 40,
      desc: '暗視アシストを内蔵したスタイリッシュなサングラス。',
      icon: '🕶️',
    },
    ninja_band: {
      id: 'ninja_band',
      name: '忍のハチマキ',
      price: 80,
      desc: '風になびく真紅のハチマキ。集中力と敏捷性を高める。',
      icon: '🧣',
    },
    samurai_helm: {
      id: 'samurai_helm',
      name: 'サムライ前立て兜',
      price: 150,
      desc: '黄金の三日月前立てが堂々と輝く伝統の武者兜。',
      icon: '⛩️',
    },
    cyber_horns: {
      id: 'cyber_horns',
      name: 'サイバーホーン (魔角)',
      price: 180,
      desc: '発光するネオンエネルギーを放つサイバー角アンテナ。',
      icon: '😈',
    },
  },
  swords: {
    default: {
      id: 'default',
      name: 'サイバーブレード',
      price: 0,
      desc: '青く発光する標準的な高周波エナジー刀。',
      icon: '🗡️',
      bladeColor: 0xdbeafe,
      emissive: 0x2563eb,
      slashColor: 0x93c5fd,
      tag: 'NORMAL',
    },
    flame: {
      id: 'flame',
      name: '焔刀・紅蓮 (炎)',
      price: 80,
      desc: '灼熱の炎を常にまとい、火の粉が舞い散る業火の太刀。',
      icon: '🔥',
      bladeColor: 0xfecaca,
      emissive: 0xef4444,
      slashColor: 0xf87171,
      tag: '炎属性',
    },
    thunder: {
      id: 'thunder',
      name: '雷刃・鳴神 (雷)',
      price: 120,
      desc: '激しい青白のスパークと雷光を放つ迅雷の太刀。',
      icon: '⚡',
      bladeColor: 0xfef08a,
      emissive: 0xeab308,
      slashColor: 0xfacc15,
      tag: '雷属性',
    },
    void: {
      id: 'void',
      name: '虚空・冥府 (闇)',
      price: 180,
      desc: '冥府の妖気とダークマターをまとう紫紺の妖刀。',
      icon: '🔮',
      bladeColor: 0xe9d5ff,
      emissive: 0xa855f7,
      slashColor: 0xc084fc,
      tag: '闇属性',
    },
    sunlight: {
      id: 'sunlight',
      name: '聖剣ソラリス (光)',
      price: 250,
      desc: '神聖な黄金の光粒子を放つ伝説の聖剣。',
      icon: '✨',
      bladeColor: 0xfef9c3,
      emissive: 0xf59e0b,
      slashColor: 0xfde047,
      tag: '光属性',
    },
  },
  pets: {
    fairy: {
      id: 'fairy',
      name: 'フェアリー (妖精)',
      price: 0,
      desc: 'ピンクの魔導弾で定期的にバランスよく援護射撃。',
      icon: '🧚',
      attackInterval: 2.5,
      bulletColor: 0xf472b6,
      tag: 'バランス型',
    },
    gorilla: {
      id: 'gorilla',
      name: 'マッスルゴリラ',
      price: 80,
      desc: '重力岩石弾を投げつけ、敵を粉砕する剛力バディ。',
      icon: '🦍',
      attackInterval: 3.0,
      bulletColor: 0x78716c,
      tag: '高威力岩石',
    },
    lion: {
      id: 'lion',
      name: 'ブレイズライオン',
      price: 120,
      desc: '百獣の王の咆哮とともに灼熱の火球を放ち敵を焼き尽くす。',
      icon: '🦁',
      attackInterval: 2.4,
      bulletColor: 0xef4444,
      tag: '灼熱の火球',
    },
    pig: {
      id: 'pig',
      name: 'ピギーラッキー',
      price: 60,
      desc: '愛らしいピンクの幸運ブタ。バウンドするマッドボムを投擲。',
      icon: '🐷',
      attackInterval: 2.8,
      bulletColor: 0xfb7185,
      tag: 'マッドボム',
    },
    dog: {
      id: 'dog',
      name: 'シバイヌ・ボルト',
      price: 70,
      desc: '忠実な相棒犬。回転するボーンブーメランを素早く射出。',
      icon: '🐶',
      attackInterval: 2.0,
      bulletColor: 0xfef08a,
      tag: '快速迎撃',
    },
    cheetah: {
      id: 'cheetah',
      name: 'ソニックチーター',
      price: 150,
      desc: '最速のプレデター。電光レーザー弾を猛烈な速度で連射。',
      icon: '🐆',
      attackInterval: 1.6,
      bulletColor: 0x38bdf8,
      tag: '超速レーザー',
    },
    unicorn: {
      id: 'unicorn',
      name: 'スターユニコーン',
      price: 200,
      desc: '星屑の角から聖なる流星弾を放つ伝説の幻獣。',
      icon: '🦄',
      attackInterval: 1.8,
      bulletColor: 0xc084fc,
      tag: '星屑の聖弾',
    },
  },
};


// =============================================================================
// 2. Web Audio API (BGM, SE, 音量スライダー連動, 勝利ファンファーレ)
// =============================================================================
class SoundManager {
  constructor() {
    this.ctx = null;
    this.bgmVolume = 0.5;
    this.sfxVolume = 0.8;
    this.isPlayingBGM = false;
    this.bgmGain = null;
    this.sfxGain = null;
    this.masterGain = null;
    this.tempo = 126;
    this.step = 0;
    this.nextNoteTime = 0;
    this.timerId = null;
  }

  init() {
    if (this.ctx) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    this.ctx = new AudioCtx();

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(1.0, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);

    this.bgmGain = this.ctx.createGain();
    this.bgmGain.gain.setValueAtTime(this.bgmVolume * 0.4, this.ctx.currentTime);
    this.bgmGain.connect(this.masterGain);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.setValueAtTime(this.sfxVolume * 0.85, this.ctx.currentTime);
    this.sfxGain.connect(this.masterGain);
  }

  unlock() {
    if (!this.ctx) this.init();
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    if (!this.isPlayingBGM) this.startBGM();
  }

  setBgmVolume(val) {
    this.bgmVolume = val;
    if (this.bgmGain && this.ctx) {
      this.bgmGain.gain.setValueAtTime(this.bgmVolume * 0.4, this.ctx.currentTime);
    }
  }

  setSfxVolume(val) {
    this.sfxVolume = val;
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setValueAtTime(this.sfxVolume * 0.85, this.ctx.currentTime);
    }
  }

  startBGM() {
    if (this.isPlayingBGM || !this.ctx) return;
    this.isPlayingBGM = true;
    this.nextNoteTime = this.ctx.currentTime + 0.05;
    this.step = 0;
    this.scheduler();
  }

  scheduler() {
    if (!this.isPlayingBGM) return;
    while (this.nextNoteTime < this.ctx.currentTime + 0.15) {
      this.playStep(this.step, this.nextNoteTime);
      const secondsPer16th = 60.0 / this.tempo / 4.0;
      this.nextNoteTime += secondsPer16th;
      this.step = (this.step + 1) % 64;
    }
    this.timerId = setTimeout(() => this.scheduler(), 35);
  }

  playStep(step, time) {
    if (!this.ctx || state.mode === GAME_MODE.GAMEOVER) return;

    const beatInBar = step % 16;
    const bar = Math.floor(step / 16);

    if (beatInBar === 0 || beatInBar === 8 || (bar % 2 === 1 && beatInBar === 10)) {
      this.synthDungeonDrum(time, beatInBar === 0 ? 90 : 70);
    }
    if (beatInBar === 4 || beatInBar === 12) this.synthSnare(time);
    if (beatInBar % 2 === 0) this.synthHihat(time, beatInBar % 4 === 2 ? 0.28 : 0.15);

    const baseNotes = [
      73.42, 73.42, 110.0, 73.42, 73.42, 73.42, 87.31, 73.42,
      73.42, 73.42, 110.0, 73.42, 65.41, 73.42, 87.31, 98.0,
      65.41, 65.41, 98.0, 65.41, 65.41, 65.41, 87.31, 65.41,
      87.31, 87.31, 130.81, 87.31, 98.0, 110.0, 130.81, 146.83,
    ];
    const bassFreq = baseNotes[step % 32];
    if (bassFreq) this.synthBass(bassFreq, time, 0.14);

    const melodyScale = [293.66, 329.63, 349.23, 440.0, 493.88, 523.25, 587.33, 698.46];
    const arpeggio = [0, 2, 3, 5, 4, 3, 2, 3, 0, 3, 5, 7, 6, 5, 3, 2];
    const noteIdx = arpeggio[beatInBar];
    const melodyFreq = melodyScale[noteIdx % melodyScale.length];

    if (step % 2 === 0 && melodyFreq) this.synthDungeonMelody(melodyFreq, time, 0.1);
  }

  synthDungeonDrum(time, startFreq = 85) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(startFreq, time);
    osc.frequency.exponentialRampToValueAtTime(28, time + 0.16);
    gain.gain.setValueAtTime(0.85, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.16);
    osc.connect(gain);
    gain.connect(this.bgmGain);
    osc.start(time);
    osc.stop(time + 0.17);
  }

  synthSnare(time) {
    const bufferSize = this.ctx.sampleRate * 0.1;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(900, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.4, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.bgmGain);
    noise.start(time);
    noise.stop(time + 0.1);
  }

  synthHihat(time, vol = 0.2) {
    const bufferSize = this.ctx.sampleRate * 0.04;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(7000, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.005, time + 0.035);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.bgmGain);
    noise.start(time);
    noise.stop(time + 0.04);
  }

  synthBass(freq, time, dur = 0.14) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(650, time);
    filter.frequency.exponentialRampToValueAtTime(150, time + dur);

    gain.gain.setValueAtTime(0.4, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + dur);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.bgmGain);
    osc.start(time);
    osc.stop(time + dur);
  }

  synthDungeonMelody(freq, time, dur = 0.1) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, time);

    gain.gain.setValueAtTime(0.14, time);
    gain.gain.exponentialRampToValueAtTime(0.005, time + dur);

    osc.connect(gain);
    gain.connect(this.bgmGain);
    osc.start(time);
    osc.stop(time + dur);
  }

  playAttackSlash(comboStep = 0) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    const startFreq = comboStep === 2 ? 850 : (comboStep === 1 ? 720 : 600);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(startFreq, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(90, this.ctx.currentTime + 0.14);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1600, this.ctx.currentTime);

    gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.14);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.15);
  }

  // 敵の命中時の「ザシュ！」インパクト音 (3層構造 - 風切り+切断+辺高討隙)
  playZubattoSlash(comboStep = 0) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const isFinisher = (comboStep === 2);
    const dur = isFinisher ? 0.32 : 0.22;

    // === 層 1: 高周波ノイズ (騒烈な風切り音) ===
    const bufferSz = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, bufferSz, this.ctx.sampleRate);
    const bData = buf.getChannelData(0);
    for (let i = 0; i < bufferSz; i++) bData[i] = Math.random() * 2 - 1;
    const noiseNode = this.ctx.createBufferSource();
    noiseNode.buffer = buf;

    const hiFilter = this.ctx.createBiquadFilter();
    hiFilter.type = 'bandpass';
    hiFilter.frequency.setValueAtTime(isFinisher ? 5500 : 4200, now);
    hiFilter.frequency.exponentialRampToValueAtTime(isFinisher ? 300 : 500, now + dur * 0.8);
    hiFilter.Q.setValueAtTime(isFinisher ? 1.8 : 1.2, now);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(isFinisher ? 1.6 : 1.2, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + dur);

    noiseNode.connect(hiFilter);
    hiFilter.connect(noiseGain);
    noiseGain.connect(this.sfxGain);
    noiseNode.start(now);
    noiseNode.stop(now + dur + 0.01);

    // === 層 2: 中域ノイズ (肉切り感) ===
    const midBuf = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * 0.12), this.ctx.sampleRate);
    const midData = midBuf.getChannelData(0);
    for (let i = 0; i < midData.length; i++) midData[i] = Math.random() * 2 - 1;
    const midNoise = this.ctx.createBufferSource();
    midNoise.buffer = midBuf;

    const midFilter = this.ctx.createBiquadFilter();
    midFilter.type = 'bandpass';
    midFilter.frequency.setValueAtTime(1800, now);
    midFilter.frequency.exponentialRampToValueAtTime(200, now + 0.12);

    const midGain = this.ctx.createGain();
    midGain.gain.setValueAtTime(isFinisher ? 0.9 : 0.6, now);
    midGain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

    midNoise.connect(midFilter);
    midFilter.connect(midGain);
    midGain.connect(this.sfxGain);
    midNoise.start(now);
    midNoise.stop(now + 0.13);

    // === 層 3: 低音トンプ (農身) - フィニッシャーのみ ===
    if (isFinisher) {
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(95, now);
      osc.frequency.exponentialRampToValueAtTime(30, now + 0.25);
      oscGain.gain.setValueAtTime(0.7, now);
      oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
      osc.connect(oscGain);
      oscGain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.26);
    }
  }

  // 剪を振る時の声 (「えい！」「やぁ！」「とお！」) - formantフィルターで人声風
  playVoice(comboStep = 0) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // 各コンボステップの声のパラメータ (formant周波数, ピッチ変化)
    // comboStep 0 = 「えい！」: F1=700Hz, F2=1200Hz, 上昇コンター
    // comboStep 1 = 「やぁ！」: F1=800Hz, F2=1100Hz, 高たかい
    // comboStep 2 = 「とお！」: F1=450Hz, F2=900Hz, 低く連打ち
    const voiceParams = [
      { baseFreq: 240, endFreq: 190, f1: 700, f2: 1200, dur: 0.22, vol: 0.55 },  // 「えい！」
      { baseFreq: 290, endFreq: 180, f1: 820, f2: 1050, dur: 0.20, vol: 0.60 },  // 「やぁ！」
      { baseFreq: 210, endFreq: 140, f1: 480, f2: 850,  dur: 0.28, vol: 0.65 },  // 「とお！」
    ];
    const vp = voiceParams[comboStep];

    // 基本波形 (声帯振動 = saw + トレモロ)
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(vp.baseFreq, now);
    osc.frequency.linearRampToValueAtTime(vp.baseFreq * 1.18, now + 0.04);   // 失導上昇
    osc.frequency.exponentialRampToValueAtTime(vp.endFreq, now + vp.dur);     // ピッチ襄下

    // 第1フォルマント (F1 - 元音障頼)
    const f1 = this.ctx.createBiquadFilter();
    f1.type = 'bandpass';
    f1.frequency.setValueAtTime(vp.f1, now);
    f1.Q.setValueAtTime(8, now);

    // 第2フォルマント (F2 - 母音識別)
    const f2 = this.ctx.createBiquadFilter();
    f2.type = 'bandpass';
    f2.frequency.setValueAtTime(vp.f2, now);
    f2.Q.setValueAtTime(10, now);

    // ハイパス (気息色)
    const hpf = this.ctx.createBiquadFilter();
    hpf.type = 'highpass';
    hpf.frequency.setValueAtTime(120, now);

    const masterGain = this.ctx.createGain();
    // 短いアタック + 渡り + リリース
    masterGain.gain.setValueAtTime(0.0, now);
    masterGain.gain.linearRampToValueAtTime(vp.vol, now + 0.015);
    masterGain.gain.setValueAtTime(vp.vol, now + vp.dur * 0.5);
    masterGain.gain.exponentialRampToValueAtTime(0.01, now + vp.dur);

    // F1, F2 並列接続
    osc.connect(hpf);
    hpf.connect(f1);
    hpf.connect(f2);
    f1.connect(masterGain);
    f2.connect(masterGain);
    masterGain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + vp.dur + 0.02);

    // 読み上げ的な第2オシレーター (軽い背景声帯)
    const osc2 = this.ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(vp.baseFreq * 0.5, now);
    osc2.frequency.exponentialRampToValueAtTime(vp.endFreq * 0.5, now + vp.dur);
    const g2 = this.ctx.createGain();
    g2.gain.setValueAtTime(vp.vol * 0.25, now);
    g2.gain.exponentialRampToValueAtTime(0.001, now + vp.dur);
    osc2.connect(g2);
    g2.connect(this.sfxGain);
    osc2.start(now);
    osc2.stop(now + vp.dur + 0.02);
  }

  // 敵命中時の辺高討隘音 (ザシュ！に挿さる短いパンチ)
  playHitImpact(isFinisher = false) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // 短い低音トンプ (punch-like body blow)
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(isFinisher ? 75 : 55, now);
    osc.frequency.exponentialRampToValueAtTime(20, now + 0.09);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(isFinisher ? 1.0 : 0.7, now);
    g.gain.exponentialRampToValueAtTime(0.01, now + 0.09);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.10);
  }

  playMagicSound(element, tier = 1) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    if (element === 'explosion') {
      // 💥 爆発: 超低周波サブベース衝撃波 + 破裂ノイズ
      const bufferSize = this.ctx.sampleRate * (0.35 + tier * 0.2);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1200 + tier * 300, now);
      filter.frequency.exponentialRampToValueAtTime(35, now + 0.45 + tier * 0.15);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(1.0 + tier * 0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5 + tier * 0.15);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);
      noise.start(now);
      noise.stop(now + 0.55 + tier * 0.15);

      // サブベースキック
      const sub = this.ctx.createOscillator();
      const subGain = this.ctx.createGain();
      sub.type = 'sine';
      sub.frequency.setValueAtTime(180, now);
      sub.frequency.exponentialRampToValueAtTime(25, now + 0.35);
      subGain.gain.setValueAtTime(0.8, now);
      subGain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
      sub.connect(subGain);
      subGain.connect(this.sfxGain);
      sub.start(now);
      sub.stop(now + 0.36);

    } else if (element === 'flame') {
      // 🔥 火炎: 激しい噴射ホワイトノイズ + 燃焼うなり
      const bufferSize = this.ctx.sampleRate * (0.3 + tier * 0.15);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(800, now);
      filter.frequency.exponentialRampToValueAtTime(250, now + 0.35);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.85 + tier * 0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.38 + tier * 0.1);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);
      noise.start(now);
      noise.stop(now + 0.4 + tier * 0.1);

    } else if (element === 'ice') {
      // ❄️ 氷: 高周波クリスタル粉砕音 (キラキラ音 + 凍結亀裂)
      const freqs = [1800, 2400, 3200, 4200];
      freqs.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.04);
        osc.frequency.exponentialRampToValueAtTime(400, now + idx * 0.04 + 0.2);
        gain.gain.setValueAtTime(0.4, now + idx * 0.04);
        gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.04 + 0.2);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now + idx * 0.04);
        osc.stop(now + idx * 0.04 + 0.22);
      });

    } else if (element === 'wind') {
      // 🌪️ 風: 鋭い風切り真空音 (ピッチ急降下)
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1400 + tier * 300, now);
      osc.frequency.exponentialRampToValueAtTime(120, now + 0.25);
      gain.gain.setValueAtTime(0.7 + tier * 0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.26);

    } else if (element === 'thunder') {
      // ⚡ 雷: 鋭いスパーク放電 + 轟く雷鳴
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(2600, now);
      osc.frequency.exponentialRampToValueAtTime(90, now + 0.35 + tier * 0.15);
      gain.gain.setValueAtTime(0.9 + tier * 0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.38 + tier * 0.15);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.4 + tier * 0.15);
    }
  }


  playWeakHit() {
    if (!this.ctx) return;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'triangle';
    osc2.type = 'sine';
    osc1.frequency.setValueAtTime(880, this.ctx.currentTime);
    osc2.frequency.setValueAtTime(1760, this.ctx.currentTime + 0.05);

    gain.gain.setValueAtTime(0.7, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.sfxGain);
    osc1.start(this.ctx.currentTime);
    osc1.stop(this.ctx.currentTime + 0.06);
    osc2.start(this.ctx.currentTime + 0.05);
    osc2.stop(this.ctx.currentTime + 0.22);
  }

  playPlayerHurt() {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, this.ctx.currentTime + 0.18);

    gain.gain.setValueAtTime(0.8, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.18);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.19);
  }

  // 盾ガード成功時の鋭い金属音「ガキィンッ！」(2層合成)
  playShieldBlock() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // 層 1: 金属衝突の鋭いアタック高周波
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(980, now);
    osc.frequency.exponentialRampToValueAtTime(320, now + 0.14);

    gain.gain.setValueAtTime(0.9, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.16);

    // 層 2: 金属の共鳴ベル音 (高音リング)
    const bellOsc = this.ctx.createOscillator();
    const bellGain = this.ctx.createGain();
    bellOsc.type = 'sine';
    bellOsc.frequency.setValueAtTime(1760, now);
    bellOsc.frequency.exponentialRampToValueAtTime(1400, now + 0.28);

    bellGain.gain.setValueAtTime(0.4, now);
    bellGain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

    bellOsc.connect(bellGain);
    bellGain.connect(this.sfxGain);
    bellOsc.start(now);
    bellOsc.stop(now + 0.29);
  }

  // ボス死亡時の「ぐわー！！」雄たけび (低音フォルマント合成)
  playBossRoar() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // 層 1: メイン声帯 (クリーチャーの喇び = 低音サウ耄波)
    const osc1 = this.ctx.createOscillator();
    osc1.type = 'sawtooth';
    // 「ぐ」から匆下しながら「わー」へ
    osc1.frequency.setValueAtTime(110, now);
    osc1.frequency.linearRampToValueAtTime(130, now + 0.08);   // 上昇
    osc1.frequency.exponentialRampToValueAtTime(55, now + 0.65); // 沈み込む

    // 第1フォルマント F1 (「あ」母音 = 700Hz)
    const f1a = this.ctx.createBiquadFilter();
    f1a.type = 'bandpass';
    f1a.frequency.setValueAtTime(700, now);
    f1a.frequency.linearRampToValueAtTime(350, now + 0.65); // 「う」向かって下がる
    f1a.Q.setValueAtTime(7, now);

    // 第2フォルマント F2 (母音識別)
    const f2a = this.ctx.createBiquadFilter();
    f2a.type = 'bandpass';
    f2a.frequency.setValueAtTime(1100, now);
    f2a.frequency.linearRampToValueAtTime(600, now + 0.65);
    f2a.Q.setValueAtTime(9, now);

    // メインゲイン (ごく短いアタック + メイン + 起伏あるリリース)
    const g1 = this.ctx.createGain();
    g1.gain.setValueAtTime(0.0, now);
    g1.gain.linearRampToValueAtTime(0.85, now + 0.04);
    g1.gain.setValueAtTime(0.85, now + 0.35);
    g1.gain.exponentialRampToValueAtTime(0.01, now + 0.75);

    osc1.connect(f1a); osc1.connect(f2a);
    f1a.connect(g1);   f2a.connect(g1);
    g1.connect(this.sfxGain);
    osc1.start(now);
    osc1.stop(now + 0.78);

    // 層 2: 低音サブオシレーター (身体を振るわせる深み)
    const osc2 = this.ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(60, now);
    osc2.frequency.exponentialRampToValueAtTime(25, now + 0.7);
    const g2 = this.ctx.createGain();
    g2.gain.setValueAtTime(0.7, now);
    g2.gain.exponentialRampToValueAtTime(0.01, now + 0.7);
    osc2.connect(g2);
    g2.connect(this.sfxGain);
    osc2.start(now);
    osc2.stop(now + 0.72);

    // 層 3: ノイズ承り (欧気感)
    const nBufSz = Math.floor(this.ctx.sampleRate * 0.18);
    const nBuf   = this.ctx.createBuffer(1, nBufSz, this.ctx.sampleRate);
    const nData  = nBuf.getChannelData(0);
    for (let i = 0; i < nBufSz; i++) nData[i] = Math.random() * 2 - 1;
    const noiseNode = this.ctx.createBufferSource();
    noiseNode.buffer = nBuf;
    const nFilter = this.ctx.createBiquadFilter();
    nFilter.type = 'bandpass';
    nFilter.frequency.setValueAtTime(400, now);
    nFilter.Q.setValueAtTime(1.5, now);
    const gn = this.ctx.createGain();
    gn.gain.setValueAtTime(0.35, now);
    gn.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
    noiseNode.connect(nFilter);
    nFilter.connect(gn);
    gn.connect(this.sfxGain);
    noiseNode.start(now);
    noiseNode.stop(now + 0.19);
  }

  playVictoryFanfare() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51];
    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.1);
      gain.gain.setValueAtTime(0.4, now + i * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.35);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now + i * 0.1);
      osc.stop(now + i * 0.1 + 0.38);
    });
  }

  playCoin() {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1318.51, this.ctx.currentTime);
    osc.frequency.setValueAtTime(1975.53, this.ctx.currentTime + 0.07);
    gain.gain.setValueAtTime(0.35, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.25);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.25);
  }

  playBuy() {
    if (!this.ctx) return;
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime + idx * 0.06);
      gain.gain.setValueAtTime(0.3, this.ctx.currentTime + idx * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + idx * 0.06 + 0.12);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(this.ctx.currentTime + idx * 0.06);
      osc.stop(this.ctx.currentTime + idx * 0.06 + 0.14);
    });
  }

  playEquip() {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(440, this.ctx.currentTime);
    osc.frequency.setValueAtTime(880, this.ctx.currentTime + 0.05);
    gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.12);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.13);
  }

  // ダッシュ効果音 (空気を切り裂くような音)
  playDash() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // ノイズベースの風切り音
    const bufferSize = this.ctx.sampleRate * 0.12;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2400, now);
    filter.frequency.exponentialRampToValueAtTime(800, now + 0.1);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.7, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    noise.start(now);
    noise.stop(now + 0.13);

    // 低音のドンという衝撃音
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.08);
    oscGain.gain.setValueAtTime(0.5, now);
    oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
    osc.connect(oscGain);
    oscGain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.09);
  }

  // アイテム取得効果音 (キラキラ系)
  playItemPickup(type = 'hp') {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    // HP回復: 明るい上昇音、MP回復: 水晶系の音
    const notes = type === 'hp'
      ? [523.25, 659.25, 783.99, 1046.50]
      : [659.25, 880.0, 1108.73, 1318.51];
    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type === 'hp' ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.055);
      gain.gain.setValueAtTime(0.35, now + i * 0.055);
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.055 + 0.18);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now + i * 0.055);
      osc.stop(now + i * 0.055 + 0.20);
    });
  }
}

const soundManager = new SoundManager();

// =============================================================================
// 3. 紙吹雪 (Confetti) アニメーションシステム
// =============================================================================
class ConfettiManager {
  constructor() {
    this.canvas = document.getElementById('confetti-canvas');
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    this.confettis = [];
    this.isActive = false;

    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    if (!this.canvas) return;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  burst() {
    this.isActive = true;
    const colors = ['#f59e0b', '#38bdf8', '#ef4444', '#10b981', '#a855f7', '#fde047', '#ec4899'];
    for (let i = 0; i < 120; i++) {
      this.confettis.push({
        x: window.innerWidth / 2 + (Math.random() - 0.5) * 100,
        y: window.innerHeight / 2 + (Math.random() - 0.5) * 50,
        w: Math.random() * 10 + 6,
        h: Math.random() * 6 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        vx: (Math.random() - 0.5) * 18,
        vy: (Math.random() - 0.9) * 22,
        rot: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.2,
        life: 1.0,
      });
    }
  }

  update(delta) {
    if (!this.isActive || !this.ctx) return;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (let i = this.confettis.length - 1; i >= 0; i--) {
      const c = this.confettis[i];
      c.x += c.vx;
      c.y += c.vy;
      c.vy += 22 * delta; // 重力
      c.rot += c.vRot;
      c.life -= delta * 0.35;

      if (c.life <= 0 || c.y > this.canvas.height + 20) {
        this.confettis.splice(i, 1);
        continue;
      }

      this.ctx.save();
      this.ctx.translate(c.x, c.y);
      this.ctx.rotate(c.rot);
      this.ctx.fillStyle = c.color;
      this.ctx.globalAlpha = Math.max(0, c.life);
      this.ctx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h);
      this.ctx.restore();
    }

    if (this.confettis.length === 0) {
      this.isActive = false;
    }
  }
}

const confettiManager = new ConfettiManager();

// =============================================================================
// 4. セーブデータ管理
// =============================================================================
class SaveManager {
  static STORAGE_KEY = 'blade_and_buddy_save_v3';

  static getDefaultData() {
    return {
      coins: 0,
      equipped: { outfit: 'default', head: 'none', sword: 'default', pets: ['fairy'] },
      unlocked: { outfits: ['default'], heads: ['none'], swords: ['default'], pets: ['fairy'] },
      magicLevels: { explosion: 1, flame: 1, ice: 1, wind: 1, thunder: 1 },
      options: { bgmVol: 50, sfxVol: 80, sensitivity: 100 },
    };
  }

  static load() {
    try {
      const json = localStorage.getItem(this.STORAGE_KEY);
      if (!json) return this.getDefaultData();
      const data = JSON.parse(json);
      return {
        coins: typeof data.coins === 'number' ? data.coins : 0,
        equipped: {
          outfit: data.equipped?.outfit || 'default',
          head: data.equipped?.head || 'none',
          sword: data.equipped?.sword || 'default',
          pets: Array.isArray(data.equipped?.pets) ? data.equipped.pets : ['fairy'],
        },
        unlocked: {
          outfits: Array.isArray(data.unlocked?.outfits) ? data.unlocked.outfits : ['default'],
          heads: Array.isArray(data.unlocked?.heads) ? data.unlocked.heads : ['none'],
          swords: Array.isArray(data.unlocked?.swords) ? data.unlocked.swords : ['default'],
          pets: Array.isArray(data.unlocked?.pets) ? data.unlocked.pets : ['fairy'],
        },
        magicLevels: {
          explosion: data.magicLevels?.explosion || 1,
          flame: data.magicLevels?.flame || 1,
          ice: data.magicLevels?.ice || 1,
          wind: data.magicLevels?.wind || 1,
          thunder: data.magicLevels?.thunder || 1,
        },
        options: {
          bgmVol: data.options?.bgmVol ?? 50,
          sfxVol: data.options?.sfxVol ?? 80,
          sensitivity: data.options?.sensitivity ?? 100,
        },
      };
    } catch (e) {
      return this.getDefaultData();
    }
  }

  static save(data) {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch (e) {}
  }
}

const saveData = SaveManager.load();
state.coins = saveData.coins;

// iPad検知 & パフォーマンス設定
const isIPad = /iPad/.test(navigator.userAgent)
  || (navigator.maxTouchPoints > 1 && /Mac/.test(navigator.userAgent));

const container = document.getElementById('game-container');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);           // 天空青
scene.fog = new THREE.FogExp2(0xaac8e0, 0.006);          // 広大感の薄い霧

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 300);
camera.position.set(0, 6, -8);

const renderer = new THREE.WebGLRenderer({ antialias: !isIPad, powerPreference: 'high-performance' });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, isIPad ? 1.5 : 2));
renderer.shadowMap.enabled = !isIPad;                   // iPadはシャドウ無効化
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
container.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0x8fadc4, 1.4); // 混江光 (明るめ)
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xfff5e0, 2.0); // 太陽光
if (!isIPad) {
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.width  = 1024;
  sunLight.shadow.mapSize.height = 1024;
  sunLight.shadow.camera.near = 1;
  sunLight.shadow.camera.far  = 200;
  sunLight.shadow.camera.left = -80;
  sunLight.shadow.camera.right = 80;
  sunLight.shadow.camera.top = 80;
  sunLight.shadow.camera.bottom = -80;
}
sunLight.position.set(60, 80, 40);
scene.add(sunLight);

const fillLight = new THREE.DirectionalLight(0x6699cc, 0.5); // 設定フィルライト
fillLight.position.set(-30, 20, -30);
scene.add(fillLight);

// =============================================================================
// 5. Three.js 基本セットアップ & オープンワールド環境
// =============================================================================

// 地形の高さを返す関数 (決定論的sin/cos重ね合わせ)
// プレイヤー・敵・アイテムの地形追従に使用
function getTerrainHeight(x, z) {
  // 複数のsin/cosを重ね合わせて自然な起伏を表現
  let h = 0;
  h += Math.sin(x * 0.018) * Math.cos(z * 0.022) * 3.5;   // メインホイル
  h += Math.sin(x * 0.045 + 1.2) * Math.sin(z * 0.038) * 1.8; // 中周波
  h += Math.cos(x * 0.09 + z * 0.07) * 0.9;                // 小起伏
  h += Math.sin(x * 0.13 + 2.5) * Math.cos(z * 0.11 + 1.0) * 0.4; // 細かい凸凹
  // プレイヤースポーン地点周辺は平地に滑らかに (r<18は平崺)
  const r = Math.sqrt(x * x + z * z);
  const flatten = Math.max(0, 1.0 - Math.max(0, 18 - r) / 18);
  return h * flatten;
}

// 地形メッシュ、環境オブジェクトを保持
let worldTerrainMesh = null;
const worldStaticObjects = [];

function createOpenWorld() {
  // ===================================================
  // 地形メッシュ (500x500, 頂点カラーでゾーン勘分け)
  // ===================================================
  const FIELD = 500;
  const SEG   = 50;  // セグメント数減 (負荷軽減: 90→ 50で約51*51=2601頂点)

  const geo = new THREE.PlaneGeometry(FIELD, FIELD, SEG, SEG);
  geo.rotateX(-Math.PI / 2);

  // 頂点ごとに高さとカラーを設定
  const positions = geo.attributes.position;
  const colors    = new Float32Array(positions.count * 3);

  for (let i = 0; i < positions.count; i++) {
    const vx = positions.getX(i);
    const vz = positions.getZ(i);
    const vy = getTerrainHeight(vx, vz);
    positions.setY(i, vy);

    // ゾーン判定カラー
    const r = Math.sqrt(vx * vx + vz * vz);
    let rc, gc, bc;
    if (r < 80) {
      // 中央: 草地 (rに応じたノイズも加える)
      const n = 0.06 + Math.random() * 0.05;
      rc = 0.20 + n; gc = 0.42 + n; bc = 0.18 + n;
    } else if (r < 200) {
      // 中間: 荒野
      const n = 0.04 + Math.random() * 0.04;
      rc = 0.46 + n; gc = 0.38 + n; bc = 0.22 + n;
    } else {
      // 外周: 廃墙岸場
      const n = 0.03 + Math.random() * 0.03;
      rc = 0.28 + n; gc = 0.26 + n; bc = 0.24 + n;
    }
    colors[i * 3]     = Math.min(rc, 1);
    colors[i * 3 + 1] = Math.min(gc, 1);
    colors[i * 3 + 2] = Math.min(bc, 1);
  }

  positions.needsUpdate = true;
  geo.computeVertexNormals();
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.92,
    metalness: 0.0,
  });

  worldTerrainMesh = new THREE.Mesh(geo, mat);
  worldTerrainMesh.receiveShadow = !isIPad;
  scene.add(worldTerrainMesh);

  // ===================================================
  // 山峰スカイドーム (広大感演出用の大きな半球)
  // ===================================================
  const skyGeo = new THREE.SphereGeometry(280, 16, 8);
  const skyMat = new THREE.MeshBasicMaterial({
    color: 0x87ceeb, side: THREE.BackSide, fog: false,
  });
  scene.add(new THREE.Mesh(skyGeo, skyMat));

  // ===================================================
  // 山遠景 (シルエット山脈)
  // ===================================================
  const mountainMat = new THREE.MeshStandardMaterial({ color: 0x4a5568, roughness: 1.0, fog: true });
  for (let i = 0; i < 14; i++) {
    const angle = (i / 14) * Math.PI * 2;
    const dist  = 220 + Math.random() * 30;
    const h     = 30 + Math.random() * 50;
    const w     = 28 + Math.random() * 20;
    const mGeo  = new THREE.ConeGeometry(w, h, 7);
    const mMesh = new THREE.Mesh(mGeo, mountainMat);
    mMesh.position.set(Math.cos(angle) * dist, h / 2 - 2, Math.sin(angle) * dist);
    scene.add(mMesh);
  }

  // ===================================================
  // 環境オブジェクト配置 (InstancedMeshで軽量)
  // ===================================================
  placeWorldObjects();
}

function placeWorldObjects() {
  const rng = (min, max) => min + Math.random() * (max - min);

  // ---- 岩 (大・中・小) ----
  const rockSizes = [
    { r: 1.8, h: 2.2, count: 70 },
    { r: 0.9, h: 1.1, count: 80 },
    { r: 0.45, h: 0.55, count: 80 },
  ];
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x6b7280, roughness: 0.95 });

  rockSizes.forEach(({ r, h, count }) => {
    const geo = new THREE.DodecahedronGeometry(r, 0);
    const mesh = new THREE.InstancedMesh(geo, rockMat, count);
    mesh.castShadow = !isIPad;
    mesh.receiveShadow = !isIPad;
    const dummy = new THREE.Object3D();

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist  = 18 + Math.random() * 220;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;
      const y = getTerrainHeight(x, z);
      dummy.position.set(x, y + r * 0.4, z);
      dummy.rotation.set(rng(-0.3, 0.3), rng(0, Math.PI * 2), rng(-0.2, 0.2));
      dummy.scale.setScalar(rng(0.7, 1.4));
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      worldStaticObjects.push({ x, z, radius: r });
    }
    mesh.instanceMatrix.needsUpdate = true;
    scene.add(mesh);
  });

  // ---- 枯れ木 ----
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a3728, roughness: 0.98 });
  const branchMat = new THREE.MeshStandardMaterial({ color: 0x3a2d20, roughness: 1.0 });
  const treeCount = 80;
  const trunkGeo  = new THREE.CylinderGeometry(0.18, 0.28, 3.5, 7);
  const branchGeo = new THREE.ConeGeometry(0.1, 1.8, 5);
  const trunkMesh = new THREE.InstancedMesh(trunkGeo, trunkMat, treeCount);
  const branchMesh = new THREE.InstancedMesh(branchGeo, branchMat, treeCount * 3);
  trunkMesh.castShadow = branchMesh.castShadow = !isIPad;
  const td = new THREE.Object3D();
  const bd = new THREE.Object3D();

  for (let i = 0; i < treeCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist  = 22 + Math.random() * 200;
    const x = Math.cos(angle) * dist;
    const z = Math.sin(angle) * dist;
    const y = getTerrainHeight(x, z);

    td.position.set(x, y + 1.75, z);
    td.rotation.y = rng(0, Math.PI * 2);
    td.scale.setScalar(rng(0.8, 1.5));
    td.updateMatrix();
    trunkMesh.setMatrixAt(i, td.matrix);

    for (let b = 0; b < 3; b++) {
      bd.position.set(
        x + rng(-0.5, 0.5),
        y + 2.5 + b * 0.9 + rng(-0.2, 0.2),
        z + rng(-0.5, 0.5)
      );
      bd.rotation.set(rng(-0.2, 0.2), rng(0, Math.PI * 2), rng(-0.2, 0.2));
      bd.scale.setScalar(rng(0.7, 1.3));
      bd.updateMatrix();
      branchMesh.setMatrixAt(i * 3 + b, bd.matrix);
    }
    worldStaticObjects.push({ x, z, radius: 0.5 });
  }
  trunkMesh.instanceMatrix.needsUpdate = true;
  branchMesh.instanceMatrix.needsUpdate = true;
  scene.add(trunkMesh);
  scene.add(branchMesh);

  // ---- 崩れた石柱 ----
  const pillarMat = new THREE.MeshStandardMaterial({ color: 0x5a5048, roughness: 0.9 });
  const pillarGeo = new THREE.BoxGeometry(1.0, 1.0, 1.0); // scaleで形成
  const pillarMesh = new THREE.InstancedMesh(pillarGeo, pillarMat, 40);
  pillarMesh.castShadow = !isIPad;
  const pd = new THREE.Object3D();

  for (let i = 0; i < 40; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist  = 30 + Math.random() * 180;
    const x = Math.cos(angle) * dist;
    const z = Math.sin(angle) * dist;
    const y = getTerrainHeight(x, z);
    const h = rng(1.5, 5.0);
    pd.position.set(x, y + h / 2, z);
    pd.rotation.set(rng(-0.15, 0.15), rng(0, Math.PI * 2), rng(-0.1, 0.1));
    pd.scale.set(rng(0.6, 1.2), h, rng(0.6, 1.2));
    pd.updateMatrix();
    pillarMesh.setMatrixAt(i, pd.matrix);
    worldStaticObjects.push({ x, z, radius: 0.9 });
  }
  pillarMesh.instanceMatrix.needsUpdate = true;
  scene.add(pillarMesh);

  // ---- 廃墙断片 ----
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x6b5d4f, roughness: 0.95 });
  const wallGeo = new THREE.BoxGeometry(1, 1, 0.4);
  const wallMesh = new THREE.InstancedMesh(wallGeo, wallMat, 30);
  wallMesh.castShadow = !isIPad;
  const wd = new THREE.Object3D();

  for (let i = 0; i < 30; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist  = 40 + Math.random() * 160;
    const x = Math.cos(angle) * dist;
    const z = Math.sin(angle) * dist;
    const y = getTerrainHeight(x, z);
    wd.position.set(x, y + rng(1.0, 2.5), z);
    wd.rotation.set(rng(-0.1, 0.1), rng(0, Math.PI * 2), rng(-0.1, 0.1));
    wd.scale.set(rng(3.0, 7.0), rng(2.0, 4.0), 1);
    wd.updateMatrix();
    wallMesh.setMatrixAt(i, wd.matrix);
  }
  wallMesh.instanceMatrix.needsUpdate = true;
  scene.add(wallMesh);

  // ---- 草 (小さなビルボード)を大量に ----
  const grassMat = new THREE.MeshBasicMaterial({ color: 0x5a7a40, side: THREE.DoubleSide });
  const grassGeo = new THREE.PlaneGeometry(0.6, 1.0);
  const grassCount = isIPad ? 80 : 150; // iPadは更に減らす
  const grassMesh = new THREE.InstancedMesh(grassGeo, grassMat, grassCount);
  grassMesh.castShadow = false;
  const gd = new THREE.Object3D();

  for (let i = 0; i < grassCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist  = 5 + Math.random() * 180;
    const x = Math.cos(angle) * dist;
    const z = Math.sin(angle) * dist;
    const y = getTerrainHeight(x, z);
    gd.position.set(x, y + 0.5, z);
    gd.rotation.y = rng(0, Math.PI * 2);
    gd.scale.setScalar(rng(0.8, 1.8));
    gd.updateMatrix();
    grassMesh.setMatrixAt(i, gd.matrix);
  }
  grassMesh.instanceMatrix.needsUpdate = true;
  scene.add(grassMesh);
}

function applyStageEnvironment(stage) {
  // ステージに応じた靍色・空色変化 (オープンワールド対応版)
  const fogColors = [
    0xaac8e0, // Stage 1: 明るい天空
    0xc08060, // Stage 2: 紅茉色の靈
    0x8060c0, // Stage 3: 神秘的な紫
  ];
  const skyColors = [
    0x87ceeb, // Stage 1: 青空
    0xff7744, // Stage 2: 夕燈色
    0x221133, // Stage 3: 深夜
  ];
  const idx = Math.min(stage.id - 1, 2);
  scene.fog.color.setHex(fogColors[idx]);
  scene.background.setHex(skyColors[idx]);
  ambientLight.color.setHex(stage.ambientColor);
}

function updateDungeonEnvironment(delta) {
  // オープンワールド化でトーチほかのアニメは不要になったので空関数に
}

createOpenWorld();

// =============================================================================
// 6. プレイヤーキャラクター生成 (HP/MP, 3段コンボ, 魔法詠唱)
// =============================================================================
class Player {
  constructor() {
    this.group = new THREE.Group();
    scene.add(this.group);

    this.velocity = new THREE.Vector3();
    this.hp = CONFIG.playerMaxHp;
    this.maxHp = CONFIG.playerMaxHp;
    this.mp = CONFIG.playerMaxMp;
    this.maxMp = CONFIG.playerMaxMp;
    this.invincibleTimer = 0;
    this.comboStep = 0;
    this.comboResetTimer = 0;
    this.walkCycle = 0;

    // ダッシュ残像管理リスト
    this.dashTrails = [];
    this.dashTrailTimer = 0;

    this.buildMesh();
  }

  buildMesh() {
    // ====================================
    // マテリアル定義 (プレミアムPBR)
    // ====================================
    this.skinMat   = new THREE.MeshStandardMaterial({ color: 0xffcc88, roughness: 0.7, metalness: 0.0 });
    this.hairMat   = new THREE.MeshStandardMaterial({ color: 0x1c1008, roughness: 0.9, metalness: 0.0 });
    this.armorMat  = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.25, metalness: 0.85 });
    this.cloakMat  = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.8, metalness: 0.0 });
    this.beltMat   = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.6, metalness: 0.2 });
    this.bladeMat  = new THREE.MeshStandardMaterial({ color: 0xdbeafe, emissive: 0x2563eb, emissiveIntensity: 0.6, roughness: 0.05, metalness: 1.0 });
    this.guardMat  = new THREE.MeshStandardMaterial({ color: 0xffd700, emissive: 0xaa7700, emissiveIntensity: 0.3, roughness: 0.3, metalness: 0.9 });
    this.visorMat  = new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x38bdf8, emissiveIntensity: 0.5, transparent: true, opacity: 0.85, roughness: 0.0 });

    const skinMat = this.skinMat;
    const hairMat = this.hairMat;
    const armorMat = this.armorMat;
    const cloakMat = this.cloakMat;
    const beltMat = this.beltMat;
    const bladeMat = this.bladeMat;
    const guardMat = this.guardMat;
    const visorMat = this.visorMat;

    // ====================================
    // 足 (左右)
    // ====================================
    const legGeo = new THREE.BoxGeometry(0.22, 0.52, 0.22);
    this.leftLeg = new THREE.Mesh(legGeo, armorMat);
    this.leftLeg.position.set(-0.15, 0.26, 0);
    this.leftLeg.castShadow = true;
    this.group.add(this.leftLeg);

    this.rightLeg = new THREE.Mesh(legGeo, armorMat);
    this.rightLeg.position.set(0.15, 0.26, 0);
    this.rightLeg.castShadow = true;
    this.group.add(this.rightLeg);

    // 靴 (左右)
    const bootGeo = new THREE.BoxGeometry(0.24, 0.16, 0.32);
    const bootMat = new THREE.MeshStandardMaterial({ color: 0x1c1008, roughness: 0.9 });
    const leftBoot = new THREE.Mesh(bootGeo, bootMat);
    leftBoot.position.set(0, -0.32, 0.06);
    this.leftLeg.add(leftBoot);
    const rightBoot = new THREE.Mesh(bootGeo, bootMat);
    rightBoot.position.set(0, -0.32, 0.06);
    this.rightLeg.add(rightBoot);

    // ====================================
    // 胴 (Body)
    // ====================================
    this.body = new THREE.Group();
    this.body.position.y = 0.8;
    this.group.add(this.body);

    // クローク / チュニック
    const torsoGeo = new THREE.BoxGeometry(0.72, 0.7, 0.44);
    const torso = new THREE.Mesh(torsoGeo, cloakMat);
    torso.position.y = 0.12;
    torso.castShadow = true;
    this.body.add(torso);

    // 胸アーマー (プレートアーマー)
    const chestGeo = new THREE.BoxGeometry(0.6, 0.4, 0.18);
    const chestArmor = new THREE.Mesh(chestGeo, armorMat);
    chestArmor.position.set(0, 0.2, 0.14);
    this.body.add(chestArmor);

    // 胹当て (左右)
    const shoulderGeo = new THREE.SphereGeometry(0.21, 8, 6);
    const leftShoulder = new THREE.Mesh(shoulderGeo, armorMat);
    leftShoulder.position.set(-0.45, 0.3, 0);
    leftShoulder.scale.set(1, 0.85, 0.85);
    this.body.add(leftShoulder);

    const rightShoulder = new THREE.Mesh(shoulderGeo, armorMat);
    rightShoulder.position.set(0.45, 0.3, 0);
    rightShoulder.scale.set(1, 0.85, 0.85);
    this.body.add(rightShoulder);

    // ベルト
    const beltGeo = new THREE.BoxGeometry(0.74, 0.1, 0.46);
    const belt = new THREE.Mesh(beltGeo, beltMat);
    belt.position.set(0, -0.2, 0);
    this.body.add(belt);

    // ベルトバックル
    const buckleGeo = new THREE.BoxGeometry(0.14, 0.14, 0.06);
    const buckleMat = new THREE.MeshStandardMaterial({ color: 0xffd700, roughness: 0.2, metalness: 0.95 });
    const buckle = new THREE.Mesh(buckleGeo, buckleMat);
    buckle.position.set(0, -0.2, 0.24);
    this.body.add(buckle);

    // ====================================
    // 左腕 (Shield Side)
    // ====================================
    this.leftArmPivot = new THREE.Group();
    this.leftArmPivot.position.set(-0.45, 0.28, 0);
    this.body.add(this.leftArmPivot);

    const upperArmGeo = new THREE.CylinderGeometry(0.1, 0.09, 0.36, 8);
    const leftUpperArm = new THREE.Mesh(upperArmGeo, armorMat);
    leftUpperArm.position.set(0, -0.18, 0);
    leftUpperArm.rotation.z = 0.15;
    this.leftArmPivot.add(leftUpperArm);

    const leftForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.095, 0.34, 8), cloakMat);
    leftForearm.position.set(-0.05, -0.52, 0);
    this.leftArmPivot.add(leftForearm);

    // 左手
    const handGeo = new THREE.SphereGeometry(0.09, 8, 6);
    const leftHand = new THREE.Mesh(handGeo, skinMat);
    leftHand.position.set(-0.05, -0.72, 0);
    this.leftArmPivot.add(leftHand);

    // 🛡️ 盾 (シールド) メッシュ
    this.shieldGroup = new THREE.Group();
    this.shieldGroup.position.set(-0.08, -0.48, 0.12);
    this.shieldGroup.rotation.set(0, -Math.PI / 5, 0);

    // 盾本体 (プレート)
    const shieldPlateGeo = new THREE.BoxGeometry(0.52, 0.72, 0.05);
    const shieldPlateMat = new THREE.MeshStandardMaterial({
      color: 0x1e3a8a,      // ロイヤルブルーメタル
      roughness: 0.3,
      metalness: 0.8,
    });
    const shieldPlate = new THREE.Mesh(shieldPlateGeo, shieldPlateMat);
    this.shieldGroup.add(shieldPlate);

    // 盾フレーム (ゴールド縁取り)
    const shieldRimGeo = new THREE.BoxGeometry(0.56, 0.76, 0.035);
    const shieldRimMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,      // ゴールド
      roughness: 0.2,
      metalness: 0.95,
    });
    const shieldRim = new THREE.Mesh(shieldRimGeo, shieldRimMat);
    shieldRim.position.z = -0.012;
    this.shieldGroup.add(shieldRim);

    // 盾中央のボスエンブレム
    const bossGeo = new THREE.ConeGeometry(0.12, 0.08, 6);
    const bossMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.15, metalness: 0.95 });
    const boss = new THREE.Mesh(bossGeo, bossMat);
    boss.rotation.x = Math.PI / 2;
    boss.position.z = 0.04;
    this.shieldGroup.add(boss);

    this.leftArmPivot.add(this.shieldGroup);

    // ====================================
    // 右腕 (Sword Side) ピボット付き
    // ====================================
    this.rightArmPivot = new THREE.Group();
    this.rightArmPivot.position.set(0.45, 0.28, 0);
    this.body.add(this.rightArmPivot);

    const rightUpperArm = new THREE.Mesh(upperArmGeo, armorMat);
    rightUpperArm.position.set(0, -0.18, 0);
    rightUpperArm.rotation.z = -0.15;
    this.rightArmPivot.add(rightUpperArm);

    const rightForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.095, 0.34, 8), cloakMat);
    rightForearm.position.set(0.05, -0.52, 0);
    this.rightArmPivot.add(rightForearm);

    const rightHand = new THREE.Mesh(handGeo, skinMat);
    rightHand.position.set(0.05, -0.72, 0);
    this.rightArmPivot.add(rightHand);

    // ====================================
    // 山初 (Katana) - 麺の付いた後期刺し
    // ====================================
    this.swordGroup = new THREE.Group();
    this.swordGroup.position.set(0.06, -0.9, 0.12);
    this.rightArmPivot.add(this.swordGroup);

    // 柄 (Handle)
    const handleGeo = new THREE.CylinderGeometry(0.028, 0.035, 0.32, 8);
    const handleMat = new THREE.MeshStandardMaterial({ color: 0x1c0a00, roughness: 0.85 });
    const handle = new THREE.Mesh(handleGeo, handleMat);
    handle.position.set(0, -0.16, 0);
    handle.rotation.x = Math.PI * 0.12;
    this.swordGroup.add(handle);

    // 麺 (Tsuba - 山形の麺)
    const tsubaGeo = new THREE.TorusGeometry(0.1, 0.025, 6, 12);
    const tsuba = new THREE.Mesh(tsubaGeo, guardMat);
    tsuba.rotation.x = Math.PI / 2;
    this.swordGroup.add(tsuba);

    // 刀身 (ブレード) - 細く長いクエルチョン形
    const bladeGeo = new THREE.BoxGeometry(0.04, 1.2, 0.008);
    const blade = new THREE.Mesh(bladeGeo, bladeMat);
    blade.position.set(0, 0.65, 0);
    blade.rotation.x = Math.PI * 0.04;
    this.swordGroup.add(blade);

    // 刀身のエクストラ リムライト
    const bladeLight = new THREE.PointLight(0x2563eb, 0.8, 2.5);
    bladeLight.position.set(0, 0.8, 0);
    this.swordGroup.add(bladeLight);

    // 刃先
    const tipGeo = new THREE.ConeGeometry(0.022, 0.18, 6);
    const tip = new THREE.Mesh(tipGeo, bladeMat);
    tip.position.set(0, 1.28, 0);
    this.swordGroup.add(tip);

    // ====================================
    // 首 (Head)
    // ====================================
    this.headGroup = new THREE.Group();
    this.headGroup.position.set(0, 0.82, 0);
    this.body.add(this.headGroup);

    // 顔
    const faceGeo = new THREE.BoxGeometry(0.38, 0.38, 0.36);
    const face = new THREE.Mesh(faceGeo, skinMat);
    face.castShadow = true;
    this.headGroup.add(face);

    // 髪子 (Top)
    const hairTopGeo = new THREE.BoxGeometry(0.4, 0.14, 0.38);
    const hairTop = new THREE.Mesh(hairTopGeo, hairMat);
    hairTop.position.set(0, 0.25, 0);
    this.headGroup.add(hairTop);

    // 後ろ髪 (Back)
    const hairBackGeo = new THREE.BoxGeometry(0.36, 0.3, 0.1);
    const hairBack = new THREE.Mesh(hairBackGeo, hairMat);
    hairBack.position.set(0, 0.06, -0.22);
    this.headGroup.add(hairBack);

    // 左目
    const eyeGeo = new THREE.BoxGeometry(0.07, 0.055, 0.04);
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0x0ea5e9, emissive: 0x0ea5e9, emissiveIntensity: 0.4, roughness: 0.0 });
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.1, 0.04, 0.19);
    this.headGroup.add(leftEye);

    // 右目
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.1, 0.04, 0.19);
    this.headGroup.add(rightEye);

    // 鼻
    const noseGeo = new THREE.BoxGeometry(0.05, 0.06, 0.06);
    const nose = new THREE.Mesh(noseGeo, skinMat);
    nose.position.set(0, -0.04, 0.2);
    this.headGroup.add(nose);

    // ヘルメット (钣坛形)
    const helmetGeo = new THREE.BoxGeometry(0.44, 0.2, 0.44);
    const helmet = new THREE.Mesh(helmetGeo, armorMat);
    helmet.position.set(0, 0.22, -0.02);
    this.headGroup.add(helmet);

    // ヘルメットびさし (Visor)
    const visorGeo = new THREE.BoxGeometry(0.28, 0.07, 0.04);
    this.visorMesh = new THREE.Mesh(visorGeo, this.visorMat);
    this.visorMesh.position.set(0, 0.16, 0.22);
    this.headGroup.add(this.visorMesh);

    // ヘルメット鼻ガード
    const noseGuardGeo = new THREE.BoxGeometry(0.06, 0.22, 0.04);
    this.noseGuard = new THREE.Mesh(noseGuardGeo, armorMat);
    this.noseGuard.position.set(0, 0.06, 0.22);
    this.headGroup.add(this.noseGuard);

    // 頭部装飾装備グループ
    this.headGearGroup = new THREE.Group();
    this.headGroup.add(this.headGearGroup);

    // ====================================
    // スラッシュエフェクト
    // ====================================
    const slashGeo = new THREE.RingGeometry(1.2, 2.3, 20, 1, 0, Math.PI * 0.75);
    this.slashMat = new THREE.MeshBasicMaterial({ color: 0x93c5fd, side: THREE.DoubleSide, transparent: true, opacity: 0 });
    this.slashMesh = new THREE.Mesh(slashGeo, this.slashMat);
    this.slashMesh.rotation.x = Math.PI / 2;
    this.slashMesh.position.set(0, 0, 0.8);
    this.body.add(this.slashMesh);

    // 全パーツにシャドウ設定
    this.group.traverse(obj => { if (obj.isMesh) { obj.castShadow = true; obj.receiveShadow = true; } });

    // スラッシュエフェクトは純粋なUIエフェクトなので影は落とさない
    // (traverse後に上書きすることで攻撃前の影投影を防ぐ)
    this.slashMesh.castShadow = false;
    this.slashMesh.receiveShadow = false;

    // セーブデータに応じた初期スキン適用
    if (typeof saveData !== 'undefined' && saveData.equipped) {
      if (saveData.equipped.outfit) this.applyOutfit(saveData.equipped.outfit);
      if (saveData.equipped.head) this.applyHeadGear(saveData.equipped.head);
      if (saveData.equipped.sword) this.applySword(saveData.equipped.sword);
    }
  }

  // 🛡️ アーマー衣装スキンの変更
  applyOutfit(outfitId) {
    const item = ITEMS_DATA.outfits[outfitId] || ITEMS_DATA.outfits.default;
    this.currentOutfit = item.id;
    if (this.cloakMat) this.cloakMat.color.setHex(item.cloakColor);
    if (this.armorMat) this.armorMat.color.setHex(item.armorColor);
    if (this.visorMat) {
      this.visorMat.color.setHex(item.visorColor);
      this.visorMat.emissive.setHex(item.visorColor);
    }
  }

  // 👤 頭部装備の変更
  applyHeadGear(headId) {
    this.currentHead = headId;
    if (!this.headGearGroup) return;

    while (this.headGearGroup.children.length > 0) {
      const child = this.headGearGroup.children[0];
      this.headGearGroup.remove(child);
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    }

    if (headId === 'none') {
      if (this.visorMesh) this.visorMesh.visible = true;
      if (this.noseGuard) this.noseGuard.visible = true;
      return;
    }

    if (headId === 'sunglasses') {
      if (this.visorMesh) this.visorMesh.visible = false;
      if (this.noseGuard) this.noseGuard.visible = false;
      const glassMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.1, metalness: 0.9 });
      const frameMat = new THREE.MeshStandardMaterial({ color: 0x27272a, metalness: 0.8 });

      const frame = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.1, 0.06), frameMat);
      frame.position.set(0, 0.06, 0.23);
      this.headGearGroup.add(frame);

      const leftLens = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 0.02), glassMat);
      leftLens.position.set(-0.1, 0.06, 0.26);
      this.headGearGroup.add(leftLens);

      const rightLens = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 0.02), glassMat);
      rightLens.position.set(0.1, 0.06, 0.26);
      this.headGearGroup.add(rightLens);

    } else if (headId === 'ninja_band') {
      if (this.visorMesh) this.visorMesh.visible = true;
      const bandMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.5 });
      const band = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.08, 0.48), bandMat);
      band.position.set(0, 0.12, 0);
      this.headGearGroup.add(band);

      const knot = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 0.08), bandMat);
      knot.position.set(0, 0.12, -0.26);
      this.headGearGroup.add(knot);

      const tail1 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.35, 0.02), bandMat);
      tail1.position.set(-0.06, -0.05, -0.28);
      tail1.rotation.z = -0.25;
      this.headGearGroup.add(tail1);

    } else if (headId === 'samurai_helm') {
      if (this.visorMesh) this.visorMesh.visible = true;
      const goldMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.2, metalness: 0.95 });
      const crest = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.03, 6, 12, Math.PI * 0.8), goldMat);
      crest.rotation.z = -Math.PI * 0.4;
      crest.position.set(0, 0.38, 0.18);
      this.headGearGroup.add(crest);

    } else if (headId === 'cyber_horns') {
      if (this.visorMesh) this.visorMesh.visible = true;
      const hornMat = new THREE.MeshStandardMaterial({ color: 0xa855f7, emissive: 0xa855f7, emissiveIntensity: 0.8, roughness: 0.1 });
      const hornGeo = new THREE.ConeGeometry(0.06, 0.3, 6);

      const leftHorn = new THREE.Mesh(hornGeo, hornMat);
      leftHorn.position.set(-0.18, 0.35, 0.05);
      leftHorn.rotation.z = 0.4;
      leftHorn.rotation.x = -0.2;
      this.headGearGroup.add(leftHorn);

      const rightHorn = new THREE.Mesh(hornGeo, hornMat);
      rightHorn.position.set(0.18, 0.35, 0.05);
      rightHorn.rotation.z = -0.4;
      rightHorn.rotation.x = -0.2;
      this.headGearGroup.add(rightHorn);
    }
  }

  // 🗡️ 刀スキンの変更
  applySword(swordId) {
    const item = ITEMS_DATA.swords[swordId] || ITEMS_DATA.swords.default;
    this.currentSword = item.id;
    if (this.bladeMat) {
      this.bladeMat.color.setHex(item.bladeColor);
      this.bladeMat.emissive.setHex(item.emissive);
    }
    if (this.slashMat) {
      this.slashMat.color.setHex(item.slashColor);
    }
  }

  update(delta) {
    if (state.mode === GAME_MODE.GAMEOVER || state.mode === GAME_MODE.TITLE) return;

    // MP自動回復
    if (this.mp < this.maxMp) {
      this.mp = Math.min(this.maxMp, this.mp + CONFIG.mpRegenRate * delta);
      updateStatusHUD();
    }

    // 無敵タイマー (被弾後の点滅)
    if (this.invincibleTimer > 0) {
      this.invincibleTimer -= delta;
      this.group.visible = Math.floor(this.invincibleTimer * 16) % 2 === 0;
    } else {
      this.group.visible = true;
    }

    // コンボリセットタイマー
    if (this.comboResetTimer > 0) {
      this.comboResetTimer -= delta;
      if (this.comboResetTimer <= 0) this.comboStep = 0;
    }

    // ダッシュクールダウン更新
    if (state.dashCooldownTimer > 0) {
      state.dashCooldownTimer -= delta;
      this.updateDashCooldownUI();
    }

    let screenX = state.moveVector.x;
    let screenZ = state.moveVector.y;

    if (state.keys.forward) screenZ += 1;
    if (state.keys.backward) screenZ -= 1;
    if (state.keys.left) screenX -= 1;
    if (state.keys.right) screenX += 1;

    const inputLen = Math.sqrt(screenX * screenX + screenZ * screenZ);
    const isMoving = inputLen > 0.05;

    // =======================================
    // ダッシュ移動処理
    // =======================================
    if (state.isDashing) {
      state.dashTimer -= delta;
      if (state.dashTimer <= 0) {
        // ダッシュ終了
        state.isDashing = false;
        // ダッシュ終了後の残像エフェクトをフェードアウト
        this.dashTrails.forEach(t => {
          t.life = 0;
        });
      } else {
        // ダッシュ中は移動優先
        this.group.position.x += state.dashDirection.x * CONFIG.dashSpeed * delta;
        this.group.position.z += state.dashDirection.z * CONFIG.dashSpeed * delta;

        // 残像エフェクトを定期的に追加
        this.dashTrailTimer -= delta;
        if (this.dashTrailTimer <= 0) {
          this.dashTrailTimer = 0.04;
          this.spawnDashTrail();
        }
      }
    } else if (isMoving) {
      // 通常移動 (ガード中は速度45%に抑制)
      soundManager.unlock();
      const speedMult = state.isGuarding ? 0.45 : 1.0;
      const worldX = -screenX / (inputLen > 1 ? inputLen : 1);
      const worldZ = screenZ / (inputLen > 1 ? inputLen : 1);

      this.velocity.x = worldX * CONFIG.playerSpeed * state.controlSensitivity * speedMult;
      this.velocity.z = worldZ * CONFIG.playerSpeed * state.controlSensitivity * speedMult;

      const targetRot = Math.atan2(worldX, worldZ);
      let diff = targetRot - this.group.rotation.y;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      this.group.rotation.y += diff * Math.min(delta * CONFIG.playerTurnSpeed, 1.0);

      this.group.position.x += this.velocity.x * delta;
      this.group.position.z += this.velocity.z * delta;

      this.walkCycle += delta * (state.isGuarding ? 6 : 12);
    } else {
      this.velocity.set(0, 0, 0);
      this.walkCycle += delta * 2;
    }

    // フィールド境界制限 (オープンワールド: 240m)
    const distCenter = Math.sqrt(this.group.position.x ** 2 + this.group.position.z ** 2);
    if (distCenter > 240) {
      this.group.position.x = (this.group.position.x / distCenter) * 240;
      this.group.position.z = (this.group.position.z / distCenter) * 240;
    }

    // 地形高さ追従
    const th = getTerrainHeight(this.group.position.x, this.group.position.z);
    this.group.position.y = th;

    // ダッシュ残像の更新
    this.updateDashTrails(delta);

    if (state.isAttacking) {
      this.updateAttackAnimation(delta);
    } else if (!state.isDashing) {
      // 歩行・ガードアニメーションを実行（足・腕・胴の連動）
      this.animateWalk(delta, isMoving);
    }
  }

  // ダッシュ実行
  dash() {
    if (state.isDashing || state.dashCooldownTimer > 0 || state.mode !== GAME_MODE.PLAYING) return;

    soundManager.unlock();
    soundManager.playDash();

    // 現在の向きをダッシュ方向に設定
    const angle = this.group.rotation.y;
    state.dashDirection.set(
      Math.sin(angle),
      0,
      Math.cos(angle)
    );

    // ダッシュ開始
    state.isDashing = true;
    state.dashTimer = CONFIG.dashDuration;
    state.dashCooldownTimer = CONFIG.dashCooldown;
    this.dashTrailTimer = 0;
    this.invincibleTimer = Math.max(this.invincibleTimer, CONFIG.dashDuration); // ダッシュ中無敵

    // UIを即時更新
    this.updateDashCooldownUI();

    // カメラシェイク (軽め)
    cameraController.shake(0.1);
  }

  // ダッシュ残像を生成
  spawnDashTrail() {
    const geo = new THREE.BoxGeometry(0.5, 1.6, 0.3);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(this.group.position);
    mesh.position.y += 0.8;
    mesh.rotation.y = this.group.rotation.y;
    scene.add(mesh);
    this.dashTrails.push({ mesh, mat, life: 1.0 });
  }

  // ダッシュ残像を更新・フェードアウト
  updateDashTrails(delta) {
    for (let i = this.dashTrails.length - 1; i >= 0; i--) {
      const trail = this.dashTrails[i];
      trail.life -= delta * 6.0; // フェードアウト速度
      if (trail.life <= 0) {
        scene.remove(trail.mesh);
        this.dashTrails.splice(i, 1);
      } else {
        trail.mat.opacity = trail.life * 0.45;
      }
    }
  }

  // ダッシュクールダウンUIを更新
  updateDashCooldownUI() {
    const btn = document.getElementById('btn-dash');
    if (!btn) return;
    const ratio = state.dashCooldownTimer / CONFIG.dashCooldown;
    if (ratio > 0) {
      btn.classList.add('cooling');
      // クールダウン進捗をCSS変数で管理
      btn.style.setProperty('--cd-ratio', ratio);
      btn.querySelector('.dash-cooldown-overlay').style.height = `${ratio * 100}%`;
    } else {
      btn.classList.remove('cooling');
      btn.style.setProperty('--cd-ratio', 0);
      btn.querySelector('.dash-cooldown-overlay').style.height = '0%';
    }
  }

  // ガード時のシールドバリア光輪火花エフェクト
  spawnShieldSpark() {
    const forward = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.group.rotation.y);
    const shieldPos = this.group.position.clone().add(forward.clone().multiplyScalar(0.7)).add(new THREE.Vector3(0, 1.1, 0));

    // シールドバリア光輪リング
    const ringGeo = new THREE.RingGeometry(0.3, 0.85, 16);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xfbbf24,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.position.copy(shieldPos);
    ringMesh.rotation.y = this.group.rotation.y;
    scene.add(ringMesh);

    // 火花アニメーション
    let life = 0.22;
    const sparkInterval = setInterval(() => {
      life -= 0.03;
      ringMesh.scale.multiplyScalar(1.08);
      ringMat.opacity = Math.max(0, life / 0.22);
      if (life <= 0) {
        clearInterval(sparkInterval);
        scene.remove(ringMesh);
      }
    }, 30);
  }

  takeDamage(amount, fromPos) {
    if (this.invincibleTimer > 0 || state.mode === GAME_MODE.GAMEOVER) return;

    // 🛡️ ガード判定 (正面からの攻撃を85%軽減・金属音・火花)
    if (state.isGuarding && fromPos) {
      const playerForward = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.group.rotation.y);
      const toAttacker = new THREE.Vector3().subVectors(fromPos, this.group.position).normalize();
      toAttacker.y = 0;

      // 正面150度以内からの攻撃をガード
      if (playerForward.dot(toAttacker) >= -0.25) {
        const blockedDmg = Math.max(0, Math.floor(amount * 0.15)); // 85%ダメージカット
        this.hp = Math.max(0, this.hp - blockedDmg);
        this.invincibleTimer = 0.35; // ガード時の無敵時間は短め

        soundManager.playShieldBlock();
        cameraController.shake(0.16);
        showDamagePopup(this.group.position, blockedDmg > 0 ? `🛡️BLOCK -${blockedDmg}` : '🛡️GUARD!', 'resist');
        this.spawnShieldSpark();

        // 軽いガードノックバック
        const knockDir = new THREE.Vector3().subVectors(this.group.position, fromPos).normalize();
        this.group.position.addScaledVector(knockDir, 0.35);

        updateStatusHUD();
        if (this.hp <= 0) this.die();
        return;
      }
    }

    this.hp = Math.max(0, this.hp - amount);
    this.invincibleTimer = 1.0;

    soundManager.playPlayerHurt();
    // ダメージ量に応じたカメラ揺れ (大ダメージは強め)
    cameraController.shake(amount >= 20 ? 0.65 : 0.35);

    // 画面フラッシュエフェクト
    const overlay = document.getElementById('damage-overlay');
    if (overlay) {
      // 大ダメージは「is-hit-heavy」クラスでより強烈に
      const cls = amount >= 20 ? 'is-hit-heavy' : 'is-hit';
      overlay.classList.add(cls);
      setTimeout(() => overlay.classList.remove(cls), amount >= 20 ? 280 : 180);
    }

    if (fromPos) {
      const knockDir = new THREE.Vector3().subVectors(this.group.position, fromPos).normalize();
      this.group.position.addScaledVector(knockDir, 0.8);
    }

    updateStatusHUD();
    if (this.hp <= 0) this.die();
  }

  die() {
    state.mode = GAME_MODE.GAMEOVER;
    soundManager.playPlayerHurt();

    const goModal = document.getElementById('gameover-modal');
    const goStage = document.getElementById('go-stage');
    const goKills = document.getElementById('go-kills');
    const goCoins = document.getElementById('go-coins');

    if (goStage) goStage.innerText = `STAGE ${state.currentStageIdx + 1}`;
    if (goKills) goKills.innerText = state.kills;
    if (goCoins) goCoins.innerText = state.coins;
    if (goModal) goModal.classList.remove('hidden');
  }

  respawn() {
    this.hp = this.maxHp;
    this.mp = this.maxMp;
    this.invincibleTimer = 2.0;
    this.group.position.set(0, 0, 0);
    state.mode = GAME_MODE.PLAYING;

    const goModal = document.getElementById('gameover-modal');
    if (goModal) goModal.classList.add('hidden');
    updateStatusHUD();
  }

  attack() {
    if (!state.canAttack || state.isAttacking || state.mode !== GAME_MODE.PLAYING) return;

    soundManager.unlock();

    // 剣を振る「シュッ」音
    soundManager.playAttackSlash(this.comboStep);
    // 剣を振る声 (えい!/やぁ!/とお!)
    soundManager.playVoice(this.comboStep);

    // オンライン相手へ攻撃モーションを同期
    if (state.isMultiplayer && networkManager) {
      networkManager.sendAttack(this.comboStep);
    }

    state.isAttacking = true;
    state.canAttack = false;
    state.attackTimer = 0;
    this.comboResetTimer = 0.85;

    const btn = document.getElementById('btn-attack');
    if (btn) {
      btn.classList.add('active');
      setTimeout(() => btn.classList.remove('active'), 150);
    }

    this.performAttackHitCheck();
    const currentStep = this.comboStep;
    this.comboStep = (this.comboStep + 1) % 3;

    setTimeout(() => {
      state.canAttack = true;
    }, (currentStep === 2 ? 0.38 : CONFIG.attackCooldown) * 1000);
  }

  updateAttackAnimation(delta) {
    state.attackTimer += delta;
    const duration = 0.25;
    const progress = Math.min(state.attackTimer / duration, 1.0);

    if (progress < 1.0) {
      const ease = Math.sin(progress * Math.PI * 0.5);
      this.rightArmPivot.rotation.y = -1.2 + ease * 2.4;
      this.slashMesh.material.opacity = Math.sin(progress * Math.PI) * 0.9;
    } else {
      state.isAttacking = false;
      this.slashMesh.material.opacity = 0;
      this.rightArmPivot.rotation.set(0, 0, 0);
    }
  }

  // 歩行・ガードアニメーション (walkCycleに連動して足・腕・胴を動かす)
  animateWalk(delta, isMoving) {
    if (!this.leftLeg || !this.rightLeg) return;
    const speed = isMoving ? 12 : 2;
    this.walkCycle += delta * speed;
    const swing = isMoving ? 0.35 : 0.06;

    // 足を前後に振る
    this.leftLeg.rotation.x  =  Math.sin(this.walkCycle) * swing;
    this.rightLeg.rotation.x = -Math.sin(this.walkCycle) * swing;

    // 🛡️ ガード構えポーズ または 通常歩行腕振り
    if (state.isGuarding) {
      // 盾を体の正面にグッと構える
      if (this.leftArmPivot) this.leftArmPivot.rotation.set(0.65, 0.95, -0.35);
      if (this.rightArmPivot && !state.isAttacking) this.rightArmPivot.rotation.set(0.2, -0.3, 0.2);
    } else {
      // 左腕は右足と逆相に振る
      if (this.leftArmPivot) this.leftArmPivot.rotation.set(-Math.sin(this.walkCycle) * swing * 0.7, 0, 0);
    }

    // ボディの上下動 (歩行感)
    if (this.body) this.body.position.y = 0.8 + (isMoving ? Math.abs(Math.sin(this.walkCycle * 2)) * 0.06 : Math.sin(this.walkCycle) * 0.025);
  }


  performAttackHitCheck() {
    const activeCombo = (this.comboStep + 2) % 3;
    const forward = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.group.rotation.y);
    const pPos = this.group.position;
    let hitAny = false;

    const attackRange = (activeCombo === 2) ? 3.4 : CONFIG.attackRange;
    const baseDamage = (activeCombo === 2) ? 45 : 25;

    enemyManager.enemies.forEach((enemy) => {
      if (enemy.isDead || enemy.isDying) return;
      const toEnemy = new THREE.Vector3().subVectors(enemy.group.position, pPos);
      toEnemy.y = 0;
      const dist = toEnemy.length();

      if (dist <= attackRange) {
        toEnemy.normalize();
        if (forward.dot(toEnemy) >= 0.3) {
          hitAny = true;
          enemy.takeDamage(baseDamage, toEnemy, null, activeCombo === 2);
        }
      }
    });

    if (hitAny) {
      // 敵命中時: ザシュ！衝撃音 + ヒットスプラッシュ
      soundManager.playZubattoSlash(activeCombo);
      soundManager.playHitImpact(activeCombo === 2);
      state.hitStopTimer = (activeCombo === 2) ? 0.08 : 0.05;
      cameraController.shake(activeCombo === 2 ? 0.35 : 0.2);
    }
  }

  castMagic(magicKey) {
    if (state.mode !== GAME_MODE.PLAYING) return;
    const magic = MAGIC_DATA[magicKey];
    if (!magic || this.mp < magic.cost) return;

    const currentLevel = saveData.magicLevels[magicKey] || 1;
    this.mp -= magic.cost;
    updateStatusHUD();

    soundManager.playMagicSound(magicKey, currentLevel);
    magicSystem.cast(magicKey, currentLevel, this.group.position, this.group.rotation.y);

    // オンライン相手へ魔法詠唱を同期
    if (state.isMultiplayer && networkManager) {
      networkManager.sendMagic(magicKey, currentLevel, this.group.position, this.group.rotation.y);
    }
  }
}

// =============================================================================
// 6.4 バディペットシステム (BuddyPet & PetManager)
// =============================================================================
class BuddyPet {
  constructor(player, petType = 'fairy', slotIndex = 0) {
    this.player = player;
    this.petType = petType;
    this.slotIndex = slotIndex;
    this.petData = ITEMS_DATA.pets[petType] || ITEMS_DATA.pets.fairy;

    this.group = new THREE.Group();
    const initOffset = CONFIG.petOffsets[slotIndex] || CONFIG.petOffsets[0];
    this.group.position.copy(player.group.position).add(initOffset);
    scene.add(this.group);

    this.hoverTime = Math.random() * 10;
    this.attackTimer = Math.random() * 1.5;
    this.attackCooldown = this.petData.attackInterval || 2.5;

    this.buildMesh();
  }

  buildMesh() {
    while (this.group.children.length > 0) {
      const child = this.group.children[0];
      this.group.remove(child);
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    }

    const type = this.petType;
    const bulletColor = this.petData.bulletColor || 0x38bdf8;

    if (type === 'gorilla') {
      const furMat = new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.8 });
      const skinMat = new THREE.MeshStandardMaterial({ color: 0x52525b, roughness: 0.6 });
      this.body = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.48, 0.42), furMat);
      this.group.add(this.body);
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.28, 0.28), furMat);
      head.position.set(0, 0.32, 0.08);
      this.body.add(head);
    } else if (type === 'lion') {
      const furMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.6 });
      const maneMat = new THREE.MeshStandardMaterial({ color: 0x9a3412, roughness: 0.8 });
      this.body = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.38, 0.48), furMat);
      this.group.add(this.body);
      const mane = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.48, 0.28), maneMat);
      mane.position.set(0, 0.15, 0.16);
      this.body.add(mane);
    } else if (type === 'pig') {
      const pinkMat = new THREE.MeshStandardMaterial({ color: 0xfb7185, roughness: 0.5 });
      this.body = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 8), pinkMat);
      this.group.add(this.body);
      const snout = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.08, 8), pinkMat);
      snout.rotation.x = Math.PI / 2;
      snout.position.set(0, 0, 0.28);
      this.body.add(snout);
    } else if (type === 'dog') {
      const dogMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.6 });
      this.body = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.32, 0.46), dogMat);
      this.group.add(this.body);
    } else if (type === 'cheetah') {
      const chMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.4 });
      this.body = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.28, 0.52), chMat);
      this.group.add(this.body);
    } else if (type === 'unicorn') {
      const uniMat = new THREE.MeshStandardMaterial({ color: 0xfdf4ff, roughness: 0.3 });
      this.body = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.48), uniMat);
      this.group.add(this.body);
      const hornMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, emissive: 0xfbbf24, emissiveIntensity: 0.8 });
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.28, 6), hornMat);
      horn.position.set(0, 0.4, 0.2);
      horn.rotation.x = 0.3;
      this.body.add(horn);
    } else {
      // フェアリー (妖精)
      const fairyMat = new THREE.MeshStandardMaterial({ color: 0xf472b6, emissive: 0xec4899, emissiveIntensity: 0.4, roughness: 0.2 });
      this.body = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), fairyMat);
      this.group.add(this.body);
      const wingMat = new THREE.MeshStandardMaterial({ color: 0xbae6fd, transparent: true, opacity: 0.65, roughness: 0.1 });
      const lWing = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.18, 0.02), wingMat);
      lWing.position.set(-0.25, 0.08, -0.1);
      lWing.rotation.y = 0.4;
      this.body.add(lWing);
      const rWing = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.18, 0.02), wingMat);
      rWing.position.set(0.25, 0.08, -0.1);
      rWing.rotation.y = -0.4;
      this.body.add(rWing);
    }

    // 発光オーラ
    const light = new THREE.PointLight(bulletColor, 0.6, 3.0);
    light.position.set(0, 0, 0);
    this.group.add(light);
  }

  update(delta) {
    if (state.mode === GAME_MODE.GAMEOVER || state.mode === GAME_MODE.TITLE) return;

    this.hoverTime += delta * 3.5;
    const targetOffset = (CONFIG.petOffsets[this.slotIndex] || CONFIG.petOffsets[0]).clone();
    targetOffset.y += Math.sin(this.hoverTime) * 0.22;

    const targetPos = this.player.group.position.clone().add(targetOffset);
    targetPos.y = Math.max(targetPos.y, getTerrainHeight(targetPos.x, targetPos.z) + 1.2);

    this.group.position.lerp(targetPos, Math.min(delta * CONFIG.petFollowSpeed, 1.0));
    this.group.rotation.y = this.player.group.rotation.y;

    // 支援攻撃タイマー
    this.attackTimer += delta;
    if (this.attackTimer >= this.attackCooldown) {
      this.attackTimer = 0;
      this.tryAttack();
    }
  }

  tryAttack() {
    if (state.mode !== GAME_MODE.PLAYING) return;
    let closestEnemy = null;
    let closestDist = CONFIG.petAttackRange || 14.0;

    enemyManager.enemies.forEach(e => {
      if (e.isDead || e.isDying) return;
      const d = this.group.position.distanceTo(e.group.position);
      if (d < closestDist) {
        closestDist = d;
        closestEnemy = e;
      }
    });

    if (closestEnemy) {
      this.shootBullet(closestEnemy);
    }
  }

  shootBullet(targetEnemy) {
    const startPos = this.group.position.clone();
    const targetPos = targetEnemy.group.position.clone().add(new THREE.Vector3(0, 0.8, 0));
    const dir = new THREE.Vector3().subVectors(targetPos, startPos).normalize();

    const bulletColor = this.petData.bulletColor || 0x38bdf8;
    const geo = new THREE.SphereGeometry(0.18, 6, 6);
    const mat = new THREE.MeshBasicMaterial({ color: bulletColor });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(startPos);
    scene.add(mesh);

    let life = 1.0;
    const speed = 20.0;
    const interval = setInterval(() => {
      life -= 0.04;
      mesh.position.addScaledVector(dir, speed * 0.04);

      if (targetEnemy && !targetEnemy.isDead) {
        if (mesh.position.distanceTo(targetEnemy.group.position) < 1.2) {
          targetEnemy.takeDamage(18, dir, null, false);
          soundManager.playHitImpact(false);
          clearInterval(interval);
          scene.remove(mesh);
          return;
        }
      }

      if (life <= 0) {
        clearInterval(interval);
        scene.remove(mesh);
      }
    }, 40);
  }

  destroy() {
    scene.remove(this.group);
  }
}

class PetManager {
  constructor(player) {
    this.player = player;
    this.pets = [];
    this.rebuild(saveData?.equipped?.pets || ['fairy']);
  }

  rebuild(petIds) {
    this.pets.forEach(p => p.destroy());
    this.pets = [];

    const ids = Array.isArray(petIds) && petIds.length > 0 ? petIds : ['fairy'];
    ids.slice(0, 3).forEach((petId, index) => {
      const pet = new BuddyPet(this.player, petId, index);
      this.pets.push(pet);
    });
  }

  update(delta) {
    this.pets.forEach(pet => pet.update(delta));
  }
}


// =============================================================================
// 6.5 リモートプレイヤー (2P ONLINE 同期プレイヤー)
// =============================================================================
class RemotePlayer {
  constructor() {
    this.group = new THREE.Group();
    this.group.visible = false;
    scene.add(this.group);

    this.targetPos = new THREE.Vector3(0, 0, 0);
    this.targetRotY = 0;
    this.walkCycle = 0;
    this.isMoving = false;
    this.isGuarding = false;
    this.isAttacking = false;
    this.attackTimer = 0;
    this.comboStep = 0;
    this.hp = 100;
    this.maxHp = 100;

    this.buildMesh();
  }

  buildMesh() {
    // 2Pカラーリング (エメラルドグリーン基調)
    const skinMat   = new THREE.MeshStandardMaterial({ color: 0xffcc88, roughness: 0.7, metalness: 0.0 });
    const hairMat   = new THREE.MeshStandardMaterial({ color: 0x2e1065, roughness: 0.9, metalness: 0.0 });
    const armorMat  = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.25, metalness: 0.85 });
    const cloakMat  = new THREE.MeshStandardMaterial({ color: 0x059669, roughness: 0.8, metalness: 0.0 }); // エメラルド
    const beltMat   = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.6, metalness: 0.2 });
    const bladeMat  = new THREE.MeshStandardMaterial({ color: 0xa7f3d0, emissive: 0x10b981, emissiveIntensity: 0.6, roughness: 0.05, metalness: 1.0 });
    const guardMat  = new THREE.MeshStandardMaterial({ color: 0xfbbf24, emissive: 0xd97706, emissiveIntensity: 0.3, roughness: 0.3, metalness: 0.9 });

    // 足 (左右)
    const legGeo = new THREE.CylinderGeometry(0.13, 0.11, 0.65, 8);
    this.leftLeg = new THREE.Mesh(legGeo, armorMat);
    this.leftLeg.position.set(-0.25, 0.32, 0);
    this.group.add(this.leftLeg);

    this.rightLeg = new THREE.Mesh(legGeo, armorMat);
    this.rightLeg.position.set(0.25, 0.32, 0);
    this.group.add(this.rightLeg);

    // 胴体
    this.body = new THREE.Group();
    this.body.position.y = 0.8;
    this.group.add(this.body);

    const torsoGeo = new THREE.CylinderGeometry(0.32, 0.26, 0.75, 8);
    const torso = new THREE.Mesh(torsoGeo, cloakMat);
    torso.position.y = 0.38;
    this.body.add(torso);

    const chestGeo = new THREE.BoxGeometry(0.55, 0.45, 0.38);
    const chest = new THREE.Mesh(chestGeo, armorMat);
    chest.position.set(0, 0.45, 0.02);
    this.body.add(chest);

    // 腕 (左腕 & 右腕)
    const armGeo = new THREE.CylinderGeometry(0.09, 0.08, 0.55, 6);
    this.leftArmPivot = new THREE.Group();
    this.leftArmPivot.position.set(-0.42, 0.65, 0);
    const lArm = new THREE.Mesh(armGeo, armorMat);
    lArm.position.y = -0.22;
    this.leftArmPivot.add(lArm);

    // 🛡️ 2P 盾 (エメラルドシールド)
    const p2ShieldGroup = new THREE.Group();
    p2ShieldGroup.position.set(-0.08, -0.42, 0.12);
    p2ShieldGroup.rotation.set(0, -Math.PI / 5, 0);

    const p2PlateGeo = new THREE.BoxGeometry(0.52, 0.72, 0.05);
    const p2PlateMat = new THREE.MeshStandardMaterial({ color: 0x065f46, roughness: 0.3, metalness: 0.8 });
    p2ShieldGroup.add(new THREE.Mesh(p2PlateGeo, p2PlateMat));

    const p2RimGeo = new THREE.BoxGeometry(0.56, 0.76, 0.035);
    const p2RimMat = new THREE.MeshStandardMaterial({ color: 0x34d399, roughness: 0.2, metalness: 0.95 });
    const p2Rim = new THREE.Mesh(p2RimGeo, p2RimMat);
    p2Rim.position.z = -0.012;
    p2ShieldGroup.add(p2Rim);

    this.leftArmPivot.add(p2ShieldGroup);
    this.body.add(this.leftArmPivot);

    this.rightArmPivot = new THREE.Group();
    this.rightArmPivot.position.set(0.42, 0.65, 0);
    const rArm = new THREE.Mesh(armGeo, armorMat);
    rArm.position.y = -0.22;
    this.rightArmPivot.add(rArm);
    this.body.add(this.rightArmPivot);

    // 武器 (刀)
    this.swordGroup = new THREE.Group();
    this.swordGroup.position.set(0, -0.42, 0.1);
    this.swordGroup.rotation.x = Math.PI / 2.5;

    const bladeGeo = new THREE.BoxGeometry(0.06, 1.4, 0.03);
    const blade = new THREE.Mesh(bladeGeo, bladeMat);
    blade.position.y = 0.7;
    this.swordGroup.add(blade);

    const guardGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.03, 8);
    const guard = new THREE.Mesh(guardGeo, guardMat);
    guard.position.y = 0.0;
    this.swordGroup.add(guard);

    const hiltGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.35, 6);
    const hilt = new THREE.Mesh(hiltGeo, beltMat);
    hilt.position.y = -0.18;
    this.swordGroup.add(hilt);

    this.rightArmPivot.add(this.swordGroup);

    // 頭部
    const headGroup = new THREE.Group();
    headGroup.position.y = 0.95;
    this.body.add(headGroup);

    const faceGeo = new THREE.SphereGeometry(0.24, 8, 8);
    const face = new THREE.Mesh(faceGeo, skinMat);
    headGroup.add(face);

    const hairGeo = new THREE.SphereGeometry(0.26, 8, 8, 0, Math.PI * 2, 0, Math.PI * 0.55);
    const hair = new THREE.Mesh(hairGeo, hairMat);
    hair.position.y = 0.04;
    headGroup.add(hair);

    // スラッシュエフェクト
    const slashGeo = new THREE.RingGeometry(1.2, 2.3, 20, 1, 0, Math.PI * 0.75);
    this.slashMat = new THREE.MeshBasicMaterial({ color: 0x34d399, side: THREE.DoubleSide, transparent: true, opacity: 0 });
    this.slashMesh = new THREE.Mesh(slashGeo, this.slashMat);
    this.slashMesh.rotation.x = Math.PI / 2;
    this.slashMesh.position.set(0, 0, 0.8);
    this.slashMesh.castShadow = false;
    this.slashMesh.receiveShadow = false;
    this.body.add(this.slashMesh);

    // 頭上 2P ネームタグ & HPバースプライト
    this.createNameTagSprite();

    if (!isIPad) {
      this.group.traverse(o => { if (o.isMesh && o !== this.slashMesh) { o.castShadow = true; o.receiveShadow = true; } });
    }
  }

  createNameTagSprite() {
    this.tagCanvas = document.createElement('canvas');
    this.tagCanvas.width = 128;
    this.tagCanvas.height = 48;
    this.tagCtx = this.tagCanvas.getContext('2d');

    this.tagTex = new THREE.CanvasTexture(this.tagCanvas);
    const spriteMat = new THREE.SpriteMaterial({ map: this.tagTex, transparent: true });
    this.tagSprite = new THREE.Sprite(spriteMat);
    this.tagSprite.scale.set(1.6, 0.6, 1.0);
    this.tagSprite.position.y = 2.4;
    this.group.add(this.tagSprite);

    this.updateNameTag();
  }

  updateNameTag() {
    if (!this.tagCtx) return;
    const ctx = this.tagCtx;
    ctx.clearRect(0, 0, 128, 48);

    // ネームバッジ "2P BUDDY"
    ctx.fillStyle = 'rgba(6, 78, 59, 0.85)';
    ctx.roundRect ? ctx.roundRect(14, 2, 100, 20, 6) : ctx.fillRect(14, 2, 100, 20);
    ctx.fill();
    ctx.strokeStyle = '#34d399';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.font = 'bold 12px sans-serif';
    ctx.fillStyle = '#34d399';
    ctx.textAlign = 'center';
    ctx.fillText('🟢 2P BUDDY', 64, 16);

    // ミニHPバー
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(14, 26, 100, 14);

    const ratio = Math.max(0, this.hp / this.maxHp);
    ctx.fillStyle = ratio > 0.5 ? '#10b981' : (ratio > 0.25 ? '#eab308' : '#ef4444');
    ctx.fillRect(16, 28, Math.floor(96 * ratio), 10);

    this.tagTex.needsUpdate = true;
  }

  show() {
    this.group.visible = true;
    const p2Card = document.getElementById('p2-status-card');
    if (p2Card) p2Card.classList.remove('hidden');
  }

  hide() {
    this.group.visible = false;
    const p2Card = document.getElementById('p2-status-card');
    if (p2Card) p2Card.classList.add('hidden');
  }

  setHp(hp, maxHp) {
    this.hp = hp;
    this.maxHp = maxHp || this.maxHp;
    this.updateNameTag();

    // 2P HUDバー更新
    const p2HpBar = document.getElementById('p2-hp-bar');
    const p2HpText = document.getElementById('p2-hp-text');
    const ratio = Math.max(0, this.hp / this.maxHp);
    if (p2HpBar) p2HpBar.style.width = `${ratio * 100}%`;
    if (p2HpText) p2HpText.innerText = `${Math.floor(this.hp)}/${this.maxHp}`;
  }

  triggerAttack(comboStep = 0) {
    this.isAttacking = true;
    this.attackTimer = 0;
    this.comboStep = comboStep;
    soundManager.playAttackSlash(comboStep);
  }

  update(delta) {
    if (!this.group.visible) return;

    // 位置補間 (スムーズlerp)
    this.group.position.lerp(this.targetPos, Math.min(delta * 14.0, 1.0));

    // 向き補間
    let diff = this.targetRotY - this.group.rotation.y;
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;
    this.group.rotation.y += diff * Math.min(delta * 12.0, 1.0);

    // 地形高さ追従
    this.group.position.y = getTerrainHeight(this.group.position.x, this.group.position.z);

    // 歩行・ガードアニメーション
    if (this.leftLeg && this.rightLeg) {
      const speed = this.isMoving ? 12 : 2;
      this.walkCycle += delta * speed;
      const swing = this.isMoving ? 0.35 : 0.06;
      this.leftLeg.rotation.x = Math.sin(this.walkCycle) * swing;
      this.rightLeg.rotation.x = -Math.sin(this.walkCycle) * swing;

      if (this.isGuarding) {
        if (this.leftArmPivot) this.leftArmPivot.rotation.set(0.65, 0.95, -0.35);
      } else {
        if (this.leftArmPivot) this.leftArmPivot.rotation.set(-Math.sin(this.walkCycle) * swing * 0.7, 0, 0);
      }
    }

    // 攻撃アニメーション
    if (this.isAttacking) {
      this.attackTimer += delta;
      const dur = 0.25;
      const prog = Math.min(this.attackTimer / dur, 1.0);
      if (prog < 1.0) {
        const ease = Math.sin(prog * Math.PI * 0.5);
        this.rightArmPivot.rotation.y = -1.2 + ease * 2.4;
        this.slashMesh.material.opacity = Math.sin(prog * Math.PI) * 0.9;
      } else {
        this.isAttacking = false;
        this.slashMesh.material.opacity = 0;
        this.rightArmPivot.rotation.set(0, 0, 0);
      }
    }
  }
}


// =============================================================================
// 6.6 ネットワークマネージャー (WebRTC PeerJS 通信管理)
// =============================================================================
class NetworkManager {
  constructor() {
    this.peer = null;
    this.conn = null;
    this.isConnected = false;
    this.roomId = null;
    this.sendTimer = null;
    this.remotePlayer = null;
  }

  init(remotePlayer) {
    this.remotePlayer = remotePlayer;
  }

  // 6桁のランダム数字コード生成
  generateRoomId() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // ホストとして部屋を作成
  createRoom(onSuccess, onError) {
    const rawId = this.generateRoomId();
    this.roomId = rawId;
    const fullPeerId = `blade-buddy-${rawId}`;

    if (this.peer) this.peer.destroy();

    try {
      this.peer = new Peer(fullPeerId, {
        debug: 1,
      });
    } catch (e) {
      if (onError) onError(e);
      return;
    }

    this.peer.on('open', (id) => {
      state.isMultiplayer = true;
      state.isHost = true;
      state.peerId = id;
      if (onSuccess) onSuccess(rawId);
    });

    this.peer.on('connection', (conn) => {
      this.conn = conn;
      this.setupConnectionHandlers();
    });

    this.peer.on('error', (err) => {
      console.warn('PeerJS Host Error:', err);
      if (onError) onError(err);
    });
  }

  // ゲストとして部屋に参加
  joinRoom(roomIdStr, onSuccess, onError) {
    const rawId = roomIdStr.trim();
    this.roomId = rawId;
    const targetPeerId = `blade-buddy-${rawId}`;

    if (this.peer) this.peer.destroy();

    try {
      this.peer = new Peer({ debug: 1 });
    } catch (e) {
      if (onError) onError(e);
      return;
    }

    this.peer.on('open', () => {
      state.isMultiplayer = true;
      state.isHost = false;
      const conn = this.peer.connect(targetPeerId, { reliable: true });
      this.conn = conn;
      this.setupConnectionHandlers(onSuccess, onError);
    });

    this.peer.on('error', (err) => {
      console.warn('PeerJS Guest Error:', err);
      if (onError) onError(err);
    });
  }

  setupConnectionHandlers(onConnectSuccess, onConnectError) {
    if (!this.conn) return;

    this.conn.on('open', () => {
      this.isConnected = true;
      this.remotePlayer.show();

      // 定期ステート送信開始 (20Hz = 50ms)
      this.startSyncLoop();

      // 初期ハンドシェイク送信
      this.send({
        type: 'HELLO',
        isHost: state.isHost,
        hp: player.hp,
        maxHp: player.maxHp,
      });

      if (onConnectSuccess) onConnectSuccess();
    });

    this.conn.on('data', (data) => {
      this.handleMessage(data);
    });

    this.conn.on('close', () => {
      this.handleDisconnect();
    });

    this.conn.on('error', (err) => {
      console.warn('DataConnection Error:', err);
      if (onConnectError) onConnectError(err);
    });
  }

  send(data) {
    if (this.conn && this.conn.open) {
      try {
        this.conn.send(data);
      } catch (e) {}
    }
  }

  // 20Hz (50ms) 定期データ送信ループ
  startSyncLoop() {
    if (this.sendTimer) clearInterval(this.sendTimer);

    this.sendTimer = setInterval(() => {
      if (!this.isConnected || !this.conn || !this.conn.open) return;

      const isMoving = state.moveVector.length() > 0.1 ||
        state.keys.forward || state.keys.backward || state.keys.left || state.keys.right;

      // 1. 自プレイヤーの位置・状態を相手へ送信
      this.send({
        type: 'PLAYER_STATE',
        x: Math.round(player.group.position.x * 100) / 100,
        z: Math.round(player.group.position.z * 100) / 100,
        rotY: Math.round(player.group.rotation.y * 100) / 100,
        isMoving,
        isDashing: state.isDashing,
        isGuarding: state.isGuarding,
        hp: player.hp,
        maxHp: player.maxHp,
      });

      // 2. ホスト側のみ: 敵のスナップショットをゲストへ送信
      if (state.isHost) {
        this.sendEnemySnapshot();
      }
    }, 50);
  }

  sendEnemySnapshot() {
    const enemyList = [];
    enemyManager.enemies.forEach(e => {
      if (e.isDead) return;
      enemyList.push({
        netId: e.netId,
        type: e.type,
        x: Math.round(e.group.position.x * 100) / 100,
        z: Math.round(e.group.position.z * 100) / 100,
        rotY: Math.round(e.group.rotation.y * 100) / 100,
        hp: e.hp,
        maxHp: e.maxHp,
        isBoss: !!e.isBoss,
        freeze: e.freezeTimer > 0,
      });
    });

    this.send({
      type: 'ENEMY_SNAPSHOT',
      stageIdx: state.currentStageIdx,
      enemies: enemyList,
    });
  }

  sendAttack(comboStep) {
    this.send({
      type: 'PLAYER_ATTACK',
      comboStep,
    });
  }

  sendMagic(magicKey, tier, pos, rotY) {
    this.send({
      type: 'PLAYER_MAGIC',
      magicKey,
      tier,
      x: Math.round(pos.x * 100) / 100,
      z: Math.round(pos.z * 100) / 100,
      rotY: Math.round(rotY * 100) / 100,
    });
  }

  sendEnemyHit(netId, damage, element, isHeavyKnockback) {
    this.send({
      type: 'ENEMY_HIT_REQUEST',
      netId,
      damage,
      element,
      isHeavyKnockback,
    });
  }

  // 受信メッセージ処理
  handleMessage(msg) {
    if (!msg || !msg.type) return;

    switch (msg.type) {
      case 'HELLO':
        this.remotePlayer.show();
        if (msg.hp !== undefined) this.remotePlayer.setHp(msg.hp, msg.maxHp);
        break;

      case 'PLAYER_STATE':
        this.remotePlayer.targetPos.set(msg.x, getTerrainHeight(msg.x, msg.z), msg.z);
        this.remotePlayer.targetRotY = msg.rotY;
        this.remotePlayer.isMoving = msg.isMoving;
        if (msg.isGuarding !== undefined) this.remotePlayer.isGuarding = !!msg.isGuarding;
        if (msg.hp !== undefined) this.remotePlayer.setHp(msg.hp, msg.maxHp);
        break;

      case 'PLAYER_ATTACK':
        this.remotePlayer.triggerAttack(msg.comboStep || 0);
        break;

      case 'PLAYER_MAGIC':
        soundManager.playMagicSound(msg.magicKey, msg.tier || 1);
        magicSystem.cast(msg.magicKey, msg.tier || 1, new THREE.Vector3(msg.x, getTerrainHeight(msg.x, msg.z), msg.z), msg.rotY);
        break;

      case 'ENEMY_SNAPSHOT':
        if (!state.isHost) {
          enemyManager.syncFromSnapshot(msg.enemies, msg.stageIdx);
        }
        break;

      case 'ENEMY_HIT_REQUEST':
        if (state.isHost) {
          const targetEnemy = enemyManager.enemies.find(e => e.netId === msg.netId);
          if (targetEnemy && !targetEnemy.isDead && !targetEnemy.isDying) {
            const hitDir = new THREE.Vector3(0, 0, 1);
            targetEnemy.takeDamage(msg.damage, hitDir, msg.element, msg.isHeavyKnockback);
          }
        }
        break;
    }
  }

  handleDisconnect() {
    this.isConnected = false;
    if (this.sendTimer) clearInterval(this.sendTimer);
    if (this.remotePlayer) this.remotePlayer.hide();

    const p2Card = document.getElementById('p2-status-card');
    if (p2Card) p2Card.classList.add('hidden');
  }

  disconnect() {
    if (this.sendTimer) clearInterval(this.sendTimer);
    if (this.conn) this.conn.close();
    if (this.peer) this.peer.destroy();
    this.isConnected = false;
    state.isMultiplayer = false;
    state.isHost = false;
    if (this.remotePlayer) this.remotePlayer.hide();
  }
}


// =============================================================================
// 7. 魔法システム (5大属性 × 3段階レベル - プレミアム3Dエフェクト)
// =============================================================================
class MagicSystem {
  constructor() {
    this.activeSpells = [];
  }

  cast(element, tier, originPos, playerAngle) {
    const forward = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), playerAngle);

    if (element === 'explosion') {
      this.castExplosion(tier, originPos, forward);
    } else if (element === 'flame') {
      this.castFlame(tier, originPos, forward);
    } else if (element === 'ice') {
      this.castIce(tier, originPos, forward);
    } else if (element === 'wind') {
      this.castWind(tier, originPos, forward);
    } else if (element === 'thunder') {
      this.castThunder(tier, originPos, forward);
    }
  }

  dealAreaDamage(centerPos, radius, baseDamage, element, isHeavyKnockback = false) {
    enemyManager.enemies.forEach((enemy) => {
      if (enemy.isDead || enemy.isDying) return;
      if (enemy.group.position.distanceTo(centerPos) <= radius) {
        const hitDir = new THREE.Vector3().subVectors(enemy.group.position, centerPos).normalize();
        enemy.takeDamage(baseDamage, hitDir, element, isHeavyKnockback);
      }
    });
  }

  // ===========================================================================
  // 💥 爆発魔法 (Explosion) - 地表魔方陣・多重核熱火球・放射火花パーティクル
  // ===========================================================================
  castExplosion(tier, originPos, forward) {
    const radius = tier === 3 ? 11.0 : (tier === 2 ? 6.5 : 4.2);
    const damage = tier === 3 ? 140 : (tier === 2 ? 80 : 45);
    const center = originPos.clone().addScaledVector(forward, tier === 3 ? 5.5 : 4.0);
    center.y = getTerrainHeight(center.x, center.z);

    this.spawnSingleExplosion(center, tier);
    this.dealAreaDamage(center, radius, damage, 'explosion', true);
    cameraController.shake(tier === 3 ? 0.65 : (tier === 2 ? 0.45 : 0.3));

    // Lv2: 0.15秒後に周囲3箇所で連鎖二次爆発
    if (tier === 2) {
      setTimeout(() => {
        for (let i = 0; i < 3; i++) {
          const ang = (i / 3) * Math.PI * 2 + Math.random() * 0.4;
          const subPos = center.clone().add(new THREE.Vector3(Math.cos(ang) * 3.5, 0, Math.sin(ang) * 3.5));
          subPos.y = getTerrainHeight(subPos.x, subPos.z);
          this.spawnSingleExplosion(subPos, 1);
          this.dealAreaDamage(subPos, 3.2, 35, 'explosion', false);
        }
      }, 150);
    }

    // Lv3: 画面フラッシュ ＋ 0.18秒後に超巨大核熱セカンドバースト
    if (tier === 3) {
      const overlay = document.getElementById('damage-overlay');
      if (overlay) {
        overlay.classList.add('is-hit-heavy');
        setTimeout(() => overlay.classList.remove('is-hit-heavy'), 200);
      }
      setTimeout(() => {
        this.spawnSingleExplosion(center.clone().add(new THREE.Vector3(0, 1.5, 0)), 3);
        this.dealAreaDamage(center, 12.0, 70, 'explosion', true);
        cameraController.shake(0.5);
      }, 180);
    }
  }

  spawnSingleExplosion(pos, tier) {
    const spellGroup = new THREE.Group();
    spellGroup.position.copy(pos);
    scene.add(spellGroup);

    // 1. 地表魔方陣 (回転リング)
    const ringGeo = new THREE.RingGeometry(0.5, tier === 3 ? 7.0 : (tier === 2 ? 4.5 : 3.0), 24);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const magicCircle = new THREE.Mesh(ringGeo, ringMat);
    magicCircle.rotation.x = -Math.PI / 2;
    magicCircle.position.y = 0.08;
    spellGroup.add(magicCircle);

    // 2. 核熱プラズマ火球 (ホワイトホット中心 ＋ 外部オレンジ球)
    const coreGeo = new THREE.SphereGeometry(tier === 3 ? 2.5 : 1.4, 16, 16);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    core.position.y = 1.0;
    spellGroup.add(core);

    const outerGeo = new THREE.SphereGeometry(tier === 3 ? 3.8 : 2.2, 16, 16);
    const outerMat = new THREE.MeshBasicMaterial({
      color: 0xf97316,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
    });
    const outer = new THREE.Mesh(outerGeo, outerMat);
    outer.position.y = 1.0;
    spellGroup.add(outer);

    // 3. 膨張衝撃波ドーム
    const domeGeo = new THREE.SphereGeometry(tier === 3 ? 4.8 : 2.8, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.5);
    const domeMat = new THREE.MeshBasicMaterial({
      color: 0xfef08a,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const dome = new THREE.Mesh(domeGeo, domeMat);
    dome.position.y = 0.05;
    spellGroup.add(dome);

    // 4. 放射火花・破片パーティクル群 (16〜28個)
    const sparkCount = tier === 3 ? 32 : (tier === 2 ? 22 : 16);
    const sparks = [];
    const sparkMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24, blending: THREE.AdditiveBlending });
    for (let i = 0; i < sparkCount; i++) {
      const spMesh = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.18), sparkMat);
      spMesh.position.set(0, 1.0, 0);
      spellGroup.add(spMesh);

      const phi = Math.random() * Math.PI * 2;
      const theta = Math.random() * Math.PI * 0.45; // 上方へ放射
      const speed = (tier === 3 ? 22.0 : 14.0) * (0.6 + Math.random() * 0.8);
      const vel = new THREE.Vector3(
        Math.cos(phi) * Math.sin(theta) * speed,
        Math.cos(theta) * speed + 3.0,
        Math.sin(phi) * Math.sin(theta) * speed
      );
      sparks.push({ mesh: spMesh, vel });
    }

    // 5. 瞬間発光ライト
    const light = new THREE.PointLight(0xf97316, tier === 3 ? 5.0 : 3.0, tier === 3 ? 28.0 : 16.0);
    light.position.y = 2.0;
    spellGroup.add(light);

    let life = 0.55;
    this.activeSpells.push({
      update: (delta) => {
        life -= delta;
        const progress = Math.max(0, 1.0 - (life / 0.55));

        // コア膨張とフェード
        core.scale.multiplyScalar(1.0 + delta * 9.0);
        outer.scale.multiplyScalar(1.0 + delta * 7.5);
        dome.scale.multiplyScalar(1.0 + delta * 12.0);

        coreMat.opacity = Math.max(0, (1.0 - progress * 1.5));
        outerMat.opacity = Math.max(0, (1.0 - progress));
        domeMat.opacity = Math.max(0, (1.0 - progress * 1.3));
        ringMat.opacity = Math.max(0, (1.0 - progress * 1.2));
        magicCircle.rotation.z += delta * 4.0;
        magicCircle.scale.multiplyScalar(1.0 + delta * 3.0);

        light.intensity = Math.max(0, (1.0 - progress) * (tier === 3 ? 5.0 : 3.0));

        // 火花物理移動
        sparks.forEach(sp => {
          sp.vel.y -= 38.0 * delta; // 重力
          sp.mesh.position.addScaledVector(sp.vel, delta);
          sp.mesh.scale.multiplyScalar(Math.max(0, 1.0 - delta * 2.5));
        });

        if (life <= 0) {
          scene.remove(spellGroup);
          return false;
        }
        return true;
      }
    });
  }

  // ===========================================================================
  // 🔥 炎魔法 (Flame) - 灼熱火球トレイル / 3連火炎ピラー / 業火の大渦
  // ===========================================================================
  castFlame(tier, originPos, forward) {
    if (tier === 1) {
      // Lv1: ファイアボール (高密度コア + 燃焼トレイル + 衝突爆破)
      const group = new THREE.Group();
      group.position.copy(originPos).add(new THREE.Vector3(0, 1.1, 0));
      scene.add(group);

      const coreMat = new THREE.MeshBasicMaterial({ color: 0xffffff, blending: THREE.AdditiveBlending });
      const flameMat = new THREE.MeshBasicMaterial({ color: 0xef4444, blending: THREE.AdditiveBlending });
      const core = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 12), coreMat);
      const outer = new THREE.Mesh(new THREE.SphereGeometry(0.58, 12, 12), flameMat);
      group.add(core);
      group.add(outer);

      const light = new THREE.PointLight(0xef4444, 2.5, 12.0);
      group.add(light);

      const vel = forward.clone().multiplyScalar(22.0);
      let life = 1.6;
      let trailTimer = 0;

      this.activeSpells.push({
        update: (delta) => {
          life -= delta;
          group.position.addScaledVector(vel, delta);
          core.scale.setScalar(1.0 + Math.sin(life * 30) * 0.15);

          // 炎のトレイル粒子生成
          trailTimer -= delta;
          if (trailTimer <= 0) {
            trailTimer = 0.03;
            this.spawnFlameParticle(group.position);
          }

          // 敵命中判定
          let hit = false;
          enemyManager.enemies.forEach((enemy) => {
            if (!hit && !enemy.isDead && !enemy.isDying && enemy.group.position.distanceTo(group.position) < 1.6) {
              hit = true;
              enemy.takeDamage(35, forward, 'flame', false);
              this.spawnFlameBurst(group.position, 1.8);
            }
          });

          if (hit || life <= 0) {
            if (!hit) this.spawnFlameBurst(group.position, 1.4);
            scene.remove(group);
            return false;
          }
          return true;
        }
      });

    } else if (tier === 2) {
      // Lv2: ファイアピラー (前方3方向に巨大な火炎竜巻柱が噴出)
      for (let i = -1; i <= 1; i++) {
        const offsetAng = i * 0.45;
        const pForward = forward.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), offsetAng);
        const pPos = originPos.clone().addScaledVector(pForward, 4.5);
        pPos.y = getTerrainHeight(pPos.x, pPos.z);
        this.spawnFlamePillar(pPos, 5.0, 65);
      }
      cameraController.shake(0.35);

    } else {
      // Lv3: インフェルノ・フレア (巨大な回転火炎地獄の渦 + 吸引 + 大爆発)
      const center = originPos.clone().addScaledVector(forward, 5.0);
      center.y = getTerrainHeight(center.x, center.z);
      this.spawnInfernoVortex(center, 110);
      cameraController.shake(0.6);
    }
  }

  spawnFlameParticle(pos) {
    const geo = new THREE.SphereGeometry(0.22, 6, 6);
    const mat = new THREE.MeshBasicMaterial({ color: 0xf97316, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pos).add(new THREE.Vector3((Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.3));
    scene.add(mesh);

    let life = 0.3;
    this.activeSpells.push({
      update: (delta) => {
        life -= delta;
        mesh.scale.multiplyScalar(0.92);
        mat.opacity = (life / 0.3) * 0.8;
        if (life <= 0) {
          scene.remove(mesh);
          return false;
        }
        return true;
      }
    });
  }

  spawnFlameBurst(pos, radius) {
    soundManager.playHitImpact(true);
    const burstGroup = new THREE.Group();
    burstGroup.position.copy(pos);
    scene.add(burstGroup);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.3, radius * 1.5, 16),
      new THREE.MeshBasicMaterial({ color: 0xef4444, side: THREE.DoubleSide, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending })
    );
    ring.rotation.x = -Math.PI / 2;
    burstGroup.add(ring);

    for (let i = 0; i < 10; i++) {
      this.spawnFlameParticle(pos);
    }

    let life = 0.35;
    this.activeSpells.push({
      update: (delta) => {
        life -= delta;
        ring.scale.multiplyScalar(1.0 + delta * 6.0);
        ring.material.opacity = (life / 0.35);
        if (life <= 0) {
          scene.remove(burstGroup);
          return false;
        }
        return true;
      }
    });
  }

  spawnFlamePillar(pos, height, damage) {
    const group = new THREE.Group();
    group.position.copy(pos);
    scene.add(group);

    const geo = new THREE.CylinderGeometry(1.2, 1.8, height, 16, 1, true);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xef4444,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const pillar = new THREE.Mesh(geo, mat);
    pillar.position.y = height / 2;
    group.add(pillar);

    const inner = new THREE.Mesh(
      new THREE.CylinderGeometry(0.6, 0.9, height * 1.1, 12, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xfef08a, side: THREE.DoubleSide, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending })
    );
    inner.position.y = height / 2;
    group.add(inner);

    const light = new THREE.PointLight(0xef4444, 3.0, 16.0);
    light.position.y = height / 2;
    group.add(light);

    this.dealAreaDamage(pos, 2.8, damage, 'flame', true);

    let life = 0.8;
    this.activeSpells.push({
      update: (delta) => {
        life -= delta;
        pillar.rotation.y += delta * 12.0;
        inner.rotation.y -= delta * 15.0;
        const s = 1.0 + delta * 2.0;
        pillar.scale.x *= s; pillar.scale.z *= s;
        mat.opacity = Math.min(1.0, (life / 0.8) * 1.2);
        inner.material.opacity = mat.opacity;
        if (life <= 0) {
          scene.remove(group);
          return false;
        }
        return true;
      }
    });
  }

  spawnInfernoVortex(center, damage) {
    const group = new THREE.Group();
    group.position.copy(center);
    scene.add(group);

    // 3重の回転火炎リング
    const rings = [];
    const colors = [0xef4444, 0xf97316, 0xfacc15];
    for (let i = 0; i < 3; i++) {
      const r = new THREE.Mesh(
        new THREE.RingGeometry(2.0 + i * 2.0, 2.8 + i * 2.2, 24),
        new THREE.MeshBasicMaterial({ color: colors[i], side: THREE.DoubleSide, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending })
      );
      r.rotation.x = -Math.PI / 2;
      r.position.y = 0.1 + i * 0.15;
      group.add(r);
      rings.push(r);
    }

    let life = 2.2;
    let hitTimer = 0;

    this.activeSpells.push({
      update: (delta) => {
        life -= delta;
        rings.forEach((r, idx) => {
          r.rotation.z += delta * (idx % 2 === 0 ? 6.0 : -6.0) * (idx + 1);
        });

        // 吸引 ＆ 連続多段ダメージ (0.25秒毎)
        hitTimer -= delta;
        if (hitTimer <= 0) {
          hitTimer = 0.25;
          enemyManager.enemies.forEach(e => {
            if (e.isDead || e.isDying) return;
            const dist = e.group.position.distanceTo(center);
            if (dist < 9.0) {
              // 中心へ吸引
              const pull = new THREE.Vector3().subVectors(center, e.group.position).normalize().multiplyScalar(4.5 * delta);
              e.group.position.add(pull);
              e.takeDamage(Math.floor(damage / 7), pull, 'flame', false);
            }
          });
          cameraController.shake(0.12);
        }

        if (life <= 0) {
          // フィナーレ大爆発
          this.spawnFlamePillar(center, 9.0, 50);
          scene.remove(group);
          return false;
        }
        return true;
      }
    });
  }

  // ===========================================================================
  // ❄️ 氷魔法 (Ice) - 地表氷晶槍 / フロストノヴァ全方位凍結 / 天空巨星氷山
  // ===========================================================================
  castIce(tier, originPos, forward) {
    if (tier === 1) {
      // Lv1: アイススパイク (前方へ5本の氷槍が次々隆起)
      for (let i = 1; i <= 5; i++) {
        setTimeout(() => {
          const p = originPos.clone().addScaledVector(forward, i * 1.6);
          p.y = getTerrainHeight(p.x, p.z);
          this.spawnIceSpike(p, 1.8, 28);
        }, (i - 1) * 70);
      }

    } else if (tier === 2) {
      // Lv2: フロストノヴァ (360度全方位氷晶ドーム + 3秒完全凍結)
      const center = originPos.clone();
      center.y = getTerrainHeight(center.x, center.z);
      this.spawnFrostNova(center, 6.5, 50);
      cameraController.shake(0.35);

    } else {
      // Lv3: アブソリュート・ゼロ (天空巨大氷山落下 + 超広域氷結爆砕)
      const center = originPos.clone().addScaledVector(forward, 5.0);
      center.y = getTerrainHeight(center.x, center.z);
      this.spawnAbsoluteZero(center, 95);
      cameraController.shake(0.7);
    }
  }

  spawnIceSpike(pos, height, damage) {
    const group = new THREE.Group();
    group.position.copy(pos);
    scene.add(group);

    const spikeGeo = new THREE.ConeGeometry(0.45, height, 6);
    const spikeMat = new THREE.MeshStandardMaterial({
      color: 0xa5f3fc,
      emissive: 0x0284c7,
      emissiveIntensity: 0.7,
      roughness: 0.1,
      metalness: 0.8,
      transparent: true,
      opacity: 0.95,
    });
    const spike = new THREE.Mesh(spikeGeo, spikeMat);
    spike.position.y = -height; // 地下から突き出す
    spike.rotation.x = (Math.random() - 0.5) * 0.3;
    spike.rotation.z = (Math.random() - 0.5) * 0.3;
    group.add(spike);

    this.dealAreaDamage(pos, 2.0, damage, 'ice');
    enemyManager.enemies.forEach(e => {
      if (e.group.position.distanceTo(pos) < 2.0) e.freeze(1.8);
    });

    let life = 1.4;
    let upProgress = 0;
    this.activeSpells.push({
      update: (delta) => {
        life -= delta;
        if (upProgress < 1.0) {
          upProgress = Math.min(1.0, upProgress + delta * 9.0);
          spike.position.y = -height + upProgress * (height * 1.5);
        }
        if (life < 0.4) {
          spikeMat.opacity = (life / 0.4) * 0.95;
        }
        if (life <= 0) {
          scene.remove(group);
          return false;
        }
        return true;
      }
    });
  }

  spawnFrostNova(center, radius, damage) {
    const group = new THREE.Group();
    group.position.copy(center);
    scene.add(group);

    // 氷結魔法陣
    const circle = new THREE.Mesh(
      new THREE.RingGeometry(0.5, radius, 32),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending })
    );
    circle.rotation.x = -Math.PI / 2;
    circle.position.y = 0.08;
    group.add(circle);

    // 放射状12本の氷槍
    const spikes = [];
    const spikeMat = new THREE.MeshStandardMaterial({
      color: 0xbae6fd,
      emissive: 0x0284c7,
      emissiveIntensity: 0.6,
      roughness: 0.1,
      metalness: 0.9,
    });
    for (let i = 0; i < 12; i++) {
      const ang = (i / 12) * Math.PI * 2;
      const sp = new THREE.Mesh(new THREE.ConeGeometry(0.4, 3.2, 5), spikeMat);
      sp.position.set(Math.cos(ang) * (radius * 0.65), 0, Math.sin(ang) * (radius * 0.65));
      sp.rotation.z = -Math.cos(ang) * 0.35;
      sp.rotation.x = Math.sin(ang) * 0.35;
      group.add(sp);
      spikes.push(sp);
    }

    this.dealAreaDamage(center, radius, damage, 'ice');
    enemyManager.enemies.forEach(e => {
      if (e.group.position.distanceTo(center) <= radius) e.freeze(3.5);
    });

    let life = 1.8;
    this.activeSpells.push({
      update: (delta) => {
        life -= delta;
        circle.rotation.z += delta * 2.0;
        circle.scale.multiplyScalar(1.0 + delta * 0.8);
        circle.material.opacity = Math.min(1.0, (life / 1.8));

        if (life < 0.6) {
          const fade = life / 0.6;
          spikes.forEach(s => s.scale.setScalar(fade));
        }

        if (life <= 0) {
          scene.remove(group);
          return false;
        }
        return true;
      }
    });
  }

  spawnAbsoluteZero(center, damage) {
    const group = new THREE.Group();
    group.position.copy(center);
    scene.add(group);

    // 天空超巨大氷山 (巨大クリスタル群)
    const bergGeo = new THREE.ConeGeometry(3.5, 9.0, 8);
    const bergMat = new THREE.MeshStandardMaterial({
      color: 0xe0f2fe,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.85,
      roughness: 0.05,
      metalness: 0.9,
      transparent: true,
      opacity: 0.95,
    });
    const iceberg = new THREE.Mesh(bergGeo, bergMat);
    iceberg.position.set(0, 32.0, 0); // 天空32mから降下
    iceberg.rotation.x = Math.PI; // 逆さで突き刺さる
    group.add(iceberg);

    const shadowRing = new THREE.Mesh(
      new THREE.RingGeometry(1.0, 9.0, 32),
      new THREE.MeshBasicMaterial({ color: 0x0284c7, side: THREE.DoubleSide, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending })
    );
    shadowRing.rotation.x = -Math.PI / 2;
    shadowRing.position.y = 0.1;
    group.add(shadowRing);

    let fallen = false;
    let life = 2.5;

    this.activeSpells.push({
      update: (delta) => {
        life -= delta;

        if (!fallen) {
          iceberg.position.y -= 75.0 * delta; // 超速落下
          shadowRing.rotation.z += delta * 4.0;

          if (iceberg.position.y <= 3.0) {
            fallen = true;
            iceberg.position.y = 3.0;

            // 激突爆発！
            soundManager.playHitImpact(true);
            cameraController.shake(0.85);
            this.spawnFrostNova(center, 9.5, damage);

            // 画面ホワイトフラッシュ
            const overlay = document.getElementById('damage-overlay');
            if (overlay) {
              overlay.classList.add('is-hit-heavy');
              setTimeout(() => overlay.classList.remove('is-hit-heavy'), 250);
            }
          }
        } else {
          // 着弾後の氷山砕散フェード
          bergMat.opacity = Math.max(0, life / 1.5);
          iceberg.scale.multiplyScalar(1.0 + delta * 0.3);
        }

        if (life <= 0) {
          scene.remove(group);
          return false;
        }
        return true;
      }
    });
  }

  // ===========================================================================
  // 🌪️ 風魔法 (Wind) - 3連真空刃 / 暴風竜巻トルネード / 全天嵐結界
  // ===========================================================================
  castWind(tier, originPos, forward) {
    if (tier === 1) {
      // Lv1: ウインドカッター (3連射するエメラルド真空刃)
      for (let i = 0; i < 3; i++) {
        setTimeout(() => {
          this.spawnWindCutter(originPos, forward, (i - 1) * 0.25, 30);
        }, i * 90);
      }

    } else if (tier === 2) {
      // Lv2: ゲイルスラッシュ (暴風竜巻ピラーが前進しながら敵を集敵)
      this.spawnTornado(originPos, forward, 55);
      cameraController.shake(0.35);

    } else {
      // Lv3: タイフーン・テンペスト (全天を覆う嵐の結界 + 4重回転真空刃)
      const center = originPos.clone();
      center.y = getTerrainHeight(center.x, center.z);
      this.spawnTyphoonTempest(center, 90);
      cameraController.shake(0.65);
    }
  }

  spawnWindCutter(originPos, forward, angleOffset, damage) {
    const group = new THREE.Group();
    group.position.copy(originPos).add(new THREE.Vector3(0, 1.1, 0));
    scene.add(group);

    const dir = forward.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), angleOffset);

    // 三日月カッター刃
    const bladeGeo = new THREE.RingGeometry(0.6, 1.5, 16, 1, 0, Math.PI * 0.85);
    const bladeMat = new THREE.MeshBasicMaterial({
      color: 0x34d399,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending,
    });
    const blade = new THREE.Mesh(bladeGeo, bladeMat);
    blade.rotation.x = Math.PI / 2;
    group.add(blade);

    const vel = dir.clone().multiplyScalar(24.0);
    let life = 1.3;

    this.activeSpells.push({
      update: (delta) => {
        life -= delta;
        group.position.addScaledVector(vel, delta);
        blade.rotation.z += delta * 25.0; // 超高速回転

        // 貫通当たり判定
        enemyManager.enemies.forEach(e => {
          if (!e.isDead && !e.isDying && e.group.position.distanceTo(group.position) < 1.8) {
            e.takeDamage(damage, dir, 'wind', false);
          }
        });

        if (life <= 0) {
          scene.remove(group);
          return false;
        }
        return true;
      }
    });
  }

  spawnTornado(originPos, forward, damage) {
    const group = new THREE.Group();
    group.position.copy(originPos).add(new THREE.Vector3(0, 0, 0));
    scene.add(group);

    // 竜巻シリンダー (多段コーン)
    const torGeo = new THREE.CylinderGeometry(2.4, 0.6, 6.0, 16, 1, true);
    const torMat = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const tornado = new THREE.Mesh(torGeo, torMat);
    tornado.position.y = 3.0;
    group.add(tornado);

    const innerTor = new THREE.Mesh(
      new THREE.CylinderGeometry(1.6, 0.3, 6.5, 12, 1, true),
      new THREE.MeshBasicMaterial({ color: 0x6ee7b7, side: THREE.DoubleSide, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending })
    );
    innerTor.position.y = 3.25;
    group.add(innerTor);

    const vel = forward.clone().multiplyScalar(12.0);
    let life = 2.0;
    let hitTimer = 0;

    this.activeSpells.push({
      update: (delta) => {
        life -= delta;
        group.position.addScaledVector(vel, delta);
        group.position.y = getTerrainHeight(group.position.x, group.position.z);

        tornado.rotation.y += delta * 16.0;
        innerTor.rotation.y -= delta * 20.0;

        hitTimer -= delta;
        if (hitTimer <= 0) {
          hitTimer = 0.2;
          enemyManager.enemies.forEach(e => {
            if (e.isDead || e.isDying) return;
            const dist = e.group.position.distanceTo(group.position);
            if (dist < 4.0) {
              const pull = new THREE.Vector3().subVectors(group.position, e.group.position).normalize().multiplyScalar(3.0 * delta);
              e.group.position.add(pull);
              e.takeDamage(Math.floor(damage / 5), forward, 'wind', false);
            }
          });
        }

        if (life <= 0) {
          scene.remove(group);
          return false;
        }
        return true;
      }
    });
  }

  spawnTyphoonTempest(center, damage) {
    const group = new THREE.Group();
    group.position.copy(center);
    scene.add(group);

    // 4重回転大風陣
    const rings = [];
    for (let i = 0; i < 4; i++) {
      const r = new THREE.Mesh(
        new THREE.RingGeometry(2.5 + i * 2.0, 3.5 + i * 2.2, 24),
        new THREE.MeshBasicMaterial({ color: i % 2 === 0 ? 0x10b981 : 0x6ee7b7, side: THREE.DoubleSide, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending })
      );
      r.rotation.x = -Math.PI / 2;
      r.position.y = 0.2 + i * 0.3;
      group.add(r);
      rings.push(r);
    }

    this.dealAreaDamage(center, 10.0, damage, 'wind', true);

    let life = 1.8;
    this.activeSpells.push({
      update: (delta) => {
        life -= delta;
        rings.forEach((r, idx) => {
          r.rotation.z += delta * (idx % 2 === 0 ? 8.0 : -8.0);
          r.scale.multiplyScalar(1.0 + delta * 1.2);
          r.material.opacity = (life / 1.8) * 0.8;
        });

        if (life <= 0) {
          scene.remove(group);
          return false;
        }
        return true;
      }
    });
  }

  // ===========================================================================
  // ⚡ 雷魔法 (Thunder) - ジグザグプラズマ雷撃 / 連鎖放電 / 神鳴トールハンマー
  // ===========================================================================
  castThunder(tier, originPos, forward) {
    if (tier === 1) {
      // Lv1: サンダーボルト (ジグザグ放電プラズマビーム)
      const targetPos = originPos.clone().addScaledVector(forward, 12.0);
      targetPos.y = getTerrainHeight(targetPos.x, targetPos.z) + 1.0;
      this.spawnLightningBolt(originPos.clone().add(new THREE.Vector3(0, 1.2, 0)), targetPos, 0xfacc15, 38);
      cameraController.shake(0.25);

    } else if (tier === 2) {
      // Lv2: チェインライトニング (敵から敵へ最大5回跳躍連鎖放電)
      this.spawnChainLightning(originPos, 5, 60);
      cameraController.shake(0.35);

    } else {
      // Lv3: 神鳴・トールハンマー (天空雷雲 + 神雷槌直撃 + 大地プラズマグリッド)
      const center = originPos.clone().addScaledVector(forward, 5.0);
      center.y = getTerrainHeight(center.x, center.z);
      this.spawnThorHammer(center, 120);
      cameraController.shake(0.7);
    }
  }

  spawnLightningBolt(startPos, endPos, colorHex, damage) {
    const points = [];
    const segments = 8;
    const dir = new THREE.Vector3().subVectors(endPos, startPos);
    const len = dir.length();

    points.push(startPos.clone());
    for (let i = 1; i < segments; i++) {
      const p = startPos.clone().addScaledVector(dir, i / segments);
      p.x += (Math.random() - 0.5) * 1.2;
      p.y += (Math.random() - 0.5) * 1.2;
      p.z += (Math.random() - 0.5) * 1.2;
      points.push(p);
    }
    points.push(endPos.clone());

    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({ color: colorHex, linewidth: 3 });
    const line = new THREE.Line(geo, mat);
    scene.add(line);

    // 雷撃の光
    const light = new THREE.PointLight(colorHex, 4.0, 14.0);
    light.position.copy(endPos);
    scene.add(light);

    // 直線上の敵にダメージ
    enemyManager.enemies.forEach(e => {
      if (e.isDead || e.isDying) return;
      const d = e.group.position.distanceTo(endPos);
      if (d < 3.0) {
        e.takeDamage(damage, dir.normalize(), 'thunder');
      }
    });

    let life = 0.25;
    this.activeSpells.push({
      update: (delta) => {
        life -= delta;
        line.visible = Math.random() > 0.2; // 稲妻の点滅
        if (life <= 0) {
          scene.remove(line);
          scene.remove(light);
          return false;
        }
        return true;
      }
    });
  }

  spawnChainLightning(originPos, maxChains, damage) {
    const hitEnemies = [];
    let currentPos = originPos.clone().add(new THREE.Vector3(0, 1.2, 0));

    for (let i = 0; i < maxChains; i++) {
      let closest = null;
      let closestDist = 14.0;

      enemyManager.enemies.forEach(e => {
        if (e.isDead || e.isDying || hitEnemies.includes(e)) return;
        const d = e.group.position.distanceTo(currentPos);
        if (d < closestDist) {
          closestDist = d;
          closest = e;
        }
      });

      if (!closest) break;
      hitEnemies.push(closest);

      const targetPos = closest.group.position.clone().add(new THREE.Vector3(0, 1.0, 0));
      this.spawnLightningBolt(currentPos, targetPos, 0x38bdf8, damage);
      currentPos = targetPos;
    }
  }

  spawnThorHammer(center, damage) {
    const group = new THREE.Group();
    group.position.copy(center);
    scene.add(group);

    // 天空から垂直に落雷する巨大神雷柱 (Cylinder)
    const boltGeo = new THREE.CylinderGeometry(0.8, 1.4, 28.0, 12);
    const boltMat = new THREE.MeshBasicMaterial({
      color: 0xfffbeb,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
    });
    const bolt = new THREE.Mesh(boltGeo, boltMat);
    bolt.position.y = 14.0;
    group.add(bolt);

    const outerBolt = new THREE.Mesh(
      new THREE.CylinderGeometry(1.8, 2.8, 28.0, 12),
      new THREE.MeshBasicMaterial({ color: 0xfacc15, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending })
    );
    outerBolt.position.y = 14.0;
    group.add(outerBolt);

    // 地面のプラズマグリッド放電リング
    const grid = new THREE.Mesh(
      new THREE.RingGeometry(1.0, 10.5, 32),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending })
    );
    grid.rotation.x = -Math.PI / 2;
    grid.position.y = 0.1;
    group.add(grid);

    const light = new THREE.PointLight(0xfacc15, 6.0, 30.0);
    light.position.y = 2.0;
    group.add(light);

    // 画面フラッシュ
    const overlay = document.getElementById('damage-overlay');
    if (overlay) {
      overlay.classList.add('is-hit-heavy');
      setTimeout(() => overlay.classList.remove('is-hit-heavy'), 280);
    }

    this.dealAreaDamage(center, 10.5, damage, 'thunder', true);

    let life = 0.65;
    this.activeSpells.push({
      update: (delta) => {
        life -= delta;
        bolt.visible = Math.random() > 0.15;
        outerBolt.visible = bolt.visible;
        grid.rotation.z += delta * 8.0;
        grid.scale.multiplyScalar(1.0 + delta * 2.5);

        const fade = Math.max(0, life / 0.65);
        boltMat.opacity = fade;
        outerBolt.material.opacity = fade * 0.8;
        grid.material.opacity = fade * 0.9;
        light.intensity = fade * 6.0;

        if (life <= 0) {
          scene.remove(group);
          return false;
        }
        return true;
      }
    });
  }

  update(delta) {
    for (let i = this.activeSpells.length - 1; i >= 0; i--) {
      if (!this.activeSpells[i].update(delta)) {
        this.activeSpells.splice(i, 1);
      }
    }
  }
}


// =============================================================================
// 8. 敵モンスター基底クラス ＆ コリジョン半径
// =============================================================================
class Enemy {
  constructor(type, maxHp, speed, attackDmg, radius, weakness, resistance, coinReward) {
    this.type = type;
    this.maxHp = maxHp;
    this.hp = maxHp;
    this.speed = speed;
    this.attackDmg = attackDmg;
    this.radius = radius; // コリジョン半径
    this.weakness = weakness;
    this.resistance = resistance;
    this.coinReward = coinReward;
    this.netId = ''; // ネットワーク識別ID

    this.group = new THREE.Group();
    this.isDead = false;
    this.isDying = false;
    this.dyingTimer = 0;
    this.freezeTimer = 0;
    this.knockbackVelocity = new THREE.Vector3();

    this.createHpBarSprite();
  }

  createHpBarSprite() {
    this.hpCanvas = document.createElement('canvas');
    this.hpCanvas.width = 128;
    this.hpCanvas.height = 32;
    this.hpCtx = this.hpCanvas.getContext('2d');

    this.hpTex = new THREE.CanvasTexture(this.hpCanvas);
    const spriteMat = new THREE.SpriteMaterial({ map: this.hpTex, transparent: true });
    this.hpSprite = new THREE.Sprite(spriteMat);
    this.hpSprite.scale.set(1.4, 0.35, 1.0);
    this.hpSprite.position.y = 2.4;
    this.group.add(this.hpSprite);

    this.updateHpBar();
  }

  updateHpBar() {
    const ctx = this.hpCtx;
    ctx.clearRect(0, 0, 128, 32);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(4, 4, 120, 24);

    const ratio = Math.max(0, this.hp / this.maxHp);
    ctx.fillStyle = ratio > 0.5 ? '#22c55e' : (ratio > 0.25 ? '#eab308' : '#ef4444');
    ctx.fillRect(6, 6, Math.floor(116 * ratio), 20);

    const weakIcon = this.weakness === 'flame' ? '🔥' : (this.weakness === 'thunder' ? '⚡' : (this.weakness === 'explosion' ? '💥' : (this.weakness === 'ice' ? '❄️' : '🌪️')));
    ctx.font = 'bold 16px sans-serif';
    ctx.fillStyle = '#fef08a';
    ctx.fillText(`弱点:${weakIcon}`, 8, 22);

    this.hpTex.needsUpdate = true;
  }

  freeze(duration) { this.freezeTimer = duration; }

  takeDamage(amount, hitDir, element = null, isHeavyKnockback = false) {
    if (this.isDead || this.isDying) return;

    // ゲストプレイ時はホストへヒットリクエストを送信して委任
    if (state.isMultiplayer && !state.isHost && networkManager && this.netId) {
      networkManager.sendEnemyHit(this.netId, amount, element, isHeavyKnockback);
      showDamagePopup(this.group.position, amount, 'normal');
      return;
    }

    let finalDamage = amount;
    let affinityType = 'normal';

    if (element) {
      if (element === this.weakness) {
        finalDamage = Math.floor(amount * 1.75);
        affinityType = 'weak';
        soundManager.playWeakHit();
      } else if (element === this.resistance) {
        finalDamage = Math.max(1, Math.floor(amount * 0.5));
        affinityType = 'resist';
      }
    }

    this.hp = Math.max(0, this.hp - finalDamage);
    this.updateHpBar();
    showDamagePopup(this.group.position, finalDamage, affinityType);

    if (this.hp <= 0) {
      this.die(hitDir, isHeavyKnockback);
    }
  }

  update(delta, playerPos) {
    if (this.isDead) return;

    if (this.isDying) {
      this.dyingTimer += delta;
      this.group.position.addScaledVector(this.knockbackVelocity, delta);
      if (this.dyingTimer >= 0.8) {
        this.isDead = true;
        scene.remove(this.group);
      }
      return;
    }

    if (this.freezeTimer > 0) {
      this.freezeTimer -= delta;
      return;
    }

    const dir = new THREE.Vector3().subVectors(playerPos, this.group.position);
    dir.y = 0;
    const dist = dir.length();

    if (dist > 1.2) {
      dir.normalize();
      this.group.position.addScaledVector(dir, this.speed * delta);
      this.group.rotation.y = Math.atan2(dir.x, dir.z);
    } else {
      player.takeDamage(this.attackDmg, this.group.position);
    }
  }

  die(hitDir, isHeavyKnockback = false) {
    if (this.isDying || this.isDead) return;
    this.isDying = true;
    this.dyingTimer = 0;

    const force = isHeavyKnockback ? 10.0 : 6.0;
    this.knockbackVelocity.set(hitDir.x * force, 4.0, hitDir.z * force);

    state.kills++;
    state.coins += this.coinReward;
    saveData.coins = state.coins;
    SaveManager.save(saveData);

    updateHUD(this.group.position, `+${this.coinReward}🪙`);

    if (this.isBoss) {
      // ボス撃破: 雄たけびSE → ステージクリア
      soundManager.playBossRoar();
      setTimeout(() => stageManager.onBossDefeated(), 600); // 叫びの後に演出開始
    } else {
      stageManager.onRegularKill();
    }
  }
}

// =============================================================================
// モンスター横共通ヒールパーツビルダー関数
// =============================================================================

/**
 * キャラクターの足を作成するヘルパー
 * @param {THREE.Group} group - 足を追加する親グループ
 * @param {THREE.Material} legMat - 足のマテリアル
 * @param {THREE.Material} bootMat - 靴のマテリアル
 * @param {number} legW - 足の幅
 * @param {number} legH - 足の高さ
 * @param {number} baseY - 足を配置するY座標
 * @returns {{ leftLeg, rightLeg }}
 */
function buildLegs(group, legMat, bootMat, legW, legH, baseY) {
  const legGeo  = new THREE.BoxGeometry(legW, legH, legW);
  const bootGeo = new THREE.BoxGeometry(legW * 1.1, legH * 0.3, legW * 1.4);

  const leftLeg  = new THREE.Mesh(legGeo, legMat);
  const rightLeg = new THREE.Mesh(legGeo, legMat);
  leftLeg.position.set(-legW * 0.6, baseY, 0);
  rightLeg.position.set(legW * 0.6, baseY, 0);
  leftLeg.castShadow = rightLeg.castShadow = true;
  group.add(leftLeg);
  group.add(rightLeg);

  if (bootMat) {
    const lb = new THREE.Mesh(bootGeo, bootMat);
    lb.position.set(0, -legH * 0.6, legW * 0.2);
    leftLeg.add(lb);
    const rb = new THREE.Mesh(bootGeo, bootMat);
    rb.position.set(0, -legH * 0.6, legW * 0.2);
    rightLeg.add(rb);
  }
  return { leftLeg, rightLeg };
}

// ゾンビ (弱点: 炎, 耐性: 氷) - 腐敗した人体型
class ZombieEnemy extends Enemy {
  constructor() {
    super('zombie', 35, 2.2, 10, 0.7, 'flame', 'ice', 10);

    const skinMat  = new THREE.MeshStandardMaterial({ color: 0x2d5a27, roughness: 0.95, metalness: 0.0 });
    const rotMat   = new THREE.MeshStandardMaterial({ color: 0x1a3a17, roughness: 1.0, metalness: 0.0 });
    const eyeMat   = new THREE.MeshStandardMaterial({ color: 0xff4400, emissive: 0xff2200, emissiveIntensity: 0.8, roughness: 0.0 });
    const clothMat = new THREE.MeshStandardMaterial({ color: 0x3d2b1f, roughness: 0.9, metalness: 0.0 });
    const boneMat  = new THREE.MeshStandardMaterial({ color: 0xd4c5a0, roughness: 0.85 });

    // 足
    const { leftLeg, rightLeg } = buildLegs(this.group, clothMat, rotMat, 0.22, 0.48, 0.24);
    this.leftLeg = leftLeg;
    this.rightLeg = rightLeg;

    // 胴
    this.body = new THREE.Group();
    this.body.position.y = 0.75;
    this.group.add(this.body);

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.64, 0.38), clothMat);
    torso.position.y = 0.1;
    torso.castShadow = true;
    this.body.add(torso);

    // 暲んだ左腕 (歩十小身のリアリティ)
    const lArm = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.55, 0.18), skinMat);
    lArm.position.set(-0.42, 0.05, 0);
    lArm.rotation.z = 0.3;
    lArm.castShadow = true;
    this.body.add(lArm);

    // 右腕 (伸びている)
    const rArm = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.58, 0.18), skinMat);
    rArm.position.set(0.42, 0.2, 0.1);
    rArm.rotation.z = -0.5;
    rArm.rotation.x = -0.4;
    rArm.castShadow = true;
    this.body.add(rArm);

    // 首
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.16, 8), skinMat);
    neck.position.y = 0.46;
    this.body.add(neck);

    // 頂骨
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), skinMat);
    skull.position.y = 0.65;
    skull.scale.set(1.0, 1.1, 0.95);
    skull.castShadow = true;
    this.body.add(skull);

    // 下顔 (jaw)
    const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.1, 0.22), skinMat);
    jaw.position.set(0, 0.47, 0.06);
    this.body.add(jaw);

    // 腐った肉 (spot)
    const spot1 = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), rotMat);
    spot1.position.set(-0.06, 0.6, 0.19);
    this.body.add(spot1);

    // 目
    const eyeGeo = new THREE.SphereGeometry(0.048, 8, 6);
    const lEye = new THREE.Mesh(eyeGeo, eyeMat);
    lEye.position.set(-0.08, 0.67, 0.2);
    this.body.add(lEye);
    const rEye = new THREE.Mesh(eyeGeo, eyeMat);
    rEye.position.set(0.08, 0.67, 0.2);
    this.body.add(rEye);

    // 骨の欲片 (墚骨)
    const rib = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.018, 6, 12, Math.PI), boneMat);
    rib.position.set(0, 0.15, 0.18);
    rib.rotation.x = -Math.PI / 2;
    this.body.add(rib);

    // HPスプライトを高く設定
    this.hpSprite.position.y = 2.6;
    this.group.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  }
}

// ゴースト (弱点: 雷, 耐性: 風) - 半透明の幽霊型
class GhostEnemy extends Enemy {
  constructor() {
    super('ghost', 25, 3.2, 12, 0.65, 'thunder', 'wind', 15);

    const ghostMat  = new THREE.MeshStandardMaterial({
      color: 0xb8eeff, emissive: 0x60b8e0, emissiveIntensity: 0.4,
      transparent: true, opacity: 0.72,
      roughness: 0.0, metalness: 0.0,
    });
    const eyeMat = new THREE.MeshStandardMaterial({
      color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 1.5,
      roughness: 0.0,
    });
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x90e0ff, emissive: 0x38bdf8, emissiveIntensity: 0.9,
      transparent: true, opacity: 0.6,
    });

    // ドレープ (鏈)
    const drapeGeo = new THREE.ConeGeometry(0.45, 1.1, 10, 1, true);
    const drape = new THREE.Mesh(drapeGeo, ghostMat);
    drape.position.y = 0.75;
    drape.castShadow = true;
    this.group.add(drape);

    // 上半身 (corpo) - 圆形
    const bodyGeo = new THREE.SphereGeometry(0.38, 12, 10);
    const ghostBody = new THREE.Mesh(bodyGeo, ghostMat);
    ghostBody.position.y = 1.6;
    ghostBody.scale.set(1.0, 1.2, 0.9);
    ghostBody.castShadow = true;
    this.group.add(ghostBody);
    this.body = ghostBody; // 移動アニメ用

    // 首
    const headGeo = new THREE.SphereGeometry(0.28, 12, 10);
    const ghostHead = new THREE.Mesh(headGeo, ghostMat);
    ghostHead.position.y = 2.28;
    ghostHead.scale.set(1.0, 1.15, 0.92);
    this.group.add(ghostHead);

    // 目 (2つの白点)
    const eyeGeo = new THREE.SphereGeometry(0.065, 8, 6);
    const lEye = new THREE.Mesh(eyeGeo, eyeMat);
    lEye.position.set(-0.1, 2.34, 0.24);
    this.group.add(lEye);
    const rEye = new THREE.Mesh(eyeGeo, eyeMat);
    rEye.position.set(0.1, 2.34, 0.24);
    this.group.add(rEye);

    // 口 (最大に銃んでいる橙形)
    const mouthGeo = new THREE.TorusGeometry(0.09, 0.025, 8, 10, Math.PI);
    const mouthMat = new THREE.MeshStandardMaterial({ color: 0x1a1a2e, roughness: 1.0 });
    const mouth = new THREE.Mesh(mouthGeo, mouthMat);
    mouth.position.set(0, 2.18, 0.26);
    mouth.rotation.x = -Math.PI / 2;
    this.group.add(mouth);

    // 中心の光源 (energy core)
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), coreMat);
    core.position.y = 1.6;
    this.group.add(core);

    const coreLight = new THREE.PointLight(0x38bdf8, 1.0, 3.0);
    coreLight.position.y = 1.6;
    this.group.add(coreLight);
    this.coreLight = coreLight;

    // HPスプライトを高く設定
    this.hpSprite.position.y = 3.0;
    this.group.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  }

  update(delta, playerPos) {
    // コアライトのパルスアニメ
    if (this.coreLight) {
      this.coreLight.intensity = 0.8 + Math.sin(Date.now() * 0.004) * 0.4;
    }
    // 浮遊アニメ (上下に色々赳る)
    if (this.body) {
      this.body.position.y = 1.6 + Math.sin(Date.now() * 0.003) * 0.18;
    }
    super.update(delta, playerPos);
  }
}

// ゴブリン (弱点: 爆発, 耐性: 雷) - 小柄な株
class GoblinEnemy extends Enemy {
  constructor() {
    super('goblin', 30, 3.6, 15, 0.6, 'explosion', 'thunder', 15);

    const skinMat   = new THREE.MeshStandardMaterial({ color: 0x4a7c00, roughness: 0.85, metalness: 0.0 });
    const darkMat   = new THREE.MeshStandardMaterial({ color: 0x2d5200, roughness: 0.9 });
    const eyeMat    = new THREE.MeshStandardMaterial({ color: 0xff8800, emissive: 0xff5500, emissiveIntensity: 0.6 });
    const loinMat   = new THREE.MeshStandardMaterial({ color: 0x5c3d1e, roughness: 0.95 });
    const metalMat  = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.35, metalness: 0.8 });

    // 小さな足
    const { leftLeg, rightLeg } = buildLegs(this.group, darkMat, loinMat, 0.18, 0.38, 0.19);
    this.leftLeg = leftLeg;
    this.rightLeg = rightLeg;

    // 胴
    this.body = new THREE.Group();
    this.body.position.y = 0.62;
    this.group.add(this.body);

    // 腹部 (さしてる)
    const belly = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 8), skinMat);
    belly.position.set(0, 0.1, 0.06);
    belly.scale.set(1.15, 1.0, 1.1);
    belly.castShadow = true;
    this.body.add(belly);

    // 胴 (胹)
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.52, 0.32), skinMat);
    torso.position.y = 0.1;
    torso.castShadow = true;
    this.body.add(torso);

    // 左腕
    const lArm = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.085, 0.44, 8), skinMat);
    lArm.position.set(-0.32, 0.06, 0);
    lArm.rotation.z = 0.25;
    this.body.add(lArm);

    // 右腕 (武器持ち)
    const rArm = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.085, 0.44, 8), skinMat);
    rArm.position.set(0.32, 0.06, 0);
    rArm.rotation.z = -0.25;
    this.body.add(rArm);

    // 粗末な短刀
    const dagger = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.32, 0.02), metalMat);
    dagger.position.set(0.46, -0.12, 0.1);
    dagger.rotation.z = -0.3;
    this.body.add(dagger);

    // 首
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.1, 0.12, 8), skinMat);
    neck.position.y = 0.4;
    this.body.add(neck);

    // 頂骨 (大きな頭)
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 8), skinMat);
    head.position.y = 0.6;
    head.scale.set(1.0, 1.05, 1.0);
    head.castShadow = true;
    this.body.add(head);

    // 大きな耳 (左)
    const earGeo = new THREE.ConeGeometry(0.075, 0.25, 7);
    const leftEar = new THREE.Mesh(earGeo, skinMat);
    leftEar.position.set(-0.26, 0.62, 0);
    leftEar.rotation.z = Math.PI * 0.8;
    this.body.add(leftEar);
    // 大きな耳 (右)
    const rightEar = new THREE.Mesh(earGeo, skinMat);
    rightEar.position.set(0.26, 0.62, 0);
    rightEar.rotation.z = -Math.PI * 0.8;
    this.body.add(rightEar);

    // 目
    const eyeGeo = new THREE.SphereGeometry(0.048, 8, 6);
    const lEye = new THREE.Mesh(eyeGeo, eyeMat);
    lEye.position.set(-0.08, 0.63, 0.22);
    this.body.add(lEye);
    const rEye = new THREE.Mesh(eyeGeo, eyeMat);
    rEye.position.set(0.08, 0.63, 0.22);
    this.body.add(rEye);

    // 牙
    const toothGeo = new THREE.ConeGeometry(0.024, 0.1, 5);
    const toothMat = new THREE.MeshStandardMaterial({ color: 0xfff8e7, roughness: 0.5 });
    const lt = new THREE.Mesh(toothGeo, toothMat);
    lt.position.set(-0.055, 0.52, 0.23);
    lt.rotation.x = Math.PI;
    this.body.add(lt);
    const rt = new THREE.Mesh(toothGeo, toothMat);
    rt.position.set(0.055, 0.52, 0.23);
    rt.rotation.x = Math.PI;
    this.body.add(rt);

    this.hpSprite.position.y = 2.2;
    this.group.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  }
}

// キングゴブリン (中ボス: 弱点: 氷, 耐性: 爆発) - 重厘な王者
class KingGoblinEnemy extends Enemy {
  constructor() {
    super('king_goblin', 200, 1.8, 25, 1.9, 'ice', 'explosion', 80);
    this.isBoss = true;

    const skinMat  = new THREE.MeshStandardMaterial({ color: 0x2d5c00, roughness: 0.75, metalness: 0.0 });
    const armorMat = new THREE.MeshStandardMaterial({ color: 0x8b7355, roughness: 0.3, metalness: 0.8 });
    const goldMat  = new THREE.MeshStandardMaterial({ color: 0xffd700, emissive: 0xaa8800, emissiveIntensity: 0.5, roughness: 0.15, metalness: 0.95 });
    const eyeMat   = new THREE.MeshStandardMaterial({ color: 0xff4400, emissive: 0xff2200, emissiveIntensity: 1.2 });
    const capeMat  = new THREE.MeshStandardMaterial({ color: 0x6b0000, roughness: 0.85 });

    // 大きな足
    const { leftLeg, rightLeg } = buildLegs(this.group, armorMat, null, 0.38, 0.72, 0.36);
    this.leftLeg = leftLeg;
    this.rightLeg = rightLeg;

    // パンツ部分
    const pants = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.4, 0.58), capeMat);
    pants.position.y = 0.76;
    this.group.add(pants);

    // 胴
    this.body = new THREE.Group();
    this.body.position.y = 1.2;
    this.group.add(this.body);

    // 胴アーマー (重厘)
    const torsoArmor = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.9, 0.68), armorMat);
    torsoArmor.position.y = 0.1;
    torsoArmor.castShadow = true;
    this.body.add(torsoArmor);

    // 胸こばの金觉装飾
    const chestDeco = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.5, 0.12), goldMat);
    chestDeco.position.set(0, 0.2, 0.34);
    this.body.add(chestDeco);

    // 肩スパイク (左)
    const spikeGeo = new THREE.ConeGeometry(0.06, 0.3, 6);
    for (let i = -1; i <= 1; i += 2) {
      const spike = new THREE.Mesh(spikeGeo, goldMat);
      spike.position.set(i * 0.6, 0.35, 0);
      spike.rotation.z = i * -Math.PI / 2;
      this.body.add(spike);
    }

    // マントル (cape)
    const capeGeo = new THREE.BoxGeometry(1.1, 0.95, 0.08);
    const cape = new THREE.Mesh(capeGeo, capeMat);
    cape.position.set(0, -0.1, -0.36);
    this.body.add(cape);

    // 左腕
    const lArm = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.75, 0.3), armorMat);
    lArm.position.set(-0.72, 0.05, 0);
    lArm.castShadow = true;
    this.body.add(lArm);

    // 右腕 (巨大なメイス持ち)
    const rArm = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.75, 0.3), armorMat);
    rArm.position.set(0.72, 0.05, 0);
    rArm.castShadow = true;
    this.body.add(rArm);

    // 巨大なメイス
    const maceHead = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), armorMat);
    maceHead.position.set(0.72, -0.62, 0);
    this.body.add(maceHead);
    const maceHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.6, 8), new THREE.MeshStandardMaterial({ color: 0x3d2b1f, roughness: 0.85 }));
    maceHandle.position.set(0.72, -0.32, 0);
    this.body.add(maceHandle);
    for (let i = 0; i < 6; i++) {
      const spk = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.18, 5), goldMat);
      const a = (i / 6) * Math.PI * 2;
      spk.position.set(0.72 + Math.cos(a) * 0.22, -0.62, Math.sin(a) * 0.22);
      spk.rotation.z = -a * 0.3;
      this.body.add(spk);
    }

    // 首
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.2, 8), skinMat);
    neck.position.y = 0.62;
    this.body.add(neck);

    // 頭
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.38, 12, 10), skinMat);
    head.position.y = 0.88;
    head.scale.set(1.0, 1.05, 0.95);
    head.castShadow = true;
    this.body.add(head);

    // 大きな耳 (左右)
    const bigEarGeo = new THREE.ConeGeometry(0.11, 0.4, 7);
    const lEar = new THREE.Mesh(bigEarGeo, skinMat);
    lEar.position.set(-0.38, 0.9, 0);
    lEar.rotation.z = Math.PI * 0.75;
    this.body.add(lEar);
    const rEar = new THREE.Mesh(bigEarGeo, skinMat);
    rEar.position.set(0.38, 0.9, 0);
    rEar.rotation.z = -Math.PI * 0.75;
    this.body.add(rEar);

    // 目
    const eyeGeo = new THREE.SphereGeometry(0.08, 8, 6);
    const lEye = new THREE.Mesh(eyeGeo, eyeMat);
    lEye.position.set(-0.13, 0.9, 0.35);
    this.body.add(lEye);
    const rEye = new THREE.Mesh(eyeGeo, eyeMat);
    rEye.position.set(0.13, 0.9, 0.35);
    this.body.add(rEye);

    // 王冠 (Crown) - キングの従
    const crownBase = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.38, 0.18, 8), goldMat);
    crownBase.position.y = 1.32;
    this.body.add(crownBase);
    for (let i = 0; i < 5; i++) {
      const prong = new THREE.Mesh(new THREE.ConeGeometry(0.065, 0.28, 5), goldMat);
      const a = (i / 5) * Math.PI * 2;
      prong.position.set(Math.cos(a) * 0.32, 1.5, Math.sin(a) * 0.32);
      this.body.add(prong);
    }
    // 王冠宝石
    const gemMat = new THREE.MeshStandardMaterial({ color: 0xff1111, emissive: 0xff0000, emissiveIntensity: 1.5, roughness: 0.0, metalness: 0.0 });
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.07), gemMat);
    gem.position.set(0, 1.48, 0.38);
    this.body.add(gem);

    // ボスオーラ
    const aura = new THREE.PointLight(0x00ff88, 1.5, 6.0);
    aura.position.y = 1.0;
    this.group.add(aura);
    this.auraLight = aura;

    this.hpSprite.position.y = 4.2;
    this.hpSprite.scale.set(2.4, 0.5, 1.0);
    this.group.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  }

  update(delta, playerPos) {
    // 王冠が光る
    if (this.auraLight) {
      this.auraLight.intensity = 1.2 + Math.sin(Date.now() * 0.002) * 0.5;
    }
    super.update(delta, playerPos);
  }
}

// デーモン (大ボス: 弱点: 風, 耐性: 炎) - 翔と角の巷魔
class DemonEnemy extends Enemy {
  constructor() {
    super('demon', 320, 2.0, 35, 2.2, 'wind', 'flame', 120);
    this.isBoss = true;

    const demonSkin = new THREE.MeshStandardMaterial({ color: 0x6b0000, roughness: 0.7, metalness: 0.1 });
    const darkArmor = new THREE.MeshStandardMaterial({ color: 0x1a0000, roughness: 0.2, metalness: 0.9 });
    const hellMat   = new THREE.MeshStandardMaterial({ color: 0xff4400, emissive: 0xff2200, emissiveIntensity: 1.2, roughness: 0.0 });
    const eyeMat    = new THREE.MeshStandardMaterial({ color: 0xff6600, emissive: 0xff4400, emissiveIntensity: 2.0 });
    const wingMat   = new THREE.MeshStandardMaterial({
      color: 0x330000, emissive: 0x660000, emissiveIntensity: 0.3,
      transparent: true, opacity: 0.88, side: THREE.DoubleSide, roughness: 0.6,
    });

    // 大きな足
    const { leftLeg, rightLeg } = buildLegs(this.group, darkArmor, null, 0.42, 0.9, 0.45);
    this.leftLeg = leftLeg;
    this.rightLeg = rightLeg;

    // 胴
    this.body = new THREE.Group();
    this.body.position.y = 1.45;
    this.group.add(this.body);

    // 胴アーマー (巨大)
    const torso = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.1, 0.82), demonSkin);
    torso.position.y = 0.1;
    torso.castShadow = true;
    this.body.add(torso);

    // 胸プレート (黒鉄アーマー)
    const chestPlate = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.7, 0.16), darkArmor);
    chestPlate.position.set(0, 0.2, 0.42);
    this.body.add(chestPlate);

    // 肩オーナメント (トゲのような全形肩パッド)
    const shoulderGeo = new THREE.SphereGeometry(0.3, 8, 6);
    for (let i = -1; i <= 1; i += 2) {
      const shoulder = new THREE.Mesh(shoulderGeo, darkArmor);
      shoulder.position.set(i * 0.82, 0.45, 0);
      shoulder.scale.set(1.0, 0.85, 0.85);
      this.body.add(shoulder);
      // 肩スパイク
      for (let s = 0; s < 3; s++) {
        const sp = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.22, 5), hellMat);
        sp.position.set(i * (0.82 + s * 0.06), 0.52 + s * 0.05, -s * 0.04);
        sp.rotation.z = i * (Math.PI * 0.45 + s * 0.15);
        this.body.add(sp);
      }
    }

    // 左腕 (巨大)
    const armGeo = new THREE.BoxGeometry(0.36, 0.9, 0.36);
    const lArm = new THREE.Mesh(armGeo, demonSkin);
    lArm.position.set(-0.92, -0.1, 0);
    lArm.castShadow = true;
    this.body.add(lArm);

    // 右腕 (巨大)
    const rArm = new THREE.Mesh(armGeo, demonSkin);
    rArm.position.set(0.92, -0.1, 0);
    rArm.castShadow = true;
    this.body.add(rArm);

    // クロー (隣に酒色スラッシュ)
    const clawGeo = new THREE.ConeGeometry(0.05, 0.28, 5);
    [[-0.92, -0.58], [0.92, -0.58]].forEach(([x, y], si) => {
      for (let ci = 0; ci < 3; ci++) {
        const claw = new THREE.Mesh(clawGeo, hellMat);
        claw.position.set(x + (ci - 1) * 0.12, y - 0.1, 0.16);
        claw.rotation.x = -0.5;
        this.body.add(claw);
      }
    });

    // 首
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 0.25, 8), demonSkin);
    neck.position.y = 0.7;
    this.body.add(neck);

    // 頭 (巨大な悪魔の頭)
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.48, 12, 10), demonSkin);
    head.position.y = 1.08;
    head.scale.set(1.0, 1.05, 0.92);
    head.castShadow = true;
    this.body.add(head);

    // 角 (左右)
    const hornGeo = new THREE.ConeGeometry(0.085, 0.6, 7);
    const lHorn = new THREE.Mesh(hornGeo, darkArmor);
    lHorn.position.set(-0.28, 1.54, 0);
    lHorn.rotation.z = 0.35;
    lHorn.rotation.x = -0.15;
    this.body.add(lHorn);
    const rHorn = new THREE.Mesh(hornGeo, darkArmor);
    rHorn.position.set(0.28, 1.54, 0);
    rHorn.rotation.z = -0.35;
    rHorn.rotation.x = -0.15;
    this.body.add(rHorn);

    // 目 (大きな炒り目)
    const eyeGeo = new THREE.SphereGeometry(0.1, 10, 8);
    const lEye = new THREE.Mesh(eyeGeo, eyeMat);
    lEye.position.set(-0.18, 1.12, 0.44);
    this.body.add(lEye);
    const rEye = new THREE.Mesh(eyeGeo, eyeMat);
    rEye.position.set(0.18, 1.12, 0.44);
    this.body.add(rEye);

    // 目の光
    const eyeLight = new THREE.PointLight(0xff4400, 2.0, 3.5);
    eyeLight.position.set(0, 1.1, 0.5);
    this.body.add(eyeLight);
    this.eyeLight = eyeLight;

    // 口 (牙あり)
    const mouthMat = new THREE.MeshStandardMaterial({ color: 0x1a0000, roughness: 1.0 });
    const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.14, 0.08), mouthMat);
    mouth.position.set(0, 0.88, 0.46);
    this.body.add(mouth);
    // 牙
    const fangGeo = new THREE.ConeGeometry(0.04, 0.2, 5);
    const fangMat = new THREE.MeshStandardMaterial({ color: 0xfff0e0, roughness: 0.4 });
    [-0.18, -0.06, 0.06, 0.18].forEach(fx => {
      const fang = new THREE.Mesh(fangGeo, fangMat);
      fang.position.set(fx, 0.82, 0.46);
      fang.rotation.x = Math.PI;
      this.body.add(fang);
    });

    // 翔 (wings) - 一演騒焼な悪魔の翔
    const wing1Geo = new THREE.BufferGeometry();
    const wVerts = new Float32Array([
      // 左翔 (3トライアングルで構成)
      0, 0.3, -0.1,   -1.8, 1.2, -0.5,  -2.5, 0.0, -0.3,
      0, 0.3, -0.1,   -2.5, 0.0, -0.3,  -1.5, -0.8, 0.0,
      0, 0.3, -0.1,   -1.5, -0.8, 0.0,  -0.5, -0.5, 0.1,
    ]);
    wing1Geo.setAttribute('position', new THREE.BufferAttribute(wVerts, 3));
    wing1Geo.computeVertexNormals();
    const leftWing = new THREE.Mesh(wing1Geo, wingMat);
    this.body.add(leftWing);

    // 右翔 (X軸反転)
    const rightWing = leftWing.clone();
    rightWing.scale.x = -1;
    this.body.add(rightWing);
    this.leftWing = leftWing;
    this.rightWing = rightWing;

    // マグマ パーティクル (body glow)
    const glow = new THREE.PointLight(0xff2200, 2.5, 8.0);
    glow.position.y = 0.5;
    this.group.add(glow);
    this.glowLight = glow;

    this.hpSprite.position.y = 5.0;
    this.hpSprite.scale.set(2.8, 0.6, 1.0);
    this.group.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  }

  update(delta, playerPos) {
    // 目が谷を描くために色変わり
    if (this.eyeLight) {
      this.eyeLight.intensity = 1.8 + Math.sin(Date.now() * 0.005) * 0.8;
    }
    if (this.glowLight) {
      this.glowLight.intensity = 2.0 + Math.sin(Date.now() * 0.003) * 0.8;
    }
    // 翔のパタパタアニメ
    if (this.leftWing) {
      const flapAngle = Math.sin(Date.now() * 0.004) * 0.18;
      this.leftWing.rotation.y = flapAngle;
      this.rightWing.rotation.y = -flapAngle;
    }
    super.update(delta, playerPos);
  }
}

// =============================================================================
// 9. 敵同士 & プレイヤーの重なり防止コリジョン (Separation Physics)
// =============================================================================
function applySeparationPhysics() {
  const enemies = enemyManager.enemies.filter(e => !e.isDead && !e.isDying);
  const pPos = player.group.position;
  const pRadius = CONFIG.playerRadius;

  // 1. 敵 vs プレイヤーの重なり防止
  enemies.forEach(enemy => {
    const toEnemy = new THREE.Vector3().subVectors(enemy.group.position, pPos);
    toEnemy.y = 0;
    const dist = toEnemy.length();
    const minDist = pRadius + enemy.radius;

    if (dist < minDist && dist > 0.001) {
      const overlap = minDist - dist;
      toEnemy.normalize();
      enemy.group.position.addScaledVector(toEnemy, overlap * 0.85);
    }
  });

  // 2. 敵 vs 敵の重なり防止
  for (let i = 0; i < enemies.length; i++) {
    for (let j = i + 1; j < enemies.length; j++) {
      const e1 = enemies[i];
      const e2 = enemies[j];

      const diff = new THREE.Vector3().subVectors(e2.group.position, e1.group.position);
      diff.y = 0;
      const dist = diff.length();
      const minDist = e1.radius + e2.radius;

      if (dist < minDist && dist > 0.001) {
        const overlap = (minDist - dist) * 0.5;
        diff.normalize();
        e1.group.position.addScaledVector(diff, -overlap * 0.7);
        e2.group.position.addScaledVector(diff, overlap * 0.7);
      }
    }
  }
}

// =============================================================================
// 10. ステージ進行管理システム (StageManager)
// =============================================================================
class StageManager {
  constructor() {
    this.currentStage = STAGES_DATA[0];
    this.stageKills = 0;
    this.isBossActive = false;
  }

  startStage(stageIdx) {
    state.currentStageIdx = stageIdx % STAGES_DATA.length;
    this.currentStage = STAGES_DATA[state.currentStageIdx];
    this.stageKills = 0;
    this.isBossActive = false;

    applyStageEnvironment(this.currentStage);
    updateStageHUD();
  }

  onRegularKill() {
    if (this.isBossActive) return;
    this.stageKills++;
    updateStageHUD();

    if (this.stageKills >= this.currentStage.killTarget) {
      this.spawnBossWarning();
    }
  }

  spawnBossWarning() {
    this.isBossActive = true;
    const banner = document.getElementById('boss-warning-banner');
    if (banner) {
      banner.classList.remove('hidden');
      setTimeout(() => banner.classList.add('hidden'), 2200);
    }

    setTimeout(() => {
      enemyManager.spawnBoss(this.currentStage.bossType, player.group.position);
    }, 1200);
  }

  onBossDefeated() {
    this.isBossActive = false;
    state.slowMoTimer = 2.5; // スローモーション演出
    state.coins += 100; // ステージクリアボーナス
    saveData.coins = state.coins;
    SaveManager.save(saveData);

    soundManager.playVictoryFanfare();
    confettiManager.burst();

    // お祝いモーダル表示
    const vicModal = document.getElementById('victory-modal');
    const vicStage = document.getElementById('victory-stage-name');
    if (vicStage) vicStage.innerText = `STAGE ${state.currentStageIdx + 1}: ${this.currentStage.name} CLEAR!!`;
    if (vicModal) vicModal.classList.remove('hidden');

    hideBossHpBar();

    // 3.5秒後にシームレスに次のステージへ突入！
    setTimeout(() => {
      if (vicModal) vicModal.classList.add('hidden');
      this.startStage(state.currentStageIdx + 1);
    }, 3500);
  }
}

// 敵スポーン管理
class EnemyManager {
  constructor() {
    this.enemies = [];
    this.spawnTimer = 0;
    this.nextNetId = 1;
  }

  update(delta, playerPos) {
    if (state.mode !== GAME_MODE.PLAYING) return;

    // ゲストの場合はホストからのスナップショットで位置補間のみ行う
    if (state.isMultiplayer && !state.isHost) {
      for (let i = this.enemies.length - 1; i >= 0; i--) {
        const e = this.enemies[i];
        if (e.isDead) {
          this.enemies.splice(i, 1);
          continue;
        }
        if (e.targetPos) {
          e.group.position.lerp(e.targetPos, Math.min(delta * 14.0, 1.0));
        }
        if (e.isBoss) updateBossHpBar(e);
      }
      return;
    }

    // ホストまたはソロプレイ時: 通常のスポーン & AI更新
    this.spawnTimer += delta;
    if (this.spawnTimer >= CONFIG.spawnInterval && this.getActiveRegularCount() < CONFIG.maxRegularEnemies) {
      this.spawnTimer = 0;
      this.spawnRandomEnemy(playerPos);
    }

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (e.isDead) {
        this.enemies.splice(i, 1);
        continue;
      }
      // 距離ベース表示・更新の最適化
      const distToPlayer = e.group.position.distanceTo(playerPos);
      if (distToPlayer > 100) {
        // 100m超: 非表示 + AI停止
        e.group.visible = false;
      } else {
        e.group.visible = true;
        if (distToPlayer < 80) {
          // 80m以内: 通常更新
          e.update(delta, playerPos);
          // 地形追従
          const tx = e.group.position.x, tz = e.group.position.z;
          e.group.position.y = getTerrainHeight(tx, tz);
        }
        if (e.isBoss) updateBossHpBar(e);
      }
    }
  }

  getActiveRegularCount() {
    return this.enemies.filter(e => !e.isDead && !e.isDying && !e.isBoss).length;
  }

  spawnRandomEnemy(playerPos) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 14 + Math.random() * 8;
    const x = playerPos.x + Math.cos(angle) * dist;
    const z = playerPos.z + Math.sin(angle) * dist;

    const rand = Math.random();
    let enemy;
    if (rand < 0.45) enemy = new ZombieEnemy();
    else if (rand < 0.75) enemy = new GhostEnemy();
    else enemy = new GoblinEnemy();

    enemy.netId = 'e_' + (this.nextNetId++);
    enemy.group.position.set(x, getTerrainHeight(x, z), z);
    scene.add(enemy.group);
    this.enemies.push(enemy);
  }

  spawnBoss(type, playerPos) {
    const angle = Math.random() * Math.PI * 2;
    const dist  = 20.0;
    const x = playerPos.x + Math.cos(angle) * dist;
    const z = playerPos.z + Math.sin(angle) * dist;

    const boss = (type === 'king_goblin') ? new KingGoblinEnemy() : new DemonEnemy();
    boss.netId = 'boss_' + (this.nextNetId++);
    boss.group.position.set(x, getTerrainHeight(x, z), z);
    scene.add(boss.group);
    this.enemies.push(boss);

    showBossHpBar(boss);
  }

  // ゲスト側: ホストからの敵スナップショットを同期
  syncFromSnapshot(snapshotList, stageIdx) {
    if (!Array.isArray(snapshotList)) return;

    const receivedIds = new Set(snapshotList.map(s => s.netId));

    // スナップショットに存在しない敵を削除
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (!receivedIds.has(e.netId)) {
        scene.remove(e.group);
        this.enemies.splice(i, 1);
      }
    }

    // スナップショットの敵を更新または新規生成
    snapshotList.forEach(snap => {
      let existing = this.enemies.find(e => e.netId === snap.netId);
      if (!existing) {
        // 新規スポーン
        if (snap.type === 'zombie') existing = new ZombieEnemy();
        else if (snap.type === 'ghost') existing = new GhostEnemy();
        else if (snap.type === 'goblin') existing = new GoblinEnemy();
        else if (snap.type === 'king_goblin') existing = new KingGoblinEnemy();
        else if (snap.type === 'demon') existing = new DemonEnemy();
        else existing = new ZombieEnemy();

        existing.netId = snap.netId;
        existing.targetPos = new THREE.Vector3(snap.x, getTerrainHeight(snap.x, snap.z), snap.z);
        existing.group.position.copy(existing.targetPos);
        scene.add(existing.group);
        this.enemies.push(existing);

        if (snap.isBoss) showBossHpBar(existing);
      }

      // 位置とHPの同期
      if (!existing.targetPos) existing.targetPos = new THREE.Vector3();
      existing.targetPos.set(snap.x, getTerrainHeight(snap.x, snap.z), snap.z);
      existing.group.rotation.y = snap.rotY || 0;
      if (existing.hp !== snap.hp) {
        existing.hp = snap.hp;
        existing.updateHpBar();
      }
      if (snap.freeze) existing.freeze(0.2);
    });
  }
}

// =============================================================================
// 11.5 アイテムマネージャー (回復アイテムのスポーン & 取得)
// =============================================================================
const ITEM_TYPES = {
  hp_small: {
    id: 'hp_small', name: 'HP ポーション (小)', icon: '🧪',
    color: 0xff4466, emissive: 0x880022, emissiveIntensity: 0.8,
    healHp: 25, healMp: 0,
    spawnWeight: 45,
  },
  hp_large: {
    id: 'hp_large', name: 'HP ポーション (大)', icon: '❤️',
    color: 0xff0033, emissive: 0xaa0022, emissiveIntensity: 1.2,
    healHp: 60, healMp: 0,
    spawnWeight: 20,
  },
  mp_potion: {
    id: 'mp_potion', name: 'MP エーテル', icon: '💙',
    color: 0x44aaff, emissive: 0x0044aa, emissiveIntensity: 0.9,
    healHp: 0, healMp: 40,
    spawnWeight: 30,
  },
  full_restore: {
    id: 'full_restore', name: 'エリクサー', icon: '✨',
    color: 0xffd700, emissive: 0xaa8800, emissiveIntensity: 1.5,
    healHp: 50, healMp: 50,
    spawnWeight: 5,
  },
};

class ItemManager {
  constructor() {
    this.items = [];          // フィールド上のアイテム一覧
    this.spawnTimer = 0;      // スポーンタイマー
  }

  update(delta, playerPos) {
    if (state.mode !== GAME_MODE.PLAYING) return;

    // スポーンタイマーを進める
    this.spawnTimer += delta;
    if (this.spawnTimer >= CONFIG.itemSpawnInterval && this.items.length < CONFIG.maxItems) {
      this.spawnTimer = 0;
      this.spawnRandomItem(playerPos);
    }

    // アイテムの更新（浮遊アニメ & 取得判定）
    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i];

      // 浮遊アニメーション
      item.time += delta * 2.5;
      item.mesh.position.y = item.baseY + Math.sin(item.time) * 0.3;
      item.mesh.rotation.y += delta * 2.0;

      // プレイヤーとの距離判定
      const dist = item.mesh.position.distanceTo(playerPos);
      if (dist < CONFIG.itemPickupRadius) {
        this.pickupItem(item, i);
      }
    }
  }

  spawnRandomItem(playerPos) {
    // 重み付きランダム選択
    const keys = Object.keys(ITEM_TYPES);
    const totalWeight = keys.reduce((sum, k) => sum + ITEM_TYPES[k].spawnWeight, 0);
    let rand = Math.random() * totalWeight;
    let selected = ITEM_TYPES[keys[0]];
    for (const k of keys) {
      rand -= ITEM_TYPES[k].spawnWeight;
      if (rand <= 0) { selected = ITEM_TYPES[k]; break; }
    }

    // プレイヤーから 8〜40m の範囲にスポーン (オープンワールド対応)
    const angle = Math.random() * Math.PI * 2;
    const dist  = 8 + Math.random() * 32;
    const x = playerPos.x + Math.cos(angle) * dist;
    const z = playerPos.z + Math.sin(angle) * dist;
    const y = getTerrainHeight(x, z) + 1.0;

    const group = new THREE.Group();
    group.position.set(x, y, z);

    // ボトル本体
    const bodyGeo = new THREE.SphereGeometry(0.25, 8, 8);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: selected.color,
      emissive: selected.emissive,
      emissiveIntensity: selected.emissiveIntensity,
      roughness: 0.2,
      metalness: 0.5,
      transparent: true,
      opacity: 0.85,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    group.add(body);

    // ボトル首
    const neckGeo = new THREE.CylinderGeometry(0.08, 0.12, 0.2, 8);
    const neck = new THREE.Mesh(neckGeo, bodyMat);
    neck.position.y = 0.28;
    group.add(neck);

    // ボトルキャップ
    const capGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.08, 8);
    const capMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
    const cap = new THREE.Mesh(capGeo, capMat);
    cap.position.y = 0.42;
    group.add(cap);

    // 光のオーラ (PointLight)
    const light = new THREE.PointLight(selected.color, 1.2, 4.0);
    light.position.y = 0.1;
    group.add(light);

    scene.add(group);

    this.items.push({
      type: selected,
      mesh: group,
      light,
      baseY: 1.0,
      time: Math.random() * Math.PI * 2, // フェーズをずらす
    });
  }

  pickupItem(item, index) {
    // HP/MP回復
    if (item.type.healHp > 0) {
      player.hp = Math.min(player.maxHp, player.hp + item.type.healHp);
    }
    if (item.type.healMp > 0) {
      player.mp = Math.min(player.maxMp, player.mp + item.type.healMp);
    }
    updateStatusHUD();

    // 取得SE再生
    const seType = item.type.healHp > 0 ? 'hp' : 'mp';
    soundManager.playItemPickup(seType);

    // 取得ポップアップ表示
    const screenPos = item.mesh.position.clone().project(camera);
    const x = ((screenPos.x + 1) * window.innerWidth) / 2;
    const y = ((-screenPos.y + 1) * window.innerHeight) / 2;
    const popup = document.createElement('div');
    popup.className = 'item-pickup-popup';
    let text = item.type.name;
    if (item.type.healHp > 0) text += ` ❤️+${item.type.healHp}`;
    if (item.type.healMp > 0) text += ` 💙+${item.type.healMp}`;
    popup.innerText = text;
    popup.style.left = `${x}px`;
    popup.style.top = `${y}px`;
    const uiLayer = document.getElementById('ui-layer');
    if (uiLayer) {
      uiLayer.appendChild(popup);
      setTimeout(() => popup.remove(), 1200);
    }

    // シーンからメッシュを除去
    scene.remove(item.mesh);
    this.items.splice(index, 1);
  }

  // 全アイテムをクリア (ステージ遷移時など)
  clearAll() {
    this.items.forEach(item => scene.remove(item.mesh));
    this.items = [];
    this.spawnTimer = 0;
  }
}

// =============================================================================
// 11. カメラコントローラー (通常追従 & タイトルシネマティック旋回)
// =============================================================================
class CameraController {
  constructor(camera, target) {
    this.camera = camera;
    this.target = target;
    this.currentLookAt = new THREE.Vector3();
    this.shakeIntensity = 0;
    this.orbitAngle = 0;
  }

  shake(amount) { this.shakeIntensity = Math.min(this.shakeIntensity + amount, 0.5); }

  update(delta) {
    if (state.mode === GAME_MODE.TITLE) {
      this.orbitAngle += delta * 0.25;
      this.camera.position.set(Math.cos(this.orbitAngle) * 16, 8, Math.sin(this.orbitAngle) * 16);
      this.camera.lookAt(0, 1.5, 0);
      return;
    }

    if (!this.target) return;
    const idealOffset = CONFIG.cameraOffset.clone();
    const targetPos = this.target.group.position;
    const idealPos = targetPos.clone().add(idealOffset);

    if (this.shakeIntensity > 0) {
      idealPos.x += (Math.random() - 0.5) * this.shakeIntensity;
      idealPos.y += (Math.random() - 0.5) * this.shakeIntensity;
      this.shakeIntensity = Math.max(0, this.shakeIntensity - delta * 2.0);
    }

    this.camera.position.lerp(idealPos, CONFIG.cameraLerp);
    const idealLookAt = targetPos.clone().add(CONFIG.cameraLookOffset);
    this.currentLookAt.lerp(idealLookAt, CONFIG.cameraLerp * 1.5);
    this.camera.lookAt(this.currentLookAt);

    sunLight.position.set(targetPos.x - 12, 80, targetPos.z + 10);
    sunLight.target.position.copy(targetPos);
    sunLight.target.updateMatrixWorld();
  }
}

// =============================================================================
// 12. UI / HUD コントローラー
// =============================================================================
function updateStatusHUD() {
  const hpBar = document.getElementById('player-hp-bar');
  const hpDmgBar = document.getElementById('player-hp-damage-bar');
  const hpText = document.getElementById('player-hp-text');

  const mpBar = document.getElementById('player-mp-bar');
  const mpText = document.getElementById('player-mp-text');

  if (hpBar && hpText) {
    const hpRatio = (player.hp / player.maxHp) * 100;
    hpBar.style.width = `${hpRatio}%`;
    hpText.innerText = `${Math.ceil(player.hp)}/${player.maxHp}`;
    if (hpDmgBar) hpDmgBar.style.width = `${hpRatio}%`;
  }

  if (mpBar && mpText) {
    const mpRatio = (player.mp / player.maxMp) * 100;
    mpBar.style.width = `${mpRatio}%`;
    mpText.innerText = `${Math.ceil(player.mp)}/${player.maxMp}`;
  }

  Object.keys(MAGIC_DATA).forEach(key => {
    const btn = document.getElementById(`btn-magic-${key}`);
    const lvlTag = document.getElementById(`tag-level-${key}`);
    const currentLevel = (saveData && saveData.magicLevels) ? (saveData.magicLevels[key] || 1) : 1;
    if (lvlTag) lvlTag.innerText = `Lv.${currentLevel}`;
    if (btn) btn.classList.toggle('is-disabled', player.mp < MAGIC_DATA[key].cost);
  });
}

function updateStageHUD() {
  const badge = document.getElementById('stage-badge');
  const prog = document.getElementById('stage-progress');
  const currentStage = stageManager.currentStage;

  if (badge) badge.innerText = `STAGE ${state.currentStageIdx + 1}: ${currentStage.name}`;
  if (prog) prog.innerText = stageManager.isBossActive ? '👑 BOSS BATTLE!!' : `討伐: ${stageManager.stageKills}/${currentStage.killTarget}`;
}

function showBossHpBar(boss) {
  const container = document.getElementById('boss-hp-container');
  const nameEl = document.getElementById('boss-name');
  const weakEl = document.getElementById('boss-weak-badge');
  const resistEl = document.getElementById('boss-resist-badge');

  if (container) container.classList.remove('hidden');
  if (nameEl) nameEl.innerText = boss.type === 'king_goblin' ? '👑 KING GOBLIN' : '😈 DEMON LORD';

  const weakIcon = boss.weakness === 'ice' ? '❄️氷' : '🌪️風';
  const resistIcon = boss.resistance === 'explosion' ? '💥爆発' : '🔥炎';
  if (weakEl) weakEl.innerText = `弱点: ${weakIcon}`;
  if (resistEl) resistEl.innerText = `耐性: ${resistIcon}`;
}

function updateBossHpBar(boss) {
  const bar = document.getElementById('boss-hp-bar');
  const dmgBar = document.getElementById('boss-hp-damage-bar');
  if (bar) {
    const ratio = (boss.hp / boss.maxHp) * 100;
    bar.style.width = `${ratio}%`;
    if (dmgBar) dmgBar.style.width = `${ratio}%`;
  }
}

function hideBossHpBar() {
  const container = document.getElementById('boss-hp-container');
  if (container) container.classList.add('hidden');
}

function showDamagePopup(worldPos, damage, affinityType = 'normal') {
  const screenPos = worldPos.clone().project(camera);
  const x = ((screenPos.x + 1) * window.innerWidth) / 2;
  const y = ((-screenPos.y + 1) * window.innerHeight) / 2;

  const popup = document.createElement('div');
  popup.className = affinityType === 'weak' ? 'weak-popup' : (affinityType === 'resist' ? 'resist-popup' : 'coin-popup');
  popup.innerText = affinityType === 'weak' ? `⚡ WEAK! -${damage}` : `-${damage}`;
  popup.style.left = `${x}px`;
  popup.style.top = `${y}px`;
  document.getElementById('ui-layer').appendChild(popup);

  setTimeout(() => popup.remove(), 850);
}

function updateHUD(worldPos, text = null) {
  const killEl = document.getElementById('kill-count');
  const coinEl = document.getElementById('coin-count');
  const titleCoinEl = document.getElementById('title-coin-display');
  const shopCoinEl = document.getElementById('shop-coin-display');

  if (killEl) killEl.innerText = state.kills;
  if (coinEl) coinEl.innerText = state.coins;
  if (titleCoinEl) titleCoinEl.innerText = state.coins;
  if (shopCoinEl) shopCoinEl.innerText = state.coins;

  if (worldPos && text) {
    const screenPos = worldPos.clone().project(camera);
    const x = ((screenPos.x + 1) * window.innerWidth) / 2;
    const y = ((-screenPos.y + 1) * window.innerHeight) / 2;

    const popup = document.createElement('div');
    popup.className = 'coin-popup';
    popup.innerText = text;
    popup.style.left = `${x}px`;
    popup.style.top = `${y}px`;
    document.getElementById('ui-layer').appendChild(popup);
    setTimeout(() => popup.remove(), 900);
  }
}

// =============================================================================
// 13. コントロール & メニューイベント
// =============================================================================
function setupControls(player) {
  const titleScreen = document.getElementById('title-screen');
  const uiLayer = document.getElementById('ui-layer');

  const btnStart = document.getElementById('btn-title-start');
  const btnTitleShop = document.getElementById('btn-title-shop');
  const btnTitleOptions = document.getElementById('btn-title-options');
  const btnTitleHowto = document.getElementById('btn-title-howto');

  const btnOpenShop = document.getElementById('btn-open-shop');
  const btnOpenMenu = document.getElementById('btn-open-menu');

  const optionsModal = document.getElementById('options-modal');
  const btnCloseOptions = document.getElementById('btn-close-options');
  const btnReturnTitle = document.getElementById('btn-return-title');

  const howtoModal = document.getElementById('howto-modal');
  const btnCloseHowto = document.getElementById('btn-close-howto');

  const sliderBgm = document.getElementById('slider-bgm');
  const textBgm = document.getElementById('text-bgm-val');
  const sliderSfx = document.getElementById('slider-sfx');
  const textSfx = document.getElementById('text-sfx-val');
  const sliderSens = document.getElementById('slider-sensitivity');
  const textSens = document.getElementById('text-sens-val');

  const retryBtn = document.getElementById('btn-retry');
  const btnGoTitle = document.getElementById('btn-gameover-title');

  // 初期スライダー値反映
  if (sliderBgm) {
    sliderBgm.value = saveData.options.bgmVol;
    textBgm.innerText = `${saveData.options.bgmVol}%`;
    soundManager.setBgmVolume(saveData.options.bgmVol / 100);
    sliderBgm.addEventListener('input', (e) => {
      const v = parseInt(e.target.value);
      textBgm.innerText = `${v}%`;
      soundManager.setBgmVolume(v / 100);
      saveData.options.bgmVol = v;
      SaveManager.save(saveData);
    });
  }

  if (sliderSfx) {
    sliderSfx.value = saveData.options.sfxVol;
    textSfx.innerText = `${saveData.options.sfxVol}%`;
    soundManager.setSfxVolume(saveData.options.sfxVol / 100);
    sliderSfx.addEventListener('input', (e) => {
      const v = parseInt(e.target.value);
      textSfx.innerText = `${v}%`;
      soundManager.setSfxVolume(v / 100);
      saveData.options.sfxVol = v;
      SaveManager.save(saveData);
    });
  }

  if (sliderSens) {
    sliderSens.value = saveData.options.sensitivity;
    textSens.innerText = `${saveData.options.sensitivity}%`;
    state.controlSensitivity = saveData.options.sensitivity / 100;
    sliderSens.addEventListener('input', (e) => {
      const v = parseInt(e.target.value);
      textSens.innerText = `${v}%`;
      state.controlSensitivity = v / 100;
      saveData.options.sensitivity = v;
      SaveManager.save(saveData);
    });
  }

  function startGame() {
    soundManager.unlock();
    titleScreen.classList.add('hidden');
    uiLayer.classList.remove('hidden');
    state.mode = GAME_MODE.PLAYING;
    stageManager.startStage(0);
    player.respawn();
  }

  btnStart.addEventListener('pointerdown', (e) => { e.preventDefault(); startGame(); });
  btnTitleShop.addEventListener('pointerdown', (e) => { e.preventDefault(); soundManager.unlock(); shopUI.open(); });
  btnTitleOptions.addEventListener('pointerdown', (e) => { e.preventDefault(); optionsModal.classList.remove('hidden'); });
  btnTitleHowto.addEventListener('pointerdown', (e) => { e.preventDefault(); howtoModal.classList.remove('hidden'); });

  // ====================================
  // オンラインマルチプレイ UI イベント
  // ====================================
  const onlineModal = document.getElementById('online-modal');
  const btnTitleOnline = document.getElementById('btn-title-online');
  const btnOnlineClose = document.getElementById('btn-online-close');
  const onlineSelectView = document.getElementById('online-select-view');
  const onlineHostView = document.getElementById('online-host-view');
  const onlineGuestView = document.getElementById('online-guest-view');

  const btnCreateRoom = document.getElementById('btn-create-room');
  const btnJoinRoom = document.getElementById('btn-join-room');
  const btnCopyRoomId = document.getElementById('btn-copy-room-id');
  const roomIdText = document.getElementById('room-id-text');
  const hostStatusText = document.getElementById('host-status-text');
  const btnHostCancel = document.getElementById('btn-host-cancel');

  const roomIdInput = document.getElementById('room-id-input');
  const btnConnectRoom = document.getElementById('btn-connect-room');
  const guestStatus = document.getElementById('guest-status');
  const guestStatusText = document.getElementById('guest-status-text');
  const btnGuestCancel = document.getElementById('btn-guest-cancel');

  function resetOnlineModalViews() {
    if (onlineSelectView) onlineSelectView.classList.remove('hidden');
    if (onlineHostView) onlineHostView.classList.add('hidden');
    if (onlineGuestView) onlineGuestView.classList.add('hidden');
    if (guestStatus) guestStatus.classList.add('hidden');
    if (hostStatusText) hostStatusText.innerText = '相手の接続を待っています…';
  }

  if (btnTitleOnline) {
    btnTitleOnline.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      soundManager.unlock();
      resetOnlineModalViews();
      onlineModal.classList.remove('hidden');
    });
  }

  if (btnOnlineClose) {
    btnOnlineClose.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      onlineModal.classList.add('hidden');
      networkManager.disconnect();
    });
  }

  // ホスト: 部屋作成
  if (btnCreateRoom) {
    btnCreateRoom.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      onlineSelectView.classList.add('hidden');
      onlineHostView.classList.remove('hidden');
      if (hostStatusText) hostStatusText.innerText = 'ルーム作成中...';

      networkManager.createRoom(
        (roomId) => {
          if (roomIdText) roomIdText.innerText = roomId;
          if (hostStatusText) hostStatusText.innerText = '相手の接続を待っています…';
          // 接続確立時のコールバック
          networkManager.conn?.on('open', () => {
            onlineModal.classList.add('hidden');
            startGame();
          });
        },
        (err) => {
          if (hostStatusText) hostStatusText.innerText = '作成失敗: 再試行してください';
        }
      );
    });
  }

  if (btnCopyRoomId) {
    btnCopyRoomId.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (networkManager.roomId) {
        navigator.clipboard?.writeText(networkManager.roomId);
        btnCopyRoomId.innerText = '✓ コピー完了!';
        setTimeout(() => { btnCopyRoomId.innerText = '📋 コピー'; }, 1800);
      }
    });
  }

  if (btnHostCancel) {
    btnHostCancel.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      networkManager.disconnect();
      resetOnlineModalViews();
    });
  }

  // ゲスト: 部屋参加
  if (btnJoinRoom) {
    btnJoinRoom.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      onlineSelectView.classList.add('hidden');
      onlineGuestView.classList.remove('hidden');
      if (roomIdInput) { roomIdInput.value = ''; roomIdInput.focus(); }
    });
  }

  if (btnConnectRoom) {
    btnConnectRoom.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      const code = roomIdInput ? roomIdInput.value.trim() : '';
      if (code.length < 6) {
        alert('6桁のルームIDを入力してください');
        return;
      }
      if (guestStatus) guestStatus.classList.remove('hidden');
      if (guestStatusText) guestStatusText.innerText = 'ホストへ接続中...';

      networkManager.joinRoom(
        code,
        () => {
          // 接続成功
          if (guestStatusText) guestStatusText.innerText = '接続完了！ゲーム開始...';
          setTimeout(() => {
            onlineModal.classList.add('hidden');
            startGame();
          }, 600);
        },
        (err) => {
          if (guestStatusText) guestStatusText.innerText = '接続失敗: IDを確認してください';
        }
      );
    });
  }

  if (btnGuestCancel) {
    btnGuestCancel.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      networkManager.disconnect();
      resetOnlineModalViews();
    });
  }

  btnOpenMenu.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    state.mode = GAME_MODE.PAUSED;
    optionsModal.classList.remove('hidden');
  });

  btnCloseOptions.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    optionsModal.classList.add('hidden');
    if (uiLayer.classList.contains('hidden')) state.mode = GAME_MODE.TITLE;
    else state.mode = GAME_MODE.PLAYING;
  });

  btnCloseHowto.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    howtoModal.classList.add('hidden');
  });

  function returnToTitle() {
    optionsModal.classList.add('hidden');
    document.getElementById('gameover-modal').classList.add('hidden');
    uiLayer.classList.add('hidden');
    titleScreen.classList.remove('hidden');
    state.mode = GAME_MODE.TITLE;
    networkManager.disconnect();
    player.group.position.set(0, 0, 0);
  }

  btnReturnTitle.addEventListener('pointerdown', (e) => { e.preventDefault(); returnToTitle(); });
  btnGoTitle.addEventListener('pointerdown', (e) => { e.preventDefault(); returnToTitle(); });

  retryBtn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    player.respawn();
    stageManager.startStage(state.currentStageIdx);
  });

  // ジョイスティック
  const joyZone = document.getElementById('joystick-zone');
  const joyKnob = document.getElementById('joystick-knob');
  let joyActive = false;
  let joyOrigin = { x: 0, y: 0 };

  joyZone.addEventListener('pointerdown', (e) => {
    joyActive = true;
    joyZone.setPointerCapture(e.pointerId);
    const rect = joyZone.getBoundingClientRect();
    joyOrigin = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    handleJoyMove(e);
  });

  joyZone.addEventListener('pointermove', (e) => {
    if (!joyActive) return;
    handleJoyMove(e);
  });

  const joyEnd = () => {
    joyActive = false;
    state.moveVector.set(0, 0);
    joyKnob.style.transform = 'translate(0px, 0px)';
  };
  joyZone.addEventListener('pointerup', joyEnd);
  joyZone.addEventListener('pointercancel', joyEnd);

  function handleJoyMove(e) {
    const maxRadius = 40;
    const dx = e.clientX - joyOrigin.x;
    const dy = e.clientY - joyOrigin.y;
    const dist = Math.min(Math.sqrt(dx * dx + dy * dy), maxRadius);
    const angle = Math.atan2(dy, dx);

    const kx = Math.cos(angle) * dist;
    const ky = Math.sin(angle) * dist;
    joyKnob.style.transform = `translate(${kx}px, ${ky}px)`;

    const inputLen = dist / maxRadius;
    state.moveVector.set(Math.cos(angle) * inputLen, -Math.sin(angle) * inputLen);
  }

  // アクションボタン
  const btnAttack = document.getElementById('btn-attack');
  const btnDash = document.getElementById('btn-dash');
  const btnGuard = document.getElementById('btn-guard');

  btnAttack.addEventListener('pointerdown', (e) => { e.preventDefault(); player.attack(); });
  if (btnDash) {
    btnDash.addEventListener('pointerdown', (e) => { e.preventDefault(); player.dash(); });
  }
  if (btnGuard) {
    const startGuard = (e) => {
      e.preventDefault();
      soundManager.unlock();
      state.isGuarding = true;
      btnGuard.classList.add('active');
    };
    const endGuard = (e) => {
      state.isGuarding = false;
      btnGuard.classList.remove('active');
    };
    btnGuard.addEventListener('pointerdown', startGuard);
    btnGuard.addEventListener('pointerup', endGuard);
    btnGuard.addEventListener('pointercancel', endGuard);
    btnGuard.addEventListener('pointerleave', endGuard);
  }

  // 魔法パレットボタン
  const magicButtons = document.querySelectorAll('.magic-btn');
  magicButtons.forEach((btn) => {
    btn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      soundManager.unlock();
      const magicKey = btn.dataset.magic;
      if (magicKey) {
        btn.classList.add('active');
        setTimeout(() => btn.classList.remove('active'), 150);
        player.castMagic(magicKey);
      }
    });
  });

  // キーボード
  function triggerMagicByKey(key) {
    const btn = document.getElementById(`btn-magic-${key}`);
    if (btn) {
      btn.classList.add('active');
      setTimeout(() => btn.classList.remove('active'), 150);
    }
    player.castMagic(key);
  }

  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    switch (e.code) {
      case 'KeyW': case 'ArrowUp': state.keys.forward = true; break;
      case 'KeyS': case 'ArrowDown': state.keys.backward = true; break;
      case 'KeyA': case 'ArrowLeft': state.keys.left = true; break;
      case 'KeyD': case 'ArrowRight': state.keys.right = true; break;
      case 'KeyL': case 'KeyG':
        state.keys.guard = true;
        state.isGuarding = true;
        if (btnGuard) btnGuard.classList.add('active');
        break;
      case 'Space': case 'KeyJ': player.attack(); break;
      case 'ShiftLeft': case 'ShiftRight': case 'KeyK': player.dash(); break;
      case 'KeyQ': case 'Digit1': triggerMagicByKey('explosion'); break;
      case 'KeyE': case 'Digit2': triggerMagicByKey('flame'); break;
      case 'KeyR': case 'Digit3': triggerMagicByKey('ice'); break;
      case 'KeyF': case 'Digit4': triggerMagicByKey('wind'); break;
      case 'KeyC': case 'Digit5': triggerMagicByKey('thunder'); break;
    }
  });

  window.addEventListener('keyup', (e) => {
    switch (e.code) {
      case 'KeyW': case 'ArrowUp': state.keys.forward = false; break;
      case 'KeyS': case 'ArrowDown': state.keys.backward = false; break;
      case 'KeyA': case 'ArrowLeft': state.keys.left = false; break;
      case 'KeyD': case 'ArrowRight': state.keys.right = false; break;
      case 'KeyL': case 'KeyG':
        state.keys.guard = false;
        state.isGuarding = false;
        if (btnGuard) btnGuard.classList.remove('active');
        break;
    }
  });
}

// =============================================================================
// 14. ショップUI
// =============================================================================
class ShopUI {
  constructor(player) {
    this.player = player;
    this.currentTab = 'magic';
    this.modal = document.getElementById('shop-modal');
    this.openBtn = document.getElementById('btn-open-shop');
    this.closeBtn = document.getElementById('btn-close-shop');
    this.backdrop = document.getElementById('shop-backdrop');
    this.grid = document.getElementById('shop-items-grid');
    this.tabs = document.querySelectorAll('.shop-tab');

    this.bindEvents();
  }

  bindEvents() {
    this.openBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); this.open(); });
    this.closeBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); this.close(); });
    this.backdrop.addEventListener('pointerdown', (e) => { e.preventDefault(); this.close(); });

    this.tabs.forEach((tab) => {
      tab.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        this.currentTab = tab.dataset.tab;
        this.tabs.forEach(t => t.classList.toggle('active', t === tab));
        this.render();
      });
    });
  }

  open() {
    this.prevMode = state.mode;
    state.mode = GAME_MODE.PAUSED;
    this.modal.classList.remove('hidden');
    updateHUD();
    this.render();
  }

  close() {
    state.mode = this.prevMode || GAME_MODE.PLAYING;
    this.modal.classList.add('hidden');
  }

  buyItem(categoryKey, item) {
    if (state.coins < item.price) {
      soundManager.playPlayerHurt();
      return;
    }
    soundManager.playBuy();
    state.coins -= item.price;
    saveData.coins = state.coins;

    const unlockKey = categoryKey === 'outfit' ? 'outfits' : (categoryKey === 'head' ? 'heads' : 'swords');
    if (!saveData.unlocked[unlockKey].includes(item.id)) {
      saveData.unlocked[unlockKey].push(item.id);
    }
    this.equipItem(categoryKey, item.id);
  }

  equipItem(categoryKey, itemId) {
    saveData.equipped[categoryKey] = itemId;
    if (categoryKey === 'outfit') {
      this.player.applyOutfit(itemId);
    } else if (categoryKey === 'head') {
      this.player.applyHeadGear(itemId);
    } else if (categoryKey === 'sword') {
      this.player.applySword(itemId);
    }
    SaveManager.save(saveData);
    updateHUD();
    this.render();
  }

  buyPet(item) {
    if (state.coins < item.price) {
      soundManager.playPlayerHurt();
      return;
    }
    soundManager.playBuy();
    state.coins -= item.price;
    saveData.coins = state.coins;

    if (!saveData.unlocked.pets.includes(item.id)) {
      saveData.unlocked.pets.push(item.id);
    }
    if (saveData.equipped.pets.length < 3) {
      this.equipPet(item.id);
    } else {
      SaveManager.save(saveData);
      updateHUD();
      this.render();
    }
  }

  equipPet(petId) {
    if (saveData.equipped.pets.length >= 3 || saveData.equipped.pets.includes(petId)) return;
    saveData.equipped.pets.push(petId);
    if (typeof petManager !== 'undefined' && petManager) petManager.rebuild(saveData.equipped.pets);
    SaveManager.save(saveData);
    updateHUD();
    this.render();
  }

  unequipPet(petId) {
    if (saveData.equipped.pets.length <= 1) return;
    saveData.equipped.pets = saveData.equipped.pets.filter(id => id !== petId);
    if (typeof petManager !== 'undefined' && petManager) petManager.rebuild(saveData.equipped.pets);
    SaveManager.save(saveData);
    updateHUD();
    this.render();
  }

  render() {
    this.grid.innerHTML = '';
    const tab = this.currentTab;

    if (tab === 'magic') {
      Object.values(MAGIC_DATA).forEach(magic => {
        const currentLevel = saveData.magicLevels[magic.id] || 1;
        const nextTier = magic.tiers[currentLevel];
        const isMax = currentLevel >= 3;

        const card = document.createElement('div');
        card.className = `item-card ${isMax ? 'is-max' : ''}`;
        card.innerHTML = `
          <span class="${isMax ? 'item-badge-slot' : 'item-badge-equipped'}">Lv.${currentLevel}</span>
          <div class="item-preview-box"><span class="item-icon-display">${magic.icon}</span></div>
          <div class="item-info">
            <h3 class="item-name">${magic.name}</h3>
            <p class="item-desc">${magic.tiers[currentLevel - 1].desc}</p>
          </div>
          <div class="item-action-row">
            <button class="item-btn ${isMax ? 'item-btn-max' : 'item-btn-buy'}">
              ${isMax ? '★ MAX (極限)' : `Lv.${currentLevel + 1}に強化 🪙${nextTier.price}`}
            </button>
          </div>
        `;
        if (!isMax) {
          card.querySelector('button').addEventListener('pointerdown', (e) => {
            e.preventDefault();
            if (state.coins >= nextTier.price) {
              soundManager.playBuy();
              state.coins -= nextTier.price;
              saveData.coins = state.coins;
              saveData.magicLevels[magic.id] = currentLevel + 1;
              SaveManager.save(saveData);
              updateStatusHUD();
              updateHUD();
              this.render();
            } else {
              soundManager.playPlayerHurt();
              card.classList.add('shake-anim');
              setTimeout(() => card.classList.remove('shake-anim'), 400);
            }
          });
        }
        this.grid.appendChild(card);
      });
    } else if (tab === 'outfit' || tab === 'head' || tab === 'sword') {
      const categoryKey = tab === 'outfit' ? 'outfits' : (tab === 'head' ? 'heads' : 'swords');
      const unlockKey = tab === 'outfit' ? 'outfits' : (tab === 'head' ? 'heads' : 'swords');
      const equipKey = tab;
      const items = ITEMS_DATA[categoryKey] || {};
      const unlockedList = saveData.unlocked[unlockKey] || ['default', 'none'];
      const equippedId = saveData.equipped[equipKey];

      Object.values(items).forEach(item => {
        const isUnlocked = unlockedList.includes(item.id);
        const isEquipped = equippedId === item.id;

        const card = document.createElement('div');
        card.className = `item-card ${isEquipped ? 'is-equipped' : ''}`;
        card.innerHTML = `
          ${isEquipped ? '<span class="item-badge-equipped">装備中</span>' : ''}
          <div class="item-preview-box">
            <span class="item-icon-display">${item.icon}</span>
            ${item.tag ? `<span class="item-effect-tag">${item.tag}</span>` : ''}
          </div>
          <div class="item-info">
            <h3 class="item-name">${item.name}</h3>
            <p class="item-desc">${item.desc}</p>
          </div>
          <div class="item-action-row">
            <button class="item-btn ${isEquipped ? 'item-btn-equipped' : (isUnlocked ? 'item-btn-equip' : 'item-btn-buy')}">
              ${isEquipped ? '✓ 装備中' : (isUnlocked ? '装備する' : `購入 🪙${item.price}`)}
            </button>
          </div>
        `;

        const btn = card.querySelector('button');
        btn.addEventListener('pointerdown', (e) => {
          e.preventDefault();
          if (isEquipped) return;
          if (isUnlocked) {
            this.equipItem(tab, item.id);
          } else {
            this.buyItem(tab, item);
          }
        });

        this.grid.appendChild(card);
      });
    } else if (tab === 'pet') {
      const items = ITEMS_DATA.pets || {};
      const unlockedPets = saveData.unlocked.pets || ['fairy'];
      const equippedPets = saveData.equipped.pets || ['fairy'];

      Object.values(items).forEach(item => {
        const isUnlocked = unlockedPets.includes(item.id);
        const slotIdx = equippedPets.indexOf(item.id);
        const isEquipped = slotIdx !== -1;

        const card = document.createElement('div');
        card.className = `item-card ${isEquipped ? 'is-equipped' : ''}`;
        card.innerHTML = `
          ${isEquipped ? `<span class="item-badge-slot">SLOT ${slotIdx + 1}</span>` : ''}
          <div class="item-preview-box">
            <span class="item-icon-display">${item.icon}</span>
            ${item.tag ? `<span class="item-effect-tag">${item.tag}</span>` : ''}
          </div>
          <div class="item-info">
            <h3 class="item-name">${item.name}</h3>
            <p class="item-desc">${item.desc} (攻撃間隔: ${item.attackInterval}s)</p>
          </div>
          <div class="item-action-row">
            ${isEquipped
              ? `<button class="item-btn item-btn-unequip">✕ 外す</button>`
              : `<button class="item-btn ${isUnlocked ? 'item-btn-equip' : 'item-btn-buy'}">
                   ${isUnlocked ? (equippedPets.length >= 3 ? '満杯 (3/3)' : '編成する') : `購入 🪙${item.price}`}
                 </button>`
            }
          </div>
        `;

        const btn = card.querySelector('button');
        btn.addEventListener('pointerdown', (e) => {
          e.preventDefault();
          if (isEquipped) {
            if (equippedPets.length <= 1) {
              card.classList.add('shake-anim');
              setTimeout(() => card.classList.remove('shake-anim'), 400);
              return;
            }
            this.unequipPet(item.id);
          } else if (isUnlocked) {
            if (equippedPets.length >= 3) {
              card.classList.add('shake-anim');
              setTimeout(() => card.classList.remove('shake-anim'), 400);
              return;
            }
            this.equipPet(item.id);
          } else {
            this.buyPet(item);
          }
        });

        this.grid.appendChild(card);
      });
    }
  }
}


// リサイズ
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// =============================================================================
// 14.5 ミニマップ (レーダー表示)
// =============================================================================
class MinimapRenderer {
  constructor() {
    this.canvas  = document.getElementById('minimap-canvas');
    this.ctx     = this.canvas ? this.canvas.getContext('2d') : null;
    this.size    = 130;         // canvas解像度
    this.range   = 120;         // 表示範囲 (ワールド単位)
    this.frame   = 0;           // フレームカウンタ
    this.updateEvery = 8;       // 8フレームに1回更新 (軽量化)
  }

  worldToMap(wx, wz, playerX, playerZ) {
    // プレイヤーを中心にワールド座標をマップ座標に変換
    const half = this.size / 2;
    const scale = this.size / this.range;
    return {
      mx: half + (wx - playerX) * scale,
      mz: half + (wz - playerZ) * scale,
    };
  }

  update(playerPos) {
    if (!this.ctx || state.mode === GAME_MODE.TITLE) return;
    this.frame++;
    if (this.frame % this.updateEvery !== 0) return;

    const ctx  = this.ctx;
    const S    = this.size;
    const px   = playerPos.x;
    const pz   = playerPos.z;

    // 背景 (ラジアルグラデーション)
    ctx.clearRect(0, 0, S, S);
    const grad = ctx.createRadialGradient(S/2, S/2, 0, S/2, S/2, S/2);
    grad.addColorStop(0,   'rgba( 20, 36, 58, 0.92)');
    grad.addColorStop(0.7, 'rgba( 10, 18, 30, 0.95)');
    grad.addColorStop(1,   'rgba(  5, 10, 18, 0.98)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(S/2, S/2, S/2, 0, Math.PI * 2);
    ctx.fill();

    // グリッドラインを薄く描画
    ctx.strokeStyle = 'rgba(56,189,248,0.08)';
    ctx.lineWidth   = 0.5;
    for (let i = 0; i < 4; i++) {
      const p = (i / 4) * S;
      ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, S); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(S, p); ctx.stroke();
    }

    // 同心円
    ctx.strokeStyle = 'rgba(56,189,248,0.10)';
    [0.25, 0.5, 0.75].forEach(r => {
      ctx.beginPath();
      ctx.arc(S/2, S/2, S/2 * r, 0, Math.PI * 2);
      ctx.stroke();
    });

    // ---- 静的オブジェクト (薄グレー点) — ランダムサンプリングで負荷抑制 ----
    ctx.fillStyle = 'rgba(120,120,120,0.35)';
    const step = Math.max(1, Math.floor(worldStaticObjects.length / 80)); // 最大 80点描画
    for (let i = 0; i < worldStaticObjects.length; i += step) {
      const obj = worldStaticObjects[i];
      const { mx, mz } = this.worldToMap(obj.x, obj.z, px, pz);
      if (mx < 0 || mx > S || mz < 0 || mz > S) continue;
      ctx.beginPath();
      ctx.arc(mx, mz, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // ---- アイテム (緑点) ----
    ctx.fillStyle = '#22c55e';
    itemManager.items.forEach(item => {
      const { mx, mz } = this.worldToMap(item.mesh.position.x, item.mesh.position.z, px, pz);
      if (mx < 0 || mx > S || mz < 0 || mz > S) return;
      ctx.beginPath();
      ctx.arc(mx, mz, 2.5, 0, Math.PI * 2);
      ctx.fill();
    });

    // ---- 敵 (赤点 / ボスは大きく黄色) ----
    enemyManager.enemies.forEach(e => {
      if (e.isDead || e.isDying || !e.group.visible) return;
      const { mx, mz } = this.worldToMap(e.group.position.x, e.group.position.z, px, pz);
      if (mx < 0 || mx > S || mz < 0 || mz > S) return;
      ctx.fillStyle = e.isBoss ? '#facc15' : '#ef4444';
      ctx.beginPath();
      ctx.arc(mx, mz, e.isBoss ? 4.0 : 2.0, 0, Math.PI * 2);
      ctx.fill();
    });

    // ---- 2P リモートプレイヤー (緑点) ----
    if (state.isMultiplayer && remotePlayer && remotePlayer.group.visible) {
      const { mx, mz } = this.worldToMap(remotePlayer.group.position.x, remotePlayer.group.position.z, px, pz);
      if (mx >= 0 && mx <= S && mz >= 0 && mz <= S) {
        ctx.fillStyle = '#34d399';
        ctx.beginPath();
        ctx.arc(mx, mz, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // ---- プレイヤー (白三角) ----
    const rotY = player.group.rotation.y;
    const tSize = 5;
    ctx.save();
    ctx.translate(S/2, S/2);
    ctx.rotate(-rotY + Math.PI); // カメラ方向に合わせる
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur  = 6;
    ctx.beginPath();
    ctx.moveTo(0, -tSize);
    ctx.lineTo(-tSize * 0.7, tSize * 0.7);
    ctx.lineTo(tSize  * 0.7, tSize * 0.7);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // ---- 外枠の円をくっきりと ----
    ctx.strokeStyle = 'rgba(56,189,248,0.55)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(S/2, S/2, S/2 - 1, 0, Math.PI * 2);
    ctx.stroke();
  }
}

// =============================================================================
// 15. メインゲームループ初期化 & 実行
// =============================================================================
const magicSystem = new MagicSystem();
const player = new Player();
const remotePlayer = new RemotePlayer();
const networkManager = new NetworkManager();
networkManager.init(remotePlayer);

const enemyManager = new EnemyManager();
const stageManager = new StageManager();
const petManager = new PetManager(player);
const cameraController = new CameraController(camera, player);
const itemManager = new ItemManager();
const shopUI = new ShopUI(player);
const minimap = new MinimapRenderer();

setupControls(player);
updateHUD();
updateStatusHUD();

const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const rawDelta = Math.min(clock.getDelta(), 0.1);
  let delta = rawDelta;

  if (state.slowMoTimer > 0) {
    state.slowMoTimer -= rawDelta;
    delta = rawDelta * 0.25; // 4倍スロー
  } else if (state.hitStopTimer > 0) {
    state.hitStopTimer -= rawDelta;
    delta = rawDelta * 0.08;
  }

  updateDungeonEnvironment(rawDelta);
  confettiManager.update(rawDelta);

  if (state.mode === GAME_MODE.PLAYING || state.mode === GAME_MODE.VICTORY) {
    player.update(delta);
    petManager.update(delta);
    if (state.isMultiplayer) {
      remotePlayer.update(delta);
    }
    enemyManager.update(delta, player.group.position);
    applySeparationPhysics();     // 重なり防止コリジョン
    magicSystem.update(rawDelta);
    itemManager.update(delta, player.group.position); // 回復アイテム更新
  }

  // ミニマップ更新 (8フレームに1回)
  minimap.update(player.group.position);

  cameraController.update(rawDelta);
  renderer.render(scene, camera);
}

animate();

