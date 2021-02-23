namespace MIL
{
    /**
     * The Utils namespace.
     */
    export namespace Utils
    {
        let _keyboardHandlerEnabled: boolean = false; // Whether the keyboard handler is currently enabled
        let _currentlyPressedKeys: number[] = []; // The list of keyCodes of currently pressed keys
        let _keyUpTimerID: { [keyCode: number]: number } = {}; // Key: keyCode of currently pressed key, Value = corresponding ID of the auto-KeyUp timer

        // This should exceed the typical time a key is held prior to initiating a gesture [with one or more pointers], but it should not be so
        // long as to cause false-positives (ie. the key still appearing to be held) after the user "returns" to the page [from the browser chrome].
        // Note: JavaScript timers don't run [in IE11 at least] while a browser chrome dialog (eg. "Save Webpage") is open.
        const KEYDOWN_TIMEOUT_IN_MS = 1200;

        /** Key codes (like DELETE) that can't be expressed as a string (like "A"). */
        export enum Keys
        {
            UP = 38,
            DOWN = 40,
            LEFT = 37,
            RIGHT = 39,
            PLUS = 107,
            MINUS = 109,
            SHIFT = 16,
            CTRL = 17,
            DELETE = 46
        }

        /** Shapes that can be searched for using FindShapeElementsInRegion(). */
        export enum ShapeNodeType
        {
            /** A MIL Ink. */
            Ink = "ink",
            /** An SVG <circle>. */
            Circle = "circle",
            /** An SVG <ellipse>. */
            Ellipse = "ellipse",
            /** An SVG <rect>. */
            Rect = "rect",
            /** An SVG <line>. */
            Line = "line",
            /** An SVG <polygon>. */
            Polygon = "polygon",
            /** An SVG <polyline>. */
            PolyLine = "polyline",
            /** An SVG <path>. */
            Path = "path"
        }

        /**
         * Defines the type of a compiled 'enum' object in TypeScript 3.6 (an object with string keys (property names) and string or number property values).
         * This allows enums to be processed as objects when needed, but may break in future versions of TypeScript.
         */
        interface EnumType
        {
            [key: string]: string | number;
        }

        /**
         * Logs the specified message (with the [optional] specified prefix) to the console.
         * @param {string} message Message to log.
         * @param {string} [prefix] [Optional] Prefix for the message.
         */
        export function Log(message: string, prefix?: string): void
        {
            console.log(getTime() + ": " + (prefix ? prefix + ": " : "") + message);
        }

        /**
         * [Private Method] Returns the current time in 'MM/dd hh:mm:ss.fff' format.
         * @returns {string} Result.
         */
        function getTime(): string
        {
            let now = new Date(Date.now());
            let date = ("0" + (now.getMonth() + 1)).slice(-2) + "/" + ("0" + now.getDate()).slice(-2);
            let time = ("0" + now.getHours()).slice(-2) + ":" + ("0" + now.getMinutes()).slice(-2) + ":" + ("0" + now.getSeconds()).slice(-2) + "." + ("00" + now.getMilliseconds()).slice(-3);
            return (date + " " + time);
        }

        /**
         * [Internal] Returns true if the browser is Internet Explorer 11.
         * @returns {boolean} Result.
         * @internal
         */
        export function isIE11(): boolean
        {
            let isIE11: boolean = !!window.MSInputMethodContext && !!(document as any)["documentMode"];

            if (isIE11)
            {
                let isIERunningInCompatabilityMode: boolean = (navigator.userAgent.indexOf("Trident") !== -1) && (navigator.userAgent.indexOf("MSIE") !== -1);

                if (isIERunningInCompatabilityMode)
                {
                    log("Warning: When running MIL on IE11 'Compatability View' should be turned off (by unchecking the 'Display intranet sites in Compatability View' option under Tools -> Compatability View settings)");
                }
            }

            return (isIE11);
        }

        // See https://stackoverflow.com/questions/4565112/javascript-how-to-find-out-if-the-user-browser-is-chrome
        /**
         * [Internal] Returns true if the browser is Chrome.
         * @returns {boolean} Result.
         * @internal
         */
        export function isChrome(): boolean
        {
            let winChrome: object = (window as BaseObject).chrome; // IE11 returns undefined and Opera 30 returns true
            let winNav: Navigator = window.navigator;
            let vendorName: string = winNav.vendor;
            let isOpera: boolean = (typeof (window as BaseObject).opr !== "undefined");
            let isEdge: boolean = winNav.userAgent.indexOf("Edge") > -1;
            let isChrome: boolean = (winChrome !== null) && (typeof winChrome !== "undefined") && (vendorName === "Google Inc.") && (isOpera === false) && (isEdge === false);

            return (isChrome);
        }

        /**
         * Returns the DOM element represented by 'targetElement', which can be either be an actual SVG DOM element, a d3 selection containing a single SVG DOM element, or an HTML DOM element.
         * In either case, if 'domElementType' is specified (eg. SVGPathElement) then the DOM element represented by 'targetElement' must be of that type or an exception will be thrown.
         * @param {TargetDomElement | HTMLElement} targetElement An actual DOM element, or a d3 selection containing a single DOM element.
         * @param {any} domElementType The type (eg. SVGPathElement) of 'targetElement'. An exception will be thrown if 'targetElement' is of a different type.
         * @return {DomElement} The DOM element represented by 'targetElement'.
         */
        export function GetDomElement(targetElement: TargetDomElement | HTMLElement, domElementType?: any): DomElement
        {
            // Local 'Type Guard' functions
            let isD3Selection = (o: any): o is D3Selection => { return ((GetObjectType(o) === "Selection") && (typeof o.size === "function") && (typeof o.node === "function")); }
            let isDomElement = (o: any): o is DomElement => { return (o instanceof HTMLElement || o instanceof SVGElement); }

            // First, check if 'targetElement' is a d3 selection
            if (isD3Selection(targetElement))
            {
                if (targetElement.size() === 0)
                {
                    throw new MILException("The d3 selection provided is empty");
                }
                if (targetElement.size() > 1)
                {
                    throw new MILException("The d3 selection provided contains more than a single element");
                }
                if ((domElementType !== undefined) && !(targetElement.node() instanceof domElementType))
                {
                    throw new MILException(`The element in the d3 selection is of type '${GetObjectType(targetElement.node())}', not '${GetObjectType(domElementType)}' as expected`);
                }
                return (targetElement.node() as DomElement);
            }

            if ((domElementType !== undefined) && !(targetElement instanceof domElementType))
            {
                throw new MILException(`The element is of type '${GetObjectType(targetElement)}', not '${GetObjectType(domElementType)}' as expected`);
            }
            else
            {
                if (!isDomElement(targetElement))
                {
                    throw new MILException(`The element is of type '${GetObjectType(targetElement)}', which is not an HTML or SVG DOM element as expected`);
                }
                return (targetElement);
            }
        }

        /**
         * [Private Method] Returns the name of the type of the specified object.
         * @param {object} o Object to get type name of.
         * @returns {string} Type name of object.
         */
        export function GetObjectType(o: object): string
        {
            let c: string = o.constructor.toString();
            let objectType: string = null;

            if (c.indexOf("function") === 0)
            {
                objectType = c.slice(9, c.indexOf("(")).trim();
            }
            else
            {
                if (c.indexOf("[object") === 0)
                {
                    objectType = c.slice(8, c.indexOf("]")).trim();
                }
                else
                {
                    // Handle the case where o is a DOM element type (eg. SVGPathElement)
                    if (c.indexOf("[native code]") !== -1)
                    {
                        let typeString: string = o.toString();
                        if (typeString.indexOf("[object") === 0)
                        {
                            objectType = typeString.slice(8, typeString.indexOf("]")).trim();
                        }
                    }
                    else
                    {
                        // PORT: Added
                        throw new MILException("Unable to determine type of object '" + o.toString() + "'");
                    }
                }
            }
            return (objectType);
        }

        /**
         * [Private Method] Checks whether the specified 'memberName' is the name of a member in the specified 'enumType'. If it is, the numeric value of the member is returned. If not, returns 'undefined'.
         * @param {EnumType} enumType An enum type (eg. Utils.Keys).
         * @param {string} memberName The name to be checked.
         * @returns {number | undefined} The numeric value of the enum member (if found), or undefined.
         */
        function getEnumValue(enumType: EnumType, memberName: string): number | undefined
        {
            for (let propName in enumType)
            {
                if ((typeof enumType[propName] === "number") && (propName === memberName))
                {
                    return (enumType[propName] as number);
                }
            }
            return (undefined);
        }

        // This method is useful in callbacks where a RulerControl instance is assigned to 'this'. 
        // The JS callback function can use it get the correct VS IntelliSense for 'this', eg. by writing "var ruler = MIL.Utils.GetRulerControl(this);".
        // An alternative would be for the JS callback to include the JSDoc comment "/** @this MIL.Controls.RulerControl */", but this is less discoverable.
        /**
         * Given an object, checks if it's a RulerControl instance and - if so - returns the object. Throws if it's not a RulerControl.
         * @param {object} o The object to check.
         * @returns {Controls.RulerControl} Result.
         */
        export function GetRulerControl(o: object): Controls.RulerControl
        {
            if (o instanceof Controls.RulerControl)
            {
                return (o);
            }
            else
            {
                throw new MILException("The specified object is not a RulerControl instance");
            }
        }

        /**
         * Enables (or disables) the keyboard handler for the specified DOM element (normally a top-level element, like a containing/parent DIV). 
         * There is only one keyboard handler, so only it can only be enabled for one DOM element at-a-time.
         * If the keyboard handler is not enabled, methods like IsKeyPressed() and IsNoKeyPressed() will throw when called.
         * @param {TargetDomElement | HTMLElement} targetElement The element to enable/disable the keyboard handler for.
         * @param {boolean} enable The enable/disable flag.
         * @returns {boolean} Whether the operation was successful or not.
         */
        export function EnableKeyboardHandler(targetElement: TargetDomElement | HTMLElement, enable: boolean): boolean
        {
            let domElement: DomElement | HTMLElement = Utils.GetDomElement(targetElement);

            if (enable && !_keyboardHandlerEnabled)
            {
                if (domElement.getAttribute("tabindex") === null)
                {
                    domElement.setAttribute("tabindex", "0"); // Make it focusable [so that it will get key events]...
                    domElement.style.outline = "none"; // ...but hide the focus rectangle
                }
                domElement.focus();
                if ((document.activeElement !== domElement) || !document.hasFocus())
                {
                    log("Warning: Focus could not be not set to " + MIL.Utils.GetObjectType(domElement) + " '" + domElement.id + "' (activeElement? " + (document.activeElement === domElement) + ", documentFocused? " + document.hasFocus() + ")");
                }

                domElement.addEventListener("keydown", onKeyDown);
                domElement.addEventListener("keyup", onKeyUp);
                _keyboardHandlerEnabled = true;
                return (true);
            }

            if (!enable && _keyboardHandlerEnabled)
            {
                domElement.removeEventListener("keydown", onKeyDown);
                domElement.removeEventListener("keyup", onKeyUp);
                _keyboardHandlerEnabled = false;
                return (true);
            }

            return (false);
        }

        /**
         * [Private Method] Handler for keyDown events. Used by EnableKeyboardHandler().
         * @param {KeyboardEvent} e A KeyboardEvent.
         */
        function onKeyDown(e: KeyboardEvent): void
        {
            if (_currentlyPressedKeys.indexOf(e.keyCode) === -1)
            {
                log("Pushing keyCode " + e.keyCode, FeatureNames.KeyboardHandler);
                _currentlyPressedKeys.push(e.keyCode);

                // The keyUp event (nor onblur) won't fire for browser keyboard shortcuts (like Ctrl+S in IE11). So to prevent
                // _currentlyPressedKeys from accumulating inactive keys we always "force" a keyUp via a timer. If the key is 
                // still being held when the timer ticks the key will simply be re-added to _currentlyPressedKeys for another KEYDOWN_TIMEOUT_IN_MS.
                _keyUpTimerID[e.keyCode] = setTimeout(function () { keyTimerTick(e); }, KEYDOWN_TIMEOUT_IN_MS);
            }
        }

        /**
         * [Private Method] Handler for keyUp timer events (to ensure that every keyDown gets a matching keyUp). Used by EnableKeyboardHandler().
         * @param {KeyboardEvent} e A KeyboardEvent.
         */
        function keyTimerTick(e: KeyboardEvent): void
        {
            // If we've started acquiring pointers, don't fire off a key 'up' since that may prevent a gesture from being recognized;
            // instead, just re-start the timer. This helps mitigate the race condition, but it can still happen if the timer ticks
            // immediately before a pointer makes contact (in which case the [new] KeyDown event may not fire until AFTER gesture
            // recognition has run [and possibly failed because the key wasn't flagged as currently pressed]).
            if (isAcquiringPointers())
            {
                _keyUpTimerID[e.keyCode] = setTimeout(function () { keyTimerTick(e); }, KEYDOWN_TIMEOUT_IN_MS);
            }
            else
            {
                onKeyUp(e);
            }
        }

        /**
         * [Private Method] Handler for keyUp events. Used by EnableKeyboardHandler().
         * @param {KeyboardEvent} e A KeyboardEvent.
         */
        function onKeyUp(e: KeyboardEvent): void
        {
            clearTimeout(_keyUpTimerID[e.keyCode]);

            let index = _currentlyPressedKeys.indexOf(e.keyCode);
            if (index !== -1)
            {
                log("Popping keyCode " + e.keyCode, FeatureNames.KeyboardHandler);
                _currentlyPressedKeys.splice(index, 1);
            }
        }

        /**
         * Returns true if no key is currently being pressed for the DOM element supplied to Utils.EnableKeyboardHandler().
         * @returns {boolean} Flag indicating if no key is currently being pressed.
         */
        export function IsNoKeyPressed(): boolean
        {
            if (!_keyboardHandlerEnabled)
            {
                throw new MILException("Utils.EnableKeyboardHandler() must be called prior to using Utils.IsNoKeyPressed()");
            }

            return (_currentlyPressedKeys.length === 0);
        }

        /**
         * Returns true if the specified key is currently being pressed.
         * @param {string | Keys} key Either be a Utils.Keys value (eg. Keys.CTRL), a Utils.Keys name (eg. "CTRL"), or a literal (eg. "S")
         * @returns {boolean} Whether the specified key is currently being pressed.
         */
        export function IsKeyPressed(key: string | Keys): boolean
        {
            if (!_keyboardHandlerEnabled)
            {
                throw new MILException("Utils.EnableKeyboardHandler() must be called prior to using Utils.IsKeyPressed()");
            }

            // 'key' can either be a Utils.Keys value (eg. Keys.CTRL), a Utils.Keys name (eg. "CTRL"), or a literal (eg. "S")
            // let keyCode = (typeof key === "number") ? key : (Utils.Keys.hasOwnProperty(key) ? Utils.Keys[key] : key.charCodeAt(0));
            let keyCode = (typeof key === "number") ? key : (getEnumValue(Keys, key) || key.charCodeAt(0));

            return (_currentlyPressedKeys.indexOf(keyCode) !== -1);
        }

        /**
         * Returns a string describing all the currently pressed keys.
         * @returns {string} A description of all the currently pressed keys.
         */
        export function GetPressedKeyInfo(): string
        {
            let keyList: string[] = [];

            _currentlyPressedKeys.forEach(function (v, i)
            {
                let keyCode: number = v;
                let isKnownKey: boolean = false;

                for (let keyID in Keys)
                {
                    if (getEnumValue(Keys, keyID) === keyCode)
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

            return (`Count = ${_currentlyPressedKeys.length}: ${keyList.join(", ")}`);
        }

        /**
         * Converts the specified 'stringValue' to a number, or throws if the conversion to a number is not possible.
         * This is useful for converting CSS dimension values (like "200px") to their numeric equivalents.
         * @param {string} stringValue The string to attempt to convert to a number.
         * @returns {number} Result.
         */
        export function ToNumber(stringValue: string): number
        {
            let numberValue = +stringValue.replace(/[^0-9\.]/g, "");

            if (isNaN(numberValue))
            {
                throw new MILException("Unabled to convert '" + stringValue + "' to a number");
            }
            return (numberValue);
        }

        /**
         * Searches through the document's CSS stylesheets and returns the value of 'propertyName' in the first rule that matches 'cssSelector'. 
         * Returns null if no match is found. Note: The matching of cssSelector is a simple 'contains'.
         * @param {string} cssSelector The CSS selector (eg. ".MyClass") of the rule to look for.
         * @param {string} propertyName The name of the style property (eg. "stroke-width") to look for in the found rule.
         * @returns {string | null} Property value, or null if not found.
         */
        export function GetCssProperty(cssSelector: string, propertyName: string): string | null
        {
            // Search backwards through the stylesheets because the last match is more likely the right one
            for (let s = document.styleSheets.length - 1; s >= 0; s--)
            {
                if (document.styleSheets[s].type === "text/css")
                {
                    let cssRules: CSSRuleList = (document.styleSheets[s] as CSSStyleSheet).cssRules;

                    for (let i = 0; i < cssRules.length; i++)
                    {
                        if (cssRules[i].type === CSSRule.STYLE_RULE)
                        {
                            let cssStyleRule: CSSStyleRule = cssRules[i] as CSSStyleRule;

                            if (cssStyleRule.selectorText.indexOf(cssSelector) !== -1) // A "fuzzy" match
                            {
                                return (cssStyleRule.style.getPropertyValue(propertyName));
                            }
                        }
                    }
                }
            }
            return (null);
        }

        /**
         * Asynchronously fades [in or out] the element(s) in the d3Selection over the specified duration. This method returns immediately.
         * @param {D3Selection} d3Selection The element(s) to fade.
         * @param {number} durationInMs The time interval to do the fade over.
         * @param {string} [className] [Optional] The name of the class to apply to the element(s) prior to starting the fade.
         * @param {function():void} [onFadeComplete] [Optional] The callback to invoke once the fade finishes.
         * @param {boolean} [isFadeIn] [Optional] True to fade in, false (or ommitted) to fade out.
         * @param {number} [beginOpacity] [Optional] The initial opacity value.
         * @param {number} [endOpacity] [Optional] The final opacity value.
         */
        export function Fade(d3Selection: D3Selection, durationInMs: number, className?: string, onFadeComplete?: () => void, isFadeIn: boolean = false, beginOpacity?: number, endOpacity?: number): void
        {
            if (className)
            {
                d3Selection.classed(className, true);
            }

            let startOpacity: string = ((beginOpacity !== undefined) ? beginOpacity.toString() : null) || d3Selection.style("opacity") || (isFadeIn ? "0" : "1");

            if (endOpacity === undefined)
            {
                endOpacity = isFadeIn ? 1 : 0;
            }

            d3Selection
                .transition()
                .duration(durationInMs)
                .on("end", function () { if (onFadeComplete) onFadeComplete(); })
                .styleTween("opacity", function () { return d3.interpolate(startOpacity, endOpacity.toString()); });
        }

        /**
         * [Private Method] Returns true if the specified DOM element is visible.
         * @param { DomElement } domElement The DOM element to check.
         * @returns {boolean} Result.
         */
        function isElementVisible(domElement: DomElement): boolean
        {
            let style: CSSStyleDeclaration = window.getComputedStyle(domElement);
            let isVisible = (style.visibility === "visible") && (style.display !== "none");
            return (isVisible);
        }

        // isPointInPolygon() is adapted from https://wrf.ecse.rpi.edu//Research/Short_Notes/pnpoly.html.
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

        /**
         * [Private Method] A polygon helper method. Returns true if the target point is inside the verticies defined by vertX/vertY.
         * @param {number[]} vertX The x-axis values of the verticies that define the polygon.
         * @param {number[]} vertY The y-axis values of the verticies that define the polygon.
         * @param {number} nVert The number of verticies.
         * @param {number} targetX The x-axis value of the point to test.
         * @param {number} targetY The y-axis value of the point to test.
         * @returns {boolean} Result.
         */
        function isPointInPolygon(vertX: number[], vertY: number[], nVert: number, targetX: number, targetY: number): boolean
        {
            let isTargetInside: boolean = false;

            if ((vertX.length !== vertY.length) || (nVert !== vertX.length))
            {
                throw new MILException("vertX/vertY/nVert lengths don't all match");
            }

            for (let i = 0, j = nVert - 1; i < nVert; j = i++)
            {
                if (((vertY[i] > targetY) !== (vertY[j] > targetY)) &&
                    (targetX < (vertX[j] - vertX[i]) * (targetY - vertY[i]) / (vertY[j] - vertY[i]) + vertX[i]))
                {
                    isTargetInside = !isTargetInside;
                }
            }

            return (isTargetInside);
        }

        /**
         * Returns true if the specified target X/Y lies inside the specified polygon.
         * @param {PolygonPoints} polygonPoints The verticies of the polygon.
         * @param {number} targetX The x-axis value of the point to test.
         * @param {number} targetY The x-axis value of the point to test.
         * @returns {boolean} Result.
         */
        export function IsPointInPolygon(polygonPoints: PolygonPoints, targetX: number, targetY: number): boolean
        {
            // If needed, convert polygonPoints from [{x,y}] to [[x, y]] (often it is better that the caller do this for improved performance)
            let xyPolygonPoints: XY[] = ConvertPointsToXYPoints(polygonPoints);

            let nVert: number = xyPolygonPoints.length;
            let vertX: number[] = d3.range(nVert).map(function (i) { return xyPolygonPoints[i][0]; });
            let vertY: number[] = d3.range(nVert).map(function (i) { return xyPolygonPoints[i][1]; });
            let isTargetInside = isPointInPolygon(vertX, vertY, nVert, targetX, targetY);

            return (isTargetInside);
        }

        /**
         * Returns true if any of the pointsToTest are inside the specified polygon.
         * @param {PolygonPoints} polygonPoints The verticies of the polygon.
         * @param {PolygonPoints} pointsToTest The points to test for inclusion.
         * @returns {boolean} Result.
         */
        export function IsAnyPointInPolygon(polygonPoints: PolygonPoints, pointsToTest: PolygonPoints): boolean
        {
            // If needed, convert inputs from [{x,y}] to [[x, y]] (often it is better that the caller do this for improved performance)
            let xyPolygonPoints: XY[] = Utils.ConvertPointsToXYPoints(polygonPoints);
            let xyPointsToTest: XY[] = Utils.ConvertPointsToXYPoints(pointsToTest);

            let nVert = xyPolygonPoints.length;
            let vertX = d3.range(nVert).map(function (i) { return xyPolygonPoints[i][0]; });
            let vertY = d3.range(nVert).map(function (i) { return xyPolygonPoints[i][1]; });

            for (let p = 0; p < pointsToTest.length; p++)
            {
                let targetX: number = xyPointsToTest[p][0];
                let targetY: number = xyPointsToTest[p][1];
                let isTargetInside: boolean = isPointInPolygon(vertX, vertY, nVert, targetX, targetY);

                if (isTargetInside)
                {
                    return (true);
                }
            }

            return (false);
        }

        /**
         * If needed, converts the supplied 'points' from [{x,y}] to [[x, y]].
         * @param {PolygonPoints} points The verticies of the polygon, in either [{x,y}] or [[x, y]] format (if in the latter format then this method is a no-op).
         * @returns {XY[]} The supplied 'points' in [[x, y]] format.
         */
        export function ConvertPointsToXYPoints(points: PolygonPoints): XY[]
        {
            // Local 'Type Guard' function
            let isArrayOfPoint = (o: any[]): o is Point[] => { return (o[0].x !== undefined) && (o[0].y !== undefined); };

            if ((points.length > 0) && isArrayOfPoint(points))
            {
                let xyArray: XY[] = d3.range(points.length).map(function (i) { return ([points[i].x, points[i].y]); });
                return (xyArray);
            }
            else
            {
                return (points as XY[]);
            }
        }

        /**
         * If needed, converts the supplied 'points' from [[x, y]] to [{x,y}].
         * @param {PolygonPoints} points The verticies of the polygon, in either [[x, y]] of [{x,y}] format (if in the latter format then this method is a no-op).
         * @returns {Point[]} The supplied 'points' in [{x,y}] format.
         */
        export function ConvertXYPointsToPoints(points: PolygonPoints): Point[]
        {
            // Local 'Type Guard' function
            let isArrayOfXY = (o: any[]): o is XY[] => { return (o[0] instanceof Array) && (o[0].length === 2); };

            if ((points.length > 0) && isArrayOfXY(points))
            {
                let pointArray: Point[] = d3.range(points.length).map<Point>(function (i) { return ({ x: points[i][0], y: points[i][1] }); });
                return (pointArray);
            }
            else
            {
                return (points as Point[]);
            }
        }

        /**
         * Returns the number of 'targetPointsToTest' points that are inside 'targetPolygonPoints'.
         * @param {PolygonPoints} targetPolygonPoints The verticies of the polygon.
         * @param {PolygonPoints} targetPointsToTest The points to test.
         * @returns {number} Result.
         */
        export function CountPointsInPolygon(targetPolygonPoints: PolygonPoints, targetPointsToTest: PolygonPoints): number
        {
            // If needed, convert inputs from [{x,y}] to [[x, y]] (often it is better that the caller do this for improved performance)
            let polygonPoints: XY[] = ConvertPointsToXYPoints(targetPolygonPoints);
            let pointsToTest: XY[] = ConvertPointsToXYPoints(targetPointsToTest);

            let nVert: number = polygonPoints.length;
            let vertX: number[] = d3.range(nVert).map(function (i) { return polygonPoints[i][0]; });
            let vertY: number[] = d3.range(nVert).map(function (i) { return polygonPoints[i][1]; });
            let pointCount: number = 0;

            for (let p = 0; p < pointsToTest.length; p++)
            {
                let targetX: number = pointsToTest[p][0];
                let targetY: number = pointsToTest[p][1];
                let isTargetInside: boolean = isPointInPolygon(vertX, vertY, nVert, targetX, targetY);

                if (isTargetInside)
                {
                    pointCount++;
                }
            }

            return (pointCount);
        }

        /**
         * Returns a best-guess (true/false) of whether the supplied path (and corresponding [[x,y]] points) is classified as a straight line.
         * @param {XY[]} polygonPoints The verticies in the SVGPathElement in 'path'.
         * @return {boolean} Result.
         */
        export function IsStraightLine(polygonPoints: XY[]): boolean
        {
            let isLine: boolean = false;
            let convexHullVertices: XY[] = d3.polygonHull(polygonPoints); // Returned points are in counter-clockwise order [which d3.polygonArea (see below) needs to return a positive value]

            if (convexHullVertices)
            {
                let lineLength: number = 0;

                for (let i = 1; i < polygonPoints.length; i++)
                {
                    let prevPoint: Point = { x: polygonPoints[i - 1][0], y: polygonPoints[i - 1][1] };
                    let currPoint: Point = { x: polygonPoints[i][0], y: polygonPoints[i][1] };
                    lineLength += Utils.GetDistanceBetweenPoints(prevPoint, currPoint);
                }

                let area: number = d3.polygonArea(convexHullVertices);
                let firstPoint: Point = { x: polygonPoints[0][0], y: polygonPoints[0][1] };
                let lastPoint: Point = { x: polygonPoints[polygonPoints.length - 1][0], y: polygonPoints[polygonPoints.length - 1][1] };
                let distance: number = GetDistanceBetweenPoints(firstPoint, lastPoint);
                let areaRatio: number = lineLength / area;
                let distanceRatio: number = distance / lineLength;

                // This determines if the line is straight(ish), but it's not infallible 
                // (in particular, lines that double-back to end close to where they start will fail this test)
                isLine = ((areaRatio > 0.1) && (distanceRatio > 0.5)) || (distanceRatio >= 0.95); // Guesstimated thresholds
                // log("DEBUG: " + (isLine ? "" : "Not ") + "Line (" + areaRatio.toFixed(2) + ", " + distanceRatio.toFixed(2) + ")", FeatureNames.Debug);
            }
            return (isLine);
        }

        /**
         * Returns the length of the line described by the supplied set of Points.
         * @param {Point[]} pathPoints A set of Points.
         * @returns {number} Result.
         */
        export function ComputeTotalLength(pathPoints: Point[]): number
        {
            let totalLength: number = 0;
            for (let i = 0; i < pathPoints.length - 1; i++)
            {
                totalLength += Utils.GetDistanceBetweenPoints(pathPoints[i], pathPoints[i + 1]);
            }
            return (totalLength);
        }

        // PORT: This function had numerous changes, so it should be carefully re-tested.
        /**
         * Searches the specified 'region' for elements of 'shapeNodeType'. Returns either an array of DOM elements or Inks (depending on the value of 'shapeNodeType').
         * @param {TargetDomElement} targetGElement The SVG 'g' element to search within.
         * @param {ShapeNodeType} shapeNodeType The type of shape to search for in 'region'.
         * @param {Point[] | Ink} region A polygon (within 'targetGElement') defining the region to search within. Can also be an Ink instance.
         * @param {FindShapeFilter} [filter] [Optional] Filter function to do an additional check to decide if a found shape should be included in the result set.
         * @param {number} [percentageInside] [Optional] A value from 0..1 that defines the ratio of the points in the found shapes that must be inside 'region' 
         * for the shape to be included in the result set. If not supplied a shape-specific default value will be used.
         * @returns {Ink[] | DomElement[]} Result.
         */
        export function FindShapeElementsInRegion(targetGElement: TargetDomElement, shapeNodeType: ShapeNodeType, region: Point[] | Ink, filter?: FindShapeFilter, percentageInside?: number): Ink[] | DomElement[]
        {
            let regionPoints: Point[] = (region instanceof Ink) ? region.PathPoints() : region as Point[];
            let foundElements: DomElement[] = [];
            let foundInks: Ink[] = [];
            let boundingPoints: XY[] = d3.range(regionPoints.length).map(function (d) { return ([regionPoints[d].x, regionPoints[d].y]); });
            let gDomElement: SVGGElement = GetDomElement(targetGElement, SVGGElement) as SVGGElement;

            // Note: Local function
            function isMatch(targetPoints: XY[], defaultPercentageInside: number, domElementOrInk: DomElement | Ink)
            {
                if (targetPoints.length > 0)
                {
                    if (percentageInside === undefined)
                    {
                        percentageInside = defaultPercentageInside;
                    }

                    // Count how many element-points are inside the region (bounding) path
                    let containedPointCount: number = CountPointsInPolygon(boundingPoints, targetPoints);

                    // Were more than percentageInside of them inside?
                    // Note: We use '>' (not '>=') to allow the caller to specify 0 for percentageInside rather than having to specify
                    //       some tiny value (eg. 0.0001) when they just want to check if ANY point of a path is inside the region
                    let containedPointPercentage: number = containedPointCount / targetPoints.length;
                    if ((containedPointPercentage === 1) || (containedPointPercentage > percentageInside))
                    {
                        // Does the element (or Ink) pass the supplied filter (if supplied)?
                        if (!filter || (filter && filter(domElementOrInk)))
                        {
                            return (true);
                        }
                    }
                }
                return (false);
            }

            if (shapeNodeType === ShapeNodeType.Ink)
            {
                let inks: Ink[] = Inks();

                for (let i = 0; i < inks.length; i++)
                {
                    let targetPoints: XY[] = ConvertPointsToXYPoints(inks[i].PathPoints());

                    if (isMatch(targetPoints, 0.8, inks[i]))
                    {
                        foundInks.push(inks[i]);
                    }
                }
                return (foundInks);
            }
            else
            {
                d3.select(gDomElement).selectAll(shapeNodeType).each(function (d)
                {
                    let domElement: DomElement = this as DomElement; // Note: When using .each(), 'this' is set to the DOM element associated with 'd'

                    if (isElementVisible(domElement) && !Controls.IsControl(domElement))
                    {
                        let defaultPercentageInside: number = 1; // 1 = 100%
                        let targetPoints: XY[] = [];

                        switch (shapeNodeType)
                        {
                            case ShapeNodeType.Circle:
                            case ShapeNodeType.Ellipse:
                                // Add the center point of the circle/ellipse
                                targetPoints.push([+domElement.getAttribute("cx"), +domElement.getAttribute("cy")]);
                                break;

                            case ShapeNodeType.Rect:
                                // Add the center point of the rect
                                targetPoints.push([+domElement.getAttribute("x") + (ToNumber(domElement.getAttribute("width")) / 2), +domElement.getAttribute("y") + (ToNumber(domElement.getAttribute("height")) / 2)]);
                                break;

                            case ShapeNodeType.Line:
                                // Add the start and end points of the line
                                targetPoints.push([+domElement.getAttribute("x1"), +domElement.getAttribute("y1")]);
                                targetPoints.push([+domElement.getAttribute("x2"), +domElement.getAttribute("y2")]);
                                break;

                            case ShapeNodeType.Polygon:
                            case ShapeNodeType.PolyLine:
                                // Add all the points in the polygon/polyline
                                let rawPoints = domElement.getAttribute("points").split(" ");
                                for (let i = 0; i < rawPoints.length; i++)
                                {
                                    let coords = rawPoints[i].split(",");
                                    targetPoints.push([+coords[0], +coords[1]]);
                                }
                                defaultPercentageInside = 0.8; // 80%
                                break;

                            case ShapeNodeType.Path:
                                // Add either all the points of an Ink, or a sampling of points from a non-Ink path
                                let ink: Ink = GetInkByElement(domElement);
                                var pathPoints: Point[] = ink ? ink.PathPoints() : SamplePointsFromPath(domElement as SVGPathElement); // Note: Don't use 'let' here: it will result in the variable being renamed during compilation which means it won't surface correctly in the debugger
                                targetPoints = d3.range(pathPoints.length).map(function (d) { return ([pathPoints[d].x, pathPoints[d].y]); });
                                defaultPercentageInside = 0.8; // 80%
                                break;

                            default:
                                throw new MILException("shapeNodeType '" + shapeNodeType + "' is not currrently supported");
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
 
        /**
         * Returns the center point (in svg space) of the supplied DOM element.
         * @param {DomElement} targetDomElement The DOM element to find the centroid of.
         * @returns {Point} Result.
         */
        export function GetCentroidPoint(targetDomElement: DomElement): Point
        {
            let boundingRect = targetDomElement.getBoundingClientRect(); // In screen coordinates
            let centroidPoint = { x: boundingRect.left + (boundingRect.width / 2), y: boundingRect.top + (boundingRect.height / 2) };
            let transposedCentroidPoint = TransposeScreenPoint(centroidPoint, targetDomElement);
            return (transposedCentroidPoint);
        }

        /**
         * Returns an array of {x, y} points in the order [TL, TR, BR, BL].
         * @param {ClientRect | Rect} rect The rectangle to extract points from.
         * @returns { Point[] } Result.
         */
        export function GetPointsFromRect(rect: ClientRect | Rect): Point[]
        {
            let points: Point[] = [];

            // Local 'Type Guard' function
            let isClientRect = (o: any): o is ClientRect =>
            {
                let obj: Object = o as Object;
                return ((typeof o === "object") && obj.hasOwnProperty("left") && obj.hasOwnProperty("right") && obj.hasOwnProperty("top") && obj.hasOwnProperty("bottom"));
            };

            if (isClientRect(rect))
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

        /**
         * Returns a Rect from the two supplied points.
         * @param {Point} point1 First point.
         * @param {Point} point2 Second point.
         * @returns {Rect} Result.
         */
        export function GetRectFromPoints(point1: Point, point2: Point): Rect
        {
            let x = Math.min(point1.x, point2.x), y = Math.min(point1.y, point2.y); // x/y specifies the top-left corner
            let width = Math.abs(point1.x - point2.x), height = Math.abs(point1.y - point2.y);
            return ({ x: x, y: y, width: width, height: height });
        }

        /**
         * Returns a set of SVGPoints sampled from the specified Path.
         * @param {SVGPathElement} pathDomElement The Path element to sample from.
         * @param {boolean} [showPoints] [Optional] Whether or not to display black dots representing the sampled points.
         * @param {number} [distanceInPxBetweenSamples] [Optional The number of pixels (along the Path) between samples.
         * @returns {SVGPoint[]} Result.
         */
        export function SamplePointsFromPath(pathDomElement: SVGPathElement, showPoints: boolean = false, distanceInPxBetweenSamples: number = 5): SVGPoint[]
        {
            let svgInfo: SVGInfo = getSvgInfo(pathDomElement);
            let pathLength: number = pathDomElement.getTotalLength();
            let maxSampleCount: number = Math.min(500, Math.max(10, pathLength / distanceInPxBetweenSamples));
            let stepSize: number = pathLength / maxSampleCount;
            let svgPoints: SVGPoint[] = []; // [SVGPoint]

            for (let l = 0; l < pathLength; l += stepSize)
            {
                let svgPoint: SVGPoint = pathDomElement.getPointAtLength(l);
                svgPoints.push(svgPoint);
            }

            // The SVGPoint returned by getPointAtLength() is in SVG coordinate space, so it already takes the translate/scale transform
            // (see zoomAtPoint()) of gDomElement into account (because pathDomElement has gDomElement as an ancestor), but it does not 
            // account for the transform of pathDomElement itself. Consequently we have to use GetTransformedPoints() to address this.
            svgPoints = GetTransformedPoints(pathDomElement, svgPoints);

            // DEBUG: Show the vertices
            if (Boolean(showPoints) === true)
            {
                svgInfo.gSelection.selectAll("circle.debugVertices").remove();
                svgInfo.gSelection.selectAll("circle.debugVertices")
                    .data(svgPoints)
                    .enter()
                    .append("circle")
                    .attr("cx", function (d: SVGPoint) { return (d.x); })
                    .attr("cy", function (d: SVGPoint) { return (d.y); })
                    .attr("r", 2)
                    .attr("fill", "black")
                    .classed("debugVertices", true); // This is not a real class: we add it purely for identification purposes
            }

            return (svgPoints);
        }

        /**
         * Returns the elementSvgPoints array modified for the transform (if any) of domElement, and for the transform (if any) of its host SVGGElement.
         * @param {SVGGraphicsElement} domElement An SVG shape element (path, rect, etc.) that has [or at least can be] transformed.
         * @param {SVGPoint} elementSvgPoints An array of SVGPoint's (in absolute coordinates) from domElement.
         * @returns {SVGPoint[]} Result.
         */
        export function GetTransformedPoints(domElement: SVGGraphicsElement, elementSvgPoints: SVGPoint[]): SVGPoint[]
        {
            let svgInfo: SVGInfo = getSvgInfo(domElement);
            let elementMatrix: DOMMatrix = domElement.getCTM();
            let gMatrixInverse: DOMMatrix = svgInfo.gDomElement.getCTM().inverse();
            let transformedPoints: SVGPoint[] = [];

            for (let i = 0; i < elementSvgPoints.length; i++)
            {
                // elementSvgPoints are in SVG coordinate space, so they already take the translate/scale transform (see zoomAtPoint()) of gDomElement
                // into account (because domElement has gDomElement as an ancestor), but they do not account for the transform of domElement itself.
                // So if we only apply the elementMatrix (which also takes all ancestor transforms into account) to the points we'd effectively end up
                // applying the gDomElement translate/scale transforms twice.
                // To fix this we "un-apply" the translate/scale transform of gDomElement.
                let transformedPoint: SVGPoint = elementSvgPoints[i].matrixTransform(elementMatrix).matrixTransform(gMatrixInverse);
                transformedPoints.push(transformedPoint);
            }

            return (transformedPoints);
        }

        /**
         * Returns the closest point to targetPoint on the line described by lineStartPoint/lineEndPoint.
         * @param {Point} targetPoint The point to find the closet point to on the line.
         * @param {Point} lineStartPoint The start of the line.
         * @param {Point} lineEndPoint The end of the line.
         * @returns {Point} Result.
         */
        export function GetClosestPointOnLine(targetPoint: Point, lineStartPoint: Point, lineEndPoint: Point): Point
        {
            // See https://stackoverflow.com/questions/3120357/get-closest-point-to-a-line
            let P: Point = targetPoint, A: Point = lineStartPoint, B: Point = lineEndPoint;
            let vectorAP: number[] = [(P.x - A.x), (P.y - A.y)];
            let vectorAB: number[] = [(B.x - A.x), (B.y - A.y)];
            let magnitudeVectorABSquared: number = Math.pow(vectorAB[0], 2) + Math.pow(vectorAB[1], 2);
            let dotProductOfVectors: number = (vectorAP[0] * vectorAB[0]) + (vectorAP[1] * vectorAB[1]);
            let normalizedDistanceAlongLineAB: number = dotProductOfVectors / magnitudeVectorABSquared; // 0..1

            if (normalizedDistanceAlongLineAB < 0)
            {
                return (A);
            }
            if (normalizedDistanceAlongLineAB > 1)
            {
                return (B);
            }
            return ({
                x: A.x + (vectorAB[0] * normalizedDistanceAlongLineAB),
                y: A.y + (vectorAB[1] * normalizedDistanceAlongLineAB)
            });
        }

        /**
         * Returns the distance (in pixels) between two PointerEvents.
         * @param {PointerEvent} e1 First event.
         * @param {PointerEvent} e2 Second event.
         * @returns {number} Result.
         */
        export function GetDistanceBetweenEvents(e1: PointerEvent, e2: PointerEvent): number
        {
            // Note: e.clientX/Y are relative to [the top-left (0,0)] of the document window
            let distance = Math.sqrt(Math.pow((e1.clientX - e2.clientX), 2) + Math.pow((e1.clientY - e2.clientY), 2));
            return (distance);
        }

        /**
         * Returns the distance (in pixels) between two Points.
         * @param {Point} point1 First point.
         * @param {Point} point2 Second point.
         * @returns {number} Result.
         */
        export function GetDistanceBetweenPoints(point1: Point, point2: Point): number
        {
            let distance = Math.sqrt(Math.pow((point1.x - point2.x), 2) + Math.pow((point1.y - point2.y), 2));
            return (distance);
        }

        /**
         * Returns a Rect that bounds all the Points in 'pathPoints'. 
         * @param {Points[]} pathPoints The set of Points to find the bounding Rect for.
         * @returns {Rect} Result.
         */
        export function GetBoundingRectForPoints(pathPoints: Point[]): Rect
        {
            let top: number = Number.MAX_VALUE;
            let left: number = Number.MAX_VALUE;
            let maxX: number = Number.MIN_VALUE;
            let maxY: number = Number.MIN_VALUE;

            for (let i = 0; i < pathPoints.length; i++)
            {
                top = Math.min(pathPoints[i].y, top);
                left = Math.min(pathPoints[i].x, left);
                maxY = Math.max(pathPoints[i].y, maxY);
                maxX = Math.max(pathPoints[i].x, maxX);
            }

            let height = maxY - top;
            let width = maxX - left;

            return ({ x: left, y: top, height: height, width: width });
        }

        /**
         * Returns the heading (>= 0, < 360) of 'endPoint' relative to 'startPoint'.
         * @param {Point} startPoint The starting Point.
         * @param {Point} endPoint The ending Point
         * @returns {number} Result.
         */
        export function GetHeadingFromPoints(startPoint: Point, endPoint: Point): number
        {
            let opposite: number = endPoint.y - startPoint.y;
            let adjacent: number = endPoint.x - startPoint.x;
            let hypotenuse: number = Math.sqrt(Math.pow(opposite, 2) + Math.pow(adjacent, 2));
            let sine: number = opposite / hypotenuse;
            let angleInRadians: number = Math.asin(sine);
            let angleInDegrees: number = angleInRadians * (180 / Math.PI);
            let heading: number = 0; // A value from 0 to 359.999

            if (endPoint.x > startPoint.x)
            {
                heading = 90 + angleInDegrees;
            }
            if (endPoint.x < startPoint.x)
            {
                heading = 270 - angleInDegrees;
            }
            if (endPoint.x === startPoint.x)
            {
                heading = (endPoint.y > startPoint.y) ? 180 : 0;
            }

            // let straightLineDistanceMoved: number = hypotenuse;

            return (heading);
        }

        /**
         * Returns a heading value determined by the value of 'numRadialSegments'. 
         * When either 4 or 8 it will return a compase heading (eg. "NE" or "W"). When any other value it returns a 0..numRadialSegments - 1 segment ID.
         * See also: GetRadialSegmentID().
         * @param {number} heading A value in the range 0..359.999.
         * @param {number} [numRadialSegments] [Optional] The number of segment to quantize 'heading' into.
         * @returns {string | number} Result.
         */
        export function GetCompassHeading(heading: number, numRadialSegments: number = 8): string | number
        {
            let compassHeadings: string[] | number[] = (numRadialSegments === 8) ? ["N", "NE", "E", "SE", "S", "SW", "W", "NW"] : ((numRadialSegments === 4) ? ["N", "E", "S", "W"] : d3.range(numRadialSegments).map(function (d) { return (d); }));
            let halfSegmentAngle: number = (360 / compassHeadings.length) / 2;
            let compassHeading: d3.ScaleQuantile<string | number> = d3.scaleQuantile<string | number>().domain([-halfSegmentAngle, 360 - halfSegmentAngle]).range(compassHeadings);
            let adjustedHeading: number = (heading < (360 - halfSegmentAngle)) ? heading : -(360 - heading);

            return (compassHeading(adjustedHeading));
        }

        /**
         * Returns a segment ID (0..numRadialSegments - 1) for the specified heading.
         * @param {number} heading A value in the range 0..359.999.
         * @param {number} numRadialSegments The number of segment to quantize 'heading' into.
         * @returns {number} Result.
         */
        export function GetRadialSegmentID(heading: number, numRadialSegments: number): number
        {
            let halfSegmentAngle: number = (360 / numRadialSegments) / 2;
            let segmentIDs: number[] = d3.range(numRadialSegments).map(function (d) { return (d); });
            let headingToSegmentID: d3.ScaleQuantile<number> = d3.scaleQuantile<number>().domain([-halfSegmentAngle, 360 - halfSegmentAngle]).range(segmentIDs);
            let adjustedHeading: number = (heading < (360 - halfSegmentAngle)) ? heading : -(360 - heading);

            return (headingToSegmentID(adjustedHeading));
        }

        /**
         * Returns a Point on the circumference of a circle (with the specified radius and origin) at 'angleInDegrees' offset from the 12 o'clock position.
         * @param {number} angleInDegrees A value in the range 0..359.999 (0 is the 12 o'clock position).
         * @param {number} radius The radius of the circle.
         * @param {Point} originPoint The center of the circle.
         * @returns {Point} Result.
         */
        export function GetPointOnCircle(angleInDegrees: number, radius: number, originPoint: Point): Point
        {
            // Without this adjustment, an angleInDegrees of 0 is the 3 o'clock position (E), so we subtract 90 degrees to orient it to 12 o'clock (N)
            angleInDegrees -= 90;

            let angleInRadians: number = angleInDegrees * (Math.PI / 180);
            let x: number = (radius * Math.cos(angleInRadians)) + originPoint.x;
            let y: number = (radius * Math.sin(angleInRadians)) + originPoint.y;

            return ({ x: x, y: y });
        }

        /**
         * Returns a Points array (of length 'numPoints') taken at equal intervals along the circumference of a circle (with the specified radius and origin).
         * @param {number} numPoints The number of Points to include.
         * @param {number} radius The radius of the circle.
         * @param {Point} originPoint The center of the circle.
         * @returns {Point[]} Result.
         */
        export function GetPointsOnCircle(numPoints: number, radius: number, originPoint: Point): Point[]
        {
            let points: Point[] = [];
            let angleStepSizeInDegrees: number = 360 / numPoints;

            for (let angleInDegrees = 0; angleInDegrees < 360; angleInDegrees += angleStepSizeInDegrees)
            {
                let point: Point = GetPointOnCircle(angleInDegrees, radius, originPoint);
                points.push(point);
            }

            return (points);
        }

        /**
         * Returns the 'pathData' string (that describes an SVG path) scaled by the specified 'scale' ratio.
         * @param {string} pathData The path data to scale (eg. "M 0 0 L 100 0 L 100 100 Z"). Note: 'pathData' must have a 0,0 origin and can only contain M, L, Z, m, l, a or z commands.
         * @param {number} scale The ratio to scale by (eg. 1.2).
         * @returns {string} Result.
         */
        export function ScalePathData(pathData: string, scale: number): string
        {
            let values: string[] = pathData.split(" ");
            let scaledData: string = "";
            let lastCommand: string = "";

            for (let i = 0; i < values.length; i++)
            {
                let command = values[i];

                // Allow for shorthand versions [eg. "M 1,2 3,4" == "M 1,2 L 3,4" and "M 1,2 L 3,4 5,6" == "M 1,2 L 3,4 L 5,6"]
                if (!isNaN(+command) && ((lastCommand === "M") || (lastCommand === "L") || (lastCommand === "m") || (lastCommand === "l")))
                {
                    let isUpperCaseCommand: boolean = (command.toUpperCase() === command);
                    command = isUpperCaseCommand ? "L" : "l";
                    i--;
                }

                if (isNaN(+command))
                {
                    if (command.length !== 1)
                    {
                        throw new MILException("Unexpected value ('" + command + "') in pathData '" + pathData + "'");
                    }

                    scaledData += command + " ";

                    switch (command)
                    {
                        // Lower-case commands use relative [to the last end-point] distances/coordinates
                        case "a":
                            scaledData += (+values[i + 1] * scale) + " "; // rx
                            scaledData += (+values[i + 2] * scale) + " "; // ry
                            scaledData += values[i + 3] + " "; // x-axis-rotation(0..180)
                            scaledData += values[i + 4] + " "; // large-arc(0|1)
                            scaledData += values[i + 5] + " "; // sweep-direction(0|1)
                            scaledData += (+values[i + 6] * scale) + " "; // end-dx
                            scaledData += (+values[i + 7] * scale) + " "; // end-dy
                            i += 7;
                            break;

                        case "M":
                        case "L":
                        case "m":
                        case "l":
                            let x = +values[i + 1] * scale;
                            let y = +values[i + 2] * scale;
                            scaledData += x + " " + y + " ";
                            i += 2;
                            break;

                        case "Z":
                        case "z":
                            // No-op
                            break;

                        default:
                            throw new MILException("Unsupported command '" + command + "' in pathData: supported path commands are: M, L, Z, m, a, z");
                    }

                    lastCommand = command;
                }
                else
                {
                    throw new MILException("Unexpected path data token '" + values[i] + "'");
                }
            }
            return (scaledData.trim());
        }

        /**
         * Translates (shifts and scales) the 'pathData' string (that describes an SVG path). Returns the translated path data.
         * @param {string} pathData The path data to scale (eg. "M 0 0 L 100 0 L 100 100 Z"). Note: 'pathData' must have a 0,0 origin and can only contain M, L, Z, m, l, a or z commands.
         * @param {number} deltaX The x-offset to translate by 
         * @param {number} deltaY The y-offset to translate by.
         * @param {number} scaleFactor The amount to scale by. Values in the range 0..1 will scale the path up, values greater than 1 will scale the path down.
         * @returns {string} Result.
         */
        export function TranslatePathData(pathData: string, deltaX: number, deltaY: number, scaleFactor: number): string
        {
            let values: string[] = pathData.split(" ");
            let translatedData: string = "";
            let lastCommand: string = "";

            for (let i = 0; i < values.length; i++)
            {
                let command = values[i];

                // Allow for shorthand versions [eg. "M 1,2 3,4" == "M 1,2 L 3,4" and "M 1,2 L 3,4 5,6" == "M 1,2 L 3,4 L 5,6"]
                if (!isNaN(+command) && ((lastCommand === "M") || (lastCommand === "L") || (lastCommand === "m") || (lastCommand === "l")))
                {
                    let isUpperCaseCommand: boolean = (command.toUpperCase() === command);
                    command = isUpperCaseCommand ? "L" : "l";
                    i--;
                }

                if (isNaN(+command))
                {
                    if (command.length !== 1)
                    {
                        throw new MILException("Unexpected value ('" + command + "') in pathData '" + pathData + "'");
                    }

                    translatedData += command + " ";

                    switch (command)
                    {
                        // Lower-case commands use relative [to the last end-point] distances/coordinates
                        case "a":
                            translatedData += (+values[i + 1] / scaleFactor) + " "; // rx
                            translatedData += (+values[i + 2] / scaleFactor) + " "; // ry
                            translatedData += values[i + 3] + " "; // x-axis-rotation(0..180)
                            translatedData += values[i + 4] + " "; // large-arc(0|1)
                            translatedData += values[i + 5] + " "; // sweep-direction(0|1)
                            translatedData += (+values[i + 6] / scaleFactor) + " "; // end-dx
                            translatedData += (+values[i + 7] / scaleFactor) + " "; // end-dy
                            i += 7;
                            break;

                        case "m":
                        case "l":
                            translatedData += (+values[i + 1] / scaleFactor) + " "; // dx
                            translatedData += (+values[i + 2] / scaleFactor) + " "; // dy
                            i += 2;
                            break;

                        case "M":
                        case "L":
                            let translatedX = (+values[i + 1] / scaleFactor) + deltaX;
                            let translatedY = (+values[i + 2] / scaleFactor) + deltaY;
                            translatedData += translatedX + " " + translatedY + " ";
                            i += 2;
                            break;

                        case "Z":
                        case "z":
                            // No-op
                            break;

                        default:
                            throw new MILException("Unsupported command '" + command + "' in pathData: supported path commands are M, L, Z, m, a, z");
                    }

                    lastCommand = command;
                }
                else
                {
                    throw new MILException("Unexpected path data token '" + values[i] + "'");
                }
            }
            return (translatedData.trim());
        }

        /**
         * Generates the path data (string) for a circle of the specified origin and radius.
         * For example, GetCirclePathData(100, 100, 75) produces the same visual result as <circle cx="100" cy="100" r="75"/>.
         * @param {number} centerX The x-axis value of the origin point.
         * @param {number} centerY The y-axis value of the origin point.
         * @param {number} radius The radius of the circle.
         * @returns {string} Result.
         */
        export function GetCirclePathData(centerX: number, centerY: number, radius: number): string
        {
            // See https://stackoverflow.com/questions/5737975/circle-drawing-with-svgs-arc-path
            // and https://developer.mozilla.org/en-US/docs/Web/SVG/Tutorial/Paths
            // 1) M cx cy                [Absolute move-to]
            // 2) m -r 0                 [Relative move-to] 
            // 3) a r r 0 1 0 (r * 2) 0  [Relative arc (rx ry x-axis-rotation(0..180) large-arc(0|1) sweep-direction(0|1) end-x end-y)]
            // 4) a r r 0 1 0 -(r * 2) 0 [Relative arc (rx ry x-axis-rotation(0..180) large-arc(0|1) sweep-direction(0|1) end-x end-y)]
            let circlePathData: string = "M " + centerX + " " + centerY + " " +
                "m -" + radius + " 0 " +
                "a " + radius + " " + radius + " 0 1 0 " + (radius * 2) + " 0 " +
                "a " + radius + " " + radius + " 0 1 0 " + -(radius * 2) + " 0";

            return (circlePathData);
        }

        /**
         * Returns the 4 SVG points that define the currently viewable (ie. on-screen) area, within the total panable area.
         * @param {SVGGElement} gDomElement The SVG 'g' element to inspect.
         * @param {number} [insetMargin] [Optional] The number of pixels (on all sides) to reduce the viewable area by.
         * @returns {Point[]} Result.
         */
        export function ViewableSvgAreaPoints(gDomElement: SVGGElement, insetMargin: number = 0): Point[]
        {
            let svgInfo: SVGInfo = getSvgInfo(gDomElement);
            let viewRect: ClientRect = svgInfo.svgDomElement.getBoundingClientRect(); // In screen coordinates
            let viewRectInset: Rect = {
                x: viewRect.left + insetMargin,
                y: viewRect.top + insetMargin,
                width: viewRect.width - (insetMargin * 2),
                height: viewRect.height - (insetMargin * 2)
            };
            let screenPoints: Point[] = GetPointsFromRect(viewRectInset);
            let svgPoints: Point[] = [];

            for (let i = 0; i < screenPoints.length; i++)
            {
                svgPoints.push(TransposeScreenPoint(screenPoints[i], gDomElement));
            }

            return (svgPoints);
        }

        /**
         * Returns true if the angle beween headings is less than the specified range.
         * @param {number} heading1 The first heading (0..359.999).
         * @param {number} heading2 The second heading (0..359.999).
         * @param {number} range The maximum delta between the two headings for them to be considered aligned.
         * @returns {boolean} Result.
         */
        export function AreHeadingsAligned(heading1: number, heading2: number, range: number = 30): boolean
        {
            let headingDelta: number = Math.abs(heading1 - heading2);

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

        /**
         * Returns the point at the middle of the line described by 'point1' and 'point2'.
         * @param {Point} point1 One end of the line.
         * @param {Point} point2 The other end of the line.
         * @returns {Point} Result.
         */
        export function GetLineMidPoint(point1: Point, point2: Point): Point
        {
            let maxX: number = Math.max(point1.x, point2.x);
            let minX: number = Math.min(point1.x, point2.x);
            let maxY: number = Math.max(point1.y, point2.y);
            let minY: number = Math.min(point1.y, point2.y);

            return ({ x: minX + ((maxX - minX) / 2), y: minY + ((maxY - minY) / 2) });
        }

        /**
         * Creates (and returns) a d3 selection of an SVG path object [on 'gDomElement'] as described by the supplied 'points'. The path will be drawn in red using a line of 'strokeWidth' thickness.
         * @param {SVGGElement} gDomElement The SVG 'g' element to add the debug path to.
         * @param {Point[]} points The point that describe the debug path to add.
         * @param {number} strokeWidth The thickness (in px) of the line the debug path will be drawn with.
         * @returns {D3SingleSelection} Result.
         */
        export function DebugDrawPoints(gDomElement: SVGGElement, points: Point[], strokeWidth: number): D3SingleSelection
        {
            let d: string = "M " + points[0].x + " " + points[0].y; // This handles the case where points contains a single point

            for (let i = 0; i < points.length; i++)
            {
                d += " L " + points[i].x + " " + points[i].y;
            }

            let path: D3SingleSelection = d3.select(gDomElement).append("path").attr("d", d);
            path.node().style.stroke = "red";
            path.node().style.strokeWidth = strokeWidth + "px";

            return (path);
        }
    }
}