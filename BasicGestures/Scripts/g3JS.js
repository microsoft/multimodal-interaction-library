// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

// MIL is a library that makes it easy to define multi-modal (pen/touch/mouse + keyboard) gestures, and to do basic inking.
// MIL works with SVG, and supports panning and zooming.
// MIL requires d3 (https://d3js.org/).
// gs is under active development, but as of 9/28/18 it has only been tested with IE11.
// ** DO NOT take a dependency on MIL! As of 9/28/18 it is too unstable. **
//
// Debugging note: When a breakpoint is reached, it is usually not possible to resume execution without problematic side-effects. This is because
//                 certain pointer-events (particularly pointer-up) may not have fired, which can lead to corruption of MIL's internal state.
// For more on JSDoc notation, see https://github.com/Microsoft/TypeScript/wiki/JsDoc-support-in-JavaScript and http://usejsdoc.org/.
//
// Punch-List:
// - Add complete JSDoc comments to (at least) all "Public" members, although we still need to figure out how to 
//   a) get "." intellisense, not just "fn(" intellisense, b) get it working properly for classes, not just "MIL.fn(".
// - Add Chrome/Edge support.
// - Port to TypeScript [this may address some of the intellisense commenting problems].

// ATTENTION: MILJS.js is legacy code (now replaced by MIL.js) and as such contains hundreds of ESLint errors. So to keep the VS 'Error List' clean for
//            the 'MultiModalWeb' solution we shut off the offending ESLint errors for the entire file (Note: This must be done using a block comment):
/* eslint-disable eqeqeq, no-redeclare, no-debugger, valid-jsdoc */

