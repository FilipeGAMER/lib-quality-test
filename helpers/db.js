module.exports = db;
const mongoose = require('mongoose');

function db() {
  let url = "mongodb://localhost:27017/mydb";

  this.connect = async function () {
    console.log("CONNECT");
    await mongoose.connect(url, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useFindAndModify: false,
      useCreateIndex: true
    });
  }
}