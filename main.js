const app = require("express")();
const fs = require("fs");
const bodyParser = require("body-parser");
const upload = require('multer')();

const PORT = 3000
const AUDIO_PATH = "./_audios/{0}"
const VIDEO_PATH = "./_videos/{0}"

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

// Gestione video

app.post("/videoUpload", upload.any(), (req, res) => {
    console.log("Received new video upload request, analyzing...")
    var remotePath = req.body.type
    if (!remotePath) {
        console.log("Type param was empty, sending error 500")
        res.status(500).send();
        res.end();
        return
    }
    var filePath = VIDEO_PATH.format(remotePath)
    if (!fs.existsSync(filePath)){ fs.mkdirSync(filePath) }
    filePath += "/" + req.body.filename
    if (fs.existsSync(filePath)) { fs.unlinkSync(filePath) }
    console.log("File at path " + filePath + " has been deleted")

    if (req.files[0]) {
        console.log("Buffer found. Trying on saving it...")
        var file = req.files[0].buffer 

        fs.writeFile(filePath, file, (err) => {
            if (err) return console.err(err)
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

app.get("/videoDownload", (req, res) => {
    var remotePath = req.query.type
    if (!remotePath) {
        res.status(500).send();
        res.end();
        return
    }
    var filePath = VIDEO_PATH.format(remotePath)
    filePath += "/" + req.query.key

    if (fs.existsSync(filePath)) {
        fs.readFile(filePath, (err, data) => {
            if (err) return console.err(err)
            console.log('Found audio file! Sending to client')
            res.json({"blobDataBuffer": data.toString('base64')});
            res.end();
        })
    } else {
        console.log('No file exists, sending 404')
        res.status(404).send()
    }
})

// Gestione Segreterie

app.post("/audioUpload", upload.any(), (req, res) => {
    console.log("Received new audio upload request, analyzing...")
    var remotePath = req.body.type
    if (!remotePath) {
        console.log("Type param was empty, sending error 500")
        res.status(500).send();
        res.end();
        return
    }
    var filePath = AUDIO_PATH.format(remotePath)
    if (!fs.existsSync(filePath)){ fs.mkdirSync(filePath) }
    if (remotePath === "voicemails_messages") {
        filePath += "/" + req.body.voicemail_target
        if (!fs.existsSync(filePath)){ fs.mkdirSync(filePath) }
    }
    filePath += "/" + req.body.filename
    if (fs.existsSync(filePath)) { fs.unlinkSync(filePath) }
    console.log("File at path " + filePath + " has been deleted")

    if (req.files[0]) {
        console.log("Buffer found. Trying on saving it...")
        var file = req.files[0].buffer
        fs.writeFile(filePath, file, (err) => {
            if (err) return console.err(err)
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
    var filePath = AUDIO_PATH.format(remotePath)
    filePath += "/" + req.query.key

    if (fs.existsSync(filePath)) {
        fs.readFile(filePath, (err, data) => {
            if (err) return console.err(err)
            console.log('Found audio file! Sending to client')
            res.json({"blobDataBuffer": data.toString('base64')});
            res.end();
        })
    } else {
        console.log('No file exists, sending 404')
        res.status(404).send()
    }
})

// Gestione Messaggi in Segreteria

app.post("/recordedMessageUpload", upload.any(), (req, res) => {
    console.log("Received new recoreded message upload request, analyzing...")
    var remotePath = req.body.voicemail_target
    if (!remotePath) {
        console.log("Type param target was empty, sending error 500")
        res.status(500).send();
        res.end();
        return
    }
    var filePath = AUDIO_PATH.format('voicemails_messages')
    if (!fs.existsSync(filePath)){ fs.mkdirSync(filePath) }
    filePath += "/" + req.body.voicemail_target
    if (!fs.existsSync(filePath)){ fs.mkdirSync(filePath) }

    fs.readdir(filePath, (err, files) => {
        filePath += "/" + files.length + "_" + req.body.voicemail_source
        if (req.files[0]) {
            console.log("Buffer found. Trying on saving it...")
            var file = req.files[0].buffer
            fs.writeFile(filePath, file, (err) => {
                if (err) { return console.log(err) }
                console.log("File saved successfully! New key: " + files.length + "_" + req.body.voicemail_source)
            })
            res.status(200).send();
            res.end();
        } else {
            console.log("No file nor buffer where sent. Rejecting request")
            res.status(500).send();
            res.end();
        }
    });
})

app.get("/getAvailabledRecordedMessages", (req, res) => {
    var remotePath = req.query.target
    if (!remotePath) {
        res.status(500).send();
        res.end();
        return
    }
    var filePath = AUDIO_PATH.format("voicemails_messages/" + remotePath)
    if (!fs.existsSync(filePath)){ res.status(404).send(); return }

    fs.readdir(filePath, (err, files) => {
        if (files.length == 0) { res.status(404).send(); return }
        var recordedMessages = []
        var cbCalls = 0;
        let cb = function() {
            if (++cbCalls == files.length) {
                recordedMessages.sort(function(a, b) {
                    return a.id - b.id; });
                if (recordedMessages.length > 0) {
                    res.json(recordedMessages);
                    res.end();
                    console.log('Sent recorded messages')
                } else {
                    console.log('No file exists, sending 404')
                    res.status(404).send()
                }
            }
        }

        files.forEach((file) => {
            fs.readFile((filePath + '/' + file), (err, data) => {
                if (err) return console.log(err)
                recordedMessages.push({"id": Number(file.substring(0, file.indexOf('_'))), "sourceNumber": file.substring(2, file.length) , "blobDataBuffer": data.toString('base64')})
                cb()
            });
        })
    });
    
})

app.post("/recordedMessageDelete", upload.any(), (req, res) => {
    console.log("Received new recorded message delete request, analyzing...")
    var filePath = AUDIO_PATH.format("voicemails_messages")
    if (!fs.existsSync(filePath)){ fs.mkdirSync(filePath) }
    filePath += '/' + req.body.voicemail_target
    if (!fs.existsSync(filePath)){ fs.mkdirSync(filePath) }

    fs.readdir(filePath, (err, files) => {
        files.forEach(file => {
            if (file.startsWith(req.body.index + '_') || req.body.index == 'all') {
                fs.unlinkSync(filePath + "/" + file)
                files = removeElementAtIndex(files, files.indexOf(file))
            }
        })

        var count = 0
        files.forEach(file => {
            var newPath = 'FIXING_INDEXES' + count + file.substring(file.indexOf('_'), file.length);
            files[files.indexOf(file)] = newPath
            fs.renameSync(filePath + "/" + file, filePath + "/" + newPath, (err) => {})
            count++
        })

        files.forEach(file => {
            var oldPath = filePath + "/" + file;
            var newPath = filePath + "/" + file.substring(14, file.length);
            fs.renameSync(oldPath, newPath, (err) => {})
        })

        res.status(200).send();
        res.end();
    });
})

function removeElementAtIndex(array, index) {
    tempArray = []
    array.forEach((elem) => {
        if (array.indexOf(elem) != index) {
            tempArray.push(elem)
        }
    })
    return tempArray
}

app.get("/", (req, res) => {
    res.json("Everything works!")
})

app.listen(PORT, () => {
    console.log("Started listening on port", PORT)
})