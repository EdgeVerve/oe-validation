/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */
var chalk = require('chalk');
var chai = require('chai');
var expect = chai.expect;
chai.use(require('chai-things'));
var loopback = require('loopback');
var async = require('async');
var fs = require('fs');
var ModelDefinition;
var DecisionTable;
var ModelRule;
var bootstrapped = require('./bootstrap');
var prefix = 'data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,';
var context= {"ctx":{"tenantId":"test-tenant"}};
var adminContext = {"ctx":{"tenantId":"default"}};

class TestCaseError extends Error {
  constructor() {
    super();
    this.message = "The test should not have hit this line. Check code.";
  }
}

describe('model rules with inherited models', function() {
  this.timeout(20000);
  var baseModel;
  before('wait for boot', function(done){
    bootstrapped.then(() => {
      // debugger
      // console.log('after boot');
      ModelDefinition = loopback.findModel('ModelDefinition', adminContext);
      DecisionTable = loopback.findModel('DecisionTable', adminContext);
      ModelRule = loopback.findModel('ModelValidationRule', adminContext);
      expect(ModelDefinition).to.not.be.undefined;
      expect(DecisionTable).to.not.be.undefined;
      expect(ModelRule).to.not.be.undefined;

      done();
    })
    .catch(done)
  });

  before('creating the base model', function(done){
    var EmployeeBase = {
      name: 'XEmployee',
      base: 'BaseEntity',
      properties: {
        name: 'string',
        age: 'number',
        gender: 'string',
        qualification: 'object',
        section: 'string'
      }
    };
    ModelDefinition.create(EmployeeBase, adminContext, (err, model) => {
      if (err) {
        done(err);
      } else {
        baseModel = model;
        expect(baseModel.name).to.equal(EmployeeBase.name);
        done();
      }
    });
  });

  
  var insert = function(obj, ctx) {
    return new Promise((resolve, reject) => {
      DecisionTable.create(obj, ctx, (err, record) => {
        if (err) {
          reject(err)
        }
        else {
          resolve(resolve);
        }
      });
    });
  };

  before('Creating decisions for the base model as default tenant', function(done){
    var decisions = [
      {
        name: 'd1',
        documentName: 'employee_validation.xlsx',
        documentData: prefix + fs.readFileSync(__dirname + '/test-data/employee_validation.xlsx').toString('base64')
        
      }
    ];

    Promise.all(decisions.map(d => insert(d, adminContext)))
    .then(results => {
      done();
    })
    .catch(done);
  });

  before('...wiring the model rule to run on base model insert (as default tenant)', (done) => {
    var obj = {
      modelName: 'XEmployee',
      validationRules: ['d1']
    };

    ModelRule.create(obj, adminContext, (err, data) => {
      if(err) {
        done(err)
      }
      else {
        done();
      }
    });
  });

  before('...asserting the base model rules get invoked on insert', done => {
    var records = [
      {
        name: 'person1',
        age: 23,
        qualification: {
          marks_10: 65,
          marks_12: 65
        }
      },
      {
        name: 'person2',
        age: 24,
        qualification: {
          marks_10: 65,
          marks_12: 59
        }
      }
    ];
    var baseModel = loopback.findModel('XEmployee', adminContext);

    baseModel.create(records, context, err => {
      expect(err).to.not.be.null;
      baseModel.find({}, context, (errFind, data) => {
        if(errFind) {
          done(errFind)
        }
        else {
          expect(data.length).to.equal(1);
          done();
        }
      });
    });
  }); //end ...before()

  it('should assert the order in which the hooks execute are as expected', done => {

    // The purpose of this test is to convince yourself of the order in
    // which the hooks execute
    var task1 = cb => {
      // begin - creating a parent model from BaseEntity
      var modelDef = {
        name: 'A',
        properties: {
          a : 'string'
        },
        base: 'BaseEntity'
      };

      ModelDefinition.create(modelDef, adminContext, (err, record) => {
        if(err) {
          cb(err)
        }
        else {
          // expect(record.name).to.equal(modelDef.name);
          cb();
        }
      });
      // end - creating a parent model from BaseEntity
    };

    var task2 = cb => {
      // begin - creating a derived model from A
      var modelDef = {
        name: 'B',
        base: 'A',
        properties: {
          b: 'number'
        }
      };

      ModelDefinition.create(modelDef, adminContext, (err, record) => {
        if(err) {
          cb(err)
        }
        else {
          // expect(record.name).to.equal(modelDef.name);
          cb();
        }
      });
      // end - creating a derived model from A
    };

    var task3 = cb => {
      // begin - create a derived model from B
      var modelDef = {
        name: 'C',
        base: 'B',
        properties: {
          c: 'boolean'
        }
      };

      ModelDefinition.create(modelDef, adminContext, (err, record) => {
        if(err) {
          cb(err)
        }
        else {
          // expect(record.name).to.equal(modelDef.name);
          cb();
        }
      });
      // end - create a derived model from B
    };
    var cache = [];
    var task4 = cb => {
      // begin - wiring before save hooks
      var A = loopback.findModel('A');
      var B = loopback.findModel('B');

      A.observe('before save', function _bsA(ctx, next) {
        cache.push('A');
        // console.log('A ctx:', ctx);
        next();
      });

      B.observe('before save', function _bsB(ctx, next){
        cache.push('B');
        // console.log('B ctx:', ctx);
        next();
      });
      // end - wiring before save hooks

      cb();
    };

    var task5 = cb => {
      // begin - creating a record in c
      var C = loopback.findModel('C');
      var data = {
        a: 'fooA',
        b: 2,
        c: false
      };

      C.create(data, adminContext, err => {
        if(err) {
          cb(err);
        }
        else {
          cb();
        }
      });
      // end - creating a record in c
    };
    // debugger;
    async.seq(task1, task2, task3, task4, task5)(err => {
      if(err) {
        done(err);
      }
      else {
        expect(cache).to.eql(['A', 'B']);
        done();
      }
    })
  });

  it('should create a derived employee (as test-tenant)', done => {
    var derivedEmployee = {
      name: 'BPOEmployee',
      base: 'XEmployee',
      properties: {
        shift: 'string'
      }
    };

    ModelDefinition.create(derivedEmployee, context, err => {
      if (err) {
        done(err)
      }
      else {
        done();
      }
    });

  });

  // this test should invoke the base model rule and deny
  // insert of the invalid record
  it('should deny insert of record on derived entity for an invalid record', done => {
    var invalidRecord = {
      name: 'Gropher',
      qualification: {
        marks_10: 65,
        marks_12: 55
      },
      shift: 'night',
      age: 34,
      gender: 'M'
    };
    // debugger;
    var derivedModel = loopback.findModel('BPOEmployee', context);
    // debugger;
    derivedModel.create(invalidRecord, context, err => {
      if (err) {
        // debugger;
        // console.log(err);
        done();
      }
      else {
        done(new TestCaseError());
      }
    });
  });
});
