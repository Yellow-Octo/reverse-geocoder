import os from 'os';
import path from 'path';
import {exec} from 'child_process';
import {mkdirSync} from 'fs'; // Import fs module to use mkdirSync

/**
 * Asynchronously unzips a specific file from an archive or the entire archive if no specific file is provided.
 *
 * @param {string} archivePath - The path to the zip file.
 * @param {string} filePathWithinArchive - The path of the file within the zip archive
 * @param {string} destinationPath - The destination path for the extracted file or directory.
 */
export async function unzipSpecificFile(archivePath: string, filePathWithinArchive: string, destinationPath: string) {
  return new Promise<void>((resolve, reject) => {
    // Correctly derive the destination directory from the destination path
    const destinationDir = path.dirname(destinationPath);
    // Ensure the destination directory exists
    mkdirSync(destinationDir, {recursive: true});

    // Determine the directory to place the extracted content
    // If `filePathWithinArchive` is not provided, use `destinationDir` as final path
    const finalDestinationPath = filePathWithinArchive ? destinationPath : destinationDir;
    const command = buildUnzipCommand(archivePath, filePathWithinArchive, finalDestinationPath);

    exec(command, (error, _stdout, stderr) => {
      if (error) {
        console.error(`Error: ${stderr}`);
        return reject(error);
      }
      resolve();
    });
  });
}

/**
 * Builds the appropriate unzip command based on the operating system and provided parameters.
 *
 * @param {string} archivePath - The path to the zip file.
 * @param {string} filePathWithinArchive - The path of the file within the zip archive. Optional.
 * @param {string} destinationPath - The destination directory for the extracted content.
 * @returns {string} - The system command to execute.
 */
function buildUnzipCommand(archivePath, filePathWithinArchive, destinationPath) {
  const osType = os.type();

  let command;
  if (osType === 'Linux' || osType === 'Darwin') {
    if (filePathWithinArchive) {
      // Correctly direct the output to the destination path without duplicating the filename
      command = `unzip -p "${archivePath}" "${filePathWithinArchive}" > "${destinationPath}"`;
    } else {
      // Extracts the entire archive to the specified directory
      command = `unzip "${archivePath}" -d "${path.dirname(destinationPath)}"`;
    }
  } else if (osType === 'Windows_NT') {
    command = `powershell Expand-Archive -LiteralPath "${archivePath}" -DestinationPath "${path.dirname(destinationPath)}"`;
    if (filePathWithinArchive) {
      console.warn('Extracting a specific file from an archive is not directly supported on Windows with this method.');
    }
  } else {
    throw new Error('Unsupported OS');
  }

  return command;
}
