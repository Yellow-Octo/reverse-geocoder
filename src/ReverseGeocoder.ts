import {getWebOrFileStreamWithSize} from "./helpers/helpers";
import {BatchStream} from "./streams/BatchStream";
import {AsyncWorkStream} from "./streams/AsyncWorkerStream";
import {knexInstance} from "./Database";
import unzipper from "unzipper";
import {ProgressBarStream} from "./streams/ProgressBarStream";
import {Stream} from "node:stream";
import path from "path";
import {parse} from 'fast-csv';
import {AdminType, CityType} from "./types/types";

const BATCH_SIZE = 500

const DEFAULT_OPTIONS = {
  // admin1Remote: "https://download.geonames.org/export/dump/admin1CodesASCII.txt",
  // admin2Remote: "https://download.geonames.org/export/dump/admin2Codes.txt",
  // citiesRemote: "https://download.geonames.org/export/dump/cities500.zip",
  admin1Local: path.join(__dirname, "/downloads/admin1CodesASCII.txt"), // 3,885 real lines,  3,885 inserted
  admin2Local: path.join(__dirname, "/downloads/admin2Codes.txt"), //45784 real lines , 34,382 when inserted
  citiesLocal: path.join(__dirname, "/downloads/cities500.zip"), //
}

type OptionsType = {
  admin1Remote?: string
  admin2Remote?: string
  citiesRemote?: string
  admin1Local?: string
  admin2Local?: string
  citiesLocal?: string
}

export class ReverseGeocoder {
  private readonly options: OptionsType

  constructor(options = {}) {
    this.options = {...DEFAULT_OPTIONS, ...options}
  }

  run = async () => {
    const {admin1Local, admin2Local, citiesLocal, admin1Remote, admin2Remote, citiesRemote} = this.options

    const [admin1Stream, admin1Size] = await getWebOrFileStreamWithSize((admin1Local || admin1Remote)!)
    const [admin2Stream, admin2Size] = await getWebOrFileStreamWithSize((admin2Local || admin2Remote)!)
    const [citiesStream, citiesSize] = await getWebOrFileStreamWithSize((citiesLocal || citiesRemote)!)

    if (admin1Remote) {
      console.log("Downloading admin1")
    } else {
      console.log("Using local admin1")
    }
    await this.loadAdmin1Codes(admin1Stream.pipe(new ProgressBarStream(admin1Size)))
    if (admin2Remote) {
      console.log("Downloading admin2")
    } else {
      console.log("Using local admin2")
    }
    await this.loadAdmin2Codes(admin2Stream.pipe(new ProgressBarStream(admin2Size)))
    if (citiesRemote) {
      console.log("Downloading cities")
    } else {
      console.log("Using local cities")
    }
    await this.loadCityZip(citiesStream.pipe(new ProgressBarStream(citiesSize)))
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
  const reverseGeocoder = new ReverseGeocoder()
  await reverseGeocoder.run()
  console.log("done!")
})()

