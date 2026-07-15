const SHEET_NAME = 'Portfolio';
const TRACKING_SHEET_NAME = 'Portfolio - Tracking';
const GOAL_SHEET_NAME = 'Goal - Plan';
const TRACKING_TIMESTAMP_COLUMN_INDEX = 14; // Column O, zero-based row index.
const DASHBOARD_CACHE_KEY = 'dashboard-v1';
const DASHBOARD_CACHE_SECONDS = 60;
const DASHBOARD_CACHE_CHUNK_SIZE = 90000;

function doGet(e) {
  if (e && e.parameter && e.parameter.api === '1') {
    return getDashboardApiResponse(e.parameter.callback);
  }

  return HtmlService
    .createTemplateFromFile('Page/Index')
    .evaluate()
    .setTitle('My Stock Tracking')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function getDashboardData() {
  const cache = CacheService.getScriptCache();
  const cached = readDashboardCache(cache);

  if (cached) return cached;

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const stocksResult = getStockData(ss);
  const trackingRows = getTrackingRows(ss);
  const dailyTracking = aggregateTrackingRowsByDate(trackingRows);

  const result = {
    stocks: stocksResult.stocks,
    summary: stocksResult.summary,
    goals: getGoalPlanData(ss),
    trackingRows: trackingRows,
    dailyTracking: dailyTracking,
    dod: calculateDoD(dailyTracking),
    monthlySummary: calculateMonthlySummary(dailyTracking),
    generatedAt: new Date().toISOString()
  };

  writeDashboardCache(cache, result);
  return result;
}

function getDashboardApiResponse(callback) {
  if (!callback || !/^[A-Za-z_$][0-9A-Za-z_$]*$/.test(callback)) {
    return ContentService
      .createTextOutput(JSON.stringify(getDashboardData()))
      .setMimeType(ContentService.MimeType.JSON);
  }

  return ContentService
    .createTextOutput(callback + '(' + JSON.stringify(getDashboardData()) + ');')
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function readDashboardCache(cache) {
  const count = Number(cache.get(DASHBOARD_CACHE_KEY + ':count'));
  if (!count) return null;

  const keys = Array.from({ length: count }, (_, index) => DASHBOARD_CACHE_KEY + ':' + index);
  const chunks = cache.getAll(keys);
  if (keys.some(key => !chunks[key])) return null;

  try {
    return JSON.parse(keys.map(key => chunks[key]).join(''));
  } catch (error) {
    return null;
  }
}

function writeDashboardCache(cache, data) {
  const json = JSON.stringify(data);
  const chunks = {};
  let count = 0;

  for (let offset = 0; offset < json.length; offset += DASHBOARD_CACHE_CHUNK_SIZE) {
    chunks[DASHBOARD_CACHE_KEY + ':' + count] = json.slice(offset, offset + DASHBOARD_CACHE_CHUNK_SIZE);
    count += 1;
  }

  cache.putAll(chunks, DASHBOARD_CACHE_SECONDS);
  cache.put(DASHBOARD_CACHE_KEY + ':count', String(count), DASHBOARD_CACHE_SECONDS);
}

function getGoalPlanData(ss) {
  ss = ss || SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(GOAL_SHEET_NAME);

  if (!sheet) {
    return {
      totalCostGoal: 0,
      totalValueTHBGoal: 0
    };
  }

  const values = sheet.getRange(2, 1, 1, 2).getValues()[0];

  return {
    totalCostGoal: toNumber(values[0]),
    totalValueTHBGoal: toNumber(values[1])
  };
}

function getStockData(ss) {
  ss = ss || SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    throw new Error(`Sheet "${SHEET_NAME}" not found`);
  }

  const lastRow = sheet.getLastRow();
  const values = lastRow ? sheet.getRange(1, 1, lastRow, 14).getValues() : [];

  if (values.length <= 1) {
    return {
      stocks: [],
      summary: getEmptySummary()
    };
  }

  const rows = values.slice(1).filter(row => row[0] !== '');

  const data = rows.map(row => {
    return {
      stockName: row[0],
      price: toNumber(row[1]),
      quantity: toNumber(row[2]),
      currentValue: toNumber(row[3]),
      totalCost: toNumber(row[4]),
      boughtTHB: toNumber(row[5]),
      avgCost: toNumber(row[6]),
      profitLossPercent: toPercentNumber(row[7]),
      profitLossTHB: toNumber(row[8]),
      profitLossUSD: toNumber(row[9]),
      totalTHB: toNumber(row[10]),
      totalUSD: toNumber(row[11]),
      application: row[12] || 'Unknown',
      portfolioWeight: toPercentNumber(row[13])
    };
  });

  return {
    stocks: data,
    summary: calculateSummary(data)
  };
}

function getDailyTrackingData() {
  return aggregateTrackingRowsByDate(getTrackingRows());
}

function getTrackingRows(ss) {
  ss = ss || SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(TRACKING_SHEET_NAME);

  if (!sheet) {
    throw new Error(`Sheet "${TRACKING_SHEET_NAME}" not found`);
  }

  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    return [];
  }

  return sheet.getRange(2, 1, lastRow - 1, 15).getValues()
    .filter(row => row[0] !== '')
    .map(row => {
      const dateValue = row[TRACKING_TIMESTAMP_COLUMN_INDEX] || row[13]; // Column O, fallback for older Column N data

      if (!dateValue) return null;

      return {
        stockName: row[0],
        boughtTHB: toNumber(row[5]),
        profitLossTHB: toNumber(row[8]),
        profitLossUSD: toNumber(row[9]),
        totalTHB: toNumber(row[10]),
        totalUSD: toNumber(row[11]),
        application: row[12] || 'Unknown',
        date: formatDateKey(dateValue)
      };
    })
    .filter(item => item !== null);
}

