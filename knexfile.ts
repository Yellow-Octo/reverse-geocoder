import {Knex} from "knex";
import path from "path";

const SPATIALITE_PATH = process.env.SPATIALITE_EXTENSION_PATH || 'mod_spatialite'

export default {
  client: 'sqlite3',
  connection: {
    filename: path.resolve(__dirname, "./data/db.sqlite")
  },
  useNullAsDefault: true,
  migrations: {
    directory: './migrations'
  },
  pool: {
    afterCreate: (conn, done) => {
      conn.loadExtension(SPATIALITE_PATH, (err: Error) => {
        if (!err) {
          console.log('Spatialite extension loaded');
          return done(null, conn);
        }

        console.error('Failed to load Spatialite extension:', err);
        done(err, conn);
      });
    }
  }
} as Knex.Config
