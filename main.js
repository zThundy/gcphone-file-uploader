const express = require("express");
const fs = require("fs");
const bodyParser = require("body-parser");
const multer = require('multer');
const upload = multer();

const app = express()
const PORT = 3000
const REMOTE_PORT = 8080
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
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:' + REMOTE_PORT);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
    res.setHeader('Access-Control-Allow-Credentials', true);
    next();
});
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));

app.post("/audioUpload", upload.any(), (req, res) => {
    var remotePath = req.body.type
    if (!remotePath) {
        res.status(500).send();
        res.end();
        return
    }
    var filePath = PATH.format(remotePath)
    if (!fs.existsSync(filePath)){ fs.mkdirSync(filePath) }
    filePath += "/" + req.body.filename
    if (fs.existsSync(filePath)) { fs.unlinkSync(filePath) }

    if (req.files[0]) {
        var file = req.files[0].buffer
        fs.writeFile(filePath, file, (err) => {
            if (err) throw err;
        })
    }
    
    res.status(200).send();
    res.end();
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
            res.setHeader('Content-Type', 'audio/ogg;codec=opus');
            res.write(data, 'binary');
            res.end();
        })
    } else {
        res.status(404).send()
    }
})

app.get("/", (req, res) => {
    res.json("Everything works!")
})

app.listen(PORT, () => {
    console.log("started listening on port", PORT)
})