(function($) {

    var elroi = function(element, dataSeries, graphOptions, tooltips) { return new e(element, dataSeries, graphOptions, tooltips); };

    elroi.fn = {};

    window.elroi = elroi;

    /**
     * Creates an graph in a given empty div
     * Usage: see /test/elroi.js for an example usage (this is commented out currently due to WebTestJS erroring out)
     * @param args An object containing
     *          $el - jQ DOM element to insert the graph into
     *          data - An array of series objects containing series data, and series options
     *          options - options for the graph
     * @return graph The graph object
     * @return {object} object containing method for draw and method for update
     */
    function e(element, dataSeries, graphOptions, tooltips) {
        var defaults = {
            animation: true,
            colors: ['#99cc33', '#ffee44', '#ffbb11', '#ee5500', '#33bbcc', '#88ddee'],
            dates : {
                format: 'auto'
            },
            errorMessage : false,
            labelWidth : 'auto',
            topLabelFormatter: function(value, axis) {
                var label = axis.prefixUnit ? (axis.topUnit + value) : (value + ' ' + axis.topUnit);
                return label;
            },
            labelFormatter: function(value, axis) {
                var label = axis.prefixUnit ? (axis.unit + value) : (value + ' ' + axis.unit);
                return label;
            },
            flagOffset : 5,
            skipPointThreshhold : 18,
            precision: 0,
            thousandsSeparator: ',',
            decimalSeparator: '.',
            dynamicLeftPadding: false,
            grid : {
                show: true,
                showBaseline: true,
                numYLabels : 5
            },
            axes : {
                x1 : {
                    customXLabel: false,
                    id : 'x1',
                    type: 'date',
                    show : true,
                    labels : [],
                    seriesIndex : 0    // By default, the axis values are derived from the first series of data
                },
                x2 : {
                    customXLabel: false,
                    id : 'x2',
                    type : 'text',
                    show : false,
                    labels : [],
                    seriesIndex : 0
                },
                y1 : {
                    id : 'y1',
                    show : true,
                    unit: '',
                    topUnit: '',
                    prefixUnit: false,
                    seriesIndex : 0
                },
                y2 : {
                    id : 'y2',
                    show : false,
                    unit: '',
                    topUnit: '',
                    prefixUnit: false,
                    seriesIndex: 0
                }
            },
            tooltip: {
                formatter : function(tip) {return tip;},
                show: true,
                width: 120
            },
            seriesDefaults: {
                type: 'line',
                showPoints: false,
                fillPoints: false,
                labelPoints: false,
                animatePoints : false,
                pointStroke: true,
                interpolateNulls : false,
                maxYValue : 'auto',
                minYValue : 'zeroOrLess',
                unit: '',
                pointLabelUnits: ''
            },
            bars : {
                highlightBorderWidth : 2,
                highlightBorderOpacity : 0.8,
                highlightColor : '#ccc',
                flagPosition: 'exterior' // exterior or interior - the label appears above or inside the bar
            },
            lines : {
                width : 2,
                opacity : 0.8,
                fillOpacity : 0.2,
                pointRadius : 3,
                pointStrokeWidth : 2,
                highlightStrokeWidth : 4,
                highlightRadius : 6,
                highlightOpacity : 0.8
            },
            padding: {top:15, right:20, bottom:18, left:50}
        };

        var $document = $(document),
            $el = $(element)
                .addClass('elroi'),
            $paper = $('<div></div>')
                .addClass('paper')
                .appendTo($el),
            options = $.extend(true, {}, defaults, graphOptions);

        var width = $paper.width() || $el.width(),
            height = $paper.height() || $el.height();

        var idCounter = 0; //Used to create unique IDs in generateID method.

        /**
         * Get mouse position relative to the top left corner of the Elroi element.
         * @param e {Object} Mouse event object
         * @return {Object} x - x position relative to the top left corner of the Elroi element.
         *                  y - y position relative to the top left corner of the Elroi element.
         */
        function getRelativeMousePosition (e) {
            var elementOffset = $el.offset();
            return {
                x: e.clientX + $document.scrollLeft() - elementOffset.left,
                y: e.clientY + $document.scrollTop() - elementOffset.top
            };
        }

        /**
         * Helper function to determine whether a mouse is in a Raphael path.
         * @param e {Object} Mouse event object
         * @param path {string} Raphael path string
         * @return {boolean} true if the mouse is in the path, false otherwise
         */
        function isMouseInPath(e, path) {
            var relativePosition = getRelativeMousePosition(e);
            return Raphael.isPointInsidePath(path, relativePosition.x, relativePosition.y);
        }

        /**
         * Helper function to determine whether a mouse is in an object across browser and taking into account the
         * offset of the graph container.
         * @param e {Object} Mouse event object
         * @param element {Object} Raphael element
         * @return {boolean} true if the mouse is in the element, false otherwise
         */
        function isMouseInElement(e, element) {
            var relativePosition = getRelativeMousePosition(e);
            return element.isPointInside(relativePosition.x, relativePosition.y);
        }


        /**
         * Creates a random alpha-numeric string of the length specified.  This is used to create IDs by stopJQP.
         *
         * @param length {Number} The length of the desired string. A length less than 1 will result in an empty string.
         * @return {String} A randomly generated alpha-numeric string of specified length.
         */
        function generateId() {
            return '_elroi_unique_id_' + (++idCounter);
        }

        /**
         * Animate and return (jQ)uery (P)romise
         * Helper function that executes a Raphael animate and returns a jQuery promise that will resolve on animation
         * complete.  This is extremely useful when chaining or synchronizing animations!
         *
         * IMPORTANT
         * If the element that is animating has .stop() called on it; its callback won't be called!
         * As a result its promise won't be rejected and hence stop should not be called on elements
         * utilizing animateJQP, instead use stopJQP.
         *
         * A feature request has been created on the Raphael repo requesting a proper stop/interrupt callback which
         * would allow the removal of stopJQP() and generateId().
         * https://github.com/DmitryBaranovskiy/raphael/issues/661
         *
         * @param e {Object} Raphael JS element or set of elements
         * @param params {Array} Array of animate parameters (DO NOT INCLUDE CALLBACK)
         * @return {Object} jQuery promise that will resolve when the animation is complete.
         */
        function animateJQP(element, params) {
            var deferred = $.Deferred();
            params.push(deferred.resolve);

            //Elements are provided ids by default but sets are not; for stopJQP to work we need a unique ID, so we'll
            // assign an ID if one isn't provided (null or undefined).
            if (!element.id && element.id !== 0) {
                element.id = generateId();
            }

            eve.once('raphael.anim.stop.' + element.id, deferred.reject);
            element.animate.apply(element, params);
            return deferred.promise();
        }

        /**
         * Stop and reject (jQ)uery (P)romise
         * If animateJQP is used; stopJQP should be used instead of stop() to ensure that the promise provided by
         * animateJQP is rejected.
         *
         * @param e {Object} Raphael JS element or set of elements
         */
        function stopJQP(element) {
            element.stop();
            eve('raphael.anim.stop.'+ element.id, null, null);
            return element;
        }

        /**
         * Creates an error box containing the provided html and injects it into the graph.  The error box has the
         * classes elroi-error, alert, and box.  These classes can be used to provide appropriate styling.
         *
         * @param html {String} HTML content to show in the error box
         * @param additionalClasses {String} additional CSS classes to add to the error message box beyond the default
         * @returns {Object} jQuery element for the error box that has been injected into the DOM
         */
        function injectErrorMessage(html, additionalClasses) {
            return $('<div/>', {
                html: html,
                'class': 'elroi-error alert box'
            }).addClass(additionalClasses).prependTo($el.find('.paper'));
        }

        var graph = elroi.fn.init({
            padding : options.padding,
            labelLineHeight: 12,
            width: width,
            height: height,
            allSeries: dataSeries,
            $el: $el,
            paper: Raphael($paper.get(0), width, height),
            options: options,
            tooltips: tooltips,
            isMouseInPath: isMouseInPath,
            isMouseInElement: isMouseInElement,
            animateJQP: animateJQP,
            stopJQP: stopJQP,
            injectErrorMessage: injectErrorMessage
        });

        var html = '<div class="elroi-tooltip"><div class="elroi-tooltip-content"></div></div>';
        graph.$tooltip = $(html);

        graph.$tooltip.width(graph.options.tooltip.width).appendTo($el.find('.paper')).addClass('png-fix');
        $el.mouseleave(function() {
            graph.$tooltip.css('left', -10000);
        });

        /**
         * Draws the graph grid, any error messaging, and any charts and graphs for all data
         */
        function draw() {

            var isGridDrawn = false;

            if (graph.options.errorMessage) {
                injectErrorMessage(graph.options.errorMessage);
            }

            if (!graph.allSeries.length) {
                elroi.fn.grid(graph).draw();
            }


            $(graph.allSeries).each(function(i) {

                if (!isGridDrawn && graph.seriesOptions[i].type !== 'pie') {
                    elroi.fn.grid(graph).draw();
                    isGridDrawn = true;
                }

                var type = graph.seriesOptions[i].type;
                elroi.fn[type](graph, graph.allSeries[i].series, i).draw();

            });

        }

        /**
         * Deletes all of the Raphael objects, and removes the axes from the graph
         */
        function clearGraph() {
            graph.paper.clear();

            graph.$el.find('ul').remove();
            graph.$el.find('.elroi-point-flag').remove();
            graph.$el.find('.elroi-point-label').remove();
        }

        /**
         * Redraws the graph with new data
         * @param newData A new data object to be graphed
         */
        function update(newData) {
            clearGraph();
            graph.allSeries = newData;

            draw();
        }

        draw();

        return $.extend({},{
            graph: graph,
            draw: draw,
            update: update
        }, graph.ext);
    }

})(jQuery);
(function(elroi, $) {

    /**
     *
     * @param {String}
        The format can be combinations of the following:
     d  - day of month (no leading zero)
     dd - day of month (two digit)
     D  - day name short
     DD - day name long
     m  - month of year (no leading zero)
     mm - month of year (two digit)
     M  - month name short
     MM - month name long
     y  - year (two digit)
     yy - year (four digit)
     h  - hour (single digit)
     hh - hour (two digit)
     H  - hour (military, no leading zero)
     HH  - hour (military, two digit)
     nn - minutes (two digit)
     a - am/pm
     * @param value The date to format
     * @param options Options for the date format; includes ignore zero minutes, and am/pm
     * @return {String} The formatted date
     */
    function formatDate(format, value, options) {
        var DAY_NAMES_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'],
            DAY_NAMES_LONG = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'],
            MONTH_NAMES_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
            MONTH_NAMES_LONG = ['January','Feburary','March','April','May','June','July','August','September','October','November','December'],
            MERIDIAN = ['am', 'pm'],
            TIME_SEPARATOR = ':',
            date = new Date(value),
            dayNamesShort,
            dayNamesLong,
            monthNamesShort,
            monthNamesLong,
            merid,
            timeSeparator,
            formattedDate = '',
            thisChar,
            isDoubled,
            i;

        if (!format) {
            return '';
        }

        options = options || {};
        dayNamesShort = options.dayNamesShort || DAY_NAMES_SHORT;
        dayNamesLong = options.dayNamesLong || DAY_NAMES_LONG;
        monthNamesShort = options.monthNamesShort || MONTH_NAMES_SHORT;
        monthNamesLong = options.monthNamesLong || MONTH_NAMES_LONG;
        merid = options.meridian || MERIDIAN;
        timeSeparator = options.timeSeparator || TIME_SEPARATOR;

        for (i = 0; i < format.length; i++) {
            thisChar = format.charAt(i);
            isDoubled = i < format.length && format.charAt(i + 1) === thisChar;

            switch (thisChar) {
                case 'd':
                    if (isDoubled) {
                        if (date.getDate() < 10) {
                            formattedDate += '0';
                        }
                        formattedDate += date.getDate();
                    } else {
                        formattedDate += date.getDate();
                    }
                    break;
                case 'D':
                    formattedDate += isDoubled ? dayNamesLong[date.getDay()] : dayNamesShort[date.getDay()];
                    break;
                case 'm':
                    if (isDoubled) {
                        if (date.getMonth() < 10) {
                            formattedDate += '0';
                        }
                        formattedDate += date.getMonth() + 1;
                    } else {
                        formattedDate += date.getMonth() + 1;
                    }
                    break;
                case 'M':
                    formattedDate += isDoubled ? monthNamesLong[date.getMonth()] : monthNamesShort[date.getMonth()];
                    break;
                case 'y':
                    if (isDoubled) {
                        formattedDate += date.getFullYear();
                    } else {
                        if (date.getFullYear() % 100 < 10) {
                            formattedDate += 0;
                        }
                        formattedDate += date.getFullYear() % 100;
                    }
                    break;
                case 'h':
                    if (isDoubled && date.getHours()  % 12 < 10) {
                        formattedDate += "0";
                    }
                    formattedDate += date.getHours() === 0 ? 12
                        : date.getHours() > 12 ? date.getHours() - 12
                        : date.getHours();
                    break;
                case 'H':
                    formattedDate += isDoubled && date.getHours() < 10 ? "0" + date.getHours() : date.getHours();
                    break;
                case 'n':
                    formattedDate += date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes();
                    break;
                case 'a':
                    formattedDate += date.getHours() < 12 ? merid[0] : merid[1];
                    break;
                case ':':
                    formattedDate += timeSeparator;
                    break;
                default:
                    formattedDate += thisChar;
            }
            if (isDoubled) {
                i++;
            }
        }

        return formattedDate;
    }

    /**
     * Strips the year component from the provided date format, including any leading or trailing separator characters
     * which include all whitespace, ',' '/' or '-' characters.
     *
     * NOTE WELL: this assumes that the date format will not put the year in the middle of a format string. If you do
     * that, it will munge separators on both sides; i.e. 'm/y/d' will become 'md'.
     */
    function stripYearFromDateFormat(format) {
        return format.replace(/[,-\/]?\s*y{1,2}\s*[,-\/]?/, '');
    }

    /**
     * Formats the start and end date of a date range as a single string, using the provided format string.
     *
     * @param format the date format string, as escribed in the formatDate function
     * @param startDate the start date of the range
     * @param endDate the end date of the range
     * @param options object, supports the following features:
     *     skipRepeatedYear (default true): if true, will remove the year component of the start date when
     *         start and end date are the same year. It will match 'y' 2-digit year, 'yy' full year as well
     *         as any leading and trailing commas, dashes or slashes used to separate.
     */
    function formatDateRange(format, startDate, endDate, options) {
        var skipRepeatedYear,
            startDateFormat,
            endDateFormat,
            formattedDateRange;

        options = options || {};
        startDateFormat = format;
        endDateFormat = format;
        skipRepeatedYear = (options.skipRepeatedYear !== undefined) ? options.skipRepeatedYear : true;
        formattedDateRange = '';

        if (startDate && endDate) {
            // Scrape out duplicate years from startDate and endDate
            if (skipRepeatedYear && startDate.getFullYear() === endDate.getFullYear() && startDateFormat.indexOf('y') > -1) {
                startDateFormat = stripYearFromDateFormat(startDateFormat);
            }
        }

        if (startDate) {
            /**
             * For CJK languages it's necessary that certain characters (e.g., date strings) appear next to each other.
             * Ideally, we should instead use "word-break: keep-all", which is not yet supported by Chrome. Reference:
             * https://code.google.com/p/chromium/issues/detail?id=141792
             * Until then, the "white-space:nowrap" trick seems to work across browsers.
             */
            formattedDateRange += '<span class="nowrap">' + elroi.fn.formatDate(startDateFormat, startDate, options) + '</span>';
        }

        if (startDate && endDate) {
            formattedDateRange += '&nbsp;&ndash;&nbsp;';
        }

        if (endDate) {
            formattedDateRange += '<span class="nowrap">' + elroi.fn.formatDate(endDateFormat, endDate, options) + '</span>';
        }

        return formattedDateRange;
    }

    elroi.fn.formatDate = formatDate;
    elroi.fn.formatDateRange = formatDateRange;
    elroi.fn.stripYearFromDateFormat = stripYearFromDateFormat;

})(elroi, jQuery);
(function(elroi, $) {

    var helpers = {

        /**
         * Checks and sees if the graph has any data to actually display
         * @param {Array} allSeries An array of all of the series in the graph
         * @return {Boolean} hasData Does the graph have data
         */
        hasData : function(allSeries) {
            var hasData = true;

            hasData = allSeries !== undefined &&
                allSeries.length &&
                allSeries[0] !== undefined &&
                allSeries[0].series !== undefined &&
                allSeries[0].series.length;


            // Does this graph actually have data?
            $(allSeries).each(function(i) {
                if (!this || !this.series[0]) {
                    hasData = false;
                }
            });

            return !!hasData;
        },

        /**
         * Converts each series in a graph data object into an array of data values.  That is if a graph data object
         * is comprised of the series [s1,s2] the result will be [dv1, dv2].  If allSeries is empty (the graph data
         * object is made up of NO series) a [[0]] is returned to avoid Elroi from blowing up.
         *
         * @param {Array} allSeries All of the series in the graph
         * @param {Array} seriesOptions The set of series options for the graph
         * @return {Array} dataValues An array of the data values for a series
         */
        getDataValues : function(allSeries, seriesOptions) {

            var dataValuesSet = [];

            // If there is no actual data, build a dummy set so Elroi won't choke
            if (!elroi.fn.helpers.hasData(allSeries)) {
                return [[0]];
            }

            $(allSeries).each(function(i) {

                var dataValues = [],
                    series = allSeries[i].series,
                    lowestValue = 0;

                $(series).each(function(j, singleSeries) {
                    $(singleSeries).each(function(k) {
                        if (this.value < lowestValue) {
                            lowestValue = dataValues[k] < 0 ? this.value + dataValues[k] : this.value;
                        }
                        if (j === 0 || seriesOptions[i].type !== 'stackedBar') {
                            dataValues.push(+this.value);
                        }
                        else {
                            dataValues[k] += this.value;
                        }
                    });

                });

                if (lowestValue < 0) {
                    dataValues.push(lowestValue);
                }

                dataValuesSet.push(dataValues);

            });

            return dataValuesSet;
        },

        /**
         * Iterates a data set and returns the sum of all values
         * @param {Array} dataSet
         * @return {Int} sum
         */
        sumSeries : function(allData) {

            var sums = [];

            $(allData).each(function(i) {
                var singleSeries = this,
                    sum = 0;
                $(singleSeries).each(function (j) {
                    sum += this;
                });
                sums.push(sum);
            });
            return sums;
        },

        /**
         * Goes through each data point in every series and figures out if any of them have point flags
         *
         * @param {Array} allSeries All of the series to be shown on the graph
         * @return {Boolean} hasPointFlags
         */
        hasPointFlags: function(allSeries) {
            return this.getPointFlags(allSeries).length > 0;
        },

        /**
         * Returns an array of all pointFlags for all graphDataObjects.  This is done by drilling down into each
         * data point that comprises the graphData object and checking whether or not it has a pointFlag.
         *
         * @param allGraphDataObjects {Array} An array of all graph data objects this Elroi instance is graphing.
         * @returns {Array} An array containing the point flags of every point provided to this Elroi instance that had
         *   a pointFlag across all graph data objects and series.
         */
        getPointFlags: function(allGraphDataObjects) {
            // Figure out if any of the data points have flags to show
            var pointFlags = [];

            $(allGraphDataObjects).each(function(i, graphDataObject) {
                var allSeries = graphDataObject.series;

                $(allSeries).each(function(j, singleSeries) {
                    $(singleSeries).each(function(k, dataPoint) {
                        if (dataPoint.pointFlag) {
                            pointFlags.push(dataPoint.pointFlag);
                        }
                    });
                });
            });

            return pointFlags;
        },

        /**
         * Determines the minimum y-value to use for axes/scaling for each dataValues_i/seriesOptions_i pair.  For a
         * given pair the minimum is seriesOptions_i.minYValue, unless seriesOptions_i.maxYValue is "auto" in which
         * case the minimum is the highest value present in dataValue_i or if seriesOptions_i.maxYValue is "zeroOrLess"
         * in which case the minimum is 0 OR the smallest sub 0 entry in dataValues_i.  The determined min will be in
         * position i of the result array.
         *
         * @param {Array} seriesDataValues Array of data values for each graph series [dataValues_1, dataValues_2, ...]
         * @param {Array} seriesOptions Array of options for each graph series [seriesOptions_1, seriesOptions_2, ...]
         *
         * @throws {Error} Argument seriesDataValues and seriesOptions must be Arrays.
         * @throws {Error} Argument seriesDataValues and seriesOptions must have the same length.
         * @throws {TypeError} Each dataValues_i in argument seriesDataValues must be an Array.
         * @throws {Error} Each seriesOptions_i in argument seriesOptions must have a field maxYValue that is either
         *   a number, 'auto', or 'zeroOrLess'.
         *
         * @return {Array} The array of minimum values [result_1, result_2, ...] to use in axes/scaling calculation
         *   where result_i  is a number corresponding to the maximum as determined by to dataValues_i and
         *   seriesOptions_i.
         */
        minValues : function(seriesDataValues, seriesOptions) {
            if (!(seriesDataValues instanceof Array)) {
                throw new TypeError("Parameter seriesDataValues must be an array.");
            } else if (!(seriesOptions instanceof Array)) {
                throw new TypeError("Parameter seriesOptions must be an array.");
            } else if (seriesDataValues.length !== seriesOptions.length) {
                throw new Error("The length of seriesDataValues and seriesOptions must be the same.");
            }

            return $.map(seriesDataValues, function(dataValues, i) {
                var seriesOptionsMinYValue = seriesOptions[i].minYValue,
                    calculatedMinYValue;

                if (isNaN(seriesOptionsMinYValue)) {
                    // If seriesOptions[i].minYValue is not a number that means it's 'auto' or 'zeroOrLess', in either
                    // case we need to determine the minimum in the dataValues array.

                    if (!(dataValues instanceof Array)) {
                        throw new Error("Unable to calculate min of series' data values entry that is not an array.");
                    }

                    calculatedMinYValue = Math.min.apply(Math, dataValues);

                    if (seriesOptionsMinYValue === 'auto') {
                        return calculatedMinYValue;
                    } else if (seriesOptionsMinYValue === 'zeroOrLess') {
                        return calculatedMinYValue < 0 ? calculatedMinYValue : 0;
                    } else {
                        throw new Error("Unable to calculate min of series if corresponding option minYValue is " +
                            "not 'auto', 'zeroOrLess', or a number");
                    }

                } else {
                    return seriesOptionsMinYValue;
                }

            });
        },

        /**
         * Determines the maximum y-value to use for axes/scaling for each dataValues_i/seriesOptions_i pair.  For a
         * given pair the maximum is seriesOptions_i.maxYValue, unless seriesOptions_i.maxYValue is "auto" in which
         * case the maximum is the highest value present in dataValue_i.  The determined max will be in position i of
         * the result array.
         *
         * @param {Array} seriesDataValues Array of data values for each graph series [dataValues_1, dataValues_2, ...]
         * @param {Array} seriesOptions Array of options for each graph series [seriesOptions_1, seriesOptions_2, ...]
         *
         * @throws {TypeError} Argument seriesDataValues and seriesOptions must be Arrays.
         * @throws {Error} Argument seriesDataValues and seriesOptions must have the same length.
         * @throws {TypeError} Each dataValues_i in argument seriesDataValues must be an Array.
         * @throws {Error} Each seriesOptions_i in argument seriesOptions must have a field maxYValue that is either
         *   a number or 'auto'.
         *
         * @return {Array} The array of maximum values [result_1, result_2, ...] to use in axes/scaling calculation
         *   where result_i is a number corresponding to the minimum as determined by dataValues_i and seriesOptions_i.
         */
        maxValues : function(seriesDataValues, seriesOptions) {
            if (!(seriesDataValues instanceof Array)) {
                throw new TypeError("Parameter seriesDataValues must be an array.");
            } else if (!(seriesOptions instanceof Array)) {
                throw new TypeError("Parameter seriesOptions must be an array.");
            } else if (seriesDataValues.length !== seriesOptions.length) {
                throw new Error("The length of seriesDataValues and seriesOptions must be the same.");
            }

            return $.map(seriesDataValues, function(dataValues, i) {
                var seriesOptionsMaxYValue = seriesOptions[i].maxYValue;

                if (isNaN(seriesOptionsMaxYValue)) {
                    // If seriesOptions[i].maxYValue is not a number that means it's 'auto', so we need to determine the
                    // maximum value in the dataValues array.

                    if (!(dataValues instanceof Array)) {
                        throw new TypeError("Unable to calculate max of series' data values entry; seriesOptions[i]" +
                            " must be an array.");
                    }

                    if (seriesOptionsMaxYValue === 'auto') {
                        return [ Math.max.apply(Math, dataValues) ];
                    } else {
                        throw new Error("Unable to calculate max of series data values; seriesOptions[i].maxYValue" +
                            " must be 'auto' or a number.");
                    }
                } else {
                    return [ seriesOptionsMaxYValue ];
                }
            });
        },

        /**
         * Determines the number of pixels of height of the error message will need.  This value will be 0 if there is
         * no error message to be shown.  If there is an error message, the height will be discerned by adding the
         * message to the graph with visibility set to hidden, then the outerHeight and top position is used to
         * calculate the needed pixels (outerHeight + top * 2), and finally the error message is removed.  The same
         * method that is used to inject the permanent error message into the DOM is used to insert the hidden one in
         * this method; as such all CSS styles (which could potentially affect the top or height) should match.
         *
         * @param {object} graph Elroi graph object
         * @returns {number} 0 if no error message; otherwise the number of pixels of height the error message consumes
         *   (outerHeight + top * 2).
         */
        pixelsNeededForErrorMessages: function (graph) {
            var pixelsNeeded = 0,
                $errorMsg;

            if (graph.options.errorMessage) {
                $errorMsg = graph.injectErrorMessage(graph.options.errorMessage, 'visibility-hidden');
                pixelsNeeded = $errorMsg.outerHeight() + $errorMsg.position().top * 2;
                $errorMsg.remove();
            }

            return pixelsNeeded;
        },

        /**
         * Determines the number of pixels of required to fit any point flag; this is used to prevent the graph from
         * overlapping the flags.  The returned value will be 0 if there are no point flags or if the position is
         * 'interior'.  Because we don't know the top position of any of the flags, the height from the point flag with
         * the largest height is returned; this guarantees that any flag will fit independent of bar height. The
         * only downside of this is that we may scale the graph unnecessarily if the highest point flag is lower than the
         * top of the highest bar OR the top of a shorter point flag.
         *
         * @param {object} graph Elroi graph object
         * @returns {number} 0 if the graph doesn't have point flags or the flag position is interior; otherwise the
         *   number of pixels of height the point flags consume
         */
        pixelsNeededForPointFlags: function(graph) {
            var pixelsNeeded = 0;

            if (graph.options.bars.flagPosition !== 'interior') {

                $.each(this.getPointFlags(graph.allSeries), function (index, $pointFlag) {
                    var $pointFlagClone = $pointFlag.clone()
                            .addClass('visibility-hidden elroi-point-flag')
                            .appendTo(graph.$el.find('.paper')),
                        outerHeight = $pointFlagClone.outerHeight();

                    pixelsNeeded = Math.max(pixelsNeeded, outerHeight);

                    $pointFlagClone.remove();
                });
            }

            return pixelsNeeded;
        },

        /**
         * Determines the number of pixels needed for X2 labeling, this is used to determine appropriate scaling to
         * ensure the graph does not overlap the labeling.
         *
         * Each graph label is inserted into the DOM as a hidden element, its width is taken, and then it is removed;
         * the sequence should be transparent to the user.  The labels will be permanently added to the graph later.
         * A small amount of padding is added to the result (labelLineHeight/2).
         *
         * @param {object} graph Elroi graph object
         * @returns {number} height (in pixels) of the tallest label or 0 if graph.options.axes.x2.show is false
         *   or there are no graph.options.axes.x2.labels.
         */
        pixelsNeededForX2Axis: function(graph) {
            var pixelsNeeded = 0, $x2;

            if (graph.options.axes.x2.show) {

                /* Create hidden container and add it to the graph. */
                $x2 = $('<ul>').addClass('x-ticks x2').appendTo(graph.$el);

                /* Add each label into our container($x2). */
                var liElements = $.map(graph.options.axes.x2.labels, function(value) {
                    return $('<li>').width(graph.options.labelWidth).html(value).appendTo($x2);
                });

                $.each(liElements, function(index, $li) {
                    pixelsNeeded = Math.max(pixelsNeeded, $li.outerHeight());
                });

                /* Remove the hidden container from the DOM */
                $x2.remove();
            }

            /* If pixelsNeeded isn't 0 (the graph has an x2 axis with labels) add a small bit extra padding. */
            return (pixelsNeeded === 0) ? 0 : pixelsNeeded + graph.labelLineHeight / 2;
        },

        /**
         * Determines the percentage of the range (max - min) to add to the y-axis {@see adjustedMaxMinValues} in
         * order to sufficiently distort it so that the graph will fit below the error-message / point-flags /
         * x2-axis-labels  etc.  If the total height of error/flags/etc. (in pixels) needed is equal to or greater than
         * the height of the graph, the state is erroneous.  Instead of returning a negative multiplier or causing a
         * division by zero exception, we'll return 0 which is essentially a no-op.
         *
         * @param graph Elroi graph object.
         * @returns {number} The percentage of the graph area needed for error/flags/etc.  If 100% or more of the graph
         *   area is required for labeling, a no-op of 0 is returned.
         */
        percentRangeOffsetNeededForLabeling: function(graph) {
            var totalPixelsNeeded = this.pixelsNeededForErrorMessages(graph)
                    + this.pixelsNeededForPointFlags(graph)
                    + this.pixelsNeededForX2Axis(graph),
                totalPixelsInGraph = graph.height - graph.padding.top - graph.padding.bottom;

            return (totalPixelsNeeded >= totalPixelsInGraph)
                ? 0
                : (totalPixelsInGraph / (totalPixelsInGraph - totalPixelsNeeded) - 1);
        },

        /**
         * Gets the maximum values for each series
         *
         * @throws {Error} Each max_i, min_i pair must have min_i be less than max_i.
         *
         * @param {Array} seriesDataValues Array of data values for each graph series [dataValues_1, dataValues_2, ...]
         * @param {Array} seriesOptions Array of options for each graph series [seriesOptions_1, seriesOptions_2, ...]
         * @param {Object} graph Elroi graph object.
         * @return {Array} The array of each values to use for scales & axes
         */
        adjustedMaxMinValues: function(seriesDataValues, seriesOptions, graph) {
            var calculatedMaxValues = this.maxValues(seriesDataValues, seriesOptions),
                calculatedMinValues = this.minValues(seriesDataValues, seriesOptions),
                calculatedPercentRangeOffsetNeededForLabeling = this.percentRangeOffsetNeededForLabeling(graph);

            calculatedMaxValues = $.map(calculatedMaxValues, function(maxValue, i) {
                var rangeOffset,
                    minValue = calculatedMinValues[i];

                // If maxValue and minValue are the same value it messes up a bunch of down stream calculations.  With
                // min and max both equal to 0 Elroi can get stuck in an infinite while loop while attempting to
                // calculate labels (which will hang the page) and with any other matching min-max values values it will
                // generate an error in the same block of code preventing the graph from rendering!
                //
                // It's important that this alteration occurs here because otherwise the rangeOffset and the distortion
                // to fit the graph under decoration (errors/pointFlags/x2labels) will break.  If the range is 0
                // rangeOffset will always be 0 and that means no adjustment to the axes to fit the graph under the
                // decoration will occur!
                //
                // Having a matching minimum and maximum doesn't really make very much sense in any case because if a
                // graphs y-axis' range was 0, the graph would be a line.
                //
                // FUTURE REFACTOR:
                //   If maxValue and minValue match the bottom axis line will assume be the value of minValue/maxValue.
                //   This makes quite a bit of sense for zero and for a negative value, but less sense for a positive
                //   value where it might make more sense to center the line to make it clear there was some amount of
                //   usage.  The visual tests (28683) demonstrate this.  In the case of minValue/maxValue being the same
                //   positive value, the flat line can be avoided by simply using zeroOrLess which will cause minValue
                //   to be 0 instead, avoiding this problem.
                if (maxValue === minValue) {
                    maxValue += 1;
                }

                if (maxValue < minValue) {
                    throw new Error("The min value for a series' data values should not be less than the max value");
                }

                rangeOffset = (maxValue - minValue) * calculatedPercentRangeOffsetNeededForLabeling;

                // Don't distort weather axis otherwise max value becomes 350 deg F. This is done by setting
                // dontDistortAxis = true in the series option.
                 return seriesOptions[i].dontDistortAxis
                     ? maxValue
                     : maxValue + rangeOffset;
            });

            return {maxValues: calculatedMaxValues, minValues: calculatedMinValues};
        },

        /**
         * Sets up an array of series specific options for each series to graph
         * @param {Array} allSeries An array of series, each with their own options
         * @param defaults Default options to merge in
         * @return {Array} seriesOptions
         */
        seriesOptions : function(allSeries, defaults) {
            // If there are no series, just send back the defaults
            if (! allSeries.length) {
                return [defaults];
            }

            return $.map(allSeries, function(singleSeries, i) {
                // Merge the individual series options with the default series settings
                return $.extend({}, true, defaults, singleSeries.options);
            });
        },

        buildDefaultTooltips : function(allSeries) {
            var tooltips = [];
            $(allSeries).each(function(i) {
                $(this.series).each(function(j) {
                    $(this).each(function(k) {
                        if (tooltips[k]) {
                            tooltips[k] += "<br/>" + this.value;
                        } else {
                            tooltips[k] = "" + this.value;
                        }
                    });
                });
            });
            return tooltips;
        },



        determineDateFormat : function(allSeries) {
            var firstPoint,
                lastPoint,
                firstPointDate,
                lastPointDate,
                numPoints = allSeries[0].series[0].length,
                MILLISECONDS_PER_DAY = 86400000,
                MILLISECONDS_PER_MONTH = 2678400000, // 31 day month
                MILLISECONDS_PER_YEAR = 31536000000,
                averageGap,
                format;

            firstPoint = allSeries[0].series[0][0];
            firstPointDate = new Date(firstPoint.endDate || firstPoint.date);
            lastPoint = allSeries[0].series[0][numPoints-1];
            lastPointDate = new Date(lastPoint.endDate || lastPoint.date);
            averageGap = (lastPointDate - firstPointDate);

            if (averageGap <= MILLISECONDS_PER_DAY) {
                format = "h:nna";
            } else if (averageGap < MILLISECONDS_PER_MONTH) {
                format = "M, d";
            } else if (averageGap < MILLISECONDS_PER_YEAR) {
                format = "M";
            } else {
                format = "yy";
            }

            return format;
        },

        dataCleaner : function(allSeries) {
            var cleanData = [],
                temp,
                i;

            if (allSeries[0] !== undefined && typeof(allSeries[0]) === "number") {
                // This is a single, flat array of data.  turn it into an elroi friendly object
                temp = { series: [[]]};
                for (i=0; i<allSeries.length; i++) {
                    temp.series[0].push({value: allSeries[i]});
                }
                cleanData.push(temp);
            } else {
                // Shit just got complicated
                if (!(allSeries instanceof Array)) {
                    // We have a single series passed in an object
                    if (!(allSeries.series[0] instanceof Array)) {
                        // this guy just has a single subseries
                        temp = { series: [], options: {}};
                        temp.series.push(allSeries.series);
                        temp.options = allSeries.options || {};
                        cleanData.push(temp);
                    } else {
                        cleanData = allSeries;
                    }
                } else if (allSeries[0] !== undefined && !(allSeries[0] instanceof Array)) {
                    if (allSeries[0].series === undefined) {
                        // Looks like we got an array of value objects
                        temp = { series: [] };
                        temp.series.push(allSeries);
                        cleanData.push(temp);
                    } else {
                        cleanData = allSeries;
                    }
                } else {
                    cleanData = allSeries;
                }
            }

            return cleanData;
        }
    };


    /**
     * Goes over the data series passed in, and sets things up for use by other elroi functions.
     * This adds the following properties to the graph object:
     * numPoints - The number of points on the graph
     * showEvery - This is used to suppress some points on the line graph, and some labels on the x-axis
     * xTicks - The number of x ticks on the graph per pixel
     * yTicks - an array of y ticks on the graph per pixel, per series
     * seriesOptions - an array of options per series, merged with the defaults
     * maxVals - an array of the maximum values of each series
     * minVals - an array of the minimum values of each series
     *
     * @see elroi
     * @param graph The initial graph object
     * @return graph The updated graph object containing the new values listed above
     */
    function init(graph) {

        var seriesOptions,
            adjustedMaxMinValues,
            maxVals,
            minVals,
            allSeriesDataValues,
            sums,
            hasData;

        graph.allSeries = elroi.fn.helpers.dataCleaner(graph.allSeries);

        seriesOptions = elroi.fn.helpers.seriesOptions(graph.allSeries, graph.options.seriesDefaults);
        allSeriesDataValues = elroi.fn.helpers.getDataValues(graph.allSeries, seriesOptions);
        sums = elroi.fn.helpers.sumSeries(allSeriesDataValues);
        hasData = elroi.fn.helpers.hasData(graph.allSeries);

        if (graph.options.dates.format === 'auto' && hasData) {
            graph.options.dates.format = elroi.fn.helpers.determineDateFormat(graph.allSeries);
        }

        // number of points comes from the first series - if there is no data, there are no points
        var numPoints = !hasData ? 1 : graph.allSeries[0].series[0].length;

        // start skipping points if we need to
        var showEvery = graph.options.showEvery ||
            ((numPoints > graph.options.skipPointThreshhold) ? Math.round(numPoints / graph.options.skipPointThreshhold) : 1);

        var availableGraphWidth = graph.width - graph.padding.left - graph.padding.right,
            availableGraphHeight = graph.height - graph.padding.top - graph.padding.bottom;

        var xTick = availableGraphWidth / numPoints,
            yTicks;

        // Figure out the label width
        var labelWidth = graph.options.labelWidth === 'auto'
            ? availableGraphWidth / (numPoints/showEvery) - 2 //padding of 2px between labels
            : graph.options.labelWidth;

        graph.options.labelWidth = labelWidth;

        adjustedMaxMinValues = elroi.fn.helpers.adjustedMaxMinValues(allSeriesDataValues, seriesOptions, graph);
        maxVals = adjustedMaxMinValues.maxValues;
        minVals = adjustedMaxMinValues.minValues;

        // Get the yTick per pixel of each series
        yTicks = $.map(allSeriesDataValues, function(singleSeriesDataValues, i) {
            var seriesAdjustedMaxMinRange = maxVals[i] + Math.abs(minVals[i]);
            return availableGraphHeight / seriesAdjustedMaxMinRange;
        });

        // Figure out bar width
        var barWidth = xTick * 2/3; // 2/3 is magic number for padding between bars
        var barWhiteSpace = xTick / 6; // 1/6 + 2/3 + 1/6 = 1

        // Merge new graph object with the default graph object
        $.extend(graph, {
            hasData : hasData,
            seriesOptions: seriesOptions,
            dataValuesSet: allSeriesDataValues,
            maxVals: maxVals,
            minVals: minVals,
            sums: sums,
            numPoints: numPoints,
            showEvery: showEvery,
            xTick: xTick,
            yTicks: yTicks,
            labelWidth: labelWidth,
            barWidth: barWidth,
            barWhiteSpace: barWhiteSpace
        });

        if (graph.options.tooltip.show && graph.tooltips === undefined) {
            graph.tooltips = elroi.fn.helpers.buildDefaultTooltips(graph.allSeries);
        }

        return graph;
    }

    elroi.fn.helpers = helpers;
    elroi.fn.init = init;

})(elroi, jQuery);
(function(elroi, $) {

    /**
     * This function creates the grid that is used by the graph
     * @param {graph} graph The graph object defined by elroi
     * @return {function} draw Draws the grid, x-axis, and y-axes
     */
    function grid(graph) {

        /**
         * Goes through the first series in a data set and creates a set of labels for the x-axis
         * @param data All series to be graphed
         * @param {String} dateFormat
         * @return {Array} xLabels An array of correctly formatted labels for the x-axis
         */
        function getXLabels(series, dateOptions) {

            var xLabels = [];

            $(series).each(function() {
                var label,
                    startDate,
                    endDate;

                if (this.startDate) {
                    startDate = new Date(this.startDate);
                }

                if (this.endDate || this.date) {
                    endDate = this.endDate ? new Date(this.endDate) : this.date;
                }

                label = elroi.fn.formatDateRange(dateOptions.format, startDate, endDate, dateOptions);

                xLabels.push(label);
            });

            return xLabels;
        }

        /**
         * Draws the gridlines based on graph.grid.numYLabels
         */
        function drawGrid() {
            //draw the gridlines
            var i, y,
                gridLine,
                gridLines = graph.paper.set(),
                avalaibleArea = graph.height - graph.padding.top - graph.padding.bottom;

            if (graph.options.grid.show) {
                for (i = 0; i < graph.options.grid.numYLabels; i++) {
                    y = graph.height -
                        i / (graph.options.grid.numYLabels - 1) * avalaibleArea -
                        graph.padding.bottom +
                        graph.padding.top;
                    gridLine = graph.paper.path("M0" + " " + y + "L" + graph.width + " " + y).attr('stroke', '#ddd');
                    gridLines.push(gridLine);
                }
            } else if (graph.options.grid.showBaseline) {
                y = graph.height -
                    graph.padding.bottom +
                    graph.padding.top;
                gridLine = graph.paper.path("M0" + " " + y + "L" + graph.width + " " + y).attr('stroke', '#ddd');
                gridLines.push(gridLine);
            }

            graph.grid = {
                lines: gridLines
            };
        }

        /**
         * Draws the x-axis
         * @param axis An axis object as defined in the elroi options
         */
        function drawXLabels(axis) {

            var $labels, axisY;

            if (axis.id === 'x1') {
                axisY = graph.height;
            } else if (axis.id === 'x2') {
                axisY = graph.padding.top;
            }

            if (axis.customXLabel) {
                $labels = $(axis.customXLabel);
            } else {

                $labels = $('<ul></ul>')
                    .addClass('x-ticks')
                    .addClass(axis.id);

                $(axis.labels).each(function(i) {
                    if (i % graph.showEvery === 0) {
                        var x = i * graph.xTick + graph.padding.left;
                        var label = (axis.labels[i].replace(/^\s+|\s+$/g, '') || '');

                        $('<li></li>')
                            .css({top: axisY, left: x})
                            .html(label)
                            .appendTo($labels);
                    }
                });
            }


            // Get those labels centered relative to their bar
            $labels.find('li').each(function() {
                var $label = $(this);
                var x = parseInt($label.css('left'), 10) + ($label.width())/2;

                $label.css({ left: x, width: graph.labelWidth });

                if (axis.id === 'x2') {
                    $label.css( { top: axisY + $labels.height() + graph.padding.top });
                }
            });

            $labels.appendTo(graph.$el);

        }

        /**
         * Takes in a maximum value and a precision level, and returns an array of numbers for use in the y label
         *
         * @param {number} maxVal The maximum value in a dataset
         * @param {number} precision The number of digits to show
         * @return {Array} yLabels A set of labels for the y axis
         */
        function getYLabels(maxVal, minVal, precision) {
            var yLabels = [],
                i;

            for (i = 0; i < graph.options.grid.numYLabels; i++) {

                var yLabel = i / (graph.options.grid.numYLabels-1) * (maxVal - minVal) + minVal;

                yLabel = (yLabel === 0) ? '0' : yLabel.toFixed(precision); /* Don't show 0.00... ever */

                // (-.23).toFixed(0) will produce '-0', which we don't want
                yLabel = yLabel === '-0' ? '0' : yLabel;

                yLabels.push(yLabel);

            }
            return yLabels;
        }

        // visible for testing
        elroi.fn.helpers.getYLabels = getYLabels;

        /**
         * This draws either the y1 or y2 axis, depending on the series data
         * @param {int} seriesDataIndex The index of the data series associated to this y-axis
         * @param {number} maxVal The maximum value in the data series
         * @param {number} minVal The minimum value in the data series
         * @param {String} unit The units of the data
         */
        function drawYLabels(maxVal, minVal, axis) {

            // Draw the y labels
            var $yLabels = $('<ul></ul>')
                .addClass("y-ticks")
                .addClass(axis.id);

            var precision = graph.options.precision,
                thousandsSeparator = graph.options.thousandsSeparator,
                decimalSeparator = graph.options.decimalSeparator,
                yLabels = getYLabels(maxVal, minVal, precision),
                avalaibleArea = graph.height - graph.padding.top - graph.padding.bottom,
                maxYLabelWidth = 0;

            //When using dynamic padding, provide an additional 3px cushion so text doesn't butt up against content
            var MINIMUM_LEFT_PADDING = 3;

            while(containsDuplicateLabels(yLabels)) {
                precision++;
                yLabels = getYLabels(maxVal, minVal, precision);
            }

            $(yLabels).each(function(i) {
                var yLabel = commaFormat(yLabels[i], precision, thousandsSeparator, decimalSeparator);
                var li;
                var y = graph.height -
                    i / (graph.options.grid.numYLabels - 1) * avalaibleArea -
                    graph.padding.bottom +
                    graph.padding.top -
                    graph.labelLineHeight;

                // Topmost ylabel gets a different unit
                if (i === graph.options.grid.numYLabels-1) {
                    yLabel = graph.options.topLabelFormatter(yLabel,axis);
                } else {
                    yLabel = graph.options.labelFormatter(yLabel,axis);
                }

                // y1 labels go on the left, y2 labels go on the right
                var cssPosition;
                if (axis.id === 'y1') {
                    cssPosition = { 'top' : y, 'left' : 0 };
                }
                if (axis.id === 'y2') {
                    cssPosition = { 'top' : y, 'right' : 0 };
                }

                $('<li></li>')
                    .css(cssPosition)
                    .html(yLabel)
                    .appendTo($yLabels);
            });

            $yLabels.appendTo(graph.$el);

            if (graph.options.dynamicLeftPadding) {
                $yLabels.children().each(function(index, label) {
                    if ($(label).width() > maxYLabelWidth) {
                        maxYLabelWidth = $(label).width();
                    }
                });

                if (graph.padding.left < maxYLabelWidth) {
                    graph.padding.left = maxYLabelWidth + MINIMUM_LEFT_PADDING;
                }
            }
        }

        /**
         * Calls all other draw methods
         */
        function draw() {

            drawGrid();
            var seriesIndex;

            // Can't get any axes if we don't have any data
            if (!graph.hasData) {
                return;
            }

            if (graph.options.axes.y1.show) {
                drawYLabels(graph.maxVals[graph.options.axes.y1.seriesIndex], graph.minVals[graph.options.axes.y1.seriesIndex], graph.options.axes.y1);
            }
            if (graph.options.axes.y2.show) {
                drawYLabels(graph.maxVals[graph.options.axes.y2.seriesIndex], graph.minVals[graph.options.axes.y2.seriesIndex], graph.options.axes.y2);
            }

            if (graph.options.axes.x1.show) {
                if (!graph.options.axes.x1.labels || graph.options.axes.x1.labels.length === 0) {
                    seriesIndex = graph.options.axes.x1.seriesIndex;
                    graph.options.axes.x1.labels= getXLabels(graph.allSeries[seriesIndex].series[0], graph.options.dates);
                }
                drawXLabels(graph.options.axes.x1);
            }
            if (graph.options.axes.x2.show && graph.hasData) {
                if (!graph.options.axes.x2.labels || graph.options.axes.x2.labels.length === 0) {
                    seriesIndex = graph.options.axes.x2.seriesIndex;
                    graph.options.axes.x2.labels = getXLabels(graph.allSeries[seriesIndex].series[0], graph.options.dates);
                }
                drawXLabels(graph.options.axes.x2);
            }

        }

        return {
            draw : draw
        };
    }

    function containsDuplicateLabels(arr) {
        var i, j, n;
        n= arr.length;

        for (i=0; i<n; i++) {
            for (j=i+1; j<n; j++) {
                if (arr[i] === arr[j]) {
                    return true;
                }
            }
        }
        return false;
    }

    // visible for testing
    elroi.fn.helpers.containsDuplicateLabels = containsDuplicateLabels;

    function commaFormat (num, precision, thousandsSeparator, decimalSeparator) {
        var splitNum,
            preDecimal,
            postDecimal,
            rgx = /(\d+)(\d{3})/;

        thousandsSeparator = thousandsSeparator || ' ';
        decimalSeparator = decimalSeparator || ' ';

        /* Don't show 0.00... ever */
        if (num === '0') {
            return '0';
        }

        if (precision) {
            num = parseFloat(num); // Make sure this is a number
            num = precision === 'round' ? Math.round(num) : num.toFixed(precision);
        }

        // stringify it
        num += '';

        splitNum = num.split('.');

        preDecimal = splitNum[0];
        postDecimal = splitNum[1] ? decimalSeparator + splitNum[1] : '';

        while (rgx.test(preDecimal)) {
            preDecimal = preDecimal.replace(rgx, '$1' + thousandsSeparator + '$2');
        }

        return preDecimal + postDecimal;
    }

    // visible for testing
    elroi.fn.helpers.commaFormat = commaFormat;

    elroi.fn.grid = grid;

})(elroi, jQuery);
(function(elroi) {

    /**
     * Creates a line graph for a particulary series of data
     * @param {graph} graph The graph object defined in elroi
     * @param {series} series The series to graph as a line graph
     * @param {int} seriesIndex The index of this series
     * @return {function} draw Draws the line on the graph
     */
    function lines(graph, series, seriesIndex) {

        // points on the graph are centered horizontally relative to their labels
        var pointOffsetX = 0.5 * graph.labelWidth,
            yTick = graph.yTicks[seriesIndex],
            seriesOptions = graph.seriesOptions[seriesIndex],
            calculatedPointRadius = calculatePointRadius(graph.xTick,
                graph.options.lines.pointStrokeWidth,
                graph.options.lines.pointRadius),
            pointOffsetY = (calculatedPointRadius)
                ? (calculatedPointRadius + graph.options.lines.pointStrokeWidth * .5) : 0;

        /**
         * Intelligently determines a radius for the points in the line graph.  If the point will overflow from its
         * column the radius is reduced to a minimum of 0px.  A calculated radius will never be larger than the radius
         * specified in the options.
         * @param xTick - width of column point should fit in
         * @param pointStrokeWidth - the stroke-width of the point
         * @param pointRadius - the desired radius of the point
         * @return {Number}
         */
        function calculatePointRadius(xTick, pointStrokeWidth, pointRadius) {
            var MINIMUM_SPACING = 1, //We want at least 1px between points
                calculatedPointRadius = (xTick - MINIMUM_SPACING- pointStrokeWidth) / 2;

            return (calculatedPointRadius < 0) ? 0                      //Radius must be 0 or greater
                : (calculatedPointRadius > pointRadius) ? pointRadius   //Calculated cannot be bigger than original
                : calculatedPointRadius;
        }

        //Add to helpers for unit testing
        elroi.fn.helpers.calculatePointRadius = calculatePointRadius;

        /**
         * Draws a single point
         * @param {Number} x - The x coordinate of the point
         * @param {Number} y - The y coordinate of the point
         * @param {Number} value - The value of that particular point (used for labeling)
         * @param {String} color - Color to draw the point in
         * @parama {Boolean} fillPoint - If the point should be filled with its color
         * @param {String} clickTarget - The url where the point should link to if clicked
         * @param {Boolean} animate - If the point should be animated.
         */
        function drawPoint(x, y, value, color, fillPoint, clickTarget, animate, stroke) {
            var point;

            function conditionallyFillPoint() {
                if (fillPoint) {
                    point.attr({fill: color});
                }
            }

            if (stroke) {
                // Draw point with stroke and other features, optionally animating it.

                var pointAttributes = {
                    'stroke': color,
                    'stroke-width': graph.options.lines.pointStrokeWidth,
                    'fill': '#fff'
                };

                if (animate) {

                    // Draw the point
                    point = graph.paper.circle(x, y, 0).attr(pointAttributes);

                    conditionallyFillPoint();

                    point.animate({r: calculatedPointRadius}, 500, 'bounce');
                }
                else {

                    // Draw the point
                    point = graph.paper.circle(x, y, calculatedPointRadius).attr(pointAttributes);

                    conditionallyFillPoint();

                }

                $(point.node).click(function() {
                    if (clickTarget) {
                        document.location = clickTarget;
                    }
                });

                if (clickTarget) {
                    $(point.node).hover(
                        function() {
                            point.node.style.cursor = "pointer";
                        },
                        function() {
                            point.node.style.cursor = "";
                        }
                    );
                }

            }
            else {
                // Draw simple point

                graph.paper.circle(x, y, graph.options.lines.width).attr({
                    stroke: 'none',
                    'fill': color
                });
            }

        }

        /**
         * Draws labels on a point
         * @param {Number} x X coordinate of the point
         * @param {Number} y Y coordinate of the point
         * @param {Int} pointNumber The index of the point in its series
         * @param {Number} value The value of the point
         * @param {String} units The unit to append to the label
         * @param {String} color Color of the point label
         */
        function drawPointLabel(x, y, pointNumber, value, units, color) {
            var isOffGraph = graph.height - graph.labelLineHeight < y,
                isInSetToShow = pointNumber % graph.showEvery === 0;

            if (!isOffGraph && isInSetToShow) {
                var pointLabel = document.createElement("span");
                $(pointLabel).addClass('elroi-point-label').html(Math.round(value) + " " + units).css({
                    'left': x - pointOffsetX,
                    'top': y + pointOffsetY,
                    'width': graph.labelWidth,
                    'color': color
                });
                graph.$el.find('.paper').append(pointLabel);
            }
        }

        /**
         * Recursive function to draw a single series from start to end, one segment at a time
         * @param {Array} series - The series to draw as a line
         * @param {int} index - The current point being drawn
         * @param {Raphael Object} line - The line as it has currently been drawn
         * @param prevPoint - An object containing the x & y coordinates of the previous point plotted for this line
         * @param {Boolean} isLineFilled - Weather or not the line should be filled
         * @param {String} color - Color of the line
         * @param {Boolean} isLineStarted
         */

        function drawLine(args) {

            var series=args.series,
                index=args.index || 0,
                line=args.line,
                prevPoint=args.prevPoint,
                isLineFilled=args.isLineFilled,
                color=args.color,
                isLineStarted=args.isLineStarted,
                currentPath=args.currentPath || '',
                units=args.units;


            // End recursion once you've hit the last point
            if (index === series.length) {
                return true;
            }

            var isNullPoint = !(series[index].value || series[index].value === 0);

            var x = index * graph.xTick + graph.padding.left + pointOffsetX,
                y = graph.height - ((series[index].value - graph.minVals[seriesIndex]) * yTick) - graph.padding.bottom + graph.padding.top,
                pathString = "",
                animSpeed = (window.isIE6 ? 1 : 800)/series.length,
                isFirstPoint = !index;

            // If we aren't interpolating nulls, don't draw from the previous null point
            if (!prevPoint && !(seriesOptions.interpolateNulls || seriesOptions.type === 'step')) {
                isLineStarted = false;
            }

            // If the startpoint is at the left edge, pick up the pen and move there.  Otherwise, draw, skipping null points
            if (!isFirstPoint && isLineStarted && !isNullPoint) {
                pathString = seriesOptions.type === 'step' ?
                    "L" + x + " " + prevPoint.y + "L" + x + " " + y  :
                    "L" + x + " " + y;
            } else if (isNullPoint && !isFirstPoint) {
                pathString = "";
            }
            else {
                pathString = "M" + x + " " + y;

            }

            // The line is started once we hit our first non-null point
            if (!isLineStarted && !isNullPoint) {
                isLineStarted = true;
            }

            var thisPoint;
            if (seriesOptions.interpolateNulls || seriesOptions.type === 'step') {
                thisPoint = isNullPoint ? prevPoint : {x:x, y:y};
            } else {
                thisPoint = isNullPoint ? null : {x:x, y:y};
            }

            if (isLineFilled) {
                // Fill in this segment if there aren't nulls
                if (prevPoint && !isNullPoint) {
                    var yZero = graph.height - graph.padding.bottom + graph.padding.top,
                        fillLineStartPath = "M" + prevPoint.x + " " + yZero +
                            "L" + prevPoint.x + " " + prevPoint.y +
                            "L" + prevPoint.x + " " + prevPoint.y +
                            "L" + prevPoint.x + " " + yZero,
                        fillLinePath = "M" + prevPoint.x + " " + yZero +
                            "L" + prevPoint.x + " " + prevPoint.y +
                            "L" + x + " " + y +
                            "L" + x + " " + yZero;

                    var fillLine = graph.paper.path(fillLineStartPath).attr({
                        'fill':color,
                        'stroke-width': 0,
                        'fill-opacity':graph.options.lines.fillOpacity,
                        'stroke' : 'transparent'
                    });

                    fillLine.animate({path: fillLinePath}, animSpeed);
                    fillLine.insertAfter(graph.grid.lines);
                }
            }


            function pointsAndLabels() {
                if (!isNullPoint) {
                    if (seriesOptions.showPoints) {
                        drawPoint(
                            x, y,
                            series[index].value,
                            color,
                            seriesOptions.fillPoints,
                            series[index].clickTarget,
                            seriesOptions.animatePoints,
                            seriesOptions.pointStroke);
                    }

                    if (seriesOptions.labelPoints) {
                        drawPointLabel(x, y, index, series[index].value, units, color);
                    }
                }
            }

            if (graph.options.animation) {
                line.animate({
                    path: currentPath + pathString
                }, animSpeed, function() {
                    pointsAndLabels();
                    drawLine({
                        series:series,
                        index:index + 1,
                        line:line,
                        prevPoint:thisPoint,
                        isLineFilled:isLineFilled,
                        color:color,
                        isLineStarted:isLineStarted,
                        currentPath:currentPath + pathString,
                        units:units
                    });
                });
            } else {
                line.attr('path', currentPath + pathString);
                pointsAndLabels();
                drawLine({
                    series:series,
                    index:index + 1,
                    line:line,
                    prevPoint:thisPoint,
                    isLineFilled:isLineFilled,
                    color:color,
                    isLineStarted:isLineStarted,
                    currentPath:currentPath + pathString,
                    units:units
                });
            }

        }

        var currentHighlights = graph.paper.set(); // A set of raphael objects for highlighting hovers
        graph.$el.mouseleave(function() {
            // Hide the highlights if the mouse leaves the graph
            currentHighlights.attr('opacity', 0);
        });

        /**
         * This will draw an invisible bar over the entire dataset for a given x-coordinate to serve as a target for the rollover
         * @param series A single series of data
         * @param {number} yTick The yTick scale for this data series
         * @param {Int} index The index of the x-label.  Used to draw the hover target area over one x-label for all series
         * @param seriesOptions Series options of the graph
         */
        function lineHover(series, yTick, index, seriesOptions) {

            var x = (index * graph.xTick + graph.padding.left) - (graph.xTick/2) + pointOffsetX,
                y = 0,
                pointsInSet = [],
                highlights = graph.paper.set();

            $(series).each(function(i) {
                // skip any null points
                if (series[i][index].value || series[i][index].value === 0) {
                    pointsInSet.push(series[i][index].value);
                    var highlightX = index * graph.xTick + graph.padding.left + pointOffsetX;
                    var highlightY = graph.height - ((series[i][index].value - graph.minVals[seriesIndex]) * yTick) - graph.padding.bottom + graph.padding.top;

                    var highlightCirc = graph.paper.circle(highlightX, highlightY, graph.options.lines.highlightRadius).attr({
                        'stroke': '#ccc',
                        'stroke-width': graph.options.lines.highlightStrokeWidth,
                        'opacity': 0
                    });

                    highlights.push(highlightCirc);
                }

            });
            var topPoint = Math.max.apply(Math, pointsInSet);

            // Pull the tooltip up to 0 if the graph drops below the x-axis
            if (topPoint - graph.minVals[seriesIndex] < 0) {
                topPoint = graph.minVals[seriesIndex];
            }

            var errorHeight = graph.options.error ? graph.options.error.height + graph.options.error.top : 0,
                rollOverBar = graph.paper.rect(x, y + errorHeight, graph.xTick, graph.height-errorHeight).attr('fill', 'white').attr('opacity', 0);

            rollOverBar.mouseover(function() {

                // Show the tooltip
                if (graph.options.tooltip.show) {
                    var x = index * graph.xTick + graph.padding.left + pointOffsetX - graph.options.tooltip.width / 2;
                    var y = ((topPoint - graph.minVals[seriesIndex]) * yTick) - graph.padding.top + graph.padding.bottom + graph.options.flagOffset + graph.options.lines.pointStrokeWidth + graph.options.lines.highlightRadius;

                    graph.$tooltip.stop().animate({
                        bottom: y,
                        left: x
                    }, 1, function() {
                        var tipContentHTML = graph.options.tooltip.formatter(graph.tooltips[index], graph.options.messages),
                            $toolTipContent = graph.$tooltip.find('.elroi-tooltip-content').html(tipContentHTML),
                            $toolTipContainer = $toolTipContent.find('.elroi-tooltip-container');

                        // The toolTipContainer has a default minimum width.  If the actual content is wider than that, then
                        // we need to widen the container to fit the content plus a 20 pixel margin.
                        if ($toolTipContainer && $toolTipContainer.width() > graph.options.tooltip.width) {
                            graph.$tooltip.width($toolTipContainer.width() + 20);
                        }
                    });
                }

                currentHighlights.attr('opacity', 0);
                highlights.attr('opacity', graph.options.lines.highlightOpacity);
                currentHighlights = highlights;

            });

            return rollOverBar;
        }

        /**
         * Draws all of the lines, points, and rollovers for a given data series
         */
        function drawAllLines() {
            var j;

            for (j=0; j< series.length; j++) {
                var color = graph.options.colors[j+seriesIndex],
                    line = graph.paper.path("M0 0").attr({
                        'stroke': color,
                        'stroke-width': graph.options.lines.width,
                        'opacity': graph.options.lines.opacity
                    });

                drawLine({
                    series:series[j],
                    line:line,
                    isLineFilled:graph.seriesOptions[seriesIndex].fillLines,
                    color:color,
                    units:graph.seriesOptions[seriesIndex].pointLabelUnits
                });


            }

            // Add rollovers
            var rollOvers = graph.paper.set();
            for (j=0; j< graph.numPoints; j++) {
                if (graph.tooltips && graph.tooltips[j]) {
                    rollOvers.push(lineHover(series, graph.yTicks[seriesIndex], j, graph.seriesOptions[seriesIndex]));
                }
            }
            rollOvers.toFront();
        }

        return {
            draw : drawAllLines
        };
    }

    elroi.fn.line = lines;
    elroi.fn.step = lines;

})(elroi);
(function(elroi, $) {

    /**
     * Draws a pie chart that provides dynamic resizing and the ability to hook in events.
     * @param graph The graph object defined in elroi
     * @param series The series of data
     * @param {int} seriesIndex The index of the pie graph data in the graph's allSeries array.  Multiple series don't
     *              make sense in this case.  Any multi-series data sets may provide unexpected results.
     * @return {object} edges - the collection of wedges that make up this pie
     *                  draw -  the method to draw the pie graph.
     */
    function pie(graph, series, seriesIndex) {
        /* If full set of graph options wasn't provided, then fill in graph.options with defaults.
         * We update the graph.options object with calculated values so we have a way to determine outside of Elroi
         * things like the center of a pie graph if we didn't specify it ourselves.
         * */
        var pieOptions = graph.options.pie = graph.options.pie || {};
        var center = pieOptions.center = pieOptions.center || {
            x : (graph.width + graph.padding.left - graph.padding.right)/2,
            y : (graph.height - graph.padding.bottom + graph.padding.top)/2
        };
        var RADIUS = pieOptions.radius =
            pieOptions.radius || (graph.height - graph.padding.bottom + graph.padding.top)/ 2;
        var INNER_RADIUS = pieOptions.innerRadius = pieOptions.innerRadius || pieOptions.radius/2;
        var wedgeAttributes = pieOptions.wedgeAttributes = pieOptions.wedgeAttributes || {};
        var pieHoleAttributes = pieOptions.pieHoleAttributes = pieOptions.pieHoleAttributes || {};

        var LOAD_ANIMATION_PROMISE;

        var wedgeEventsEnabled,
            wedgeEventsEnabledCounter = 0;

        var hitShield;

        /*Ext holds extension functions specific to the pie.  They are merged into the parent namespace making
         them publicly accessible at the level of the elroi object. */
        graph.ext = {};

        var DEFAULT_ROTATION = -90; //current rotation of the pie

        /* Raphael transform constants */
        var CENTER_COORDINATES = center.x + ',' + center.y,
            S11 = 's1,1';

        /* Set to store wedge paths */
        var wedges = graph.paper.set();
        var passThroughWedge = null; //wedge under the circle at the point of the mouse.  Null represents no current pass-through wedge.

        var pieHole; //Static part of message, in default case under circle and over hit circle for mouse detection.
        var messageContainer; //div that is layered
        var selectedWedge; //The selected wedge, a selection change is triggered by clicking a wedge

        /* Mathematical constants */
        var DEGREES_TO_RADIANS = Math.PI / 180;

        /**
         * Custom attribute for raphael that will create a pie wedge based on the following attributes.
         * @param x {number} X coordinate of the center of the pie.
         * @param y {number} Y coordinate of the center of the pie.
         * @param r {number} The radius of the pie wedge.
         * @param a1 {number} Start angle of wedge in degrees.
         * @param a2 {number} End angle of wedge in degrees.
         * @param [self] {object} Raphael object that this segment is being altered for.  Typically 'this' can be used
         *   but in the case the radius customAttribute (which calls segment), 'this' is not the wedge and it must be
         *   provided.
         * @return {object} Path attribute for attachment to a Raphael object.
         */
        graph.paper.customAttributes.segment = function (x, y, r, a1, a2, self) {

            /* Mathematical constants */
            var angle = a2 - a1,
                largeArcFlag = +(angle > 180);

            /* Set self either using this which typically is the case or self if segment is called from radius. */
            self = self || this;

            /* Update the r attribute on our path so it's consistent with the new radius */
            if (self.attrs) {
                self.attrs.radius = r;
            }

            /* Hide a wedge if it is 0% of the pie, this prevents ie8 quirkiness and a wedge of 0% from being selected
             * by hovering over its border. */
            if (angle===0) {
                self.hide();
            } else if (self.node.style.display !== "") { /* Use same method as Raphael to check if its already shown. */
                self.show();
            }

            a1 = (a1 % 360) * DEGREES_TO_RADIANS;
            a2 = (a2 % 360) * DEGREES_TO_RADIANS;

            return {
                path: [['M', x, y],
                    ['l', r * Math.cos(a1), r * Math.sin(a1)],
                    ['A', r, r, 0, largeArcFlag, 1, x + r * Math.cos(a2), y + r * Math.sin(a2)],
                    ['z']]
            };
        };

        /**
         * Custom attribute for raphael that will alter the radius of a wedge; allows for short-handing the longer
         * customAttributes.segment call when the radius is the only change to the path.
         * @param r {number} The new radius of the pie wedge.
         * @return {object} Path attribute for attachment to a Raphael object.
         */
        graph.paper.customAttributes.radius = function (r) {

            var segment = this.attrs.segment;
            segment[2] = r; // Update the segment attribute (segment[2]) so it's consistent with the new radius

            return graph.paper.customAttributes.segment(segment[0], segment[1], r, segment[3],segment[4], this);
        };

        /**
         * Animation pie from initial radius of 1 to full value.  May eventually provide this as a callback instead.
         * @param [ms] {number} The duration of tha Raphael animation
         * @return jQuery promise that resolves when the load animation is complete
         */
        function loadAnimation(ms) {
            wedgeEventsDisable();
            return graph.animateJQP(wedges, [
                    {radius: RADIUS, transform: [S11+CENTER_COORDINATES+'r'+ DEFAULT_ROTATION +','+CENTER_COORDINATES]},
                    ms || 1500,
                    'backOut'])
                .always(regenerateTransformedWedgePaths, wedgeEventsEnable);
        }

        /**
         * Recalculates wedge sizes and animates (if enabled) pie to new proportion.  Run after updating series data.
         * @param [ms] {number} The duration of tha Raphael animation
         * @return {object} jQuery deferred object that resolves after the resize animation, or immediately if animation
         *     is flagged off.
         */
        function resize(ms) {
            var start = 0, // current angle offset
                total = graph.sums[seriesIndex],
                data = series[seriesIndex],
                $deferreds = [];

            var i, //current index of data for traversal of data
                dataLength = data.length; //length of data for traversal of data

            var wedgeSize, //In degrees
                newAttributes; //New segment and transform attributes for Raphael

            wedgeEventsDisable();

            for (i = 0; i < dataLength; i++) {
                wedgeSize = 360 / total * data[i].value;
                newAttributes = {segment: [center.x, center.y, wedges[i].attr('radius'), start, start += wedgeSize]};

                wedges[i].data = data[i]; //update data tied to each wedge

                if (graph.options.animation) {  //either animate transition of flatly update
                    $deferreds.push(graph.animateJQP(wedges[i], [newAttributes, ms || 750, 'backOut']));
                } else {
                    wedges[i].attr(newAttributes);
                }
            }

            return $.when.apply(null, $deferreds)
                .always(regenerateTransformedWedgePaths, wedgeEventsEnable);
        }

        /**
         * Either clears the selectedWedge or sets it to a new value.  Does not cause wedgeSelectionChanged event!
         * @param [wedge] {object} Raphael wedge from the current pie to update the selectedWedge to.
         */
        function resetSelectedWedge(wedge) {
            if (wedge) {
                selectedWedge = wedge;
            } else {
                selectedWedge = null;
            }
        }
        /**
         * Returns whether or not a wedge is the selected wedge.
         * @param wedge {object} Raphael object of the wedge to compare to the selectedWedge
         * @return {boolean} true if the selectedWedge is the same object as wedge
         */
        function isSelectedWedge(wedge) {
            return (wedge === selectedWedge);
        }
        /**
         * Checks whether or not a clicked on wedge is different than the wedge that was previously the selectedWedge.
         * Triggers a wedgeSelectionChanged event if one was provided.
         * @param [wedge] {object} Raphael wedge from the current pie that is the new selectedWedge.
         */
        function updateSelectedWedge(wedge) {
            var previouslySelectedWedge;

            if (selectedWedge === wedge) {
                return;
            } else {
                previouslySelectedWedge = selectedWedge;
                selectedWedge = wedge;

                if (graph.options.pie.wedgeSelectionChanged) {
                    graph.options.pie.wedgeSelectionChanged(previouslySelectedWedge, selectedWedge);
                } else {
                    /* DEFAULT BEHAVIOR */
                    getMessageContainer().empty();
                    rotateToWedge(wedge)
                        .done((!pieOptions.disableDefaultLabeling) ? drawDefaultLabeling : null);
                }
            }
        }

        /**
         * Draws a pie chart and provides appropriate styling and callback hooks.
         */
        function drawPie() {

            /**
             * Wrapper function that calls a user provided method (if one is provided) for a click event on a wedge, or
             * by default rotateToWedge.
             * @param wedge {object} Raphael element for the clicked wedge
             */
            function wedgeClick(wedge) {
                if (wedgeEventsEnabled) {

                    if (graph.options.pie.wedgeClick) {
                        graph.options.pie.wedgeClick(wedge);
                    }

                    updateSelectedWedge(wedge);
                }
            }

            /**
             * Wrapper function that calls a user provided method (if one is provided) for a hover entered event on a
             * wedge.
             * @param e {Object} Mouse event object
             * @param wedge {object} Raphael element for the entered wedge
             */
            function wedgeEnter(e,wedge) {
                if (wedgeEventsEnabled) {
                    if (graph.options.pie.wedgeHoverIn) {
                        graph.options.pie.wedgeHoverIn(e,wedge);
                    } else {
                        /* DEFAULT BEHAVIOR */
                    }
                }
            }

            /**
             * Wrapper function that calls a user provided method (if one is provided) for a hover exit event on a
             * wedge.
             * @param e {Object} Mouse event object
             * @param wedge {object} Raphael element for the exited wedge
             */
            function wedgeExit(e,wedge) {
                if (wedgeEventsEnabled) {
                    var i;
                    if (graph.options.pie.wedgeHoverOut) {
                        graph.options.pie.wedgeHoverOut(e,wedge);
                    } else {
                        /* DEFAULT BEHAVIOR */
                    }
                }
            }

            /**
             * Draws a wedge to the Raphael paper and attaches mouse events.
             * @return {Object} the wedge that was drawn
             */
            function generateWedge() {
                var wedge = graph.paper.path()
                    .click(function(e) { wedgeClick(wedge); })
                    .hover(function(e) { wedgeEnter(e,wedge); },
                    function(e) { wedgeExit(e,wedge); });
                return wedge;
            }

            var start = 0,
                total = graph.sums[seriesIndex],
                data = series[seriesIndex],
                dataLength = data.length,
                i,
                wedge,
                val; //current index of data for traversal of data

            for (i = 0; i < dataLength; i++) {
                val = 360 / total * data[i].value;

                wedge = generateWedge()
                    .attr({fill: graph.options.colors[i % graph.options.colors.length]})
                    .attr(wedgeAttributes);

                wedge.data = data[i];

                /*If a wedge has custom element attributes, attach them. This is used to allow data-test
                 * attributes to be attached to individual elements. */
                if (wedge.data.customElementAttributes) {
                    $(wedge.node).attr(wedge.data.customElementAttributes);
                }

                if (graph.options.animation) {
                    wedge.attr({segment: [center.x, center.y, 1, start, start + val]});
                } else {
                    wedge.attr({segment: [center.x, center.y, RADIUS, start, start + val],
                        transform: [S11+CENTER_COORDINATES+'r'+ DEFAULT_ROTATION +','+CENTER_COORDINATES]});
                }

                wedge.data.offset = start;
                wedge.data.degrees = val;

                wedges.push(wedge);

                start += val;
            }

            if (graph.options.animation) {
                LOAD_ANIMATION_PROMISE = loadAnimation(1000);

                if(!pieOptions.disableDefaultLabeling) {
                    LOAD_ANIMATION_PROMISE.done(drawDefaultLabeling);
                }
            }

            if(pieOptions.drawPieHole) {
                pieHole = graph.paper
                    .circle(center.x, center.y, INNER_RADIUS)
                    .attr({fill: 'white'})
                    .attr(pieHoleAttributes).hide();
            }

            graph.$el.addClass('piechart');
            messageContainer = $('<div></div>').addClass('text-container').prependTo(graph.$el);

            pieOptions.usePassThrough && generateHitShield();
        }

        /**
         * Creates a hit shield for the pie.  The hit shield is a transparent Raphael overlay that passes  wedges from
         * losing focus when mousing over the donut or text.  This makes developing an interactive pie that has labels
         * or Raphael object overlays (pie hole) on top of the pie possible.
         */
        function generateHitShield() {
            var hitShieldContainer,
                PIE_HOLE_STROKE_WIDTH = pieHoleAttributes['stroke-width'] || 0,
                PIE_HOLE_CURSOR = pieHoleAttributes['cursor'] || 'auto';

            /**
             *  Handles determination of which wedge is under the donut hole so that events can be passed to that wedge.
             *  If the passthrough wedge changes a wedgeHoverIn event is passed to the receiving wedge.
             *  @param e {Object} Mouse move event.
             */
            function hitShieldMouseMove(e) {
                var newWedge, //used to store new wedge if it is detected the passThroughWedge has changed
                    i,
                    wedgesLength = wedges.length,
                    passthoughWedgeIndex = (passThroughWedge !== null) ? getWedgeIndex(passThroughWedge) : -1;

                //Most likely we are in the same wedge, so check that first and skip the rest of the heavy lifting
                if (passthoughWedgeIndex !== -1 && graph.isMouseInPath(e, transformedWedgePaths[passthoughWedgeIndex])) {
                    return;
                }

                //Detect which wedge the mouse is currently hovering over
                for (i=0; i < wedgesLength; i+=1) {
                    if (i !== passthoughWedgeIndex &&  graph.isMouseInPath(e,transformedWedgePaths[i])) {
                        newWedge = wedges[i];
                        break;
                    }
                }

                //Check if we actually had a change and update the passThroughWedge accordingly and simulate events.
                if (newWedge !== null && newWedge !== undefined) {
                    //passThroughWedge = newWedge;
                    //if (newWedge !== hoverWedge) {
                    if (passThroughWedge !== newWedge && wedgeEventsEnabled) {
                        passThroughWedge = newWedge;   //end
                        graph.options.pie.wedgeHoverIn(e,newWedge);
                    }
                }
            }

            /**
             * If a passthrough wedge exist attempt to find its click handlers and execute it. If no click handler is
             * found just return.
             */
            function hitShieldClick() {
                var i;
                if (passThroughWedge) {
                    for (i=0;i< passThroughWedge.events.length; i+=1) {
                        if (passThroughWedge.events[i].name === "click") {
                            passThroughWedge.events[i].f();
                            return;
                        }
                    }
                }
            }

            hitShieldContainer = $('<div></div>').addClass('hit-shield').prependTo(graph.$el);
            hitShield = Raphael(hitShieldContainer[0], graph.width, graph.height)
                .circle(center.x, center.y, RADIUS + PIE_HOLE_STROKE_WIDTH)
                .attr({fill: 'red', 'stroke-width':0, opacity: 0, cursor: PIE_HOLE_CURSOR}); // fill is required so picked an arbitrary color

            $.when(LOAD_ANIMATION_PROMISE).done(function() {
                hitShield.mousemove(hitShieldMouseMove)
                    .click(hitShieldClick)
                    .hover(null, function(e) {
                        graph.options.pie.wedgeHoverOut(e, passThroughWedge); //security against skipping out event
                        passThroughWedge = null;
                    });
            });
        }

        var transformedWedgePaths = []; //the actual path of the wedge w/ rotation taken into account. Needed for event passthrough.
        /**
         * Caches the path for each wedge after a transformation occurs.
         * This is important as a lot of Raphael's collision detection does not take into account the current
         * transformations applied to an element.
         */
        function regenerateTransformedWedgePaths() {
            $.each(wedges, function(i, wedge) {
                var wedgePath = wedge.attrs.path.toString();
                $.each(wedge.attrs.transform, function(i, transform) {
                    wedgePath = Raphael.transformPath(wedgePath, transform.toString());
                });
                transformedWedgePaths[i] = wedgePath.toString();
            });
        }

        /**
         * Draw default labeling for pie chart this can be disabled by setting the disableDefaultLabeling option.
         * Simply draws the value adjascent to each wedge.  The selected wedge is provided an additional class so
         * CSS can be used to stylize the text.  Currently the default labeling is pretty bare bones.
         */
        function drawDefaultLabeling() {
            $.each(wedges, function(i, wedge) {

                var label = $('<span>'+wedge.data.value+'</span>')
                    .addClass('label visibility-hidden')
                    .appendTo(getMessageContainer());

                if(wedge === selectedWedge) {
                    label.addClass('selected');
                }

                var fontRadius = Math.max(label.width(), label.height()); //This could be refactored to be more accommodating

                var angle = (getDegreesRotated() + wedge.data.offset + .5 * wedge.data.degrees) * DEGREES_TO_RADIANS;
                var top = center.y + Math.sin(angle) * (wedge.attrs.radius+fontRadius);
                var left = center.x + Math.cos(angle) * (wedge.attrs.radius+fontRadius);

                label.css('position','absolute')
                    .css('left',left-label.width() *.5)
                    .css('top',top-label.height() *.5)
                    .removeClass('visibility-hidden');
            });
        }

        /**
         * Rotate the pie clockwise.
         * @param deg {number} Number of degrees to callback pie.
         * @return {object} jQuery deferred object that is resolved after the rotation animation or immediately if
         *                  animation is flagged off.
         */
        function rotate(deg) {
            var $deferred = null;
            wedgeEventsDisable();

            //Do not waste time animating a non event, if we're at the rotation angle, cut out early.
            if (graph.options.animation && getDegreesRotated() !== deg) {
                $deferred = graph.animateJQP(wedges,
                    [{transform: [S11+CENTER_COORDINATES+'r'+ deg +','+CENTER_COORDINATES]}, 675, 'backOut']);
            } else {
                wedges.attr({transform: [S11+CENTER_COORDINATES+'r'+ deg+','+CENTER_COORDINATES]});
            }

            return $.when($deferred)
                .always(regenerateTransformedWedgePaths, wedgeEventsEnable);
        }

        /**
         * Rotate the center of a pie wedge to 0 degrees.
         * @param wedge {object} Wedge to rotate to, must be in pie's wedges set.
         * @return {object} jQuery Deferred object
         */
        function rotateToWedge(wedge) {
            var a1 = wedge.attr('segment')[3],
                a2 = wedge.attr('segment')[4],
                t = a2-((a2-a1)/2);

            return rotate(-t);
        }

        /**
         * @return {number} number of degrees the pie is currently rotated, if no rotation transformation is present
         *                  null is returned.
         */
        function getDegreesRotated() {
            if (!wedges[0].attr("transform")[1]) {
                return null;
            } else {
                return wedges[0].attr("transform")[1][1];
            }
        }

        /**
         * Update the pie graph data and resize the wedges accordingly.
         * @param newSeries {object} New data to base pie off of.
         * @param newSeriesIndex {number} Index to use in the newSeries.
         * @return {object} jQuery deferred object that resolves after the resize animation, or immediately if animation
         *     is flagged off.
         */
        function updateLive(newSeries, newSeriesIndex) {
            series = graph.allSeries.series = graph.allSeries[0].series = newSeries;
            seriesIndex = newSeriesIndex;

            graph.sums = elroi.fn.helpers.sumSeries(elroi.fn.helpers.getDataValues(graph.allSeries));
            graph.hasData = elroi.fn.helpers.hasData(graph.allSeries);

            return resize(500);
        }

        /**
         * @return {object} Raphael object that is the circle that represents the pie hole.
         */
        function getPieHole() {
            return (pieOptions.drawPieHole) ? pieHole: null;
        }

        /**
         * @return {object} Raphael object that is the hit shield (invisible circle) used for passthrough
         */
        function getHitShield() {
            return (pieOptions.usePassThrough) ? hitShield : null;
        }

        /**
         * Shows (or hides) the pie hole.
         * @param {boolean} true to show the pie hole; false to hide the pie hold.
         */
        function showPieHole(show) {
            if (pieOptions.drawPieHole) {
                show ? pieHole.show() : pieHole.hide();
            }
        }

        /**
         * @return {object} jQuery promise that resolves when loadAnimation completes or null if pie is not initialized
         *   or not using animation.
         */
        function getLoadAnimationPromise() {
            return LOAD_ANIMATION_PROMISE;
        }

        /**
         * Get the container used to hold pie messages.
         * @return {object} jQuery element that is the container
         */
        function getMessageContainer() {
            return messageContainer;
        }

        /**
         * Helper to show or hide the message container
         * @param {boolean} show - true to show, false otherwise
         */
        function showMessageContainer(show) {
            show ? messageContainer.show() : messageContainer.hide();
        }

        /**
         * Update the color of each slice of the pie graph and update the graph options.
         * @param colors {array} New color data.
         */
        function updateColors(colors) {
            var i,
                wedgesLength = wedges.length,
                colorsLength = colors.length;

            if (colors === null || colors.length < 1) {
                throw 'Parameter colors must be a non empty array';
            }

            for (i = 0; i < wedgesLength; i+=1) {
                wedges[i].attr({fill: colors[i % colorsLength] });
            }

            graph.options.colors = colors;
        }

        /**
         * Gets the index of a wedge in the wedges array.
         * @param wedge {object} the wedge that is to be found
         * @return {number} index of the wedge if found, otherwise -1
         */
        function getWedgeIndex(wedge) {
            var i, //index of wedge for traversal
                wedgesLength = wedges.length; //length of wedges for traversal
            for (i=0; i < wedgesLength; i+=1) {
                if (wedge === wedges[i]) {
                    return i;
                }
            }
            return -1;
        }

        /**
         * Increments the wedgeEventsEnabledCounter, if the counter is non-negative, wedge events are enabled.
         * @param force {boolean} if force is truth-y the wedgeEventsEnabledCounter will be reset to 0
         *   and wedgeEventsEnabled hence will be set to true.
         */
        function wedgeEventsEnable(force) {
            (force) ? wedgeEventsEnabledCounter = 0 : wedgeEventsEnabledCounter++;

            if (wedgeEventsEnabledCounter >= 0) {
                wedgeEventsEnabled = true;
                wedgeEventsEnabledCounter = 0;
            }
        }

        /**
         * Decrements the wedgeEventsEnabledCounter and disables wedge events.  If multiple calls to wedgeEventsDisable
         * occur in sequence, a matching number of calls to wedgeEventsEnable need to occur before wedge events are
         * enabled again.
         */
        function wedgeEventsDisable() {
            wedgeEventsEnabledCounter--;
            wedgeEventsEnabled = false;
        }


        graph.ext.wedgeEventsEnable = wedgeEventsEnable;
        graph.ext.wedgeEventsDisable = wedgeEventsDisable;

        graph.ext.resetSelectedWedge = resetSelectedWedge;
        graph.ext.isSelectedWedge = isSelectedWedge;

        graph.ext.showPieHole = showPieHole;
        graph.ext.getPieHole = getPieHole;

        graph.ext.showMessageContainer = showMessageContainer;
        graph.ext.getMessageContainer = getMessageContainer;
        graph.ext.getHitShield = getHitShield;

        graph.ext.rotateToWedge = rotateToWedge;
        graph.ext.getWedgeIndex = getWedgeIndex;
        graph.ext.rotate = rotate;

        graph.ext.updateLive = updateLive;
        graph.ext.updateColors = updateColors;

        graph.ext.getloadAnimationPromise = getLoadAnimationPromise;

        graph.wedges = wedges;

        return {
            wedges : wedges,
            draw : drawPie
        };
    }

    elroi.fn.pie = pie;

})(elroi, jQuery);
(function(elroi, $) {

    /**
     * Draws a stacked bar graph for a given data series
     * @param graph The graph object defined in elroi
     * @param series The series of data
     * @param {int} seriesIndex The index of the stacked bar data in the graph's allSeries array
     */
    function bars(graph, series, seriesIndex) {

        // If the bar width is not defined, set it automatically
        var barWidth = graph.barWidth + graph.options.bars.highlightBorderWidth;

        /**
         * Draws the bars for a single series of data
         * @param {series} series The single series
         * @param {Array} seriesSum A sum of the values of the data series graphed so far
         * @param {int} seriesCount The count of the data series currently being graphed
         * @param {number} yTick The y-scale of the data
         * @param {number} barWidth The width of the bar to be drawn
         * @param {String} color The color of the bar
         * @return {Array} seriesSum The updated series sum array
         */
        function drawStackedBar(series, seriesSum, seriesCount, yTick, color) {
            $(series).each(function(i) {

                if (series[i].value || series[i].value === 0 || series[i].pointFlag) {
                    var x = i * graph.xTick + graph.padding.left + (graph.barWhiteSpace/2),
                        barHeight = Math.abs(series[i].value * yTick),
                        y = graph.height - barHeight - (seriesSum[i] * yTick) - graph.padding.bottom + graph.padding.top + graph.minVals[seriesIndex]*yTick,
                        barStartHeight = graph.options.animation ? 0 : barHeight,
                        barStartY = graph.height-graph.padding.bottom+graph.padding.top + graph.minVals[seriesIndex]*yTick,
                        bar;

                    if (series[i].value < 0) {
                        y = y + barHeight;
                    }
                    barStartY = graph.options.animation ? barStartY : y;

                    bar = graph.paper.rect(x, barStartY, barWidth, barStartHeight).attr('fill', color).attr('stroke', color);

                    if (graph.options.animation) {
                        bar.animate({y:y, height: barHeight}, 550, function() {
                            $(graph.$el).trigger('barDrawn');
                        });
                    } else {
                        $(graph.$el).trigger('barDrawn');
                    }
                }

                seriesSum[i] += series[i].value;
            });

            return seriesSum;

        }

        /**
         * Draws flags above the bars
         * @param series The data series to add flags to
         * @param {int} seriesSum
         * @param {int} seriesCount The 1-based index of the series relative to the entire data set
         * @param {number} yTick The yTick scale
         */
        function drawPointFlags(series, seriesSum, seriesCount, yTick) {
            $(series).each(function(i) {

                if (series[i].value || series[i].value === 0 || series[i].pointFlag) {
                    var x = i * graph.xTick + graph.padding.left + (graph.barWhiteSpace/2);
                    var totalBarHeights = ((seriesSum === null) ? series[i].value : seriesSum[i]) * yTick;
                    var y = graph.height - totalBarHeights - graph.padding.bottom + graph.padding.top;

                    if (series[i].pointFlag && (seriesCount === graph.allSeries[0].series.length)) {
                        var $pointFlag = series[i].pointFlag;
                        $pointFlag.addClass('elroi-point-flag').appendTo(graph.$el.find('.paper'));

                        // Show the labels inside the bars
                        var pointFlagY;
                        if (graph.options.bars.flagPosition === 'interior' && $pointFlag.outerHeight() < totalBarHeights) {
                            pointFlagY = graph.height - y - $pointFlag.outerHeight() - graph.options.flagOffset;
                        }
                        else {
                            pointFlagY = graph.height - y + graph.options.flagOffset;
                        }

                        $pointFlag.css({
                            bottom: pointFlagY,
                            left: x + barWidth / 2 - $pointFlag.outerWidth() / 2
                        }).hide();
                    }
                }
            });

        }

        /**
         * This will draw an invisible bar over all stacked bars for a given x-coordinate to serve as a target for the rollover
         * @param {series} series - The entire data set for the stacked bar graph
         * @param {number} yTick The y-scale of the graph
         * @param {int} index The index of the x-label.  Used to draw the hover target area over one x-label for all series
         */
        function barHover(series, yTick, index, isStacked) {
            var total = 0,
                clickTarget,
                min = 0,
                max = 0;
            if (isStacked) {
                $(series).each(function(i) {
                    total += series[i][index].value;
                    if (series[i][index].value < min) {
                        min = series[i][index].value;
                    }
                    if (series[i][index].value > max) {
                        max = series[i][index].value;
                    }
                    if (series[i][index].clickTarget) {
                        clickTarget = series[i][index].clickTarget;
                    }
                });
            } else {
                var set = [];
                $(series).each(function(i) {
                    set.push(series[i][index].value);
                });
                total = Math.max.apply(Math, set);
            }
            var barHeight;
            var x = index * graph.xTick + graph.padding.left - (graph.options.bars.highlightBorderWidth/2) + (graph.barWhiteSpace/2);
            var y;
            var range = max - min;

            var rolloverBars = graph.paper.set();
            var rolloverX;
            var rollOverTargetBar;
            for (var i = 0; i < series.length; i++) {
                barHeight = isStacked ? (total * yTick) + graph.options.bars.highlightBorderWidth :
                    series[i][index].value * yTick + graph.options.bars.highlightBorderWidth;

                barHeight = Math.abs(barHeight);
                y = graph.height - barHeight - graph.padding.bottom + graph.padding.top + (graph.options.bars.highlightBorderWidth/2) + graph.minVals[seriesIndex]*yTick;
                if (isStacked ? total < 0 : series[i][index].value < 0) {
                    y = y + barHeight;
                }

                rolloverX = isStacked ? x : x + barWidth * i;
                var rollOverBar = graph.paper
                    .rect(rolloverX, y, barWidth, barHeight)
                    .attr({
                        'fill': 'white',
                        'fill-opacity': 0,
                        'stroke': graph.options.bars.highlightColor,
                        'stroke-width': 4,
                        'stroke-opacity': 0
                    });
                rolloverBars.push(rollOverBar);
                var targetBarWidth = isStacked ? barWidth : barWidth * series.length;
                rollOverTargetBar = graph.paper
                    .rect(x, 0, targetBarWidth, graph.height)
                    .attr({
                        'fill': 'white',
                        'fill-opacity': 0,
                        'stroke-width' : 0,
                        'stroke' : 'none'
                    });
            }

            var tallestBarHeight = isStacked ? barHeight  : total * yTick + graph.options.bars.highlightBorderWidth;
            tallestBarHeight -= graph.minVals[seriesIndex]*yTick;
            if (min < 0) {
                tallestBarHeight += total * yTick
            }

            rollOverTargetBar.hover(
                function() {
                    rolloverBars.attr('stroke-opacity', graph.options.bars.highlightBorderOpacity);
                    if (graph.options.tooltip.show) {
                        var tipX = x + barWidth / 2 - graph.options.tooltip.width / 2;
                        var tipY = tallestBarHeight + graph.options.flagOffset + graph.options.bars.highlightBorderWidth;
                        graph.$tooltip.stop().animate({bottom: tipY, left:tipX }, 1, function() {
                            var tipContent = graph.options.tooltip.formatter(graph.tooltips[index], graph.options.messages);
                            var toolTipContent = graph.$tooltip.find('.elroi-tooltip-content'),
                                toolTipContainer = toolTipContent.find('.elroi-tooltip-container');
                            toolTipContent.html(tipContent);

                            if (toolTipContainer && toolTipContainer.width() > graph.options.tooltip.width) {
                                graph.$tooltip.width(toolTipContainer.width() + 20);
                            }

                        });

                    }
                },
                function() {
                    rolloverBars.attr('stroke-opacity', 0);
                });

            // Attach the click behavior, if we have a target
            $(rollOverTargetBar.node).click(function() {
                if (clickTarget) {
                    document.location = clickTarget;
                }
            });

            if (clickTarget) {
                $(rollOverTargetBar.node).hover(
                    function() {
                        rollOverTargetBar.node.style.cursor = "pointer";
                    },
                    function() {
                        rollOverTargetBar.node.style.cursor = "";
                    }
                );
            }
        }

        function drawBar(bar, barIndex, subseriesIndex, yTick, color) {

            var x = barIndex * graph.xTick + barWidth * subseriesIndex + graph.padding.left + (graph.barWhiteSpace/2),
                barHeight = Math.abs(bar.value * yTick),
                y = graph.height - barHeight - graph.padding.bottom + graph.padding.top + graph.minVals[seriesIndex]*yTick,
                barStartHeight = graph.options.animation ? 0 : barHeight,
                barStartY = graph.height - graph.padding.bottom + graph.padding.top + graph.minVals[seriesIndex]*yTick,
                barObj;

            if (bar.value < 0) {
                y = y + barHeight;
            }

            barStartY = graph.options.animation ? barStartY : y;

            barObj = graph.paper.rect(x, barStartY, barWidth, barStartHeight).attr('fill', color).attr('stroke', color);
            if (graph.options.animation) {
                barObj.animate({y:y, height: barHeight}, 550, function() {
                    $(graph.$el).trigger('barDrawn');
                });
            } else {
                $(graph.$el).trigger('barDrawn');
            }
        }

        /**
         * Draws the stacked bars on the graph
         */
        function drawBars() {
            var isStacked = graph.allSeries[seriesIndex].options.type ==='stackedBar',
                seriesSum = [],
                color,
                i=0,
                j = 0;

            if (isStacked) {
                for (j = 0; j < graph.numPoints; j++) {
                    seriesSum.push(0);
                }
                for (j = 0; j < series.length; j++) {
                    color = graph.options.colors[j];
                    seriesSum = drawStackedBar(series[j], seriesSum, j+1, graph.yTicks[seriesIndex], color);
                }
            } else {
                // This isn't a stacked bar; change up the bar width
                barWidth = barWidth/series.length;

                for (i = 0; i < graph.numPoints; i++) {
                    for (j=0; j < series.length; j++) {
                        color = graph.options.colors[j];
                        drawBar(series[j][i], i, j, graph.yTicks[seriesIndex], color);
                    }
                }

                // Only stackedBar graphs use seriesSum, so in the case of a simple bar graph null it out so when it
                // comes time to drawPointFlags the method will use the simple value instead of the sum to determine
                // placement of pointFlag.
                seriesSum = null;
            }

            // draw in the point flags
            graph.$el.bind('barDrawn', function() {$('.elroi-point-flag').fadeIn();});
            for (j = 0; j < series.length; j++) {
                drawPointFlags(series[j],
                    seriesSum,
                    j+1, graph.yTicks[seriesIndex]);
            }

            if (graph.tooltips && graph.tooltips.length) {
                for (j = 0; j < graph.numPoints; j++) {
                    if (graph.tooltips[j] || graph.tooltips[j] === 0) {
                        barHover(series, graph.yTicks[seriesIndex], j, isStacked);
                    }
                }
            }

        }

        return {
            draw : drawBars
        };
    }

    elroi.fn.stackedBar = bars;
    elroi.fn.bar = bars;

})(elroi, jQuery);
