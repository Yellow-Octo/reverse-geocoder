export class ProgressBar {
  totalBlocks: number;
  totalBytes: number;
  private start: number;

  constructor(totalBlocks = 20, totalBytes: number) {
    this.totalBlocks = totalBlocks;
    this.totalBytes = totalBytes;
    this.start = Date.now()
    this.update(0);
  }

  update(percentage: number) {
    const filledBlocks = Math.round(this.totalBlocks * percentage);
    const emptyBlocks = this.totalBlocks - filledBlocks;
    const elapsed = ((Date.now() - this.start) / 1000).toFixed(1)
    let rate = this.totalBytes / (1024 * 1024) / (Date.now() - this.start) * 1000
    if (rate === Infinity) {
      rate = 0
    }
    const rateFixed = rate.toFixed(1)
    const progress = '█'.repeat(filledBlocks)
    const empty = '░'.repeat(emptyBlocks)
    const bytes = toHumanReadableSize(this.totalBytes)
    const percent = (percentage * 100).toFixed(0)
    const display = `${progress}${empty} ${bytes} ${percent}% ${elapsed}s    ${rateFixed}MB/s`;
    process.stdout.write(`\r${display}`);
  }

  finish() {
    process.stdout.write('\n');
  }
}

function toHumanReadableSize(bytes: number) {
  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  let i = 0;
  while (bytes >= 1024) {
    bytes /= 1024;
    i++;
  }
  return `${bytes.toFixed(1)} ${units[i]}`;
}
