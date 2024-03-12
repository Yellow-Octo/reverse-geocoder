/**
 *  This is a helper script to allow for the coordination of yarn commands on both the local machine and the docker container
 *  as part of the containerized development workflow
 *
 *  The problem is that running something like `yarn install` locally does not install the dependencies in the remote container
 *  Yet, we still need to run yarn install locally to get the types and coding assistance from the IDE
 *
 *  And if we uninstall dependencies from either the local or remote, the package.json would be modified, meaning we cannot
 *  just simply run the same yarn remove XXX command on both sides.
 *
 *  The solution is to run the yarn command on the remote container first, let it modify the package.json and yarn.lock files,
 *  thereby letting the container be the source of truth. Then, only after we are sure everything works there, we run
 *  yarn install as a synchronizing step on the locally
 */
const {spawn} = require('child_process');

const CONTAINER_SERVICE_NAME = "node";

const [_nodePath, _scriptPath, verb, ...params] = process.argv;

if (!verb) {
  console.error("No command supplied");
  process.exit(1);
}

function runCommand(command) {
  return new Promise((resolve, reject) => {
    const [cmd, ...args] = command.split(/\s+/);
    const proc = spawn(cmd, args, {stdio: 'inherit'});

    proc.on('close', code => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command "${command}" \n\nexited with code ${code}`));
      }
    });
  });
}

const localYarnCommand = `yarn ${verb} ${params.join(' ')}`;

// command installs the dependencies in the remote container but one level up from where the source code is
const remoteYarnCommand = `docker-compose exec ${CONTAINER_SERVICE_NAME} ${localYarnCommand} --prefix ../`;

// we run the yarn commands on the remote container first, and allow it to modify the package.json and yarn.lock files
// we then in series finish running the local command, primarily to get types and coding assistance from the IDE
runCommand(remoteYarnCommand)
  .then(() => {
    return runCommand('yarn install');
  })
  .then(() => console.log(`Both local and remote yarn ${verb} completed successfully`))
  .catch(console.error);
