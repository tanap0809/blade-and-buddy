/**
 * Blade & Buddy - 3D Action Game Prototype
 * Three.js (CDN) + GLTFLoader + iPad Safari Touch Controls + Cyber Shop & Multi-Pet Team System
 */

// =============================================================================
// 1. ゲーム設定 & グローバル状態
// =============================================================================
const CONFIG = {
  playerSpeed: 7.5,
  playerTurnSpeed: 14.0,
  zombieSpeed: 2.2,
  zombieMaxCount: 15,
  spawnInterval: 2.2, // 秒
  attackCooldown: 0.35, // 攻撃クールダウン
  attackRange: 2.8,
  attackAngle: Math.PI * 0.65, // 前方約117度
  cameraOffset: new THREE.Vector3(0, 5.2, -6.5),
  cameraLookOffset: new THREE.Vector3(0, 1.2, 2.0),
  cameraLerp: 0.1,
  // ペット基本設定 (3体フォーメーション用オフセット)
  petOffsets: [
    new THREE.Vector3(-1.4, 1.8, -1.2), // 1体目: 左後方
    new THREE.Vector3(1.4, 1.8, -1.2),  // 2体目: 右後方
    new THREE.Vector3(0.0, 2.4, -1.8),  // 3体目: 真後方・高め
  ],
  petFollowSpeed: 6.0,
  petAttackRange: 12.0,   // 索敵射程
};

// =============================================================================
// 1.5 外部3Dモデル設定 (GLTF / GLB)
// =============================================================================
const MODEL_CONFIG = {
  player: {
    url: '',
    scale: 1.0,
    positionOffset: new THREE.Vector3(0, 0, 0),
    rotationOffset: new THREE.Euler(0, 0, 0),
    rightHandBoneNames: ['RightHand', 'mixamorigRightHand', 'hand.R', 'Hand.R', 'weapon_socket_r', 'Bip01_R_Hand'],
  },
  buddy: {
    url: '',
    scale: 1.0,
    positionOffset: new THREE.Vector3(0, 0, 0),
    rotationOffset: new THREE.Euler(0, 0, 0),
  },
  zombie: {
    url: '',
    scale: 1.0,
    positionOffset: new THREE.Vector3(0, 0, 0),
    rotationOffset: new THREE.Euler(0, 0, 0),
  },
  sword: {
    url: '',
    scale: 1.0,
    positionOffset: new THREE.Vector3(0, 0, 0),
    rotationOffset: new THREE.Euler(0, 0, 0),
  },
};

window.MODEL_CONFIG = MODEL_CONFIG;

const state = {
  kills: 0,
  coins: 0,
  isPaused: false,
  isAttacking: false,
  attackTimer: 0,
  canAttack: true,
  moveVector: new THREE.Vector2(0, 0),
  keys: { forward: false, backward: false, left: false, right: false },
};

// =============================================================================
// 2. ショップアイテム定義 (衣装・頭装備・刀・ペット7種)
// =============================================================================
const ITEMS_DATA = {
  outfits: {
    default: {
      id: 'default',
      name: 'サイバーブルー',
      price: 0,
      desc: '標準支給のサイバースーツ。バランスの良い耐刃仕様。',
      icon: '🥋',
      heroColor: 0x2563eb,
      darkColor: 0x0f172a,
      visorColor: 0x38bdf8,
    },
    crimson: {
      id: 'crimson',
      name: 'クリムゾンレッド',
      price: 50,
      desc: '紅蓮の闘志を宿したスーツ。激戦をくぐり抜けた証。',
      icon: '🔴',
      heroColor: 0xef4444,
      darkColor: 0x450a0a,
      visorColor: 0xfca5a5,
    },
    shadow: {
      id: 'shadow',
      name: 'シャドウブラック',
      price: 100,
      desc: '闇夜に溶け込む漆黒のステルスニンジャスーツ。',
      icon: '🥷',
      heroColor: 0x18181b,
      darkColor: 0x09090b,
      visorColor: 0xa855f7,
    },
    gold: {
      id: 'gold',
      name: 'ゴールデンナイト',
      price: 200,
      desc: '黄金の輝きを放つ高貴なバトルアーマー。',
      icon: '👑',
      heroColor: 0xeab308,
      darkColor: 0x713f12,
      visorColor: 0xfef08a,
    },
    neon_green: {
      id: 'neon_green',
      name: 'ネオングリーン',
      price: 120,
      desc: '超高伝導のサイバーパンクスーツ。暗闇で蛍光発光。',
      icon: '🟢',
      heroColor: 0x10b981,
      darkColor: 0x064e3b,
      visorColor: 0x6ee7b7,
    },
  },
  heads: {
    none: {
      id: 'none',
      name: 'なし (標準バイザー)',
      price: 0,
      desc: '頭部パーツなしのすっきりしたスタイル。',
      icon: '👤',
    },
    sunglasses: {
      id: 'sunglasses',
      name: 'クールサングラス',
      price: 40,
      desc: '暗視・照準アシストを内蔵したスタイリッシュなサングラス。',
      icon: '🕶️',
    },
    ninja_band: {
      id: 'ninja_band',
      name: '忍のハチマキ',
      price: 80,
      desc: '風になびく紅いハチマキ。集中力と敏捷性を高める。',
      icon: '🧣',
    },
    samurai_helm: {
      id: 'samurai_helm',
      name: 'サムライ兜',
      price: 150,
      desc: '黄金の前立てが堂々と輝く伝統とハイテクの融合兜。',
      icon: '⛩️',
    },
    cyber_horns: {
      id: 'cyber_horns',
      name: 'サイバーホーン',
      price: 180,
      desc: '高出力ネオンエネルギーを放つサイバー角アンテナ。',
      icon: '😈',
    },
  },
  swords: {
    default: {
      id: 'default',
      name: 'サイバーブレード',
      price: 0,
      desc: '青く発光する標準的な高周波サイバー刀。',
      icon: '🗡️',
      bladeColor: 0x38bdf8,
      emissive: 0x0284c7,
      slashColor: 0x38bdf8,
      effectType: null,
      tag: 'NORMAL',
    },
    flame: {
      id: 'flame',
      name: '焔切・紅蓮 (炎)',
      price: 80,
      desc: '紅蓮の炎を常にまとい、火の粉が舞い散る灼熱の刀。',
      icon: '🔥',
      bladeColor: 0xf97316,
      emissive: 0xd97706,
      slashColor: 0xef4444,
      effectType: 'flame',
      tag: '炎属性',
    },
    thunder: {
      id: 'thunder',
      name: '雷切・鳴神 (雷)',
      price: 120,
      desc: '激しい青白のスパークと雷光を放つ迅雷の太刀。',
      icon: '⚡',
      bladeColor: 0x67e8f9,
      emissive: 0x0284c7,
      slashColor: 0x38bdf8,
      effectType: 'thunder',
      tag: '雷属性',
    },
    void: {
      id: 'void',
      name: '虚空・冥府 (闇)',
      price: 180,
      desc: '冥府の妖気とダークマターをまとう紫紺の妖刀。',
      icon: '🔮',
      bladeColor: 0xc084fc,
      emissive: 0x7e22ce,
      slashColor: 0xa855f7,
      effectType: 'void',
      tag: '闇属性',
    },
    sunlight: {
      id: 'sunlight',
      name: '聖剣ソラリス (光)',
      price: 250,
      desc: '神聖な黄金の光粒子を放つ伝説の光刃。',
      icon: '✨',
      bladeColor: 0xfde047,
      emissive: 0xeab308,
      slashColor: 0xfacc15,
      effectType: 'holy',
      tag: '光属性',
    },
  },
  // ペット定義 (全7種類: フェアリー + 新規6種)
  pets: {
    fairy: {
      id: 'fairy',
      name: 'フェアリー (妖精)',
      price: 0,
      desc: 'ピンクの魔法光弾で3秒毎にバランスよく援護。',
      icon: '🧚',
      bulletType: 'magic',
      bulletSpeed: 16.0,
      attackInterval: 3.0,
      tag: 'バランス型',
    },
    gorilla: {
      id: 'gorilla',
      name: 'マッスルゴリラ',
      price: 80,
      desc: '重力岩石弾を投げつけ、ゾンビを一撃粉砕する剛力バディ。',
      icon: '🦍',
      bulletType: 'rock',
      bulletSpeed: 14.0,
      attackInterval: 3.2,
      tag: '高威力岩石',
    },
    lion: {
      id: 'lion',
      name: 'ブレイズライオン',
      price: 120,
      desc: '百獣の王の咆哮とともに紅蓮の火球を放ち敵を焼き尽くす。',
      icon: '🦁',
      bulletType: 'fireball',
      bulletSpeed: 18.0,
      attackInterval: 2.8,
      tag: '爆熱火球',
    },
    pig: {
      id: 'pig',
      name: 'ピギーラッキー',
      price: 60,
      desc: '愛らしいピンクの幸運ブタ。バウンドするマッドボムを投擲。',
      icon: '🐷',
      bulletType: 'mud',
      bulletSpeed: 15.0,
      attackInterval: 3.0,
      tag: 'マッドボム',
    },
    dog: {
      id: 'dog',
      name: 'シバイヌ・ボルト',
      price: 70,
      desc: '忠実な相棒犬。回転するボーンブーメランを素早く射出。',
      icon: '🐶',
      bulletType: 'bone',
      bulletSpeed: 19.0,
      attackInterval: 2.3,
      tag: '快速迎撃',
    },
    cheetah: {
      id: 'cheetah',
      name: 'ソニックチーター',
      price: 150,
      desc: '最速のプレデター。電光レーザー弾を猛烈な速度で連射。',
      icon: '🐆',
      bulletType: 'laser',
      bulletSpeed: 24.0,
      attackInterval: 1.8,
      tag: '超連射レーザー',
    },
    unicorn: {
      id: 'unicorn',
      name: 'スターユニコーン',
      price: 200,
      desc: '神秘の聖獣。七色に煌めくスター光線で敵を貫く。',
      icon: '🦄',
      bulletType: 'rainbow',
      bulletSpeed: 20.0,
      attackInterval: 2.5,
      tag: 'レインボー光線',
    },
  },
};

// =============================================================================
// 3. セーブデータ管理 (localStorage / 最大3体ペット編成対応)
// =============================================================================
class SaveManager {
  static STORAGE_KEY = 'blade_and_buddy_save_v1';

  static getDefaultData() {
    return {
      coins: 0,
      equipped: {
        outfit: 'default',
        head: 'none',
        sword: 'default',
        pets: ['fairy'], // 最大3体まで編成可能
      },
      unlocked: {
        outfits: ['default'],
        heads: ['none'],
        swords: ['default'],
        pets: ['fairy'],
      },
    };
  }

