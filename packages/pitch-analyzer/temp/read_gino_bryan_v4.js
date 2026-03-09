const ExcelJS = require('exceljs');

async function main() {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile('C:/Users/volantbr/Downloads/Gino-Bryan_Pitch_Analysis_v4.xlsx');

    console.log('Sheets:', wb.worksheets.map(ws => ws.name));

    const ws = wb.worksheets[0];
    console.log('\nSheet:', ws.name);
    console.log('Row count:', ws.rowCount);

    // Print first 5 rows to understand structure
    for (let r = 1; r <= Math.min(6, ws.rowCount); r++) {
        const row = ws.getRow(r);
        const vals = [];
        row.eachCell((cell, colNum) => { vals[colNum] = cell.value; });
        console.log(`Row ${r}:`, JSON.stringify(vals));
    }

    // Find all columns
    console.log('\n--- All headers ---');
    for (let r = 1; r <= Math.min(5, ws.rowCount); r++) {
        const row = ws.getRow(r);
        const vals = [];
        row.eachCell((cell, colNum) => { vals.push(`[${colNum}] ${cell.value}`); });
        if (vals.some(v => v.includes('Video') || v.includes('Pitch') || v.includes('#'))) {
            console.log(`Header row ${r}:`, vals.join(' | '));
        }
    }
}

main().catch(console.error);
