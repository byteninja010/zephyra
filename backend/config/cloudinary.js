const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Extract MIME type (image/png, audio/wav, etc)
const getMimeType = (base64String) => {
  if (base64String.startsWith("data:")) {
    return base64String.substring(5, base64String.indexOf(";"));
  }
  return null;
};

// ---------------------- IMAGE UPLOAD -------------------------
const uploadBase64Image = async (base64String, folder = 'zephyra-sessions') => {
  try {
    const mimeType = getMimeType(base64String); // e.g. image/png
    const extension = mimeType?.split("/")[1] || "png";

    let base64Data = base64String.includes(",")
      ? base64String.split(",")[1]
      : base64String;

    const result = await cloudinary.uploader.upload(
      `data:${mimeType};base64,${base64Data}`,
      {
        folder,
        resource_type: "image",
        overwrite: false,
        invalidate: true,
        format: extension,   // no forced PNG
      }
    );

    return result.secure_url;
  } catch (error) {
    console.error("[Cloudinary] Image upload error:", error);
    throw error;
  }
};

// ---------------------- AUDIO UPLOAD -------------------------
const uploadBase64Audio = async (base64String, folder = 'zephyra-sessions') => {
  try {
    const mimeType = getMimeType(base64String); // e.g. audio/wav
    const extension = mimeType?.split("/")[1] || "mp3";

    let base64Data = base64String.includes(",")
      ? base64String.split(",")[1]
      : base64String;

    const result = await cloudinary.uploader.upload(
      `data:${mimeType};base64,${base64Data}`,
      {
        folder,
        resource_type: "video",  // required for audio
        overwrite: false,
        invalidate: true,
        format: extension,
      }
    );

    return result.secure_url;
  } catch (error) {
    console.error("[Cloudinary] Audio upload error:", error);
    throw error;
  }
};

// ---------------------- DELETE -------------------------
const deleteFromCloudinary = async (publicId, resourceType = "image") => {
  try {
    return await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType
    });
  } catch (error) {
    console.error("[Cloudinary] Delete error:", error);
    throw error;
  }
};

module.exports = {
  cloudinary,
  uploadBase64Image,
  uploadBase64Audio,
  deleteFromCloudinary
};