  static load() {
    try {
      const json = localStorage.getItem(this.STORAGE_KEY);
      if (!json) return this.getDefaultData();
      const data = JSON.parse(json);

      // マイグレーション: 旧形式の単一petから配列petsへの移行
      let pets = ['fairy'];
      if (Array.isArray(data.equipped?.pets)) {
        pets = data.equipped.pets.filter(p => ITEMS_DATA.pets[p]).slice(0, 3);
        if (pets.length === 0) pets = ['fairy'];
      } else if (typeof data.equipped?.pet === 'string' && ITEMS_DATA.pets[data.equipped.pet]) {
        pets = [data.equipped.pet];
      }

      let unlockedPets = ['fairy'];
      if (Array.isArray(data.unlocked?.pets)) {
        unlockedPets = data.unlocked.pets.filter(p => ITEMS_DATA.pets[p]);
        if (!unlockedPets.includes('fairy')) unlockedPets.push('fairy');
      }

      return {
        coins: typeof data.coins === 'number' ? data.coins : 0,
        equipped: {
          outfit: data.equipped?.outfit || 'default',
          head: data.equipped?.head || 'none',
          sword: data.equipped?.sword || 'default',
          pets,
        },
        unlocked: {
          outfits: Array.isArray(data.unlocked?.outfits) ? data.unlocked.outfits : ['default'],
          heads: Array.isArray(data.unlocked?.heads) ? data.unlocked.heads : ['none'],
          swords: Array.isArray(data.unlocked?.swords) ? data.unlocked.swords : ['default'],
          pets: unlockedPets,
        },
      };
    } catch (e) {
      console.warn('Failed to load save data from localStorage:', e);
      return this.getDefaultData();
    }
  }

  static save(data) {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('Failed to save data to localStorage:', e);
    }
  }
}

const saveData = SaveManager.load();
state.coins = saveData.coins;

// =============================================================================
// 3.5 モデルローダー (GLTFLoader)
// =============================================================================
class ModelLoader {
  constructor() {
    this.loader = (typeof THREE.GLTFLoader !== 'undefined') ? new THREE.GLTFLoader() : null;
    this.cache = new Map();
  }

  async loadGLTF(url) {
    if (!url) return null;
    if (!this.loader) {
      console.warn('GLTFLoader is not available in Three.js.');
      return null;
    }

    if (this.cache.has(url)) {
      return this.cloneGLTFData(this.cache.get(url));
    }

    return new Promise((resolve) => {
      this.loader.load(
        url,
        (gltf) => {
          gltf.scene.traverse((child) => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });
          this.cache.set(url, gltf);
          resolve(this.cloneGLTFData(gltf));
        },
        undefined,
        (error) => {
          console.warn(`[ModelLoader] Failed to load GLTF from "${url}":`, error);
          resolve(null);
        }
      );
    });
  }

  cloneGLTFData(gltf) {
    return {
      scene: gltf.scene.clone(true),
      animations: gltf.animations || [],
    };
  }

  findRightHandBone(model, candidateNames) {
    let targetBone = null;
    model.traverse((child) => {
      if (targetBone) return;
      if (child.isBone || child.isObject3D) {
        if (candidateNames.some((name) => child.name.toLowerCase().includes(name.toLowerCase()))) {
          targetBone = child;
        }
      }
    });
    return targetBone;
  }
}

const modelLoader = new ModelLoader();

// =============================================================================
// 4. Three.js 基本セットアップ
// =============================================================================
const container = document.getElementById('game-container');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0c16);
scene.fog = new THREE.FogExp2(0x0a0c16, 0.035);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(0, 6, -8);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
container.appendChild(renderer.domElement);

// =============================================================================
// 5. ライティング
// =============================================================================
const ambientLight = new THREE.AmbientLight(0x334155, 1.2);
scene.add(ambientLight);

const hemiLight = new THREE.HemisphereLight(0x38bdf8, 0x0f172a, 0.8);
hemiLight.position.set(0, 20, 0);
scene.add(hemiLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
dirLight.position.set(12, 20, -10);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 1024;
dirLight.shadow.mapSize.height = 1024;
dirLight.shadow.camera.near = 0.5;
dirLight.shadow.camera.far = 50;
const d = 16;
dirLight.shadow.camera.left = -d;
dirLight.shadow.camera.right = d;
dirLight.shadow.camera.top = d;
dirLight.shadow.camera.bottom = -d;
dirLight.shadow.bias = -0.0005;
scene.add(dirLight);

// =============================================================================
// 6. ステージ環境の構築
// =============================================================================
function createEnvironment() {
  const floorGeo = new THREE.PlaneGeometry(80, 80);
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x111827,
    roughness: 0.85,
    metalness: 0.2,
  });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const gridHelper = new THREE.GridHelper(80, 40, 0x0284c7, 0x1e293b);
  gridHelper.position.y = 0.01;
  scene.add(gridHelper);

  const pillarGeo = new THREE.BoxGeometry(1.2, 4, 1.2);
  const pillarMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.4,
    metalness: 0.8,
  });
  const pillarGlowMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });

  for (let i = 0; i < 20; i++) {
    const angle = (i / 20) * Math.PI * 2;
    const radius = 35 + (Math.random() * 4 - 2);
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;

    const pillarGroup = new THREE.Group();
    const pillar = new THREE.Mesh(pillarGeo, pillarMat);
    pillar.position.y = 2;
    pillar.castShadow = true;
    pillar.receiveShadow = true;
    pillarGroup.add(pillar);

    const glowRing = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.2, 1.25), pillarGlowMat);
    glowRing.position.y = 3.2;
    pillarGroup.add(glowRing);

    pillarGroup.position.set(x, 0, z);
    scene.add(pillarGroup);
  }
}
createEnvironment();

// =============================================================================
// 7. 刀の属性パーティクルシステム
// =============================================================================
class SwordParticleSystem {
  constructor() {
    this.particles = [];
    this.spawnTimer = 0;
    this.boxGeo = new THREE.BoxGeometry(0.08, 0.08, 0.08);
  }

  spawnParticles(swordWorldPos, effectType, isAttacking) {
    if (!effectType) return;

    let count = isAttacking ? 3 : 1;
    let colorHex = 0xffffff;
    let particleLife = 0.4;
    let speed = isAttacking ? 3.0 : 1.2;

    switch (effectType) {
      case 'flame':
        colorHex = Math.random() > 0.3 ? 0xef4444 : 0xf97316;
        break;
      case 'thunder':
        colorHex = Math.random() > 0.4 ? 0x38bdf8 : 0xffffff;
        particleLife = 0.25;
        speed *= 1.4;
        break;
      case 'void':
        colorHex = Math.random() > 0.3 ? 0xa855f7 : 0x4c1d95;
        break;
      case 'holy':
        colorHex = Math.random() > 0.3 ? 0xfacc15 : 0xfef08a;
        break;
    }

    for (let i = 0; i < count; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: colorHex,
        transparent: true,
        opacity: 0.9,
      });
      const mesh = new THREE.Mesh(this.boxGeo, mat);
      
      mesh.position.copy(swordWorldPos);
      mesh.position.x += (Math.random() - 0.5) * 0.25;
      mesh.position.y += (Math.random() - 0.5) * 0.25;
      mesh.position.z += (Math.random() - 0.5) * 0.25;

      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * speed,
        (Math.random() * 0.8 + 0.5) * speed,
        (Math.random() - 0.5) * speed
      );

      scene.add(mesh);
      this.particles.push({
        mesh,
        vel,
        life: particleLife,
        maxLife: particleLife,
      });
    }
  }

  update(delta) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= delta;

      if (p.life <= 0) {
        scene.remove(p.mesh);
        p.mesh.material.dispose();
        this.particles.splice(i, 1);
        continue;
      }

      p.mesh.position.addScaledVector(p.vel, delta);
      const ratio = p.life / p.maxLife;
      p.mesh.scale.set(ratio, ratio, ratio);
      p.mesh.material.opacity = ratio * 0.9;
    }
  }
}

