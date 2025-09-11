const mongoose = require('mongoose');

mongoose.connect('mongodb+srv://swaroopwayadande_db_user:Swaroop_9850@blog-app-1.8p6mtda.mongodb.net/miniproject?retryWrites=true&w=majority&appName=blog-app-1')
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
