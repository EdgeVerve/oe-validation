module.exports = function (app) {
  app.attachMixinsToBaseEntity('ModelValidationMixin');
  app.attachMixinsToBaseEntity('ExpressionAstPopulatorMixin');
};
