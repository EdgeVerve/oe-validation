/*
©2015-2016 EdgeVerve Systems Limited (a fully owned Infosys subsidiary), Bangalore, India. All Rights Reserved.
The EdgeVerve proprietary software program ("Program"), is protected by copyrights laws, international treaties and other pending or existing intellectual property rights in India, the United States and other countries.
The Program may contain/reference third party or open source components, the rights to which continue to remain with the applicable third party licensors or the open source community as the case may be and nothing here transfers the rights to the third party and open source components, except as expressly permitted.
Any unauthorized reproduction, storage, transmission in any form or by any means (including without limitation to electronic, mechanical, printing, photocopying, recording or  otherwise), or any distribution of this Program, or any portion of it, may result in severe civil and criminal penalties, and will be prosecuted to the maximum extent possible under the law.
*/
/* eslint-disable no-eval */
/**
 * This mixin is for validations, where we override the isValid function of loopback.
 * All the validations defined on the model will be aggregated and attached to the model,
 * which will be parallely executed whenever any data is posted for the model.
 *
 * @mixin Model Validations
 * @author Sambit Kumar Patra and Dipayan Aich
 */

var logger = require('oe-logger');
var log = logger('model-validations');
var async = require('async');
var q = require('oe-promise');
var validationBuilder = require('../../lib/validation-builder.js');
var exprLang = require('oe-expression/lib/expression-language.js');
var getError = require('oe-cloud/lib/error-utils').attachValidationError;
var loopback = require('loopback');
var util = require('oe-cloud/lib/common/util.js');
var enablePropertyValidate = process.env.RETURN_ON_PROP_VALIDATION || 0;


// design-break this is experimental, may break functionality of expression validation
function isSimpleValidation(expression) {
  var regex = new RegExp('(@m)|( where )|(if[ ]{0,1}\\()|(while[ ]{0,1}\\()|(switch[ ]{0,1}\\()|(void )|(delete )|(typeof )|(alert[ ]{0,1}\\()|(eval[ ]{0,1}\\()');
  return !regex.test(expression);
}

// design-break this is experimental, may break functionality of expression validation
function generateSimpleValidation(expression) {
  var regex = new RegExp('@i.', 'g');
  return expression.replace(regex, 'data.');
}

// design-break this is experimental, may break functionality of expression validation
function evalSimpleValidation(value, data) {
  if (value.indexOf('Date(') >= 0 || value.indexOf('Date (') >= 0) {
    var regex = /(Date([ ]+)?\([a-zA-Z0-9.]+\))(.[a-zA-Z]+)?/g;
    var regex2 = /\(([^)]+)\)/i;
    var dates = value.match(regex);
    dates.forEach(function (v) {
      var result = null;
      var date = new Date(eval(v.match(regex2)[1]));
      var dateOperator = v.substring(v.lastIndexOf('.') + 1);
      switch (dateOperator) {
        case 'daydate':
          result = date.getDate();
          break;
        case 'dayname':
          var dayNames = [
            'Sunday',
            'Monday',
            'Tuesday',
            'Wednesday',
            'Thursday',
            'Friday',
            'Saturday'
          ];
          var dayNo = date.getDate();
          result = '"' + dayNames[dayNo] + '"';
          break;
        case 'day':
          result = date.getDay();
          break;
        case 'month':
          result = date.getMonth();
          break;
        case 'monthname':
          var monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'];
          var monthNo = date.getMonth();
          result = '"' + monthNames[monthNo] + '"';
          break;
        case 'year':
          result = date.getFullYear();
          break;
        case 'hours':
          result = date.getHours();
          break;
        case 'minutes':
          result = date.getMinutes();
          break;
        case 'seconds':
          result = date.getSeconds();
          break;
        case 'ms':
          result = date.getMilliseconds();
          break;
        default:
          result = date.valueOf();
      }
      value = value.replace(v, result);
    });
  }

  return eval(value);
}


