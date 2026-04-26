const router = require("express").Router();
const { generateId } = require("../../common/generator");

// In-memory store
const store = new Map();

async function simulateFB(res) {
  await new Promise((r) => setTimeout(r, 200));
  if (Math.random() < 0.05) {
    res.status(429).json({
      error: {
        message: "User request limit reached",
        type: "OAuthException",
        code: 17,
      },
    });
    return false;
  }
  return true;
}

// POST / — Create AdCreative (mirrors FB: POST /act_{id}/adcreatives)
// Accepts:
//   name, object_story_spec { page_id, link_data { image_hash, picture, link, message, name } }
//   OR: name, object_story_id  (existing post)
router.post("/", async (req, res) => {
  try {
    if (!(await simulateFB(res))) return;

    const { name, object_story_spec, object_story_id } = req.body;
    if (!name)
      return res.status(400).json({
        error: {
          message: "name is required",
          type: "OAuthException",
          code: 100,
        },
      });

    const id = generateId();

    const record = {
      id,
      name,
      created_time: new Date().toISOString(),
    };

    // Store full creative spec for GET retrieval
    if (object_story_id) {
      record.object_story_id = object_story_id;
    } else if (object_story_spec) {
      record.object_story_spec = object_story_spec;
      // Extract preview fields for convenience
      const linkData = object_story_spec?.link_data || {};
      record.image_hash = linkData.image_hash || null;
      record.image_url = linkData.picture || null;
      record.link = linkData.link || null;
      record.message = linkData.message || null;
      record.headline = linkData.name || null;
      record.call_to_action = linkData.call_to_action || null;
    }

    store.set(id, record);

    // FB returns only { id } for adcreatives by default
    res.json({ id });
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// GET /:id — Read AdCreative
router.get("/:id", async (req, res) => {
  const creative = store.get(req.params.id);
  if (!creative)
    return res.status(404).json({
      error: {
        message: "Invalid adcreative ID",
        type: "OAuthException",
        code: 100,
      },
    });
  res.json(creative);
});

module.exports = router;
