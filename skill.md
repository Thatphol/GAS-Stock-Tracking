# Stock Tracking Project Skill

ใช้เอกสารนี้เป็น context เมื่อต้องกลับมาแก้หรือดูแลโปรเจกต์ `Stock-Tracking`

## Project Identity

โปรเจกต์นี้เป็น Google Apps Script Web App สำหรับ dashboard ติดตามพอร์ตหุ้น โดยใช้ Google Sheets เป็น database และใช้ `clasp` sync code จาก local workspace ขึ้น Google Apps Script

Workspace:

```text
C:\Users\Thattaphol\Desktop\Workspace\Stock-Tracking
```

## Always Remember

- ถ้าแก้ไฟล์ code ของโปรเจกต์แล้ว ให้ push ขึ้น Google Apps Script ด้วย `clasp push`
- ถ้า `clasp push` ต้องใช้ network หรือ auth ให้ขอ approval ตามระบบก่อน
- โปรเจกต์นี้ไม่มี `.git` repository ใน workspace ปัจจุบัน จึงใช้ `git diff` หรือ `git status` ไม่ได้
- ใช้ `Get-Content` หรือ `Select-String` อ่านไฟล์
- ใช้ `apply_patch` สำหรับแก้ไฟล์
- อย่าแปลงโปรเจกต์นี้เป็น Node/Vite/React app เว้นแต่ผู้ใช้สั่งชัดเจน

## Main Files

- `Page/Code.js`: Apps Script backend
- `Page/Index.html`: dashboard HTML และ frontend JavaScript
- `Page/Style.html`: CSS
- `Tracking - stock.js`: snapshot portfolio เข้า tracking sheet
- `appsscript.json`: Apps Script config
- `.clasp.json`: clasp project binding

## Backend Notes

`Page/Code.js` ใช้ sheet names:

```js
const SHEET_NAME = 'Portfolio';
const TRACKING_SHEET_NAME = 'Portfolio - Tracking';
const GOAL_SHEET_NAME = 'Goal - Plan';
```

ฟังก์ชันสำคัญ:

- `doGet()`: render `Page/Index`
- `include(filename)`: include HTML partial เช่น `Page/Style`
- `getDashboardData()`: endpoint หลักที่ frontend เรียก
- `getStockData()`: อ่าน `Portfolio`
- `getTrackingRows()`: อ่าน `Portfolio - Tracking`
- `aggregateTrackingRowsByDate()`: รวม tracking เป็นรายวัน
- `calculateDoD()`: day-over-day summary
- `calculateMonthlySummary()`: latest monthly summary
- `getGoalPlanData()`: อ่าน goals

## Frontend Notes

Frontend อยู่ใน `<script>` ท้าย `Page/Index.html`

โหลดข้อมูลด้วย:

```js
google.script.run
  .withSuccessHandler(renderAll)
  .withFailureHandler(showError)
  .getDashboardData();
```

state หลัก:

```js
let dashboardData = {
  stocks: [],
  trackingRows: [],
  dailyTracking: [],
  goals: {}
};
```

filter อยู่ฝั่ง client:

- date range
- application
- stock name

หลัง filter จะเรียก `applyFilters()` เพื่อ render dashboard ใหม่

## Charts

Charts ใช้ Chart.js และ chartjs-plugin-datalabels จาก CDN

ฟังก์ชัน chart สำคัญ:

- `renderPortfolioChart(stocks)`
- `renderProfitChart(stocks)`
- `renderAppChart(stocks)`
- `renderDailyTrackingChart(dailyData)`
- `renderMonthlyTrendChart(dailyData)`

รายละเอียดล่าสุด:

- `Application Exposure` แสดงแท่งคู่ `Total THB` และ `Cost`
- `Cost` มาจาก `boughtTHB`
- `Daily Portfolio Value` ใช้ bar ขนาดเล็กและมี `Cost Basis` เป็น line

## Sheet Contract

`Portfolio` columns:

```text
A Stock Name
B Price
C Quantity
D Current Value
E Total Cost
F Bought THB
G Avg Cost
H Profit/Loss %
I Profit/Loss THB
J Profit/Loss USD
K Total THB
L Total USD
M Application
N Portfolio Weight
```

`Portfolio - Tracking`:

- copy A:N จาก `Portfolio`
- timestamp อยู่ Column O
- code มี fallback ไป Column N สำหรับข้อมูลเก่า

`Goal - Plan`:

- A2 = Total Cost Goal
- B2 = Total Value THB Goal

## Common Change Patterns

### เพิ่ม metric ใหม่

1. เพิ่ม field mapping ใน `getStockData()` หรือ `getTrackingRows()`
2. เพิ่ม summary calculation ใน backend ถ้าต้องส่งจาก server
3. เพิ่ม calculation ฝั่ง frontend ถ้า metric ต้องเปลี่ยนตาม filter
4. เพิ่ม DOM element ใน `Page/Index.html`
5. เพิ่ม style ใน `Page/Style.html` ถ้าจำเป็น
6. run `clasp push`

### แก้ chart

1. หา `render...Chart()` ใน `Page/Index.html`
2. แก้ dataset/options ของ Chart.js
3. ระวัง datalabels ไม่ให้ซ้อนกัน
4. ถ้าเป็น grouped bar ให้ปรับ `categoryPercentage`, `barPercentage`, `barThickness` หรือ `maxBarThickness`
5. run `clasp push`

### แก้ tracking snapshot

1. แก้ `appendPortfolioTracking()` ใน `Tracking - stock.js`
2. รักษา contract คอลัมน์ A:N และ timestamp Column O
3. run `clasp push`
4. ตรวจ trigger ใน Apps Script UI ถ้าพฤติกรรม schedule เปลี่ยน

## Push Command

หลังแก้ code:

```bash
clasp push
```

คาดหวัง output ประมาณ:

```text
Pushed 5 files at ...
```

Markdown files อาจไม่ถูก push ไป GAS เพราะ `.clasp.json` ไม่รวม `.md` ใน extension list

## Response Style For Future Work

เมื่อทำงานกับผู้ใช้ในโปรเจกต์นี้:

- ตอบภาษาไทย
- อธิบายสั้นแต่ชัด
- ถ้าแก้ไฟล์แล้วแจ้งว่าแก้อะไรและ push สำเร็จหรือไม่
- ถ้า push ไม่สำเร็จ ให้บอก error และ next step ที่ตรงไปตรงมา
