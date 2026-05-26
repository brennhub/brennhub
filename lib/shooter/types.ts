/**
 * Arcade Shooter — canonical 타입 정의.
 *
 * 모든 게임 객체는 데이터(EnemyDef/WeaponDef/ProjectilePattern/WaveDef)로 정의되고,
 * 루프는 데이터를 해석한다. 파츠 시스템 확장은 `playerWeapon = WEAPONS[loadout.weapon]`
 * 한 줄 교체로 흡수되도록 설계 (MVP는 단일 무기).
 */

export type Vec2 = { x: number; y: number };

/** AABB 충돌 박스 (중심 좌표 기준 — pos는 entity 중심). */
export type Hitbox = { w: number; h: number };

/** 사전 등록된 lucide 아이콘 식별자 — raster 캐시 키. */
export type LucideIconId =
  | "ghost"
  | "bug"
  | "shield"
  | "zap"
  | "sparkles"
  | "coins"
  | "heart";

/** 아이템 종류 — 화면에 떠다니다 플레이어가 먹으면 효과 발동. */
export type PickupKind =
  | "shield"        // 일정 시간 무적
  | "rapid-fire"    // 일정 시간 cooldown 단축
  | "multi-shot"    // 일정 시간 3-way 발사
  | "score-bonus"   // 즉시 점수 추가
  | "extra-life";   // 즉시 생명 +1 (max 캡)

/**
 * Visual 추상화 — 3 variant union.
 * - `primitive`: rect/circle (탄·fallback)
 * - `lucide-raster`: 부팅 시 (iconId, tint) 조합별로 ImageBitmap 베이킹 → render는 drawImage만
 * - `sprite`: 픽셀 도트 매트릭스를 부팅 시 OffscreenCanvas에 베이킹 → drawImage.
 *   비율이 정사각이 아니므로 width/height 분리 (size 단일값 X). spriteId는
 *   pixel-sprites.ts의 SpriteId 유니온과 일치.
 */
export type Visual =
  | { kind: "primitive"; shape: "rect" | "circle"; color: string; size: number }
  | { kind: "lucide-raster"; iconId: LucideIconId; tint: string; size: number }
  | { kind: "sprite"; spriteId: string; width: number; height: number };

/** 모든 동적 객체의 베이스. pos는 중심 좌표. */
export type Entity = {
  id: string;
  pos: Vec2;
  vel: Vec2;
  hitbox: Hitbox;
  visual: Visual;
  alive: boolean;
};

/** 투사체 패턴 — 무엇을 어떻게 발사할지. MVP는 straight만. */
export type ProjectilePattern = {
  kind: "straight" | "spread";
  count: number;
  spreadAngleDeg?: number;
  speed: number;
  damage: number;
  visual: Visual;
  hitbox: Hitbox;
  ownerSide: "player" | "enemy";
};

/** 무기 정의 — 발사 주기는 cooldownMs (EnemyDef.fireIntervalMs 같은 중복 필드 X). */
export type WeaponDef = {
  id: string;
  cooldownMs: number;
  projectile: ProjectilePattern;
};

/** 적 이동 패턴 — 시간 기반 함수로 enemy 위치 결정. spawn.ts에서 enemy에 def.movement 복사. */
export type EnemyMovement =
  /** 좌우 사인파 + 일정 하강. amplitudePx, periodMs, descendSpeed(px/s). */
  | { kind: "hsine"; amplitudePx: number; periodMs: number; descendSpeed: number }
  /** 직선 하강. baseX 고정, y만 descendSpeed로 증가. */
  | { kind: "straight"; descendSpeed: number }
  /** 빠른 다이브. 처음 가속 → 일정 속도로 하강. accel은 px/s². */
  | { kind: "diver"; accel: number; maxSpeed: number };

