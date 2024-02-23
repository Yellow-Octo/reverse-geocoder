import {Transform, TransformCallback, TransformOptions} from "stream";

export class CsvParser extends Transform {
  private readonly delimiter: string;
  private headers: string[] | undefined;

  constructor({delimiter, headers}: { delimiter: string, headers?: string[] } = {
    delimiter: ",",
  }, streamOptions?: TransformOptions) {
    super({...streamOptions, objectMode: true});
    this.delimiter = delimiter;
    this.headers = headers;
  }

  _transform(chunk: string, _encoding, callback: TransformCallback) {
    if (chunk === "") {
      return callback();
    }
    const parts = chunk.split(this.delimiter);
    if (this.headers === undefined) {
      this.headers = parts;
      return callback();
    }
    const row = this.headers.reduce((acc, header, index) => {
      acc[header] = parts[index];
      return acc;
    }, {});
    this.push(row);
    callback();
  }
  _flush(callback: TransformCallback) {
    callback();
  }
}
