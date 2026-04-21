import * as XLSX from 'xlsx';

export const exportToExcel = (data: any[], filename: string) => {
  if (!data || data.length === 0) {
    console.warn("No data provided to export.");
    return;
  }

  // Excel has a hard limit of 32,767 characters per cell.
  // We truncate any string that exceeds this limit.
  const processedData = data.map(row => {
    const newRow: any = {};
    for (const key in row) {
      if (typeof row[key] === 'string' && row[key].length > 32700) {
        newRow[key] = row[key].substring(0, 32700) + '... [TRUNCATED]';
      } else {
        newRow[key] = row[key];
      }
    }
    return newRow;
  });

  const worksheet = XLSX.utils.json_to_sheet(processedData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
  XLSX.writeFile(workbook, `${filename}.xlsx`);
};
