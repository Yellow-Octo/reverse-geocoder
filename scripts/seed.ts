import {Seeder} from "../Seeder";


(async () => {
  const seeder = new Seeder();
  await seeder.run()
  process.exit(0)
})()
