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
  keys: { forward: false, backward: false, left: false, right: false, dash: false },
  controlSensitivity: 1.0,

  // ダッシュ状態
  isDashing: false,
  dashTimer: 0,
  dashCooldownTimer: 0,
  dashDirection: new THREE.Vector3(),
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
      const bufferSize = this.ctx.sampleRate * (0.3 + tier * 0.15);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, now);
      filter.frequency.exponentialRampToValueAtTime(60, now + 0.4);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(1.0 + tier * 0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);
      noise.start(now);
      noise.stop(now + 0.45);
    } else {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = element === 'thunder' ? 'square' : (element === 'ice' ? 'sine' : 'sawtooth');
      osc.frequency.setValueAtTime(element === 'thunder' ? 1800 : (element === 'ice' ? 1400 : 380), now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.28);

      gain.gain.setValueAtTime(0.8, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.28);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.3);
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

// =============================================================================
// 5. Three.js 基本セットアップ & ダンジョン環境
// =============================================================================
const container = document.getElementById('game-container');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x06070a);
scene.fog = new THREE.FogExp2(0x090b10, 0.028);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 120);
camera.position.set(0, 6, -8);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
container.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0x1e293b, 1.2);
scene.add(ambientLight);

const moonLight = new THREE.DirectionalLight(0x60a5fa, 0.6);
moonLight.position.set(10, 25, -15);
scene.add(moonLight);

const dirLight = new THREE.DirectionalLight(0xffedd5, 1.4);
dirLight.position.set(-12, 18, 10);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 1024;
dirLight.shadow.mapSize.height = 1024;
scene.add(dirLight);

// ダンジョンフロア・壁・松明
let dungeonFloorMesh = null;
let dungeonFloorMat = null;
const dungeonAnimatedObjects = {
  torches: [],
  sporeMesh: null,
  sporePositions: null,
};

function createDungeonEnvironment() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#1c1f26';
  ctx.fillRect(0, 0, 512, 512);

  const tileSize = 64;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const x = c * tileSize + (r % 2 === 1 ? tileSize / 2 : 0);
      const y = r * tileSize;
      const lum = Math.floor(25 + Math.random() * 20);
      ctx.fillStyle = `rgb(${lum + 5}, ${lum + 8}, ${lum + 12})`;
      ctx.fillRect(x + 2, y + 2, tileSize - 4, tileSize - 4);
    }
  }
  const floorTex = new THREE.CanvasTexture(canvas);
  floorTex.wrapS = THREE.RepeatWrapping;
  floorTex.wrapT = THREE.RepeatWrapping;
  floorTex.repeat.set(12, 12);

  dungeonFloorMat = new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.85, metalness: 0.15 });
  dungeonFloorMesh = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), dungeonFloorMat);
  dungeonFloorMesh.rotation.x = -Math.PI / 2;
  dungeonFloorMesh.receiveShadow = true;
  scene.add(dungeonFloorMesh);

  // 外周柱・かがり火
  const pillarMat = new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.9 });
  const fireMat = new THREE.MeshBasicMaterial({ color: 0xf97316 });

  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const radius = 33;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;

    const pillar = new THREE.Mesh(new THREE.BoxGeometry(1.6, 6.5, 1.6), pillarMat);
    pillar.position.set(x, 3.25, z);
    pillar.castShadow = true;
    pillar.receiveShadow = true;
    scene.add(pillar);

    const fireMesh = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.8, 6), fireMat);
    fireMesh.position.set(x, 4.0, z);
    scene.add(fireMesh);

    const torchLight = new THREE.PointLight(0xf97316, 1.8, 16);
    torchLight.position.set(x, 4.0, z);
    scene.add(torchLight);

    dungeonAnimatedObjects.torches.push({ light: torchLight, fireMesh, baseIntensity: 1.8, phase: i });
  }

  // 浮遊胞子
  const sporeCount = 80;
  const sporeGeo = new THREE.BufferGeometry();
  const sporePositions = new Float32Array(sporeCount * 3);
  const sporeColors = new Float32Array(sporeCount * 3);

  for (let i = 0; i < sporeCount; i++) {
    sporePositions[i * 3] = (Math.random() - 0.5) * 60;
    sporePositions[i * 3 + 1] = Math.random() * 8 + 0.3;
    sporePositions[i * 3 + 2] = (Math.random() - 0.5) * 60;

    sporeColors[i * 3] = 0.96; sporeColors[i * 3 + 1] = 0.65; sporeColors[i * 3 + 2] = 0.2;
  }

  sporeGeo.setAttribute('position', new THREE.BufferAttribute(sporePositions, 3));
  sporeGeo.setAttribute('color', new THREE.BufferAttribute(sporeColors, 3));
  const sporeMat = new THREE.PointsMaterial({ size: 0.28, vertexColors: true, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending });

  dungeonAnimatedObjects.sporeMesh = new THREE.Points(sporeGeo, sporeMat);
  dungeonAnimatedObjects.sporePositions = sporePositions;
  scene.add(dungeonAnimatedObjects.sporeMesh);
}

