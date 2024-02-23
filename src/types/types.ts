export type AdminType = {
  code: string
  name: string
  nameAscii: string
  geonameId: string
}

export type CityType = {
  geonameid: string
  name: string
  asciiname: string
  latitude: string
  longitude: string
  featureClass: string
  featureCode: string
  countryCode: string
  admin1Code: string
  admin2Code: string
  admin3Code: string
  admin4Code: string
  population: string
  modificationDate: string
  point?: any
}

/**
 * alternateNameId   : the id of this alternate name, int
 * geonameid         : geonameId referring to id in table 'geoname', int
 * isolanguage       : iso 639 language code 2- or 3-characters, optionally followed by a hyphen and a countrycode for country specific variants (ex:zh-CN) or by a variant name (ex: zh-Hant); 4-characters 'post' for postal codes and 'iata','icao' and faac for airport codes, fr_1793 for French Revolution names,  abbr for abbreviation, link to a website (mostly to wikipedia), wkdt for the wikidataid, varchar(7)
 * alternate name    : alternate name or name variant, varchar(400)
 * isPreferredName   : '1', if this alternate name is an official/preferred name
 * isShortName       : '1', if this is a short name like 'California' for 'State of California'
 * isColloquial      : '1', if this alternate name is a colloquial or slang term. Example: 'Big Apple' for 'New York'.
 * isHistoric        : '1', if this alternate name is historic and was used in the past. Example 'Bombay' for 'Mumbai'.
 * from		  : from period when the name was used
 * to		  : to period when the name was used
 */
export type AlternateNameType = {
  alternateNameId: string
  geonameid: string
  isolanguage: string | "post" | "iata" | "icao" | "faac" | "fr_1793" | "abbr" | "link" | "wkdt"
  alternateName: string
  isPreferredName: "1" | ""
  isShortName: "1" | ""
  isColloquial: "1" | ""
  isHistoric: "1" | ""
  from?: string
  to?: string
}