// =============================================================================
// 8. プレイヤーキャラクター生成
// =============================================================================
class Player {
  constructor() {
    this.group = new THREE.Group();
    this.group.position.set(0, 0, 0);
    scene.add(this.group);

    this.velocity = new THREE.Vector3();
    this.targetRotation = 0;
    this.walkCycle = 0;
    this.isMoving = false;

    this.hasCustomModel = false;
    this.customModel = null;
    this.mixer = null;
    this.actions = {};
    this.currentActionName = null;

    this.heroMat = null;
    this.darkMat = null;
    this.visorMat = null;
    this.bladeMat = null;
    this.slashMat = null;

    this.currentOutfit = saveData.equipped.outfit || 'default';
    this.currentHead = saveData.equipped.head || 'none';
    this.currentSword = saveData.equipped.sword || 'default';

    this.defaultMeshGroup = new THREE.Group();
    this.group.add(this.defaultMeshGroup);
    this.buildDefaultMesh();

    const slashGeo = new THREE.RingGeometry(1.2, 2.2, 16, 1, 0, Math.PI * 0.65);
    this.slashMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
    });
    this.slashMesh = new THREE.Mesh(slashGeo, this.slashMat);
    this.slashMesh.rotation.x = Math.PI / 2;
    this.slashMesh.position.set(0, 1.1, 0.8);
    this.group.add(this.slashMesh);

    this.applyOutfit(this.currentOutfit);
    this.applyHeadGear(this.currentHead);
    this.applySword(this.currentSword);

    if (MODEL_CONFIG.player.url) {
      this.loadCustomModel(MODEL_CONFIG.player.url);
    }
  }

  buildDefaultMesh() {
    this.heroMat = new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.3 });
    this.skinMat = new THREE.MeshStandardMaterial({ color: 0xfde047, roughness: 0.6 });
    this.darkMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5 });
    this.visorMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });

    // 胴体
    const bodyGeo = new THREE.BoxGeometry(0.7, 0.8, 0.45);
    this.body = new THREE.Mesh(bodyGeo, this.heroMat);
    this.body.position.y = 1.1;
    this.body.castShadow = true;
    this.defaultMeshGroup.add(this.body);

    // 頭部
    const headGeo = new THREE.BoxGeometry(0.45, 0.45, 0.45);
    this.head = new THREE.Mesh(headGeo, this.skinMat);
    this.head.position.set(0, 0.65, 0);
    this.head.castShadow = true;
    this.body.add(this.head);

    // バイザー
    const visorGeo = new THREE.BoxGeometry(0.38, 0.12, 0.1);
    this.visorMesh = new THREE.Mesh(visorGeo, this.visorMat);
    this.visorMesh.position.set(0, 0.05, 0.22);
    this.head.add(this.visorMesh);

    this.headGearGroup = new THREE.Group();
    this.head.add(this.headGearGroup);

    // 腕
    const armGeo = new THREE.BoxGeometry(0.2, 0.65, 0.2);
    this.leftArm = new THREE.Mesh(armGeo, this.heroMat);
    this.leftArm.position.set(-0.48, 0.15, 0);
    this.leftArm.castShadow = true;
    this.body.add(this.leftArm);

    this.rightArmPivot = new THREE.Group();
    this.rightArmPivot.position.set(0.48, 0.3, 0);
    this.body.add(this.rightArmPivot);

    this.rightArm = new THREE.Mesh(armGeo, this.heroMat);
    this.rightArm.position.set(0, -0.25, 0);
    this.rightArm.castShadow = true;
    this.rightArmPivot.add(this.rightArm);

    this.createSword();

    // 脚
    const legGeo = new THREE.BoxGeometry(0.25, 0.7, 0.25);
    
    this.leftLegPivot = new THREE.Group();
    this.leftLegPivot.position.set(-0.2, 0.7, 0);
    this.defaultMeshGroup.add(this.leftLegPivot);
    this.leftLeg = new THREE.Mesh(legGeo, this.darkMat);
    this.leftLeg.position.set(0, -0.35, 0);
    this.leftLeg.castShadow = true;
    this.leftLegPivot.add(this.leftLeg);

    this.rightLegPivot = new THREE.Group();
    this.rightLegPivot.position.set(0.2, 0.7, 0);
    this.defaultMeshGroup.add(this.rightLegPivot);
    this.rightLeg = new THREE.Mesh(legGeo, this.darkMat);
    this.rightLeg.position.set(0, -0.35, 0);
    this.rightLeg.castShadow = true;
    this.rightLegPivot.add(this.rightLeg);
  }

  createSword() {
    this.swordGroup = new THREE.Group();
    this.swordGroup.position.set(0, -0.5, 0.15);

    const hiltGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.35, 8);
    const hiltMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7 });
    const hilt = new THREE.Mesh(hiltGeo, hiltMat);
    hilt.rotation.x = Math.PI / 2;
    this.swordGroup.add(hilt);

    const guardGeo = new THREE.BoxGeometry(0.16, 0.04, 0.12);
    const guardMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.8 });
    this.guardMesh = new THREE.Mesh(guardGeo, guardMat);
    this.guardMesh.position.z = 0.18;
    this.swordGroup.add(this.guardMesh);

    const bladeGeo = new THREE.BoxGeometry(0.06, 0.02, 1.25);
    this.bladeMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.85,
      roughness: 0.2,
      metalness: 0.9,
    });
    this.bladeMesh = new THREE.Mesh(bladeGeo, this.bladeMat);
    this.bladeMesh.position.z = 0.8;
    this.bladeMesh.castShadow = true;
    this.swordGroup.add(this.bladeMesh);

    this.swordTip = new THREE.Object3D();
    this.swordTip.position.set(0, 0, 1.35);
    this.swordGroup.add(this.swordTip);

    this.rightArmPivot.add(this.swordGroup);
  }

  async loadCustomModel(url) {
    const data = await modelLoader.loadGLTF(url);
    if (!data) {
      this.defaultMeshGroup.visible = true;
      this.hasCustomModel = false;
      return;
    }

    if (this.customModel) {
      this.group.remove(this.customModel);
    }

    this.customModel = data.scene;
    const cfg = MODEL_CONFIG.player;

    if (cfg.scale) this.customModel.scale.set(cfg.scale, cfg.scale, cfg.scale);
    if (cfg.positionOffset) this.customModel.position.copy(cfg.positionOffset);
    if (cfg.rotationOffset) this.customModel.rotation.copy(cfg.rotationOffset);

    this.group.add(this.customModel);
    this.defaultMeshGroup.visible = false;
    this.hasCustomModel = true;

    this.setupAnimations(data.animations);

    const rightHandBone = modelLoader.findRightHandBone(this.customModel, cfg.rightHandBoneNames);
    if (rightHandBone) {
      this.rightArmPivot.remove(this.swordGroup);
      this.swordGroup.position.set(0, 0, 0);
      this.swordGroup.rotation.set(0, 0, 0);
      rightHandBone.add(this.swordGroup);
    }
  }

  setupAnimations(animations) {
    if (!animations || animations.length === 0) {
      this.mixer = null;
      this.actions = {};
      return;
    }

    this.mixer = new THREE.AnimationMixer(this.customModel);
    this.actions = {};

    animations.forEach((clip) => {
      const name = clip.name.toLowerCase();
      const action = this.mixer.clipAction(clip);

      if (name.includes('idle') || name.includes('stand')) {
        this.actions.idle = action;
      } else if (name.includes('run') || name.includes('walk')) {
        this.actions.walk = action;
      } else if (name.includes('attack') || name.includes('slash') || name.includes('swing')) {
        this.actions.attack = action;
        action.setLoop(THREE.LoopOnce);
        action.clampWhenFinished = true;
      } else if (name.includes('die') || name.includes('death')) {
        this.actions.die = action;
        action.setLoop(THREE.LoopOnce);
        action.clampWhenFinished = true;
      } else {
        this.actions[clip.name] = action;
      }
    });

    if (this.actions.idle) {
      this.fadeToAction('idle', 0.1);
    } else if (animations.length > 0) {
      const firstAction = this.mixer.clipAction(animations[0]);
      firstAction.play();
    }

    this.mixer.addEventListener('finished', (e) => {
      if (this.actions.attack && e.action === this.actions.attack) {
        state.isAttacking = false;
        this.slashMesh.material.opacity = 0;
        this.fadeToAction(this.isMoving ? 'walk' : 'idle', 0.2);
      }
    });
  }

  fadeToAction(targetName, duration = 0.2) {
    if (!this.mixer || !this.actions[targetName]) return;

    const nextAction = this.actions[targetName];
    if (this.currentActionName === targetName && nextAction.isRunning()) return;

    const prevAction = this.currentActionName ? this.actions[this.currentActionName] : null;

    if (prevAction && prevAction !== nextAction) {
      prevAction.fadeOut(duration);
    }

    nextAction.reset().fadeIn(duration).play();
    this.currentActionName = targetName;
  }

  applyOutfit(outfitId) {
    const item = ITEMS_DATA.outfits[outfitId] || ITEMS_DATA.outfits.default;
    this.currentOutfit = item.id;
    if (this.heroMat) this.heroMat.color.setHex(item.heroColor);
    if (this.darkMat) this.darkMat.color.setHex(item.darkColor);
    if (this.visorMat) this.visorMat.color.setHex(item.visorColor);
  }

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
      return;
    }

    if (headId === 'sunglasses') {
      if (this.visorMesh) this.visorMesh.visible = false;
      const glassMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.1, metalness: 0.9 });
      const frameMat = new THREE.MeshStandardMaterial({ color: 0x27272a, metalness: 0.8 });

      const frameGeo = new THREE.BoxGeometry(0.42, 0.12, 0.08);
      const frame = new THREE.Mesh(frameGeo, frameMat);
      frame.position.set(0, 0.06, 0.23);
      this.headGearGroup.add(frame);

      const lensGeo = new THREE.BoxGeometry(0.16, 0.08, 0.02);
      const leftLens = new THREE.Mesh(lensGeo, glassMat);
      leftLens.position.set(-0.1, 0.06, 0.28);
      this.headGearGroup.add(leftLens);

      const rightLens = new THREE.Mesh(lensGeo, glassMat);
      rightLens.position.set(0.1, 0.06, 0.28);
      this.headGearGroup.add(rightLens);
    } else if (headId === 'ninja_band') {
      if (this.visorMesh) this.visorMesh.visible = true;
      const bandMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.5 });
      const bandGeo = new THREE.BoxGeometry(0.48, 0.08, 0.48);
      const band = new THREE.Mesh(bandGeo, bandMat);
      band.position.set(0, 0.12, 0);
      this.headGearGroup.add(band);

      const knotGeo = new THREE.BoxGeometry(0.08, 0.1, 0.08);
      const knot = new THREE.Mesh(knotGeo, bandMat);
      knot.position.set(0, 0.12, -0.26);
      this.headGearGroup.add(knot);

      const tailGeo = new THREE.BoxGeometry(0.06, 0.35, 0.02);
      const tail1 = new THREE.Mesh(tailGeo, bandMat);
      tail1.position.set(-0.06, -0.05, -0.28);
      tail1.rotation.z = -0.25;
      tail1.rotation.x = -0.2;
      this.headGearGroup.add(tail1);

      const tail2 = new THREE.Mesh(tailGeo, bandMat);
      tail2.position.set(0.06, -0.07, -0.28);
      tail2.rotation.z = 0.2;
      tail2.rotation.x = -0.3;
      this.headGearGroup.add(tail2);
    } else if (headId === 'samurai_helm') {
      if (this.visorMesh) this.visorMesh.visible = true;
      const helmMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.3, metalness: 0.8 });
      const goldMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.9, roughness: 0.2 });

      const domeGeo = new THREE.BoxGeometry(0.5, 0.16, 0.5);
      const dome = new THREE.Mesh(domeGeo, helmMat);
      dome.position.set(0, 0.28, 0);
      this.headGearGroup.add(dome);

      const neckGeo = new THREE.BoxGeometry(0.52, 0.22, 0.12);
      const neck = new THREE.Mesh(neckGeo, helmMat);
      neck.position.set(0, 0.05, -0.22);
      this.headGearGroup.add(neck);

      const crestGeo = new THREE.TorusGeometry(0.2, 0.025, 8, 16, Math.PI * 0.8);
      const crest = new THREE.Mesh(crestGeo, goldMat);
      crest.position.set(0, 0.32, 0.24);
      crest.rotation.x = Math.PI;
      crest.rotation.z = Math.PI * 0.6;
      this.headGearGroup.add(crest);
    } else if (headId === 'cyber_horns') {
      if (this.visorMesh) this.visorMesh.visible = true;
      const hornMat = new THREE.MeshStandardMaterial({
        color: 0xf43f5e,
        emissive: 0xe11d48,
        emissiveIntensity: 0.8,
        roughness: 0.2,
      });

      const hornGeo = new THREE.ConeGeometry(0.08, 0.32, 6);

      const leftHorn = new THREE.Mesh(hornGeo, hornMat);
      leftHorn.position.set(-0.16, 0.35, 0.08);
      leftHorn.rotation.z = -0.4;
      leftHorn.rotation.x = 0.2;
      this.headGearGroup.add(leftHorn);

      const rightHorn = new THREE.Mesh(hornGeo, hornMat);
      rightHorn.position.set(0.16, 0.35, 0.08);
      rightHorn.rotation.z = 0.4;
      rightHorn.rotation.x = 0.2;
      this.headGearGroup.add(rightHorn);
    }
  }

  applySword(swordId) {
    const item = ITEMS_DATA.swords[swordId] || ITEMS_DATA.swords.default;
    this.currentSword = item.id;
    this.currentSwordEffect = item.effectType;

    if (this.bladeMat) {
      this.bladeMat.color.setHex(item.bladeColor);
      this.bladeMat.emissive.setHex(item.emissive);
      this.bladeMat.emissiveIntensity = item.effectType ? 1.2 : 0.85;
    }

    if (this.slashMat) {
      this.slashMat.color.setHex(item.slashColor);
    }
  }

  update(delta) {
    let inputX = state.moveVector.x;
    let inputZ = state.moveVector.y;

    if (state.keys.forward) inputZ += 1;
    if (state.keys.backward) inputZ -= 1;
    if (state.keys.left) inputX -= 1;
    if (state.keys.right) inputX += 1;

    const inputLen = Math.sqrt(inputX * inputX + inputZ * inputZ);
    this.isMoving = inputLen > 0.05;

    if (this.isMoving) {
      const normalizedX = inputX / (inputLen > 1 ? inputLen : 1);
      const normalizedZ = inputZ / (inputLen > 1 ? inputLen : 1);

      this.velocity.x = normalizedX * CONFIG.playerSpeed;
      this.velocity.z = normalizedZ * CONFIG.playerSpeed;

      this.targetRotation = Math.atan2(normalizedX, normalizedZ);
      let diff = this.targetRotation - this.group.rotation.y;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      this.group.rotation.y += diff * Math.min(delta * CONFIG.playerTurnSpeed, 1.0);

      this.group.position.x += this.velocity.x * delta;
      this.group.position.z += this.velocity.z * delta;

      const distFromCenter = Math.sqrt(this.group.position.x ** 2 + this.group.position.z ** 2);
      if (distFromCenter > 34) {
        this.group.position.x = (this.group.position.x / distFromCenter) * 34;
        this.group.position.z = (this.group.position.z / distFromCenter) * 34;
      }

      this.walkCycle += delta * 12 * Math.min(inputLen, 1.2);
    } else {
      this.velocity.set(0, 0, 0);
      this.walkCycle += delta * 2;
    }

    if (this.mixer) {
      this.mixer.update(delta);
      if (!state.isAttacking) {
        if (this.isMoving) {
          this.fadeToAction('walk', 0.15);
        } else {
          this.fadeToAction('idle', 0.2);
        }
      }
    } else {
      if (state.isAttacking) {
        this.updateAttackAnimation(delta);
      } else {
        if (this.isMoving) {
          this.leftLegPivot.rotation.x = Math.sin(this.walkCycle) * 0.6;
          this.rightLegPivot.rotation.x = -Math.sin(this.walkCycle) * 0.6;
          this.leftArm.rotation.x = -Math.sin(this.walkCycle) * 0.6;
          this.rightArmPivot.rotation.x = Math.sin(this.walkCycle) * 0.4;
          this.rightArmPivot.rotation.y = 0;
          this.rightArmPivot.rotation.z = 0;
          this.body.position.y = 1.1 + Math.abs(Math.sin(this.walkCycle * 2)) * 0.08;
        } else {
          this.leftLegPivot.rotation.x = 0;
          this.rightLegPivot.rotation.x = 0;
          this.leftArm.rotation.x = 0;
          this.rightArmPivot.rotation.set(0, 0, 0);
          this.body.position.y = 1.1 + Math.sin(this.walkCycle) * 0.03;
        }
      }
    }

    if (this.currentSwordEffect && this.swordTip) {
      const tipWorldPos = new THREE.Vector3();
      this.swordTip.getWorldPosition(tipWorldPos);
      swordParticleSystem.spawnParticles(tipWorldPos, this.currentSwordEffect, state.isAttacking);
    }
  }

  attack() {
    if (!state.canAttack || state.isAttacking || state.isPaused) return;

    state.isAttacking = true;
    state.canAttack = false;
    state.attackTimer = 0;

    const btn = document.getElementById('btn-attack');
    if (btn) {
      btn.classList.add('active');
      setTimeout(() => btn.classList.remove('active'), 150);
    }

    if (this.mixer && this.actions.attack) {
      this.fadeToAction('attack', 0.08);
      this.slashMesh.material.opacity = 0.85;
      setTimeout(() => {
        if (this.slashMesh) this.slashMesh.material.opacity = 0;
      }, 250);
    }

    this.performAttackHitCheck();

    setTimeout(() => {
      state.canAttack = true;
    }, CONFIG.attackCooldown * 1000);
  }

  updateAttackAnimation(delta) {
    state.attackTimer += delta;
    const progress = Math.min(state.attackTimer / 0.22, 1.0);

    if (progress < 1.0) {
      this.rightArmPivot.rotation.x = 0.5 - progress * 1.2;
      this.rightArmPivot.rotation.y = -0.6 + progress * 2.2;
      this.rightArmPivot.rotation.z = -0.3;

      this.slashMesh.material.opacity = Math.sin(progress * Math.PI) * 0.85;
      this.slashMesh.rotation.z = -Math.PI * 0.3 + progress * Math.PI * 0.7;
    } else {
      state.isAttacking = false;
      this.slashMesh.material.opacity = 0;
      this.rightArmPivot.rotation.set(0, 0, 0);
    }
  }

  performAttackHitCheck() {
    const forward = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.group.rotation.y);
    const pPos = this.group.position;

    zombieManager.zombies.forEach((zombie) => {
      if (zombie.isDead) return;

      const zPos = zombie.group.position;
      const toZombie = new THREE.Vector3().subVectors(zPos, pPos);
      toZombie.y = 0;
      const dist = toZombie.length();

      if (dist <= CONFIG.attackRange) {
        toZombie.normalize();
        const dot = forward.dot(toZombie);
        const minDot = Math.cos(CONFIG.attackAngle / 2);

        if (dot >= minDot) {
          zombie.die(toZombie);
        }
      }
    });
  }
}

