(function(elroi, $) {

    /**
     * Draws a pie chart that provides dynamic resizing and the ability to hook in events.
     * @param graph The graph object defined in elroi
     * @param series The series of data
     * @param {int} seriesIndex The index of the pie graph data in the graph's allSeries array.  Multiple series don't
     *              make sense in this case.  Any multi-series data sets may provide unexpected results.
     * @return wedges A set of all of the wedges
     * @return {function} draw The function to draw the pie graph
     */
    function advancedPie(graph, series, seriesIndex) {
        /* Attempt to configure graph using provided options, otherwise fallback to defaults.*/
        graph.options.center = graph.options.center || {
            x : (graph.width + graph.padding.left - graph.padding.right)/2,
            y : (graph.height - graph.padding.bottom + graph.padding.top)/2
        };
        graph.options.radius = graph.options.radius ||  (graph.height - graph.padding.bottom + graph.padding.top)/ 2;
        graph.options.wedgeAttributes = graph.options.wedgeAttributes || {};

        /*Ext holds extension functions specific to the advancedPie.  They are merged into the parent namespace making
        them publicly accessible at the level of the elroi object. */
        graph.ext = {};

        /* Pie attributes */
        var center = graph.options.center,
            radius = graph.options.radius,
            degreesRotated = -90; //current rotation of the pie

        /* Set to store wedge paths */
        var wedges = graph.paper.set();

        /* Raphael transform constants */
        var CENTER_COORDINATES = center.x+','+center.y,
            S11 = 's1,1';

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
            /* Unit Testing */
            if(isNaN(x)) {
                throw "Parameter x must be a number.";
            } else if (isNaN(y)) {
                throw "Parameter y must be a number.";
            } else if (isNaN(r) || r < 0) {
                throw "Parameter r must be a non-negative number.";
            } else if (isNaN(a1)) {
                throw "Parameter a1 must be a number.";
            } else if (isNaN(a2)) {
                throw "Parameter a2 must be a number.";
            }

            /* Mathematical constants */
            var DEGREES_TO_RADIANS = Math.PI / 180;

            /* Update the r attribute on our path so it's consistent with the new radius */
            if(this.attrs) {
                this.attrs.radius = r;
            }

            var flag = (a2 - a1) > 180,
                clr = (a2 - a1) / 360;
            a1 = (a1 % 360) * DEGREES_TO_RADIANS;
            a2 = (a2 % 360) * DEGREES_TO_RADIANS;

            return {
                path: [['M', x, y], ['l', r * Math.cos(a1), r * Math.sin(a1)], ['A', r, r, 0, +flag, 1, x
                    + r * Math.cos(a2), y + r * Math.sin(a2)], ['z']]
                };
        };

        /**
         * Custom attribute for raphael that will alter the radius of a wedge; allows for short-handing the longer
         * customAttributes.segment call when the radius is the only change to the path.
         * @param r {number} The new radius of the pie wedge.
         * @return {object} Path attribute for attachment to a Raphael object.
         */
        graph.paper.customAttributes.radius = function (r) {
            /* Unit Testing */
            if(!this.attrs || !this.attrs.segment) {
               throw "segment attribute must be set on wedge prior to setting r attribute.";
            } else if(isNaN(r) || r < 0) {
                throw "Parameter r must be a number.";
            }

            var segment = this.attrs.segment;
            segment[2] = r; // Update the segment attribute (segment[2]) so it's consistent with the new radius

            return graph.paper.customAttributes.segment(segment[0], segment[1], r, segment[3],segment[4]);
        };

        /**
         * Animation pie from initial radius of 1 to full value.  May eventually provide this as a callback instead.
         * @param [ms] {number} The duration of tha Raphael animation
         */
        function animate(ms) {
            /* Unit Testing */
            if(ms && (isNaN(ms) || ms < 0)) {
                throw "Parameter ms must be a number.";
            }

            for (i = 0; i < series[seriesIndex].length; i++) {
                wedges[i].animate({radius: radius, transform:['r'+(-90)+','+CENTER_COORDINATES]}, ms || 1500, 'bounce');
            }
        }

        /**
         * Recalculates wedge sizes and animates (if enabled) pie to new proportion.  Run after updating series data.
         * @param [ms] {number} The duration of tha Raphael animation
         */
        function resize(ms){
            /* Unit Testing */
            if(ms && (isNaN(ms) || ms < 0)) {
                throw "Parameter ms must be a number.";
            }

            var start = 0,
                total = graph.sums[seriesIndex],
                data = series[seriesIndex];
            for (i = 0; i < data.length; i++) {
                var val = 360 / total * data[i].value;
                var newAttr = {segment: [center.x, center.y, radius, start, start += val],
                    transform:['r'+(-90)+','+CENTER_COORDINATES]};

                wedges[i].data = data[i]; //update data tied to each wedge

                if(graph.options.animation) {  //either animate transition of flatly update
                    wedges[i].animate(newAttr, ms || 1500, 'bounce');
                } else {
                    wedges[i].attr(newAttr);
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
                    if(graph.options.wedgeClick) {
                        graph.options.wedgeClick(wedge);
                    } else {
                        rotateToWedge(wedge);
                    }
                }

            /**
             * Wrapper function that calls a user provided method (if one is provided) for a hover entered event on a
             * wedge.
             * @param wedge {object} Raphael element for the entered wedge
             */
            function wedgeEnter(wedge){
                if(graph.options.hoverEvents && graph.options.hoverEvents.wedgeHoverIn) {
                    graph.options.hoverEvents.wedgeHoverIn(wedge);
                }
            }

            /**
             * Wrapper function that calls a user provided method (if one is provided) for a hover exit event on a
             * wedge.
             * @param wedge {object} Raphael element for the exited wedge
             */
            function wedgeExit(wedge){
                if(graph.options.hoverEvents && graph.options.hoverEvents.wedgeHoverOut) {
                    graph.options.hoverEvents.wedgeHoverOut(wedge);
                }
            }

            var start = 0,
                total = graph.sums[seriesIndex],
                data = series[seriesIndex];
            for (i = 0; i < data.length; i++) {
                var val = 360 / total * data[i].value;

                //Create wedge and provide appropriate event hooks and styles
                (function (i, val) {
                    var wedge = graph.paper.path()
                        .attr({fill: graph.options.colors[i % graph.options.colors.length]})
                        .attr(graph.options.wedgeAttributes)
                        .click(function(){ wedgeClick(wedge); })
                        .hover(function(){ wedgeEnter(wedge); }, function(){ wedgeExit(wedge); });

                    wedge.data = data[i];

                    if(graph.options.animation) {
                        wedge.attr({segment: [center.x, center.y, 1, start, start + val]});
                    } else {
                        wedge.attr({segment: [center.x, center.y, radius, start, start + val],
                            transform: [S11+CENTER_COORDINATES+'r'+ degreesRotated +','+CENTER_COORDINATES]});
                    }

                    wedges.push(wedge);
                })(i, val);

                start += val;
            }

            //Run starting animation
            if(graph.options.animation) {
                animate(1000);
            }
        }

        /**
         * Rotate the pie clockwise.
         * @param deg {number} Number of degrees to callback pie.
         * @param [callback] {void} Function to execute on completion of rotation.
         */
        function rotate(deg, callback) {
            if(isNaN(deg)) {
                throw "Parameter deg must be a number.";
            }

            callback = callback || function(){};

            degreesRotated = deg;
            if(graph.options.animation) {
                wedges.animate({transform: [S11+CENTER_COORDINATES+'r'+ degreesRotated +','+CENTER_COORDINATES]}, 700, 'backOut', callback);
            } else {
                wedges.attr({transform: [S11+CENTER_COORDINATES+'r'+ degreesRotated+','+CENTER_COORDINATES]});
                callback();
            }
        }

        /**
         * Rotate the center of a pie wedge to 0 degrees.
         * @param wedge {object} Wedge to rotate to, must be in pie's wedges set.
         * @param [callback] {void} Function to execute on completion of rotation.
         */
        function rotateToWedge(wedge, callback) {
            callback = callback || function(){};

            if($.inArray(wedge,wedges) != -1) {
                wedges.stop().transform(S11+CENTER_COORDINATES+'r'+ degreesRotated+','+CENTER_COORDINATES);

                //// get the right rotation of the pie, based on what was clicked
                var a1 = wedge.attr('segment')[3],
                    a2 = wedge.attr('segment')[4];
                var t = a2-((a2-a1)/2); //If you calculate this new each time by setting var in front you get a super funky effect

                rotate(-t, callback);
            }
            else {
                throw 'Provided path is not contained in path collection';
            }
        }

        /**
         * Update the pie graph data and resize the wedges accordingly.
         * @param newSeries {object} New data to base pie off of.
         * @param newSeriesIndex {number} Index to use in the newSeries.
         */
        function updateLive(newSeries, newSeriesIndex) {
            series = graph.allSeries.series = graph.allSeries[0].series = newSeries;
            seriesIndex = newSeriesIndex;

            graph.sums = elroi.fn.helpers.sumSeries(elroi.fn.helpers.getDataValues(graph.allSeries));
            graph.hasData = elroi.fn.helpers.hasData(graph.allSeries);

            resize();
        }

        /**
         * Update the color of each slice of the pie graph and update the graph options.
         * @param colors {array} New color data.
         */
        function updateColors(colors) {
            if(colors == null || colors.length < 1) {
                throw 'Parameter colors must be a non empty array';
            }

            for(var x = 0; x < wedges.length; x+=1) {
                wedges[x].attr({fill: colors[x % colors.length] });
            }

            graph.options.colors = colors;
        }

        graph.ext.rotateToWedge = rotateToWedge;
        graph.ext.rotate = rotate;

        graph.ext.updateLive = updateLive;
        graph.ext.updateColors = updateColors;

        graph.wedges = wedges;

        return {
            wedges : wedges,
            draw : drawPie
        };
    }

    elroi.fn.advancedPie = advancedPie;

})(elroi, jQuery);
