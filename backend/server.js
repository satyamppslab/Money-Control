const dotenv = require('dotenv');
dotenv.config();

const connectDB = require('./config/db');
const app = require('./app');

connectDB().catch((error) => {
  console.error(`Failed to connect to MongoDB: ${error.message}`);
  process.exit(1);
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
