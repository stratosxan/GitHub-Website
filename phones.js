const fs = require('fs');
const XLSX = require('xlsx');

const XlsxPopulate = require('xlsx-populate');

// Load the Excel file

const workbook = XLSX.readFile('../PAN_HLAGORA_2020_APOTHIKI.xlsx')
  .then(workbook => {
    // Load the first sheet
    const sheet = workbook.sheet(0);

    // Define the unique code you want to search for
    const uniqueCode = '13-03-0200002';

    // Find the column index for the "Κωδικός" column
    const columnHeaders = sheet.usedRange().value()[0];
    const codeColumnIndex = columnHeaders.indexOf('Κωδικός');

    if (codeColumnIndex === -1) {
      console.log('Column "Κωδικός" not found.');
    } else {
      // Search for the unique code in the "Κωδικός" column
      const data = sheet.usedRange().value();
      for (const row of data) {
        if (row[codeColumnIndex] === uniqueCode) {
          // Print the entire row
          console.log('Found Row:', row);
          break;
        }
      }

      // If the loop finishes without finding the code
      console.log('Item not found');
    }
  })
  .catch(error => {
    console.error('Error:', error);
  });
