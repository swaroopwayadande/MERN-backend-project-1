// EXPRESS APP (simple social demo with login, posts, likes, edit, and file upload)

// 1) Import libraries and initialize the app
const express = require("express");              // -> Web framework to build routes and handle requests
const app = express();                           // -> Create an Express application instance

const cookieParser = require("cookie-parser");   // -> Helps read cookies sent by the browser
const bcrypt = require("bcrypt");                // -> For hashing passwords securely
const jwt = require("jsonwebtoken");             // -> For creating and verifying login tokens (JWT)
const path = require("path");                    // -> Node utility for handling file paths

// 2) (Optional) Database connection setup (uncomment and set your URI to enable)
// const mongoose = require("mongoose");         // -> MongoDB object modeling tool
// mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/simple-social");
// -> Connects to a local MongoDB database named "simple-social" if no MONGO_URI is provided

// 3) Import your Mongoose models (User and Post)
const userModel = require("./models/user");      // -> User schema/model (users collection)
const postModel = require("./models/post");      // -> Post schema/model (posts collection)

// 4) Import file upload config (multer)
const upload = require("./config/multerconfig"); // -> Multer instance that saves uploaded files to /public/images/uploads

// -------------------- App Setup (middleware and view engine) --------------------

// 5) Set view engine to EJS
app.set("view engine", "ejs");                   // -> Tells Express to use EJS templates for rendering HTML

// 6) Parse incoming request bodies
app.use(express.urlencoded({ extended: true })); // -> Parses form submissions (application/x-www-form-urlencoded)
app.use(express.json());                         // -> Parses JSON bodies (application/json)

// 7) Serve static files (CSS, images, client-side JS) from the "public" folder
app.use(express.static(path.join(__dirname, "public")));
// -> Any file in /public is accessible in the browser at the root path, e.g., /images/logo.png

// 8) Read cookies so we can access tokens
app.use(cookieParser());                         // -> Makes cookies available as req.cookies

// -------------------- Auth Guard (protect certain routes) --------------------

// 9) Middleware to check if a user is logged in
function isLoggedIn(req, res, next) {
  const token = req.cookies.token;               // -> Read token from cookies
  if (!token) return res.redirect("/login");     // -> If no token, send to login page

  try {
    let data = jwt.verify(token, "shhh");        // -> Verify token using our secret ("shhh")
    req.user = data;                             // -> Attach decoded user data { email, userid } to request
    next();                                      // -> Continue to the protected route
  } catch (error) {
    return res.status(401).send("Invalid token");// -> If token is bad/expired, reject
  }
}

// -------------------- Public Routes (no login required) --------------------

// 10) Home page
app.get("/", (req, res) => {
  res.render("index");                           // -> Render views/index.ejs
});

// 11) Register a new user
app.post("/register", async (req, res) => {
  try {
    let { email, password, username, name, age } = req.body; // -> Read fields from the form

    if (!password) return res.status(400).send("Password is required");
    // -> Basic validation for password

    let existingUser = await userModel.findOne({ email });
    if (existingUser) return res.status(400).send("User already exists");
    // -> Prevent duplicate registration with same email

    const hash = await bcrypt.hash(password, 10); // -> Securely hash the password with salt rounds = 10

    let newUser = await userModel.create({
      username,
      email,
      age,
      name,
      password: hash,
      // profilepic can default in the schema, e.g., "default.jpg"
    });
    // -> Create a new user document in MongoDB

    let token = jwt.sign({ email: newUser.email, userid: newUser._id }, "shhh");
    res.cookie("token", token);
    // -> After registration, log them in by setting a token cookie

    res.status(201).send("Registered Successfully"); // -> Respond success (could redirect to /profile if you prefer)
  } catch (error) {
    console.error("Register route error:", error);
    res.status(500).send("Server error during registration");
  }
});

// 12) Show login page (GET)
app.get("/login", (req, res) => {
  res.render("login");                           // -> Render views/login.ejs
});

// 13) Handle login (POST)
app.post("/login", async (req, res) => {
  try {
    let { username, password } = req.body;       // -> Read login credentials

    let user = await userModel.findOne({ username });
    if (!user) return res.status(400).send("Invalid username or password");
    // -> Check if user exists

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).send("Invalid username or password");
    // -> Verify password against stored hash

    let token = jwt.sign({ email: user.email, userid: user._id }, "shhh");
    res.cookie("token", token);
    // -> Set token cookie to keep user logged in

    res.redirect("/profile");                    // -> Send to profile page after successful login
  } catch (error) {
    console.error("Login route error:", error);
    res.status(500).send("Server error during login");
  }
});

