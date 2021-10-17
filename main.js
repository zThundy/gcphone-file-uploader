const app = require("express")();
const fs = require("fs");
const bodyParser = require("body-parser");
const upload = require('multer')();

const VideoUploader = require("./modules/video");
const AudioUploader = require ("./modules/audio");

const PORT = 3000

app.use((_, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
    res.setHeader('Access-Control-Allow-Credentials', true);
    next();
});
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// create custom classes for listening to
// app requests

const video = new VideoUploader(app, upload);
video.createHandlers()

const audio = new AudioUploader(app, upload);
audio.createHandlers()

app.get("/", (_, res) => {
    res.json("Everything works!")
})

app.listen(PORT, () => {
    console.log("Started listening on port", PORT)
})