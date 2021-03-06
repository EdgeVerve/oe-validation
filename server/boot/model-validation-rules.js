/*
©2015-2018 EdgeVerve Systems Limited (a fully owned Infosys subsidiary), Bangalore, India. All Rights Reserved.
The EdgeVerve proprietary software program ("Program"), is protected by copyrights laws, international treaties and other pending or existing intellectual property rights in India, the United States and other countries.
The Program may contain/reference third party or open source components, the rights to which continue to remain with the applicable third party licensors or the open source community as the case may be and nothing here transfers the rights to the third party and open source components, except as expressly permitted.
Any unauthorized reproduction, storage, transmission in any form or by any means (including without limitation to electronic, mechanical, printing, photocopying, recording or  otherwise), or any distribution of this Program, or any portion of it, may result in severe civil and criminal penalties, and will be prosecuted to the maximum extent possible under the law.
*/
/**
 * This boot script brings the ability to declaratively add validation rule(decision table) to the model.
 *
 * @memberof Boot Scripts
 * @author Dipayan Aich
 * @name Model Rules
 */

var loopback = require('loopback');
var log = require('oe-logger')('model-validation-rules');

// var messaging = require('oecloud/lib/common/ev-global-messaging');
module.exports = function (app, cb) {
  var modelValidationRule = app.models.ModelValidationRule;
  modelValidationRule.observe('after save', modelRuleAfterSave);
  modelValidationRule.observe('before save', modelRuleBeforeSave);
  var filter = {
    fields: { 'modelName': true },
    where: {
      disabled: false
    }
  };
  var options = {
    ignoreAutoScope: true,
    fetchAllScopes: true
  };
  modelValidationRule.find(filter, options, (err, models)=>{
    if (err) {
      cb(err);
    } else {
      models.forEach((item, i)=>{
        var m = loopback.findModel(item.modelName);
        m.settings._isModelRuleExists = true;
      });

      cb();
    }
  });
};

function modelRuleAfterSave(ctx, next) {
  log.debug(log.defaultContext(), 'modelRuleAfterSave method.');
  var data = ctx.data || ctx.instance;
  // Publishing message to other nodes in cluster to attach the 'before save' hook for model.
  // messaging.publish('modelRuleAttachHook', data.modelName, ctx.options);

  log.debug(log.defaultContext(), 'modelRuleAfterSave data is present. calling attachBeforeSaveHookToModel');
  var model = loopback.findModel(data.modelName, ctx.options);
  if (model && data && data.validationRules && data.validationRules.length > 0) {
    // Setting the flag that Model Rule exists which will be used for validation rules
    model.settings._isModelRuleExists = true;
  } else {
    // validationRules is empty (updated or deleted)
    if (model && model.settings) {
      model.settings._isModelRuleExists = false;
    }
  }
  next();
}

function modelRuleBeforeSave(ctx, next) {
  log.debug(log.defaultContext(), 'modelRuleBeforeSave method.');
  var data = ctx.data || ctx.instance;
  // Publishing message to other nodes in cluster to attach the 'before save' hook for model.
  // messaging.publish('modelRuleAttachHook', data.modelName, ctx.options);
  var model = loopback.findModel(data.modelName, ctx.options);
  if (!model) {
    next(new Error('Model \'' + data.modelName + '\' doesn\'t exists.'));
  }
  next();
}
