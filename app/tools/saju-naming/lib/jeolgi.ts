/**
 * 24 절기 시각 계산 — Meeus 천체역학 정밀 구현 (±10초 정밀도).
 *
 * 명리학 사주의 연주(입춘 기준)·월주(12 월령 절기 기준) 산출에 사용. 라이브러리
 * `korean-lunar-calendar`는 음력 정월 1일 기준 연주/월주를 산출해 명리학 표준과
 * 불일치 → 본 모듈로 대체.
 *
 * 자료 경로: 자체 계산 (외부 데이터·API 의존 0). 균시차(Spencer 1971)와 동일 패턴.
 *
 * 공식 출처 (모두 공식 자체는 사실/저작권 비대상):
 *   - Meeus, Jean. "Astronomical Algorithms" 2nd ed. (Willmann-Bell, 1998).
 *     Ch. 25 "Solar Coordinates" (표면 정밀 ±0.0003°, 시각 환산 ~±10초).
 *     Ch. 26 "Equinoxes and Solstices" — 4 cardinal points 초기 추정 + Table 26.A
 *     주기항 24개 보정 (정밀 ±20초).
 *   - VSOP87 (Bretagnon & Francou, Astron. Astrophys. 202, 309-315, 1988).
 *     CDS/SIMBAD public domain. Meeus Table 26.A 계수는 VSOP87 절단 유도분.
 *   - Espenak, Fred & Meeus, Jean. NASA "Five Millennium Catalog of Solar Eclipses"
 *     ΔT (TT − UT) 다항식 (구간별 1900~2050).
 *
 * 책의 코드는 비복제 — 공식만 인용 후 brennhub 자체 구현.
 *
 * 시간 기준 정리:
 *   - 절기 시각은 KASI 발표와 동일 한국 표준시(KST) 기준. 시기별 표준자오선 자동
 *     반영 (1954-03-21~1961-08-09 = 127.5° / 그 외 = 135°).
 *   - 명리학 통용: 출생 시각과 절기 시각 비교 시 둘 다 KST. 진태양시는 시진(시주)에만.
 */

// ───────────────── 24 절기 정의 ─────────────────

/**
 * 24 절기 — 입춘부터 대한까지 (15° 간격 태양 황경).
 * index 0=입춘 (315°) ... 23=대한 (300°). 연주/월주 산출에 사용.
 */
export const SOLAR_TERMS: ReadonlyArray<{
  readonly index: number;
  readonly name: string;
  readonly longitude: number; // 황경 (도)
  readonly monthBranch?: string; // 월령(月支) 시작 절기인 경우만 지지
}> = [
  { index: 0, name: "입춘", longitude: 315, monthBranch: "인" },
  { index: 1, name: "우수", longitude: 330 },
  { index: 2, name: "경칩", longitude: 345, monthBranch: "묘" },
  { index: 3, name: "춘분", longitude: 0 },
  { index: 4, name: "청명", longitude: 15, monthBranch: "진" },
  { index: 5, name: "곡우", longitude: 30 },
  { index: 6, name: "입하", longitude: 45, monthBranch: "사" },
  { index: 7, name: "소만", longitude: 60 },
  { index: 8, name: "망종", longitude: 75, monthBranch: "오" },
  { index: 9, name: "하지", longitude: 90 },
  { index: 10, name: "소서", longitude: 105, monthBranch: "미" },
  { index: 11, name: "대서", longitude: 120 },
  { index: 12, name: "입추", longitude: 135, monthBranch: "신" },
  { index: 13, name: "처서", longitude: 150 },
  { index: 14, name: "백로", longitude: 165, monthBranch: "유" },
  { index: 15, name: "추분", longitude: 180 },
  { index: 16, name: "한로", longitude: 195, monthBranch: "술" },
  { index: 17, name: "상강", longitude: 210 },
  { index: 18, name: "입동", longitude: 225, monthBranch: "해" },
  { index: 19, name: "소설", longitude: 240 },
  { index: 20, name: "대설", longitude: 255, monthBranch: "자" },
  { index: 21, name: "동지", longitude: 270 },
  { index: 22, name: "소한", longitude: 285, monthBranch: "축" },
  { index: 23, name: "대한", longitude: 300 },
] as const;

// ───────────────── Meeus Ch.26 Cardinal Points ─────────────────

/**
 * Meeus 26.1-26.4 — 분점/지점 JDE 1차 추정 (year +1000 to +3000).
 * Y = (year - 2000) / 1000.
 */
