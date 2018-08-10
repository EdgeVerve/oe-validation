/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
var chalk = require('chalk');

var chai = require('chai');
var bootstrap = require('./bootstrap');
var expect = chai.expect;
var loopback = require('loopback');
var app = require('oe-cloud');
var models = app.models;

chai.use(require('chai-things'));

var parentModelName = 'Location';
var orderModel = 'OrderModel';
// Order Model with Static String for comparison in expression.
var orderModel_SS = 'OrderModel_SS';
var defaultContext = {"ctx":{"tenantId":"default"}};
describe(chalk.blue('oeCloud Validation Custom test'), function () {

  this.timeout(20000);
  before('wait for boot', function(done){
    bootstrap.then(() => {
      // debugger
      done();
    })
    .catch(done)
  });

  before('setup test data', function (done) {
    models.ModelDefinition.create({
      "name": "Location",
      "base": "BaseEntity",
      "idInjection": false,
      "strict": "validate",
      "options": {
        "validateUpsert": true
      },
      "properties": {
        "companyCode": {
          "type": "string",
          "required": true
        },
        "locationCode": {
          "type": "string",
          "required": true,
          "max": 200
        }
      }
    }, bootstrap.defaultContext, function (err, model) {
      if (err) {
        console.log('oeCloud Validation Custom test : Error in create model ', err);
      } else {
        models.ModelDefinition.create({
          "name": orderModel,
          "plural": orderModel + "s",
          "base": "BaseEntity",
          "strict": false,
          "idInjection": false,
          "options": {
            "validateUpsert": true,
            "oeValidations": {
              "requestedBillingCompanyCheck": {
                "validateWhen": {},
                "type": "custom",
                "expression": "(@mLocation.companyCode where locationCode = @i.requestedBillingLocation.locationCode and companyCode = @i.buyerCompanyCode) == @i.buyerCompanyCode"
              }
            }
          },
          "properties": {
            "buyerCompanyCode": {
              "type": "string",
              "required": true
            },
            "requestedBillingLocation": {
              "type": "Location",
              "required": true
            }
          },
          "validations": [],
          "relations": {},
          "acls": [],
          "methods": {}
          
        }, defaultContext, function (err, model) {
          if (err) {
            console.log('Error creating Order model definition', err);
          } else {
            models.ModelDefinition.create({
              "name": orderModel_SS,
              "plural": orderModel_SS + "s",
              "base": "BaseEntity",
              "strict": false,
              "idInjection": false,
              "options": {
                "validateUpsert": true,
                "oeValidations": {
                  "requestedBillingCompanyCheck": {
                    "validateWhen": {},
                    "type": "custom",
                    "expression": "(@mLocation.companyCode where locationCode = @i.requestedBillingLocation.locationCode and companyCode = \"SellerCompany\") == @i.buyerCompanyCode"
                  }
                }
              },
              "properties": {
                "buyerCompanyCode": {
                  "type": "string",
                  "required": true
                },
                "requestedBillingLocation": {
                  "type": "Location",
                  "required": true
                }
              },
              "validations": [],
              "relations": {},
              "acls": [],
              "methods": {}
            }, defaultContext, function (err, model) {
              expect(err).to.be.not.ok;
              var parentModel = loopback.getModel(parentModelName, defaultContext);
              var data = [{
                "companyCode": "Company1",
                "locationCode": "Branch1"
              }, {
                "companyCode": "SellerCompany",
                "locationCode": "BranchSeller1"
              }, {
                "companyCode": "SellerCompany",
                "locationCode": "BranchSeller2"
              }, {
                "companyCode": "Company1",
                "locationCode": "Branch2"
              }];

              parentModel.create(data, defaultContext, function (err, results) {
                expect(err).to.be.null;
                done();
              });
            });
          }
          expect(err).to.be.not.ok;
        });
      }
      expect(err).to.be.not.ok;
    });
  });

  after('destroy test models', function (done) {
    models.ModelDefinition.destroyAll({
      name: parentModelName
    }, defaultContext, function (err, d) {
      if (err) {
        console.log('Error - not able to delete modelDefinition entry for parent Model Hotel');
        return done();
      }
      var model = loopback.getModel(parentModelName, defaultContext);
      model.destroyAll({}, defaultContext, function () {
        models.ModelDefinition.destroyAll({
          name: orderModel
        }, defaultContext, function (err, d) {
          if (err) {
            console.log('Error - not able to delete modelDefinition entry for orderModel');
            return done();
          }
          var model = loopback.getModel(orderModel, defaultContext);
          model.destroyAll({}, defaultContext, function () {
            models.ModelDefinition.destroyAll({
              name: orderModel_SS
            }, defaultContext, function (err, d) {
              if (err) {
                console.log('Error - not able to delete modelDefinition entry for orderModel_SS');
                return done();
              }
              var model = loopback.getModel(orderModel_SS, defaultContext);
              model.destroyAll({}, defaultContext, function () {
                done();
              });
            });
          });
        });
      });
    });
  });


  it('Validation Test orderModel - Should insert data successfully', function (done) {

    var childModel = loopback.getModel(orderModel, defaultContext);

    var data = [{
      "buyerCompanyCode": "SellerCompany",
      "requestedBillingLocation": {
        "companyCode": "SellerCompany",
        "locationCode": "BranchSeller1"
      }
    }, {
      "buyerCompanyCode": "Company1",
      "requestedBillingLocation": {
        "companyCode": "Company1",
        "locationCode": "Branch2"
      }
    }];
    childModel.create(data, defaultContext, function (err, results) {
      expect(err).to.be.null;
      done();
    });
  });

  it('Validation Test orderModel - Should fail to insert data', function (done) {

    var childModel = loopback.getModel(orderModel, defaultContext);

    var data = {
      "buyerCompanyCode": "Company1",
      "requestedBillingLocation": {
        "companyCode": "Company1",
        "locationCode": "BranchSeller2"
      }
    };
    childModel.create(data, defaultContext, function (err, results) {
      expect(err).not.to.be.null;
      done();
    });
  });

  // Test cases for allowing Static String comparison.
  it('Validation Test Static String - Should fail to insert data when string equality returns false', function (done) {
    
    var childModel = loopback.getModel(orderModel_SS, defaultContext);

    var data = {
      "buyerCompanyCode": "Company1",
      "requestedBillingLocation": {
        "companyCode": "Company1",
        "locationCode": "Branch1"
      }
    };
    childModel.create(data, defaultContext, function (err, results) {
      expect(err).not.to.be.null;
      done();
    });
  });

  it('Validation Test Static String - Should fail to insert data when string equality returns true, then fails at main expression.', function (done) {
    
    var childModel = loopback.getModel(orderModel_SS, defaultContext);

    var data = {
      "buyerCompanyCode": "Company1",
      "requestedBillingLocation": {
        "companyCode": "SellerCompany",
        "locationCode": "BranchSeller1"
      }
    };
    childModel.create(data, defaultContext, function (err, results) {
      expect(err).not.to.be.null;
      done();
    });
  });

  it('Validation Test Static String - Should insert successfully.', function (done) {
    
    var childModel = loopback.getModel(orderModel_SS, defaultContext);

    var data = {
      "buyerCompanyCode": "SellerCompany",
      "requestedBillingLocation": {
        "companyCode": "SellerCompany",
        "locationCode": "BranchSeller2"
      }
    };
    childModel.create(data, defaultContext, function (err, results) {
      expect(err).to.be.null;
      done();
    });
  });

});