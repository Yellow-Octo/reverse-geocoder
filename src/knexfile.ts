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
}
