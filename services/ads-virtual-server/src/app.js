const express = require('express');
const app = express();

app.use(express.json());

app.use('/campaigns', require('./routes/campaign.route'));
app.use('/adsets', require('./routes/adset.route'));
app.use('/ads', require('./routes/ad.route'));
app.use('/insights', require('./routes/insights.route'));

app.listen(4001, () => {
  console.log('🚀 Ads Virtual Server running on port 4001');
});