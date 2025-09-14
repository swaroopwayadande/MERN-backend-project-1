const mongoose = require('mongoose');

mongoose.connect('mongodb+srv://swaroopwayadande:jmMuNp684KDfQ4qu@cluster0.hmgmuko.mongodb.net/Blog-app?retryWrites=true&w=majority&appName=Cluster0')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

const userSchema = mongoose.Schema({
    username: String,
    name: String,
    age: Number,
    email: String,
    password: String,
    profilepic: {
        type: String,
        default: "default.png"
    },
    posts: [
        { type: mongoose.Schema.Types.ObjectId, ref: "post" }
    ]
});

module.exports = mongoose.model('user', userSchema);
