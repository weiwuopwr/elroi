/***************************
 *
 * This is for unit testing elroi
 * These can be tested here: http://localhost:8080/ei/app/test/index.html?elroi
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
    
    Q.test('min values', function(){
       var negValueSet = [[1, 15, 30, 78, 96, -32]],
        positivesOnly = [[1, 15, 30, 78, 96]];
        
        Q.equal(elroi.fn.helpers.minValues(negValueSet, [{minYValue: 'zeroOrLess'}]), -32, "Zero or less setting goes negative if it has to");
        Q.equal(elroi.fn.helpers.minValues(positivesOnly, [{minYValue: 'zeroOrLess'}]), 0, "Zero or less setting stays at 0 if all numbers are positive");
        
        Q.equal(elroi.fn.helpers.minValues(negValueSet, [{minYValue: 'auto'}]), -32, "Auto setting gives lowest number if its negative");
        Q.equal(elroi.fn.helpers.minValues(positivesOnly, [{minYValue: 'auto'}]), 1, "Auto gives the lowest number even if all numbers are positive");
        
        Q.equal(elroi.fn.helpers.minValues(negValueSet, [{minYValue: 10}]), 10, "Returns what you send it if it is a hard coded number");
        
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
        Q.deepEqual(elroi.fn.helpers.buildDefaultTooltips(testSeries), expectedTooltips, "Has correct tooltips");
    });
    
    Q.test('elroi date formatter', function(){
        Q.equal(elroi.fn.formatDate('D', new Date('2011/06/01')), "Wed", 'Short day names');
        Q.equal(elroi.fn.formatDate('DD', new Date('2011/06/02')), "Thursday", 'Long day names');
        Q.equal(elroi.fn.formatDate('M', new Date('2011/06/01')), "Jun", 'Short month names');
        Q.equal(elroi.fn.formatDate('MM', new Date('2011/08/02')), "August", 'Long month names');
        Q.equal(elroi.fn.formatDate('d', new Date('2011/06/01')), "1", 'Single digit day');
        Q.equal(elroi.fn.formatDate('dd', new Date('2011/08/02')), "02", 'Double digit day');
        Q.equal(elroi.fn.formatDate('m', new Date('2011/04/01')), "4", 'Single digit month');
        Q.equal(elroi.fn.formatDate('mm', new Date('2011/03/02')), "03", 'Double digit month');
        Q.equal(elroi.fn.formatDate('y', new Date('2001/04/01')), "01", 'Double digit year');
        Q.equal(elroi.fn.formatDate('yy', new Date('2011/03/02')), "2011", 'Full year');
        Q.equal(elroi.fn.formatDate('h a', new Date('2011/03/02 13:00')), "1 pm", 'Single digit time with pm');
        Q.equal(elroi.fn.formatDate('hh a', new Date('2011/03/02 01:00')), "01 am", 'Double digit time with am');
        Q.equal(elroi.fn.formatDate('H:n', new Date('2011/03/02 01:09')), "1:09", 'Single digit military time');
        Q.equal(elroi.fn.formatDate('HH:n', new Date('2011/03/02 13:47')), "13:47", 'Double digit military time');
        
        var deDayNamesShort = ['So','Mo','Di','Mi','Do','Fr','Sa'],
            deDayNamesLong = ['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag'],
            deMonthNamesShort = ['Jan','Feb','März','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'],
            deMonthNamesLong = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'],
            capMeridians = ['AM', 'PM'];
       
       // date format options     
       Q.equal(elroi.fn.formatDate('HH:n a', new Date('2011/06/03 13:47'), {meridian: capMeridians}), "13:47 PM", 'Overwrite meridian ');  
       Q.equal(elroi.fn.formatDate('DD', new Date('2011/06/02'), {dayNamesLong: deDayNamesLong}), 'Donnerstag', 'Overwrite long day names');
       Q.equal(elroi.fn.formatDate('D', new Date('2011/06/01'), {dayNamesShort: deDayNamesShort}), "Mi", 'Overwrite short day names');    
       Q.equal(elroi.fn.formatDate('M', new Date('2011/03/01'), {monthNamesShort: deMonthNamesShort}), "März", 'Overwrite short month names');
       Q.equal(elroi.fn.formatDate('MM', new Date('2011/12/02'), {monthNamesLong: deMonthNamesLong}), "Dezember", 'Overwrite long month names'); 
       
        
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

        var parseResult = function(output) {
            return output.replace(/\s/g, '&nbsp;');
        };

        Q.equal(elroi.fn.formatDateRange('M d, yy', marchOne2011, marchTen2011, {}), parseResult('Mar 1 &ndash;Mar 10, 2011'), 'same month+year, year dropped');
        Q.equal(elroi.fn.formatDateRange('M d, yy', marchOne2011, marchTen2011, {skipRepeatedYear: true}),
                parseResult('Mar 1 &ndash;Mar 10, 2011'), 'same month+year, year dropped, skipRepeatedYear explicit true');
        Q.equal(elroi.fn.formatDateRange('M d, yy', marchOne2011, marchTen2011, {skipRepeatedYear: false}),
                parseResult('Mar 1, 2011 &ndash;Mar 10, 2011'), 'same month+year, year dropped, skipRepeatedYear explicit false');

        Q.equal(elroi.fn.formatDateRange('M d, yy', marchOne2011, aprilOne2011, {}), parseResult('Mar 1 &ndash;Apr 1, 2011'), 'different month, same year, year dropped');
        Q.equal(elroi.fn.formatDateRange('d M y', marchOne2011, aprilOne2011, {}), parseResult('1 Mar &ndash;1 Apr 11'), 'd M y format, same year, year dropped');
        Q.equal(elroi.fn.formatDateRange('d M yy', marchOne2011, marchEleven2012, {}), parseResult('1 Mar 2011 &ndash;11 Mar 2012'), 'd M yy format, different year');
        Q.equal(elroi.fn.formatDateRange('d M yy', marchOne2011, marchEleven2012, {skipRepeatedYear: true}),
                parseResult('1 Mar 2011 &ndash;11 Mar 2012'), 'd M yy format, different year, skip repeated year ignored');
    });

    Q.test('elroi date range determiner', function(){
       var subDaily = 
        [ 
            {
                series: 
                    [
                        [
                            {value:1, date: "2009/05/01 03:59:59"}, {value: 2, date:"2009/05/01 04:59:59"}
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
                            {value:1, date: "2009/05/01 03:59:59"}, {value: 2, date:"2009/06/01 03:59:59"}
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
                             {value:1, date: "2009/05/01 03:59:59"}, {value: 2, date:"2009/05/04 03:59:59"}
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
                              {value:1, date: "2009/05/01 03:59:59"}, {value: 2, date:"2010/05/01 03:59:59"}
                          ]
                      ]
              }
          ];


         Q.equal(elroi.fn.helpers.determineDateFormat(subDaily), "h:nna", "Under a day should get timestamps");
         Q.equal(elroi.fn.helpers.determineDateFormat(monthlyGaps), "M", "Dates a month apart should give monthly formats");      
         Q.equal(elroi.fn.helpers.determineDateFormat(withinAMonth), "M, d", "Dates within the same month should get day/month");
         Q.equal(elroi.fn.helpers.determineDateFormat(multiYear), "yy", "Year spanners should use the year");
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
             var $graph = $('<div/>')
                             .css({width: 900, height: 300})
                             .appendTo($('#test'));
         
         
             var e = elroi(
                 $graph,
                 [
                         {
                             series:
                             [
                                 [
                                     {
                                         value: 683,
                                         clickTarget: "/ei/app/myEnergyUse/usage/bill/2009/4?meterType=ELEC",
                                         pointFlag: false,
                                         endDate: "2009/05/01 03:59:59"
                                     },
                                     {value: 689,clickTarget: "/ei/app/myEnergyUse/usage/bill/2009/5?meterType=ELEC",pointFlag: false,endDate: "2009/06/01 03:59:59"},
                                     {value: 708,clickTarget: "/ei/app/myEnergyUse/usage/bill/2009/6?meterType=ELEC",pointFlag: false,endDate: "2009/07/01 03:59:59"},
                                     {value: 680,clickTarget: "/ei/app/myEnergyUse/usage/bill/2009/7?meterType=ELEC",pointFlag: false,endDate: "2009/08/01 03:59:59"},
                                     {value: 690,clickTarget: "/ei/app/myEnergyUse/usage/bill/2009/8?meterType=ELEC",pointFlag: false,endDate: "2009/09/01 03:59:59"},
                                     {value: 682,clickTarget: "/ei/app/myEnergyUse/usage/bill/2009/9?meterType=ELEC",pointFlag: false,endDate: "2009/10/01 03:59:59"},
                                     {value: 685,clickTarget: "/ei/app/myEnergyUse/usage/bill/2009/10?meterType=ELEC",pointFlag: false,endDate: "2009/11/01 03:59:59"},
                                     {value: 707,clickTarget: "/ei/app/myEnergyUse/usage/bill/2009/11?meterType=ELEC",pointFlag: false,endDate: "2009/12/01 03:59:59"},
                                     {value: 702,clickTarget: "/ei/app/myEnergyUse/usage/bill/2009/12?meterType=ELEC",pointFlag: false,endDate: "2010/01/01 03:59:59"},
                                     {value: 653,clickTarget: "/ei/app/myEnergyUse/usage/bill/2010/1?meterType=ELEC",pointFlag: false,endDate: "2010/02/01 03:59:59"},
                                     {value: 748,clickTarget: "/ei/app/myEnergyUse/usage/bill/2010/2?meterType=ELEC",pointFlag: false,endDate: "2010/03/01 03:59:59"},
                                     {value: 748,clickTarget: "/ei/app/myEnergyUse/usage/bill/2010/3?meterType=ELEC",pointFlag: false,endDate: "2010/04/01 03:59:59"}
                                 ]
                             ],
                             options:
                             {
                                 type:  "line"
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
                         "#33bbcc",
                         "#888888",
                         "#99cc33"
                     ],
                     axes:
                     {
                         x1: {},
                         y1:
                         {
                             unit: "kWh"
                         }
                     },
                     messages:
                     {
                         rateCallouts:
                         {
                             REBATE: "You earned a {0} rebate.",
                             PEAK_DAY: "Peak Day"
                         },
                         usage:
                         {
                             you:  "You",
                             effNeighbors:  "Efficient",
                             allNeighbors:  "All neighbors"
                         },
                         drilldowns:
                         {
                             DAY:  "View each day",
                             HOUR: "View each hour"
                         },
                         error:
                         {
                             noEnergyData:  "Data not available.",
                             noNeighbor:  "Neighbor comparisons are not yet available in this view. <a href=\"/ei/app/myEnergyUse/neighbors/year/\">See your comparison for the year &raquo;</a>",
                             noCostData: "Your costs are not yet available in this view. <a href=\"/ei/app/myEnergyUse/rates/year/\">See your costs for the year &raquo;</a>",
                             noData: "Data not available.",
                             noAmiBill: "This data is not available because your Smart Meter was not installed yet.",
                             noAmiDay: "This data is not available because your Smart Meter was not installed yet.<br /><a href=\"/ei/app/myEnergyUse/usage/day/2009/05/01\">See your first available day &raquo;</a>",
                             insufficientData: "We&#39;re still collecting the rest of your data for this day. Check back tomorrow."
                         },
                         units:
                         {
                             KWH: "kWh",
                             THERM: "therms"
                         },
                         axis:
                         {
                             dupeMonth: "<p><strong>About your billing cycle</strong></p><p>You had multiple bills during the same month. Each bill covers different days of the month. Move your mouse over the graph to see the date range.</p>"
                         }
                     },
                     dates: { format: "M"},
                     errorMessage: false
                 },
                 [
                     {
                         dateRange:  "Apr 1 &ndash; Apr 30",
                         you: 683,
                         unit:  "kWh",
                         drillLink:  "/ei/app/myEnergyUse/usage/bill/2009/4?meterType=ELEC",
                         drillMessage: "View each day"
                     },
                     {dateRange: "May 1 &ndash; May 31",you: 689,unit: "kWh",drillLink: "/ei/app/myEnergyUse/usage/bill/2009/5?meterType=ELEC",drillMessage: "View each day"},
                     {dateRange: "Jun 1 &ndash; Jun 30",you: 708,unit: "kWh",drillLink: "/ei/app/myEnergyUse/usage/bill/2009/6?meterType=ELEC",drillMessage: "View each day"},
                     {dateRange: "Jul 1 &ndash; Jul 31",you: 680,unit: "kWh",drillLink: "/ei/app/myEnergyUse/usage/bill/2009/7?meterType=ELEC",drillMessage: "View each day"},
                     {dateRange: "Aug 1 &ndash; Aug 31",you: 690,unit: "kWh",drillLink: "/ei/app/myEnergyUse/usage/bill/2009/8?meterType=ELEC",drillMessage: "View each day"},
                     {dateRange: "Sep 1 &ndash; Sep 30",you: 682,unit: "kWh",drillLink: "/ei/app/myEnergyUse/usage/bill/2009/9?meterType=ELEC",drillMessage: "View each day"},
                     {dateRange: "Oct 1 &ndash; Oct 31",you: 685,unit: "kWh",drillLink: "/ei/app/myEnergyUse/usage/bill/2009/10?meterType=ELEC",drillMessage: "View each day"},
                     {dateRange: "Nov 1 &ndash; Nov 30",you: 707,unit: "kWh",drillLink: "/ei/app/myEnergyUse/usage/bill/2009/11?meterType=ELEC",drillMessage: "View each day"},
                     {dateRange: "Dec 1 &ndash; Dec 31",you: 702,unit: "kWh",drillLink: "/ei/app/myEnergyUse/usage/bill/2009/12?meterType=ELEC",drillMessage: "View each day"},
                     {dateRange: "Jan 1 &ndash; Jan 31",you: 653,unit: "kWh",drillLink: "/ei/app/myEnergyUse/usage/bill/2010/1?meterType=ELEC",drillMessage: "View each day"},
                     {dateRange: "Feb 1 &ndash; Feb 28",you: 748,unit: "kWh",drillLink: "/ei/app/myEnergyUse/usage/bill/2010/2?meterType=ELEC",drillMessage: "View each day"},
                     {dateRange: "Mar 1 &ndash; Mar 31",you: 748,unit: "kWh",drillLink: "/ei/app/myEnergyUse/usage/bill/2010/3?meterType=ELEC",drillMessage: "View each day"}
                 ]
             );
         
         });
         
         Q.test('elroi visual test 2 - no animations', function() {
              var $lineGraph = $('<div/>')
                  .css({width: 900, height: 300})
                  .appendTo($('#test')),
              $stackedBarGraph = $('<div/>')
                   .css({width: 900, height: 300})
                   .appendTo($('#test')),
              $barGraph = $('<div/>')
                  .css({width: 900, height: 300})
                  .appendTo($('#test')),
              $easyLineGraph = $('<div/>')
                        .css({width: 900, height: 300})
                        .appendTo($('#test')),

              $singleSeriesLineGraph = $('<div/>')
                            .css({width: 900, height: 300})
                            .appendTo($('#test')),
              $singleSeriesBarGraph = $('<div/>')
                  .css({width: 900, height: 300})
                  .appendTo($('#test')),
              $germanDateLabels = $('<div/>')
                  .css({width: 900, height: 300})
                  .appendTo($('#test')),
                                     
               testSeriesData = 
                            [
                                [
                                    {value: 683, endDate: "2009/05/01 03:59:59"},
                                    {value: 689, endDate: "2009/06/01 03:59:59"},
                                    {value: 708, endDate: "2009/07/01 03:59:59"},
                                    {value: 680, endDate: "2009/08/01 03:59:59"},
                                    {value: 690, endDate: "2009/09/01 03:59:59"},
                                    {value: 682, endDate: "2009/10/01 03:59:59"},
                                    {value: 685, endDate: "2009/11/01 03:59:59"},
                                    {value: 707, endDate: "2009/12/01 04:59:59"},
                                    {value: 702, endDate: "2010/01/01 04:59:59"},
                                    {value: 653, endDate: "2010/02/01 04:59:59"},
                                    {value: 748, endDate: "2010/03/01 04:59:59"},
                                    {value: 748, endDate: "2010/04/01 03:59:59"}
                                ],
                                [
                                    {value: 383, endDate: "2009/05/01 03:59:59"},
                                    {value: 389, endDate: "2009/06/01 03:59:59"},
                                    {value: 308, endDate: "2009/07/01 03:59:59"},
                                    {value: 380, endDate: "2009/08/01 03:59:59"},
                                    {value: 390, endDate: "2009/09/01 03:59:59"},
                                    {value: 382, endDate: "2009/10/01 03:59:59"},
                                    {value: 285, endDate: "2009/11/01 03:59:59"},
                                    {value: 407, endDate: "2009/12/01 04:59:59"},
                                    {value: 502, endDate: "2010/01/01 04:59:59"},
                                    {value: 353, endDate: "2010/02/01 04:59:59"},
                                    {value: 448, endDate: "2010/03/01 04:59:59"},
                                    {value: 448, endDate: "2010/04/01 03:59:59"}
                                ]
                            ];
            var deDayNamesShort = ['So','Mo','Di','Mi','Do','Fr','Sa'],
                deDayNamesLong = ['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag'],
                deMonthNamesShort = ['Jan','Feb','März','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];
         
             var lg = elroi(
                 $lineGraph,
                 [ { series: testSeriesData, options : { type: 'line'} }],
                 { animation: false }
             ),
             sbg = elroi(
                  $stackedBarGraph,
                  [ { series: testSeriesData, options : { type: 'stackedBar'} }],
                  {  colors: ['#000', '#090'] }
              ),
              bg = elroi(
                  $barGraph,
                  [ { series: testSeriesData, options : { type: 'bar'} }],
                  { animation: false }
              );
              elg = elroi($easyLineGraph, [1,3,7,8,9,2,10]);
              sslg = elroi($singleSeriesLineGraph, 
                  [{value: 1, endDate: "2009/05/01 03:59:59"}, 
                        {value: 2, date: "2009/06/01 03:59:59"}, 
                        {value: 3, date: "2009/07/01 03:59:59"}, 
                        {value: 4, date: "2009/08/01 03:59:59"}, 
                        {value: 5, date: "2009/09/01 03:59:59"}, 
                        {value: 6, date: "2009/10/01 03:59:59"}, 
                        {value: 7, date: "2009/11/01 03:59:59"}]
              );
              ssbg = elroi($singleSeriesBarGraph, { series: [ {value: 1}, {value: 2}, {value: 3}, {value: 4}, {value: 5}, {value: 6}, {value: 7}], options: {type: 'bar'}});
              germLabLG = elroi(
                  $germanDateLabels,
                  [ { series: testSeriesData, options : { type: 'line'} }], 
                  { 
                      dates: {
                        format: "DD M",
                        dayNamesShort: deDayNamesShort,
                        dayNamesLong: deDayNamesLong,
                        monthNamesShort: deMonthNamesShort
                      }
                  }
              ); 
                    
         });
         
         Q.test('negative value graphs', function(){
             testSeriesData = 
                             [
                                 [
                                     {value: 683, endDate: "2009/05/01 03:59:59"},
                                     {value: 689, endDate: "2009/06/01 03:59:59"},
                                     {value: 708, endDate: "2009/07/01 03:59:59"},
                                     {value: 680, endDate: "2009/08/01 03:59:59"},
                                     {value: -690, endDate: "2009/09/01 03:59:59"},
                                     {value: 682, endDate: "2009/10/01 03:59:59"},
                                     {value: 685, endDate: "2009/11/01 03:59:59"},
                                     {value: 707, endDate: "2009/12/01 04:59:59"},
                                     {value: 702, endDate: "2010/01/01 04:59:59"},
                                     {value: 653, endDate: "2010/02/01 04:59:59"},
                                     {value: 748, endDate: "2010/03/01 04:59:59"},
                                     {value: 748, endDate: "2010/04/01 03:59:59"}
                                 ],
                                 [
                                     {value: 383, endDate: "2009/05/01 03:59:59"},
                                     {value: 389, endDate: "2009/06/01 03:59:59"},
                                     {value: 308, endDate: "2009/07/01 03:59:59"},
                                     {value: 380, endDate: "2009/08/01 03:59:59"},
                                     {value: 390, endDate: "2009/09/01 03:59:59"},
                                     {value: 382, endDate: "2009/10/01 03:59:59"},
                                     {value: 285, endDate: "2009/11/01 03:59:59"},
                                     {value: 407, endDate: "2009/12/01 04:59:59"},
                                     {value: 502, endDate: "2010/01/01 04:59:59"},
                                     {value: 353, endDate: "2010/02/01 04:59:59"},
                                     {value: 448, endDate: "2010/03/01 04:59:59"},
                                     {value: 448, endDate: "2010/04/01 03:59:59"}
                                 ]
                             ];
                             
             testSeriesData2 = 
                              [
                                  [
                                      {value: 2, endDate: "2009/05/01 03:59:59"},
                                      {value: 3, endDate: "2009/06/01 03:59:59"},
                                      {value: 4, endDate: "2009/07/01 03:59:59"},
                                      {value: 5, endDate: "2009/08/01 03:59:59"},
                                      {value: -5, endDate: "2009/09/01 03:59:59"},
                                      {value: 3, endDate: "2009/10/01 03:59:59"}
                                  ],
                                  [
                                      {value: 1, endDate: "2009/05/01 03:59:59"},
                                      {value: 2, endDate: "2009/06/01 03:59:59"},
                                      {value: 3, endDate: "2009/07/01 03:59:59"},
                                      {value: 4, endDate: "2009/08/01 03:59:59"},
                                      {value: -5, endDate: "2009/09/01 03:59:59"},
                                      {value: 6, endDate: "2009/10/01 03:59:59"}
                                  ]
                              ];

            var $negativeValuesLG = $('<div/>')
                  .css({width: 900, height: 300})
                  .appendTo($('#test'));

            var $negativeValuesBG = $('<div/>')
                   .css({width: 900, height: 300})
                   .appendTo($('#test'));
            var $negativeValuesSBG = $('<div/>')
                .css({width: 900, height: 300})
                .appendTo($('#test'));
            var $negativeValuesSBG2 = $('<div/>')
                .css({width: 900, height: 300})
                .appendTo($('#test'));
            var negsLG = elroi(
                $negativeValuesLG,
                [ { series: testSeriesData, options : { type: 'line', minYValue: 'auto'} }],
                { animation: false }
            );
            var negsBG = elroi(
               $negativeValuesBG,
               [ { series: testSeriesData, options : { type: 'bar', minYValue: 'auto'} }],
               { animation: true }
            );
            var negsSBG = elroi(
               $negativeValuesSBG,
               [ { series: testSeriesData, options : { type: 'stackedBar', minYValue: 'zeroOrLess'} }],
               { animation: true }
            );
            var negsSBG2 = elroi(
               $negativeValuesSBG2,
               [ { series: testSeriesData2, options : { type: 'stackedBar', minYValue: 'zeroOrLess'} }],
               { animation: true }
            );
         });
         Q.test('negative value tooltips', function(){
             testSeriesData = 
                             [
                                 [
                                     {value: 383, endDate: "2009/05/01 03:59:59"},
                                     {value: 389, endDate: "2009/06/01 03:59:59"},
                                     {value: 308, endDate: "2009/07/01 03:59:59"},
                                     {value: 380, endDate: "2009/08/01 03:59:59"},
                                     {value: -390, endDate: "2009/09/01 03:59:59"},
                                     {value: 382, endDate: "2009/10/01 03:59:59"},
                                     {value: 285, endDate: "2009/11/01 03:59:59"},
                                     {value: 407, endDate: "2009/12/01 04:59:59"},
                                     {value: 502, endDate: "2010/01/01 04:59:59"},
                                     {value: 353, endDate: "2010/02/01 04:59:59"},
                                     {value: 448, endDate: "2010/03/01 04:59:59"},
                                     {value: 448, endDate: "2010/04/01 03:59:59"}
                                 ]
                             ];
                             
                              var $negativeValuesTT = $('<div/>')
                                     .css({width: 900, height: 300})
                                     .appendTo($('#test'));
             var negs = elroi(
                  $negativeValuesTT,
                  [ { series: testSeriesData, options : { type: 'line', minYValue: 'auto'} }],
                  { animation: false }
              );
         })
         
         Q.test('data less graphs', function() {
             
           $nullSeriesGraph = $('<div/>')
               .css({width: 900, height: 300})
               .appendTo($('#test')),
           
           nullSeries = elroi($nullSeriesGraph, [], {errorMessage: '<p>no data at all!</p>'});
            });

    Q.test('reports duplicates when they exist', function() {
        Q.equal(elroi.fn.helpers.containsDuplicateLabels(["-1", "-1", "0", "1"]), true);
    });

    Q.test('does not report duplicates when they do not exist', function() {
        Q.equal(elroi.fn.helpers.containsDuplicateLabels(["-1", "0", "1"]), false);
    });

    Q.test('detects 0 and -0 as duplicates', function() {
        Q.equal(elroi.fn.helpers.containsDuplicateLabels(["-0", "0"]), true);
    });
    
    

}(QUnit, jQuery, elroi));
