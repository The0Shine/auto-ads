const router = require("express").Router();
const { generateId } = require("../../common/generator");

const store = new Map();

router.post("/", (req, res) => {
  const { adgroup_id, headline } = req.body;

  if (!adgroup_id) {
    return res.status(400).json({ error: "adgroup_id required" });
  }

  const id = generateId("gad");

  const ad = {
    id,
    adgroup_id,
    headline,
    status: "ENABLED",
  };

  store.set(id, ad);

  res.json(ad);
});

module.exports = router;
