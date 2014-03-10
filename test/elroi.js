/***************************
 * Unit testing Elroi
 *
 */
(function(Q, $, elroi) {

    Q.module('elroi');


    var testSeries = [
        {
            options : {},
            series: [
                [
                    { value: 1 },
                    { value: 2 },
                    { value: 3 },
                    { value: 4 },
                    { value: 5 }
                ] ,
                [
                    { value: 6 },
                    { value: 7, pointFlag : $('<div>Flag!</div>') },
                    { value: 8 },
                    { value: 9 },
                    { value: 10 }
                ]
            ]
        }
    ];

    var testSeriesNoFlags = [
        {
            options : {},
            series: [
                [
                    { value: 1 },
                    { value: 2 },
                    { value: 3 },
                    { value: 4 },
                    { value: 5 }
                ] ,
                [
                    { value: 6 },
                    { value: 7 },
                    { value: 8 },
                    { value: 9 },
                    { value: 10 }
                ]
            ]
        }
    ];

    /**
     * Creates a copy of elroi.fn.helpers and merges in the properties provided by propertyOverrides; this will
     * overwrite the value for the property in elroi.fn.helpers with the value from propertyOverrides if there is a
     * conflict.
     *
     * This is extremely useful for stubbing out methods to isolate logic for unit testing purposes!
     *
     * @param {object } propertyOverrides properties to merge into the copy of elroi.fn.helpers
     * @returns {object} a copy of elroi.fn.helpers merged with the properties from propertyOverrides.
     */
    function getMockElroiFnHelpers(propertyOverrides) {
        propertyOverrides = typeof propertyOverrides !== 'undefined' ? propertyOverrides : {};

        return $.extend({}, elroi.fn.helpers,propertyOverrides);
    }

    function createElroiGraphContainer(height, width) {
        height = typeof height !== 'undefined' ? height : 300;
        width = typeof width !== 'undefined' ? width : 900;

        return $('<div/>')
            .css({height: height, width: width})
            .appendTo($('#test'));
    }

    Q.test('elroi exists', function() {
        Q.ok(elroi, 'elroi');
    });

    Q.test('elroi has data tests', function() {
        Q.equal(elroi.fn.helpers.hasData([]), false, "No data at all");
        Q.equal(elroi.fn.helpers.hasData([{series: []}]), false, "Series data, but it's empty");
        Q.equal(elroi.fn.helpers.hasData([{series: [10,20,30]}]), true, "A valid set of data for graphing");
    });

    Q.test('elroi initialization', function() {

        var expectedLineGraphDataValues = [[1,2,3,4,5,6,7,8,9,10]],
            actualLineGraphDataValues = elroi.fn.helpers.getDataValues(testSeries, [{type:'line'}]);
        Q.deepEqual(actualLineGraphDataValues, expectedLineGraphDataValues, 'Data values for line graphs are correct');

        var expectedBarGraphDataValues = [[7,9,11,13,15]],
            actualBarGraphDataValues = elroi.fn.helpers.getDataValues(testSeries, [{type:'stackedBar'}]);
        Q.deepEqual(actualBarGraphDataValues, expectedBarGraphDataValues, 'Data values for bar graphs are correct');

        var expectedNoDataSet = [[0]],
            actualNoDataSet = elroi.fn.helpers.getDataValues('', [{type:'stackedBar'}]);
        Q.deepEqual(actualNoDataSet, expectedNoDataSet, 'Data values are defined when there is no data');

        var expectedSumSeries = [55],
            actualSumSeries = elroi.fn.helpers.sumSeries(expectedLineGraphDataValues);
        Q.deepEqual(actualSumSeries, expectedSumSeries, 'Series sum is correct');

        var shouldHavePointFlags = elroi.fn.helpers.hasPointFlags(testSeries);
        Q.equal(shouldHavePointFlags, true, 'Has point flags');
        var shouldNotHavePointFlags = elroi.fn.helpers.hasPointFlags(testSeriesNoFlags);
        Q.equal(shouldNotHavePointFlags, false, 'Does not have point flags');

    });

    Q.test('hasPointFlags', function() {
        var NO_POINT_FLAGS = [],
            TWO_POINT_FLAGS = ['<div>Arbitrary point flag</div>', '<div>Another arbitrary point flag</div>'];

        function mockElroiFnHelpersWithPointFlags(pointFlagArray) {
            return getMockElroiFnHelpers({
                getPointFlags: function() {
                    return pointFlagArray;
                }
            });
        }

        ok(!mockElroiFnHelpersWithPointFlags(NO_POINT_FLAGS).hasPointFlags(), 'Should return false if getPointFlags is empty.');
        ok(mockElroiFnHelpersWithPointFlags(TWO_POINT_FLAGS).hasPointFlags(), 'Should return true if getPointFlags is non empty.');
    });

    Q.test('minValues', function(){
        var negValueSet = [[1, 15, 30, 78, 96, -32]],
            containsNullValue = [[-1, null, 2]],
            positivesOnly = [[1, 15, 30, 78, 96]],
            multipleSets = [[-2,-1,0], [1,2,3]];

        Q.equal(elroi.fn.helpers.minValues(negValueSet, [{minYValue: 'zeroOrLess'}]), -32, 'ZeroOrLess setting goes negative if it has to');
        Q.equal(elroi.fn.helpers.minValues(positivesOnly, [{minYValue: 'zeroOrLess'}]), 0, 'ZeroOrLess setting stays at 0 if all numbers are positive');

        Q.equal(elroi.fn.helpers.minValues(negValueSet, [{minYValue: 'auto'}]), -32, 'Auto setting gives lowest number if its negative');
        Q.equal(elroi.fn.helpers.minValues(positivesOnly, [{minYValue: 'auto'}]), 1, 'Auto gives the lowest number even if all numbers are positive');

        Q.equal(elroi.fn.helpers.minValues(negValueSet, [{minYValue: 10}]), 10, 'Returns what you send it if it is a hard coded number');

        Q.equal(elroi.fn.helpers.minValues(containsNullValue, [{minYValue: -2}]), -2, 'Returns what you send it if it is a hard coded number');
        Q.equal(elroi.fn.helpers.minValues(containsNullValue, [{minYValue: 'auto'}]), -1, 'Auto setting returns the smallest value even with a null value in the data value set.');
        Q.equal(elroi.fn.helpers.minValues(containsNullValue, [{minYValue: 'zeroOrLess'}]), -1, 'ZeroOrLess setting returns the smallest value even with a null value in the data value set.');


        Q.deepEqual(elroi.fn.helpers.minValues(multipleSets, [{minYValue: 'auto'}, {minYValue: 'auto'}]), [-2, 1],
            'Should provide max for each set of data values provided');
    });

    Q.test('maxValues', function(){
        var positiveSet = [[-1, 0, 1]],
            containsNullValue = [[-1, null, 2]],
            multipleSets = [[-2,-1,0], [1,2,3]];

        Q.equal(elroi.fn.helpers.maxValues(positiveSet, [{maxYValue: 2}]), 2, 'maxYValue is a number, should return maxYValue for series\' data values');

        Q.equal(elroi.fn.helpers.maxValues(positiveSet, [{maxYValue: 'auto'}]), 1, 'maxYValue is auto, should return the max of the series\' data values');

        Q.deepEqual(elroi.fn.helpers.maxValues(multipleSets, [{maxYValue: 'auto'}, {maxYValue: 'auto'}]), [0, 3],
            'Should provide max for each set of data values provided');

        Q.equal(elroi.fn.helpers.maxValues(containsNullValue, [{maxYValue: 3}]), 3, 'Returns what you send it if it is a hard coded number');
        Q.equal(elroi.fn.helpers.maxValues(containsNullValue, [{maxYValue: 'auto'}]), 2, 'Auto setting returns the largest value even with a null value in the data value set.');
    });

    Q.test('pixelsNeededForErrorMessages', function() {
        var $graphWithError = createElroiGraphContainer(100, 900),
            graphWithError = elroi($graphWithError, [], {errorMessage: '<p>This is an error message to test pixelsNeededForErrorMessages</p>'});

        Q.equal(elroi.fn.helpers.pixelsNeededForErrorMessages(graphWithError.graph), 88,
            'Should be 88; errorMessage.top * 2 + errorMessage.outerHeight => 25 * 2 + 38)');
    });

    Q.test('pixelsNeededFor methods return 0 on decoration-less graph', function() {
        var $graphWithoutError = createElroiGraphContainer(100, 900),
            graphWithoutError = elroi($graphWithoutError, [], {});

        Q.equal(elroi.fn.helpers.pixelsNeededForErrorMessages(graphWithoutError.graph), 0,
            'pixelsNeededForErrorMessages should return 0 if graph does not contain an error message');
        Q.equal(elroi.fn.helpers.pixelsNeededForPointFlags(graphWithoutError.graph), 0,
            'pixelsNeededForPointFlags should return 0 if graph does not contain point flags');
        Q.equal(elroi.fn.helpers.pixelsNeededForX2Axis(graphWithoutError.graph), 0,
            'pixelsNeededForX2Axis should return 0 if graph does not contain point flags');
    });

    Q.test('Tests for X2 Labels', function() {
        var barGraphData = [
            {
                options : { type: 'bar'},
                series: [
                    [
                        { value: 1 },
                        { value: 2 }
                    ]
                ]
            }
        ];

        var $barGraph = createElroiGraphContainer();

        graphWithoutError = elroi($barGraph, barGraphData, {axes: {x2: {show: true, labels: ['Label 1', 'Label 2 is very very very long Label 2 is very very very long']}}});

        Q.equal(elroi.fn.helpers.pixelsNeededForX2Axis(graphWithoutError.graph), 35, '29 + 6');
    });


    Q.test('point flag test', function() {
        var INTERNAL_POINT_FLAGS = {bars: {flagPosition: 'interior'}},
            SINGLE_LINE_POINT_FLAG = '<div>Point flag for test</div>',
            SINGLE_LINE_POINT_FLAG_HEIGHT = 24,
            MULTI_LINE_POINT_FLAG = '<div>Point flag for test<br/>With a second row</div>',
            MULTI_LINE_POINT_FLAG_HEIGHT = 38;

        var testSeriesStackedBar = [
            {
                options : { type: 'stackedBar'},
                series: [
                    [
                        { value: 1 },
                        { value: 2 },
                        { value: 3 }
                    ],
                    [
                        { value: 4 },
                        { value: 5, pointFlag : $(SINGLE_LINE_POINT_FLAG) },
                        { value: 6 }
                    ]
                ]
            }
        ];

        var testSeriesBar = [
            {
                options : { type: 'stackedBar'},
                series: [
                    [
                        { value: 1 },
                        { value: 2, pointFlag : $(SINGLE_LINE_POINT_FLAG) }
                    ]
                ]
            }
        ];

        var testSeriesBarMultiplePointFlags = [
            {
                options : { type: 'stackedBar'},
                series: [
                    [
                        { value: 1 },
                        { value: 2, pointFlag : $(SINGLE_LINE_POINT_FLAG) },
                        { value: 3, pointFlag : $(MULTI_LINE_POINT_FLAG) }
                    ]
                ]
            }
        ];

        var stackedBarWithPointFlags = elroi(createElroiGraphContainer(), testSeriesStackedBar),
            stackedBarWithInternalPointFlags = elroi(createElroiGraphContainer(), testSeriesStackedBar, INTERNAL_POINT_FLAGS),
            barWithPointFlags = elroi(createElroiGraphContainer(), testSeriesBar),
            barWithInternalPointFlags = elroi(createElroiGraphContainer(), testSeriesBar, INTERNAL_POINT_FLAGS),
            stackedBarWithMultiplePointFlags = elroi(createElroiGraphContainer(), testSeriesBarMultiplePointFlags);

        Q.equal(elroi.fn.helpers.pixelsNeededForPointFlags(stackedBarWithPointFlags.graph), SINGLE_LINE_POINT_FLAG_HEIGHT, 'When graph type is bar, should find a point flag that matches the outerHeight of the content.');

        Q.equal(elroi.fn.helpers.pixelsNeededForPointFlags(barWithPointFlags.graph), SINGLE_LINE_POINT_FLAG_HEIGHT, 'When type is stackedBar, should find a point flag that matches the outerHeight of the content.');

        Q.equal(elroi.fn.helpers.pixelsNeededForPointFlags(stackedBarWithMultiplePointFlags.graph), MULTI_LINE_POINT_FLAG_HEIGHT, 'Should find 2 point flags and use the one with the greatest outerHeight (pf0: 0px, pf1: 24px, pf2: 38px).');

        Q.equal(elroi.fn.helpers.pixelsNeededForPointFlags(stackedBarWithInternalPointFlags.graph), 0, 'When graph type is stackedBar, should return 0 if point flags are internal.');

        Q.equal(elroi.fn.helpers.pixelsNeededForPointFlags(barWithInternalPointFlags.graph), 0, 'When graph type is bar, Should return 0 if point flags are internal.');
    });

    Q.test('percentRangeOffsetNeededForLabeling', function() {
        function mockElroiFnHelperWithPixelsNeededForMethods (pixelsNeedForOverrides) {
            var pixelsNeededFor = $.extend({errorMessages: 0, pointFlags: 0, X2Axis: 0}, pixelsNeedForOverrides);
            return getMockElroiFnHelpers({
                pixelsNeededForErrorMessages: function(graph) { return pixelsNeededFor.errorMessages; },
                pixelsNeededForPointFlags: function(graph) { return pixelsNeededFor.pointFlags; },
                pixelsNeededForX2Axis: function(graph) { return pixelsNeededFor.X2Axis; }
            });
        }

        function getPercentRangeOffsetNeededForGraphHeight100(pixelsNeedForOverrides) {
            var graphConfiguration = {height: 120, padding: {top: 5, bottom: 15}};
            return mockElroiFnHelperWithPixelsNeededForMethods(pixelsNeedForOverrides)
                .percentRangeOffsetNeededForLabeling(graphConfiguration);
        }

        var labelsEqualToHeight = {errorMessages: 25, pointFlags: 25, X2Axis: 50},
            labelsGreaterThanHeight = {errorMessages: 26, pointFlags: 25, X2Axis: 50};

        Q.equal(getPercentRangeOffsetNeededForGraphHeight100({errorMessages: 20}), .25, 'percentRangeOffsetNeededForLabeling correctly calculates percentage needed for error messages');
        Q.equal(getPercentRangeOffsetNeededForGraphHeight100({pointFlags: 50}), 1, 'percentRangeOffsetNeededForLabeling correctly calculates percentage needed for point flags');
        Q.equal(getPercentRangeOffsetNeededForGraphHeight100({X2Axis: 75}), 3, 'percentRangeOffsetNeededForLabeling correctly calculates percentage needed for x2 axis');

        Q.equal(getPercentRangeOffsetNeededForGraphHeight100(labelsEqualToHeight), 0, 'percentRangeOffsetNeededForLabeling returns 0 if labels requires height equal to graph\'s height');
        Q.equal(getPercentRangeOffsetNeededForGraphHeight100(labelsGreaterThanHeight), 0, 'percentRangeOffsetNeededForLabeling returns 0 if labels requires height greater than graph\'s height');
    });

    Q.test('adjustedMaxMinValues', function() {
        function mockElroiFnHelper (configuration) {
            return getMockElroiFnHelpers({
                minValues: function(seriesDataValues, seriesOptions) { return configuration.min; },
                maxValues: function(seriesDataValues, seriesOptions) { return configuration.max; },
                percentRangeOffsetNeededForLabeling: function(graph) {
                    return configuration.percentRangeOffsetNeededForLabeling;
                }
            });
        }
        var DONT_DISTORT_AXIS = {dontDistortAxis: true},
            DISTORT_AXIS = {dontDistortAxis: false};

        var helperWithNegativeMin = mockElroiFnHelper({min: [-1], max: [1], percentRangeOffsetNeededForLabeling: .5}),
            helperWithZeroMax = mockElroiFnHelper({min: [-1], max: [0], percentRangeOffsetNeededForLabeling: .25}),
            helperWithMultipleSeries = mockElroiFnHelper({min: [0, 2], max: [1, 4], percentRangeOffsetNeededForLabeling: .25}),
            helperWithSameMaxMin = mockElroiFnHelper({min: [1], max: [1], percentRangeOffsetNeededForLabeling: .25});

        var result = helperWithNegativeMin.adjustedMaxMinValues(null, [DISTORT_AXIS], null);

        Q.equal(result.minValues[0], -1, 'Should always leave min value untouched');
        Q.equal(result.maxValues[0], 2, 'Should have adjusted max by 1 (range * percentRangeOffsetNeededForLabeling | 2 * .5).');

        result = helperWithNegativeMin.adjustedMaxMinValues(null, [DONT_DISTORT_AXIS], null);

        Q.equal(result.minValues[0], -1, 'Should always leave min value untouched');
        Q.equal(result.maxValues[0], 1, 'Should leave max alone if dontDistortAxis for series is true.');

        //Verify scaling works with a zero max; as we distort our scale by adding padding to the maximum value it is
        //important that scaling works appropriately if the max is 0.  This case didn't work at all when multiplicative
        //scaling was used!
        result = helperWithZeroMax.adjustedMaxMinValues(null, [DISTORT_AXIS], null);

        Q.equal(result.minValues[0], -1, 'Should always leave min value untouched');
        Q.equal(result.maxValues[0], .25, 'Should have adjusted max by 1 (range * percentRangeOffsetNeededForLabeling | 2 * .5).');

        result = helperWithMultipleSeries.adjustedMaxMinValues(null, [DONT_DISTORT_AXIS, DISTORT_AXIS], null);

        Q.equal(result.minValues[0], 0, 'Should always leave min value untouched');
        Q.equal(result.maxValues[0], 1, 'Should leave max alone if dontDistortAxis for series is true.');

        Q.equal(result.minValues[1], 2, 'Should always leave min value untouched');
        Q.equal(result.maxValues[1], 4.5, 'Should have adjusted max by .5 (range * percentRangeOffsetNeededForLabeling | 2 * .25).');

        result = helperWithSameMaxMin.adjustedMaxMinValues(null, [DONT_DISTORT_AXIS], null);

        Q.equal(result.minValues[0], 1, 'Should always leave min value untouched');
        Q.equal(result.maxValues[0], 2, 'Should have bumped max up to 2 so min (1) and max don\'t match; no distortion should have been applied otherwise.');

        result = helperWithSameMaxMin.adjustedMaxMinValues(null, [DISTORT_AXIS], null);

        Q.equal(result.minValues[0], 1, 'Should always leave min value untouched');
        Q.equal(result.maxValues[0], 2.25, 'Should have bumped max up to 1 so min and max don\'t match and then distorted by .25 (range * percentRangeOffsetNeededForLabeling | 1 * .25).');

    });

    Q.test('elroi can handle an empty dataset without dying', function() {
        var expectedFormattedData = [];
        var formattedData = elroi.fn.helpers.dataCleaner([]);
        Q.deepEqual(formattedData, expectedFormattedData, 'Data cleaner spits back out empty data');

    });

    Q.test('elroi accepts simple arrays for data', function() {
        var simpleData = [1,2,3,4,5,6,7];
        var expectedFormattedData = [{series: [[{value: 1},{value: 2},{value: 3},{value: 4},{value: 5},{value: 6},{value: 7}]]}];
        var formattedData = elroi.fn.helpers.dataCleaner(simpleData);
        Q.deepEqual(formattedData, expectedFormattedData, 'Simple array is correctly reformmated');

    });

    Q.test('elroi accepts a single series for data', function() {
        var singleSeries = [ {value: 1}, {value: 2}, {value: 3}, {value: 4}, {value: 5}, {value: 6}, {value: 7}];
        var expectedFormattedData = [{series: [[{value: 1},{value: 2},{value: 3},{value: 4},{value: 5},{value: 6},{value: 7}]]}];
        var formattedData = elroi.fn.helpers.dataCleaner(singleSeries);
        Q.deepEqual(formattedData, expectedFormattedData, 'Single series is correctly reformmated');

    });

    Q.test('elroi accepts a single series with options for data', function() {
        var singleSeries = { series: [ {value: 1}, {value: 2}, {value: 3}, {value: 4}, {value: 5}, {value: 6}, {value: 7}], options: {type: 'bar'}};
        var expectedFormattedData = [{series: [[{value: 1},{value: 2},{value: 3},{value: 4},{value: 5},{value: 6},{value: 7}]], options: {type: 'bar'}}];
        var formattedData = elroi.fn.helpers.dataCleaner(singleSeries);
        Q.deepEqual(formattedData, expectedFormattedData, 'Single series with options is correctly reformmated');

    });

    Q.test('default tooltips', function(){
        var expectedTooltips = ['45<br/>56', '57<br/>78'];
        var testSeries = [{
            series:[
                [{value:45},{value:57}],
                [{value:56},{value:78}]
            ]
        }];
        Q.deepEqual(elroi.fn.helpers.buildDefaultTooltips(testSeries), expectedTooltips, 'Has correct tooltips');
    });

    Q.test('elroi date formatter', function(){
        Q.equal(elroi.fn.formatDate('D', new Date('2011/06/01')), 'Wed', 'Short day names');
        Q.equal(elroi.fn.formatDate('DD', new Date('2011/06/02')), 'Thursday', 'Long day names');
        Q.equal(elroi.fn.formatDate('M', new Date('2011/06/01')), 'Jun', 'Short month names');
        Q.equal(elroi.fn.formatDate('MM', new Date('2011/08/02')), 'August', 'Long month names');
        Q.equal(elroi.fn.formatDate('d', new Date('2011/06/01')), '1', 'Single digit day');
        Q.equal(elroi.fn.formatDate('dd', new Date('2011/08/02')), '02', 'Double digit day');
        Q.equal(elroi.fn.formatDate('m', new Date('2011/04/01')), '4', 'Single digit month');
        Q.equal(elroi.fn.formatDate('mm', new Date('2011/03/02')), '03', 'Double digit month');
        Q.equal(elroi.fn.formatDate('y', new Date('2001/04/01')), '01', 'Double digit year');
        Q.equal(elroi.fn.formatDate('yy', new Date('2011/03/02')), '2011', 'Full year');
        Q.equal(elroi.fn.formatDate('h a', new Date('2011/03/02 13:00')), '1 pm', 'Single digit time with pm');
        Q.equal(elroi.fn.formatDate('hh a', new Date('2011/03/02 01:00')), '01 am', 'Double digit time with am');
        Q.equal(elroi.fn.formatDate('H:n', new Date('2011/03/02 01:09')), '1:09', 'Single digit military time');
        Q.equal(elroi.fn.formatDate('HH:n', new Date('2011/03/02 13:47')), '13:47', 'Double digit military time');

        var deDayNamesShort = ['So','Mo','Di','Mi','Do','Fr','Sa'],
            deDayNamesLong = ['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag'],
            deMonthNamesShort = ['Jan','Feb','März','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'],
            deMonthNamesLong = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'],
            capMeridians = ['AM', 'PM'];

        // date format options
        Q.equal(elroi.fn.formatDate('HH:n a', new Date('2011/06/03 13:47'), {meridian: capMeridians}), '13:47 PM', 'Overwrite meridian ');
        Q.equal(elroi.fn.formatDate('DD', new Date('2011/06/02'), {dayNamesLong: deDayNamesLong}), 'Donnerstag', 'Overwrite long day names');
        Q.equal(elroi.fn.formatDate('D', new Date('2011/06/01'), {dayNamesShort: deDayNamesShort}), 'Mi', 'Overwrite short day names');
        Q.equal(elroi.fn.formatDate('M', new Date('2011/03/01'), {monthNamesShort: deMonthNamesShort}), 'März', 'Overwrite short month names');
        Q.equal(elroi.fn.formatDate('MM', new Date('2011/12/02'), {monthNamesLong: deMonthNamesLong}), 'Dezember', 'Overwrite long month names');


    });

    Q.test('elroi year stripping format string', function(){
        Q.equal(elroi.fn.stripYearFromDateFormat('M d y'), 'M d', 'Drop 2-digit year and leading space');
        Q.equal(elroi.fn.stripYearFromDateFormat('M d yy'), 'M d', 'Drop full year and leading space');
        Q.equal(elroi.fn.stripYearFromDateFormat('y d M'), 'd M', 'Drop 2-digit year and trailing space');
        Q.equal(elroi.fn.stripYearFromDateFormat('yy  d M'), 'd M', 'Drop full year and trailing spaces');
        Q.equal(elroi.fn.stripYearFromDateFormat('d/m/y'), 'd/m', 'Drop year from d/m/y');
        Q.equal(elroi.fn.stripYearFromDateFormat('yy/mm/dd'), 'mm/dd', 'Drop year from yy/mm/dd');
        Q.equal(elroi.fn.stripYearFromDateFormat('yy-mm-dd'), 'mm-dd', 'Drop year from yy-mm-dd');
        Q.equal(elroi.fn.stripYearFromDateFormat('M d, yy'), 'M d', 'Drop trailing year in US format');
        Q.equal(elroi.fn.stripYearFromDateFormat('d M yy'), 'd M', 'Drop trailing year in Euro format');
    });

    Q.test('elroi date range format', function(){
        var marchOne2011 = new Date('2011/03/01');
        var marchTen2011 = new Date('2011/03/10');
        var aprilOne2011 = new Date('2011/04/01');
        var marchEleven2012 = new Date('2012/03/11');
        var START_TAG = '<span class="nowrap">';
        var END_TAG = '</span>';

        function parseResult(startDate, endDate) {
            return START_TAG + startDate + END_TAG + '&nbsp;&ndash;&nbsp;' + START_TAG + endDate + END_TAG;
        };

        Q.equal(elroi.fn.formatDateRange('M d, yy', marchOne2011, marchTen2011, {}), parseResult('Mar 1', 'Mar 10, 2011'), 'same month+year, year dropped');
        Q.equal(elroi.fn.formatDateRange('M d, yy', marchOne2011, marchTen2011, {skipRepeatedYear: true}),
            parseResult('Mar 1', 'Mar 10, 2011'), 'same month+year, year dropped, skipRepeatedYear explicit true');
        Q.equal(elroi.fn.formatDateRange('M d, yy', marchOne2011, marchTen2011, {skipRepeatedYear: false}),
            parseResult('Mar 1, 2011', 'Mar 10, 2011'), 'same month+year, year dropped, skipRepeatedYear explicit false');

        Q.equal(elroi.fn.formatDateRange('M d, yy', marchOne2011, aprilOne2011, {}), parseResult('Mar 1', 'Apr 1, 2011'), 'different month, same year, year dropped');
        Q.equal(elroi.fn.formatDateRange('d M y', marchOne2011, aprilOne2011, {}), parseResult('1 Mar', '1 Apr 11'), 'd M y format, same year, year dropped');
        Q.equal(elroi.fn.formatDateRange('d M yy', marchOne2011, marchEleven2012, {}), parseResult('1 Mar 2011', '11 Mar 2012'), 'd M yy format, different year');
        Q.equal(elroi.fn.formatDateRange('d M yy', marchOne2011, marchEleven2012, {skipRepeatedYear: true}),
            parseResult('1 Mar 2011', '11 Mar 2012'), 'd M yy format, different year, skip repeated year ignored');
    });

    Q.test('elroi decimal/thousands separator number formatting', function () {
        //No formatting required positive/zero/negative
        Q.equal(elroi.fn.helpers.commaFormat(1, 0, ',', '.'), '1', 'No formatting required 1');
        Q.equal(elroi.fn.helpers.commaFormat(0, 0, ',', '.'), '0', 'No formatting required 0');
        Q.equal(elroi.fn.helpers.commaFormat(-1, 0, ',', '.'), '-1', 'No formatting required -1');

        //Precision
        Q.raises(function() { elroi.fn.helpers.commaFormat(1, -1, ',', '.'); }, 'Invalid negative precision throws error');
        Q.equal(elroi.fn.helpers.commaFormat(1, null, ',', '.'), '1', 'Null treated as 0 precision');
        Q.equal(elroi.fn.helpers.commaFormat(1, 1, ',', '.'), '1.0', 'Provides proper precision (case 1)');
        Q.equal(elroi.fn.helpers.commaFormat(1.2345, 3, ',', '.'), '1.234', 'Provides proper precision (case 2)');

        //Thousands Separator
        Q.equal(elroi.fn.helpers.commaFormat(1000, 0, null, '.'), '1 000', 'Null treated as blank space separator');
        Q.equal(elroi.fn.helpers.commaFormat(1000, 0, ',', '.'), '1,000', 'Provides proper thousands separator (case 1; comma separator)');
        Q.equal(elroi.fn.helpers.commaFormat(1000000, 0, ' ', '.'), '1 000 000', 'Provides proper thousands separator (case 2; space separator)');

        //Decimal Separator
        Q.equal(elroi.fn.helpers.commaFormat(1.2345, 4, ',', null), '1 2345', 'Null treated as blank space separator');
        Q.equal(elroi.fn.helpers.commaFormat(1.2345, 4, ',', ','), '1,2345', 'Provides proper decimal separator (case 1; comma separator)');
        Q.equal(elroi.fn.helpers.commaFormat(1.2345, 4, ',', '.'), '1.2345', 'Provides proper decimal separator (case 2; decimal separator)');
    });

    Q.test('elroi date range determiner', function() {
        var subDaily =
            [
                {
                    series:
                        [
                            [
                                {value:1, date: '2009/05/01 03:59:59'}, {value: 2, date:'2009/05/01 04:59:59'}
                            ]
                        ]
                }
            ];
        var monthlyGaps =
            [
                {
                    series:
                        [
                            [
                                {value:1, date: '2009/05/01 03:59:59'}, {value: 2, date:'2009/06/01 03:59:59'}
                            ]
                        ]
                }
            ];
        var withinAMonth =
            [
                {
                    series:
                        [
                            [
                                {value:1, date: '2009/05/01 03:59:59'}, {value: 2, date:'2009/05/04 03:59:59'}
                            ]
                        ]
                }
            ];
        var multiYear =
            [
                {
                    series:
                        [
                            [
                                {value:1, date: '2009/05/01 03:59:59'}, {value: 2, date:'2010/05/01 03:59:59'}
                            ]
                        ]
                }
            ];


        Q.equal(elroi.fn.helpers.determineDateFormat(subDaily), 'h:nna', 'Under a day should get timestamps');
        Q.equal(elroi.fn.helpers.determineDateFormat(monthlyGaps), 'M', 'Dates a month apart should give monthly formats');
        Q.equal(elroi.fn.helpers.determineDateFormat(withinAMonth), 'M, d', 'Dates within the same month should get day/month');
        Q.equal(elroi.fn.helpers.determineDateFormat(multiYear), 'yy', 'Year spanners should use the year');
    });

    /*
     * This is the start of a series of visual tests for seeing elroi render in various ways.
     * These tests will be helpful for:
     *   - browser testing
     *   - performance testing
     *   - learning how elroi can be configured
     *   - testing all of elroi's features
     * We may break these into separate files because there is a lot of data.
     */


    Q.test('elroi visual test 1 - line graph', function() {
        var $graph = createElroiGraphContainer();


        var e = elroi(
            $graph,
            [
                {
                    series:
                        [
                            [
                                {
                                    value: 683,
                                    clickTarget: '/ei/app/myEnergyUse/usage/bill/2009/4?meterType=ELEC',
                                    pointFlag: false,
                                    endDate: '2009/05/01 03:59:59'
                                },
                                {value: 689,clickTarget: '/ei/app/myEnergyUse/usage/bill/2009/5?meterType=ELEC',pointFlag: false,endDate: '2009/06/01 03:59:59'},
                                {value: 708,clickTarget: '/ei/app/myEnergyUse/usage/bill/2009/6?meterType=ELEC',pointFlag: false,endDate: '2009/07/01 03:59:59'},
                                {value: 680,clickTarget: '/ei/app/myEnergyUse/usage/bill/2009/7?meterType=ELEC',pointFlag: false,endDate: '2009/08/01 03:59:59'},
                                {value: 690,clickTarget: '/ei/app/myEnergyUse/usage/bill/2009/8?meterType=ELEC',pointFlag: false,endDate: '2009/09/01 03:59:59'},
                                {value: 682,clickTarget: '/ei/app/myEnergyUse/usage/bill/2009/9?meterType=ELEC',pointFlag: false,endDate: '2009/10/01 03:59:59'},
                                {value: 685,clickTarget: '/ei/app/myEnergyUse/usage/bill/2009/10?meterType=ELEC',pointFlag: false,endDate: '2009/11/01 03:59:59'},
                                {value: 707,clickTarget: '/ei/app/myEnergyUse/usage/bill/2009/11?meterType=ELEC',pointFlag: false,endDate: '2009/12/01 03:59:59'},
                                {value: 702,clickTarget: '/ei/app/myEnergyUse/usage/bill/2009/12?meterType=ELEC',pointFlag: false,endDate: '2010/01/01 03:59:59'},
                                {value: 653,clickTarget: '/ei/app/myEnergyUse/usage/bill/2010/1?meterType=ELEC',pointFlag: false,endDate: '2010/02/01 03:59:59'},
                                {value: 748,clickTarget: '/ei/app/myEnergyUse/usage/bill/2010/2?meterType=ELEC',pointFlag: false,endDate: '2010/03/01 03:59:59'},
                                {value: 748,clickTarget: '/ei/app/myEnergyUse/usage/bill/2010/3?meterType=ELEC',pointFlag: false,endDate: '2010/04/01 03:59:59'}
                            ]
                        ],
                    options:
                    {
                        type:  'line'
                    }
                }
            ],
            {
                tooltip:
                {
                    width: 180
                },
                colors:
                    [
                        '#33bbcc',
                        '#888888',
                        '#99cc33'
                    ],
                axes:
                {
                    x1: {},
                    y1:
                    {
                        unit: 'kWh'
                    }
                },
                messages:
                {
                    rateCallouts:
                    {
                        REBATE: 'You earned a {0} rebate.',
                        PEAK_DAY: 'Peak Day'
                    },
                    usage:
                    {
                        you:  'You',
                        effNeighbors:  'Efficient',
                        allNeighbors:  'All neighbors'
                    },
                    drilldowns:
                    {
                        DAY:  'View each day',
                        HOUR: 'View each hour'
                    },
                    error:
                    {
                        noEnergyData:  'Data not available.',
                        noNeighbor:  'Neighbor comparisons are not yet available in this view. <a href="/ei/app/myEnergyUse/neighbors/year/">See your comparison for the year &raquo;</a>',
                        noCostData: 'Your costs are not yet available in this view. <a href="/ei/app/myEnergyUse/rates/year/">See your costs for the year &raquo;</a>',
                        noData: 'Data not available.',
                        noAmiBill: 'This data is not available because your Smart Meter was not installed yet.',
                        noAmiDay: 'This data is not available because your Smart Meter was not installed yet.<br /><a href="/ei/app/myEnergyUse/usage/day/2009/05/01">See your first available day &raquo;</a>',
                        insufficientData: 'We&#39;re still collecting the rest of your data for this day. Check back tomorrow.'
                    },
                    units:
                    {
                        KWH: 'kWh',
                        THERM: 'therms'
                    },
                    axis:
                    {
                        dupeMonth: '<p><strong>About your billing cycle</strong></p><p>You had multiple bills during the same month. Each bill covers different days of the month. Move your mouse over the graph to see the date range.</p>'
                    }
                },
                dates: { format: 'M'},
                errorMessage: false
            },
            [
                {
                    dateRange:  'Apr 1 &ndash; Apr 30',
                    you: 683,
                    unit:  'kWh',
                    drillLink:  '/ei/app/myEnergyUse/usage/bill/2009/4?meterType=ELEC',
                    drillMessage: 'View each day'
                },
                {dateRange: 'May 1 &ndash; May 31',you: 689,unit: 'kWh',drillLink: '/ei/app/myEnergyUse/usage/bill/2009/5?meterType=ELEC',drillMessage: 'View each day'},
                {dateRange: 'Jun 1 &ndash; Jun 30',you: 708,unit: 'kWh',drillLink: '/ei/app/myEnergyUse/usage/bill/2009/6?meterType=ELEC',drillMessage: 'View each day'},
                {dateRange: 'Jul 1 &ndash; Jul 31',you: 680,unit: 'kWh',drillLink: '/ei/app/myEnergyUse/usage/bill/2009/7?meterType=ELEC',drillMessage: 'View each day'},
                {dateRange: 'Aug 1 &ndash; Aug 31',you: 690,unit: 'kWh',drillLink: '/ei/app/myEnergyUse/usage/bill/2009/8?meterType=ELEC',drillMessage: 'View each day'},
                {dateRange: 'Sep 1 &ndash; Sep 30',you: 682,unit: 'kWh',drillLink: '/ei/app/myEnergyUse/usage/bill/2009/9?meterType=ELEC',drillMessage: 'View each day'},
                {dateRange: 'Oct 1 &ndash; Oct 31',you: 685,unit: 'kWh',drillLink: '/ei/app/myEnergyUse/usage/bill/2009/10?meterType=ELEC',drillMessage: 'View each day'},
                {dateRange: 'Nov 1 &ndash; Nov 30',you: 707,unit: 'kWh',drillLink: '/ei/app/myEnergyUse/usage/bill/2009/11?meterType=ELEC',drillMessage: 'View each day'},
                {dateRange: 'Dec 1 &ndash; Dec 31',you: 702,unit: 'kWh',drillLink: '/ei/app/myEnergyUse/usage/bill/2009/12?meterType=ELEC',drillMessage: 'View each day'},
                {dateRange: 'Jan 1 &ndash; Jan 31',you: 653,unit: 'kWh',drillLink: '/ei/app/myEnergyUse/usage/bill/2010/1?meterType=ELEC',drillMessage: 'View each day'},
                {dateRange: 'Feb 1 &ndash; Feb 28',you: 748,unit: 'kWh',drillLink: '/ei/app/myEnergyUse/usage/bill/2010/2?meterType=ELEC',drillMessage: 'View each day'},
                {dateRange: 'Mar 1 &ndash; Mar 31',you: 748,unit: 'kWh',drillLink: '/ei/app/myEnergyUse/usage/bill/2010/3?meterType=ELEC',drillMessage: 'View each day'}
            ]
        );

    });

    Q.test('elroi visual test 2 - no animations', function() {
        var testSeriesData =
            [
                [
                    {value: 683, endDate: '2009/05/01 03:59:59'},
                    {value: 689, endDate: '2009/06/01 03:59:59'},
                    {value: 708, endDate: '2009/07/01 03:59:59'},
                    {value: 680, endDate: '2009/08/01 03:59:59'},
                    {value: 690, endDate: '2009/09/01 03:59:59'},
                    {value: 682, endDate: '2009/10/01 03:59:59'},
                    {value: 685, endDate: '2009/11/01 03:59:59'},
                    {value: 707, endDate: '2009/12/01 04:59:59'},
                    {value: 702, endDate: '2010/01/01 04:59:59'},
                    {value: 653, endDate: '2010/02/01 04:59:59'},
                    {value: 748, endDate: '2010/03/01 04:59:59'},
                    {value: 748, endDate: '2010/04/01 03:59:59'}
                ],
                [
                    {value: 383, endDate: '2009/05/01 03:59:59'},
                    {value: 389, endDate: '2009/06/01 03:59:59'},
                    {value: 308, endDate: '2009/07/01 03:59:59'},
                    {value: 380, endDate: '2009/08/01 03:59:59'},
                    {value: 390, endDate: '2009/09/01 03:59:59'},
                    {value: 382, endDate: '2009/10/01 03:59:59'},
                    {value: 285, endDate: '2009/11/01 03:59:59'},
                    {value: 407, endDate: '2009/12/01 04:59:59'},
                    {value: 502, endDate: '2010/01/01 04:59:59'},
                    {value: 353, endDate: '2010/02/01 04:59:59'},
                    {value: 448, endDate: '2010/03/01 04:59:59'},
                    {value: 448, endDate: '2010/04/01 03:59:59'}
                ]
            ];

        var deDayNamesShort = ['So','Mo','Di','Mi','Do','Fr','Sa'],
            deDayNamesLong = ['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag'],
            deMonthNamesShort = ['Jan','Feb','März','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];

        /* Line graph */
        elroi(createElroiGraphContainer(),
            [ { series: testSeriesData, options : { type: 'line'} }],
            { animation: false });

        /* Stacked bar graph */
        elroi(createElroiGraphContainer(),
            [ { series: testSeriesData, options : { type: 'stackedBar'} }],
            {  colors: ['#000', '#090'] });

        /* Stacked Bar graph */
        elroi(createElroiGraphContainer(),
            [ { series: testSeriesData, options : { type: 'bar'} }],
            { animation: false });

        /* Easy line graph */
        elroi(createElroiGraphContainer(), [1,3,7,8,9,2,10]);

        /* Single series line graph */
        singleSeriesLineGraph = elroi(createElroiGraphContainer(),
            [{value: 1, endDate: '2009/05/01 03:59:59'},
                {value: 2, date: '2009/06/01 03:59:59'},
                {value: 3, date: '2009/07/01 03:59:59'},
                {value: 4, date: '2009/08/01 03:59:59'},
                {value: 5, date: '2009/09/01 03:59:59'},
                {value: 6, date: '2009/10/01 03:59:59'},
                {value: 7, date: '2009/11/01 03:59:59'}]);

        /* Single series bar graph */
        singleSeriesBarGraph = elroi(createElroiGraphContainer(),
            {series: [ {value: 1}, {value: 2}, {value: 3}, {value: 4}, {value: 5}, {value: 6}, {value: 7}],
                options: {type: 'bar'}});

        /* German date labels */
        germanDateLabels = elroi(
            createElroiGraphContainer(), [{ series: testSeriesData, options : { type: 'line'} }],
            {
                dates: {
                    format: 'DD M',
                    dayNamesShort: deDayNamesShort,
                    dayNamesLong: deDayNamesLong,
                    monthNamesShort: deMonthNamesShort
                }
            });
    });

    Q.test('negative value graphs', function(){
        testSeriesData =
            [
                [
                    {value: 683, endDate: '2009/05/01 03:59:59'},
                    {value: 689, endDate: '2009/06/01 03:59:59'},
                    {value: 708, endDate: '2009/07/01 03:59:59'},
                    {value: 680, endDate: '2009/08/01 03:59:59'},
                    {value: -690, endDate: '2009/09/01 03:59:59'},
                    {value: 682, endDate: '2009/10/01 03:59:59'},
                    {value: 685, endDate: '2009/11/01 03:59:59'},
                    {value: 707, endDate: '2009/12/01 04:59:59'},
                    {value: 702, endDate: '2010/01/01 04:59:59'},
                    {value: 653, endDate: '2010/02/01 04:59:59'},
                    {value: 748, endDate: '2010/03/01 04:59:59'},
                    {value: 748, endDate: '2010/04/01 03:59:59'}
                ],
                [
                    {value: 383, endDate: '2009/05/01 03:59:59'},
                    {value: 389, endDate: '2009/06/01 03:59:59'},
                    {value: 308, endDate: '2009/07/01 03:59:59'},
                    {value: 380, endDate: '2009/08/01 03:59:59'},
                    {value: 390, endDate: '2009/09/01 03:59:59'},
                    {value: 382, endDate: '2009/10/01 03:59:59'},
                    {value: 285, endDate: '2009/11/01 03:59:59'},
                    {value: 407, endDate: '2009/12/01 04:59:59'},
                    {value: 502, endDate: '2010/01/01 04:59:59'},
                    {value: 353, endDate: '2010/02/01 04:59:59'},
                    {value: 448, endDate: '2010/03/01 04:59:59'},
                    {value: 448, endDate: '2010/04/01 03:59:59'}
                ]
            ];

        testSeriesData2 =
            [
                [
                    {value: 2, endDate: '2009/05/01 03:59:59'},
                    {value: 3, endDate: '2009/06/01 03:59:59'},
                    {value: 4, endDate: '2009/07/01 03:59:59'},
                    {value: 5, endDate: '2009/08/01 03:59:59'},
                    {value: -5, endDate: '2009/09/01 03:59:59'},
                    {value: 3, endDate: '2009/10/01 03:59:59'}
                ],
                [
                    {value: 1, endDate: '2009/05/01 03:59:59'},
                    {value: 2, endDate: '2009/06/01 03:59:59'},
                    {value: 3, endDate: '2009/07/01 03:59:59'},
                    {value: 4, endDate: '2009/08/01 03:59:59'},
                    {value: -5, endDate: '2009/09/01 03:59:59'},
                    {value: 6, endDate: '2009/10/01 03:59:59'}
                ]
            ];

        var negsLG = elroi(
            createElroiGraphContainer(),
            [ { series: testSeriesData, options : { type: 'line', minYValue: 'auto'} }],
            { animation: false }
        );
        var negsBG = elroi(
            createElroiGraphContainer(),
            [ { series: testSeriesData, options : { type: 'bar', minYValue: 'auto'} }],
            { animation: true }
        );
        var negsSBG = elroi(
            createElroiGraphContainer(),
            [ { series: testSeriesData, options : { type: 'stackedBar', minYValue: 'zeroOrLess'} }],
            { animation: true }
        );
        var negsSBG2 = elroi(
            createElroiGraphContainer(),
            [ { series: testSeriesData2, options : { type: 'stackedBar', minYValue: 'zeroOrLess'} }],
            { animation: true }
        );
    });

    Q.test('negative value tooltips', function() {
        testSeriesData =
            [
                [
                    {value: 383, endDate: '2009/05/01 03:59:59'},
                    {value: 389, endDate: '2009/06/01 03:59:59'},
                    {value: 308, endDate: '2009/07/01 03:59:59'},
                    {value: 380, endDate: '2009/08/01 03:59:59'},
                    {value: -390, endDate: '2009/09/01 03:59:59'},
                    {value: 382, endDate: '2009/10/01 03:59:59'},
                    {value: 285, endDate: '2009/11/01 03:59:59'},
                    {value: 407, endDate: '2009/12/01 04:59:59'},
                    {value: 502, endDate: '2010/01/01 04:59:59'},
                    {value: 353, endDate: '2010/02/01 04:59:59'},
                    {value: 448, endDate: '2010/03/01 04:59:59'},
                    {value: 448, endDate: '2010/04/01 03:59:59'}
                ]
            ];

        elroi(createElroiGraphContainer(),
            [ { series: testSeriesData, options : { type: 'line', minYValue: 'auto'} }],
            { animation: false });
    });

    Q.test('data less graphs', function() {

        /* Null series graph */
        elroi(createElroiGraphContainer(), [], {errorMessage: '<p>no data at all!</p>'});
    });

    Q.test('reports duplicates when they exist', function() {
        Q.equal(elroi.fn.helpers.containsDuplicateLabels(['-1', '-1', '0', '1']), true);
    });

    Q.test('does not report duplicates when they do not exist', function() {
        Q.equal(elroi.fn.helpers.containsDuplicateLabels(['-1', '0', '1']), false);
    });

    Q.test('should get labels for a precision', function() {
        Q.deepEqual(elroi.fn.helpers.getYLabels(4, 0, 0), ['0', '1', '2', '3', '4']);
    });

    Q.test('should not include -0 as a label, no matter how much elroi is tempted', function() {
        Q.equal(elroi.fn.helpers.getYLabels(4, -.23, 0).indexOf('-0'), -1);
    });

    Q.test('calculate point radius for line chart', function() {
        Q.equal(elroi.fn.helpers.calculatePointRadius(2,0,1), .5, 'No stroke test 1 (Respects radius check)');
        Q.equal(elroi.fn.helpers.calculatePointRadius(4,0,1), 1, 'No stroke test 2 (Respects 1px spacing check)');
        Q.equal(elroi.fn.helpers.calculatePointRadius(4,1,1), 1, 'Stroke test 1 (Respects radius+stroke check)');
        Q.equal(elroi.fn.helpers.calculatePointRadius(6,1,1), 1, 'Stroke test 2 (Respects 1px spacing check)');
        Q.equal(elroi.fn.helpers.calculatePointRadius(1,5,1), 0, 'Disallow negative radius test');
        Q.equal(elroi.fn.helpers.calculatePointRadius(20,0,3), 3, 'Disallow radius larger than provided');
    });

    /* ------------------------------------------------------------------- */
    /* Set of previously documented bugs; should all be visually verified. */
    /* ------------------------------------------------------------------- */
    Q.test('Visually verify: data should appear below data label (28129)', function() {
        elroi(createElroiGraphContainer(), [
            { series:
                [
                    [
                        {value : 1.4424},
                        {value : 0.0000},
                        {value : 0.0000},
                        {value : 0.0000},
                        {value : 0.0000},
                        {value : 0.7080},
                        {value : 0.4236},
                        {value : 0.0000},
                        {value : 0.0000},
                        {value : 0.0000},
                        {value : -13.4592},
                        {value : -13.8996},
                        {value : 0.0000},
                        {value : 0.0000},
                        {value : 0.0000},
                        {value : 0.0000},
                        {value : 0.0000},
                        {value : 0.0000},
                        {value : 0.0000},
                        {value : 2.3100},
                        {value : 0.0000},
                        {value : 1.7964}
                    ]
                ]
                , options : { type: 'line', unit : 'KWH', precision : 0 }
            }
        ], {errorMessage: '<p>All data should appear below error message!</p>'});
    });

    Q.test('Visually verify: data should appear below data label if 0 (null) is max value in set (28129-2)', function() {
        elroi(createElroiGraphContainer(), [
            { series:
                [
                    [
                        {value : -83.3952},
                        {value : -77.2380},
                        {value : -127.7520},
                        {value : -123.4644},
                        {value : -60.7536},
                        {value : -67.0800},
                        {value : -92.5008},
                        {value : -70.4712},
                        {value : -61.4028},
                        {value : -63.6204},
                        {value : -98.7060},
                        {value : -39.8124},
                        {value : -28.2552},
                        {value : -18.7860},
                        {value : -34.1520},
                        {value : -70.2816},
                        {value : -101.4228},
                        {value : -103.1520},
                        {value : -69.1200},
                        {value : -88.8912},
                        {value : -18.5952},
                        {value : -31.9632},
                        {value : -58.9836},
                        {value : -5.4276},
                        {value : -62.4072},
                        {value : -84.9048},
                        {value : -96.7536},
                        {value : -103.0680},
                        {value : -20.6784},
                        {value : null}
                    ]
                ],
                options : { type: 'line', unit : 'KWH', precision : 0 }
            }
        ], {errorMessage: '<p>All data should appear below error message!</p>'});
    });

    Q.test('Visually verify: All 0 entries doesn\'t hang the browser (28683-1)', function() {
        elroi(createElroiGraphContainer(), [
            { series:
                [
                    [
                        {value : 0},
                        {value : 0},
                        {value : 0}
                    ]
                ],
                options : { type: 'line', unit : 'KWH', precision : 0 }
            }
        ], {errorMessage: '<p>All 0 entries should not hang the browser!</p>'});
    });

    Q.test('Visually verify: All -1 entries doesn\'t generate an error (28683-2)', function() {
        elroi(createElroiGraphContainer(), [
            { series:
                [
                    [
                        {value : -1},
                        {value : -1},
                        {value : -1}
                    ]
                ],
                options : { type: 'line', unit : 'KWH', precision : 0 }
            }
        ], {errorMessage: '<p>Identical negative entries shouldn\'t generate errors that prevent graph from showing</p>'});
    });

    Q.test('Visually verify: All 1 entries doesn\'t generate an error (28683-3)', function() {
        elroi(createElroiGraphContainer(), [
            { series:
                [
                    [
                        {value : 1},
                        {value : 1},
                        {value : 1}
                    ]
                ],
                options : { type: 'line', minYValue: 'auto', unit : 'KWH', precision : 0 }
            }
        ], {errorMessage: '<p>Identical positive entries shouldn\'t generate errors that prevent graph from showing</p>'});
    });

    // Should throw exception if minYValue is greater than maxYValue
}(QUnit, jQuery, elroi));
