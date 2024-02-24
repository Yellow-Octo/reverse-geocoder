export function isLanguageCode(value: string): boolean {
  if (value === null) return false
  const languageCodePattern = /^[a-z]{2,3}(-[A-Z]{2}|-[A-Za-z]+)?$/;
  return languageCodePattern.test(value);
}
