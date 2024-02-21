import Knex from "knex"
import knexfile from "./knexfile";

export const knexInstance = Knex(knexfile)

export class Database {

  static async clearData() {
    const tables = ["cities", "admin1", "admin2"]
    for (const table of tables) {
      await knexInstance(table).delete();
      //reset the autoincrement counter for each table
      await knexInstance.raw(`DELETE FROM sqlite_sequence WHERE name='${table}';`);
    }
    return true;
  }

  static async rollbackAll(terminate = false) {
    await knexInstance.migrate.forceFreeMigrationsLock()
    try {
      const ROLLBACK_ALL = true
      await knexInstance.migrate.rollback(undefined, ROLLBACK_ALL)
      console.log("All migrations were rolled back.")
    } catch (error) {
      console.error("Error rolling back migrations:", error)
    } finally {
      await knexInstance.destroy()
    }
    if (terminate) process.exit(0)
  }

  static async latestMigrations() {
    await knexInstance.migrate.latest()
  }
}
