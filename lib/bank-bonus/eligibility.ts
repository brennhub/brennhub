/**
 * 가입 자격 제한 판정 — 자격 문장(공식 약관 > DoC)이 나를 막는가.
 *
 *  - 소속(고용주·학교·군인·단체 회원): 제한. 단, "anyone can join" / "open to everyone" / "membership is open to anyone" 류가 있으면 아님.
 *  - 지역(카운티·도시 나열, "live, work, worship or attend school in …"): 제한. 단, 내 지역(config.myAreaNames:
 *    Los Angeles · LA County · Gardena · Torrance)이 문장에 있으면 아님. 주 단위(California 전체)만 말하면 제한 아님(myState).
 *  - 둘 다 해당하면 둘 중 하나라도 막으면 제한 (예: "employees of X, or anyone who lives in Kern County").
 *    — 지역 쪽이 나를 받아 주면 소속 조건은 대안이라 제한 아님.
 * 사유(kind + 걸린 표현)를 돌려줘 태그 툴팁에 보인다.
 */

import { myAreaNames, myState } from "./config";
import type { RestrictionReason } from "./types";

const AFFILIATION = /\b(?:military|armed forces|active duty|veterans?|department of defense|dod|coast guard|select employer|employer (?:group|partner)s?|employees? of|sponsor(?:ing)? (?:company|organization)|alumni|students? of|school district|association members?|members of (?:the |an? )?(?:association|union|organization|church)|field of membership|union members?)\b/i;
const GEOGRAPHIC = /\b(?:count(?:y|ies)|cit(?:y|ies)|live,? work|lives?,? works?|live or work|work or worship|worship|attend school|reside(?:s|nts?)? (?:in|of)|residents? of)\b/i;
const ANYONE = /\b(?:anyone can join|open to (?:anyone|everyone|all)|membership is open to (?:anyone|everyone|all)|anyone (?:is eligible|may join|can become a member)|nationwide membership|no membership (?:requirements?|restrictions?))\b/i;

const STATE_NAMES: Record<string, string> = { CA: "California" };

function matched(re: RegExp, text: string): string {
  return text.match(re)?.[0] ?? "";
}

export function restrictionOf(text: string | null | undefined): RestrictionReason | null {
  if (!text) return null;
  const t = text;
  const lower = t.toLowerCase();
  const mine = myAreaNames.some((n) => lower.includes(n.toLowerCase()));
  const geo = GEOGRAPHIC.test(t);
  const aff = AFFILIATION.test(t);
  const anyone = ANYONE.test(t);

  if (geo) {
    // 카운티·도시 나열이 없고 주(California)만 말하면 — 주 단위는 나를 받는다.
    const listsLocal = /\b(?:count(?:y|ies)|cit(?:y|ies))\b/i.test(t) || /\b(?:in|of)\s+[A-Z][a-z]+(?:,\s*[A-Z][a-z]+)+/.test(t);
    const stateOnly = !listsLocal && new RegExp(`\\b(?:${STATE_NAMES[myState] ?? myState}|${myState})\\b`).test(t);
    if (mine || stateOnly) return null; // 지역 조건이 나를 받아 주면 소속 조건은 대안 — 제한 아님.
    return { kind: "geo", matched: matched(GEOGRAPHIC, t) };
  }
  if (aff && !anyone) return { kind: "affiliation", matched: matched(AFFILIATION, t) };
  return null;
}
