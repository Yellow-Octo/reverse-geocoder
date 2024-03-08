import {Knex} from "knex";
import path from "path";

const migrationPath = path.resolve(__dirname, './migrations')

export default {
  client: "pg",
  connection: {
    port: process.env.DB_PORT,
    host: "postgres",
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    multipleStatements: true,
  },
  pool: {
    min: 1,
    max: 5,
  },
  migrations: {
    directory: migrationPath,
    tableName: "knex_migrations",
    extension: "ts",
  },
  debug: false,
} as Knex.Config
