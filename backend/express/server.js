const express = require('express');
const path = require('path');
const cors = require('cors');
const app = express();

app.use(cors());
app.use('/stems', express.static(path.join(__dirname, '..', 'audio', 'stems')));
app.use('/good-bad', express.static(path.join(__dirname, '..', 'audio', 'demos')));
app.use('/renders', express.static(path.join(__dirname, '..', 'audio', 'renders')));

app.listen(3001, () => console.log('SONODS backend running on port 3001'));
