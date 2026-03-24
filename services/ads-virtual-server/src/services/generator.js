// Generate numeric-style IDs matching real Facebook Marketing API format
// FB IDs are numeric strings like "23843012345678"
// We prefix with "mock_" to distinguish during development
function generateId() {
  const ts = Date.now().toString();
  const rand = Math.floor(Math.random() * 99999).toString().padStart(5, '0');
  return `${ts}${rand}`;
}

module.exports = { generateId };