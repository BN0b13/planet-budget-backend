const { default: axios } = require('axios');

require('dotenv/config');

const recaptchaCheck = async (recaptchaToken) => {
  try {
    
    const res = await axios.post('https://www.google.com/recaptcha/api/siteverify', {
      secret: process.env.RECAPTCHA_SECRET_KE,
      response: recaptchaToken
    });

    return res.status;
  } catch (err) {
    console.log({
      ReCaptchaError: err,
      ReCaptchaErrorMsg: err.message
    });
  }
}

exports.recaptchaCheck = recaptchaCheck;