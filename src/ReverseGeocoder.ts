import {getWebOrFileStreamWithSize} from "./helpers/helpers";
import {BatchStream} from "./streams/BatchStream";
import {AsyncWorkStream} from "./streams/AsyncWorkerStream";
import {knexInstance} from "./Database";
import unzipper from "unzipper";
import {ProgressBarStream} from "./streams/ProgressBarStream";
import {Stream, Writable} from "node:stream";
import path from "path";
import {parse} from 'fast-csv';
import {AdminType, AlternateNameType, CityType} from "./types/types";
import {isLanguageCode} from "./helpers/isLanguageCode";
import * as fs from "fs";

const BATCH_SIZE = 500

const DEFAULT_OPTIONS = {
  // admin1Remote: "https://download.geonames.org/export/dump/admin1CodesASCII.txt",
  // admin2Remote: "https://download.geonames.org/export/dump/admin2Codes.txt",
  // citiesRemote: "https://download.geonames.org/export/dump/cities500.zip",
  // alternateNamesRemote: "https://download.geonames.org/export/dump/alternateNames.zip",
  admin1Local: path.join(__dirname, "/downloads/admin1CodesASCII.txt"),
  admin2Local: path.join(__dirname, "/downloads/admin2Codes.txt"),
  citiesLocal: path.join(__dirname, "/downloads/cities500.zip"),
  alternateNamesLocal: path.join(__dirname, "/downloads/alternateNames.zip"), //16M rows
}

type OptionsType = {
  admin1Remote?: string
  admin2Remote?: string
  citiesRemote?: string
  alternateNamesRemote?: string
  admin1Local?: string
  admin2Local?: string
  citiesLocal?: string
  alternateNamesLocal?: string
}

export class ReverseGeocoder {
  private readonly options: OptionsType

  constructor(options = {}) {
    this.options = {...DEFAULT_OPTIONS, ...options}
  }

  get = async (lat: number, lng: number, language?: string) => {
    const result = await knexInstance.raw(``)
  }

  run = async () => {
    const {
      admin1Local,
      admin2Local,
      citiesLocal,
      alternateNamesLocal,
      admin1Remote,
      admin2Remote,
      citiesRemote,
      alternateNamesRemote
    } = this.options

    const [admin1Stream, admin1Size] = await getWebOrFileStreamWithSize((admin1Local || admin1Remote)!)
    const [admin2Stream, admin2Size] = await getWebOrFileStreamWithSize((admin2Local || admin2Remote)!)
    const [citiesStream, citiesSize] = await getWebOrFileStreamWithSize((citiesLocal || citiesRemote)!)
    const [alternateNamesStream, alternateNamesSize] = await getWebOrFileStreamWithSize((alternateNamesLocal || alternateNamesRemote)!)

    // if (admin1Remote) {
    //   console.log("Downloading admin1")
    // } else {
    //   console.log("Using local admin1")
    // }
    // await this.loadAdmin1Codes(admin1Stream.pipe(new ProgressBarStream(admin1Size)))
    // if (admin2Remote) {
    //   console.log("Downloading admin2")
    // } else {
    //   console.log("Using local admin2")
    // }
    // await this.loadAdmin2Codes(admin2Stream.pipe(new ProgressBarStream(admin2Size)))
    // if (citiesRemote) {
    //   console.log("Downloading cities")
    // } else {
    //   console.log("Using local cities")
    // }
    // await this.loadCityZip(citiesStream.pipe(new ProgressBarStream(citiesSize)))

    if (alternateNamesRemote) {
      console.log("Downloading alternate names")
    } else {
      console.log("Using local alternate names")
    }
    await this.loadAlternateNamesZip(alternateNamesStream.pipe(new ProgressBarStream(alternateNamesSize)))
  }

  loadAdmin1Codes = async (csvStream: Stream) => {
    return new Promise<void>((resolve, reject) => {
      csvStream
        .pipe(parse({delimiter: "\t", headers: ["id", "name", "nameAscii", "geonameId"]}))
        .pipe(new BatchStream(BATCH_SIZE, {objectMode: true}))
        .pipe(new AsyncWorkStream<AdminType[]>(async (batch) => {
          await knexInstance.batchInsert('admin1', batch)
        }))
        .on('finish', resolve)
        .on('error', reject)
    })
  }