// 14) Logout (clears the token cookie)
app.get("/logout", (req, res) => {
  res.clearCookie("token");                      // -> Remove the cookie
  res.redirect("/login");                        // -> Go back to login page
});

// -------------------- Protected Routes (login required) --------------------

// 15) Profile page (shows the logged-in user and their posts)
app.get("/profile", isLoggedIn, async (req, res) => {
  try {
    const user = await userModel
      .findById(req.user.userid)                 // -> Find current user by ID from token
      .populate("posts");                        // -> Replace post IDs with full post documents

    res.render("profile", { user, posts: user.posts });
    // -> Pass user and posts to the EJS template for display
  } catch (error) {
    console.error("Profile route error:", error);
    res.status(500).send("Error loading profile");
  }
});

// 16) Show simple upload page (form to upload profile picture)
app.get("/profile/upload", isLoggedIn, (req, res) => {
  res.render("profileupload");                   // -> Render views/profileupload.ejs
});

// 17) Handle file upload and save filename into user's profile
app.post("/upload", isLoggedIn, upload.single("image"), async (req, res) => {
  try {
    const user = await userModel.findOne({ email: req.user.email });
    if (!user) return res.status(404).send("User not found");
    // -> Make sure the logged-in user exists in DB

    if (!req.file || !req.file.filename) {
      return res.status(400).send("No file uploaded");
    }
    // -> Ensure multer actually received a file

    user.profilepic = req.file.filename;         // -> Save only the filename (e.g., "1692-abc.jpg")
                                                 // -> Image is stored by multer in /public/images/uploads

    await user.save();                            // -> Persist changes to DB

    res.redirect("/profile");                     // -> Back to profile to see the new picture
  } catch (err) {
    console.error("Upload route error:", err);
    res.status(500).send("Upload failed");
  }
});

// 18) Create a new post
app.post("/posts", isLoggedIn, async (req, res) => {
  let user = await userModel.findOne({ email: req.user.email }); // -> Current user
  let { content } = req.body;                                    // -> Post body text

  let post = await postModel.create({
    user: user._id,                                              // -> Link post to user
    content,                                                     // -> Store content
  });

  user.posts.push(post._id);                                     // -> Add post to user's posts array
  await user.save();                                             // -> Save user changes

  res.redirect("/profile");                                      // -> Refresh profile to show the new post
});

// 19) Like / Unlike a post (toggle)
app.get("/like/:id", isLoggedIn, async (req, res) => {
  let post = await postModel
    .findOne({ _id: req.params.id })                             // -> Find post by ID from URL
    .populate("user");                                           // -> Optionally get post owner

  // -> Toggle logic: if user ID not in likes, add it; otherwise remove it
  if (post.likes.indexOf(req.user.userid) === -1) {
    post.likes.push(req.user.userid);                            // -> Like
  } else {
    post.likes.splice(post.likes.indexOf(req.user.userid), 1);   // -> Unlike
  }

  await post.save();                                             // -> Save updated likes array
  res.redirect("/profile");                                      // -> Back to profile
});

// 20) Show edit page for a post
app.get("/posts/:id/edit", isLoggedIn, async (req, res) => {
  let post = await postModel
    .findOne({ _id: req.params.id })                             // -> Find the post to edit
    .populate("user");                                           // -> Load the user who made it

  res.render("edit", { post });                                  // -> Render views/edit.ejs with post data
});

// 21) Update post content
app.post("/update/:id", isLoggedIn, async (req, res) => {
  try {
    await postModel.findByIdAndUpdate(
      req.params.id,                                             // -> Which post to update
      { content: req.body.content },                             // -> New content from form
      { runValidators: true }                                    // -> Make sure schema rules apply
    );

    res.redirect("/profile");                                    // -> After saving, go back to profile
  } catch (err) {
    console.error(err);
    res.status(500).send("Update failed");
  }
});

// -------------------- Start the server --------------------

// 22) Start listening for requests on port 3000
app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
// -> Open your browser and visit http://localhost:3000
