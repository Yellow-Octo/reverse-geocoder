import {Readable} from "node:stream";
import {LineStream} from "./LineStream";

function createReadStream(data, options = {}) {
  return new Readable({
    ...options,
    read() {
      this.push(data);
      this.push(null); // End the stream
    }
  });
}

describe('LineEmitterStream', () => {
  test('correctly emits lines from chunked input', (done) => {
    const inputData = "Line 1\nLine 2\nLine 3";
    const expectedLines = ["Line 1", "Line 2", "Line 3"];

    const lineEmitter = new LineStream();
    const sourceStream = createReadStream(inputData);

    const lines: string [] = [];
    lineEmitter.on('data', (line) => {
      lines.push(line);
    });

    sourceStream.pipe(lineEmitter).on('end', () => {
      expect(lines).toEqual(expectedLines);
      done();
    });
  });

  test("it should handle 1M lines of random text and not take too long to finish", (done) => {
    const inputData = Array(1_000_000).fill("a".repeat(100)).join("\n");
    const lineEmitter = new LineStream();
    const sourceStream = createReadStream(inputData);

    let lineCount = 0;
    lineEmitter.on("data", (line) => {
      lineCount++;
    });

    sourceStream.pipe(lineEmitter).on("end", () => {
      expect(lineCount).toBe(1_000_000);
      done();
    });
  }, 2000)
});
