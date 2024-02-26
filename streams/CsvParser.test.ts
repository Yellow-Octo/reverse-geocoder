import {Readable} from 'stream';
import {CsvParser} from "./CsvParser";

describe('CsvParser', () => {
  test('parses CSV rows into objects based on headers', (done) => {
    const sourceStream = Readable.from(["Name,Age,Location", "John Doe,30,New York", "Jane Doe,25,Los Angeles"]);
    const csvTransformer = new CsvParser();
    const expectedOutput = [
      {Name: 'John Doe', Age: '30', Location: 'New York'},
      {Name: 'Jane Doe', Age: '25', Location: 'Los Angeles'},
    ];

    const result: object[] = [];

    sourceStream
      .pipe(csvTransformer)
      .on('data', (data) => {
        result.push(data);
      })
      .on('end', () => {
        expect(result).toEqual(expectedOutput);
        done();
      })
      .on('error', (error) => {
        console.error(error);
      })
  });

  test('handles empty chunks gracefully', (done) => {
    const sourceStream = Readable.from(["Name,Age,Location", "", "John Doe,30,New York"]);
    const csvTransformer = new CsvParser();
    const expectedOutput = [
      {Name: 'John Doe', Age: '30', Location: 'New York'},
    ];

    const result: object[] = [];

    sourceStream
      .pipe(csvTransformer)
      .on('data', (data) => {
        result.push(data);
      })
      .on('end', () => {
        expect(result).toEqual(expectedOutput);
        done();
      });
  });

  test('correctly uses a custom delimiter', (done) => {
    const sourceStream = Readable.from(["Name|Age|Location", "John Doe|30|New York"]);
    const csvTransformer = new CsvParser({delimiter: '|'});
    const expectedOutput = [
      {Name: 'John Doe', Age: '30', Location: 'New York'},
    ];
    const result: object[] = [];

    sourceStream
      .pipe(csvTransformer)
      .on('data', (data) => {
        result.push(data);
      })
      .on('end', () => {
        expect(result).toEqual(expectedOutput);
        done();
      });
  });
});
