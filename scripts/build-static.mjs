import { mkdir, readFile, writeFile } from 'node:fs/promises';

const [page, style] = await Promise.all([
  readFile('Page/Index.html', 'utf8'),
  readFile('Page/Style.html', 'utf8')
]);
const output = page
  .replace("<?!= include('Page/Style'); ?>", style)
  .replace('</head>', '  <script src="data.js"></script>\n</head>');

if (output === page) throw new Error('Style include marker was not found');

await mkdir('dist', { recursive: true });
await writeFile('dist/index.html', output);