function jde0_VernalEquinox(year: number): number {
  const Y = (year - 2000) / 1000;
  return 2451623.80984 + 365242.37404 * Y + 0.05169 * Y ** 2 - 0.00411 * Y ** 3 - 0.00057 * Y ** 4;
}
function jde0_SummerSolstice(year: number): number {
  const Y = (year - 2000) / 1000;
  return 2451716.56767 + 365241.62603 * Y + 0.00325 * Y ** 2 + 0.00888 * Y ** 3 - 0.00030 * Y ** 4;
}
function jde0_AutumnalEquinox(year: number): number {
  const Y = (year - 2000) / 1000;
  return 2451810.21715 + 365242.01767 * Y - 0.11575 * Y ** 2 + 0.00337 * Y ** 3 + 0.00078 * Y ** 4;
}
function jde0_WinterSolstice(year: number): number {
  const Y = (year - 2000) / 1000;
  return 2451900.05952 + 365242.74049 * Y - 0.06223 * Y ** 2 - 0.00823 * Y ** 3 + 0.00032 * Y ** 4;
}

/**
 * Meeus Table 26.A — 24 periodic terms for high-precision cardinal correction.
 * 형식: [A, B (deg), C (deg)]. 출처: VSOP87 truncated terms (public domain).
 */
const PERIODIC_TERMS: ReadonlyArray<readonly [number, number, number]> = [
  [485, 324.96, 1934.136],
  [203, 337.23, 32964.467],
  [199, 342.08, 20.186],
  [182, 27.85, 445267.112],
  [156, 73.14, 45036.886],
  [136, 171.52, 22518.443],
  [77, 222.54, 65928.934],
  [74, 296.72, 3034.906],
  [70, 243.58, 9037.513],
  [58, 119.81, 33718.147],
  [52, 297.17, 150.678],
  [50, 21.02, 2281.226],
  [45, 247.54, 29929.562],
  [44, 325.15, 31555.956],
  [29, 60.93, 4443.417],
  [18, 155.12, 67555.328],
  [17, 288.79, 4562.452],
  [16, 198.04, 62894.029],
  [14, 199.76, 31436.921],
  [12, 95.39, 14577.848],
  [12, 287.11, 31931.756],
  [12, 320.81, 34777.259],
  [9, 227.73, 1222.114],
  [8, 15.45, 16859.074],
];

/** Cardinal point JDE 정밀 보정 (Meeus 26.A). 정밀도 ~±20초. */
function cardinalCorrectedJDE(jde0: number): number {
  const T = (jde0 - 2451545.0) / 36525;
  const Wdeg = 35999.373 * T - 2.47;
  const Wrad = (Wdeg * Math.PI) / 180;
  const dlambda = 1 + 0.0334 * Math.cos(Wrad) + 0.0007 * Math.cos(2 * Wrad);
  let S = 0;
  for (const [A, B, C] of PERIODIC_TERMS) {
    const rad = ((B + C * T) * Math.PI) / 180;
    S += A * Math.cos(rad);
  }
  return jde0 + (0.00001 * S) / dlambda;
}

/** Cardinal point (0=춘분, 1=하지, 2=추분, 3=동지)의 정밀 JDE (TT). */
function cardinalJDE(year: number, point: 0 | 1 | 2 | 3): number {
  const jde0 =
    point === 0
      ? jde0_VernalEquinox(year)
      : point === 1
        ? jde0_SummerSolstice(year)
        : point === 2
          ? jde0_AutumnalEquinox(year)
          : jde0_WinterSolstice(year);
  return cardinalCorrectedJDE(jde0);
}

// ───────────────── VSOP87 Earth Heliocentric Series ─────────────────

/**
 * VSOP87 절단 시리즈 — Earth heliocentric ecliptic coords (radian, AU).
 *
 * 출처:
 *   - Bretagnon, P. & Francou, G. (1988) "Planetary theories in rectangular
 *     and spherical variables. VSOP 87 solutions." A&A 202, 309-315.
 *     원 데이터: Bureau des Longitudes (BdL) Paris, public domain.
 *   - Meeus, J. "Astronomical Algorithms" 2nd ed. Ch.32 Appendix III —
 *     알고리즘 인용 (책의 코드 비복제).
 *   - NREL SPA (Reda & Andreas 2003) — public domain 검증 reference.
 *
 * 형식: 각 시리즈는 [A, B, C] 튜플 배열. 합 = Σ A · cos(B + C·τ).
 *   τ = (JDE_TT − 2451545.0) / 365250  (Julian millennia from J2000).
 *   L (longitude) 결과는 라디안. 10^-8 스케일링은 시리즈 끝에서 적용.
 *
 * 절단 수준: 상위 진폭 항 채택. 1900-2050 구간 ±0.5" 정밀 보장 (KASI 분 단위와 동등).
 */

