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
  stockSim: {
    title: string;
    description: string;
    tabs: { costBasis: string; dividend: string; dcaDown: string };
    costBasis: {
      inputTitle: string;
      priceHeader: string;
      qtyHeader: string;
      pricePlaceholder: string;
      qtyPlaceholder: string;
      deleteRow: string;
      addRow: string;
      currentPriceLabel: string;
      currentPricePlaceholder: string;
      resultTitle: string;
      avgPrice: string;
      totalQty: string;
      totalInvest: string;
      currentValue: string;
      pnl: string;
      emptyHint: string;
    };
    dividend: {
      inputTitle: string;
      addRow: string;
      deleteRow: string;
      tickerHeader: string;
      equityHeader: string;
      currentPriceHeader: string;
      yieldHeader: string;
      frequencyHeader: string;
      tickerPlaceholder: string;
      equityPlaceholder: string;
      currentPricePlaceholder: string;
      yieldPlaceholder: string;
      frequencyOptions: {
        monthly: string;
        quarterly: string;
        semiAnnual: string;
        annual: string;
      };
      resultTitle: string;
      monthlyAverage: string;
      annualTotal: string;
      breakdownTitle: string;
      monthlyShort: string;
      annualShort: string;
      yieldShort: string;
      portfolioYield: string;
      unnamedTicker: string;
      emptyHint: string;
      cashFlowTitle: string;
      monthLabel: string;
      dividendLabel: string;
      cumulativeLabel: string;
      dripLabel: string;
      monthlyDetailToggle: string;
      sharesLabel: string;
      equityLabel: string;
      summaryTitle: string;
      totalDividendLabel: string;
      roiLabel: string;
      finalEquityLabel: string;
      dripTooltip: string;
      monthAxisLabel: string;
      helpTitle: string;
      exDateExplanation: string;
      referenceLinksTitle: string;
      exportCsvLabel: string;
      periodLabel: string;
      yearsUnit: string;
      monthlyYieldLabel: string;
      cumulativeYieldLabel: string;
      resetLabel: string;
      resetConfirm: string;
      perTickerTitle: string;
    };
    dcaDown: {
      title: string;
      description: string;
      inputTitle: string;
      emptyHint: string;
      tickerHeader: string;
      tickerPlaceholder: string;
      budgetHeader: string;
      budgetPlaceholder: string;
      startPriceHeader: string;
      startPricePlaceholder: string;
      nLabel: string;
      nPlaceholder: string;
      dropIntervalLabel: string;
      dropIntervalPlaceholder: string;
      targetReturnLabel: string;
      targetReturnPlaceholder: string;
      weightToggle: string;
      weightTooltip: string;
      firstWeightLabel: string;
      firstWeightPlaceholder: string;
      weightEqualBenchmark: string;
      tableTitle: string;
      colRound: string;
      colPrice: string;
      colDropPct: string;
      colBuyAmount: string;
      colShares: string;
      colCumShares: string;
      colCumCost: string;
      colAvgPrice: string;
      summaryTitle: string;
      totalInvestLabel: string;
      totalSharesLabel: string;
      finalAvgLabel: string;
      targetPriceLabel: string;
      expectedProfitLabel: string;
      colTargetPrice: string;
      nextBuyRoundLabel: string;
      weightHint: string;
    };
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
    stockSim: {
      title: "주식 시뮬레이터",
      description: "투자 결정에 필요한 계산을 한 곳에서",
      tabs: { costBasis: "평단가", dividend: "배당", dcaDown: "분할매수" },
      costBasis: {
        inputTitle: "매수 기록",
        priceHeader: "매수가",
        qtyHeader: "수량",
        pricePlaceholder: "가격",
        qtyPlaceholder: "수량",
        deleteRow: "삭제",
        addRow: "+ 매수 추가",
        currentPriceLabel: "현재가 (선택)",
        currentPricePlaceholder: "현재 시장가",
        resultTitle: "결과",
        avgPrice: "평균 매수가",
        totalQty: "총 보유 수량",
        totalInvest: "총 투자금",
        currentValue: "현재 자산 가치",
        pnl: "평가 손익",
        emptyHint: "매수 기록을 입력하면 결과가 나타납니다.",
      },
      dividend: {
        inputTitle: "보유 종목",
        addRow: "+ 종목 추가",
        deleteRow: "삭제",
        tickerHeader: "종목",
        equityHeader: "투자금",
        currentPriceHeader: "현재가",
        yieldHeader: "배당률 (%)",
        frequencyHeader: "지급 빈도",
        tickerPlaceholder: "AAPL",
        equityPlaceholder: "투자금",
        currentPricePlaceholder: "주가",
        yieldPlaceholder: "yield",
        frequencyOptions: {
          monthly: "매월",
          quarterly: "분기",
          semiAnnual: "반기",
          annual: "연 1회",
        },
        resultTitle: "결과",
        monthlyAverage: "월 평균 배당 수익",
        annualTotal: "연 배당 수익",
        breakdownTitle: "종목별 내역",
        monthlyShort: "월",
        annualShort: "연",
        yieldShort: "yield",
        portfolioYield: "포트폴리오 yield",
        unnamedTicker: "—",
        emptyHint: "종목을 입력하면 결과가 나타납니다.",
        cashFlowTitle: "월별 캐시플로우",
        monthLabel: "월",
        dividendLabel: "월 배당",
        cumulativeLabel: "누적",
        dripLabel: "배당 재투자",
        monthlyDetailToggle: "월별 상세",
        sharesLabel: "보유 주식수",
        equityLabel: "자산 가치",
        summaryTitle: "요약",
        totalDividendLabel: "총 배당 수익",
        roiLabel: "ROI",
        finalEquityLabel: "최종 자산 가치",
        dripTooltip:
          "배당금을 같은 종목에 자동 재투자해서 주식수를 늘리는 전략 (DRIP). 복리 효과로 장기 수익률이 커집니다.",
        monthAxisLabel: "월",
        helpTitle: "도움말",
        exDateExplanation:
          "배당락일 (Ex-Date) — 이 날짜 전 거래일 장 마감까지 주식을 보유해야 다음 배당을 받을 수 있습니다.",
        referenceLinksTitle: "종목별 참고 링크",
        exportCsvLabel: "CSV로 내보내기",
        periodLabel: "기간",
        yearsUnit: "년",
        monthlyYieldLabel: "매월 수익률",
        cumulativeYieldLabel: "누적 수익률",
        resetLabel: "초기화",
        resetConfirm:
          "모든 종목 입력을 지우시겠습니까? 이 작업은 되돌릴 수 없습니다.",
        perTickerTitle: "종목별 상세",
      },
      dcaDown: {
        title: "분할매수 시뮬레이터",
        description:
          "주가 하락 시 분할 매수의 평단가와 수익 시나리오를 시뮬레이션합니다.",
        inputTitle: "매수 계획",
        emptyHint: "Budget, 시작가, 매수 횟수를 입력하면 결과가 나타납니다.",
        tickerHeader: "종목",
        tickerPlaceholder: "AAPL",
        budgetHeader: "Budget",
        budgetPlaceholder: "총 예산",
        startPriceHeader: "시작가",
        startPricePlaceholder: "첫 매수가",
        nLabel: "매수 횟수",
        nPlaceholder: "2-50",
        dropIntervalLabel: "하락 간격 (%)",
        dropIntervalPlaceholder: "5",
        targetReturnLabel: "목표 수익률 (%)",
        targetReturnPlaceholder: "30",
        weightToggle: "가중치 적용",
        weightTooltip:
          "각 회차별 매수 비중을 '첫 매수 비중(%)'로 조절. 값이 작을수록 후반에 많이 매수 (Martingale 방향). 큰 값일수록 균등 가까움.",
        firstWeightLabel: "첫 매수 비중 (%)",
        firstWeightPlaceholder: "10",
        weightEqualBenchmark: "균등",
        tableTitle: "회차별 매수",
        colRound: "회차",
        colPrice: "가격",
        colDropPct: "누적 하락 (%)",
        colBuyAmount: "매수금",
        colShares: "주식 수",
        colCumShares: "누적 주식",
        colCumCost: "누적 비용",
        colAvgPrice: "평단가",
        summaryTitle: "요약",
        totalInvestLabel: "총 투자금",
        totalSharesLabel: "총 보유 주식",
        finalAvgLabel: "최종 평단가",
        targetPriceLabel: "목표 매도가",
        expectedProfitLabel: "예상 수익",
        colTargetPrice: "목표가",
        nextBuyRoundLabel: "다음 매수 회차",
        weightHint:
          "가중치 OFF: Martingale (2배 배수). 가중치 ON: 첫 매수 비중 % 직접 입력",
      },
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
      "stock-sim": {
        name: "주식 시뮬레이터",
        description: "투자 결정에 필요한 계산을 한 곳에서",
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
    stockSim: {
      title: "Stock Simulator",
      description: "Investment math in one place",
      tabs: {
        costBasis: "Cost Basis",
        dividend: "Dividends",
        dcaDown: "Averaging Down",
      },
      costBasis: {
        inputTitle: "Purchases",
        priceHeader: "Price",
        qtyHeader: "Qty",
        pricePlaceholder: "Price",
        qtyPlaceholder: "Qty",
        deleteRow: "Remove",
        addRow: "+ Add purchase",
        currentPriceLabel: "Current price (optional)",
        currentPricePlaceholder: "Market price",
        resultTitle: "Results",
        avgPrice: "Average price",
        totalQty: "Total shares",
        totalInvest: "Total invested",
        currentValue: "Current value",
        pnl: "P&L",
        emptyHint: "Enter a purchase to see results.",
      },
      dividend: {
        inputTitle: "Holdings",
        addRow: "+ Add holding",
        deleteRow: "Remove",
        tickerHeader: "Ticker",
        equityHeader: "Equity",
        currentPriceHeader: "Current Price",
        yieldHeader: "Yield (%)",
        frequencyHeader: "Frequency",
        tickerPlaceholder: "AAPL",
        equityPlaceholder: "Cost",
        currentPricePlaceholder: "Price",
        yieldPlaceholder: "%",
        frequencyOptions: {
          monthly: "Monthly",
          quarterly: "Quarterly",
          semiAnnual: "Semi-annual",
          annual: "Annual",
        },
        resultTitle: "Results",
        monthlyAverage: "Monthly average",
        annualTotal: "Annual total",
        breakdownTitle: "Per holding",
        monthlyShort: "mo.",
        annualShort: "yr.",
        yieldShort: "yield",
        portfolioYield: "Portfolio yield",
        unnamedTicker: "—",
        emptyHint: "Enter a holding to see results.",
        cashFlowTitle: "Monthly Cash Flow",
        monthLabel: "Month",
        dividendLabel: "Dividend",
        cumulativeLabel: "Cumulative",
        dripLabel: "Reinvest Dividends",
        monthlyDetailToggle: "Monthly Detail",
        sharesLabel: "Shares",
        equityLabel: "Equity",
        summaryTitle: "Summary",
        totalDividendLabel: "Total Dividends",
        roiLabel: "ROI",
        finalEquityLabel: "Final Equity",
        dripTooltip:
          "Automatically reinvests dividends to buy more shares (DRIP). Compounds growth over time.",
        monthAxisLabel: "Month",
        helpTitle: "Help",
        exDateExplanation:
          "Ex-Date — You must own the stock by market close the trading day before this date to receive the next dividend.",
        referenceLinksTitle: "Reference Links",
        exportCsvLabel: "Export CSV",
        periodLabel: "Period",
        yearsUnit: "yr",
        monthlyYieldLabel: "Monthly Yield",
        cumulativeYieldLabel: "Cumulative Yield",
        resetLabel: "Reset",
        resetConfirm: "Clear all stock entries? This cannot be undone.",
        perTickerTitle: "Per-Ticker Detail",
      },
      dcaDown: {
        title: "Averaging Down",
        description:
          "Cost basis and profit scenario for split buys on price drops.",
        inputTitle: "Buy Plan",
        emptyHint: "Enter Budget, Start Price, and Rounds to see results.",
        tickerHeader: "Ticker",
        tickerPlaceholder: "AAPL",
        budgetHeader: "Budget",
        budgetPlaceholder: "Total",
        startPriceHeader: "Start Price",
        startPricePlaceholder: "First buy",
        nLabel: "Rounds",
        nPlaceholder: "2-50",
        dropIntervalLabel: "Drop Interval (%)",
        dropIntervalPlaceholder: "5",
        targetReturnLabel: "Target Return (%)",
        targetReturnPlaceholder: "30",
        weightToggle: "Apply Weighting",
        weightTooltip:
          "Control weighting via 'First Buy Share (%)'. Smaller = more back-loaded (Martingale). Larger = closer to equal.",
        firstWeightLabel: "First Buy Share (%)",
        firstWeightPlaceholder: "10",
        weightEqualBenchmark: "Equal",
        tableTitle: "Round-by-Round",
        colRound: "Round",
        colPrice: "Price",
        colDropPct: "Drop %",
        colBuyAmount: "Buy Amount",
        colShares: "Shares",
        colCumShares: "Cum Shares",
        colCumCost: "Cum Cost",
        colAvgPrice: "Avg Price",
        summaryTitle: "Summary",
        totalInvestLabel: "Total Invested",
        totalSharesLabel: "Total Shares",
        finalAvgLabel: "Final Avg Price",
        targetPriceLabel: "Target Sell Price",
        expectedProfitLabel: "Expected Profit",
        colTargetPrice: "Target Price",
        nextBuyRoundLabel: "Next Buy Round",
        weightHint: "OFF: Martingale (2x doubling). ON: Set first-buy %",
      },
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
      "stock-sim": {
        name: "Stock Simulator",
        description: "Investment math in one place",
      },
    },
  },
};
