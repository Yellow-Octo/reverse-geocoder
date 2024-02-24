import {Knex} from "knex";
import {DATABASE_LOCATION} from "./helpers/constants";

require("ts-node/register")

export default {
  client: 'sqlite3',
  connection: {
    filename: DATABASE_LOCATION
  },
  useNullAsDefault: true,
  migrations: {
    directory: './migrations'
  },
  pool: {
    afterCreate: (conn, done) => {
      conn.loadExtension('mod_spatialite', (err: Error) => {
        if (!err) return done(null, conn);

        console.error('Failed to load Spatialite extension:', err);
        done(err, conn);
      });
    }
  }
} as Knex.Config
