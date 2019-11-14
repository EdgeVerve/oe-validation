var getValidationError = require('../../utils/error-util');

module.exports = function (Product) {
	
  var customerValArray = [];
   
  function validateRemarks(data, context, cb) {

      if (data.manufacturingDate.setHours(0, 0, 0, 0) > data.expiryDate.setHours(0, 0, 0,0)) {
        getValidationError('custom-validation-err-001', context.options, function (error) { 
        error.fieldName = 'manufacturingDate';
        error.errMessage = error.message;
        error.errCode = 'custom-validation-err-001';
        cb(null, error);
        });
        //cb(null, new Error('Manufacturing date should be less than expiry date.'));
      }  else {
        cb();
      }
  }
  
  customerValArray.push(validateRemarks);
  Product.customValidations = customerValArray;
  
}; 