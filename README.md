# mojito-dimensions-base

Build Status
------------

[![Build Status](https://travis-ci.org/yahoo/mojito-dimensions-base.png)](https://travis-ci.org/yahoo/mojito-dimensions-base)

Usage
-----

A-B _(a.k.a. bucket)_ testing infrastructure for mojito applications.

The Super Bundle RS Addon is a mojito [resource store addon][rs-addon] to discover, load and auto-configure resources from experiments `super-bundle` packages.

[rs-addon]: http://developer.yahoo.com/cocktails/mojito/docs/topics/mojito_resource_store.html#creating-your-own-resource-store-addons

## Super Bundles

Experiments `super-bundle` packages are special types of mojito `bundles`, which contain multiple versions of mojits that can be chosen at runtime through the dimension values using mojito `selectors` infrastructure.

### Contexts and dimensions

At runtime, dimensions and values to select resources must be set in the AC context.
The dimension name must be in the format: `experiment_<name>`


### File Structure

Consider the base application `my-mojito-app` which contains `Mojit1`.

We create an experiment _super-bundle_ package `mojito-dimensions-experiment_foo`,
which contains multiple versions of `Mojit1` based on the value of the dimension the package represents.

Consider for the pupose of the example a layer named `foo`, whose values can be `EXP001, EXP002, EXP003`.

By convention, the name of the package must include the name of the dimension it uses, with the following format: `mojito-dimensions-<dimension>`
where dimension is like `experiment_<layer>`.

We create an experiment package named `mojito-dimensions-experiment_foo`, that will be an npm dependency of the base application.

This package must be of type `super-bundle`, and must declare `mojito-dimensions-base` as a dependency:

```json
{
    "name": "mojito-dimensions-experiment_foo",
    "version": "0.0.1",
    "yahoo": {
        "mojito": {
            "type": "super-bundle"
        }
    },
    "dependencies": {
        "mojito-dimensions-base": "0.0.x"
    },
}
```

_Super bundles_ are composed of a set of subdirectories, one per experiment dimension value, which contain partial mojito applications, meaning, one or more mojits and/or mojito resources, such as assets, binders, controllers, etc.
Each dimension subdirectory must contain an `application.yaml` file to configure the selector that will be used to chose the right resources at runtime.


```bash
my-mojito-app
|-- ...
|-- mojits
|   |-- ...
|   `-- Mojit1/
|-- node_modules
|   |-- ...
|   `-- mojito-dimensions-experiment_foo
|       |-- EXP001
|       |   |-- mojits/
|       |   |   `-- Mojit1/
|       |   |      `-- controller.server.js
|       |   |-- ...
|       |     |-- application.yaml
|       |     `-- [package.json]
|       |
|       |-- EXP002
|       |   |-- mojits/
|       |   |   `-- Mojit1/
|       |   |      `-- assets/
|       |   |         `-- index.css
|       |   |-- ...
|       |     `-- application.yaml
|       |
|       |-- EXP003
|       |   |-- mojits/
|       |   |   `-- Mojit1/
|       |   |      `-- binders/
|       |   |         `-- index.client.js
|       |   |-- ...
|       |     `-- application.yaml
|       |
|       |
|       |-- node_modules
|       |   `-- mojito-dimensions-base
|       |       |-- addons
|       |       |   `-- rs
|       |       |       `-- super-bundle.server.js
|       `-- package.json
|-- ...
|-- application.yaml
`-- package.json

```

### Configuration

Each experiment must configure the value of their dimension in the `application.yaml` file.

```json
[
    {
        "settings": [
            "experiment_foo:EXP002"
        ],
        "selector": "EXP002"
    },
    {
        "settings": [
            "experiment_foo:EXP002",
            "device:iphone"
        ],
        "selector": "EXP002_iphone"
    }
]
```
In the example above, whenever the request context contains the dimension/value pair `experiment_foo: "EXP001"`,
it will result in mojito loading resources included in the `EXP001` experiment dir, using the selector with the same name.

Note that context dimensions combinations are also possible, like the `device:iphone` config above.

Similarly, any application config can be overriden for the specific experiment settings:

```json
[{
    "settings": ["experiment_example:CONFIG"],
    "selector": "CONFIG",

    "specs": {
        "someMojit": {
            "config": {
                "someConfig": {

                    "pagination": {
                        "config": {
                            "Pages": 5
                        }
                    }
                }
            }
        }
    }
},{
    "settings": [ "experiment_example:CONFIG", "device:phone" ],
    "selector": "CONFIG_phone",

    "specs": {
        "someMojit": {
            "config": {
                "someConfig": {

                    "pagination": {
                        "config": {
                            "Pages": 3
                        }
                    }
                }
            }
        }
    }
}]
```

#### Dimensions Auto-Configuration

There is no need to previously declare or hardcode all the possible experiment dimension names and values in `dimensions.json`.
The super bundle addon automatically adds the dimensions names and values to the configuration at startup time while it discovers and loads `super-bundle` type packages.

## Creating Experiments Packages

See: [mojito-cli-dimension]

[mojito-cli-dimension]: https://github.com/yahoo/mojito-cli-dimension
