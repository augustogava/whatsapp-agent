const express = require('express');
const bodyParser = require('body-parser');
const apiRoutes = require('./routes/api');
const { port } = require('./config/config');

const app = express();

app.use(bodyParser.json());

app.use('/api', apiRoutes);

app.get('/', (req, res) => {
    res.send('WhatsApp Bot is running');
});

app.listen(port, () => {
    console.log(`Server is listening on port ${port}`);
});
