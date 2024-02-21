import type {Knex} from "knex";

const TABLE_NAME = "admin2"
export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable(TABLE_NAME, (table) => {
    table.string('id').notNullable().index()
    table.string('name')
    table.string('nameAscii')
    table.integer('geoNameId').index()
  })
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists(TABLE_NAME)
}
