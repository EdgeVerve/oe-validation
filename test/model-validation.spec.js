/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */
var chalk = require('chalk');
var bootstrap = require('./bootstrap');
var chai = require('chai');
var expect = chai.expect;
var loopback = require('loopback');
var app = require('oe-cloud');
var models = app.models;
chai.use(require('chai-things'));
var defaults = require('superagent-defaults');
var supertest = require('supertest');
var api = defaults(supertest(app));
var url = '/api';
var defaultContext = {'ctx': {'tenantId': 'default'}};

var starWarsModelName = 'StarWars';
var starTrekModelName = 'StarTrek';
var testUsertoken = '';

describe(chalk.blue('model-validation PropertyLevel Validation test'), function () {
  this.timeout(20000);
  before('wait for boot', function (done) {
    bootstrap.then(() => {
      // debugger
      // create user
      api.post('/api/Users')
        .set('Accept', 'application/json')
        .send({
          'username': 'admin',
          'email': 'admin@ev.com',
          'password': 'admin'
        })
        .end(function (err, res) {
          if (err) {
            done();
          }
          api.post('/api/Users/login')
            .set('Accept', 'application/json')
            .send({
              'username': 'admin',
              'password': 'admin'
            })
            .end(function (err, res) {
              testUsertoken = res.body.id;
              done();
            });
        });
    // login
    })
      .catch(done);
  });
  var starWarsModel;
  var startTrekModel;


  before('Create testuser Accesstoken', function (done) {
    done();
    // var testUser = {
    //   'username': 'testuser',
    //   'password': 'testuser123'
    // };
    // bootstrap.login(testUser, function(returnedAccesstoken) {
    //   testUsertoken = returnedAccesstoken;
    //   done();
    // });
  });

  before('setup test data', function (done) {
    models.ModelDefinition.once('model-' + starWarsModelName + '-available', function () {
      done();
    });

    models.ModelDefinition.create([
      {
        'name': starTrekModelName,
        'base': 'BaseEntity',
        'strict': false,
        'idInjection': true,
        'options': {
          'validateUpsert': true
        },
        'properties': {
          'name': {
            'type': 'string',
            'unique': 'ignoreCase'
          }
        }
      },
      {
        'name': starWarsModelName,
        'base': 'BaseEntity',
        'strict': false,
        'idInjection': true,
        'options': {
          'validateUpsert': true
        },
        'properties': {
          'name': {
            'type': 'string',
            'unique': true,
            'min': 4,
            'max': 7
          },
          'numericField1': {
            'type': 'number',
            'numericality': 'integer'
          },
          'numericField2': {
            'type': 'number',
            'absence': true
          },
          'numericField3': {
            'type': 'number',
            'numericality': 'number',
            'pattern': '^\\d+(\\.\\d{1,2})?$'
          },
          'clan': {
            'type': 'string',
            'required': true,
            'unique': false,
            'absencechar': true
          },
          'country': {
            'type': 'string',
            'notin': ['England'],
            'is': 8
          },
          'gender': {
            'type': 'string',
            'in': ['Male', 'Female'],
            'required': false
          },
          'appearedIn': {
            'type': ['string'],
            'in': [1, 2, 3, 4, 5, 6],
            'required': false
          },
          'shipName': {
            'type': 'string',
            'pattern': '^[A-Za-z0-9-]+$'
          }
        },
        'validations': [],
        'relations': {},
        'acls': [],
        'methods': {}
      }], defaultContext, function (err, model) {
      if (err) {
        console.log(err);
      }
      expect(err).to.be.not.ok;
      starWarsModel = loopback.getModel(starWarsModelName, defaultContext);
      starTrekModel = loopback.getModel(starTrekModelName, defaultContext);
      done();
    });
  });


  after('destroy test models', function (done) {
    models.ModelDefinition.destroyAll({
      name: starWarsModelName
    }, defaultContext, function (err, d) {
      if (err) {
        console.log('Error - not able to delete modelDefinition entry for mysettings');
        return done();
      }
      models.ModelDefinition.destroyAll({
        name: starTrekModelName
      }, defaultContext, function (err, d) {
        if (err) {
          console.log('Error - not able to delete modelDefinition entry for mysettings');
          return done();
        }
        starWarsModel.destroyAll({}, defaultContext, function () {
          starTrekModel.destroyAll({}, defaultContext, function () {
            done();
          });
        });
      });
    });
  });

  it('Validation Test - Should insert data successfully', function (done) {
    var data = {
      'name': 'Anakin',
      'numericField1': 10,
      'gender': 'Male',
      'country': 'Tatooine',
      'clan': 'Jedi',
      'shipName': 'Delta-7B'
    };
    starWarsModel.create(data, defaultContext, function (err, results) {
      expect(err).to.be.null;
      done();
    });
  });

  it('Validation Test - Should fail because name is not unique', function (done) {
    var data = {
      'name': 'Vader',
      'clan': 'Sith'
    };
    starWarsModel.create(data, defaultContext, function (err, results) {
      expect(err).to.be.null;
      starWarsModel.create(data, defaultContext, function (err, results) {
        expect(err).not.to.be.null;
        done();
      });
    });
  });

  it('Validation Test - Should insert  data sucessfully as name is unique w.r.t scope', function (done) {
    var data1 = {
      'name': 'Snoke',
      'clan': 'Sith',
      'scope': {
        'ship': 'Nebulon Ranger'
      }
    };
    var data2 = {
      'name': 'Snoke',
      'clan': 'Sith',
      'scope': {
        'ship': 'Shieldship'
      }
    };
    starWarsModel.create(data1, defaultContext, function (err, results) {
      expect(err).to.be.null;
      starWarsModel.create(data2, defaultContext, function (err, results) {
        expect(err).to.be.null;
        done();
      });
    });
  });

  it('Validation Test - Should fail because pattern for shipName is not proper', function (done) {
    var data = {
      'name': 'Anakin',
      'numericField1': 12,
      'gender': 'Male',
      'country': 'Tatooine',
      'clan': 'Jedi',
      'shipName': 'Delta-7B#'
    };
    starWarsModel.create(data, defaultContext, function (err, results) {
      expect(err).not.to.be.undefined;
      done();
    });
  });

  it('Validation Test - Should fail because min length of name is 4', function (done) {
    var data = {
      'name': '3PO',
      'numericField1': 12,
      'gender': 'Male',
      'country': 'Tatooine',
      'clan': 'Jedi'
    };
    starWarsModel.create(data, defaultContext, function (err, results) {
      expect(err).not.to.be.undefined;
      done();
    });
  });

  it('Validation Test - Should fail because max length of name is 7', function (done) {
    var data = {
      'name': 'ObiWanKenobi',
      'numericField1': 12,
      'gender': 'Male',
      'country': 'Tatooine',
      'clan': 'Jedi'
    };
    starWarsModel.create(data, defaultContext, function (err, results) {
      expect(err).not.to.be.null;
      done();
    });
  });

  it('Validation Test - Should fail because presence of clan is mandatory', function (done) {
    var data = {
      'name': 'HanSolo',
      'numericField1': 12,
      'country': 'Tatooine',
      'gender': 'Male'
    };
    starWarsModel.create(data, defaultContext, function (err, results) {
      expect(err).not.to.be.null;
      done();
    });
  });

  it('Validation Test - Should fail because clan can have only alphabets as absencechar validation is applicable for it', function (done) {
    var data = {
      'name': 'HanSolo',
      'numericField1': 12,
      'country': 'Tatooine',
      'gender': 'Male',
      'clan': 'Jedi1'
    };
    starWarsModel.create(data, defaultContext, function (err, results) {
      expect(err).not.to.be.null;
      done();
    });
  });

  it('Validation Test - Should fail because gender value is out of list', function (done) {
    var data = {
      'name': 'Doku',
      'numericField1': 10,
      'gender': 'Man',
      'country': 'Tatooine',
      'clan': 'Sith'
    };
    starWarsModel.create(data, defaultContext, function (err, results) {
      expect(err).not.to.be.undefined;
      done();
    });
  });

  it('Validation Test - Should fail because appearedIn array values are out of list', function (done) {
    var data = {
      'name': 'Doku',
      'numericField1': 10,
      'gender': 'Male',
      'appearedIn': [1, 8],
      'country': 'Tatooine',
      'clan': 'Sith'
    };
    starWarsModel.create(data, defaultContext, function (err, results) {
      expect(err).not.to.be.undefined;
      done();
    });
  });

  it('Validation Test - Should pass because appearedIn array values within allowed list', function (done) {
    var data = {
      'name': 'Doku',
      'numericField1': 10,
      'gender': 'Male',
      'appearedIn': [2, 4],
      'country': 'Tatooine',
      'clan': 'Sith'
    };
    starWarsModel.create(data, defaultContext, function (err, results) {
      expect(err).not.to.be.undefined;
      done();
    });
  });

  it('Validation Test - Should fail because country value is from the exclusion list', function (done) {
    var data = {
      'name': 'Leia',
      'numericField1': 10,
      'gender': 'Female',
      'country': 'England',
      'clan': 'Jedi'
    };
    starWarsModel.create(data, defaultContext, function (err, results) {
      expect(err).not.to.be.undefined;
      done();
    });
  });

  it('Validation Test - Should fail because length of country is not 8', function (done) {
    var data = {
      'name': 'Luke',
      'numericField1': 10,
      'gender': 'Male',
      'country': 'Australia',
      'clan': 'Jedi'
    };
    starWarsModel.create(data, defaultContext, function (err, results) {
      expect(err).not.to.be.undefined;
      done();
    });
  });

  it('Validation Test - Should fail because numericField2 should be absent', function (done) {
    var data = {
      'name': 'Amidala',
      'numericField1': 10,
      'numericField2': 12,
      'gender': 'Female',
      'country': 'Tatooine',
      'clan': 'Jedi'
    };
    starWarsModel.create(data, defaultContext, function (err, results) {
      expect(err).not.to.be.undefined;
      done();
    });
  });

  it('Validation Test - Should fail because numericField1 should be integer and input data is decimal number', function (done) {
    var data = {
      'name': 'YODA',
      'numericField1': 10.5,
      'gender': 'Male',
      'country': 'Tatooine',
      'clan': 'Jedi'
    };
    starWarsModel.create(data, defaultContext, function (err, results) {
      expect(err).not.to.be.undefined;
      done();
    });
  });

  it('Validation Test - Should fail because numericField1 should be integer and input data is NaN', function (done) {
    var data = {
      'name': 'YODA',
      'numericField1': '10a',
      'gender': 'Male',
      'country': 'Tatooine',
      'clan': 'Jedi'
    };
    starWarsModel.create(data, defaultContext, function (err, results) {
      expect(err).not.to.be.null;
      done();
    });
  });

  it('Validation Test - Should fail because numericField3 pattern rule is violated', function (done) {
    var data = {
      'numericField3': 12.345,
      'clan': 'Jedi'
    };
    starWarsModel.create(data, defaultContext, function (err, results) {
      expect(err).not.to.be.null;
      done();
    });
  });

  it('Validation Test - Should fail because numericField3 should be number', function (done) {
    var data = {
      'numericField3': '12a',
      'clan': 'Jedi'
    };
    starWarsModel.create(data, defaultContext, function (err, results) {
      expect(err).not.to.be.null;
      done();
    });
  });

  it('Validation Test - Should Fail to insert data by POST', function (done) {
    var URL = url + '/StarWars' + '?access_token=' + testUsertoken;

    var postData = {
      'clan': 'Jedi123'
    };

    api.post(URL)
      .set('Accept', 'application/json')
      .send(postData)
      .expect(422).end(function (err, resp) {
        if (err) {
          throw new Error(err);
        } else {
          var error = JSON.parse(resp.text).error;
          expect(error).not.to.be.null;
          done();
        }
      });
  });

  it('Validation Test Unique Case insensitive- Should insert data successfully', function (done) {
    var data = {
      'name': 'Spock'
    };
    starTrekModel.create(data, defaultContext, function (err, results) {
      expect(err).to.be.null;
      done();
    });
  });

  it('Validation Test Unique Case insensitive- Should fail with duplicate case insensitive data ', function (done) {
    var data1 = {
      'name': 'spock'
    };
    var data2 = {
      'name': 'SPOCK'
    };
    var data3 = {
      'name': 'spOck'
    };
    starTrekModel.create(data1, defaultContext, function (err, results) {
      expect(err).not.to.be.null;
      starTrekModel.create(data2, defaultContext, function (err, results) {
        expect(err).not.to.be.null;
        starTrekModel.create(data3, defaultContext, function (err, results) {
          expect(err).not.to.be.null;
          done();
        });
      });
    });
  });
});
