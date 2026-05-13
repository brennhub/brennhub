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
  cronTrans: {
    title: string;
    description: string;
    modeCronToNatural: string;
    modeNaturalToCron: string;
    modeToggleHint: string;
    inputLabelCron: string;
    inputLabelNatural: string;
    inputPlaceholderCron: string;
    inputPlaceholderNatural: string;
    submit: string;
    submitting: string;
    resultCronLabel: string;
    resultExplanationLabel: string;
    nextRunsLabel: string;
    invalidCronInput: string;
    aiCouldNotConvert: string;
    networkError: string;
    missingInput: string;
    requestFailed: string;
    invalidJson: string;
    copy: string;
    copied: string;
    timezoneLabel: string;
    timezoneNote: string;
  };
  sslCheck: {
    title: string;
    description: string;
    domainLabel: string;
    domainPlaceholder: string;
    submit: string;
    submitting: string;
    cardSummary: string;
    cardSummaryDesc: string;
    cardCertificate: string;
    cardCertificateDesc: string;
    cardExpiry: string;
    cardExpiryDesc: string;
    cardSans: string;
    cardSansDesc: string;
    commonName: string;
    issuer: string;
    notBefore: string;
    notAfter: string;
    daysRemaining: string;
    daysUnit: string;
    statusHealthy: string;
    statusWarning: string;
    statusCritical: string;
    statusExpired: string;
    invalidDomain: string;
    noCertificate: string;
    fetchFailed: string;
    networkError: string;
    missingDomain: string;
    invalidJson: string;
    requestFailed: string;
    showRaw: string;
  };
  tools: Record<string, { name: string; description: string }>;
};

