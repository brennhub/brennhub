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
export type LucideIconId = "ghost" | "bug" | "rocket";

/**
 * Visual 추상화 — 3 variant union.
 * - `primitive`: rect/circle (탄·fallback)
 * - `lucide-raster`: 부팅 시 (iconId, tint) 조합별로 ImageBitmap 베이킹 → render는 drawImage만
 * - `sprite`: PNG 등 외부 자산 (MVP는 미사용, 인터페이스만)
 */
export type Visual =
  | { kind: "primitive"; shape: "rect" | "circle"; color: string; size: number }
  | { kind: "lucide-raster"; iconId: LucideIconId; tint: string; size: number }
  | { kind: "sprite"; spriteId: string; size: number };

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

/** 적 정의 — 데이터로 enemy 인스턴스를 만든다. MVP는 weapon 미부여. */
export type EnemyDef = {
  id: string;
  hp: number;
  speed: number; // px/sec
  scoreValue: number;
  visual: Visual;
  hitbox: Hitbox;
  weapon?: WeaponDef;
  /** 이동 패턴 — MVP는 hsine(좌우 사인파 + 천천히 하강)만. */
  movement: { kind: "hsine"; amplitudePx: number; periodMs: number; descendSpeed: number };
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
  score: number;
  lives: number;
  wave: WaveProgress;
  /** entity id auto-increment. */
  nextEntityId: number;
};

export type WaveProgress = {
  defId: string;
  /** 0부터 — 같은 웨이브 클리어할 때마다 ++. MVP는 같은 wave 무한 반복. */
  loopCount: number;
  /** 현 loop 시작 ms. spawn delay 계산 기준. */
  startMs: number;
  /** 현 loop에서 spawn한 적 수. */
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
