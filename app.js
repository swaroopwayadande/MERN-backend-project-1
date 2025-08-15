// EXPRESS APP (simple social demo with login, posts, likes, edit, and file upload)

const express = require('express');
const app = express();

const cookieParser = require("cookie-parser");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const userModel = require("./models/user");
const postModel = require("./models/post");

const crypto = require("crypto");
const path = require("path");
const multer = require("multer");


// ---------- File Upload Setup (multer) ----------
const storage = multer.diskStorage({
  // where to save files
  destination: function (req, file, cb) {
    cb(null, './public/images/uploads');
  },

  // how to name files
  filename: function (req, file, cb) {
    crypto.randomBytes(12, function (err, bytes) {
      const fn = bytes.toString("hex") + path.extname(file.originalname);
      cb(null, fn);
    });
  }
});

const upload = multer({ storage });


// ---------- App Setup ----------
app.set("view engine", "ejs");

// read form data and json
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// read cookies (for JWT)
app.use(cookieParser());


// ---------- Routes (Public) ----------

// home page
app.get('/', (req, res) => {
  res.render("index");
});

// register new user
app.post('/register', async (req, res) => {
  try {
    let { email, password, username, name, age } = req.body;

    if (!password) return res.status(400).send("Password is required");

    let existingUser = await userModel.findOne({ email });
    if (existingUser) return res.status(400).send("User already exists");

    const hash = await bcrypt.hash(password, 10);

    let newUser = await userModel.create({
      username, email, age, name, password: hash
    });

    let token = jwt.sign({ email: newUser.email, userid: newUser._id }, "shhh");
    res.cookie("token", token);

    res.status(201).send("Registered Successfully");
  } catch (error) {
    console.error("Register route error:", error);
    res.status(500).send("Server error during registration");
  }
});

// show login page
app.get('/login', (req, res) => {
  res.render('login');
});

// login logic
app.post('/login', async (req, res) => {
  try {
    let { username, password } = req.body;

    let user = await userModel.findOne({ username });
    if (!user) return res.status(400).send("Invalid username or password");

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).send("Invalid username or password");

    let token = jwt.sign({ email: user.email, userid: user._id }, "shhh");
    res.cookie("token", token);

    res.redirect('/profile');
  } catch (error) {
    console.error("Login route error:", error);
    res.status(500).send("Server error during login");
  }
});

// logout (clear cookie)
app.get('/logout', (req, res) => {
  res.clearCookie("token");
  res.redirect("/login");
});


// ---------- Auth Guard ----------
function isLoggedIn(req, res, next) {
  const token = req.cookies.token;
  if (!token) return res.redirect("/login");

  try {
    let data = jwt.verify(token, "shhh");
    req.user = data; // { email, userid }
    next();
  } catch (error) {
    return res.status(401).send("Invalid token");
  }
}


// ---------- Routes (Protected) ----------

// profile page (shows user + posts)
app.get('/profile', isLoggedIn, async (req, res) => {
  try {
    const user = await userModel.findById(req.user.userid).populate("posts");
    res.render("profile", { user, posts: user.posts });
  } catch (error) {
    console.error("Profile route error:", error);
    res.status(500).send("Error loading profile");
  }
});

// create a post
app.post('/posts', isLoggedIn, async (req, res) => {
  let user = await userModel.findOne({ email: req.user.email });
  let { content } = req.body;

  let post = await postModel.create({
    user: user._id,
    content
  });

  user.posts.push(post._id);
  await user.save();

  res.redirect("/profile");
});

// like / unlike a post
app.get('/like/:id', isLoggedIn, async (req, res) => {
  let post = await postModel.findOne({ _id: req.params.id }).populate("user");

  // toggle like
  if (post.likes.indexOf(req.user.userid) === -1) {
    post.likes.push(req.user.userid);
  } else {
    post.likes.splice(post.likes.indexOf(req.user.userid), 1);
  }

  await post.save();
  res.redirect("/profile");
});

// show edit page
app.get("/posts/:id/edit", isLoggedIn, async (req, res) => {
  let post = await postModel.findOne({ _id: req.params.id }).populate("user");
  res.render("edit", { post });
});

// update post
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


// ---------- Upload Test (simple demo) ----------

// render a basic upload test page (test.ejs)
app.get('/test', (req, res) => {
  res.render("test");
});

// handle actual upload (expects input name="image")
app.post("/upload", upload.single("image"), (req, res) => {
  // console.log(req.file);
  // (no response body here by design)
});


// ---------- Start Server ----------
app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
