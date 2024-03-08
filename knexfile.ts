import {Knex} from "knex";
import path from "path";

const migrationPath = path.resolve(__dirname, './migrations')

export default {
  dev: {
    client: "pg",
    connection: {
      port: process.env.DB_PORT || 5432,
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
  },
  production: {
    client: "pg",
    connection: process.env.DATABASE_URL,
    pool: {
      min: 1,
      max: 5,
    },
    migrations: {
      directory: migrationPath,
      tableName: "knex_migrations",
      extension: "ts",
    },
  },
} as Knex.Config
