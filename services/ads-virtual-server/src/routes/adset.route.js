const router = require('express').Router();
const { generateId } = require('../services/generator');

router.post('/', async (req, res) => {
  try {
    const id = generateId('adset');
    res.json({ id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;