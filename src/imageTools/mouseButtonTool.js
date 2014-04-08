var cornerstoneTools = (function ($, cornerstone, cornerstoneTools) {

    "use strict";

    if(cornerstoneTools === undefined) {
        cornerstoneTools = {};
    }

/*
    mouseToolInterface = {
        createNewMeasurement : function() {},
        onImageRendered: function() {},
        toolType : "probe",
    };

 */

    function mouseButtonTool(mouseToolInterface)
    {
        ///////// BEGIN ACTIVE TOOL ///////
        function addNewMeasurement(mouseEventData)
        {
            var measurementData = mouseToolInterface.createNewMeasurement(mouseEventData);

            // associate this data with this imageId so we can render it and manipulate it
            cornerstoneTools.addToolState(mouseEventData.element, mouseToolInterface.toolType, measurementData);

            // since we are dragging to another place to drop the end point, we can just activate
            // the end point and let the moveHandle move it for us.
            $(mouseEventData.element).off('CornerstoneToolsMouseMove', mouseMoveCallback);
            cornerstoneTools.moveHandle(mouseEventData, measurementData.handles.end, function() {
                if(cornerstoneTools.anyHandlesOutsideImage(mouseEventData, measurementData.handles))
                {
                    // delete the measurement
                    cornerstoneTools.removeToolState(mouseEventData.element, mouseToolInterface.toolType, measurementData);
                }
                $(mouseEventData.element).on('CornerstoneToolsMouseMove', mouseMoveCallback);
            });
        }

        function mouseDownActivateCallback(e) {
            var mouseDownData = e.originalEvent.detail;
            var eventData = e.data;
            if (cornerstoneTools.isMouseButtonEnabled(mouseDownData.which, eventData.mouseButtonMask)) {
                addNewMeasurement(mouseDownData);
                return false; // false = cases jquery to preventDefault() and stopPropagation() this event
            }
        }
        ///////// END ACTIVE TOOL ///////

        ///////// BEGIN DEACTIVE TOOL ///////

        function mouseMoveCallback(e)
        {
            var mouseMoveData = e.originalEvent.detail;

            // if a mouse button is down, do nothing
            if(mouseMoveData.which !== 0) {
                return;
            }

            // if we have no tool data for this element, do nothing
            var toolData = cornerstoneTools.getToolState(mouseMoveData.element, mouseToolInterface.toolType);
            if(toolData === undefined) {
                return;
            }

            // We have tool data, search through all data
            // and see if we can activate a handle
            var imageNeedsUpdate = false;
            for(var i=0; i < toolData.data.length; i++) {
                // get the cursor position in image coordinates
                var data = toolData.data[i];
                if(cornerstoneTools.handleActivator(data.handles, mouseMoveData.currentPoints.image, mouseMoveData.viewport.scale ) === true)
                {
                    imageNeedsUpdate = true;
                }
            }

            // Handle activation status changed, redraw the image
            if(imageNeedsUpdate === true) {
                cornerstone.updateImage(mouseMoveData.element);
            }
        }

        function pointNearTool(data, coords)
        {
            var distanceSquared = cornerstoneTools.point.distanceSquared(data.handles.end, coords);
            return (distanceSquared < 25);
        }

        function mouseDownCallback(e) {
            var eventData = e.data;
            var mouseDownData = e.originalEvent.detail;
            var data;

            function handleDoneMove()
            {
                if(cornerstoneTools.anyHandlesOutsideImage(mouseDownData, data.handles))
                {
                    // delete the measurement
                    cornerstoneTools.removeToolState(mouseDownData.element, mouseToolInterface.toolType, data);
                }
                $(mouseDownData.element).on('CornerstoneToolsMouseMove', mouseMoveCallback);
            }

            if(cornerstoneTools.isMouseButtonEnabled(mouseDownData.which, eventData.mouseButtonMask)) {
                var coords = mouseDownData.startPoints.image;
                var toolData = cornerstoneTools.getToolState(e.currentTarget, toolType);

                // now check to see if we have a tool that we can move
                if(toolData !== undefined) {
                    for(var i=0; i < toolData.data.length; i++) {
                        data = toolData.data[i];
                        if(pointNearTool(data, coords)) {
                            $(mouseDownData.element).off('CornerstoneToolsMouseMove', mouseMoveCallback);
                            cornerstoneTools.moveHandle(mouseDownData, data.handles.end, handleDoneMove);
                            return false; // false = cases jquery to preventDefault() and stopPropagation() this event
                        }
                    }
                }
            }
        }
        ///////// END DEACTIVE TOOL ///////



        // not visible, not interactive
        function disable(element)
        {
            $(element).off("CornerstoneImageRendered", mouseToolInterface.onImageRendered);
            $(element).off('CornerstoneToolsMouseMove', mouseMoveCallback);
            $(element).off('CornerstoneToolsMouseDown', mouseDownCallback);
            $(element).off('CornerstoneToolsMouseDownActivate', mouseDownActivateCallback);

            cornerstone.updateImage(element);
        }

        // visible but not interactive
        function enable(element)
        {
            $(element).off("CornerstoneImageRendered", mouseToolInterface.onImageRendered);
            $(element).off('CornerstoneToolsMouseMove', mouseMoveCallback);
            $(element).off('CornerstoneToolsMouseDown', mouseDownCallback);
            $(element).off('CornerstoneToolsMouseDownActivate', mouseDownActivateCallback);

            $(element).on("CornerstoneImageRendered", mouseToolInterface.onImageRendered);

            cornerstone.updateImage(element);
        }

        // visible, interactive and can create
        function activate(element, mouseButtonMask) {
            var eventData = {
                mouseButtonMask: mouseButtonMask,
            };

            $(element).off("CornerstoneImageRendered", mouseToolInterface.onImageRendered);
            $(element).off("CornerstoneToolsMouseMove", mouseMoveCallback);
            $(element).off("CornerstoneToolsMouseDown", mouseDownCallback);
            $(element).off('CornerstoneToolsMouseDownActivate', mouseDownActivateCallback);

            $(element).on("CornerstoneImageRendered", mouseToolInterface.onImageRendered);
            $(element).on("CornerstoneToolsMouseMove", eventData, mouseMoveCallback);
            $(element).on('CornerstoneToolsMouseDown', eventData, mouseDownCallback);
            $(element).on('CornerstoneToolsMouseDownActivate', eventData, mouseDownActivateCallback);

            cornerstone.updateImage(element);
        }

        // visible, interactive
        function deactivate(element, mouseButtonMask) {
            var eventData = {
                mouseButtonMask: mouseButtonMask,
            };

            $(element).off("CornerstoneImageRendered", mouseToolInterface.onImageRendered);
            $(element).off("CornerstoneToolsMouseMove", mouseMoveCallback);
            $(element).off("CornerstoneToolsMouseDown", mouseDownCallback);
            $(element).off('CornerstoneToolsMouseDownActivate', mouseDownActivateCallback);

            $(element).on("CornerstoneImageRendered", mouseToolInterface.onImageRendered);
            $(element).on("CornerstoneToolsMouseMove", eventData, mouseMoveCallback);
            $(element).on('CornerstoneToolsMouseDown', eventData, mouseDownCallback);

            cornerstone.updateImage(element);
        }

        var toolInterface = {
            enable: enable,
            disable : disable,
            activate: activate,
            deactivate: deactivate
        };

        return toolInterface;
    }

    // module exports
    cornerstoneTools.mouseButtonTool = mouseButtonTool;

    return cornerstoneTools;
}($, cornerstone, cornerstoneTools));