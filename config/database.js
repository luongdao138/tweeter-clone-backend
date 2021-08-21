const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI, {
   useCreateIndex: true,
   useNewUrlParser: true,
   useUnifiedTopology: true,
   useFindAndModify: false
});

const db = mongoose.connection;

db.on('error', (error) => console.log(error));
db.on('open', () => console.log('connected db successfully!'))
