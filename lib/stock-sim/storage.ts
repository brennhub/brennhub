/**
 * stock-sim 4개 계산기 공용 storage 추상화.
 * 매핑 (b): 계산기별 슬러그 분리 — tool = `stock-sim:<sub>` (cost-basis 등). D1 4 row 독립.
 *
 * 정책 (supp-plan/language-maker/maze 일관):
 *   - 로그인 = D1 (/api/user-data/stock-sim:<sub>), 게스트 = localStorage.
 *   - 자동 이전 없음. D1은 현 shape만 (migrate 안 함). localStorage만 parse/migrate (게스트 legacy).
 *
 * stock-sim 고유: 저장이 매 입력(keystroke)마다 발생 → save는 debounce(600ms).
 *   탭 전환(컴포넌트 unmount) 시 마지막 입력 유실 방지 위해 flush() 제공.
 */

import { D1UserData } from "@/lib/user-data/d1";

const DEBOUNCE_MS = 600;
const KEY_PREFIX = "brennhub:stock-sim:";

export interface CalcStorage<T> {
  /** 현재 저장값 read. 없거나 손상 시 null. */
  get(): Promise<T | null>;
  /** debounce 저장 — 마지막 호출 후 600ms. */
  save(data: T): void;
  /** 대기 중 저장을 즉시 기록 (unmount/backend 전환 직전). */
  flush(): void;
}

function debounced<T>(write: (data: T) => void): Pick<CalcStorage<T>, "save" | "flush"> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pending: T | null = null;
  let has = false;

  const commit = () => {
    if (!has) return;
    const data = pending as T;
    has = false;
    pending = null;
    write(data);
  };

  return {
    save(data: T) {
      pending = data;
      has = true;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        commit();
      }, DEBOUNCE_MS);
    },
    flush() {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      commit();
    },
  };
}

function localStorageBackend<T>(
  subSlug: string,
  parse: (raw: unknown) => T | null,
): CalcStorage<T> {
  const key = `${KEY_PREFIX}${subSlug}`;
  const d = debounced<T>((data) => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch {
      // quota / private mode
    }
  });
  return {
    async get() {
      if (typeof window === "undefined") return null;
      try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        return parse(JSON.parse(raw));
      } catch {
        return null;
      }
    },
    ...d,
  };
}

function d1Backend<T>(subSlug: string): CalcStorage<T> {
  const backend = new D1UserData<T>(`stock-sim:${subSlug}`);
  const d = debounced<T>((data) => {
    // fire-and-forget — D1UserData가 네트워크 오류를 자체 swallow.
    void backend.save(data);
  });
  return {
    // D1은 현 shape만 보유 (로그인 write 경유) — migrate 안 함.
    async get() {
      return backend.get();
    },
    ...d,
  };
}

export function getCalcStorage<T>(
  subSlug: string,
  isLoggedIn: boolean,
  parse: (raw: unknown) => T | null,
): CalcStorage<T> {
  return isLoggedIn
    ? d1Backend<T>(subSlug)
    : localStorageBackend<T>(subSlug, parse);
}
