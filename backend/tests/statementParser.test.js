const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { parseCsvFile } = require('../services/csvParser');

test('parseCsvFile converts bank CSV rows into normalized transactions', async () => {
  const fixturePath = path.join(__dirname, 'fixtures', 'sample-bank.csv');
  const dir = path.dirname(fixturePath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    fixturePath,
    'Date,Description,Debit,Credit\n2024-01-01,SWIGGY,250,\n2024-01-02,SALARY,,45000\n',
    'utf8'
  );

  const rows = await parseCsvFile(fixturePath);

  assert.equal(rows.length, 2);
  assert.equal(rows[0].description, 'SWIGGY');
  assert.equal(rows[0].debit, 250);
  assert.equal(rows[0].credit, 0);
  assert.equal(rows[1].type, 'income');
  assert.equal(rows[1].category, 'Salary');
});
