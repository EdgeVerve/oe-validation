/*
©2015-2016 EdgeVerve Systems Limited (a fully owned Infosys subsidiary), Bangalore, India. All Rights Reserved.
The EdgeVerve proprietary software program ('Program'), is protected by copyrights laws, international treaties and other pending or existing intellectual property rights in India, the United States and other countries.
The Program may contain/reference third party or open source components, the rights to which continue to remain with the applicable third party licensors or the open source community as the case may be and nothing here transfers the rights to the third party and open source components, except as expressly permitted.
Any unauthorized reproduction, storage, transmission in any form or by any means (including without limitation to electronic, mechanical, printing, photocopying, recording or  otherwise), or any distribution of this Program, or any portion of it, may result in severe civil and criminal penalties, and will be prosecuted to the maximum extent possible under the law.
*/
/**
 * This class acts as an error wrapper which customises the loopback error by adding customised messages to it.
 * It prepares an customised error object which is finally attached to the response object.
 * @module ErrorUtils
 */

var loopback = require('loopback');
var Mustache = require('mustache');
/**
 *
 * property level validation error codes and default messages
 *
 * @returns {Object} error object
 * @function ErrorUtils
 */
module.exports = (function ErrorUtils() {
  function getError(code, obj, options, cb) {
    if (!options.ctx) {
      cb = options;
      options = obj;
      obj = {};
    }

    var Model = loopback.getModel('Error');
    var where = {
      'errCode': code
    };
    var filter = {};
    filter.where = where;
    // Query the 'Error' model to get the customised error message
    // and any more information redarding the error
    // Prepare the customised error object
    Model.findOne(filter, options, function errorUtilsModelFindCb(err, result) {
      if (err) {
        cb(err);
      } else {
        var errorObj = {};
        errorObj.code = code;
        errorObj.status = 422;
        if (result && result.errMessage) {
          errorObj.message = Mustache.render(result.errMessage, obj);
        } else {
          errorObj.message = 'Maintain the ' + code + ' in Error model.';
        }
        cb(errorObj);
      }
    });
  }
  return getError;
})();
