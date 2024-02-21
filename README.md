# reverse geocoder
The first offline geocoder that I used to geocode the initial 14k dive sites turns out had a huge memory problem

We originally wanted to put a geocoding microservice up but since the project had used 2GB+ ram and kept killing the server, I had to waste an entire day writing this garbagio

## how work
goes to Geonames and downloads their completely fucked up and poorly related data to build a local sqlite database up with cities.

We then leverage the KNN query from sqlite (spacialite) to find the city closest to a lat,lng and then build up the admin1, 2, 3, 4 information from there.

Most cities will not have more data than admin2 (US county)

For now we are only returning admin 1 and 2 since those are the things we care about in YO anyways

## where boilerplate came from
https://github.com/metachris/typescript-boilerplate
