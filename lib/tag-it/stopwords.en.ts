/**
 * 영어 표준 불용어 (기획서 §3.4 / C-3 1층).
 * 공개 표준 리스트 기반 ~120개. 단어만 추가하면 되도록 평면 배열.
 */

export const EN_STOPWORDS: ReadonlySet<string> = new Set([
  "a", "an", "the",
  "and", "or", "but", "nor", "so", "yet", "for",
  "if", "then", "else", "when", "while", "as", "because", "since", "though", "although",
  "i", "me", "my", "mine", "we", "us", "our", "ours",
  "you", "your", "yours", "he", "him", "his", "she", "her", "hers",
  "it", "its", "they", "them", "their", "theirs",
  "this", "that", "these", "those", "who", "whom", "whose", "which", "what",
  "is", "am", "are", "was", "were", "be", "been", "being",
  "have", "has", "had", "having", "do", "does", "did", "doing", "done",
  "will", "would", "shall", "should", "can", "could", "may", "might", "must",
  "of", "in", "on", "at", "to", "from", "by", "with", "about", "against",
  "between", "into", "through", "during", "before", "after", "above", "below",
  "up", "down", "out", "off", "over", "under", "again", "further",
  "here", "there", "all", "any", "both", "each", "few", "more", "most",
  "other", "some", "such", "no", "not", "only", "own", "same", "than", "too", "very",
  "just", "now", "also", "however", "therefore", "thus", "hence",
  "per", "via", "etc", "vs",
  "s", "t", "re", "ve", "ll", "d", "m",
]);
