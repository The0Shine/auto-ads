const router = require("express").Router();
const { generateId } = require("../../common/generator");

const store = new Map();

router.post("/", (req, res) => {
  const { campaign_name } = req.body;

  if (!campaign_name) {
    return res.json({
      code: 400,
      message: "campaign_name required",
    });
  }

  const id = generateId("ttcmp");

  store.set(id, {
    campaign_id: id,
    campaign_name,
    status: "DISABLE",
  });

  res.json({
    code: 0,
    message: "OK",
    data: { campaign_id: id },
  });
});

router.get("/:id", (req, res) => {
  const data = store.get(req.params.id);

  if (!data) {
    return res.json({ code: 404, message: "not found" });
  }

  res.json({
    code: 0,
    data,
  });
});

module.exports = router;
