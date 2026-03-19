const express = require('express');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// API routes
app.use('/api/projects', require('./routes/projects'));
app.use('/api', require('./routes/days'));
app.use('/api', require('./routes/benchmarks'));
app.use('/api', require('./routes/cameras'));
app.use('/api', require('./routes/rolls'));
app.use('/api', require('./routes/export'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`DIT Report server running at http://localhost:${PORT}`);
  console.log(`Admin UI: http://localhost:${PORT}/admin.html`);
});
