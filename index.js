/*jslint node: true */

'use strict';

module.exports = function (args, flags) {

    var request     = require('request'),
        querystring = require('querystring'),
        jpath       = require('json-path'),
        async       = require('async'),
        _           = require('lodash'),
        logger      = require('log4js').getLogger(),
        csv         = require('fast-csv'),
        fs          = require('fs');

    var issn        = flags.issn || '03050548',
        // baseUrl     = 'http://localhost:3333/scopus.json',
        baseUrl     = 'http://api.elsevier.com/content/search/scopus',
        apikey      = '367dbcf2cd392da37e0e52966f982b77',
        pageSize    = flags.pageSize || 100,
        query       = 'issn(' + issn + ')',
        totalPath   = '#/search-results/opensearch:totalResults',
        entryPath   = '..#/search-results/entry[*][take(title=/dc:title,issn=/prism:issn,date=/prism:coverDate,/authkeywords,url=/link)][@scopusHref]',
        filename    = issn + '.csv',
        params      = {
            count: pageSize,
            query: query,
            apikey: apikey,
            view: 'COMPLETE',
            date: '2010-2016'
        },
        url         = [baseUrl, querystring.stringify(params)].join('?');

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

    var udf = {
        scopusHref: function (obj, accum) {
            var url = '';
            _.some(obj.url, function (ele) {
                if (ele['@ref'] === 'scopus') {
                    url = ele['@href'];
                    return true;
                }
                return false;
            });
            obj.url = url;

            accum.push(obj);
            return accum;
        }
    };

    // prepare stream for write csv
    if (fs.existsSync(filename)) {
        fs.unlinkSync(filename);
    }
    var csvStream = csv.createWriteStream({ headers: true, quoteColumns: true }),
        writableStream = fs.createWriteStream(filename, { flags:'a', encoding: 'utf8' });
    csvStream.pipe(writableStream);

    writableStream.on('finish', function () {
        logger.info('completed writing ' + filename);
    });

    // task queue
    var q = async.queue(function (task, callback) {

        _.each(task.entries, function (entry) {
            csvStream.write(entry);
        });

        logger.info('wrote ' + task.entries.length + ' records.');
        callback();
    }, 1);

    // request API
    requestAPI(url, function (err, data) {

        var total = parseInt(jpath.resolve(data, totalPath)[0], 10),
            entries = jpath.resolve(data, entryPath, udf),
            tasks = [], i;

        // first page
        q.push({ entries: entries });

        // navigate pages
        for (i = pageSize; i < total; i += pageSize) {
            tasks.push((function (start) {
                return function (callback) {
                    var params = {
                            count: pageSize,
                            query: query,
                            start: start,
                            apikey: apikey,
                            view: 'COMPLETE',
                            date: '2010-2016'
                        },
                        url = [baseUrl, querystring.stringify(params)].join('?');

                    requestAPI(url, function (err, data) {
                        var entries = jpath.resolve(data, entryPath, udf);
                        q.push({ entries: entries });

                        // wait for some time
                        var delay = Math.floor((Math.random() * 60 + 60) * 1000);
                        logger.info('wait for ' + delay / 1000 + ' seconds');
                        setTimeout(function () { callback(null, entries.length); }, delay);
                    });
                };
            })(i));
        }

        // start tasks and close stream in the end
        async.series(tasks, function () {
            csvStream.end();
        });
    });
};
