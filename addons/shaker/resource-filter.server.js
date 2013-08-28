/*
 * Copyright (c) 2013, Yahoo! Inc. All rights reserved.
 * Copyrights licensed under the New BSD License.
 * See the accompanying LICENSE file for terms.
 */

/*jslint indent: 4, stupid: true, nomen: true, plusplus: true */

YUI.add('addon-shaker-resource-filter', function (Y, NAME) {
    'use strict';

	function ResourceFilter() {
		ResourceFilter.superclass.constructor.apply(this, arguments);
	}
	ResourceFilter.NS = 'resource-filter';

	Y.extend(ResourceFilter, Y.Plugin.Base, {

		initializer: function (config) {
			this.config = config;
			this.afterHostMethod('preprocessRollupResources', this.preprocessRollupResources, this);
		},
		destructor: function () {},

		preprocessRollupResources: function () {
			var resources = Y.merge(Y.Do.currentRetVal);
			resources.app = this._stripNonRollupResources(resources.app);
			return new Y.Do.AlterReturn(null, resources);
		},
		/**
         * Retrieve from the app config all the selectors associated
         * with a value of the given dimension, excluding the ones that
         * are associated with a value listed in excludedValues.
         * @param  {String} dimName       the name of the dimension to get the selectors for
         * @param  {Array} excludedValues the values for the dimName dimension that will cause to skip their associated selector
         * @return {Object}               the selectors found
         */
        _getSelectorsForDimension: function (dimName, excludedValues) {
            var appConfigYCB = this.config.host.resources.store.config.getAppConfigYCB(),
                selectors = {};

            appConfigYCB.walkSettings(function (settings, config) {
                if (config.selector) {
                    // for each setting in the app config, if we have a dimension selector
                    Y.Object.each(settings, function (val, nextDimName) {
                        // remember the selector if the dimension has the correct name
                        // and the value is not in the provided list
                        if (nextDimName === dimName &&
								excludedValues.indexOf(val) === -1) {

                            selectors[config.selector] = true;
                        }
                    });
                }
                return true;
            });
            return selectors;
        },
        /**
         * purges the rawResources from the resources corresponding to the shaker config 'dontRollupDimensionUnlessValueIs'
         * @param  {Object} rawResources the set of resources to purge
         * @return {Object}              the new set of resources, free of any forbidden selector
         */
        _stripNonRollupResources: function (rawResources) {
            var strippedResources = {},
                forbiddenSelectors = {};

            // for all the dimensions we want not to be bundled, get all the forbidden selectors
            Y.Object.each(this.config || {}, function (exceptWhenValues, dimName) {
                forbiddenSelectors = Y.merge(forbiddenSelectors, this._getSelectorsForDimension(dimName, exceptWhenValues));
            }, this);

            // then for each resource that would be bundled
            Y.Object.each(rawResources, function (poslResources, poslString) {
                var oneIsForbidden = false,
                    s,
                    selectors = poslString.split('-');
                // check if the any selector in the posl belongs the forbidden selectors
                for (s = 0; s < selectors.length; s++) {
                    if (forbiddenSelectors[selectors[s]]) {
                        oneIsForbidden = true;
                        break;
                    }
                }
                // if no selector has been forbidden, remember the resource
                if (!oneIsForbidden) {
                    strippedResources[poslString] = poslResources;
                }
            });
            return strippedResources;
        }
	});

    Y.namespace('mojito.addons.shaker');
    Y.mojito.addons.shaker['resource-filter'] = ResourceFilter;
}, '0.0.1', { requires: ['plugin', 'oop']});