/** 적 정의 — 데이터로 enemy 인스턴스를 만든다. MVP는 weapon 미부여. */
export type EnemyDef = {
  id: string;
  hp: number;
  speed: number; // px/sec — info용 (실제 이동은 movement가 결정)
  scoreValue: number;
  visual: Visual;
  hitbox: Hitbox;
  weapon?: WeaponDef;
  movement: EnemyMovement;
};

/** 웨이브 정의 — spawn 큐. */
export type WaveDef = {
  id: string;
  enemies: { defId: string; spawnAt: Vec2; delayMs: number }[];
};

export type PlayerState = Entity & {
  weapon: WeaponDef;
  lastFireMs: number;
  invulnerableUntilMs: number;
  /** rapid-fire power-up 종료 시각. > elapsedMs면 cooldown 단축 적용. */
  rapidFireUntilMs: number;
  /** multi-shot power-up 종료 시각. > elapsedMs면 3-way spread 발사. */
  multiShotUntilMs: number;
};

export type EnemyEntity = Entity & {
  defId: string;
  hp: number;
  lastFireMs: number;
  /** 스폰 시각 (movement 계산 phase 기준). */
  spawnedAtMs: number;
  /** 스폰 시점 x — sine 이동의 중심선. */
  baseX: number;
};

export type ProjectileEntity = Entity & {
  ownerSide: "player" | "enemy";
  damage: number;
};

/** 화면에 떠다니는 아이템. 플레이어와 충돌 시 효과 적용 후 despawn. */
export type PickupEntity = Entity & {
  kind: PickupKind;
  spawnedAtMs: number;
};

/** 게임 상태 — mutable ref가 owner. React state 아님. */
export type GameState = {
  status: "playing" | "gameover";
  /** 누적 update step 횟수. fixed timestep 기준 — 결정론. */
  tick: number;
  /** 누적 경과 시각 (ms) — 무기 cooldown / invulnerable / movement phase 계산. */
  elapsedMs: number;
  player: PlayerState;
  enemies: EnemyEntity[];
  projectiles: ProjectileEntity[];
  pickups: PickupEntity[];
  score: number;
  lives: number;
  wave: WaveProgress;
  /** entity id auto-increment. */
  nextEntityId: number;
};

export type WaveProgress = {
  defId: string;
  /** WAVE_SEQUENCE 인덱스. 클리어 시 sequenceIndex++, 시퀀스 끝나면 loopCount++ + reset. */
  sequenceIndex: number;
  /** 전체 시퀀스 한 바퀴 돌 때마다 ++. */
  loopCount: number;
  /** 현 wave 시작 ms. spawn delay 계산 기준. */
  startMs: number;
  /** 현 wave에서 spawn한 적 수. */
  spawnedCount: number;
};

/** HUD 표시용 얇은 snapshot — onHudChange diff 비교 대상. */
export type HudSnapshot = {
  score: number;
  lives: number;
  status: "playing" | "gameover";
  highScore: number;
  isNewHighScore: boolean;
};

/** 입력 intent — 매 frame 1회 getIntent()로 폴링. */
export type Intent = {
  moveLeft: boolean;
  moveRight: boolean;
  moveUp: boolean;
  moveDown: boolean;
  fire: boolean;
};

/** 캔버스 논리 좌표계. DPR 무관. */
export const LOGICAL_W = 360;
export const LOGICAL_H = 640;

/** Fixed timestep — 60Hz. */
export const STEP_MS = 1000 / 60;

/** 한 rAF tick에서 최대 누적 step 수 — 탭 백그라운드 복귀 스파이럴 방지. */
export const MAX_STEPS_PER_TICK = 5;

/** 플레이어 피격 후 무적 시간. */
export const PLAYER_INVULNERABLE_MS = 1500;

/** 초기 생명. */
export const INITIAL_LIVES = 3;

/** 최대 생명 (extra-life 픽업 캡). */
export const MAX_LIVES = 5;

/** 플레이어 y 이동 가능 범위. 위쪽은 적 spawn 영역 침범 방지. */
export const PLAYER_MIN_Y_RATIO = 0.35;
