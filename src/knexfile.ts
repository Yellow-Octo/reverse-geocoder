import {Knex} from "knex";

require("ts-node/register")

export default {
  client: 'sqlite3',
  connection: {
    filename: "./data/db.sqlite"
  },
  useNullAsDefault: true,
  migrations: {
    directory: './migrations'
  },
  pool: {
    afterCreate: (conn, done) => {
      conn.loadExtension('mod_spatialite', (err : Error) => {
        if (err) {
          console.error('Failed to load Spatialite extension:', err);
          done(err, conn);
        } else {
          console.log('Spatialite extension loaded successfully.');
          done(null, conn); // proceed with the connection
        }
      });
    }
  }
} as Knex.Config
