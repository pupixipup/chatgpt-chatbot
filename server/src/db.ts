import mongoose from "mongoose";

class Database {
  connect() {
    if (!process.env.MONGO_URL) throw new Error("Could not find MONGO_URL in .env");
    return mongoose.connect(process.env.MONGO_URL)
    .then(() => console.log('Connected to MongoDB'))
    .catch(error => console.error('Error connecting to MongoDB', error));
  }
}

export default new Database();