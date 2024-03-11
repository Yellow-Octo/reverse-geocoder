# reverse geocoder

Get administrative information for a given lat,lng. Although there are many reverse geocoders out there, the vast majority do not work in the water and will give an error.

This one is much more rudimentary than the big players by just doing a search for the nearest city to find all the admin info. This has the benefit that it doesn't really matter if you are in the water or not, you will still get a result.

## Routes

### Reverse Geocoding

- **Endpoint**: `/reverse`
- **Method**: `GET`
- **Description**: Returns city information based on latitude and longitude.
- **Query Parameters**:
  - `lat` (required): Latitude for the reverse geocoding.
  - `lng` (required): Longitude for the reverse geocoding.
  - `language` (optional): Language code for localization.
- **Responses**:
  - **Status Code**: `200 OK`
  - **Body**: JSON object containing city information.

#### Example
https://reverse-geocoder.fly.dev/reverse?lat=42.3601&lng=%20-71.0589&language=zh
```json
{
  "name": "Boston",
  "country": "US",
  "geoNameId": 4930956,
  "admin1": "Massachusetts",
  "admin2": "Suffolk County",
  "alternateNames": [
    {
      "isoLanguage": "zh-CN",
      "alternateName": "波士顿",
      "isPreferredName": false,
      "isShortName": false
    }
  ]
}
```

## How it works
The dataset is pulled from GeoNames and seeded into the postgis database.

We then do a KNN query to find the city closest to a lat,lng and then build up the admin1, 2, 3, 4 information from there.

Most cities will not have more data than admin2 (US county)

For now we are only returning admin 1 and 2 since those are the things we care about for our uses

## How we tried to get it to work with spatialite
We originally tried to have this be a standalone module that could even be published on npm. But there were lots of errors and segfaults happening when using the combination of
1. sqlite3
2. spatialite
3. the node sqlite3 / better-sqlite3 bindings
4. knex ORM
5. debian / ubuntu / windows

We could sometimes get it to work on MacOS but then it would segfault and give mysterious errors when deployed in a linux container.

## where boilerplate came from
https://github.com/metachris/typescript-boilerplate
