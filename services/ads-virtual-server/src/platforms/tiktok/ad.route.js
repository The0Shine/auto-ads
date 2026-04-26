const router = require("express").Router();
const { generateId } = require("../../common/generator");

const store = new Map();

router.post("/", (req, res) => {
  const { adgroup_id } = req.body;

  if (!adgroup_id) {
    return res.json({ code: 400 });
  }

  const id = generateId("ttad");

  store.set(id, {
    ad_id: id,
    adgroup_id,
  });

  res.json({
    code: 0,
    data: { ad_id: id },
  });
});

module.exports = router;
