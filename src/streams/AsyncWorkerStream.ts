import {Transform, TransformCallback, TransformOptions} from "stream"

type BathStreamOptions = {
  isWriter?: boolean
} & TransformOptions

const defaultOptions = {
  isWriter: true,
}

export class AsyncWorkStream<T> extends Transform {
  private readonly asyncProcessFunction: (chunk: T) => Promise<any>
  private readonly isWriter: boolean

  constructor(asyncFunction: (chunk: T) => Promise<any>, options?: BathStreamOptions) {
    const {isWriter} = {...defaultOptions, ...options}
    if (typeof asyncFunction !== "function") {
      throw new Error("Async process function must be a function")
    }
    super({
      ...options, objectMode: true,
      // we have no need to leave the stream open when the input side ends
      allowHalfOpen: false,
    })
    this.isWriter = isWriter
    this.asyncProcessFunction = asyncFunction
  }

  _transform(chunk: T, _encoding: string, callback: TransformCallback) {
    void this.processBatch(chunk, callback)
  }

  _flush(callback: TransformCallback) {
    callback()
  }

  private async processBatch(chunk: T, callback: TransformCallback) {
    try {
      const results = await this.asyncProcessFunction(chunk)
      if (!this.isWriter) {
        this.push(results)
      }
      callback()
    } catch (err) {
      callback(err as Error)
    }
  }
}
