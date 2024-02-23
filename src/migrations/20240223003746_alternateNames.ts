import type {Knex} from "knex";

const TABLE_NAME = "alternateNames"
export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable(TABLE_NAME, (table) => {
    table.integer('alternateNameId')
    table.integer('geoNameId')
    table.string('isoLanguage')
    table.string('alternateName')
    table.boolean('isPreferredName')
    table.boolean('isShortName')
    table.boolean('isColloquial')
  })
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists(TABLE_NAME)
}
