import {downloadFile, getWebOrFileStreamWithSize} from "./helpers/helpers";
import {BatchStream} from "./streams/BatchStream";
import {AsyncWorkStream} from "./streams/AsyncWorkerStream";
import {knexInstance} from "./Database";
import unzipper from "unzipper";
import {ProgressBarStream} from "./streams/ProgressBarStream";
import {Readable, Stream} from "node:stream";
import path from "path";
import {parse} from 'fast-csv';
import {AdminType, AlternateNameType, CityInsertType, CityType} from "./types/types";
import {isLanguageCode} from "./helpers/isLanguageCode";
import {unzipSpecificFile} from "./helpers/unzipper";
import * as fs from "fs";
import {ALTERNATE_HEADERS} from "./helpers/constants";

const BATCH_SIZE = 400

const DEFAULT_OPTIONS = {
  admin1Remote: "https://download.geonames.org/export/dump/admin1CodesASCII.txt",
  admin2Remote: "https://download.geonames.org/export/dump/admin2Codes.txt",
  citiesRemote: "https://download.geonames.org/export/dump/cities500.zip",
  alternateNamesRemote: "https://download.geonames.org/export/dump/alternateNames.zip",
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

export class Seeder {
  private readonly options: OptionsType

  constructor(options = {}) {
    this.options = {...DEFAULT_OPTIONS, ...options}
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

    if (admin1Remote) {
      console.log("Streaming admin1")
    } else if (admin1Local) {
      console.log("Using local provided")
    } else {
      throw new Error("No admin1 source provided")
    }
    await this.loadAdmin1Codes(admin1Stream.pipe(new ProgressBarStream(admin1Size)))
    if (admin2Remote) {
      console.log("Streaming admin2")
    } else if (admin2Local) {
      console.log("Using local admin2")
    } else {
      throw new Error("No admin2 source provided")
    }
    await this.loadAdmin2Codes(admin2Stream.pipe(new ProgressBarStream(admin2Size)))
    if (citiesRemote) {
      console.log("Downloading cities")
    } else if (citiesLocal) {
      console.log("Using local cities")
    } else {
      throw new Error("No cities source provided")
    }
    console.log("Inserting cities")
    await this.loadCityZip(citiesStream.pipe(new ProgressBarStream(citiesSize)))

    if (alternateNamesRemote || alternateNamesLocal) {
      await this.downloadAlternateNames()
    }
    console.log("Seeding complete!")
  }

  async downloadAlternateNames() {
    const {alternateNamesLocal, alternateNamesRemote} = this.options

    const defaultZipLocation = path.join(__dirname, "/downloads/alternateNames.zip")
    if (alternateNamesRemote) {
      console.log("Downloading alternate names")
      await downloadFile(alternateNamesRemote, defaultZipLocation)
    } else if (alternateNamesLocal) {
      console.log("Using local alternate names")
    } else {
      throw new Error("No alternate names source provided")
    }
    const localAlternateNamesPath = path.join(__dirname, "/downloads/alternateNames.txt")
    const zippedFilePath = alternateNamesLocal || defaultZipLocation

    console.log("Unzipping alternate names")
    await unzipSpecificFile(zippedFilePath, "alternateNames.txt", localAlternateNamesPath)
    console.log("Unzipping complete")
    await fs.promises.unlink(zippedFilePath)
    const [localStream, size] = await getWebOrFileStreamWithSize(localAlternateNamesPath)
    await this.loadAlternateNamesSlow(localStream.pipe(new ProgressBarStream(size)))
    await fs.promises.unlink(localAlternateNamesPath)
  }

  loadAdmin1Codes = async (csvStream: Stream) => {
    return new Promise<void>((resolve, reject) => {
      csvStream
        .pipe(parse({delimiter: "\t", headers: ["id", "name", "nameAscii", "geoNameId"]}))
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
        .pipe(parse({headers: ["id", "name", "nameAscii", "geoNameId"], delimiter: '\t'}))
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
        .pipe(new BatchStream(BATCH_SIZE, {objectMode: true}))
        .pipe(new AsyncWorkStream<CityType[]>(async (batch) => {
          const toInsert: CityInsertType[] = []
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
              point: knexInstance.raw(`ST_MakePoint(?, ?)`, [lngFloat, latFloat]),
              modificationDate: new Date(city.modificationDate).toISOString()
            })
          })
          await knexInstance.batchInsert('cities', toInsert)
        }))
        .on('finish', resolve)
        .on('error', reject)
    })
  }

  // 7_172_213 rows run 1, 7_172_213 run 2 SAME =)
  loadAlternateNamesSlow = async (stream: Readable) => {
    return new Promise((resolve, reject) => {
      stream
        .pipe(parse({
          delimiter: "\t",
          headers: ALTERNATE_HEADERS,
        }))
        .pipe(new BatchStream(BATCH_SIZE, {objectMode: true}))
        .pipe(new AsyncWorkStream<AlternateNameType[]>(async (batch) => {
          const toInsert: {
            geoNameId: string,
            alternateName: string,
            isoLanguage: string,
            isPreferredName: boolean,
            isShortName: boolean
          }[] = []
          batch.forEach((row) => {
            if (isLanguageCode(row.isolanguage)) {
              toInsert.push({
                geoNameId: row.geonameid,
                alternateName: row.alternateName,
                isoLanguage: row.isolanguage,
                isPreferredName: row.isPreferredName === "1",
                isShortName: row.isShortName === "1",
              })
            }
          })
          await knexInstance.batchInsert('alternateNames', toInsert)
        }))
        .on('finish', resolve)
        .on('error', reject)
    })
  }
}
