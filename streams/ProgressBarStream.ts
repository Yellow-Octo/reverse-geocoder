import {Transform, TransformCallback, TransformOptions} from "stream";
import {ProgressBar} from "../helpers/ProgressBar";

export class ProgressBarStream extends Transform {
  private current = 0;
  private progressBar: ProgressBar;

  constructor(totalBytes: number, options?: TransformOptions) {
    super(options);
    this.progressBar = new ProgressBar(30, totalBytes)
  }

  _transform(chunk: any, _encoding: BufferEncoding, callback: TransformCallback) {
    this.current += chunk.length;
    this.progressBar.update(this.current);
    this.push(chunk);
    callback();
  }

  _flush(callback: TransformCallback) {
    this.progressBar.finish();
    callback()
  }
}
