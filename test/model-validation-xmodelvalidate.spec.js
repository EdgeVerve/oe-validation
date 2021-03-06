/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */
/**
* This test is for the xmodelvalidate cross-model reference check validation.
* The current test creates two models - Invitee and Guest.
* The premise is that without any relations between these models,
* one should be able to declare a reference from Guest to Invitee.
* This is done by declaring the Guest.guestName to be "xmodelvalidate"d
* against Invitee.inviteeName. A few Invitees are added and a couple of
* Guests are created, one is in the Invitee list and one is not.
* The xmodelvalidate is expected to catch the uninvited Guest :)
*
* @author Ajith Vasudevan
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


describe(chalk.blue('X-Model-Validation test'), function () {
  this.timeout(20000);
  before('wait for boot', function (done) {
    bootstrap.then(() => {
      // debugger
      done();
    })
      .catch(done);
  });

  before('setup test data', function (done) {
    // Create the Invitee Model
    models.ModelDefinition.create({
      'name': 'Invitee',
      'base': 'BaseEntity',
      'properties': {
        'inviteeName': 'string'
      }
    }, defaultContext, function (err, model) {
      if (err) {
        console.log(err);
      } else {
        // Create the Guest model if Invitee creation is successful
        models.ModelDefinition.create({
          'name': 'Guest',
          'base': 'BaseEntity',
          'properties': {
            'guestName': {
              'type': 'string',
              'xmodelvalidate': { 'model': 'Invitee', 'field': 'inviteeName' }
            }
          }
        }, defaultContext, function (err, model) {
          expect(err).to.be.not.ok;
          var referredModel = loopback.getModel('Invitee', defaultContext);

          // Invitees
          var data = [{ 'inviteeName': 'Ajith' },
            { 'inviteeName': 'Rama' },
            { 'inviteeName': 'Anirudh' }];

          referredModel.create(data, defaultContext, function (err, results) {
            expect(err).to.be.null;
            done();
          });
        });
      }
      expect(err).to.be.not.ok;
    });
  });

  it('X-Model-Validation Test - Should succeed', function (done) {
    var mainModel = loopback.getModel('Guest', defaultContext);
    var data = [{ 'guestName': 'Ajith' }, { 'guestName': 'Mohan' }];
    mainModel.create(data, defaultContext, function (err, results) {
      expect(err[0]).to.be.undefined;
      expect(err[1]).not.to.be.undefined;
      done();
    });
  });
});
