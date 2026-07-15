import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile('dist/index.html', 'utf8');
assert(!html.includes("<?!= include('Page/Style'); ?>"));
assert(html.includes('stockTrackerDashboardCallback'));
assert(html.includes('<script src="data.js"></script>'));
assert(html.indexOf('<main') < html.indexOf('chart.js'));