// =============================================================================
// 9. ゾンビ（敵）システム
// =============================================================================
class Zombie {
  constructor() {
    this.group = new THREE.Group();
    this.isDead = false;
    this.walkCycle = Math.random() * 10;
    this.speed = CONFIG.zombieSpeed * (0.85 + Math.random() * 0.3);

    this.hasCustomModel = false;
    this.customModel = null;
    this.mixer = null;
    this.actions = {};

    this.defaultMeshGroup = new THREE.Group();
    this.group.add(this.defaultMeshGroup);
    this.buildDefaultMesh();

    if (MODEL_CONFIG.zombie.url) {
      this.loadCustomModel(MODEL_CONFIG.zombie.url);
    }
  }

  buildDefaultMesh() {
    const skinMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.6 });
    const clothesMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8 });
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });

    this.body = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.75, 0.4), clothesMat);
    this.body.position.y = 1.05;
    this.body.castShadow = true;
    this.defaultMeshGroup.add(this.body);

    this.head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.42), skinMat);
    this.head.position.set(0, 0.6, 0);
    this.head.castShadow = true;
    this.body.add(this.head);

    const eyeGeo = new THREE.BoxGeometry(0.08, 0.08, 0.08);
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.12, 0.05, 0.22);
    this.head.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.12, 0.05, 0.22);
    this.head.add(rightEye);

    const armGeo = new THREE.BoxGeometry(0.18, 0.18, 0.6);
    this.leftArm = new THREE.Mesh(armGeo, skinMat);
    this.leftArm.position.set(-0.42, 0.2, 0.25);
    this.leftArm.castShadow = true;
    this.body.add(this.leftArm);

    this.rightArm = new THREE.Mesh(armGeo, skinMat);
    this.rightArm.position.set(0.42, 0.2, 0.25);
    this.rightArm.castShadow = true;
    this.body.add(this.rightArm);

    const legGeo = new THREE.BoxGeometry(0.22, 0.65, 0.22);
    this.leftLeg = new THREE.Mesh(legGeo, clothesMat);
    this.leftLeg.position.set(-0.18, 0.35, 0);
    this.leftLeg.castShadow = true;
    this.defaultMeshGroup.add(this.leftLeg);

    this.rightLeg = new THREE.Mesh(legGeo, clothesMat);
    this.rightLeg.position.set(0.18, 0.35, 0);
    this.rightLeg.castShadow = true;
    this.defaultMeshGroup.add(this.rightLeg);
  }

  async loadCustomModel(url) {
    const data = await modelLoader.loadGLTF(url);
    if (!data) return;

    this.customModel = data.scene;
    const cfg = MODEL_CONFIG.zombie;
    if (cfg.scale) this.customModel.scale.set(cfg.scale, cfg.scale, cfg.scale);
    if (cfg.positionOffset) this.customModel.position.copy(cfg.positionOffset);

    this.group.add(this.customModel);
    this.defaultMeshGroup.visible = false;
    this.hasCustomModel = true;

    if (data.animations && data.animations.length > 0) {
      this.mixer = new THREE.AnimationMixer(this.customModel);
      const walkClip = data.animations.find(a => a.name.toLowerCase().includes('walk') || a.name.toLowerCase().includes('run')) || data.animations[0];
      const action = this.mixer.clipAction(walkClip);
      action.play();
    }
  }

  spawn(x, z) {
    this.group.position.set(x, 0, z);
    this.isDead = false;
    this.group.visible = true;
    scene.add(this.group);
  }

  update(delta, playerPos) {
    if (this.isDead) return;

    const dir = new THREE.Vector3().subVectors(playerPos, this.group.position);
    dir.y = 0;
    const dist = dir.length();

    if (dist > 0.8) {
      dir.normalize();
      this.group.position.x += dir.x * this.speed * delta;
      this.group.position.z += dir.z * this.speed * delta;

      const angle = Math.atan2(dir.x, dir.z);
      this.group.rotation.y = angle;

      if (this.mixer) {
        this.mixer.update(delta);
      } else {
        this.walkCycle += delta * 5;
        this.leftLeg.rotation.x = Math.sin(this.walkCycle) * 0.45;
        this.rightLeg.rotation.x = -Math.sin(this.walkCycle) * 0.45;
        this.body.rotation.z = Math.sin(this.walkCycle * 0.5) * 0.12;
        this.head.rotation.y = Math.sin(this.walkCycle * 0.7) * 0.18;
        this.leftArm.rotation.x = Math.sin(this.walkCycle) * 0.15;
        this.rightArm.rotation.x = -Math.sin(this.walkCycle) * 0.15;
      }
    }
  }

  die(hitDir) {
    this.isDead = true;
    scene.remove(this.group);

    particleSystem.spawnDeathParticles(this.group.position, hitDir);

    state.kills++;
    state.coins += 10;
    saveData.coins = state.coins;
    SaveManager.save(saveData);

    updateHUD(this.group.position);
    cameraController.shake(0.12);
  }
}

class ZombieManager {
  constructor() {
    this.zombies = [];
    this.spawnTimer = 0;
  }

  update(delta, playerPos) {
    this.spawnTimer += delta;
    if (this.spawnTimer >= CONFIG.spawnInterval && this.getActiveCount() < CONFIG.zombieMaxCount) {
      this.spawnTimer = 0;
      this.spawnOne(playerPos);
    }

    for (let i = this.zombies.length - 1; i >= 0; i--) {
      const z = this.zombies[i];
      if (z.isDead) {
        this.zombies.splice(i, 1);
      } else {
        z.update(delta, playerPos);
      }
    }
  }

  getActiveCount() {
    return this.zombies.filter(z => !z.isDead).length;
  }

