/*jslint nomen:true, node:true*/
console.log("Creating app!!!!!");
var express = require('express'),
    libmojito = require('mojito'),
    libs = {
        os: require('os'),
        fs: require('fs'),
        dns: require('dns'),
        http: require('http'),
        express: require('express'),
        mojito: require('mojito'),
        path: require('path')
    },

    middleware = ['./middleware_contextualizer.js'],

    app = express();

// Set the port to listen on.
app.set('port', process.env.PORT || 80);

// Create a new Mojito instance and attach it to `app`.
// Options can be passed to `extend`.
libmojito.extend(app, {
    context: {
        environment: "development"
    },
    root: libs.path.join(process.cwd(), '/example-app')
});

// Load the built-in middleware or any middleware
// configuration specified in application.json
app.use(libmojito.middleware());

middleware.forEach(function (midName) {
    "use strict";
    var mid,
        midConfig = {
            Y: app.mojito.Y,
            store: app.mojito.store,
            logger: {
                log: app.mojito.Y.log
            },
            context: app.mojito.context
        };

    if (libs.mojito.middleware[midName]) {
        mid = libs.mojito.middleware[midName];
    } else {
        mid = require(midName);
    }

    app.use(mid(midConfig));
});

// Load routes configuration from routes.json
app.mojito.attachRoutes();

// Allow anonymyous mojit instances w/ actions to be dispatched
app.get('/:mojit/:action', libmojito.dispatch("{mojit}.{action}"));
// app.get('/', libmojito.dispatch('foo.index'));
// app.listen(app.get('port'), function () {
//     console.log('Server listening on port ' + app.get('port') + ' ' +
//                    'in ' + app.get('env') + ' mode');
// });

module.exports = app;