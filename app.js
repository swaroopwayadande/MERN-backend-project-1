const express = require('express');
const app = express();
const cookieParser = require("cookie-parser");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const userModel = require("./models/user"); 
const postModel = require("./models/post"); // Your posts model

app.set("view engine", "ejs");

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

// ------------------- ROUTES -------------------

// Home page
app.get('/', (req, res) => {
    res.render("index");
});

// REGISTER
app.post('/register', async (req, res) => {
    try {
        let { email, password, username, name, age } = req.body;

        if (!password) {
            return res.status(400).send("Password is required");
        }

        let existingUser = await userModel.findOne({ email });
        if (existingUser) {
            return res.status(400).send("User already exists");
        }

        const hash = await bcrypt.hash(password, 10);

        let newUser = await userModel.create({
            username,
            email,
            age,
            name,
            password: hash
        });

        let token = jwt.sign({ email: newUser.email, userid: newUser._id }, "shhh");
        res.cookie("token", token);
        res.status(201).send("Registered Successfully");
    } catch (error) {
        console.error("Register route error:", error);
        res.status(500).send("Server error during registration");
    }
});

// LOGIN PAGE
app.get('/login', (req, res) => {
    res.render('login');
});

// LOGIN LOGIC
app.post('/login', async (req, res) => {
    try {
        let { username, password } = req.body;

        let user = await userModel.findOne({ username });
        if (!user) {
            return res.status(400).send("Invalid username or password");
        }

        const match = await bcrypt.compare(password, user.password);
        if (match) {
            let token = jwt.sign({ email: user.email, userid: user._id }, "shhh");
            res.cookie("token", token);
            res.redirect('/profile');
        } else {
            res.status(401).send("Invalid username or password");
        }
    } catch (error) {
        console.error("Login route error:", error);
        res.status(500).send("Server error during login");
    }
});

// LOGOUT
app.get('/logout', (req, res) => {
    res.clearCookie("token");
    res.redirect("/login");
});

// PROFILE PAGE (SHOW PROFILE + POSTS)
app.get('/profile', isLoggedIn, async (req, res) => {
    try {
        const user = await userModel.findById(req.user.userid).populate("posts");
        res.render("profile", { user, posts: user.posts });
    } catch (error) {
        console.error("Profile route error:", error);
        res.status(500).send("Error loading profile");
    }
});

// CREATE POST
app.post('/posts', isLoggedIn, async (req, res) => {
   let user = await userModel.findOne({email: req.user.email});
   let {content} = req.body;

   let post = await postModel.create({
    user: user._id,
    content
   });

   user.posts.push(post._id);
   await user.save();

   res.redirect("/profile");

});

// Middleware to check login
function isLoggedIn(req, res, next) {
    const token = req.cookies.token;
    if (!token) {
        return res.redirect("/login");
    }
    try {
        let data = jwt.verify(token, "shhh");
        req.user = data;
        next();
    } catch (error) {
        return res.status(401).send("Invalid token");
    }
}





// Like or Unlike a post
app.get('/like/:id', isLoggedIn, async (req, res) => {
    let post = await postModel.findOne({ _id: req.params.id }).populate("user");

    // If user hasn't liked it yet, add their ID
    if (post.likes.indexOf(req.user.userid) === -1) {
        post.likes.push(req.user.userid);
    } 
    // If already liked, remove (unlike)
    else {
        post.likes.splice(post.likes.indexOf(req.user.userid), 1);
    }

    await post.save();
    res.redirect("/profile"); // Go back to profile after like/unlike
});


// Show Edit Page
app.get("/posts/:id/edit", isLoggedIn, async (req, res) => {
 let post = await postModel.findOne({ _id: req.params.id }).populate("user");
  res.render("edit",{post});
});


//updating post 
app.post("/update/:id", isLoggedIn, async (req, res) => {
  try {
    await postModel.findByIdAndUpdate(
      req.params.id,
      { content: req.body.content },
      { runValidators: true }
    );
    res.redirect("/profile");
  } catch (err) {
    console.error(err);
    res.status(500).send("Update failed");
  }
});
















app.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});
