/*!
 * Copyright (c) 2015-2016, Okta, Inc. and/or its affiliates. All rights reserved.
 * The Okta software accompanied by this notice is provided pursuant to the Apache License, Version 2.0 (the "License.")
 *
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0.
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *
 * See the License for the specific language governing permissions and limitations under the License.
 */

define([
  'okta',
  'util/FormController',
  'util/FormType',
  'util/webauthn',
  'views/shared/FooterSignout',
  'views/mfa-verify/WindowsHelloErrorMessageView'
],
function (Okta, FormController, FormType, webauthn, FooterSignout, WindowsHelloErrorMessageView) {

  var _ = Okta._;

  return FormController.extend({
    className: 'verify-windows-hello',
    Model: {
      save: function () {
        if (!webauthn.isAvailable()) {
          return;
        }

        this.trigger('request');
        var model = this;

        return this.doTransaction(function (transaction) {
          var factor = _.findWhere(transaction.factors, {
            factorType: 'webauthn',
            provider: 'FIDO'
          });

          return factor.verify()
          .then(function (transaction) {
            var factorData = transaction.factor;

            return webauthn.getAssertion(
              factorData.challenge.nonce,
              [{ id: factorData.profile.credentialId }]
            )
            .then(function (assertion) {
              model.trigger('sync');
              return factor.verify({
                authenticatorData: assertion.authenticatorData,
                clientData: assertion.clientData,
                signatureData: assertion.signature
              });
            });
          });
        });
      }
    },

    Form: {
      autoSave: true,
      title: _.partial(Okta.loc, 'factor.windowsHello', 'login'),
      subtitle: function () {
        return webauthn.isAvailable() ? Okta.loc('verify.windowsHello.subtitle', 'login') : '';
      },
      save: _.partial(Okta.loc, 'verify.windowsHello.save', 'login'),

      modelEvents: function () {
        if (!webauthn.isAvailable()) {
          return {};
        }

        return {
          'request': '_startEnrollment',
          'error': '_stopEnrollment',
          'sync': '_successEnrollment'
        };
      },

      noButtonBar: function () {
        return !webauthn.isAvailable();
      },

      formChildren: function () {
        var result = [];
        if (!webauthn.isAvailable()) {
          result.push(
            FormType.View(
              { View: WindowsHelloErrorMessageView },
              { selector: '.o-form-error-container' }
            )
          );
        }
        return result;
      },

      _startEnrollment: function () {
        this.subtitle = Okta.loc('verify.windowsHello.subtitle.loading', 'login');
        this.render();
      },

      _stopEnrollment: function () {
        this.subtitle = Okta.loc('verify.windowsHello.subtitle', 'login');
        this.render();
      },

      _successEnrollment: function () {
        this.subtitle = Okta.loc('verify.windowsHello.subtitle.signingIn', 'login');
        this.render();
      }
    },

    Footer: FooterSignout
  });

});
