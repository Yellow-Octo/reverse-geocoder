import express from "express";
import {ReverseGeocoder} from "./ReverseGeocoder";
import {isValidLat, isValidLng} from "./helpers/isValidCoordinate";
import { CityInsertType } from "./types/types";

const app = express();
const geocoder = new ReverseGeocoder();

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
  let result: CityInsertType | null;
  if (languageCode) {
    result = await geocoder.searchWithLanguage(latFloat, lngFloat, languageCode as string, false);
  } else {
    result = await geocoder.search(latFloat, lngFloat);
  }
  return res.json(result);
});

app.get('/health', (_req, res) => {
  res.status(200).send('ok');
});

app.use((error: Error, _req, res, _next) => {
  const simpleError = {
    message: error.message,
    name: error.name,
    stack: error.stack,
  };
  res.status(500).send(simpleError)
});

const PORT = process.env.NODE_PORT
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
