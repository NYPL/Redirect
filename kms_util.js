const { KMS } = require('aws-sdk');

// If we want to use encrypted client id and secret strings, then we need to set up
  // AWS and the KMS decryption function.
  function decrypt(key) {
    global.log('attempting to decrypt in kms')
    kms = new KMS({
      region: 'us-east-1',
    });

    const params = {
      CiphertextBlob: new Buffer(key, 'base64'),
    };

    return new Promise((resolve, reject) => {
      kms.decrypt(params, (err, data) => {
        if (err) {
          global.log('error decrypting secrets');
          reject(err);
        } else {
          global.log('successfully decrypted secrets');
          resolve(data.Plaintext.toString());
        }
      });
    });
  }

  module.exports = {
    decrypt,
  };