  spawnOne(playerPos) {
    const angle = Math.random() * Math.PI * 2;
    const distance = 12 + Math.random() * 8;
    const x = playerPos.x + Math.cos(angle) * distance;
    const z = playerPos.z + Math.sin(angle) * distance;

    const zombie = new Zombie();
    zombie.spawn(x, z);
    this.zombies.push(zombie);
  }
}

// =============================================================================
// 10. パーティクルシステム (ゾンビ破片 & スパーク)
// =============================================================================
class ParticleSystem {
  constructor() {
    this.particles = [];
    this.particleGeo = new THREE.BoxGeometry(0.16, 0.16, 0.16);
    this.materials = [
      new THREE.MeshStandardMaterial({ color: 0x22c55e }),
      new THREE.MeshStandardMaterial({ color: 0x15803d }),
      new THREE.MeshStandardMaterial({ color: 0xfacc15 }),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8 }),
    ];
  }

  spawnDeathParticles(pos, hitDir) {
    const count = 18;
    for (let i = 0; i < count; i++) {
      const mat = this.materials[Math.floor(Math.random() * this.materials.length)];
      const mesh = new THREE.Mesh(this.particleGeo, mat);
      mesh.position.copy(pos);
      mesh.position.y += 0.5 + Math.random() * 0.8;

      const spread = 4.5;
      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * spread + hitDir.x * 3.5,
        Math.random() * 4.5 + 2.0,
        (Math.random() - 0.5) * spread + hitDir.z * 3.5
      );

      scene.add(mesh);
      this.particles.push({
        mesh,
        vel,
        rotSpeed: new THREE.Vector3(Math.random() * 10, Math.random() * 10, Math.random() * 10),
        life: 1.0,
      });
    }
  }

  spawnMagicHitParticles(pos, bulletType = 'magic') {
    const count = 14;
    let color1 = 0xf472b6;
    let color2 = 0xfde047;

    if (bulletType === 'rock') {
      color1 = 0x78716c;
      color2 = 0xa8a29e;
    } else if (bulletType === 'fireball') {
      color1 = 0xef4444;
      color2 = 0xf97316;
    } else if (bulletType === 'mud') {
      color1 = 0xf43f5e;
      color2 = 0x854d0e;
    } else if (bulletType === 'bone') {
      color1 = 0xf8fafc;
      color2 = 0xfbbf24;
    } else if (bulletType === 'laser') {
      color1 = 0x38bdf8;
      color2 = 0xfde047;
    } else if (bulletType === 'rainbow') {
      color1 = 0xa855f7;
      color2 = 0x38bdf8;
    }

    const mat1 = new THREE.MeshBasicMaterial({ color: color1 });
    const mat2 = new THREE.MeshBasicMaterial({ color: color2 });

    for (let i = 0; i < count; i++) {
      const mat = (i % 2 === 0) ? mat1 : mat2;
      const mesh = new THREE.Mesh(this.particleGeo, mat);
      mesh.position.copy(pos);
      mesh.position.y += 0.8;

      const angle = Math.random() * Math.PI * 2;
      const speed = 3.0 + Math.random() * 3.5;
      const vel = new THREE.Vector3(
        Math.cos(angle) * speed,
        Math.random() * 4.0 + 1.0,
        Math.sin(angle) * speed
      );

      scene.add(mesh);
      this.particles.push({
        mesh,
        vel,
        rotSpeed: new THREE.Vector3(Math.random() * 12, Math.random() * 12, Math.random() * 12),
        life: 0.75,
      });
    }
  }

  update(delta) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= delta * 1.8;

      if (p.life <= 0) {
        scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        this.particles.splice(i, 1);
        continue;
      }

      p.vel.y -= 14.0 * delta;
      p.mesh.position.addScaledVector(p.vel, delta);
      p.mesh.rotation.x += p.rotSpeed.x * delta;
      p.mesh.rotation.y += p.rotSpeed.y * delta;

      if (p.mesh.position.y < 0.08) {
        p.mesh.position.y = 0.08;
        p.vel.y = -p.vel.y * 0.4;
        p.vel.x *= 0.7;
        p.vel.z *= 0.7;
      }

      const scale = p.life;
      p.mesh.scale.set(scale, scale, scale);
    }
  }
}

// =============================================================================
// 11. 固有弾丸システム (MagicProjectile) & ペットシステム (BuddyPet & PetManager)
// =============================================================================
class MagicProjectile {
  constructor(startPos, targetZombie, bulletType = 'magic', speed = 16.0) {
    this.target = targetZombie;
    this.bulletType = bulletType;
    this.isDead = false;
    this.life = 2.5;

    this.group = new THREE.Group();
    this.group.position.copy(startPos);

    this.buildBulletMesh();

    this.targetLastPos = targetZombie.group.position.clone().add(new THREE.Vector3(0, 1.0, 0));
    this.velocity = new THREE.Vector3().subVectors(this.targetLastPos, startPos).normalize().multiplyScalar(speed);

    scene.add(this.group);
  }

  buildBulletMesh() {
    if (this.bulletType === 'rock') {
      // 岩石弾
      const geo = new THREE.BoxGeometry(0.28, 0.28, 0.28);
      const mat = new THREE.MeshStandardMaterial({ color: 0x78716c, roughness: 0.9 });
      this.mesh = new THREE.Mesh(geo, mat);
      this.group.add(this.mesh);
    } else if (this.bulletType === 'fireball') {
      // 紅蓮火球
      const geo = new THREE.SphereGeometry(0.24, 10, 10);
      const mat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      this.core = new THREE.Mesh(geo, mat);
      this.group.add(this.core);

      const auraGeo = new THREE.SphereGeometry(0.38, 10, 10);
      const auraMat = new THREE.MeshBasicMaterial({ color: 0xf97316, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending });
      this.glow = new THREE.Mesh(auraGeo, auraMat);
      this.group.add(this.glow);
    } else if (this.bulletType === 'bone') {
      // ボーンブーメラン
      const shaftGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.45, 6);
      const mat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 });
      this.bone = new THREE.Mesh(shaftGeo, mat);
      this.bone.rotation.z = Math.PI / 2;
      this.group.add(this.bone);

      const capGeo = new THREE.SphereGeometry(0.08, 6, 6);
      const c1 = new THREE.Mesh(capGeo, mat);
      c1.position.set(-0.22, 0.05, 0);
      this.group.add(c1);
      const c2 = new THREE.Mesh(capGeo, mat);
      c2.position.set(-0.22, -0.05, 0);
      this.group.add(c2);
      const c3 = new THREE.Mesh(capGeo, mat);
      c3.position.set(0.22, 0.05, 0);
      this.group.add(c3);
      const c4 = new THREE.Mesh(capGeo, mat);
      c4.position.set(0.22, -0.05, 0);
      this.group.add(c4);
    } else if (this.bulletType === 'laser') {
      // 電光レーザー
      const geo = new THREE.BoxGeometry(0.12, 0.12, 0.75);
      const mat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
      this.mesh = new THREE.Mesh(geo, mat);
      this.group.add(this.mesh);
    } else if (this.bulletType === 'rainbow') {
      // レインボースター
      const geo = new THREE.OctahedronGeometry(0.24, 0);
      const mat = new THREE.MeshBasicMaterial({ color: 0xfde047 });
      this.mesh = new THREE.Mesh(geo, mat);
      this.group.add(this.mesh);

      const auraGeo = new THREE.SphereGeometry(0.38, 8, 8);
      const auraMat = new THREE.MeshBasicMaterial({ color: 0xa855f7, transparent: true, opacity: 0.65, blending: THREE.AdditiveBlending });
      this.glow = new THREE.Mesh(auraGeo, auraMat);
      this.group.add(this.glow);
    } else if (this.bulletType === 'mud') {
      // マッドボム
      const geo = new THREE.SphereGeometry(0.22, 8, 8);
      const mat = new THREE.MeshStandardMaterial({ color: 0xf43f5e, roughness: 0.5 });
      this.mesh = new THREE.Mesh(geo, mat);
      this.group.add(this.mesh);
    } else {
      // 通常魔法弾 (フェアリー)
      const coreGeo = new THREE.SphereGeometry(0.18, 12, 12);
      const coreMat = new THREE.MeshBasicMaterial({ color: 0xfdf2f8 });
      this.core = new THREE.Mesh(coreGeo, coreMat);
      this.group.add(this.core);

      const glowGeo = new THREE.SphereGeometry(0.32, 12, 12);
      const glowMat = new THREE.MeshBasicMaterial({
        color: 0xf472b6,
        transparent: true,
        opacity: 0.65,
        blending: THREE.AdditiveBlending,
      });
      this.glow = new THREE.Mesh(glowGeo, glowMat);
      this.group.add(this.glow);
    }
  }

  update(delta) {
    if (this.isDead) return;

    this.life -= delta;
    if (this.life <= 0) {
      this.destroy();
      return;
    }

    if (this.target && !this.target.isDead) {
      this.targetLastPos.copy(this.target.group.position).add(new THREE.Vector3(0, 1.0, 0));
      const speed = this.velocity.length();
      const desired = new THREE.Vector3().subVectors(this.targetLastPos, this.group.position).normalize().multiplyScalar(speed);
      this.velocity.lerp(desired, Math.min(delta * 10, 1.0));
    }

    this.group.position.addScaledVector(this.velocity, delta);

    // 回転エフェクト (ボーンや岩石、スター)
    this.group.rotation.x += delta * 14;
    this.group.rotation.y += delta * 16;

    if (this.glow) {
      const pulse = 1.0 + Math.sin(Date.now() * 0.02) * 0.2;
      this.glow.scale.set(pulse, pulse, pulse);
    }

    zombieManager.zombies.forEach((zombie) => {
      if (zombie.isDead || this.isDead) return;

      const zCenter = zombie.group.position.clone().add(new THREE.Vector3(0, 1.0, 0));
      const dist = this.group.position.distanceTo(zCenter);

      if (dist < 0.9) {
        const hitDir = this.velocity.clone().normalize();
        zombie.die(hitDir);
        particleSystem.spawnMagicHitParticles(this.group.position, this.bulletType);
        this.destroy();
      }
    });
  }

  destroy() {
    this.isDead = true;
    scene.remove(this.group);
  }
}

class ProjectileManager {
  constructor() {
    this.projectiles = [];
  }

  shoot(startPos, targetZombie, bulletType, speed) {
    const proj = new MagicProjectile(startPos, targetZombie, bulletType, speed);
    this.projectiles.push(proj);
  }

  update(delta) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      if (p.isDead) {
        this.projectiles.splice(i, 1);
      } else {
        p.update(delta);
      }
    }
  }
}