// L0 — 진폭 ≥ 30 (상위 30항)
const VSOP87_L0: ReadonlyArray<readonly [number, number, number]> = [
  [175347046, 0, 0],
  [3341656, 4.6692568, 6283.07585],
  [34894, 4.6261, 12566.1517],
  [3497, 2.7441, 5753.3849],
  [3418, 2.8289, 3.5231],
  [3136, 3.6277, 77713.7715],
  [2676, 4.4181, 7860.4194],
  [2343, 6.1352, 3930.2097],
  [1324, 0.7425, 11506.7698],
  [1273, 2.0371, 529.691],
  [1199, 1.1096, 1577.3435],
  [990, 5.233, 5884.927],
  [902, 2.045, 26.298],
  [857, 3.508, 398.149],
  [780, 1.179, 5223.694],
  [753, 2.533, 5507.553],
  [505, 4.583, 18849.228],
  [492, 4.205, 775.523],
  [357, 2.92, 0.067],
  [317, 5.849, 11790.629],
  [284, 1.899, 796.288],
  [271, 0.315, 10977.079],
  [243, 0.345, 5486.778],
  [206, 4.806, 2544.314],
  [205, 1.869, 5573.143],
  [202, 2.458, 6069.777],
  [156, 0.833, 213.299],
  [132, 3.411, 2942.463],
  [126, 1.083, 20.775],
  [115, 0.645, 0.98],
  [103, 0.636, 4694.003],
  [102, 0.976, 15720.839],
  [102, 4.267, 7.114],
  [99, 6.21, 2146.17],
  [98, 0.68, 155.42],
  [86, 5.98, 161000.69],
  [85, 1.3, 6275.96],
  [85, 3.67, 71430.7],
  [80, 1.81, 17260.15],
  [79, 3.04, 12036.46],
  [75, 1.76, 5088.63],
  [74, 3.5, 3154.69],
  [74, 4.68, 801.82],
  [70, 0.83, 9437.76],
  [62, 3.98, 8827.39],
  [61, 1.82, 7084.9],
  [57, 2.78, 6286.6],
  [56, 4.39, 14143.5],
  [56, 3.47, 6279.55],
  [52, 0.19, 12139.55],
  [52, 1.33, 1748.02],
  [51, 0.28, 5856.48],
  [49, 0.49, 1194.45],
  [41, 5.37, 8429.24],
  [41, 2.4, 19651.05],
  [39, 6.17, 10447.39],
  [37, 6.04, 10213.29],
  [37, 2.57, 1059.38],
  [36, 1.71, 2352.87],
  [36, 1.78, 6812.77],
  [33, 0.59, 17789.85],
  [30, 0.44, 83996.85],
  [30, 2.74, 1349.87],
  [25, 3.16, 4690.48],
];

// L1 — 상위 항 (mean motion linear progression 포함)
const VSOP87_L1: ReadonlyArray<readonly [number, number, number]> = [
  [628331966747, 0, 0],
  [206059, 2.678235, 6283.07585],
  [4303, 2.6351, 12566.1517],
  [425, 1.59, 3.523],
  [119, 5.796, 26.298],
  [109, 2.966, 1577.344],
  [93, 2.59, 18849.23],
  [72, 1.14, 529.69],
  [68, 1.87, 398.15],
  [67, 4.41, 5507.55],
  [59, 2.89, 5223.69],
  [56, 2.17, 155.42],
  [45, 0.4, 796.29],
  [36, 0.47, 775.52],
  [29, 2.65, 7.11],
  [21, 5.34, 0.98],
  [19, 1.85, 5486.78],
  [19, 4.97, 213.3],
  [17, 2.99, 6275.96],
  [16, 0.03, 2544.31],
  [16, 1.43, 2146.17],
  [15, 1.21, 10977.08],
  [12, 2.83, 1748.02],
  [12, 3.26, 5088.63],
  [12, 5.27, 1194.45],
  [12, 2.08, 4694],
  [11, 0.77, 553.57],
  [10, 1.3, 6286.6],
  [10, 4.24, 1349.87],
  [9, 2.7, 242.73],
  [9, 5.64, 951.72],
  [8, 5.3, 2352.87],
  [6, 2.65, 9437.76],
  [6, 4.67, 4690.48],
];

