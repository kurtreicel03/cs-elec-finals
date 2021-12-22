const mongoose = require('mongoose');

require('dotenv').config({ path: './config.env' });

const db = process.env.DB.replace('<PASSWORD>', process.env.DB_PASSWORD);

const port = process.env.PORT || 3000;
const app = require('./app');

(async () => {
  try {
    await mongoose.connect(db, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useFindAndModify: false,
      useCreateIndex: true,
    });

    console.log('DB CONNECTION SUCCESSFUL');

    await app.listen(port);

    console.log(`App Listening on port ${port}`);
  } catch (error) {
    console.log(error);
  }
})();
