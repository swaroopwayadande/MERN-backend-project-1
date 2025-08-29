// app.js - simple social app backend with login, posts, likes, and uploads

// 1) Import libraries and initialize the app
const express = require("express");               // Web framework
const app = express();                             // Express app instance

const cookieParser = require("cookie-parser");    // Read cookies
const bcrypt = require("bcrypt");                  // Password hashing
const jwt = require("jsonwebtoken");               // JWT token creation and verification
const path = require("path");                       // File paths

// (Optional) 2) Database connection (uncomment and set your Mongo URI)
// const mongoose = require("mongoose");
// mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/simple-social", {
//   useNewUrlParser: true, useUnifiedTopology: true
// });

// 3) Import Mongoose models (User and Post schemas)
const userModel = require("./models/user");
const postModel = require("./models/post");

// 4) Import multer config for file uploads
const upload = require("./config/multerconfig");

// -------------------- App Setup --------------------

// 5) Set view engine to EJS
app.set("view engine", "ejs");

// 6) Middleware to parse request bodies
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// 7) Serve static files (CSS, images, JS) from public folder
app.use(express.static(path.join(__dirname, "public")));

// 8) Parse cookies
app.use(cookieParser());

// -------------------- Auth Middleware --------------------

// 9) Middleware to protect routes - check if logged in via JWT token in cookies
function isLoggedIn(req, res, next) {
  const token = req.cookies.token;
  if (!token) return res.redirect("/login");

  try {
    const data = jwt.verify(token, "shhh");
    req.user = data;
    next();
  } catch (error) {
    return res.status(401).send("Invalid token");
  }
}

// 9.1) Middleware to expose user info to templates on public routes if token valid
app.use((req, res, next) => {
  try {
    const token = req.cookies && req.cookies.token;
    if (token && !req.user) {
      const data = jwt.verify(token, "shhh");
      req.user = data;
    }
  } catch (_) { /* ignore invalid/expired token */ }
  next();
});

// -------------------- Public Routes --------------------

// 10) Home page
app.get("/", (req, res) => {
  res.render("index");
});

// 10.1) Global feed with all posts, populate author info
app.get("/globalfeed",isLoggedIn, async (req, res) => {
  try {
    const allPosts = await postModel.find({})
      .populate("user")
      .sort({ createdAt: -1 });

    const user = req.user
      ? { userid: String(req.user.userid), _id: String(req.user.userid), email: req.user.email }
      : null;

    res.render('globalfeed', { allPosts, user });

  } catch (err) {
    console.error("Global feed error:", err);
    res.render("globalfeed", { allPosts: [], user: req.user || null });
  }
});

// 11) Register new user
app.post("/register", async (req, res) => {
  try {
    let { email, password, username, name, age } = req.body;

    if (!password) return res.status(400).send("Password is required");

    let existingUser = await userModel.findOne({ email });
    if (existingUser) return res.status(400).send("User already exists");

    const hash = await bcrypt.hash(password, 10);

    let newUser = await userModel.create({
      username,
      email,
      age,
      name,
      password: hash,
    });

    let token = jwt.sign({ email: newUser.email, userid: newUser._id }, "shhh");
    res.cookie("token", token);
    res.status(201).send("Registered Successfully");
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).send("Server error during registration");
  }
});

// 12) Show login page
app.get("/login", (req, res) => {
  res.render("login");
});

// 13) Handle login post
app.post("/login", async (req, res) => {
  try {
    let { username, password } = req.body;

    let user = await userModel.findOne({ username });
    if (!user) return res.status(400).send("Invalid username or password");

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).send("Invalid username or password");

    let token = jwt.sign({ email: user.email, userid: user._id }, "shhh");
    res.cookie("token", token);

    res.redirect("/profile");
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).send("Server error during login");
  }
});

// 14) Logout - clears token cookie
app.get("/logout", (req, res) => {
  res.clearCookie("token");
  res.redirect("/login");
});

// -------------------- Protected Routes --------------------

// 15) Profile page showing logged-in user and their posts
app.get("/profile", isLoggedIn, async (req, res) => {
  try {
    const user = await userModel.findById(req.user.userid).populate("posts");
    res.render("profile", { user, posts: user.posts });
  } catch (error) {
    console.error("Profile error:", error);
    res.status(500).send("Error loading profile");
  }

  

});

// 16) Show profile picture upload form
app.get("/profile/upload", isLoggedIn, (req, res) => {
  res.render("profileupload");
});

// 17) Handle profile pic upload & update user doc
app.post("/upload", isLoggedIn, upload.single("image"), async (req, res) => {
  try {
    const user = await userModel.findOne({ email: req.user.email });
    if (!user) return res.status(404).send("User not found");

    if (!req.file || !req.file.filename) {
      return res.status(400).send("No file uploaded");
    }

    user.profilepic = req.file.filename;
    await user.save();

    res.redirect("/profile");
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).send("Upload failed");
  }
});

// 18) Create a new post
app.post("/posts", isLoggedIn, async (req, res) => {
  let user = await userModel.findOne({ email: req.user.email });
  let { content } = req.body;

  let post = await postModel.create({
    user: user._id,
    content,
  });

  user.posts.push(post._id);
  await user.save();

  res.redirect("/profile");
});

// 19) Like / Unlike post (toggle)
app.get("/like/:id", isLoggedIn, async (req, res) => {
  let post = await postModel.findOne({ _id: req.params.id }).populate("user");

  if (post.likes.indexOf(req.user.userid) === -1) {
    post.likes.push(req.user.userid);
  } else {
    post.likes.splice(post.likes.indexOf(req.user.userid), 1);
  }

  await post.save();
  res.redirect("/profile");
});

// 20) Show edit page for post
app.get("/posts/:id/edit", isLoggedIn, async (req, res) => {
  let post = await postModel.findOne({ _id: req.params.id }).populate("user");
  res.render("edit", { post });
});

// 21) Update post content
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



// -------------------- Start the server --------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
