require("dotenv").config();
const express = require("express");
const app = express();
const cors = require("cors");
const mongoose = require("mongoose");
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cors());
app.use(express.static("public"));
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

//! ===== connect to database cloud =====
const initConnection = () => {
  return mongoose
    .connect(process.env.MONGO_URL, { useNewUrlParser: true })
    .then(() => console.log("connected to Database"))
    .catch((err) => console.log(`error in Database connection => ${err}`));
};
initConnection();

//! ===== database schemas =====
const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
    },
  },
  { versionKey: false }
);
const exerciseSchema = new mongoose.Schema(
  {
    userId: String,
    description: String,
    duration: Number,
    date: String,
  },
  { versionKey: false }
);

//! ===== database models =====
const userModel = mongoose.model("user", userSchema);
const exerciseModel = mongoose.model("exercise", exerciseSchema);

//! ========== A P I  ==========
// Get => /api/users
app.get("/api/users", async (req, res, next) => {
  const users = await userModel.find({});
  res.json(users);
});

// POST => /api/users
app.post("/api/users", async (req, res, next) => {
  const username = req.body.username;
  const foundUser = await userModel.findOne({ username });
  if (foundUser) {
    return res.json(foundUser);
  }
  const user = await userModel.create({ username });
  res.json(user);
});

// POST => /api/users/:_id/exercises
app.post("/api/users/:_id/exercises", async (req, res, next) => {
  let { description, duration, date } = req.body;
  let { _id } = req.params;
  if (!date) {
    date = new Date();
  } else {
    date = new Date(date);
  }
  let checkedUser = await userModel.findById(_id);

  if (checkedUser) {
    const newExercise = await exerciseModel.create({
      userId: _id,
      description: description,
      duration: duration,
      date: date.toDateString(),
    });
    res.json({
      _id: checkedUser._id,
      username: checkedUser.username,
      date: date.toDateString(),
      duration: newExercise.duration,
      description: newExercise.description,
    });
  } else {
    res.json({ error: "user not found" });
  }
});

// GET => /api/users/:_id/logs
app.get("/api/users/:_id/logs", async (req, res, next) => {
  let { _id } = req.params;
  let { from, to, limit } = req.query;

  let filter = {
    userId: _id,
  };
  let dateFilter = {};
  if (from) {
    dateFilter["$gte"] = new Date(from);
  }
  if (to) {
    dateFilter["$gte"] = new Date(to);
  }
  if (from || to) {
    filter.dateFilter = dateFilter;
  }

  if (!limit) {
    limit = 100;
  }

  let checkedUser = await userModel.findById(_id);
  if (checkedUser) {
    await exerciseModel
      .find(filter, { _id: 0, userId: 0 })
      .limit(limit)
      .then((value) => {
        res.json({
          _id: checkedUser._id,
          username: checkedUser.username,
          count: value.length,
          log: value,
        });
      });
  } else {
    res.json({ error: "user not found" });
  }
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
