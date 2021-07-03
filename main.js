const express = require("express");
const fs = require("fs");
const bodyParser = require("body-parser");
const multer = require('multer');
const upload = multer();

const app = express()
const PORT = 3000
var PATH = "./audios/{0}"

if (!String.prototype.format) {
    String.prototype.format = function () {
        var args = arguments;
        return this.replace(/{(\d+)}/g, function (match, number) {
            return typeof args[number] != 'undefined' ?
                args[number] :
                match;
        });
    };
}

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
    res.setHeader('Access-Control-Allow-Credentials', true);
    next();
});
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.post("/audioUpload", upload.any(), (req, res) => {
    console.log("Received new upload request, analyzing...")
    var remotePath = req.body.type
    if (!remotePath) {
        console.log("Type param was empty, sending error 500")
        res.status(500).send();
        res.end();
        return
    }
    var filePath = PATH.format(remotePath)
    if (!fs.existsSync(filePath)){ fs.mkdirSync(filePath) }
    filePath += "/" + req.body.filename
    if (fs.existsSync(filePath)) { fs.unlinkSync(filePath) }
    console.log("File at path " + filePath + " has been deleted")

    if (req.files[0]) {
        console.log("Buffer found. Trying on saving it...")
        var file = req.files[0].buffer
        fs.writeFile(filePath, file, (err) => {
            if (err) throw err;
            console.log("File saved successfully! New key: " + req.body.filename)
        })
        res.status(200).send();
        res.end();
    } else {
        console.log("No file nor buffer where sent. Rejecting request")
        res.status(500).send();
        res.end();
    }
})

app.get("/audioDownload", (req, res) => {
    var remotePath = req.query.type
    if (!remotePath) {
        res.status(500).send();
        res.end();
        return
    }
    var filePath = PATH.format(remotePath)
    filePath += "/" + req.query.key

    if (fs.existsSync(filePath)) {
        fs.readFile(filePath, (err, data) => {
            if (err) return console.err(err)
            console.log('Found audio file! Sending to client')
            res.setHeader('Content-Type', 'audio/ogg;codec=opus');
            res.write(data, 'binary');
            res.end();
        })
    } else {
        console.log('No file exists, sending 404')
        res.status(404).send()
    }
})

app.get("/", (req, res) => {
    res.json("Everything works!")
})

app.listen(PORT, () => {
    console.log("started listening on port", PORT)
})