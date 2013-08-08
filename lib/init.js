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
