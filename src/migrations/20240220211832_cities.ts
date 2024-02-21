import type {Knex} from "knex";

const TABLE_NAME = "cities"

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable(TABLE_NAME, (table) => {
    table.integer('geoNameId').index()
    table.string('name')
    table.string('nameAscii')
    table.string('alternateNames')
    table.float('latitude')
    table.float('longitude')
    // table.specificType('point', 'GEOMETRY(Point, 4326)').index()
    table.string('featureClass')
    table.string('featureCode')
    table.string('countryCode')
    table.string('admin1Code')
    table.string('admin2Code')
    table.string('admin3Code')
    table.string('admin4Code')
    table.datetime('modificationDate')
  })

  await knex.raw("SELECT InitSpatialMetaData();")
  // Assuming SpatiaLite is loaded, use raw SQL to add the spatial column
  await knex.raw(`SELECT AddGeometryColumn('${TABLE_NAME}', 'point', 4326, 'POINT', 2)`);
  // Optionally, create a spatial index on the 'point' column
  await knex.raw(`SELECT CreateSpatialIndex('${TABLE_NAME}', 'point')`);
  console.log("point column added")
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists(TABLE_NAME)
}

