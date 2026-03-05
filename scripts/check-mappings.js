const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://autoads:autoads_dev@127.0.0.1:5433/autoads'
});

pool.query("SELECT entity_type, platform, platform_id, sync_status FROM platform_mappings WHERE platform = 'facebook'", (err, res) => {
  if (err) console.error(err.message);
  else {
    console.log('Platform Mappings:');
    console.table(res.rows);
  }
  pool.end();
});
