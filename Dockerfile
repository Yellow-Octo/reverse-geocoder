# Start from the official Node.js Docker image
FROM node:20

RUN apt-get update
RUN apt-get install -y iputils-ping nano yarn

# Install dependencies for spatialite
RUN apt-get install -y \
    libsqlite3-mod-spatialite \
    spatialite-bin \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /usr/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND yarn.lock are copied
COPY package.json yarn.lock ./

RUN yarn install

# Bundle app source
COPY . .

RUN yarn build

ARG PORT=3000
ENV PORT $PORT
EXPOSE $PORT 9229 9230

# Define the command to run your app using CMD which defines your runtime
CMD [ "node", "./dist/server.js" ]
