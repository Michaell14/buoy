// Writes dist/styles.css for people who prefer importing the stylesheet over runtime injection.
// Importing the built module in Node also proves the package is safe to load on a server.
import { writeFileSync } from 'node:fs';

const { styles } = await import('../dist/vanilla.js');
writeFileSync(new URL('../dist/styles.css', import.meta.url), styles);
console.log(`dist/styles.css  ${(styles.length / 1024).toFixed(1)} KB`);
