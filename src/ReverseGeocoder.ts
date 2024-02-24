import {downloadFile, getWebOrFileStreamWithSize} from "./helpers/helpers";
import {BatchStream} from "./streams/BatchStream";
import {AsyncWorkStream} from "./streams/AsyncWorkerStream";
import {knexInstance} from "./Database";
import unzipper from "unzipper";
import {ProgressBarStream} from "./streams/ProgressBarStream";
import {Readable, Stream} from "node:stream";
import path from "path";
import {parse} from 'fast-csv';
import {AdminType, CityType} from "./types/types";
import {isLanguageCode} from "./helpers/isLanguageCode";
import {inferSchema, initParser, Parser} from "udsv";
import {unzipSpecificFile} from "./helpers/unzipper";

const BATCH_SIZE = 400

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

    if (admin1Remote) {
      console.log("Downloading admin1")
    } else if (admin1Local) {
      console.log("Using local provided")
    } else {
      throw new Error("No admin1 source provided")
    }
    await this.loadAdmin1Codes(admin1Stream.pipe(new ProgressBarStream(admin1Size)))
    if (admin2Remote) {
      console.log("Downloading admin2")
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
    await this.loadCityZip(citiesStream.pipe(new ProgressBarStream(citiesSize)))

    if (alternateNamesRemote) {
      console.log("Downloading alternate names")
    } else if (alternateNamesLocal) {
      console.log("Using local alternate names")
    } else {
      throw new Error("No alternate names source provided")
    }
    const alternateNamesPath = path.join(__dirname, "/downloads/alternateNames.txt")

    const zippedFilePath = (alternateNamesRemote || alternateNamesLocal)!
    if (alternateNamesRemote) {
      console.log("Downloading alternate names")
      const downloadPath = "./downloads/alternateNames.zip"
      await downloadFile(alternateNamesRemote, downloadPath)

    } else if (alternateNamesLocal) {
      console.log("Using local alternate names")
    }
    await unzipSpecificFile(zippedFilePath, "alternateNames.txt", alternateNamesPath)
    const [alternateNamesStream, size] = await getWebOrFileStreamWithSize(alternateNamesPath)
    await this.loadAlternateNames(alternateNamesStream.pipe(new ProgressBarStream(size)))
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
        .pipe(new BatchStream(BATCH_SIZE, {objectMode: true}))
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

  loadAlternateNames = async (stream: Readable) => {
    async function insertAlternateNames(toInsert: any[]) {
      const LIMIT_PER_INSERT = 400
      for (let i = 0; i < toInsert.length; i += LIMIT_PER_INSERT) {
        await knexInstance.batchInsert('alternateNames', toInsert.slice(i, i + LIMIT_PER_INSERT))
      }
    }

    let toInsert: any[] = []
    let parser: Parser;
    for await (const buffer of stream) {
      const strChunk = buffer.toString();
      parser ??= initParser(inferSchema(strChunk));
      parser.chunk<string[]>(strChunk, parser.typedArrs, (batch) => {
        batch.forEach((row) => {
          const [_alternateNameId, geonameid, isolanguage, alternateName, isPreferredName, isShortName, _isColloquial, _isHistoric] = row
          if (isLanguageCode(isolanguage)) {
            toInsert.push({
              geoNameId: geonameid,
              alternateName,
              isoLanguage: isolanguage,
              isPreferredName: isPreferredName === "1",
              isShortName: isShortName === "1",
            })
          }
        })

        stream.pause()
        insertAlternateNames(toInsert).then(() => {
          stream.resume()
          toInsert = []
        })
      });
    }
    parser!.end();
  }
}

(async () => {
  const reverseGeocoder = new ReverseGeocoder()
  await reverseGeocoder.run()
  console.log("All data loaded into Database")
})()
