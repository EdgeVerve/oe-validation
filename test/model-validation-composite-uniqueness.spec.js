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
var defaultContext = {'ctx': {'tenantId': 'default'}};
var modelName = 'Organisation';
var organisationModel;

describe(chalk.blue('Composite Uniqueness Validation test'), function () {
  this.timeout(60000);
  before('wait for boot', function (done) {
    bootstrap.then(() => {
      // debugger
      done();
    })
      .catch(done);
  });

  before('setup test data', function (done) {
    // models.ModelDefinition.once('model-' + modelName + '-available', function () {
    //   done();
    // });

    models.ModelDefinition.create({
      'name': 'Organisation',
      'base': 'BaseEntity',
      'plural': 'organisations',
      'strict': false,
      'idInjection': true,
      'options': {
        'validateUpsert': true
      },
      'properties': {
        'category': {
          'type': 'string',
          'required': true
        },
        'name': {
          'type': 'string',
          'required': true,
          'unique': {
            'scopedTo': ['location', 'category']
          }
        },
        'location': {
          'type': 'string',
          'required': true
        },
        'revenue': {
          'type': 'number',
          'required': true
        }
      },
      'validations': [],
      'relations': {},
      'acls': [],
      'methods': {}
    }, defaultContext, function (err, model) {
      if (err) {
        console.log(err);
      }
      expect(err).to.be.not.ok;
      organisationModel = loopback.getModel(modelName, defaultContext);
      done();
    });
  });


  after('destroy test models', function (done) {
    models.ModelDefinition.destroyAll({
      name: modelName
    }, defaultContext, function (err, d) {
      if (err) {
        console.log('Error - not able to delete modelDefinition entry for mysettings');
        done();
      } else {
        organisationModel.destroyAll({}, defaultContext, function () {
          done();
        });
      }
    });
  });

  it('Validation Test - Should fail to insert data', function (done) {
    var data1 = {
      'category': '5',
      'location': 'BLR',
      'name': 'CROWN',
      'revenue': '1000000'
    };

    var data2 = {
      'category': '5',
      'location': 'BLR',
      'name': 'CROWN',
      'revenue': '7000000'
    };

    organisationModel.create(data1, defaultContext, function (err, results) {
      expect(err).to.be.null;
      organisationModel.create(data2, defaultContext, function (err, results) {
        expect(err).not.to.be.null;
        done();
      });
    });
  });

  it('Validation Test - Should insert data successfully', function (done) {
    var data1 = {
      'category': '7',
      'location': 'MUM',
      'name': 'TAJ',
      'revenue': '1000000'
    };

    var data2 = {
      'category': '7',
      'location': 'DL',
      'name': 'TAJ',
      'revenue': '1000000'
    };

    organisationModel.create(data1, defaultContext, function (err, results) {
      expect(err).to.be.null;
      organisationModel.create(data2, defaultContext, function (err, results) {
        expect(err).to.be.null;
        done();
      });
    });
  });
});