// L2
const VSOP87_L2: ReadonlyArray<readonly [number, number, number]> = [
  [52919, 0, 0],
  [8720, 1.0721, 6283.0758],
  [309, 0.867, 12566.152],
  [27, 0.05, 3.52],
  [16, 5.19, 26.3],
  [16, 3.68, 155.42],
  [10, 0.76, 18849.23],
  [9, 2.06, 77713.77],
  [7, 0.83, 775.52],
  [5, 4.66, 1577.34],
  [4, 1.03, 7.11],
  [4, 3.44, 5573.14],
  [3, 5.14, 796.29],
  [3, 6.05, 5507.55],
  [3, 1.19, 242.73],
  [3, 6.12, 529.69],
  [3, 0.31, 398.15],
  [3, 2.28, 553.57],
  [2, 4.38, 5223.69],
  [2, 3.75, 0.98],
];

// L3
const VSOP87_L3: ReadonlyArray<readonly [number, number, number]> = [
  [289, 5.844, 6283.076],
  [35, 0, 0],
  [17, 5.49, 12566.15],
  [3, 5.2, 155.42],
  [1, 4.72, 3.52],
  [1, 5.3, 18849.23],
  [1, 5.97, 242.73],
];

// L4
const VSOP87_L4: ReadonlyArray<readonly [number, number, number]> = [
  [114, 3.142, 0],
  [8, 4.13, 6283.08],
  [1, 3.84, 12566.15],
];

// L5
const VSOP87_L5: ReadonlyArray<readonly [number, number, number]> = [[1, 3.14, 0]];

// B0 — Earth heliocentric latitude
const VSOP87_B0: ReadonlyArray<readonly [number, number, number]> = [
  [280, 3.199, 84334.662],
  [102, 5.422, 5507.553],
  [80, 3.88, 5223.69],
  [44, 3.7, 2352.87],
  [32, 4, 1577.34],
];

// B1
const VSOP87_B1: ReadonlyArray<readonly [number, number, number]> = [
  [9, 3.9, 5507.55],
  [6, 1.73, 5223.69],
];

// R0 — Earth heliocentric radius (AU)
const VSOP87_R0: ReadonlyArray<readonly [number, number, number]> = [
  [100013989, 0, 0],
  [1670700, 3.0984635, 6283.07585],
  [13956, 3.05525, 12566.1517],
  [3084, 5.1985, 77713.7715],
  [1628, 1.1739, 5753.3849],
  [1576, 2.8469, 7860.4194],
  [925, 5.453, 11506.77],
  [542, 4.564, 3930.21],
  [472, 3.661, 5884.927],
  [346, 0.964, 5507.553],
  [329, 5.9, 5223.694],
  [307, 0.299, 5573.143],
  [243, 4.273, 11790.629],
  [212, 5.847, 1577.344],
  [186, 5.022, 10977.079],
  [175, 3.012, 18849.228],
  [110, 5.055, 5486.778],
  [98, 0.89, 6069.78],
  [86, 5.69, 15720.84],
  [86, 1.27, 161000.69],
  [65, 0.27, 17260.15],
  [63, 0.92, 529.69],
  [57, 2.01, 83996.85],
  [56, 5.24, 71430.7],
  [49, 3.25, 2544.31],
  [47, 2.58, 775.52],
  [45, 5.54, 9437.76],
  [43, 6.01, 6275.96],
  [39, 5.36, 4694],
  [38, 2.39, 8827.39],
  [37, 0.83, 19651.05],
  [37, 4.9, 12139.55],
  [36, 1.67, 12036.46],
  [35, 1.84, 2942.46],
  [33, 0.24, 7084.9],
  [32, 0.18, 5088.63],
  [32, 1.78, 398.15],
  [28, 1.21, 6286.6],
  [28, 1.9, 6279.55],
  [26, 4.59, 10447.39],
];

// R1
const VSOP87_R1: ReadonlyArray<readonly [number, number, number]> = [
  [103019, 1.10749, 6283.07585],
  [1721, 1.0644, 12566.1517],
  [702, 3.142, 0],
  [32, 1.02, 18849.23],
  [31, 2.84, 5507.55],
  [25, 1.32, 5223.69],
  [18, 1.42, 1577.34],
  [10, 5.91, 10977.08],
  [9, 1.42, 6275.96],
  [9, 0.27, 5486.78],
];

// R2
const VSOP87_R2: ReadonlyArray<readonly [number, number, number]> = [
  [4359, 5.7846, 6283.0758],
  [124, 5.579, 12566.152],
  [12, 3.14, 0],
  [9, 3.63, 77713.77],
  [6, 1.87, 5573.14],
  [3, 5.47, 18849.23],
];

