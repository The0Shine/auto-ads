const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.TIMESCALE_URL,
  max: 20,
});

pool.on("connect", () => {
  console.log("✅ TimescaleDB connected");
});

pool.on("error", (err) => {
  console.error("❌ Timescale error:", err.message);
});

module.exports = pool;
