/*
 * Copyright (c) 2013, Yahoo! Inc. All rights reserved.
 * Copyrights licensed under the New BSD License.
 * See the accompanying LICENSE file for terms.
 */

/*jslint node: true, nomen: true, indent: 4, forin: true, stupid: true */
/*global YUI, YUITest */

YUI.add('addon-rs-super-bundle-functional-tests', function (Y, NAME) {
    'use strict';
    require('colors');
    var lib = {
            path: require('path'),
            fs: require('fs'),
            diff: require('diff')
        },
        A = YUITest.Assert,
        AA = YUITest.ArrayAssert,
        OA = YUITest.ObjectAssert,
        appRoot = '../example-app',
        suite,
        compiler,
        ShakerCompiler = require(appRoot + '/node_modules/mojito-shaker/lib/compiler').ShakerCompiler,
        expectedRoot = lib.path.join(__dirname, 'fixtures', 'expected_markups'),
        actual,
        app,
        specs = {
            base: 'frame'
        },
        MarkupTest = Y.mojito.MarkupTest,
        shakerCompile = function (cb) {
            process.shakerCompiler = true;
            var cwd = process.cwd();

            process.chdir(require('path').join(__dirname, '../example-app'));
            compiler = new ShakerCompiler({
                // experiment_example: "VIEW"
            });

            compiler.compile(function (err) {
                process.shakerCompiler = false;
                cb();
            });
            process.chdir(cwd);
        },
        processHTML = function (s) {
            // Remove YUI ids
            s = s.replace(/( id="yui_[\d_a-zA-Z]+")|(yui_[\d_a-zA-Z]+)/g, '');

            // Remove space between tags
            s = s.replace(/>\s+/g, '>').replace(/\s+</g, '<');

            // Normalize white spaces
            s = s.replace(/\s/g, ' ');

            // Collapse multiple white spaces
            s = s.replace(/\s\s+/gm, ' ');

            return s;
        };

    suite = new YUITest.TestSuite({

        name: NAME,

            setUp: function () {
                app = require(lib.path.join(appRoot, 'app.js'));
            },

            tearDown: function () {
                app = null;
            }
    });

    /**
     * Tests
     */
    suite.add(new YUITest.TestCase({
        name: 'tests VIEW',

        setUp: function(){

        },

        _should: {},

        "testing experiment_example:VIEW": function () {
            var self = this,
                example = "VIEW";
            // have to do it this wany: cant put shaker into setup due to it's async nature...
            shakerCompile(function () {
                MarkupTest.render({
                    app: app,
                    base: 'frame',
                    context: {
                        experiment_example: example
                    },
                    req: {
                        url: "/",
                        context: {
                            experiment_example: example
                        }
                    }
                }, function (err, markup){
                    console.log("Got VIEW markup, size:" + markup.toString().length);
                    lib.fs.readFile(lib.path.join(expectedRoot, example + 'markup.html'), function (err, data){
                        markup = processHTML(markup);
                        try {
                            A.areEqual(data.toString(), markup, 'test VIEW: VIEW markup not equal');
                        } catch (err) {
                            console.log("VIEW failed:\n" + markup);
                        }
                        // var one = processHTML(markup);
                        // var other = processHTML(data.toString());

                        // var thediff = lib.diff.diffChars(one, other);

                        // thediff.forEach(function(part){
                        //   // green for additions, red for deletions
                        //   // grey for common parts
                        //   var color = part.added ? 'green' :
                        //     part.removed ? 'red' : 'grey';
                        //   process.stderr.write(part.value[color]);
                        // });

                        // console.log()

                        // console.log(markup);
                        // console.log(data.toString());
                        self.resume();
                    });
                    // markup = processHTML(markup);
                    // lib.fs.writeFile(lib.path.join(expectedRoot, example + 'markup.html'), markup, function (err){
                    //     if (err) {
                    //         console.log("[functional test]: ERR writing file");
                    //     }
                    //         self.resume();
                    // });
                });
            });
            self.wait(150000);
        },

        "testing experiment_example:VIEW, will choose shallower": function () {
            var self = this,
                example = "VIEW";
            // have to do it this wany: cant put shaker into setup due to it's async nature...
            shakerCompile(function () {
                MarkupTest.render({
                    app: app,
                    base: 'frame',
                    context: {
                        experiment_example: example
                    },
                    req: {
                        url: "/",
                        context: {
                            experiment_example: example
                        }
                    }
                }, function (err, markup){
                    console.log("Got VIEW multi markup, size:" + markup.toString().length);
                    lib.fs.readFile(lib.path.join(expectedRoot, example + 'multimarkup.html'), function (err, data){
                        markup = processHTML(markup);
                        try {
                            A.areEqual(data.toString(), markup, 'test VIEW multi: multi VIEW markup not equal');
                        } catch (err) {
                            console.log("VIEW multi failed:\n" + markup);
                        }
                        // var one = processHTML(markup);
                        // var other = processHTML(data.toString());

                        // var thediff = lib.diff.diffChars(one, other);

                        // thediff.forEach(function(part){
                        //   // green for additions, red for deletions
                        //   // grey for common parts
                        //   var color = part.added ? 'green' :
                        //     part.removed ? 'red' : 'grey';
                        //   process.stderr.write(part.value[color]);
                        // });

                        // console.log()

                        // console.log(markup);
                        // console.log(data.toString());
                        self.resume();
                    });
                    // markup = processHTML(markup);
                    // lib.fs.writeFile(lib.path.join(expectedRoot, example + 'multimarkup.html'), markup, function (err){
                    //     if (err) {
                    //         console.log("[functional test]: ERR writing file");
                    //         console.log(err);
                    //     }
                    //         self.resume();
                    // });
                });
            });
            self.wait(150000);
        },

    }));

    suite.add(new YUITest.TestCase({
        name: 'tests CSS',

        setUp: function () {

        },

        _should: {

        },

         "testing experiment_example:CSS": function () {
            var self = this,
                example = "CSS";
            shakerCompile(function () {
                MarkupTest.render({
                    app: app,
                    base: 'frame',
                    context: {
                        experiment_example: example
                    },
                    req: {
                        url: "/",
                        context: {
                            experiment_example: example
                        }
                    }
                }, function (err, markup){
                    console.log("Got CSS markup, size:" + markup.toString().length);
                    lib.fs.readFile(lib.path.join(expectedRoot, example + 'markup.html'), function (err, data){
                        markup = processHTML(markup);
                        try {
                            A.areEqual(data.toString(), markup, 'test CSS: CSS markup not equal');
                        } catch (err) {
                            console.log("CSS failed:\n" + markup);
                        }
                        self.resume();
                    });
                });
            });
            self.wait(150000);
        },
    }));

    suite.add(new YUITest.TestCase({
        name: 'tests ADDON',

        setUp: function () {

        },

        _should: {

        },

         "testing experiment_example:ADDON": function () {
            //
            var self = this,
                example = "ADDON";
            shakerCompile(function () {
                MarkupTest.render({
                    app: app,
                    base: 'frame',
                    context: {
                        experiment_example: example
                    },
                    req: {
                        url: "/",
                        context: {
                            experiment_example: example
                        }
                    }
                }, function (err, markup){
                    console.log("Got ADDON markup, size:" + markup.toString().length);
                    lib.fs.readFile(lib.path.join(expectedRoot, example + 'markup.html'), function (err, data){
                        markup = processHTML(markup);
                        A.areEqual(data.toString(), markup, 'test experiment ADDON: markup not equal');
                        self.resume();
                    });
                });
            });
            self.wait(150000);
        },
    }));

    suite.add(new YUITest.TestCase({
        name: 'tests CONTROLLER',

        setUp: function () {

        },

        _should: {

        },

         "testing experiment_example:CONTROLLER": function () {
            //
            var self = this,
                example = "CONTROLLER";
            shakerCompile(function () {
                MarkupTest.render({
                    app: app,
                    base: 'frame',
                    context: {
                        experiment_example: example
                    },
                    req: {
                        url: "/",
                        context: {
                            experiment_example: example
                        }
                    }
                }, function (err, markup){
                    console.log("Got CONTROLLER markup, size:" + markup.toString().length);
                    lib.fs.readFile(lib.path.join(expectedRoot, example + 'markup.html'), function (err, data){
                        markup = processHTML(markup);
                        try {
                            A.areEqual(data.toString(), markup, 'test experiment CONTROLLER: markup not equal');
                        } catch (err) {
                            console.log("CONTROLLER failed:\n" + markup);
                        }
                        self.resume();
                    });
                });
            });
            self.wait(150000);
        },
    }));

    suite.add(new YUITest.TestCase({
        name: 'tests BINDER',

        setUp: function () {

        },

        _should: {
            // error: {
            //     'testing experiment_example:BINDER': 'INVALID dimension value "BINDER" for key "experiment_example"',
            // }
        },

         "testing experiment_example:BINDER": function () {
            //
            var self = this,
                example = "BINDER";
            shakerCompile(function () {
                MarkupTest.render({
                    app: app,
                    base: 'frame',
                    context: {
                        experiment_example: example
                    },
                    req: {
                        url: "/",
                        context: {
                            experiment_example: example
                        }
                    }
                }, function (err, markup){
                    console.log("Got BINDER markup, size:" + markup.toString().length);
                    lib.fs.readFile(lib.path.join(expectedRoot, example + 'markup.html'), function (err, data){
                        markup = processHTML(markup);
                        A.areEqual(data.toString(), markup, 'test experiment BINDER: markup not equal');
                        self.resume();
                    });
                });
            });
            self.wait(150000);
        },
    }));

    // suite.add(new YUITest.TestCase({
    //     name: 'tests CONFIG',

    //     setUp: function () {

    //     },

    //     _should: {

    //     },

    //      "testing experiment_example:CONFIG": function () {
    //         //
    //         var self = this,
    //             example = "CSS";
    //         shakerCompile(function () {
    //             MarkupTest.render({
    //                 app: app,
    //                 base: 'frame',
    //                 context: {
    //                     experiment_example: example
    //                 },
    //                 req: {
    //                     url: "/",
    //                     context: {
    //                         experiment_example: example
    //                     }
    //                 }
    //             }, function (err, markup){
    //                 console.log("Got CONFIG markup, size:" + markup.toString().length);
    //                 // lib.fs.readFile(lib.path.join(expectedRoot, example + 'markup.html'), function (err, data){
    //                 //     markup = processHTML(markup);
    //                 //     A.areEqual(data.toString(), markup, 'markup not equal');
    //                 //     self.resume();
    //                 // });
    //                 markup = processHTML(markup);
    //                 lib.fs.writeFile(lib.path.join(expectedRoot, example + 'markup.html'), markup, function (err){
    //                     if (err) {
    //                         console.log("[functional test]: ERR writing file");
    //                         console.log(err);
    //                     }
    //                         self.resume();
    //                 });
    //             });
    //         });
    //         self.wait(150000);
    //     },
    // }));

    YUITest.TestRunner.add(suite);

}, '1.0.0', {
    requires: [
        'mojito-test',
        'mojito-markup-test'
    ]
});

