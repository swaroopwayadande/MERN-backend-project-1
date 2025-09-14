const mongoose = require('mongoose');

mongoose.connect('mongodb+srv://swaroopwayadande:jmMuNp684KDfQ4qu@cluster0.hmgmuko.mongodb.net/Blog-app?retryWrites=true&w=majority&appName=Cluster0')
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
