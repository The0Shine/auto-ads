const router = require("express").Router();
const { generateId } = require("../../common/generator");

const store = new Map();

router.post("/", (req, res) => {
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ error: "name required" });
  }

  const id = generateId("gcmp");

  const campaign = {
    id,
    resource_name: `customers/123/campaigns/${id}`,
    name,
    status: "PAUSED",
    advertising_channel_type: "SEARCH",
  };

  store.set(id, campaign);

  res.json(campaign);
});

router.get("/:id", (req, res) => {
  const data = store.get(req.params.id);
  if (!data) return res.status(404).json({ error: "not found" });

  res.json(data);
});

module.exports = router;
