import * as https from "https";
import {IncomingMessage} from "node:http";
import * as fs from "fs";
import {Readable} from "node:stream";
import {pipeline} from "stream";
import {ProgressBarStream} from "../streams/ProgressBarStream";

export async function openWebFileStream(url: string): Promise<IncomingMessage> {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      resolve(response);
    }).on('error', reject)
  })
}

export async function getWebOrFileStreamWithSize(pathOrURL: string): Promise<[stream: Readable, size: number]> {
  if (pathOrURL.startsWith("http")) {
    const webStream = await openWebFileStream(pathOrURL)
    const contentLength = webStream.headers['content-length']
    if (!contentLength) {
      throw new Error("content-length not found")
    }
    return [webStream, parseInt(contentLength)]
  } else {
    const fileSize = await fs.promises.stat(pathOrURL).then((stats) => stats.size)
    return [fs.createReadStream(pathOrURL, {highWaterMark: 256 * 1024}), fileSize]
  }
}

export async function downloadFile(url: string, destination: string) {
  const stream = await openWebFileStream(url)
  return new Promise<void>((resolve, reject) => {
    pipeline(
      stream,
      new ProgressBarStream(parseInt(stream.headers['content-length'] || "0")),
      fs.createWriteStream(destination),
      (err) => {
        if (err) {
          reject(err)
        } else {
          resolve()
        }
      })
  })
}
