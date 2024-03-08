import http from 'http';
import {ReverseGeocoder} from "./ReverseGeocoder";
import {isValidLat, isValidLng} from "./helpers/isValidCoordinate";
import {CityInsertType} from "./types/types";

const geocoder = new ReverseGeocoder();

const server = http.createServer(async (req, res) => {
  if (req.method === 'GET' && req.url) {
    const url = new URL(`http://localhost${req.url}`);
    const path = url.pathname;
    const params = url.searchParams;

    if (path === '/reverse') {
      const lat = params.get('lat');
      const lng = params.get('lng');
      const languageCode = params.get('language');

      if (!lat || !lng) {
        res.statusCode = 400
        return res.end('Missing query parameters: lat, lng, or language');
      }

      const latFloat = parseFloat(lat);
      const lngFloat = parseFloat(lng);
      if (isNaN(latFloat) || isNaN(lngFloat)) {
        res.statusCode = 400
        return res.end('Invalid lat or lng');
      }
      if (!isValidLat(latFloat) || !isValidLng(lngFloat)) {
        res.statusCode = 400
        return res.end('Invalid lat or lng');
      }
      let result: CityInsertType | null;
      if (languageCode) {
        result = await geocoder.searchWithLanguage(latFloat, lngFloat, languageCode, false);
      } else {
        result = await geocoder.search(latFloat, lngFloat);
      }
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify(result));
    } else if (path === '/health') {
      res.statusCode = 200;
      return res.end('ok');
    }
  }
  res.statusCode = 404;
  return res.end('Not found');
});

server.on('error', (err) => {
  console.error('Server error:', err);
});

const PORT = process.env.NODE_PORT;
server.listen(PORT, () => {
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
