
const fs = require("fs");

class AudioUploader {
    constructor(app, uploader) {
        this.app = app;
        this.uploader = uploader;
        this.path = "./_audios/{0}";
        this.prefixLog = "[MODULE] [Audio] ";

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

        this.logSuccess("Audio class initialized successfully, waiting for handlers...")
    }

    createHandlers() {
        if (!this.app) return this.logError("Cannot create handlers for audio uploader class; no app has been given")
        this.logSuccess("Audio handlers created sccessfully!")

        this.app.post("/audioUpload", this.uploader.any(), (req, res) => {
            this.logSuccess("Received new audio upload request, analyzing...")
            var remotePath = req.body.type
            if (this.checkRemotePath(remotePath)) { res.status(500).send(); res.end(); return; }
            var filePath = this.path.format(remotePath)
            if (!fs.existsSync(filePath)){ fs.mkdirSync(filePath) }
            if (remotePath === "voicemails_messages") {
                filePath += "/" + req.body.voicemail_target
                if (!fs.existsSync(filePath)){ fs.mkdirSync(filePath) }
            }
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
                this.logSuccess("No file nor buffer where sent. Rejecting request")
                res.status(500).send();
                res.end();
            }
        })
        
        this.app.get("/audioDownload", (req, res) => {
            this.logSuccess("Trying downloading of audio file with key " + req.query.key)
            var remotePath = req.query.type
            if (this.checkRemotePath(remotePath)) { res.status(500).send(); res.end(); return; }
            var filePath = this.path.format(remotePath)
            filePath += "/" + req.query.key
            if (fs.existsSync(filePath)) {
                fs.readFile(filePath, (err, data) => {
                    if (err) return this.logError(err)
                    this.logSuccess('Found audio file! Sending to client')
                    res.json({"blobDataBuffer": data.toString('base64')});
                    res.end();
                })
            } else {
                this.logSuccess('No file exists, sending 404')
                res.status(404).send()
            }
        })
        
        this.app.post("/recordedMessageUpload", this.uploader.any(), (req, res) => {
            this.logSuccess("Received new recoreded message upload request, analyzing...")
            var remotePath = req.body.voicemail_target
            if (this.checkRemotePath(remotePath)) { res.status(500).send(); res.end(); return; }
            var filePath = this.path.format('voicemails_messages')
            if (!fs.existsSync(filePath)){ fs.mkdirSync(filePath) }
            filePath += "/" + req.body.voicemail_target
            if (!fs.existsSync(filePath)){ fs.mkdirSync(filePath) }
            fs.readdir(filePath, (err, files) => {
                filePath += "/" + files.length + "_" + req.body.voicemail_source
                if (req.files[0]) {
                    this.logSuccess("Buffer found. Trying on saving it...")
                    var file = req.files[0].buffer
                    fs.writeFile(filePath, file, (err) => {
                        if (err) { return this.logError(err) }
                        this.logSuccess("File saved successfully! New key: " + files.length + "_" + req.body.voicemail_source)
                    })
                    res.status(200).send();
                    res.end();
                } else {
                    this.logError("No file nor buffer where sent. Rejecting request")
                    res.status(500).send();
                    res.end();
                }
            });
        })
        
        this.app.get("/getAvailabledRecordedMessages", (req, res) => {
            var remotePath = req.query.target
            if (this.checkRemotePath(remotePath)) { res.status(500).send(); res.end(); return; }
            var filePath = this.path.format("voicemails_messages/" + remotePath)
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
                            this.logSuccess('Sent recorded messages');
                        } else {
                            this.logError('No file exists, sending 404');
                            res.status(404).send();
                            res.end();
                        }
                    }
                }
                files.forEach((file) => {
                    fs.readFile((filePath + '/' + file), (err, data) => {
                        if (err) return this.logSuccess(err)
                        recordedMessages.push({"id": Number(file.substring(0, file.indexOf('_'))), "sourceNumber": file.substring(2, file.length) , "blobDataBuffer": data.toString('base64')})
                        cb()
                    });
                })
            });
            
        })
        
        this.app.post("/recordedMessageDelete", this.uploader.any(), (req, res) => {
            this.logSuccess("Received new recorded message delete request, analyzing...")
            var filePath = this.path.format("voicemails_messages")
            if (!fs.existsSync(filePath)){ fs.mkdirSync(filePath) }
            filePath += '/' + req.body.voicemail_target
            if (!fs.existsSync(filePath)){ fs.mkdirSync(filePath) }
            fs.readdir(filePath, (err, files) => {
                files.forEach(file => {
                    if (file.startsWith(req.body.index + '_') || req.body.index == 'all') {
                        fs.unlinkSync(filePath + "/" + file)
                        files = this.removeElementAtIndex(files, files.indexOf(file))
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

    removeElementAtIndex(array, index) {
        var tempArray = []
        array.forEach((elem) => { if (array.indexOf(elem) != index) tempArray.push(elem) })
        return tempArray
    }
}

module.exports = AudioUploader;