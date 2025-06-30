const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} = require('@aws-sdk/client-s3')
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner')
const fs = require('fs')
const mime = require('mime-types')
const keys = require('./keys')

// Cloudflare R2 Configuration
const s3 = new S3Client({
  region: 'auto',
  endpoint: keys.CLOUDFLARE_ENDPOINT,
  credentials: {
    accessKeyId: keys.CLOUDFLARE_ACCESS_KEY_ID,
    secretAccessKey: keys.CLOUDFLARE_SECRET_ACCESS_KEY,
  },
})

const uploadFile = async (filePath, bucketName, objectKey) => {
  try {
    const fileStream = fs.createReadStream(filePath)
    const contentType = mime.lookup(filePath) || 'application/octet-stream'

    const uploadParams = {
      Bucket: bucketName,
      Key: objectKey,
      Body: fileStream,
      forcePathStyle: true,
      ContentType: contentType,
    }

    const command = new PutObjectCommand(uploadParams)
    await s3.send(command)
    console.log(`✅ File uploaded successfully: ${objectKey}`)
  } catch (error) {
    console.error('❌ Upload failed:', error.message)
  }
}

const generateSignedUrl = async (bucketName, objectKey, expiresIn = 3600) => {
  try {
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: objectKey,
    })

    const signedUrl = await getSignedUrl(s3, command, { expiresIn })

    console.log(`🔗 Signed URL (valid for ${expiresIn} seconds):`)
    console.log(signedUrl)
    return signedUrl
  } catch (error) {
    console.error('❌ Error generating signed URL:', error.message)
    throw error
  }
}

// Delete File from R2 Bucket
const deleteFile = async (bucketName, objectKey) => {
  try {
    const command = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: objectKey,
    })

    await s3.send(command)
    console.log(`🗑️ File deleted successfully: ${objectKey}`)
    return {
      success: true,
      message: `File ${objectKey} deleted successfully.`,
    }
  } catch (error) {
    console.error('❌ Deletion failed:', error.message)
    throw error
  }
}


module.exports = {
  uploadFile,
  generateSignedUrl,
  deleteFile,
  
}
