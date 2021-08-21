require('dotenv').config();
const express = require('express');
const app = express();
const cors = require('cors');
const socketIO = require('socket.io');
const http = require('http');

require('./config/database');

const server = http.Server(app);
const io = socketIO(
  server,
  {
    cors: {
      origins: '*:*',
    },
    path: '/tweeter-clone-socket.io',
  },
  ['polling', 'websocket']
);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(
  cors({
    origin: [
      'https://tender-banach-9ccbfb.netlify.app',
      'http://localhost:3000',
    ],
    credentials: true,
  })
);

const authRouter = require('./routes/auth');
const userRouter = require('./routes/user');
const tweetRouter = require('./routes/tweet');
const commentRouter = require('./routes/comment');
const notificationRouter = require('./routes/notification');

app.use('/api/auth', authRouter);
app.use('/api/users', userRouter);
app.use('/api/tweets', tweetRouter);
app.use('/api/comments', commentRouter);
app.use('/api/notifications', notificationRouter);

const PORT = process.env.PORT;
server.listen(PORT, () => console.log(`server listening on port ${PORT}`));

const User = require('./models/User');
const UserDetail = require('./models/User_Detail');
const Notification = require('./models/Notification');
io.on('connection', (socket) => {
  console.log('New user connected');
  console.log(socket.id);

  socket.on('online', async ({ user_id }) => {
    console.log(`User ${user_id} online!`);
    await User.findByIdAndUpdate(user_id, {
      $set: {
        is_online: true,
        socket_id: socket.id,
      },
    });
    const user_detail = await UserDetail.findOne(
      { user: user_id },
      'followers'
    );
    const ids = [user_id, ...user_detail.followers];
    ids.forEach(async (id) => {
      const u = await User.findById(id, 'is_online socket_id ');
      if (u.is_online) {
        io.to(u.socket_id).emit('online', { user_id });
      }
    });
  });

  socket.on('offline', async ({ user_id }) => {
    console.log(`User ${user_id} offline!`);
  });

  socket.on('new_tweet', async ({ tweet }) => {
    console.log(tweet);
    const user_detail = await UserDetail.findOne(
      { user: tweet.user._id },
      'followers'
    );
    user_detail.followers.forEach(async (id) => {
      const u = await User.findById(id, 'is_online socket_id ');
      if (u.is_online) {
        io.to(u.socket_id).emit('new_tweet', { tweet });
      }
    });
  });

  socket.on('add_nof', async ({ type, tweet_id, sender, receiver }) => {
    const user_sender = await User.findById(sender, '_id display_name photo');
    let user_receiver = await User.findById(
      receiver,
      '_id is_online socket_id'
    );

    let newNotification = new Notification({
      sender,
      tweet: tweet_id,
      type,
      receiver,
    });
    newNotification = await newNotification.save();
    if (user_receiver.notifications_count) {
      user_receiver.notifications_count++;
    } else {
      user_receiver.notifications_count = 1;
    }
    await user_receiver.save();
    if (user_receiver.is_online) {
      newNotification = {
        ...newNotification._doc,
        sender: {
          _id: user_sender._id,
          display_name: user_sender.display_name,
          photo: user_sender.photo,
        },
      };
      console.log(newNotification);
      socket.to(user_receiver.socket_id).emit('add_nof', { newNotification });
    }
  });

  socket.on('disconnect', async () => {
    console.log(socket.id);
    await User.findOneAndUpdate(
      { socket_id: socket.id },
      {
        $set: {
          is_online: false,
          socket_id: null,
        },
      }
    );
    console.log('User disconnected!');
  });
});
