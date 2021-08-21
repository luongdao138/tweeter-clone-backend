const multer = require('multer');

const ALLOW_FORMATS = ['image/jpg', 'image/jpeg', 'image/png'];
module.exports = (type, fieldname) => {
  const upload = multer({
    storage: multer.memoryStorage(),
    fileFilter: (req, file, cb) => {
      if (ALLOW_FORMATS.includes(file.mimetype)) cb(null, true);
      else cb('Not support file type', false);
    },
  });

  const uploadCtrl = (req, res, next) => {
    const uploadMiddleware =
      type === 'single' ? upload.single(fieldname) : upload.array(fieldname);

    uploadMiddleware(req, res, (error) => {
      if (error instanceof multer.MulterError) {
        // A multer error occured when uploading
        return res.status(500).json({
          message: 'Multer error occurs!',
        });
      } else if (error) {
        // unknown error occur
        return res.status(500).json({
          message: 'Error occur, cannot upload image',
        });
      }

      console.log('OK');
      // everything went fine
      next();
    });
  };

  return uploadCtrl;
};
