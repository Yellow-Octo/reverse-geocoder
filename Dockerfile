# Start from the official Node.js Docker image
FROM node:20

RUN apt-get update
RUN apt-get install -y iputils-ping nano yarn

# Install dependencies for sqlite and spatialite
RUN apt-get install -y \
    sqlite3 \
    libsqlite3-mod-spatialite \
    spatialite-bin \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /usr/app

# Install app dependencies
COPY package.json yarn.lock ./

RUN yarn install

# Bundle app source
COPY . .

ARG PORT=3000
ENV PORT $PORT
EXPOSE $PORT 9229 9230

ENV SPATIALITE_EXTENSION_PATH=/usr/lib/x86_64-linux-gnu/mod_spatialite.so
# Define the command to run your app using CMD which defines your runtime
CMD [ "node", "./dist/server.js" ]
