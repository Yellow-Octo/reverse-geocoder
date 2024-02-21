import * as http from "http";
import {ReverseGeocoder} from "./ReverseGeocoder";

export const server = http.createServer(async (req, res) => {
  const requestUrl = new URL(req.url!, `http://${req.headers.host}`);
  const path = requestUrl.pathname;

  // Check if the path matches the desired route and method is GET
  if (path === '/reverse' && req.method === 'GET') {
    const searchParams = requestUrl.searchParams;
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    const language = searchParams.get('language');

    if (!lat || !lng) {
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

    try {
      const result = await ReverseGeocoder.get(latFloat, lngFloat, language);
      res.writeHead(200, {'Content-Type': 'text/plain'});
      return res.end(result);
    } catch (error) {
      res.writeHead(500, {'Content-Type': 'text/plain'});
      return res.end('Internal Server Error');
    }
  }

  res.writeHead(404, {'Content-Type': 'text/plain'});
  return res.end('Not Found');
});

const PORT = 8000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
