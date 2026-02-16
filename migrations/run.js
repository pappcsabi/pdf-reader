const { pool } = require('../config/db');
const fs = require('fs');
const path = require('path');

async function run() {
  const sql = fs.readFileSync(
    path.join(__dirname, 'init.sql'),
    'utf8'
  );
  await pool.query(sql);
  console.log('Migrations completed.');
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
