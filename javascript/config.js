/*==================================
            CONFIG.JS
==================================*/

// ImgBB API Key
export const IMGBB_API_KEY =
    "d53183830b7124d3c6e176b76f6d4705";

// Photo Upload Settings
export const MAX_PHOTOS = 6;

export const MAX_IMAGE_SIZE =
    10 * 1024 * 1024; // 10MB

export const ALLOWED_IMAGE_TYPES = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp"
];

// Upload Messages
export const UPLOAD_MESSAGES = {

    UPLOADING:
        "Uploading photos...",

    SUCCESS:
        "Photo uploaded successfully.",

    FAILED:
        "Photo upload failed.",

    INVALID_TYPE:
        "Only JPG, PNG and WEBP images are allowed.",

    TOO_LARGE:
        "Image must be smaller than 10MB.",

    MAX_REACHED:
        "Maximum 6 photos allowed."

};

// App Settings
export const APP_CONFIG = {

    MIN_AGE: 18,

    MAX_BIO_LENGTH: 300,

    MAX_INTERESTS: 10

};