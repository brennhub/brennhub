/**
 * brennhub 자원오행 214부수 매핑 — 학파 plug-in 구조.
 *
 * 기본: ai-default (brennhub AI 학파)
 *   - 팩트 기반 자체 구축 (환각 X)
 *   - 명확 ~120 부수: 字源 + 작명소 다수안 만장일치
 *   - 차이 ~90 부수: 다수안 + 字源 cross-reference (verbatim record)
 *   - 출처/검증: docs/learnings/2026-05-20-saju-naming-c5-4-mapping.md
 *
 * Advanced (향후): 전통 학파 옵션
 *   - "kim-kiseung" (김기승 『자원오행 성명학』)
 *   - "lee-jaeseung" (이재승 2024 KCI 논문)
 *   - "ahn-taeok" (안태옥 ksname)
 *
 * 확장 path (전통 학파 추가):
 *   1. export const RADICAL_OHAENG_<SCHOOL_KEY> 추가
 *   2. School union에 학파 키 추가
 *   3. SCHOOL_TABLES record에 매핑 등록
 *   4. UI Advanced 옵션 디자인 (별도 task)
 *
 * 학파 우열 없음. 사용자 선택권. brennhub 가치: 단일 정답 강제 X + 정직성 + 확장성.
 */

export type Ohaeng = "목" | "화" | "토" | "금" | "수";
export type School = "ai-default"; // 향후 확장: | "kim-kiseung" | "lee-jaeseung" | "ahn-taeok"

/**
 * ai-default 214 부수 자원오행 — 강희 부수 획수 그룹별 [부수열, 오행열] 정렬쌍.
 * 부수열 순서 = 강희 부수번호 1~214 (C-5-3 build-staged-unihan.ts RADICAL_GROUPS와 동일).
 * 오행열은 부수열과 인덱스 1:1 — 리뷰 시 글자 단위로 정렬 대조.
 */
const AI_DEFAULT_GROUPS: readonly (readonly [string, string])[] = [
  ["一丨丶丿乙亅", "토목화화목금"],
  [
    "二亠人儿入八冂冖冫几凵刀力勹匕匚匸十卜卩厂厶又",
    "토화화화목금토토수목토금토금금토토토화토토금목",
  ],
  [
    "口囗土士夂夊夕大女子宀寸小尢尸屮山巛工己巾干幺广廴廾弋弓彐彡彳",
    "수토토금토토수화토수토토수토수목토수금토목금목토토목금금토화화",
  ],
  [
    "心戈戶手支攴文斗斤方无日曰月木欠止歹殳毋比毛氏气水火爪父爻爿片牙牛犬",
    "화금목목목금화금금토화화화수목금토수금토화금토수수화금목화목목금토토",
  ],
  [
    "玄玉瓜瓦甘生用田疋疒癶白皮皿目矛矢石示禸禾穴立",
    "수금목토토목금토토수토금금토화금금토화토목토화",
  ],
  [
    "竹米糸缶网羊羽老而耒耳聿肉臣自至臼舌舛舟艮色艸虍虫血行衣襾",
    "목목목토목토화토화목수목토화금토토화토목토토목목수화화목토",
  ],
  ["見角言谷豆豕豸貝赤走足身車辛辰辵邑酉釆里", "화금금수목토토금화토토화화금토토토금토토"],
  ["金長門阜隶隹雨靑非", "금목목토토화수목화"],
  ["面革韋韭音頁風飛食首香", "화금금목금화목화토화목"],
  ["馬骨高髟鬥鬯鬲鬼", "화수목금금목토화"],
  ["魚鳥鹵鹿麥麻", "수화수토목목"],
  ["黃黍黑黹", "토목수목"],
  ["黽鼎鼓鼠", "수금금수"],
  ["鼻齊", "금목"],
  ["齒", "수"],
  ["龍龜", "토수"],
  ["龠", "금"],
];

const VALID_OHAENG: ReadonlySet<string> = new Set(["목", "화", "토", "금", "수"]);

function buildAiDefault(): Record<number, Ohaeng> {
  const map: Record<number, Ohaeng> = {};
  let n = 0;
  for (const [radicals, ohaengs] of AI_DEFAULT_GROUPS) {
    const rChars = [...radicals];
    const oChars = [...ohaengs];
    if (rChars.length !== oChars.length) {
      throw new Error(
        `자원오행 그룹 길이 불일치: 부수 "${radicals}"(${rChars.length}) ≠ 오행(${oChars.length})`,
      );
    }
    for (const o of oChars) {
      if (!VALID_OHAENG.has(o)) {
        throw new Error(`잘못된 오행 문자: "${o}"`);
      }
      n += 1;
      map[n] = o as Ohaeng;
    }
  }
  if (n !== 214) throw new Error(`자원오행 매핑 ${n}개 (214 기대)`);
  return map;
}

/** brennhub AI 학파 — 강희 부수번호(1~214) → 자원오행. */
export const RADICAL_OHAENG_AI_DEFAULT: Record<number, Ohaeng> =
  buildAiDefault();

// 향후 추가 (현재 미구현):
// export const RADICAL_OHAENG_KIM_KISEUNG: Record<number, Ohaeng> = ...;
// export const RADICAL_OHAENG_LEE_JAESEUNG: Record<number, Ohaeng> = ...;

const SCHOOL_TABLES: Record<School, Record<number, Ohaeng>> = {
  "ai-default": RADICAL_OHAENG_AI_DEFAULT,
};

/**
 * 부수번호 → 자원오행. 비표준 한자(radicalNumber null) → null.
 * @param school 학파 선택 (기본 ai-default = brennhub AI 학파).
 */
export function getJaOhaeng(
  radicalNumber: number | null,
  school: School = "ai-default",
): Ohaeng | null {
  if (radicalNumber == null) return null;
  return SCHOOL_TABLES[school][radicalNumber] ?? null;
}
