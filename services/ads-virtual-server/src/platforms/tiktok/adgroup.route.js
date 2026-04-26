const router = require("express").Router();
const { generateId } = require("../../common/generator");

const store = new Map();

router.post("/", (req, res) => {
  const { campaign_id, adgroup_name } = req.body;

  if (!campaign_id) {
    return res.json({ code: 400 });
  }

  const id = generateId("ttadg");

  store.set(id, {
    adgroup_id: id,
    campaign_id,
    adgroup_name,
  });

  res.json({
    code: 0,
    data: { adgroup_id: id },
  });
});

module.exports = router;
