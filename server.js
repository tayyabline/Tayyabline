// 📁 tayyabline/server.js

const express = require("express");
const http = require("http");
const socketIO = require("socket.io");
const path = require("path");
const multer = require("multer");
const fs = require("fs");

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 20 * 1024 * 1024 },
});

let messages = [];
let userStatus = {};

app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.post("/upload", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).send("No file uploaded");
  res.json({ filename: req.file.filename, originalname: req.file.originalname });
});

io.on("connection", (socket) => {
  socket.on("join", ({ username, password }) => {
    if (password !== "vortex20") {
      socket.emit("unauthorized");
      return;
    }
    socket.username = username;
    userStatus[username] = "online";
    io.emit("userList", userStatus);
    io.emit("lastSeen", { username, time: "online" });
    socket.emit("chatHistory", messages);
  });

  socket.on("typing", () => {
    socket.broadcast.emit("typing", socket.username);
  });

  socket.on("stopTyping", () => {
    socket.broadcast.emit("stopTyping", socket.username);
  });

  socket.on("message", (msg) => {
    const message = {
      username: socket.username,
      text: msg,
      timestamp: new Date(),
      seen: false,
    };
    messages.push(message);
    io.emit("message", message);
  });

  socket.on("media", (data) => {
    const mediaMsg = {
      username: socket.username,
      file: data.file,
      originalname: data.originalname,
      timestamp: new Date(),
      seen: false,
    };
    messages.push(mediaMsg);
    io.emit("media", mediaMsg);
  });

  socket.on("clearChat", () => {
    messages = [];
    io.emit("chatCleared", `${socket.username} cleared the chat`);
  });

  socket.on("seen", () => {
    messages.forEach((msg) => (msg.seen = true));
    io.emit("seenUpdate");
  });

  socket.on("disconnect", () => {
    userStatus[socket.username] = new Date().toLocaleTimeString();
    io.emit("userList", userStatus);
    io.emit("lastSeen", { username: socket.username, time: userStatus[socket.username] });
  });
});

server.listen(3000, () => {
  console.log("TayyabLine running on http://localhost:3000");
});
