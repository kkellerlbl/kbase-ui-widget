/*global
 define, require
 */
/*jslint
 browser: true,
 white: true
 */
define([
    'bluebird',
    'kb/widget/adapters/objectWidget',
    'kb/widget/adapters/kbWidget'
],
    function (Promise, widgetAdapter, KBWidgetAdapter) {
        'use strict';

        function factory(config) {
            // Variables
            // The widget registry is a db (map) of widget definitions.
            // Note that we do NOT YET store widget instance references ...
            var widgets = {},
                runtime = config.runtime;

            // Functions

            // API Functions

            function addWidget(widgetDef) {
                if (widgetDef.id) {
                    widgetDef.name = widgetDef.id;
                }
                if (widgets[widgetDef.name]) {
                    throw new Error('Widget ' + widgetDef.name + ' is already registered');
                }
                /* TODO:  validate the widget ...*/
                widgets[widgetDef.name] = widgetDef;
            }
            function getWidget(widgetId) {
                return widgets[widgetId];
            }

            function makeFactoryWidget(widget, config) {
                return new Promise(function (resolve, reject) {
                    require([widget.module], function (factory) {
                        if (typeof factory === 'undefined') {
                            reject('Factory widget maker is undefined');
                            return;
                        }
                        if (factory.make === undefined) {
                            reject('Factory widget does not have a "make" method: ' + widget.name + ', ' + widget.module);
                            return;
                        }
                        try {
                            resolve(factory.make(config));
                        } catch (ex) {
                            reject(ex);
                        }
                    });
                });
            }

            function makeObjectWidget(widget, config) {
                return Promise.try(function () {
                    return widgetAdapter.make({
                        widgetDef: widget,
                        initConfig: config,
                        adapterConfig: {
                            runtime: runtime
                        }
                    });
                });
            }

            function makeKbWidget(widget, config) {
                return Promise.try(function () {
                    var adapterConfig = {
                        runtime: runtime,
                        widget: {
                            module: widget.module,
                            jquery_object: config.jqueryName,
                            panel: config.panel,
                            title: widget.title
                        }
                    };
                    return KBWidgetAdapter.make(adapterConfig);
                });
            }

            function validateWidget(widget, name) {
                var message;
                console.log('VALIDATING: ' + name);
                if (typeof widget !== 'object') {
                    message = 'Invalid widget after making: ' + name;
                }

                if (message) {
                    console.error(message);
                    console.error(widget);
                    throw new Error(message);
                }

                console.log('widget looks good: ' + name);
                console.log(widget);
            }

            function makeWidget(widgetName, config) {
                var widgetDef = widgets[widgetName],
                    widgetPromise;
                if (!widgetDef) {
                    throw new Error('Widget ' + widgetName + ' not found');
                }

                config = config || {};
                config.runtime = runtime;

                // How we create a widget depends on what type it is.               
                switch (widgetDef.type) {
                    case 'factory':
                        widgetPromise = makeFactoryWidget(widgetDef, config);
                        break;
                    case 'object':
                        widgetPromise = makeObjectWidget(widgetDef, config);
                        break;
                    case 'kbwidget':
                        widgetPromise = makeKbWidget(widgetDef, config);
                        break;
                    default:
                        throw new Error('Unsupported widget type ' + widgetDef.type);
                }
                return widgetPromise
                    .then(function (widget) {
                        validateWidget(widget, widgetName);
                        return widget;
                    });
            }


            // API
            return {
                addWidget: addWidget,
                getWidget: getWidget,
                makeWidget: makeWidget
            };
        }

        return {
            make: function (config) {
                return factory(config);
            }
        };
    });