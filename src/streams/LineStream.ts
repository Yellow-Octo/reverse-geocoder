import {Transform, TransformOptions} from "stream";

type CombinedOptions = {
  newLineCharacter?: string;
} & TransformOptions;

export class LineStream extends Transform {
  private chunks: any[];
  private newLineCharacter: string;

  constructor(options: CombinedOptions) {
    const {newLineCharacter, ...rest} = options;
    super({...rest, readableObjectMode: true});
    this.chunks = [];
    this.newLineCharacter = newLineCharacter || '\n';
  }

  _transform(chunk, _encoding, callback) {
    this.chunks.push(chunk);
    let data = this.chunks.join('');
    let index;

    while ((index = data.indexOf(this.newLineCharacter)) !== -1) {
      const line = data.substring(0, index);
      this.push(line); // Emit the line
      data = data.substring(index + 1);
    }

    // If there's any data left that doesn't contain a new line, store it in the array for the next chunk
    this.chunks = data.length > 0 ? [data] : [];

    callback();
  }

  _flush(callback) {
    // If there's any data left in the array, join it and emit it as the last line
    if (this.chunks.length > 0) {
      const remainingData = this.chunks.join('');
      this.push(remainingData);
      this.chunks = [];
    }
    callback();
  }
}