// 固有ペットクラス (全7種対応)
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
    this.attackTimer = Math.random() * 1.5; // 初期攻撃タイミングを少しずらす
    this.attackCooldown = this.petData.attackInterval || 3.0;
    this.shootAnimationTimer = 0;

    this.buildMesh();
  }

  buildMesh() {
    // 既存の子メッシュを破棄
    while (this.group.children.length > 0) {
      const child = this.group.children[0];
      this.group.remove(child);
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    }

    if (this.petType === 'gorilla') {
      // 🦍 ゴリラ (屈強なマッスルシルバーバック)
      const furMat = new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.8 }); // 黒灰毛皮
      const skinMat = new THREE.MeshStandardMaterial({ color: 0x52525b, roughness: 0.6 }); // 顔・胸
      const silverMat = new THREE.MeshStandardMaterial({ color: 0xd4d4d8, roughness: 0.5 }); // 背中シルバー

      // 胴体
      this.body = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 0.5), furMat);
      this.body.castShadow = true;
      this.group.add(this.body);

      // 胸筋
      const chest = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.35, 0.1), skinMat);
      chest.position.set(0, 0.05, 0.22);
      this.body.add(chest);

      // 背中のシルバーバック
      const back = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.45, 0.08), silverMat);
      back.position.set(0, 0, -0.22);
      this.body.add(back);

      // 頭部
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.32, 0.35), furMat);
      head.position.set(0, 0.38, 0.1);
      this.body.add(head);

      const face = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.08), skinMat);
      face.position.set(0, -0.04, 0.16);
      head.add(face);

      // 太い腕
      const armGeo = new THREE.BoxGeometry(0.2, 0.5, 0.2);
      const lArm = new THREE.Mesh(armGeo, furMat);
      lArm.position.set(-0.35, -0.05, 0.1);
      this.body.add(lArm);
      const rArm = new THREE.Mesh(armGeo, furMat);
      rArm.position.set(0.35, -0.05, 0.1);
      this.body.add(rArm);

    } else if (this.petType === 'lion') {
      // 🦁 ライオン (黄金の百獣の王)
      const furMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.6 }); // 黄金
      const maneMat = new THREE.MeshStandardMaterial({ color: 0x9a3412, roughness: 0.8 }); // 赤茶のたてがみ
      const eyeMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });

      this.body = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.42, 0.55), furMat);
      this.body.castShadow = true;
      this.group.add(this.body);

      // たてがみ (重厚なフレーム)
      const mane = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 0.25), maneMat);
      mane.position.set(0, 0.15, 0.22);
      this.body.add(mane);

      // 頭部
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.34, 0.32), furMat);
      head.position.set(0, 0.15, 0.32);
      this.body.add(head);

      // 耳
      const earGeo = new THREE.BoxGeometry(0.08, 0.08, 0.04);
      const lEar = new THREE.Mesh(earGeo, maneMat);
      lEar.position.set(-0.16, 0.18, 0);
      head.add(lEar);
      const rEar = new THREE.Mesh(earGeo, maneMat);
      rEar.position.set(0.16, 0.18, 0);
      head.add(rEar);

      // 目
      const lEye = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6), eyeMat);
      lEye.position.set(-0.1, 0.05, 0.16);
      head.add(lEye);
      const rEye = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6), eyeMat);
      rEye.position.set(0.1, 0.05, 0.16);
      head.add(rEye);

      // 尻尾
      const tail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.35), furMat);
      tail.position.set(0, 0.1, -0.38);
      tail.rotation.x = -0.4;
      this.body.add(tail);

    } else if (this.petType === 'pig') {
      // 🐷 豚 (ピンクの幸運ピギー)
      const skinMat = new THREE.MeshStandardMaterial({ color: 0xfb7185, roughness: 0.4 });
      const snoutMat = new THREE.MeshStandardMaterial({ color: 0xf43f5e, roughness: 0.5 });
      const eyeMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });

      this.body = new THREE.Mesh(new THREE.SphereGeometry(0.36, 16, 16), skinMat);
      this.body.castShadow = true;
      this.group.add(this.body);

      // ブタ鼻 (スナウト)
      const snout = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 0.12), snoutMat);
      snout.position.set(0, -0.02, 0.32);
      this.body.add(snout);

      // 垂れ耳
      const earGeo = new THREE.BoxGeometry(0.12, 0.16, 0.04);
      const lEar = new THREE.Mesh(earGeo, snoutMat);
      lEar.position.set(-0.2, 0.24, 0.08);
      lEar.rotation.z = 0.4;
      this.body.add(lEar);
      const rEar = new THREE.Mesh(earGeo, snoutMat);
      rEar.position.set(0.2, 0.24, 0.08);
      rEar.rotation.z = -0.4;
      this.body.add(rEar);

      // 目
      const lEye = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), eyeMat);
      lEye.position.set(-0.12, 0.08, 0.28);
      this.body.add(lEye);
      const rEye = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), eyeMat);
      rEye.position.set(0.12, 0.08, 0.28);
      this.body.add(rEye);

    } else if (this.petType === 'dog') {
      // 🐶 犬 (シバイヌ)
      const furMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.5 }); // 茶柴
      const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffedd5, roughness: 0.5 }); // 白毛
      const noseMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });

      this.body = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.4, 0.5), furMat);
      this.body.castShadow = true;
      this.group.add(this.body);

      // 胸の白毛
      const chest = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.08), whiteMat);
      chest.position.set(0, -0.05, 0.23);
      this.body.add(chest);

      // 頭部
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.34, 0.34), furMat);
      head.position.set(0, 0.2, 0.25);
      this.body.add(head);

      // マズル
      const muzzle = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.14, 0.16), whiteMat);
      muzzle.position.set(0, -0.06, 0.2);
      head.add(muzzle);

      // 鼻
      const nose = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6), noseMat);
      nose.position.set(0, 0.02, 0.1);
      muzzle.add(nose);

      // 三角耳
      const earGeo = new THREE.ConeGeometry(0.08, 0.18, 4);
      const lEar = new THREE.Mesh(earGeo, furMat);
      lEar.position.set(-0.14, 0.22, -0.02);
      head.add(lEar);
      const rEar = new THREE.Mesh(earGeo, furMat);
      rEar.position.set(0.14, 0.22, -0.02);
      head.add(rEar);

      // 巻き尻尾
      const tail = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.035, 6, 12, Math.PI * 1.3), furMat);
      tail.position.set(0, 0.18, -0.28);
      tail.rotation.y = Math.PI / 2;
      this.body.add(tail);

    } else if (this.petType === 'cheetah') {
      // 🐆 チーター (スレンダーハンター)
      const furMat = new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.4 }); // 黄褐色
      const spotMat = new THREE.MeshStandardMaterial({ color: 0x18181b }); // 斑点
      const eyeMat = new THREE.MeshBasicMaterial({ color: 0x0284c7 });

      this.body = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.35, 0.6), furMat);
      this.body.castShadow = true;
      this.group.add(this.body);

      // 斑点ドット
      for (let i = 0; i < 6; i++) {
        const spot = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.07), spotMat);
        spot.position.set((Math.random() - 0.5) * 0.35, (Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.5);
        this.body.add(spot);
      }

      // スタイリッシュ頭部
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.28, 0.3), furMat);
      head.position.set(0, 0.16, 0.35);
      this.body.add(head);

      // 青く光る目
      const lEye = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.02), eyeMat);
      lEye.position.set(-0.08, 0.04, 0.16);
      head.add(lEye);
      const rEye = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.02), eyeMat);
      rEye.position.set(0.08, 0.04, 0.16);
      head.add(rEye);

      // 長い尾
      const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.02, 0.45, 6), furMat);
      tail.position.set(0, 0.1, -0.45);
      tail.rotation.x = -0.6;
      this.body.add(tail);

    } else if (this.petType === 'unicorn') {
      // 🦄 ユニコーン (虹色角の聖獣)
      const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2, metalness: 0.1, emissive: 0xa855f7, emissiveIntensity: 0.2 });
      const maneMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
      const hornMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 }); // 黄金の角

      this.body = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.55), whiteMat);
      this.body.castShadow = true;
      this.group.add(this.body);

      // 頭部
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.38, 0.36), whiteMat);
      head.position.set(0, 0.22, 0.3);
      this.body.add(head);

      // 黄金のツノ
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.38, 6), hornMat);
      horn.position.set(0, 0.32, 0.12);
      horn.rotation.x = 0.3;
      head.add(horn);

      // たてがみ
      const mane = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.35, 0.25), maneMat);
      mane.position.set(0, 0.15, -0.15);
      head.add(mane);

      // 光の翼
      const wingGeo = new THREE.BoxGeometry(0.35, 0.18, 0.02);
      const wingMat = new THREE.MeshBasicMaterial({ color: 0xa855f7, transparent: true, opacity: 0.8, side: THREE.DoubleSide });
      this.leftWing = new THREE.Mesh(wingGeo, wingMat);
      this.leftWing.position.set(-0.35, 0.15, -0.1);
      this.body.add(this.leftWing);
      this.rightWing = new THREE.Mesh(wingGeo, wingMat);
      this.rightWing.position.set(0.35, 0.15, -0.1);
      this.body.add(this.rightWing);

    } else {
      // 🧚 フェアリー (標準精霊)
      const bodyMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.3,
        metalness: 0.1,
        emissive: 0xf472b6,
        emissiveIntensity: 0.25,
      });
      const earMat = new THREE.MeshStandardMaterial({ color: 0xf472b6, roughness: 0.4 });
      const eyeMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });
      const cheekMat = new THREE.MeshBasicMaterial({ color: 0xfb7185 });
      const wingMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.8, side: THREE.DoubleSide });
      const ringMat = new THREE.MeshBasicMaterial({ color: 0xfde047, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending });

      this.body = new THREE.Mesh(new THREE.SphereGeometry(0.38, 20, 20), bodyMat);
      this.body.castShadow = true;
      this.group.add(this.body);

      const earGeo = new THREE.ConeGeometry(0.12, 0.35, 8);
      this.leftEar = new THREE.Mesh(earGeo, earMat);
      this.leftEar.position.set(-0.2, 0.38, -0.05);
      this.leftEar.rotation.z = 0.25;
      this.leftEar.rotation.x = -0.15;
      this.body.add(this.leftEar);

      this.rightEar = new THREE.Mesh(earGeo, earMat);
      this.rightEar.position.set(0.2, 0.38, -0.05);
      this.rightEar.rotation.z = -0.25;
      this.rightEar.rotation.x = -0.15;
      this.body.add(this.rightEar);

      const eyeGeo = new THREE.SphereGeometry(0.065, 10, 10);
      const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
      leftEye.position.set(-0.12, 0.06, 0.33);
      this.body.add(leftEye);

      const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
      rightEye.position.set(0.12, 0.06, 0.33);
      this.body.add(rightEye);

      const cheekGeo = new THREE.SphereGeometry(0.045, 8, 8);
      const leftCheek = new THREE.Mesh(cheekGeo, cheekMat);
      leftCheek.position.set(-0.2, -0.05, 0.3);
      this.body.add(leftCheek);

      const rightCheek = new THREE.Mesh(cheekGeo, cheekMat);
      rightCheek.position.set(0.2, -0.05, 0.3);
      this.body.add(rightCheek);

      const wingGeo = new THREE.BoxGeometry(0.35, 0.18, 0.02);
      this.leftWing = new THREE.Mesh(wingGeo, wingMat);
      this.leftWing.position.set(-0.35, 0.1, -0.22);
      this.body.add(this.leftWing);

      this.rightWing = new THREE.Mesh(wingGeo, wingMat);
      this.rightWing.position.set(0.35, 0.1, -0.22);
      this.body.add(this.rightWing);

      const ringGeo = new THREE.TorusGeometry(0.55, 0.02, 8, 24);
      this.auraRing = new THREE.Mesh(ringGeo, ringMat);
      this.auraRing.rotation.x = Math.PI / 2.3;
      this.group.add(this.auraRing);
    }
  }

  update(delta) {
    this.hoverTime += delta;

    // フォーメーション追従位置
    const offsetConfig = CONFIG.petOffsets[this.slotIndex] || CONFIG.petOffsets[0];
    const playerRot = this.player.group.rotation.y;
    const worldOffset = offsetConfig.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), playerRot);

    // 浮遊モーション (スロットごとに周期を少しずらす)
    const bobbing = Math.sin(this.hoverTime * 3.5 + this.slotIndex * 1.5) * 0.18;
    const targetPos = this.player.group.position.clone().add(worldOffset);
    targetPos.y += bobbing;

    const distToTarget = this.group.position.distanceTo(targetPos);
    const speedFactor = distToTarget > 3.0 ? CONFIG.petFollowSpeed * 1.6 : CONFIG.petFollowSpeed;

    this.group.position.lerp(targetPos, Math.min(delta * speedFactor, 1.0));

    // 敵またはプレイヤーの前方を向く
    let lookTarget = null;
    const nearestEnemy = this.findNearestZombie();
    if (nearestEnemy) {
      lookTarget = nearestEnemy.group.position;
    } else {
      lookTarget = this.player.group.position.clone().add(new THREE.Vector3(0, 0, 5).applyAxisAngle(new THREE.Vector3(0, 1, 0), playerRot));
    }

    if (lookTarget) {
      const lookDir = new THREE.Vector3().subVectors(lookTarget, this.group.position);
      const targetAngle = Math.atan2(lookDir.x, lookDir.z);
      let diff = targetAngle - this.group.rotation.y;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      this.group.rotation.y += diff * Math.min(delta * 8.0, 1.0);
    }

    // 羽ばたき等のモーション
    if (this.leftWing && this.rightWing) {
      const wingFlap = Math.sin(this.hoverTime * 14) * 0.45;
      this.leftWing.rotation.y = wingFlap;
      this.rightWing.rotation.y = -wingFlap;
    }
    if (this.auraRing) {
      this.auraRing.rotation.z += delta * 1.8;
    }

    // 射撃パルス
    if (this.shootAnimationTimer > 0) {
      this.shootAnimationTimer -= delta;
      const t = Math.max(this.shootAnimationTimer / 0.25, 0);
      if (this.body) this.body.scale.set(1.0 + t * 0.35, 1.0 + t * 0.35, 1.0 + t * 0.35);
    } else {
      if (this.body) this.body.scale.set(1.0, 1.0, 1.0);
    }

    // 索敵 & 攻撃
    this.attackTimer += delta;
    if (this.attackTimer >= this.attackCooldown) {
      if (nearestEnemy) {
        this.shoot(nearestEnemy);
        this.attackTimer = 0;
      }
    }
  }

  findNearestZombie() {
    let nearest = null;
    let minDist = CONFIG.petAttackRange;

    zombieManager.zombies.forEach((zombie) => {
      if (zombie.isDead) return;
      const dist = this.group.position.distanceTo(zombie.group.position);
      if (dist < minDist) {
        minDist = dist;
        nearest = zombie;
      }
    });

    return nearest;
  }

  shoot(targetZombie) {
    this.shootAnimationTimer = 0.25;

    const muzzlePos = this.group.position.clone().add(
      new THREE.Vector3(0, 0, 0.45).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.group.rotation.y)
    );

    projectileManager.shoot(
      muzzlePos,
      targetZombie,
      this.petData.bulletType,
      this.petData.bulletSpeed
    );
  }

  destroy() {
    scene.remove(this.group);
  }
}

