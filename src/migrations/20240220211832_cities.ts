import type {Knex} from "knex";

const TABLE_NAME = "cities"
export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable(TABLE_NAME, (table) => {
    table.integer('geoNameId').index()
    table.string('name')
    table.string('nameAscii')
    table.string('alternateNames')
    table.float('latitude')
    table.float('longitude')
    table.string('featureClass')
    table.string('featureCode')
    table.string('countryCode')
    table.string('admin1Code')
    table.string('admin2Code')
    table.string('admin3Code')
    table.string('admin4Code')
    table.datetime('modificationDate')
  })
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists(TABLE_NAME)
}

