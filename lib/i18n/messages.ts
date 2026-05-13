import type { Locale } from "./types";

export type Messages = {
  hub: {
    title: string;
    subtitle: string;
    empty: string;
  };
  toolCommon: {
    back: string;
    comingSoon: string;
    live: string;
    soon: string;
  };
  emailDiag: {
    title: string;
    description: string;
    domainLabel: string;
    domainPlaceholder: string;
    submit: string;
    submitting: string;
    invalidDomain: string;
    requestFailed: string;
    networkError: string;
    missingDomain: string;
    invalidJson: string;
    cardSummary: string;
    cardSummaryDesc: string;
    cardMxDesc: string;
    cardSpfDesc: string;
    cardDmarcDesc: string;
    cardPtrDesc: string;
    found: string;
    missing: string;
    error: string;
    noResult: string;
    showRaw: string;
    footer: string;
  };
  tools: Record<string, { name: string; description: string }>;
};

export const messages: Record<Locale, Messages> = {
  ko: {
    hub: {
      title: "brennhub",
      subtitle: "indie tools by brenn — small, sharp, opinionated.",
      empty: "도구 준비 중. 공장이 예열 중입니다.",
    },
    toolCommon: {
      back: "← brennhub",
      comingSoon: "준비 중.",
      live: "사용 가능",
      soon: "준비 중",
    },
    emailDiag: {
      title: "이메일 발송 진단기",
      description: "도메인의 MX / SPF / DMARC / PTR 설정을 빠르게 확인합니다.",
      domainLabel: "도메인",
      domainPlaceholder: "example.com",
      submit: "진단하기",
      submitting: "진단 중...",
      invalidDomain: "유효한 도메인 형식이 아닙니다 (예: example.com).",
      requestFailed: "진단 요청에 실패했습니다.",
      networkError: "네트워크 오류",
      missingDomain: "도메인을 입력해주세요.",
      invalidJson: "요청 본문이 올바른 JSON이 아닙니다.",
      cardSummary: "종합 분석",
      cardSummaryDesc: "MX / SPF / DMARC / PTR 결과를 종합한 해설",
      cardMxDesc: "메일 수신 서버",
      cardSpfDesc: "발송 허용 IP 정책",
      cardDmarcDesc: "인증 실패 처리 정책",
      cardPtrDesc: "MX 호스트 역방향 DNS",
      found: "확인됨",
      missing: "없음",
      error: "오류",
      noResult: "결과 없음",
      showRaw: "원시 응답 보기",
      footer: "DNS 원시 결과와 자연어 요약을 함께 보여줍니다.",
    },
    tools: {
      "email-diag": {
        name: "이메일 발송 진단기",
        description: "도메인의 SPF/DMARC/MX 설정을 진단합니다",
      },
    },
  },
  en: {
    hub: {
      title: "brennhub",
      subtitle: "indie tools by brenn — small, sharp, opinionated.",
      empty: "No tools yet. The factory is warming up.",
    },
    toolCommon: {
      back: "← brennhub",
      comingSoon: "Coming soon.",
      live: "live",
      soon: "soon",
    },
    emailDiag: {
      title: "Email Sender Diagnostics",
      description:
        "Check a domain's MX, SPF, DMARC, and PTR setup at a glance.",
      domainLabel: "Domain",
      domainPlaceholder: "example.com",
      submit: "Run check",
      submitting: "Checking…",
      invalidDomain:
        "That doesn't look like a valid domain (e.g. example.com).",
      requestFailed: "The check failed to run.",
      networkError: "Network error",
      missingDomain: "Please enter a domain.",
      invalidJson: "Request body isn't valid JSON.",
      cardSummary: "Verdict",
      cardSummaryDesc:
        "A plain-language read on MX / SPF / DMARC / PTR results.",
      cardMxDesc: "Mail-receiving servers",
      cardSpfDesc: "Authorized sending IPs",
      cardDmarcDesc: "How failed checks are handled",
      cardPtrDesc: "Reverse DNS for the primary MX",
      found: "Found",
      missing: "Not set",
      error: "Error",
      noResult: "Nothing found",
      showRaw: "Show raw response",
      footer: "Raw DNS records, plus a plain-language summary.",
    },
    tools: {
      "email-diag": {
        name: "Email Sender Diagnostics",
        description: "Inspect a domain's SPF, DMARC, and MX setup",
      },
    },
  },
};