// 複数ペットマネージャー (最大3体編成)
class PetManager {
  constructor(player) {
    this.player = player;
    this.pets = [];
    this.rebuild(saveData.equipped.pets);
  }

  rebuild(petIds) {
    // 既存のペットを破棄
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
// 12. サードパーソンカメラコントローラー
// =============================================================================
class CameraController {
  constructor(camera, target) {
    this.camera = camera;
    this.target = target;
    this.currentLookAt = new THREE.Vector3();
    this.shakeIntensity = 0;
  }

  shake(amount) {
    this.shakeIntensity = Math.min(this.shakeIntensity + amount, 0.4);
  }

  update(delta) {
    if (!this.target) return;

    const idealOffset = CONFIG.cameraOffset.clone();
    const targetPos = this.target.group.position;
    const idealPos = targetPos.clone().add(idealOffset);

    if (this.shakeIntensity > 0) {
      idealPos.x += (Math.random() - 0.5) * this.shakeIntensity;
      idealPos.y += (Math.random() - 0.5) * this.shakeIntensity;
      this.shakeIntensity = Math.max(0, this.shakeIntensity - delta * 1.5);
    }

    this.camera.position.lerp(idealPos, CONFIG.cameraLerp);

    const idealLookAt = targetPos.clone().add(CONFIG.cameraLookOffset);
    this.currentLookAt.lerp(idealLookAt, CONFIG.cameraLerp * 1.5);
    this.camera.lookAt(this.currentLookAt);

    dirLight.position.set(targetPos.x + 12, 20, targetPos.z - 10);
    dirLight.target.position.copy(targetPos);
    dirLight.target.updateMatrixWorld();
  }
}

// =============================================================================
// 13. UI & タッチ操作
// =============================================================================
function setupControls(player) {
  const joystickZone = document.getElementById('joystick-zone');
  const joystickKnob = document.getElementById('joystick-knob');
  const attackBtn = document.getElementById('btn-attack');

  let touchId = null;
  let center = { x: 0, y: 0 };
  const maxRadius = 46;

  function onJoystickStart(clientX, clientY, identifier) {
    if (state.isPaused) return;
    touchId = identifier;
    const rect = joystickZone.getBoundingClientRect();
    center = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
    onJoystickMove(clientX, clientY);
  }

  function onJoystickMove(clientX, clientY) {
    if (state.isPaused) return;
    const deltaX = clientX - center.x;
    const deltaY = clientY - center.y;
    const dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const angle = Math.atan2(deltaY, deltaX);

    const clampedDist = Math.min(dist, maxRadius);
    const knobX = Math.cos(angle) * clampedDist;
    const knobY = Math.sin(angle) * clampedDist;

    joystickKnob.style.transform = `translate(${knobX}px, ${knobY}px)`;

    state.moveVector.x = knobX / maxRadius;
    state.moveVector.y = -knobY / maxRadius;
  }

  function onJoystickEnd() {
    touchId = null;
    joystickKnob.style.transform = 'translate(0px, 0px)';
    state.moveVector.set(0, 0);
  }

  joystickZone.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    if (touchId === null) {
      joystickZone.setPointerCapture(e.pointerId);
      onJoystickStart(e.clientX, e.clientY, e.pointerId);
    }
  });

  joystickZone.addEventListener('pointermove', (e) => {
    e.preventDefault();
    if (touchId === e.pointerId) {
      onJoystickMove(e.clientX, e.clientY);
    }
  });

  const stopJoystick = (e) => {
    if (touchId === e.pointerId) {
      joystickZone.releasePointerCapture(e.pointerId);
      onJoystickEnd();
    }
  };
  joystickZone.addEventListener('pointerup', stopJoystick);
  joystickZone.addEventListener('pointercancel', stopJoystick);

  attackBtn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    player.attack();
  });

  window.addEventListener('keydown', (e) => {
    if (state.isPaused) return;
    switch (e.code) {
      case 'KeyW':
      case 'ArrowUp':
        state.keys.forward = true;
        break;
      case 'KeyS':
      case 'ArrowDown':
        state.keys.backward = true;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        state.keys.left = true;
        break;
      case 'KeyD':
      case 'ArrowRight':
        state.keys.right = true;
        break;
      case 'Space':
      case 'KeyJ':
        player.attack();
        break;
    }
  });

  window.addEventListener('keyup', (e) => {
    switch (e.code) {
      case 'KeyW':
      case 'ArrowUp':
        state.keys.forward = false;
        break;
      case 'KeyS':
      case 'ArrowDown':
        state.keys.backward = false;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        state.keys.left = false;
        break;
      case 'KeyD':
      case 'ArrowRight':
        state.keys.right = false;
        break;
    }
  });
}

function updateHUD(worldPos) {
  const killEl = document.getElementById('kill-count');
  const coinEl = document.getElementById('coin-count');
  const shopCoinEl = document.getElementById('shop-coin-display');
  const buddyStatusEl = document.getElementById('buddy-status');

  if (killEl) killEl.innerText = state.kills;
  if (coinEl) coinEl.innerText = state.coins;
  if (shopCoinEl) shopCoinEl.innerText = state.coins;

  // 編成中のペットアイコン表示
  if (buddyStatusEl && saveData.equipped.pets) {
    const icons = saveData.equipped.pets.map(p => ITEMS_DATA.pets[p]?.icon || '🧚').join('');
    buddyStatusEl.innerText = `${icons} (${saveData.equipped.pets.length}/3)`;
  }

  const killsCard = document.querySelector('.kills-card');
  const coinsCard = document.querySelector('.coins-card');
  if (killsCard) killsCard.classList.add('bump');
  if (coinsCard) coinsCard.classList.add('bump');

  setTimeout(() => {
    if (killsCard) killsCard.classList.remove('bump');
    if (coinsCard) coinsCard.classList.remove('bump');
  }, 150);

  if (worldPos) {
    const screenPos = worldPos.clone().project(camera);
    const x = ((screenPos.x + 1) * window.innerWidth) / 2;
    const y = ((-screenPos.y + 1) * window.innerHeight) / 2;

    const popup = document.createElement('div');
    popup.className = 'coin-popup';
    popup.innerText = '+10 COINS';
    popup.style.left = `${x}px`;
    popup.style.top = `${y}px`;
    document.getElementById('ui-layer').appendChild(popup);

    setTimeout(() => popup.remove(), 900);
  }
}

// =============================================================================
// 14. ショップ & 着せ替えUIコントローラー (ペットタブ対応)
// =============================================================================
class ShopUI {
  constructor(player, petManager) {
    this.player = player;
    this.petManager = petManager;
    this.currentTab = 'outfit';
    this.modal = document.getElementById('shop-modal');
    this.openBtn = document.getElementById('btn-open-shop');
    this.closeBtn = document.getElementById('btn-close-shop');
    this.backdrop = document.getElementById('shop-backdrop');
    this.grid = document.getElementById('shop-items-grid');
    this.tabs = document.querySelectorAll('.shop-tab');

    this.bindEvents();
    this.render();
  }

