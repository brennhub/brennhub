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
    colorSchemeLabel: string;
    colorSchemeKr: string;
    colorSchemeUs: string;
    currencyLabel: string;
    currencyUsd: string;
    currencyKrw: string;
    exchangeRateTooltip: string;
    exchangeRateTooltipManual: string;
    rateLabel: string;
    tabs: {
      costBasis: string;
      dividend: string;
      dcaDown: string;
      splitSell: string;
    };
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
      colCumBuyAmount: string;
      colAvgPrice: string;
      summaryTitle: string;
      totalInvestLabel: string;
      totalSharesLabel: string;
      finalAvgLabel: string;
      targetPriceLabel: string;
      expectedProfitLabel: string;
      colTargetPrice: string;
      weightHint: string;
      targetReturnDisplayLabel: string;
      zeroShareWarningSingle: string;
      zeroShareWarningRange: string;
      colProfit: string;
      legendCompleted: string;
      legendNextBuy: string;
      legendReset: string;
      stepperDropMax: string;
      stepperDropMin: string;
      stepperNMax: string;
      stepperNMin: string;
      stepperGenericMax: string;
      forceFirstShareLabel: string;
      forceFirstShareTooltip: string;
      taxRateLabel: string;
      afterTaxProfitLabel: string;
      exportCsvLabel: string;
      taxTypeShortTerm: string;
      taxTypeLongTerm: string;
      taxTooltipShortTerm: string;
      taxTooltipLongTerm: string;
      taxAmountLabel: string;
      unitN: string;
      stepperTaxMax: string;
      stepperTargetMax: string;
      stepperWeightMax: string;
      invalidInputHint: string;
      tableEmptyHint: string;
    };
    splitSell: {
      inputTitle: string;
      tickerHeader: string;
      tickerPlaceholder: string;
      holdingsHeader: string;
      holdingsPlaceholder: string;
      startPriceHeader: string;
      startPricePlaceholder: string;
      nLabel: string;
      nPlaceholder: string;
      riseIntervalLabel: string;
      riseIntervalPlaceholder: string;
      avgCostLabel: string;
      avgCostPlaceholder: string;
      avgCostHint: string;
      taxRateLabel: string;
      taxTypeShortTerm: string;
      taxTypeLongTerm: string;
      taxTooltipShortTerm: string;
      taxTooltipLongTerm: string;
      weightToggle: string;
      weightTooltip: string;
      weightHint: string;
      firstWeightLabel: string;
      firstWeightPlaceholder: string;
      weightEqualBenchmark: string;
      sellBasisLabel: string;
      sellBasisTooltip: string;
      summaryTitle: string;
      totalInvestLabel: string;
      totalProceedsLabel: string;
      totalSharesLabel: string;
      avgSellPriceLabel: string;
      realizedProfitLabel: string;
      taxAmountLabel: string;
      afterTaxRealizedLabel: string;
      tableTitle: string;
      colRound: string;
      colPrice: string;
      colRisePct: string;
      colShares: string;
      colCumShares: string;
      colSellAmount: string;
      colCumSellAmount: string;
      colRealizedPnl: string;
      colCumRealizedPnl: string;
      legendCompleted: string;
      legendNextSell: string;
      legendReset: string;
      exportCsvLabel: string;
      zeroShareWarningSingle: string;
      zeroShareWarningRange: string;
      invalidInputHint: string;
      tableEmptyHint: string;
      stepperRiseMax: string;
      stepperRiseMin: string;
      stepperNMax: string;
      stepperNMin: string;
      stepperTaxMax: string;
      stepperWeightMax: string;
      unitN: string;
    };
  };
  suppPlan: {
    title: string;
    description: string;
    disclaimer: string;
    library: string;
    mySchedule: string;
    addToSchedule: string;
    custom: string;
    category: string;
    solubility: string;
    state: string;
    metabolism: string;
    excretion: string;
    dailyRecommended: string;
    effects: string;
    notes: string;
    time: string;
    days: string;
    dosage: string;
    capsules: string;
    amount: string;
    save: string;
    cancel: string;
    delete: string;
    edit: string;
    emptySchedule: string;
    emptyLibrary: string;
    compatibilityWarning: string;
    selectSupplement: string;
    customNamePlaceholder: string;
    filterAll: string;
    addEntryTitle: string;
    editEntryTitle: string;
    sol_water: string;
    sol_fat: string;
    "sol_semi-fat": string;
    sol_special: string;
    state_fasting: string;
    "state_after-waking": string;
    "state_with-meal": string;
    "state_before-meal": string;
    state_bedtime: string;
    "state_pre-workout": string;
    "state_post-workout": string;
    meal: string;
    meal_breakfast: string;
    meal_lunch: string;
    meal_dinner: string;
    mealNotSet: string;
    product: string;
    productPrice: string;
    productLink: string;
    pricePlaceholder: string;
    linkPlaceholder: string;
    recommendedAmountHint: string;
    searchPlaceholder: string;
    timeHour: string;
    timeMinute: string;
    timeAM: string;
    timePM: string;
    candidates: string;
    candidatesEmpty: string;
    quickAdd: string;
    confirm: string;
    status: string;
    status_candidate: string;
    status_confirmed: string;
    notSet: string;
    viewByCard: string;
    viewByTable: string;
    productCurrency: string;
    currency_KRW: string;
    currency_USD: string;
    currency_EUR: string;
    currency_JPY: string;
    cat_vitamin: string;
    cat_mineral: string;
    "cat_amino-acid": string;
    cat_antioxidant: string;
    cat_structural: string;
    cat_herbal: string;
    "cat_fatty-acid": string;
    cat_probiotic: string;
    cat_fermented: string;
    cat_other: string;
    day_all: string;
    "day_biweekly-mwf": string;
    "day_biweekly-tts": string;
    day_workout: string;
    day_rest: string;
    day_weekday: string;
    day_weekend: string;
    day_custom: string;
    day_mon: string;
    day_tue: string;
    day_wed: string;
    day_thu: string;
    day_fri: string;
    day_sat: string;
    day_sun: string;
    rule_avoid: string;
    rule_synergy: string;
    "rule_ratio-recommend": string;
    organ_liver: string;
    organ_kidney: string;
    organ_bile: string;
    organ_gut: string;
    "organ_small-intestine": string;
    organ_skin: string;
  };
  sajuNaming: {
    name: string;
    description: string;
  };
  lineupBuilder: {
    title: string;
    description: string;
    formationLabel: string;
    teamNameLabel: string;
    teamNamePlaceholder: string;
    managerLabel: string;
    managerPlaceholder: string;
    downloadButton: string;
    downloadingButton: string;
    resetButton: string;
    teamColorLabel: string;
    editTitle: string;
    editNameLabel: string;
    editNumberLabel: string;
    positionLabel: string;
    captainToggle: string;
    editSave: string;
    editCancel: string;
    formations: {
      "4-4-2": string;
      "4-3-3": string;
      "3-5-2": string;
      "4-2-3-1": string;
      "4-1-4-1": string;
      "3-4-3": string;
      "5-3-2": string;
      "4-3-2-1": string;
    };
  };
  languageMaker: {
    title: string;
    description: string;
    step1: string;
    step2: string;
    gridHeading: string;
    gridIntro: string;
    addCharacter: string;
    characterIndex: string;
    triggerPlaceholder: string;
    duplicateTrigger: string;
    deleteCharacter: string;
    editorTitle: string;
    editorIntro: string;
    clearCharacter: string;
    editorDone: string;
    editorClose: string;
    typewriterHeading: string;
    typewriterIntro: string;
    inputLabel: string;
    inputPlaceholder: string;
    outputLabel: string;
    download: string;
    typewriterNoGlyph: string;
    typewriterEmpty: string;
    unmappedNote: string;
    goToSlots: string;
  };
  shooter: {
    title: string;
    description: string;
    startButton: string;
    scoreLabel: string;
    livesLabel: string;
    highScoreLabel: string;
    newHighScore: string;
    gameOverTitle: string;
    restartButton: string;
    controlsHintDesktop: string;
    controlsHintMobile: string;
    difficultyLabel: string;
    difficultyEasy: string;
    difficultyNormal: string;
    difficultyHard: string;
    soundMute: string;
    soundUnmute: string;
  };
  maze: {
    title: string;
    description: string;
    step1: string;
    step2: string;
    sizeLabel: string;
    widthLabel: string;
    heightLabel: string;
    dimMaxReached: string;
    dimMinReached: string;
    applySize: string;
    presetsLabel: string;
    fogLabel: string;
    fogDescription: string;
    fogRadiusLabel: string;
    fogRadiusMax: string;
    fogRadiusMin: string;
    playViewSpanLabel: string;
    playViewSpanMax: string;
    playViewSpanMin: string;
    timeLimitLabel: string;
    timeLimitDescription: string;
    timeLimitValueLabel: string;
    timeLimitMaxReached: string;
    timeLimitMinReached: string;
    sizeChangeTitle: string;
    sizeChangeMessage: string;
    sizeChangeConfirm: string;
    viewZoomIn: string;
    viewZoomOut: string;
    viewFit: string;
    viewHand: string;
    toolWall: string;
    toolPath: string;
    toolStart: string;
    toolGoal: string;
    commitWallsButton: string;
    commitWallsHint: string;
    resetTitle: string;
    resetMessage: string;
    resetConfirm: string;
    resetCancel: string;
    resetGridTitle: string;
    resetGridMessage: string;
    resetGridConfirm: string;
    editorUndo: string;
    editorRedo: string;
    editorResetGrid: string;
    validationTitlePass: string;
    validationTitleFail: string;
    validationNoStart: string;
    validationMultiStart: string;
    validationNoGoal: string;
    validationUnreachable: string;
    validationExpand: string;
    validationCollapse: string;
    validationRuleEndpoints: string;
    validationRuleReachability: string;
    validationSkipped: string;
    scoreLabel: string;
    scoreStarsAria: string;
    scoreDimDetour: string;
    scoreDimCorridors: string;
    scoreDimTexture: string;
    weakLowDetour: string;
    weakNoCorridors: string;
    weakNoTexture: string;
    playNotReadyHint: string;
    playIntro: string;
    playControlsUp: string;
    playControlsDown: string;
    playControlsLeft: string;
    playControlsRight: string;
    playRestart: string;
    playBackToEdit: string;
    soundMute: string;
    soundUnmute: string;
    winTitle: string;
    winMessage: string;
    shareButton: string;
    shareGenerating: string;
    shareUrlLabel: string;
    shareCopyButton: string;
    shareCopiedToast: string;
    shareErrorGeneric: string;
    shareErrorRateLimit: string;
    shareNotFoundTitle: string;
    shareNotFoundMessage: string;
    sharedBuildOwn: string;
  };
  tagIt: {
    title: string;
    description: string;
    uploadTitle: string;
    uploadHint: string;
    uploadButton: string;
    limitNotOffice: string;
    limitFiles: string;
    limitFileSize: string;
    limitTotalSize: string;
    modeLabel: string;
    modeAuto: string;
    modeManual: string;
    modeAutoHint: string;
    modeManualHint: string;
    workspaceTitle: string;
    workspaceEmpty: string;
    reextracted: string;
    advancedTitle: string;
    strengthLabel: string;
    strengthHint: string;
    strengthNames: readonly [string, string, string, string, string];
    strengthDescs: readonly [string, string, string, string, string];
    scopeLabel: string;
    scopeBody: string;
    scopeTables: string;
    minFreqLabel: string;
    minFreqHint: string;
    commonTrayTitle: string;
    commonTrayHint: string;
    commonTrayPlaceholder: string;
    commonTrayEmpty: string;
    statusPending: string;
    statusProcessing: string;
    statusDone: string;
    statusError: string;
    errorParse: string;
    addPlaceholder: string;
    showMore: string;
    showLess: string;
    expandAll: string;
    download: string;
    downloadAll: string;
    emptyCanvas: string;
    overwriteNote: string;
    chipSelect: string;
    chipDelete: string;
    freqTitle: string;
    probTitle: string;
    sectionSelected: string;
    sectionCandidate: string;
    selectedEmpty: string;
    candidateAllAdded: string;
    searchPlaceholder: string;
    searchEmpty: string;
    counter: string;
    selectAll: string;
    deselectAll: string;
    selectTop: string;
    topNAria: string;
    capWarning: string;
  };
  feedback: {
    button: string;
    dialogTitle: string;
    dialogDescription: string;
    toolLabel: string;
    toolSite: string;
    toolEmailDiag: string;
    toolCronTrans: string;
    toolStockSim: string;
    toolSuppPlan: string;
    toolSajuNaming: string;
    toolLineupBuilder: string;
    toolLanguageMaker: string;
    toolMaze: string;
    toolShooter: string;
    toolTagIt: string;
    categoryLabel: string;
    categoryFeature: string;
    categoryImprovement: string;
    categoryComplaint: string;
    categoryOther: string;
    messageLabel: string;
    messagePlaceholder: string;
    emailLabel: string;
    emailPlaceholder: string;
    submit: string;
    submitting: string;
    success: string;
    cancel: string;
    errorGeneric: string;
    errorTooShort: string;
    errorTooLong: string;
    errorRateLimit: string;
    cardIconTooltip: string;
  };
  auth: {
    signIn: string;
    signOut: string;
    adminPanel: string;
    errors: {
      stateMismatch: string;
      stateInvalid: string;
      stateExpired: string;
      tokenExchangeFailed: string;
      idTokenInvalid: string;
      idTokenUnverifiedEmail: string;
      dbError: string;
      internal: string;
      notAdmin: string;
    };
  };
  privacy: {
    title: string;
    lastUpdated: string;
    intro: string;
    collection: {
      heading: string;
      description: string;
      columns: {
        item: string;
        source: string;
        purpose: string;
        retention: string;
      };
      rows: Array<{
        item: string;
        source: string;
        purpose: string;
        retention: string;
      }>;
    };
    purpose: { heading: string; body: string };
    retention: { heading: string; body: string };
    thirdParty: { heading: string; body: string };
    rights: { heading: string; body: string };
    contact: { heading: string; body: string; email: string };
  };
  footer: {
    privacy: string;
  };
  profile: {
    title: string;
    accountInfo: string;
    email: string;
    displayName: string;
    displayNamePlaceholder: string;
    displayNameHint: string;
    save: string;
    saving: string;
    saved: string;
    saveError: string;
    dangerZone: string;
    deleteAccount: string;
    deleteWarning: string;
    deleteConfirm: string;
    deleting: string;
    deleteError: string;
    cancel: string;
    loginRequired: string;
    loginCta: string;
  };
  admin: {
    title: string;
    dashboardTitle: string;
    dashboardIntro: string;
    menu: {
      dashboard: string;
      feedback: string;
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
      colorSchemeLabel: "수익/손실 색상",
      colorSchemeKr: "한국식",
      colorSchemeUs: "미국식",
      currencyLabel: "통화",
      currencyUsd: "USD ($)",
      currencyKrw: "KRW (₩)",
      exchangeRateTooltip: "1 USD = {rate} KRW ({date} 갱신)",
      exchangeRateTooltipManual: "1 USD = {rate} KRW (수동 설정)",
      rateLabel: "1 USD =",
      tabs: {
        costBasis: "평단가",
        dividend: "배당",
        dcaDown: "분할매수",
        splitSell: "분할매도",
      },
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
        inputTitle: "분할 매수 계획",
        emptyHint: "Budget, 시작가, 매수 횟수를 입력하면 결과가 나타납니다.",
        tickerHeader: "종목",
        tickerPlaceholder: "AAPL",
        budgetHeader: "총 예산",
        budgetPlaceholder: "총 예산",
        startPriceHeader: "현재가",
        startPricePlaceholder: "첫 매수가",
        nLabel: "매수 횟수",
        nPlaceholder: "2-50",
        dropIntervalLabel: "하락률 (%)",
        dropIntervalPlaceholder: "5",
        targetReturnLabel: "목표 수익률 (%)",
        targetReturnPlaceholder: "30",
        weightToggle: "가중치 적용",
        weightTooltip:
          "각 회차별 매수 비중을 '첫 매수 비중(%)'로 조절. 값이 작을수록 후반에 많이 매수 (Martingale 방향). 큰 값일수록 균등 가까움.",
        firstWeightLabel: "분배 균형 (0-100)",
        firstWeightPlaceholder: "50",
        weightEqualBenchmark: "(50 = 균등값)",
        tableTitle: "회차별 매수",
        colRound: "매수 회차",
        colPrice: "가격",
        colDropPct: "하락률 (%)",
        colBuyAmount: "매수금",
        colShares: "주식수",
        colCumShares: "누적 주식수",
        colCumBuyAmount: "누적 매수금",
        colAvgPrice: "평단가",
        summaryTitle: "최종 결과 요약",
        totalInvestLabel: "총 투자금",
        totalSharesLabel: "총 보유 주식수",
        finalAvgLabel: "최종 평단가",
        targetPriceLabel: "최종 목표 매도가",
        expectedProfitLabel: "최종 예상 수익",
        colTargetPrice: "목표가",
        weightHint:
          "가중치 OFF: Martingale (2배 배수). 가중치 ON: 첫 매수 비중 % 직접 입력",
        targetReturnDisplayLabel: "목표 수익률",
        zeroShareWarningSingle:
          "회차 {n}은 매수금이 1주 가격보다 작아 0주 매수입니다. 매수 횟수를 줄이거나 Budget을 늘리세요.",
        zeroShareWarningRange:
          "회차 {start}~{end}는 매수금이 1주 가격보다 작아 0주 매수입니다. 매수 횟수를 줄이거나 Budget을 늘리세요.",
        colProfit: "수익",
        legendCompleted: "매수 완료",
        legendNextBuy: "다음 매수",
        legendReset: "리셋",
        stepperDropMax: "하락률은 최대 50% 입니다",
        stepperDropMin: "하락률은 최소 0.1% 입니다",
        stepperNMax: "매수 횟수는 최대 {max}회입니다 (현재 하락률 기준)",
        stepperNMin: "최소 2회 매수 필요",
        stepperGenericMax: "최대값 도달",
        forceFirstShareLabel: "시작가 매수 보장",
        forceFirstShareTooltip:
          "1회차부터 1주 이상 매수 강제. Budget 안전 가드 유지.",
        taxRateLabel: "세율 (%)",
        afterTaxProfitLabel: "세후 최종 예상 수익",
        exportCsvLabel: "CSV로 내보내기",
        taxTypeShortTerm: "단기",
        taxTypeLongTerm: "장기",
        taxTooltipShortTerm:
          "1년 미만 보유. 일반 소득세 24% 적용 (단일 신고 $103k~$197k 소득 기준, 2025)",
        taxTooltipLongTerm:
          "1년 이상 보유. 장기 자본이득세 15% 적용 (단일 신고 $48k~$533k 소득 기준, 2025)",
        taxAmountLabel: "예상 세금",
        unitN: "회",
        stepperTaxMax: "세율은 최대 50%입니다",
        stepperTargetMax: "목표 수익률은 최대 500%입니다",
        stepperWeightMax: "분배 균형은 최대 100입니다",
        invalidInputHint:
          "분할매수 시뮬레이션을 위해 모든 입력값(총 예산, 현재가, 매수 횟수, 하락률)이 0보다 큰 값이어야 합니다.",
        tableEmptyHint: "결과 없음",
      },
      splitSell: {
        inputTitle: "분할 매도 계획",
        tickerHeader: "종목",
        tickerPlaceholder: "AAPL",
        holdingsHeader: "보유 주식수",
        holdingsPlaceholder: "총 보유 수량",
        startPriceHeader: "현재가",
        startPricePlaceholder: "첫 매도가",
        nLabel: "매도 횟수",
        nPlaceholder: "2-50",
        riseIntervalLabel: "상승률 (%)",
        riseIntervalPlaceholder: "5",
        avgCostLabel: "평단가",
        avgCostPlaceholder: "산 가격",
        avgCostHint: "실현손익 계산에 사용됩니다",
        taxRateLabel: "세율 (%)",
        taxTypeShortTerm: "단기",
        taxTypeLongTerm: "장기",
        taxTooltipShortTerm:
          "1년 미만 보유. 일반 소득세 24% 적용 (단일 신고 $103k~$197k 소득 기준, 2025)",
        taxTooltipLongTerm:
          "1년 이상 보유. 장기 자본이득세 15% 적용 (단일 신고 $48k~$533k 소득 기준, 2025)",
        weightToggle: "가중치 적용",
        weightTooltip:
          "각 회차별 매도 비중을 '분배 균형(0-100)'으로 조절. 값이 작을수록 후반(고가)에 많이 매도 (Martingale 방향). 큰 값일수록 균등 가까움.",
        weightHint:
          "가중치 OFF: Martingale (2배 배수, 고가일수록 더 매도). 가중치 ON: 분배 균형 직접 입력",
        firstWeightLabel: "분배 균형 (0-100)",
        firstWeightPlaceholder: "50",
        weightEqualBenchmark: "(50 = 균등값)",
        sellBasisLabel: "매도가 기준",
        sellBasisTooltip:
          "매도가 사다리의 시작 기준. 평단가 기준: 평단가에서 회차별 상승. 현재가 기준: 현재가에서 회차별 상승. 1회차부터 상승률이 적용됩니다.",
        summaryTitle: "최종 결과 요약",
        totalInvestLabel: "총 투자금",
        totalProceedsLabel: "총 매도금",
        totalSharesLabel: "총 매도 주식수",
        avgSellPriceLabel: "평균 매도가",
        realizedProfitLabel: "실현 손익",
        taxAmountLabel: "예상 세금",
        afterTaxRealizedLabel: "세후 실현 손익",
        tableTitle: "회차별 매도",
        colRound: "매도 회차",
        colPrice: "매도가",
        colRisePct: "상승률 (%)",
        colShares: "매도 주식수",
        colCumShares: "누적 매도",
        colSellAmount: "매도금",
        colCumSellAmount: "누적 매도금",
        colRealizedPnl: "실현 손익",
        colCumRealizedPnl: "누적 손익",
        legendCompleted: "매도 완료",
        legendNextSell: "다음 매도",
        legendReset: "리셋",
        exportCsvLabel: "CSV로 내보내기",
        zeroShareWarningSingle:
          "회차 {n}은 배분 주식수가 0주입니다. 매도 횟수를 줄이거나 보유 수량을 늘리세요.",
        zeroShareWarningRange:
          "회차 {start}~{end}는 배분 주식수가 0주입니다. 매도 횟수를 줄이거나 보유 수량을 늘리세요.",
        invalidInputHint:
          "분할매도 시뮬레이션을 위해 보유 주식수 · 평단가 · 매도 횟수 · 상승률, 그리고 매도가 기준으로 선택한 가격이 모두 0보다 커야 합니다.",
        tableEmptyHint: "결과 없음",
        stepperRiseMax: "상승률은 최대 100%입니다",
        stepperRiseMin: "상승률은 0% 이상이어야 합니다",
        stepperNMax: "매도 횟수는 최대 50회입니다",
        stepperNMin: "최소 2회 매도 필요",
        stepperTaxMax: "세율은 최대 50%입니다",
        stepperWeightMax: "분배 균형은 최대 100입니다",
        unitN: "회",
      },
    },
    suppPlan: {
      title: "영양제 플래너",
      description: "약동학 기반 개인 영양제 스케줄링",
      disclaimer:
        "의학적 조언 아님. 자가 책임으로 사용하세요. 영양제 복용 전 의료진 상담을 권장합니다.",
      library: "영양제 라이브러리",
      mySchedule: "내 스케줄",
      addToSchedule: "내 스케줄에 추가",
      custom: "커스텀 입력",
      category: "카테고리",
      solubility: "용해성",
      state: "상태",
      metabolism: "대사",
      excretion: "배설",
      dailyRecommended: "1일 권장량",
      effects: "효과",
      notes: "참고",
      time: "시간",
      days: "요일",
      dosage: "용량",
      capsules: "캡슐",
      amount: "함량",
      save: "저장",
      cancel: "취소",
      delete: "삭제",
      edit: "편집",
      emptySchedule:
        "아직 스케줄이 없습니다. 라이브러리에서 영양제를 추가하세요.",
      emptyLibrary: "라이브러리가 비어있습니다.",
      compatibilityWarning: "복용 충돌 주의",
      selectSupplement: "영양제 선택",
      customNamePlaceholder: "영양제 이름",
      filterAll: "전체",
      addEntryTitle: "스케줄 추가",
      editEntryTitle: "스케줄 편집",
      sol_water: "수용성",
      sol_fat: "지용성",
      "sol_semi-fat": "반지용성",
      sol_special: "예외",
      state_fasting: "공복",
      "state_after-waking": "기상 후",
      "state_with-meal": "식후",
      "state_before-meal": "식전",
      state_bedtime: "취침 전",
      "state_pre-workout": "운동 전",
      "state_post-workout": "운동 후",
      meal: "식사",
      meal_breakfast: "아침",
      meal_lunch: "점심",
      meal_dinner: "저녁",
      mealNotSet: "식사 시점 미설정",
      product: "제품 정보 (선택)",
      productPrice: "가격",
      productLink: "링크",
      pricePlaceholder: "예: ₩25,000 또는 $24.99",
      linkPlaceholder: "https://...",
      recommendedAmountHint: "1일 권장량",
      searchPlaceholder: "검색…",
      timeHour: "시",
      timeMinute: "분",
      timeAM: "오전",
      timePM: "오후",
      candidates: "영양제 후보",
      candidatesEmpty: "후보 없음",
      quickAdd: "후보로",
      confirm: "확정",
      status: "상태",
      status_candidate: "후보",
      status_confirmed: "확정",
      notSet: "미설정",
      viewByCard: "카드",
      viewByTable: "표",
      productCurrency: "통화",
      currency_KRW: "원 (KRW)",
      currency_USD: "달러 (USD)",
      currency_EUR: "유로 (EUR)",
      currency_JPY: "엔 (JPY)",
      cat_vitamin: "비타민",
      cat_mineral: "미네랄",
      "cat_amino-acid": "아미노산",
      cat_antioxidant: "항산화",
      cat_structural: "결합조직",
      cat_herbal: "허브",
      "cat_fatty-acid": "지방산",
      cat_probiotic: "프로바이오틱",
      cat_fermented: "발효",
      cat_other: "기타",
      day_all: "매일",
      "day_biweekly-mwf": "격일 (월수금)",
      "day_biweekly-tts": "격일 (화목토)",
      day_workout: "운동일",
      day_rest: "휴식일",
      day_weekday: "주중",
      day_weekend: "주말",
      day_custom: "맞춤",
      day_mon: "월",
      day_tue: "화",
      day_wed: "수",
      day_thu: "목",
      day_fri: "금",
      day_sat: "토",
      day_sun: "일",
      rule_avoid: "중복 복용 금지",
      rule_synergy: "함께 복용 시너지",
      "rule_ratio-recommend": "비율 권장",
      organ_liver: "간",
      organ_kidney: "신장",
      organ_bile: "담즙",
      organ_gut: "장",
      "organ_small-intestine": "소장",
      organ_skin: "피부",
    },
    sajuNaming: {
      name: "사주 작명",
      description: "사주팔자 + 성명학 기반 작명",
    },
    lineupBuilder: {
      title: "축구 베스트 일레븐 만들기",
      description:
        "축구 베스트 일레븐을 시각적으로 구성하고 이미지로 저장하세요.",
      formationLabel: "포메이션",
      teamNameLabel: "팀 이름",
      teamNamePlaceholder: "팀 이름을 입력하세요",
      managerLabel: "감독",
      managerPlaceholder: "감독 이름",
      downloadButton: "이미지 저장",
      downloadingButton: "저장 중…",
      resetButton: "초기화",
      teamColorLabel: "팀 색상",
      editTitle: "선수 편집",
      editNameLabel: "이름",
      editNumberLabel: "등번호",
      positionLabel: "포지션",
      captainToggle: "주장 지정",
      editSave: "저장",
      editCancel: "취소",
      formations: {
        "4-4-2": "4-4-2 박스형",
        "4-3-3": "4-3-3 윙어",
        "3-5-2": "3-5-2 윙백",
        "4-2-3-1": "4-2-3-1",
        "4-1-4-1": "4-1-4-1 싱글 피벗",
        "3-4-3": "3-4-3 윙백",
        "5-3-2": "5-3-2 백5",
        "4-3-2-1": "4-3-2-1 크리스마스 트리",
      },
    },
    languageMaker: {
      title: "언어 창조기",
      description:
        "픽셀로 나만의 문자를 그리고 입력값에 매핑해 실시간으로 변환하세요.",
      step1: "문자 만들기",
      step2: "타이핑",
      gridHeading: "문자 만들기",
      gridIntro:
        "카드를 눌러 문자를 그리고 입력값을 매핑하세요. 끌어서 순서를 바꿀 수 있습니다.",
      addCharacter: "문자 추가",
      characterIndex: "문자 {n}",
      triggerPlaceholder: "매핑할 글자 또는 단어",
      duplicateTrigger: "이미 사용 중인 입력값입니다",
      deleteCharacter: "삭제",
      editorTitle: "문자 그리기",
      editorIntro: "16×16 격자를 클릭하거나 드래그해 그리세요.",
      clearCharacter: "지우기",
      editorDone: "완료",
      editorClose: "닫기",
      typewriterHeading: "바벨 타자기",
      typewriterIntro: "입력하면 매핑된 문자로 실시간 변환됩니다.",
      inputLabel: "입력",
      inputPlaceholder: "변환할 텍스트를 입력하세요",
      outputLabel: "변환 결과",
      download: "이미지 저장",
      typewriterNoGlyph: "먼저 문자에 입력값을 매핑하세요.",
      typewriterEmpty:
        "위에 텍스트를 입력하면 변환 결과가 여기에 표시됩니다.",
      unmappedNote: "매핑되지 않은 글자는 회색 원문으로 표시됩니다.",
      goToSlots: "문자 만들기로",
    },
    maze: {
      title: "픽셀 미로 만들기",
      description: "픽셀 격자로 나만의 미로를 설계하고 링크로 공유하세요.",
      step1: "만들기",
      step2: "플레이",
      sizeLabel: "맵 크기",
      widthLabel: "가로",
      heightLabel: "세로",
      dimMaxReached: "최대 128칸입니다",
      dimMinReached: "최소 3칸입니다",
      applySize: "적용",
      presetsLabel: "프리셋",
      fogLabel: "시야 제한",
      fogDescription:
        "플레이할 때 시작점 주변만 보이도록 시야를 제한합니다.",
      fogRadiusLabel: "시야 반경 (칸)",
      fogRadiusMax: "최대 시야 반경입니다",
      fogRadiusMin: "최소 시야 반경입니다",
      playViewSpanLabel: "플레이 시야 거리 (칸)",
      playViewSpanMax: "최대 시야 거리입니다 (전체 보임)",
      playViewSpanMin: "최소 시야 거리입니다 (가장 가까이)",
      timeLimitLabel: "시간 제한",
      timeLimitDescription:
        "플레이 시 제한 시간이 흐르고, 시간 초과 시 게임 오버.",
      timeLimitValueLabel: "시간 (초)",
      timeLimitMaxReached: "최대 900초입니다",
      timeLimitMinReached: "최소 10초입니다",
      sizeChangeTitle: "사이즈 변경",
      sizeChangeMessage:
        "사이즈를 바꾸면 그리드의 모든 셀이 새 크기로 다시 생성됩니다. 지금까지 그린 내용은 사라집니다.",
      sizeChangeConfirm: "변경",
      viewZoomIn: "확대",
      viewZoomOut: "축소",
      viewFit: "맞춤",
      viewHand: "손도구 (스페이스 + 드래그)",
      toolWall: "벽",
      toolPath: "길",
      toolStart: "시작점",
      toolGoal: "도착점",
      commitWallsButton: "벽 생성",
      commitWallsHint:
        "그린 길을 제외한 칸이 모두 벽이 됩니다. 시작점·도착점은 유지.",
      resetTitle: "맵 초기화",
      resetMessage:
        "설정으로 돌아가면 지금까지 그린 맵이 모두 초기화됩니다. 계속할까요?",
      resetConfirm: "초기화하고 돌아가기",
      resetCancel: "취소",
      resetGridTitle: "그리드 초기화",
      resetGridMessage:
        "그리드의 모든 셀이 빈 칸으로 초기화됩니다. 사이즈와 시야 설정은 유지됩니다. 실행취소(Undo) 가능합니다.",
      resetGridConfirm: "초기화",
      editorUndo: "실행취소",
      editorRedo: "다시실행",
      editorResetGrid: "초기화",
      validationTitlePass: "플레이 가능",
      validationTitleFail: "검증 실패",
      validationNoStart: "시작점이 없습니다",
      validationMultiStart: "시작점이 여러 개입니다",
      validationNoGoal: "도착점이 없습니다",
      validationUnreachable: "도착점에 도달할 수 없습니다",
      validationExpand: "상세 보기",
      validationCollapse: "닫기",
      validationRuleEndpoints: "시작점·도착점",
      validationRuleReachability: "도달 가능성",
      validationSkipped: "검증 보류",
      scoreLabel: "미로 점수",
      scoreStarsAria: "별 5개 중 {n}개",
      scoreDimDetour: "경로 우회도",
      scoreDimCorridors: "복도성",
      scoreDimTexture: "갈림길·막다른 길",
      weakLowDetour:
        "우회도가 낮습니다 — 벽을 더 채워 길을 꼬아보세요.",
      weakNoCorridors:
        "벽이 거의 없습니다 — 길을 좁혀 미로를 만들어보세요.",
      weakNoTexture:
        "갈림길도 막다른 길도 없습니다 — 단조로워요.",
      playNotReadyHint:
        "플레이를 시작하려면 그리기 단계의 검증을 먼저 통과해야 합니다.",
      playIntro: "방향키 또는 WASD, 아래 D-pad로 이동하세요.",
      playControlsUp: "위로 이동",
      playControlsDown: "아래로 이동",
      playControlsLeft: "왼쪽으로 이동",
      playControlsRight: "오른쪽으로 이동",
      playRestart: "다시 플레이",
      playBackToEdit: "편집으로 돌아가기",
      soundMute: "소리 끄기",
      soundUnmute: "소리 켜기",
      shareButton: "공유 링크 만들기",
      shareGenerating: "생성 중...",
      shareUrlLabel: "공유 링크",
      shareCopyButton: "복사",
      shareCopiedToast: "복사됨",
      shareErrorGeneric: "공유 링크 생성에 실패했습니다.",
      shareErrorRateLimit: "잠시 후 다시 시도해주세요.",
      shareNotFoundTitle: "미로를 찾을 수 없습니다",
      shareNotFoundMessage:
        "공유 링크가 잘못되었거나 삭제된 미로입니다.",
      sharedBuildOwn: "내 미로 만들기",
      winTitle: "탈출 성공!",
      winMessage: "도착점에 도달했습니다.",
    },
    shooter: {
      title: "아케이드 슈터",
      description: "우주 함대를 격추하는 세로 스크롤 슈팅 게임",
      startButton: "시작",
      scoreLabel: "점수",
      livesLabel: "생명",
      highScoreLabel: "최고점",
      newHighScore: "신기록",
      gameOverTitle: "게임 오버",
      restartButton: "다시 시작",
      controlsHintDesktop: "방향키·WASD로 4방향 이동 / 스페이스 발사",
      controlsHintMobile: "화면 좌우를 눌러 이동 (자동 발사)",
      difficultyLabel: "난이도",
      difficultyEasy: "쉬움",
      difficultyNormal: "보통",
      difficultyHard: "어려움",
      soundMute: "소리 끄기",
      soundUnmute: "소리 켜기",
    },
    tagIt: {
      title: "태그잇",
      description:
        "오피스 문서(Word·Excel·PowerPoint)를 올리면 본문에서 핵심 키워드를 칩으로 뽑아 줍니다. 고르고 다듬은 태그를 문서 속성에 기록해 다시 내려받으세요. 파일은 브라우저 밖으로 나가지 않습니다.",
      uploadTitle: "여기에 오피스 문서를 끌어다 놓으세요",
      uploadHint: "한 번에 최대 5개 · 개당 8MB · 총 15MB · .docx / .xlsx / .pptx",
      uploadButton: "파일 선택",
      limitNotOffice: "{name}: .docx / .xlsx / .pptx 만 지원합니다",
      limitFiles: "최대 {max}개 파일까지만 올릴 수 있습니다",
      limitFileSize: "{name}: 개당 {max}를 초과했습니다",
      limitTotalSize: "총 용량 {max}를 초과했습니다",
      modeLabel: "추출 모드",
      modeAuto: "자동",
      modeManual: "수동",
      modeAutoHint: "본문을 읽어 키워드 칩을 자동으로 뽑아냅니다.",
      modeManualHint: "빈 캔버스에서 직접 태그를 입력합니다.",
      workspaceTitle: "추출 결과",
      workspaceEmpty: "위에서 오피스 문서를 올리면 여기에 키워드 칩이 나타납니다.",
      reextracted: "갱신됨",
      advancedTitle: "고급 옵션",
      strengthLabel: "필터 강도",
      strengthHint: "왼쪽=관대(다 보여줌) · 오른쪽=엄격(확실한 명사만)",
      strengthNames: ["관대", "약하게", "균형", "강하게", "엄격"],
      strengthDescs: [
        "기호 섞인 토큰만 거릅니다.",
        "+ 숫자·영문 섞인 단편(5px, F1)도 거릅니다.",
        "+ 조사·활용형·세는단위까지 거릅니다 (기본).",
        "+ 약어 감점 강화 + 드물게 나온 단어를 거릅니다.",
        "+ 약어도 제외하고 확실한 명사만 남깁니다.",
      ],
      scopeLabel: "읽기 범위",
      scopeBody: "본문 (항상)",
      scopeTables: "표 안 텍스트",
      minFreqLabel: "최소 등장 횟수",
      minFreqHint: "이 횟수보다 적게 나온 단어는 제외합니다.",
      commonTrayTitle: "공통 태그",
      commonTrayHint: "여기 입력한 태그는 올린 모든 파일에 함께 적용됩니다.",
      commonTrayPlaceholder: "모든 파일에 넣을 태그 입력 후 Enter",
      commonTrayEmpty: "아직 공통 태그가 없습니다.",
      statusPending: "대기 중",
      statusProcessing: "읽는 중…",
      statusDone: "완료",
      statusError: "실패",
      errorParse:
        "파일을 읽지 못했습니다. 올바른 .docx / .xlsx / .pptx인지 확인해 주세요.",
      addPlaceholder: "태그 직접 입력 후 Enter",
      showMore: "+{n}개 더보기",
      showLess: "접기",
      expandAll: "전체 펼치기 ({n})",
      download: "다운로드",
      downloadAll: "전체 다운로드 (.zip)",
      emptyCanvas: "추출된 칩이 여기에 표시됩니다. 직접 입력해도 됩니다.",
      overwriteNote:
        "다운로드 파일은 원본과 같은 이름입니다. 덮어쓰지 않도록 주의하세요.",
      chipSelect: "태그 채택/해제",
      chipDelete: "삭제",
      freqTitle: "{n}회 등장",
      probTitle: "명사 신뢰도 {p}%",
      sectionSelected: "선택한 태그",
      sectionCandidate: "후보",
      selectedEmpty: "아래 후보에서 태그를 골라 담으세요.",
      candidateAllAdded: "모든 후보를 담았어요.",
      searchPlaceholder: "후보 칩 검색…",
      searchEmpty: "검색과 일치하는 후보가 없어요.",
      counter: "선택 {sel}/{max} · 후보 {cand}",
      selectAll: "전체 선택",
      deselectAll: "전체 해제",
      selectTop: "상위 {n} 담기",
      topNAria: "상위 몇 개를 담을지",
      capWarning: "파일당 태그는 최대 {max}개입니다. 상위 {max}개만 담았어요.",
    },
    feedback: {
      button: "피드백",
      dialogTitle: "피드백 보내기",
      dialogDescription: "사이트 개선에 도움이 됩니다",
      toolLabel: "어떤 기능에 대한 피드백인가요?",
      toolSite: "사이트 전체",
      toolEmailDiag: "이메일 발송 진단기",
      toolCronTrans: "Cron 변환기",
      toolStockSim: "주식 시뮬레이터",
      toolSuppPlan: "영양제 플래너",
      toolSajuNaming: "사주 작명",
      toolLineupBuilder: "축구 베스트 일레븐 만들기",
      toolLanguageMaker: "언어 창조기",
      toolMaze: "픽셀 미로 만들기",
      toolShooter: "아케이드 슈터",
      toolTagIt: "태그잇",
      categoryLabel: "종류",
      categoryFeature: "기능 추가",
      categoryImprovement: "기능 개선",
      categoryComplaint: "불만 사항",
      categoryOther: "그 외",
      messageLabel: "내용",
      messagePlaceholder:
        "어떤 점이 좋았나요? 어떤 점을 개선했으면 하나요?",
      emailLabel: "이메일 (선택)",
      emailPlaceholder: "답변 받고 싶다면 입력하세요",
      submit: "제출",
      submitting: "보내는 중...",
      success: "감사합니다! 피드백이 전달되었습니다.",
      cancel: "취소",
      errorGeneric: "오류가 발생했습니다. 다시 시도해주세요.",
      errorTooShort: "메시지가 너무 짧습니다 (최소 5자)",
      errorTooLong: "메시지가 너무 깁니다 (최대 2000자)",
      errorRateLimit: "잠시 후 다시 시도해주세요",
      cardIconTooltip: "이 도구 피드백",
    },
    auth: {
      signIn: "로그인",
      signOut: "로그아웃",
      adminPanel: "관리자",
      errors: {
        stateMismatch: "로그인 세션이 일치하지 않습니다. 다시 시도해주세요.",
        stateInvalid: "로그인 검증에 실패했습니다. 다시 시도해주세요.",
        stateExpired: "로그인 시도가 만료됐어요. 다시 시도해주세요.",
        tokenExchangeFailed: "Google 인증 통신에 실패했습니다. 잠시 후 다시 시도해주세요.",
        idTokenInvalid: "Google 토큰 검증에 실패했습니다. 다시 시도해주세요.",
        idTokenUnverifiedEmail: "이메일 미인증 계정입니다. Google 계정에서 이메일 인증 후 다시 시도해주세요.",
        dbError: "서버 저장에 실패했습니다. 잠시 후 다시 시도해주세요.",
        internal: "서버 설정 오류입니다. 관리자에게 문의해주세요.",
        notAdmin: "관리자 권한이 필요합니다.",
      },
    },
    privacy: {
      title: "개인정보 처리방침",
      lastUpdated: "최종 수정: 2026-05-12",
      intro:
        "BrennHub은 로그인 기능 제공에 필요한 최소한의 정보만 수집합니다. 이 페이지는 어떤 정보를 받아 어디에 쓰는지, 얼마나 보관하는지를 코드 수준에서 명확히 밝힙니다.",
      collection: {
        heading: "1. 수집 항목",
        description:
          "Google 로그인을 통해 받는 정보와, 로그인 과정에서 서버가 생성하는 데이터입니다.",
        columns: {
          item: "항목",
          source: "출처",
          purpose: "이용 목적",
          retention: "보유 기간",
        },
        rows: [
          {
            item: "이메일",
            source: "Google id_token (email)",
            purpose: "로그인 식별, UI 표시",
            retention: "계정 유지 동안",
          },
          {
            item: "이름",
            source: "Google id_token (name)",
            purpose: "UI 표시",
            retention: "계정 유지 동안",
          },
          {
            item: "Google 계정 ID (sub)",
            source: "Google id_token (sub)",
            purpose: "사용자 매핑 영구 키",
            retention: "계정 유지 동안",
          },
          {
            item: "프로필 사진 URL",
            source: "Google id_token (picture)",
            purpose: "DB에 저장하지만 현재 UI에서 사용하지 않음",
            retention: "계정 유지 동안",
          },
          {
            item: "brennhub_session 쿠키",
            source: "서버 생성 (32-byte 난수)",
            purpose: "로그인 세션 유지",
            retention: "30일",
          },
          {
            item: "auth_state 쿠키",
            source: "서버 생성 (HMAC 토큰)",
            purpose: "로그인 과정 CSRF 방어",
            retention: "10분",
          },
          {
            item: "브라우저 정보 (User-Agent)",
            source: "요청 헤더 (로그인 시점)",
            purpose: "비정상 접근 감지 / 감사",
            retention: "세션과 동일 (30일)",
          },
        ],
      },
      purpose: {
        heading: "2. 이용 목적",
        body: "수집한 정보는 로그인 식별과 세션 유지를 위해서만 사용합니다. 도구별 개인 데이터 저장 기능은 향후 단계에서 별도 안내합니다. 광고, 분석, 외부 트래커 용도로는 사용하지 않습니다.",
      },
      retention: {
        heading: "3. 보유 기간",
        body: "계정이 유지되는 동안 사용자 정보를 보관합니다. 로그인 세션은 30일 후 만료되며, 로그아웃 시 즉시 삭제됩니다. 로그인 과정의 임시 토큰(auth_state)은 10분 후 만료됩니다.",
      },
      thirdParty: {
        heading: "4. 제3자 제공",
        body: "수집한 정보를 제3자에게 제공하지 않습니다. Google은 인증 제공자(OAuth identity provider)로서 로그인 시점에 정보를 전달하는 주체이며, BrennHub이 정보를 외부로 내보내는 행위는 없습니다.",
      },
      rights: {
        heading: "5. 이용자 권리",
        body: "본인의 정보 열람, 수정, 삭제를 요청할 수 있습니다. 계정 삭제를 요청하면 사용자 정보와 모든 세션 기록이 즉시 삭제됩니다. 아래 연락처로 요청해주세요.",
      },
      contact: {
        heading: "6. 연락처",
        body: "본 처리방침과 개인정보 관련 문의는 다음 이메일로 보내주세요.",
        email: "brennhub.co@gmail.com",
      },
    },
    footer: {
      privacy: "개인정보 처리방침",
    },
    profile: {
      title: "내 프로필",
      accountInfo: "계정 정보",
      email: "이메일",
      displayName: "표시 이름",
      displayNamePlaceholder: "표시할 이름",
      displayNameHint: "비워두면 Google 계정 이름을 사용합니다.",
      save: "저장",
      saving: "저장 중…",
      saved: "저장되었습니다",
      saveError: "저장에 실패했습니다. 다시 시도해주세요.",
      dangerZone: "계정 삭제",
      deleteAccount: "계정 삭제",
      deleteWarning:
        "계정과 모든 도구 데이터(영양제 스케줄 등)가 영구 삭제됩니다. 이 작업은 되돌릴 수 없습니다.",
      deleteConfirm: "영구 삭제",
      deleting: "삭제 중…",
      deleteError: "삭제에 실패했습니다. 다시 시도해주세요.",
      cancel: "취소",
      loginRequired: "로그인이 필요합니다.",
      loginCta: "로그인",
    },
    admin: {
      title: "관리자",
      dashboardTitle: "BrennHub 관리자 대시보드",
      dashboardIntro: "사이트 운영 메뉴",
      menu: {
        dashboard: "대시보드",
        feedback: "피드백",
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
      "supp-plan": {
        name: "영양제 플래너",
        description: "약동학 기반 개인 영양제 스케줄링",
      },
      "saju-naming": {
        name: "사주 작명",
        description: "사주팔자 + 성명학 기반 작명",
      },
      "lineup-builder": {
        name: "축구 베스트 일레븐 만들기",
        description:
          "포메이션, 선수 명단, 등번호를 시각적으로 구성하고 PNG로 다운로드",
      },
      "language-maker": {
        name: "언어 창조기",
        description:
          "픽셀로 문자를 그리고 입력값에 1:1로 매핑해 나만의 언어를 만들고 실시간 변환·공유",
      },
      maze: {
        name: "픽셀 미로 만들기",
        description: "픽셀 격자로 미로를 설계하고 풀이하며 링크로 공유",
      },
      shooter: {
        name: "아케이드 슈터",
        description: "우주 함대를 격추하는 세로 스크롤 슈팅 게임",
      },
      "tag-it": {
        name: "태그잇",
        description:
          "오피스 문서(Word·Excel·PowerPoint)에서 핵심 키워드를 뽑아 칩으로 다듬고 문서 속성에 기록 — 전부 브라우저 안에서",
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
      colorSchemeLabel: "Gain/Loss Color",
      colorSchemeKr: "Korean",
      colorSchemeUs: "US",
      currencyLabel: "Currency",
      currencyUsd: "USD ($)",
      currencyKrw: "KRW (₩)",
      exchangeRateTooltip: "1 USD = {rate} KRW (updated {date})",
      exchangeRateTooltipManual: "1 USD = {rate} KRW (manual)",
      rateLabel: "1 USD =",
      tabs: {
        costBasis: "Cost Basis",
        dividend: "Dividends",
        dcaDown: "Averaging Down",
        splitSell: "Split Sell",
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
        dropIntervalLabel: "Drop %",
        dropIntervalPlaceholder: "5",
        targetReturnLabel: "Target Return (%)",
        targetReturnPlaceholder: "30",
        weightToggle: "Apply Weighting",
        weightTooltip:
          "Control weighting via 'First Buy Share (%)'. Smaller = more back-loaded (Martingale). Larger = closer to equal.",
        firstWeightLabel: "Weight Balance (0-100)",
        firstWeightPlaceholder: "50",
        weightEqualBenchmark: "(50 = Equal)",
        tableTitle: "Round-by-Round",
        colRound: "Round",
        colPrice: "Price",
        colDropPct: "Drop %",
        colBuyAmount: "Buy Amount",
        colShares: "Shares",
        colCumShares: "Cum Shares",
        colCumBuyAmount: "Cum Buy Amount",
        colAvgPrice: "Avg Price",
        summaryTitle: "Summary",
        totalInvestLabel: "Total Invested",
        totalSharesLabel: "Total Shares",
        finalAvgLabel: "Final Avg Price",
        targetPriceLabel: "Target Sell Price",
        expectedProfitLabel: "Expected Profit",
        colTargetPrice: "Target Price",
        weightHint: "OFF: Martingale (2x doubling). ON: Set first-buy %",
        targetReturnDisplayLabel: "Target Return",
        zeroShareWarningSingle:
          "Round {n} allocates below 1 share price (0 shares bought). Reduce rounds or increase Budget.",
        zeroShareWarningRange:
          "Rounds {start}-{end} allocate below 1 share price (0 shares bought). Reduce rounds or increase Budget.",
        colProfit: "Profit",
        legendCompleted: "Completed",
        legendNextBuy: "Next Buy",
        legendReset: "Reset",
        stepperDropMax: "Drop max is 50%",
        stepperDropMin: "Drop min is 0.1%",
        stepperNMax: "Max rounds is {max} (at current drop %)",
        stepperNMin: "Minimum 2 rounds",
        stepperGenericMax: "Max reached",
        forceFirstShareLabel: "Buy at Start Price",
        forceFirstShareTooltip:
          "Force minimum 1 share from round 1 (Budget cap protected)",
        taxRateLabel: "Tax Rate (%)",
        afterTaxProfitLabel: "After-Tax Expected Profit",
        exportCsvLabel: "Export CSV",
        taxTypeShortTerm: "Short-term",
        taxTypeLongTerm: "Long-term",
        taxTooltipShortTerm:
          "Held < 1 year. Ordinary income tax 24% (single filer $103k~$197k bracket, 2025)",
        taxTooltipLongTerm:
          "Held > 1 year. Long-term capital gains 15% (single filer $48k~$533k bracket, 2025)",
        taxAmountLabel: "Tax",
        unitN: "rounds",
        stepperTaxMax: "Tax rate max is 50%",
        stepperTargetMax: "Target return max is 500%",
        stepperWeightMax: "Weight balance max is 100",
        invalidInputHint:
          "All inputs (Total Budget, Current Price, Rounds, Drop %) must be greater than 0 for DCA simulation.",
        tableEmptyHint: "No data",
      },
      splitSell: {
        inputTitle: "Sell Plan",
        tickerHeader: "Ticker",
        tickerPlaceholder: "AAPL",
        holdingsHeader: "Shares Held",
        holdingsPlaceholder: "Total held",
        startPriceHeader: "Current Price",
        startPricePlaceholder: "First sell",
        nLabel: "Sell Rounds",
        nPlaceholder: "2-50",
        riseIntervalLabel: "Rise %",
        riseIntervalPlaceholder: "5",
        avgCostLabel: "Avg Cost",
        avgCostPlaceholder: "Cost basis",
        avgCostHint: "Used to compute realized P&L",
        taxRateLabel: "Tax Rate (%)",
        taxTypeShortTerm: "Short-term",
        taxTypeLongTerm: "Long-term",
        taxTooltipShortTerm:
          "Held < 1 year. Ordinary income tax 24% (single filer $103k~$197k bracket, 2025)",
        taxTooltipLongTerm:
          "Held > 1 year. Long-term capital gains 15% (single filer $48k~$533k bracket, 2025)",
        weightToggle: "Apply Weighting",
        weightTooltip:
          "Control each round's sell size via 'Weight Balance (0-100)'. Smaller = more back-loaded at higher prices (Martingale). Larger = closer to equal.",
        weightHint:
          "OFF: Martingale (2x doubling, sells more at higher prices). ON: Set weight balance",
        firstWeightLabel: "Weight Balance (0-100)",
        firstWeightPlaceholder: "50",
        weightEqualBenchmark: "(50 = Equal)",
        sellBasisLabel: "Sell Price Basis",
        sellBasisTooltip:
          "Starting point of the sell-price ladder. Avg Cost: rises per round from your average cost. Current Price: rises per round from the current price. The rise applies from round 1.",
        summaryTitle: "Summary",
        totalInvestLabel: "Total Invested",
        totalProceedsLabel: "Total Proceeds",
        totalSharesLabel: "Total Shares Sold",
        avgSellPriceLabel: "Avg Sell Price",
        realizedProfitLabel: "Realized P&L",
        taxAmountLabel: "Tax",
        afterTaxRealizedLabel: "After-Tax Realized P&L",
        tableTitle: "Round-by-Round Sells",
        colRound: "Sell Round",
        colPrice: "Sell Price",
        colRisePct: "Rise %",
        colShares: "Shares Sold",
        colCumShares: "Cum Sold",
        colSellAmount: "Sell Amount",
        colCumSellAmount: "Cum Sell Amount",
        colRealizedPnl: "Realized P&L",
        colCumRealizedPnl: "Cumulative P&L",
        legendCompleted: "Sold",
        legendNextSell: "Next Sell",
        legendReset: "Reset",
        exportCsvLabel: "Export CSV",
        zeroShareWarningSingle:
          "Round {n} is allocated 0 shares. Reduce sell rounds or increase holdings.",
        zeroShareWarningRange:
          "Rounds {start}-{end} are allocated 0 shares. Reduce sell rounds or increase holdings.",
        invalidInputHint:
          "Shares Held, Avg Cost, Sell Rounds, Rise %, and the chosen basis price must all be greater than 0 for split-sell simulation.",
        tableEmptyHint: "No data",
        stepperRiseMax: "Rise max is 100%",
        stepperRiseMin: "Rise must be 0% or higher",
        stepperNMax: "Max sell rounds is 50",
        stepperNMin: "Minimum 2 sell rounds",
        stepperTaxMax: "Tax rate max is 50%",
        stepperWeightMax: "Weight balance max is 100",
        unitN: "rounds",
      },
    },
    suppPlan: {
      title: "Supplement Planner",
      description: "Pharmacokinetics-aware personal supplement scheduling",
      disclaimer:
        "Not medical advice. Use at your own discretion. Consult a healthcare professional before starting any supplement regimen.",
      library: "Supplement Library",
      mySchedule: "My Schedule",
      addToSchedule: "Add to schedule",
      custom: "Custom entry",
      category: "Category",
      solubility: "Solubility",
      state: "State",
      metabolism: "Metabolism",
      excretion: "Excretion",
      dailyRecommended: "Daily recommended",
      effects: "Effects",
      notes: "Notes",
      time: "Time",
      days: "Days",
      dosage: "Dosage",
      capsules: "Capsules",
      amount: "Amount",
      save: "Save",
      cancel: "Cancel",
      delete: "Delete",
      edit: "Edit",
      emptySchedule: "No schedule yet. Add supplements from the library.",
      emptyLibrary: "Library is empty.",
      compatibilityWarning: "Compatibility warning",
      selectSupplement: "Select supplement",
      customNamePlaceholder: "Supplement name",
      filterAll: "All",
      addEntryTitle: "Add entry",
      editEntryTitle: "Edit entry",
      sol_water: "Water-soluble",
      sol_fat: "Fat-soluble",
      "sol_semi-fat": "Semi-fat-soluble",
      sol_special: "Special",
      state_fasting: "Fasting",
      "state_after-waking": "After waking",
      "state_with-meal": "After meal",
      "state_before-meal": "Before meal",
      state_bedtime: "Before bed",
      "state_pre-workout": "Pre-workout",
      "state_post-workout": "Post-workout",
      meal: "Meal",
      meal_breakfast: "Breakfast",
      meal_lunch: "Lunch",
      meal_dinner: "Dinner",
      mealNotSet: "Meal not set",
      product: "Product info (optional)",
      productPrice: "Price",
      productLink: "Link",
      pricePlaceholder: "e.g. $24.99",
      linkPlaceholder: "https://...",
      recommendedAmountHint: "Daily recommended",
      searchPlaceholder: "Search…",
      timeHour: "Hour",
      timeMinute: "Min",
      timeAM: "AM",
      timePM: "PM",
      candidates: "Candidates",
      candidatesEmpty: "No candidates",
      quickAdd: "Quick add",
      confirm: "Confirm",
      status: "Status",
      status_candidate: "Candidate",
      status_confirmed: "Confirmed",
      notSet: "Not set",
      viewByCard: "Cards",
      viewByTable: "Table",
      productCurrency: "Currency",
      currency_KRW: "Won (KRW)",
      currency_USD: "Dollar (USD)",
      currency_EUR: "Euro (EUR)",
      currency_JPY: "Yen (JPY)",
      cat_vitamin: "Vitamin",
      cat_mineral: "Mineral",
      "cat_amino-acid": "Amino acid",
      cat_antioxidant: "Antioxidant",
      cat_structural: "Structural",
      cat_herbal: "Herbal",
      "cat_fatty-acid": "Fatty acid",
      cat_probiotic: "Probiotic",
      cat_fermented: "Fermented",
      cat_other: "Other",
      day_all: "Every day",
      "day_biweekly-mwf": "Every other day (M/W/F)",
      "day_biweekly-tts": "Every other day (T/Th/Sat)",
      day_workout: "Workout days",
      day_rest: "Rest days",
      day_weekday: "Weekdays",
      day_weekend: "Weekend",
      day_custom: "Custom",
      day_mon: "Mon",
      day_tue: "Tue",
      day_wed: "Wed",
      day_thu: "Thu",
      day_fri: "Fri",
      day_sat: "Sat",
      day_sun: "Sun",
      rule_avoid: "Avoid combining",
      rule_synergy: "Synergy when combined",
      "rule_ratio-recommend": "Recommended ratio",
      organ_liver: "Liver",
      organ_kidney: "Kidney",
      organ_bile: "Bile",
      organ_gut: "Gut",
      "organ_small-intestine": "Small intestine",
      organ_skin: "Skin",
    },
    sajuNaming: {
      name: "Saju Naming",
      description:
        "Name recommendations based on Saju and Korean naming principles",
    },
    lineupBuilder: {
      title: "Football Best XI Builder",
      description:
        "Build your starting eleven visually and save it as an image.",
      formationLabel: "Formation",
      teamNameLabel: "Team name",
      teamNamePlaceholder: "Enter your team name",
      managerLabel: "Manager",
      managerPlaceholder: "Manager name",
      downloadButton: "Save image",
      downloadingButton: "Saving…",
      resetButton: "Reset",
      teamColorLabel: "Team color",
      editTitle: "Edit player",
      editNameLabel: "Name",
      editNumberLabel: "Number",
      positionLabel: "Position",
      captainToggle: "Captain",
      editSave: "Save",
      editCancel: "Cancel",
      formations: {
        "4-4-2": "4-4-2 Box",
        "4-3-3": "4-3-3 Wingers",
        "3-5-2": "3-5-2 Wing-backs",
        "4-2-3-1": "4-2-3-1",
        "4-1-4-1": "4-1-4-1 Single Pivot",
        "3-4-3": "3-4-3 Wing",
        "5-3-2": "5-3-2 Back Five",
        "4-3-2-1": "4-3-2-1 Christmas Tree",
      },
    },
    languageMaker: {
      title: "Language Maker",
      description:
        "Draw your own characters pixel by pixel, map them to any input, and convert text in real time.",
      step1: "Characters",
      step2: "Typing",
      gridHeading: "Make characters",
      gridIntro:
        "Tap a card to draw a character and map its input. Drag to reorder.",
      addCharacter: "Add character",
      characterIndex: "Character {n}",
      triggerPlaceholder: "Letter or word to map",
      duplicateTrigger: "This input is already in use",
      deleteCharacter: "Delete",
      editorTitle: "Draw character",
      editorIntro: "Click or drag across the 16×16 grid to draw.",
      clearCharacter: "Clear",
      editorDone: "Done",
      editorClose: "Close",
      typewriterHeading: "Babel typewriter",
      typewriterIntro:
        "Type and watch it convert into your mapped characters in real time.",
      inputLabel: "Input",
      inputPlaceholder: "Type text to convert",
      outputLabel: "Converted output",
      download: "Save image",
      typewriterNoGlyph: "Map an input to a character first.",
      typewriterEmpty:
        "Type text above and the converted output will appear here.",
      unmappedNote: "Unmapped characters appear as gray original text.",
      goToSlots: "Go to characters",
    },
    maze: {
      title: "Pixel Maze Maker",
      description: "Design your own maze on a pixel grid and share it via link.",
      step1: "Build",
      step2: "Play",
      sizeLabel: "Map size",
      widthLabel: "Width",
      heightLabel: "Height",
      dimMaxReached: "Maximum is 128",
      dimMinReached: "Minimum is 3",
      applySize: "Apply",
      presetsLabel: "Presets",
      fogLabel: "Fog of War",
      fogDescription:
        "Limits visibility to a radius around the start when playing.",
      fogRadiusLabel: "Vision radius (tiles)",
      fogRadiusMax: "Maximum vision radius",
      fogRadiusMin: "Minimum vision radius",
      playViewSpanLabel: "Play view span (tiles)",
      playViewSpanMax: "Maximum span (entire grid visible)",
      playViewSpanMin: "Minimum span (closest)",
      timeLimitLabel: "Time limit",
      timeLimitDescription:
        "Limit play time. Game over if exceeded.",
      timeLimitValueLabel: "Time (sec)",
      timeLimitMaxReached: "Maximum is 900 seconds",
      timeLimitMinReached: "Minimum is 10 seconds",
      sizeChangeTitle: "Change size",
      sizeChangeMessage:
        "Changing size regenerates the grid at the new dimensions. Anything drawn will be lost.",
      sizeChangeConfirm: "Change",
      viewZoomIn: "Zoom in",
      viewZoomOut: "Zoom out",
      viewFit: "Fit",
      viewHand: "Hand tool (space + drag)",
      toolWall: "Wall",
      toolPath: "Path",
      toolStart: "Start",
      toolGoal: "Goal",
      commitWallsButton: "Generate walls",
      commitWallsHint:
        "Cells outside your path become walls. Start and goal are preserved.",
      resetTitle: "Reset map",
      resetMessage:
        "Going back to settings will reset everything you've drawn. Continue?",
      resetConfirm: "Reset and go back",
      resetCancel: "Cancel",
      resetGridTitle: "Clear grid",
      resetGridMessage:
        "All cells will be cleared. Size and fog settings stay. This action can be undone.",
      resetGridConfirm: "Clear",
      editorUndo: "Undo",
      editorRedo: "Redo",
      editorResetGrid: "Clear grid",
      validationTitlePass: "Ready to play",
      validationTitleFail: "Validation failed",
      validationNoStart: "No start tile placed",
      validationMultiStart: "Multiple start tiles found",
      validationNoGoal: "No goal tile placed",
      validationUnreachable: "No goal is reachable from start",
      validationExpand: "Details",
      validationCollapse: "Hide",
      validationRuleEndpoints: "Start & goal",
      validationRuleReachability: "Reachability",
      validationSkipped: "Skipped",
      scoreLabel: "Maze score",
      scoreStarsAria: "{n} of 5 stars",
      scoreDimDetour: "Detour",
      scoreDimCorridors: "Corridor structure",
      scoreDimTexture: "Branches & dead ends",
      weakLowDetour:
        "Detour is low — add walls to twist the path.",
      weakNoCorridors:
        "Hardly any walls — narrow the paths to form a maze.",
      weakNoTexture:
        "No branches or dead ends — the path feels flat.",
      playNotReadyHint:
        "Pass the draw-step validation before you can play.",
      playIntro: "Arrow keys, WASD, or the D-pad below to move.",
      playControlsUp: "Move up",
      playControlsDown: "Move down",
      playControlsLeft: "Move left",
      playControlsRight: "Move right",
      playRestart: "Play again",
      playBackToEdit: "Back to editor",
      soundMute: "Mute",
      soundUnmute: "Unmute",
      shareButton: "Create share link",
      shareGenerating: "Generating...",
      shareUrlLabel: "Share link",
      shareCopyButton: "Copy",
      shareCopiedToast: "Copied",
      shareErrorGeneric: "Failed to create share link.",
      shareErrorRateLimit: "Please try again in a moment.",
      shareNotFoundTitle: "Maze not found",
      shareNotFoundMessage:
        "The share link is invalid or the maze was removed.",
      sharedBuildOwn: "Build your own maze",
      winTitle: "Escaped!",
      winMessage: "You reached the goal.",
    },
    shooter: {
      title: "Arcade Shooter",
      description: "Top-down arcade shoot-'em-up — blast the alien fleet",
      startButton: "Start",
      scoreLabel: "Score",
      livesLabel: "Lives",
      highScoreLabel: "Best",
      newHighScore: "New best",
      gameOverTitle: "Game Over",
      restartButton: "Restart",
      controlsHintDesktop: "Arrow keys or WASD to move / Space to fire",
      controlsHintMobile: "Tap and hold left/right (auto-fire)",
      difficultyLabel: "Difficulty",
      difficultyEasy: "Easy",
      difficultyNormal: "Normal",
      difficultyHard: "Hard",
      soundMute: "Mute",
      soundUnmute: "Unmute",
    },
    tagIt: {
      title: "Tag-it",
      description:
        "Upload an Office document (Word, Excel, PowerPoint) and it pulls key terms from the text into chips. Curate the tags, write them into the document properties, and download it again. Files never leave your browser.",
      uploadTitle: "Drop your Office documents here",
      uploadHint: "Up to 5 at once · 8MB each · 15MB total · .docx / .xlsx / .pptx",
      uploadButton: "Choose files",
      limitNotOffice: "{name}: only .docx / .xlsx / .pptx are supported",
      limitFiles: "You can upload at most {max} files",
      limitFileSize: "{name}: exceeds {max} per file",
      limitTotalSize: "Total size exceeds {max}",
      modeLabel: "Extraction mode",
      modeAuto: "Auto",
      modeManual: "Manual",
      modeAutoHint: "Reads the text and pulls keyword chips automatically.",
      modeManualHint: "Start from a blank canvas and type tags yourself.",
      workspaceTitle: "Results",
      workspaceEmpty:
        "Upload an Office document above and keyword chips will appear here.",
      reextracted: "Updated",
      advancedTitle: "Advanced options",
      strengthLabel: "Filter strength",
      strengthHint: "Left = lenient (show more) · Right = strict (clear nouns only)",
      strengthNames: ["Lenient", "Light", "Balanced", "Strong", "Strict"],
      strengthDescs: [
        "Removes only tokens with stray symbols.",
        "+ Also removes digit/letter fragments (5px, F1).",
        "+ Removes particles, inflections, and counters (default).",
        "+ Stronger abbreviation penalty + drops rare words.",
        "+ Also drops abbreviations, keeping clear nouns only.",
      ],
      scopeLabel: "Read scope",
      scopeBody: "Body (always)",
      scopeTables: "Text inside tables",
      minFreqLabel: "Minimum occurrences",
      minFreqHint: "Words appearing fewer times than this are dropped.",
      commonTrayTitle: "Common tags",
      commonTrayHint: "Tags entered here apply to every uploaded file.",
      commonTrayPlaceholder: "Type a tag for all files, then Enter",
      commonTrayEmpty: "No common tags yet.",
      statusPending: "Pending",
      statusProcessing: "Reading…",
      statusDone: "Done",
      statusError: "Failed",
      errorParse:
        "Could not read the file. Please check it is a valid .docx / .xlsx / .pptx.",
      addPlaceholder: "Type a tag, then Enter",
      showMore: "Show {n} more",
      showLess: "Show less",
      expandAll: "Expand all ({n})",
      download: "Download",
      downloadAll: "Download all (.zip)",
      emptyCanvas: "Extracted chips appear here. You can also type your own.",
      overwriteNote:
        "Downloads keep the original filename. Take care not to overwrite.",
      chipSelect: "Select/deselect tag",
      chipDelete: "Delete",
      freqTitle: "appears {n}×",
      probTitle: "noun confidence {p}%",
      sectionSelected: "Selected tags",
      sectionCandidate: "Candidates",
      selectedEmpty: "Pick tags from the candidates below.",
      candidateAllAdded: "All candidates added.",
      searchPlaceholder: "Search candidate chips…",
      searchEmpty: "No candidates match your search.",
      counter: "Selected {sel}/{max} · Candidates {cand}",
      selectAll: "Select all",
      deselectAll: "Clear all",
      selectTop: "Top {n}",
      topNAria: "How many top candidates to add",
      capWarning: "Up to {max} tags per file — kept the top {max}.",
    },
    feedback: {
      button: "Feedback",
      dialogTitle: "Send Feedback",
      dialogDescription: "Help us improve",
      toolLabel: "Which feature?",
      toolSite: "Site overall",
      toolEmailDiag: "Email Diagnostic",
      toolCronTrans: "Cron Translator",
      toolStockSim: "Stock Simulator",
      toolSuppPlan: "Supplement Planner",
      toolSajuNaming: "Saju Naming",
      toolLineupBuilder: "Football Best XI Builder",
      toolLanguageMaker: "Language Maker",
      toolMaze: "Pixel Maze Maker",
      toolShooter: "Arcade Shooter",
      toolTagIt: "Tag-it",
      categoryLabel: "Category",
      categoryFeature: "Feature Request",
      categoryImprovement: "Improvement",
      categoryComplaint: "Complaint",
      categoryOther: "Other",
      messageLabel: "Message",
      messagePlaceholder: "What did you like? What could be improved?",
      emailLabel: "Email (optional)",
      emailPlaceholder: "Enter to receive a response",
      submit: "Submit",
      submitting: "Sending...",
      success: "Thanks! Your feedback has been received.",
      cancel: "Cancel",
      errorGeneric: "An error occurred. Please try again.",
      errorTooShort: "Message too short (min 5 chars)",
      errorTooLong: "Message too long (max 2000 chars)",
      errorRateLimit: "Please try again shortly",
      cardIconTooltip: "Feedback for this tool",
    },
    auth: {
      signIn: "Sign in",
      signOut: "Sign out",
      adminPanel: "Admin",
      errors: {
        stateMismatch: "Sign-in session mismatch. Please try again.",
        stateInvalid: "Sign-in verification failed. Please try again.",
        stateExpired: "Sign-in attempt expired. Please try again.",
        tokenExchangeFailed: "Google auth communication failed. Please try again shortly.",
        idTokenInvalid: "Google token verification failed. Please try again.",
        idTokenUnverifiedEmail: "Email not verified. Verify your email on your Google account and try again.",
        dbError: "Server save failed. Please try again shortly.",
        internal: "Server configuration error. Please contact the admin.",
        notAdmin: "Admin access required.",
      },
    },
    privacy: {
      title: "Privacy Policy",
      lastUpdated: "Last updated: 2026-05-12",
      intro:
        "BrennHub collects only the minimum information needed to provide sign-in. This page spells out exactly what we receive, where it's used, and how long it's kept — straight from the code.",
      collection: {
        heading: "1. What we collect",
        description:
          "Information received via Google sign-in, plus data the server generates during the sign-in process.",
        columns: {
          item: "Item",
          source: "Source",
          purpose: "Purpose",
          retention: "Retention",
        },
        rows: [
          {
            item: "Email",
            source: "Google id_token (email)",
            purpose: "Account identification, UI display",
            retention: "While account exists",
          },
          {
            item: "Name",
            source: "Google id_token (name)",
            purpose: "UI display",
            retention: "While account exists",
          },
          {
            item: "Google account ID (sub)",
            source: "Google id_token (sub)",
            purpose: "Stable user mapping key",
            retention: "While account exists",
          },
          {
            item: "Profile picture URL",
            source: "Google id_token (picture)",
            purpose: "Stored in DB but not currently shown in the UI",
            retention: "While account exists",
          },
          {
            item: "brennhub_session cookie",
            source: "Server-generated (32-byte random)",
            purpose: "Maintain sign-in session",
            retention: "30 days",
          },
          {
            item: "auth_state cookie",
            source: "Server-generated (HMAC token)",
            purpose: "CSRF protection during sign-in",
            retention: "10 minutes",
          },
          {
            item: "User-Agent string",
            source: "Request header (at sign-in time)",
            purpose: "Audit / detect abnormal access",
            retention: "Same as session (30 days)",
          },
        ],
      },
      purpose: {
        heading: "2. Purpose of use",
        body: "Collected information is used solely for sign-in identification and session maintenance. Per-tool personal data storage is a future phase and will be announced separately. We do not use this data for advertising, analytics, or external trackers.",
      },
      retention: {
        heading: "3. Retention",
        body: "User information is kept while the account exists. Sessions expire after 30 days and are deleted immediately on sign-out. The temporary sign-in token (auth_state) expires after 10 minutes.",
      },
      thirdParty: {
        heading: "4. Third-party sharing",
        body: "We do not share collected information with third parties. Google acts as an identity provider that delivers information to us at sign-in; BrennHub does not forward any data outward.",
      },
      rights: {
        heading: "5. Your rights",
        body: "You may request access, correction, or deletion of your information. On account deletion, your user record and all session entries are removed immediately. Contact us at the address below.",
      },
      contact: {
        heading: "6. Contact",
        body: "Send questions about this policy or your data to the address below.",
        email: "brennhub.co@gmail.com",
      },
    },
    footer: {
      privacy: "Privacy Policy",
    },
    profile: {
      title: "My Profile",
      accountInfo: "Account",
      email: "Email",
      displayName: "Display name",
      displayNamePlaceholder: "Name to show",
      displayNameHint: "Leave empty to use your Google account name.",
      save: "Save",
      saving: "Saving…",
      saved: "Saved",
      saveError: "Save failed. Please try again.",
      dangerZone: "Delete account",
      deleteAccount: "Delete account",
      deleteWarning:
        "Your account and all tool data (supplement schedules, etc.) will be permanently deleted. This cannot be undone.",
      deleteConfirm: "Delete permanently",
      deleting: "Deleting…",
      deleteError: "Deletion failed. Please try again.",
      cancel: "Cancel",
      loginRequired: "Sign-in required.",
      loginCta: "Sign in",
    },
    admin: {
      title: "Admin",
      dashboardTitle: "BrennHub Admin Dashboard",
      dashboardIntro: "Site operations menu",
      menu: {
        dashboard: "Dashboard",
        feedback: "Feedback",
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
      "supp-plan": {
        name: "Supplement Planner",
        description: "Pharmacokinetics-aware personal supplement scheduling",
      },
      "saju-naming": {
        name: "Saju Naming",
        description:
          "Name recommendations based on Saju and Korean naming principles",
      },
      "lineup-builder": {
        name: "Football Best XI Builder",
        description:
          "Visually compose your football starting eleven (formation, names, numbers) and download as PNG",
      },
      "language-maker": {
        name: "Language Maker",
        description:
          "Create your own language — draw pixel glyphs, map them to any input, convert text in real time",
      },
      maze: {
        name: "Pixel Maze Maker",
        description:
          "Design pixel-grid mazes, solve them, and share via link",
      },
      shooter: {
        name: "Arcade Shooter",
        description:
          "Top-down arcade shoot-'em-up — blast the alien fleet for high scores",
      },
      "tag-it": {
        name: "Tag-it",
        description:
          "Pull key terms from an Office doc (Word/Excel/PowerPoint) into chips, curate them, and write them to the document properties — all in the browser",
      },
    },
  },
};
