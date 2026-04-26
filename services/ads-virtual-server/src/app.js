const express = require("express");
const app = express();

app.use(express.json());

app.get("/health", (_, res) =>
  res.json({
    status: "ok",
    service: "ads-virtual-server",
    timestamp: new Date().toISOString(),
  }),
);

// FACEBOOK
app.use("/facebook/campaigns", require("./platforms/facebook/campaign.route"));
app.use("/facebook/adsets", require("./platforms/facebook/adset.route"));
app.use("/facebook/ads", require("./platforms/facebook/ad.route"));
app.use(
  "/facebook/adcreatives",
  require("./platforms/facebook/adcreative.route"),
);
app.use("/facebook/adimages", require("./platforms/facebook/adimage.route"));

// GOOGLE
app.use("/google/campaigns", require("./platforms/google/campaign.route"));
app.use("/google/adgroups", require("./platforms/google/adgroup.route"));
app.use("/google/ads", require("./platforms/google/ad.route"));

// TIKTOK
app.use("/tiktok/campaigns", require("./platforms/tiktok/campaign.route"));
app.use("/tiktok/adgroups", require("./platforms/tiktok/adgroup.route"));
app.use("/tiktok/ads", require("./platforms/tiktok/ad.route"));

// CORE
app.use("/insights", require("./api/insights.route"));
app.use("/simulate", require("./api/simulate.route"));

// Only start listening when run directly (not during tests)
if (require.main === module) {
  const PORT = process.env.PORT || 4001;
  app.listen(PORT, () => {
    console.log(`🚀 Ads Virtual Server running on port ${PORT}`);
  });
}

module.exports = app;
