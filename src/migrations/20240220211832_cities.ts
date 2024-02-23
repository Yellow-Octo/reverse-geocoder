import type {Knex} from "knex";

const TABLE_NAME = "cities"

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable(TABLE_NAME, (table) => {
    table.integer('geoNameId').index()
    table.string('name')
    table.string('countryCode')
    table.string('admin1Code')
    table.string('admin2Code')
    table.string('admin3Code')
    table.string('admin4Code')
    table.datetime('modificationDate')
  })

  // Check if the spatial_ref_sys table exists and has entries
  const spatialRefSysTableExists = await knex.raw(`
    SELECT count(*) AS count
    FROM sqlite_master
    WHERE type ='table' AND name ='spatial_ref_sys'
  `).then(result => result[0].count > 0);

  if (!spatialRefSysTableExists) {
    await knex.raw("SELECT InitSpatialMetaData()")
  }
  await knex.raw(`SELECT AddGeometryColumn('${TABLE_NAME}', 'point', 4326, 'POINT', 2)`);
  await knex.raw(`SELECT CreateSpatialIndex('${TABLE_NAME}', 'point')`);
}
export async function down(knex: Knex): Promise<void> {
  await knex.raw(`SELECT DisableSpatialIndex('${TABLE_NAME}', 'point')`);
  await knex.raw(`DROP TABLE idx_${TABLE_NAME}_point;`);
  // avoids `AddGeometryColumn() error: "UNIQUE constraint failed: geometry_columns.f_table_name, geometry_columns.f_geometry_column"`
  await knex.raw(`SELECT DiscardGeometryColumn('${TABLE_NAME}', 'point')`);
  await knex.schema.dropTableIfExists(TABLE_NAME)
}

