/*
 * Copyright (c) 2013, Yahoo! Inc. All rights reserved.
 * Copyrights licensed under the New BSD License.
 * See the accompanying LICENSE file for terms.
 */

/*jslint indent: 4, stupid: true, nomen: true */

YUI.add('addon-rs-super-bundle', function (Y, NAME) {
    "use strict";

    var libfs = require('fs'),
        libpath = require('path'),
        liburl = require('url'),

        EXPERIMENT_DIMENSION_PREFIX = 'experiment_',

        configFileOpts = ['application.json', 'application.yaml'],

        // test if the dir is a package (has an application.yaml)
        isBundleDir = function (path, name) {
            var bundleFiles = [],
                i,
                len,
                file;

            if ('.' === name.charAt(0) || !libfs.statSync(path).isDirectory()) {
                return false;
            }
            bundleFiles = libfs.readdirSync(path);
            len = bundleFiles.length;
            for (i = 0; i < len; i += 1) {
                file = bundleFiles[i];
                if (configFileOpts.indexOf(file) !== -1) {
                    return true;
                }
            }
        },

        isExperimentDimension = function (name) {
            return name.indexOf(EXPERIMENT_DIMENSION_PREFIX) === 0;
        },

        resourceDepthAsc = function (a, b) {
            var da = a.source.pkg.depth,
                db = b.source.pkg.depth;
            if (da < db) { return -1; }
            if (da > db) { return 1; }
            return 0;
        },

        dimensions = [],
        appConfigs = [];

    /**
     * Plugin for the mojito config RS addon to dynamically insert configurations and dimensions
     */
    function ConfigPlugin() {
        ConfigPlugin.superclass.constructor.apply(this, arguments);
    }

    ConfigPlugin.NS = 'SuperBundleConfig';
    ConfigPlugin.ATTResourceStore = {};

    Y.extend(ConfigPlugin, Y.Plugin.Base, {

        initializer: function (config) {
            // the original mojito config rs addon
            this.host = config.host;
            this.appRoot = config.appRoot;
            this.staticAppConfig = config.staticAppConfig;
            this.env = this.staticAppConfig.env;
            this.afterHostMethod('getDimensions', this.getDimensions, this);
            this.afterHostMethod('getAppConfigYCB', this.getAppConfigYCB, this);

            this.cookedDims = false;
            this.cookedConfigs = false;
        },

        /**
         * Dynamically add the experiment dimensions
         */
        getDimensions: function () {
            var dims = this.host._ycbDims;
            if (!this.cookedDims) {
                dims[0].dimensions = dimensions.concat(dims[0].dimensions);
                this.cookedDims = true;
            }
            return new Y.Do.AlterReturn(null, dims);
        },

        /**
         * Dynamically append experiment application.yaml files in the base app applicationConfigFiles config
         */
        getAppConfigYCB: function () {
            var rootAppConfig,
                paths = [],
                relativePaths,
                ycb,
                i;
            if (!this.cookedConfigs) {

                //when testing package, there is no root app config file.
                if (this.env !== 'test') {
                    rootAppConfig = this._getRootAppConfigFile();

                    ycb = this.host.readConfigYCB(rootAppConfig, {
                        runtime: 'server'
                    });

                    // adding the master application.json as the top level
                    paths.push(rootAppConfig);
                    // optional applicationConfigFiles to mix in more configs
                    relativePaths = ycb.applicationConfigFiles || [];
                    for (i = 0; i < relativePaths.length; i += 1) {
                        paths.push(libpath.resolve(this.appRoot, relativePaths[i]));
                    }
                }
                // adding configs from bundles
                paths = paths.concat(appConfigs);
                // reload confing
                this.host._ycbAppConfig = this.host.createMultipartYCB(paths);

                this.cookedConfigs = true;
            }
            return new Y.Do.AlterReturn(null, this.host._ycbAppConfig);
        },

        _getRootAppConfigFile: function () {
            var path, i,
                len = configFileOpts.length;

            for (i = 0; i < len; i += 1) {
                path = libpath.join(this.appRoot, configFileOpts[i]);
                if (libfs.existsSync(path)) {
                    break;
                }
            }
            return path;
        }
    });

    /**
     * Super bundle RS addon
     */
    function RSAddonSuperBundle() {
        RSAddonSuperBundle.superclass.constructor.apply(this, arguments);
    }

    RSAddonSuperBundle.NS = 'dimensions';
    RSAddonSuperBundle.ATTResourceStore = {};

    Y.extend(RSAddonSuperBundle, Y.Plugin.Base, {

        initializer: function (config) {
            this.store = config.host;
            this.appRoot = config.appRoot;
            this.mojitoRoot = config.mojitoRoot;
            this.staticAppConfig = this.store.getStaticAppConfig();
            this.staticHandling = this.staticAppConfig.staticHandling || {};

            this.beforeHostMethod('validateContext', this.validateContext, this);
            this.beforeHostMethod('_preloadPackage', this._preloadPackage, this);
            this.beforeHostMethod('preloadResourceVersions', this.hookConfigPlugin, this);
            this.beforeHostMethod('addResourceVersion', this.addResourceVersion, this);
            this.afterHostMethod('getResourceVersions', this.getResourceVersions, this);
            this.afterHostMethod('parseResourceVersion', this.parseResourceVersion, this);
            this.onHostEvent('resolveMojitDetails', this.resolveMojitDetails, this);
        },

        /**
         * Override store (host) validateContext method to ignore
         * invalid experiment_* dimension values and log an error instead.
         * It still fails when the dimension does not exist,
         * i.e. when the super bundle package is missing or misconfigured.
         */
        validateContext: function (ctx) {
            var store = this.store,
                cacheKey = JSON.stringify(ctx),
                cacheValue,
                k,
                parts,
                p,
                test,
                found,
                error;

            cacheValue = store._validateContextCache[cacheKey];
            if (cacheValue) {
                if (cacheValue === 'VALID') {
                    return;
                }
                throw new Error(cacheValue);
            }

            for (k in ctx) {
                if (ctx.hasOwnProperty(k)) {
                    if (!ctx[k]) {
                        continue;
                    }
                    if ('langs' === k) {
                        // pseudo-context variable created by our middleware
                        continue;
                    }
                    if (!store._validDims[k]) {
                        store._validateContextCache[cacheKey] = 'INVALID dimension key "' + k + '"';
                        error = new Error(store._validateContextCache[cacheKey]);
                        if (isExperimentDimension(k)) {
                            error.code = 400; //bad request
                        }
                        throw error;
                    }
                    // we need to support language fallbacks
                    if ('lang' === k) {
                        found = false;
                        parts = ctx[k].split('-');
                        for (p = parts.length; p > 0; p -= 1) {
                            test = parts.slice(0, p).join('-');
                            if (store._validDims[k][test]) {
                                found = true;
                                break;
                            }
                        }
                        if (!found) {
                            store._validateContextCache[cacheKey] = 'INVALID dimension value "' + ctx[k] + '" for key "' + k + '"';
                            throw new Error(store._validateContextCache[cacheKey]);
                        }
                        continue;
                    }
                    if (!store._validDims[k][ctx[k]]) {
                        //this is the only difference with the host method...
                        if (isExperimentDimension(k)) {
                            Y.log('INVALID dimension value "' + ctx[k] + '" for key "' + k + '"', 'error', NAME);
                        } else {
                            store._validateContextCache[cacheKey] = 'INVALID dimension value "' + ctx[k] + '" for key "' + k + '"';
                            throw new Error(store._validateContextCache[cacheKey]);
                        }
                    }
                }
            }
            store._validateContextCache[cacheKey] = 'VALID';
            // prevent the wrapped function from executing
            // but allow the remaining listeners to execute.
            return new Y.Do.Prevent(NAME);
        },

        /**
         * Load super bundle package sub directories (dimension values directories).
         */
        _preloadPackage: function (info) {
            var self = this,
                dir,
                subdirs,
                visitKey,
                dimensionName,
                dimensionDotJson = {},
                oldConfigRead;

            // if the package.json says type=super-bundle
            if (info.pkg && info.pkg.yahoo && info.pkg.yahoo.mojito && info.pkg.yahoo.mojito.type === 'super-bundle') {
                visitKey = info.pkg.name;
                // for the dynamic dimensions.json
                dimensionName = visitKey.substr(visitKey.lastIndexOf('-') + 1);
                dimensionDotJson[dimensionName] = {};

                Y.log('Found super-bundle: ' + visitKey, 'warn', NAME);
                dir = libpath.join(info.dir, info.pkg.yahoo.mojito.location || '');

                // try each subdir and check it's itself a package
                subdirs = libfs.readdirSync(dir);
                subdirs.forEach(function (subdir) {
                    var path = libpath.join(dir, subdir),
                        pkg;

                    if (isBundleDir(path, subdir)) {
                        // if it's a package, propagate the preloading
                        Y.log('Loading bundle: ' + subdir, 'info', NAME);
                        pkg = {
                            name: visitKey,
                            version: info.pkg.version,
                            depth: info.depth,
                            type: 'super-bundle',
                            dimension: dimensionName,
                            bundle: subdir
                        };
                        self.store._preloadDirBundle(path, pkg);
                        // and add the new dimension value to the dimension definition
                        dimensionDotJson[dimensionName][subdir] = null;
                        appConfigs.push(libpath.resolve(path, 'application.yaml'));
                    }
                });
                self.store._packagesVisited[visitKey] = info.dir;

                // add the dimension declaration to the list of dimensions to add
                dimensions.push(dimensionDotJson);
            }
        },

        getResourceVersions: function (filter) {
            var self = this,
                res = Y.Do.currentRetVal,
                versions;

            if (filter.type === 'mojit' && filter.name !== 'shared' && filter.selector === '*' &&
                    res.length === 0) {
                res = self.store.getResourceVersions({ type: 'mojit', name: filter.name });
                res.sort(resourceDepthAsc);
            }
            return new Y.Do.AlterReturn(null, res);
        },

        /**
         * Hook in to replace the selector with the experiment bundle name.
         *
         * Using AOP, this is called before the ResourceStore's version.
         * @method parseResourceVersion
         * @param source {object} metadata about where the resource is located
         * @param type {string} type of the resource
         * @param subtype {string} subtype of the resource
         * @param mojitType {string} name of mojit to which the resource likely belongs
         * @return {object||null} for config file resources, returns the resource metadata
         */
        parseResourceVersion: function (source, type, subtype, mojitType) {
            var res = Y.Do.currentRetVal,
                bundleSelector,
                originalSelector,
                prefix,
                fs,
                relativePath,
                urlParts,
                idx,
                explicitSelector = false;

            if (source.pkg.type === 'super-bundle') {
                originalSelector = res.selector;
                bundleSelector = source.pkg.bundle;
                prefix = bundleSelector + '_';

                if (originalSelector === '*') {
                    res.selector = bundleSelector;
                } else if (originalSelector !== bundleSelector && originalSelector.indexOf(prefix) !== 0) {
                    res.selector = prefix + res.selector;
                } else {
                    explicitSelector = true;
                }

                if ('asset' === type) {
                    fs = source.fs;
                    relativePath = fs.fullPath.substr(fs.rootDir.length + 1);
                    urlParts = [liburl.resolve('/', (this.staticHandling.prefix || 'static'))];

                    if (!explicitSelector) {
                        if (originalSelector === '*') {
                            idx = relativePath.lastIndexOf('.');
                            relativePath = relativePath.substring(0, idx) +
                                '.' + bundleSelector + relativePath.substring(idx);
                        } else {
                            relativePath = relativePath.replace('.' + originalSelector + '.',
                                '.' + res.selector + '.');
                        }
                    }

                    urlParts.push(res.mojit);
                    urlParts.push(relativePath);
                    res.url = urlParts.join('/');
                }
            }
            return new Y.Do.AlterReturn(null, res);
        },

        /**
         * Handle special case for resources type='mojit' (a.k.a. mojit directory),
         * when multiple versions exist at the same package level (i.e. node_modules/dependency{1..n}
         * In this case, the app resource (type=mojit) selector will be set to the super-bundle selector
         * instead of the default '*', so we can differentiate between the base mojit and the
         * super-bundle mojit dirs.
         */
        addResourceVersion: function (res) {
            if (res.type === 'mojit' && res.source.pkg.type === 'super-bundle') {
                res.selector = res.source.pkg.bundle;
            }
        },

        /**
         * Add dimension info to the mojit resource details
         */
        resolveMojitDetails: function (event) {
            var mojitRes = event.args.mojitRes,
                mojitDetails = event.mojitDetails,
                pkg = mojitRes.source.pkg;

            if (pkg.type === 'super-bundle') {
                mojitDetails.dimensionName = pkg.dimension;
                mojitDetails.dimensionValue = pkg.bundle;
            }
        },

        /**
         * Register plugin into rs.config addon, before rs.preloadResourceVersions',
         * this way rs addons have the chance to modify and reload configs AFTER they are loaded,
         * on the second rs pass.
         */
        hookConfigPlugin: function () {
            this.store.config.plug(ConfigPlugin, {
                appRoot: this.appRoot,
                mojitoRoot: this.mojitoRoot,
                staticAppConfig: this.staticAppConfig
            });
        }
    });

    Y.namespace('mojito.addons.rs').dimensions = RSAddonSuperBundle;

}, '0.0.1', { requires: [ 'plugin', 'oop'] });
