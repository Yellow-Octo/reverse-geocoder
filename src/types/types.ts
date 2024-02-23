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
