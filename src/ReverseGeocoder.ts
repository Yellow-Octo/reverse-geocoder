import {downloadFile, getWebOrFileStreamWithSize, kmToDegrees} from "./helpers/helpers";
import {BatchStream} from "./streams/BatchStream";
import {AsyncWorkStream} from "./streams/AsyncWorkerStream";
import {knexInstance} from "./Database";
import unzipper from "unzipper";
import {ProgressBarStream} from "./streams/ProgressBarStream";
import {Readable, Stream} from "node:stream";
import path from "path";
import {parse} from 'fast-csv';
import {AdminType, AlternateNameInsertType, AlternateNameType, CityInsertType, CityType} from "./types/types";
import {isLanguageCode} from "./helpers/isLanguageCode";
import {inferSchema, initParser, Parser} from "udsv";
import {unzipSpecificFile} from "./helpers/unzipper";
import * as fs from "fs";

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

export class ReverseGeocoder {
  private readonly options: OptionsType

  constructor(options = {}) {
    this.options = {...DEFAULT_OPTIONS, ...options}
  }

  searchWithLanguage = async (lat: number, lng: number, languageCode: string, exact: boolean) => {
    if (!isLanguageCode(languageCode)) throw new Error("Invalid language code" + languageCode)
    const result = await this.searchRepeatedly(lat, lng)
    if (result === null) {
      return null
    }

    return {
      ...result,
      alternateNames: await this.getAlternateNames(result.geoNameId, languageCode, exact)
    }
  }

  getAlternateNames = async (geoNameId: string, languageCode?: string, exact?: boolean): Promise<AlternateNameInsertType[]> => {
    if (languageCode !== undefined && !isLanguageCode(languageCode)) throw new Error("Invalid language code" + languageCode)
    const query = knexInstance
      .select<AlternateNameInsertType[]>([
        'alternateNames.isoLanguage',
        'alternateNames.alternateName',
        'alternateNames.isPreferredName',
        'alternateNames.isShortName'
      ])
      .from('alternateNames')
      .where('alternateNames.geoNameId', geoNameId)
    if (languageCode) {
      if (exact) {
        query.andWhere('alternateNames.isoLanguage', languageCode)
      } else {
        query.andWhereLike('alternateNames.isoLanguage', languageCode + "%")
      }
    }
    return query;
  }

  /**
   * Since spatialite can't just let us do a KNN without the mandatory radius parameter, we repeatedly query
   * and expand the search radius until we find a result or we reach a maximum radius
   * @param lat
   * @param lng
   */
  searchRepeatedly = async (lat: number, lng: number) => {
    let searchRadiusKM = 20
    let result: CityInsertType | null = null
    while (result === null && searchRadiusKM <= 320) {
      result = await this.search(lat, lng, searchRadiusKM)
      searchRadiusKM *= 2
    }
    return result
  }

  search = async (lat: number, lng: number, radiusKM: number) => {
    const degrees = kmToDegrees(radiusKM)
    const result: CityInsertType[] = await knexInstance.raw(`SELECT cities.name           AS name,
       cities.countryCode    AS country,
       cities.geoNameId      AS geoNameId,
       admin1.name           AS admin1,
       admin2.name           AS admin2
FROM (SELECT *
      FROM KNN2
      WHERE f_table_name = 'cities'
        AND ref_geometry = MakePoint(?, ?, 4326)
        AND radius = ?
        AND max_items = 1) AS KNN
         JOIN cities ON cities.rowid = KNN.fid
         LEFT JOIN admin1 ON cities.countryCode || '.' || cities.admin1Code = admin1.id
         LEFT JOIN admin2 ON cities.countryCode || '.' || cities.admin1Code || '.' || cities.admin2Code = admin2.id;`, [lng, lat, degrees])
    return result[0] || null
  }

  downloadData = async () => {
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

    if(alternateNamesRemote || alternateNamesLocal){
      await this.downloadAlternateNames()
    }
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
    await fs.promises.unlink(zippedFilePath)
    const [localStream, size] = await getWebOrFileStreamWithSize(localAlternateNamesPath)
    await this.loadAlternateNamesSlow(localStream.pipe(new ProgressBarStream(size)))
    await fs.promises.unlink(localAlternateNamesPath)
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

  // 7_172_213 rows run 1, 7_172_213 run 2 SAME =)
  loadAlternateNamesSlow = async (stream: Readable) => {
    return new Promise((resolve, reject) => {
      stream
        .pipe(parse({
          delimiter: "\t",
          headers: ["alternateNameId", "geonameid", "isolanguage", "alternateName", "isPreferredName", "isShortName",
            "isColloquial", "isHistoric"],
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
  //1086800 rows run 1 // 1055200 run 2
  loadAlternateNames = async (stream: Readable) => {
    async function insertAlternateNames(toInsert: AlternateNameInsertType[]) {
      const LIMIT_PER_INSERT = 400
      for (let i = 0; i < toInsert.length; i += LIMIT_PER_INSERT) {
        await knexInstance.batchInsert('alternateNames', toInsert.slice(i, i + LIMIT_PER_INSERT))
      }
    }

    let toInsert: AlternateNameInsertType[] = []
    let parser: Parser;
    for await (const buffer of stream) {
      const strChunk = buffer.toString();
      parser ??= initParser(inferSchema(strChunk));
      parser.chunk<string[]>(strChunk, parser.typedArrs, (batch) => {
        batch.forEach((row) => {
          const [_alternateNameId, geoNameId, isoLanguage, alternateName, isPreferredName, isShortName, _isColloquial, _isHistoric] = row
          if (isLanguageCode(isoLanguage)) {
            toInsert.push({
              geoNameId: geoNameId,
              alternateName,
              isoLanguage: isoLanguage,
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
