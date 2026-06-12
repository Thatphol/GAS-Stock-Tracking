function appendPortfolioTracking() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const sourceSheet = ss.getSheetByName("Portfolio");
  const targetSheet = ss.getSheetByName("Portfolio - Tracking");

  if (!sourceSheet) {
    throw new Error('Sheet "Portfolio" not found');
  }

  if (!targetSheet) {
    throw new Error('Sheet "Portfolio - Tracking" not found');
  }

  const lastRow = sourceSheet.getLastRow();

  if (lastRow <= 1) {
    Logger.log("No portfolio rows to append.");
    return;
  }

  // Copy A:N so portfolio weight is preserved, then write timestamp to Column O.
  const data = sourceSheet
    .getRange(2, 1, lastRow - 1, 14)
    .getValues();

  const timestamp = new Date();

  const finalData = data.map(row => {
    if (row.join("") === "") return null;

    return [...row, timestamp];
  }).filter(row => row !== null);

  if (finalData.length === 0) {
    Logger.log("No non-empty portfolio rows to append.");
    return;
  }

  const targetLastRow = targetSheet.getLastRow();

  targetSheet
    .getRange(targetLastRow + 1, 1, finalData.length, finalData[0].length)
    .setValues(finalData);

  targetSheet
    .getRange(targetLastRow + 1, 15, finalData.length, 1)
    .setNumberFormat("yyyy-mm-dd hh:mm:ss");

  Logger.log(`Append completed: ${finalData.length} rows.`);
}
