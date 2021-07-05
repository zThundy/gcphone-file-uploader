# gcphone-file-uploader
File uploader for audio and videos for zth_gcphone

Requirements:
  - NodeJS (version: 14+)
  - Open TCP port 3000 on the firewall

How-to:
  - After installing NodeJS run start.bat if you are on Windows or start.sh if you are on Linux
  - After setting up the File Uploader Server, update the ip in the config (zth_gcphone/html/static/config.json):
    "fileUploader": {
      "ip": "INSER FILE UPLOADER SERVER IP"
    }

Debug:
  - To check if the File Uploader Server is running go to http://<uploaderServerIp>:3000/

# Discord
For info about the main resource join this discord: https://discord.gg/VABdfWEPAR
