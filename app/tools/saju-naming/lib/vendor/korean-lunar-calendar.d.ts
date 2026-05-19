interface CalendarData {
    year: number;
    month: number;
    day: number;
    intercalation?: boolean;
}
interface GapJaData {
    year: string;
    month: string;
    day: string;
    intercalation?: string;
}
declare class KoreanLunarCalendar {
    private solarCalendar;
    private lunarCalendar;
    private gapjaYearInx;
    private gapjaMonthInx;
    private gapjaDayInx;
    constructor();
    private getLunarData;
    private getLunarIntercalationMonth;
    private getLunarDays;
    private getLunarDays2;
    private getLunarDaysBeforeBaseYear;
    private getLunarDaysBeforeBaseMonth;
    private getLunarAbsDays;
    private isSolarIntercalationYear;
    private getSolarDays;
    private getSolarDays2;
    private getSolarDayBeforeBaseYear;
    private getSolarDaysBeforeBaseMonth;
    private getSolarAbsDays;
    private setSolarDateByLunarDate;
    private setLunarDateBySolarDate;
    private checkValidDate;
    setLunarDate(lunarYear: number, lunarMonth: number, lunarDay: number, isIntercalation: boolean): boolean;
    setSolarDate(solarYear: number, solarMonth: number, solarDay: number): boolean;
    private setGapJa;
    getGapJaIndex(): {
        cheongan: {
            year: number;
            month: number;
            day: number;
        };
        ganji: {
            year: number;
            month: number;
            day: number;
        };
    };
    getGapja(IsChinese?: boolean): GapJaData;
    getKoreanGapja(): GapJaData;
    getChineseGapja(): GapJaData;
    getLunarCalendar(): CalendarData;
    getSolarCalendar(): CalendarData;
}

// brennhub 변형: KoreanLunarCalendar as default → named. README + CHANGELOG 0.5.3 참고.
export { CalendarData, GapJaData, KoreanLunarCalendar };
