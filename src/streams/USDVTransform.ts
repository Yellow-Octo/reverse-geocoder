import {Transform, TransformCallback, TransformOptions} from "stream";
import {initParser, Parser, Schema, SchemaColumn, SchemaColumnType} from "udsv";

type USDVTransformOptions = TransformOptions & {
  columnSeparator: string;
  rowSeparator: string;
  headers: string[];
  trim?: boolean
}

export class UDSVTransform extends Transform {
  private parser?: Parser
  private readonly schema: Schema

  constructor(options: USDVTransformOptions) {
    const {columnSeparator, rowSeparator, headers, trim, ...rest} = options;
    super({...rest});

    this.schema = {
      "encl": "\"",
      "esc": "\\",
      // @ts-ignore
      "skip": 0,
      "col": columnSeparator,
      "row": rowSeparator,
      "trim": trim || false,
      "cols": generateColumns(headers)
    };
  }

  _transform(chunk: Buffer, _encoding: BufferEncoding, callback: TransformCallback) {
    try {
      if (this.parser === undefined) {
        this.parser = initParser(this.schema);
      }
      const strChunk = chunk.toString();
      this.parser.chunk<string[]>(strChunk, this.parser.stringArrs, (parsedData) => {
        callback(null, parsedData);
      });
    } catch (err) {
      callback(err);
    }
  }

  _flush(callback: TransformCallback) {
    try {
      // Finalize parsing and possibly push any remaining data
      const result = this.parser?.end();
      this.push(result);
      callback();
    } catch (err) {
      callback(err);
    }
  }
}

function generateColumns(headers: string[]) {
  return headers.map(header => ({
    name: header,
    type: SchemaColumnType.String,
    repl: {
      empty: null
    }
  } as SchemaColumn))
}
