const multer = require('multer');
const { PutObjectCommand, S3Client } = require('@aws-sdk/client-s3');
const { v4: uuidv4 } = require('uuid');

const AppError = require('../utils/appError');

class UploadService {
  #multerStorage = multer.memoryStorage();

  #multerFilter(req, file, cb) {
    try {
      if (file.mimetype.startsWith('image')) {
        cb(null, true);
      } else {
        cb(
          new AppError(
            'El archivo que enviaste no es una imagen. Por favor enviá sólo imágenes.',
            400,
          ),
          false,
        );
      }
    } catch (err) {
      cb(
        new AppError(
          'Hubo un problema cargando la imagen. Por favor comunicate con un administrador.',
          500,
        ),
        false,
      );
    }
  }

  #s3 = new S3Client({
    region: process.env.AWS_S3_REGION,
    credentials: {
      accessKeyId: process.env.AWS_S3_ACCESS_KEY,
      secretAccessKey: process.env.AWS_S3_SECRET_KEY,
    },
  });

  #upload = multer({
    storage: this.#multerStorage,
    fileFilter: this.#multerFilter,
  });

  // If an 'image' type file is sent in the request as 'image' field it gets uploaded to the memoryStorage and saved on req.file
  multerImageUpload = this.#upload.single('image');

  async uploadFileToS3(file, folder) {
    const fileName = `${folder}/${uuidv4()}`;
    const params = {
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: fileName,
      Body: file.buffer,
      ContentType: file.mimetype,
    };

    const command = new PutObjectCommand(params);
    await this.#s3.send(command);

    return `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_S3_REGION}.amazonaws.com/${fileName}`;
  }
}

module.exports = UploadService;
