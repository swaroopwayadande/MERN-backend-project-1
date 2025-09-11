const mongoose = require('mongoose');

mongoose.connect('mongodb+srv://swaroopwayadande_db_user:Swaroop_9850@blog-app-1.8p6mtda.mongodb.net/miniproject?retryWrites=true&w=majority&appName=blog-app-1')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

const postSchema = mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user"
    },
    date: {
        type: Date,
        default: Date.now
    },
    content: String, 
    likes: [
        {
            type: mongoose.Schema.Types.ObjectId, ref: "user"
        }
    ]
});

module.exports = mongoose.model('post', postSchema);
