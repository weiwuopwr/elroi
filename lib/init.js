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
         * Iterates through all of the data values in a single series, and puts them into an array depending on the series type
         * @param {Array} allSeries All of the series in the graph
         * @param {Array} seriesOptions The set of series options for the graph
         * @return {Array} dataValues An array of the data values for a series
         */
        getDataValues : function(allSeries, seriesOptions) {

            var dataValuesSet = [];

            // If there is no actual data, build a dummy set so elroi won't choke
            if (!elroi.fn.helpers.hasData(allSeries)) {
                return [[0]];
            }

            $(allSeries).each(function(i) {

                var dataValues = [],
                    series = allSeries[i].series,
                    lowestValue = 0;

                $(series).each(function(j) {
                    var singleSeries = series[j];

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
         * @param {Array} allSeries All of the series to be shown on the graph
         * @return {Boolean} hasPointFlags
         */
        hasPointFlags: function(allSeries) {

            // Figure out if any of the data points have flags to show
            var hasPointFlags = false;

            $(allSeries).each(function(i) {
                $(allSeries[i].series).each(function(j) {
                    $(allSeries[i].series[j]).each(function(k) {
                        if (allSeries[i].series[j][k].pointFlag) {
                            hasPointFlags = true;
                        }
                    });
                });
            });

            return hasPointFlags;
        },

        /**
         * Determines minimum values for each datavalues set
         * @param {Object} dataValuesSet
         * @param {Object} seriesOptions
         * @return {Array} The array of minumum values to use in the scaling & axes
         */
        minValues : function(dataValuesSet, seriesOptions) {
            var minVals = [],
                temp;

            $(dataValuesSet).each(function(i) {

                if (seriesOptions[i].minYValue === 'auto') {
                    minVals.push(Math.min.apply(Math, dataValuesSet[i]));
                } else if (seriesOptions[i].minYValue === 'zeroOrLess') {
                    temp = Math.min.apply(Math, dataValuesSet[i]);
                    minVals.push(temp < 0 ? temp : 0);
                } else {
                    minVals.push(seriesOptions[i].minYValue);
                }

            });

            return minVals;
        },

        /**
         * Gets the maximum values for each series
         * @param {Array} dataValuesSet
         * @param {Array} seriesOptions
         * @param {Object} graph
         * @return {Array} The array of each values to use for scales & axes
         */
        maxValues : function(dataValuesSet, seriesOptions, graph) {
            var maxVals = [],
                scaleDistortion;

            // Get the max value for each series
            $(dataValuesSet).each(function(i) {
                if (seriesOptions[i].maxYValue === 'auto') {
                    maxVals.push(Math.max.apply(Math, dataValuesSet[i]));
                } else {
                    maxVals.push(seriesOptions[i].maxYValue);
                }
            });


            /**
             * Helper function to figure out if we should distort the maximum values to make room for flags, messages, etc
             * @return {Number} The scale to multiply against each of the max values to make some room;
             *   if the height required for the flags/messages/etc is equal to or greater than the the height of the
             *   actual graph, 1 (no-op) is returned.
             */
            function distortMaxValuesBy() {
                var totalPixelsNeeded = pixelsNeededForErrorMessages() + pixelsNeededForPointFlags()
                        + pixelsNeededForX2Axis(),
                    totalPixelsInGraph = graph.height - graph.padding.top - graph.padding.bottom;

                function pixelsNeededForErrorMessages() {
                    var pixelsNeeded = 0,
                        $errorMsg;
                    if (graph.options.errorMessage) {
                        $errorMsg = graph.injectErrorMessage(graph.options.errorMessage, 'visibility-hidden');
                        pixelsNeeded = $errorMsg.outerHeight() + $errorMsg.position().top * 2;
                        $errorMsg.remove();
                    }
                    return pixelsNeeded;
                }

                function pixelsNeededForPointFlags() {
                    var pixelsNeeded = 0,
                        hasPointFlags = elroi.fn.helpers.hasPointFlags(graph.allSeries),
                        $pointFlag;
                    if (hasPointFlags && graph.options.bars.flagPosition !== 'interior') {
                        $pointFlag = $('<div class="point-flag"><div class="flag-content">Test flag</div></div>')
                            .appendTo(graph.$el.find('.paper'));
                        pixelsNeeded = $pointFlag.outerHeight();
                        $pointFlag.remove();
                    }
                    return pixelsNeeded;
                }

                /**
                 * Adds each graph label to the DOM and discerns the maximum height (in pixels) required to avoid graph
                 * overlap.  As the labels are inserted into a hidden container, this should be transparent to the user.
                 * The labels will be permanently added to the graph later.
                 *
                 * @returns {number} height (in pixels) of the tallest label or 0 if graph.options.axes.x2.show is false
                 *   or there are no graph.options.axes.x2.labels.
                 */
                function pixelsNeededForX2Axis() {
                    var pixelsNeeded = 0, $x2;
                    if (graph.options.axes.x2.show) {

                        /* Create hidden container and add it to the graph. */
                        $x2 = $('<ul>').addClass('x-ticks x2 visibility-hidden').appendTo(graph.$el);

                        /* Add each label into our container($x2). */
                        $.each(graph.options.axes.x2.labels, function(index, value) {
                            var $li = $('<li>').width(graph.options.labelWidth).html(value).appendTo($x2);

                            /* If the current label takes up more height, update pixelsNeeded */
                            pixelsNeeded = Math.max(pixelsNeeded, $li.outerHeight());

                            /* Remove the list item from the DOM */
                            $li.remove();
                        });

                        /* Remove the hidden container from the DOM */
                        $x2.remove();
                    }

                    /* If pixelsNeeded isn't 0 (the graph has an x2 axis with labels) add a small bit extra padding. */
                    return (pixelsNeeded === 0) ? 0 : pixelsNeeded + graph.labelLineHeight / 2;
                }

                // Return a multiplier to use that will cause the graph to fit below the error-message / point-flags
                // / x2-axis-labels etc.  If the total height of error/flags/etc. (in pixels) needed is equal to or
                // greater than the height of the graph, the state is erroneous.  Instead of returning a negative
                // multiplier or causing a division by zero exception, we'll simply 1 which is essentially a no-op.
                return (totalPixelsNeeded >= totalPixelsInGraph)
                    ? 1
                    : totalPixelsInGraph / (totalPixelsInGraph - totalPixelsNeeded);
            }

            // Figure out how much we need to distort these by
            scaleDistortion = distortMaxValuesBy();

            maxVals = $.map(maxVals, function(val, i) {
                // Distort the max values if necessary to make room; if the maxval of a series is 0, we need to set it to 1 so gridlines will show up

                // Don't distort weather axis otherwise max value becomes 350 deg F.
                // This is done by setting dontDistortAxis = true in the series option.
                return seriesOptions[i].dontDistortAxis ? val
                    : !!val ? val * scaleDistortion
                    : 1;
            });

            return maxVals;
        },



        /**
         * Sets up an array of series specific options for each series to graph
         * @param {Array} allSeries An array of series, each with their own options
         * @param defaults Default options to merge in
         * @return {Array} seriesOptions
         */
        seriesOptions : function(allSeries, defaults) {

            var seriesOptions = [];

            // If there are no series, just send back the defaults
            if (! allSeries.length) {
                return [defaults];
            }

            $(allSeries).each(function(i) {
                // Merge the individual series options with the default series settings
                seriesOptions.push($.extend({}, true, defaults, allSeries[i].options));
            });

            return seriesOptions;
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
            maxVals,
            minVals,
            dataValuesSet,
            sums,
            hasData;

        graph.allSeries = elroi.fn.helpers.dataCleaner(graph.allSeries);

        seriesOptions = elroi.fn.helpers.seriesOptions(graph.allSeries, graph.options.seriesDefaults);
        maxVals = [];
        minVals = [];
        dataValuesSet = elroi.fn.helpers.getDataValues(graph.allSeries, seriesOptions);
        sums = elroi.fn.helpers.sumSeries(dataValuesSet);
        hasData = elroi.fn.helpers.hasData(graph.allSeries);

        if (graph.options.dates.format === 'auto' && hasData) {
            graph.options.dates.format = elroi.fn.helpers.determineDateFormat(graph.allSeries);
        }

        // number of points comes from the first series - if there is no data, there are no points
        var numPoints = !hasData ? 1 : graph.allSeries[0].series[0].length;

        // start skipping points if we need to
        var showEvery = graph.options.showEvery ||
            ((numPoints > graph.options.skipPointThreshhold) ? Math.round(numPoints / graph.options.skipPointThreshhold) : 1);

        var xTick = (graph.width - graph.padding.left - graph.padding.right) / numPoints;
        var yTicks = [];

        maxVals = elroi.fn.helpers.maxValues(dataValuesSet, seriesOptions, graph);
        minVals = elroi.fn.helpers.minValues(dataValuesSet, seriesOptions);

        // Get the yTick per pixel of each series
        $(dataValuesSet).each(function(i) {
            var avalaibleArea = graph.height - graph.padding.top - graph.padding.bottom,
                dataRange = maxVals[i] + Math.abs(minVals[i]);

            yTicks.push(avalaibleArea/dataRange);
        });

        // Figure out the label width
        var labelWidth =
            graph.options.labelWidth === 'auto' ?
                (graph.width - graph.padding.left - graph.padding.right) / (numPoints/showEvery) - 2  :  //padding of 2px between labels
                graph.options.labelWidth;

        // Figure out bar width
        var barWidth = xTick * 2/3; // 2/3 is magic number for padding between bars

        var barWhiteSpace = (xTick * 1/3) / 2;

        // Merge new graph object with the default graph object
        $.extend(graph, {
            hasData : hasData,
            seriesOptions: seriesOptions,
            dataValuesSet: dataValuesSet,
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
