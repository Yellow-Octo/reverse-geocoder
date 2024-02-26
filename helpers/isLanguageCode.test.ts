import {isLanguageCode} from "./isLanguageCode";

it("should return true if the string is a valid language code", () => {
  expect(isLanguageCode("en")).toBe(true)
  expect(isLanguageCode("en-US")).toBe(true)
  expect(isLanguageCode("zh-Hant")).toBe(true)
})

it ("should return false for all the other weird values that geonames stuffs in the language field", () => {
  expect(isLanguageCode("")).toBe(false)
  expect(isLanguageCode("post")).toBe(false)
  expect(isLanguageCode("iata")).toBe(false)
  expect(isLanguageCode("icao")).toBe(false)
  expect(isLanguageCode("faac")).toBe(false)
  expect(isLanguageCode("abbr")).toBe(false)
})
