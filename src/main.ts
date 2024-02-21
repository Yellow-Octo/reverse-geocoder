import {openWebFileStream} from "./helpers";
import csvParser from "csv-parser";
import {BatchStream} from "./streams/BatchStream";
import {AsyncWorkStream} from "./streams/AsyncWorkerStream";
import {Database, knexInstance} from "./Database";
import unzip from "unzip-stream";

const CITIES = "https://download.geonames.org/export/dump/cities15000.zip"
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
}

const whitelistCityColumns = new Set([
  "geonameid",
  "name",
  "asciiname",
  "alternatenames",
  "latitude",
  "longitude",
  "featureClass",
  "featureCode",
  "countryCode",
  "admin1Code",
  "admin2Code",
  "admin3Code",
  "admin4Code",
  "population",
  "modificationDate"
])

const BATCH_SIZE = 100

export class ReverseGeocoder {

  loadAdmin1Codes = async () => {
    const stream = await openWebFileStream(ADMIN_1)
    return new Promise<void>((resolve, reject) => {
      stream
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
    return new Promise((resolve, reject) => {
      stream
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
    const stream = await openWebFileStream(CITIES)
    stream
      .pipe(unzip.Parse())
      .pipe(csvParser({
        separator: "\t",
        headers: ["geonameid", "name", "asciiname", "alternatenames", "latitude", "longitude", "featureClass", "featureCode", "countryCode", "cc2", "admin1Code", "admin2Code", "admin3Code", "admin4Code", "population", "elevation", "dem", "timezone", "modificationDate"]
      }))
      .pipe(new BatchStream(50, {objectMode: true}))
      .pipe(new AsyncWorkStream<CityType[]>(async (batch) => {
        //delete any keys that aren't in the whitelist
        batch.forEach((city) => {
          Object.keys(city).forEach((key) => {
            if (!whitelistCityColumns.has(key)) {
              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
              // @ts-ignore
              delete city[key]
            }
          })
        })
        await knexInstance.batchInsert('cities', batch)
      }))
  }
}

(async () => {
  await Database.clearData()
  const reverseGeocoder = new ReverseGeocoder()
  await reverseGeocoder.loadAdmin1Codes()
  console.log("Admin1 codes loaded")
  await reverseGeocoder.loadAdmin2Codes()
  console.log("Admin2 codes loaded")
})()

