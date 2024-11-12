//TODO: Delete it all
const multer = require('multer');
// const { PutObjectCommand } = require('@aws-sdk/client-s3');
// const { v4: uuidv4 } = require('uuid');
const AppError = require('./appError');
// const s3 = require('./awsS3');

const multerStorage = multer.memoryStorage();
const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('Not an image! Please upload only images.', 400), false);
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});

// const uploadFileToS3 = async (file, folder) => {
//   const fileName = `${folder}/${uuidv4()}-${file.originalname}`;
//   const params = {
//     Bucket: process.env.AWS_S3_BUCKET_NAME,
//     Key: fileName,
//     Body: file.buffer,
//     ContentType: file.mimetype,
//   };

//   const command = new PutObjectCommand(params);
//   await s3.send(command);

//   return `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_S3_REGION}.amazonaws.com/${fileName}`;
// };

module.exports = upload;
