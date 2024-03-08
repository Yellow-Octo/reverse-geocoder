FROM node:20

USER root

# default to port 3000 for node, and 9229 and 9230 (tests) for debug
ARG PORT=3000
ENV PORT $PORT
EXPOSE $PORT 9229 9230

RUN apt-get update && apt-get install -y nano yarn

# install bash and bash-completion
# we need to symlink bash to sh, because the docker desktop CLi will auto run the basic shell
RUN apt-get install -y bash bash-completion
RUN echo 'source /usr/share/bash-completion/bash_completion' >> /etc/bash.bashrc
RUN ln -sf /bin/bash /bin/sh


# install dependencies first, in a layer above the source code. this allows installing dependencies locally for code completion
# while leaving the server with its own version of modules that will be for linux and not for mac/windows
# due to default /opt permissions we have to create the dir with root and change perms
WORKDIR /code
RUN chown node:node /code
USER node
COPY --chown=node:node package.json yarn.lock* tsconfig.json ./

RUN yarn install --frozen-lockfile && yarn cache clean --force

# set our node environment, either development or production
# defaults to production, compose overrides this to development on build and run
ARG NODE_ENV=production
ENV NODE_ENV $NODE_ENV

WORKDIR /code/inside/
COPY --chown=node:node . .

# The CMD instruction sets the default command to execute when the container starts.
# Here, we use 'node' to directly run the server script. This approach is typically
# more efficient for signal handling and graceful shutdown compared to using 'npm start'.
#
# Note: When using 'npm start', Docker may not propagate signals correctly to the Node.js process.
# This can prevent the application from shutting down gracefully when Docker sends stop signals.
# As a workaround, if you opt to use 'npm start', you can run the container with the `--init` flag
# (e.g., `docker run --init ...`). This flag ensures proper signal forwarding and process management.
# However, it's generally better to use 'node' directly for running the server script, as it
# tends to handle signal propagation more gracefully. Ensuring proper signal handling is important
# for tasks like closing database connections and cleaning up resources before the container stops.

CMD [ "ts-node", "./server.ts" ]
