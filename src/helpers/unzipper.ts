import {exec} from "child_process";

import os from "os";
import path from "path";

/**
 * Asynchronously unzips a specific file from an archive.
 *
 * @param {string} archivePath - The path to the zip file.
 * @param {string} filePathWithinArchive - The path of the file within the zip archive.
 * @param {string} destinationPath - The destination path for the extracted file.
 */
async function unzipSpecificFile(archivePath, filePathWithinArchive, destinationPath) {
  return new Promise<void>((resolve, reject) => {
    const command = buildUnzipCommand(archivePath, filePathWithinArchive, destinationPath);

    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error: ${stderr}`);
        return reject(error);
      }
      console.log(`Output: ${stdout}`);
      resolve();
    });
  });
}

/**
 * Builds the appropriate unzip command based on the operating system.
 *
 * @param {string} archivePath - The path to the zip file.
 * @param {string} filePathWithinArchive - The path of the file within the zip archive.
 * @param {string} destinationPath - The destination path for the extracted file.
 * @returns {string} - The system command to execute.
 */
function buildUnzipCommand(archivePath, filePathWithinArchive, destinationPath) {
  const osType = os.type();

  let command;
  if (osType === 'Linux' || osType === 'Darwin') {
    // On macOS and Linux, using unzip and tar respectively
    if (filePathWithinArchive) {
      // If a specific file within the archive is specified
      command = `unzip -p "${archivePath}" "${filePathWithinArchive}" > "${path.join(destinationPath, filePathWithinArchive)}"`;
    } else {
      // If no specific file is specified, extract everything
      command = `unzip "${archivePath}" -d "${destinationPath}"`;
    }
  } else if (osType === 'Windows_NT') {
    // Windows command (assuming PowerShell is available)
    command = `Expand-Archive -LiteralPath "${archivePath}" -DestinationPath "${destinationPath}"`;
    if (filePathWithinArchive) {
      // Windows does not directly support extracting a specific file via command line in the same way
      // This is a placeholder; you'd need to extract all then move the specific file or use a Node.js library
      console.warn('Extracting a specific file from an archive is not directly supported on Windows with this method.');
    }
  } else {
    throw new Error('Unsupported OS');
  }

  return command;
}
