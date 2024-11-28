const AppError = require('../utils/appError');

class ErrorController {
  #handleCastErrorDB = (err) => {
    const message = `El ID del documento es inválido.`;
    return new AppError(message, 400);
  };

  #handleDuplicateFieldsDB = (err) => {
    const value = err.errmsg.match(/(["'])(\\?.)*?\1/)[0];
    console.log(value);

    const message = `El siguiente valor está duplicado: ${value}. Por favor usá otro.`;
    return new AppError(message, 400);
  };

  #handleValidationErrorDB = (err) => {
    const errors = Object.values(err.errors).map((el) => el.message);

    const message = `Hubo un error en el formato de los datos. ${errors.join('. ')}`;
    return new AppError(message, 400);
  };

  #handleJWTError = () =>
    new AppError(
      'Las credenciales de acceso son erróneas. Por favor volvé a iniciar sesión.',
      401,
    );

  #handleJWTExpiredError = () =>
    new AppError(
      'Las credenciales de acceso han vencido. Por favor volvé a iniciar sesión.',
      401,
    );

  #sendErrorDev = (err, req, res) =>
    res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack,
    });

  #sendErrorProd = (err, req, res) => {
    // A) Operational, trusted error: send message to client
    if (err.isOperational) {
      return res.status(err.statusCode).json({
        status: err.status,
        message: err.message,
      });
    }
    // B) Programming or other unknown error: don't leak error details
    // 1) Log error
    console.error('ERROR 💥', err);
    // 2) Send generic message
    return res.status(500).json({
      status: 'error',
      message:
        'Algo salió mal. Volvé a intentarlo o comunicate con un administrador.',
    });
  };

  globalErrorHandler = (err, req, res, next) => {
    console.log('Pasa por acá');
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    if (process.env.NODE_ENV === 'development') {
      this.#sendErrorDev(err, req, res);
    } else if (process.env.NODE_ENV === 'production') {
      let error = { ...err };
      error.message = err.message;

      if (error.name === 'CastError') error = this.#handleCastErrorDB(error);
      if (error.code === 11000) error = this.#handleDuplicateFieldsDB(error);
      if (error.name === 'ValidationError')
        error = this.#handleValidationErrorDB(error);
      if (error.name === 'JsonWebTokenError') error = this.#handleJWTError();
      if (error.name === 'TokenExpiredError')
        error = this.#handleJWTExpiredError();

      this.#sendErrorProd(error, req, res);
    }
  };
}

module.exports = ErrorController;
