const express = require('express');
const app = express();

app.use(express.json());

app.get('/health', (_, res) => res.json({
  status:    'ok',
  service:   'ads-virtual-server',
  timestamp: new Date().toISOString(),
}));

app.use('/campaigns',   require('./routes/campaign.route'));
app.use('/adsets',      require('./routes/adset.route'));
app.use('/adcreatives', require('./routes/adcreative.route'));
app.use('/adimages',    require('./routes/adimage.route'));
app.use('/ads',         require('./routes/ad.route'));
app.use('/insights',    require('./routes/insights.route'));
app.use('/simulate',    require('./routes/simulate.route'));

// Only start listening when run directly (not during tests)
if (require.main === module) {
  const PORT = process.env.PORT || 4001;
  app.listen(PORT, () => {
    console.log(`🚀 Ads Virtual Server running on port ${PORT}`);
  });
}

module.exports = app;
