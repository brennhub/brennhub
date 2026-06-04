/**
 * 점수 영속 추상화. 미래 D1 도입 시 D1ScoreStorage를 새로 만들고
 * 싱글톤 export 한 줄(scoreStorage = new ...)만 교체 — 사용처는 인터페이스로 접근.
 *
 * supp-plan의 PersonalScheduleStorage 패턴 동일.
 */
export interface ScoreStorage {
  getHighScore(): Promise<number>;
  saveScore(score: number): Promise<void>;
}
