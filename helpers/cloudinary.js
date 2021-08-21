const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET,
});

module.exports = {
  upload: async (base64) => {
    try {
      const res = await cloudinary.uploader.upload(base64, {
        upload_preset: 'huong_mern',
      });
      return {
        public_id: res.public_id,
        secure_url: res.secure_url,
      };
    } catch (error) {
      console.log(error);
    }
  },
  destroy: async (public_id) => {
    try {
      await cloudinary.uploader.destroy(public_id);
    } catch (error) {
      console.log(error);
    }
  },
};
