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
    const result = await knexInstance('cities')
      .select({
        name: 'cities.name',
        country: 'cities.countryCode',
        geoNameId: 'cities.geoNameId',
        admin1: 'admin1.name',
        admin2: 'admin2.name'
      })
      .leftJoin('admin1', knexInstance.raw(`cities."countryCode" || '.' || cities."admin1Code" = admin1."id"`))
      .leftJoin('admin2', knexInstance.raw(`cities."countryCode" || '.' || cities."admin1Code" || '.' || cities."admin2Code" = admin2."id"`))
      .orderByRaw('cities."point" <-> ST_SetSRID(ST_MakePoint(?, ?), 4326)', [lng, lat])
      .limit(1);

    return result[0] || null;
  }
}