  loadAdmin2Codes = async (csvStream: Stream) => {
    return new Promise<void>((resolve, reject) => {
      csvStream
        .pipe(parse({headers: ["id", "name", "nameAscii", "geonameId"], delimiter: '\t'}))
        .pipe(new BatchStream(BATCH_SIZE, {objectMode: true}))
        .pipe(new AsyncWorkStream<AdminType[]>(async (batch) => {
          await knexInstance.batchInsert('admin2', batch)
        }))
        .on('finish', () => {
          resolve()
        })
        .on('error', reject)
    })
  }

  loadCityZip = async (zipStream: Stream) => {
    return new Promise((resolve, reject) => {
      zipStream
        .pipe(unzipper.ParseOne())
        .pipe(parse({
          delimiter: "\t",
          headers: ["geonameid", "name", "nameAscii", "alternatenames", "latitude", "longitude", "featureClass",
            "featureCode", "countryCode", "cc2", "admin1Code", "admin2Code", "admin3Code", "admin4Code", "population",
            "elevation", "dem", "timezone", "modificationDate"]
        }))
        .pipe(new BatchStream(5000, {objectMode: true}))
        .pipe(new AsyncWorkStream<CityType[]>(async (batch) => {
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

  testCSV = async () => {
    const fileSize = await fs.promises.stat(path.join(__dirname, "/downloads/alternateNames.zip")).then((stats) => stats.size)
    return new Promise((resolve, reject) => {
      fs.createReadStream(path.join(__dirname, "/downloads/alternateNames.zip"))
        .pipe(new ProgressBarStream(fileSize)) // 1s with just ProgressBar , highWaterMark doesn't make difference
        .pipe(unzipper.ParseOne(/alternateNames/)) //17s with unzip
        .pipe(parse({
          delimiter: "\t",
          headers: ["alternateNameId", "geonameid", "isolanguage", "alternateName", "isPreferredName", "isShortName",
            "isColloquial", "isHistoric"],
        })) //215 FUCKING SECONDS WTF with csv parsing
        .pipe(new Writable({
          objectMode: true,
          write: async (chunk, encoding, callback) => {
            callback()
          }
        }))
        .on('finish', resolve)
        .on('error', reject)
    })
  }
  loadAlternateNamesZip = async (zipStream: Stream) => {
    return new Promise((resolve, reject) => {
      zipStream
        .pipe(unzipper.ParseOne(/alternateNames/))
        .pipe(parse({
          delimiter: "\t",
          headers: ["alternateNameId", "geonameid", "isolanguage", "alternateName", "isPreferredName", "isShortName",
            "isColloquial", "isHistoric"],
        }))
        // .pipe(new BatchStream(BATCH_SIZE, {objectMode: true, highWaterMark: BATCH_SIZE * 2}))
        // .pipe(new AsyncWorkStream<AlternateNameType[]>(async (batch) => {
        //   const toInsert: any = []
        //   batch.forEach((name) => {
        //     if (!isLanguageCode(name.isolanguage)) return
        //     // filter out anything that is a historic name
        //     if (name.isHistoric === "1") return
        //
        //     toInsert.push({
        //       alternateNameId: name.alternateNameId,
        //       geonameid: name.geonameid,
        //       isolanguage: name.isolanguage,
        //       alternateName: name.alternateName,
        //       isPreferredName: name.isPreferredName === "1",
        //       isShortName: name.isShortName === "1",
        //       isColloquial: name.isColloquial === "1",
        //     })
        //   })
        //
        //   await knexInstance.batchInsert('alternateNames', toInsert)
        // }))
        .pipe(new Writable({
          objectMode: true,
          write: async (chunk, encoding, callback) => {
            callback()
          }
        }))
        .on('finish', resolve)
        .on('error', reject)
    })
  }
}

(async () => {
  const reverseGeocoder = new ReverseGeocoder()
  await reverseGeocoder.testCSV()
})()
