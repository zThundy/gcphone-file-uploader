
const fs = require("fs");

class VideoUploader {
    constructor(app, uploader) {
        this.app = app;
        this.uploader = uploader;
        this.path = "./_videos/{0}";
        this.prefixLog = "[MODULE] [Video] ";

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

        this.logSuccess("Video class initialized successfully, waiting for handlers...")
    }

    createHandlers() {
        if (!this.app) return this.logError("Cannot create handlers for video uploader class; no app has been given")
        this.logSuccess("Video handlers created sccessfully!")

        this.app.post("/videoUpload", this.uploader.any(), (req, res) => {
            this.logSuccess("Received new video upload request, analyzing...")
            var remotePath = req.body.type
            if (this.checkRemotePath(remotePath)) { res.status(500).send(); res.end(); return; }
            var filePath = this.path.format(remotePath)
            if (!fs.existsSync(filePath)){ fs.mkdirSync(filePath) }
            filePath += "/" + req.body.filename
            if (fs.existsSync(filePath)) { fs.unlinkSync(filePath) }
            this.logSuccess("File at path " + filePath + " has been deleted")
            if (req.files[0]) {
                this.logSuccess("Buffer found. Trying on saving it...")
                var file = req.files[0].buffer 
                fs.writeFile(filePath, file, (err) => {
                    if (err) return this.logError(err)
                    this.logSuccess("File saved successfully! New key: " + req.body.filename)
                })
                res.status(200).send();
                res.end();
            } else {
                this.logError("No file nor buffer where sent. Rejecting request")
                res.status(500).send();
                res.end();
            }
        });

        this.app.get("/videoDownload", (req, res) => {
            this.logSuccess("Trying downloading of video file with key " + req.query.key)
            var remotePath = req.query.type
            if (this.checkRemotePath(remotePath)) { res.status(500).send(); res.end(); return; }
            var filePath = this.path.format(remotePath)
            filePath += "/" + req.query.key
            if (fs.existsSync(filePath)) {
                fs.readFile(filePath, (err, data) => {
                    if (err) return this.logError(err)
                    this.logSuccess('Found video file! Sending to client')
                    res.json({"blobDataBuffer": data.toString('base64')});
                    res.end();
                })
            } else {
                this.logError('No file exists, sending 404')
                res.status(404).send()
                res.end();
            }
        })
    }

    checkRemotePath(path) {
        if (path) return false
        this.logError("Type param target was empty, sending error 500")
        return true
    }

    logError(message) {
        console.error(this.prefixLog + message)
    }

    logSuccess(message) {
        console.log(this.prefixLog + message)
    }
}

module.exports = VideoUploader;