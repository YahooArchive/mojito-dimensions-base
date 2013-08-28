/*
 * Copyright (c) 2013, Yahoo! Inc. All rights reserved.
 * Copyrights licensed under the New BSD License.
 * See the accompanying LICENSE file for terms.
 */

/*jslint node: true, nomen: true, indent: 4, forin: true, stupid: true */
/*global YUI, YUITest */

YUI.add('addon-rs-super-bundle-tests', function (Y, NAME) {
    'use strict';

    var libfs = require('fs'),
        libpath = require('path'),
        A = YUITest.Assert,
        AA = YUITest.ArrayAssert,
        OA = YUITest.ObjectAssert,
        suite,

        superBundleDim = 'experiment_ad',
        superBundleName = 'test-dimensions-' + superBundleDim,
        superBundlePath = libpath.join(__dirname, 'fixtures', superBundleName),

        store,

        moduleName = 'addon-rs-super-bundle',

        pkgInfo = {
            "depth": 1,
            "parents": [
                "test-app"
            ],
            "dir": superBundlePath,
            "pkg": JSON.parse(libfs.readFileSync(libpath.join(superBundlePath, 'package.json')))
        },

        type = 'asset',
        subtype = 'css',
        mojitType = 'TestMojit',

        source = {
            "fs": {
                "fullPath": libpath.join(superBundlePath, "blue/mojits/TestMojit/assets/testMojit-base.css"),
                "rootDir": libpath.join(superBundlePath, "blue/mojits/TestMojit"),
                "rootType": "mojit",
                "subDir": ".",
                "subDirArray": [],
                "isFile": true,
                "ext": ".css",
                "basename": "testMojit-base"
            },
            "pkg": {
                "name": superBundleName,
                "version": "0.0.1",
                "depth": 1,
                "type": "super-bundle",
                "bundleName": "blue"
            }
        },

        dimensions = ['blue', 'blue_1', 'blue_2'],

        modules = {};

    modules[moduleName] = {
        requires: ['plugin', 'oop'],
        fullpath: libpath.join(__dirname, '../addons/rs/super-bundle.server.js')
    };

    Y.applyConfig({
        modules: modules
    });

    Y.use(moduleName);

    /**
     * Mocked resource store
     */
    function MockRS(config) {
        MockRS.superclass.constructor.apply(this, arguments);
    }

    MockRS.NAME = 'MockResourceStore';
    MockRS.ATTRS = {};

    Y.extend(MockRS, Y.Base, {

        initializer: function (cfg) {
            this._packagesVisited = {};
            this._dirBundlesLoaded = {};
            this._validateContextCache = {
                '{"validCache":"foo"}': 'VALID',
                '{"invalidCache":"foo"}': 'INVALID cached context'
            };
            this._validDims = {
                lang: { 'es-MX': true },
                device: { iphone: true }
            };
            this._validDims[superBundleDim] = true;
        },

        _preloadPackage: function (info) {
            //to be tested on addon (plugin)
        },

        _preloadDirBundle: function (path, pkg) {
            this._dirBundlesLoaded[path] = pkg;
        },

        preloadResourceVersions: function () {
            // this should trigger RSAddonSuperBundle.hookConfigPlugin though AOP
        },

        getStaticAppConfig: function () {
            return {
                env: {},
                staticHandling: {
                    prefix: "test_static_prefix"
                }
            };
        },

        parseResourceVersion: function (source, type, subtype, mojitType, selector) {
            return {
                mojit: mojitType,
                selector: selector || "*"
            };
        },

        validateContext: function () {
            // this should trigger RSAddonSuperBundle.hookConfigPlugin though AOP
        },

        addResourceVersion: function (res) {
            //to be tested on addon (plugin)
        }
    });

    /**
     * Mocked addon-rs-config
     */
    function MockConfigAddon(config) {
        MockRS.superclass.constructor.apply(this, arguments);
    }

    MockConfigAddon.NAME = 'MockConfigAddon';
    MockConfigAddon.NS = 'config';
    MockConfigAddon.ATTRS = {};

    Y.extend(MockConfigAddon, Y.Base, {

        initializer: function (cfg) {
            this._ycbDims = [{
                dimensions: []
            }];
            this._ycbAppConfig = {};
        },

        getDimensions: function () {
            return this._ycbDims;
        },

        getAppConfigYCB: function () {
            return {};
        },

        readConfigYCB: function () {
            return {
                applicationConfigFiles: [
                    "/foo/bar"
                ]
            };
        },

        createMultipartYCB: function (paths) {
            return paths;
        }
    });

    /**
     * Test suite
     */
    suite = new YUITest.TestSuite({

        name: NAME,

        setUp: function () {
            store = new MockRS({ root: superBundlePath });
            // Plug in mocked config addon
            store.plug(MockConfigAddon, { appRoot: superBundlePath, mojitoRoot: '' });
            // Plug in super-bundle addon
            store.plug(Y.mojito.addons.rs.dimensions, { appRoot: superBundlePath, mojitoRoot: '' });
            // trigger Config plugin hook
            store.preloadResourceVersions();
        },

        tearDown: function () {
            store = null;
        }
    });

    /**
     * Tests
     */
    suite.add(new YUITest.TestCase({

        name: 'unit tests',

        _should: {
            error: {
                'validateContext with invalid dimension should fail': 'INVALID dimension key "experiment_foo"',
                'validateContext with invalid dimension value should fail': 'INVALID dimension value "invalid" for key "device"',
                'validateContext with invalid lang value should fail': 'INVALID dimension value "invalid" for key "lang"',
                'validateContext with invalid cached value should fail': 'INVALID cached context'
            }
        },

        'test preloadPackage': function () {
            store._preloadPackage(pkgInfo);
            OA.ownsKey(pkgInfo.pkg.name, store._packagesVisited, 'Packages visited');
            A.areEqual(pkgInfo.dir, store._packagesVisited[pkgInfo.pkg.name], 'Package dir');

            dimensions.forEach(function (name) {
                var path = libpath.join(superBundlePath, name);
                OA.ownsKey(path, store._dirBundlesLoaded, 'Bundle loaded');
                A.areEqual(name, store._dirBundlesLoaded[path].bundleName, 'Bundle name');
            });
        },

        'test parseResourceVersion': function () {
            var res = store.parseResourceVersion(source, type, subtype, mojitType);

            A.areEqual(source.pkg.bundleName, res.selector, "Dynamic selector");
            A.areEqual("/test_static_prefix/TestMojit/assets/testMojit-base.blue.css",
                res.url, "Resource static url");
        },

        'test parseResourceVersion with composite selector': function () {
            var testSelector = 'TEST',
                expectedSelector = source.pkg.bundleName + '_' + testSelector,
                res = store.parseResourceVersion(source, type, subtype, mojitType, testSelector);

            A.areEqual(expectedSelector, res.selector, "Dynamic selector");
            A.areEqual("/test_static_prefix/TestMojit/assets/testMojit-base.blue.css",
                res.url, "Resource static url");
        },

        'test parseResourceVersion with existing selector': function () {
            var res;

            source.fs.fullPath = source.fs.fullPath.replace('.css', '.iphone.css');
            res = store.parseResourceVersion(source, type, subtype, mojitType);

            A.areEqual(source.pkg.bundleName, res.selector, "Dynamic selector");
            A.areEqual("/test_static_prefix/TestMojit/assets/testMojit-base.iphone.blue.css",
                res.url, "Resource static url");
        },

        'test parseResourceVersion with exising composite selector': function () {
            var testSelector = 'TEST',
                expectedSelector = source.pkg.bundleName + '_' + testSelector,
                res = store.parseResourceVersion(source, type, subtype, mojitType, testSelector);

            A.areEqual(expectedSelector, res.selector, "Dynamic selector");
            A.areEqual("/test_static_prefix/TestMojit/assets/testMojit-base.iphone.blue.css",
                res.url, "Resource static url");
        },

        'test parseResourceVersion with non asset resource': function () {
            var res = store.parseResourceVersion(source, 'binder', '', 'Foo');
            A.isUndefined(res.url, 'res.url');
        },

        'test hookConfigPlugin': function () {
            A.isObject(store.config);
        },

        'test config plugin getDimensions': function () {
            var res = store.config.getDimensions(),
                dims,
                ad;

            dims = res[0].dimensions[0];
            A.isNotNull(dims);

            ad = dims.experiment_ad;
            A.isNotNull(ad);
            OA.ownsKeys(dimensions, ad, 'Dimensions');
        },

        'test config plugin getAppConfigYCB': function () {
            var res = store.config.getAppConfigYCB(),
                expectedPaths = [libpath.join(superBundlePath, 'application.yaml')];

            dimensions.forEach(function (dim) {
                expectedPaths.push(libpath.join(superBundlePath, dim, 'application.yaml'));
            });
            AA.containsItems(expectedPaths, res, 'Partial application.yaml config paths');
            AA.containsItems(expectedPaths, store.config._ycbAppConfig, 'Config plugin _ycbAppConfig');
        },

        'validateContext with invalid dimension should fail': function () {
            var invalidCtx = { experiment_foo: 'BAR'};
            store.validateContext(invalidCtx);
        },

        'validateContext with invalid lang value should fail': function () {
            var ctx = { lang: 'invalid' };
            store.validateContext(ctx);
        },

        'validateContext with invalid dimension value should fail': function () {
            var ctx = { device: 'invalid' };
            store.validateContext(ctx);
        },

        'test validateContext with invalid experiment value': function () {
            var ctx = {
                    experiment_ad: 'invalid',
                    lang: 'es-MX',
                    langs: 'foo'
                },

                orig = Y.log,
                actual;

            Y.log = function (msg, level, name) {
                actual = {
                    msg: msg,
                    level: level,
                    name: name
                };
            };

            store.validateContext(ctx);
            Y.log = orig;

            A.areEqual('INVALID dimension value "invalid" for key "experiment_ad"', actual.msg, 'error msg');
            A.areEqual('error', actual.level, 'error level');
            A.areEqual(moduleName, actual.name, 'error module name');
        },

        'test validateContext with cached value': function () {
            var ctx = { validCache: 'foo' };
            store.validateContext(ctx);
            A.isTrue(true, 'No error thrown');
        },

        'validateContext with invalid cached value should fail': function () {
            var ctx = { invalidCache: 'foo' };
            store.validateContext(ctx);
        },

        'test addResourceVersion with super bundle': function () {
            var res = {
                type: 'mojit',
                source: {
                    pkg: {
                        type: 'super-bundle',
                        bundleName: 'blue_1'
                    }
                }
            };
            store.addResourceVersion(res);
            A.areEqual(res.source.pkg.bundleName, res.selector, 'Resource selector');
        },

        'test addResourceVersion with regular pkg': function () {
            var res = {
                type: 'mojit',
                selector: 'foo',
                source: {
                    pkg: {
                        type: 'bundle'
                    }
                }
            };
            store.addResourceVersion(res);
            A.areEqual('foo', res.selector, 'Resource selector');
        }
    }));

    YUITest.TestRunner.add(suite);

}, '1.0.0', {
    requires: [
        'base',
        'oop'
    ]
});
