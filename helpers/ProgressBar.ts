export class ProgressBar {
  totalBlocks: number;
  totalBytes: number;
  private start: number;

  constructor(totalBlocks = 20, totalBytes: number) {
    this.totalBlocks = totalBlocks;
    this.totalBytes = totalBytes;
    this.start = Date.now();
    this.update(0);
  }

  update(bytesProcessed: number) {
    const percentage = bytesProcessed / this.totalBytes;
    const filledBlocks = Math.round(this.totalBlocks * percentage);
    const emptyBlocks = this.totalBlocks - filledBlocks;
    const elapsed = ((Date.now() - this.start) / 1000).toFixed(1);
    let rate = bytesProcessed / (1024 * 1024) / ((Date.now() - this.start) / 1000);
    if (rate === Infinity) {
      rate = 0;
    }
    const rateFixed = rate.toFixed(1);
    const progress = '█'.repeat(filledBlocks);
    const empty = '░'.repeat(emptyBlocks);
    const processedBytes = toHumanReadableSize(bytesProcessed, false);
    const totalBytes = toHumanReadableSize(this.totalBytes);
    const percent = (percentage * 100).toFixed(0);
    const display = `${progress}${empty} ${percent}% ${processedBytes} / ${totalBytes}  ${elapsed}s   ${rateFixed}MB/s`;
    process.stdout.write(`\r${display}`);
  }

  finish() {
    process.stdout.write('\n');
  }
}

function toHumanReadableSize(bytes: number, showUnits = true) {
  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  let i = 0;
  while (bytes >= 1024) {
    bytes /= 1024;
    i++;
  }
  if (!showUnits) {
    return `${bytes.toFixed(1)}`;
  }
  return `${bytes.toFixed(1)} ${units[i]}`;
}
