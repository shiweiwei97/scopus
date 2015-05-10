#!/usr/bin/env node
'use strict';
var meow = require('meow');
var scopus = require('./');
var auth = require('./auth');

var cli = meow({
    help: [
        'Usage',
        '    scopus <input>',
        '',
        'Example',
        '    scopus Unicorn'
    ].join('\n')
}, {
    string: [ "issn" ]
});

if (cli.flags.auth) {
    auth(cli.input, cli.flags);
} else {
    scopus(cli.input, cli.flags);
}
