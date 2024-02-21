import {Transform, TransformCallback, TransformOptions} from "stream"

export class BatchStream<T> extends Transform {
  private readonly batchSize: number
  private batch: T[]

  constructor(batchSize: number, options?: TransformOptions) {
    super(options)
    this.batchSize = batchSize
    this.batch = []
  }

  _transform(chunk: T, _encoding: BufferEncoding, callback: TransformCallback) {
    this.batch.push(chunk)
    if (this.batch.length >= this.batchSize) {
      this.push(this.batch)
      this.batch = []
    }
    callback()
  }

  _flush(callback: TransformCallback) {
    if (this.batch.length > 0) {
      this.push(this.batch)
    }
    callback()
  }
}

