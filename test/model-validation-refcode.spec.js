/**
 * 
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
var chai = require('chai');
var chalk = require('chalk');
var bootstrap = require('./bootstrap');
var expect = chai.expect;
var loopback = require('loopback');
var app = require('oe-cloud');
var models = app.models;
chai.use(require('chai-things'));
var defaultContext = {"ctx":{"tenantId":"default"}};

describe(chalk.blue('RefCode Validation test'), function() {
    this.timeout(20000);
    before('wait for boot', function(done){
        bootstrap.then(() => {
        // debugger
        done();
        })
        .catch(done)
    });
    var cType;
    var motel;
    var serviceApt;


    before('setup test data', function(done) {
        // models.ModelDefinition.once('model-ServiceApt-available', function() {
        //     return;
        // });

        models.ModelDefinition.create({
            'name': 'CountryType',
            'base': 'RefCodeBase',
            'plural': 'CountryTypes',
            'strict': false,
            'idInjection': true,
            'options': {
                'validateUpsert': true
            },
            'properties': {},
            'validations': [],
            'relations': {},
            'acls': [],
            'methods': {}
        }, defaultContext, function(err, model) {
            if (err) {
                console.log(err);
            } else {
                models.ModelDefinition.create({
                    'name': 'Motel',
                    'base': 'BaseEntity',
                    'plural': 'Motels',
                    'strict': false,
                    'idInjection': true,
                    'options': {
                        'validateUpsert': true
                    },
                    'properties': {
                        'name': {
                            'type': 'string',
                            'required': true
                        },
                        'countryIn': {
                            'type': 'array',
                            "refcodetype": "CountryType"
                        }
                    },
                    'validations': [],
                    'relations': {},
                    'acls': [],
                    'methods': {}
                }, defaultContext, function(err, model) {
                    if (err) {
                        console.log(err);
                    } else {
                        models.ModelDefinition.create({
                            'name': 'ServiceApt',
                            'base': 'BaseEntity',
                            'plural': 'ServiceApts',
                            'strict': false,
                            'idInjection': true,
                            'options': {
                                'validateUpsert': true
                            },
                            'properties': {
                                'name': {
                                    'type': 'string'
                                },
                                'countryIn': {
                                    'type': 'string',
                                    'refcodetype': 'CountryType'
                                }
                            },
                            'validations': [],
                            'relations': {},
                            'acls': [],
                            'methods': {}
                        }, defaultContext, function(err, model) {
                            if (err) {
                                console.log(err);
                            }
                            cType = loopback.getModel('CountryType', defaultContext);
                            motel = loopback.getModel('Motel', defaultContext);
                            serviceApt = loopback.getModel('ServiceApt', defaultContext);
                            var data = [{
                                    'code': 'IN',
                                    'description': 'India'
                                },
                                {
                                    'code': 'US',
                                    'description': 'USA'
                                },
                                {
                                    'code': 'UK',
                                    'description': 'United Kingdom'
                                },
                                {
                                    'code': 'CA',
                                    'description': 'Canada'
                                },
                                {
                                    'code': 'DE',
                                    'description': 'Germany'
                                },
                                {
                                    'code': 'AU',
                                    'description': 'Australia'
                                }
                            ];
                            cType.create(data, defaultContext, function(err, results) {
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

    after('destroy test models', function(done) {
        models.ModelDefinition.destroyAll({
            name: 'CountryType'
        }, defaultContext, function(err, d) {
            if (err) {
                console.log('Error - not able to delete modelDefinition entry for CountryType');
            }
            cType.destroyAll({}, defaultContext, function() {
                models.ModelDefinition.destroyAll({
                    name: 'Motel'
                }, defaultContext, function(err, d) {
                    if (err) {
                        console.log('Error - not able to delete modelDefinition entry for motel');
                    }
                    motel.destroyAll({}, defaultContext, function() {
                        models.ModelDefinition.destroyAll({
                            name: 'ServiceApt'
                        }, defaultContext, function(err, d) {
                            if (err) {
                                console.log('Error - not able to delete modelDefinition entry for ServiceApt');
                            }
                            serviceApt.destroyAll({}, defaultContext, function() {
                                done();
                            });
                        });
                    });
                })
            });
        });
    });


    afterEach('destroy execution context', function(done) {
        done();
    });

    it('refcode Test - Should insert data with array ref code successfully', function(done) {
        var data = {
            'name': 'Holiday Inn',
            'countryIn': ["IN", "US", "UK"]
        };
        motel.create(data, defaultContext, function(err, results) {
            expect(err).to.be.null;
            done();
        });
    });

    it('Refcode Test - Should insert data with single refcode successfully', function(done) {
        var data = {
            'name': 'Palm Homestay',
            'countryIn': "IN"
        };
        serviceApt.create(data, defaultContext, function(err, results) {
            expect(err).to.be.null;
            done();
        });
    });

    it('refcode Test - Should fail to insert data as array contains invalid ref code', function(done) {
        var data = {
            'name': 'Mariott',
            'countryIn': ['IN', 'US', 'PK']
        };
        motel.create(data, defaultContext, function(err, results) {
            expect(err).not.to.be.null;
            expect(err.toString().indexOf('PK')).to.be.above(-1);
            done();
        });
    });

    it('refcode Test - Should fail to insert data as invalid ref code is given', function(done) {
        var data = {
            'name': 'Mane Homestey',
            'countryIn': 'JP'
        };
        serviceApt.create(data, defaultContext, function(err, results) {
            expect(err).not.to.be.null;
            expect(err.toString().indexOf('JP')).to.be.above(-1);
            done();
        });
    });

    it('refcode Test - Should insert data successfully as no refcode given', function(done) {
        var data = {
            'name': 'Hilton'
        };
        motel.create(data, defaultContext, function(err, results) {
            expect(err).to.be.null;
            done();
        });
    });
});