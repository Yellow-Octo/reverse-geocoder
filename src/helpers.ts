import * as fs from "fs";
import * as https from "https";
import {IncomingMessage} from "node:http";

export async function openWebFileStream(url: string): Promise<IncomingMessage> {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      resolve(response);
    }).on('error', reject)
  })
}

export async function streamFileToDisk(url: string, filePath: string): Promise<void> {
  const stream = await openWebFileStream(url);
  return new Promise((resolve, reject) => {
    const writeStream = fs.createWriteStream(filePath);
    stream
      .pipe(writeStream)
      .on('finish', resolve)
      .on('error', reject);
  })
}
