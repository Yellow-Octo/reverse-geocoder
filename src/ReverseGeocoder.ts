import {openWebFileStream} from "./helpers/helpers";
import csvParser from "csv-parser";
import {BatchStream} from "./streams/BatchStream";
import {AsyncWorkStream} from "./streams/AsyncWorkerStream";
import {knexInstance} from "./Database";
import unzipper from "unzipper";
import {CITY_SIZE} from "./enums/CITY_SIZE";
import {ProgressBarStream} from "./streams/ProgressBarStream";

const CITIES_500 = "https://download.geonames.org/export/dump/cities500.zip"
const CITIES_1000 = "https://download.geonames.org/export/dump/cities1000.zip"
const CITIES_5000 = "https://download.geonames.org/export/dump/cities5000.zip"
const CITIES_15000 = "https://download.geonames.org/export/dump/cities15000.zip"

const ADMIN_1 = "https://download.geonames.org/export/dump/admin1CodesASCII.txt"
const ADMIN_2 = "https://download.geonames.org/export/dump/admin2Codes.txt"

type AdminType = {
  code: string
  name: string
  nameAscii: string
  geonameId: string
}

type CityType = {
  geonameid: string
  name: string
  asciiname: string
  alternatenames: string
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

const BATCH_SIZE = 100

const DEFAULT_OPTIONS = {
  smallestCitySize: CITY_SIZE.c500,
}

export class ReverseGeocoder {
  private smallestCitySize: number;

  constructor(options = {}) {
    const combinedOptions = {...DEFAULT_OPTIONS, ...options}
    this.smallestCitySize = combinedOptions.smallestCitySize
  }

  static get = async (lat: number, lng: number, language: string | null) => {
    const result = await knexInstance.raw(`
    SELECT
      cities.name as city,
      cities.latitude,
      cities.longitude,
      admin1.name as admin1,
      admin2.name as admin2
    FROM cities
    JOIN admin1 ON cities.admin1Code = admin1.code
    JOIN admin2 ON cities.admin2Code = admin2.code
    WHERE PtDistWithin(MakePoint(${lng}, ${lat}), MakePoint(cities.longitude, cities.latitude), 1000)
    LIMIT 1
  `)
    return result.rows[0]
  }
  loadAdmin1Codes = async () => {
    const stream = await openWebFileStream(ADMIN_1)
    const totalLength = parseInt(stream.headers["content-length"]!)

    return new Promise<void>((resolve, reject) => {
      stream
        .pipe(new ProgressBarStream(totalLength))
        .pipe(csvParser({separator: "\t", headers: ["id", "name", "nameAscii", "geonameId"]}))
        .pipe(new BatchStream(BATCH_SIZE, {objectMode: true}))
        .pipe(new AsyncWorkStream<AdminType[]>(async (batch) => {
          await knexInstance.batchInsert('admin1', batch)
        }))
        .on('finish', resolve)
        .on('error', reject)
    })
  }

  loadAdmin2Codes = async () => {
    const stream = await openWebFileStream(ADMIN_2)
    const totalLength = parseInt(stream.headers["content-length"]!)

    return new Promise((resolve, reject) => {
      stream
        .pipe(new ProgressBarStream(totalLength))
        .pipe(csvParser({separator: "\t", headers: ["id", "name", "nameAscii", "geonameId"]}))
        .pipe(new BatchStream(BATCH_SIZE, {objectMode: true}))
        .pipe(new AsyncWorkStream<AdminType[]>(async (batch) => {
          await knexInstance.batchInsert('admin2', batch)
        }))
        .on('finish', resolve)
        .on('error', reject)
    })
  }

  loadCities = async () => {
    const {smallestCitySize} = this
    if (smallestCitySize <= CITY_SIZE.c500) {
      console.log("loading cities 500")
      await this.loadCityZip(CITIES_500)
    } else if (smallestCitySize <= CITY_SIZE.c1000) {
      console.log("loading cities 1000")
      await this.loadCityZip(CITIES_1000)
    } else if (smallestCitySize <= CITY_SIZE.c5000) {
      console.log("loading cities 5000")
      await this.loadCityZip(CITIES_5000)
    } else if (smallestCitySize <= CITY_SIZE.c15000) {
      console.log("loading cities 15000")
      await this.loadCityZip(CITIES_15000)
    }
  }

  loadCityZip = async (url: string) => {
    const stream = await openWebFileStream(url)
    const totalLength = parseInt(stream.headers["content-length"]!)

    return new Promise((resolve, reject) => {
      stream
        .pipe(new ProgressBarStream(totalLength))
        .pipe(unzipper.ParseOne())
        .pipe(csvParser({
          separator: "\t",
          headers: ["geonameid", "name", "nameAscii", "alternatenames", "latitude", "longitude", "featureClass", "featureCode", "countryCode", "cc2", "admin1Code", "admin2Code", "admin3Code", "admin4Code", "population", "elevation", "dem", "timezone", "modificationDate"]
        }))
        .pipe(new BatchStream(BATCH_SIZE, {objectMode: true}))
        .pipe(new AsyncWorkStream<CityType[]>(async (batch) => {
          //delete any keys that aren't in the whitelist
          const toInsert: any = []
          batch.forEach((city) => {
            const latFloat = parseFloat(city.latitude)
            const lngFloat = parseFloat(city.longitude)
            if (isNaN(latFloat) || isNaN(lngFloat)) {
              return
            }
            toInsert.push({
              geoNameId: city.geonameid,
              name: city.name,
              alternateNames: city.alternatenames,
              countryCode: city.countryCode,
              admin1Code: city.admin1Code,
              admin2Code: city.admin2Code,
              point: knexInstance.raw(`MakePoint(?, ?, 4326)`, [lngFloat, latFloat]),
              modificationDate: new Date(city.modificationDate).toISOString()
            })
          })
          await knexInstance.batchInsert('cities', toInsert)
        }))
        .on('finish', resolve)
        .on('error', reject)
    })
  }
}

(async () => {
  const reverseGeocoder = new ReverseGeocoder({smallestCitySize: CITY_SIZE.c500})
  console.log("loading admin1 codes")
  await reverseGeocoder.loadAdmin1Codes()

  console.log("loading admin2 codes")
  await reverseGeocoder.loadAdmin2Codes()

  console.log("loading cities")
  await reverseGeocoder.loadCities()
})()