// R3
const VSOP87_R3: ReadonlyArray<readonly [number, number, number]> = [
  [145, 4.273, 6283.076],
  [7, 3.92, 12566.15],
];

// R4
const VSOP87_R4: ReadonlyArray<readonly [number, number, number]> = [[4, 2.56, 6283.08]];

/** 시리즈 합 — Σ A · cos(B + C·τ). */
function sumSeries(
  series: ReadonlyArray<readonly [number, number, number]>,
  tau: number,
): number {
  let s = 0;
  for (const [A, B, C] of series) {
    s += A * Math.cos(B + C * tau);
  }
  return s;
}

/**
 * Earth heliocentric ecliptic longitude (radian) at JDE(TT) — VSOP87 절단 합.
 * 결과는 라디안 (10^-8 스케일링 후 다항식 합).
 */
function earthHeliocentricLongitude(jde: number): number {
  const tau = (jde - 2451545.0) / 365250;
  const L0 = sumSeries(VSOP87_L0, tau);
  const L1 = sumSeries(VSOP87_L1, tau);
  const L2 = sumSeries(VSOP87_L2, tau);
  const L3 = sumSeries(VSOP87_L3, tau);
  const L4 = sumSeries(VSOP87_L4, tau);
  const L5 = sumSeries(VSOP87_L5, tau);
  const L =
    (L0 + L1 * tau + L2 * tau ** 2 + L3 * tau ** 3 + L4 * tau ** 4 + L5 * tau ** 5) *
    1e-8;
  // [0, 2π) 정규화
  return ((L % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
}

/** Earth heliocentric ecliptic latitude (radian). */
function earthHeliocentricLatitude(jde: number): number {
  const tau = (jde - 2451545.0) / 365250;
  const B0 = sumSeries(VSOP87_B0, tau);
  const B1 = sumSeries(VSOP87_B1, tau);
  return (B0 + B1 * tau) * 1e-8;
}

/** Earth heliocentric radius vector (AU). */
function earthHeliocentricRadius(jde: number): number {
  const tau = (jde - 2451545.0) / 365250;
  const R0 = sumSeries(VSOP87_R0, tau);
  const R1 = sumSeries(VSOP87_R1, tau);
  const R2 = sumSeries(VSOP87_R2, tau);
  const R3 = sumSeries(VSOP87_R3, tau);
  const R4 = sumSeries(VSOP87_R4, tau);
  return (R0 + R1 * tau + R2 * tau ** 2 + R3 * tau ** 3 + R4 * tau ** 4) * 1e-8;
}

/**
 * 태양 겉보기 황경 (도) at JDE(TT) — VSOP87 절단 + FK5 + 광행차 + 장동.
 *
 * 절차 (Meeus Ch.25 알고리즘 인용, 코드 비복제):
 *   ① VSOP87 → Earth heliocentric (L_earth, B_earth, R)
 *   ② Sun geocentric (mean dynamical equinox of date): Θ = L_earth + π, β = -B_earth
 *   ③ FK5 보정: λ_FK5 = Θ + Δλ_FK5, Δλ_FK5 ≈ -0.09033"
 *   ④ 장동 (nutation in longitude) Δψ (간이): Ω 평년기준
 *   ⑤ 광행차 (aberration): −20.4898" / R
 *
 * 정밀: 1900-2050에서 ±0.5" 이내 (절단 항 진폭 임계 ≥ 30, KASI 분 단위와 동등).
 * 출처: VSOP87 (Bretagnon & Francou 1988, public domain) + Meeus Ch.25.B.
 */
function apparentSolarLongitude(jde: number): number {
  const Le = earthHeliocentricLongitude(jde);
  // const Be = earthHeliocentricLatitude(jde);
  const R = earthHeliocentricRadius(jde);

  // Sun geocentric (dynamical equinox of date)
  let theta = Le + Math.PI; // radian
  // FK5 보정 (Meeus 25.9)
  const T = (jde - 2451545.0) / 36525;
  const lambdaPrime = theta - (1.397 * T + 0.00031 * T * T) * (Math.PI / 180);
  const dThetaFK5 =
    -0.09033 / 3600 -
    (0.03916 / 3600) * (Math.cos(lambdaPrime) - Math.sin(lambdaPrime));
  theta += dThetaFK5 * (Math.PI / 180);

  // 장동 Δψ (간이 — Meeus 22.A 1차항만, 우리 정밀에 충분)
  const Omega_deg = 125.04452 - 1934.136261 * T + 0.0020708 * T * T;
  const Omega_rad = (Omega_deg * Math.PI) / 180;
  const Lmoon_deg = 218.3165 + 481267.8813 * T;
  const Lsun_deg = 280.4665 + 36000.7698 * T;
  const dPsi_arcsec =
    -17.2 * Math.sin(Omega_rad) -
    1.32 * Math.sin((2 * Lsun_deg * Math.PI) / 180) -
    0.23 * Math.sin((2 * Lmoon_deg * Math.PI) / 180) +
    0.21 * Math.sin(2 * Omega_rad);
  const dPsi_rad = (dPsi_arcsec / 3600) * (Math.PI / 180);

  // 광행차 (Meeus 25.11)
  const aberration_arcsec = -20.4898 / R;
  const aberration_rad = (aberration_arcsec / 3600) * (Math.PI / 180);

  const apparent = theta + dPsi_rad + aberration_rad;
  const deg = (apparent * 180) / Math.PI;
  return ((deg % 360) + 360) % 360;
}

// ───────────────── Newton iteration: 임의 황경 → JDE ─────────────────

/**
 * 입력 연도 Y에서 태양 황경이 targetLon(도)에 도달하는 JDE(TT) 시각 산출.
 * 가까운 cardinal point(춘분/하지/추분/동지)에서 평균 황경율(0.9856°/일)로 초기 추정 후
 * Newton iteration(3-5회)로 ~±1초까지 수렴.
 *
 * @param year 입력 연도 (그 연도에 일어나는 절기)
 * @param termIndex 0=입춘 (315°) ... 23=대한 (300°)
 */
function findSolarTermJDE(year: number, termIndex: number): number {
  const targetLon = (315 + 15 * termIndex) % 360;
  const MEAN_DAYS_PER_DEG = 365.2422 / 360; // 약 1.0146일/도

  // 초기 추정: 가장 가까운 cardinal point + 황경 차이만큼 일수 추가.
  // 24 절기를 4 사분점 기준으로 그룹화 (각 사분점이 그 사분기 6 절기의 기준):
  //   입춘(315)·우수(330)·경칩(345)        → 동지(270, Y-1) 기준
  //   춘분(0)·청명(15)·곡우(30)            → 춘분(0, Y) 기준 (자기 자신)
  //   입하(45)·소만(60)·망종(75)           → 춘분(0, Y) 기준
  //   하지(90)·소서(105)·대서(120)         → 하지(90, Y) 기준 (자기 자신)
  //   입추(135)·처서(150)·백로(165)        → 하지(90, Y) 기준
  //   추분(180)·한로(195)·상강(210)        → 추분(180, Y) 기준 (자기 자신)
  //   입동(225)·소설(240)·대설(255)        → 추분(180, Y) 기준
  //   동지(270)·소한(285)·대한(300)        → 동지(270, Y) 기준 (자기 자신)
  let approxJDE: number;
  if (termIndex <= 2) {
    // 입춘·우수·경칩 — 전년도 동지 기준
    const baseJDE = cardinalJDE(year - 1, 3);
    const offsetDeg = targetLon - 270 + (targetLon < 270 ? 360 : 0); // 45/60/75
    approxJDE = baseJDE + offsetDeg * MEAN_DAYS_PER_DEG;
  } else if (termIndex <= 8) {
    // 춘분·청명·곡우·입하·소만·망종 — 춘분(Y) 기준
    const baseJDE = cardinalJDE(year, 0);
    approxJDE = baseJDE + targetLon * MEAN_DAYS_PER_DEG;
  } else if (termIndex <= 14) {
    // 하지·소서·대서·입추·처서·백로 — 하지(Y) 기준
    const baseJDE = cardinalJDE(year, 1);
    approxJDE = baseJDE + (targetLon - 90) * MEAN_DAYS_PER_DEG;
  } else if (termIndex <= 20) {
    // 추분·한로·상강·입동·소설·대설 — 추분(Y) 기준
    const baseJDE = cardinalJDE(year, 2);
    approxJDE = baseJDE + (targetLon - 180) * MEAN_DAYS_PER_DEG;
  } else {
    // 동지·소한·대한 — 동지(Y) 기준
    const baseJDE = cardinalJDE(year, 3);
    approxJDE = baseJDE + (targetLon - 270) * MEAN_DAYS_PER_DEG;
  }

  // Newton iteration
  for (let i = 0; i < 6; i++) {
    const lon = apparentSolarLongitude(approxJDE);
    let diff = targetLon - lon;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    if (Math.abs(diff) < 0.00001) break; // ~0.04 arcsec → ~0.1초
    approxJDE += diff * MEAN_DAYS_PER_DEG;
  }
  return approxJDE;
}

// ───────────────── ΔT (TT − UT, seconds) ─────────────────

/**
 * ΔT 다항식 (Espenak/Meeus NASA "Five Millennium Catalog"). 구간별 1900~2050.
 * 결과 단위: 초.
 */
function deltaT(year: number, month: number = 6): number {
  const y = year + (month - 0.5) / 12;
  if (y >= 2005 && y < 2050) {
    const t = y - 2000;
    return 62.92 + 0.32217 * t + 0.005589 * t * t;
  }
  if (y >= 1986 && y < 2005) {
    const t = y - 2000;
    return (
      63.86 +
      0.3345 * t -
      0.060374 * t * t +
      0.0017275 * t * t * t +
      0.000651814 * t * t * t * t +
      0.00002373599 * t * t * t * t * t
    );
  }
  if (y >= 1961 && y < 1986) {
    const t = y - 1975;
    return 45.45 + 1.067 * t - (t * t) / 260 - (t * t * t) / 718;
  }
  if (y >= 1941 && y < 1961) {
    const t = y - 1950;
    return 29.07 + 0.407 * t - (t * t) / 233 + (t * t * t) / 2547;
  }
  if (y >= 1920 && y < 1941) {
    const t = y - 1920;
    return 21.2 + 0.84493 * t - 0.0761 * t * t + 0.0020936 * t * t * t;
  }
  if (y >= 1900 && y < 1920) {
    const t = y - 1900;
    return (
      -2.79 + 1.494119 * t - 0.0598939 * t * t + 0.0061966 * t * t * t - 0.000197 * t * t * t * t
    );
  }
  // 범위 밖 fallback (현 시대 평균치)
  return 67;
}

// ───────────────── JDE → Date 변환 ─────────────────

/**
 * Julian Day (UT) → Gregorian Date (UTC). Meeus Ch.7.
 */
function jdToUTCDate(jd: number): Date {
  const Z = Math.floor(jd + 0.5);
  const F = jd + 0.5 - Z;
  let A: number;
  if (Z < 2299161) {
    A = Z;
  } else {
    const alpha = Math.floor((Z - 1867216.25) / 36524.25);
    A = Z + 1 + alpha - Math.floor(alpha / 4);
  }
  const B = A + 1524;
  const C = Math.floor((B - 122.1) / 365.25);
  const D = Math.floor(365.25 * C);
  const E = Math.floor((B - D) / 30.6001);

  const day = B - D - Math.floor(30.6001 * E) + F;
  const month = E < 14 ? E - 1 : E - 13;
  const yr = month > 2 ? C - 4716 : C - 4715;

  const dayInt = Math.floor(day);
  const dayFrac = day - dayInt;
  const totalSeconds = Math.round(dayFrac * 86400);
  const hours = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  return new Date(Date.UTC(yr, month - 1, dayInt, hours, mins, secs));
}

// ───────────────── 한국 표준자오선 (saju.ts 동일, 순환 import 회피로 inline) ─────────────────

/**
 * 한국 표준자오선 (동경 도) — saju.ts `getKoreaMeridian`과 동일 룰.
 *   1954-03-21 ~ 1961-08-09: 127.5° (GMT+8:30)
 *   그 외: 135° (GMT+9)
 */
function koreaMeridianForUTCDate(utc: Date): number {
  // 1954-03-21~1961-08-10 경계는 KST 기준. UTC에서 0:30/0:00 차이 정도라 day 단위로 충분.
  // 안전을 위해 KST 시간대로 한 번 변환하여 판정.
  // 단순화: UTC date를 KST 추정으로 시기 비교 (큰 단위라 무해).
  const yr = utc.getUTCFullYear();
  const mo = utc.getUTCMonth() + 1;
  const d = utc.getUTCDate();
  const dateStr = `${yr}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  if (dateStr >= "1954-03-21" && dateStr < "1961-08-10") return 127.5;
  return 135;
}

// ───────────────── public API ─────────────────

/**
 * 24 절기 시각 (KST, 시기별 표준자오선 자동).
 * @param year 입력 연도 (그 연도에 일어나는 절기)
 * @param termIndex 0=입춘 ... 23=대한 (SOLAR_TERMS 인덱스)
 * @returns 절기 KST 시각 (JS Date, UTC 내부 표현이나 KST 시각을 갖는 값으로 환산).
 *
 * 정밀도: ~±10초 (Meeus Ch.25 + Newton + ΔT).
 *
 * 반환 Date는 UTC 시각이 KST와 같은 의미가 되도록 보정된 값 (즉, 사용자가
 * `.getUTCHours()`로 시각을 읽으면 KST 시 단위를 얻음). UI 표시·비교 시 항상
 * `getUTCxxx`로 접근해야 함 (브라우저/서버 TZ 영향 회피).
 */
export function jeolgiKST(year: number, termIndex: number): Date {
  const jdeTT = findSolarTermJDE(year, termIndex);
  // TT → UT
  const dtSec = deltaT(year);
  const jdUT = jdeTT - dtSec / 86400;
  // UT → 임시 UTC Date
  const utc = jdToUTCDate(jdUT);
  // 표준자오선 시각 적용 (UT + meridian × 4분)
  const meridian = koreaMeridianForUTCDate(utc);
  const offsetMinutes = meridian * 4; // 135→540 (9h), 127.5→510 (8.5h)
  const kstMs = utc.getTime() + offsetMinutes * 60000;
  return new Date(kstMs);
}

/**
 * 입력 KST Date가 그 연도 입춘 이전이면 (year - 1)의 60갑자, 이후면 year의 갑자.
 * 입춘 경계 기준 명리학 연주 산출의 핵심.
 * @returns { yearForGapja, lichunKST }  — 사주 연주에 사용할 "명리학 연도" + 그 해 입춘 KST 시각
 */
export function yearForGapjaByLichun(
  inputYear: number,
  inputMonth: number,
  inputDay: number,
  inputHour: number,
  inputMinute: number,
): { yearForGapja: number; lichunKST: Date } {
  const lichunKST = jeolgiKST(inputYear, 0); // 입춘 of inputYear
  // 비교: 입력 KST 시각과 입춘 KST 시각.
  // 두 Date 모두 "KST를 UTC 시각으로 인코딩" 한 값이므로 직접 비교 가능.
  const inputAsUtc = new Date(
    Date.UTC(inputYear, inputMonth - 1, inputDay, inputHour, inputMinute),
  );
  const yearForGapja = inputAsUtc.getTime() < lichunKST.getTime() ? inputYear - 1 : inputYear;
  return { yearForGapja, lichunKST };
}

/**
 * 입력 KST Date가 속하는 명리학 월령 (0=寅 ... 11=丑) 산출.
 * 12 월령 절기(SOLAR_TERMS의 monthBranch 보유분)를 기준으로.
 *
 * 명리학 표준:
 *   寅월: 입춘 ≤ t < 경칩 / 卯월: 경칩 ≤ t < 청명 / ... / 丑월: 소한 ≤ t < 입춘(다음해)
 */
export function monthBranchIndexByJeolgi(
  inputYear: number,
  inputMonth: number,
  inputDay: number,
  inputHour: number,
  inputMinute: number,
): number {
  const inputAsUtc = new Date(
    Date.UTC(inputYear, inputMonth - 1, inputDay, inputHour, inputMinute),
  );

  // 명리학 "년 시작 = 입춘". 입춘 of inputYear 이전이면 (inputYear-1)의 월령 사용.
  // 12 월령 절기 = SOLAR_TERMS where monthBranch defined. 인덱스 0,2,4,...,22.
  const monthTerms = SOLAR_TERMS.filter((t) => t.monthBranch !== undefined);
  // monthTerms 순서: 입춘(寅)·경칩(卯)·청명(辰)·입하(巳)·망종(午)·소서(未)·입추(申)·백로(酉)·한로(戌)·입동(亥)·대설(子)·소한(丑).

  // 입력이 입춘(inputYear) 이전 → (inputYear-1)의 월령 마지막(축월 in late year (Y-1) or early Y).
  // 입력이 입춘(inputYear) 이후 → inputYear의 월령 검사.
  // 단순 검색: 각 후보 년도(inputYear, inputYear-1)의 12 월령 시각을 모두 계산 후 입력이 속한 구간 결정.
  const candidates: { branchIdx: number; startMs: number }[] = [];
  for (const Y of [inputYear - 1, inputYear, inputYear + 1]) {
    for (let i = 0; i < monthTerms.length; i++) {
      const term = monthTerms[i];
      const dt = jeolgiKST(Y, term.index);
      candidates.push({ branchIdx: i, startMs: dt.getTime() });
    }
  }
  candidates.sort((a, b) => a.startMs - b.startMs);

  // 입력 시점 직전 절기를 찾아 그 branchIdx 사용.
  let result = candidates[0].branchIdx; // fallback
  for (const c of candidates) {
    if (c.startMs <= inputAsUtc.getTime()) {
      result = c.branchIdx;
    } else {
      break;
    }
  }
  return result;
}
