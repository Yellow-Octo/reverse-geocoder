import type {Knex} from "knex";

const TABLE_NAME = "cities"

export async function up(knex: Knex): Promise<void> {
  await knex.raw('CREATE EXTENSION IF NOT EXISTS postgis')
  await knex.schema.createTable(TABLE_NAME, (table) => {
    table.integer('geoNameId')
    table.string('name')
    table.string('countryCode')
    table.string('admin1Code')
    table.string('admin2Code')
    table.string('admin3Code')
    table.string('admin4Code')
    table.datetime('modificationDate')
    // @ts-ignore
    table.specificType("point", "geometry(point, 4326)").index(null, { indexType: "spgist" })
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('DROP EXTENSION IF EXISTS postgis')
  await knex.schema.dropTableIfExists(TABLE_NAME)
}
