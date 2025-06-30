// uploadQueue.js
const fs = require("fs");
const path = require("path");
const { uploadFile, generateSignedUrl } = require("./r2ServiceWrapper");

class UploadQueue {
  constructor(bucketName) {
    this.queue = [];
    this.isProcessing = false;
    this.bucketName = bucketName;
  }

  // Add a file to queue
  enqueueFile(filePath, objectKey) {
    this.queue.push({ filePath, objectKey });
    this.processQueue();
  }

  // Add all files in folder to queue
  enqueueFolder(folderPath, folderName) {
    const files = fs.readdirSync(folderPath);

    for (const file of files) {
      const fullPath = path.join(folderPath, file);
      const stats = fs.statSync(fullPath);

      if (stats.isFile()) {
        const objectKey = `${folderName}/${file}`;
        this.enqueueFile(fullPath, objectKey);
      }
    }
  }

  async processQueue() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    while (this.queue.length > 0) {
      const { filePath, objectKey } = this.queue[0];
      try {
        console.log(`⬆️ Uploading: ${objectKey}`);
        await uploadFile(filePath, this.bucketName, "videos/" + objectKey);
        // TODO: Uncomment this
        // if(fs.existsSync(filePath)){
        //   fs.unlinkSync(filePath);
        // }
        
        if(objectKey.includes("master.m3u8")){
          const signedUrl = await generateSignedUrl(this.bucketName, objectKey);
          console.log(`🔗 Signed URL:`);
          console.log(signedUrl);
        }

        this.queue.shift();
      } catch (err) {
        console.error(`❌ Failed: ${objectKey}. Retrying...`);
        await this.delay(10000);
      }
    }

    this.isProcessing = false;
  }

  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

module.exports = UploadQueue;
