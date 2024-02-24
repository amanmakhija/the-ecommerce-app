const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const db_url = process.env.MONGO_URL;
const db_name = process.env.DB_NAME;

mongoose.connect(db_url, {
    dbName: db_name
}).then(() => {
    console.log('Database connected');
}).catch((err) => {
    console.log('Error connecting to database', err);
});