function applyStageEnvironment(stage) {
  scene.fog.color.setHex(stage.fogColor);
  scene.background.setHex(stage.fogColor);
  ambientLight.color.setHex(stage.ambientColor);

  dungeonAnimatedObjects.torches.forEach(t => {
    t.light.color.setHex(stage.torchColor);
    t.fireMesh.material.color.setHex(stage.torchColor);
  });
}

function updateDungeonEnvironment(delta) {
  dungeonAnimatedObjects.torches.forEach(t => {
    const flicker = Math.sin(Date.now() * 0.015 + t.phase) * 0.3;
    t.light.intensity = Math.max(t.baseIntensity + flicker, 0.8);
  });

  if (dungeonAnimatedObjects.sporeMesh && dungeonAnimatedObjects.sporePositions) {
    const pos = dungeonAnimatedObjects.sporePositions;
    for (let i = 0; i < pos.length / 3; i++) {
      pos[i * 3 + 1] += delta * 0.35;
      if (pos[i * 3 + 1] > 8.5) pos[i * 3 + 1] = 0.3;
    }
    dungeonAnimatedObjects.sporeMesh.geometry.attributes.position.needsUpdate = true;
  }
}

createDungeonEnvironment();

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
    const skinMat   = new THREE.MeshStandardMaterial({ color: 0xffcc88, roughness: 0.7, metalness: 0.0 });
    const hairMat   = new THREE.MeshStandardMaterial({ color: 0x1c1008, roughness: 0.9, metalness: 0.0 });
    const armorMat  = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.25, metalness: 0.85 });
    const cloakMat  = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.8, metalness: 0.0 });
    const beltMat   = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.6, metalness: 0.2 });
    const bladeMat  = new THREE.MeshStandardMaterial({ color: 0xdbeafe, emissive: 0x2563eb, emissiveIntensity: 0.6, roughness: 0.05, metalness: 1.0 });
    const guardMat  = new THREE.MeshStandardMaterial({ color: 0xffd700, emissive: 0xaa7700, emissiveIntensity: 0.3, roughness: 0.3, metalness: 0.9 });

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
    const visorMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x38bdf8, emissiveIntensity: 0.5, transparent: true, opacity: 0.85, roughness: 0.0 });
    const visor = new THREE.Mesh(visorGeo, visorMat);
    visor.position.set(0, 0.16, 0.22);
    this.headGroup.add(visor);

    // ヘルメット鼻ガード
    const noseGuardGeo = new THREE.BoxGeometry(0.06, 0.22, 0.04);
    const noseGuard = new THREE.Mesh(noseGuardGeo, armorMat);
    noseGuard.position.set(0, 0.06, 0.22);
    this.headGroup.add(noseGuard);

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
      // 通常移動
      soundManager.unlock();
      const worldX = -screenX / (inputLen > 1 ? inputLen : 1);
      const worldZ = screenZ / (inputLen > 1 ? inputLen : 1);

      this.velocity.x = worldX * CONFIG.playerSpeed * state.controlSensitivity;
      this.velocity.z = worldZ * CONFIG.playerSpeed * state.controlSensitivity;

      const targetRot = Math.atan2(worldX, worldZ);
      let diff = targetRot - this.group.rotation.y;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      this.group.rotation.y += diff * Math.min(delta * CONFIG.playerTurnSpeed, 1.0);

      this.group.position.x += this.velocity.x * delta;
      this.group.position.z += this.velocity.z * delta;

      this.walkCycle += delta * 12;
    } else {
      this.velocity.set(0, 0, 0);
      this.walkCycle += delta * 2;
    }

    // フィールド境界制限
    const distCenter = Math.sqrt(this.group.position.x ** 2 + this.group.position.z ** 2);
    if (distCenter > 33.5) {
      this.group.position.x = (this.group.position.x / distCenter) * 33.5;
      this.group.position.z = (this.group.position.z / distCenter) * 33.5;
    }

    // ダッシュ残像の更新
    this.updateDashTrails(delta);

    if (state.isAttacking) {
      this.updateAttackAnimation(delta);
    } else if (!state.isDashing) {
      // 歩行アニメーションを実行（足・腕・胴の連動）
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

  takeDamage(amount, fromPos) {
    if (this.invincibleTimer > 0 || state.mode === GAME_MODE.GAMEOVER) return;

    this.hp = Math.max(0, this.hp - amount);
    this.invincibleTimer = 1.0;

    soundManager.playPlayerHurt();
    cameraController.shake(0.35);

    const overlay = document.getElementById('damage-overlay');
    if (overlay) {
      overlay.classList.add('is-hit');
      setTimeout(() => overlay.classList.remove('is-hit'), 180);
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

  // 歩行アニメーション (walkCycleに連動して足・腕・胴を動かす)
  animateWalk(delta, isMoving) {
    if (!this.leftLeg || !this.rightLeg) return;
    const speed = isMoving ? 12 : 2;
    this.walkCycle += delta * speed;
    const swing = isMoving ? 0.35 : 0.06;
    // 足を前後に振る
    this.leftLeg.rotation.x  =  Math.sin(this.walkCycle) * swing;
    this.rightLeg.rotation.x = -Math.sin(this.walkCycle) * swing;
    // 左腕は右足と逆相に振る
    if (this.leftArmPivot) this.leftArmPivot.rotation.x = -Math.sin(this.walkCycle) * swing * 0.7;
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
  }
}

// =============================================================================
// 7. 魔法システム (5大属性 × 3段階レベル)
// =============================================================================
class MagicSystem {
  constructor() {
    this.activeSpells = [];
  }

  cast(element, tier, originPos, playerAngle) {
    const forward = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), playerAngle);

    if (element === 'explosion') {
      const radius = tier === 3 ? 11.0 : (tier === 2 ? 6.5 : 4.2);
      const damage = tier === 3 ? 140 : (tier === 2 ? 80 : 45);
      const targetPos = originPos.clone().addScaledVector(forward, 4.0);
      this.spawnExplosionEffect(targetPos, tier);
      this.dealAreaDamage(targetPos, radius, damage, 'explosion', true);

    } else if (element === 'flame') {
      const geo = new THREE.SphereGeometry(0.45, 8, 8);
      const mat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(originPos).add(new THREE.Vector3(0, 1.2, 0));
      scene.add(mesh);

      const vel = forward.clone().multiplyScalar(18.0);
      let life = 1.5;

      this.activeSpells.push({
        mesh,
        update: (delta) => {
          life -= delta;
          mesh.position.addScaledVector(vel, delta);
          enemyManager.enemies.forEach((enemy) => {
            if (!enemy.isDead && !enemy.isDying && enemy.group.position.distanceTo(mesh.position) < 1.4) {
              enemy.takeDamage(35, forward, 'flame');
            }
          });
          if (life <= 0) {
            scene.remove(mesh);
            return false;
          }
          return true;
        }
      });

    } else if (element === 'ice') {
      const geo = new THREE.RingGeometry(0.5, 6.0, 24);
      const mat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide, transparent: true, opacity: 0.9 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(originPos);
      mesh.position.y = 0.1;
      mesh.rotation.x = -Math.PI / 2;
      scene.add(mesh);

      this.dealAreaDamage(originPos, 6.5, 50, 'ice');
      enemyManager.enemies.forEach(e => {
        if (e.group.position.distanceTo(originPos) < 6.5) e.freeze(3.0);
      });

      this.activeSpells.push({
        mesh,
        update: (delta) => {
          mat.opacity -= delta * 1.5;
          if (mat.opacity <= 0) {
            scene.remove(mesh);
            return false;
          }
          return true;
        }
      });

    } else if (element === 'wind') {
      this.dealAreaDamage(originPos, 8.0, 60, 'wind', true);
      cameraController.shake(0.3);

    } else if (element === 'thunder') {
      enemyManager.enemies.forEach(target => {
        if (target.group.position.distanceTo(originPos) < 12.0) {
          target.takeDamage(55, new THREE.Vector3(0, 0, 0), 'thunder');
          soundManager.playWeakHit();
        }
      });
      cameraController.shake(0.3);
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

  spawnExplosionEffect(pos, tier) {
    const geo = new THREE.SphereGeometry(tier === 3 ? 4.5 : 2.5, 16, 16);
    const mat = new THREE.MeshBasicMaterial({ color: 0xf97316, transparent: true, opacity: 0.9 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pos);
    mesh.position.y = 1.0;
    scene.add(mesh);

    this.activeSpells.push({
      mesh,
      update: (delta) => {
        mesh.scale.multiplyScalar(1.0 + delta * 14.0);
        mat.opacity -= delta * 3.5;
        if (mat.opacity <= 0) {
          scene.remove(mesh);
          return false;
        }
        return true;
      }
    });
    cameraController.shake(0.3);
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
      stageManager.onBossDefeated();
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
  }

  update(delta, playerPos) {
    if (state.mode !== GAME_MODE.PLAYING) return;

    this.spawnTimer += delta;
    if (this.spawnTimer >= CONFIG.spawnInterval && this.getActiveRegularCount() < CONFIG.maxRegularEnemies) {
      this.spawnTimer = 0;
      this.spawnRandomEnemy(playerPos);
    }

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (e.isDead) {
        this.enemies.splice(i, 1);
      } else {
        e.update(delta, playerPos);
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

    enemy.group.position.set(x, 0, z);
    scene.add(enemy.group);
    this.enemies.push(enemy);
  }

  spawnBoss(type, playerPos) {
    const angle = Math.random() * Math.PI * 2;
    const x = playerPos.x + Math.cos(angle) * 16.0;
    const z = playerPos.z + Math.sin(angle) * 16.0;

    const boss = (type === 'king_goblin') ? new KingGoblinEnemy() : new DemonEnemy();
    boss.group.position.set(x, 0, z);
    scene.add(boss.group);
    this.enemies.push(boss);

    showBossHpBar(boss);
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

    // プレイヤーから5〜16ユニット離れた場所にスポーン
    const angle = Math.random() * Math.PI * 2;
    const dist = 5 + Math.random() * 11;
    const x = Math.max(-32, Math.min(32, playerPos.x + Math.cos(angle) * dist));
    const z = Math.max(-32, Math.min(32, playerPos.z + Math.sin(angle) * dist));

    // 3Dメッシュを作成 (ボトル形状 = 小さなカプセル)
    const group = new THREE.Group();
    group.position.set(x, 1.0, z);

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

    dirLight.position.set(targetPos.x - 12, 18, targetPos.z + 10);
    dirLight.target.position.copy(targetPos);
    dirLight.target.updateMatrixWorld();
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
    soundManager.playCoin();
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
    player.group.position.set(0, 0, 0);
  }

  btnReturnTitle.addEventListener('pointerdown', (e) => { e.preventDefault(); returnToTitle(); });
  btnGoTitle.addEventListener('pointerdown', (e) => { e.preventDefault(); returnToTitle(); });

  retryBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); player.respawn(); });

  // 魔法ボタン
  ['explosion', 'flame', 'ice', 'wind', 'thunder'].forEach(key => {
    const btn = document.getElementById(`btn-magic-${key}`);
    if (btn) {
      btn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        player.castMagic(key);
      });
    }
  });

  // ジョイスティック
  const joystickZone = document.getElementById('joystick-zone');
  const joystickKnob = document.getElementById('joystick-knob');
  const attackBtn = document.getElementById('btn-attack');
  let touchId = null;
  let center = { x: 0, y: 0 };
  const maxRadius = 46;

  joystickZone.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    if (touchId === null) {
      touchId = e.pointerId;
      joystickZone.setPointerCapture(e.pointerId);
      const rect = joystickZone.getBoundingClientRect();
      center = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    }
  });

  joystickZone.addEventListener('pointermove', (e) => {
    e.preventDefault();
    if (touchId === e.pointerId) {
      const deltaX = e.clientX - center.x;
      const deltaY = e.clientY - center.y;
      const dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      const angle = Math.atan2(deltaY, deltaX);
      const clampedDist = Math.min(dist, maxRadius);
      const knobX = Math.cos(angle) * clampedDist;
      const knobY = Math.sin(angle) * clampedDist;

      joystickKnob.style.transform = `translate(${knobX}px, ${knobY}px)`;
      state.moveVector.x = knobX / maxRadius;
      state.moveVector.y = -knobY / maxRadius;
    }
  });

  const stopJoystick = (e) => {
    if (touchId === e.pointerId) {
      touchId = null;
      joystickZone.releasePointerCapture(e.pointerId);
      joystickKnob.style.transform = 'translate(0px, 0px)';
      state.moveVector.set(0, 0);
    }
  };
  joystickZone.addEventListener('pointerup', stopJoystick);
  joystickZone.addEventListener('pointercancel', stopJoystick);

  attackBtn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    player.attack();
  });

  // ダッシュボタン（モバイル）
  const dashBtn = document.getElementById('btn-dash');
  if (dashBtn) {
    dashBtn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      player.dash();
    });
  }

  window.addEventListener('keydown', (e) => {
    switch (e.code) {
      case 'KeyW': case 'ArrowUp': state.keys.forward = true; break;
      case 'KeyS': case 'ArrowDown': state.keys.backward = true; break;
      case 'KeyA': case 'ArrowLeft': state.keys.left = true; break;
      case 'KeyD': case 'ArrowRight': state.keys.right = true; break;
      case 'Space': case 'KeyJ': player.attack(); break;
      case 'ShiftLeft': case 'ShiftRight': case 'KeyX': player.dash(); break; // Shift or X でダッシュ
      case 'KeyQ': case 'Digit1': player.castMagic('explosion'); break;
      case 'KeyE': case 'Digit2': player.castMagic('flame'); break;
      case 'KeyR': case 'Digit3': player.castMagic('ice'); break;
      case 'KeyF': case 'Digit4': player.castMagic('wind'); break;
      case 'KeyC': case 'Digit5': player.castMagic('thunder'); break;
    }
  });

  window.addEventListener('keyup', (e) => {
    switch (e.code) {
      case 'KeyW': case 'ArrowUp': state.keys.forward = false; break;
      case 'KeyS': case 'ArrowDown': state.keys.backward = false; break;
      case 'KeyA': case 'ArrowLeft': state.keys.left = false; break;
      case 'KeyD': case 'ArrowRight': state.keys.right = false; break;
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

  render() {
    this.grid.innerHTML = '';
    if (this.currentTab === 'magic') {
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
              const tag = document.getElementById(`tag-level-${magic.id}`);
              if (tag) tag.innerText = `Lv.${currentLevel + 1}`;
              updateHUD();
              this.render();
            }
          });
        }
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
// 15. メインゲームループ初期化 & 実行
// =============================================================================
const magicSystem = new MagicSystem();
const player = new Player();
const enemyManager = new EnemyManager();
const stageManager = new StageManager();
const cameraController = new CameraController(camera, player);
const itemManager = new ItemManager();
const shopUI = new ShopUI(player);

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
    enemyManager.update(delta, player.group.position);
    applySeparationPhysics();     // 重なり防止コリジョン
    magicSystem.update(rawDelta);
    itemManager.update(delta, player.group.position); // 回復アイテム更新
  }

  cameraController.update(rawDelta);
  renderer.render(scene, camera);
}

animate();
