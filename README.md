# MERN Backend Authentication Project

This is a Node.js backend project built with **Express**, **MongoDB**, **JWT**, and **bcrypt** for secure authentication.  
It includes user registration, login, logout, and a protected profile route using cookies and middleware.

---

## 🚀 Features
- **User Registration** with hashed passwords
- **User Login** with JWT authentication
- **Protected Profile Page** (JWT + Cookies)
- **Logout functionality**
- **MongoDB Integration** via Mongoose
- **EJS Templating** for views
- **Middleware Authentication** (`isLoggedIn`)
- **Post model** for user posts (reference-ready)

---

## 🛠 Tech Stack
- **Backend:** Node.js, Express.js
- **Database:** MongoDB + Mongoose
- **Authentication:** JWT & bcrypt
- **Templating:** EJS
- **Middleware:** cookie-parser

---

## 📂 Folder Structure
project-root/
│
├── models/
│ ├── user.js # Mongoose schema for user
│ └── post.js # Mongoose schema for post
│
├── views/
│ ├── index.ejs # Home page
│ ├── login.ejs # Login form
│ └── profile.ejs # Protected user profile
│
├── app.js # Main server app
├── package.json
├── .gitignore
└── README.md



---

## ⚙️ Installation & Setup

### 1️⃣ Clone the repository
git clone https://github.com/swaroopwayadande/MERN-backend-project-1.git
cd <Parent folder>



### 2️⃣ Install dependencies
npm install



### 3️⃣ Configure MongoDB
- Ensure **MongoDB** is installed and running locally on port `27017`
- Database name: `miniproject`
- The app will auto-create collections

### 4️⃣ (Optional) Set Environment Variables
Create a `.env` file (if using dotenv):
JWT_SECRET=shhh
MONGO_URI=mongodb://127.0.0.1:27017/miniproject
PORT=3000

text

---

## ▶️ Running the Project

To start the server:
node app.js 
**or**
npx nodemon app.js


Visit:  
http://localhost:3000

---

## 📡 API Endpoints

### **Home**
GET /



### **Register**
POST /register
Content-Type: application/json
Body:
{
"username": "john123",
"name": "John Doe",
"age": 25,
"email": "john@example.com",
"password": "mypassword"
}


### **Login**
POST /login
Body:
{
"username": "john123",
"password": "mypassword"
}



### **Protected Profile**
GET /profile
(Requires JWT token in cookie)



### **Logout**
GET /logout


---

## 📝 .gitignore Recommendation
node_modules/
.env
.DS_Store
*.log
.vscode/
.idea/



---

## 📸 Screenshots




















---

## 👨‍💻 Author
**Swaroop Wayadande**
Final Year B.Tech CSE Student  
GitHub: [swaroopwayadande](https://github.com/swaroopwayadande)