function aggregateTrackingRowsByDate(trackingRows) {
  const dailyMap = {};

  trackingRows.forEach(row => {
    const dateKey = row.date;

    if (!dailyMap[dateKey]) {
      dailyMap[dateKey] = {
        date: dateKey,
        totalTHB: 0,
        totalUSD: 0,
        profitLossTHB: 0,
        profitLossUSD: 0,
        totalCost: 0,
        stockCount: 0,
        stocks: {}
      };
    }

    dailyMap[dateKey].totalTHB += row.totalTHB;
    dailyMap[dateKey].totalUSD += row.totalUSD;
    dailyMap[dateKey].profitLossTHB += row.profitLossTHB;
    dailyMap[dateKey].profitLossUSD += row.profitLossUSD;
    dailyMap[dateKey].totalCost += row.boughtTHB;

    if (row.stockName) {
      dailyMap[dateKey].stocks[String(row.stockName).toUpperCase()] = true;
    }
  });

  return Object.values(dailyMap)
    .map(item => {
      item.stockCount = Object.keys(item.stocks).length;
      delete item.stocks;
      return item;
    })
    .sort((a, b) => new Date(a.date) - new Date(b.date));
}

function calculateDoD(dailyData) {
  if (!dailyData || dailyData.length < 2) {
    return {
      totalTHB: 0,
      totalUSD: 0,
      profitLossTHB: 0,
      profitLossUSD: 0,
      totalTHBPercent: 0,
      totalUSDPercent: 0,
      profitLossTHBPercent: 0,
      latestDate: '',
      previousDate: ''
    };
  }

  const latest = dailyData[dailyData.length - 1];
  const previous = dailyData[dailyData.length - 2];

  const totalTHBDiff = latest.totalTHB - previous.totalTHB;
  const totalUSDDiff = latest.totalUSD - previous.totalUSD;
  const profitLossTHBDiff = latest.profitLossTHB - previous.profitLossTHB;
  const profitLossUSDDiff = latest.profitLossUSD - previous.profitLossUSD;

  return {
    totalTHB: totalTHBDiff,
    totalUSD: totalUSDDiff,
    profitLossTHB: profitLossTHBDiff,
    profitLossUSD: profitLossUSDDiff,
    totalTHBPercent: calculatePercentChange(totalTHBDiff, previous.totalTHB),
    totalUSDPercent: calculatePercentChange(totalUSDDiff, previous.totalUSD),
    profitLossTHBPercent: calculatePercentChange(profitLossTHBDiff, previous.profitLossTHB),
    latestDate: latest.date,
    previousDate: previous.date
  };
}

function calculatePercentChange(diff, previousValue) {
  const denominator = Math.abs(Number(previousValue || 0));
  return denominator === 0 ? 0 : (diff / denominator) * 100;
}

