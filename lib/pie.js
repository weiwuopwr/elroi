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
                ms || 1500, 'bounce');

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
                    wedges[i].animate(newAttributes, ms || 1500, 'bounce', callback);
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

            resize(1500, callback);
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

})(elroi, jQuery);