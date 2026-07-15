import { writeFile } from 'node:fs/promises';

const url = 'https://script.google.com/macros/s/AKfycbxW5rdrP4yQfhV8rT5IOBK08sPq1OT6C8V_ap06n4S92pF_GPD45TUF15vpOelMwTiz/exec?api=1';
const response = await fetch(url);
if (!response.ok) throw new Error(`Dashboard API returned ${response.status}`);

const data = await response.json();
await writeFile('dist/data.js', 'window.__STOCK_TRACKER_DATA__=' + JSON.stringify(data) + ';');
