import * as https from "https";
import {IncomingMessage} from "node:http";
import * as fs from "fs";
import {Stream} from "node:stream";

export async function openWebFileStream(url: string): Promise<IncomingMessage> {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      resolve(response);
    }).on('error', reject)
  })
}

export async function getWebOrFileStreamWithSize(pathOrURL: string): Promise<[stream: Stream, size: number]> {
  if (pathOrURL.startsWith("http")) {
    const webStream = await openWebFileStream(pathOrURL)
    const contentLength = webStream.headers['content-length']
    if (!contentLength) {
      throw new Error("content-length not found")
    }
    return [webStream, parseInt(contentLength)]
  } else {
    const fileSize = await fs.promises.stat(pathOrURL).then((stats) => stats.size)
    return [fs.createReadStream(pathOrURL, {highWaterMark : 256 * 1024}), fileSize]
  }
}
