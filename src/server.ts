import * as http from "http";
import {ReverseGeocoder} from "./ReverseGeocoder";
import {isValidLat, isValidLng} from "./helpers/isValidCoordinate";

const geocoder = new ReverseGeocoder();

export const server = http.createServer(async (req, res) => {
  const requestUrl = new URL(req.url!, `https://${req.headers.host}`);
  const path = requestUrl.pathname;

  // Check if the path matches the desired route and method is GET
  if (path === '/reverse' && req.method === 'GET') {
    const searchParams = requestUrl.searchParams;
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    const languageCode = searchParams.get('language');

    if (lat === null || lng === null) {
      res.writeHead(400, {'Content-Type': 'text/plain'});
      res.end('Missing query parameters: lat, lng, or language');
      return;
    }

    const latFloat = parseFloat(lat);
    const lngFloat = parseFloat(lng);
    if (isNaN(latFloat) || isNaN(lngFloat)) {
      res.writeHead(400, {'Content-Type': 'text/plain'});
      res.end('Invalid lat or lng');
      return;
    }
    if (!isValidLat(latFloat) || !isValidLng(lngFloat)) {
      res.writeHead(400, {'Content-Type': 'text/plain'});
      res.end('Invalid lat or lng');
      return;
    }

    try {
      let result
      if (languageCode) {
        result = await geocoder.searchWithLanguage(latFloat, lngFloat, languageCode, false);
      } else {
        result = await geocoder.searchRepeatedly(latFloat, lngFloat);
      }
      res.writeHead(200, {'Content-Type': 'application/json'});
      return res.end(JSON.stringify(result));
    } catch (error) {
      res.writeHead(500, {'Content-Type': 'text/plain'});
      return res.end('Internal Server Error');
    }
  }

  if (path === "/download"){
    await geocoder.downloadData();
    res.writeHead(200, {'Content-Type': 'text/plain'});
    res.end('All data downloaded');
    return;
  }

  res.writeHead(404, {'Content-Type': 'text/plain'});
  return res.end('Not Found');
});

const PORT = 8000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