function calculateMonthlySummary(dailyData) {
  if (!dailyData || dailyData.length === 0) {
    return {
      monthLabel: '-',
      latestDate: '-',
      totalTHB: 0,
      totalUSD: 0,
      profitLossTHB: 0,
      profitLossUSD: 0,
      daysTracked: 0,
      momTHB: 0,
      momTHBPercent: 0
    };
  }

  const monthlyMap = {};

  dailyData.forEach(item => {
    const monthKey = item.date.substring(0, 7);

    if (!monthlyMap[monthKey]) {
      monthlyMap[monthKey] = {
        monthKey,
        days: [],
        latestDate: item.date,
        totalTHB: item.totalTHB,
        totalUSD: item.totalUSD,
        profitLossTHB: item.profitLossTHB,
        profitLossUSD: item.profitLossUSD
      };
    }

    monthlyMap[monthKey].days.push(item);

    if (new Date(item.date) >= new Date(monthlyMap[monthKey].latestDate)) {
      monthlyMap[monthKey].latestDate = item.date;
      monthlyMap[monthKey].totalTHB = item.totalTHB;
      monthlyMap[monthKey].totalUSD = item.totalUSD;
      monthlyMap[monthKey].profitLossTHB = item.profitLossTHB;
      monthlyMap[monthKey].profitLossUSD = item.profitLossUSD;
    }
  });

  const months = Object.values(monthlyMap)
    .sort((a, b) => new Date(a.monthKey + '-01') - new Date(b.monthKey + '-01'));

  const latestMonth = months[months.length - 1];
  const previousMonth = months.length >= 2 ? months[months.length - 2] : null;

  const momTHB = previousMonth ? latestMonth.totalTHB - previousMonth.totalTHB : 0;
  const momTHBPercent = previousMonth && previousMonth.totalTHB !== 0
    ? (momTHB / previousMonth.totalTHB) * 100
    : 0;

  return {
    monthLabel: formatMonthLabel(latestMonth.monthKey),
    latestDate: latestMonth.latestDate,
    totalTHB: latestMonth.totalTHB,
    totalUSD: latestMonth.totalUSD,
    profitLossTHB: latestMonth.profitLossTHB,
    profitLossUSD: latestMonth.profitLossUSD,
    daysTracked: latestMonth.days.length,
    momTHB: momTHB,
    momTHBPercent: momTHBPercent
  };
}

function calculateSummary(data) {
  const totalValueTHB = data.reduce((sum, item) => sum + item.totalTHB, 0);
  const totalValueUSD = data.reduce((sum, item) => sum + item.totalUSD, 0);
  const totalCost = data.reduce((sum, item) => sum + item.boughtTHB, 0);
  const totalProfitTHB = data.reduce((sum, item) => sum + item.profitLossTHB, 0);
  const totalProfitUSD = data.reduce((sum, item) => sum + item.profitLossUSD, 0);

  const totalProfitPercent = totalCost === 0
    ? 0
    : (totalProfitTHB / totalCost) * 100;

  return {
    totalValueTHB,
    totalValueUSD,
    totalCost,
    totalProfitTHB,
    totalProfitUSD,
    totalProfitPercent,
    stockCount: data.length
  };
}

function getEmptySummary() {
  return {
    totalValueTHB: 0,
    totalValueUSD: 0,
    totalCost: 0,
    totalProfitTHB: 0,
    totalProfitUSD: 0,
    totalProfitPercent: 0,
    stockCount: 0
  };
}

function toNumber(value) {
  if (value === null || value === undefined || value === '') return 0;

  if (typeof value === 'number') return value;

  return Number(
    String(value)
      .replace('฿', '')
      .replace('$', '')
      .replace('%', '')
      .replace(/,/g, '')
      .trim()
  ) || 0;
}

function toPercentNumber(value) {
  if (value === null || value === undefined || value === '') return 0;

  if (typeof value === 'number') {
    if (Math.abs(value) <= 1) return value * 100;
    return value;
  }

  return Number(
    String(value)
      .replace('%', '')
      .replace(/,/g, '')
      .trim()
  ) || 0;
}

function formatDateKey(value) {
  if (Object.prototype.toString.call(value) === '[object Date]') {
    return Utilities.formatDate(
      value,
      Session.getScriptTimeZone(),
      'yyyy-MM-dd'
    );
  }

  const parsed = new Date(value);

  if (!isNaN(parsed.getTime())) {
    return Utilities.formatDate(
      parsed,
      Session.getScriptTimeZone(),
      'yyyy-MM-dd'
    );
  }

  return String(value);
}

function formatMonthLabel(monthKey) {
  const date = new Date(monthKey + '-01');

  if (isNaN(date.getTime())) {
    return monthKey;
  }

  return Utilities.formatDate(
    date,
    Session.getScriptTimeZone(),
    'MMM yyyy'
  );
}
