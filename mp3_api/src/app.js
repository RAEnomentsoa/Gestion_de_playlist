const express = require("express");
const cors = require("cors");
const songsRouter = require("./routes/songs");
const playlistsRouter = require("./routes/playlists");
const uploadRouter = require("./routes/upload");
const usersRouter = require("./routes/users");

const app = express();
const PORT = 8080;

app.use(cors());
app.use(express.json());
app.use("/api/songs", songsRouter);
app.use("/api/playlists", playlistsRouter);
app.use("/api/upload", uploadRouter);
app.use("/api/users", usersRouter);

app.listen(PORT, () => {
  console.log(`[API] mp3-api listening on http://localhost:${PORT}`);
});

module.exports = app;
