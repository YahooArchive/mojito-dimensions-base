/*jslint node: true, nomen: true, indent: 4, regexp: true */
/*global unescape */

'use strict';

// simple middleware to modify context
module.exports = function (midConfig) {

    return function (req, res, next) {
        var Y = midConfig.Y,
            liburl = require('url'),
            url,
            key,
            value,
            pair;

        req.context = req.context || {};
        url = liburl.parse(req.url, true);
        if (url.query['.buckets']) {
            pair = url.query['.buckets'].split(':');
            key = 'experiment_' + pair[0];
            value = pair[1];
            req.context[key.toLowerCase()] = value;
        }
        next();
    };
};