(function MILInit(global, factory)
{
    factory(global.MIL = global.MIL || {});
}(this,
(function MILFactory(exports)
{
    'use strict';

    // A sub-module (namespace) for utilities
    (function MILUtilsInit(factory)
    {
        factory(exports.Utils = exports.Utils || {});
    }
    (function MILUtilsFactory(exports)
    {
        var _keyboardHandlerEnabled = false;
        var _currentlyPressedKeys = [];
        var _keyUpTimerID = [];

        // This should exceed the typical time a key is held prior to initiating a gesture [with one or more pointers], but it should not be so
        // long as to cause false-positives (ie. the key still appearing to be held) after the user "returns" to the page [from the browser chrome].
        // Note: JavaScript timers don't run [in IE11 at least] while a browser chrome dialog (eg. "Save Webpage") is open.
        var KEYDOWN_TIMEOUT_IN_MS = 1200;

        // Public
        /**
         * An "enum" for key codes (like DELETE) that can't be expressed as a string (like "A").
         * @typedef {number} Keys
         */
        var Keys = Object.freeze(
        {
            UP:     38,
            DOWN:   40,
            LEFT:   37,
            RIGHT:  39,
            PLUS:   107,
            MINUS:  109,
            SHIFT:  16,
            CTRL:   17,
            DELETE: 46
        });

        // Public
        function EnableKeyboardHandler(targetDomElement, enable)
        {
            var domElement = Utils.GetDomElement(targetDomElement);

            if (domElement.getAttribute("tabindex") === null)
            {
                domElement.setAttribute("tabindex", "0"); // Make it focusable
            }
            domElement.focus();

            if (enable && !_keyboardHandlerEnabled)
            {
                domElement.addEventListener("keydown", utils_onKeyDown);
                domElement.addEventListener("keyup", utils_onKeyUp);
                _keyboardHandlerEnabled = true;
            }

            if (!enable && _keyboardHandlerEnabled)
            {
                domElement.removeEventListener("keydown", utils_onKeyDown);
                domElement.removeEventListener("keyup", utils_onKeyUp);
                _keyboardHandlerEnabled = false;
            }
        }

        function utils_onKeyDown(e)
        {
            if (_currentlyPressedKeys.indexOf(e.keyCode) == -1)
            {
                log("Pushing keyCode " + e.keyCode, FeatureNames.KeyboardHandler);
                _currentlyPressedKeys.push(e.keyCode);

                // The keyUp event (nor onblur) won't fire for browser keyboard shortcuts (like Ctrl+S in IE11). So to prevent
                // _currentlyPressedKeys from accumulating inactive keys we always "force" a keyUp via a timer. If the key is 
                // still being held when the timer ticks the key will simply be re-added to _currentlyPressedKeys for another 500ms.
                _keyUpTimerID[e.keyCode] = setTimeout(function () { utils_keyTimerTick(e); }, KEYDOWN_TIMEOUT_IN_MS);
            }
        }

        function utils_keyTimerTick(e)
        {
            // If we've started acquiring pointers, don't fire off a key 'up' since that may prevent a gesture from being recognized;
            // instead, just re-start the timer. This helps mitigate the race condition, but it can still happen if the timer ticks
            // immediately before a pointer makes contact (in which case the [new] KeyDown event may not fire until AFTER gesture
            // recognition has run [and possibly failed because the key wasn't flagged as currently pressed]).
            if (isAcquiringPointers())
            {
                _keyUpTimerID[e.keyCode] = setTimeout(function () { utils_keyTimerTick(e); }, KEYDOWN_TIMEOUT_IN_MS);
            }
            else
            {
                utils_onKeyUp(e);
            }
        }

        function utils_onKeyUp(e)
        {
            clearTimeout(_keyUpTimerID[e.keyCode]);

            var index = _currentlyPressedKeys.indexOf(e.keyCode);
            if (index != -1)
            {
                log("Popping keyCode " + e.keyCode, FeatureNames.KeyboardHandler);
                _currentlyPressedKeys.splice(index, 1);
            }
        }

        // Public
        /**
         * Returns true if no key is currently being pressed for the DOM element supplied to Utils.EnableKeyboardHandler().
         * @returns {boolean} Flag indicating if no key is currently being pressed.
         */
        function IsNoKeyPressed()
        {
            if (!_keyboardHandlerEnabled)
            {
                throw "MIL.Utils.EnableKeyboardHandler() must be called prior to using MIL.Utils.IsNoKeyPressed()";
            }

            return (_currentlyPressedKeys.length == 0);
        }

        // Public
        function IsKeyPressed(key)
        {
            if (!_keyboardHandlerEnabled)
            {
                throw "MIL.Utils.EnableKeyboardHandler() must be called prior to using MIL.Utils.IsKeyPressed()";
            }

            // 'key' can either be a Utils.Keys value (eg. Keys.CTRL), a Utils.Keys name (eg "CTRL"), or a literal (eg. "S")
            var keyCode = (typeof key == "number") ? key : (Utils.Keys.hasOwnProperty(key) ? Utils.Keys[key] : key.charCodeAt(0));
            return (_currentlyPressedKeys.indexOf(keyCode) != -1);
        }

        // Public
        function GetPressedKeyInfo()
        {
            var keyList = [];

            _currentlyPressedKeys.forEach(function (v, i)
            {
                var keyCode = v;
                var isKnownKey = false;

                for (var keyID in Utils.Keys)
                {
                    if (Utils.Keys[keyID] == keyCode)
                    {
                        keyList.push(keyID);
                        isKnownKey = true;
                        break;
                    }
                }
                if (!isKnownKey)
                {
                    keyList.push("'" + String.fromCharCode(keyCode % 128) + "'");
                }

                keyList[keyList.length - 1] += " (" + keyCode + ")";
            });

            return ("Count = " + _currentlyPressedKeys.length + ": " + keyList.join(", "));
        }

        // Public
        // Returns the DOM element represented by 'o', which can be wither an actualy DOM element or a d3 selection containing a single DOM element.
        // In either case, if 'domElementType' is specifed (eg. "SVGPathElement") then the DOM element represented by 'o' must be of that type or an exception will be thrown.
        function GetDomElement(o, domElementType)
        {
            // First, check if 'o' is a d3 selection
            if ((getObjectType(o) == "Selection") && (typeof o.size === "function") && (typeof o.node === "function"))
            {
                if (o.size() == 0)
                {
                    throw "The d3 selection provided is empty";
                }
                if (o.size() > 1)
                {
                    throw "The d3 selection provided contains more than a single element";
                }
                if ((domElementType !== undefined) && !(o.node() instanceof domElementType))
                {
                    throw "The element in the d3 selection is of type '" + getTypeName(o.node()) + "', not '" + getTypeName(domElementType) + "' as expected";
                }
                return (o.node());
            }

            if ((domElementType !== undefined) && !(o instanceof domElementType))
            {
                throw "The element is of type '" + getObjectType(o) + "', not '" + getTypeName(domElementType) + "' as expected";
            }
            else
            {
                var isDomElement = o instanceof HTMLElement || o instanceof SVGElement;
                if (!isDomElement)
                {
                    throw "The element is of type '" + getObjectType(o) + "', which is not an HTML or SVG DOM element as expected";
                }
                return (o);
            }
        }

        function getTypeName(domElementType)
        {
            var typeString = domElementType.toString();

            // TODO: Is this check comprehensive enough?
            if (typeString.indexOf("[object ") == 0)
            {
                var parts = typeString.split(" ");
                var typeName = parts[1].slice(0, parts[1].length - 1);
                return (typeName);
            }
            return (typeString);
        }

        // Public
        function ToNumber(stringValue)
        {
            var numberValue = +stringValue.replace(/[^0-9\.]/g, "");

            if (isNaN(numberValue))
            {
                throw "Unabled to convert '" + stringValue + "' to a number";
            }

            return (numberValue);
        }

        // Public
        function GetCssProperty(cssSelector, propertyName)
        {
            // Search backwards through the stylesheets because the last match is more likely the right one
            for (var s = document.styleSheets.length - 1; s >= 0; s--)
            {
                var cssRules = document.styleSheets[s].cssRules;

                for (var i = 0; i < cssRules.length; i++)
                {
                    if (cssRules[i].selectorText.indexOf(cssSelector) != -1) // A "fuzzy" match
                    {
                        return (cssRules[i].style[propertyName]);
                    }
                }
            }
            return (null);
        }

        // Public
        /**
         * Asynchronously fades [in or out] the element(s) in the d3Selection over the specified duration. This method returns immediately.
         * @param {Selection} d3Selection The element(s) to fade.
         * @param {Number} durationInMs The time interval to do the fade over.
         * @param {String} [className] The name of the class to apply to the element(s) prior to starting the fade.
         * @param {Function} [onFadeComplete] The callback to invoke once the fade finishes. 
         * @param {Boolean} [isFadeIn] True to fade in, false (or ommitted) to fade out [if omitted, will fade-out].
         * @param {Number} [endOpacity] The final opacity value.
         */
        function Fade(d3Selection, durationInMs, className, onFadeComplete, isFadeIn, endOpacity)
        {
            isFadeIn = Boolean(isFadeIn);

            if (className)
            {
                d3Selection.classed(className, true);
            }

            var startOpacity = d3Selection.style("opacity") || (isFadeIn ? "0" : "1");
            if (endOpacity === undefined)
            {
                endOpacity = isFadeIn ? "1" : "0";
            }

            d3Selection
                .transition()
                .duration(durationInMs)
                .on("end", function () { if (onFadeComplete) onFadeComplete(); })
                .styleTween("opacity", function () { return d3.interpolate(startOpacity, endOpacity); });
        }

        // Public
        function Log(message, prefix)
        {
            console.log(getTime() + ": " + (prefix ? prefix + ": " : "") + message);
        }

        function isElementVisible(pathDomElement)
        {
            var style = window.getComputedStyle(pathDomElement);
            var isVisible = (style.visibility == "visible") && (style.display != "none");
            return (isVisible);
        } 

        // Public [filter and percentageInside are optional]. percentageInside is a floating value from 0..1.
        // Use this for all SVG shapes (circle, ellipse, rect, line, polyline, polygon, path) and also MIL Ink objects
        // Note: regionPoints can either be [{x,y}] or an Ink instance.
        // Returns either an array of DOM elements or Inks.
        function FindShapeElementsInRegion(gDomElement, shapeNodeType, regionPoints, filter, percentageInside)
        {
            if (regionPoints instanceof Ink)
            {
                regionPoints = regionPoints.PathPoints();
            }

            var foundElements = [];
            var foundInks = [];
            var boundingPoints = d3.range(regionPoints.length).map(function (d) { return ([regionPoints[d].x, regionPoints[d].y]); });

            gDomElement = Utils.GetDomElement(gDomElement, SVGGElement);
            shapeNodeType = shapeNodeType.toLowerCase();

            // Note: Local function
            function isMatch(targetPoints, defaultPercentageInside, domElementOrInk)
            {
                if (targetPoints.length > 0)
                {
                    if (percentageInside === undefined)
                    {
                        percentageInside = defaultPercentageInside;
                    }

                    // Count how many element-points are inside the region (bounding) path
                    var containedPointCount = Utils.CountPointsInPolygon(boundingPoints, targetPoints);

                    // Were more than percentageInside of them inside?
                    // Note: We use '>' (not '>=') to allow the caller to specify 0 for percentageInside rather than having to specify
                    //       some tiny value (eg. 0.0001) when they just want to check if ANY point of a path is inside the region
                    var containedPointPercentage = containedPointCount / targetPoints.length;
                    if ((containedPointPercentage == 1) || (containedPointPercentage > percentageInside))
                    {
                        // Does the element (or Ink) pass the supplied filter (if any)?
                        if (!filter || (filter && filter(domElementOrInk)))
                        {
                            return (true);
                        }
                    }
                }
                return (false);
            }

            if (shapeNodeType == "ink")
            {
                for (var i = 0; i < _inks.length; i++)
                {
                    var targetPoints = _inks[i].PathPoints();

                    if (isMatch(targetPoints, 0.8, _inks[i]))
                    {
                        foundInks.push(_inks[i]);
                    }
                }
                return (foundInks);
            }
            else
            {
                d3.select(gDomElement).selectAll(shapeNodeType).each(function (d)
                {
                    var domElement = this; // Note: When using .each(), 'this' is set to the DOM element associated with 'd'

                    if (isElementVisible(domElement) && !MIL.Controls.IsControl(domElement))
                    {
                        var defaultPercentageInside = 1; // 100%
                        var targetPoints = [];

                        switch (shapeNodeType)
                        {
                            case "circle":
                            case "ellipse":
                                // Add the center point of the circle/ellipse
                                targetPoints.push([+domElement.getAttribute("cx"), +domElement.getAttribute("cy")]);
                                break;

                            case "rect":
                                // Add the center point of the rect
                                targetPoints.push([+domElement.getAttribute("x") + (domElement.getAttribute("width") / 2), +domElement.getAttribute("y") + (domElement.getAttribute("height") / 2)]);
                                break;

                            case "line":
                                // Add the start and end points of the line
                                targetPoints.push([+domElement.getAttribute("x1"), +domElement.getAttribute("y1")]);
                                targetPoints.push([+domElement.getAttribute("x2"), +domElement.getAttribute("y2")]);
                                break;

                            case "polygon":
                            case "polyline":
                                // Add all the points in the polygon/polyline
                                var rawPoints = domElement.getAttribute("points").split(" ");
                                for (var i = 0; i < rawPoints.length; i++)
                                {
                                    var coords = rawPoints[i].split(",");
                                    targetPoints.push([+coords[0], +coords[1]]);
                                }
                                defaultPercentageInside = 0.8; // 80%
                                break;

                            case "path":
                                // Add either all the points of an Ink, or a sampling of points from a non-Ink path
                                var ink = MIL.GetInkByElement(domElement);
                                var pathPoints = ink ? ink.PathPoints() : Utils.SamplePointsFromPath(domElement);
                                targetPoints = d3.range(pathPoints.length).map(function (d) { return ([pathPoints[d].x, pathPoints[d].y]); });
                                defaultPercentageInside = 0.8; // 80%
                                break;

                            default:
                                throw "shapeNodeType '" + shapeNodeType + "' is not currrently supported";
                        }

                        if (isMatch(targetPoints, defaultPercentageInside, domElement))
                        {
                            foundElements.push(domElement);
                        }
                    }
                });
                return (foundElements);
            }
        }

        // Public
        function GetCentroidPoint(targetDomElement)
        {
            var boundingRect = targetDomElement.getBoundingClientRect(); // In screen coordinates
            var centroidPoint = { x: boundingRect.left + (boundingRect.width / 2), y: boundingRect.top + (boundingRect.height / 2) };
            var transposedCentroidPoint = MIL.TransposeScreenPoint(centroidPoint, targetDomElement);
            return (transposedCentroidPoint);
        }

        // Public
        // Returns an array of {x,y} points in the order [TL, TR, BR, BL]
        function GetPointsFromRect(rect)
        {
            var points = [];

            if (rect instanceof ClientRect)
            {
                points.push({ x: rect.left, y: rect.top });
                points.push({ x: rect.right, y: rect.top });
                points.push({ x: rect.right, y: rect.bottom });
                points.push({ x: rect.left, y: rect.bottom });
            }
            else
            {
                points.push({ x: rect.x, y: rect.y });
                points.push({ x: rect.x + rect.width, y: rect.y });
                points.push({ x: rect.x + rect.width, y: rect.y + rect.height });
                points.push({ x: rect.x, y: rect.y + rect.height });
            }

            return (points);
        }

        // Public
        function GetRectFromPoints(point1, point2)
        {
            var x = Math.min(point1.x, point2.x), y = Math.min(point1.y, point2.y);
            var width = Math.abs(point1.x - point2.x), height = Math.abs(point1.y - point2.y);
            return ({ x: x, y: y, width: width, height: height });
        }

        // Public [showPoints and distanceInPxBetweenSamples are optional]
        function SamplePointsFromPath(pathDomElement, showPoints, distanceInPxBetweenSamples)
        {
            if (distanceInPxBetweenSamples === undefined)
            {
                distanceInPxBetweenSamples = 5;
            }

            var svgInfo = getSvgInfo(pathDomElement);
            var pathLength = pathDomElement.getTotalLength();
            var maxSampleCount = Math.min(500, Math.max(10, pathLength / distanceInPxBetweenSamples));
            var stepSize = pathLength / maxSampleCount;
            var svgPoints = []; // [SVGPoint]

            for (var l = 0; l < pathLength; l += stepSize)
            {
                var svgPoint = pathDomElement.getPointAtLength(l);
                svgPoints.push(svgPoint);
            }

            // The SVGPoint returned by getPointAtLength() is in SVG coordinate space, so it already takes the translate/scale transform
            // (see zoomAtPoint()) of gDomElement into account (because pathDomElement has gDomElement as an ancestor), but it does not 
            // account for the transform of pathDomElement itself. Consequently we have to use GetTransformedPoints() to address this.
            svgPoints = Utils.GetTransformedPoints(pathDomElement, svgPoints);

            // DEBUG: Show the vertices
            if (Boolean(showPoints) === true)
            {
                svgInfo.gSelection.selectAll("circle.debugVertices").remove();
                svgInfo.gSelection.selectAll("circle.debugVertices")
                    .data(svgPoints)
                    .enter()
                    .append("circle")
                    .attr("cx", function (d) { return (d.x); })
                    .attr("cy", function (d) { return (d.y); })
                    .attr("r", 2)
                    .attr("fill", "black")
                    .classed("debugVertices", true); // This is not a real class: we add it purely for identification purposes
            }

            return (svgPoints);
        }

        // Public
        // Returns the elementSvgPoints array modified for the transform (if any) of domElement.
        // - domElement is an SVG shape element (path, rect, etc.) that has [or at least can be] transformed.
        // - elementSvgPoints is an array of SVGPoint's (in absolute coordinates) from domElement.
        function GetTransformedPoints(domElement, elementSvgPoints)
        {
            var svgInfo = getSvgInfo(domElement);
            var elementMatrix = domElement.getCTM();
            var gMatrixInverse = svgInfo.gDomElement.getCTM().inverse();
            var transformedPoints = [];

            for (var i = 0; i < elementSvgPoints.length; i++)
            {
                // elementSvgPoints are in SVG coordinate space, so they already take the translate/scale transform (see zoomAtPoint()) of gDomElement
                // into account (because domElement has gDomElement as an ancestor), but they do not account for the transform of domElement itself.
                // So if we only apply the elementMatrix (which also takes all ancestor transforms into account) to the points we'd effectively end up
                // applying the gDomElement translate/scale transforms twice.
                // To fix this we "un-apply" the translate/scale transform of gDomElement.
                var transformedPoint = elementSvgPoints[i].matrixTransform(elementMatrix).matrixTransform(gMatrixInverse);
                transformedPoints.push(transformedPoint);
            }

            return (transformedPoints);
        }

        // Public
        // Returns the closest point to targetPoint on the line described by lineStartPoint/lineEndPoint
        function GetClosestPointOnLine(targetPoint, lineStartPoint, lineEndPoint)
        {
            var P = targetPoint, A = lineStartPoint, B = lineEndPoint;
            var vectorAP = [(P.x - A.x), (P.y - A.y)];
            var vectorAB = [(B.x - A.x), (B.y - A.y)];
            var magnitudeVectorABSquared = Math.pow(vectorAB[0], 2) + Math.pow(vectorAB[1], 2);
            var dotProductOfVectors = (vectorAP[0] * vectorAB[0]) + (vectorAP[1] * vectorAB[1]);
            var normalizedDistanceAlongLineAB = dotProductOfVectors / magnitudeVectorABSquared; // 0..1

            if (normalizedDistanceAlongLineAB < 0) return (A);
            if (normalizedDistanceAlongLineAB > 1) return (B);
            return ({
                x: A.x + (vectorAB[0] * normalizedDistanceAlongLineAB),
                y: A.y + (vectorAB[1] * normalizedDistanceAlongLineAB) 
            });
        }

        // Public
        function GetDistanceBetweenEvents(e1, e2)
        {
            // Note: e.clientX/Y are relative to [the top-left (0,0)] of the document window
            var distance = Math.sqrt(Math.pow((e1.clientX - e2.clientX), 2) + Math.pow((e1.clientY - e2.clientY), 2));
            return (distance);
        }

        // Public
        function GetDistanceBetweenPoints(point1, point2)
        {
            var distance = Math.sqrt(Math.pow((point1.x - point2.x), 2) + Math.pow((point1.y - point2.y), 2));
            return (distance);
        }

        // Public
        function GetBoundingRectForPoints(pathPoints)
        {
            var top = Number.MAX_VALUE, left = Number.MAX_VALUE;
            var maxX = Number.MIN_VALUE, maxY = Number.MIN_VALUE;

            for (var i = 0; i < pathPoints.length; i++)
            {
                top = Math.min(pathPoints[i].y, top);
                left = Math.min(pathPoints[i].x, left);
                maxY = Math.max(pathPoints[i].y, maxY);
                maxX = Math.max(pathPoints[i].x, maxX);
            }

            var height = maxY - top;
            var width = maxX - left;

            return ({ x: left, y: top, height: height, width: width });
        }

        // Public
        function GetHeadingFromPoints(startPoint, endPoint)
        {
            var opposite = endPoint.y - startPoint.y;
            var adjacent = endPoint.x - startPoint.x;
            var hypotenuse = Math.sqrt(Math.pow(opposite, 2) + Math.pow(adjacent, 2));
            var sine = opposite / hypotenuse;
            var angleInRadians = Math.asin(sine);
            var angleInDegrees = angleInRadians * (180 / Math.PI);
            var heading = 0; // A value from 0 to 359.999

            if (endPoint.x > startPoint.x)
            {
                heading = 90 + angleInDegrees;
            }
            if (endPoint.x < startPoint.x)
            {
                heading = 270 - angleInDegrees;
            }
            if (endPoint.x == startPoint.x)
            {
                heading = (endPoint.y > startPoint.y) ? 180 : 0;
            }

            // var straightLineDistanceMoved = hypotenuse;

            return (heading);
        }

        // Public [numRadialSegments is optional; if supplied but isn't either 4 or 8, then the function will return a 1..numRadialSegments segment number instead of, for example, "NE"]
        function GetCompassHeading(heading, numRadialSegments)
        {
            numRadialSegments = numRadialSegments || 8;

            var compassHeadings = (numRadialSegments == 8) ? ["N", "NE", "E", "SE", "S", "SW", "W", "NW"] : ((numRadialSegments == 4) ? ["N", "E", "S", "W"] : d3.range(numRadialSegments).map(function (d) { return (d + 1); }));
            var halfSegmentAngle = (360 / compassHeadings.length) / 2;
            var compassHeading = d3.scaleQuantile().domain([-halfSegmentAngle, 360 - halfSegmentAngle]).range(compassHeadings);
            var adjustedHeading = (heading < (360 - halfSegmentAngle)) ? heading : -(360 - heading);
            return (compassHeading(adjustedHeading));
        }

        // Public [an angleInDegrees of 0 is the 12 o'clock position]
        function GetPointOnCircle(angleInDegrees, radius, originPoint)
        {
            // Without this adjustment, an angleInDegrees of 0 is the 3 o'clock position (E), so we subtract 90 degrees to orient it to 12 o'clock (N)
            angleInDegrees -= 90;

            var angleInRadians = angleInDegrees * (Math.PI / 180);
            var x = (radius * Math.cos(angleInRadians)) + originPoint.x;
            var y = (radius * Math.sin(angleInRadians)) + originPoint.y;

            return ({ x: x, y: y });
        }

        function GetPointsOnCircle(numPoints, radius, originPoint)
        {
            var points = [];
            var angleStepSizeInDegrees = 360 / numPoints;

            for (var angleInDegrees = 0; angleInDegrees < 360; angleInDegrees += angleStepSizeInDegrees)
            {
                var point = Utils.GetPointOnCircle(angleInDegrees, radius, originPoint);
                points.push(point);
            }

            return (points);
        }

        // Public
        // Note: pathData must have a 0,0 origin
        function ScalePathData(pathData, scale)
        {
            var values = pathData.split(" ");
            var scaledData = "";

            for (var i = 0; i < values.length; i++)
            {
                if (isNaN(values[i]))
                {
                    var command = values[i];

                    scaledData += command + " ";

                    switch (command)
                    {
                        // Lower-case commands use relative [to the last end-point] distances/coordinates
                        case "a":
                            scaledData += (values[i + 1] * scale) + " "; // rx
                            scaledData += (values[i + 2] * scale) + " "; // ry
                            scaledData += +values[i + 3] + " "; // x-axis-rotation(0..180)
                            scaledData += +values[i + 4] + " "; // large-arc(0|1)
                            scaledData += +values[i + 5] + " "; // sweep-direction(0|1)
                            scaledData += (values[i + 6] * scale) + " "; // end-dx
                            scaledData += (values[i + 7] * scale) + " "; // end-dy
                            i += 7;
                            break;

                        case "m":
                        case "M":
                        case "L":
                            var x = values[i + 1] * scale;
                            var y = values[i + 2] * scale;
                            scaledData += x + " " + y + " ";
                            i += 2;
                            break;

                        case "Z":
                        case "z":
                            // No-op
                            break;

                        default:
                            throw "Unsupported command '" + command + "' in pathData: supported path commands are M, L, m, a";
                    }
                }
                else
                {
                    throw ("Unexpected path data token '" + values[i] + "'");
                }
            }
            return (scaledData);
        }

        function TranslatePathData(pathData, deltaX, deltaY, scaleFactor)
        {
            var values = pathData.split(" ");
            var translatedData = "";

            for (var i = 0; i < values.length; i++)
            {
                if (isNaN(values[i]))
                {
                    var command = values[i];

                    translatedData += command + " ";

                    switch (command)
                    {
                        // Lower-case commands use relative [to the last end-point] distances/coordinates
                        case "a":
                            translatedData += (values[i + 1] / scaleFactor) + " "; // rx
                            translatedData += (values[i + 2] / scaleFactor) + " "; // ry
                            translatedData += +values[i + 3] + " "; // x-axis-rotation(0..180)
                            translatedData += +values[i + 4] + " "; // large-arc(0|1)
                            translatedData += +values[i + 5] + " "; // sweep-direction(0|1)
                            translatedData += (values[i + 6] / scaleFactor) + " "; // end-dx
                            translatedData += (values[i + 7] / scaleFactor) + " "; // end-dy
                            i += 7;
                            break;

                        case "m":
                            translatedData += (values[i + 1] / scaleFactor) + " " + // dx
                                (values[i + 2] / scaleFactor) + " ";  // dy
                            i += 2;
                            break;

                        case "M":
                        case "L":
                            var translatedX = (values[i + 1] / scaleFactor) + deltaX;
                            var translatedY = (values[i + 2] / scaleFactor) + deltaY;
                            translatedData += translatedX + " " + translatedY + " ";
                            i += 2;
                            break;

                        case "Z":
                        case "z":
                            // No-op
                            break;

                        default:
                            throw "Unsupported command '" + command + "' in pathData: supported path commands are M, L, m, a";
                    }
                }
                else
                {
                    throw ("Unexpected path data token '" + values[i] + "'");
                }
            }
            return (translatedData);
        }

        // Public
        // For example, GetCirclePathData(100, 100, 75) produces the same visual result as <circle cx="100" cy="100" r="75"/>
        function GetCirclePathData(centerX, centerY, radius)
        {
            // See https://stackoverflow.com/questions/5737975/circle-drawing-with-svgs-arc-path
            // and https://developer.mozilla.org/en-US/docs/Web/SVG/Tutorial/Paths
            // 1) M cx cy                [Absolute move-to]
            // 2) m -r 0                 [Relative move-to] 
            // 3) a r r 0 1 0 (r * 2) 0  [Relative arc (rx ry x-axis-rotation(0..180) large-arc(0|1) sweep-direction(0|1) end-x end-y)]
            // 4) a r r 0 1 0 -(r * 2) 0 [Relative arc (rx ry x-axis-rotation(0..180) large-arc(0|1) sweep-direction(0|1) end-x end-y)]
            var circlePathData = "M " + centerX + " " + centerY + " " +
                "m -" + radius + " 0 " +
                "a " + radius + " " + radius + " 0 1 0 " + (radius * 2) + " 0 " +
                "a " + radius + " " + radius + " 0 1 0 " + -(radius * 2) + " 0";
            return (circlePathData);
        }

        // Public
        // Returns the 4 SVG points that define the currently viewable area [within the total panable area]
        function ViewableSvgAreaPoints(gDomElement, insetMargin)
        {
            if (insetMargin === undefined)
            {
                insetMargin = 0;
            }

            var svgInfo = getSvgInfo(gDomElement);
            var viewRect = svgInfo.svgDomElement.getBoundingClientRect(); // In screen coordinates
            var viewRectInset = {
                x: viewRect.left + insetMargin,
                y: viewRect.top + insetMargin,
                width: viewRect.width - (insetMargin * 2),
                height: viewRect.height - (insetMargin * 2)
            };
            var screenPoints = Utils.GetPointsFromRect(viewRectInset);
            var svgPoints = [];

            for (var i = 0; i < screenPoints.length; i++)
            {
                svgPoints.push(MIL.TransposeScreenPoint(screenPoints[i], gDomElement));
            }

            return (svgPoints);
        }

        // Public
        function AreHeadingsAligned(heading1, heading2, range)
        {
            if (range === undefined)
            {
                range = 30;
            }

            var headingDelta = Math.abs(heading1 - heading2);

            if (headingDelta > 270)
            {
                if (heading1 < range)
                {
                    heading1 += 360;
                }
                if (heading2 < range)
                {
                    heading2 += 360;
                }
                headingDelta = Math.abs(heading1 - heading2);
            }

            return (headingDelta < range);
        }

        // Returns true if the specified target X/Y lies inside the specified polygon (array of arrays of X/Y values [ [x,y], [x,y], ... ]).
        // Adapted from https://wrf.ecse.rpi.edu//Research/Short_Notes/pnpoly.html.
        //
        // Copyright(c) 1970-2003, Wm.Randolph Franklin
        // 
        // Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software
        // without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and / or sell copies of the Software, and to 
        // permit persons to whom the Software is furnished to do so, subject to the following conditions:
        // 
        // 1. Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimers.
        // 2. Redistributions in binary form must reproduce the above copyright notice in the documentation and/ or other materials provided with the distribution.
        // 3. The name of W.Randolph Franklin may not be used to endorse or promote products derived from this Software without specific prior written permission.
        //
        // THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR
        // PURPOSE AND NONINFRINGEMENT.IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT
        // OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
        //

        // A polygon helper method [returns true if the target point is inside the vertX/vertY vertices]
        function isPointInPolygon(vertX, vertY, nVert, targetX, targetY)
        {
            var isTargetInside = false;

            for (var i = 0, j = nVert - 1; i < nVert; j = i++)
            {
                if (((vertY[i] > targetY) != (vertY[j] > targetY)) &&
                    (targetX < (vertX[j] - vertX[i]) * (targetY - vertY[i]) / (vertY[j] - vertY[i]) + vertX[i]))
                {
                    isTargetInside = !isTargetInside;
                }
            }

            return (isTargetInside);
        }
            
        // Public
        function IsPointInPolygon(polygonPoints, targetX, targetY)
        {
            // If needed, convert polygonPoints from [{x,y}] to [[x, y]] (often it is better that the caller do this for improved performance)
            polygonPoints = Utils.ConvertXYPointsToPolygonPoints(polygonPoints);

            var nVert = polygonPoints.length;
            var vertX = d3.range(nVert).map(function (i) { return polygonPoints[i][0]; });
            var vertY = d3.range(nVert).map(function (i) { return polygonPoints[i][1]; });
            var isTargetInside = isPointInPolygon(vertX, vertY, nVert, targetX, targetY);

            return (isTargetInside);
        }

        // Public
        function IsAnyPointInPolygon(polygonPoints, pointsToTest)
        {
            // If needed, convert inputs from [{x,y}] to [[x, y]] (often it is better that the caller do this for improved performance)
            polygonPoints = Utils.ConvertXYPointsToPolygonPoints(polygonPoints);
            pointsToTest = Utils.ConvertXYPointsToPolygonPoints(pointsToTest);

            var nVert = polygonPoints.length;
            var vertX = d3.range(nVert).map(function (i) { return polygonPoints[i][0]; });
            var vertY = d3.range(nVert).map(function (i) { return polygonPoints[i][1]; });

            for (var p = 0; p < pointsToTest.length; p++)
            {
                var targetX = pointsToTest[p][0];
                var targetY = pointsToTest[p][1];
                var isTargetInside = isPointInPolygon(vertX, vertY, nVert, targetX, targetY);

                if (isTargetInside)
                {
                    return (true);
                }
            }

            return (false);
        }

        // Public
        function ForEachPointInPolygon(polygonPoints, pointsToTest, fnCallback)
        {
            var nVert = polygonPoints.length;
            var vertX = d3.range(nVert).map(function (i) { return polygonPoints[i][0]; });
            var vertY = d3.range(nVert).map(function (i) { return polygonPoints[i][1]; });

            for (var i = 0; i < pointsToTest.length; i++)
            {
                var targetX = pointsToTest[i][0];
                var targetY = pointsToTest[i][1];
                var isTargetInside = isPointInPolygon(vertX, vertY, nVert, targetX, targetY);

                if (isTargetInside)
                {
                    fnCallback({ x: targetX, y: targetY, index: i });
                }
            }
        }

        // Public
        function CountPointsInPolygon(polygonPoints, pointsToTest)
        {
            // If needed, convert inputs from [{x,y}] to [[x, y]] (often it is better that the caller do this for improved performance)
            polygonPoints = Utils.ConvertXYPointsToPolygonPoints(polygonPoints);
            pointsToTest = Utils.ConvertXYPointsToPolygonPoints(pointsToTest);

            var nVert = polygonPoints.length;
            var vertX = d3.range(nVert).map(function (i) { return polygonPoints[i][0]; });
            var vertY = d3.range(nVert).map(function (i) { return polygonPoints[i][1]; });
            var pointCount = 0;

            for (var p = 0; p < pointsToTest.length; p++)
            {
                var targetX = pointsToTest[p][0];
                var targetY = pointsToTest[p][1];
                var isTargetInside = isPointInPolygon(vertX, vertY, nVert, targetX, targetY);

                if (isTargetInside)
                {
                    pointCount++;
                }
            }

            return (pointCount);
        }

        // Public
        // If needed, converts the supplied 'points' from [{x,y}] to [[x, y]]
        function ConvertXYPointsToPolygonPoints(points)
        {
            if ((points.length > 0) && (points[0].x !== undefined) && (points[0].y !== undefined))
            {
                var polygonPoints = d3.range(points.length).map(function (i) { return ([points[i].x, points[i].y]); });
                return (polygonPoints);
            }
            else
            {
                return (points);
            }
        }

        // Public
        // If needed, converts the supplied 'points' from [[x, y]] to [{x,y}]
        function ConvertPolygonPointsToXYPoints(points)
        {
            if ((points.length > 0) && (points[0] instanceof Array) && (points[0].length == 2))
            {
                var xyPoints = d3.range(points.length).map(function (i) { return ({ x: points[i][0], y: points[i][1] }); });
                return (xyPoints);
            }
            else
            {
                return (points);
            }
        }

        // Public [returns a best-guess (true/false) of whether the supplied path (and corresponding [[x,y]] points) is classified as a straight line]
        function IsStraightLine(path, polygonPoints)
        {
            var isLine = false;
            var convexHullVertices = d3.polygonHull(polygonPoints); // Returned points are in counter-clockwise order [which d3.polygonArea (see below) needs to return a positive value]

            if (convexHullVertices)
            {
                var area = d3.polygonArea(convexHullVertices);
                var lineLength = path.node().getTotalLength();
                var firstPoint = { x: polygonPoints[0][0], y: polygonPoints[0][1] };
                var lastPoint = { x: polygonPoints[polygonPoints.length - 1][0], y: polygonPoints[polygonPoints.length - 1][1] };
                var distance = Utils.GetDistanceBetweenPoints(firstPoint, lastPoint);

                // For a closed path, reduce lineLength by the length of the closing segment
                if (path.attr("d")[path.attr("d").length - 1] == "Z")
                {
                    lineLength -= distance;
                }

                var areaRatio = lineLength / area;
                var distanceRatio = distance / lineLength;

                // This determines if the line is straight(ish), but it's not infallible 
                // (in particular, lines that double-back to end close to where they start will fail this test)
                isLine = ((areaRatio > 0.1) && (distanceRatio > 0.5)) || (distanceRatio >= 0.95); // Guesstimated thresholds
                // log("DEBUG: " + (isLine ? "" : "Not ") + "Line (" + areaRatio.toFixed(2) + ", " + distanceRatio.toFixed(2) + ")");
            }
            return (isLine);
        }

        // Public
        function GetLineMidPoint(point1, point2)
        {
            var maxX = Math.max(point1.x, point2.x);
            var minX = Math.min(point1.x, point2.x);
            var maxY = Math.max(point1.y, point2.y);
            var minY = Math.min(point1.y, point2.y);
            return ({ x: minX + ((maxX - minX) / 2), y: minY + ((maxY - minY) / 2) });
        }

        // Public
        function DebugDrawPoints(gDomElement, points, strokeWidth)
        {
            var d = "M " + points[0].x + " " + points[0].y; // This handles the case where points contains a single point

            for (var i = 0; i < points.length; i++)
            {
                d += " L" + points[i].x + " " + points[i].y;
            }

            var path = d3.select(gDomElement).append("path").attr("d", d);
            path.node().style.stroke = "red";
            path.node().style.strokeWidth = strokeWidth + "px";

            return (path);
        }

        // Returns the name of the constructor function (ie. the "type") of the specified object
        function getObjectType(o)
        {
            var c = o.constructor.toString();
            var objectType = null;

            if (c.indexOf("function") == 0)
            {
                objectType = c.slice(9, c.indexOf("(")).trim();
            }
            else
            {
                if (c.indexOf("[object") == 0)
                {
                    objectType = c.slice(8, c.indexOf("]")).trim();
                }
            }
            return (objectType);
        }

        function getTime()
        {
            var now = new Date(Date.now());
            var time = ("0" + now.getHours()).slice(-2) + ":" + ("0" + now.getMinutes()).slice(-2) + ":" + ("0" + now.getSeconds()).slice(-2) + "." + ("00" + now.getMilliseconds()).slice(-3);
            return (time);
        }

        // These are the "public" members of the 'MIL.Utils' module
        exports.EnableKeyboardHandler = EnableKeyboardHandler;
        exports.IsKeyPressed = IsKeyPressed;
        exports.IsNoKeyPressed = IsNoKeyPressed;
        exports.GetPressedKeyInfo = GetPressedKeyInfo;
        exports.Keys = Keys;
        exports.GetDomElement = GetDomElement;
        exports.ToNumber = ToNumber;
        exports.GetCssProperty = GetCssProperty;
        exports.Fade = Fade;
        exports.Log = Log;
        exports.DebugDrawPoints = DebugDrawPoints;
        exports.GetCentroidPoint = GetCentroidPoint;
        exports.GetPointsFromRect = GetPointsFromRect;
        exports.GetRectFromPoints = GetRectFromPoints;
        exports.SamplePointsFromPath = SamplePointsFromPath;
        exports.GetTransformedPoints = GetTransformedPoints;
        exports.GetClosestPointOnLine = GetClosestPointOnLine;
        exports.GetDistanceBetweenEvents = GetDistanceBetweenEvents;
        exports.GetDistanceBetweenPoints = GetDistanceBetweenPoints;
        exports.GetBoundingRectForPoints = GetBoundingRectForPoints;
        exports.GetHeadingFromPoints = GetHeadingFromPoints;
        exports.GetCompassHeading = GetCompassHeading;
        exports.GetPointOnCircle = GetPointOnCircle;
        exports.GetPointsOnCircle = GetPointsOnCircle;
        exports.ScalePathData = ScalePathData;
        exports.TranslatePathData = TranslatePathData;
        exports.GetCirclePathData = GetCirclePathData;
        exports.ViewableSvgAreaPoints = ViewableSvgAreaPoints;
        exports.AreHeadingsAligned = AreHeadingsAligned;
        exports.FindShapeElementsInRegion = FindShapeElementsInRegion;
        exports.IsPointInPolygon = IsPointInPolygon;
        exports.IsAnyPointInPolygon = IsAnyPointInPolygon;
        exports.ForEachPointInPolygon = ForEachPointInPolygon;
        exports.CountPointsInPolygon = CountPointsInPolygon;
        exports.ConvertXYPointsToPolygonPoints = ConvertXYPointsToPolygonPoints;
        exports.ConvertPolygonPointsToXYPoints = ConvertPolygonPointsToXYPoints;
        exports.IsStraightLine = IsStraightLine;
        exports.GetLineMidPoint = GetLineMidPoint;
    }));

    // A sub-module (namespace) for UI controls
    (function MILControlsInit(factory)
    {
        factory(exports.Controls = exports.Controls || {});
    }
        (function MILControlsFactory(exports)
        {
            function IsControl(targetDomElement)
            {
                var selfOrAncestorIsControl = false;

                targetDomElement = Utils.GetDomElement(targetDomElement);
                while (targetDomElement && !selfOrAncestorIsControl)
                {
                    if (targetDomElement.hasOwnProperty("__MILIsControl__"))
                    {
                        selfOrAncestorIsControl = true;
                    }
                    targetDomElement = targetDomElement.parentElement || targetDomElement.parentNode;
                }

                return (selfOrAncestorIsControl);
            }

            function Ruler(svg)
            {
                var svgDomElement = Utils.GetDomElement(svg, SVGSVGElement);
                var svgInfo = getSvgInfo(svgDomElement);

                if (svgInfo.ruler == null)
                {
                    svgInfo.ruler = new ruler(svgInfo.gDomElement)
                        .BeginUpdate()
                        .Width(svgInfo.svgWidth * 0.4).BigTickCount(10).LittleTickCount(10).KeepConstantScale(true).CenterInView()
                        .EndUpdate();
                }

                return (svgInfo.ruler);
            }

            function Frame(svg)
            {
                var svgDomElement = Utils.GetDomElement(svg, SVGSVGElement);
                var svgInfo = getSvgInfo(svgDomElement);

                if (svgInfo.frame == null)
                {
                    svgInfo.frame = new frame(svgInfo.gDomElement);
                }

                return (svgInfo.frame);
            }

            // frame "class" [START]
            function frame(gDomElement)
            {
                this._rect = null;
                this._gDomElement = Utils.GetDomElement(gDomElement, SVGGElement);
                this._className = "";
            }

            // Note: frame_* functions not explicitly in the prototype must have 'this' set explicitly [eg. using call()]
            frame.prototype = {
                Class: frame_class
            };

            function frame_redraw()
            {
                if (this._rect == null)
                {
                    var svgInfo = getSvgInfo(this._gDomElement);
                    var rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
                    svgInfo.gDomElement.insertBefore(rect, svgInfo.gDomElement.firstChild); // Ensure it's the first child

                    var minZoomLevel = svgInfo.settings.MinZoomLevel();
                    var frameWidth = svgInfo.svgWidth / minZoomLevel;
                    var frameHeight = svgInfo.svgHeight / minZoomLevel;
                    var frameX = -((frameWidth - svgInfo.svgWidth) / 2);
                    var frameY = -((frameHeight - svgInfo.svgHeight) / 2);

                    this._rect = d3.select(rect);
                    this._rect.attr("width", frameWidth).attr("height", frameHeight).attr("x", frameX).attr("y", frameY);
                    this._rect.node().__MILIsControl__ = true;
                }

                if (this._className)
                {
                    this._rect.classed(this._className, true);
                }
                this._rect.node().style.stroke = this._className ? "" : "red";
                this._rect.node().style.strokeWidth = this._className ? "" : "3px";
                this._rect.node().style.fill = this._className ? "" : "transparent";
            }

            function frame_class(className)
            {
                if (className === undefined) { return (this._className); } else { this._className = className; frame_redraw.call(this); return (this); }
            }
            // frame "class" [END]

            // ruler "class" [START]
            function ruler(gDomElement)
            {
                this.ID_PREFIX = "rulerPart_";
                this.RULER_MIN_HEIGHT = 80;
                this.RULER_MIN_WIDTH = 300;
                this.TOOLBAR_ITEM_WIDTH = 30; // [_height * 0.3] We'll adjust this in ruler_height()
                this.TOOLBAR_ITEM_MARGIN = 4; // On all sides (around the item)
                this.RULER_ENDS_TARGET_REGION_WIDTH_RATIO = 0.2; // Defines the gesture target region (as a percentage of the width) for the ruler ends

                this._gRuler = null; // The ruler is "compound" object
                this._outlinePath = null; // The "primary" outline + ticks + grabbers
                this._toolbarPath = null; // The toolbar outline
                this._selectionIndicatorPath = null; // The indicator for the selected item in the toolbar
                this._centerCirclePath = null; // The circle at the center of the ruler
                this._gDomElement = Utils.GetDomElement(gDomElement, SVGGElement);
                this._allowRedraw = true; // Whether the ruler should be allowed to redraw itself [see Begin/EndUpdate()]
                this._width = 0;
                this._height = 100;
                this._bigTickCount = 0;
                this._littleTickCount = 0;
                this._className = "";
                this._strokeWidth = 0.5; // Pixels [overrides the strokeWidth set in _className, because we have to scale it]
                this._centerPoint = { x: 0, y: 0 };
                this._rotationAngle = 90; // 90 = Horizontal
                this._keepConstantScale = true;
                this._isResizable = true; // Whether the ruler can be stretched (by _defaultRotateAndMoveGesture)
                this._toolbarItemCount = 0;
                this._toolbarItemSelectedColor = "WhiteSmoke";
                this._toolbarItemStyler = null;
                this._selectedToolbarItemNumber = -1; // -1 means means no item is selected; 0..n means there's an active selection 
                this._onToolbarSelectionChanged = null;
                this._isVisible = false;
                this._faceEdgeStartPoint = null; // [x,y]
                this._faceEdgeEndPoint = null; // [x,y]
                this._centerLineStartPoint = null; // [x,y]
                this._centerLineEndPoint = null; // [x,y]
                this._toolbarWidth = 0;

                this._defaultMoveGesture = null;
                this._defaultRotateAndMoveGesture = null;
                this._defaultTapGesture = null;
                this._defaultToolbarTapGesture = null;
                this._prevMovePoint = null; // Used by _defaultMoveGesture
                this._oneTouchRotationInProgress = false; // Used by _defaultMoveGesture
                this._rulerResizeInProgress = false; // Used by _defaultRotateAndMoveGesture
                this._rulerResizeStartDistance = 0; // Used by _defaultRotateAndMoveGesture
                this._rulerResizeStartWidth = 0; // Used by _defaultRotateAndMoveGesture
                this._rotateStartPointPointerType = null; // Used by _defaultRotateAndMoveGesture
                this._rotateEndPointPointerType = null; // Used by _defaultRotateAndMoveGesture
            }

            // Note: ruler_* functions not explicitly in the prototype must have 'this' set explicitly [eg. using call()]
            ruler.prototype = {
                Width: ruler_width,
                Height: ruler_height,
                BigTickCount: ruler_bigTickCount,
                LittleTickCount: ruler_littleTickCount,
                Class: ruler_class,
                StrokeWidth: ruler_strokeWidth,
                CenterPoint: ruler_centerPoint,
                RotationAngle: ruler_rotationAngle,
                KeepConstantScale: ruler_keepConstantScale,
                IsResizable: ruler_isResizable,
                ToolbarItemCount: ruler_toolbarItemCount,
                SelectedToolbarItemNumber: ruler_selectedToolbarItemNumber,
                OnToolbarSelectionChanged: ruler_onToolbarSelectionChanged,
                ToolbarItemStyler: ruler_toolbarItemStyler,
                ToolbarItemSelectedColor: ruler_toolbarItemSelectedColor,
                IsVisible: ruler_isVisible,
                IsInView: ruler_isInView,
                CenterInView: ruler_centerInView,
                BringToFront: ruler_bringToFront,
                RemoveDefaultGestures: ruler_removeDefaultGestures,
                GetFaceEdgeLine: ruler_getFaceEdgeLine,
                GetCenterLine: ruler_getCenterLine,
                Redraw: ruler_forcedRedraw,
                BeginUpdate: ruler_beginUpdate,
                EndUpdate: ruler_endUpdate
            };

            function ruler_beginUpdate()
            {
                this._allowRedraw = false;
                return (this);
            }

            function ruler_endUpdate()
            {
                this._allowRedraw = true;
                ruler_redraw.call(this);
                return (this);
            }

            function ruler_forcedRedraw()
            {
                this._allowRedraw = true;
                ruler_redraw.call(this);
            }

            function ruler_redraw()
            {
                if (!this._allowRedraw)
                {
                    return;
                }

                // log("** REDRAWING RULER **");

                if (this._gRuler == null)
                {
                    var prefix = this.ID_PREFIX;
                    this._gRuler = d3.select(this._gDomElement).append("g");
                    this._centerCirclePath = this._gRuler.append("path").attr("id", prefix + "CenterCircle"); // We add this first so that it's behind _outlinePath and therefore isn't a hit-target
                    this._zoomLevelText = this._gRuler.append("text").attr("font-family", "Segoe UI").attr("id", prefix + "ZoomLevelText");
                    this._outlinePath = this._gRuler.append("path").attr("id", prefix + "Outline");
                    this._selectionIndicatorPath = this._gRuler.append("path").attr("id", prefix + "SelectionIndicator");
                    this._toolbarPath = this._gRuler.append("path").attr("id", prefix + "Toolbar");
                    this._gRuler.node().__MILIsControl__ = true;

                    ruler_addDefaultGestures.call(this);
                }

                var pathPointsCollection = [];
                var d = "";

                // Optionally, scale the height and width to compensate for the zoom level (make the ruler be constant-sized on the screen, regardless of the zoom level)
                var svgInfo = getSvgInfo(this._gDomElement);
                var scaleFactor = this._keepConstantScale ? svgInfo.zoomLevel : 1;
                var rulerWidth = this._width / scaleFactor;
                var rulerHeight = this._height / scaleFactor;

                // These are all relative (to [0,0]) coordinates
                pathPointsCollection.push([[0, 0], [rulerWidth, 0], [rulerWidth, rulerHeight], [0, rulerHeight], [0, 0]]);

                // Add hash marks
                var bigTickHeight = rulerHeight / 4;
                var littleTickHeight = bigTickHeight / 2;

                if (this._bigTickCount > 0)
                {
                    var bigTickInterval = rulerWidth / this._bigTickCount;
                    var littleTickInterval = bigTickInterval / this._littleTickCount;

                    for (var bigTick = 0; bigTick < this._bigTickCount; bigTick++)
                    {
                        if (bigTick > 0)
                        {
                            var x = bigTickInterval * bigTick;
                            pathPointsCollection.push([[x, 0], [x, bigTickHeight]]);
                        }

                        if (this._littleTickCount > 0)
                        {
                            for (var littleTick = 1; littleTick < this._littleTickCount; littleTick++)
                            {
                                var x = (bigTickInterval * bigTick) + (littleTickInterval * littleTick);
                                pathPointsCollection.push([[x, 0], [x, littleTickHeight]]);
                            }
                        }
                    }
                }

                // Add the "rotation/resize region" delimiting markers
                pathPointsCollection.push([[rulerWidth * this.RULER_ENDS_TARGET_REGION_WIDTH_RATIO, rulerHeight * 0.9], [rulerWidth * this.RULER_ENDS_TARGET_REGION_WIDTH_RATIO, rulerHeight]]);
                pathPointsCollection.push([[rulerWidth * (1 - this.RULER_ENDS_TARGET_REGION_WIDTH_RATIO), rulerHeight * 0.9], [rulerWidth * (1 - this.RULER_ENDS_TARGET_REGION_WIDTH_RATIO), rulerHeight]]);

                if (this._isResizable)
                {
                    // Add "grippers" at each end (for resizing)
                    var gripperLineHeight = rulerHeight / 6;
                    var gripperLineSpacing = gripperLineHeight / 3.5;
                    for (var gripperLine = 0; gripperLine < 3; gripperLine++)
                    {
                        var x = (gripperLineSpacing * 4) + (gripperLineSpacing * gripperLine);
                        var y = littleTickHeight + ((rulerHeight - littleTickHeight - gripperLineHeight) / 2);
                        pathPointsCollection.push([[x, y], [x, y + gripperLineHeight]]);
                        pathPointsCollection.push([[rulerWidth - x, y], [rulerWidth - x, y + gripperLineHeight]]);
                    }
                }

                // Prepare the path data
                for (var c = 0; c < pathPointsCollection.length; c++)
                {
                    var pathPoints = pathPointsCollection[c];

                    for (var i = 0; i < pathPoints.length; i++)
                    {
                        // Transform from relative to absolute (svg) coordinates
                        pathPoints[i] = [
                            pathPoints[i][0] + this._centerPoint.x - (rulerWidth / 2),
                            pathPoints[i][1] + this._centerPoint.y - (rulerHeight / 2)
                        ];
                        d += ((i == 0) ? " M " : " L") + pathPoints[i][0] + " " + pathPoints[i][1];
                    }

                    if (c == 0)
                    {
                        var inkOffset = 2 / scaleFactor; // So that coerced ink isn't drawn right under the edge of the ruler [although this will depend on the ink strokeWidth]
                        this._faceEdgeStartPoint = [pathPoints[0][0], pathPoints[0][1] - inkOffset];
                        this._faceEdgeEndPoint = [pathPoints[1][0], pathPoints[1][1] - inkOffset];

                        this._centerLineStartPoint = [pathPoints[0][0], pathPoints[0][1] + (rulerHeight / 2)];
                        this._centerLineEndPoint = [pathPoints[1][0], pathPoints[1][1] + (rulerHeight / 2)];
                    }
                }

                this._outlinePath.attr("d", d);

                var tbItemWidth = this.TOOLBAR_ITEM_WIDTH / scaleFactor;
                var tbItemHeight = this.TOOLBAR_ITEM_WIDTH / scaleFactor;
                var tbWidth = (this._toolbarItemCount * this.TOOLBAR_ITEM_WIDTH) / scaleFactor;
                var tbHeight = tbItemHeight;
                var tbStartX = this._centerPoint.x - (tbWidth / 2); // TopLeft.x
                var tbStartY = this._centerPoint.y + ((rulerHeight / 2) - tbItemHeight - (this._strokeWidth / scaleFactor)); // TopLeft.y

                // Draw the toolbar (relative to _centerPoint to keep its position on the ruler fixed (ie. not changing if the ruler is resized))
                if ((this._toolbarItemCount > 0) && (this._centerPoint.x != 0))
                {
                    var toolbarPathData = "";

                    pathPointsCollection.length = 0;

                    this._toolbarWidth = tbWidth;

                    // Add left/top/right edges of toolbar
                    pathPointsCollection.push([[tbStartX, tbStartY + tbHeight], [tbStartX, tbStartY], [tbStartX + tbWidth, tbStartY], [tbStartX + tbWidth, tbStartY + tbHeight]]);

                    // Add toolbar item dividers
                    for (var i = 1; i < this._toolbarItemCount; i++)
                    {
                        var x = tbStartX + (tbItemWidth * i);
                        pathPointsCollection.push([[x, tbStartY], [x, tbStartY + tbHeight]]);
                    }

                    // Position selection indicator
                    if (this._selectedToolbarItemNumber != -1)
                    {
                        var indicatorStartX = tbStartX + (tbItemWidth * this._selectedToolbarItemNumber);
                        var indicatorStartY = tbStartY;
                        var indicatorPathData = "M 0 0 L " + tbItemWidth + " 0 L " + tbItemWidth + " " + tbItemHeight + " L 0 " + tbItemHeight + " Z";
                        this._selectionIndicatorPath
                            .attr("d", Utils.TranslatePathData(indicatorPathData, indicatorStartX, indicatorStartY, 1))
                            .style("fill", this._toolbarItemSelectedColor);
                    }
                    this._selectionIndicatorPath.attr("display", ((this._selectedToolbarItemNumber != -1) && this._isVisible) ? "inline" : "none");

                    // Prepare the path data
                    for (var c = 0; c < pathPointsCollection.length; c++)
                    {
                        var pathPoints = pathPointsCollection[c];

                        for (var i = 0; i < pathPoints.length; i++)
                        {
                            toolbarPathData += ((i == 0) ? " M " : " L") + pathPoints[i][0] + " " + pathPoints[i][1];
                        }
                    }

                    this._toolbarPath.attr("d", toolbarPathData);

                    ruler_applyStyle.call(this, this._toolbarPath, scaleFactor, "transparent");

                    // Position toolbar items
                    var ruler = this;
                    var toolbarItemPaths = this._gRuler.selectAll("path").filter(function () { return (this.getAttribute("id").indexOf(ruler.ID_PREFIX + "ToolbarItem") == 0); });
                    for (var t = 0; t < toolbarItemPaths.size(); t++)
                    {
                        var itemPath = toolbarItemPaths.nodes()[t];

                        // Transform from relative to absolute (svg) coordinates
                        var dx = tbStartX + (t * tbItemWidth) + (this.TOOLBAR_ITEM_MARGIN / scaleFactor);
                        var dy = tbStartY + (this.TOOLBAR_ITEM_MARGIN / scaleFactor);
                        d = Utils.TranslatePathData(itemPath.__MILOriginalD__, dx, dy, scaleFactor);

                        itemPath.setAttribute("d", d);
                        itemPath.style.strokeWidth = (itemPath.__MILOriginalStrokeWidth__ / scaleFactor) + "px";
                    }
                }

                if (this._centerPoint.x != 0)
                {
                    // Update the circle in the center of the ruler [this will appear behind _outlinePath]
                    var circlePathData = Utils.GetCirclePathData(this._centerPoint.x, this._centerPoint.y, 6 / scaleFactor) +
                        " " + Utils.TranslatePathData("M -10 0 L 10 0 M 0 -10 L 0 10", this._centerPoint.x, this._centerPoint.y, scaleFactor); // Add cross-hairs
                    var textHeight = 11 / scaleFactor;
                    var hasToolbar = this._toolbarItemCount > 0;

                    this._centerCirclePath.attr("d", circlePathData);
                    ruler_applyStyle.call(this, this._centerCirclePath, scaleFactor, "transparent");

                    // Update the zoom-level text [this will appear behind _outlinePath]
                    this._zoomLevelText
                        .text(svgInfo.zoomLevel.toFixed(2) + "x")
                        .attr("font-size", textHeight + "px")
                        .style("stroke", this._outlinePath.style("stroke"))
                        .style("stroke-width", this._outlinePath.style("stroke-width"));

                    var textWidth = this._zoomLevelText.node().getBBox().width;
                    this._zoomLevelText
                        .attr("x", tbStartX - ((hasToolbar ? 35 : ((textWidth * scaleFactor) / 2)) / scaleFactor))
                        .attr("y", tbStartY + ((tbHeight - textHeight) / 2) + (textHeight * 0.8)); // Note: for <text> y is the bottom, not top
                }

                // Note: The -90 is to account for how the "rotate()" transform works (their 0 = our 90)
                this._gRuler.attr("transform", "rotate(" + (this._rotationAngle - 90) + "," + this._centerPoint.x + "," + this._centerPoint.y + ")");

                ruler_applyStyle.call(this, this._outlinePath, scaleFactor);

                // Note: We use 'visibility' (not 'display') so that we can still get the position/dimensions of the ruler when it's not shown
                this._gRuler.attr("visibility", this._isVisible ? "visible" : "hidden");

                this.BringToFront();
            }

            // Note: 'fill' parameter is optional
            function ruler_applyStyle(rulerElement, scaleFactor, fill)
            {
                var className = this.Class();

                if (className)
                {
                    rulerElement.classed(className, true);
                }
                rulerElement.node().style.stroke = className ? "" : "gray";
                rulerElement.node().style.strokeWidth = (this._strokeWidth / scaleFactor) + "px";
                rulerElement.node().style.fill = fill ? fill : (className ? "" : "rgba(5, 5, 5, 0.05)");
            }

            function ruler_width(widthInPx)
            {
                if (widthInPx === undefined) { return (this._width); } else { this._width = Math.max(this.RULER_MIN_WIDTH, widthInPx); ruler_redraw.call(this); return (this); }
            }

            function ruler_height(heightInPx)
            {
                if (heightInPx === undefined)
                {
                    return (this._height);
                }
                else
                {
                    this._height = Math.max(this.RULER_MIN_HEIGHT, heightInPx);
                    this.TOOLBAR_ITEM_WIDTH = this._height * 0.3;
                    ruler_redraw.call(this);
                    return (this);
                }
            }

            function ruler_bigTickCount(bigTickCount)
            {
                if (bigTickCount === undefined) { return (this._bigTickCount); } else { this._bigTickCount = bigTickCount; ruler_redraw.call(this); return (this); }
            }

            function ruler_littleTickCount(littleTickCount)
            {
                if (littleTickCount === undefined) { return (this._littleTickCount); } else { this._littleTickCount = littleTickCount; ruler_redraw.call(this); return (this); }
            }

            function ruler_class(className)
            {
                if (className === undefined)
                {
                    return (this._className);
                }
                else
                {
                    this.BeginUpdate();
                    this._className = className;

                    var strokeWidth = Utils.GetCssProperty("." + className, "stroke-width");
                    if (strokeWidth)
                    {
                        this.StrokeWidth(strokeWidth);
                    }
                    this.EndUpdate();
                    return (this);
                }
            }

            function ruler_strokeWidth(strokeWidth)
            {
                if (strokeWidth === undefined) { return (this._strokeWidth); } else { this._strokeWidth = Utils.ToNumber(strokeWidth); ruler_redraw.call(this); return (this); }
            }

            function ruler_centerPoint(point)
            {
                if (point === undefined) { return (this._centerPoint); } else { this._centerPoint = point; ruler_redraw.call(this); return (this); }
            }

            function ruler_rotationAngle(angle)
            {
                if (angle === undefined) { return (this._rotationAngle); } else { this._rotationAngle = angle % 360; ruler_redraw.call(this); return (this); }
            }

            function ruler_keepConstantScale(enable)
            {
                if (enable === undefined) { return (this._keepConstantScale); } else { this._keepConstantScale = enable; ruler_redraw.call(this); return (this); }
            }

            function ruler_isResizable(enable)
            {
                return (getOrSetProperty(this, "_isResizable", enable));
            }

            function ruler_toolbarItemCount(count)
            {
                if (count === undefined)
                {
                    return (this._toolbarItemCount);
                }
                else
                {
                    var widthAvailableForToolbar = (this._isResizable ? this.RULER_MIN_WIDTH : this._width) * (1 - (this.RULER_ENDS_TARGET_REGION_WIDTH_RATIO * 2));
                    var maxToolbarItemCount = Math.floor(widthAvailableForToolbar / this.TOOLBAR_ITEM_WIDTH);

                    if (count > maxToolbarItemCount)
                    {
                        throw "The [" + (this._isResizable ? "resizable" : "non-resizable") + "] ruler has a limit of " + maxToolbarItemCount + " toolbar items";
                    }

                    var newItemCount = Math.max(0, Math.min(count, maxToolbarItemCount));

                    if (newItemCount != this._toolbarItemCount)
                    {
                        // Remove all existing item paths
                        var ruler = this;
                        var toolbarItemPaths = this._gRuler.selectAll("path").filter(function () { return (this.getAttribute("id").indexOf(ruler.ID_PREFIX + "ToolbarItem") == 0); });
                        toolbarItemPaths.remove();
                        this._selectedToolbarItemNumber = -1;

                        // Add new items paths
                        for (var i = 0; i < newItemCount; i++)
                        {
                            var itemPath = this._gRuler.append("path").attr("id", this.ID_PREFIX + "ToolbarItem" + i);

                            if (this._toolbarItemStyler != null)
                            {
                                this._toolbarItemStyler(itemPath, i);
                                // Scale the path (which must be made up of only M/L/m/a commands so that Utils.ScalePathData()/TranslatePathData() will work)
                                // Note: We don't need to account for the zoomLevel here: ruler_redraw() will handle that
                                var pathData = itemPath.attr("d");
                                var itemBoundingRect = itemPath.node().getBBox(); // The getBBox() return value is unaffected by the rotation transform [if any] on _gRuler
                                var scale = (this.TOOLBAR_ITEM_WIDTH - (this.TOOLBAR_ITEM_MARGIN * 2)) / itemBoundingRect.width;
                                var scaledPathData = Utils.ScalePathData(pathData, scale);
                                itemPath.attr("d", scaledPathData);
                                itemPath.node().__MILOriginalD__ = itemPath.attr("d");

                                var strokeWidth = Utils.ToNumber(itemPath.style("stroke-width"));
                                itemPath.node().__MILOriginalStrokeWidth__ = strokeWidth ? strokeWidth : 1;
                            }
                            else
                            {
                                throw "Ruler.ToolbarItemStyler() must be set before setting Ruler.ToolbarItemCount()";
                            }
                        }

                        // Bring the toolbar path to the top so that it's the top hit-target, not the itemPath's
                        var toolbarPath = this._toolbarPath.remove().node();
                        this._gRuler.node().appendChild(toolbarPath);

                        this._toolbarItemCount = newItemCount;
                        ruler_redraw.call(this);
                    }

                    return (this);
                }
            }

            function ruler_selectedToolbarItemNumber(itemNumber)
            {
                if (itemNumber === undefined)
                {
                    return (this._selectedToolbarItemNumber);
                }
                else
                {
                    var oldItemNumber = this._selectedToolbarItemNumber;
                    var newItemNumber = Math.max(0, Math.min(itemNumber, this._toolbarItemCount - 1));

                    newItemNumber = (newItemNumber == this._selectedToolbarItemNumber) ? -1 : newItemNumber;

                    if (newItemNumber != oldItemNumber)
                    {
                        this._selectedToolbarItemNumber = newItemNumber;
                        if (this._onToolbarSelectionChanged != null)
                        {
                            this._onToolbarSelectionChanged.call(this, oldItemNumber);
                        }
                        ruler_redraw.call(this);
                    }
                    return (this);
                }
            }

            function ruler_onToolbarSelectionChanged(handler)
            {
                return (getOrSetProperty(this, "_onToolbarSelectionChanged", handler));
            }

            function ruler_toolbarItemSelectedColor(color)
            {
                if (color === undefined) { return (this._toolbarItemSelectedColor); } else { this._toolbarItemSelectedColor = color; ruler_redraw.call(this); return (this); }
            }

            function ruler_toolbarItemStyler(callback)
            {
                return (getOrSetProperty(this, "_toolbarItemStyler", callback));
            }

            function ruler_isVisible(visible)
            {
                if (visible === undefined) { return (this._isVisible); } else { this._isVisible = visible; ruler_redraw.call(this); return (this); }
            }

            function ruler_isInView(targetPercentVisible)
            {
                // Control how much of the ruler has to be visible for it to be considered "in view"
                targetPercentVisible = targetPercentVisible || 0.33;

                var svgInfo = getSvgInfo(this._gDomElement);
                var viewRectPoints = Utils.ViewableSvgAreaPoints(svgInfo.gDomElement, 0);
                var rulerRectPoints = Utils.SamplePointsFromPath(this._outlinePath.node()); // This is a sampling of points, not all actual points
                var totalRulerRectPointsCount = rulerRectPoints.length;
                var visibleRulerRectPointsCount = Utils.CountPointsInPolygon(viewRectPoints, rulerRectPoints);
                var percentVisible = visibleRulerRectPointsCount / totalRulerRectPointsCount;
                var isInView = (percentVisible >= targetPercentVisible);

                return (isInView);
            }

            function ruler_centerInView()
            {
                var svgInfo = getSvgInfo(this._gDomElement);
                var viewRect = svgInfo.svgDomElement.getBoundingClientRect(); // In screen coordinates
                var centerPoint = { x: viewRect.left + (viewRect.width / 2), y: viewRect.top + (viewRect.height / 2) };

                this.CenterPoint(MIL.TransposeScreenPoint(centerPoint, this._gDomElement));
                return (this);
            }

            function ruler_bringToFront()
            {
                var gRuler = this._gRuler.node();

                if ((this._gDomElement.childNodes.length > 0) && (this._gDomElement.childNodes[this._gDomElement.childNodes.length - 1] != gRuler))
                {
                    this._gDomElement.removeChild(gRuler);
                    this._gDomElement.appendChild(gRuler);
                }
            }

            function ruler_removeDefaultGestures()
            {
                MIL.RemoveGestureByName(this._defaultMoveGesture.Name());
                MIL.RemoveGestureByName(this._defaultRotateAndMoveGesture.Name());
                MIL.RemoveGestureByName(this._defaultTapGesture.Name());
                MIL.RemoveGestureByName(this._defaultToolbarTapGesture.Name());

                this._defaultMoveGesture = null;
                this._defaultRotateAndMoveGesture = null;
                this._defaultTapGesture = null;
                this._defaultToolbarTapGesture = null;
            }

            function ruler_getSvgLine(startPoint, endPoint)
            {
                var svgDomElement = this._gDomElement.ownerSVGElement;
                var startSvgPoint = svgDomElement.createSVGPoint();
                var endSvgPoint = svgDomElement.createSVGPoint();

                startSvgPoint.x = startPoint[0];
                startSvgPoint.y = startPoint[1];
                endSvgPoint.x = endPoint[0];
                endSvgPoint.y = endPoint[1];

                var line = [
                    // startPoint/endPoint are in SVG coordinate space, so they already take the translate/scale transform (see zoomAtPoint()) of _gDomElement
                    // into account, but they do NOT take the ruler transform into account. Consequently we have to use GetTransformedPoints() to address this.
                    Utils.GetTransformedPoints(this._gRuler.node(), [startSvgPoint])[0],
                    Utils.GetTransformedPoints(this._gRuler.node(), [endSvgPoint])[0]
                ];

                return (line);
            }

            function ruler_getFaceEdgeLine()
            {
                var faceEdgeLine = ruler_getSvgLine.call(this, this._faceEdgeStartPoint, this._faceEdgeEndPoint);
                return (faceEdgeLine);
            }

            function ruler_getCenterLine()
            {
                var centerLine = ruler_getSvgLine.call(this, this._centerLineStartPoint, this._centerLineEndPoint);
                return (centerLine);
            }

            function ruler_addDefaultGestures()
            {
                if (this._defaultMoveGesture != null)
                {
                    // Already added
                    return;
                }

                var ruler = this;
                var initialXOffsetToCenterLine = 0;
                var initialYOffsetToCenterLine = 0;
                var onRulerMove = function (e) { ruler_onRulerMove(e, ruler, initialXOffsetToCenterLine, initialYOffsetToCenterLine); };
                var startPointXOffsetToCenterLine = 0;
                var startPointYOffsetToCenterLine = 0;
                var endPointXOffsetToCenterLine = 0;
                var endPointYOffsetToCenterLine = 0;
                var centerPointRatio = 0;
                var onRulerRotateAndMove = function (e) { ruler_onRulerRotateAndMove(e, ruler, startPointXOffsetToCenterLine, startPointYOffsetToCenterLine, endPointXOffsetToCenterLine, endPointYOffsetToCenterLine, centerPointRatio); };

                this._defaultMoveGesture = MIL.CreateGesture("DefaultRulerMove*", true)
                    .Target(ruler._outlinePath)
                    .PointerType("touch")
                    .Conditional(function () { return (MIL.Utils.IsNoKeyPressed()); })
                    .GestureStartedHandler(function ()
                    {
                        var newMovePoint = ruler._prevMovePoint = this.GetCurrentSvgPoint("{P1}");
                        var line = ruler.GetFaceEdgeLine();
                        var lineStartPoint = line[0], lineEndPoint = line[1];
                        var lineLength = Utils.GetDistanceBetweenPoints(lineStartPoint, lineEndPoint);
                        var pointOnLine = Utils.GetClosestPointOnLine(newMovePoint, lineStartPoint, lineEndPoint);

                        // If the ruler is touched near either end then we rotate (instead of move) the ruler, but only if the ruler is 100% in-view
                        ruler._oneTouchRotationInProgress = ruler.IsInView(1) &&
                            ((Utils.GetDistanceBetweenPoints(pointOnLine, lineStartPoint) < (lineLength * ruler.RULER_ENDS_TARGET_REGION_WIDTH_RATIO)) ||
                            (Utils.GetDistanceBetweenPoints(pointOnLine, lineEndPoint) < (lineLength * ruler.RULER_ENDS_TARGET_REGION_WIDTH_RATIO)));

                        if (ruler._oneTouchRotationInProgress)
                        {
                            var rulerCenterLine = ruler.GetCenterLine();
                            var pointOnRulerCenterLine = Utils.GetClosestPointOnLine(newMovePoint, rulerCenterLine[0], rulerCenterLine[1]);
                            initialXOffsetToCenterLine = pointOnRulerCenterLine.x - newMovePoint.x;
                            initialYOffsetToCenterLine = pointOnRulerCenterLine.y - newMovePoint.y;
                        }

                        this.OnMoveHandler(onRulerMove);
                    })
                    .GestureEndedHandler(function ()
                    {
                        ruler._prevMovePoint = null;
                    });

                this._defaultRotateAndMoveGesture = MIL.CreateGesture("DefaultRulerRotateAndMove*", true)
                    .Target(ruler._outlinePath)
                    .PointerType("touch:2")
                    .RecognitionTimeoutInMs(50)
                    .GestureStartedHandler(function ()
                    {
                        var rulerCenterLine = ruler.GetCenterLine();
                        var centerLineStartPoint = rulerCenterLine[0], centerLineEndPoint = rulerCenterLine[1];
                        var centerLineLength = Utils.GetDistanceBetweenPoints(centerLineStartPoint, centerLineEndPoint);
                        var point1 = this.GetCurrentSvgPoint("{P1}");
                        var point2 = this.GetCurrentSvgPoint("{P2}");
                        var heading = Utils.GetHeadingFromPoints(point1, point2);
                        // To prevent the ruler from doing a 180-degree "flip" (based on the the heading computed
                        // from the touch points) we check that the heading is aligned with the ruler angle
                        var isHeadingAlignedWithRuler = Utils.AreHeadingsAligned(heading, ruler.RotationAngle(), 30);
                        ruler._rotateStartPointPointerType = isHeadingAlignedWithRuler ? "{P1}" : "{P2}";
                        ruler._rotateEndPointPointerType = isHeadingAlignedWithRuler ? "{P2}" : "{P1}";

                        var startPointOnLine = Utils.GetClosestPointOnLine(isHeadingAlignedWithRuler ? point1 : point2, centerLineStartPoint, centerLineEndPoint);
                        var endPointOnLine = Utils.GetClosestPointOnLine(isHeadingAlignedWithRuler ? point2 : point1, centerLineStartPoint, centerLineEndPoint);

                        startPointXOffsetToCenterLine = startPointOnLine.x - (isHeadingAlignedWithRuler ? point1 : point2).x;
                        startPointYOffsetToCenterLine = startPointOnLine.y - (isHeadingAlignedWithRuler ? point1 : point2).y;
                        endPointXOffsetToCenterLine = endPointOnLine.x - (isHeadingAlignedWithRuler ? point2 : point1).x;
                        endPointYOffsetToCenterLine = endPointOnLine.y - (isHeadingAlignedWithRuler ? point2 : point1).y;
                        centerPointRatio = Utils.GetDistanceBetweenPoints(startPointOnLine, ruler.CenterPoint()) / Utils.GetDistanceBetweenPoints(startPointOnLine, endPointOnLine);

                        if (((startPointOnLine.x > ruler.CenterPoint().x) && (endPointOnLine.x > ruler.CenterPoint().x)) ||
                            ((startPointOnLine.x < ruler.CenterPoint().x) && (endPointOnLine.x < ruler.CenterPoint().x)))
                        {
                            // We could support this but it would add complexity, so for simplicity we simply disallow it
                            this.Cancel("Center-point of ruler must fall between touch points");
                            return;
                        }

                        if (ruler._isResizable)
                        {
                            // If the ruler is touched close to its ends then we resize (instead of move/rotate) the ruler
                            ruler._rulerResizeInProgress = (Utils.GetDistanceBetweenPoints(startPointOnLine, centerLineStartPoint) < (centerLineLength * ruler.RULER_ENDS_TARGET_REGION_WIDTH_RATIO)) &&
                                                           (Utils.GetDistanceBetweenPoints(endPointOnLine, centerLineEndPoint) < (centerLineLength * ruler.RULER_ENDS_TARGET_REGION_WIDTH_RATIO));
                            ruler._rulerResizeStartDistance = this.GetDistance("{P1}", "{P2}");
                            ruler._rulerResizeStartWidth = ruler.Width();
                        }

                        this.OnMoveHandler(onRulerRotateAndMove);
                    })
                    .GestureEndedHandler(function ()
                    {
                        ruler._rotateStartPointPointerType = null;
                        ruler._rotateEndPointPointerType = null;
                    });

                this._defaultTapGesture = MIL.BuiltInGestures.Tap("DefaultRulerTap", ruler._outlinePath, "touch", function ()
                {
                    var currentAngle = ruler.RotationAngle();
                    ruler.RotationAngle(currentAngle + (90 - (currentAngle % 90)));

                    /*
                    // DEBUG!
                    var targetPoint = this.GetStartSvgPoint("pen");
                    var line = ruler.GetFaceEdgeLine();
                    var pointOnLine = Utils.GetClosestPointOnLine(targetPoint, line[0], line[1]); 
                    Utils.DebugDrawPoints(ruler._gDomElement, [pointOnLine], 5);
                    */
                }, 120, 5).Conditional(function () { return (MIL.Utils.IsKeyPressed(MIL.Utils.Keys.CTRL)); });

                // Note: We always add this gesture - even if _toolbarItemCount is 0 - because _toolbarItemCount can be changed at any time
                this._defaultToolbarTapGesture = MIL.BuiltInGestures.Tap("DefaultRulerToolbarTap", ruler._toolbarPath, "any", function ()
                {
                    // Determine which toolbar item was tapped
                    var tapPoint = this.GetStartSvgPoint("{P1}");
                    var line = ruler.GetFaceEdgeLine();
                    var lineStartPoint = line[0], lineEndPoint = line[1];
                    var pointOnLine = Utils.GetClosestPointOnLine(tapPoint, lineStartPoint, lineEndPoint);
                    var pointOffset = Utils.GetDistanceBetweenPoints(lineStartPoint, pointOnLine);

                    // Utils.DebugDrawPoints(ruler._gDomElement, [{ x: lineStartPoint.x + pointOffset, y: pointOnLine.y }], 5);

                    // Note: ruler._toolbarWidth already accounts for zooming
                    var scaleFactor = ruler._keepConstantScale ? getSvgInfo(ruler._gDomElement).zoomLevel : 1;
                    var toolbarStartOffset = (((ruler._width / scaleFactor) - ruler._toolbarWidth) / 2);
                    var toolbarItemWidth = (ruler.TOOLBAR_ITEM_WIDTH / scaleFactor);
                    var toolbarItemNumber = Math.floor((pointOffset - toolbarStartOffset) / toolbarItemWidth);

                    ruler.SelectedToolbarItemNumber(toolbarItemNumber);
                }, 200, 5).RecognitionTimeoutInMs(0).AllowEventPropagation(false);

                MIL.AddGesture(this._defaultMoveGesture);
                MIL.AddGesture(this._defaultRotateAndMoveGesture);
                MIL.AddGesture(this._defaultTapGesture);
                MIL.AddGesture(this._defaultToolbarTapGesture);
            }

            function ruler_onRulerMove(e, ruler, initialXOffsetToCenterLine, initialYOffsetToCenterLine)
            {
                // The _defaultRotateAndMoveGesture rule (if active) also handles moving the ruler
                if (ruler._defaultRotateAndMoveGesture.IsActive())
                {
                    return;
                }

                var gesture = ruler._defaultMoveGesture;
                var newMovePoint = gesture.GetCurrentSvgPoint("{P1}");

                // If the ruler is touched in either the first or last 20% then we rotate (instead of move) the ruler
                if (ruler._oneTouchRotationInProgress)
                {
                    // To prevent the ruler's rotation from making a sudden "jump" to the rotation based on the heading from the
                    // center-point to the initial touch-point, we adjust the touch-point to as if it had occurred on the centerline
                    var adjustedMovePoint = { x: newMovePoint.x + initialXOffsetToCenterLine, y: newMovePoint.y + initialYOffsetToCenterLine };
                    var heading = Utils.GetHeadingFromPoints(ruler.CenterPoint(), adjustedMovePoint);
                    // To prevent the ruler from doing a 180-degree "flip" (based on the the heading computed
                    // from the touch point) we check that the heading is aligned with the ruler angle
                    var isHeadingAlignedWithRuler = Utils.AreHeadingsAligned(heading, ruler.RotationAngle(), 30);

                    if (!isHeadingAlignedWithRuler)
                    {
                        heading = Utils.GetHeadingFromPoints(adjustedMovePoint, ruler.CenterPoint());
                    }
                    ruler.RotationAngle(heading);
                }
                else
                {
                    // The normal move case
                    var deltaX = newMovePoint.x - ruler._prevMovePoint.x;
                    var deltaY = newMovePoint.y - ruler._prevMovePoint.y;
                    var newCenterPoint = { x: ruler.CenterPoint().x + deltaX, y: ruler.CenterPoint().y + deltaY };

                    ruler.CenterPoint(newCenterPoint);
                    ruler._prevMovePoint = newMovePoint;
                }
            }

            function ruler_onRulerRotateAndMove(e, ruler, startPointXOffsetToCenterLine, startPointYOffsetToCenterLine, endPointXOffsetToCenterLine, endPointYOffsetToCenterLine, centerPointRatio)
            {
                var gesture = ruler._defaultRotateAndMoveGesture;

                if (ruler._rulerResizeInProgress)
                {
                    var distance = gesture.GetDistance("{P1}", "{P2}");
                    var newWidth = (distance / ruler._rulerResizeStartDistance) * ruler._rulerResizeStartWidth;
                    ruler.Width(newWidth);
                }
                else
                {
                    // To prevent the ruler's rotation from making a sudden "jump" to the rotation based on the heading between
                    // the start/end touch-points, we adjust the touch-points to as if they had occurred on the centerline

                    var startPoint = gesture.GetCurrentSvgPoint(ruler._rotateStartPointPointerType);
                    startPoint.x += startPointXOffsetToCenterLine;
                    startPoint.y += startPointYOffsetToCenterLine;

                    var endPoint = gesture.GetCurrentSvgPoint(ruler._rotateEndPointPointerType);
                    endPoint.x += endPointXOffsetToCenterLine;
                    endPoint.y += endPointYOffsetToCenterLine;

                    // To prevent the ruler's position from making a sudden "jump" to a centerpoint based on the exact mid-point between
                    // the start/end touch points, we adjust the mid-point by the center-offset ratio determined during the initial contact
                    var angle = Utils.GetHeadingFromPoints(startPoint, endPoint);
                    var centerPoint = {
                        x: startPoint.x + ((endPoint.x - startPoint.x) * centerPointRatio),
                        y: startPoint.y + ((endPoint.y - startPoint.y) * centerPointRatio)
                    };

                    ruler.BeginUpdate().RotationAngle(angle).CenterPoint(centerPoint).EndUpdate();

                    // We do this so that the "move" gesture (which suspends itself while "rotateAndMove" is active) can resume smoothly
                    // (ie. when one finger is lifted [so "rotateAndMove" ends] but one finger remains [so "move" is still active])
                    ruler._prevMovePoint = gesture.GetCurrentSvgPoint("{P1}");
                }
            }
            // ruler "class" [END] 
           
            exports.Ruler = Ruler;
            exports.Frame = Frame;
            exports.IsControl = IsControl;
        }));

    // A sub-module (namespace) for gesture defaults
    (function MILGestureDefaultsInit(factory)
    {
        factory(exports.GestureDefaults = exports.GestureDefaults || {});
    }
    (function MILGestureDefaultsFactory(exports)
    {
        var _defaults =
        {
            targetDomElement: null,
            startedHandler: null,
            endedHandler: null,
            cancelledHandler: null,
            groupName: "default",
            recognitionTimeoutInMs: 0,
            _parentObj: exports // So that getOrSetProperty() can return the object that "owns" _defaults
        };

        // Public
        function Reset()
        {
            _defaults.targetDomElement = null;
            _defaults.startedHandler = null;
            _defaults.endedHandler = null;
            _defaults.cancelledHandler = null;
            _defaults.groupName = "default";
            _defaults.recognitionTimeoutInMs = 0;
            return (this);
        }

        // Public
        function Target(element)
        {
            if (element === undefined)
            {
                return (_defaults.targetDomElement);
            }
            else
            {
                var targetDomElement = Utils.GetDomElement(element);

                if (!document.body.contains(targetDomElement))
                {
                    throw "The specified targetDomElement does not exist in the document body";
                }

                tagWithTargetElementID(targetDomElement);
                _defaults.targetDomElement = targetDomElement;
                return (this);
            }
        }

        // Public
        function StartedHandler(handler)
        {
            return (getOrSetProperty(_defaults, "startedHandler", handler));
        }

        // Public
        function EndedHandler(handler)
        {
            return (getOrSetProperty(_defaults, "endedHandler", handler));
        }

        // Public
        function CancelledHandler(handler)
        {
            return (getOrSetProperty(_defaults, "cancelledHandler", handler));
        }

        // Public
        function RecognitionTimeoutInMs(timeout)
        {
            return (getOrSetProperty(_defaults, "recognitionTimeoutInMs", timeout));
        }

        // Public
        function GroupName(name)
        {
            return (getOrSetProperty(_defaults, "groupName", name));
        }

        // These are the "public" members of the 'MIL.GestureDefaults' module
        exports.Reset = Reset;
        exports.Target = Target;
        exports.StartedHandler = StartedHandler;
        exports.EndedHandler = EndedHandler;
        exports.CancelledHandler = CancelledHandler;
        exports.GroupName = GroupName;
        exports.RecognitionTimeoutInMs = RecognitionTimeoutInMs;
    }));

    // A sub-module (namespace) for BuiltInGestures [which creates "pre-built" gestures]
    (function MILBuiltInGesturesInit(factory)
    {
        factory(exports.BuiltInGestures = exports.BuiltInGestures || {});
    }
    (function MILBuiltInGesturesFactory(exports)
    {
        // Public
        function Tap(gestureName, targetElement, pointerType, onTap, completionTimeoutInMs, maximumDistanceInPx)
        {
            completionTimeoutInMs = completionTimeoutInMs || 150;
            maximumDistanceInPx = maximumDistanceInPx || 5;
            gestureName = ensureNameCanBeMadeUnique(gestureName);

            var tapStartPoint = null;

            var tapGesture = MIL.CreateGesture(gestureName, true)
                .Target(targetElement)
                .PointerType(pointerType)
                .CompletionTimeoutInMs(completionTimeoutInMs) // If the gesture does not end before this timeout, the gesture will be cancelled
                .GestureStartedHandler(function ()
                {
                    tapStartPoint = this.GetCurrentScreenPoint("{P1}");
                })
                .GestureEndedHandler(function ()
                {
                    var distanceInPixels = Utils.GetDistanceBetweenPoints(tapStartPoint, this.GetCurrentScreenPoint("{P1}"));

                    if (distanceInPixels < maximumDistanceInPx)
                    {
                        if (onTap)
                        {
                            onTap.call(this);
                        }
                    }
                    else
                    {
                        log("Tap gesture '" + this.Name() + "' failed (reason: the pointer moved more [" + distanceInPixels.toFixed(2) + "px] than the maximum specified [" + maximumDistanceInPx + "px])");
                    }
                });

            return (tapGesture);
        }

        // Public [cometTailClassName, shapeNameList and targetWidth/Height are optional]
        // Note: Providing a shapeNameList helps reduce false-positives (misrecognitions).
        function ShapeRecognizer(gestureName, targetElement, pointerType, minPercentMatch, onShapeRecognized, cometTailClassName, shapeNameList, targetWidth, targetHeight)
        {
            gestureName = ensureNameCanBeMadeUnique(gestureName);

            if (shapeNameList)
            {
                shapeNameList.forEach(function (v, i) { if (RecognizableShapes[v] === undefined) { throw "shapeNameList[" + i + "] (" + v + ") is invalid"; } });
            }

            var shapeRecognitionGesture = MIL.CreateGesture(gestureName, true)
                .Target(targetElement)
                .PointerType(pointerType)
                .GestureStartedHandler(function ()
                {
                    this.Ink("{P1}").IsNonDrawing(true).CometTailClass(cometTailClassName).Start();
                })
                .GestureEndedHandler(function ()
                {
                    var gDomElement = MIL.DebugFeature(FeatureNames.ShapeRecognition) ? getSvgInfo(targetElement).gDomElement : undefined;
                    var shapeName = MIL.RecognizeShape(this.Ink().PathPoints(), minPercentMatch, targetWidth, targetHeight, gDomElement, shapeNameList);

                    if (onShapeRecognized)
                    {
                        onShapeRecognized.call(this, shapeName);
                    }
                });

            return (shapeRecognitionGesture);
        }

        // Public
        function RadialSwipe(gestureName, targetElement, pointerType, numRadialSegments, minDistance, onSwipe)
        {
            gestureName = ensureNameCanBeMadeUnique(gestureName);

            var radialSwipeGesture = MIL.CreateGesture(gestureName, true)
                .Target(targetElement)
                .PointerType(pointerType)
                .GestureStartedHandler(function ()
                {
                    this.Ink("{P1}").IsNonDrawing(true).Start();
                })
                .GestureEndedHandler(function ()
                {
                    var compassHeading = MIL.RecognizeRadialSwipe(this.Ink().PathPoints(), numRadialSegments, minDistance);

                    if (onSwipe)
                    {
                        onSwipe.call(this, compassHeading);
                    }
                });

            return (radialSwipeGesture);
        }

        // Public
        function CircularDial(gestureName, targetElement, pointerType, onAngleChanged)
        {
            gestureName = ensureNameCanBeMadeUnique(gestureName);

            var targetDomElement = Utils.GetDomElement(targetElement);

            var circularDialGesture = MIL.CreateGesture(gestureName, true)
                .Target(targetElement)
                .PointerType(pointerType)
                .GestureStartedHandler(function ()
                {
                    var gesture = this;
                    gesture.OnMoveHandler(function ()
                    {
                        var centroidPoint = Utils.GetCentroidPoint(gesture.Target());
                        var heading = Utils.GetHeadingFromPoints(centroidPoint, gesture.GetCurrentSvgPoint("{P1}"));

                        if (onAngleChanged)
                        {
                            onAngleChanged.call(gesture, heading);
                        }
                    });
                });

            return (circularDialGesture);
        }

        function ensureNameCanBeMadeUnique(gestureName)
        {
            if (gestureName[gestureName.length - 1] != "*")
            {
                gestureName += "*"; // The '*' will get replaced with a unique ID by CreateGesture()
            }
            return (gestureName);
        }

        exports.Tap = Tap;
        exports.ShapeRecognizer = ShapeRecognizer;
        exports.RadialSwipe = RadialSwipe;
        exports.CircularDial = CircularDial;
    }));


    var Utils = exports.Utils;
    var GestureDefaults = exports.GestureDefaults;

    // Public
    /**
     * @typedef {String} FeatureNames
     */
    /**
     * An "enum" for the names of features that can be provided to MIL.DebugFeature().
     * @type {FeatureNames}
     */
    var FeatureNames = Object.freeze(
    {
        // Note: Casing of property names and values must match
        MIL: "MIL",
        GestureRecognition: "GestureRecognition",
        ShapeRecognition: "ShapeRecognition",
        KeyboardHandler: "KeyboardHandler",
        Hover: "Hover"
    });

    // MIL can be initialized for multiple [peer, NOT nested] SVG elements on the same web page
    var _svgInfo = {}; // Key: MILID of SVG, Value: {svgDomElement, gDomElement, svgWidth, svgHeight, zoomLevel, panTop, panLeft, gSelection, settings, ruler, frame }

    var _gestures = []; // Array of Gesture objects; the order in which gestures are added affects how gestures get recognized (the first match is returned)
    var _gestureID = 1; // Used to create a unique gesture name when the name ends in '*'
    var _targetElementID = {}; // Key: ElementNodeName, Value: Count; used to create a unique __MILID__ value for a targetDomElement
    var _disabledGestureGroups = {}; // Key: groupName, Value: boolean

    var _activePointerDownEvents = {}; // Key: TargetElementID, Value = (Key: PointerID, Value: PointerDown event)
    var _activePointerDownStartTime = {}; // Key: TargetElementID, Value = Time (in MS) of the first PointerDown event [that's currently active]
    var _activePointerLatestMoveEvents = {}; // Key: TargetElementID, Value = (Key: PointerID, Value: PointerMove event)
    var _activePointerCaptures = {}; // Key: TargetElementID, Value = Array of PointerID; the elements upon which setPointerCapture() has been called for the PointerID
    var _activeHoverTimerInfo = {}; // Key: PointerID, Value: { timerID, targetDomElement, hoverMoveHandler }
    var _activeHoverEvents = {}; // Key: TargetElementID, Value: Value = (Key: PointerID, Value: PointerEnter event)
    var _activeHoverStartTime = {}; // Key: TargetElementID, Value = Time (in MS) of the first PointerEnter event [that's currently active]

    var _isAcquiringPointers = {}; // Key: TargetElementID, Value = Flag (boolean) set while we are acquiring pointers on the target [in the lead up to recognizing a combination of pointers that initiate a gesture]
    var _recognizeGestureTimerID = {}; // Key: TargetElementID, Value = The ID of the timer [if any] used to call recognizeGesture()
    var _gestureRecognitionRan = {}; // Key: TargetElementID, Value = Flag (boolean) set once recognizeGesture() has run [regardless of whether it finds a matching gesture or not]
    var _isAwaitingGestureCompletion = {}; // Key: TargetElementID, Value = Flag (boolean) set if we are waiting for a gesture to complete [ie. a PointerUp is received for one of its pointers]

    var _postponedPointerEvents = []; // The queue of pointerDown/Move/Up events that we postpone while we wait to see if a gesture recognition will succeed
    var _isDebugEnabled = [FeatureNames.MIL]; // Features that debugging has been enabled for
    var _inks = []; // All the Ink objects that have been created [via Gesture.Ink()]
    var _nextInkID = 1; // Used to assign ID's to Ink objects

    // For inking support
    var _inkCurrentPathPointData = {}; // Key: PointerID, Value: Array of points in current path
    var _inkCurrentPath = {}; // Key: PointerID, Value: Current path element
    var _inkCompletePathPointData = {}; // Key: PointerID, Value: Cumulative array of unique points in all paths
    var _inkLineGenerator = null; // d3 line generator

    function isAcquiringPointers()
    {
        for (var targetElementID in _isAcquiringPointers)
        {
            if (_isAcquiringPointers[targetElementID] === true)
            {
                return (true);
            }
        }
        return (false);
    }

    function isAwaitingGestureCompletion()
    {
        for (var targetElementID in _isAwaitingGestureCompletion)
        {
            if (_isAwaitingGestureCompletion[targetElementID] === true)
            {
                return (true);
            }
        }
        return (false);
    }

    // Note: d3 doesn't support pointer-events natively [because of sparse support in mobile browsers, particularly iOS/Safari]
    function addPointerEventListeners(domElement)
    {
        domElement.addEventListener("pointerdown", onPointerDown);
        domElement.addEventListener("pointerup", onPointerUp);
        domElement.addEventListener("pointermove", onPointerMove);
        domElement.addEventListener("pointerenter", onPointerEnter);
        domElement.addEventListener("pointerleave", onPointerLeave);
        domElement.addEventListener("pointercancel", onPointerCancel);
        domElement.addEventListener("contextmenu", onContextMenu);
    }

    function removePointerEventListeners(domElement)
    {
        domElement.removeEventListener("pointerdown", onPointerDown);
        domElement.removeEventListener("pointerup", onPointerUp);
        domElement.removeEventListener("pointermove", onPointerMove);
        domElement.removeEventListener("pointerenter", onPointerEnter);
        domElement.removeEventListener("pointerleave", onPointerLeave);
        domElement.removeEventListener("pointercancel", onPointerCancel);
        domElement.removeEventListener("contextmenu", onContextMenu);
    }

    // Public
    function Version()
    {
        return ("0.0.20180927.1"); // Major.Minor.Date.IntraDayRevision [Date = YYYYMMDD]
    }

    // Public
    /**
     * Initializes MIL for use with the specified SVG element. The returned 'g' element is automatically appended to svg.
     * @param {SVGSVGElement | Selection} svg The SVG element to enable for use with MIL. Can either be an SVG DOM element, or a d3 selection of that DOM element.
     * @returns {SVGGElement} The created SVG Group DOM element.
     */
    function Initialize(svg)
    {
        if (typeof (d3) == "undefined")
        {
            throw "MIL requires d3.js (v4): visit https://d3js.org/";
        }

        if (navigator.userAgent.indexOf("rv:11.0) like Gecko") == -1)
        {
            var isIERunningInCompatabilityMode = (navigator.userAgent.indexOf("Trident") != -1) && (navigator.userAgent.indexOf("MSIE") != -1);
            throw "MILJS.js requires IE11" + (isIERunningInCompatabilityMode ? " with 'Compatability View' disabled" : "");
        }

        var svgDomElement = Utils.GetDomElement(svg, SVGSVGElement);

        if (svgDomElement.ownerSVGElement != null)
        {
            // This would allow independent panning/zooming of the nested SVG, which is not currently supported 
            // [it would break the "linearity" of the original SVG's drawing surface]
            throw "Calling Initialize() on a nested SVG element is not allowed";
        }

        if (window.getComputedStyle(svgDomElement).touchAction != "none")
        {
            throw "When using MIL the target SVG element must have its 'touch-action' CSS property set to 'none' to turn off the browser's default touch gestures";
        }
        
        tagWithTargetElementID(svgDomElement);
        var svgID = getTargetElementID(svgDomElement);

        if (_svgInfo[svgID] === undefined)
        {
            var gDomElement = document.createElementNS("http://www.w3.org/2000/svg", "g");
            svgDomElement.appendChild(gDomElement);

            // Rather than wait for AddGesture() to be called (which is the normal way addPointerEventListeners() gets called)
            // we treat svgDomElement as a special case because we want our SVG handlers to be first in the invocation chain
            // (ie. called before any pointer-event handlers that the user may add to svgDomElement independently of MIL)
            addPointerEventListeners(svgDomElement);

            _svgInfo[svgID] =
            {
                svgDomElement: svgDomElement,
                gDomElement: gDomElement,
                svgWidth: svgDomElement.clientWidth, // In pixels
                svgHeight: svgDomElement.clientHeight, // In pixels
                zoomLevel: 1,
                panTop: 0, // In zoom-adjusted (scaled) pixels
                panLeft: 0, // In zoom-adjusted (scaled) pixels
                gSelection: d3.select(gDomElement),
                settings: new settings(),
                ruler: null,
                frame: null
            };
        }

        // Workaround for BUGBUG#1 [TODO: Revisit]
        //
        // There is an intermittent problem [pointerUp doesn't fire] which breaks our state management. It may - or may not - be related to pen pointerLeave events.
        //
        // Repro steps (does not consistently cause the problem, but will sooner or later):
        // 1) Create an ink-hull then drag it [with a touch] while the eraser-end of the pen is drifting in and out of hover range [generating multiple pointerEnter/Leave events as the pen wiggles].
        // 2) Stop dragging (or the dragging may even stop unexpectedly while dragging).
        // 3) Try to drag the hull again: the drag won't be detected since the active touch pointer count will be wrong (2 instead of just 1) and we'll get a pan instead:
        //
        //    11:54:37.789: MIL: Adding PointerID_touch_11272 [to path_2]
        //    11:54:37.789: MIL: Starting gesture recognition [after 0ms] on 'path_2'...
        //    11:54:37.789: MIL: Looking for gestures on path_2 that require pen:0+touch:1+mouse:0
        //    11:54:37.789: MIL: Skipping gesture 'HullTapWithPenEraser_#84' (reason: PointerType() does not match)
        //    11:54:37.790: MIL: Gesture 'HullDrag_#85' recognized
        //    11:54:37.790: App: Gesture 'HullDrag_#85' started
        //    11:54:37.794: MIL: DEBUG: SET pointer-capture for PointerID_touch_11272 (11272) on path_2
        //    11:54:37.795: MIL: Gesture recognition ended
        //    11:54:37.797: MIL: DEBUG: PointerLeave [PointerID_touch_11272 on svg_1]
        //    11:54:37.834: MIL: DEBUG: PointerLeave [PointerID_pen_11271 on svg_1]
        //    11:54:38.165: MIL: DEBUG: PointerLeave [PointerID_touch_11272 on path_2]
        //    11:54:38.165: MIL: DEBUG: PointerLeave [PointerID_touch_11272 on svg_1]
        //    11:54:38.768: MIL: DEBUG: PointerLeave [PointerID_pen_11273 on svg_1]
        //    11:54:38.783: MIL: DEBUG: PointerLeave [PointerID_pen_11274 on svg_1]
        //    11:54:38.799: MIL: DEBUG: PointerLeave [PointerID_pen_11275 on svg_1]
        //    11:54:38.846: MIL: DEBUG: PointerLeave [PointerID_pen_11276 on svg_1]
        //    11:54:38.859: MIL: DEBUG: PointerLeave [PointerID_pen_11277 on svg_1]
        //    11:54:38.993: MIL: DEBUG: PointerLeave [PointerID_pen_11278 on svg_1]
        //
        //    11:54:39.293: MIL: Adding PointerID_touch_11280 [to path_2]
        //    11:54:39.293: MIL: Starting gesture recognition [after 0ms] on 'path_2'...
        //    11:54:39.293: MIL: Looking for gestures on path_2 that require pen:0+touch:2+mouse:0
        //    11:54:39.293: MIL: Skipping gesture 'HullTapWithPenEraser_#84' (reason: PointerType() does not match)
        //    11:54:39.294: MIL: Skipping gesture 'HullDrag_#85' (reason: PointerType() does not match)
        //    11:54:39.294: MIL: No matching gesture found
        //    11:54:39.294: MIL: Gesture recognition ended
        //    11:54:39.294: MIL: Adding PointerID_touch_11280 [to svg_1]
        //    11:54:39.452: MIL: Starting gesture recognition [after 150ms] on 'svg_1'...
        //    11:54:39.454: MIL: Looking for gestures on svg_1 that require pen:0+touch:1+mouse:0
        //    11:54:39.454: MIL: Gesture 'Pan' recognized
        //
        // There is a related problem that demonstrates that the pen events are interfering with (preventing) touch events:
        // Drag the hull [with a touch] while the eraser-end of the pen is drifting in and out of hover range until the pen is outside (x or y) the SVG: at that point the hull will stop getting pointerMove events.
        const checkIntervalInMs = 200;
        setInterval(function eventWatchdog()
        {
            const normalMaxAgeInMs = (checkIntervalInMs / 2) + 50; // 150ms

            for (var targetElementID in _activePointerLatestMoveEvents)
            {
                for (var pointerID in _activePointerLatestMoveEvents[targetElementID])
                {
                    var e = _activePointerLatestMoveEvents[targetElementID][pointerID];
                    var now = Date.now(); // Just to make debugging easier
                    var isPointerCapturedByElement = _activePointerCaptures.hasOwnProperty(targetElementID) && (_activePointerCaptures[targetElementID].indexOf(pointerID) != 1);

                    // Pen and touch (but not mouse) pointer-move events get generated with high-frequency [after a pointer-down],
                    // so if the latest pointer-move event becomes "too old" it indicates that pointer events have stopped happening,
                    // which is BUGBUG#1 (a capturing element stops receiving pointer-events)

                    if (isPointerCapturedByElement && ((e.pointerType == "touch") || (e.pointerType == "pen")))
                    {
                        var moveEventAgeInMs = now - e.__MILTimeStamp__;

                        if (moveEventAgeInMs > (checkIntervalInMs + (normalMaxAgeInMs * 3))) // 650ms
                        {
                            log("Warning: BUGBUG#1 detected for " + pointerID + " on " + targetElementID + " [pointer is captured, but last pointerMove event age is " + moveEventAgeInMs + "ms]");
                            onPointerUp(e); // Try to recover
                        }
                    }
                }
            }
        }, checkIntervalInMs);

        return (_svgInfo[svgID].gDomElement);
    }

    function getSvgInfo(targetDomElement)
    {
        targetDomElement = Utils.GetDomElement(targetDomElement);

        var isRootSvg = (targetDomElement instanceof SVGSVGElement) && (targetDomElement.ownerSVGElement == null);
        var svgDomElement = isRootSvg ? targetDomElement : targetDomElement.ownerSVGElement;
        var svgID = getTargetElementID(svgDomElement);

        return (_svgInfo[svgID]);
    }

    // Public
    /**
     * Returns the MIL settings associated with the specified SVG.
     * @param {SVGSVGElement} svg The SVG element to find the MIL settings for.
     * @returns {settings} The associated MIL settings.
     */
    function Settings(svg)
    {
        var svgDomElement = Utils.GetDomElement(svg, SVGSVGElement);
        var svgInfo = getSvgInfo(svgDomElement);
        return (svgInfo.settings);
    }
    
    // Public 
    // [ignoreGestureDefaults is optional: setting it to 'true' allows us to more easily create "internal" gestures
    //  without having to call MIL.GestureDefaults.Reset(), which could be an unwanted side-effect for the user]
    function CreateGesture(name, ignoreGestureDefaults)
    {
        // If needed, make the name unique
        if (name[name.length - 1] == "*")
        {
            name = name.slice(0, name.length - 1) + "_#" + _gestureID++;
        }

        return (new Gesture(name, ignoreGestureDefaults));
    }

    // Public
    // Note: If multiple gestures have the same definition (target/pointerType/conditional), the one which was created first will be the one that gets recognized
    function AddGesture(gesture)
    {
        var svgInfo = getSvgInfo(gesture.Target());

        if (!svgInfo)
        {
            throw "Call MIL.Initialize() prior to calling AddGesture()";
        }

        if (!(gesture instanceof Gesture))
        {
            throw "The supplied 'gesture' parameter must be of type Gesture";
        }

        // A gesture that uses multiple pointers must have a non-zero recognition timeout [because the pointers will make contact at slightly different times]
        var pointerCount = gesture.PointerCount();
        if ((gesture.RecognitionTimeoutInMs() == 0) && (pointerCount > 1))
        {
            throw "Gesture '" + gesture.Name() + "' uses " + pointerCount + " pointers so must specify a non-zero RecognitionTimeoutInMs()";
        }

        var name = gesture.Name();
        var targetDomElement = gesture.Target();

        if (MIL.GetGestureByName(name) != null)
        {
            throw "A gesture named '" + name + "' already exists; consider adding '*' to the end of the name to automatically make it unique";
        }

        if (!targetDomElement)
        {
            // Because we use the target to determine if we should call addPointerEventListeners() [see below]
            throw "Gesture '" + name + "' must specify a Target() before it can be added";
        }

        if (!gesture.PointerType())
        {
            // A gesture can never be recognized without this
            throw "Gesture '" + name + "' must specify a PointerType() before it can be added";
        }

        // If this is the first gesture to use gesture.Target() then add the pointer-event listeners to the target
        if ((targetDomElement != svgInfo.svgDomElement) && // MIL.Initialize() will already have done this
            (getGestureCountByTarget(targetDomElement) == 0))
        {
            addPointerEventListeners(targetDomElement);
        }

        _gestures.push(gesture);
        return (gesture);
    }

    // Public
    function GetGestureByName(name)
    {
        for (var g = 0; g < _gestures.length; g++)
        {
            if (_gestures[g].Name() == name)
            {
                return (_gestures[g]);
            }
        }
        return (null);
    }

    // Public [gestureNamePrefix is optional]
    function GetGestureFromEvent(e, gestureNamePrefix)
    {
        var pointerID = makePointerID(e);

        for (var g = 0; g < _gestures.length; g++)
        {
            var gesture = _gestures[g];

            if ((gesture.ActivePointerList().indexOf(pointerID) != -1) && ((gestureNamePrefix === undefined) || (gesture.Name().indexOf(gestureNamePrefix) == 0)))
            {
                return (gesture);
            }
        }
        return (null);
    }

    // Public
    function RemoveGestureByName(name)
    {
        for (var g = 0; g < _gestures.length; g++)
        {
            var gesture = _gestures[g];

            if (gesture.Name() == name)
            {
                removeGestureAtIndex(g);
                // No need to keep looking since gesture names are unique
                break;
            }
        }
    }

    function removeGestureAtIndex(index)
    {
        if (index < _gestures.length)
        {
            var gesture = _gestures[index];
            var targetDomElement = gesture.Target();

            _gestures.splice(index, 1);

            // If this was the last gesture to use gesture.Target() then remove the pointer-event listeners from the target
            if (getGestureCountByTarget(targetDomElement) == 0)
            {
                removePointerEventListeners(targetDomElement);
            }
        }
    }

    // Public [gestureName is optional]
    function RemoveGesturesByTarget(targetDomElement, gestureName)
    {
        targetDomElement = Utils.GetDomElement(targetDomElement);

        for (var g = _gestures.length - 1; g >= 0; g--)
        {
            var gesture = _gestures[g];
            var name = gesture.Name();

            if (gesture.Target() == targetDomElement)
            {
                if ((gestureName === undefined) || (name.indexOf(gestureName) == 0))
                {
                    removeGestureAtIndex(g);
                    // Note that we keeps looking for additional gestures on the targetDomElement
                }
            }
        }
    }

    // Public
    function GetGesturesByTarget(targetDomElement)
    {
        var gestureList = [];

        for (var g = 0; g < _gestures.length; g++)
        {
            if (_gestures[g].Target() == targetDomElement)
            {
                gestureList.push(_gestures[g]);
            }
        }

        return (gestureList);
    }

    function getGestureCountByTarget(targetDomElement)
    {
        var gestureCountForTarget = 0;

        for (var g = 0; g < _gestures.length; g++)
        {
            if (_gestures[g].Target() == targetDomElement)
            {
                gestureCountForTarget++;
            }
        }

        return (gestureCountForTarget);
    }

    // Public
    function EnableGestureGroup(groupName, enable)
    {
        if (enable)
        {
            if (_disabledGestureGroups[groupName] !== undefined)
            {
                delete _disabledGestureGroups[groupName];
            }
        }
        else
        {
            _disabledGestureGroups[groupName] = true; // The value isn't actually used, it's the presence of the key that indicates that the group is disabled
        }

        log("Gestures in group '" + groupName + "' were " + (enable ? "enabled" : "disabled"));
    }

    function isGestureGroupEnabled(groupName)
    {
        return (_disabledGestureGroups[groupName] === undefined);
    }

    // Public
    // There is only ever one pen, so this is a global function
    // Note: Sometimes [on a Surface Studio] the pen pressure calibration seems to get out of whack (readings are way too high for light pressure); 
    //       this can sometimes be resolved by briefly removing/re-seating the AAAA battery in the pen
    function PenPressure(targetDomElement)
    {
        targetDomElement = Utils.GetDomElement(targetDomElement);

        var e = getLatestPointerMoveEvent("pen", targetDomElement);
        return (e == null ? null : e.pressure);
    }

    // Public
    // There is only ever one pen, so this is a global function
    function PenButtons(targetDomElement)
    {
        targetDomElement = Utils.GetDomElement(targetDomElement);

        var e = getLatestPointerMoveEvent("pen", targetDomElement);
        return (e == null ? null : e.buttons);
    }

    // Public
    // An "enum" for the possible pen buttons [see http://www.w3.org/TR/pointerevents2/]
    var PenButton = Object.freeze(
    {
        NoneHover: 0, // Pen moved while hovering with no buttons pressed
        None:      1, // aka. "Contact": Not really a button (this is just the default value when the pen makes contact)
        Barrel:    2,
        Eraser:    32
    });

    // Public
    // Transposes the clientX/Y of the supplied Pointer Event into the coordinate space of the specified svg 'g' element [which may have been transformed].
    // Returns the new point as an object with x/y members.
    function TransposePointer(e, g)
    {
        // Note: e.clientX/Y are relative to [the top-left (0,0)] of the document window
        var pointInGSpace = TransposeScreenPoint({ x: e.clientX, y: e.clientY }, g);
        return (pointInGSpace); // With no zooming, this point will be the same as { x: e.clientX, y: e.clientY } [assuming the svg is at 0,0 in the document]
    }

    // Public
    // Transposes the supplied screen-point into the coordinate space of the svg 'g' element [which may have been transformed] to which targetDomElement belongs.
    // Returns the new point as an object with x/y members.
    function TransposeScreenPoint(screenPoint, targetDomElement)
    {
        var gDomElement = null;

        if (targetDomElement instanceof SVGGElement)
        {
            gDomElement = targetDomElement;
        }
        else
        {
            var svgInfo = getSvgInfo(targetDomElement);
            gDomElement = svgInfo.gDomElement;
        }

        var svgDomElement = gDomElement.ownerSVGElement;
        var svgPoint = svgDomElement.createSVGPoint();

        svgPoint.x = screenPoint.x;
        svgPoint.y = screenPoint.y;
        svgPoint = svgPoint.matrixTransform(gDomElement.getScreenCTM().inverse());
        var pointInGSpace = { x: svgPoint.x, y: svgPoint.y };

        return (pointInGSpace); // With no zooming, this point will be the same as { x: screenPoint.x, y: screenPoint.y } [assuming the svg is at 0,0 in the document]
    }

    // Public
    function Zoom(svgDomElement, level, focalScreenPoint)
    {
        var svgInfo = getSvgInfo(svgDomElement);
        var settings = svgInfo.settings;
        var ruler = svgInfo.ruler;

        if (level === undefined)
        {
            return (svgInfo.zoomLevel);
        }
        else
        {
            if (level != svgInfo.zoomLevel)
            {
                var prevZoomLevel = svgInfo.zoomLevel;
                var newZoomLevel = svgInfo.zoomLevel = Math.min(settings.MaxZoomLevel(), Math.max(settings.MinZoomLevel(), level));

                if (ruler && ruler.IsVisible())
                {
                    // To re-scale (if KeepConstantScale() is true) and/or to update the displayed zoom-level
                    ruler.Redraw();
                }

                if (focalScreenPoint === undefined)
                {
                    // Use the center of the svg
                    var svgRect = svgInfo.svgDomElement.getBoundingClientRect();
                    focalScreenPoint = { x: svgRect.left + (svgRect.width / 2), y: svgRect.top + (svgRect.height / 2) };
                }

                zoomAtPoint(svgInfo, focalScreenPoint, prevZoomLevel, newZoomLevel);
            }
            return (this);
        }
    }

    // Public
    function Pan(svgDomElement)
    {
        var svgInfo = getSvgInfo(svgDomElement);
        return ({ left: svgInfo.panLeft, top: svgInfo.panTop });
    }

    // Public
    function PanRelative(svgDomElement, deltaXInPixels, deltaYInPixels)
    {
        var svgInfo = getSvgInfo(svgDomElement);
        pan(svgInfo, deltaXInPixels, deltaYInPixels, false);
        return (this);
    }

    // Public
    function PanAbsolute(svgDomElement, absoluteX, absoluteY)
    {
        var svgInfo = getSvgInfo(svgDomElement);
        pan(svgInfo, absoluteX, absoluteY, true);
        return (this);
    }

    function getPanZoomMatrix(svgInfo)
    {
        var svg = svgInfo.svgDomElement;
        var g = svgInfo.gDomElement;
        var transformList = g.transform.baseVal;

        if (transformList.numberOfItems == 0)
        {
            // No panning/zooming so far
            var emptyMatrixTransform = svg.createSVGTransformFromMatrix(svg.createSVGMatrix());
            transformList.appendItem(emptyMatrixTransform);
        }
        else 
        {
            if (transformList.getItem(0).type != SVGTransform.SVG_TRANSFORM_MATRIX)
            {
                throw "The first transform of the root SVGGElement of '" + getTargetElementID(svg) + "' was expected to be a of type " + SVGTransform.SVG_TRANSFORM_MATRIX + " (matrix), but it is of type " + transformList.getItem(0).type;
            }
        }

        var matrix = transformList.getItem(0).matrix;

        return (matrix);
    }

    function zoomAtPoint(svgInfo, focalScreenPoint, prevZoomLevel, newZoomLevel)
    {
        var svg = svgInfo.svgDomElement;
        var settings = svgInfo.settings;
        var transformList = svgInfo.gDomElement.transform.baseVal;
        var matrix = getPanZoomMatrix(svgInfo);
        var absolutePoint = MIL.TransposeScreenPoint(focalScreenPoint, svgInfo.gDomElement);
        var offsetX = absolutePoint.x;
        var offsetY = absolutePoint.y;
        var zoomFactor = newZoomLevel / prevZoomLevel; // Factor representing the relative CHANGE in zoomLevel

        // Note: These matrix multiplications are performed in right-to-left order (just like the "transform" attribute)
        var modifierMatrix = svg.createSVGMatrix().translate(offsetX, offsetY).scale(zoomFactor).translate(-offsetX, -offsetY);
        var newMatrix = matrix.multiply(modifierMatrix);

        transformList.getItem(0).setMatrix(newMatrix);

        // Sanity check that our matrix math hasn't scaled beyond the user-specified zoom limits
        // Note: Over time the repeated matrix multiplications adds some floating point imprecision, so we only check using the first 5 decimal places
        var actualScale = +newMatrix.a.toFixed(5);
        if ((actualScale < settings.MinZoomLevel) || (actualScale > settings.MaxZoomLevel))
        {
            throw "The current zoom transformation (" + actualScale + ") has exceeded the defined Min/MaxZoomLevel";
        }

        // Prevent the implicit pan that arises from the zoom from panning outside the "panable" area
        enforcePanLimits(svgInfo);
    }

    function pan(svgInfo, deltaXInPixels, deltaYInPixels, isAbsoluteValues)
    {
        var transformList = svgInfo.gDomElement.transform.baseVal;
        var matrix = getPanZoomMatrix(svgInfo);

        if (isAbsoluteValues)
        {
            if ((deltaXInPixels == matrix.e) && (deltaYInPixels == matrix.f))
            {
                return;
            }

            matrix.e = deltaXInPixels;
            matrix.f = deltaYInPixels;
        }
        else
        {
            if ((deltaXInPixels == 0) && (deltaYInPixels == 0))
            {
                return;
            }

            matrix.e += deltaXInPixels;
            matrix.f += deltaYInPixels;
        }

        transformList.getItem(0).setMatrix(matrix);

        enforcePanLimits(svgInfo);
    }

    function enforcePanLimits(svgInfo)
    {
        // Ensure we don't pan outside the "panable" (viewable) area.
        // Note: Our approach is to check if the screen-point at either the top-left or bottom-right of the svg is now outside
        //       the panable area, and if so make a compensating translation. But there's probably a simpler way to do this.
        var svg = svgInfo.svgDomElement;
        var svgRect = svg.getBoundingClientRect();
        var transformList = svgInfo.gDomElement.transform.baseVal;
        var matrix = getPanZoomMatrix(svgInfo);

        var upperLeftScreenPoint = { x: svgRect.left, y: svgRect.top };
        var lowerRightScreenPoint = { x: svgRect.right, y: svgRect.bottom };
        var upperLeftAbsolutePoint = MIL.TransposeScreenPoint(upperLeftScreenPoint, svgInfo.gDomElement);
        var lowerRightAbsolutePoint = MIL.TransposeScreenPoint(lowerRightScreenPoint, svgInfo.gDomElement);
        var top = upperLeftAbsolutePoint.y;
        var left = upperLeftAbsolutePoint.x;
        var bottom = lowerRightAbsolutePoint.y;
        var right = lowerRightAbsolutePoint.x;

        var minZoomLevel = svgInfo.settings.MinZoomLevel();
        var panableWidth = svgInfo.svgWidth / minZoomLevel;
        var panableHeight = svgInfo.svgHeight / minZoomLevel;
        var rangeX = (panableWidth - svgInfo.svgWidth) / 2;
        var rangeY = (panableHeight - svgInfo.svgHeight) / 2;

        if (left < -rangeX)
        {
            var adjustmentX = left - (-rangeX);
            matrix.e += adjustmentX * svgInfo.zoomLevel;
            transformList.getItem(0).setMatrix(matrix);
        }
        if (top < -rangeY)
        {
            var adjustmentY = top - (-rangeY);
            matrix.f += adjustmentY * svgInfo.zoomLevel;
            transformList.getItem(0).setMatrix(matrix);
        }
        if (right > (svgInfo.svgWidth + rangeX))
        {
            var adjustmentX = right - (svgInfo.svgWidth + rangeX);
            matrix.e += adjustmentX * svgInfo.zoomLevel;
            transformList.getItem(0).setMatrix(matrix);
        }
        if (bottom > (svgInfo.svgHeight + rangeY))
        {
            var adjustmentY = bottom - (svgInfo.svgHeight + rangeY);
            matrix.f += adjustmentY * svgInfo.zoomLevel;
            transformList.getItem(0).setMatrix(matrix);
        }

        svgInfo.panLeft = matrix.e;
        svgInfo.panTop = matrix.f;
    }

    // Public
    function IsPropagatedEvent(e)
    {
        return ((e.__MILRedispatchedToParent__ !== undefined) || (e.__MILRedispatchedToSvg__ !== undefined));
    }

    function translateHullPath(hullPath, deltaX, deltaY, useTransform)
    {
        if (useTransform === true)
        {
            // Note: Updating the transform is MUCH faster than doing a "manual" translation of the "d" attribute
            //       but it doesn't update ink._combinedOutlinePathPoints
            translateWithTransform(hullPath, deltaX, deltaY);
        }
        else
        {
            var hullPathDomElement = Utils.GetDomElement(hullPath, SVGPathElement);
            var values = hullPathDomElement.getAttribute("d").split(" ");
            var hullPathData = "";
            var ink = MIL.GetInkByElement(hullPath);
            var translatedOutlinePathPoints = [];

            // Undo any existing transform translation [created when useTransform is 'true']
            hullPath.attr("transform", null);

            for (var i = 0; i < values.length; i++)
            {
                if (isNaN(values[i]))
                {
                    // M or L
                    hullPathData += values[i];
                }
                else
                {
                    // x y
                    var translatedX = +values[i] + deltaX;
                    var translatedY = +values[++i] + deltaY;
                    hullPathData += translatedX + " " + translatedY;

                    if (ink.IsCombined())
                    {
                        translatedOutlinePathPoints.push({ x: translatedX, y: translatedY });
                    }
                }
            }

            hullPathDomElement.setAttribute("d", hullPathData);

            if (ink.IsCombined())
            {
                ink._combinedOutlinePathPoints = translatedOutlinePathPoints;
            }
        }
    }

    function translateInkPath(inkPath, deltaX, deltaY, useTransform)
    {
        if (useTransform === true)
        {
            // Note: Updating the transform is MUCH faster than doing a "manual" translation followed by
            //       calling _inkLineGenerator(), but it doesn't update __MILPathPointsCollection__
            translateWithTransform(inkPath, deltaX, deltaY);
        }
        else
        {
            var pathPointsCollection = inkPath.node().__MILPathPointsCollection__;
            var translatedPathPointsCollection = [];
            var d = "";
            var isClosed = (inkPath.attr("d")[inkPath.attr("d").length - 1] == "Z");

            // Undo any existing transform translation [created when useTransform is 'true']
            inkPath.attr("transform", null);

            for (var l = 0; l < pathPointsCollection.length; l++)
            {
                var pathData = pathPointsCollection[l];
                var translatedPathPoints = [];

                for (var i = 0; i < pathData.length; i++)
                {
                    var translatedX = pathData[i].x + deltaX;
                    var translatedY = pathData[i].y + deltaY;

                    translatedPathPoints.push({ x: translatedX, y: translatedY });
                }

                translatedPathPointsCollection.push(translatedPathPoints);
                d += _inkLineGenerator(translatedPathPoints);
            }

            inkPath.attr("d", d + (isClosed ? "Z" : ""));
            inkPath.node().__MILPathPointsCollection__ = translatedPathPointsCollection;
        }
    }

    // TODO: There may be a better way to do this [eg. https://mikewilliamson.wordpress.com/2013/08/27/matrix-transforms-in-svg/]
    function translateWithTransform(element, deltaX, deltaY)
    {
        var transform = element.attr("transform");
        if (transform)
        {
            var xy = transform.replace("translate(", "").replace(")", "").split(" ");

            if (xy.length > 2)
            {
                throw "The 'transform' of the element contains more than just a 'translate()'";
            }

            var prevX = +xy[0];
            var prevY = (xy.length == 1) ? 0 : +xy[1];

            deltaX += prevX;
            deltaY += prevY;
        }
        element.attr("transform", "translate(" + deltaX + " " + deltaY + ")");
    }

    function scaleInkPath(inkPath, oldScale, newScale, startStrokeWidth, useTransform)
    {
        if (useTransform)
        {
            // Note: Updating the transform is faster than doing a "manual" scale followed by
            //       calling _inkLineGenerator(), but it doesn't update __MILPathPointsCollection__
            var pathDomElement = inkPath.node();
            var zoomFocalPoint = Utils.GetCentroidPoint(pathDomElement);
            var offsetX = zoomFocalPoint.x;
            var offsetY = zoomFocalPoint.y;
            var transformList = pathDomElement.transform.baseVal;
            var matrix = null; // Do NOT use pathDomElement.getCTM() since this will include the pan/zoom transform on the parent 'g' element
            var svg = getSvgInfo(pathDomElement).svgDomElement;
            var zoomFactor = newScale / oldScale; // Factor representing the relative CHANGE in scale

            if (transformList.numberOfItems == 0)
            {
                // The zoom is just starting, so there's no transform
                var emptyMatrixTransform = svg.createSVGTransformFromMatrix(svg.createSVGMatrix());
                transformList.appendItem(emptyMatrixTransform);
            }
            matrix = transformList.getItem(0).matrix;

            // Note: These matrix multiplications are performed in right-to-left order (just like the "transform" attribute)
            var modifierMatrix = svg.createSVGMatrix().translate(offsetX, offsetY).scale(zoomFactor).translate(-offsetX, -offsetY);
            var newMatrix = matrix.multiply(modifierMatrix);
            transformList.getItem(0).setMatrix(newMatrix);

            // Finally, adjust the stroke-width (which has also been scaled by the transform) to keep it constant
            // Note: pathDomElement.setAttribute("vector-effect", "non-scaling-stroke") doesn't work on IE11 (which implements SVG 1.1 that doesn't include vector-effect).
            // Note: We don't try to adjust stroke-dasharray (if set) because doing so causes performance issues (on IE11).
            var finalScale = newMatrix.a;
            var newStrokeWidth = startStrokeWidth / finalScale;
            inkPath.style("stroke-width", newStrokeWidth + "px");
        }
        else
        {
            var scaleDelta = (newScale - oldScale) / oldScale;
            var pathPointsCollection = inkPath.node().__MILPathPointsCollection__;
            var scaledPathPointsCollection = [];
            var allPoints = [];
            var d = "";
            var isClosed = (inkPath.attr("d")[inkPath.attr("d").length - 1] == "Z");

            // Undo the existing scale transform [added when useTransform is 'true']
            // [the following will result in inkPath.node().transform.baseVal.numberOfItems becoming 0]
            inkPath.node().setAttribute("transform", null);

            for (var c = 0; c < pathPointsCollection.length; c++)
            {
                allPoints = allPoints.concat(pathPointsCollection[c]);
            }

            var boundingRect = Utils.GetBoundingRectForPoints(allPoints);

            for (var l = 0; l < pathPointsCollection.length; l++)
            {
                var pathData = pathPointsCollection[l];
                var scaledPathPoints = [];

                for (var i = 0; i < pathData.length; i++)
                {
                    // "Re-origin" the points to 0,0
                    var scaledX = pathData[i].x - boundingRect.x;
                    var scaledY = pathData[i].y - boundingRect.y;

                    // Now scale them
                    scaledX *= (1 + scaleDelta);
                    scaledY *= (1 + scaleDelta);

                    // Finally, move them back so that they stay centered on the bounding rect
                    scaledX += boundingRect.x - ((boundingRect.width * scaleDelta) / 2);
                    scaledY += boundingRect.y - ((boundingRect.height * scaleDelta) / 2);

                    scaledPathPoints.push({ x: scaledX, y: scaledY });
                }

                scaledPathPointsCollection.push(scaledPathPoints);
                d += _inkLineGenerator(scaledPathPoints);
            }

            inkPath.attr("d", d + (isClosed ? "Z" : ""));
            inkPath.node().__MILPathPointsCollection__ = scaledPathPointsCollection;

            // Finally, revert the stroke-width to its original value [after having adjusted it when useTransform is true]
            inkPath.style("stroke-width", startStrokeWidth + "px");
        }
    }

    function scaleHullPath(hullPath, scaleDelta)
    {
        var hullPathDomElement = Utils.GetDomElement(hullPath, SVGPathElement);
        var values = hullPathDomElement.getAttribute("d").split(" ");
        var hullPathData = "";
        var ink = MIL.GetInkByElement(hullPath);
        var scaledOutlinePathPoints = [];
        var boundingRect = hullPathDomElement.getBBox();

        for (var i = 0; i < values.length; i++)
        {
            if (isNaN(values[i]))
            {
                // M or L
                hullPathData += values[i];
            }
            else
            {
                // x y
                // "Re-origin" the points to 0,0
                var scaledX = +values[i] - boundingRect.x;
                var scaledY = +values[++i] - boundingRect.y;

                // Now scale them
                scaledX *= (1 + scaleDelta);
                scaledY *= (1 + scaleDelta);

                // Finally, move them back so that they stay centered on the bounding rect
                scaledX += boundingRect.x - ((boundingRect.width * scaleDelta) / 2);
                scaledY += boundingRect.y - ((boundingRect.height * scaleDelta) / 2);

                hullPathData += scaledX + " " + scaledY;

                if (ink.IsCombined())
                {
                    scaledOutlinePathPoints.push({ x: scaledX, y: scaledY });
                }
            }
        }
        hullPathDomElement.setAttribute("d", hullPathData);

        // Scale the hull stroke-width
        var strokeWidth = Utils.ToNumber(hullPath.style("stroke-width"));
        strokeWidth *= (1 + scaleDelta);
        hullPath.style("stroke-width", strokeWidth + "px");

        if (ink.IsCombined())
        {
            ink._combinedOutlinePathPoints = scaledOutlinePathPoints;
        }
    }

    // Public
    /**
     * Enables or disabled debug console messages for the specified MIL feature.
     * Note: All "general" logging (ie. that is NOT feature-specific) done by MIL can be turned off with this command: MIL.DebugFeature(MIL.FeatureNames.MIL, false);
     * @param {FeatureNames} featureName A MIL.FeatureNames value (MIL, GestureRecognition, InkHull, ShapeRecognition, KeyboardHandler).
     * @param {Boolean} enable Whether to turn debug messages on or off.
     */
    function DebugFeature(featureName, enable)
    {
        if (!FeatureNames.hasOwnProperty(featureName))
        {
            var validFeatureNames = [];
            for (var propName in FeatureNames)
            {
                validFeatureNames.push(propName);
            }
            throw "Invalid featureName '" + featureName + "'; valid values are: " + validFeatureNames.join(", ");
        }

        if (enable === undefined)
        {
            return (_isDebugEnabled.indexOf(featureName) != -1);
        }
        else
        {
            if (enable)
            {
                if (_isDebugEnabled.indexOf(featureName) == -1)
                {
                    _isDebugEnabled.push(featureName);
                }
            }
            else
            {
                var index = _isDebugEnabled.indexOf(featureName);
                if (index != -1)
                {
                    _isDebugEnabled.splice(index, 1);
                }
            }
        }
    }

    // Public
    function ShowDebugInfo()
    {
        var pointerDownEventCount = Object.keys(_activePointerDownEvents).length;
        var pointerMoveEventCount = Object.keys(_activePointerLatestMoveEvents).length;
        var capturingElementsCount = Object.keys(_activePointerCaptures).length;
        var activeHoverTimerCount = Object.keys(_activeHoverTimerInfo).length;
        var activeHoverEventCount = Object.keys(_activeHoverEvents).length; 
        var pointerDownList = "";
        var pointerMoveList = "";
        var pointerCaptureList = "";
        var hoverEventList = "";
        var hoverTimerList = "";

        log("DEBUG: All Gestures:");

        for (var g = 0; g < _gestures.length; g++)
        {
            var gesture = _gestures[g];
            log("  " + gesture.Name() + " (on " + getTargetElementID(gesture.Target()) + ")");
        }
        log("DEBUG: Gesture count: " + _gestures.length);

        log("DEBUG: Active PointerDown event count: " + pointerDownEventCount);
        for (var targetElementID in _activePointerDownEvents)
        {
            for (var pointerID in _activePointerDownEvents[targetElementID])
            {
                pointerDownList += "[" + targetElementID + "][" + pointerID + "] ";
            }
        }
        if (pointerDownEventCount > 0)
        {
            log("  " + pointerDownList);
        }

        log("DEBUG: Active PointerMove event count: " + pointerMoveEventCount);
        for (var targetElementID in _activePointerLatestMoveEvents)
        {
            for (var pointerID in _activePointerLatestMoveEvents[targetElementID])
            {
                pointerMoveList += "[" + targetElementID + "][" + pointerID + "] ";
            }
        }
        if (pointerMoveEventCount > 0)
        {
            log("  " + pointerMoveList);
        }

        log("DEBUG: Elements capturing pointer events: " + capturingElementsCount);
        for (var targetElementID in _activePointerCaptures)
        {
            pointerCaptureList += targetElementID + " [" + _activePointerCaptures[targetElementID].join(", ") + "] ";
        }
        if (capturingElementsCount > 0)
        {
            log("  " + pointerCaptureList);
        }

        log("DEBUG: Active Hover timer count: " + activeHoverTimerCount);
        for (var pointerID in _activeHoverTimerInfo)
        {
            var hoverTimerInfo = _activeHoverTimerInfo[pointerID];
            hoverTimerList += "[" + getTargetElementID(hoverTimerInfo.targetDomElement) + "][" + pointerID + "] ";
        }
        if (activeHoverTimerCount > 0)
        {
            log("  " + hoverTimerList);
        }

        log("DEBUG: Active Hover event count: " + activeHoverEventCount);
        for (var targetElementID in _activeHoverEvents)
        {
            for (var pointerID in _activeHoverEvents[targetElementID])
            {
                hoverEventList += "[" + targetElementID + "][" + pointerID + "] ";
            }
        }
        if (activeHoverEventCount > 0)
        {
            log("  " + hoverEventList);
        }
        
        log("DEBUG: Ink count: " + _inks.length);
        log("DEBUG: Pressed keys: " + Utils.GetPressedKeyInfo());
    }

    // Public
    function IsInkDragInProgress()
    {
        for (var i = 0; i < _inks.length; i++)
        {
            if (_inks[i]._previousDragMovePoint != null)
            {
                return (true);
            }
        }
        return (false);
    }

    // Public
    function Inks(className)
    {
        var filteredInks = [];

        for (var i = 0; i < _inks.length; i++)
        {
            if ((className === undefined) || _inks[i].Path().classed(className))
            {
                filteredInks.push(_inks[i]);
            }
        }

        // We don't return _inks directly so that Inks() can be iterated over and freely delete from _inks (eg. via Ink.Delete()) without issue
        return (filteredInks);
    }

    // Public
    function GetInkByElement(targetDomElement)
    {
        targetDomElement = Utils.GetDomElement(targetDomElement);

        if (targetDomElement instanceof SVGPathElement)
        {
            for (var i = 0; i < _inks.length; i++)
            {
                var inkPathMatches = (_inks[i].Path().node() == targetDomElement);
                var hullPathMatches = (_inks[i].HullPath() != null) && (_inks[i].HullPath().node() == targetDomElement);

                if (inkPathMatches || hullPathMatches)
                {
                    return (_inks[i]);
                }
            }
        }
        return (null);
    }

    // public 
    function GetInkByID(targetInkID)
    {
        for (var i = 0; i < _inks.length; i++)
        {
            if (_inks[i]._inkID == targetInkID)
            {
                return (_inks[i]);
            }
        }
        return (null);
    }

    var RecognizableShapes = Object.freeze(
    {
        CheckMark: "CheckMark",
        Triangle: "Triangle",
        Star: "Star", // 5-pointed
        StrikeThroughHorizontal: "StrikeThroughHorizontal", // Can be made in either an E or W direction
        StrikeThroughDiagonal: "StrikeThroughDiagonal", // Has to be made in a SW direction
        XOut: "XOut", // Like this image rotated 90 degrees left: https://www.vectorstock.com/royalty-free-vector/black-ribbon-loop-vector-3212999
        Rectangle: "Rectangle",
        GreaterThan: "GreaterThan", // >
        LessThan: "LessThan",       // <       
        UpArrow: "UpArrow",         // ^
        DownArrow: "DownArrow"      // v
    });

    // TODO: Make this extensible by the user
    // Shape recognition is done via a combination of pattern matching [on a predefined outline] and heuristics [for start/end compass heading and line-length].
    // Shapes will often overlap based on pattern matching alone, so the heuristics are critical for shape differentiation. Providing a 'shapeNameList' to 
    // RecognizeShape() also helps reduce false positives because it shrinks the number of possible matches.
    var _recognizableShapes =
        [
            { name: RecognizableShapes.CheckMark, relativePathPoints: [[0.75, 0], [1, 0], [1, 0.25], [0.4, 1], [0, 1], [0, 0.6], [0.15, 0.5], [0.25, 0.7]], padding: 0, compassHeading: "NE|E", maxPathLength: "Math.sqrt(Math.pow(gestureWidth, 2) + Math.pow(gestureHeight, 2)) * 1.5" },
            { name: RecognizableShapes.Triangle, relativePathPoints: [[0.4, 0], [0.6, 0], [1, 0.8], [1, 1], [0, 1], [0, 0.8]], padding: 0, minPathLength: "Math.sqrt(Math.pow(gestureWidth / 2, 2) + Math.pow(gestureHeight, 2)) * 2.25", maxPathLength: "Math.sqrt(Math.pow(gestureWidth / 2, 2) + Math.pow(gestureHeight, 2)) * 3"},
            { name: RecognizableShapes.Star, relativePathPoints: [[0.50, 0], [0.612, 0.345], [0.976, 0.345], [0.682, 0.559], [0.794, 0.905], [0.5, 0.691], [0.206, 0.905], [0.318, 0.559], [0.024, 0.345], [0.388, 0.345]], padding: 0.25 },
            { name: RecognizableShapes.StrikeThroughHorizontal, relativePathPoints: [[0, 0], [1, 0], [1, 1], [0, 1]], padding: 0, maxHeightRatio: 0.1, compassHeading: "E|W", minPathLength: "targetWidth / 2", maxPathLength: "targetWidth * 1.2" },
            { name: RecognizableShapes.StrikeThroughDiagonal, relativePathPoints: [[0.8, 0], [1, 0], [1, 0.2], [0.2, 1], [0, 1], [0, 0.8]], padding: 0, compassHeading: "SW" }, // 100% overlap with "CheckMark" (compassHeading differentiates them)
            { name: RecognizableShapes.XOut, relativePathPoints: [[0, 0.25], [0.1, 0], [0.4, 0], [0.5, 0.25], [1, 0], [1, 0.33], [0.8, 0.5], [1, 0.66], [1, 1], [0.5, 0.75], [0.4, 1], [0.1, 1], [0, 0.75]], padding: 0, minPathLength: "gestureWidth * 2.2", maxPathLength: "gestureWidth * 3" }, // Overlaps with "CheckMark"
            { name: RecognizableShapes.Rectangle, relativePathPoints: [[0, 0], [1, 0], [1, 1], [0, 1]], padding: 0, minPathLength: "((gestureWidth * 2) + (gestureHeight * 2)) * 0.85", maxPathLength: "(gestureWidth * 2) + (gestureHeight * 2)" }, // 100% overlap with "StrikeThroughHorizontal"
            { name: RecognizableShapes.GreaterThan, relativePathPoints: [[0, 0], [0.2, 0], [1, 0.3], [1, 0.7], [0.2, 1], [0, 1], [0, 0.8], [0.7, 0.5], [0, 0.2]], padding: 0, compassHeading: "S", maxPathLength: "Math.max(gestureHeight, gestureWidth) * 2.3" },
            { name: RecognizableShapes.LessThan, relativePathPoints: [[1, 0], [0.8, 0], [0, 0.3], [0, 0.7], [0.8, 1], [1, 1], [1, 0.8], [0.3, 0.5], [1, 0.2]], padding: 0, compassHeading: "S", maxPathLength: "Math.max(gestureHeight, gestureWidth) * 2.3" },
            { name: RecognizableShapes.UpArrow, relativePathPoints: [[0, 1], [0, 0.8], [0.3, 0], [0.7, 0], [1, 0.8], [1, 1], [0.8, 1], [0.5, 0.3], [0.2, 1]], padding: 0, compassHeading: "E|W", maxPathLength: "Math.max(gestureHeight, gestureWidth) * 2.3" },
            { name: RecognizableShapes.DownArrow, relativePathPoints: [[0, 0], [0.2, 0], [0.5, 0.7], [0.8, 0], [1, 0], [1, 0.2], [0.7, 1], [0.3, 1], [0, 0.2]], padding: 0, compassHeading: "E|W", maxPathLength: "Math.max(gestureHeight, gestureWidth) * 2.3" }
        ];

    // Public [targetWidth/Height/gDomElement and shapeNameList are optional]
    function RecognizeShape(pathPoints, minMatchPercent, targetWidth, targetHeight, gDomElement, shapeNameList)
    {
        minMatchPercent = minMatchPercent || 0.8;

        if (MIL.DebugFeature(FeatureNames.ShapeRecognition) && (gDomElement === undefined))
        {
            throw "The 'gDomElement' parameter must be supplied when the debug flag for '" + FeatureNames.ShapeRecognition + "' is true";
        }

        var shapeList = [];
        if (!shapeNameList)
        {
            var shapeList = _recognizableShapes;
        }
        else
        {
            _recognizableShapes.forEach(function (v, i) { if (shapeNameList.indexOf(v.name) != -1) { shapeList.push(v); } });
        }

        var svgInfo = MIL.DebugFeature(FeatureNames.ShapeRecognition) ? getSvgInfo(gDomElement) : null;
        var boundingRect = Utils.GetBoundingRectForPoints(pathPoints);
        var pointsToTest = d3.range(pathPoints.length).map(function (d) { return ([pathPoints[d].x, pathPoints[d].y]); });
        var bestMatchPercent = 0;
        var bestMatchShape = null;
        var pathLength = computeTotalLength(pathPoints);

        for (var i = 0; i < shapeList.length; i++)
        {
            var shape = shapeList[i];
            var shapePathPoints = [];
            var d = "";

            // Convert shape relative path-points into absolute path-points within the boundingRect
            // Note: We use shape.padding [if specified] to expand the absolute shape since for certain shapes (eg. Star) the drawn shape
            //       can be "sloppy" and so it requires an additional allowance if it's to be recognized with any reasonable accuracy.
            //       Further, drawn points that fall right on the edge of the absolute shape are typically not counted as being inside
            //       the shape, so it requires minor padding (eg. 0.01) to ensure we can reach a count of 100% inside.
            shape.padding = Math.max(shape.padding, 0.01);
            for (var p = 0; p < shape.relativePathPoints.length; p++)
            {
                var relativePathPoint = shape.relativePathPoints[p];
                var absoluteX = (boundingRect.x - (boundingRect.width * shape.padding)) + (relativePathPoint[0] * (boundingRect.width * (1 + (shape.padding * 2))));
                var absoluteY = (boundingRect.y - (boundingRect.height * shape.padding)) + (relativePathPoint[1] * (boundingRect.height * (1 + (shape.padding * 2))));
                shapePathPoints.push([absoluteX, absoluteY]);
                d += (!d ? "M " : " L") + Math.round(absoluteX) + " " + Math.round(absoluteY);
            }

            // Count how many path-points are inside the shape path
            var containedPathPointCount = Utils.CountPointsInPolygon(shapePathPoints, pointsToTest);
            var percentInside = containedPathPointCount / pathPoints.length;

            if (MIL.DebugFeature(FeatureNames.ShapeRecognition))
            {
                // Draw a path for the shape
                svgInfo.gSelection.append("path").attr("d", d + "Z").attr("stroke", "red").attr("fill", "transparent").node().style.strokeWidth = "1px";
                log("Shape '" + shape.name + "' matches " + (percentInside * 100).toFixed(2) + "% of path-points [vs " + (minMatchPercent * 100) + "% required]");
            }

            if ((percentInside >= minMatchPercent) && (percentInside > bestMatchPercent))
            {
                if (shape.compassHeading)
                {
                    var compassHeadings = shape.compassHeading.split("|");
                    var compassHeadingMatches = false;

                    for (var h = 0; h < compassHeadings.length; h++)
                    {
                        var compassHeading = compassHeadings[h];
                        var actualCompassHeading = Utils.GetCompassHeading(Utils.GetHeadingFromPoints(pathPoints[0], pathPoints[pathPoints.length - 1]));
                        var compassHeadingMatches = (compassHeading == actualCompassHeading);
                        if (compassHeadingMatches)
                        {
                            break;
                        }
                    }

                    if (!compassHeadingMatches)
                    {
                        log("Shape '" + shape.name + "' doesn't match on compassHeading", FeatureNames.ShapeRecognition);
                        continue;
                    }
                }

                if (shape.maxHeightRatio)
                {
                    var heightRatio = (boundingRect.height / boundingRect.width);
                    if (heightRatio > shape.maxHeightRatio)
                    {
                        log("Shape '" + shape.name + "' doesn't match on maxHeightRatio (expected: " + shape.maxHeightRatio + ", actual: " + heightRatio.toFixed(2) + ")", FeatureNames.ShapeRecognition);
                        continue;
                    }
                }

                if (shape.minPathLength || shape.maxPathLength)
                {
                    var gestureWidth = boundingRect.width;
                    var gestureHeight = boundingRect.height;

                    if (shape.minPathLength)
                    {
                        if (((shape.minPathLength.indexOf("targetWidth") != -1) && !targetWidth) ||
                            ((shape.minPathLength.indexOf("targetHeight") != -1) && !targetHeight))
                        {
                            log("Shape '" + shape.name + "': Cannot evaluate minPathLength because targetWidth and/or targetHeight was not supplied", FeatureNames.ShapeRecognition);
                        }
                        else
                        {
                            var minPathLength = eval(shape.minPathLength);
                            if (pathLength < minPathLength)
                            {
                                log("Shape '" + shape.name + "' doesn't match on minPathLength (expected: " + minPathLength.toFixed(2) + ", actual: " + pathLength.toFixed(2) + ")", FeatureNames.ShapeRecognition);
                                continue;
                            }
                        }
                    }
                    if (shape.maxPathLength)
                    {
                        if (((shape.maxPathLength.indexOf("targetWidth") != -1) && !targetWidth) ||
                            ((shape.maxPathLength.indexOf("targetHeight") != -1) && !targetHeight))
                        {
                            log("Shape '" + shape.name + "': Cannot evaluate maxPathLength because targetWidth and/or targetHeight was not supplied", FeatureNames.ShapeRecognition);
                        }
                        else
                        {
                            var maxPathLength = eval(shape.maxPathLength);
                            if (pathLength > maxPathLength)
                            {
                                log("Shape '" + shape.name + "' doesn't match on maxPathLength (expected: " + maxPathLength.toFixed(2) + ", actual: " + pathLength.toFixed(2) + ")", FeatureNames.ShapeRecognition);
                                continue;
                            }
                        }
                    }
                }

                bestMatchPercent = percentInside;
                bestMatchShape = shape;
            }
        }

        if (MIL.DebugFeature(FeatureNames.ShapeRecognition))
        {
            // Draw a path for the pathPoints
            for (var i = 0, d = ""; i < pathPoints.length; i++)
            {
                d += (!d ? "M " : " L") + Math.round(pathPoints[i].x) + " " + Math.round(pathPoints[i].y);
            }
            svgInfo.gSelection.append("path").attr("d", d).attr("stroke", "blue").attr("fill", "transparent").node().style.strokeWidth = "1px";
        }

        return (bestMatchShape ? bestMatchShape.name : null);
    }

    // Public
    function RecognizeRadialSwipe(pathPoints, numRadialSegments, minDistance)
    {
        var heading = Utils.GetHeadingFromPoints(pathPoints[0], pathPoints[pathPoints.length - 1]);
        var compassHeading = Utils.GetCompassHeading(heading, numRadialSegments);
        var pathLength = computeTotalLength(pathPoints);

        return ((pathLength > minDistance) ? { compassHeading: compassHeading, heading: heading } : null);
    }

    function computeTotalLength(pathPoints)
    {
        var totalLength = 0;
        for (var i = 0; i < pathPoints.length - 1; i++)
        {
            totalLength += Utils.GetDistanceBetweenPoints(pathPoints[i], pathPoints[i + 1]);
        }
        return (totalLength);
    }

    function getInkPathAssociatedWithHull(hullPath)
    {
        var pathDomElement = Utils.GetDomElement(hullPath, SVGPathElement);
        return (pathDomElement != null ? pathDomElement.__MILAssociatedInkPath__ : null);
    }

    /*
    function adjustPanForZoom(svgInfo, panLeft, panTop)
    {
        var minZoomLevel = svgInfo.settings.MinZoomLevel();

        // The units of these values is "zoom-adjusted (scaled) pixels", which is the same units as panLeft/Top 
        var panableWidth = svgInfo.svgWidth / minZoomLevel;
        var panableHeight = svgInfo.svgHeight / minZoomLevel;
        var viewableWidth = svgInfo.svgWidth / svgInfo.zoomLevel;
        var viewableHeight = svgInfo.svgHeight / svgInfo.zoomLevel;
        var maxHorizontalPan = (panableWidth - viewableWidth) / 2;
        var maxVerticalPan = (panableHeight - viewableHeight) / 2;

        svgInfo.panLeft = Math.min(maxHorizontalPan, Math.max(-maxHorizontalPan, panLeft));
        svgInfo.panTop = Math.min(maxVerticalPan, Math.max(-maxVerticalPan, panTop));
    }

    // Note: D3 also provides this functionality (D3's is superior because it supports "focal-point" zooming)
    //       [see https://bl.ocks.org/sgruhier/50990c01fe5b6993e82b8994951e23d0 and https://github.com/d3/d3-zoom#zoom_transform]
    function doPanZoom(svgInfo, startZoomFocalPointInScreenCoordinates)
    {
        // Scaling happens anchored to the upper-left corner, so the elements will all move down and right.
        // But we want to keep the elements centered, which means after the scale we need to make a compensating 
        // translation (to the upper-left corner). For example, if we scale by 50% we need to translate by 25%.
        // TODO: While this keeps the viewable area centered while zooming, the zoom should ideally be centered
        //       on the midpoint of the zoom gesture (the "focal-point").
        var newCenterOffsetX = (((1 - svgInfo.zoomLevel) * svgInfo.svgWidth) / 2) + (svgInfo.panLeft * svgInfo.zoomLevel);
        var newCenterOffsetY = (((1 - svgInfo.zoomLevel) * svgInfo.svgHeight) / 2) + (svgInfo.panTop * svgInfo.zoomLevel);

        // The translation transform values (dx,dy) are relative to the origin (0,0); the scale transform value is absolute (1 = 100%, ie. no scaling)
        // Note: transforms are applied in the REVERSE order that they are specified in (we want to scale first, then translate [to keep the visible scaled area centered])
        svgInfo.gDomElement.setAttribute("transform", "translate(" + newCenterOffsetX + ", " + newCenterOffsetY + ") scale(" + svgInfo.zoomLevel + ")");
    }
    */

    function getPointerDownEvent(pointerID, targetDomElement)
    {
        var targetElementID = getTargetElementID(targetDomElement);

        // First, check if we have a "hover-start" (pointerEnter) event, which [in the context of a hover] has the same semantics as pointerDown
        if (_activeHoverEvents[targetElementID] && _activeHoverEvents[targetElementID].hasOwnProperty(pointerID))
        {
            return (_activeHoverEvents[targetElementID][pointerID]);
        }

        if (_activePointerDownEvents[targetElementID].hasOwnProperty(pointerID))
        {
            return (_activePointerDownEvents[targetElementID][pointerID]);
        }
        return (null);
    }

    // Note that 'pointerID' can also be a pointerType (eg. "pen")
    function getLatestPointerMoveEvent(pointerID, targetDomElement)
    {
        var targetElementID = getTargetElementID(targetDomElement);

        if (_activePointerLatestMoveEvents[targetElementID].hasOwnProperty(pointerID))
        {
            return (_activePointerLatestMoveEvents[targetElementID][pointerID]);
        }
        else
        {
            // If the supplied pointerID specifies a pointerType, return the most recent PointerMove event (if any) of that pointerType
            if ((pointerID == "pen") || (pointerID == "touch") || (pointerID == "mouse"))
            {
                var targetType = pointerID;
                var e = null;

                for (var pid in _activePointerLatestMoveEvents[targetElementID])
                {
                    if (_activePointerLatestMoveEvents[targetElementID][pid].pointerType == targetType)
                    {
                        e = _activePointerLatestMoveEvents[targetElementID][pid];
                    }
                }
                return (e);
            }
        }
        return (null);
    }

    // Public
    /**
     * An "enum" for the modes in which the auto-combining of ink should occur.
     * @typedef {Number} InkAutoCombineMode
     */
    var InkAutoCombineMode = Object.freeze(
    {
        Off: 0,             // No combining of inks
        StartsWithin: 1,    // If ink B starts within ink A, combine ink B with Ink A
        EndsWithin: 2,      // If ink B end within ink A, combine ink B with Ink A
        ContainedWithin: 4, // If ink B is wholly contained within ink A, combine ink B with Ink A
        AnyPointWithin: 8,  // If any point of ink B lies within ink A, combine ink B with Ink A
        Always: 1|2|4|8     // Always combine inks that overlap in any way
    });

    // Public
    /**
     * An "enum" for the type (style) of hull path to create for an ink.
     * @typedef {Number} InkHullType
     */
    var InkHullType = Object.freeze(
    {
        None:    0,
        Concave: 1, // Note: MIL computes concave hulls
        Convex:  2  // Note: D3 computes convex hulls
    });

    // settings "class" [START]
    /**
     * @typedef {Object} settings
     */
    /**
     * Creates a new settings instance.
     * @class
     */
    function settings()
    {
        this._minZoomLevel = 1;
        this._maxZoomLevel = 1;
        this._isRightMouseClickAllowed = true;
        this._inkAutoCombineMode = MIL.InkAutoCombineMode.Off;
        this._hoverTimeoutInMs = 500;
    }

    // Note: settings_* functions not explicitly in the prototype must have 'this' set explicitly [eg. using call()]
    settings.prototype = {
        MinZoomLevel: settings_minZoomLevel,
        MaxZoomLevel: settings_maxZoomLevel,
        IsRightMouseClickAllowed: settings_isRightMouseClickAllowed,
        InkAutoCombineMode: settings_inkAutoCombineMode,
        HoverTimeoutInMs: settings_hoverTimeoutInMs
    };

    function settings_minZoomLevel(level)
    {
        if (level === undefined) { return (this._minZoomLevel); }
        else
        {
            if ((level <= 0) || (level > 1))
            {
                throw "MinZoomLevel (" + this._minZoomLevel + ") must be greater than 0 but no larger than 1";
            }
            this._minZoomLevel = level;
            return (this);
        }
    }

    function settings_maxZoomLevel(level)
    {
        if (level === undefined) { return (this._maxZoomLevel); }
        else
        {
            if (level < 1)
            {
                throw "MaxZoomLevel (" + this._maxZoomLevel + ") must be at least 1";
            }
            this._maxZoomLevel = level;
            return (this);
        }
    }

    function settings_isRightMouseClickAllowed(allow)
    {
        return (getOrSetProperty(this, "_isRightMouseClickAllowed", allow));
    }

    function settings_inkAutoCombineMode(mode)
    {
        return (getOrSetProperty(this, "_inkAutoCombineMode", mode));
    }

    function settings_hoverTimeoutInMs(timeout)
    {
        if (timeout === undefined)
        { 
            return (this._hoverTimeoutInMs);
        }
        else
        {
            if (timeout < 0) // This is how to specify that hover should be disabled [hover adds considerable eventing overhead]
            {
                timeout = -1;

                // Remove all hover state tracking 
                _activeHoverEvents = {};
                _activeHoverStartTime = {};
                _activeHoverTimerInfo = {};
            }
            this._hoverTimeoutInMs = timeout;
            return (this);
        }
    }
    // settings "class" [END]

    // Ink "class" [START]
    /**
     * @typedef {Object} Ink
     */
    /**
     * Creates a new Ink instance.
     * @class
     */
    function Ink(pointerID)
    {
        this._inkID = "Ink" + _nextInkID++;
        this._pointerID = pointerID;
        this._parentGesture = null;
        this._className = "";
        this._strokeColor = ""; // If set, overrides the stroke from _className (if any)
        this._strokeWidth = ""; // If set, overrides the strokeWidth from _className (if any)
        this._eraserClassName = "";
        this._hullType = InkHullType.None;
        this._hullColor = "transparent";
        this._isNonDrawing = null; // Once set, cannot be changed [enforced via Ink.IsNonDrawing()]
        this._cometTailClassName = ""; // Only applies when _isNonDrawing is true
        this._isAutoCose = false; // If set, when the ink ends the draw path will be automatically closed (with 'Z')
        this._hullPath = null;
        this._finalPath = null; // The d3 selection of the final (consolidated) SVG path
        this._nonDrawingPathPoints = null; // Only set when _isNonDrawing is true
        this._combinedOutlinePathPoints = null; // Only set when the Ink is created by Gesture.CombineInks()
        this._isEraserDrawing = false; // If set, the ink was drawn using the [pen] eraser
        this._isCoercingInkToRuler = false;
        this._resizeGesturePointerType = ""; // Must specify 2 pointers (eg. "touch:2") 
        this._resizeGesture = null;
        this._onResizeCompleteHandler = null; // A [optional] callback (which takes no parameters) that's invoked when _resizeGesture completes
        this._scale = 1; // The "zoom level" of the ink/hull (changed via _resizeGesture)
        this._onDragMoveHandler = null; // A [optional] callback (which takes parameters: deltaX, deltaY) that's invoked when the Ink is being dragged
        this._previousDragMovePoint = null; // Tracks position while dragging
        this._groupDragSelectionClassName = null; // When set, all ink paths that have this class will be dragged together
        this._dragGesture = null; // The gesture (if any) currently being used to drag the ink
     }

    // Note: ink_* functions not explicitly in the prototype must have 'this' set explicitly [eg. using call()]
    Ink.prototype = {
        InkID: ink_inkID,
        PointerID: ink_pointerID,
        ParentGesture: ink_parentGesture,
        IsActive: ink_isActive,
        Class: ink_class,
        StrokeColor: ink_strokeColor,
        StrokeWidth: ink_strokeWidth,
        EraserClass: ink_eraserClass,
        HullType: ink_hullType,
        HullColor: ink_HullColor,
        IsNonDrawing: ink_isNonDrawing, // Set to true to just collect path-point data (ie. PathPoints()) without actually drawing a path [eg. to do shape recognition]
        CometTailClass: ink_cometTailClass,
        IsAutoClose: ink_isAutoClose,
        ResizeWith: ink_resizeWith,
        OnResizeCompleteHandler: ink_onResizeCompleteHandler,
        IsEraserDrawing: ink_isEraserDrawing,
        IsCombined: ink_isCombined, // True if the Ink was created by Gesture.CombineInks() [typically, but not necessarily, this means that the Ink consists of multiple lines]
        HullPath: ink_hullPath,
        Path: ink_path,
        PathPoints: ink_pathPoints,
        Start: ink_start,
        Cancel: ink_cancel,
        Delete: ink_delete,
        DeleteHull: ink_deleteHull,
        Scale: ink_scale,
        DragStart: ink_dragStart,
        DragEnd: ink_dragEnd,
        OnDragMoveHandler: ink_onDragMoveHandler,
        OnPointerMove: ink_onPointerMove,
        OnPointerUp: ink_onPointerUp,
        GetConvexArea: ink_getConvexArea,
        IsInside: ink_isInside,
        GetLayoutGridPoints: ink_getLayoutGridPoints,
        IsStraightLine: ink_isStraightLine
    };

    function ink_inkID()
    {
        readOnlyProperty("InkID", arguments);
        return (this._inkID);
    }

    function ink_pointerID()
    {
        readOnlyProperty("PointerID", arguments);
        return (this._pointerID);
    }

    function ink_parentGesture(gesture)
    {
        return (getOrSetProperty(this, "_parentGesture", gesture));
    }

    function ink_isActive()
    {
        readOnlyProperty("IsActive", arguments);
        return (this._pointerID != null);
    }

    function ink_class(className)
    {
        return (getOrSetProperty(this, "_className", className));
    }

    function ink_strokeColor(color)
    {
        return (getOrSetProperty(this, "_strokeColor", color));
    }

    function ink_strokeWidth(width)
    {
        return (getOrSetProperty(this, "_strokeWidth", width));
    }

    function ink_eraserClass(className)
    {
        return (getOrSetProperty(this, "_eraserClassName", className));
    }

    function ink_cometTailClass(className)
    {
        return (getOrSetProperty(this, "_cometTailClassName", className));
    }

    function ink_hullType(hullType)
    {
        if (hullType === undefined)
        {
            return (this._hullType);
        }
        else
        {
            if (this._hullPath != null)
            {
                // TODO: This is just for simplicity, but technically it could be changed
                // Note: The hullType can be changed (one-way) from Concave to Convex as a side-effect of using Gesture.CombineInks()
                throw "Ink.HullType cannot be changed after the Ink has been created";
            }

            this._hullType = hullType;
            return (this);
        }
    }

    function ink_HullColor(color)
    {
        return (getOrSetProperty(this, "_hullColor", (color == "debug") ? "rgba(0,128,0,0.2)" : color));
    }

    function ink_isNonDrawing(isNonDrawing)
    {
        if (isNonDrawing === undefined)
        {
            return ((this._isNonDrawing == null) ? false : this._isNonDrawing);
        }
        else
        {
            if (this._isNonDrawing != null)
            {
                throw "Ink.IsNonDrawing cannot be changed once set";
            }

            if (isNonDrawing && (this._hullType != InkHullType.None))
            {
                throw "Ink.IsNonDrawing can only be set when Ink.HullType is 'None'";
            }

            this._isNonDrawing = isNonDrawing;
            return (this);
        }
    }

    function ink_isAutoClose(isAutoClose)
    {
        if (isAutoClose === undefined)
        {
            return (this._isAutoCose);
        }
        else
        {
            if (this.Path() != null)
            {
                throw "Ink.IsAutoClose cannot be changed after the Ink has been created";
            }
            this._isAutoCose = isAutoClose;
            return (this);
        }
    }

    function ink_isEraserDrawing()
    {
        readOnlyProperty("IsEraserDrawing", arguments);
        return (this._isEraserDrawing);
    }

    function ink_isCombined()
    {
        readOnlyProperty("IsCombined", arguments);
        return (this._combinedOutlinePathPoints != null);
    }

    function ink_hullPath()
    {
        readOnlyProperty("HullPath", arguments);
        return (this._hullPath);
    }

    function ink_path()
    {
        readOnlyProperty("Path", arguments);
        return (this._finalPath);
    }

    function ink_pathPoints(pathPoints)
    {
        readOnlyProperty("PathPoints", arguments);

        if (this._isNonDrawing)
        {
            return (this._nonDrawingPathPoints);
        }
        else
        {
            var path = this._finalPath.node();
            var pathLineCount = path.__MILPathPointsCollection__.length;

            if (this._combinedOutlinePathPoints)
            {
                // Return the points of the convex hull that covers the original set of ink paths that were combined (via Gesture.CombineInks()).
                // While a loss in fidelity, this is arguably consistent with the nature of what it means to combine ink paths.
                // The alternative would be to return __MILPathPointsCollection__, but the caller is expecting Ink.PathPoints() to return a single array
                // of points, not an array of array of points.
                // Note: It's valid for __MILPathPointsCollection__ to only have one entry yet also have _combinedOutlinePathPoints be true: this can
                //       legitimately happen if a single ink path is "combined", eg. to change the hull-type of the ink from concave to convex. 
                return (this._combinedOutlinePathPoints);
            }
            else
            {
                if (pathLineCount != 1)
                {
                    throw "Internal state error: __MILPathPointsCollection__ was expected to contain 1 entry, but is has " + pathLineCount + " entries.";
                }
                return (path.__MILPathPointsCollection__[0]); // The {x, y} points of the final (consolidated) SVG path
            }
        }
    }

    // Applies the current Class/StrokeColor/StrokeWidth to either the final "consolidated" path (if available), or the current constituent path of an in-flight inking
    function ink_applyStyle(isEraser)
    {
        var pathSelection = (this._finalPath != null) ? this._finalPath : _inkCurrentPath[this._pointerID];

        if (isEraser)
        {
            if (this._eraserClassName)
            {
                pathSelection.attr("class", this._eraserClassName);
            }
            else
            {
                // Apply defaults if no EraserClass was provided
                pathSelection.node().style.stroke = "white";
                pathSelection.node().style.strokeWidth = "20px";
            }

            pathSelection.node().__MILIsEraser__ = true; // To make it easy to detect eraser paths
        }
        else
        {
            // Apply Class/StrokeColor/StrokeWidth (if any)
            if (this._isNonDrawing && this._cometTailClassName)
            {
                pathSelection.attr("class", this._cometTailClassName);
            }
            else
            {
                pathSelection.attr("class", this._className);
                pathSelection.node().style.stroke = !this._className ? this._strokeColor : "";
                pathSelection.node().style.strokeWidth = !this._className ? this._strokeWidth : "";

                // Apply defaults if no Class and no StrokeColor/StrokeWidth are provided
                if (!this.Class())
                {
                    var pathElement = (this._finalPath != null) ? this._finalPath : _inkCurrentPath[this._pointerID];
                    if (!this.StrokeColor()) { pathSelection.node().style.stroke = "red"; }
                    if (!this.StrokeWidth()) { pathSelection.node().style.strokeWidth = "4px"; }
                }
            }
        }
    } 

    function ink_start()
    {
        var e = getPointerDownEvent(this._pointerID, this.ParentGesture().Target());
        var isEraser = ink_isEraser(e);
        var ruler = getSvgInfo(e.target).ruler;

        this._isEraserDrawing = !this.IsNonDrawing() && isEraser;

        if (!this._isNonDrawing && this._cometTailClassName)
        {
            throw "Ink.CometTailClass() can only be set when IsNonDrawing() is true";
        }
        
        if (!this.IsNonDrawing() && ruler && ruler.IsVisible())
        {
            var line = ruler.GetFaceEdgeLine();
            var inkStartPoint = this.ParentGesture().GetStartSvgPoint("{P1}");
            var pointOnLine = Utils.GetClosestPointOnLine(inkStartPoint, line[0], line[1]);
            var distanceToRuler = Utils.GetDistanceBetweenPoints(inkStartPoint, pointOnLine);
            this._isCoercingInkToRuler = (distanceToRuler < (ruler.Height() * 0.25));
        }
        else
        {
            this._isCoercingInkToRuler = false;
        }

        // Start a new line (path)
        ink_startNewLine.call(this, e);

        // There's no need to track a non-drawing Ink because it doesn't add a Path element
        if (!this.IsNonDrawing())
        {
            _inks.push(this); // Note: Must be explicitly removed via Ink.Delete() or Ink.Cancel()
        }

        return (this);
    }

    // Starts drawing a new line (path) on svgInfo.gDomElement
    function ink_startNewLine(e)
    {
        var pointerID = makePointerID(e);
        var svgInfo = getSvgInfo(e.target);
        var isDrawing = !this._isNonDrawing || (this._isNonDrawing && this._cometTailClassName);

        if (isDrawing)
        {
            if (_inkLineGenerator == null)
            {
                _inkLineGenerator = d3.line()
                    .curve(d3.curveBasis) // See http://bl.ocks.org/mbostock/4342190
                    .x(function (d) { return (d.x); })
                    .y(function (d) { return (d.y); });
            }

            _inkCurrentPath[pointerID] = svgInfo.gSelection.append("path").attr("data-pointerID", pointerID);
            ink_applyStyle.call(this, this._isEraserDrawing);

            if (this._isNonDrawing && this._cometTailClassName)
            {
                // Start a fade-out of the new (current) path
                var currentPath = _inkCurrentPath[pointerID];
                Utils.Fade(currentPath, 500, null, function onFadeComplete() { if (currentPath) currentPath.remove(); }, false);
            }
        }

        // Is this line brand new?
        if (_inkCompletePathPointData[pointerID].length == 0)
        {
            if (_postponedPointerEvents.length > 0)
            {
                // Add the pending _postponedPointerEvents to the path
                for (var i = 0; i < _postponedPointerEvents.length; i++)
                {
                    if (this._pointerID == makePointerID(_postponedPointerEvents[i]))
                    {
                        this.OnPointerMove(_postponedPointerEvents[i]);
                    }
                }
            }
            else
            {
                // Add the initial pointerDown point to the path
                this.OnPointerMove(e);
            }
        }
    }

    function ink_onPointerMove(e)
    {
        var pointerID = makePointerID(e);
        var svgInfo = getSvgInfo(e.target);

        // Since the main 'g' element can be transformed (ie. zoomed and/or panned), we need to transform the e.clientX/Y point into the coordinate space of the [potentially transformed] 'g' element
        var pointInTransformSpace = MIL.TransposePointer(e, svgInfo.gDomElement);
        var x = pointInTransformSpace.x, y = pointInTransformSpace.y;
        var newPoint = { x: x, y: y };

        if (this._isCoercingInkToRuler)
        {
            // Was the ruler hidden while we were drawing?
            if (!svgInfo.ruler.IsVisible())
            {
                ink_onPointerUp.call(this, e);
                return;
            }

            var line = svgInfo.ruler.GetFaceEdgeLine();
            var pointOnLine = Utils.GetClosestPointOnLine(newPoint, line[0], line[1]);
            var distanceToRuler = Utils.GetDistanceBetweenPoints(newPoint, pointOnLine);

            // Has the pointer moved too far away from the ruler?
            if (distanceToRuler > (svgInfo.ruler.Height() * 0.25))
            {
                ink_onPointerUp.call(this, e);
                return;
            }

            newPoint = { x: pointOnLine.x, y: pointOnLine.y };
        }

        var maxPathSegments = this._isNonDrawing ? 8 : 100; // The non-drawing case is for a comet-tail
        var overlappingPathSegments = this._isNonDrawing ? 7 : 2; // The non-drawing case is for a comet-tail
        var pathPointData = _inkCurrentPathPointData[pointerID];
        var completePathPointData = _inkCompletePathPointData[pointerID];
        var isDrawing = !this._isNonDrawing || (this._isNonDrawing && this._cometTailClassName);

        if (pathPointData === undefined)
        {
            // A movement of the touch/mouse/pen has been detected, but before we got a 'pointerDown' for it [which is a valid condition]
            return;
        }

        // To prevent a slow-down in rendering speed when pathPointData gets large [or to draw the comet-tail], we periodically spawn a new path
        if (isDrawing && (pathPointData.length == maxPathSegments))
        {
            pathPointData.length = 0;

            // Smooth the "join" between the old and new path [by adding the last overlappingPathSegments from the complete path-point list to the new "component" path]
            if ((overlappingPathSegments > 0) && (overlappingPathSegments <= completePathPointData.length))
            {
                var tailPoints = completePathPointData.slice(-overlappingPathSegments);
                Array.prototype.push.apply(pathPointData, tailPoints);
            }

            ink_startNewLine.call(this, e);
        }

        // Append new data point [but only if it's "different" from the last point (to help smooth the line and to cut down on the number of points stored)]
        var isPointDifferentThanLast = true;

        if (completePathPointData.length > 0)
        {
            var lastPoint = completePathPointData[completePathPointData.length - 1];
            var distanceThreshold = 3;
            isPointDifferentThanLast = (Math.abs(lastPoint.x - newPoint.x) >= distanceThreshold) || (Math.abs(lastPoint.y - newPoint.y) >= distanceThreshold);
        }

        if (isPointDifferentThanLast)
        {
            completePathPointData.push(newPoint);

            if (isDrawing)
            {
                // Redraw the path
                pathPointData.push(newPoint);
                _inkCurrentPath[pointerID].attr("d", _inkLineGenerator(pathPointData));
            }
        }
    }

    function ink_onPointerUp(e)
    {
        var pointerID = makePointerID(e);
        var svgInfo = getSvgInfo(e.target);

        if (this._isNonDrawing)
        {
            this._nonDrawingPathPoints = _inkCompletePathPointData[pointerID];
        }
        else
        {
            if (_inkCompletePathPointData[pointerID] !== undefined)
            {
                // Handle a simple mouse click [in which case onPointerMove() will not have fired]
                if ((e.pointerType == "mouse") && (_inkCompletePathPointData[pointerID].length == 0))
                {
                    // Since the main 'g' element can be transformed (ie. zoomed and/or panned), we need to transform the e.clientX/Y point into the coordinate space of the [potentially transformed] 'g' element
                    var pointInTransformSpace = MIL.TransposePointer(e, svgInfo.gDomElement);
                    _inkCompletePathPointData[pointerID].push({ x: pointInTransformSpace.x, y: pointInTransformSpace.y });
                }

                ink_consolidatePaths.call(this, e);
            }

            // We store the path-points on the Path DOM element directly because this makes it easier to subsequently access them.
            // Even though we only have a single array of points, we store them as an array of array of points in order to support
            // multi-line paths [created via Gesture.CombineInks()].
            this._finalPath.node().__MILPathPointsCollection__ = [_inkCompletePathPointData[pointerID]];
        }

        this._pointerID = null; // To indicate that the inking is complete [and prevent getInkingGesture() from continuing to find gestures whose inking is complete]

        delete _inkCompletePathPointData[pointerID];
        delete _inkCurrentPathPointData[pointerID];
        delete _inkCurrentPath[pointerID];

        // Check if we should automatically combine this Ink with one-or-more other Inks that overlap with it in some way
        if (!this._isEraserDrawing && !this._isNonDrawing && !this._isCoercingInkToRuler && (svgInfo.settings.InkAutoCombineMode() != MIL.InkAutoCombineMode.Off))
        {
            var inksToCombine = [this];
            var combinedPathClassName = "";
            var autoCombineMode = svgInfo.settings.InkAutoCombineMode();
            var combinationTargetFound = false;
            var pointsToTest = this.PathPoints();

            for (var i = 0; i < _inks.length; i++)
            {
                if (_inks[i] == this)
                {
                    continue;
                }

                var polygonPoints = _inks[i].PathPoints(); // Note: These are actually {x,y} points, not [x,y] points

                if ((autoCombineMode & MIL.InkAutoCombineMode.ContainedWithin) == MIL.InkAutoCombineMode.ContainedWithin)
                {
                    var containedPointCount = Utils.CountPointsInPolygon(polygonPoints, pointsToTest);
                    combinationTargetFound = (containedPointCount == pointsToTest.length);
                }

                if (!combinationTargetFound && ((autoCombineMode & MIL.InkAutoCombineMode.StartsWithin) == MIL.InkAutoCombineMode.StartsWithin))
                {
                    combinationTargetFound = Utils.IsPointInPolygon(polygonPoints, pointsToTest[0].x, pointsToTest[0].y);
                }

                if (!combinationTargetFound && ((autoCombineMode & MIL.InkAutoCombineMode.EndsWithin) == MIL.InkAutoCombineMode.EndsWithin))
                {
                    combinationTargetFound = Utils.IsPointInPolygon(polygonPoints, pointsToTest[pointsToTest.length - 1].x, pointsToTest[pointsToTest.length - 1].y);
                }

                if (!combinationTargetFound && ((autoCombineMode & MIL.InkAutoCombineMode.AnyPointWithin) == MIL.InkAutoCombineMode.AnyPointWithin))
                {
                    combinationTargetFound = Utils.IsAnyPointInPolygon(polygonPoints, pointsToTest);
                }

                if (combinationTargetFound)
                {
                    combinedPathClassName = _inks[i].Class() ? _inks[i].Class() : combinedPathClassName;
                    inksToCombine.push(_inks[i]);
                    combinationTargetFound = false;
                }
            }

            if (inksToCombine.length > 1)
            {
                this.ParentGesture().CombineInks(inksToCombine, combinedPathClassName);
            }
        }
    }

    function ink_resizeWith(pointerType)
    {
        if (pointerType === undefined)
        {
            return (this._resizeGesturePointerType);
        }
        else
        {
            if (this._resizeGesture != null)
            {
                MIL.RemoveGestureByName(this._resizeGesture.Name());
                this._resizeGesture = null;
            }

            if (pointerType && this._hullPath)
            {
                var ink = this;
                var startInkScale = ink.Scale();
                var startInkStrokeWidth = Utils.ToNumber(window.getComputedStyle(ink.Path().node()).strokeWidth);

                this._resizeGesture = MIL.CreateGesture("InkResize*", true).PointerType(pointerType).Target(this._hullPath)
                    .RecognitionTimeoutInMs(50) // TODO: The caller should have control over this timeout
                    .GestureStartedHandler(function ()
                    {
                        // To prevent the ink resize gesture from happening in parallel with an ink drag - which
                        // could potentially cause undesirable interactions - we terminate an in-progress drag
                        if (ink._dragGesture != null)
                        {
                            ink._dragGesture.Cancel("The Ink is being resized");
                            ink.DragEnd();
                        }

                        var startResizeDistance = this.GetDistance("{P1}", "{P2}");
                        var prevResizeDistance = startResizeDistance;

                        this.OnMoveHandler(function ()
                        {
                            var resizeDistance = this.GetDistance("{P1}", "{P2}");

                            if (resizeDistance != prevResizeDistance)
                            {
                                // For performance, we'll resize the hull (if any) only when the gesture ends
                                ink.Scale((resizeDistance / startResizeDistance) * startInkScale, startInkScale, startInkStrokeWidth, true);
                                prevResizeDistance = resizeDistance;
                            }
                        });
                    })
                    .GestureEndedHandler(function ()
                    {
                        ink.Scale(ink.Scale(), startInkScale, startInkStrokeWidth, false);
                        startInkScale = ink.Scale();

                        if (ink.OnResizeCompleteHandler() != null)
                        {
                            ink.OnResizeCompleteHandler().call(ink);
                        }
                    });

                if (this._resizeGesture.PointerCount() != 2)
                {
                    throw "The pointerType supplied to Ink.ResizeWith() must specify exactly 2 pointers (eg. 'touch:2' or 'pen+touch')";
                }

                MIL.AddGesture(this._resizeGesture);
            }
            
            this._resizeGesturePointerType = pointerType;
            return (this);
        }
    }

    function ink_onResizeCompleteHandler(handler)
    {
        return (getOrSetProperty(this, "_onResizeCompleteHandler", handler));
    }

    function ink_cancel()
    {
        if (this._finalPath != null)
        {
            log("Warning: Ink cannot be cancelled after it has been created");
            return;
        }
        
        var pointerID = this._pointerID;
        var svgInfo = getSvgInfo(this.ParentGesture().Target());

        // Remove the multiple [overlapping] constituent paths
        var constituentPaths = svgInfo.gSelection.selectAll("[data-pointerID=" + pointerID + "]");
        constituentPaths.remove();

        this._finalPath = null;
        this._pointerID = null;
        this._nonDrawingPathPoints = null;

        ink_deleteInksEntry.call(this);

        delete _inkCompletePathPointData[pointerID];
        delete _inkCurrentPathPointData[pointerID];
        delete _inkCurrentPath[pointerID];
    }

    function ink_deleteHull()
    {
        if (this.HullPath())
        {
            MIL.RemoveGesturesByTarget(this.HullPath()); // Note: Gestures on Ink usually target the hull-path
            this.HullPath().remove();
            this._hullPath = null;
        }
    }

    function ink_delete()
    {
        this.DeleteHull();

        MIL.RemoveGesturesByTarget(this.Path()); // Note: Gestures on Ink rarely target the ink-path (they typically target the hull-path)
        this.Path().remove();

        ink_deleteInksEntry.call(this);

        log("Ink created by gesture '" + this.ParentGesture().Name() + "' was deleted (" + _inks.length + " Inks remain)");
    }

    function ink_deleteInksEntry()
    {
        // TODO: Ink shouldn't really have any knowledge of _inks
        var index = _inks.indexOf(this);
        if (index != -1)
        {
            _inks.splice(index, 1);
        }

        // ParentGesture.Ink() is the LATEST Ink created by the Gesture (Gesture:Ink is 1:m)
        if (this.ParentGesture()._ink == this)
        {
            this.ParentGesture()._ink = null;
        }
    }

    // If excludeHull is true, the hull (if any) will NOT be scaled
    function ink_scale(scale, startScale, startStrokeWidth, excludeHull)
    {
        if ((scale === undefined) && (startScale === undefined) && (startStrokeWidth === undefined) && (excludeHull === undefined))
        {
            return (this._scale);
        }
        else
        {
            var oldScale = excludeHull ? this._scale : startScale;
            var newScale = scale;

            scaleInkPath(this.Path(), oldScale, newScale, startStrokeWidth, excludeHull);

            if (this.HullPath())
            {
                // Hide the hull while we're scaling
                this.HullPath().attr("visibility", excludeHull ? "hidden" : "visible");

                if (!excludeHull)
                {
                    var scaleDelta = (scale - startScale) / startScale;
                    scaleHullPath(this.HullPath(), scaleDelta);
                }
            }

            this._scale = scale;

            // log("DEBUG: Ink scaled to " + this._scale.toFixed(2) + "x");
            return (this);
        }
    }

    function ink_dragStart(dragGesture, groupDragSelectionClassName)
    {
        if (dragGesture.Target() != this.HullPath().node())
        {
            throw "The specified 'dragGesture' must target the Ink.HullPath()";
        }

        var ink = this;
        var startPoint = dragGesture.GetStartSvgPoint("{P1}"); // TODO: Revisit defaulting to using the {P1} pointer of the drag gesture
        var svgInfo = getSvgInfo(dragGesture.Target());
        var inkPath = this.Path();
        var hullPath = this.HullPath();
        var isDraggedSelection = groupDragSelectionClassName && inkPath.classed(groupDragSelectionClassName);

        this._previousDragMovePoint = startPoint;
        this._groupDragSelectionClassName = groupDragSelectionClassName || null;
        this._dragGesture = dragGesture;

        // Re-create the inkHull (drag target) and the inkPath (we do this to change the z-order of these elements [z-order = order
        // added to SVG] to "top", so that they are dragged above erasure paths and other draggable elements)
        var selectedPaths = inkPath;
        var selectedHulls = hullPath;

        if (isDraggedSelection)
        {
            var g = svgInfo.gSelection;
            var selectedPaths = g.selectAll("path.MILInkPath" + (ink._groupDragSelectionClassName ? "." + ink._groupDragSelectionClassName : ""));
            var selectedHulls = g.selectAll("path.MILInkHullPath").filter(function () { return (getInkPathAssociatedWithHull(this).classed(ink._groupDragSelectionClassName)); });
        }

        var draggedPathElements = selectedPaths.remove().nodes();
        draggedPathElements.forEach(function (element) { svgInfo.gDomElement.appendChild(element); });

        var draggedHullElements = selectedHulls.remove().nodes();
        draggedHullElements.forEach(function (element) { svgInfo.gDomElement.appendChild(element); });

        // The dragGesture didn't create the Ink whose hull it's targeted on, but since it needs to operate on the
        // Ink.Path() in addition to the Ink.HullPath() [its Target()], we tag the gesture with its "host" Ink
        if ((dragGesture._ink != null) && (dragGesture._ink != this))
        {
            throw "The specified 'dragGesture' has an unexpected Ink() value";
        }
        dragGesture._ink = this;

        dragGesture.OnMoveHandler(ink_dragMove); // This handler will be removed automatically when the gesture ends
    }

    function ink_dragMove(e)
    {
        // Note: Gesture.OnMoveHandler() [which is how ink_dragMove() gets called] will prevent e from bubbling

        var dragGesture = this;
        var ink = dragGesture.Ink();
        var pointerID = dragGesture.GetPointerID("{P1}"); // TODO: Revisit defaulting to using the {P1} pointer of the drag gesture

        // We only care about pointer-move events for the {P1} pointer
        if (makePointerID(e) != pointerID)
        {
            return;
        }

        var currentPoint = dragGesture.GetCurrentSvgPoint("{P1}");
        var previousPoint = ink._previousDragMovePoint;
        var svgInfo = getSvgInfo(dragGesture.Target());
        var deltaX = (currentPoint.x - previousPoint.x);
        var deltaY = (currentPoint.y - previousPoint.y);
        var inkPath = ink.Path();

        ink._previousDragMovePoint = currentPoint;

        if ((deltaX != 0) || (deltaY != 0))
        {
            if (ink._groupDragSelectionClassName && inkPath.classed(ink._groupDragSelectionClassName))
            {
                var g = svgInfo.gSelection;
                var selectedPaths = g.selectAll("path.MILInkPath" + (ink._groupDragSelectionClassName ? "." + ink._groupDragSelectionClassName : ""));
                var selectedHulls = g.selectAll("path.MILInkHullPath").filter(function () { return (getInkPathAssociatedWithHull(this).classed(ink._groupDragSelectionClassName)); });

                // Move the inkPath(s) (using the "fast" translation method)
                selectedPaths.each(function (d, i)
                {
                    var inkPath = d3.select(this); 
                    translateInkPath(inkPath, deltaX, deltaY, true); 
                });

                // Move the inkHull(s)
                selectedHulls.each(function (d, i)
                {
                    var inkHullPath = d3.select(this);
                    translateHullPath(inkHullPath, deltaX, deltaY, true);
                });
            }
            else
            {
                // Move the inkPath (using the "fast" translation method)
                translateInkPath(inkPath, deltaX, deltaY, true);

                // Move the inkHull
                translateHullPath(ink.HullPath(), deltaX, deltaY, true);
            }

            // Call the user-supplied move handler (if any) [eg. to move user content associated with the ink/hull]
            if (ink.OnDragMoveHandler() != null)
            {
                ink.OnDragMoveHandler()(deltaX, deltaY);
            }
        }
    }

    function ink_dragEnd()
    {
        if (this._dragGesture == null)
        {
            return;
        }

        var ink = this;
        var dragGesture = this._dragGesture;
        var currentPoint = dragGesture.GetCurrentSvgPoint("{P1}"); // TODO: Revisit defaulting to using the {P1} pointer of the drag gesture
        var startPoint = dragGesture.GetStartSvgPoint("{P1}");
        var deltaX = (currentPoint.x - startPoint.x);
        var deltaY = (currentPoint.y - startPoint.y);
        var svgInfo = getSvgInfo(dragGesture.Target());
        var inkPath = this.Path();
        var hullPath = this.HullPath();
        var isDraggedSelection = this._groupDragSelectionClassName && inkPath.classed(this._groupDragSelectionClassName);

        // Do the final "manual" translation of the ink (to update __MILPathPointsCollection__ and clear the transform) and hull
        if (isDraggedSelection)
        {
            var g = svgInfo.gSelection;
            var selectedPaths = g.selectAll("path.MILInkPath" + (ink._groupDragSelectionClassName ? "." + ink._groupDragSelectionClassName : ""));
            var selectedHulls = g.selectAll("path.MILInkHullPath").filter(function () { return (getInkPathAssociatedWithHull(this).classed(ink._groupDragSelectionClassName)); });

            selectedPaths.each(function (d, i)
            {
                var inkPath = d3.select(this);
                translateInkPath(inkPath, deltaX, deltaY, false);
            });

            selectedHulls.each(function (d, i)
            {
                var inkHullPath = d3.select(this);
                translateHullPath(inkHullPath, deltaX, deltaY, false);
            });
        }
        else
        {
            translateInkPath(inkPath, deltaX, deltaY, false);
            translateHullPath(hullPath, deltaX, deltaY, false);
        }

        this._previousDragMovePoint = null;
        this._groupDragSelectionClassName = null;
        this._dragGesture = null;
    }

    function ink_onDragMoveHandler(handler)
    {
        return (getOrSetProperty(this, "_onDragMoveHandler", handler));
    }

    function ink_isEraser(e)
    {
        // Check if the [pen] eraser button is currently pressed, or if 'e' is the [pointer-up] event when the [pen] eraser button stopped being pressed
        // (ie. the eraser button was the source of the [pen] button state-transition [to not-pressed]) [see http://www.w3.org/TR/pointerevents2/]
        var isEraser = (e.pointerType == "pen") && (((e.buttons & MIL.PenButton.Eraser) == MIL.PenButton.Eraser) || (e.button == 5));
        return (isEraser);
    }

    function ink_getConvexArea()
    {
        var convexArea = 0;

        if (this._finalPath != null)
        {
            var polygonPoints = Utils.ConvertXYPointsToPolygonPoints(this.PathPoints());
            var convexHullVertices = d3.polygonHull(polygonPoints); // Returned points are in counter-clockwise order [which d3.polygonArea (see below) needs to return a positive value]

            if (convexHullVertices)
            {
                convexArea = d3.polygonArea(convexHullVertices);
            }
        }

        return (convexArea);
    }

    // Returns true if the ink is completely within the targetInk [returns false if targetInk and ink match]
    function ink_isInside(targetInk)
    {
        if (targetInk == this)
        {
            return (false);
        }

        var pointsToTest = this.PathPoints();
        var containedPointCount = Utils.CountPointsInPolygon(targetInk.PathPoints(), pointsToTest);
        var isInside = (containedPointCount == pointsToTest.length);

        return (isInside);
    }

    // Using a grid-quantizing scheme, returns an array of {x,y} points (of length numGridPoints) that lie within the ink.
    // Typically this is used to create locations ("landing sites") to move other items into the Ink region (eg. when the Ink is being used as a container).
    function ink_getLayoutGridPoints(numGridPoints)
    {
        var boundingRect = Utils.GetBoundingRectForPoints(this.PathPoints());
        var numCols = Math.ceil(Math.sqrt(numGridPoints)) + 2;
        var numRows = Math.ceil(numCols * (boundingRect.height / boundingRect.width));

        if (boundingRect.height >= boundingRect.width)
        {
            while (((numRows * numCols) > numGridPoints) && (numCols > 1))
            {
                numCols--;
            }
            while (((numRows * numCols) > numGridPoints) && (numRows > 1))
            {
                numRows--;
            }
        }
        else
        {
            while (((numRows * numCols) > numGridPoints) && (numRows > 1))
            {
                numRows--;
            }
            while (((numRows * numCols) > numGridPoints) && (numCols > 1))
            {
                numCols--;
            }
        }

        var gridPoints = [];
        var polygonPoints = Utils.ConvertXYPointsToPolygonPoints(this.PathPoints());
        var retryCount = 0;
        var aborted = false;

        while ((gridPoints.length < numGridPoints) && !aborted)
        {
            for (var r = (numRows == 1 ? 0 : 1); r < numRows; r++)
            {
                var testPointY = boundingRect.y + ((numRows == 1) ? (boundingRect.height / 2) : (r * (boundingRect.height / numRows)));
                for (var c = (numCols == 1 ? 0 : 1); c < numCols; c++)
                {
                    var testPointX = boundingRect.x + ((numCols == 1) ? (boundingRect.width / 2) : (c * (boundingRect.width / numCols)));

                    if (Utils.IsPointInPolygon(polygonPoints, testPointX, testPointY))
                    {
                        gridPoints.push({ x: testPointX, y: testPointY });
                    }
                }
            }

            // Do we need to try again?
            if (gridPoints.length < numGridPoints)
            {
                gridPoints.length = 0;
                numRows += 1;
                numCols += 1;
                aborted = (retryCount++ == 5); // It's expensive to retry too many times
            }
        }

        // Trim gridPoints to numGridPoints
        if (!aborted)
        {
            var deleteCount = gridPoints.length - numGridPoints;
            if (deleteCount > 0)
            {
                var downsamplingStepSize = Math.floor(gridPoints.length / numGridPoints);

                if (downsamplingStepSize > 1)
                {
                    var downsampledGridPoints = [];
                    for (var i = 0; i < gridPoints.length; i += downsamplingStepSize)
                    {
                        downsampledGridPoints.push(gridPoints[i]);
                    }
                    gridPoints = downsampledGridPoints;
                    deleteCount = gridPoints.length - numGridPoints;
                }

                if (deleteCount > 0)
                {
                    var deleteFromStart = (deleteCount % 2 == 0) ? deleteCount / 2 : Math.floor(deleteCount / 2);
                    var deleteFromEnd = (deleteCount % 2 == 0) ? deleteCount / 2 : Math.ceil(deleteCount / 2);
                    gridPoints.splice(0, deleteFromStart);
                    gridPoints.splice(gridPoints.length - deleteFromEnd, deleteFromEnd);
                }
            }
        }

        // DEBUG:
        // var gDomElement = getSvgInfo(this.Path()).gDomElement;
        // gridPoints.forEach(function (point) { Utils.DebugDrawPoints(gDomElement, [point], 3); });

        return (gridPoints);
    }

    function ink_isStraightLine()
    {
        var polygonPoints = Utils.ConvertXYPointsToPolygonPoints(this.PathPoints());
        var isStraightLine = Utils.IsStraightLine(this.Path(), polygonPoints);
        return (isStraightLine);
    }

    function ink_consolidatePaths(e)
    {
        var pointerID = makePointerID(e);
        var isEraser = this._isEraserDrawing;
        var svgInfo = getSvgInfo(e.target);

        // Add a single "composite" path to replace the multiple [overlapping] constituent paths
        var path = this._finalPath = svgInfo.gSelection.append("path").attr("d", _inkLineGenerator(_inkCompletePathPointData[pointerID]) + (this._isAutoCose ? "Z" : ""));

        ink_applyStyle.call(this, isEraser);
        path.classed("MILInkPath", true); // Just to make it easier to find the ink paths using CSS selector syntax ("path.MILInkPath") 

        // Remove the multiple [overlapping] constituent paths
        var constituentPaths = svgInfo.gSelection.selectAll("[data-pointerID=" + pointerID + "]");
        constituentPaths.remove();

        // Optionally, add a "hull" path that overlays the composite path by "filling" the path with overlapping lines (and dots) [in
        // effect creating a hit-testable hull over the drawn path]. This allows the user to drag the path if needed [to reposition it],
        // or to add other gestures to the hull (eg. tap, resize, etc).
        // Note: We take this approach, rather than just relying on hit-testing the transparency-filled path itself, for the following reasons:
        //       1) It allows us more control over the type of hull that we want to create (concave or convex). 
        //          For example, if the Ink is known (in advance) to be hand-writing the caller can specify a convex hull.
        //       2) It allows us to combine Inks more easily (there is no natural fill that will "cover" a path consisting of multiple disjoint lines).
        //       3) It allows us to have the same hull mechanics for both singleton and combined inks (rather than using the [filled] Ink.Path()
        //          directly as the "hull" for a singleton Ink, and then having a separate hull-path for a combined Ink).
        //       4) It provides a consistent target for gestures on the Ink.
        // Note: The hull CANNOT be added [by changing Ink.HullType()] after the ink has been created.
        if ((this.HullType() != InkHullType.None) && !isEraser)
        {
            var pathPoints = _inkCompletePathPointData[pointerID];
            var boundingRect = Utils.GetBoundingRectForPoints(pathPoints);
            var offsetTop = boundingRect.y, offsetLeft = boundingRect.x;
            var height = boundingRect.height;
            var width = boundingRect.width;
            var penWidth = Utils.ToNumber(path.style("stroke-width"));
            var adj = penWidth / 2;
            var rectLeft = offsetLeft - adj;
            var rectTop = offsetTop - adj;
            var rectWidth = width + penWidth;
            var rectHeight = height + penWidth;
            var hullPath = svgInfo.gSelection.append("path");

            hullPath.node().__MILAssociatedInkPath__ = path; // "tag" the hull with its corresponding Ink path
            hullPath.classed("MILInkHullPath", true); // Just to make it easier to find the hulls using CSS selector syntax ("path.MILInkHullPath")
            hullPath.style("stroke", this.HullColor());
            hullPath.style("stroke-width", "1px");
            hullPath.style("fill", this.HullColor());

            var polygonPoints = Utils.ConvertXYPointsToPolygonPoints(pathPoints);
            var isStraightLine = Utils.IsStraightLine(path, polygonPoints);

            if (this.HullType() == InkHullType.Concave)
            {
                if (isStraightLine)
                {
                    log("Ink determined to be a straight-line");
                    for (var i = 0, d = ""; i < polygonPoints.length; i++)
                    {
                        d += (!d ? "M " : " L") + polygonPoints[i][0] + " " + polygonPoints[i][1];
                    }
                    hullPath.attr("d", d);
                    hullPath.style("stroke-width", (Utils.ToNumber(window.getComputedStyle(this._finalPath.node()).strokeWidth) * 7) + "px");
                    hullPath.style("fill", "");
                }
                else
                {
                    for (var i = 0, d = ""; i < pathPoints.length; i++)
                    {
                        d += (!d ? "M " : " L") + pathPoints[i].x + " " + pathPoints[i].y;
                    }
                    hullPath.attr("d", d);
                }
            }

            if (this.HullType() == InkHullType.Convex)
            {
                var hullVertices = d3.polygonHull(polygonPoints);
                for (var i = 0, d = ""; i < hullVertices.length; i++)
                {
                    d += (!d ? "M " : " L") + hullVertices[i][0] + " " + hullVertices[i][1];
                }
                hullPath.attr("d", d);
            }

            this._hullPath = hullPath;

            // Ensure creation of the resize gesture [when the ResizeWith() setter is first called, it's target (Ink.HullPath()) won't yet exist so the gesture won't get created]
            if (this._resizeGesturePointerType)
            {
                this.ResizeWith(this._resizeGesturePointerType);
            }
        }
    }
    // Ink "class" [END]

    // Gesture "class" [START]
    /**
     * @typedef {Object} Gesture
     */
    /**
     * Creates a new Gesture instance.
     * @class
     */
    function Gesture(name, ignoreGestureDefaults)
    {
        if (name[name.length - 1] == "*")
        {
            throw "Gesture name '" + name + "' is invalid (cannot end with '*'): consider using MIL.CreateGesture() instead";
        }

        this._name = name;
        this._targetDomElement = ignoreGestureDefaults ? null : GestureDefaults.Target();
        this._pointerType = null; // The pointer-type(s) that define this gesture
        this._pointerTypePermutations = []; // All possible permutations of _pointerType (permutations arise from or-style pointerType values, eg. "pen|mouse+touch" meaning "a pen or a mouse, plus a touch")
        this._pointerTypeOrdinals = []; // Based on the _pointerType (eg. "pen+touch:2" results in ordinals ["pen:1", "touch:1", "touch:2"]): there is one _pointerTypeOrdinals value (an array of ordinals) for each _pointerTypePermutations value
        this._conditional = null; // A callback that must return true for the gesture to be recognized
        this._isEnabled = true;
        this._isCancelled = false;
        this._groupName = ignoreGestureDefaults ? "default" : GestureDefaults.GroupName();
        this._recognitionTimeoutInMs = ignoreGestureDefaults ? 0 : GestureDefaults.RecognitionTimeoutInMs();
        this._completionTimeoutInMs = -1; // -1 means 'no timeout'
        this._gestureStartedHandler = ignoreGestureDefaults ? null : GestureDefaults.StartedHandler();
        this._gestureEndedHandler = ignoreGestureDefaults ? null : GestureDefaults.EndedHandler();
        this._gestureCancelledHandler = ignoreGestureDefaults ? null : GestureDefaults.CancelledHandler();
        this._onMoveHandler = null;
        this._activePointerList = []; // If this gesture is currently active, this is the list of PointerID's involved
        this._activePointerTypeOrdinals = []; // If this gesture is currently active, this is the list of PointerType ordinals involved (copied from one of the _pointerTypeOrdinals values)
        this._capturesPointers = true;
        this._isCapturing = false; // True if the gesture is currently capturing pointer events on _targetDomElement
        this._ink = null;
        this._startedTime = 0; // Set when the gesture starts (is recognized): Milliseconds since January 1, 1970
        this._endedTime = 0; // Set when the gesture ends (when the first pointer is lifted): Milliseconds since January 1, 1970
        this._repeatCount = 0;
        this._repeatTimeoutInMs = 0;
        this._repeatOccurrenceCount = 0; // A runtime value
        this._lastRepeatRecognitionTime = 0; // A runtime value
        this._checkForGesturesOnEnd = false;
        this._allowEventPropagation = true;
        this._completionTimerID = -1;
    }

    // Note: gesture_* functions not explicitly in the prototype must have 'this' set explicitly [eg. using call()]
    Gesture.prototype = {
        Name: gesture_name,
        Target: gesture_targetDomElement, // The gesture(s) attached to a specific Target() have to be explicitly removed when the target is removed; if not done, it will lead to silent gesture proliferation which will slow down MIL
        PointerType: gesture_pointerType,
        PointerCount: gesture_pointerCount,
        Conditional: gesture_conditional,
        IsEnabled: gesture_isEnabled, // Note: The group that the gesture belongs to also has to be enabled for this to return true [we allow selective disablement within an enabled group, but not vice-versa]
        GroupName: gesture_groupName,
        RecognitionTimeoutInMs: gesture_recognitionTimeoutInMs,
        CompletionTimeoutInMs: gesture_completionTimeoutInMs,
        GestureStartedHandler: gesture_startedHandler,
        GestureEndedHandler: gesture_endedHandler,
        GestureCancelledHandler: gesture_cancelledHandler,
        OnMoveHandler: gesture_onMoveHandler, // Provides a way to pass the gesture (and not just 'e') through to the [pointermove] handler; should ONLY be set inside _gestureStartedHandler, since it's always removed when the gesture ends
        CapturesPointers: gesture_capturesPointers,
        ActivePointerList: gesture_activePointerList, // Set once the gesture has been recognized
        IsActive: gesture_isActive,
        IsCancelled: gesture_isCancelled,
        GetPointerNameByOrdinal: gesture_getPointerNameByOrdinal,
        GetPointerID: gesture_getPointerID,
        GetDistance: gesture_getDistanceBetweenPointers,
        GetCurrentScreenPoint: gesture_getCurrentScreenPoint, // In screen coordinates [relative to the fixed origin (0,0) of the document]
        GetCurrentSvgPoint: gesture_getCurrentSvgPoint, // In SVG "canvas" coordinates [which account for zooming/panning of svgInfo.gDomElement]
        GetStartScreenPoint: gesture_getStartScreenPoint,
        GetStartSvgPoint: gesture_getStartSvgPoint,
        GetStartEvent: gesture_getStartEvent,
        GetCurrentEvent: gesture_getCurrentEvent,
        Ink: gesture_ink, // Refers to the LATEST Ink created by the Gesture (Gesture:Ink is 1:m)
        CombineInks: gesture_combineInks,
        Cancel: gesture_cancel,
        StartedTime: gesture_startedTime,
        RepeatCount: gesture_repeatCount,
        RepeatTimeoutInMs: gesture_repeatTimeoutInMs,
        CheckForGesturesOnEnd: gesture_checkForGesturesOnEnd,
        AllowEventPropagation: gesture_allowEventPropagation, // When false, will prevent event propagation for Target (regardless of whether the gesture is recognized)
        BringTargetToFront: gesture_bringTargetToFront,
        SetPointerCapture: gesture_setPointerCapture,
        ReleasePointerCapture: gesture_releasePointerCapture
    };

    function gesture_name(name)
    {
        return (getOrSetProperty(this, "_name", name));
    }

    function gesture_targetDomElement(element)
    {
        if (element === undefined)
        {
            return (this._targetDomElement);
        }
        else
        {
            var targetDomElement = Utils.GetDomElement(element);

            if (!document.body.contains(targetDomElement))
            {
                throw "The specified DOM element does not exist in the document body";
            }

            tagWithTargetElementID(targetDomElement);
            this._targetDomElement = targetDomElement;
            return (this);
        }
    }

    // Returns true if a permutation of targetPointerType [other than itself] exists in pointerTypePermutations
    function gesture_isExistingPointerTypePermutation(targetPointerType, pointerTypePermutations)
    {
        var permutationExists = false;
        var targetGroups = targetPointerType.split("+");
        var targetIndex = pointerTypePermutations.indexOf(targetPointerType);

        for (var i = 0; i < pointerTypePermutations.length; i++)
        {
            var groups = pointerTypePermutations[i].split("+");

            if ((i == targetIndex) || (targetGroups.length != groups.length))
            {
                continue;
            }

            for (var g = 0; g < targetGroups.length; g++)
            {
                var matchIndex = groups.indexOf(targetGroups[g]);
                if (matchIndex != -1)
                {
                    groups.splice(matchIndex, 1);
                }
            }

            if (groups.length == 0)
            {
                permutationExists = true;
                break;
            }
        }
        return (permutationExists);
    }

    // Example: A pointerType of "pen|touch:2+mouse|touch" will return ["pen:2+mouse", "pen:2+touch", "touch:2+mouse", "touch:2+touch"]
    function gesture_permutePointerType(pointerType)
    {
        if (pointerType.indexOf("|") == -1)
        {
            // Only or-style pointerTtype values result in permutations
            return ([pointerType]);
        }
        else
        {
            var groups = pointerType.split("+");
            var pointerTypePermutations = [];

            for (var g = 0; g < groups.length; g++)
            {
                var add = (pointerTypePermutations.length == 0);
                var group = groups[g];

                if (group.indexOf("|") == -1)
                {
                    // A "non-or" group (eg. "touch:2")
                    if (add)
                    {
                        pointerTypePermutations.push(group);
                    }
                    else
                    {
                        for (var i = 0; i < pointerTypePermutations.length; i++)
                        {
                            pointerTypePermutations[i] += "+" + group;
                        }
                    }
                }
                else
                {
                    // An "or" group (eg. "touch|pen:2")
                    var parts = group.split(":");
                    var types = parts[0].split("|");
                    var instanceCount = (parts.length == 2) ? parts[1] : 1;

                    if (parts.length > 2)
                    {
                        throw "Invalid pointerType '" + group + "'; the instance count qualifier (:n) must appear only once (at the end) when using the 'or' (|) specifier";
                    }

                    if (group.indexOf("any") != -1)
                    {
                        throw "Invalid pointerType '" + group + "'; the pointerType 'any' is invalid when using the 'or' (|) specifier";
                    }

                    if (add)
                    {
                        // Example: "touch|pen:2" becomes "touch:2", "pen:2"
                        for (var t = 0; t < types.length; t++)
                        {
                            pointerTypePermutations.push(types[t] + ((instanceCount != 1) ? (":" + instanceCount) : ""));
                        }
                    }
                    else
                    {
                        // Add new permutations [TODO: Prevent logical duplicate permutations, eg. "pen+touch" and "touch+pen"]
                        var existingPermutationCount = pointerTypePermutations.length;
                        for (var i = 0; i < existingPermutationCount; i++)
                        {
                            for (var t = 0; t < types.length; t++)
                            {
                                var newPermutation = pointerTypePermutations[i] + "+" + types[t] + ((instanceCount != 1) ? (":" + instanceCount) : "");
                                pointerTypePermutations.push(newPermutation);
                            }
                        }
                        // Remove the previous permutations
                        pointerTypePermutations.splice(0, existingPermutationCount);
                    }
                }
            }

            // Remove any logical duplicates [eg. "pen+touch" is a duplicate of "touch+pen"]
            for (var i = pointerTypePermutations.length - 1; i >= 0; i--)
            {
                if (gesture_isExistingPointerTypePermutation(pointerTypePermutations[i], pointerTypePermutations))
                {
                    pointerTypePermutations.splice(i, 1);
                }
            }

            return (pointerTypePermutations);
        }
    }

    function gesture_pointerType(pointerType)
    {
        if (pointerType === undefined)
        {
            return (this._pointerType);
        }
        else
        {
            var validTypes = ["pen", "touch", "mouse", "hover", "any"];
            var groups = pointerType.split("+");
            var pointerTypeOrdinals = [];
            var pointerTypePermutations = [];

            pointerType = pointerType.toLowerCase();

            // Populate pointerTypePermutations [which is necessary to handle or-style pointerType values, eg. "pen|touch+touch" meanig "pen or touch, plus a second touch"].
            pointerTypePermutations = gesture_permutePointerType(pointerType);

            for (var p = 0; p < pointerTypePermutations.length; p++)
            {
                var groups = pointerTypePermutations[p].split("+");

                pointerTypeOrdinals.push([]);

                // Populate pointerTypeOrdinals[] (and validate pointerType)
                // Note that pointerType can be of the form "touch:2+pen" or "touch+touch+pen"
                for (var g = 0; g < groups.length; g++)
                {
                    var parts = groups[g].split(":");
                    var type = parts[0];
                    var instanceCount = 1;

                    if (validTypes.indexOf(type) == -1)
                    {
                        throw "Invalid pointerType '" + type + "'; valid values (separated by '+') are: " + validTypes.join(", ");
                    }

                    if (parts.length == 1)
                    {
                        for (var i = 0; i < pointerTypeOrdinals[p].length; i++)
                        {
                            if (pointerTypeOrdinals[p][i].indexOf(type) == 0)
                            {
                                instanceCount++;
                            }
                        }
                        pointerTypeOrdinals[p].push(type + ":" + instanceCount);
                    }
                    else
                    {
                        instanceCount = Number(parts[1]);

                        if (isNaN(instanceCount))
                        {
                            throw "Invalid pointerType '" + groups[g] + "'; should be of the form '" + type + ":{number}'";
                        }
                        if ((instanceCount < 1) || (instanceCount > 10))
                        {
                            throw "Invalid pointerType '" + groups[g] + "'; the instance count must be between 1 and 10";
                        }

                        for (var i = 1; i <= instanceCount; i++)
                        {
                            pointerTypeOrdinals[p].push(type + ":" + i);
                        }
                    }
                }
            }

            this._pointerType = pointerType;
            this._pointerTypePermutations = pointerTypePermutations;
            this._pointerTypeOrdinals = pointerTypeOrdinals;

            return (this);
        }
    }

    function gesture_conditional(callback)
    {
        return (getOrSetProperty(this, "_conditional", callback));
    }

    function gesture_isEnabled(enabled)
    {
        if (enabled === undefined) { return (this._isEnabled && isGestureGroupEnabled(this._groupName)); } else { this._isEnabled = enabled; return (this); }
    }

    function gesture_groupName(name)
    {
        return (getOrSetProperty(this, "_groupName", name));
    }

    function gesture_recognitionTimeoutInMs(timeout)
    {
        return (getOrSetProperty(this, "_recognitionTimeoutInMs", timeout));
    }

    function gesture_completionTimeoutInMs(timeout)
    {
        return (getOrSetProperty(this, "_completionTimeoutInMs", timeout));
    }

    function gesture_startedHandler(handler)
    {
        return (getOrSetProperty(this, "_gestureStartedHandler", handler));
    }

    function gesture_endedHandler(handler)
    {
        return (getOrSetProperty(this, "_gestureEndedHandler", handler));
    }

    function gesture_cancelledHandler(handler)
    {
        return (getOrSetProperty(this, "_gestureCancelledHandler", handler));
    }

    function gesture_onMoveHandler(handler)
    {
        if (handler === undefined)
        {
            return (this._onMoveHandler);
        }
        else
        {
            if (this._targetDomElement == null)
            {
                throw "The Target() of the Gesture must be defined before setting the OnMoveHandler()";
            }

            var gesture = this;
            var onMoveHandler = (handler instanceof Function) ? function onMoveHandlerWrapper(e)
            {
                handler.call(gesture, e);

                // Since we handled the PointerMove event, we prevent it from bubbling [up its parent chain].
                // However, in order to allow other active gestures with a move handler on _targetDomElement) we use stopPropagation() NOT stopImmediatePropagation(). 
                // An example of this would be when a 1-touch Pan becomes a 2-touch Zoom [Pan remains active during the Zoom], in which which case we want both gestures
                // to continue to receive pointerMove events (in particular, we don't want the Pan to prevent the Zoom gesture from receiving pointerMove events).
                e.stopPropagation();
            } : null;

            if (this._onMoveHandler != null)
            {
                this._targetDomElement.removeEventListener("pointermove", this._onMoveHandler);
            }
            if (onMoveHandler != null)
            {
                this._targetDomElement.addEventListener("pointermove", onMoveHandler);
            }

            this._onMoveHandler = onMoveHandler;
            return (this);
        }
    }

    function gesture_capturesPointers(capturesPointers)
    {
        return (getOrSetProperty(this, "_capturesPointers", capturesPointers));
    }

    function gesture_startedTime()
    {
        readOnlyProperty("StartedTime", arguments);
        return (this._startedTime);
    }

    function gesture_activePointerList(list)
    {
        readOnlyProperty("ActivePointerList", arguments);
        return (this._activePointerList);
    }

    function gesture_isActive()
    {
        readOnlyProperty("IsActive", arguments);
        return (this._activePointerList.length > 0);
    }

    function gesture_isCancelled()
    {
        readOnlyProperty("IsCancelled", arguments);
        return (this._isCancelled);
    }

    // Returns the number of pointers that this gesture requires
    function gesture_pointerCount()
    {
        readOnlyProperty("PointerCount", arguments);
        return (this._pointerTypeOrdinals[0].length);
    }

    function gesture_repeatCount(count)
    {
        if (count === undefined)
        {
            return (this._repeatCount);
        }
        else
        {
            if (count > 1)
            {
                this._repeatCount = count;
                if (this._repeatTimeoutInMs == 0)
                {
                    this.RepeatTimeoutInMs(200);
                }
            }
            return (this);
        }
    }

    function gesture_repeatTimeoutInMs(timeout)
    {
        if (timeout === undefined)
        {
            return (this._repeatTimeoutInMs);
        }
        else
        {
            // Note: Timeouts less than 175ms are too small (most users typically can't double/triple-tap that fast, so the gesture would go unrecognized in too many instances)
            this._repeatTimeoutInMs = Math.min(1000, Math.max(175, timeout));
            if (this._repeatCount == 0)
            {
                this.RepeatCount(2);
            }
            return (this);
        }
    }

    function gesture_checkForGesturesOnEnd(check)
    {
        return (getOrSetProperty(this, "_checkForGesturesOnEnd", check));
    }

    function gesture_allowEventPropagation(allow)
    {
        return (getOrSetProperty(this, "_allowEventPropagation", allow));
    }

    // Remove/re-add the gesture target to change its z-order to "top most" [z-order = order added to SVG]
    function gesture_bringTargetToFront()
    {
        var gesture = this;
        var targetDomElement = gesture.Target();
        var svgInfo = getSvgInfo(targetDomElement);
        var gDomElement = svgInfo.gDomElement;

        gDomElement.removeChild(targetDomElement);
        gDomElement.appendChild(targetDomElement);

        return (d3.select(targetDomElement));
    }

    // Capture all pointers used by this gesture to the gesture's target
    function gesture_setPointerCapture()
    {
        var gesture = this;

        if (gesture.CapturesPointers())
        {
            gesture.ActivePointerList().forEach(function (pointerID)
            {
                // Note: Calling setPointerCapture() will prevent any further bubbling of events
                var pointerId = getPointerDownEvent(pointerID, gesture.Target()).pointerId;
                var targetElementID = getTargetElementID(gesture.Target());

                gesture.Target().setPointerCapture(pointerId);
                gesture._isCapturing = true;

                // Note: Calling gesture_setPointerCapture() again [for the same element/pointer] is a valid condition, and since calling setPointerCapture()
                //       twice (or more) seems to have no unwanted side-effects we don't check for or disallow it.
                //       An example of this would be when 1-touch Pan becomes a 2-touch Zoom: the Pan will have captured the {P1} pointer to the SVG, then 
                //       when the Zoom gesture starts (which also uses {P1}) it will capture it again.

                if (_activePointerCaptures[targetElementID] === undefined)
                {
                    _activePointerCaptures[targetElementID] = [];
                }
                _activePointerCaptures[targetElementID].push(pointerID);

                log("DEBUG: SET pointer-capture for " + pointerID + " (" + pointerId + ") on " + targetElementID);
            });
        }
    }
    
    // Release capture of all pointers used by this gesture from the gesture's target
    function gesture_releasePointerCapture()
    {
        var gesture = this;

        if (gesture.CapturesPointers() && gesture._isCapturing)
        {
            this.ActivePointerList().forEach(function (pointerID)
            {
                var pointerId = getPointerDownEvent(pointerID, gesture.Target()).pointerId;
                var targetElementID = getTargetElementID(gesture.Target());

                gesture.Target().releasePointerCapture(pointerId);
                gesture._isCapturing = false;

                // Check if we're trying to releasePointerCapture [on an element/pointer] without first capturing it
                if (!_activePointerCaptures[targetElementID] || (_activePointerCaptures[targetElementID].indexOf(pointerID) == -1))
                {
                    throw "Attempt to release pointer capture of '" + pointerID + "' from element '" + targetElementID + "' when it has not been captured";
                }

                _activePointerCaptures[targetElementID].splice(_activePointerCaptures[targetElementID].indexOf(pointerID), 1);
                if (_activePointerCaptures[targetElementID].length == 0)
                {
                    delete _activePointerCaptures[targetElementID];
                }

                log("DEBUG: RELEASED pointer-capture for " + pointerID + " (" + pointerId + ") on " + targetElementID);
            });
        }
    }

    // This is used to detect either:
    // 1) When a non-repeating gesture that exceeds its CompletionTimeoutInMs()
    // 2) When a repeating gesture that fails to be fully recognized [after being "partially" recognized (eg. only the first of two
    //    taps was recognized)] because the time between the prior occurrence being recognized and now exceeds RepeatTimeoutInMs()
    function gesture_startCompletionTimeout(timeoutInMs, timeoutType, propagateEventsOnTimeout, onTick)
    {
        var gesture = this;

        if (gesture._completionTimerID != -1)
        {
            clearTimeout(gesture._completionTimerID);
            gesture._completionTimerID = -1;
        }

        if (timeoutInMs > 0)
        {
            gesture._completionTimerID = setTimeout(function ()
            {
                if (onTick)
                {
                    onTick();
                }

                if (gesture._endedTime == 0)
                {
                    gesture.Cancel(timeoutType + " timeout [" + timeoutInMs + "ms] expired"); // timeoutType will be either "completion" or "repeat"

                    // Look for other gestures that may apply to the target of the [timed-out] gesture
                    var recognitionResult = recognizeGesture(gesture.Target(), 0, 0, false);
                    if (!recognitionResult.success && recognitionResult.propagateEvents && propagateEventsOnTimeout)
                    {
                        // Propagate any queued events to allow any gestures on the target's parent element to be recognized
                        propagateQueuedEvents(gesture.Target());
                    }

                    gesture._repeatOccurrenceCount = 0;
                    gesture._isCancelled = false;

                    // Since the gesture was cancelled [due to not completing in time] we clear the gesture's 
                    // pointerList to prevent the gesture from subsequently being recognized during pointerUp
                    gesture._activePointerList.length = 0;
                    gesture._activePointerTypeOrdinals.length = 0;
                }
                else
                {
                    log("Gesture '" + gesture.Name() + "'" + (gesture._repeatOccurrenceCount > 0 ? (" [occurrence #" + gesture._repeatOccurrenceCount + "]") : "") + " completed within its " + gesture._completionTimeoutInMs + "ms timeout", FeatureNames.GestureRecognition);
                }
            }, timeoutInMs);
        }
    }

    function gesture_getPointerNameByOrdinal(pointerOrdinal)
    {
        var matches = pointerOrdinal.match("{P([1-9])}");
        if (matches != null)
        {
            var ordinal = Number(matches[1]);

            if (this._activePointerTypeOrdinals.length == 0)
            {
                throw "Unable to determine the pointer name for ordinal identifier '" + pointerOrdinal + "' because gesture '" + this.Name() + "' is not active";
            }

            if (ordinal <= this._activePointerTypeOrdinals.length)
            {
                return (this._activePointerTypeOrdinals[ordinal - 1]);
            }
            else
            {
                throw "Ordinal identifier '" + pointerOrdinal + "' is invalid for gesture '" + this.Name() + "', which only uses " + this.PointerCount() + " pointer(s)";
            }
        }
        return (null);
    }

    // Note: pointerType can be in any of these forms: "touch:2", "touch" [which is the same as "touch:1"], or "{P1}" [meaning pointer ordinal #1 in Gesture.PointerType()]
    function gesture_getPointerID(pointerType)
    {
        if (!pointerType)
        {
            throw "The pointerType parameter is missing or invalid";
        }

        // If pointerType is of the form "{Pn}", then return the pointer at ordinal n (eg. for a gestured defined as "pen+touch:2", ordinal 1 = "pen:1", 2 = "touch:1", 3 = "touch:2").
        // Using ordinal notation allows calling code to be written more generically (if so desired) - eg. allowing a gesture to be redefined to use different pointer types with fewer code changes.
        var pointerName = this.GetPointerNameByOrdinal(pointerType);
        if (pointerName != null)
        {
            return (this.GetPointerID(pointerName));
        }

        var targetType = pointerType;
        var targetInstance = 1;
        var instance = 0;

        // Note: pointerType can be of the form "touch:2" meaning "the second touch pointer that made contact"
        var parts = pointerType.split(":");
        targetType = parts[0];
        targetInstance = (parts.length == 1) ? 1 : +parts[1];

        for (var i = 0; i < this._activePointerList.length; i++)
        {
            var pointerID = this._activePointerList[i];

            if ((pointerID.indexOf(targetType) != -1) || (targetType == "any") || ((targetType == "hover") && canHover(pointerID, this.Target())))
            {
                if (++instance == targetInstance)
                {
                    return (pointerID);
                }
            }
        }

        throw "Gesture '" + this.Name() + "' (defined as '" + this.PointerType() + "') does not have a pointer of type '" + pointerType + "'";
    }

    function gesture_getDistanceBetweenPointers(pointerType1, pointerType2)
    {
        var e1 = getLatestPointerMoveEvent(this.GetPointerID(pointerType1), this.Target());
        var e2 = getLatestPointerMoveEvent(this.GetPointerID(pointerType2), this.Target());
        var pixelDistance = Utils.GetDistanceBetweenEvents(e1, e2);
        return (pixelDistance);
    }

    function gesture_getStartScreenPoint(pointerType)
    {
        // Note: e.clientX/Y are relative to [the top-left (0,0)] of the document window; if the window (and/or container(s) of
        //       the SVG) has been scrolled, the caller will need to adjust for this (eg. by adding window.pageXOffset/pageYOffset)
        var e = getPointerDownEvent(this.GetPointerID(pointerType), this.Target());
        return ({ x: e.clientX, y: e.clientY });
    }

    function gesture_getStartSvgPoint(pointerType)
    {
        var e = getPointerDownEvent(this.GetPointerID(pointerType), this.Target());
        var svgInfo = getSvgInfo(e.target);

        // Since svgInfo.gDomElement can be transformed (ie. zoomed and/or panned), we need to transform the e.clientX/Y point into the coordinate space of the [potentially transformed] 'g' element
        // Note: e.clientX/Y are relative to [the top-left (0,0)] of the document window
        var pointInTransformSpace = MIL.TransposePointer(e, svgInfo.gDomElement);
        return ({ x: pointInTransformSpace.x, y: pointInTransformSpace.y });
    }

    function gesture_getCurrentScreenPoint(pointerType)
    {
        // Note: e.clientX/Y are relative to [the top-left (0,0)] of the document window
        var e = getLatestPointerMoveEvent(this.GetPointerID(pointerType), this.Target());
        return ({ x: e.clientX, y: e.clientY });
    }

    function gesture_getCurrentSvgPoint(pointerType)
    {
        var e = getLatestPointerMoveEvent(this.GetPointerID(pointerType), this.Target());
        var svgInfo = getSvgInfo(e.target);

        // Since svgInfo.gDomElement can be transformed (ie. zoomed and/or panned), we need to transform the e.clientX/Y point into the coordinate space of the [potentially transformed] 'g' element
        var pointInTransformSpace = MIL.TransposePointer(e, svgInfo.gDomElement);
        return ({ x: pointInTransformSpace.x, y: pointInTransformSpace.y });
    }

    function gesture_getStartEvent(pointerType)
    {
        var e = getPointerDownEvent(this.GetPointerID(pointerType), this.Target());
        return (e);
    }

    function gesture_getCurrentEvent(pointerType)
    {
        var e = getLatestPointerMoveEvent(this.GetPointerID(pointerType), this.Target());
        return (e);
    }

    function gesture_ink(pointerType)
    {
        if (pointerType === undefined)
        {
            return (this._ink);
        }
        else
        {
            var pointerID = this.GetPointerID(pointerType);
            var e = getPointerDownEvent(pointerID, this.Target());

            if (_inkCompletePathPointData[pointerID] !== undefined)
            {
                throw "Inking has already started for gesture '" + this.Name() + "'";
            }

            _inkCurrentPathPointData[pointerID] = []; // Reset point data
            _inkCompletePathPointData[pointerID] = []; // Reset point data

            this._ink = new Ink(pointerID).ParentGesture(this);

            return (this._ink);
        }
    }

    // Public
    /**
     * Combines the supplied Inks into a single Ink, which will have a new [convex] hull that covers the combined Ink paths.
     * Returns a new Ink instance.
     * @param {Ink[]} inksToCombine The array of Inks to combine.
     * @param {String} className The name of the class to apply to the combined ink.
     * @param {Boolean} [makeInkPathMatchHull] When true, the path of the new ink will match the new [convex] hull [eg. when combining 2 paths that are "grouping containers"]
     * @returns {Ink} The resulting [new] combined Ink.
     */
    function gesture_combineInks(inksToCombine, className, makeInkPathMatchHull)
    {
        if (inksToCombine.length == 0)
        {
            return (null);
        }

        var svgInfo = getSvgInfo(inksToCombine[0].Path());
        var dInk = "", dHull = "";
        var allPathPointArrays = []; // Array of arrays of {x, y} points
        var allVertices = []; // Array of [x, y] arrays
        var resizeGesturePointerType = "", onResizeCompleteHandler = null;
        var inkCount = 0;

        inksToCombine.forEach(function (ink)
        {
            var pathDomElement = ink.Path().node();

            dInk += pathDomElement.getAttribute("d");

            for (var i = 0; i < pathDomElement.__MILPathPointsCollection__.length; i++)
            {
                var pathPoints = pathDomElement.__MILPathPointsCollection__[i];
                var vertices = d3.range(pathPoints.length).map(function (d) { return ([pathPoints[d].x, pathPoints[d].y]); });

                allPathPointArrays.push(pathPoints);
                allVertices = allVertices.concat(vertices);
            }

            // If ANY of the combined inks allows resizing, then so will the new combined ink
            if (ink.ResizeWith())
            {
                resizeGesturePointerType = ink.ResizeWith();
                onResizeCompleteHandler = ink.OnResizeCompleteHandler();
            }

            ink.Delete();
            inkCount++;
        });

        var inkPath = svgInfo.gSelection.append("path");
        var hullPath = svgInfo.gSelection.append("path"); // Must add this AFTER adding the [new] inkPath (so that the Hull's z-order is higher)
        var hullVertices = d3.polygonHull(allVertices); // Produces a convex hull
        var hullPoints = Utils.ConvertPolygonPointsToXYPoints(hullVertices);
        var hullColor = inksToCombine[0].HullColor();

        // Note: We don't simply use _inkLineGenerator to create the hull 'd' in order to match how the hullPath
        //       is created in ink_consolidatePaths() [and how it's subsequently processed by translateHullPath()]
        for (var i = 0; i < hullPoints.length; i++)
        {
            dHull += (!dHull ? "M " : " L") + hullPoints[i].x + " " + hullPoints[i].y;
        }
        hullPath.attr("d", dHull);
        hullPath.node().style.stroke = hullPath.node().style.fill = hullColor;
        hullPath.node().style.strokeWidth = "1px";
        hullPath.classed("MILInkHullPath", true); // Just to make it easier to find the hulls using CSS selector syntax ("path.MILInkHullPath")

        if (makeInkPathMatchHull)
        {
            // Re-create the inkPath to match the new [convex] hull
            inkPath.attr("d", dHull + "Z");

            // Re-sample the inkPath [so the "density" of __MILPathPointsCollection__ remains high enough that intersection
            // detection (ie. detecting if points of the new inkPath are inside another region) continues to work well]
            var sampledHullPoints = Utils.SamplePointsFromPath(inkPath.node(), false, 5);
            if (sampledHullPoints.length > hullPoints.length)
            {
                for (var i = 0, dHull = ""; i < sampledHullPoints.length; i++)
                {
                    dHull += (!dHull ? "M " : " L") + sampledHullPoints[i].x + " " + sampledHullPoints[i].y;
                }
                inkPath.attr("d", dHull + "Z");
                hullPoints = sampledHullPoints;
            }

            inkPath.node().__MILPathPointsCollection__ = [hullPoints];
        }
        else
        {
            inkPath.attr("d", dInk);
            inkPath.node().__MILPathPointsCollection__ = allPathPointArrays;
        }
        inkPath.classed("MILInkPath", true).classed(className, true); // We add the 'MILInkPath' class just to make it easier to find the ink paths using CSS selector syntax ("path.MILInkPath") 

        // "tag" the hull with its corresponding ink path
        hullPath.node().__MILAssociatedInkPath__ = inkPath;

        var newInk = new Ink(null).Class(className).ParentGesture(this).IsNonDrawing(false).HullType(InkHullType.Convex).HullColor(hullColor);

        newInk._hullPath = hullPath; // Ink.HullPath() is read-only
        newInk._finalPath = inkPath; // Ink.FinalPath() is read-only
        newInk._combinedOutlinePathPoints = hullPoints;

        // If needed, ensure re-creation of the resize gesture
        if (resizeGesturePointerType)
        {
            newInk.ResizeWith(resizeGesturePointerType);
            newInk.OnResizeCompleteHandler(onResizeCompleteHandler);
        }

        this._ink = newInk;
        _inks.push(newInk); // Note: Must be explicitly removed via Ink.Delete()

        log(allPathPointArrays.length + " Ink paths combined by gesture '" + this.Name()  + "'");

        return (newInk);
    }

    function gesture_cancel(reason)
    {
        if (!this.IsActive())
        {
            // It's OK to cancel an inactive gesture: setting a gesture as cancelled is how recognizeGesture() [et al] flags certain gestures to be skipped
        }

        this._isCancelled = true;
        // Note: We don't reset this._activePointerList here, we'll let the normal removePointer() pathway do that

        if ((this._ink != null) && (this._ink.Path() == null))
        {
            this._ink.Cancel();
            this._ink = null;
        }

        log("Gesture '" + this.Name() + "' cancelled (reason: " + (reason || "[None]") + ")");

        if (this.GestureCancelledHandler() != null)
        {
            this.GestureCancelledHandler().call(this, (reason !== undefined) ? reason : null);
        }

        if (this._onMoveHandler != null)
        {
            this._targetDomElement.removeEventListener("pointermove", this._onMoveHandler);
            this._onMoveHandler = null;
        }

        this.ReleasePointerCapture();
    }
    // Gesture "class" [END]

    function makePointerID(e)
    {
        // Note: e.pointerId for a pen DOES NOT increment at pointerUp: it increments at pointerLeave (when the pen leaves the hover range detectable by the digitizer)
        return ("PointerID_" + e.pointerType + "_" + e.pointerId);
    }

    function getTargetElementID(targetDomElement)
    {
        if (targetDomElement.__MILID__ === undefined)
        {
            throw "The MIL TargetElementID is missing from the specified targetDomElement (" + targetDomElement.nodeName + ")";
        }

        return (targetDomElement.__MILID__);
    }

    function tagWithTargetElementID(targetDomElement)
    {
        if (targetDomElement.__MILID__ === undefined)
        {
            if (_targetElementID[targetDomElement.nodeName] === undefined)
            {
                _targetElementID[targetDomElement.nodeName] = 1;
            }
            else
            {
                _targetElementID[targetDomElement.nodeName]++;
            }

            // Note: By tagging the DOM element we can (if needed) locate the element later on
            targetDomElement.__MILID__ = targetDomElement.nodeName + "_" + _targetElementID[targetDomElement.nodeName];
        }
    }

    function onContextMenu(e)
    {
        if (!getSvgInfo(e.target).settings.IsRightMouseClickAllowed())
        {
            e.preventDefault();
            return;
        }
    }

    function isEventProcessable(currentTarget, e)
    {
        // This is just a sanity check
        if (currentTarget != e.currentTarget)
        {
            debugger;
        }

        // This is the case where we've redispatched an event to the SVG element [after our gestures on the SVG
        // didn't hit] to be processed by the handlers that the user may have added directly to the SVG element
        if (e.__MILRedispatchedToSvg__)
        {
            return (false);
        }

        return (true);
    }

    function onPointerDown(e)
    {
        if (!isEventProcessable(this, e))
        {
            return;
        }

        endHover(e); // Hover-cancel
        addPointer(e);
        queueEventForPropagation(e);
    }

    function onPointerMove(e)
    {
        if (!isEventProcessable(this, e))
        {
            return;
        }

        var pointerID = makePointerID(e);
        var targetDomElement = e.currentTarget;
        var targetElementID = getTargetElementID(targetDomElement);

        // log("DEBUG: PointerMove [" + pointerID + " on " + targetElementID + "] Buttons = " + e.buttons);

        if (_activePointerLatestMoveEvents[targetElementID])
        {
            // Are we getting a PointerMove before either a PointerDown (or after a PointerUp) or a 'hover-start'? If so, ignore the event
            var hasPointerDownHappened = Boolean(_activePointerDownEvents[targetElementID]) && _activePointerDownEvents[targetElementID].hasOwnProperty(pointerID);
            var hasHoverStartHappened = Boolean(_activeHoverEvents[targetElementID]) && _activeHoverEvents[targetElementID].hasOwnProperty(pointerID);
            if (!hasPointerDownHappened && !hasHoverStartHappened)
            {
                return;
            }

            // PointerMove should only ever update _activePointerLatestMoveEvents[targetElementID][pointerID], NOT create it.
            // This ensures that we confine tracking of adding/removing of pointers to addPointer()/removePointer().
            if (!_activePointerLatestMoveEvents[targetElementID][pointerID])
            {
                return;
            }

            e.__MILTimeStamp__ = Date.now(); // e.TimeStamp is not consistent bewteen IE11 and Chrome, so we add our own
            _activePointerLatestMoveEvents[targetElementID][pointerID] = e;
        }

        queueEventForPropagation(e);

        // Pass the event along to the Ink (if any) that's currently using [ie. is being created with] this pointer
        if (_inkCompletePathPointData[pointerID])
        {
            var gesture = getInkingGesture(pointerID);

            if (!gesture.IsCancelled())
            {
                gesture.Ink().OnPointerMove(e);
            }
        }
    }

    function onPointerUp(e)
    {
        if (!isEventProcessable(this, e))
        {
            return;
        }

        removePointer(e);
        queueEventForPropagation(e);
    }

    function queueEventForPropagation(e)
    {
        // While we wait to see if our gesture recognition will succeed - or if a recognized gesture will complete - we [temporarily] prevent downstream handlers from getting the event
        // [we'll dispatch the event later on if our recognition fails (or the gesture completion timeout expires)]
        if (isAcquiringPointers() || isAwaitingGestureCompletion())
        {
            // Add a property so that we can easily detect the events that we redispatch (and their age)
            if (e.__MILRedispatchedToParent__ === undefined)
            {
                e.__MILRedispatchedToParent__ = Date.now();
            }
            else
            {
                // The event has been previously redispatched, and now it's being queued having been received by a parent.
                // In this case we don't update the value (time) of __MILRedispatchedToParent__, we keep the original.
            }

            // log("Queuing " + e.type + " (targeting " + (e.currentTarget.__MILID__ || "?") + ")");
            _postponedPointerEvents.push(e);

            // Prevent parent+peer handlers from processing the event
            if ((e.type == "pointermove") && isAwaitingGestureCompletion())
            {
                // If we're waiting for a gesture to complete we allow peer-handlers to process pointerMove events, since otherwise
                // the gesture's OnMoveHandler() [if any] won't receive events during the completion timeout period [and processing
                // these events may be required to let the gesture be completed (by the user) before the completion-timer cancels it]
                e.stopPropagation();
            }
            else
            {
                e.stopImmediatePropagation();
            }
        }
    }

    function removeTemporaryHoverMoveHandler(hoverInfo)
    {
        if (hoverInfo.hoverMoveHandler)
        {
            hoverInfo.targetDomElement.removeEventListener("pointermove", hoverInfo.hoverMoveHandler);
            hoverInfo.hoverMoveHandler = null;
            log("Removed temporary 'hover-start' pointerMove handler (for " + getTargetElementID(hoverInfo.targetDomElement) + ")", FeatureNames.Hover);
        }
    }

    // Handles hover ending (as a result of either a pointerLeave or pointerDown)
    // Note: 'forceEnd' parameter is optional
    function endHover(e, forceEnd)
    {
        if (forceEnd === undefined)
        {
            forceEnd = false;
        }

        if (!canHover(e.pointerType, e.currentTarget))
        {
            return;
        }

        var pointerID = makePointerID(e);
        var targetDomElement = e.currentTarget;
        var targetElementID = getTargetElementID(targetDomElement);

        if (((e.type == "pointerleave") && (e.buttons == 0)) || // Hover
            ((e.type == "pointerdown") && (e.buttons > 0)) ||   // Contact [optionally with one or more buttons pressed]
            forceEnd)    
        {
            if (_activeHoverTimerInfo[pointerID] && (_activeHoverTimerInfo[pointerID].timerID > 0))
            {
                clearTimeout(_activeHoverTimerInfo[pointerID].timerID);
                removeTemporaryHoverMoveHandler(_activeHoverTimerInfo[pointerID]);
                delete _activeHoverTimerInfo[pointerID];
            }

            if (_activeHoverEvents[targetElementID] && _activeHoverEvents[targetElementID][pointerID])
            {
                switch (e.type)
                {
                    case "pointerleave":
                        log("Hover ended [due to pointerLeave] for '" + targetElementID + "' using '" + pointerID + "'", FeatureNames.Hover);
                        break;
                    case "pointerdown":
                        log("Hover cancelled [due to contact] for '" + targetElementID + "' using '" + pointerID + "'", FeatureNames.Hover);
                        break;
                }
                removePointer(e);
            }
        }
    }

    function onPointerEnter(e)
    {
        if (!isEventProcessable(this, e))
        {
            return;
        }

        var pointerID = makePointerID(e);
        var targetDomElement = e.currentTarget;
        var targetElementID = getTargetElementID(targetDomElement);

        log("DEBUG: PointerEnter [" + pointerID + " on " + targetElementID + "] Buttons = " + e.buttons);

        // Hover-start
        if (canHover(e.pointerType, e.currentTarget))
        {
            if (e.buttons === 0) // Hover [we handle Contact (ie. hover-cancel) in onPointerDown()]
            {
                // Any given pointer can only hover over one element at-a-time
                var existingHoverTargetElementID = getHoverTarget(pointerID);
                if (existingHoverTargetElementID != null)
                {
                    log("Ignoring PointerEnter for '" + pointerID + "' on '" + targetElementID + "' (reason: the pointer is already being used in a hover for '" + existingHoverTargetElementID + "')", FeatureNames.Hover);
                    return;
                }

                var settings = getSvgInfo(targetDomElement).settings;
                var latestMoveEvent = null;
                var onMoveHandler = function (e)
                {
                    // Keep track of the pointer position while we wait for waitForHover() to tick
                    latestMoveEvent = e;

                    // Note: Because waitForHover() [see below] executes asynchronously [rather than directly in an event handler], the 'currentTarget'
                    //       property of either 'e' or 'latestMoveEvent' will be null, so we save currentTarget in e.__MILCurrentTarget__
                    latestMoveEvent.__MILCurrentTarget__ = e.currentTarget;
                }; 

                // Only the most recent [ie. top-most] e.currentTarget of pointerID will become the hover target, because pointerEnter events appear to be
                // raised on elements in z-index order (for the elements under the pointer). TODO: Is this the same for all browsers [because we are relying on it]?
                if (_activeHoverTimerInfo[pointerID] && (_activeHoverTimerInfo[pointerID].timerID > 0))
                {
                    clearTimeout(_activeHoverTimerInfo[pointerID].timerID);
                    removeTemporaryHoverMoveHandler(_activeHoverTimerInfo[pointerID]);
                }

                // A hover doesn't start immediately, it requires settings.HoverTimeoutInMs() to elapse first
                var timerID = setTimeout(function waitForHover()
                {
                    log("Hover started for '" + targetElementID + "' using '" + pointerID + "'", FeatureNames.Hover);
                    removeTemporaryHoverMoveHandler(_activeHoverTimerInfo[pointerID]);
                    delete _activeHoverTimerInfo[pointerID];

                    var pointerEnterEvent = e;
                    pointerEnterEvent.__MILCurrentTarget__ = targetDomElement;

                    if ((settings.HoverTimeoutInMs() > 0) && (latestMoveEvent != null))
                    {
                        // Note: We can't just use 'e' in the call to addPointer() below because the position
                        //       of 'e' is stale by HoverTimeoutInMs(), so we use latestMoveEvent instead
                        pointerEnterEvent = latestMoveEvent;
                    }
                    pointerEnterEvent.__MILIsMILHoverStartEvent__ = true; // Flag the event as being the one that represents a hover-start

                    // Note: pointerEnterEvent.currentTarget will always be null [see note about __MILCurrentTarget__ above]
                    addPointer(pointerEnterEvent);

                    // Note: We don't actually propagate hover-related events: the purpose of enqueing it is purely to mark the queue as needing to be purged [see propagateQueuedEvents()]
                    queueEventForPropagation(pointerEnterEvent);
                }, settings.HoverTimeoutInMs());

                _activeHoverTimerInfo[pointerID] = { timerID: timerID, targetDomElement: targetDomElement, hoverMoveHandler: null };

                if (settings.HoverTimeoutInMs() > 0)
                {
                    // This listener is only temporary and will be removed when hover starts, or is cancelled (by contact), or ends (pointerLeave)
                    targetDomElement.addEventListener("pointermove", onMoveHandler);
                    _activeHoverTimerInfo[pointerID].hoverMoveHandler = onMoveHandler;
                    log("Added temporary 'hover-start' pointerMove handler (for " + targetElementID + ")", FeatureNames.Hover);
                }
            }
        }
    }

    function onPointerLeave(e)
    {
        // Note: We'll get a pointerLeave event for the SVG element when a child element (like a circle) - or even the SVG itself - captures the pointer.
        //       We'll get another pointerLeave for both the circle and the SVG when the pointer is lifted from the circle. 

        var pointerID = makePointerID(e);
        var targetDomElement = e.currentTarget;
        var targetElementID = getTargetElementID(targetDomElement);

        // log("DEBUG: PointerLeave [" + pointerID + " on " + targetElementID + "] Buttons = " + e.buttons);

        // Treat a pointer moving outside the SVG element the same as if the pointer had been lifted
        if ((e.currentTarget instanceof SVGSVGElement) && (e.buttons != 0)) // The buttons check is so that we ignore [pen] hover [we want the code below to apply only if the pointer is in contact]
        {
            var svgInfo = getSvgInfo(e.target);

            // Note: e.offsetX/Y is relative to the SVG element [offsetX/Y 0,0 is always the top-left corner]
            //       We want to use offsetX/Y (not clientX/Y) in this instance.
            if ((e.offsetX < 0) || (e.offsetY < 0) || (e.offsetX > (svgInfo.svgWidth - 1)) || (e.offsetY > (svgInfo.svgHeight - 1)))
            {
                onPointerUp.call(this, e);
            }
        }

        endHover(e); // Hover-end
    }

    function onPointerCancel(e)
    {
        var pointerID = makePointerID(e);
        var targetDomElement = e.currentTarget;
        var targetElementID = getTargetElementID(targetDomElement);

        log("DEBUG: PointerCancel [" + pointerID + " on " + targetElementID + "]");

        // PointerCancel rarely occurs, but if is does happen we need to ensure that the pointer gets removed
        if (isHoverPointer(pointerID))
        {
            endHover(e, true);
        }
        else
        {
            onPointerUp.call(this, e);
        }
    }

    function addPointer(e)
    {
        var pointerID = makePointerID(e);
        var targetDomElement = e.currentTarget || e.__MILCurrentTarget__; // We use "|| e.__MILCurrentTarget__" to handle being called via waitForHover() in onPointerEnter()
        var targetElementID = getTargetElementID(targetDomElement);
        var maxRecognitionTimeoutInMs = -2; // -1 means "from pointer-up" to recognizeGesture(), so we use -2 to mean "not yet assigned" to avoid potential confusion
        var definedMaxRecognitionTimeoutInMs = -2; // Ditto

        e.__MILTimeStamp__ = Date.now(); // e.TimeStamp is not consistent bewteen IE11 and Chrome, so we add our own

        log("Adding " + pointerID + " [to " + targetElementID + "]" + ((e.type != "pointerdown") ? " [via " + e.type + "]" : ""));

        if (e.type == "pointerdown")
        {
            if (_activePointerDownEvents[targetElementID] === undefined)
            {
                _activePointerDownEvents[targetElementID] = {};
                _activePointerDownStartTime[targetElementID] = Date.now();
            }
            _activePointerDownEvents[targetElementID][pointerID] = e;
        }

        if (e.__MILIsMILHoverStartEvent__ === true)
        {
            if (_activeHoverEvents[targetElementID] === undefined)
            {
                _activeHoverEvents[targetElementID] = {};
                _activeHoverStartTime[targetElementID] = Date.now(); 
            }
            _activeHoverEvents[targetElementID][pointerID] = e;
        }

        if (_activePointerLatestMoveEvents[targetElementID] === undefined)
        {
            _activePointerLatestMoveEvents[targetElementID] = {};
        }
        _activePointerLatestMoveEvents[targetElementID][pointerID] = e; // Note: This will be a PointerDown event, not a PointerMove

        // Note: We optimize computing maxRecognitionTimeoutInMs based on the PointerTypes used by the gestures defined on targetElementID, eg:
        // For the gestures ({PointerType,RecognitionTimeoutInMs}) {pen,0}, {touch:2,150}, {touch+mouse,200}:
        //   - maxRecognitionTimeout[pen] = 0
        //   - maxRecognitionTimeout[touch] = 200
        //   - maxRecognitionTimeout[mouse] = 200
        // Thus (in this example), if we're responding to a pen pointerDown we can immediately call recognizeGesture() rather than waiting for 200ms
        // [as we would if we were just blindly using Max(RecognitionTimeoutInMs)]
        for (var g = 0; g < _gestures.length; g++)
        {
            var gesture = _gestures[g];
            if (gesture.Target() == targetDomElement)
            {
                if ((gesture.PointerType().indexOf(e.pointerType) != -1) || (gesture.PointerType() == "any") || (canHover(e.pointerType, targetDomElement) && (gesture.PointerType().indexOf("hover") != -1)))
                {
                    maxRecognitionTimeoutInMs = definedMaxRecognitionTimeoutInMs = Math.max(maxRecognitionTimeoutInMs, gesture.RecognitionTimeoutInMs());
                }
            }
        }

        if (maxRecognitionTimeoutInMs == -2)
        {
            log("There are no gestures on '" + targetElementID + "' that use pointerType '" + e.pointerType + "'");
            return;
        }

        // For a propagated pointerDown event, reduce maxRecognitionTimeoutInMs by the age of the event. This makes gesture recognition on parent elements faster.
        if (IsPropagatedEvent(e) && (maxRecognitionTimeoutInMs > 0))
        {
            var eventAgeInMs = Date.now() - e.__MILRedispatchedToParent__;
            // Note: We set maxRecognitionTimeoutInMs to at least 1ms to avoid affecting the code-path we'll follow below
            maxRecognitionTimeoutInMs = Math.max(1, maxRecognitionTimeoutInMs - eventAgeInMs);
        }

        // If not already in the "acquiring" phase, kick-off a [delayed] gesture recognition (the delay allows enough time for the required pointers to make contact with the screen)
        if (!_isAcquiringPointers[targetElementID])
        {
            _isAcquiringPointers[targetElementID] = true;
            _gestureRecognitionRan[targetElementID] = false;

            if (_postponedPointerEvents.length > 0)
            {
                log("Clearing " + _postponedPointerEvents.length + " queued pointer events", FeatureNames.GestureRecognition);
                _postponedPointerEvents.length = 0;
            }

            if (maxRecognitionTimeoutInMs == 0) // A timeout of zero only makes sense for a single-pointer gesture
            {
                var recognitionResult = recognizeGesture(targetDomElement, maxRecognitionTimeoutInMs, definedMaxRecognitionTimeoutInMs);
                if (recognitionResult.success)
                {
                    // We handled the pointer event, so we prevent parent+peer handlers from also processing it
                    e.stopImmediatePropagation();
                }
            }
            else
            {
                startRecognizeGestureTimer(targetElementID, function ()
                {
                    var recognitionResult = recognizeGesture(targetDomElement, maxRecognitionTimeoutInMs, definedMaxRecognitionTimeoutInMs);
                    if (!recognitionResult.success && recognitionResult.propagateEvents)
                    {
                        // Propagate any queued events to allow any gestures on the target's parent element to be recognized
                        // Note: Because inking can't be started until a gesture's GestureStartedHandler() is called, these postponed events will get
                        //       processed [in a quick burst] by Gesture.Ink().OnPointerMove(). This will manifest as a delay in initial ink responsiveness.
                        propagateQueuedEvents(targetDomElement);
                    }
                }, maxRecognitionTimeoutInMs);
            }
        }
    }

    // Returns the targetElementID that the specified pointerID is currently hovering over; returns null if the pointer is not hovering
    function getHoverTarget(targetPointerID)
    {
        for (var targetElementID in _activeHoverEvents)
        {
            for (var pointerID in _activeHoverEvents[targetElementID])
            {
                if (pointerID == targetPointerID)
                {
                    return (targetElementID);
                }
            }
        }
        return (null);
    }

    // Returns true if the specified targetPointerID is currently being used in a hover
    function isHoverPointer(targetPointerID)
    {
        return (getHoverTarget(targetPointerID) != null);
    }

    // Returns true if the specified pointerType (or pointerID) is capable of hover behavior
    function canHover(pointerTypeOrID, targetDomElement)
    {
        var pointerType = "";
        var settings = getSvgInfo(targetDomElement).settings;

        if (settings.HoverTimeoutInMs() < 0) // -1 indicates that hovering should be disabled
        {
            return (false);
        }

        // Hovering on the SVG is disallowed because we won't get a pointerLeave for the SVG (thus ending the hover)
        // until the pointer leaves the *entire* SVG area - so no further hover "events" on other elements can happen
        if (targetDomElement instanceof SVGSVGElement)
        {
            return (false);
        }

        // Handle the case of pointerTypeOrID being a pointerID
        if (pointerTypeOrID.indexOf("_") != -1)
        {
            pointerType = pointerTypeOrID.split("_")[1];
        }
        else
        {
            pointerType = pointerTypeOrID;
        }

        // Note: Our current approach of treating "hover" as a distinct PointerType does not allow us to readily distinguish between a pen-hover and a mouse-hover.
        return ((pointerType == "pen") || (pointerType == "mouse"));
    }

    function propagateQueuedEvents(targetDomElement)
    {
        if (_postponedPointerEvents.length == 0)
        {
            log("There are no events to propagate");
            return;
        }

        var eventList = [];
        var atSVGRoot = (targetDomElement instanceof SVGSVGElement); // This is a special case: we want to redispatch back to the SVG element to be picked up by any user-installed handlers on the SVG element
        var parentDomElement = atSVGRoot ? targetDomElement : (targetDomElement.parentElement || targetDomElement.parentNode);

        if (!parentDomElement)
        {
            return;
        }

        // Propagating "hover" events (pointerEnter/Move/Leave) is potentially problematic, both technically (due to the delayed nature of a "hover-start" 
        // and the less deterministic nature of pointerEnter/Leave events) as well as logically (due to the fact that the target being propagated to is 
        // usually partially occluded by the element that didn't have a hover gesture of its own).
        // So to avoid dealing with this added complexity we simply abort propagation if we encounter a "hover-start" event.
        for (var i = 0; i < _postponedPointerEvents.length; i++)
        {
            if (_postponedPointerEvents[0].__MILIsMILHoverStartEvent__ === true)
            {
                log("Event propagation skipped (reason: The queue contains a 'hover-start' event); Clearing " + _postponedPointerEvents.length + " queued pointer events");
                _postponedPointerEvents.length = 0;
                return;
            }
        }

        if (_postponedPointerEvents[0].type != "pointerdown")
        {
            throw ("The postponed pointer-event queue must always start with a 'pointerdown' event"); // See comments at end of function
        }

        // First, we make a copy of _postponedPointerEvents [since as we dispatch the 'pointerdown' event the onPointerDown handler will reset _postponedPointerEvents]
        for (var i = 0; i < _postponedPointerEvents.length; i++)
        {
            eventList.push(_postponedPointerEvents[i]);
        }
        
        for (var i = 0; i < eventList.length; i++)
        {
            var e = eventList[i];

            // Aside: This is far simpler, but not available in IE11
            // var newEvent = Object.assign({}, e);

            // Propagate the event (to - potentially - either MIL or non-MIL handlers)
            // Note: We have to create a clone of the event (e) because a received event cannot be re-dispatched [dispatchEvent() will throw a NotSupportedError]
            log("Propagating " + e.type + " (" + e.pointerType + ")...");
            var newEvent = document.createEvent("Event");

            newEvent.initEvent(e.type, true, true);

            for (var prop in e)
            {
                // Note: Some properties of an event (eg. eventPhase, isTrusted, srcElement, target, timeStamp) are read-only so the
                //       assignment below will silently fail due to the "Cannot assign new value to a read-only attribute" condition.
                //       However, these values will become set when the event is dispatched.
                newEvent[prop] = e[prop];
            }

            if (atSVGRoot)
            {
                // Replace the __MILRedispatchedToParent__ property with the __MILRedispatchedToSvg__ property
                newEvent.__MILRedispatchedToSvg__ = newEvent.__MILRedispatchedToParent__;
                delete newEvent.__MILRedispatchedToParent__;
            }

            parentDomElement.dispatchEvent(newEvent);
        }

        // Note: Do NOT clear _postponedPointerEvents here [since as we disptached events the onPointerDown/Move/Up handlers may have queued them].
        //       To prevent the same event being enqueued twice, we rely on the fact that _postponedPointerEvents ALWAYS starts with a
        //       'pointerdown' event, which - when dispatched - will clear _postponedPointerEvents (via onPointerDown -> addPointer).
    }

    function removePointer(e)
    {
        var liftedPointerID = makePointerID(e);
        var targetElementID = getTargetElementID(e.currentTarget || e.target); // We use "|| e.target" to handle being called with a pointerMove event
        var endedGestures = [];

        log("Removing " + liftedPointerID + " [from " + targetElementID + "]" + ((e.type != "pointerup") ? " [via " + e.type + "]" : ""));

        // Handle the case where a pointer is removed BEFORE recognizeGesture() has run [typically
        // this happens if a pointer is lifted before the maximum RecognitionTimeoutInMs elapses].
        // Note that we only handle this once [if at all], when the first pointer is removed.
        if ((_gestureRecognitionRan[targetElementID] === false) && (e.type == "pointerup"))
        {
            var targetDomElement = e.currentTarget;
            recognizeGesture(targetDomElement, -1, -1);
        }

        // Call the GestureEndHandler (and update the PointerList) for any gesture that is using this pointerID
        for (var g = 0; g < _gestures.length; g++)
        {
            var gesture = _gestures[g];
            var pointerList = gesture.ActivePointerList();
            var isGestureUsingLiftedPointerID = false;

            for (var i = 0; i < pointerList.length; i++)
            {
                if (pointerList[i] == liftedPointerID)
                {
                    isGestureUsingLiftedPointerID = true;
                    break;
                }
            }

            if (isGestureUsingLiftedPointerID)
            {
                gesture.ReleasePointerCapture();

                if (!gesture.IsCancelled())
                {
                    var ink = gesture.Ink();
                    if ((ink != null) && (ink.PointerID() == liftedPointerID))
                    {
                        ink.OnPointerUp(e);
                    }

                    gesture._endedTime = Date.now();

                    if (gesture.GestureEndedHandler() != null)
                    {
                        gesture.GestureEndedHandler().call(gesture, liftedPointerID);
                    }

                    endedGestures.push(gesture);
                }

                if (gesture.OnMoveHandler() != null)
                {
                    // Remove the handler
                    gesture.OnMoveHandler(null);
                }

                gesture._activePointerList.length = 0;
                gesture._activePointerTypeOrdinals.length = 0;

                // We handled the pointer event, so we prevent parent+peer handlers from also processing it
                e.stopImmediatePropagation();
            }
        }

        var deletedItems = "";

        for (var targetElementID in _activePointerDownEvents)
        {
            if (_activePointerDownEvents[targetElementID][liftedPointerID])
            {
                delete _activePointerDownEvents[targetElementID][liftedPointerID];
                deletedItems += "_activePointerDownEvents[" + targetElementID + "][" + liftedPointerID + "] ";
            }
            if (Object.keys(_activePointerDownEvents[targetElementID]).length == 0)
            {
                delete _activePointerDownEvents[targetElementID];
                delete _activePointerDownStartTime[targetElementID];
                deletedItems += "_activePointerDownEvents[" + targetElementID + "] ";
            }
        }

        for (var targetElementID in _activeHoverEvents)
        {
            if (_activeHoverEvents[targetElementID][liftedPointerID])
            {
                delete _activeHoverEvents[targetElementID][liftedPointerID];
                deletedItems += "_activeHoverEvents[" + targetElementID + "][" + liftedPointerID + "] ";
            }
            if (Object.keys(_activeHoverEvents[targetElementID]).length == 0)
            {
                delete _activeHoverEvents[targetElementID];
                delete _activeHoverStartTime[targetElementID];
                deletedItems += "_activeHoverEvents[" + targetElementID + "] ";
            }
        }

        for (var targetElementID in _activePointerLatestMoveEvents)
        {
            if (_activePointerLatestMoveEvents[targetElementID][liftedPointerID])
            {
                delete _activePointerLatestMoveEvents[targetElementID][liftedPointerID];
                deletedItems += "_activePointerLatestMoveEvents[" + targetElementID + "][" + liftedPointerID + "] ";
            }
            if (Object.keys(_activePointerLatestMoveEvents[targetElementID]).length == 0)
            {
                delete _activePointerLatestMoveEvents[targetElementID];
                deletedItems += "_activePointerLatestMoveEvents[" + targetElementID + "] ";
            }
        }

        if (deletedItems)
        {
            log("Removed " + deletedItems);
        }

        // For each ended gesture, [optionally] look for another gesture that may still be applicable [ie. with the one-or-more pointers that may still be down].
        // For example, the user wants a 2-finger zoom to become a 1-finger pan when the first zoom finger is lifted.
        for (var i = 0; i < endedGestures.length; i++)
        {
            var gesture = endedGestures[i];

            if (gesture.CheckForGesturesOnEnd())
            {
                // We use a short timeout here to avoid unintentional gesture recognition due to 2 or more pointers being removed within the timeout interval
                // [eg. preventing a 2-fingered 'zoom' from always ending with a 1-fingered 'pan' just because the first finger is lifted a few milliseconds before the second finger]
                startRecognizeGestureTimer(targetElementID, function ()
                {
                    recognizeGesture(gesture.Target(), 0, 0, false);
                }, 200);
                break;
            }
        }
    }

    function startRecognizeGestureTimer(targetElementID, callback, timeoutInMs)
    {
        if (_recognizeGestureTimerID[targetElementID] >= 0)
        {
            log("Recognize-gesture timer not started (reason: An existing timer (ID:" + _recognizeGestureTimerID[targetElementID] + ") has already been started for '" + targetElementID + "')", FeatureNames.GestureRecognition);
        }
        else
        {
            var timerID = setTimeout(function ()
            {
                _recognizeGestureTimerID[targetElementID] = -1; // The timer has ticked
                callback(); // Calls recognizeGesture()
            }, timeoutInMs);

            _recognizeGestureTimerID[targetElementID] = timerID;
            log("Recognize-gesture timer (ID:" + timerID + ", " + timeoutInMs + "ms) started for '" + targetElementID + "'", FeatureNames.GestureRecognition);
        }
    }

    function cancelRecognizeGestureTimer(targetElementID)
    {
        var timerID = _recognizeGestureTimerID[targetElementID];

        if (timerID >= 0)
        {
            clearTimeout(timerID);
            _recognizeGestureTimerID[targetElementID] = -1;
            log("Recognize-gesture timer (ID:" + timerID + ") cancelled for '" + targetElementID + "'", FeatureNames.GestureRecognition);
        }
    }

    // Returns { success: true|false, propagateEvents: true|false }
    function recognizeGesture(targetDomElement, actualRecognitionTimeoutInMs, maxRecognitionTimeoutInMs, allowSimultaneousGestureInstances)
    {
        var targetElementID = getTargetElementID(targetDomElement);
        var isFromPointerUp = (actualRecognitionTimeoutInMs == -1);
        var recognizedGesture = null;
        var pointerTypePermutationIndex = 0;
        var gestureName = "";
        var pointerList = [];
        var touchCount = 0;
        var penCount = 0; // Will only ever be 0 or 1
        var mouseCount = 0; // Will only ever be 0 or 1
        var hoverCount = 0;
        var requiredTouchCount = 0;
        var requiredPenCount = 0; // Will only ever be 0 or 1
        var requiredMouseCount = 0; // Will only ever be 0 or 1
        var requiredHoverCount = 0;
        var requiredAnyCount = 0;
        var recognitionResult = { success: false, propagateEvents: true };
        var continueSearching = true;

        if (allowSimultaneousGestureInstances === undefined)
        {
            allowSimultaneousGestureInstances = true;
        }

        log("Starting gesture recognition" + (isFromPointerUp ? " [during pointer-up]" : (" [after " + actualRecognitionTimeoutInMs + "ms]")) + " on '" + targetElementID + "'...", FeatureNames.GestureRecognition);

        // Cancel any pending recognition timer
        cancelRecognizeGestureTimer(targetElementID);

        // Match _activePointerDownEvents (for targetDomElement) to _gestures (that target targetDomElement)
        for (var pointerID in _activePointerDownEvents[targetElementID])
        {
            switch (_activePointerDownEvents[targetElementID][pointerID].pointerType)
            {
                case "touch":
                    touchCount++;
                    break;
                case "pen":
                    penCount++;
                    break;
                case "mouse":
                    mouseCount++;
                    break;
            }
            pointerList.push(pointerID);
        }

        for (var pointerID in _activeHoverEvents[targetElementID])
        {
            hoverCount++;
            pointerList.push(pointerID);
        }

        if ((penCount == 0) && (touchCount == 0) && (mouseCount == 0) && (hoverCount == 0))
        {
            // The timer that called recognizeGesture() ticked AFTER all pointers have been removed
            log("Gesture recognition skipped (reason: There are no active pointers" + ((maxRecognitionTimeoutInMs > 0) ? "; the largest RecognitionTimeoutInMs (" + maxRecognitionTimeoutInMs + "ms) for gestures on '" + targetElementID + "' may be too long)" : ")"), FeatureNames.GestureRecognition);
            _isAcquiringPointers[targetElementID] = false;
            _gestureRecognitionRan[targetElementID] = true;
            return (recognitionResult);
        }

        log("Looking for gestures on " + targetElementID + " that require pen:" + penCount + "+touch:" + touchCount + "+mouse:" + mouseCount + "+hover:" + hoverCount, FeatureNames.GestureRecognition);

        for (var g = 0; (g < _gestures.length) && continueSearching; g++)
        {
            var gesture = _gestures[g];
            var isMatch = true;

            if (gesture.Target() != targetDomElement)
            {
                continue;
            }

            if (!gesture.IsEnabled())
            {
                log("Skipping gesture '" + gesture.Name() + "' (reason: gesture is disabled)", FeatureNames.GestureRecognition);
                continue;
            }

            // If ANY gesture [even if NOT recognized] on the target doesn't allow events to be propagated, then we prevent propagation
            recognitionResult.propagateEvents = (recognitionResult.propagateEvents && gesture._allowEventPropagation);

            if (gesture.IsActive() && !allowSimultaneousGestureInstances)
            {
                log("Skipping gesture '" + gesture.Name() + "' (reason: gesture is already active" + (gesture.IsCancelled() ? " [cancelled]" : "") + ")", FeatureNames.GestureRecognition);
                continue;
            }

            var isIncompleteRecognition = (gesture._repeatOccurrenceCount > 0) && gesture.IsCancelled();
            if (isIncompleteRecognition)
            {
                // One (or more) occurrence of a repeating gesture has happened, but the next occurrence took too long so the gesture was cancelled
                log("Skipping gesture '" + gesture.Name() + "' (reason: repeating gesture is incomplete [occurrence " + (gesture._repeatOccurrenceCount + 1) + " of " + gesture.RepeatCount()  + " timed-out])");
                continue;
            }

            for (pointerTypePermutationIndex = 0; pointerTypePermutationIndex < gesture._pointerTypePermutations.length; pointerTypePermutationIndex++)
            {
                // pointerType can be of the form "touch:2+pen" or "touch+touch+pen"
                var pointerType = gesture._pointerTypePermutations[pointerTypePermutationIndex];
                var types = pointerType.split("+");

                isMatch = true;
                requiredTouchCount = 0;
                requiredPenCount = 0;
                requiredMouseCount = 0;
                requiredHoverCount = 0;
                requiredAnyCount = 0;

                for (var i = 0; i < types.length; i++)
                {
                    var parts = types[i].split(":");
                    var type = parts[0];
                    var requiredCount = (parts.length == 1) ? 1 : +parts[1];

                    switch (type)
                    {
                        case "touch":
                            requiredTouchCount += requiredCount;
                            break;
                        case "pen":
                            requiredPenCount += requiredCount;
                            break;
                        case "mouse":
                            requiredMouseCount += requiredCount;
                            break;
                        case "hover":
                            requiredHoverCount += requiredCount;
                            break;
                        case "any":
                            requiredAnyCount += requiredCount;
                            break;
                    }
                }

                // Check when the gesture needs an input that the number of actual inputs matches
                if (requiredTouchCount > 0)
                {
                    isMatch = isMatch && (touchCount == requiredTouchCount);
                }
                if (requiredPenCount > 0)
                {
                    isMatch = isMatch && (penCount == requiredPenCount);
                }
                if (requiredMouseCount > 0)
                {
                    isMatch = isMatch && (mouseCount == requiredMouseCount);
                }
                if (requiredHoverCount > 0)
                {
                    isMatch = isMatch && (hoverCount == requiredHoverCount);
                }
                if (requiredAnyCount > 0)
                {
                    isMatch = isMatch && (touchCount + penCount + mouseCount + hoverCount == requiredAnyCount);
                }

                // Check when we have inputs that the gesture actually needs them
                if (touchCount > 0)
                {
                    isMatch = isMatch && ((requiredTouchCount > 0) || (requiredAnyCount > 0));
                }
                if (penCount > 0)
                {
                    isMatch = isMatch && ((requiredPenCount > 0) || (requiredAnyCount > 0));
                }
                if (mouseCount > 0)
                {
                    isMatch = isMatch && ((requiredMouseCount > 0) || (requiredAnyCount > 0));
                }
                if (hoverCount > 0)
                {
                    isMatch = isMatch && ((requiredHoverCount > 0) || (requiredAnyCount > 0));
                }

                if (isMatch)
                {
                    if (isFromPointerUp && (gesture._completionTimeoutInMs > 0))
                    {
                        // For gestures that specify a CompletionTimeoutInMs (eg. a tap), check if the pointer-up (or pointer-leave [for hover]) is happening during the completion window
                        var elapsedMsFromFirstPointerDownToFirstPointerUp = Date.now() - (_activePointerDownStartTime[targetElementID] || _activeHoverStartTime[targetElementID]);
                        isMatch = (elapsedMsFromFirstPointerDownToFirstPointerUp < gesture._completionTimeoutInMs);

                        if (!isMatch)
                        {
                            log("Skipping gesture '" + gesture.Name() + "' (reason: Gesture completion time [" + elapsedMsFromFirstPointerDownToFirstPointerUp + "ms] exceeded its CompletionTimeout [" + gesture._completionTimeoutInMs + "ms])", FeatureNames.GestureRecognition);
                        }
                    }

                    if (isMatch && (gesture.Conditional() != null))
                    {
                        isMatch = gesture.Conditional().call(gesture);

                        if (!isMatch)
                        {
                            log("Skipping gesture '" + gesture.Name() + "' (reason: Conditional() returned false)", FeatureNames.GestureRecognition);
                        }
                    }

                    // Handle Gesture.RepeatCount()
                    // Note: This must be done AFTER all other 'match' checks
                    if (gesture.RepeatCount() > 1)
                    {
                        // When the target has a "repeat" gesture it gets messy/problematic to propagate events "between" the [potential] multiple-occurrences
                        if (recognitionResult.propagateEvents)
                        {
                            recognitionResult.propagateEvents = false;
                            _isAwaitingGestureCompletion[targetElementID] = false;
                            log("Warning: Preventing propagation of events on '" + targetElementID + "' because gesture '" + gesture.Name() + "' uses RepeatCount(" + gesture.RepeatCount() + ")", FeatureNames.GestureRecognition);
                        }

                        if (isMatch)
                        {
                            var timeSinceLastRecognitionInMs = Date.now() - gesture._lastRepeatRecognitionTime;

                            if (timeSinceLastRecognitionInMs > gesture.RepeatTimeoutInMs())
                            {
                                gesture._repeatOccurrenceCount = 0;
                            }

                            isMatch = (++gesture._repeatOccurrenceCount == gesture.RepeatCount()) && (timeSinceLastRecognitionInMs <= gesture.RepeatTimeoutInMs());
                            gesture._lastRepeatRecognitionTime = Date.now();

                            if (!isMatch)
                            {
                                log("Skipping gesture '" + gesture.Name() + "' (reason: Repeat conditions not met [repeatOccurrenceCount = " + gesture._repeatOccurrenceCount + ", timeSinceLastRecognitionInMs = " + timeSinceLastRecognitionInMs + "])", FeatureNames.GestureRecognition);

                                // The gesture has been "partially" recognized, so we reset the _endedTime [which gesture_startCompletionTimeout() will use to determine if the gesture ended]
                                gesture._endedTime = 0;

                                // Note: If this timeout expires it will trigger another 'recognizeGesture()' call
                                gesture_startCompletionTimeout.call(gesture, gesture.RepeatTimeoutInMs(), "repeat", false, null);

                                // Because the gesture has been "partially" recognized we have to stop looking for other matching gestures [to give a chance for the repeating gesture to fully complete]
                                // Note: For this to work, repeating gestures MUST be added [with MIL.AddGesture()] BEFORE other "competing" gestures (eg. add "DoubleTapWithTouch" before "DragWithTouch")
                                log("HALTING current search for matching gestures due to encountering a gesture with RepeatCount() > 1", FeatureNames.GestureRecognition);
                                continueSearching = false;
                                break;
                            }
                            else
                            {
                                clearTimeout(gesture._completionTimerID);
                                gesture._completionTimerID = -1;
                            }
                        }
                    }

                    if (isMatch)
                    {
                        recognizedGesture = gesture;
                        continueSearching = false;
                        break;
                    }
                }
                else
                {
                    var permutationQualifier = (gesture._pointerTypePermutations.length > 1) ? " [permutation '" + gesture._pointerTypePermutations[pointerTypePermutationIndex] + "']" : "";
                    log("Skipping gesture '" + gesture.Name() + "' (reason: PointerType()" + permutationQualifier + " does not match)", FeatureNames.GestureRecognition);
                }
            }
        }

        if (recognizedGesture != null)
        {
            recognizedGesture._activePointerList = pointerList;
            recognizedGesture._activePointerTypeOrdinals = recognizedGesture._pointerTypeOrdinals[pointerTypePermutationIndex].slice(); // Note: We use slice() just to create a copy of the array
            recognizedGesture._startedTime = Date.now();
            recognizedGesture._endedTime = 0;
            recognizedGesture._isCancelled = false;

            var permutationQualifier = (recognizedGesture._pointerTypePermutations.length > 1) ? " [permutation '" + recognizedGesture._pointerTypePermutations[pointerTypePermutationIndex] + "']" : "";
            log("Gesture '" + recognizedGesture.Name() + "'" + permutationQualifier + " recognized"); // We always want to report this message, so we don't specify FeatureNames.GestureRecognition

            // If needed, start a gesture completion timer [unless we're being called from pointer-up, in which case the gesture is already ending]
            if ((recognizedGesture._completionTimeoutInMs > 0) && !isFromPointerUp)
            {
                _isAwaitingGestureCompletion[targetElementID] = true;

                // Note: If this timeout expires it will trigger another 'recognizeGesture()' call
                gesture_startCompletionTimeout.call(recognizedGesture, recognizedGesture._completionTimeoutInMs, "completion", true, function () { _isAwaitingGestureCompletion[targetElementID] = false; });
            }

            if (recognizedGesture.GestureStartedHandler() != null)
            {
                recognizedGesture.GestureStartedHandler().call(recognizedGesture);
            }

            // Set the PointerCapture on the gesture's target.
            // Note: We do this AFTER calling the user-supplied GestureStartedHandler() since that handler may act on the
            //       target (eg. changing its 'display' attribute) in ways that could interfere with pointer capturing.
            // Note: DO NOT call setPointerCapture() on a "stale" pointerDown event (it causes strange behavior [on IE 11])
            if (!isFromPointerUp)
            {
                recognizedGesture.SetPointerCapture();
            }
        }
        else
        {
            log("No matching gesture found", FeatureNames.GestureRecognition);
        }

        log("Gesture recognition ended", FeatureNames.GestureRecognition);
        _isAcquiringPointers[targetElementID] = false;
        _gestureRecognitionRan[targetElementID] = true;

        recognitionResult.success = (recognizedGesture != null);
        return (recognitionResult);
    }

    // Returns the gesture that's currently inking using the specified pointerID (or null if there's no such gesture)
    function getInkingGesture(pointerID)
    {
        if (pointerID)
        {
            for (var g = 0; g < _gestures.length; g++)
            {
                var gesture = _gestures[g];
                var ink = gesture.Ink();

                if ((ink != null) && (ink.PointerID() != null) && (ink.PointerID() == pointerID))
                {
                    return (gesture);
                }
            }
        }
        return (null);
    }

    // Note: 'featureName' is optional; if supplied the message will only be logged if debugging has been
    //       turned on for that feature using MIL.DebugFeature() [it is on for FeatureNames.MIL by default]
    function log(message, featureName)
    {
        featureName = featureName || FeatureNames.MIL;

        if (!MIL.DebugFeature(featureName))
        {
            return;
        }

        // Note: We always use FeatureNames.MIL (NOT featureName) as the prefix
        Utils.Log(message, FeatureNames.MIL);
    }

    // Used to set/get a property of an object [when no special processing by either the getter or setter is needed]
    function getOrSetProperty(obj, propertyName, newValue)
    {
        if (!obj.hasOwnProperty(propertyName))
        {
            throw "Invalid propertyName '" + propertyName + "'";
        }

        if (newValue === undefined)
        {
            // Getter
            return (obj[propertyName]);
        }
        else
        {
            // Setter
            obj[propertyName] = newValue;
            return (obj.hasOwnProperty("_parentObj") ? obj._parentObj : obj);
        }
    }

    // Used to check if an attempt is being made to set a read-only proprty
    function readOnlyProperty(propertyName, args)
    {
        if (args.length > 0)
        {
            throw "The '" + propertyName + "' property is read-only";
        }
    }

    // These are the "public" members of the 'MIL' module
    exports.Version = Version;
    exports.Initialize = Initialize;
    exports.Settings = Settings;
    exports.FeatureNames = FeatureNames;
    exports.DebugFeature = DebugFeature;
    exports.ShowDebugInfo = ShowDebugInfo;
    exports.CreateGesture = CreateGesture;
    exports.AddGesture = AddGesture;
    exports.RemoveGestureByName = RemoveGestureByName;
    exports.RemoveGesturesByTarget = RemoveGesturesByTarget;
    exports.GetGestureByName = GetGestureByName;
    exports.GetGestureFromEvent = GetGestureFromEvent;
    exports.GetGesturesByTarget = GetGesturesByTarget;
    exports.EnableGestureGroup = EnableGestureGroup;
    exports.TransposePointer = TransposePointer;
    exports.TransposeScreenPoint = TransposeScreenPoint;
    exports.Pan = Pan;
    exports.PanRelative = PanRelative;
    exports.PanAbsolute = PanAbsolute;
    exports.Zoom = Zoom;
    exports.PenPressure = PenPressure;
    exports.PenButtons = PenButtons;
    exports.PenButton = PenButton;
    exports.IsPropagatedEvent = IsPropagatedEvent;
    exports.IsInkDragInProgress = IsInkDragInProgress;
    exports.Inks = Inks;
    exports.InkAutoCombineMode = InkAutoCombineMode;
    exports.InkHullType = InkHullType;
    exports.GetInkByElement = GetInkByElement;
    exports.GetInkByID = GetInkByID;
    exports.RecognizableShapes = RecognizableShapes;
    exports.RecognizeShape = RecognizeShape;
    exports.RecognizeRadialSwipe = RecognizeRadialSwipe;
    exports.IsInstanceOfInk = function IsInstanceOfInk(obj) { return (obj instanceof Ink); }; // Needed because we don't export the Ink constructor, so "obj instanceof MIL.Ink" won't work in the callers code
})));