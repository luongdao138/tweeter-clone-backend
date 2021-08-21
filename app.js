require('dotenv').config();
const express = require('express');
const app = express();
const cors = require('cors');

require('./config/database');

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(
  cors({
    origin: [
      'https://heuristic-brahmagupta-807e2b.netlify.app',
      'http://localhost:3000',
    ],
    credentials: true,
  })
);

const authRouter = require('./routes/auth');
const userRouter = require('./routes/user');
const tweetRouter = require('./routes/tweet');
const commentRouter = require('./routes/comment');

app.use('/api/auth', authRouter);
app.use('/api/users', userRouter);
app.use('/api/tweets', tweetRouter);
app.use('/api/comments', commentRouter);

const PORT = process.env.PORT;
app.listen(PORT, () => console.log(`server listening on port ${PORT}`));
