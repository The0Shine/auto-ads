const router = require("express").Router();
const { generateId } = require("../../common/generator");

const store = new Map();

router.post("/", (req, res) => {
  const { name, campaign_id } = req.body;

  if (!campaign_id) {
    return res.status(400).json({ error: "campaign_id required" });
  }

  const id = generateId("gadg");

  const adgroup = {
    id,
    name,
    campaign_id,
    status: "ENABLED",
  };

  store.set(id, adgroup);

  res.json(adgroup);
});

module.exports = router;
