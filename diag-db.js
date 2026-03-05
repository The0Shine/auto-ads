const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://autoads:autoads_dev@127.0.0.1:5433/autoads'
});

console.log('Testing connection to postgresql://autoads:autoads_dev@localhost:5432/autoads');

pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Connection failed:', err.message);
  } else {
    console.log('✅ Connection successful:', res.rows[0]);
  }
  pool.end();
});
