import express from "express";
import {ReverseGeocoder} from "./ReverseGeocoder";
import {isValidLat, isValidLng} from "./helpers/isValidCoordinate";
import {Database} from "./Database";

const app = express();
const geocoder = new ReverseGeocoder();

app.get("/throw", (req, res) => {
  throw new Error("This is a forced error");
})
app.get('/reverse', async (req, res) => {
  const lat = req.query.lat;
  const lng = req.query.lng;
  const languageCode = req.query.language;

  if (lat === null || lng === null) {
    return res.status(400).send('Missing query parameters: lat, lng, or language');
  }

  const latFloat = parseFloat(lat as string);
  const lngFloat = parseFloat(lng as string);
  if (isNaN(latFloat) || isNaN(lngFloat)) {
    return res.status(400).send('Invalid lat or lng');
  }
  if (!isValidLat(latFloat) || !isValidLng(lngFloat)) {
    return res.status(400).send('Invalid lat or lng');
  }
  let result;
  if (languageCode) {
    result = await geocoder.searchWithLanguage(latFloat, lngFloat, languageCode as string, false);
  } else {
    result = await geocoder.searchRepeatedly(latFloat, lngFloat);
  }
  return res.json(result);
});

app.get('/download', async (req, res) => {
  await Database.rollbackAll();
  await Database.latestMigrations();
  await geocoder.downloadData();
  res.status(200).send('All data downloaded');
});

app.use((error: Error, req, res) => {
  const simpleError = {
    message: error.message,
    name: error.name,
    stack: error.stack,
  };
  res.status(500).send(simpleError)
});

const PORT = 8000;
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// quit on ctrl-c when running docker in terminal
process.on("SIGINT", function onSigint() {
  console.info("Got SIGINT (aka ctrl-c in docker). Graceful shutdown ", new Date().toISOString())
  shutdown()
})

// quit properly on docker stop
process.on("SIGTERM", function () {
  console.info("Got SIGTERM (docker container stop). Graceful shutdown ", new Date().toISOString())
  shutdown()
})

// shut down server
function shutdown() {
  server.close()
}
