/*jslint node: true */

'use strict';

module.exports = function (args, flags) {

    var request     = require('request'),
        querystring = require('querystring'),
        logger      = require('log4js').getLogger();

    var apikey       = '367dbcf2cd392da37e0e52966f982b77',
        authBaseUrl  = 'http://api.elsevier.com/authenticate',
        authParams   = {
            apikey: apikey
        },
        authUrl      = [ authBaseUrl, querystring.stringify(authParams) ].join('?'),
        authInterval = 600000;

    function requestAPI(url, callback) {
        logger.info('request URL: ' + url);

        request(url, function (error, response, body) {
            if (!error && response.statusCode === 200) {
                var data = JSON.parse(body);
                callback(null, data);
            } else {
                callback(error, null);
            }
        });
    }

    function requstAuthAPI() {
        requestAPI(authUrl, function (err, data) {
            logger.info(data);

            // keep authenticated
            setTimeout(requstAuthAPI, authInterval);
        });
    }

    requstAuthAPI();
};
