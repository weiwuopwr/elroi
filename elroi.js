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
            flagOffset : 5,
            skipPointThreshhold : 18,
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
                formatter : function(tip){return tip;},
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

        var $el = $(element)
                .addClass('elroi'),
            $paper = $('<div></div>')
                .addClass('paper')
                .appendTo($el),
            options = $.extend(true, {}, defaults, graphOptions);

        var width = $paper.width() || $el.width(),
            height = $paper.height() || $el.height();

        var containerOffsetLeft = $(element).offset().left;
        var containerOffsetTop = $(element).offset().top;
        /**
         * Helper function to determine whether a mouse is in a Raphael path.
         * @param e {Object} Mouse event object
         * @param path {string} Raphael path string
         * @return {boolean} true if the mouse is in the path, false otherwise
         */
        function isMouseInPath(e, path){
            var posx = e.clientX + $(document).scrollLeft() - containerOffsetLeft,
                posy = e.clientY + $(document).scrollTop() - containerOffsetTop;
            return Raphael.isPointInsidePath(path, posx, posy);
        }
        /**
         * Helper function to determine whether a mouse is in an object across browser and taking into account the
         * offset of the graph container.
         * @param e {Object} Mouse event object
         * @param element {Object} Raphael element
         * @return {boolean} true if the mouse is in the element, false otherwise
         */
        function isMouseInElement(e, element){
            var posx = e.clientX + $(document).scrollLeft() - containerOffsetLeft,
                posy = e.clientY + $(document).scrollTop() - containerOffsetTop;
            return element.isPointInside(posx, posy);
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
            isMouseInElement: isMouseInElement
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

            if(graph.options.errorMessage) {
                var $errorMsg = $('<div class="elroi-error">' + graph.options.errorMessage + '</div>')
                    .addClass('alert box');

                graph.$el.find('.paper').prepend($errorMsg);
            }

            if(!graph.allSeries.length) {
                elroi.fn.grid(graph).draw();
            }


            $(graph.allSeries).each(function(i) {

                if(!isGridDrawn && graph.seriesOptions[i].type !== 'pie') {
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


})(jQuery);(function(elroi, $) {

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
            date = new Date(value),
            dayNamesShort,
            dayNamesLong,
            monthNamesShort,
            monthNamesLong,
            merid,
            formattedDate = "",
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

        for(i = 0; i < format.length; i++) {
            thisChar = format.charAt(i);
            isDoubled = i < format.length && format.charAt(i + 1) === thisChar;
                
            switch (thisChar) {
                case 'd':
                    if(isDoubled) {
                        if(date.getDate() < 10) {
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
                    if(isDoubled) {
                        if(date.getMonth() < 10) {
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
                    if(isDoubled) {
                        formattedDate += date.getFullYear();
                    } else {
                        if(date.getFullYear() % 100 < 10){
                            formattedDate += 0;
                        }
                        formattedDate += date.getFullYear() % 100;
                    }
                    break;
                case 'h':
                    if(isDoubled && date.getHours()  % 12 < 10) {
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
                default:
                    formattedDate += thisChar;
            }
            if(isDoubled) {
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
            formattedDateRange += elroi.fn.formatDate(startDateFormat, startDate, options);
        }

        if(startDate && endDate) {
            formattedDateRange += " &ndash; ";
        }

        if(endDate) {
            formattedDateRange += elroi.fn.formatDate(endDateFormat, endDate, options);
            formattedDateRange = formattedDateRange.replace(/\s/g, '&nbsp;');
        }

        return formattedDateRange;
    }

    elroi.fn.formatDate = formatDate;
    elroi.fn.formatDateRange = formatDateRange;
    elroi.fn.stripYearFromDateFormat = stripYearFromDateFormat;

})(elroi, jQuery);(function(elroi, $) {

    var helpers = {

        /**
         * Checks and sees if the graph has any data to actually display
         * @param {Array} allSeries An array of all of the series in the graph
         * @return {Boolean} hasData Does the graph have data
         */
        hasData : function(allSeries){
            var hasData = true;

            hasData = allSeries !== undefined &&
                    allSeries.length &&
                    allSeries[0] !== undefined &&
                    allSeries[0].series !== undefined &&
                    allSeries[0].series.length;


            // Does this graph actually have data?
            $(allSeries).each(function(i) {
                if(!this || !this.series[0]) {
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
            if(!elroi.fn.helpers.hasData(allSeries)){
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
                
                if(lowestValue < 0) {
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

            $(allData).each(function(i){
                var singleSeries = this,
                    sum = 0;
                $(singleSeries).each(function (j){
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
        hasPointFlags: function(allSeries){

            // Figure out of any of the data points have flags to show
            var hasPointFlags = false;

            $(allSeries).each(function(i){
                $(allSeries[i].series).each(function(j){
                    $(allSeries[i].series[j]).each(function(k){
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
            var maxVals = [];

             // Get the max value for each series
            $(dataValuesSet).each(function(i) {
                if (seriesOptions[i].maxYValue === 'auto') {
                    maxVals.push(Math.max.apply(Math, dataValuesSet[i]));
                } else {
                    maxVals.push(seriesOptions[i].maxYValue);
                }
            });


            /**
             * Helper function to figure out of we should distort the maximum values to make room for flags, messages, et
             * @return {Number} The scale to multiply against each of the max values to make some room
             */
            function distortMaxValuesBy() {

                var pixelsNeeded = 0;

                // Error messaging
                if(graph.options.errorMessage) {
                    var $errorMsg = $('<div id="graph-error">' + graph.options.errorMessage + '</div>').addClass('alert box').appendTo(graph.$el.find('.paper'));
                    pixelsNeeded += $errorMsg.outerHeight() + $errorMsg.position().top * 2;
                    $errorMsg.remove();
                }

                // Point flags
                var hasPointFlags = elroi.fn.helpers.hasPointFlags(graph.allSeries);
                if (hasPointFlags && graph.options.bars.flagPosition !== 'interior') {
                     var $pointFlag = $('<div class="point-flag"><div class="flag-content">Test flag</div></div>').appendTo(graph.$el.find('.paper'));
                     pixelsNeeded += $pointFlag.outerHeight();
                     $pointFlag.remove();
                }

                // x-2 axis
                if(graph.options.axes.x2.show) {
                    var $x2 = $('<ul class="x-ticks x2"><li>test axis</li></ul>').appendTo(graph.$el);
                    pixelsNeeded += $x2.find('li').outerHeight() + graph.labelLineHeight;
                    $x2.remove();
                }

                return 1 + pixelsNeeded/graph.height;
            }

            // Figure out how much we need to distort these by
            var scaleDistortion = distortMaxValuesBy();

            maxVals = $.map(maxVals, function(val, i){
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
            if(! allSeries.length) {
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
                $(this.series).each(function(j){
                    $(this).each(function(k){
                        if(tooltips[k]) {
                            tooltips[k] += "<br/>" + this.value;
                        } else {
                            tooltips[k] = "" + this.value;
                        }
                    });
                });
            });  
            return tooltips;  
        },


        
        determineDateFormat : function(allSeries){
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
            
            if(averageGap <= MILLISECONDS_PER_DAY) {
                format = "h:nna";
            } else if(averageGap < MILLISECONDS_PER_MONTH) {
                format = "M, d";
            } else if(averageGap < MILLISECONDS_PER_YEAR){
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
            
            if(allSeries[0] !== undefined && typeof(allSeries[0]) === "number") {
                // This is a single, flat array of data.  turn it into an elroi friendly object
                temp = { series: [[]]};
                for(i=0; i<allSeries.length; i++) {
                    temp.series[0].push({value: allSeries[i]});
                }
                cleanData.push(temp);    
            } else {
                // Shit just got complicated
                if(!(allSeries instanceof Array)) {
                    // We have a single series passed in an object
                    if(!(allSeries.series[0] instanceof Array)) {
                        // this guy just has a single subseries
                        temp = { series: [], options: {}};
                        temp.series.push(allSeries.series);
                        temp.options = allSeries.options || {};
                        cleanData.push(temp);
                    } else {
                        cleanData = allSeries;
                    }
                } else if (allSeries[0] !== undefined && !(allSeries[0] instanceof Array)){
                    if(allSeries[0].series === undefined) {
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
        
        if(graph.options.dates.format === 'auto' && hasData) {
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
        
        if(graph.options.tooltip.show && graph.tooltips === undefined) {
            graph.tooltips = elroi.fn.helpers.buildDefaultTooltips(graph.allSeries);
        }

        return graph;
    }

    elroi.fn.helpers = helpers;
    elroi.fn.init = init;

})(elroi, jQuery);
(function(elroi, $){

    /**
     * This function creates the grid that is used by the graph
     * @param {graph} graph The graph object defined by elroi
     * @return {function} draw Draws the grid, x-axis, and y-axes
     */
    function grid(graph){

        /**
         * Goes through the first series in a data set and creates a set of labels for the x-axis
         * @param data All series to be graphed
         * @param {String} dateFormat
         * @return {Array} xLabels An array of correctly formatted labels for the x-axis
         */
        function getXLabels(series, dateOptions){

            var xLabels = [];

            $(series).each(function(){
                var label,
                    startDate,
                    endDate;

                if(this.startDate) {
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
        function drawGrid(){
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

            if(axis.customXLabel) {
                $labels = $(axis.customXLabel);
            } else {

                $labels = $('<ul></ul>')
                        .addClass('x-ticks')
                        .addClass(axis.id);

                $(axis.labels).each(function(i){
                    if(i % graph.showEvery === 0) {
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
            $labels.find('li').each(function(){
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
         * @param {number} maxVal The maximum value in a dataset
         * @param {number} precision The number of digits to show
         * @return {Array} yLabels A set of labels for the y axis
         */
        function getYLabels(maxVal, minVal, precision){
            var yLabels = [],
                i;

            for (i = 0; i < graph.options.grid.numYLabels; i++) {

                var yLabel = i/(graph.options.grid.numYLabels-1) * (maxVal - minVal) + minVal;

                yLabel = yLabel.toFixed(precision);

                yLabels.push(yLabel);

            }
            return yLabels;
        }


        /**
         * This draws either the y1 or y2 axis, depending on the series data
         * @param {int} seriesDataIndex The index of the data series associated to this y-axis
         * @param {number} maxVal The maximum value in the data series
         * @param {number} minVal The minimum value in the data series
         * @param {String} unit The units of the data
         */
        function drawYLabels(maxVal, minVal, axis){

            // Draw the y labels
            var $yLabels = $('<ul></ul>')
                    .addClass("y-ticks")
                    .addClass(axis.id);

            var precision = 0,
                yLabels = getYLabels(maxVal, minVal, precision),
                avalaibleArea = graph.height - graph.padding.top - graph.padding.bottom;
                
            while(containsDuplicateLabels(yLabels)) {
                precision++;
                yLabels = getYLabels(maxVal, minVal, precision);
            }

            $(yLabels).each(function(i){
                var yLabel = commaFormat(yLabels[i], precision);

                var y = graph.height - 
                        i / (graph.options.grid.numYLabels - 1) * avalaibleArea -
                        graph.padding.bottom +
                        graph.padding.top -
                        graph.labelLineHeight;

                // Topmost ylabel gets a different unit
                if(i === graph.options.grid.numYLabels-1) {
                    yLabel = (axis.prefixUnit ? axis.topUnit : '') +
                            yLabel +
                            (!axis.prefixUnit ? " " + axis.topUnit : '');
                } else {
                    yLabel = (axis.prefixUnit ? axis.unit : '') +
                            yLabel +
                            (!axis.prefixUnit ? " " + axis.unit : '');
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
        }

        /**
         * Calls all other draw methods
         */
        function draw(){

            drawGrid();
            var seriesIndex;

            // Can't get any axes if we don't have any data
            if(!graph.hasData) {
                return;
            }

            if(graph.options.axes.x1.show){
                if(!graph.options.axes.x1.labels || graph.options.axes.x1.labels.length === 0) {
                    seriesIndex = graph.options.axes.x1.seriesIndex;
                    graph.options.axes.x1.labels= getXLabels(graph.allSeries[seriesIndex].series[0], graph.options.dates);
                }
                drawXLabels(graph.options.axes.x1);
            }
            if(graph.options.axes.x2.show && graph.hasData){
                if (!graph.options.axes.x2.labels || graph.options.axes.x2.labels.length === 0) {
                    seriesIndex = graph.options.axes.x2.seriesIndex;
                    graph.options.axes.x2.labels = getXLabels(graph.allSeries[seriesIndex].series[0], graph.options.dates);
                }
                drawXLabels(graph.options.axes.x2);
            }

            if (graph.options.axes.y1.show) {
                drawYLabels(graph.maxVals[graph.options.axes.y1.seriesIndex], graph.minVals[graph.options.axes.y1.seriesIndex], graph.options.axes.y1);
            }
            if (graph.options.axes.y2.show) {
                drawYLabels(graph.maxVals[graph.options.axes.y2.seriesIndex], graph.minVals[graph.options.axes.y2.seriesIndex], graph.options.axes.y2);
            }
        }

        return {
            draw : draw
        };
    }

    function containsDuplicateLabels(arr){
        var i, j, n;
        n= arr.length;

        for (i=0; i<n; i++) {
            for (j=i+1; j<n; j++) {
                if (arr[i] === arr[j] || (arr[i] === '-0' && arr[j] === '0')) {
                    return true;
                }
            }
        }
        return false;
    }

    // visible for testing
    elroi.fn.helpers.containsDuplicateLabels = containsDuplicateLabels;

    function commaFormat (num, precision) {

        if (precision) {
            num = parseFloat(num); // Make sure this is a number
            num = precision === 'round' ? Math.round(num) : num.toFixed(precision);
        }

        // stringify it
        num += '';

        var preDecimal,
            postDecimal,
            splitNum = num.split('.'),
            rgx = /(\d+)(\d{3})/;

        preDecimal = splitNum[0];
        postDecimal = splitNum[1] ? '.' + splitNum[1] : '';

        while (rgx.test(preDecimal)) {
            preDecimal = preDecimal.replace(rgx, '$1' + ',' + '$2');
        }

        return preDecimal + postDecimal;

    }

    elroi.fn.grid = grid;

})(elroi, jQuery);
(function(elroi){

    /**
     * Creates a line graph for a particulary series of data
     * @param {graph} graph The graph object defined in elroi
     * @param {series} series The series to graph as a line graph
     * @param {int} seriesIndex The index of this series
     * @return {function} draw Draws the line on the graph
     */
    function lines(graph, series, seriesIndex){

        // points on the graph are centered horizontally relative to their labels
        var pointOffset = 0.5 * graph.labelWidth,
            yTick = graph.yTicks[seriesIndex],
            seriesOptions = graph.seriesOptions[seriesIndex];


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
        function drawPoint(x, y, value, color, fillPoint, clickTarget, animate, stroke){
            var point;

             function conditionallyFillPoint() {
                 if(fillPoint) {
                     point.attr({fill: color});
                 }
             }
            
             if(stroke) {
                 // Draw point with stroke and other features, optionally animating it.

                 var pointAttributes = {
                     'stroke': color,
                     'stroke-width': graph.options.lines.pointStrokeWidth,
                     'fill': '#fff'
                 };

                 if(animate) {

                     // Draw the point
                     point = graph.paper.circle(x, y, 0).attr(pointAttributes);

                     conditionallyFillPoint();

                     point.animate({r:graph.options.lines.pointRadius}, 500, 'bounce');
                 }
                 else {

                     // Draw the point
                     point = graph.paper.circle(x, y, graph.options.lines.pointRadius).attr(pointAttributes);

                     conditionallyFillPoint();

                 }

                 $(point.node).click(function(){
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
        function drawPointLabel(x, y, pointNumber, value, units, color){
            var isOffGraph = graph.height - graph.labelLineHeight < y,
                isInSetToShow = pointNumber % graph.showEvery === 0;

            if (!isOffGraph && isInSetToShow) {
                var pointLabel = document.createElement("span");
                $(pointLabel).addClass('elroi-point-label').html(Math.round(value) + " " + units).css({
                    'left': x - pointOffset,
                    'bottom': graph.paper.height - y - graph.labelLineHeight - pointOffset,
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
            if(index === series.length) {
                return true;
            }

            var isNullPoint = !(series[index].value || series[index].value === 0);

            var x = index * graph.xTick + graph.padding.left + pointOffset,
                y = graph.height - ((series[index].value - graph.minVals[seriesIndex]) * yTick) - graph.padding.bottom + graph.padding.top,
                pathString = "",
                animSpeed = (window.isIE6 ? 1 : 800)/series.length,
                isFirstPoint = !index;

            // If we aren't interpolating nulls, don't draw from the previous null point
            if(!prevPoint && !(seriesOptions.interpolateNulls || seriesOptions.type === 'step')) {
                isLineStarted = false;
            }

            // If the startpoint is at the left edge, pick up the pen and move there.  Otherwise, draw, skipping null points
            if (!isFirstPoint && isLineStarted && !isNullPoint) {
                pathString = seriesOptions.type === 'step' ?
                    "L" + x + " " + prevPoint.y + "L" + x + " " + y  :
                    "L" + x + " " + y;
            } else if (isNullPoint && !isFirstPoint){
                pathString = "";
            }
            else {
                pathString = "M" + x + " " + y;

            }

            // The line is started once we hit our first non-null point
            if(!isLineStarted && !isNullPoint) {
                isLineStarted = true;
            }

            var thisPoint;
            if(seriesOptions.interpolateNulls || seriesOptions.type === 'step') {
                thisPoint = isNullPoint ? prevPoint : {x:x, y:y};
            } else {
                thisPoint = isNullPoint ? null : {x:x, y:y};
            }

            if(isLineFilled) {
            // Fill in this segment if there aren't nulls
                if(prevPoint && !isNullPoint) {
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
            
            
            function pointsAndLabels(){
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
            
            if(graph.options.animation) {
                line.animate({
                    path: currentPath + pathString
                }, animSpeed, function(){
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
        graph.$el.mouseleave(function(){
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

            var x = (index * graph.xTick + graph.padding.left) - (graph.xTick/2) + pointOffset,
                y = 0,
                pointsInSet = [],
                highlights = graph.paper.set();

            $(series).each(function(i){
                // skip any null points
                if (series[i][index].value || series[i][index].value === 0) {
                    pointsInSet.push(series[i][index].value);
                    var highlightX = index * graph.xTick + graph.padding.left + pointOffset;
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
            if(topPoint - graph.minVals[seriesIndex] < 0) {
                topPoint = graph.minVals[seriesIndex]; 
            }

            var errorHeight = graph.options.error ? graph.options.error.height + graph.options.error.top : 0,
                rollOverBar = graph.paper.rect(x, y + errorHeight, graph.xTick, graph.height-errorHeight).attr('fill', 'white').attr('opacity', 0);

            rollOverBar.mouseover(function(){

                // Show the tooltip
                if (graph.options.tooltip.show) {
                    var x = index * graph.xTick + graph.padding.left + pointOffset - graph.options.tooltip.width / 2;
                    var y = ((topPoint - graph.minVals[seriesIndex]) * yTick) - graph.padding.top + graph.padding.bottom + graph.options.flagOffset + graph.options.lines.pointStrokeWidth + graph.options.lines.highlightRadius;

                    graph.$tooltip.stop().animate({
                        bottom: y,
                        left: x
                    }, 1, function(){
                        var tipContent = graph.options.tooltip.formatter(graph.tooltips[index], graph.options.messages);
                        graph.$tooltip.find('.elroi-tooltip-content').html(tipContent);
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

            for(j=0; j< series.length; j++) {
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
            for(j=0; j< graph.numPoints; j++) {
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
        /* Attempt to configure graph using provided options, otherwise fallback to defaults.*/
        graph.options.pie = graph.options.pie || {};
        graph.options.pie.center = graph.options.pie.center || {
            x : (graph.width + graph.padding.left - graph.padding.right)/2,
            y : (graph.height - graph.padding.bottom + graph.padding.top)/2
        };
        graph.options.pie.radius = graph.options.pie.radius ||  (graph.height - graph.padding.bottom + graph.padding.top)/ 2;
        graph.options.pie.innerRadius = graph.options.pie.innerRadius || graph.options.pie.radius/2;
        graph.options.pie.wedgeAttributes = graph.options.pie.wedgeAttributes || {};
        graph.options.pie.messageBoxSetAttributes = graph.options.pie.messageBoxSetAttributes || {};

        /*Ext holds extension functions specific to the pie.  They are merged into the parent namespace making
         them publicly accessible at the level of the elroi object. */
        graph.ext = {};

        /* Pie attributes */
        var center = graph.options.pie.center,
            radius = graph.options.pie.radius,
            defaultRotation = -90; //current rotation of the pie

        /* Set to store wedge paths */
        var wedges = graph.paper.set();

        /* Raphael transform constants */
        var CENTER_COORDINATES = center.x+','+center.y,
            S11 = 's1,1';

        var messageBoxSet, //Static part of message, in default case under circle and over hit circle for mouse detection.
            messageTextSet; //Dynamic part of message, the text and other elements sandwiched between the messageBoxSet
        var selectedWedge; //The selected wedge, a selection change is triggered by clicking a wedge

        /**
         * Custom attribute for raphael that will create a pie wedge based on the following attributes.
         * @param x {number} X coordinate of the center of the pie.
         * @param y {number} Y coordinate of the center of the pie.
         * @param r {number} The radius of the pie wedge.
         * @param a1 {number} Start angle of wedge in degrees.
         * @param a2 {number} End angle of wedge in degrees.
         * @return {object} Path attribute for attachment to a Raphael object.
         */
        graph.paper.customAttributes.segment = function (x, y, r, a1, a2) {

            /* Mathematical constants */
            var DEGREES_TO_RADIANS = Math.PI / 180;
            var flag = (a2 - a1) > 180;

            /* Update the r attribute on our path so it's consistent with the new radius */
            if(this.attrs) {
                this.attrs.radius = r;
            }

            a1 = (a1 % 360) * DEGREES_TO_RADIANS;
            a2 = (a2 % 360) * DEGREES_TO_RADIANS;

            return {
                path: [['M', x, y],
                    ['l', r * Math.cos(a1), r * Math.sin(a1)],
                    ['A', r, r, 0, +flag, 1, x + r * Math.cos(a2), y + r * Math.sin(a2)],
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

            return graph.paper.customAttributes.segment(segment[0], segment[1], r, segment[3],segment[4]);
        };

        /**
         * Animation pie from initial radius of 1 to full value.  May eventually provide this as a callback instead.
         * @param [ms] {number} The duration of tha Raphael animation
         */
        function loadAnimation(ms) {
            wedges.animate({radius: radius,
                    transform: [S11+CENTER_COORDINATES+'r'+ defaultRotation +','+CENTER_COORDINATES]},
                ms || 1500, 'backOut');

        }

        /**
         * Recalculates wedge sizes and animates (if enabled) pie to new proportion.  Run after updating series data.
         * @param [ms] {number} The duration of tha Raphael animation
         * @param [callback] {callback} callback function to execute after resize animation
         */
        function resize(ms, callback){
            var start = 0, // current angle offset
                total = graph.sums[seriesIndex],
                data = series[seriesIndex];

            var i, //current index of data for traversal of data
                dataLength = data.length; //length of data for traversal of data

            var wedgeSize, //In degrees
                newAttributes; //New segment and transform attributes for Raphael


            for (i = 0; i < dataLength; i++) {
                wedgeSize = 360 / total * data[i].value;
                newAttributes = {segment: [center.x, center.y, wedges[i].attr('radius'), start, start += wedgeSize]};

                wedges[i].data = data[i]; //update data tied to each wedge

                if(graph.options.animation) {  //either animate transition of flatly update
                    wedges[i].animate(newAttributes, ms || 750, 'backOut', callback);
                } else {
                    wedges[i].attr(newAttributes);
                    if(callback){
                        callback();
                    }
                }
            }
        }

        /**
         * Either clears the selectedWedge or sets it to a new value.  Does not cause wedgeSelectionChanged event!
         * @param [wedge] {object} Raphael wedge from the current pie to update the selectedWedge to.
         */
        function resetSelectedWedge(wedge){
            if(wedge) {
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
        function isSelectedWedge(wedge){
            return (wedge === selectedWedge);
        }
        /**
         * Checks whether or not a clicked on wedge is different than the wedge that was previously the selectedWedge.
         * Triggers a wedgeSelectionChanged event if one was provided.
         * @param [wedge] {object} Raphael wedge from the current pie that is the new selectedWedge.
         */
        function updateSelectedWedge(wedge){
            var previouslySelectedWedge;

            if(selectedWedge === wedge) {
                return;
            } else {
                previouslySelectedWedge = selectedWedge;
                selectedWedge = wedge;

                if(graph.options.pie.wedgeSelectionChanged) {
                    graph.options.pie.wedgeSelectionChanged(previouslySelectedWedge, selectedWedge);
                } else {
                    showMessageTextSet(false);
                    showMessageBoxSet(false);
                    rotateToWedge(wedge);
                }
            }
        }

        /**
         * Draws an advandedPie and provides appropriate styling and callback hooks.
         */
        function drawPie() {

            /**
             * Wrapper function that calls a user provided method (if one is provided) for a click event on a wedge, or
             * by default rotateToWedge.
             * @param wedge {object} Raphael element for the clicked wedge
             */
            function wedgeClick(wedge){

                if(graph.options.pie.wedgeClick) {
                    graph.options.pie.wedgeClick(wedge);
                }

                updateSelectedWedge(wedge);


            }

            /**
             * Wrapper function that calls a user provided method (if one is provided) for a hover entered event on a
             * wedge.
             * @param e {Object} Mouse event object
             * @param wedge {object} Raphael element for the entered wedge
             */
            function wedgeEnter(e,wedge){
                if(graph.options.pie.wedgeHoverIn) {
                    graph.options.pie.wedgeHoverIn(e,wedge);
                } else {
                    resetMessageTextSet([graph.paper.text(center.x, center.y, wedge.data.value).attr({'font-size':40})]);
                    showMessageBoxSet(true);
                }
            }

            /**
             * Wrapper function that calls a user provided method (if one is provided) for a hover exit event on a
             * wedge.
             * @param e {Object} Mouse event object
             * @param wedge {object} Raphael element for the exited wedge
             */
            function wedgeExit(e,wedge){
                var i;
                if(graph.options.pie.wedgeHoverOut) {
                    graph.options.pie.wedgeHoverOut(e,wedge);
                } else {
                    /* Don't need to do anything if entering another wedge */
                    for(i = 0; i < wedges.length; i+=1) {
                        if(wedges[i].node === e.toElement) {
                            return;
                        }
                    }

                    /* Don't need to do anything if entering the inner circle */
                    if(e.toElement === messageBoxSet[1].node) {
                        return;
                    }

                    showMessageBoxSet(false);
                    showMessageTextSet(false);

                }
            }

            function generateWedge() {
                var wedge = graph.paper.path()
                    .click(function(e){ wedgeClick(wedge); })
                    .hover(function(e){ wedgeEnter(e,wedge); },
                    function(e){ wedgeExit(e,wedge); });
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
                    .attr(graph.options.pie.wedgeAttributes);

                wedge.data = data[i];

                if(graph.options.animation) {
                    wedge.attr({segment: [center.x, center.y, 1, start, start + val]});
                } else {
                    wedge.attr({segment: [center.x, center.y, radius, start, start + val],
                        transform: [S11+CENTER_COORDINATES+'r'+ defaultRotation +','+CENTER_COORDINATES]});
                }

                wedges.push(wedge);

                start += val;
            }

            if(graph.options.animation) {
                loadAnimation(1000);
            }

            generateMessageBoxSet();
        }

        /**
         * Rotate the pie clockwise.
         * @param deg {number} Number of degrees to callback pie.
         * @param [callback] {void} Function to execute on completion of rotation.
         */
        function rotate(deg, callback) {
            if(graph.options.animation) {
                //Do not waste time animating a non event, if we're at the rotation angle, cut out early.
                if(getDegreesRotated() === deg) {
                    if(callback){
                        callback();
                    }
                    return;
                } else {
                    wedges.animate({transform: [S11+CENTER_COORDINATES+'r'+ deg +','+CENTER_COORDINATES]},
                        675,
                        'backOut',
                        callback);
                }
            } else {
                wedges.attr({transform: [S11+CENTER_COORDINATES+'r'+ deg+','+CENTER_COORDINATES]});
                if(callback){
                    callback();
                }
            }
        }
        /**
         * Rotate the center of a pie wedge to 0 degrees.
         * @param wedge {object} Wedge to rotate to, must be in pie's wedges set.
         * @param [callback] {void} Function to execute on completion of rotation.
         */
        function rotateToWedge(wedge, callback) {
            callback = callback || function(){};
            var a1 = wedge.attr('segment')[3],
                a2 = wedge.attr('segment')[4],
                t = a2-((a2-a1)/2);

            rotate(-t, callback);
        }

        /**
         * @return {number} number of degrees the pie is currently rotated
         */
        function getDegreesRotated(){
            return wedges[0].attr("transform")[1][1];
        }

        /**
         * Update the pie graph data and resize the wedges accordingly.
         * @param newSeries {object} New data to base pie off of.
         * @param newSeriesIndex {number} Index to use in the newSeries.
         */
        function updateLive(newSeries, newSeriesIndex, callback) {
            series = graph.allSeries.series = graph.allSeries[0].series = newSeries;
            seriesIndex = newSeriesIndex;

            graph.sums = elroi.fn.helpers.sumSeries(elroi.fn.helpers.getDataValues(graph.allSeries));
            graph.hasData = elroi.fn.helpers.hasData(graph.allSeries);

            resize(500, callback);
        }

        /**
         * Returns set that will be used for message box.  Provides set to custom user plugs
         */
        function generateMessageBoxSet(){
            messageBoxSet = graph.paper.set();

            /* strokeWidth is to ensure that the hit circle detects mouse events on the outline of the
             * visible under circle */
            var strokeWidth = (graph.options.pie.messageBoxSetAttributes['stroke-width']) ?
                graph.options.pie.messageBoxSetAttributes['stroke-width']
                : 0;

            messageBoxSet.push(
                graph.paper
                    .circle(center.x, center.y, graph.options.pie.innerRadius)
                    .attr({fill: 'white', opacity: 0.0})
                    .attr(graph.options.pie.messageBoxSetAttributes),
                graph.paper
                    .circle(center.x, center.y, graph.options.pie.innerRadius+strokeWidth)
                    .attr(graph.options.pie.messageBoxSetAttributes)
                    .attr({fill: 'red', 'stroke-width':0})
                    .attr({opacity: 0})
            );
        }

        /**
         * Get the set of elements used as the message box.  The message box is the part of the message that is
         * static, versus the dynamic text.  In the default case this is the white inner 'donut' and the invisible
         * hit circle that covers it.
         * @return {object} Raphael set with the elements currently comprising the the current message box.
         */
        function getMessageBoxSet(){
            return messageBoxSet;
        }
        /**
         * Shows (or hides) the under layer (not the hit circle) which sits on top.
         * @param {boolean} show true to show lower layers of messageBoxSet, otherwise false.  Always hides the hit circle.
         */
        function showMessageBoxSet(show){
            messageBoxSet[0].attr({opacity: show ? 1 : 0});
        }

        /**
         * Removes the current message text set and all of its elements.  Creates a new Raphael set for the next message
         * text.
         * @param [element] {Array} list of elements to add after resetting the set.
         */
        function resetMessageTextSet(elements) {
            var i,
                elementsLength = elements.length;

            if(messageTextSet){
                messageTextSet.remove();
            }
            messageTextSet = graph.paper.set();

            if(elementsLength > 0) { //We only need to do the remaining pieces if there are elements, moreover insertAfter crashes on an empty set
                for(i = 0; i < elementsLength; i+=1){
                    messageTextSet.push(elements[i]);
                }
            }
            messageTextSet.insertAfter(messageBoxSet[0]); //Insert after the bottom pie slice, this is BEFORE the top layer

        }
        /**
         * Get the set of text elements for the current message.  Unused, may depricate.
         * @return {object} Raphael set with the elements currently comprising the the current messageTextSet.
         */
        function getMessageTextSet(){
            return messageTextSet;
        }
        /**
         * Helper to show or hide the current text in the message box (donut)
         * @param {boolean} show - true to show, false otherwise
         */
        function showMessageTextSet(show){
            messageTextSet.attr({opacity: show ? 1 : 0});
        }


        /**
         * Update the color of each slice of the pie graph and update the graph options.
         * @param colors {array} New color data.
         */
        function updateColors(colors) {
            var i,
                wedgesLength = wedges.length,
                colorsLength = colors.length;

            if(colors === null || colors.length < 1) {
                throw 'Parameter colors must be a non empty array';
            }

            for(i = 0; i < wedgesLength; i+=1) {
                wedges[i].attr({fill: colors[i % colorsLength] });
            }

            graph.options.colors = colors;
        }

        /**
         * Gets the index of a wedge in the wedges array.
         * @param wedge {object} the wedge that is to be found
         * @return {number} index of the wedge if found, otherwise -1
         */
        function getWedgeIndex(wedge){
            var i, //index of wedge for traversal
                wedgesLength = wedges.length; //length of wedges for traversal
            for(i=0; i < wedgesLength; i+=1) {
                if(wedge === wedges[i]) {
                    return i;
                }
            }
            return -1;
        }

        graph.ext.resetSelectedWedge = resetSelectedWedge;
        graph.ext.isSelectedWedge = isSelectedWedge;

        graph.ext.showMessageBoxSet = showMessageBoxSet;
        graph.ext.getMessageBoxSet = getMessageBoxSet;

        graph.ext.showMessageTextSet = showMessageTextSet;
        graph.ext.resetMessageTextSet = resetMessageTextSet;
        graph.ext.getMessageTextSet = getMessageTextSet;

        graph.ext.rotateToWedge = rotateToWedge;
        graph.ext.getWedgeIndex = getWedgeIndex;
        graph.ext.rotate = rotate;

        graph.ext.updateLive = updateLive;
        graph.ext.updateColors = updateColors;

        graph.wedges = wedges;

        return {
            wedges : wedges,
            draw : drawPie
        };
    }

    elroi.fn.pie = pie;

})(elroi, jQuery);(function(elroi, $) {

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

                if(series[i].value || series[i].value === 0 || series[i].pointFlag) {
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
                    
                    if(graph.options.animation){
                        bar.animate({y:y, height: barHeight}, 550, function(){
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

                if(series[i].value || series[i].value === 0 || series[i].pointFlag) {
                    var x = i * graph.xTick + graph.padding.left + (graph.barWhiteSpace/2);
                    var totalBarHeights = seriesSum[i] * yTick;
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
            if(isStacked) {
                $(series).each(function(i) {
                    total += series[i][index].value;
                    if(series[i][index].value < min){
                        min = series[i][index].value;
                    }
                    if(series[i][index].value > max) {
                        max = series[i][index].value;
                    }
                    if(series[i][index].clickTarget){
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
            for(var i = 0; i < series.length; i++) {
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
                            graph.$tooltip.find('.elroi-tooltip-content').html(tipContent);
                        });

                    }
                },
                function() {
                    rolloverBars.attr('stroke-opacity', 0);
                });

            // Attach the click behavior, if we have a target
            $(rollOverTargetBar.node).click(function(){
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
            if(graph.options.animation){
                barObj.animate({y:y, height: barHeight}, 550, function(){
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
                   
            if(isStacked) {
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
                    for(j=0; j < series.length; j++) {
                        color = graph.options.colors[j];
                        drawBar(series[j][i], i, j, graph.yTicks[seriesIndex], color);
                    }
                }
            }

            // draw in the point flags
            graph.$el.bind('barDrawn', function(){$('.elroi-point-flag').fadeIn();});
            for (j = 0; j < series.length; j++) {
                drawPointFlags(series[j], seriesSum, j+1, graph.yTicks[seriesIndex]);
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
