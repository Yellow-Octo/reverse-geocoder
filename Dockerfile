# Start from the official Node.js Docker image
FROM node:18

RUN apt-get update
RUN apt-get install -y iputils-ping nano yarn
# install bash and bash-completion
RUN apt-get install -y bash bash-completion
RUN echo 'source /usr/share/bash-completion/bash_completion' >> /etc/bash.bashrc
RUN ln -sf /bin/bash /bin/sh # we need to symlink bash to sh, because the docker desktop CLi will auto run the basic shell

# Install dependencies for sqlite and spatialite
RUN apt-get install -y \
    sqlite3=3.45.1 \
    libsqlite3-mod-spatialite \
    spatialite-bin \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /usr/app

# Install app dependencies
COPY package.json yarn.lock ./

RUN yarn install
RUN yarn global add ts-node
# Bundle app source
COPY . .

ARG PORT=3000
ENV PORT $PORT
EXPOSE $PORT 9229 9230

ENV SPATIALITE_EXTENSION_PATH=/usr/lib/x86_64-linux-gnu/mod_spatialite.so
# Define the command to run your app using CMD which defines your runtime
CMD [ "ts-node", "./server.ts" ]
