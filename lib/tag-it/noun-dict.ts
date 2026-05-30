/**
 * 명사 보호 사전 (NNG) — 클라이언트 lazy-load 싱글턴.
 *
 * 정적 자산 /tag-it/noun-dict.txt.gz (mecab-ko-dic 2.1.1 NNG, Apache-2.0, 216,932개)을
 * 1회 fetch → fflate gunzip → Set. extract.ts가 getNounDict()로 "명사 보호 신호"로만 사용.
 *
 * ⚠️ fallback 원칙: fetch/디코드 실패해도 **절대 안 깨진다**. 사전 null → 확률 모델은
 *    "사전 X = 50% 시작" 경로만 타므로 Phase 2 동작과 동일(보호 신호만 없을 뿐).
 * 프라이버시: 사전은 정적 자산, 사용자 문서는 서버로 전송되지 않는다.
 */

import { gunzipSync, strFromU8 } from "fflate";

/** 사전 자산 경로 (public/tag-it/). 도구는 /tools/tag-it, 자산은 루트 기준. */
const DICT_URL = "/tag-it/noun-dict.txt.gz";

let dict: Set<string> | null = null;
let inflight: Promise<Set<string> | null> | null = null;

/**
 * gzip 바이트 → 명사 Set (순수 함수 — 노드 스모크 가능).
 * 줄바꿈 구분 표제어. 빈 줄 무시.
 */
export function decodeNounDict(bytes: Uint8Array): Set<string> {
  const text = strFromU8(gunzipSync(bytes));
  const set = new Set<string>();
  for (const line of text.split("\n")) {
    if (line) set.add(line);
  }
  return set;
}

/** 현재 로드된 사전(없으면 null) — extract.ts가 동기 조회. */
export function getNounDict(): Set<string> | null {
  return dict;
}

/** 테스트·재설정용 — 사전 주입(노드 스모크에서 사용). */
export function setNounDict(next: Set<string> | null): void {
  dict = next;
}

/**
 * 사전 1회 로드. 중복 호출은 같은 promise 공유(in-flight 가드). 성공 시 싱글턴 채움.
 * 실패 시 null 반환·dict는 null 유지(fallback) — throw 하지 않는다.
 */
export function loadNounDict(): Promise<Set<string> | null> {
  if (dict) return Promise.resolve(dict);
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const res = await fetch(DICT_URL);
      if (!res.ok) return null;
      const bytes = new Uint8Array(await res.arrayBuffer());
      dict = decodeNounDict(bytes);
      return dict;
    } catch {
      return null; // fallback: 사전 없이 50% 경로
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}
