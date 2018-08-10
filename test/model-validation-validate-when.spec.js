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
//var app = bootstrap.app;
var defaultContext = {"ctx":{"tenantId":"default"}};

chai.use(require('chai-things'));

var parentModelName = 'CustomerModel';
var childModelName = 'AccountModel';
var addressModelName = 'Address';
describe(chalk.blue('Validation validateWhen test'), function () {

    this.timeout(60000);
    before('wait for boot', function(done){
        bootstrap.then(() => {
        // debugger
        done();
        })
        .catch(done)
    });
    var parentModel;
    var childModel;
    var addressModel;

    before('setup test data', function (done) {
        models.ModelDefinition.once('model-' + childModelName + '-available', function () {
          return;

        });

        models.ModelDefinition.create({
            'name': 'Address',
            'base': 'BaseEntity',
            'plural': 'addresses',
            'strict': false,
            'idInjection': true,
            'options': {
                'validateUpsert': true
            },
            'properties': {
                'state': {
                    'type': 'string',
                    'required': true
                },
                'zipcode': {
                    'type': 'string',
                    'required': true,
                    'min': 6,
                    'validateWhen': {
                        'required': '@i.state == "WASHINGTON"'
                    }
                }
            },
            'validations': [],
            'relations': {},
            'acls': [],
            'methods': {}
        }, defaultContext, function (err, result) {
            if (err) {
                console.log(err);
            } else {
                models.ModelDefinition.create({
                    'name': parentModelName,
                    'base': 'BaseEntity',
                    'plural': parentModelName + 's',
                    'strict': false,
                    'idInjection': true,
                    'options': {
                        'validateUpsert': true,
                        'oeValidations': {
                            'adddressCheck': {
                                'validateWhen': '@i.state !== undefined && @i.state !== null && @i.state !== ""',
                                'type': 'reference',
                                'errorCode': 'addr-err-001',
                                'refModel': 'Address',
                                'refWhere': '{"state":"{{state}}"}'
                            }
                        }
                    },
                    'properties': {
                        'id': {
                            'type': 'number',
                            'required': true,
                            'id': true
                        },
                        'name': {
                            'type': 'string',
                            'required': true
                        },
                        'dob': {
                            'type': 'date',
                            'required': true
                        },
                        'age': {
                            'type': 'number',
                            'required': true
                        },
                        'cityType': {
                            'required': 'true',
                            'type': 'string',
                            'in': ['Urban', 'Semi-Urban', 'Rural']
                        },
                        'accNo': {
                            'type': 'number',
                            'required': true
                        },
                        'state': {
                            'type': 'string'
                        }
                    },
                    'validations': [],
                    'relations': {},
                    'acls': [],
                    'methods': {}
                }, defaultContext, function (err, model) {
                    if (err) {
                        console.log(err);
                    } else {
                        models.ModelDefinition.create({
                            'name': childModelName,
                            'base': 'BaseEntity',
                            'plural': childModelName + 's',
                            'strict': false,
                            'idInjection': true,
                            'options': {
                                'validateUpsert': true
                            },
                            'properties': {
                                'accountNumber': {
                                    'type': 'number',
                                    'required': true
                                },
                                'uniqueIdentificationNo': {
                                    'type': 'string',
                                    'required': true,
                                    'validateWhen': {
                                        'required': 'Date(@mCustomerModel.dob where accNo = @i.accountNumber).year > 1988'
                                    }
                                },
                                'accountType': {
                                    'type': 'string',
                                    'required': 'true',
                                    'in': ['privilage', 'non-privilage'],
                                    'validateWhen': {
                                        'in': '(@mCustomerModel.cityType where accNo=@i.accountNumber) inArray ["Urban","Semi-Urban"]'
                                    }
                                },
                                'balance': {
                                    'type': 'number',
                                    'required': true,
                                    'min': 5000,
                                    'max': 10000,
                                    'validateWhen': {
                                        'min': '(@mCustomerModel.age where accNo = @i.accountNumber) < 65'
                                    }
                                }
                            },
                            'validations': [],
                            'relations': {
                                'cust': {
                                    'type': 'belongsTo',
                                    'model': 'CustomerModel',
                                    'foreignKey': 'custId'
                                }
                            },
                            'acls': [],
                            'methods': {}
                        }, defaultContext, function (err, model) {
                            if (err) {
                                console.log(err);
                            }
                            parentModel = loopback.getModel(parentModelName, defaultContext);
                            childModel = loopback.getModel(childModelName, defaultContext)
                            addressModel = loopback.getModel(addressModelName, defaultContext)
                            expect(err).to.be.not.ok;
                            var cust1 = {
                              'id': 101,
                              'name': 'Mike',
                              'dob': '1936-06-10',
                              'cityType': 'Urban',
                              'age': 80,
                              'accNo': 1001
                            };
                            var cust2 = {
                              'id': 102,
                              'name': 'John',
                              'dob': '1998-05-05',
                              'cityType': 'Urban',
                              'age': 18,
                              'accNo': 1002
                            };
                            var cust3 = {
                              'id': 103,
                              'name': 'Jack',
                              'dob': '1951-02-01',
                              'cityType': 'Semi-Urban',
                              'age': 65,
                              'accNo': 1003
                            };
                            var cust4 = {
                              'id': 104,
                              'name': 'Jill',
                              'dob': '1961-03-03',
                              'cityType': 'Rural',
                              'age': 55,
                              'accNo': 1004
                            };
                            parentModel.create(cust1, defaultContext, function (err, results) {
                              expect(err).to.be.null;
                              parentModel.create(cust2, defaultContext, function (err, results) {
                                expect(err).to.be.null;
                                parentModel.create(cust3, defaultContext, function (err, results) {
                                  expect(err).to.be.null;
                                  parentModel.create(cust4, defaultContext, function (err, results) {
                                    expect(err).to.be.null;
                                    done();
                                  });
                                });
                              });
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
            parentModel.destroyAll({}, defaultContext, function () {
                models.ModelDefinition.destroyAll({
                    name: childModelName
                }, defaultContext, function (err, d) {
                    if (err) {
                        console.log('Error - not able to delete modelDefinition entry for child Model Room');
                        return done();
                    }
                    childModel.destroyAll({}, defaultContext, function () {
                        models.ModelDefinition.destroyAll({
                            name: addressModelName
                        }, defaultContext, function (err, d) {
                            if (err) {
                                console.log('Error - not able to delete modelDefinition entry for Address Model');
                                return done();
                            }
                            addressModel.destroyAll({}, defaultContext, function () {
                                done();
                            });
                        });
                    });
                });
            });
        });
    });

    it('Validation Test - Should insert data successfully despite balance set to 100', function (done) {

        var data = {
            'accountNumber': 1001,
            'balance': 100,
            'accountType': 'privilage',
            'custId': 101
        };
        childModel.create(data, defaultContext, function (err, results) {
            expect(err).to.be.null;
            done();
        });
    });

    it('Validation Test - Should fail to insert data successfully', function (done) {

        var data = {
            'accountNumber': 1002,
            'accountType': 'non-privilage',
            'uniqueIdentificationNo': 'UAN5123',
            'balance': 100,
            'custId': 102
        };
        childModel.create(data, defaultContext, function (err, results) {
            expect(err).not.to.be.undefined;
            done();
        });
    });

    it('Validation Test - Should insert data successfully (t198)', function (done) {

        var data = {
            'accountNumber': 1002,
            'accountType': 'non-privilage',
            'uniqueIdentificationNo': 'UAN5123',
            'balance': 5000,
            'custId': 102
        };
        childModel.create(data, defaultContext, function (err, results) {
            expect(err).to.be.null;
            done();
        });
    });

    it('Validation Test - Should fail to insert data successfully - The customer needs to give identification as the dob is later than 1988', function (done) {

        var data = {
            'accountNumber': 1002,
            'accountType': 'non-privilage',
            'balance': 5000,
            'custId': 102
        };
        childModel.create(data, defaultContext, function (err, results) {
            expect(err).not.to.be.undefined;
            done();
        });
    });

    it('Validation Test - Should insert data successfully for urban customer as the accountType is privilage', function (done) {

        var data = {
            'accountNumber': 1003,
            'accountType': 'privilage',
            'balance': 5000,
            'custId': 103
        };
        childModel.create(data, defaultContext, function (err, results) {
            expect(err).to.be.null;
            done();
        });
    });

    it('Validation Test - Should fail to insert data for urban customer as the accountType is not privilage or non-privilage', function (done) {

        var data = {
            'accountNumber': 1003,
            'accountType': 'regular',
            'balance': 5000,
            'custId': 103
        };
        childModel.create(data, defaultContext, function (err, results) {
            expect(err).not.to.be.undefined;
            done();
        });
    });

    it('Validation Test - Should insert data for rural customer as the accountType need not be privilage or non-privilage', function (done) {

        var data = {
            'accountNumber': 1004,
            'accountType': 'regular',
            'balance': 5000,
            'custId': 104
        };
        childModel.create(data, defaultContext, function (err, results) {
            expect(err).to.be.null;
            done();
        });
    });

    it('Validation Test - Should insert data successfully as validateWhen condition is false and the reference validation is not applied', function (done) { //sambit

        var cust = {
            'id': 105,
            'name': 'George',
            'dob': '1981-12-25',
            'cityType': 'Urban',
            'age': 35,
            'accNo': 2001
        };

        parentModel.create(cust, defaultContext, function (err, results) {
            expect(err).to.be.null;
            done();
        });

    });

    it('Validation Test - Should fail to insert data as validateWhen condition is true and the reference validation is applied', function (done) { //sambit

        var cust = {
            'id': 106,
            'name': 'Bill',
            'dob': '1973-11-03',
            'cityType': 'Urban',
            'age': 43,
            'accNo': 2002,
            'state': 'CALIFORNIA'
        };

        parentModel.create(cust, defaultContext, function (err, results) {
            expect(err).not.to.be.null;
            done();
        });
    });

    it('Validation Test - Should insert data successfully', function (done) {

        var data = {
            'state': 'WASHINGTON',
            'zipcode': '123456'
        };
        addressModel.create(data, defaultContext, function (err, results) {
            expect(err).to.be.null;
            done();
        });
    });

    it('Validation Test - Should fail to insert data successfully', function (done) {

        var data = {
            'state': 'WASHINGTON'
        };
        addressModel.create(data, defaultContext, function (err, results) {
            expect(err).not.to.be.undefined;
            done();
        });
    });
    it('Validation Test - Should insert data successfully', function (done) {

        var data = {
            'state': 'CALIFORNIA'
        };
        addressModel.create(data, defaultContext, function (err, results) {
            expect(err).to.be.null;
            done();
        });
    });

});
