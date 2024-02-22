export class ProgressBar {
  totalBlocks: number;
  totalBytes: number;

  constructor(totalBlocks = 20, totalBytes: number) {
    this.totalBlocks = totalBlocks;
    this.totalBytes = totalBytes;
    this.update(0);
  }

  update(percentage: number) {
    const filledBlocks = Math.round(this.totalBlocks * percentage);
    const emptyBlocks = this.totalBlocks - filledBlocks;
    const display = `${'█'.repeat(filledBlocks)}${'░'.repeat(emptyBlocks)} ${toHumanReadableSize(this.totalBytes)} ${(percentage * 100).toFixed(0)}%`;
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
