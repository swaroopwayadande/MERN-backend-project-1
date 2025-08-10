const express = require('express');
const app = express();
const cookieParser = require("cookie-parser");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const userModel = require("./models/user"); 
const postModel = require("./models/post"); // if you use posts

app.set("view engine", "ejs");

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

// ------------------- ROUTES -------------------

// Home page
app.get('/', (req, res) => {
    res.render("index"); // make sure views/index.ejs exists
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

        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);

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
    res.render('login'); // make sure views/login.ejs exists
});

// LOGIN LOGIC
app.post('/login', async (req, res) => {
    try {
        let { username, password } = req.body;

        let user = await userModel.findOne({ username });
        if (!user) {
            return res.status(400).send("Invalid username or password");
        }

        bcrypt.compare(password, user.password, (err, result) => {
            if (err) {
                console.error(err);
                return res.status(500).send("Server error");
            }
            if (result) {
                let token = jwt.sign({ email: user.email, userid: user._id }, "shhh");
                res.cookie("token", token);
                res.status(200).send("You can login"); 
                // or redirect to profile: res.redirect('/profile');
            } else {
                res.status(401).send("Invalid username or password");
            }
        });
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

// PROFILE PAGE (Protected)
// Change from this:
app.post('/profile', isLoggedIn, (req, res) => {
    console.log(req.user);
    res.render("login");
});

// To this:
app.get('/profile', isLoggedIn, (req, res) => {
    console.log(req.user);
    // For example, render a profile page or send user info
    res.render("profile", { user: req.user }); // assuming you have a profile.ejs template
});


// Middleware to check login
function isLoggedIn(req, res, next) {
    const token = req.cookies.token;
    if (!token) {
        return res.status(401).send("You must be logged in");
    }
    try {
        let data = jwt.verify(token, "shhh");
        req.user = data;
        next();
    } catch (error) {
        return res.status(401).send("Invalid token");
    }
}

app.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});