  bindEvents() {
    this.openBtn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.open();
    });

    this.closeBtn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.close();
    });

    this.backdrop.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.close();
    });

    this.tabs.forEach((tab) => {
      tab.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        const targetTab = tab.dataset.tab;
        if (this.currentTab !== targetTab) {
          this.currentTab = targetTab;
          this.tabs.forEach((t) => t.classList.toggle('active', t === tab));
          this.render();
        }
      });
    });
  }

  open() {
    state.isPaused = true;
    state.moveVector.set(0, 0);
    this.modal.classList.remove('hidden');
    updateHUD();
    this.render();
  }

  close() {
    state.isPaused = false;
    this.modal.classList.add('hidden');
  }

  render() {
    this.grid.innerHTML = '';

    if (this.currentTab === 'pet') {
      this.renderPetTab();
      return;
    }

    let items = {};
    let unlockedList = [];
    let equippedId = '';
    let categoryKey = '';

    if (this.currentTab === 'outfit') {
      items = ITEMS_DATA.outfits;
      unlockedList = saveData.unlocked.outfits;
      equippedId = saveData.equipped.outfit;
      categoryKey = 'outfit';
    } else if (this.currentTab === 'head') {
      items = ITEMS_DATA.heads;
      unlockedList = saveData.unlocked.heads;
      equippedId = saveData.equipped.head;
      categoryKey = 'head';
    } else if (this.currentTab === 'sword') {
      items = ITEMS_DATA.swords;
      unlockedList = saveData.unlocked.swords;
      equippedId = saveData.equipped.sword;
      categoryKey = 'sword';
    }

    Object.values(items).forEach((item) => {
      const isUnlocked = unlockedList.includes(item.id);
      const isEquipped = equippedId === item.id;

      const card = document.createElement('div');
      card.className = `item-card ${isEquipped ? 'is-equipped' : ''}`;

      if (isEquipped) {
        const badge = document.createElement('span');
        badge.className = 'item-badge-equipped';
        badge.innerText = 'EQUIPPED';
        card.appendChild(badge);
      }

      const previewBox = document.createElement('div');
      previewBox.className = 'item-preview-box';
      
      const icon = document.createElement('span');
      icon.className = 'item-icon-display';
      icon.innerText = item.icon;
      previewBox.appendChild(icon);

      if (item.tag) {
        const tag = document.createElement('span');
        tag.className = 'item-effect-tag';
        tag.innerText = item.tag;
        previewBox.appendChild(tag);
      }
      card.appendChild(previewBox);

      const info = document.createElement('div');
      info.className = 'item-info';

      const title = document.createElement('h3');
      title.className = 'item-name';
      title.innerText = item.name;
      info.appendChild(title);

      const desc = document.createElement('p');
      desc.className = 'item-desc';
      desc.innerText = item.desc;
      info.appendChild(desc);

      card.appendChild(info);

      const actionRow = document.createElement('div');
      actionRow.className = 'item-action-row';

      const btn = document.createElement('button');
      btn.className = 'item-btn';

      if (isEquipped) {
        btn.className += ' item-btn-equipped';
        btn.innerText = '✓ 装備中';
      } else if (isUnlocked) {
        btn.className += ' item-btn-equip';
        btn.innerText = '装備する';
        btn.addEventListener('pointerdown', (e) => {
          e.preventDefault();
          this.equipItem(categoryKey, item.id);
        });
      } else {
        btn.className += ' item-btn-buy';
        btn.innerHTML = `購入 🪙${item.price}`;
        btn.addEventListener('pointerdown', (e) => {
          e.preventDefault();
          this.buyItem(categoryKey, item, card);
        });
      }

      actionRow.appendChild(btn);
      card.appendChild(actionRow);

      this.grid.appendChild(card);
    });
  }

  // ペット専用タブのレンダリング (最大3体編成)
  renderPetTab() {
    const equippedPets = saveData.equipped.pets || [];
    const unlockedPets = saveData.unlocked.pets || ['fairy'];

    Object.values(ITEMS_DATA.pets).forEach((item) => {
      const isUnlocked = unlockedPets.includes(item.id);
      const slotIndex = equippedPets.indexOf(item.id);
      const isEquipped = slotIndex !== -1;

      const card = document.createElement('div');
      card.className = `item-card ${isEquipped ? 'is-equipped' : ''}`;

      // 編成中スロットバッジ
      if (isEquipped) {
        const badge = document.createElement('span');
        badge.className = 'item-badge-slot';
        badge.innerText = `SLOT ${slotIndex + 1}`;
        card.appendChild(badge);
      }

      const previewBox = document.createElement('div');
      previewBox.className = 'item-preview-box';
      
      const icon = document.createElement('span');
      icon.className = 'item-icon-display';
      icon.innerText = item.icon;
      previewBox.appendChild(icon);

      if (item.tag) {
        const tag = document.createElement('span');
        tag.className = 'item-effect-tag';
        tag.innerText = item.tag;
        previewBox.appendChild(tag);
      }
      card.appendChild(previewBox);

      const info = document.createElement('div');
      info.className = 'item-info';

      const title = document.createElement('h3');
      title.className = 'item-name';
      title.innerText = item.name;
      info.appendChild(title);

      const desc = document.createElement('p');
      desc.className = 'item-desc';
      desc.innerText = `${item.desc} (攻撃間隔: ${item.attackInterval}s)`;
      info.appendChild(desc);

      card.appendChild(info);

      const actionRow = document.createElement('div');
      actionRow.className = 'item-action-row';

      if (isEquipped) {
        // 編成中: 「外す」ボタン（1体だけの場合は外せない）
        const unequipBtn = document.createElement('button');
        unequipBtn.className = 'item-btn item-btn-unequip';
        unequipBtn.innerText = '✕ 外す';
        unequipBtn.addEventListener('pointerdown', (e) => {
          e.preventDefault();
          if (equippedPets.length <= 1) {
            card.classList.add('shake-anim');
            setTimeout(() => card.classList.remove('shake-anim'), 400);
            return;
          }
          this.unequipPet(item.id);
        });
        actionRow.appendChild(unequipBtn);
      } else if (isUnlocked) {
        // 所持済み & 未編成
        const equipBtn = document.createElement('button');
        equipBtn.className = 'item-btn item-btn-equip';

        if (equippedPets.length >= 3) {
          equipBtn.innerText = '満杯 (3/3)';
          equipBtn.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            card.classList.add('shake-anim');
            setTimeout(() => card.classList.remove('shake-anim'), 400);
          });
        } else {
          equipBtn.innerText = `＋ 編成 (${equippedPets.length + 1}/3)`;
          equipBtn.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            this.equipPet(item.id);
          });
        }
        actionRow.appendChild(equipBtn);
      } else {
        // 未所持: 購入ボタン
        const buyBtn = document.createElement('button');
        buyBtn.className = 'item-btn item-btn-buy';
        buyBtn.innerHTML = `購入 🪙${item.price}`;
        buyBtn.addEventListener('pointerdown', (e) => {
          e.preventDefault();
          this.buyPet(item, card);
        });
        actionRow.appendChild(buyBtn);
      }

      card.appendChild(actionRow);
      this.grid.appendChild(card);
    });
  }

  buyPet(item, cardElement) {
    if (state.coins < item.price) {
      cardElement.classList.add('shake-anim');
      setTimeout(() => cardElement.classList.remove('shake-anim'), 400);
      return;
    }

    state.coins -= item.price;
    saveData.coins = state.coins;

    if (!saveData.unlocked.pets.includes(item.id)) {
      saveData.unlocked.pets.push(item.id);
    }

    // 3体未満なら自動編成
    if (saveData.equipped.pets.length < 3) {
      saveData.equipped.pets.push(item.id);
      this.petManager.rebuild(saveData.equipped.pets);
    }

    SaveManager.save(saveData);
    updateHUD();
    this.render();
  }

  equipPet(petId) {
    if (saveData.equipped.pets.length >= 3 || saveData.equipped.pets.includes(petId)) return;

    saveData.equipped.pets.push(petId);
    this.petManager.rebuild(saveData.equipped.pets);
    SaveManager.save(saveData);
    updateHUD();
    this.render();
  }

  unequipPet(petId) {
    if (saveData.equipped.pets.length <= 1) return;

    saveData.equipped.pets = saveData.equipped.pets.filter(id => id !== petId);
    this.petManager.rebuild(saveData.equipped.pets);
    SaveManager.save(saveData);
    updateHUD();
    this.render();
  }

  buyItem(categoryKey, item, cardElement) {
    if (state.coins < item.price) {
      cardElement.classList.add('shake-anim');
      setTimeout(() => cardElement.classList.remove('shake-anim'), 400);
      return;
    }

    state.coins -= item.price;
    saveData.coins = state.coins;

    if (categoryKey === 'outfit') {
      saveData.unlocked.outfits.push(item.id);
    } else if (categoryKey === 'head') {
      saveData.unlocked.heads.push(item.id);
    } else if (categoryKey === 'sword') {
      saveData.unlocked.swords.push(item.id);
    }

    this.equipItem(categoryKey, item.id);

    SaveManager.save(saveData);
    updateHUD();
    this.render();
  }

  equipItem(categoryKey, itemId) {
    if (categoryKey === 'outfit') {
      saveData.equipped.outfit = itemId;
      this.player.applyOutfit(itemId);
    } else if (categoryKey === 'head') {
      saveData.equipped.head = itemId;
      this.player.applyHeadGear(itemId);
    } else if (categoryKey === 'sword') {
      saveData.equipped.sword = itemId;
      this.player.applySword(itemId);
    }

    SaveManager.save(saveData);
    this.render();
  }
}

// リサイズ対応
function onWindowResize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
}
window.addEventListener('resize', onWindowResize);
window.addEventListener('orientationchange', () => {
  setTimeout(onWindowResize, 100);
});

// =============================================================================
// 15. メインゲームループ初期化 & 実行
// =============================================================================
const swordParticleSystem = new SwordParticleSystem();
const player = new Player();
const zombieManager = new ZombieManager();
const particleSystem = new ParticleSystem();
const projectileManager = new ProjectileManager();
const petManager = new PetManager(player);
const cameraController = new CameraController(camera, player);
const shopUI = new ShopUI(player, petManager);

window.player = player;
window.loadPlayerModel = (url) => player.loadCustomModel(url);

setupControls(player);
updateHUD();

for (let i = 0; i < 5; i++) {
  zombieManager.spawnOne(player.group.position);
}

const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const delta = Math.min(clock.getDelta(), 0.1);

  if (!state.isPaused) {
    player.update(delta);
    petManager.update(delta);
    projectileManager.update(delta);
    zombieManager.update(delta, player.group.position);
    particleSystem.update(delta);
    swordParticleSystem.update(delta);
    cameraController.update(delta);
  } else {
    swordParticleSystem.update(delta * 0.5);
  }

  renderer.render(scene, camera);
}

animate();
