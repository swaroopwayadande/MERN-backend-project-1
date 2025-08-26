// EXPRESS APP (simple social demo with login, posts, likes, edit, and file upload)

// 1) Import libraries and initialize the app
const express = require("express");
const app = express();

const cookieParser = require("cookie-parser");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const path = require("path");

// 2) (Optional) Database connection setup (uncomment and set your URI to enable)
// const mongoose = require("mongoose");
// mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/simple-social");

// 3) Import your Mongoose models (User and Post)
const userModel = require("./models/user");
const postModel = require("./models/post");

// 4) Import file upload config (multer)
const upload = require("./config/multerconfig"); // ensures dest: public/images/uploads

// -------------------- App Setup (middleware and view engine) --------------------

// 5) Set view engine to EJS
app.set("view engine", "ejs");

// 6) Parse incoming request bodies
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// 7) Serve static files (CSS, images, client-side JS) from the "public" folder
app.use(express.static(path.join(__dirname, "public")));

// 8) Read cookies so we can access tokens
app.use(cookieParser());

// -------------------- Auth Guard (protect certain routes) --------------------
const JWT_SECRET = process.env.JWT_SECRET || "shhh";

// 9) Middleware to check if a user is logged in
function isLoggedIn(req, res, next) {
  const token = req.cookies.token;
  if (!token) return res.redirect("/login");

  try {
    const data = jwt.verify(token, JWT_SECRET);
    // expected { email, userid }
    req.user = data;
    next();
  } catch (error) {
    return res.status(401).send("Invalid token");
  }
}

// -------------------- Public Routes (no login required) --------------------

// 10) Home page
app.get("/", (req, res) => {
  res.render("index");
});

// 11) Register a new user
app.post("/register", async (req, res) => {
  try {
    const { email, password, username, name, age } = req.body;

    if (!password) return res.status(400).send("Password is required");

    const existingUser = await userModel.findOne({ email });
    if (existingUser) return res.status(400).send("User already exists");

    const hash = await bcrypt.hash(password, 10);

    const newUser = await userModel.create({
      username,
      email,
      age,
      name,
      password: hash, // profilepic can default in schema
    });

    const token = jwt.sign(
      { email: newUser.email, userid: newUser._id },
      JWT_SECRET,
      { expiresIn: "7d" }
    );
    res.cookie("token", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: false, // set true behind HTTPS/proxy in production
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(201).send("Registered Successfully");
  } catch (error) {
    console.error("Register route error:", error);
    res.status(500).send("Server error during registration");
  }
});

// 12) Show login page (GET)
app.get("/login", (req, res) => {
  res.render("login");
});

// 13) Handle login (POST)
app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await userModel.findOne({ username });
    if (!user) return res.status(400).send("Invalid username or password");

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).send("Invalid username or password");

    const token = jwt.sign(
      { email: user.email, userid: user._id },
      JWT_SECRET,
      { expiresIn: "7d" }
    );
    res.cookie("token", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.redirect("/profile");
  } catch (error) {
    console.error("Login route error:", error);
    res.status(500).send("Server error during login");
  }
});

// 14) Logout (clears the token cookie)
app.get("/logout", (req, res) => {
  res.clearCookie("token");
  res.redirect("/login");
});

// -------------------- Protected Routes (login required) --------------------

// 15) Profile page (shows the logged-in user and their posts)
app.get("/profile", isLoggedIn, async (req, res) => {
  try {
    const user = await userModel
      .findById(req.user.userid)
      .populate("posts");

    if (!user) return res.status(404).send("User not found");

    res.render("profile", { user, posts: user.posts || [] });
  } catch (error) {
    console.error("Profile route error:", error);
    res.status(500).send("Error loading profile");
  }
});

// 16) Show simple upload page (form to upload profile picture)
app.get("/profile/upload", isLoggedIn, (req, res) => {
  res.render("profileupload");
});

// 17) Handle file upload and save filename into user's profile
app.post("/upload", isLoggedIn, upload.single("image"), async (req, res) => {
  try {
    const user = await userModel.findOne({ email: req.user.email });
    if (!user) return res.status(404).send("User not found");

    if (!req.file || !req.file.filename) {
      return res.status(400).send("No file uploaded");
    }

    user.profilepic = req.file.filename; // saved by multer in /public/images/uploads
    await user.save();

    res.redirect("/profile");
  } catch (err) {
    console.error("Upload route error:", err);
    res.status(500).send("Upload failed");
  }
});

// 18) Create a new post
app.post("/posts", isLoggedIn, async (req, res) => {
  try {
    const user = await userModel.findOne({ email: req.user.email });
    if (!user) return res.status(404).send("User not found");

    const { content } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).send("Post content required");
    }

    const post = await postModel.create({
      user: user._id,
      content: content.trim(),
    });

    user.posts.push(post._id);
    await user.save();

    res.redirect("/profile");
  } catch (error) {
    console.error("Create post error:", error);
    res.status(500).send("Could not create post");
  }
});

// 19) Like / Unlike a post (toggle)
app.get("/like/:id", isLoggedIn, async (req, res) => {
  try {
    const post = await postModel.findById(req.params.id).populate("user");
    if (!post) return res.status(404).send("Post not found");

    const uid = String(req.user.userid);
    const idx = post.likes.findIndex((x) => String(x) === uid);

    if (idx === -1) {
      post.likes.push(uid); // like
    } else {
      post.likes.splice(idx, 1); // unlike
    }

    await post.save();
    res.redirect("/profile");
  } catch (error) {
    console.error("Like toggle error:", error);
    res.status(500).send("Could not toggle like");
  }
});

// 20) Show edit page for a post
app.get("/posts/:id/edit", isLoggedIn, async (req, res) => {
  try {
    const post = await postModel.findById(req.params.id).populate("user");
    if (!post) return res.status(404).send("Post not found");
    // Optionally ensure only owner can edit:
    if (String(post.user._id) !== String(req.user.userid)) {
      return res.status(403).send("Not authorized to edit this post");
    }

    res.render("edit", { post });
  } catch (error) {
    console.error("Edit page error:", error);
    res.status(500).send("Could not load edit page");
  }
});

// 21) Update post content
app.post("/update/:id", isLoggedIn, async (req, res) => {
  try {
    const post = await postModel.findById(req.params.id).populate("user");
    if (!post) return res.status(404).send("Post not found");
    if (String(post.user._id) !== String(req.user.userid)) {
      return res.status(403).send("Not authorized to update this post");
    }

    const newContent = (req.body.content || "").trim();
    if (!newContent) return res.status(400).send("Content required");

    await postModel.findByIdAndUpdate(
      req.params.id,
      { content: newContent },
      { runValidators: true }
    );

    res.redirect("/profile");
  } catch (err) {
    console.error("Update error:", err);
    res.status(500).send("Update failed");
  }
});

// -------------------- Start the server --------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
