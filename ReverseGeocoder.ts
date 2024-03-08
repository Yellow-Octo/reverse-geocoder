import {knexInstance} from "./Database";
import {AlternateNameInsertType} from "./types/types";
import {isLanguageCode} from "./helpers/isLanguageCode";

export class ReverseGeocoder {

  searchWithLanguage = async (lat: number, lng: number, languageCode: string, exact: boolean) => {
    if (!isLanguageCode(languageCode)) throw new Error("Invalid language code" + languageCode)
    const result = await this.search(lat, lng)
    if (result === null) {
      return null
    }
    const alternateNames = await this.getAlternateNames(result.geoNameId, languageCode, exact)
    return {
      ...result,
      alternateNames
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
    const results = await query
    return results
  }

  search = async (lat: number, lng: number) => {
    const result = await knexInstance.raw(`SELECT
    cities."name"           AS "name",
    cities."countryCode"    AS "country",
    cities."geoNameId"      AS "geoNameId",
    admin1."name"           AS "admin1",
    admin2."name"           AS "admin2"
FROM cities
         LEFT JOIN admin1
                   ON cities."countryCode" || '.' || cities."admin1Code" = admin1."id"
         LEFT JOIN admin2
                   ON cities."countryCode" || '.' || cities."admin1Code" || '.' || cities."admin2Code" = admin2."id"
ORDER BY cities."point" <-> ST_SetSRID(ST_MakePoint(?,?), 4326)
LIMIT 1;`, [lng, lat]);

    return result.rows[0] || null;
  }
}
