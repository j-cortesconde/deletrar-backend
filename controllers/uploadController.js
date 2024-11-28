const UploadService = require('../services/uploadService');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

class UploadController {
  #UploadService = new UploadService();

  multerImageUpload = this.#UploadService.multerImageUpload;

  uploadProfilePic = catchAsync(async (req, res, next) => {
    try {
      // Check if a file is uploaded, if none, just next
      if (!req.file) {
        return next();
      }

      // Upload the file to S3 (store in 'profile-pictures' folder)
      const fileUrl = await this.#UploadService.uploadFileToS3(
        req.file,
        'profile-pictures',
      );

      // Set the filename on the req to pass it to the next controller
      req.file.filename = fileUrl;

      return next();
    } catch (error) {
      return next(
        new AppError(
          'Falló la carga de la imagen. Volvé a intentarlo más tarde o comunicate con un administrador.',
          500,
        ),
      );
    }
  });

  uploadCoverImage = catchAsync(async (req, res, next) => {
    try {
      // Check if a file is uploaded, if none, just next
      if (!req.file) {
        return next();
      }

      // Upload the file to S3 (store in 'cover-images' folder)
      const fileUrl = await this.#UploadService.uploadFileToS3(
        req.file,
        'cover-images',
      );

      // Set the filename on the req to pass it to the next controller
      req.file.filename = fileUrl;

      return next();
    } catch (error) {
      return next(
        new AppError(
          'Falló la carga de la imagen. Volvé a intentarlo más tarde o comunicate con un administrador.',
          500,
        ),
      );
    }
  });
}

module.exports = UploadController;
