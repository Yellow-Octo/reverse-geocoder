import * as https from "https";
import {IncomingMessage} from "node:http";

export async function openWebFileStream(url: string): Promise<IncomingMessage> {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      resolve(response);
    }).on('error', reject)
  })
}
