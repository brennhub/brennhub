/**
 * tag-it 공유 타입.
 * 전 처리 클라이언트 전용 — 서버·D1 타입 없음 (기획서 §2.1).
 */

/** 칩 상태 모델 (기획서 §5.1) */
export type ChipStatus =
  | "candidate" // 후보: 추출됨, 미선택 (희미)
  | "selected" // 채택: 최종 태그로 확정 (강조)
  | "protected" // 보호(핀): 사용자가 고정 — 필터·일괄삭제 면제 (주황)
  | "hidden"; // 숨김: 가려짐 (2차에서 슬라이더로 사용, MVP에선 미노출)

/** 칩 출처 */
export type ChipSource =
  | "extracted" // 추출 엔진 산출
  | "existing" // 업로드 docx의 기존 keywords (보호 프리셋)
  | "manual"; // 사용자 직접 입력

export type Chip = {
  /** 안정적 id (정규화 텍스트 기반) — React key + 중복 판정 */
  id: string;
  /** 화면·다운로드에 쓰이는 표시 텍스트 */
  text: string;
  status: ChipStatus;
  /** 추출 점수 (manual·existing은 0) */
  score: number;
  /** 문서 내 등장 빈도 (manual은 0) */
  freq: number;
  source: ChipSource;
};

/** 읽기 범위 (기획서 §2.4 / B-2). MVP: body 고정 ON, tables 토글. */
export type ReadScope = {
  /** 본문 word/document.xml — MVP 고정 ON, 끌 수 없음 */
  body: boolean;
  /** 표 안 텍스트 */
  tables: boolean;
};

/** 추출 옵션 — 고급 패널에서 조정, localStorage 영속 (기획서 §3.6 / D) */
export type ExtractOptions = {
  /** 조사 제거 */
  removeJosa: boolean;
  /** 명사 위주 (네거티브 필터) */
  nounFocus: boolean;
  scope: ReadScope;
  /** 최소 빈도 컷 (1 = 컷 없음) */
  minFreq: number;
};

export const DEFAULT_EXTRACT_OPTIONS: ExtractOptions = {
  removeJosa: true,
  nounFocus: true,
  scope: { body: true, tables: true },
  minFreq: 1,
};

/** 추출 엔진 산출 후보 1개 */
export type Candidate = {
  text: string;
  score: number;
  freq: number;
};

/** 파일별 처리 상태 배지 (기획서 §6.3) */
export type FileStatus = "pending" | "processing" | "done" | "error";

/** scope별로 분리 캐시한 원문 텍스트 (옵션 변경 시 재unzip 없이 재추출) */
export type ExtractedText = {
  body: string;
  tables: string;
};

/** 업로드된 파일 1개의 메모리 표현 (세션 한정 — 새로고침=초기화) */
export type TagFile = {
  id: string;
  /** 원본 파일명 (다운로드 시 그대로 유지) */
  name: string;
  size: number;
  /** 원본 바이트 — 재포장에 필요. 메모리에만 존재, 서버 전송 0 */
  bytes: Uint8Array;
  status: FileStatus;
  error?: string;
  /** 파싱 후 캐시된 원문 (재추출용) */
  extracted?: ExtractedText;
  /** core.xml에서 읽은 기존 keywords (보호 칩 프리셋용) */
  existingKeywords: string[];
  /** 현재 칩 목록 (후보+채택+보호+수동) */
  chips: Chip[];
};
