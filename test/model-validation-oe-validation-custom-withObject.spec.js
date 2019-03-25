/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
var chalk = require('chalk');
var bootstrap = require('./bootstrap');

var loopback = require('loopback');
var app = require('oe-cloud');
var models = app.models;
var defaultContext = {"ctx":{"tenantId":"default"}};
var chai = require('chai');
chai.use(require('chai-things'));
var expect = chai.expect;
var parentModelName = 'CustomerEnrollment_3';
var childModelName = 'ProductModel_3';


describe(chalk.blue('oeCloud Validation Custom test for date type'), function () {
  this.timeout(60000000);
  before('wait for boot', function(done){
    bootstrap.then(() => {
      done();
    })
    .catch(done)
  });

  var childModel;
  var parentModel;

  before('setup test data', function (done) {

    models.ModelDefinition.create({
    "name": "CustomerEnrollment_3",
    "base": "BaseEntity",
    "strict": false,
    "plural": "CustomerEnrollment_3s",
    "idInjection": true,
    "options": {
        "validateUpsert": true
    },
    "properties": {
		"cifid" : {
			"type": "string",
			"required": true,
            "unique": true
		},
		"businessentitydetail": {
            "type": "Object",
            "required": true
		}
	}
}, defaultContext, function (err, model) {
      if (err) {
        console.log(err);
      } else {
        models.ModelDefinition.create({
    "name": "ProductModel_3",
    "base": "BaseEntity",
    "strict": false,
    "plural": "ProductModel_3s",
    "idInjection": true,
    "options": {
        "validateUpsert": true,
        "oeValidations": {
          "productExpiry": {
              "validateWhen": "@i.representeeId !== 'undefined'",
              "type": "custom",
              "expression": "Date(@mCustomerEnrollment_3.businessentitydetail.dateOfIncorporation where cifid = @i.representeeId) < Date(@i.withEffectFrom)"
          }
      }
    },
    "properties": {
		"representeeId" : {
			"type": "string",
			"required": true,
      "unique": true
		},
	
        "withEffectFrom": {
            "type": "date"
        }
    }
}, defaultContext, function (err, model) {
          if (err) {
            console.log(err);
          }
          parentModel = loopback.getModel(parentModelName, defaultContext);
          childModel = loopback.getModel(childModelName, defaultContext);
          expect(err).to.be.not.ok;

          var data = [
				{
					"cifid": "101",
					"businessentitydetail": {
					"dateOfIncorporation": "2000-01-01"
					}
				},
				{
					"cifid": "102",
					"businessentitydetail": {
					"dateOfIncorporation": "2000-01-01"
					}
				},
				{
					"cifid": "103",
					"businessentitydetail": {
					"dateOfIncorporation": "2000-01-01"
					}
				}
				];
          parentModel.create(data, defaultContext, function (err, results) {
            expect(err).to.be.null;
            return done();
          });

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
        console.log('Error - not able to delete modelDefinition entry for parent Model Custpmer Enrollment');
        return done();
      }
      parentModel.destroyAll({}, defaultContext, function () {
        models.ModelDefinition.destroyAll({
          name: childModelName
        }, defaultContext, function (err, d) {
          if (err) {
            console.log('Error - not able to delete modelDefinition entry for child Model productModel');
            return done();
          }
          childModel.destroyAll({}, defaultContext, function () {
            done();
          });
        });
      });
    });
  });

  it('Validation Test - Should insert data successfully ', function (done) {

   var data = {
	"representeeId" : "101",
	"withEffectFrom" : "2019-01-01"
  };
  console.log(childModel)
    childModel.create(data, defaultContext, function (err, results) {
      expect(err).to.be.null;
      done();
    });
  });

  
  it('Validation Test - Should fail to insert data', function (done) {

    var data = {
      "representeeId" : "103",
	    "withEffectFrom" : "1966-01-01"
    };
    childModel.create(data, defaultContext, function (err, results) {
      console.log("==========", err, results);
      expect(err).not.to.be.null;
      done();
    });
  });

});