module.exports = function ModelValidations(Model) {
  if (Model.modelName === 'BaseEntity') {
    // No need to apply the "isValid" change at BaseEntity level
    // Let the actual model decide if it wants to enable modelvalidation mixin
    return;
  }

  var validationRules = [];
  // aggregate all the validations defined for the model and attach it to the model
  validationRules = validationBuilder.buildValidations(Model);

  Model.validationRules = validationRules;

  /**
     *
     * This function overrides the isValid method of loopback, it will be called whenever `obj.isValid()` method is called
     *
     * @memberof Model Validations
     * @param {function} done - function to be called once validation is over
     * @param {Object} options - options object
     * @param {Object} data - posted data
     * @param {String} path - modelName of the present model for which isValid is called with its parent model's name appended incase of embedded model
     * @param {Object} inst - instance of the data posted
     * @param {function} callback - function to be called incase of embedded model validation
     * @returns {Boolean} true or false depending upon the validity of the data
     * @function
     * @name modelValidationsIsValidFn
     */

  Model.prototype.isValid = function modelValidationsIsValidFn(done, data, context, path, inst, callback) {
    var options = context || {};
    // check if validations are to be executed, if not simply return the done callback.
    if (options && options.skipValidations) {
      return process.nextTick(function skipValidationCb() {
        done(true);
      });
    }

    var valid = true;
    var fnArr = [];
    var validateWhenPromises = [];

    if (!inst) {
      inst = this;
    }

    // To Do : modelData to be used for validation hooks
    var modelData = data;
    log.debug(options, 'modelData validation : ', modelData);

    data = inst.toObject(true);
    // path will give the exact level and property for which validation is being executed
    if (!path) {
      path = inst.constructor.modelName;
    }
    log.debug(options, 'isValid called for : ', path);
    var self = inst;
    var ast = self.constructor._ast;
    var args = {};
    args.inst = inst;
    args.data = data;
    args.path = path;
    args.options = options;
    // construct an array of promises for validateWhen and wait for expression language to resolve all the promises
    inst.constructor.validationRules.forEach(function modelValidationsRulesForEachFn(obj) {
      if (obj.args.validateWhen) {
        // design-break this is experimental implementation, may break functionality of expression validation
        // check self.constructor._simpleValidation[obj.args.validateWhen] true
        // if true, eval(inst.constructor._simpleValidation[obj.args.validateWhen]);
        // check if simple expression true,
        // if true, replace "@i.property" with "data.property"
        // eval the result and self.constructor._simpleValidation[obj.args.validateWhen] = result
        if (self.constructor._simpleValidation && self.constructor._simpleValidation[obj.args.validateWhen]) {
          // console.log('already there -----', obj.args.validateWhen)
          validateWhenPromises.push((function validateWhenPromisesCb() {
            return q.fcall(function fCallCb() {
              return evalSimpleValidation(self.constructor._simpleValidation[obj.args.validateWhen], data);
            });
          })());
        } else if (isSimpleValidation(obj.args.validateWhen)) {
          // console.log('simple -----', obj.args.validateWhen)
          var res =   generateSimpleValidation(obj.args.validateWhen);
          self.constructor._simpleValidation = {};
          self.constructor._simpleValidation[obj.args.validateWhen] = res;
          validateWhenPromises.push((function validateWhenPromisesCb() {
            return q.fcall(function fCallCb() {
              return evalSimpleValidation(res, data);
            });
          })());
        } else {
          // not a simple validation need to traverse the AST
          // console.log('not simple *****', obj.args.validateWhen)
          validateWhenPromises.push(exprLang.traverseAST(ast[obj.args.validateWhen], data, options));
        }
      } else {
        validateWhenPromises.push((function validateWhenPromisesCb() {
          return q.fcall(function fCallCb() {
            return true;
          });
        })());
      }
    });
    // when all promises are resolved check for the resolved value to know which validation rules are to be skipped
    // based on the validateWhen clause
    q.allSettled(validateWhenPromises).then(function modelValidationsValidateWhenPromisesCb(results) {
      log.trace(options, 'all promises settled in isValid');
      results.map(function modelValidationsValidateWhenPromisesMapCb(d) {
        return d.value;
      }).forEach(function modelValidationsValidateWhenPromisesMapForEachCb(d, i) {
        log.trace(options, 'preparing async function array for validation rules');
        if (d) {
          // this wrapper prepares an array of functions containg all the validations attached to the model
          var obj = inst.constructor.validationRules[i];
          fnArr.push(async.apply(obj.expression, obj.args, args));
        }
      });
      /* prepare an array of functions which are nothing but the isValid method of the
                 properties which are of Model type*/
      var recursionFns = getRecursiveModelFns(context, inst, data, path);
      var modelRuleExistsFlag = false;
      if (!inst.constructor.settings._isModelRuleExists) {
        util.traverseInheritanceTree(inst.constructor, options, (base)=>{
          if (base && base.settings && base.settings._isModelRuleExists) {
            modelRuleExistsFlag = true;
            return true;
          }
        });
      }
      if (inst.constructor.settings._isModelRuleExists || modelRuleExistsFlag) {
        fnArr.push(async.apply(executeDTValidationRulesFn, inst.constructor, inst.__data || inst, options));
      }
      // execute all the validation functions of the model parallely
      async.parallel(fnArr, function modelValidationsAsyncParallelCb(err, results) {
        if (err) {
          results.push(err);
        }
        results = [].concat.apply([], results);
        // execute all the isValid functions of the properties which are of Model type
        if (recursionFns && recursionFns.length > 0) {
          async.parallel(recursionFns, function modelValidationRecursionAsyncParallelCb(err, recurResults) {
            if (err) {
              recurResults.push(err);
            }
            results = results.concat([].concat.apply([], recurResults));
            var errArr = results.filter(function modelValidationAsyncParalllelErrCb(d) {
              return d !== null && typeof d !== 'undefined';
            });
            // inst.errors will have custom errors if any
            if (errArr.length > 0 || inst.errors) {
              valid = false;
            }
            callback && callback(null, errArr);
            if (done) {
              log.trace(options, 'all validation rules executed');
              if (errArr && errArr.length > 0) {
                log.debug(options, 'Data posted is not valid');
                // Add error to the response object
                getError(self, errArr);
                // done(valid);
              }
              // running custom validations of model(written in model js file) if any
              if (Model.customValidations || inst.__data.customValidations) {
                log.trace(options, 'executing custom validations for model');
                var customValArr = [];
                var custValidations = inst.__data.customValidations || [];
                delete inst.__data.customValidations;
                custValidations = custValidations.concat(Model.customValidations || []);
                custValidations.forEach(function customValidationForEachCb(customValidation) {
                  customValArr.push(async.apply(customValidation, inst.__data, context));
                });
                async.parallel(customValArr, function customModelValidationsAsyncParallelElseCb(err, customResults) {
                  if (err) {
                    customResults.push(err);
                  }
                  // Add error to the response object
                  customResults = [].concat.apply([], customResults);
                  var custErrArr = customResults.filter(function modelValidationAsyncParalllelCustomErrCb(d) {
                    return d !== null && typeof d !== 'undefined';
                  });
                  // inst.errors will have custom errors if any
                  if ((custErrArr && custErrArr.length > 0) || inst.errors) {
                    valid = false;
                    getError(self, custErrArr);
                  }
                  done(valid);
                });
              } else {
                done(valid);
              }
            } else {
              return valid;
            }
          });
        } else {
          var errArr = results.filter(function modelValidationAsyncParallelElseErrFilterFn(d) {
            return d !== null && typeof d !== 'undefined';
          });
          // inst.errors will have custom errors if any
          if (errArr.length > 0 || inst.errors) {
            valid = false;
          }
          callback && callback(null, errArr);
          if (done) {
            log.trace(options, 'all validation rules executed');
            if (errArr && errArr.length > 0) {
              log.debug(options, 'Data posted is not valid');
              // Add error to the response object
              getError(self, errArr);
              // done(valid);
              if (enablePropertyValidate) {
                log.info(options, 'Custom level validation will not be executed as property level validation is set as true');
                return done(valid);
              }
            }
            // running custom validations of model(written in model js file) if any
            if (Model.customValidations || inst.__data.customValidations) {
              log.trace(options, 'executing custom validations for model');
              var customValArr = [];
              var custValidations = inst.__data.customValidations || [];
              delete inst.__data.customValidations;
              custValidations = custValidations.concat(Model.customValidations || []);
              custValidations.forEach(function customValidationForEachCb(customValidation) {
                customValArr.push(async.apply(customValidation, inst.__data, context));
              });
              async.parallel(customValArr, function customModelValidationsAsyncParallelElseCb(err, customResults) {
                if (err) {
                  customResults.push(err);
                }
                // Add error to the response object
                customResults = [].concat.apply([], customResults);
                var custErrArr = customResults.filter(function modelValidationAsyncParalllelCustomErrCb(d) {
                  return d !== null && typeof d !== 'undefined';
                });
                // inst.errors will have custom errors if any
                if ((custErrArr && custErrArr.length > 0) || inst.errors) {
                  valid = false;
                  getError(self, custErrArr);
                }
                done(valid);
              });
            } else {
              done(valid);
            }
          } else {
            return valid;
          }
        }
      });
    }, function modelValidationsAsyncParallelReasonFn(reason) {
      log.warn(options, 'Warning - Unable to resolve validateWhen promises with reason -', reason);
    }).catch(function validatwWhenPromiseErrorCb(err) {
      log.error(options, 'Error - Unable to resolve validateWhen promises with error -', err);
    });
  };

  function executeDTValidationRulesFn(model, inst, options, callback) {
    var desicionTableModel = loopback.findModel('DecisionTable');
    var desicionServiceModel = loopback.findModel('DecisionService');
    var modelRule = loopback.findModel('ModelValidationRule');

    // begin - new change
    // Traverse up the inheritance tree
    var chain = [];

    util.traverseInheritanceTree(model, options, base => {
      chain.push(base);
    });

    Promise.resolve(chain).then(chain => {
      // Step 1. Getting all the base model names
      // var results = [];
      // var { tenantId } = options.ctx;

      var modelNames = chain.map(baseModel => baseModel.modelName);

      // adding the original model to the start of array
      // modelNames.unshift(fnExtractUserFriendlyModelName(model.modelName));
      modelNames.unshift(model.modelName);

      return modelNames;
    })
      .then(modelArray => {
      // Step 2. Getting all validation rules
        var results = [];
        // begin - routine to fetch rules on model
        var fetchTasks = modelArray.map(m => cb => {
          var filter = {
            where: {
              modelName: m,
              disabled: false
            }
          };
          // console.log('Fetching model rule: ', filter);
          modelRule.findOne(filter, options, (err, rule) => {
            if (err) {
              cb(err);
            } else {
              if (rule) {
                results = results.concat(rule.validationRules.map(r =>
                  (
                    {
                      model: m,
                      rule: r,
                      isService: rule.isService
                    }
                  )
                ));
              }
              cb();
            }
          });
        });
        // end - routine to fetch rules on model

        return new Promise((resolve, reject) => {
          async.seq(...fetchTasks)(err => {
            if (err) {
              reject(err);
            } else {
              resolve(results);
            }
          });
        });
      })
      .then(validationRules => {
      // Step 3. execute the validation rules in no particular order
        var data = inst;
        data.options = options;
        return new Promise(resolve => {
          async.concat(validationRules, (ruleObj, cb) => {
          // begin - rule invocation
            data.options.modelName = ruleObj.model;
            if (ruleObj.isService) {
            // begin - decision service invoation
              desicionServiceModel.invoke(ruleObj.rule, data, options, (err, postValidationResults) => {
                if (err) {
                  cb(err);
                } else {
                  var results = Object.values(postValidationResults).reduce((arr, item) => arr.concat(item), []);
                  var errorArr = results.map(obj => {
                    obj.fieldName = 'DecisionService';
                    obj.model = ruleObj.model;
                    return obj;
                  });
                  cb(null, errorArr);
                }
              });
            // end - decision service invoation
            } else {
            // begin - decision table invocation
              desicionTableModel.exec(ruleObj.rule, data, options, (err, postValidationResults) => {
                if (err) {
                  cb(err);
                } else {
                  var errorArr = postValidationResults.map(function (obj) {
                    obj.fieldName = 'DecisionTable';
                    obj.model = ruleObj.model;
                    return obj;
                  });
                  cb(null, errorArr);
                }
              });
            // end - decision table invocation
            }
          // end - rule invocation
          }, (err, results) => {
            if (inst && inst.options) {
              delete inst.options;
            }
            if (err) {
              results.push(err);
            }
            // callback(null, results);
            resolve(results);
          });
        });
      })
      .then(results => {
      // Step 5. We are done...
        callback(null, results);
      })
      .catch(err => {
        callback(err);
      });
  }


  /**
     * This function prepares an array which contains all the isValid methods,
     * incase a property is of type Model its data can be validated by calling its isValid method
     * @memberof Model Validations
     * @param {Object} options - options object
     * @param {Object} modelinstance - model instance of the posted model
     * @param {Object} instanceData - posted data
     * @param {String} instancePath - modelName of the present model for which isValid is called with its parent model's name appended incase of embedded model
     * @returns {function[]} Array of functions.
     * @function getRecursiveModelFns
     */

  function getRecursiveModelFns(context, modelinstance, instanceData, instancePath) {
    var options = context.options;
    var properties = modelinstance.constructor.definition.properties;
    var modelfns = [];
    var model;
    var path;
    var data;
    var instance;
    log.debug(options, 'preparing recursive validation rules for : ', modelinstance.constructor.modelName);
    var relations = modelinstance.constructor.relations || {};
    var relationNames = Object.keys(relations);
    Object.keys(properties).forEach(function modelValidationsRecursiveModelKeysFn(property) {
      // if type of the property is an array which is of Model type then collect the isValid methods for the Model
      // for example: if proerty is of type : ['Items'] where Item is a Model
      var validateEmbeddedModel = true;
      if (properties[property].type instanceof Array &&
                properties[property].type[0] &&
                properties[property].type[0].sharedClass &&
                instanceData[property]) {
        relationNames.forEach(function getRelationFn(relationName) {
          var rel = relations[relationName];
          if (rel.modelTo.modelName === properties[property].type[0].modelName && rel.type === 'embedsMany' && rel.options && rel.options.validate === false) {
            validateEmbeddedModel = rel.options.validate;
          }
        });
        for (var i = 0; i < instanceData[property].length; i++) {
          model = properties[property].type[0];
          path = instancePath + '->' + property + '[' + i + ']';
          data = instanceData[property][i];
          instance = modelinstance.__data[property][i];
          if (validateEmbeddedModel && instance && data && model.settings.mixins && model.settings.mixins.ModelValidationMixin) {
            log.debug(options, 'recursive validation rules added for : ', model.modelName);
            modelfns.push(async.apply(model.prototype.isValid, null, data, context, path, instance));
          }
        }
      } else if (properties[property].type instanceof Function &&
                properties[property].type.sharedClass) {
        // if property is of type Model then add its isValid method to the function array
        model = properties[property].type;
        path = instancePath + '->' + property;
        data = instanceData[property];
        instance = modelinstance.__data[property];
        relationNames.forEach(function getRelationFn(relationName) {
          var rel = relations[relationName];
          if (rel.modelTo.modelName === model.modelName && rel.type === 'embedsOne' && rel.options && rel.options.validate === false) {
            validateEmbeddedModel = rel.options.validate;
          }
        });
        if (validateEmbeddedModel && instance && data && model.settings.mixins && model.settings.mixins.ModelValidationMixin) {
          log.debug(options, 'recursive validation rules added for : ', model.modelName);
          modelfns.push(async.apply(model.prototype.isValid, null, data, context, path, instance));
        }
      }
    });
    return modelfns;
  }
};
