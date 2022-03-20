require('dotenv').config({ path: 'variables.env' });
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { Schema } = require('mongoose');
const mongoose = require('mongoose');
const { process_params } = require('express/lib/router');

const app = express();

const port = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({ extended: false }));

app.use('/public', express.static(`${process.cwd()}/public`));

app.use(cors());

mongoose.connect(process.env.DATABASE);
mongoose.Promise = global.Promise;
mongoose.connection.on('error', (err) => {
  console.error(`🚫 > ${err.message}`);
});

const usernameSchema = new Schema({
  username: {
    type: String,
    unique: true,
    required: 'Username is required',
  },
});

const Username = mongoose.model('Username', usernameSchema);

const exerciseSchema = new Schema({
  user: {
    type: Schema.ObjectId,
    ref: 'Username',
    required: 'Username _id is required',
  },
  description: {
    type: String,
    required: 'Desription is required',
  },
  duration: {
    type: Number,
    min: 0,
    required: 'Duration is required',
  },
  date: {
    type: Date,
    default: Date.now,
  },
});

const Exercise = mongoose.model('Exercise', exerciseSchema);

const catchErrors = (fn) => function (req, res, next) {
  return fn(req, res, next).catch(next);
};

const createUser = async (req, res) => {
  const addedUser = req.body.username;
  const user = new Username({ username: addedUser });
  user.save((err, data) => {
    res.json({ username: data.username, _id: data._id });
  });
};

const createExercise = async (req, res) => {
  const addingDate = req.body.date
    ? new Date(req.body.date).toDateString() : new Date().toDateString();
  const user = await Username.findById(req.body._id);
  const exercise = new Exercise({
    user: req.body._id,
    description: req.body.description,
    duration: parseFloat(req.body.duration),
    date: addingDate,
  }).save();

  res.json({
    username: user.username,
    description: req.body.description,
    duration: parseFloat(req.body.duration),
    date: addingDate,
    _id: req.body._id,
  });
};

const getExercises = async (req, res) => {
  const limitExercises = req.query.limit;
  const user = await Username.findById(req.params._id);
  const exercises = await Exercise.find({
    user: req.params._id,
    date: {
      $gte: req.query.from ? req.query.from : 0,
      $lte: req.query.to ? req.query.to : Date.now(),
    },
  }).limit(limitExercises);

  res.json({
    username: user.username,
    count: exercises.length,
    _id: user._id,
    log: exercises.map((each) => ({
      description: each.description,
      duration: each.duration,
      date: each.date.toDateString(),
    })),
  });
};

const getAllUsers = async (req, res) => {
  const allUserArray = await Username.find();
  res.json(allUserArray);
};

app.get('/', (req, res) => {
  res.sendFile(`${process.cwd()}/views/index.html`);
});

app.post('/api/users', catchErrors(createUser));

app.post('/api/users/:id/exercises', catchErrors(createExercise));

app.get('/api/users', catchErrors(getAllUsers));

app.get('/api/users/:_id/logs', catchErrors(getExercises));

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log(`Your app is listening on port ${listener.address().port}`);
});
