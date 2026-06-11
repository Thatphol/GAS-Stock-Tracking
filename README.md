# Stock Tracking Dashboard

โปรเจกต์นี้คือ Google Apps Script Web App สำหรับทำ dashboard ติดตามพอร์ตหุ้นส่วนตัว โดยใช้ Google Sheets เป็นแหล่งข้อมูลหลัก และใช้ Chart.js แสดงผลบนหน้าเว็บ

## ภาพรวม

ระบบอ่านข้อมูลจาก Google Sheets แล้วแสดงผลเป็น dashboard สำหรับดูภาพรวมพอร์ต, กำไรขาดทุน, allocation, historical tracking, monthly summary และ goal progress

ฟีเจอร์หลัก:

- Dashboard รวมมูลค่าพอร์ตเป็น THB และ USD
- สรุป profit/loss ทั้งจำนวนเงินและเปอร์เซ็นต์
- Daily change จากข้อมูล tracking รายวัน
- Best performer และ worst performer
- Goal progress จากชีต `Goal - Plan`
- Portfolio weight chart
- Profit/Loss by stock chart
- Application Exposure chart แยกตาม application พร้อม `Total THB` และ `Cost`
- Daily Portfolio Value chart พร้อม Cost Basis line
- Monthly Summary และ monthly trend
- Holdings table
- Target allocation table สำหรับดู buy/trim suggestion แบบ equal weight
- Rule-based summary จากข้อมูลและ filter ปัจจุบัน

## Technology

- Google Apps Script V8
- Google Sheets
- HTML Service
- Chart.js
- chartjs-plugin-datalabels
- clasp สำหรับ sync code ระหว่าง local workspace กับ Google Apps Script

## Project Structure

```text
.
├── .clasp.json
├── appsscript.json
├── Tracking - stock.js
├── Page
│   ├── Code.js
│   ├── Index.html
│   └── Style.html
├── README.md
└── skill.md
```

## Important Files

### `appsscript.json`

ตั้งค่า Apps Script project:

- `timeZone`: `Asia/Bangkok`
- `runtimeVersion`: `V8`
- web app execute as deployer
- web app access: anonymous

### `.clasp.json`

ผูก local workspace กับ Google Apps Script project ผ่าน `scriptId`

### `Page/Code.js`

เป็น backend ของ Apps Script

หน้าที่หลัก:

- `doGet()` render หน้า `Page/Index`
- `getDashboardData()` รวมข้อมูลทั้งหมดเพื่อส่งให้ frontend
- อ่านข้อมูลจากชีต `Portfolio`
- อ่าน historical data จากชีต `Portfolio - Tracking`
- อ่าน goal จากชีต `Goal - Plan`
- aggregate daily tracking
- คำนวณ DoD และ monthly summary
- แปลงตัวเลข/เปอร์เซ็นต์/วันที่ให้พร้อมใช้งาน

### `Page/Index.html`

เป็นหน้า dashboard และมี JavaScript ฝั่ง frontend อยู่ท้ายไฟล์

หน้าที่หลัก:

- โหลดข้อมูลผ่าน `google.script.run.getDashboardData()`
- render cards, charts, tables และ summaries
- จัดการ filter ตาม date, application และ stock
- รวม holdings ตาม stock
- คำนวณ summary ฝั่ง client หลัง filter
- render Chart.js charts

### `Page/Style.html`

CSS สำหรับ layout และ responsive UI ของ dashboard

### `Tracking - stock.js`

มีฟังก์ชัน `appendPortfolioTracking()` สำหรับ copy current portfolio snapshot จากชีต `Portfolio` ไปต่อท้ายในชีต `Portfolio - Tracking` พร้อม timestamp

เหมาะสำหรับตั้ง time-driven trigger ให้รันวันละครั้ง เพื่อเก็บประวัติพอร์ต

## Required Google Sheets

โปรเจกต์คาดหวังว่า spreadsheet จะมีชีตเหล่านี้:

- `Portfolio`
- `Portfolio - Tracking`
- `Goal - Plan`

## `Portfolio` Sheet Columns

ข้อมูลเริ่มจาก row 2 โดย row 1 เป็น header

| Column | Field |
| --- | --- |
| A | Stock Name |
| B | Price |
| C | Quantity |
| D | Current Value |
| E | Total Cost |
| F | Bought THB |
| G | Avg Cost |
| H | Profit/Loss % |
| I | Profit/Loss THB |
| J | Profit/Loss USD |
| K | Total THB |
| L | Total USD |
| M | Application |
| N | Portfolio Weight |

## `Portfolio - Tracking` Sheet

ใช้เก็บ snapshot รายวันจาก `Portfolio`

`appendPortfolioTracking()` จะ copy คอลัมน์ A:N จาก `Portfolio` แล้วเพิ่ม timestamp ที่คอลัมน์ O

frontend/backend ใช้ข้อมูลนี้เพื่อทำ:

- Daily Portfolio Value
- Cost Basis
- Day-over-day change
- Monthly Summary
- Monthly Flow

หมายเหตุ: โค้ดรองรับข้อมูลเก่าที่ timestamp เคยอยู่ Column N โดย fallback จาก Column O ไป Column N

## `Goal - Plan` Sheet

อ่านค่า goal จาก row 2:

| Cell | Field |
| --- | --- |
| A2 | Total Cost Goal |
| B2 | Total Value THB Goal |

ถ้าไม่มีชีตนี้ ระบบจะใช้ goal เป็น `0`

## Data Flow

1. ผู้ใช้เปิด Apps Script Web App
2. `doGet()` render `Page/Index`
3. frontend เรียก `google.script.run.getDashboardData()`
4. backend อ่านข้อมูลจาก Google Sheets
5. backend ส่ง JSON กลับไปที่ frontend
6. frontend เก็บข้อมูลไว้ใน `dashboardData`
7. เมื่อ filter เปลี่ยน frontend จะคำนวณ summary ใหม่และ render UI ใหม่

## Development Workflow

แก้ไฟล์ใน local workspace:

```bash
C:\Users\Thattaphol\Desktop\Workspace\Stock-Tracking
```

หลังแก้ไฟล์ Apps Script/HTML/CSS ต้อง push ขึ้น Google Apps Script:

```bash
clasp push
```

ถ้าแก้เฉพาะ Markdown เช่น `README.md` หรือ `skill.md` ไฟล์อาจไม่ถูกส่งขึ้น GAS เพราะ `.clasp.json` กำหนด extensions ที่ push เป็น `.js`, `.gs`, `.html`, `.json`

## Deployment

หลัง `clasp push` ถ้าเป็นการแก้ code ใน deployment เดิม บางกรณีอาจต้อง deploy version ใหม่ใน Apps Script UI หรือใช้ clasp deployment command ตาม workflow ที่เลือกไว้

## Notes

- โปรเจกต์นี้ไม่ใช่ Node.js app และไม่มี local dev server
- UI รันใน Google Apps Script HTML Service
- การเรียก backend ใช้ `google.script.run`
- External libraries โหลดผ่าน CDN ใน `Page/Index.html`
- การคำนวณบางส่วนทำซ้ำทั้ง backend และ frontend เพื่อรองรับ filtering ฝั่ง client