export const messages: Record<Locale, Messages> = {
  ko: {
    hub: {
      title: "BrennHub",
      subtitle: "indie tools by brenn — small, sharp, opinionated.",
      empty: "도구 준비 중. 공장이 예열 중입니다.",
    },
    toolCommon: {
      back: "← BrennHub",
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
    cronTrans: {
      title: "Cron 변환기",
      description: "cron 식과 자연어를 양방향 변환합니다.",
      modeCronToNatural: "Cron → 자연어",
      modeNaturalToCron: "자연어 → Cron",
      modeToggleHint: "변환 방향",
      inputLabelCron: "Cron 식",
      inputLabelNatural: "자연어 설명",
      inputPlaceholderCron: "0 9 * * 1-5",
      inputPlaceholderNatural: "매일 새벽 3시",
      submit: "변환하기",
      submitting: "변환 중…",
      resultCronLabel: "Cron 식",
      resultExplanationLabel: "설명",
      nextRunsLabel: "다음 실행",
      invalidCronInput: "유효하지 않은 cron 식입니다.",
      aiCouldNotConvert:
        "주어진 설명을 cron으로 변환할 수 없습니다. 더 구체적으로 작성해보세요.",
      networkError: "네트워크 오류",
      missingInput: "입력값을 채워주세요.",
      requestFailed: "변환 요청에 실패했습니다.",
      invalidJson: "요청 본문이 올바른 JSON이 아닙니다.",
      copy: "복사",
      copied: "복사됨",
      timezoneLabel: "시간대",
      timezoneNote:
        "cron 표현식은 시간대가 없습니다. 실제 실행 시각은 스케줄러에 따라 다릅니다 (GitHub Actions / Vercel은 UTC, Linux crontab은 시스템 로컬 시간).",
    },
    sslCheck: {
      title: "SSL 인증서 검사",
      description: "도메인의 SSL 인증서 만료일과 발급 정보를 확인합니다.",
      domainLabel: "도메인",
      domainPlaceholder: "example.com",
      submit: "검사하기",
      submitting: "조회 중…",
      cardSummary: "종합 분석",
      cardSummaryDesc: "인증서 메타데이터를 종합한 해설",
      cardCertificate: "인증서 정보",
      cardCertificateDesc: "Common Name, 발급자, 유효 기간",
      cardExpiry: "만료까지",
      cardExpiryDesc: "남은 일 수",
      cardSans: "SAN 목록",
      cardSansDesc: "이 인증서가 보호하는 도메인",
      commonName: "Common Name",
      issuer: "발급자",
      notBefore: "발급일",
      notAfter: "만료일",
      daysRemaining: "남은 일 수",
      daysUnit: "일",
      statusHealthy: "양호",
      statusWarning: "주의",
      statusCritical: "긴급",
      statusExpired: "만료됨",
      invalidDomain: "유효한 도메인 형식이 아닙니다 (예: example.com).",
      noCertificate: "이 도메인의 SSL 인증서를 찾을 수 없습니다.",
      fetchFailed: "인증서 조회에 실패했습니다 (crt.sh 응답 오류).",
      networkError: "네트워크 오류",
      missingDomain: "도메인을 입력해주세요.",
      invalidJson: "요청 본문이 올바른 JSON이 아닙니다.",
      requestFailed: "검사 요청에 실패했습니다.",
      showRaw: "원시 데이터 보기",
    },
    tools: {
      "email-diag": {
        name: "이메일 발송 진단기",
        description: "도메인의 SPF/DMARC/MX 설정을 진단합니다",
      },
      "cron-trans": {
        name: "Cron 변환기",
        description: "cron 식과 자연어를 양방향 변환합니다",
      },
      "ssl-check": {
        name: "SSL 인증서 검사",
        description: "도메인의 SSL 인증서 만료일과 발급 정보를 확인합니다",
      },
    },
  },
  en: {
    hub: {
      title: "BrennHub",
      subtitle: "indie tools by brenn — small, sharp, opinionated.",
      empty: "No tools yet. The factory is warming up.",
    },
    toolCommon: {
      back: "← BrennHub",
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
    cronTrans: {
      title: "Cron Converter",
      description: "Convert between cron expressions and plain English.",
      modeCronToNatural: "Cron → English",
      modeNaturalToCron: "English → Cron",
      modeToggleHint: "Direction",
      inputLabelCron: "Cron expression",
      inputLabelNatural: "Description",
      inputPlaceholderCron: "0 9 * * 1-5",
      inputPlaceholderNatural: "every weekday at 9am",
      submit: "Convert",
      submitting: "Converting…",
      resultCronLabel: "Cron expression",
      resultExplanationLabel: "Explanation",
      nextRunsLabel: "Next runs",
      invalidCronInput: "Not a valid cron expression.",
      aiCouldNotConvert:
        "Couldn't convert that into cron. Try something more specific.",
      networkError: "Network error",
      missingInput: "Please enter something to convert.",
      requestFailed: "The conversion failed.",
      invalidJson: "Request body isn't valid JSON.",
      copy: "Copy",
      copied: "Copied",
      timezoneLabel: "Timezone",
      timezoneNote:
        "Cron expressions are timezone-agnostic. Actual execution time depends on your scheduler (GitHub Actions / Vercel use UTC, Linux crontab uses system local time).",
    },
    sslCheck: {
      title: "SSL Certificate Check",
      description: "Inspect a domain's SSL certificate expiry and issuer.",
      domainLabel: "Domain",
      domainPlaceholder: "example.com",
      submit: "Check",
      submitting: "Looking up…",
      cardSummary: "Verdict",
      cardSummaryDesc: "A plain-language read on the certificate metadata.",
      cardCertificate: "Certificate",
      cardCertificateDesc: "Common Name, issuer, validity window",
      cardExpiry: "Expiry",
      cardExpiryDesc: "Days remaining",
      cardSans: "SAN list",
      cardSansDesc: "Domains this certificate covers",
      commonName: "Common Name",
      issuer: "Issuer",
      notBefore: "Issued",
      notAfter: "Expires",
      daysRemaining: "Days remaining",
      daysUnit: "days",
      statusHealthy: "Healthy",
      statusWarning: "Watch",
      statusCritical: "Urgent",
      statusExpired: "Expired",
      invalidDomain:
        "That doesn't look like a valid domain (e.g. example.com).",
      noCertificate: "No SSL certificate found for this domain.",
      fetchFailed:
        "Certificate lookup failed (crt.sh returned an unexpected response).",
      networkError: "Network error",
      missingDomain: "Please enter a domain.",
      invalidJson: "Request body isn't valid JSON.",
      requestFailed: "The check failed to run.",
      showRaw: "Show raw data",
    },
    tools: {
      "email-diag": {
        name: "Email Sender Diagnostics",
        description: "Inspect a domain's SPF, DMARC, and MX setup",
      },
      "cron-trans": {
        name: "Cron Converter",
        description: "Convert between cron expressions and plain English",
      },
      "ssl-check": {
        name: "SSL Certificate Check",
        description: "Inspect SSL certificate expiry and issuer info",
      },
    },
  },
};
