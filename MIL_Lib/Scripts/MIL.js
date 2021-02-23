// MIL is a library that makes it easy to define multi-modal (pen/touch/mouse + keyboard) gestures, and to do basic inking.
// MIL works with SVG, and supports panning and zooming.
// MIL requires d3 (https://d3js.org/) v4.
//
// Note: When using _OUTFILE_.js, the d3.js <script> tag must be included PRIOR to the _OUTFILE_.js <script> tag.
//
// Note: _OUTFILE_.js (or _OUTFILE_.d.ts) file MUST be open in VS[2017] for IntelliSense to work in a consuming (.js/.html) file.
//       This is different from d3.js, whose IntelliSense comes from the global @types cache.
//       Further, note that inside the _OUTFILE_.js file itself, _OUTFILE_.d.ts will NOT provide IntelliSense.
//
// TypeScript [_OUTFILE_ build] Note:
//       The [custom] TypeScript build will change the number of backslashes before the <reference> tag below from 4 to 3 in the generated _OUTFILE_.js file.
//       This will enable VS[2017] to provide proper IntelliSense to <script> consumers of _OUTFILE_.js (if _OUTFILE_.js or _OUTFILE_.d.ts is also open in VS[2017]).
//// <reference path="_OUTFILE_.d.ts" />
//
// TypeScript [_OUTFILE_ build] Note:
//       While IntelliSense for a .js file will automatically use the global @types cache, IntelliSense for a .ts file will not (it will ONLY use the local @types cache).
//       How TypeScript searches for types is described here: https://www.typescriptlang.org/docs/handbook/tsconfig-json.html#types-typeroots-and-types
//       How VS automatically acquires types is decribed here: https://docs.microsoft.com/en-us/visualstudio/ide/javascript-intellisense?view=vs-2019#automatic-acquisition-of-type-definitions
"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
/**
 * The MIL namespace.
 */
var MIL;
(function (MIL) {
    /** The names of features that can be provided to MIL.DebugFeature(). */
    var FeatureNames;
    (function (FeatureNames) {
        /** General MIL functionality. */
        FeatureNames[FeatureNames["MIL"] = 1] = "MIL";
        /** The Gesture recognizer. */
        FeatureNames[FeatureNames["GestureRecognition"] = 2] = "GestureRecognition";
        /** The Shape recognizer. */
        FeatureNames[FeatureNames["ShapeRecognition"] = 4] = "ShapeRecognition";
        /** Keyboard behavior. */
        FeatureNames[FeatureNames["KeyboardHandler"] = 8] = "KeyboardHandler";
        /** Hover behavior. */
        FeatureNames[FeatureNames["Hover"] = 16] = "Hover";
        /** PointerEvent occurrences (excluding PointerMove). */
        FeatureNames[FeatureNames["PointerEvents"] = 32] = "PointerEvents";
        /** PointerEvent occurrences (including PointerMove). */
        FeatureNames[FeatureNames["PointerEventsIncludingMove"] = 64] = "PointerEventsIncludingMove";
        /** Pointer capturing. */
        FeatureNames[FeatureNames["PointerCapture"] = 128] = "PointerCapture";
        /** MIL Controls (eg. RulerControl, RadialMenuControl). */
        FeatureNames[FeatureNames["Controls"] = 256] = "Controls";
        /** The default level of debug logging. */
        FeatureNames[FeatureNames["Default"] = 33] = "Default";
    })(FeatureNames = MIL.FeatureNames || (MIL.FeatureNames = {}));
    // MIL can be initialized for multiple [peer, NOT nested] SVG elements on the same web page
    var _svgInfo = {}; // Key: MILID of SVG, Value: SVGInfo
    var _gestures = []; // Array of Gesture objects; the order in which gestures are added affects how gestures get recognized (the first match is returned)
    var _gestureID = 1; // Used to create a unique gesture name when the name ends in '*'
    var _targetElementID = {}; // Key: ElementNodeName, Value: Count; used to create a unique __MILID__ value for a targetDomElement
    var _disabledGestureGroups = {}; // A dictionary of Gesture groups that have been disabled. (Key: groupName, Value: boolean)
    var _debugEnabledFeatures = []; // The names of features that debugging has been enabled for (initialized in Initialize())
    var _activePointerDownEvents = {}; // Key: TargetElementID, Value = (Key: PointerID, Value: PointerDown event)
    var _activePointerDownStartTime = {}; // Key: TargetElementID, Value = Time (in MS) of the first PointerDown event [that's currently active]
    var _activePointerLatestMoveEvents = {}; // Key: TargetElementID, Value = (Key: PointerID, Value: PointerMove event)
    var _activeHoverTimerInfo = {}; // A dictionary of hover-timer information (per active hover pointerID) - Key: PointerID, Value: { HoverTimerInfo } 
    var _activeHoverEvents = {}; // A dictionary of active hover-event information (per element being hovered over) - Key: TargetElementID, Value: Value = (Key: PointerID, Value: PointerEnter event)
    var _activeHoverStartTime = {}; // A dictionary of hover-start times (per element being hovered over) - Key: TargetElementID, Value = Time (in MS) of the first PointerEnter event [that's currently active]
    // Stores per-target state needed for gesture recognition [Note: We never delete from this dictionary, so it grows over time]
    var _targetElementState = {};
    // Stores per-target hover timeouts (in milliseconds)
    var _hoverTimeouts = {};
    /**
     * [Internal] The queue of pointerDown/Move/Up events that are postponed while waiting to see if a gesture recognition will succeed.
     * Note: Because this member is exported, it must always be referenced with a "MIL." prefix otherwise the VS[2017] debugger will not see it at runtime.
     * @internal
     */
    MIL._postponedPointerEvents = [];
    /**
     * [Internal] All the Ink objects that have been created [via Gesture.Ink()].
     * Note: Because this member is exported, it must always be referenced with a "MIL." prefix otherwise the VS[2017] debugger will not see it at runtime.
     * @internal
     */
    MIL._inks = [];
    /** How Ink objects should be combined. */
    var InkAutoCombineMode;
    (function (InkAutoCombineMode) {
        /** No combining of inks. */
        InkAutoCombineMode[InkAutoCombineMode["Off"] = 0] = "Off";
        /** If ink B starts within ink A, combine ink B with Ink A. */
        InkAutoCombineMode[InkAutoCombineMode["StartsWithin"] = 1] = "StartsWithin";
        /** If ink B end within ink A, combine ink B with Ink A. */
        InkAutoCombineMode[InkAutoCombineMode["EndsWithin"] = 2] = "EndsWithin";
        /** If ink B is wholly contained within ink A, combine ink B with Ink A. */
        InkAutoCombineMode[InkAutoCombineMode["ContainedWithin"] = 4] = "ContainedWithin";
        /** If any point of ink B lies within ink A, combine ink B with Ink A. */
        InkAutoCombineMode[InkAutoCombineMode["AnyPointWithin"] = 8] = "AnyPointWithin";
        /** Always combine inks that overlap in any way. */
        InkAutoCombineMode[InkAutoCombineMode["Always"] = 15] = "Always";
    })(InkAutoCombineMode = MIL.InkAutoCombineMode || (MIL.InkAutoCombineMode = {}));
    /**
     * The possible pen buttons [see http://www.w3.org/TR/pointerevents2/].
     * Note that these are bitmask values for the PointerEvent.buttons property, and are distinct from the PointerEvent.button property values.
     */
    var PenButton;
    (function (PenButton) {
        /** Pen moved while hovering with no buttons pressed. */
        PenButton[PenButton["NoneHover"] = 0] = "NoneHover";
        /** aka. "Contact": Not really a button (this is just the default value when the pen makes contact). */
        PenButton[PenButton["None"] = 1] = "None";
        /** The button on the side of the [Surface] pen. */
        PenButton[PenButton["Barrel"] = 2] = "Barrel";
        /** The button on top of the [Surface] pen. */
        PenButton[PenButton["Eraser"] = 32] = "Eraser";
    })(PenButton = MIL.PenButton || (MIL.PenButton = {}));
    /** The type (style) of hull path to create for an Ink. */
    var InkHullType;
    (function (InkHullType) {
        InkHullType[InkHullType["None"] = 0] = "None";
        InkHullType[InkHullType["Concave"] = 1] = "Concave";
        InkHullType[InkHullType["Convex"] = 2] = "Convex"; // Note: D3 computes convex hulls
    })(InkHullType = MIL.InkHullType || (MIL.InkHullType = {}));
    /**
     * [Internal] Information about the <svg> and <g> host containers.
     * @internal
     */
    var SVGInfo = /** @class */ (function () {
        function SVGInfo(svgDomElement, gDomElement) {
            this.svgDomElement = svgDomElement;
            this.gDomElement = gDomElement;
            this.svgWidth = svgDomElement.clientWidth;
            this.svgHeight = svgDomElement.clientHeight;
            this.zoomLevel = 1;
            this.panTop = 0;
            this.panLeft = 0;
            this.gSelection = d3.select(gDomElement);
            this.settings = new MIL.MILSettings();
            this.ruler = null;
            this.frame = null;
            this.radialMenus = [];
        }
        return SVGInfo;
    }());
    MIL.SVGInfo = SVGInfo;
    /**
     * Base exception for all errors raised by MIL.
     */
    var MILException = /** @class */ (function (_super) {
        __extends(MILException, _super);
        function MILException(message) {
            var _this = _super.call(this, (MIL.Utils.isIE11() ? "MILException: " : "") + message) || this;
            _this.name = "MILException";
            return _this;
        }
        return MILException;
    }(Error));
    MIL.MILException = MILException;
    /**
     * [Internal] Returns true if gesture recognition is currently in the process of acquiring pointers.
     * @returns {boolean} Result.
     * @internal
     */
    function isAcquiringPointers() {
        for (var targetElementID in _targetElementState) {
            if (_targetElementState[targetElementID].isAcquiringPointers === true) {
                return (true);
            }
        }
        return (false);
    }
    MIL.isAcquiringPointers = isAcquiringPointers;
    /**
     * [Internal] Logs a debug message to the console (if the specified feature has been enabled for logging).
     * @param {string} message The messsage to log.
     * @param {FeatureNames} [featureName] [Optional] The MIL feature that this message applies to. If supplied, the message will only be logged if debugging
     * has been turned on for that feature using MIL.DebugFeature() [it is on for FeatureNames.MIL by default].
     * @internal
     */
    function log(message, featureName) {
        if (featureName === void 0) { featureName = FeatureNames.MIL; }
        // Don't log if debugging has not be turned on for the specified feature
        if (!DebugFeature(featureName)) {
            return;
        }
        // Note: We always use FeatureNames.MIL (NOT featureName) as the logged prefix
        MIL.Utils.Log(message, FeatureNames[FeatureNames.MIL]);
    }
    MIL.log = log;
    /**
     * [Internal] Gets the name of a property of an object. Throws if the supplied 'fn' function cannot be parsed.
     * @param {function(): any} fn A lambda of the form "() => obj.prop", where "prop" is the property whose name will be returned.
     * @returns {string} The property name (eg. "prop").
     * @internal
     */
    function nameof(fn) {
        var fnStr = fn.toString(); // Eg. "function () { return _this._inkAutoCombineMode; }"
        var startPos = fnStr.indexOf(".") + 1;
        if (startPos > 0) {
            var endPos = fnStr.indexOf(";", startPos);
            if (endPos > startPos) {
                var propName = fnStr.substring(startPos, endPos);
                return (propName);
            }
        }
        throw new MILException("Unable to parse property name from '" + fnStr + "'");
    }
    MIL.nameof = nameof;
    /**
     * [Internal] Used to set/get a property of an object [when no special processing by either the getter or setter is needed].
     * @param {BaseObject} obj The object to get/set the property of.
     * @param {string} propertyName The name of the property to get/set.
     * @param {any} [newValue] [Optional] The new value for the property. Note: MUST be undefined to avoid invoking the setter.
     * @param {function(): void} [postSetAction] [Optional] An action to perform after setting the value.
     * @returns {any | BaseObject} Either the property value (if getting), or 'obj' (if setting).
     * @internal
     */
    function getOrSetProperty(obj, propertyName, newValue, postSetAction) {
        if (!obj.hasOwnProperty(propertyName)) {
            throw new MILException("Invalid propertyName '" + propertyName + "'");
        }
        if (newValue === undefined) {
            // Getter (return the property value)
            return (obj[propertyName]);
        }
        else {
            // Setter (return the object to support chaining)
            obj[propertyName] = newValue;
            if (postSetAction) {
                postSetAction();
            }
            return (obj.hasOwnProperty("_parentObj") ? obj._parentObj : obj);
        }
    }
    MIL.getOrSetProperty = getOrSetProperty;
    /**
     * [Internal] Used to check if an attempt is being made to set a read-only property - in which case it will throw.
     * @param {string} propertyName The read-only property name.
     * @param {IArguments} args The list of arguments (if any) being passed to the getter [that's calling readOnlyProperty()].
     * @internal
     */
    function readOnlyProperty(propertyName, args) {
        if (args.length > 0) {
            throw new MILException("The '" + propertyName + "' property is read-only");
        }
    }
    MIL.readOnlyProperty = readOnlyProperty;
    /**
     * Enables or disabled debug console messages for the specified MIL feature, or returns whether logging for the specified feature is enabled.
     * Note: All "general" logging (ie. that is NOT feature-specific) done by MIL can be turned off with this command: MIL.DebugFeature(MIL.FeatureNames.MIL, false);
     * @param {FeatureNames} featureNames One-or-more MIL.FeatureNames value (eg. MIL.FeatureNames.MIL | MIL.FeatureNames.GestureRecognition).
     * @param {boolean} [enable] [Optional] Whether to turn debug messages on or off. If not supplied, the method with return whether logging for the specified feature(s) is enabled.
     * @returns {boolean | void} Result.
     */
    function DebugFeature(featureNames, enable) {
        var validMask = 0;
        var validFeatureNames = [];
        var suppliedFeatureNames = [];
        // Build validMask and populate suppliedFeatureNames
        for (var propName in FeatureNames) {
            if (isNaN(+propName)) {
                validFeatureNames.push(propName);
            }
            else {
                var enumValue = +propName;
                validMask |= enumValue;
                if ((featureNames & enumValue) && (enumValue !== FeatureNames.Default)) {
                    suppliedFeatureNames.push(FeatureNames[enumValue]);
                }
            }
        }
        // Check featureNames
        var isValidFeatures = (featureNames > 0) && ((featureNames & validMask) <= validMask);
        if (!isValidFeatures) {
            throw new MILException("Invalid featureNames (" + featureNames + "); valid values are: " + validFeatureNames.join(", "));
        }
        if (enable === undefined) {
            // Check if ALL the supplied featureNames are enabled
            var result_1 = (suppliedFeatureNames.length > 0);
            suppliedFeatureNames.forEach(function (featureName) {
                if (_debugEnabledFeatures.indexOf(featureName) === -1) {
                    result_1 = false;
                }
            });
            return (result_1);
        }
        else {
            // Enable/disable the supplied featureNames
            suppliedFeatureNames.forEach(function (featureName) {
                if (enable) {
                    if (_debugEnabledFeatures.indexOf(featureName) === -1) {
                        _debugEnabledFeatures.push(featureName);
                    }
                }
                else {
                    var index = _debugEnabledFeatures.indexOf(featureName);
                    if (index !== -1) {
                        _debugEnabledFeatures.splice(index, 1);
                    }
                }
            });
        }
    }
    MIL.DebugFeature = DebugFeature;
    /** Reports debugging information to the console window about MIL state. */
    function ShowDebugInfo() {
        var pointerDownEventCount = Object.keys(_activePointerDownEvents).length;
        var pointerMoveEventCount = Object.keys(_activePointerLatestMoveEvents).length;
        var capturingElementsCount = Object.keys(MIL._activePointerCaptures).length;
        var activeHoverTimerCount = Object.keys(_activeHoverTimerInfo).length;
        var activeHoverEventCount = Object.keys(_activeHoverEvents).length;
        var targetElementStateCount = Object.keys(_targetElementState).length;
        var pointerDownList = "";
        var pointerMoveList = "";
        var pointerCaptureList = "";
        var hoverEventList = "";
        var hoverTimerList = "";
        var targetElementID; // for-loop variable
        var pointerID; // for-loop variable
        log("DEBUG: All Gestures:");
        for (var g = 0; g < _gestures.length; g++) {
            var gesture = _gestures[g];
            log("  " + gesture.Name() + " (on " + getTargetElementID(gesture.Target()) + ")");
        }
        log("DEBUG: Gesture count: " + _gestures.length);
        log("DEBUG: Active PointerDown event count: " + pointerDownEventCount);
        for (targetElementID in _activePointerDownEvents) {
            for (pointerID in _activePointerDownEvents[targetElementID]) {
                pointerDownList += "[" + targetElementID + "][" + pointerID + "] ";
            }
        }
        if (pointerDownEventCount > 0) {
            log("  " + pointerDownList);
        }
        log("DEBUG: Active PointerMove event count: " + pointerMoveEventCount);
        for (targetElementID in _activePointerLatestMoveEvents) {
            for (pointerID in _activePointerLatestMoveEvents[targetElementID]) {
                pointerMoveList += "[" + targetElementID + "][" + pointerID + "] ";
            }
        }
        if (pointerMoveEventCount > 0) {
            log("  " + pointerMoveList);
        }
        log("DEBUG: Elements capturing pointer events: " + capturingElementsCount);
        for (targetElementID in MIL._activePointerCaptures) {
            pointerCaptureList += targetElementID + " [" + MIL._activePointerCaptures[targetElementID].join(", ") + "] ";
        }
        if (capturingElementsCount > 0) {
            log("  " + pointerCaptureList);
        }
        log("DEBUG: Active Hover timer count: " + activeHoverTimerCount);
        for (pointerID in _activeHoverTimerInfo) {
            var hoverTimerInfo = _activeHoverTimerInfo[pointerID];
            hoverTimerList += "[" + getTargetElementID(hoverTimerInfo.targetDomElement) + "][" + pointerID + "] ";
        }
        if (activeHoverTimerCount > 0) {
            log("  " + hoverTimerList);
        }
        log("DEBUG: Active Hover event count: " + activeHoverEventCount);
        for (targetElementID in _activeHoverEvents) {
            for (pointerID in _activeHoverEvents[targetElementID]) {
                hoverEventList += "[" + targetElementID + "][" + pointerID + "] ";
            }
        }
        if (activeHoverEventCount > 0) {
            log("  " + hoverEventList);
        }
        log("DEBUG: Ink count: " + MIL._inks.length);
        log("DEBUG: Elements interacted with: " + targetElementStateCount + (targetElementStateCount > 0 ? " (" + Object.keys(_targetElementState).join(", ") + ")" : ""));
        log("DEBUG: Pressed keys: " + MIL.Utils.GetPressedKeyInfo());
    }
    MIL.ShowDebugInfo = ShowDebugInfo;
    /**
     * [Internal] Returns the SVGInfo for the specified 'targetElement' (which must be an SVGElement).
     * @param {TargetDomElement} targetElement The SVGElement to inspect.
     * @returns {SVGInfo} Result.
     * @internal
     */
    function getSvgInfo(targetElement) {
        var domElement = MIL.Utils.GetDomElement(targetElement, SVGElement); // PORT: ", SVGElement" was added
        var isRootSvg = (domElement instanceof SVGSVGElement) && (domElement.ownerSVGElement === null);
        var svgDomElement = null;
        if (isRootSvg) {
            svgDomElement = domElement;
        }
        else {
            if (domElement.ownerSVGElement !== null) {
                svgDomElement = domElement.ownerSVGElement;
            }
            else {
                if ((domElement.ownerDocument !== null) && (domElement.ownerDocument.activeElement !== null) && (domElement.ownerDocument.activeElement instanceof SVGElement)) {
                    if (domElement.ownerDocument.activeElement.ownerSVGElement !== null) {
                        svgDomElement = domElement.ownerDocument.activeElement.ownerSVGElement;
                    }
                    else {
                        if (domElement.ownerDocument.activeElement instanceof SVGSVGElement) {
                            svgDomElement = domElement.ownerDocument.activeElement;
                        }
                    }
                }
            }
        }
        var svgID = getTargetElementID(svgDomElement);
        return (_svgInfo[svgID]);
    }
    MIL.getSvgInfo = getSvgInfo;
    /**
     * Returns the MIL settings associated with the specified <SVG> element.
     * @param {SVGSVGElement} svg The SVG element to find the MIL settings for.
     * @returns {MILSettings} The associated MIL settings.
     */
    function Settings(svg) {
        var svgDomElement = MIL.Utils.GetDomElement(svg, SVGSVGElement);
        var svgInfo = getSvgInfo(svgDomElement);
        return (svgInfo.settings);
    }
    MIL.Settings = Settings;
    // Note: This factory method just makes the syntax for creating a Gesture a little cleaner.
    /**
     * Creates a new Gesture with the specified name.
     * @param {string} name The name of the Gesture. Add '*' as a suffix to create a unique name.
     * @param {boolean} [ignoreGestureDefaults] [Optional] Typically only used by internal Gestures [to allow MIL to create Gestures without having to call MIL.GestureDefaults.Reset(), which could be an unwanted side-effect].
     * @returns {Gesture} The created Gesture.
     */
    function CreateGesture(name, ignoreGestureDefaults) {
        // If needed, make the name unique
        if (name[name.length - 1] === "*") {
            name = name.slice(0, name.length - 1) + "_#" + _gestureID++;
        }
        return (new MIL.Gesture(name, ignoreGestureDefaults));
    }
    MIL.CreateGesture = CreateGesture;
    /**
     * Adds the specified Gesture, making it available to be recognized.
     * Note: If multiple Gestures have the same definition (target/pointerType/conditional), the one which was created first will be the one that gets recognized.
     * @param {Gesture} gesture The Gesture to add.
     * @returns {Gesture} The added Gesture.
     */
    function AddGesture(gesture) {
        var svgInfo = getSvgInfo(gesture.Target());
        if (!svgInfo) {
            throw new MILException("Call Initialize() prior to calling AddGesture()");
        }
        if (!(gesture instanceof MIL.Gesture)) {
            throw new MILException("The supplied 'gesture' parameter must be of type Gesture");
        }
        // A gesture that uses multiple pointers must have a non-zero recognition timeout [because the pointers will make contact at slightly different times]
        var pointerCount = gesture.PointerCount();
        if ((gesture.RecognitionTimeoutInMs() === 0) && (pointerCount > 1)) {
            throw new MILException("Gesture '" + gesture.Name() + "' uses " + pointerCount + " pointers so must specify a non-zero RecognitionTimeoutInMs()");
        }
        var name = gesture.Name();
        var targetDomElement = gesture.Target();
        if (GetGestureByName(name) !== null) {
            throw new MILException("A gesture named '" + name + "' already exists; consider adding '*' to the end of the name to automatically make it unique");
        }
        if (!targetDomElement) {
            // Because we use the target to determine if we should call addPointerEventListeners() [see below]
            throw new MILException("Gesture '" + name + "' must specify a Target() before it can be added");
        }
        if (!gesture.PointerType()) {
            // A gesture can never be recognized without this
            throw new MILException("Gesture '" + name + "' must specify a PointerType() before it can be added");
        }
        // Check if the gesture has a "mouse+" PointerType (because this likely will not work as expected on Chrome)
        // From https://www.w3.org/TR/pointerevents/#the-primary-pointer: "Some user agents may ignore the concurrent use of more than one type of pointer input to avoid accidental interactions."
        if (MIL.Utils.isChrome()) {
            var permutation;
            for (var _i = 0, _a = gesture.PointerTypePermutations(); _i < _a.length; _i++) {
                permutation = _a[_i];
                if ((permutation.indexOf("mouse+") !== -1) || (permutation.indexOf("+mouse") !== -1) || (permutation.indexOf("any+") !== -1) || (permutation.indexOf("+any") !== -1)) // "any" includes "mouse"
                 {
                    log("Warning: Gesture '" + gesture.Name() + "' specifies simultaneous use of " + permutation + " so may not function as expected because Chrome will not generate all the expected PointerEvents for the mouse (such as pointerUp or pointerMove) during the gesture");
                    break;
                }
            }
        }
        // If this is the first gesture to use gesture.Target() then add the pointer-event listeners to the target
        if ((targetDomElement !== svgInfo.svgDomElement) && // MIL.Initialize() will already have done this
            (getGestureCountByTarget(targetDomElement) === 0)) {
            addPointerEventListeners(targetDomElement);
        }
        _gestures.push(gesture);
        return (gesture);
    }
    MIL.AddGesture = AddGesture;
    /**
     * Returns the Gesture that has the specified name.
     * @param {string} name The name of the Gesture to find.
     * @returns {Gesture | null} Either the found gesture, or null if no such Gesture exists.
     */
    function GetGestureByName(name) {
        for (var g = 0; g < _gestures.length; g++) {
            if (_gestures[g].Name() === name) {
                return (_gestures[g]);
            }
        }
        return (null);
    }
    MIL.GetGestureByName = GetGestureByName;
    /**
     * Returns the Gesture (if any) that is using the pointer that generated the supplied PointerEvent. Returns null if there is no such Gesture.
     * @param {PointerEvent} e A PointerEvent.
     * @param {string} [gestureNamePrefix] [Optional] Only if the Gesture starts with this prefix will it be returned.
     * @returns {Gesture | null} Either the found gesture, or null if no such Gesture exists.
     */
    function GetGestureFromEvent(e, gestureNamePrefix) {
        var pointerID = makePointerID(e);
        for (var g = 0; g < _gestures.length; g++) {
            var gesture = _gestures[g];
            if ((gesture.ActivePointerList().indexOf(pointerID) !== -1) && ((gestureNamePrefix === undefined) || (gesture.Name().indexOf(gestureNamePrefix) === 0))) {
                return (gesture);
            }
        }
        return (null);
    }
    MIL.GetGestureFromEvent = GetGestureFromEvent;
    // This method is useful in callbacks where a Gesture instance is assigned to 'this'. 
    // The JS callback function can use it get the correct VS IntelliSense for 'this', eg. by writing "var gesture = MIL.ThisGesture(this);".
    // An alternative would be for the JS callback to include the JSDoc comment "/** @this MIL.Gesture */", but this is less discoverable.
    /**
     * Given an object (typically 'this') checks if it's a Gesture instance and, if so, returns the object. Throws if it's not a Gesture.
     * @param {object} o The object to check.
     * @returns {Gesture} Result.
     */
    function ThisGesture(o) {
        if (o instanceof MIL.Gesture) {
            return (o);
        }
        else {
            throw new MILException("The specified object is not a Gesture instance");
        }
    }
    MIL.ThisGesture = ThisGesture;
    // This method is useful in callbacks where an Ink instance is assigned to 'this'. 
    // The JS callback function can use it get the correct VS IntelliSense for 'this', eg. by writing "var ink = MIL.ThisInk(this);".
    // An alternative would be for the JS callback to include the JSDoc comment "/** @this MIL.Ink */", but this is less discoverable.
    /**
     * Given an object (typically 'this') checks if it's an Ink instance and, if so, returns the object. Throws if it's not an Ink.
     * @param {object} o The object to check.
     * @returns {Ink} Result.
     */
    function ThisInk(o) {
        if (o instanceof MIL.Ink) {
            return (o);
        }
        else {
            throw new MILException("The specified object is not an Ink instance");
        }
    }
    MIL.ThisInk = ThisInk;
    // This method is useful in callbacks where an RulerControl instance is assigned to 'this'. 
    // The JS callback function can use it get the correct VS IntelliSense for 'this', eg. by writing "var ruler = MIL.ThisRuler(this);".
    // An alternative would be for the JS callback to include the JSDoc comment "/** @this MIL.Controls.RulerControl */", but this is less discoverable.
    /**
     * Given an object (typically 'this') checks if it's a Ruler control instance and, if so, returns the object. Throws if it's not a Ruler.
     * @param {object} o The object to check.
     * @returns {Controls.RulerControl} Result.
     */
    function ThisRuler(o) {
        if (o instanceof MIL.Controls.RulerControl) {
            return (o);
        }
        else {
            throw new MILException("The specified object is not a Controls.RulerControl instance");
        }
    }
    MIL.ThisRuler = ThisRuler;
    /**
     * Given an object (typically 'this') checks if it's a RadialMenuControl control instance and, if so, returns the object. Throws if it's not a RadialMenuControl.
     * @param {object} o The object to check.
     * @returns {Controls.RadialMenuControl} Result.
     */
    function ThisRadialMenu(o) {
        if (o instanceof MIL.Controls.RadialMenuControl) {
            return (o);
        }
        else {
            throw new MILException("The specified object is not a Controls.RadialMenuControl instance");
        }
    }
    MIL.ThisRadialMenu = ThisRadialMenu;
    /**
     * [Internal] Returns the __MILID__ (eg. "svg_1") of the specified targetDomElement. Throws if the ID is missing.
     * @param {DomElement} targetDomElement The DOM element to inspect.
     * @returns {string} Result.
     * @internal
     */
    function getTargetElementID(targetDomElement) {
        if (targetDomElement.__MILID__ === undefined) {
            throw new MILException("The MIL TargetElementID is missing from the specified targetDomElement (" + targetDomElement.nodeName + ")");
        }
        return (targetDomElement.__MILID__);
    }
    MIL.getTargetElementID = getTargetElementID;
    /**
     * [Internal] Sets the __MILID__ property (eg. "svg_1") of the specified 'targetDomElement' (if not already set).
     * @param {DomElement} targetDomElement The DOM element to tag.
     * @internal
     */
    function tagWithTargetElementID(targetDomElement) {
        if (targetDomElement.__MILID__ === undefined) {
            if (_targetElementID[targetDomElement.nodeName] === undefined) {
                _targetElementID[targetDomElement.nodeName] = 1;
            }
            else {
                _targetElementID[targetDomElement.nodeName]++;
            }
            // Note: By tagging the DOM element we can (if needed) locate the element later on
            targetDomElement.__MILID__ = targetDomElement.nodeName + "_" + _targetElementID[targetDomElement.nodeName];
        }
    }
    MIL.tagWithTargetElementID = tagWithTargetElementID;
    /**
     * Returns true if at least one Ink is currently being dragged.
     * @returns {boolean} Result.
     */
    function IsInkDragInProgress() {
        for (var i = 0; i < MIL._inks.length; i++) {
            if (MIL._inks[i].previousDragMovePoint() !== null) {
                return (true);
            }
        }
        return (false);
    }
    MIL.IsInkDragInProgress = IsInkDragInProgress;
    /**
     * Returns all the current Ink instances that have the specified 'className', or returns all Inks if no 'className' is specified.
     * @param {string} [className] [Optional] The class name an Ink instance should have to be included in the results.
     * @returns {Ink[]} Result.
     */
    function Inks(className) {
        var filteredInks = [];
        for (var i = 0; i < MIL._inks.length; i++) {
            if ((className === undefined) || MIL._inks[i].Path().classed(className)) {
                filteredInks.push(MIL._inks[i]);
            }
        }
        // We don't return _inks directly so that Inks() can be iterated over and freely delete from _inks (eg. via Ink.Delete()) without issue
        return (filteredInks);
    }
    MIL.Inks = Inks;
    /**
     * Returns the Ink that corresponds to the supplied SVG Path, or null if the Path does not belong to any Ink (as either its Ink.Path or Ink.HullPath).
     * @param {TargetDomElement} targetElement The Path element to check.
     * @returns {Ink | null} Result.
     */
    function GetInkByElement(targetElement) {
        var domElement = MIL.Utils.GetDomElement(targetElement);
        if (domElement instanceof SVGPathElement) {
            for (var i = 0; i < MIL._inks.length; i++) {
                var inkPathMatches = (MIL._inks[i].Path().node() === domElement);
                var hullPathMatches = (MIL._inks[i].HullPath() !== null) && (MIL._inks[i].HullPath().node() === domElement);
                if (inkPathMatches || hullPathMatches) {
                    return (MIL._inks[i]);
                }
            }
        }
        return (null);
    }
    MIL.GetInkByElement = GetInkByElement;
    /**
     * Returns the Ink that has the supplied ID, or null if there is no such Ink.
     * @param {string} targetInkID The ID of the Ink to find.
     * @returns {Ink | null} Result.
     */
    function GetInkByID(targetInkID) {
        for (var i = 0; i < MIL._inks.length; i++) {
            if (MIL._inks[i].InkID() === targetInkID) {
                return (MIL._inks[i]);
            }
        }
        return (null);
    }
    MIL.GetInkByID = GetInkByID;
    /**
     * [Private Method] Returns true if a Gesture has started.
     * @returns {boolean} Result.
     */
    function isAwaitingGestureCompletion() {
        for (var targetElementID in _targetElementState) {
            if (_targetElementState[targetElementID].isAwaitingGestureCompletion === true) {
                return (true);
            }
        }
        return (false);
    }
    /**
     * [Private Method] Adds MIL's event listeners to the specified element.
     * @param {DomElement} domElement The target element.
     */
    function addPointerEventListeners(domElement) {
        // Note: d3 doesn't support pointer-events natively [because of sparse support in mobile browsers, particularly iOS/Safari]
        domElement.addEventListener("pointerdown", onPointerDown);
        domElement.addEventListener("pointerup", onPointerUp);
        domElement.addEventListener("pointermove", onPointerMove);
        domElement.addEventListener("pointerenter", onPointerEnter);
        domElement.addEventListener("pointerleave", onPointerLeave);
        domElement.addEventListener("pointercancel", onPointerCancel);
        domElement.addEventListener("contextmenu", onContextMenu);
    }
    /**
     * [Private Method] Removes MIL's event listeners from the specified element.
     * @param {DomElement} domElement The target element.
     */
    function removePointerEventListeners(domElement) {
        domElement.removeEventListener("pointerdown", onPointerDown);
        domElement.removeEventListener("pointerup", onPointerUp);
        domElement.removeEventListener("pointermove", onPointerMove);
        domElement.removeEventListener("pointerenter", onPointerEnter);
        domElement.removeEventListener("pointerleave", onPointerLeave);
        domElement.removeEventListener("pointercancel", onPointerCancel);
        domElement.removeEventListener("contextmenu", onContextMenu);
    }
    /**
     * The version of MIL.
     * @returns {string} Version in the form "Major.Minor.Date.IntraDayRevision" [where Date = YYYYMMDD].
     */
    function Version() {
        return ("0.0.20200224.0"); // Major.Minor.Date.IntraDayRevision [Date = YYYYMMDD]
    }
    MIL.Version = Version;
    /**
     * Initializes MIL for use with the specified SVG element. The returned <g> element is automatically appended to the <svg>.
     * @param {SVGSVGElement | D3SingleSelection} svg The SVG element to enable for use with MIL. Can either be an SVG DOM element, or a d3 selection of that DOM element.
     * @returns {SVGGElement} The created SVG Group (<g>) DOM element.
     */
    function Initialize(svg) {
        if (typeof (d3) === "undefined") {
            throw new MILException("MIL requires d3.js (v4): visit https://d3js.org/");
        }
        var svgDomElement = MIL.Utils.GetDomElement(svg, SVGSVGElement);
        if (svgDomElement.ownerSVGElement !== null) {
            // This would allow independent panning/zooming of the nested SVG, which is not currently supported 
            // [it would break the "linearity" of the original SVG's drawing surface]
            throw new MILException("Calling Initialize() on a nested SVG element is not allowed");
        }
        if (window.getComputedStyle(svgDomElement).touchAction !== "none") {
            throw new MILException("When using MIL the target SVG element must have its 'touch-action' CSS property set to 'none' to turn off the browser's default touch gestures");
        }
        // Turn on the default level of logging
        DebugFeature(FeatureNames.Default, true);
        tagWithTargetElementID(svgDomElement);
        var svgID = getTargetElementID(svgDomElement);
        if (_svgInfo[svgID] === undefined) {
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
                    svgWidth: svgDomElement.clientWidth,
                    svgHeight: svgDomElement.clientHeight,
                    zoomLevel: 1,
                    panTop: 0,
                    panLeft: 0,
                    gSelection: d3.select(gDomElement),
                    settings: new MIL.MILSettings(),
                    ruler: null,
                    frame: null,
                    radialMenus: []
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
        if (MIL.Utils.isIE11()) // PORT: For now we'll assume the bug only happens on IE11
         {
            var checkIntervalInMs_1 = 200;
            setInterval(function eventWatchdog() {
                var normalMaxAgeInMs = (checkIntervalInMs_1 / 2) + 50; // 150ms
                for (var targetElementID in _activePointerLatestMoveEvents) {
                    for (var pointerID in _activePointerLatestMoveEvents[targetElementID]) {
                        var e = _activePointerLatestMoveEvents[targetElementID][pointerID];
                        var now = Date.now(); // Just to make debugging easier
                        var isPointerCapturedByElement = MIL._activePointerCaptures.hasOwnProperty(targetElementID) && (MIL._activePointerCaptures[targetElementID].indexOf(pointerID) !== 1);
                        // Pen and touch (but not mouse) pointer-move events get generated with high-frequency [after a pointer-down],
                        // so if the latest pointer-move event becomes "too old" it indicates that pointer events have stopped happening,
                        // which is BUGBUG#1 (a capturing element stops receiving pointer-events)
                        if (isPointerCapturedByElement && ((e.pointerType === "touch") || (e.pointerType === "pen")) && (e.type === "pointermove")) {
                            var moveEventAgeInMs = now - e.__MILTimeStamp__;
                            if (moveEventAgeInMs > (checkIntervalInMs_1 + (normalMaxAgeInMs * 3))) // 650ms
                             {
                                log("Warning: BUGBUG#1 detected for " + pointerID + " on " + targetElementID + " [pointer is captured, but last pointerMove event age is " + moveEventAgeInMs + "ms]");
                                onPointerUp(e); // Try to recover
                            }
                        }
                    }
                }
            }, checkIntervalInMs_1);
        }
        return (_svgInfo[svgID].gDomElement);
    }
    MIL.Initialize = Initialize;
    /**
     * Returns the count of active Gestures that target the specified element.
     * @param {DomElement | null} targetDomElement The element to filter by, or null to include all Gestures regardless of the element they target.
     * @returns {number} Result.
     */
    function GetActiveGestureCount(targetDomElement) {
        var domElement = MIL.Utils.GetDomElement(targetDomElement);
        var activeGestureCount = 0;
        for (var g = 0; g < _gestures.length; g++) {
            if ((targetDomElement === null) || (_gestures[g].Target() === domElement)) {
                if (_gestures[g].IsActive() && !_gestures[g].IsCancelled()) {
                    activeGestureCount++;
                }
            }
        }
        return (activeGestureCount);
    }
    MIL.GetActiveGestureCount = GetActiveGestureCount;
    /**
     * [Private Method] Returns a count of the number of Gestures that target the specified element.
     * @param {DomElement} targetDomElement The element to inspect.
     * @returns {number} Result.
     */
    function getGestureCountByTarget(targetDomElement) {
        var gestureCountForTarget = 0;
        for (var g = 0; g < _gestures.length; g++) {
            if (_gestures[g].Target() === targetDomElement) {
                gestureCountForTarget++;
            }
        }
        return (gestureCountForTarget);
    }
    /**
     * Removes the Gesture with the specified name. A silent no-op if no such Gesture exists.
     * @param {string} name The name of the Gesture to remove.
     */
    function RemoveGestureByName(name) {
        for (var g = 0; g < _gestures.length; g++) {
            var gesture = _gestures[g];
            if (gesture.Name() === name) {
                removeGestureAtIndex(g);
                // No need to keep looking since gesture names are unique
                break;
            }
        }
    }
    MIL.RemoveGestureByName = RemoveGestureByName;
    /**
     * [Private Method] Removes the Gesture at the specified index (of _gestures). A silent no-op if no such index exists.
     * @param {number} index The index of the Gesture to remove.
     */
    function removeGestureAtIndex(index) {
        if (index < _gestures.length) {
            var gesture = _gestures[index];
            var targetDomElement = gesture.Target();
            // Remove the Gesture
            _gestures.splice(index, 1);
            // If this was the last gesture to use gesture.Target() then remove the pointer-event listeners from the target
            if (getGestureCountByTarget(targetDomElement) === 0) {
                removePointerEventListeners(targetDomElement);
            }
        }
    }
    /**
     * Removes all the Gestures that target the specified element, optionally filtered by having a name that starts with gestureName.
     * @param {TargetDomElement} targetElement The element to inspect.
     * @param {string} [gestureName] [Optional] Only remove a Gesture if it starts with this name.
     */
    function RemoveGesturesByTarget(targetElement, gestureName) {
        var domElement = MIL.Utils.GetDomElement(targetElement);
        for (var g = _gestures.length - 1; g >= 0; g--) {
            var gesture = _gestures[g];
            var name = gesture.Name(); // Note: Don't use 'let' here: it will result in the variable being renamed during compilation which means it won't surface correctly in the debugger
            if (gesture.Target() === domElement) {
                if ((gestureName === undefined) || (name.indexOf(gestureName) === 0)) {
                    removeGestureAtIndex(g);
                    // Note that we keep looking for additional gestures on the domElement
                }
            }
        }
    }
    MIL.RemoveGesturesByTarget = RemoveGesturesByTarget;
    /**
     * Transposes the clientX/Y of the supplied Pointer Event into the coordinate space of the specified svg 'g' element [which may have been transformed].
     * Returns the new point as an object with x/y members.
     * @param {PointerEvent} e The PointerEvent to transpose.
     * @param {SVGGElement} g The SVG group element (or other SVG Element that's in an SVG group) to transpose the PointerEvent into.
     * @returns {Point} Result.
     */
    function TransposePointer(e, g) {
        // Note: e.clientX/Y are relative to [the top-left (0,0)] of the document window
        var pointInGSpace = TransposeScreenPoint({ x: e.clientX, y: e.clientY }, g);
        return (pointInGSpace); // With no zooming, this point will be the same as { x: e.clientX, y: e.clientY } [assuming the svg is at 0,0 in the document]
    }
    MIL.TransposePointer = TransposePointer;
    /**
     * Transposes the supplied screen-point into the coordinate space of the svg 'g' element [which may have been transformed] to which targetElement belongs.
     * Returns the new point as an object with x/y members.
     * @param {Point} screenPoint A point in screen coordinates.
     * @param {SVGGElement | TargetDomElement} targetElement The SVG group element (or other SVGElement that's in the SVG group) to transpose the 'screenPoint' into.
     * @returns {Point} Result.
     */
    function TransposeScreenPoint(screenPoint, targetElement) {
        var gDomElement = null;
        if (targetElement instanceof SVGGElement) {
            gDomElement = targetElement;
        }
        else {
            var svgInfo = getSvgInfo(targetElement);
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
    MIL.TransposeScreenPoint = TransposeScreenPoint;
    /**
     * Gets or sets the zoom level for the specified SVG element.
     * @param {TargetDomElement} svgDomElement An SVG element.
     * @param {number} [level] [Optional] The new zoom level.
     * @param {Point} [focalScreenPoint] [Optional] The focal point (in screen coordinates) of the zoom. If not supplied, the center of the SVG elment will be used.
     * @returns {number | void} Result (or void).
     */
    function Zoom(svgDomElement, level, focalScreenPoint) {
        var svgInfo = getSvgInfo(svgDomElement);
        var settings = svgInfo.settings;
        var ruler = svgInfo.ruler;
        if (level === undefined) {
            return (svgInfo.zoomLevel);
        }
        else {
            if (level !== svgInfo.zoomLevel) {
                var prevZoomLevel = svgInfo.zoomLevel;
                var newZoomLevel = svgInfo.zoomLevel = Math.min(settings.MaxZoomLevel(), Math.max(settings.MinZoomLevel(), level));
                if (ruler && ruler.IsVisible()) {
                    // To re-scale (if KeepConstantScale() is true) and/or to update the displayed zoom-level
                    ruler.Redraw();
                }
                svgInfo.radialMenus.forEach(function (radialMenu) {
                    if (radialMenu.IsVisible() && radialMenu.KeepConstantScale()) {
                        // To re-scaled the radial menu
                        radialMenu.Redraw();
                    }
                });
                if (focalScreenPoint === undefined) {
                    // Use the center of the svg
                    var svgRect = svgInfo.svgDomElement.getBoundingClientRect();
                    focalScreenPoint = { x: svgRect.left + (svgRect.width / 2), y: svgRect.top + (svgRect.height / 2) };
                }
                zoomAtPoint(svgInfo, focalScreenPoint, prevZoomLevel, newZoomLevel);
            }
        }
    }
    MIL.Zoom = Zoom;
    /**
     * Returns the current pan position (x/y offsets) of the specified SVG element.
     * @param {TargetDomElement} svgDomElement An SVG element.
     * @returns {PanPosition} Result.
     */
    function Pan(svgDomElement) {
        var svgInfo = getSvgInfo(svgDomElement);
        return ({ left: svgInfo.panLeft, top: svgInfo.panTop });
    }
    MIL.Pan = Pan;
    /**
     * Pans the specified SVG element by the specified number of pixels relative to the current pan position.
     * @param {TargetDomElement} svgDomElement An SVG element.
     * @param {number} deltaXInPixels The number of pixels to change the pan by on the x-axis.
     * @param {number} deltaYInPixels The number of pixels to change the pan by on the y-axis.
     */
    function PanRelative(svgDomElement, deltaXInPixels, deltaYInPixels) {
        var svgInfo = getSvgInfo(svgDomElement);
        pan(svgInfo, deltaXInPixels, deltaYInPixels, false);
    }
    MIL.PanRelative = PanRelative;
    /**
     * Pans the specified SVG element to the specified absolute position. // PORT: Is this in screen coordinates?
     * @param {TargetDomElement} svgDomElement An SVG element.
     * @param {number} absoluteX The abolsolute position along the x-axis.
     * @param {number} absoluteY The abolsolute position along the y-axis.
     */
    function PanAbsolute(svgDomElement, absoluteX, absoluteY) {
        var svgInfo = getSvgInfo(svgDomElement);
        pan(svgInfo, absoluteX, absoluteY, true);
    }
    MIL.PanAbsolute = PanAbsolute;
    /**
     * [Private Method] Returns the matrix transform (which describes the current pan/zoom) for the root <g> element of the supplied svgInfo.
     * @param {SVGInfo} svgInfo An SVGInfo.
     * @returns {DOMMatrix} Result.
     */
    function getPanZoomMatrix(svgInfo) {
        var svg = svgInfo.svgDomElement;
        var g = svgInfo.gDomElement;
        var transformList = g.transform.baseVal;
        if (transformList.numberOfItems === 0) {
            // No panning/zooming so far
            var emptyMatrixTransform = svg.createSVGTransformFromMatrix(svg.createSVGMatrix());
            transformList.appendItem(emptyMatrixTransform);
        }
        else {
            // Check that the root (first) transform of the <g> is a "composite" matrix transform (as opposed to a individual scale/skew/translate/etc. transform)
            if (transformList.getItem(0).type !== SVGTransform.SVG_TRANSFORM_MATRIX) {
                throw new MILException("The first transform of the root SVGGElement of '" + getTargetElementID(svg) + "' was expected to be a of type " + SVGTransform.SVG_TRANSFORM_MATRIX + " (matrix), but it is of type " + transformList.getItem(0).type);
            }
        }
        var matrix = transformList.getItem(0).matrix;
        return (matrix);
    }
    /**
     * [Private Method] Zooms the <g> element of the supplied svgInfo to the specified newZoomLevel [from the specified prevZoomLevel].
     * @param {SVGInfo} svgInfo An SVGInfo.
     * @param {Point} focalScreenPoint The focal point (in screen coordinates) of the zoom.
     * @param {number} prevZoomLevel The previous (current) zoom level.
     * @param {number} newZoomLevel The new zoom level.
     */
    function zoomAtPoint(svgInfo, focalScreenPoint, prevZoomLevel, newZoomLevel) {
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
        // Sanity check that our matrix math hasn't scaled beyond the user-specified zoom limits [Zoom() should have bounded newZoomLevel to prevent this]
        // Note: Over time the repeated matrix multiplications adds some floating point imprecision, so we check using only the first 5 decimal places
        var actualScale = +newMatrix.a.toFixed(5);
        if ((actualScale < settings.MinZoomLevel()) || (actualScale > settings.MaxZoomLevel())) // PORT: Added missing "()" to both tests (so these never worked before?)
         {
            throw new MILException("The current zoom transformation (" + actualScale + ") has exceeded the defined Min/MaxZoomLevel");
        }
        // Prevent the implicit pan that arises from the zoom from panning outside the "panable" area
        enforcePanLimits(svgInfo);
    }
    /**
     * [Private Method] Pans the <g> element of the supplied svgInfo.
     * @param {SVGInfo} svgInfo An SVGInfo.
     * @param {number} deltaXInPixels The relative change in panning along the x-axis, or an absolute x-axis position (if isAbsoluteValues is true).
     * @param {number} deltaYInPixels The relative change in panning along the y-axis, or an absolute y-axis position (if isAbsoluteValues is true).
     * @param {boolean} isAbsoluteValues If true, deltaXInPixels/deltaYInPixels represent absolute (not relative) values.
     */
    function pan(svgInfo, deltaXInPixels, deltaYInPixels, isAbsoluteValues) {
        var transformList = svgInfo.gDomElement.transform.baseVal;
        var matrix = getPanZoomMatrix(svgInfo);
        if (isAbsoluteValues) {
            // Note: deltaXInPixels and deltaYInPixels are actually absolute values in this case
            if ((deltaXInPixels === matrix.e) && (deltaYInPixels === matrix.f)) {
                return;
            }
            matrix.e = deltaXInPixels;
            matrix.f = deltaYInPixels;
        }
        else {
            if ((deltaXInPixels === 0) && (deltaYInPixels === 0)) {
                return;
            }
            matrix.e += deltaXInPixels;
            matrix.f += deltaYInPixels;
        }
        transformList.getItem(0).setMatrix(matrix);
        enforcePanLimits(svgInfo);
    }
    /**
     * [Private Method] Ensures we don't pan outside the "panable" (viewable) area. Also updates svgInfo.panLeft/panTop.
     * Our approach is to check if the screen-point at either the top-left or bottom-right of the svg is now outside
     * the panable area, and if so make a compensating translation. But there's probably a simpler way to do this.
     * @param {SVGInfo} svgInfo An SVGInfo.
     */
    function enforcePanLimits(svgInfo) {
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
        var panableWidth = svgInfo.svgWidth / minZoomLevel; // Eg. 500 / 0.5 = 1000
        var panableHeight = svgInfo.svgHeight / minZoomLevel; // Eg. 400 / 0.5 = 800
        var rangeX = (panableWidth - svgInfo.svgWidth) / 2; // The +/- pannable x-range
        var rangeY = (panableHeight - svgInfo.svgHeight) / 2; // The +/- pannable y-range
        var adjustmentX;
        var adjustmentY;
        if (left < -rangeX) {
            adjustmentX = left - (-rangeX);
            matrix.e += adjustmentX * svgInfo.zoomLevel;
            transformList.getItem(0).setMatrix(matrix);
        }
        if (top < -rangeY) {
            adjustmentY = top - (-rangeY);
            matrix.f += adjustmentY * svgInfo.zoomLevel;
            transformList.getItem(0).setMatrix(matrix);
        }
        if (right > (svgInfo.svgWidth + rangeX)) {
            adjustmentX = right - (svgInfo.svgWidth + rangeX);
            matrix.e += adjustmentX * svgInfo.zoomLevel;
            transformList.getItem(0).setMatrix(matrix);
        }
        if (bottom > (svgInfo.svgHeight + rangeY)) {
            adjustmentY = bottom - (svgInfo.svgHeight + rangeY);
            matrix.f += adjustmentY * svgInfo.zoomLevel;
            transformList.getItem(0).setMatrix(matrix);
        }
        svgInfo.panLeft = matrix.e;
        svgInfo.panTop = matrix.f;
    }
    /**
     * [Internal] Returns the pointerDown event for the specified pointer ID on the specified DOM element. Returns null if there is no such event.
     * @param {string} pointerID A pointer ID.
     * @param {DomElement} targetDomElement A DOM element.
     * @returns {PointerEvent | null} Result.
     * @internal
     */
    function getPointerDownEvent(pointerID, targetDomElement) {
        var targetElementID = getTargetElementID(targetDomElement);
        // First, check if we have a "hover-start" (pointerEnter) event, which [in the context of a hover] has the same semantics as pointerDown
        if (_activeHoverEvents[targetElementID] && _activeHoverEvents[targetElementID].hasOwnProperty(pointerID)) {
            return (_activeHoverEvents[targetElementID][pointerID]);
        }
        if (_activePointerDownEvents[targetElementID].hasOwnProperty(pointerID)) {
            return (_activePointerDownEvents[targetElementID][pointerID]);
        }
        return (null);
    }
    MIL.getPointerDownEvent = getPointerDownEvent;
    /**
     * Returns the most recent pointerMove event for the specified pointerID on the specified targetDomElement, or null if no such event exists.
     * @param {string} pointerID A pointer ID. Can also be a PointerEvent.pointerType (eg. "pen").
     * @param {DomElement} targetDomElement The DOM element that the pointer is targeting.
     * @returns {PointerEvent | null} Result.
     */
    function getLatestPointerMoveEvent(pointerID, targetDomElement) {
        var targetElementID = getTargetElementID(targetDomElement);
        if (_activePointerLatestMoveEvents[targetElementID].hasOwnProperty(pointerID)) {
            return (_activePointerLatestMoveEvents[targetElementID][pointerID]);
        }
        else {
            // If the supplied pointerID specifies a pointerType, return the most recent PointerMove event (if any) of that pointerType
            if ((pointerID === "pen") || (pointerID === "touch") || (pointerID === "mouse")) {
                var targetType = pointerID;
                var e = null;
                for (var pid in _activePointerLatestMoveEvents[targetElementID]) {
                    if (_activePointerLatestMoveEvents[targetElementID][pid].pointerType === targetType) {
                        e = _activePointerLatestMoveEvents[targetElementID][pid];
                    }
                }
                return (e);
            }
        }
        return (null);
    }
    MIL.getLatestPointerMoveEvent = getLatestPointerMoveEvent;
    /**
     * [Internal] Creates a MIL pointer ID (eg. "PointerID_touch_1234") for the specified PointerEvent.
     * @param {PointerEvent} e A PointerEvent.
     * @returns {string} Result.
     * @internal
     */
    function makePointerID(e) {
        // Note: e.pointerId for a pen DOES NOT increment at pointerUp: it increments at pointerLeave (when the pen leaves the hover range detectable by the digitizer)
        return ("PointerID_" + e.pointerType + "_" + e.pointerId);
    }
    MIL.makePointerID = makePointerID;
    /**
     * Enables or disables the specified Gesture group. Note: Gesture groups are enabled unless explictly disabled.
     * @param {string} groupName A Gesture group name.
     * @param {boolean} enable Flag.
     */
    function EnableGestureGroup(groupName, enable) {
        if (enable) {
            if (_disabledGestureGroups[groupName] !== undefined) {
                delete _disabledGestureGroups[groupName];
            }
        }
        else {
            _disabledGestureGroups[groupName] = true; // The value isn't actually used, it's the presence of the key that indicates that the group is disabled
        }
        log("Gestures in group '" + groupName + "' were " + (enable ? "enabled" : "disabled"));
    }
    MIL.EnableGestureGroup = EnableGestureGroup;
    /**
     * Returns true if the specified Gesture group is enabled.
     * @param {string} groupName The name of the Gesture group to check.
     * @returns {boolean} Result.
     */
    function IsGestureGroupEnabled(groupName) {
        return (_disabledGestureGroups[groupName] === undefined);
    }
    MIL.IsGestureGroupEnabled = IsGestureGroupEnabled;
    // There is only ever one pen, so this is a global function
    // Note: Sometimes [on a Surface Studio] the pen pressure calibration seems to get out of whack (readings are way too high for light pressure); 
    //       this can sometimes be resolved by briefly removing/re-seating the AAAA battery in the pen
    /**
     * Returns the current pen presssure (if any) on the targetElement. If the pen is not being used, returns null.
     * @param {TargetDomElement} targetElement The element to inspect.
     * @returns {number | null} Result.
     */
    function PenPressure(targetElement) {
        var domElement = MIL.Utils.GetDomElement(targetElement);
        var e = getLatestPointerMoveEvent("pen", domElement);
        return (e === null ? null : e.pressure);
    }
    MIL.PenPressure = PenPressure;
    // There is only ever one pen, so this is a global function
    /**
     * Returns the current pen buttons (if any) being used on the targetElement. If the pen is not being used, returns null.
     * @param {TargetDomElement} targetElement The element to inspect.
     * @returns {number | null} Result.
     */
    function PenButtons(targetElement) {
        var domElement = MIL.Utils.GetDomElement(targetElement);
        var e = getLatestPointerMoveEvent("pen", domElement);
        return (e === null ? null : e.buttons);
    }
    MIL.PenButtons = PenButtons;
    /**
     * [Internal] Searches all Gestures defined on the targetDomElement to see if one of them can be activated given the current set of active pointers.
     * If a matching Gesture is found, and it's Conditional() [if any] returns true, then it's GestureStartedHandler() [if any] is called and the search ends.
     * @param {DomElement} targetDomElement The DOM element to search for Gestures on.
     * @param {number} actualRecognitionTimeoutInMs The actual timeout that elapsed before recognizeGesture() was called; required for reporting purposes only.
     * @param {number} maxRecognitionTimeoutInMs The defined maximum RecognitionTimeoutInMs for all Gestures on targetDomElement; required for reporting purposes only.
     * @param {boolean} allowSimultaneousGestureInstances When false, a Gesture that is already active on the targetDomElement cannot be re-recognized. Defaults to true.
     * @returns {GestureRecognitionResult} Result.
     * @internal
     */
    function recognizeGesture(targetDomElement, actualRecognitionTimeoutInMs, maxRecognitionTimeoutInMs, allowSimultaneousGestureInstances) {
        if (allowSimultaneousGestureInstances === void 0) { allowSimultaneousGestureInstances = true; }
        var targetElementID = getTargetElementID(targetDomElement);
        var isFromPointerUp = (actualRecognitionTimeoutInMs === -1); // This is really 'isFromRemovePointer', which includes both pointerUp and pointerLeave
        var recognizedGesture = null;
        var pointerTypePermutationIndex = 0;
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
        var permutationQualifier = "";
        log("Starting gesture recognition" + (isFromPointerUp ? " [during pointer-up]" : (" [after " + actualRecognitionTimeoutInMs + "ms]")) + " on '" + targetElementID + "'...", FeatureNames.GestureRecognition);
        // Cancel any pending recognition timer
        cancelRecognizeGestureTimer(targetElementID);
        // Match _activePointerDownEvents (for targetDomElement) to _gestures (that target targetDomElement)
        for (var pointerID in _activePointerDownEvents[targetElementID]) {
            switch (_activePointerDownEvents[targetElementID][pointerID].pointerType) {
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
        for (var hoverPointerID in _activeHoverEvents[targetElementID]) {
            hoverCount++;
            pointerList.push(hoverPointerID);
        }
        if ((penCount === 0) && (touchCount === 0) && (mouseCount === 0) && (hoverCount === 0)) {
            // The timer that called recognizeGesture() ticked AFTER all pointers have been removed
            log("Gesture recognition skipped (reason: There are no active pointers" + ((maxRecognitionTimeoutInMs > 0) ? "; the largest RecognitionTimeoutInMs (" + maxRecognitionTimeoutInMs + "ms) for gestures on '" + targetElementID + "' may be too long)" : ")"), FeatureNames.GestureRecognition);
            _targetElementState[targetElementID].isAcquiringPointers = false;
            _targetElementState[targetElementID].gestureRecognitionRan = true;
            return (recognitionResult);
        }
        log("Looking for gestures on " + targetElementID + " that require pen:" + penCount + "+touch:" + touchCount + "+mouse:" + mouseCount + "+hover:" + hoverCount, FeatureNames.GestureRecognition);
        for (var g = 0; (g < _gestures.length) && continueSearching; g++) {
            var gesture = _gestures[g];
            var isMatch = true;
            if (gesture.Target() !== targetDomElement) {
                continue;
            }
            if (!gesture.IsEnabled()) {
                log("Skipping gesture '" + gesture.Name() + "' (reason: gesture is disabled)", FeatureNames.GestureRecognition);
                continue;
            }
            // If ANY gesture [even if NOT recognized] on the target doesn't allow events to be propagated, then we prevent propagation
            recognitionResult.propagateEvents = (recognitionResult.propagateEvents && gesture.AllowEventPropagation());
            if (gesture.IsActive() && !allowSimultaneousGestureInstances) {
                log("Skipping gesture '" + gesture.Name() + "' (reason: gesture is already active" + (gesture.IsCancelled() ? " [cancelled]" : "") + ")", FeatureNames.GestureRecognition);
                continue;
            }
            var isIncompleteRecognition = (gesture.repeatOccurrenceCount() > 0) && gesture.IsCancelled();
            if (isIncompleteRecognition) {
                // One (or more) occurrence of a repeating gesture has happened, but the next occurrence took too long so the gesture was cancelled
                log("Skipping gesture '" + gesture.Name() + "' (reason: repeating gesture is incomplete [occurrence " + (gesture.repeatOccurrenceCount() + 1) + " of " + gesture.RepeatCount() + " timed-out])");
                continue;
            }
            for (pointerTypePermutationIndex = 0; pointerTypePermutationIndex < gesture.PointerTypePermutations().length; pointerTypePermutationIndex++) {
                // Note: pointerType can be of the form "touch:2+pen" or "touch+touch+pen"
                var pointerType = gesture.PointerTypePermutations()[pointerTypePermutationIndex];
                var types = pointerType.split("+");
                isMatch = true;
                requiredTouchCount = 0;
                requiredPenCount = 0;
                requiredMouseCount = 0;
                requiredHoverCount = 0;
                requiredAnyCount = 0;
                for (var i = 0; i < types.length; i++) {
                    var parts = types[i].split(":");
                    var type = parts[0];
                    var requiredCount = (parts.length === 1) ? 1 : +parts[1];
                    switch (type) {
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
                if (requiredTouchCount > 0) {
                    isMatch = isMatch && (touchCount === requiredTouchCount);
                }
                if (requiredPenCount > 0) {
                    isMatch = isMatch && (penCount === requiredPenCount);
                }
                if (requiredMouseCount > 0) {
                    isMatch = isMatch && (mouseCount === requiredMouseCount);
                }
                if (requiredHoverCount > 0) {
                    isMatch = isMatch && (hoverCount === requiredHoverCount);
                }
                if (requiredAnyCount > 0) {
                    isMatch = isMatch && (touchCount + penCount + mouseCount + hoverCount === requiredAnyCount);
                }
                // Check when we have inputs that the gesture actually needs them
                if (touchCount > 0) {
                    isMatch = isMatch && ((requiredTouchCount > 0) || (requiredAnyCount > 0));
                }
                if (penCount > 0) {
                    isMatch = isMatch && ((requiredPenCount > 0) || (requiredAnyCount > 0));
                }
                if (mouseCount > 0) {
                    isMatch = isMatch && ((requiredMouseCount > 0) || (requiredAnyCount > 0));
                }
                if (hoverCount > 0) {
                    isMatch = isMatch && ((requiredHoverCount > 0) || (requiredAnyCount > 0));
                }
                if (isMatch) {
                    if (isFromPointerUp && (gesture.CompletionTimeoutInMs() > 0)) {
                        // For gestures that specify a CompletionTimeoutInMs (eg. a tap), check if the pointer-up (or pointer-leave [for hover]) is happening during the completion window
                        var elapsedMsFromFirstPointerDownToFirstPointerUp = Date.now() - (_activePointerDownStartTime[targetElementID] || _activeHoverStartTime[targetElementID]);
                        isMatch = (elapsedMsFromFirstPointerDownToFirstPointerUp < gesture.CompletionTimeoutInMs());
                        if (!isMatch) {
                            log("Skipping gesture '" + gesture.Name() + "' (reason: Gesture completion time [" + elapsedMsFromFirstPointerDownToFirstPointerUp + "ms] exceeded its CompletionTimeout [" + gesture.CompletionTimeoutInMs() + "ms])", FeatureNames.GestureRecognition);
                        }
                    }
                    if (isMatch && (gesture.Conditional() !== null)) {
                        isMatch = gesture.Conditional().call(gesture);
                        if (!isMatch) {
                            log("Skipping gesture '" + gesture.Name() + "' (reason: Conditional() returned false)", FeatureNames.GestureRecognition);
                        }
                    }
                    if (isMatch && gesture.IsExclusive()) {
                        isMatch = GetActiveGestureCount(gesture.Target()) === 0;
                        if (!isMatch) {
                            log("Skipping gesture '" + gesture.Name() + "' (reason: IsExclusive() is true and another Gesture is already active on the Target())", FeatureNames.GestureRecognition);
                        }
                    }
                    // Handle Gesture.RepeatCount()
                    // Note: This must be done AFTER all other 'match' checks
                    if (gesture.RepeatCount() > 1) {
                        // When the target has a "repeat" gesture it gets messy/problematic to propagate events "between" the [potential] multiple-occurrences
                        if (recognitionResult.propagateEvents) {
                            recognitionResult.propagateEvents = false;
                            _targetElementState[targetElementID].isAwaitingGestureCompletion = false;
                            log("Warning: Preventing propagation of events on '" + targetElementID + "' because gesture '" + gesture.Name() + "' uses RepeatCount(" + gesture.RepeatCount() + ")", FeatureNames.GestureRecognition);
                        }
                        if (isMatch) {
                            var timeSinceLastRecognitionInMs = Date.now() - gesture.lastRepeatRecognitionTime();
                            if (timeSinceLastRecognitionInMs > gesture.RepeatTimeoutInMs()) {
                                gesture.repeatOccurrenceCount(0);
                            }
                            gesture.repeatOccurrenceCount(gesture.repeatOccurrenceCount() + 1);
                            isMatch = (gesture.repeatOccurrenceCount() === gesture.RepeatCount()) && (timeSinceLastRecognitionInMs <= gesture.RepeatTimeoutInMs());
                            gesture.lastRepeatRecognitionTime(Date.now());
                            if (!isMatch) {
                                log("Skipping gesture '" + gesture.Name() + "' (reason: Repeat conditions not met [repeatOccurrenceCount = " + gesture.repeatOccurrenceCount() + ", timeSinceLastRecognitionInMs = " + timeSinceLastRecognitionInMs + "])", FeatureNames.GestureRecognition);
                                // The gesture has been "partially" recognized, so we reset the _endedTime [which Gesture.startCompletionTimeout() will use to determine if the gesture ended]
                                gesture.endedTime(0);
                                // Note: If this timeout expires it will cancel the gesture, but it will also trigger another 'recognizeGesture()' call
                                gesture.startCompletionTimeout(gesture.RepeatTimeoutInMs(), "repeat", false, null);
                                // Because the gesture has been "partially" recognized we have to stop looking for other matching gestures [to give a chance for the repeating gesture to fully complete]
                                // Note: For this to work, repeating gestures MUST be added [with MIL.AddGesture()] BEFORE other "competing" gestures (eg. add "DoubleTapWithTouch" before "DragWithTouch")
                                log("HALTING current search for matching gestures due to encountering a gesture with RepeatCount() > 1", FeatureNames.GestureRecognition);
                                continueSearching = false;
                                break;
                            }
                            else {
                                gesture.stopCompletionTimeout();
                            }
                        }
                    }
                    if (isMatch) {
                        recognizedGesture = gesture;
                        continueSearching = false;
                        break;
                    }
                }
                else {
                    permutationQualifier = (gesture.PointerTypePermutations().length > 1) ? " [permutation '" + gesture.PointerTypePermutations()[pointerTypePermutationIndex] + "']" : "";
                    log("Skipping gesture '" + gesture.Name() + "' (reason: PointerType()" + permutationQualifier + " does not match)", FeatureNames.GestureRecognition);
                }
            }
        }
        if (recognizedGesture !== null) {
            // PORT: All these getters/setters are new
            recognizedGesture.activePointerList(pointerList);
            recognizedGesture.activePointerTypeOrdinals(recognizedGesture.getPointerTypeOrdinals(pointerTypePermutationIndex));
            recognizedGesture.startedTime(Date.now());
            recognizedGesture.endedTime(0);
            recognizedGesture.isCancelled(false);
            permutationQualifier = (recognizedGesture.PointerTypePermutations().length > 1) ? " [permutation '" + recognizedGesture.PointerTypePermutations()[pointerTypePermutationIndex] + "']" : "";
            log("Gesture '" + recognizedGesture.Name() + "'" + permutationQualifier + " recognized"); // We always want to report this message, so we don't specify FeatureNames.GestureRecognition
            // If needed, start a gesture completion timer [unless we're being called from pointer-up, in which case the gesture is already ending]
            if ((recognizedGesture.CompletionTimeoutInMs() > 0) && !isFromPointerUp) {
                _targetElementState[targetElementID].isAwaitingGestureCompletion = true;
                // Note: If this timeout expires it will cancel the gesture, but it will also trigger another 'recognizeGesture()' call
                recognizedGesture.startCompletionTimeout(recognizedGesture.CompletionTimeoutInMs(), "completion", true, function () { _targetElementState[targetElementID].isAwaitingGestureCompletion = false; });
            }
            if (recognizedGesture.GestureStartedHandler() !== null) {
                recognizedGesture.GestureStartedHandler().call(recognizedGesture);
            }
            // Set the PointerCapture on the gesture's target.
            // Note: We do this AFTER calling the user-supplied GestureStartedHandler() since that handler may act on the
            //       target (eg. changing its 'display' attribute) in ways that could interfere with pointer capturing.
            // Note: DO NOT call setPointerCapture() on a "stale" pointerDown event (it causes strange behavior [on IE 11])
            if (!isFromPointerUp) {
                recognizedGesture.SetPointerCapture();
            }
        }
        else {
            log("No matching gesture found", FeatureNames.GestureRecognition);
        }
        log("Gesture recognition ended", FeatureNames.GestureRecognition);
        _targetElementState[targetElementID].isAcquiringPointers = false;
        _targetElementState[targetElementID].gestureRecognitionRan = true;
        recognitionResult.success = (recognizedGesture !== null);
        return (recognitionResult);
    }
    MIL.recognizeGesture = recognizeGesture;
    /**
     * [Private Method] Returns the Gesture that's currently inking using the specified pointerID, or null if there's no such Gesture.
     * @param {string} pointerID A pointer ID.
     * @returns {Gesture | null} Result.
     */
    function getInkingGesture(pointerID) {
        if (pointerID) {
            for (var g = 0; g < _gestures.length; g++) {
                var gesture = _gestures[g];
                var ink = gesture.Ink();
                if ((ink !== null) && (ink.PointerID() !== null) && (ink.PointerID() === pointerID)) {
                    return (gesture);
                }
            }
        }
        return (null);
    }
    /**
     * [Internal] Propagates any postponed PointerEvents to the parent of the specified targetDomElement.
     * @param {DomElement} targetDomElement A DOM element whose parent will receive the postponed events.
     * @internal
     */
    function propagateQueuedEvents(targetDomElement) {
        if (MIL._postponedPointerEvents.length === 0) {
            log("There are no events to propagate");
            return;
        }
        var eventList = [];
        var atSVGRoot = (targetDomElement instanceof SVGSVGElement); // This is a special case: we want to redispatch back to the SVG element to be picked up by any user-installed handlers on the SVG element
        // PORT: This assignment was changed from: "atSVGRoot ? targetDomElement : (targetDomElement.parentElement || targetDomElement.parentNode);"
        var parentDomElement = atSVGRoot ? targetDomElement : targetDomElement.parentNode;
        if (!parentDomElement) {
            return;
        }
        // Propagating "hover" events (pointerEnter/Move/Leave) is potentially problematic, both technically (due to the delayed nature of a "hover-start" 
        // and the less deterministic nature of pointerEnter/Leave events) as well as logically (due to the fact that the target being propagated to is 
        // usually partially occluded by the element that didn't have a hover gesture of its own).
        // So to avoid dealing with this added complexity we simply abort propagation if we encounter a "hover-start" event.
        for (var i = 0; i < MIL._postponedPointerEvents.length; i++) {
            if (MIL._postponedPointerEvents[0].__MILIsMILHoverStartEvent__ === true) {
                log("Event propagation skipped (reason: The queue contains a 'hover-start' event); Clearing " + MIL._postponedPointerEvents.length + " queued pointer events");
                MIL._postponedPointerEvents.length = 0;
                return;
            }
        }
        if (MIL._postponedPointerEvents[0].type !== "pointerdown") {
            throw new MILException("The postponed pointer-event queue must always start with a 'pointerdown' event"); // See comments at end of function
        }
        // First, we make a copy of _postponedPointerEvents [since as we dispatch the 'pointerdown' event the onPointerDown handler will reset _postponedPointerEvents]
        for (var i = 0; i < MIL._postponedPointerEvents.length; i++) {
            eventList.push(MIL._postponedPointerEvents[i]);
        }
        for (var i = 0; i < eventList.length; i++) {
            var e = eventList[i];
            // Aside: This is far simpler, but not available in IE11
            // let newEvent = Object.assign({}, e);
            // Propagate the event (to - potentially - either MIL or non-MIL handlers)
            // Note: We have to create a clone of the event (e) because a received event cannot be re-dispatched [dispatchEvent() will throw a NotSupportedError]
            log("Propagating " + e.type + " (" + e.pointerType + ")...");
            var newEvent = MIL.Utils.isIE11() ? document.createEvent("Event") : new Event(e.type);
            newEvent.initEvent(e.type, true, true);
            for (var prop in e) {
                // Note: Some properties of an event (eg. eventPhase, isTrusted, srcElement, target, timeStamp) are read-only so
                //       the assignment below will fail due to the "Cannot assign new value to a read-only attribute" condition.
                //       However, these values will become set when the event is dispatched.
                try {
                    newEvent[prop] = e[prop];
                }
                catch (error) {
                    // Note: IE11 doesn't error when the assignment fails, it just fails silently
                    if (error.message.indexOf("Cannot assign to read only property") === -1) {
                        log(error);
                    }
                }
            }
            if (atSVGRoot) {
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
    MIL.propagateQueuedEvents = propagateQueuedEvents;
    /** The shapes that can be recognized by MIL.RecognizeShape(). */
    var RecognizableShape;
    (function (RecognizableShape) {
        /** A right-handed tick (✓). */
        RecognizableShape[RecognizableShape["CheckMark"] = 0] = "CheckMark";
        /** An equilateral triangle (△). */
        RecognizableShape[RecognizableShape["Triangle"] = 1] = "Triangle";
        /** A 5-pointed "pentagram" star (⛤). */
        RecognizableShape[RecognizableShape["Star"] = 2] = "Star";
        /** Can be made in either an E or W direction. */
        RecognizableShape[RecognizableShape["StrikeThroughHorizontal"] = 3] = "StrikeThroughHorizontal";
        /** Has to be made in a SW direction. */
        RecognizableShape[RecognizableShape["StrikeThroughDiagonal"] = 4] = "StrikeThroughDiagonal";
        /** Like a "reminder ribbon" (🎗) but rotated 90 degrees left. */
        RecognizableShape[RecognizableShape["XOut"] = 5] = "XOut";
        /** A rectangle (▭). */
        RecognizableShape[RecognizableShape["Rectangle"] = 6] = "Rectangle";
        /** A right chevron (>). */
        RecognizableShape[RecognizableShape["GreaterThan"] = 7] = "GreaterThan";
        /** A left chevron (<). */
        RecognizableShape[RecognizableShape["LessThan"] = 8] = "LessThan";
        /** An up chevron (^). */
        RecognizableShape[RecognizableShape["UpArrow"] = 9] = "UpArrow";
        /** An down chevron (v). */
        RecognizableShape[RecognizableShape["DownArrow"] = 10] = "DownArrow";
    })(RecognizableShape = MIL.RecognizableShape || (MIL.RecognizableShape = {}));
    // TODO: Make this extensible by the user
    // Shape recognition is done via a combination of pattern matching [on a predefined outline] and heuristics [for start/end compass heading and line-length].
    // Shapes will often overlap based on pattern matching alone, so the heuristics are critical for shape differentiation. Providing a 'shapeNameList' to 
    // RecognizeShape() also helps reduce false positives because it shrinks the number of possible matches.
    var _recognizableShapes = [
        { id: RecognizableShape.CheckMark, outline: [[0.75, 0], [1, 0], [1, 0.25], [0.4, 1], [0, 1], [0, 0.6], [0.15, 0.5], [0.25, 0.7]], padding: 0, compassHeading: "NE|E", maxPathLengthFn: function (gestureHeight, gestureWidth) { return Math.sqrt(Math.pow(gestureWidth, 2) + Math.pow(gestureHeight, 2)) * 1.5; } },
        { id: RecognizableShape.Triangle, outline: [[0.4, 0], [0.6, 0], [1, 0.8], [1, 1], [0, 1], [0, 0.8]], padding: 0, minPathLengthFn: function (gestureHeight, gestureWidth) { return Math.sqrt(Math.pow(gestureWidth / 2, 2) + Math.pow(gestureHeight, 2)) * 2.25; }, maxPathLengthFn: function (gestureHeight, gestureWidth) { return Math.sqrt(Math.pow(gestureWidth / 2, 2) + Math.pow(gestureHeight, 2)) * 3.3; } },
        { id: RecognizableShape.Star, outline: [[0.50, 0], [0.612, 0.345], [0.976, 0.345], [0.682, 0.559], [0.794, 0.905], [0.5, 0.691], [0.206, 0.905], [0.318, 0.559], [0.024, 0.345], [0.388, 0.345]], padding: 0.25 },
        { id: RecognizableShape.StrikeThroughHorizontal, outline: [[0, 0], [1, 0], [1, 1], [0, 1]], padding: 0, maxHeightRatio: 0.1, compassHeading: "E|W", minPathLengthFn: function (gestureHeight, gestureWidth, targetWidth) { return targetWidth / 2; }, maxPathLengthFn: function (gestureHeight, gestureWidth, targetWidth) { return targetWidth * 1.2; } },
        { id: RecognizableShape.StrikeThroughDiagonal, outline: [[0.8, 0], [1, 0], [1, 0.2], [0.2, 1], [0, 1], [0, 0.8]], padding: 0, compassHeading: "SW" },
        { id: RecognizableShape.XOut, outline: [[0, 0.25], [0.1, 0], [0.4, 0], [0.5, 0.25], [1, 0], [1, 0.33], [0.8, 0.5], [1, 0.66], [1, 1], [0.5, 0.75], [0.4, 1], [0.1, 1], [0, 0.75]], padding: 0, minPathLengthFn: function (gestureHeight, gestureWidth) { return Math.max(gestureHeight, gestureWidth) * 2.2; }, maxPathLengthFn: function (gestureHeight, gestureWidth) { return Math.max(gestureHeight, gestureWidth) * 3; } },
        { id: RecognizableShape.Rectangle, outline: [[0, 0], [1, 0], [1, 1], [0, 1]], padding: 0, minPathLengthFn: function (gestureHeight, gestureWidth) { return ((gestureWidth * 2) + (gestureHeight * 2)) * 0.85; }, maxPathLengthFn: function (gestureHeight, gestureWidth) { return (gestureWidth * 2) + (gestureHeight * 2); } },
        { id: RecognizableShape.GreaterThan, outline: [[0, 0], [0.2, 0], [1, 0.3], [1, 0.7], [0.2, 1], [0, 1], [0, 0.8], [0.7, 0.5], [0, 0.2]], padding: 0, compassHeading: "S", maxPathLengthFn: function (gestureHeight, gestureWidth) { return Math.max(gestureHeight, gestureWidth) * 2.3; } },
        { id: RecognizableShape.LessThan, outline: [[1, 0], [0.8, 0], [0, 0.3], [0, 0.7], [0.8, 1], [1, 1], [1, 0.8], [0.3, 0.5], [1, 0.2]], padding: 0, compassHeading: "S", maxPathLengthFn: function (gestureHeight, gestureWidth) { return Math.max(gestureHeight, gestureWidth) * 2.3; } },
        { id: RecognizableShape.UpArrow, outline: [[0, 1], [0, 0.8], [0.3, 0], [0.7, 0], [1, 0.8], [1, 1], [0.8, 1], [0.5, 0.3], [0.2, 1]], padding: 0, compassHeading: "E|W", maxPathLengthFn: function (gestureHeight, gestureWidth) { return Math.max(gestureHeight, gestureWidth) * 2.3; } },
        { id: RecognizableShape.DownArrow, outline: [[0, 0], [0.2, 0], [0.5, 0.7], [0.8, 0], [1, 0], [1, 0.2], [0.7, 1], [0.3, 1], [0, 0.2]], padding: 0, compassHeading: "E|W", maxPathLengthFn: function (gestureHeight, gestureWidth) { return Math.max(gestureHeight, gestureWidth) * 2.3; } }
    ];
    /**
     * Attempts to recognize a RecognizableShape from the supplied pathPoints. Returns the ID of the recognized shape if successful, or null if not.
     * @param {Point[]} pathPoints The path-points to be recognized.
     * @param {number} minMatchPercent The percentage of points in the drawn path that must be inside the shape-template to trigger a match.
     * @param {number} [targetWidth] [Optional] The width (in pixels) of the area that the shape recognition will occur within.
     * @param {number} [targetHeight] [Optional] The height (in pixels) of the area that the shape recognition will occur within.
     * @param {SVGGElement} [gDomElement] [Optional] Enables the drawing of debug information (the tested shape outline(s) and the pathPoints).
     * @param {RecognizableShape[]} [targetShapeList] [Optional] The list of shapes to be recognized (must be MIL.RecognizableShapes values). Note: Providing a shapeList helps to reduce false-positives (misrecognitions).
     * @returns {RecognizableShape | null} The recognized shape (or null).
     */
    function RecognizeShape(pathPoints, minMatchPercent, targetWidth, targetHeight, gDomElement, targetShapeList) {
        if (minMatchPercent === void 0) { minMatchPercent = 0.8; }
        if (DebugFeature(FeatureNames.ShapeRecognition) && (gDomElement === undefined)) {
            throw new MILException("The 'gDomElement' parameter must be supplied when the debug flag for '" + FeatureNames.ShapeRecognition + "' is true");
        }
        var shapeList = [];
        if (!targetShapeList) {
            shapeList = _recognizableShapes;
        }
        else {
            _recognizableShapes.forEach(function (v, i) {
                if (targetShapeList.indexOf(v.id) !== -1) {
                    shapeList.push(v);
                }
            });
        }
        var svgInfo = DebugFeature(FeatureNames.ShapeRecognition) ? getSvgInfo(gDomElement) : null;
        var boundingRect = MIL.Utils.GetBoundingRectForPoints(pathPoints);
        var pointsToTest = d3.range(pathPoints.length).map(function (d) { return ([pathPoints[d].x, pathPoints[d].y]); });
        var bestMatchPercent = 0;
        var bestMatchShape = null;
        var pathLength = MIL.Utils.ComputeTotalLength(pathPoints);
        var d = "";
        for (var i = 0; i < shapeList.length; i++) {
            var shape = shapeList[i];
            var shapePathPoints = [];
            d = "";
            // Convert shape outline (in relative path-points) into absolute path-points within the boundingRect.
            // Note: We use shape.padding [if specified] to expand the absolute shape since for certain shapes (eg. Star) the drawn shape
            //       can be "sloppy" and so it requires an additional allowance if it's to be recognized with any reasonable accuracy.
            //       Further, drawn points that fall right on the edge of the absolute shape are typically not counted as being inside
            //       the shape, so it requires minor padding (eg. 0.01) to ensure we can reach a count of 100% inside.
            shape.padding = Math.max(shape.padding, 0.01);
            for (var p = 0; p < shape.outline.length; p++) {
                var relativePathPoint = shape.outline[p];
                var absoluteX = (boundingRect.x - (boundingRect.width * shape.padding)) + (relativePathPoint[0] * (boundingRect.width * (1 + (shape.padding * 2))));
                var absoluteY = (boundingRect.y - (boundingRect.height * shape.padding)) + (relativePathPoint[1] * (boundingRect.height * (1 + (shape.padding * 2))));
                shapePathPoints.push([absoluteX, absoluteY]);
                d += (!d ? "M " : " L ") + Math.round(absoluteX) + " " + Math.round(absoluteY);
            }
            // Count how many path-points are inside the shape path
            var containedPathPointCount = MIL.Utils.CountPointsInPolygon(shapePathPoints, pointsToTest);
            var percentInside = containedPathPointCount / pathPoints.length;
            if (DebugFeature(FeatureNames.ShapeRecognition)) {
                // Draw a path for the shape
                svgInfo.gSelection.append("path").attr("d", d + "Z").attr("stroke", "red").attr("fill", "transparent").node().style.strokeWidth = "1px";
                log("Shape '" + RecognizableShape[shape.id] + "' matches " + (percentInside * 100).toFixed(2) + "% of path-points [vs " + (minMatchPercent * 100) + "% required]");
            }
            if ((percentInside >= minMatchPercent) && (percentInside > bestMatchPercent)) {
                // We've found a possible match, so now check heuristics
                if (shape.compassHeading) {
                    var compassHeadings = shape.compassHeading.split("|");
                    var compassHeadingMatches = false;
                    for (var h = 0; h < compassHeadings.length; h++) {
                        var compassHeading = compassHeadings[h];
                        var actualCompassHeading = MIL.Utils.GetCompassHeading(MIL.Utils.GetHeadingFromPoints(pathPoints[0], pathPoints[pathPoints.length - 1]));
                        compassHeadingMatches = (compassHeading === actualCompassHeading);
                        if (compassHeadingMatches) {
                            break;
                        }
                    }
                    if (!compassHeadingMatches) {
                        log("Shape '" + RecognizableShape[shape.id] + "' doesn't match on compassHeading", FeatureNames.ShapeRecognition);
                        continue;
                    }
                }
                if (shape.maxHeightRatio) {
                    var heightRatio = (boundingRect.height / boundingRect.width);
                    if (heightRatio > shape.maxHeightRatio) {
                        log("Shape '" + RecognizableShape[shape.id] + "' doesn't match on maxHeightRatio (expected: " + shape.maxHeightRatio + ", actual: " + heightRatio.toFixed(2) + ")", FeatureNames.ShapeRecognition);
                        continue;
                    }
                }
                if (shape.minPathLengthFn || shape.maxPathLengthFn) {
                    var gestureWidth = boundingRect.width;
                    var gestureHeight = boundingRect.height;
                    if (shape.minPathLengthFn) {
                        if (((shape.minPathLengthFn.toString().indexOf("targetWidth") !== -1) && !targetWidth) ||
                            ((shape.minPathLengthFn.toString().indexOf("targetHeight") !== -1) && !targetHeight)) {
                            log("Shape '" + RecognizableShape[shape.id] + "': Cannot evaluate minPathLength because targetWidth and/or targetHeight was not supplied", FeatureNames.ShapeRecognition);
                        }
                        else {
                            var minPathLength = shape.minPathLengthFn(gestureWidth, gestureHeight, targetWidth, targetHeight);
                            if (pathLength < minPathLength) {
                                log("Shape '" + RecognizableShape[shape.id] + "' doesn't match on minPathLength (expected: " + minPathLength.toFixed(2) + ", actual: " + pathLength.toFixed(2) + ")", FeatureNames.ShapeRecognition);
                                continue;
                            }
                        }
                    }
                    if (shape.maxPathLengthFn) {
                        if (((shape.maxPathLengthFn.toString().indexOf("targetWidth") !== -1) && !targetWidth) ||
                            ((shape.maxPathLengthFn.toString().indexOf("targetHeight") !== -1) && !targetHeight)) {
                            log("Shape '" + RecognizableShape[shape.id] + "': Cannot evaluate maxPathLength because targetWidth and/or targetHeight was not supplied", FeatureNames.ShapeRecognition);
                        }
                        else {
                            var maxPathLength = shape.maxPathLengthFn(gestureWidth, gestureHeight, targetWidth, targetHeight);
                            if (pathLength > maxPathLength) {
                                log("Shape '" + RecognizableShape[shape.id] + "' doesn't match on maxPathLength (expected: " + maxPathLength.toFixed(2) + ", actual: " + pathLength.toFixed(2) + ")", FeatureNames.ShapeRecognition);
                                continue;
                            }
                        }
                    }
                }
                bestMatchPercent = percentInside;
                bestMatchShape = shape;
            }
        }
        if (DebugFeature(FeatureNames.ShapeRecognition)) {
            // Draw a path for the pathPoints
            d = "";
            for (var i = 0; i < pathPoints.length; i++) {
                d += (!d ? "M " : " L ") + Math.round(pathPoints[i].x) + " " + Math.round(pathPoints[i].y);
            }
            svgInfo.gSelection.append("path").attr("d", d).attr("stroke", "blue").attr("fill", "transparent").node().style.strokeWidth = "1px";
        }
        return (bestMatchShape ? bestMatchShape.id : null);
    }
    MIL.RecognizeShape = RecognizeShape;
    /**
     * Interprets the supplied pathPoints as the path of a radial swipe gesture and returns information about the gesture. If the swipe is too short (less than minDistance), returns null.
     * @param {Point[]} pathPoints The set of Points to inspect (typically these are from an Ink).
     * @param {number} numRadialSegments The number of radial segments to quantize into.
     * @param {number} minDistance The minimum length (in pixels) of the path for it to be considered a radial swipe gesture.
     * @returns {RadialSwipeResult | null} Result.
     */
    function RecognizeRadialSwipe(pathPoints, numRadialSegments, minDistance) {
        var heading = MIL.Utils.GetHeadingFromPoints(pathPoints[0], pathPoints[pathPoints.length - 1]);
        var compassHeading = MIL.Utils.GetCompassHeading(heading, numRadialSegments);
        var pathLength = MIL.Utils.ComputeTotalLength(pathPoints);
        var isStraightLine = MIL.Utils.IsStraightLine(MIL.Utils.ConvertPointsToXYPoints(pathPoints));
        return ((pathLength > minDistance) && isStraightLine ? { compassHeading: compassHeading, heading: heading, segmentID: MIL.Utils.GetRadialSegmentID(heading, numRadialSegments), length: pathLength } : null);
    }
    MIL.RecognizeRadialSwipe = RecognizeRadialSwipe;
    /**
     * [Private Method] Handler for contextMenu events.
     * @param {Event} e A contextMenu event.
     */
    function onContextMenu(e) {
        if (!getSvgInfo(e.target).settings.IsRightMouseClickAllowed()) {
            e.preventDefault();
            return;
        }
    }
    /**
     * [Private Method] Returns true if the event has been propagated by MIL.
     * @param {PointerEvent} e The PointerEvent to check.
     * @returns {boolean} Result.
     */
    function isPropagatedEvent(e) {
        return ((e.__MILRedispatchedToParent__ !== undefined) || (e.__MILRedispatchedToSvg__ !== undefined));
    }
    /**
     * [Private Method] Returns true if the event should be processed by MIL.
     * @param {DomElement} currentTarget The element whose event listener is being invoked.
     * @param {PointerEvent} e The PointerEvent to check.
     * @returns {boolean} Result.
     */
    function isEventProcessable(currentTarget, e) {
        // This is just a sanity check
        // eslint-disable-next-line eqeqeq
        if (currentTarget != e.currentTarget) // PORT: The change to "!==" is causing problems, so reverting to "!=". TODO: Investigate this.
         {
            throw new MILException("Unexpected 'currentTarget' value: this could be a coding error in MIL");
        }
        // This is the case where we've redispatched an event to the SVG element [after our gestures on the SVG
        // didn't hit] to be processed by the handlers that the user may have added directly to the SVG element
        if (e.__MILRedispatchedToSvg__) {
            return (false);
        }
        return (true);
    }
    /**
     * [Private Method] Handler for pointerDown events.
     * @param {PointerEvent} e A PointerEvent.
     */
    function onPointerDown(e) {
        var domElement = this; // Note: 'this' should be e.currentTarget
        if (!isEventProcessable(domElement, e)) {
            return;
        }
        logPointerEvent(e);
        endHover(e); // Hover-cancel
        addPointer(e);
        queueEventForPropagation(e);
    }
    /**
     * [Private Method] Handler for pointerMove events.
     * @param {PointerEvent} e A PointerEvent.
     */
    function onPointerMove(e) {
        var domElement = this; // Note: 'this' should be e.currentTarget
        if (!isEventProcessable(domElement, e)) {
            return;
        }
        var pointerID = makePointerID(e);
        var targetDomElement = e.currentTarget;
        var targetElementID = getTargetElementID(targetDomElement);
        logPointerEvent(e, MIL.FeatureNames.PointerEventsIncludingMove);
        if (_activePointerLatestMoveEvents[targetElementID]) {
            // Are we getting a PointerMove before either a PointerDown (or after a PointerUp) or a 'hover-start'? If so, ignore the event
            var hasPointerDownHappened = Boolean(_activePointerDownEvents[targetElementID]) && _activePointerDownEvents[targetElementID].hasOwnProperty(pointerID);
            var hasHoverStartHappened = Boolean(_activeHoverEvents[targetElementID]) && _activeHoverEvents[targetElementID].hasOwnProperty(pointerID);
            if (!hasPointerDownHappened && !hasHoverStartHappened) {
                return;
            }
            // PointerMove should only ever update _activePointerLatestMoveEvents[targetElementID][pointerID], NOT create it.
            // This ensures that we confine tracking of adding/removing of pointers to addPointer()/removePointer().
            if (!_activePointerLatestMoveEvents[targetElementID][pointerID]) {
                return;
            }
            e.__MILTimeStamp__ = Date.now(); // e.TimeStamp is not consistent bewteen IE11 and Chrome, so we add our own
            _activePointerLatestMoveEvents[targetElementID][pointerID] = e;
        }
        queueEventForPropagation(e);
        // Pass the event along to the Ink (if any) that's currently using [ie. is being created with] this pointer
        if (MIL._inkCompletePathPointData[pointerID]) {
            var gesture = getInkingGesture(pointerID);
            if (!gesture.IsCancelled()) {
                gesture.Ink().OnPointerMove(e);
            }
        }
    }
    /**
     * [Private Method] Handler for pointerUp events.
     * @param {PointerEvent} e A PointerEvent.
     */
    function onPointerUp(e) {
        var domElement = this; // Note: 'this' should be e.currentTarget
        if (!isEventProcessable(domElement, e)) {
            return;
        }
        logPointerEvent(e);
        removePointer(e);
        queueEventForPropagation(e);
    }
    /**
     * [Private Method] Handler for pointerEnter events (which potentially starts a check for a hover event).
     * @param {PointerEvent} e A PointerEvent.
     */
    function onPointerEnter(e) {
        var domElement = this; // Note: 'this' should be e.currentTarget
        if (!isEventProcessable(domElement, e)) {
            return;
        }
        var pointerID = makePointerID(e);
        var targetDomElement = e.currentTarget;
        var targetElementID = getTargetElementID(targetDomElement);
        logPointerEvent(e);
        // Hover-start
        if (canHover(e.pointerType, targetDomElement)) {
            if (e.buttons === 0) // Hover [we handle Contact (ie. hover-cancel) in onPointerDown()]
             {
                // Any given pointer can only hover over one element at-a-time
                var existingHoverTargetElementID = getHoverTarget(pointerID);
                if (existingHoverTargetElementID !== null) {
                    log("Ignoring PointerEnter for '" + pointerID + "' on '" + targetElementID + "' (reason: the pointer is already being used in a hover for '" + existingHoverTargetElementID + "')", FeatureNames.Hover);
                    return;
                }
                // Any given element can only be hovered over by one pointer at-a-time
                // Note: On Chrome we observe that [sometimes] a pointerEnter for the pen is either preceded or followed by a
                //       pointerEnter for the mouse. When this happens, the mouse does not generate any pointerMove events.
                var existingHoverPointerID = getHoverPointerID(targetElementID);
                if (existingHoverPointerID !== null) {
                    log("Ignoring PointerEnter for '" + pointerID + "' on '" + targetElementID + "' (reason: the element is already involved in a hover using '" + existingHoverPointerID + "')", FeatureNames.Hover);
                    return;
                }
                // Note: Don't use 'let' for these variables: it will result in the variable being renamed during compilation which means it won't surface correctly in the debugger
                var latestMoveEvent = null;
                var hoverTimeoutInMs = GetElementHoverTimeoutInMs(targetDomElement);
                var onMoveHandler = function (pointerMoveEvent) {
                    // We only want to capture the pointerMove events of the same pointer that generated the original pointerEnter
                    if (makePointerID(pointerMoveEvent) !== pointerID) {
                        return;
                    }
                    // Keep track of the pointer position while we wait for waitForHover() to tick
                    latestMoveEvent = pointerMoveEvent;
                    // Note: Because waitForHover() [see below] executes asynchronously [rather than directly in an event handler], the 'currentTarget'
                    //       property of either 'e' or 'latestMoveEvent' will be null, so we save currentTarget in latestMoveEvent.__MILCurrentTarget__
                    latestMoveEvent.__MILCurrentTarget__ = pointerMoveEvent.currentTarget;
                };
                // Only the most recent [ie. top-most] e.currentTarget of pointerID will become the hover target, because pointerEnter events appear to be
                // raised on elements in z-index order (for the elements under the pointer). TODO: Is this the same for all browsers [because we are relying on it]?
                if (_activeHoverTimerInfo[pointerID] && (_activeHoverTimerInfo[pointerID].timerID > 0)) {
                    removeTemporaryHoverMoveHandler(_activeHoverTimerInfo[pointerID]);
                }
                // A hover doesn't start immediately, it requires hoverTimeoutInMs to elapse first
                var timerID = setTimeout(function waitForHover(pointerEnterEvent) {
                    log("Hover started for '" + targetElementID + "' using '" + pointerID + "'", FeatureNames.Hover);
                    removeTemporaryHoverMoveHandler(_activeHoverTimerInfo[pointerID]);
                    delete _activeHoverTimerInfo[pointerID];
                    pointerEnterEvent.__MILCurrentTarget__ = targetDomElement;
                    if ((hoverTimeoutInMs > 0) && (latestMoveEvent !== null)) {
                        // Note: We can't just use 'pointerEnterEvent' in the call to addPointer() below because the position
                        //       of 'pointerEnterEvent' is stale by hoverTimeoutInMs, so we use latestMoveEvent instead
                        pointerEnterEvent = latestMoveEvent;
                    }
                    pointerEnterEvent.__MILIsMILHoverStartEvent__ = true; // Flag the event as being the one that represents a hover-start
                    // Note: pointerEnterEvent.currentTarget will always be null [see note about __MILCurrentTarget__ above]
                    addPointer(pointerEnterEvent);
                    // Note: We don't actually propagate hover-related events: the purpose of enqueing it is purely to mark the queue as needing to be purged [see propagateQueuedEvents()]
                    queueEventForPropagation(pointerEnterEvent);
                }, hoverTimeoutInMs, e);
                _activeHoverTimerInfo[pointerID] = { timerID: timerID, targetDomElement: targetDomElement, hoverMoveHandler: null };
                if (hoverTimeoutInMs > 0) {
                    // This listener is only temporary and will be removed when hover starts, or is cancelled (by contact), or ends (pointerLeave)
                    targetDomElement.addEventListener("pointermove", onMoveHandler);
                    _activeHoverTimerInfo[pointerID].hoverMoveHandler = onMoveHandler;
                    log("Added temporary 'hover-start' pointerMove handler (for " + targetElementID + ")", FeatureNames.Hover);
                }
            }
        }
        // Are we getting a new pointerEnter without getting a prior pointerUp? This happens on Chrome with a touch+mouse Gesture (for the mouse).
        // From https://www.w3.org/TR/pointerevents/#the-primary-pointer: "Some user agents may ignore the concurrent use of more than one type of pointer input to avoid accidental interactions."
        if (_activePointerDownEvents[targetElementID] && _activePointerDownEvents[targetElementID][pointerID] && !MIL.GetGestureFromEvent(e)) {
            log("Warning: No pointerUp received for " + pointerID, FeatureNames.PointerEvents);
            onPointerUp.call(targetDomElement, e);
        }
    }
    /**
     * [Private Method] Handler for pointerLeave events (which potentially ends a hover event).
     * @param {PointerEvent} e A PointerEvent.
     */
    function onPointerLeave(e) {
        // Note: We'll get a pointerLeave event for the SVG element when a child element (like a circle) - or even the SVG itself - captures the pointer.
        //       We'll get another pointerLeave for both the circle and the SVG when the pointer is lifted from the circle. 
        var domElement = this; // Note: 'this' should be e.currentTarget
        if (!isEventProcessable(domElement, e)) {
            return;
        }
        var pointerID = makePointerID(e);
        var targetDomElement = e.currentTarget;
        var targetElementID = getTargetElementID(targetDomElement);
        logPointerEvent(e);
        // Treat a pointer moving outside the SVG element the same as if the pointer had been lifted
        // Note: Chrome and IE11 exhibit slightly different behavior when a pen in contact leaves the SVG element:
        //       - Chrome will fire PointerUp followed by PointerLeave but not until until the pen [outside the SVG] is lifted, and as a result e.buttons will be 0.
        //       - IE11 does not fire PointerUp but fires PointerLeave as soon as the pen leaves the SVG (with e.buttons = 1).
        if ((targetDomElement instanceof SVGSVGElement) && (e.buttons !== 0)) // The buttons check is so that we ignore [pen] hover [we want the code below to apply only if the pointer is in contact]
         {
            var svgInfo = getSvgInfo(targetDomElement);
            // Note: e.offsetX/Y is relative to the SVG element [offsetX/Y 0,0 is always the top-left corner]
            //       We want to use offsetX/Y (not clientX/Y) in this instance.
            if ((e.offsetX < 0) || (e.offsetY < 0) || (e.offsetX > (svgInfo.svgWidth - 1)) || (e.offsetY > (svgInfo.svgHeight - 1))) {
                onPointerUp.call(targetDomElement, e);
            }
        }
        // Are we getting a pointerLeave without first getting a pointerUp? This happens on Chrome with a touch+mouse Gesture (for the mouse).
        // From https://www.w3.org/TR/pointerevents/#the-primary-pointer: "Some user agents may ignore the concurrent use of more than one type of pointer input to avoid accidental interactions."
        if (_activePointerDownEvents[targetElementID] && _activePointerDownEvents[targetElementID][pointerID] && !MIL.GetGestureFromEvent(e)) {
            log("Warning: No pointerUp received for " + pointerID, FeatureNames.PointerEvents);
            onPointerUp.call(targetDomElement, e);
        }
        endHover(e); // Hover-end
    }
    /**
     * [Private Method] Handler for pointerCancel events.
     * @param {PointerEvent} e A PointerEvent.
     */
    function onPointerCancel(e) {
        var domElement = this; // Note: 'this' should be e.currentTarget
        var pointerID = makePointerID(e);
        logPointerEvent(e);
        // PointerCancel rarely occurs, but if is does happen we need to ensure that the pointer gets removed
        if (isHoverPointer(pointerID)) {
            endHover(e, true);
        }
        else {
            onPointerUp.call(domElement, e);
        }
    }
    /**
     * [Private Method] Logs the supplied PointerEvent.
     * @param {PointerEvent} e A PointerEvent.
     * @param {FeatureNames} [featureName] [Optional] The MIL.FeatureNames value (eg. PointerEventsIncludingMove) that must be enabled for the logging to occur.
     */
    function logPointerEvent(e, featureName) {
        if (featureName === void 0) { featureName = FeatureNames.PointerEvents; }
        if (!DebugFeature(featureName) || e.__MILLogged__) {
            return;
        }
        var pointerID = makePointerID(e);
        var targetDomElement = e.currentTarget;
        var targetElementID = getTargetElementID(targetDomElement);
        var typeName = e.type.replace("pointer", "");
        var pointerTypeName = (e.type.indexOf("pointer") === 0) ? "Pointer" + typeName[0].toUpperCase() + typeName.slice(1) : e.type;
        log("EVENT: " + pointerTypeName + " [" + pointerID + " on " + targetElementID + "] Buttons = " + e.buttons, featureName);
        // To prevent re-logging the event, mark it as logged
        e.__MILLogged__ = true;
    }
    /**
     * [Private Method] Queues the specified PointerEvent for (later) propagation. This postponing mechanism works while Gesture recognition is running.
     * @param {PointerEvent} e A PointerEvent.
     */
    function queueEventForPropagation(e) {
        // While we wait to see if our gesture recognition will succeed - or if a recognized gesture will complete - we [temporarily] prevent downstream handlers from getting the event
        // [we'll dispatch the event later on if our recognition fails (or the gesture completion timeout expires)]
        if (isAcquiringPointers() || isAwaitingGestureCompletion()) {
            // Add a property so that we can easily detect the events that we redispatch (and their age)
            if (e.__MILRedispatchedToParent__ === undefined) {
                e.__MILRedispatchedToParent__ = Date.now();
            }
            else {
                // The event has been previously redispatched, and now it's being queued having been received by a parent.
                // In this case we don't update the value (time) of __MILRedispatchedToParent__, we keep the original.
            }
            // log("Queuing " + e.type + " (targeting " + ((e.currentTarget as BaseObject).__MILID__ || "?") + ")");
            MIL._postponedPointerEvents.push(e);
            // Prevent parent+peer handlers from processing the event
            if ((e.type === "pointermove") && isAwaitingGestureCompletion()) {
                // If we're waiting for a gesture to complete we allow peer-handlers to process pointerMove events, since otherwise
                // the gesture's OnMoveHandler() [if any] won't receive events during the completion timeout period [and processing
                // these events may be required to let the gesture be completed (by the user) before the completion-timer cancels it]
                e.stopPropagation();
            }
            else {
                e.stopImmediatePropagation();
            }
        }
    }
    /**
     * [Private Method] Returns the targetElementID that the specified pointerID is currently hovering over; returns null if the pointer is not hovering.
     * @param {string} targetPointerID A pointer ID.
     * @returns {string | null} Result.
     */
    function getHoverTarget(targetPointerID) {
        for (var targetElementID in _activeHoverEvents) {
            for (var pointerID in _activeHoverEvents[targetElementID]) {
                if (pointerID === targetPointerID) {
                    return (targetElementID);
                }
            }
        }
        return (null);
    }
    /**
     * [Private method] Returns the pointerID that has either started a hover detection for, or is currently hovering over, the specified targetElementID; returns null if the element is not currently involved in a hover.
     * @param {string} targetElementID A __MILID__ value.
     * @returns {string | null} Result.
     */
    function getHoverPointerID(targetElementID) {
        var pointerID;
        if (_activeHoverEvents[targetElementID]) {
            // A hover "event" is active on the element
            pointerID = Object.keys(_activeHoverEvents[targetElementID])[0];
            return (pointerID);
        }
        for (pointerID in _activeHoverTimerInfo) {
            var hoverTimerInfo = _activeHoverTimerInfo[pointerID];
            if (getTargetElementID(hoverTimerInfo.targetDomElement) === targetElementID) {
                // There is a 'hover-start' timer running on the element
                return (pointerID);
            }
        }
        return (null);
    }
    // 
    /**
     * Returns true if the specified targetPointerID is currently being used in a hover.
     * @param {string} targetPointerID A pointer ID.
     * @return {boolean} Result.
     */
    function isHoverPointer(targetPointerID) {
        return (getHoverTarget(targetPointerID) !== null);
    }
    /**
     * [Internal] Returns true if the specified pointerType (or pointerID) is capable of hover behavior for the specified DOM element.
     * @param {string} pointerTypeOrID Either a PointerEvent.pointerType (eg. "pen") or a pointerID (eg. "PointerID_pen_123").
     * @param {TargetDomElement} targetElement The element the pointer will hover over.
     * @returns {boolean} Result.
     * @internal
     */
    function canHover(pointerTypeOrID, targetElement) {
        var pointerType = "";
        var domElement = MIL.Utils.GetDomElement(targetElement);
        if (GetElementHoverTimeoutInMs(domElement) < 0) // -1 indicates that hovering is disabled
         {
            return (false);
        }
        // Hovering on the SVG is disallowed because we won't get a pointerLeave for the SVG (thus ending the hover)
        // until the pointer leaves the *entire* SVG area - so no further hover "events" on other elements can happen
        if (domElement instanceof SVGSVGElement) {
            return (false);
        }
        // Handle the case of pointerTypeOrID being a pointerID
        if (pointerTypeOrID.indexOf("_") !== -1) {
            pointerType = pointerTypeOrID.split("_")[1];
        }
        else {
            pointerType = pointerTypeOrID;
        }
        // Note: Our current approach of treating "hover" as a distinct PointerType does not allow us to readily distinguish between a pen-hover and a mouse-hover.
        return ((pointerType === "pen") || (pointerType === "mouse"));
    }
    MIL.canHover = canHover;
    /**
     * [Private Method] Removes the temporary pointerMove handler (from the supplied hoverInfo) that was installed while we wait for a 'hover' event to start.
     * @param {HoverTimerInfo} hoverInfo A HoverTimerInfo.
     */
    function removeTemporaryHoverMoveHandler(hoverInfo) {
        if (hoverInfo.hoverMoveHandler) {
            clearTimeout(hoverInfo.timerID);
            hoverInfo.targetDomElement.removeEventListener("pointermove", hoverInfo.hoverMoveHandler);
            hoverInfo.hoverMoveHandler = null;
            log("Removed temporary 'hover-start' pointerMove handler (for " + getTargetElementID(hoverInfo.targetDomElement) + ")", FeatureNames.Hover);
        }
    }
    /**
     * [Private Method] Handles hover ending (as a result of either a pointerLeave or pointerDown).
     * @param {PointerEvent} e A PointerEvent.
     * @param {boolean} [forceEnd] [Optional] True to force the hover to end.
     */
    function endHover(e, forceEnd) {
        if (forceEnd === undefined) {
            forceEnd = false;
        }
        if (!canHover(e.pointerType, e.currentTarget)) {
            return;
        }
        var pointerID = makePointerID(e);
        var targetDomElement = e.currentTarget;
        var targetElementID = getTargetElementID(targetDomElement);
        if (((e.type === "pointerleave") && (e.buttons === 0)) || // Hover
            ((e.type === "pointerdown") && (e.buttons > 0)) || // Contact [optionally with one or more buttons pressed]
            forceEnd) {
            if (_activeHoverTimerInfo[pointerID] && (_activeHoverTimerInfo[pointerID].timerID > 0)) {
                removeTemporaryHoverMoveHandler(_activeHoverTimerInfo[pointerID]);
                delete _activeHoverTimerInfo[pointerID];
            }
            // Has Hover started?
            if (_activeHoverEvents[targetElementID] && _activeHoverEvents[targetElementID][pointerID]) {
                switch (e.type) {
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
    /**
     * Returns the hover timeout (in milliseconds) for the specified element. A value of -1 indicates that hovering is disabled.
     * See also: Settings.HoverTimeoutInMs().
     * @param {TargetDomElement} targetElement The element to get the hover timeout for.
     * @returns {number} Result.
     */
    function GetElementHoverTimeoutInMs(targetElement) {
        var domElement = MIL.Utils.GetDomElement(targetElement);
        var targetElementID = getTargetElementID(domElement);
        var hoverTimeoutInMs = _hoverTimeouts[targetElementID];
        var settings = getSvgInfo(targetElement).settings;
        return ((hoverTimeoutInMs !== undefined) ? hoverTimeoutInMs : settings.HoverTimeoutInMs());
    }
    MIL.GetElementHoverTimeoutInMs = GetElementHoverTimeoutInMs;
    /**
     * Sets the hover timeout (in milliseconds) for the specified element.
     * See also: Settings.HoverTimeoutInMs().
     * @param {TargetDomElement} targetElement The element to set the hover timeout for.
     * @param {number} hoverTimeoutInMs The hover timeout (in milliseconds).
     */
    function SetElementHoverTimeoutInMs(targetElement, hoverTimeoutInMs) {
        var domElement = MIL.Utils.GetDomElement(targetElement);
        var targetElementID = getTargetElementID(domElement);
        _hoverTimeouts[targetElementID] = Math.max(-1, hoverTimeoutInMs); // A value of -1 indicates that hovering is disabled
    }
    MIL.SetElementHoverTimeoutInMs = SetElementHoverTimeoutInMs;
    /**
     * [Private Method] Handles the adding of a pointer. This happens at pointerDown, but can also happen at pointerEnter/Move (for hover).
     * @param {PointerEvent} e A PointerEvent.
     */
    function addPointer(e) {
        var pointerID = makePointerID(e);
        var targetDomElement = (e.currentTarget || e.__MILCurrentTarget__); // We use "|| e.__MILCurrentTarget__" to handle being called via waitForHover() in onPointerEnter()
        var targetElementID = getTargetElementID(targetDomElement);
        var maxRecognitionTimeoutInMs = -2; // -1 means "from pointer-up" to recognizeGesture(), so we use -2 to mean "not yet assigned" to avoid potential confusion
        var definedMaxRecognitionTimeoutInMs = -2; // Ditto
        e.__MILTimeStamp__ = Date.now(); // e.TimeStamp is not consistent bewteen IE11 and Chrome, so we add our own
        log("Adding " + pointerID + " [to " + targetElementID + "]" + ((e.type !== "pointerdown") ? " [via " + e.type + "]" : ""));
        if (e.type === "pointerdown") {
            if (_activePointerDownEvents[targetElementID] === undefined) {
                _activePointerDownEvents[targetElementID] = {};
                _activePointerDownStartTime[targetElementID] = Date.now();
            }
            _activePointerDownEvents[targetElementID][pointerID] = e;
        }
        if (e.__MILIsMILHoverStartEvent__ === true) {
            if (_activeHoverEvents[targetElementID] === undefined) {
                _activeHoverEvents[targetElementID] = {};
                _activeHoverStartTime[targetElementID] = Date.now();
            }
            _activeHoverEvents[targetElementID][pointerID] = e;
        }
        if (_activePointerLatestMoveEvents[targetElementID] === undefined) {
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
        for (var g = 0; g < _gestures.length; g++) {
            var gesture = _gestures[g];
            if (gesture.Target() === targetDomElement) {
                if ((gesture.PointerType().indexOf(e.pointerType) !== -1) || (gesture.PointerType() === "any") || (canHover(e.pointerType, targetDomElement) && (gesture.PointerType().indexOf("hover") !== -1))) {
                    maxRecognitionTimeoutInMs = definedMaxRecognitionTimeoutInMs = Math.max(maxRecognitionTimeoutInMs, gesture.RecognitionTimeoutInMs());
                }
            }
        }
        if (maxRecognitionTimeoutInMs === -2) // ie. maxRecognitionTimeoutInMs wasn't assigned
         {
            log("There are no gestures on '" + targetElementID + "' that use pointerType '" + e.pointerType + "'");
            return;
        }
        // For a propagated pointerDown event, reduce maxRecognitionTimeoutInMs by the age of the event. This makes gesture recognition on parent elements faster.
        if (isPropagatedEvent(e) && (maxRecognitionTimeoutInMs > 0)) {
            var eventAgeInMs = Date.now() - e.__MILRedispatchedToParent__;
            // Note: We set maxRecognitionTimeoutInMs to at least 1ms to avoid affecting the code-path we'll follow below
            maxRecognitionTimeoutInMs = Math.max(1, maxRecognitionTimeoutInMs - eventAgeInMs);
        }
        if (!_targetElementState[targetElementID]) {
            _targetElementState[targetElementID] = { isAcquiringPointers: false, recognizeGestureTimerID: -1, gestureRecognitionRan: false, isAwaitingGestureCompletion: false };
        }
        // If not already in the "acquiring" phase, kick-off a [delayed] gesture recognition (the delay allows enough time for the required pointers to make contact with the screen)
        if (!_targetElementState[targetElementID].isAcquiringPointers) {
            _targetElementState[targetElementID].isAcquiringPointers = true;
            _targetElementState[targetElementID].gestureRecognitionRan = false;
            if (MIL._postponedPointerEvents.length > 0) {
                log("Clearing " + MIL._postponedPointerEvents.length + " queued pointer events", FeatureNames.GestureRecognition);
                MIL._postponedPointerEvents.length = 0;
            }
            if (maxRecognitionTimeoutInMs === 0) // A timeout of zero only makes sense for a single-pointer gesture
             {
                var recognitionResult = recognizeGesture(targetDomElement, maxRecognitionTimeoutInMs, definedMaxRecognitionTimeoutInMs);
                if (recognitionResult.success) {
                    // We handled the pointer event, so we prevent parent+peer handlers from also processing it
                    e.stopImmediatePropagation();
                }
            }
            else {
                startRecognizeGestureTimer(targetElementID, function () {
                    var recognitionResult = recognizeGesture(targetDomElement, maxRecognitionTimeoutInMs, definedMaxRecognitionTimeoutInMs);
                    if (!recognitionResult.success && recognitionResult.propagateEvents) {
                        // Propagate any queued events to allow any gestures on the target's parent element to be recognized
                        // Note: Because inking can't be started until a gesture's GestureStartedHandler() is called, these postponed events will get
                        //       processed [in a quick burst] by Gesture.Ink().OnPointerMove(). This will manifest as a delay in initial ink responsiveness.
                        propagateQueuedEvents(targetDomElement);
                    }
                }, maxRecognitionTimeoutInMs);
            }
        }
    }
    /**
     * [Private Method] Handles the removing of a pointer. This happens at pointerUp, but can also happen at pointerLeave and pointerDown [see endHover()].
     * @param {PointerEvent} e A PointerEvent.
     */
    function removePointer(e) {
        var liftedPointerID = makePointerID(e);
        var targetElementID = getTargetElementID((e.currentTarget || e.target)); // We use "|| e.target" to handle being called with a pointerMove event
        var endedGestures = [];
        log("Removing " + liftedPointerID + " [from " + targetElementID + "]" + ((e.type !== "pointerup") ? " [via " + e.type + "]" : ""));
        // Handle the case where a pointer is removed BEFORE recognizeGesture() has run [typically
        // this happens if a pointer is lifted before the maximum RecognitionTimeoutInMs elapses].
        // Note that we only handle this once [if at all], when the first pointer is removed.
        if (_targetElementState[targetElementID] && (_targetElementState[targetElementID].gestureRecognitionRan === false) && (e.type === "pointerup")) {
            var targetDomElement = e.currentTarget;
            recognizeGesture(targetDomElement, -1, -1);
        }
        // Call the GestureEndedHandler (and update the PointerList) for any gesture that is using this pointerID
        for (var g = 0; g < _gestures.length; g++) {
            var gesture = _gestures[g];
            var pointerList = gesture.ActivePointerList();
            var isGestureUsingLiftedPointerID = false;
            for (var i = 0; i < pointerList.length; i++) {
                if (pointerList[i] === liftedPointerID) {
                    isGestureUsingLiftedPointerID = true;
                    break;
                }
            }
            if (isGestureUsingLiftedPointerID) {
                gesture.ReleasePointerCapture();
                if (!gesture.IsCancelled()) {
                    var ink = gesture.Ink();
                    if ((ink !== null) && (ink.PointerID() === liftedPointerID)) {
                        ink.OnPointerUp(e);
                    }
                    gesture.endedTime(Date.now());
                    if (gesture.GestureEndedHandler() !== null) {
                        gesture.GestureEndedHandler().call(gesture, liftedPointerID);
                    }
                    endedGestures.push(gesture);
                }
                if (gesture.OnMoveHandler() !== null) {
                    // Remove the handler
                    gesture.OnMoveHandler(null);
                }
                gesture.ActivePointerList().length = 0;
                gesture.ActivePointerTypeOrdinals().length = 0;
                // We handled the pointer event, so we prevent parent+peer handlers from also processing it
                e.stopImmediatePropagation();
            }
        }
        var deletedItems = "";
        var elementID;
        for (elementID in _activePointerDownEvents) {
            if (_activePointerDownEvents[elementID][liftedPointerID]) {
                delete _activePointerDownEvents[elementID][liftedPointerID];
                deletedItems += "_activePointerDownEvents[" + elementID + "][" + liftedPointerID + "] ";
            }
            if (Object.keys(_activePointerDownEvents[elementID]).length === 0) {
                delete _activePointerDownEvents[elementID];
                delete _activePointerDownStartTime[elementID];
                deletedItems += "_activePointerDownEvents[" + elementID + "] ";
            }
        }
        for (elementID in _activeHoverEvents) {
            if (_activeHoverEvents[elementID][liftedPointerID]) {
                delete _activeHoverEvents[elementID][liftedPointerID];
                deletedItems += "_activeHoverEvents[" + elementID + "][" + liftedPointerID + "] ";
            }
            if (Object.keys(_activeHoverEvents[elementID]).length === 0) {
                delete _activeHoverEvents[elementID];
                delete _activeHoverStartTime[elementID];
                deletedItems += "_activeHoverEvents[" + elementID + "] ";
            }
        }
        for (elementID in _activePointerLatestMoveEvents) {
            if (_activePointerLatestMoveEvents[elementID][liftedPointerID]) {
                delete _activePointerLatestMoveEvents[elementID][liftedPointerID];
                deletedItems += "_activePointerLatestMoveEvents[" + elementID + "][" + liftedPointerID + "] ";
            }
            if (Object.keys(_activePointerLatestMoveEvents[elementID]).length === 0) {
                delete _activePointerLatestMoveEvents[elementID];
                deletedItems += "_activePointerLatestMoveEvents[" + elementID + "] ";
            }
        }
        if (deletedItems) {
            log("Removed " + deletedItems);
        }
        var _loop_1 = function (i) {
            var gesture = endedGestures[i];
            if (gesture.CheckForGesturesOnEnd()) {
                // We use a short timeout here to avoid unintentional gesture recognition due to 2 or more pointers being removed within the timeout interval
                // [eg. preventing a 2-fingered 'zoom' from always ending with a 1-fingered 'pan' just because the first finger is lifted a few milliseconds before the second finger]
                startRecognizeGestureTimer(targetElementID, function () {
                    recognizeGesture(gesture.Target(), 0, 0, false);
                }, 200);
                return "break";
            }
        };
        // For each ended gesture, [optionally] look for another gesture that may still be applicable [ie. with the one-or-more pointers that may still be down].
        // For example, the user wants a 2-finger zoom to become a 1-finger pan when the first zoom finger is lifted.
        for (var i = 0; i < endedGestures.length; i++) {
            var state_1 = _loop_1(i);
            if (state_1 === "break")
                break;
        }
    }
    /**
     * [Private Method] Starts a timer (for the specified targetElementID) to call recognizeGesture() via the supplied callback.
     * @param {string} targetElementID A __MILID__ value.
     * @param {VoidCallback} callback The callback to invoke (after timeoutInMs have elapsed) [that must call recognizeGesture()].
     * @param {number} timeoutInMs A timeout (in milliseconds).
     */
    function startRecognizeGestureTimer(targetElementID, callback, timeoutInMs) {
        if (_targetElementState[targetElementID].recognizeGestureTimerID >= 0) {
            log("Recognize-gesture timer not started (reason: An existing timer (ID:" + _targetElementState[targetElementID].recognizeGestureTimerID + ") has already been started for '" + targetElementID + "')", FeatureNames.GestureRecognition);
        }
        else {
            var timerID = setTimeout(function () {
                _targetElementState[targetElementID].recognizeGestureTimerID = -1; // The timer has ticked
                callback(); // Calls recognizeGesture()
            }, timeoutInMs);
            _targetElementState[targetElementID].recognizeGestureTimerID = timerID;
            log("Recognize-gesture timer (ID:" + timerID + ", " + timeoutInMs + "ms) started for '" + targetElementID + "'", FeatureNames.GestureRecognition);
        }
    }
    /**
     * [Private Method] Cancels the timer (if any) started with startRecognizeGestureTimer() for the specified targetElementID.
     * @param {string} targetElementID A __MILID__ value.
     */
    function cancelRecognizeGestureTimer(targetElementID) {
        var timerID = _targetElementState[targetElementID].recognizeGestureTimerID;
        if (timerID >= 0) {
            clearTimeout(timerID);
            _targetElementState[targetElementID].recognizeGestureTimerID = -1;
            log("Recognize-gesture timer (ID:" + timerID + ") cancelled for '" + targetElementID + "'", FeatureNames.GestureRecognition);
        }
    }
    /** Resets all hover state tracking. */
    function ResetHoverStateTracking() {
        _activeHoverEvents = {};
        _activeHoverStartTime = {};
        _activeHoverTimerInfo = {};
    }
    MIL.ResetHoverStateTracking = ResetHoverStateTracking;
})(MIL || (MIL = {}));
var MIL;
(function (MIL) {
    /**
     * The Utils namespace.
     */
    var Utils;
    (function (Utils) {
        var _keyboardHandlerEnabled = false; // Whether the keyboard handler is currently enabled
        var _currentlyPressedKeys = []; // The list of keyCodes of currently pressed keys
        var _keyUpTimerID = {}; // Key: keyCode of currently pressed key, Value = corresponding ID of the auto-KeyUp timer
        // This should exceed the typical time a key is held prior to initiating a gesture [with one or more pointers], but it should not be so
        // long as to cause false-positives (ie. the key still appearing to be held) after the user "returns" to the page [from the browser chrome].
        // Note: JavaScript timers don't run [in IE11 at least] while a browser chrome dialog (eg. "Save Webpage") is open.
        var KEYDOWN_TIMEOUT_IN_MS = 1200;
        /** Key codes (like DELETE) that can't be expressed as a string (like "A"). */
        var Keys;
        (function (Keys) {
            Keys[Keys["UP"] = 38] = "UP";
            Keys[Keys["DOWN"] = 40] = "DOWN";
            Keys[Keys["LEFT"] = 37] = "LEFT";
            Keys[Keys["RIGHT"] = 39] = "RIGHT";
            Keys[Keys["PLUS"] = 107] = "PLUS";
            Keys[Keys["MINUS"] = 109] = "MINUS";
            Keys[Keys["SHIFT"] = 16] = "SHIFT";
            Keys[Keys["CTRL"] = 17] = "CTRL";
            Keys[Keys["DELETE"] = 46] = "DELETE";
        })(Keys = Utils.Keys || (Utils.Keys = {}));
        /** Shapes that can be searched for using FindShapeElementsInRegion(). */
        var ShapeNodeType;
        (function (ShapeNodeType) {
            /** A MIL Ink. */
            ShapeNodeType["Ink"] = "ink";
            /** An SVG <circle>. */
            ShapeNodeType["Circle"] = "circle";
            /** An SVG <ellipse>. */
            ShapeNodeType["Ellipse"] = "ellipse";
            /** An SVG <rect>. */
            ShapeNodeType["Rect"] = "rect";
            /** An SVG <line>. */
            ShapeNodeType["Line"] = "line";
            /** An SVG <polygon>. */
            ShapeNodeType["Polygon"] = "polygon";
            /** An SVG <polyline>. */
            ShapeNodeType["PolyLine"] = "polyline";
            /** An SVG <path>. */
            ShapeNodeType["Path"] = "path";
        })(ShapeNodeType = Utils.ShapeNodeType || (Utils.ShapeNodeType = {}));
        /**
         * Logs the specified message (with the [optional] specified prefix) to the console.
         * @param {string} message Message to log.
         * @param {string} [prefix] [Optional] Prefix for the message.
         */
        function Log(message, prefix) {
            console.log(getTime() + ": " + (prefix ? prefix + ": " : "") + message);
        }
        Utils.Log = Log;
        /**
         * [Private Method] Returns the current time in 'MM/dd hh:mm:ss.fff' format.
         * @returns {string} Result.
         */
        function getTime() {
            var now = new Date(Date.now());
            var date = ("0" + (now.getMonth() + 1)).slice(-2) + "/" + ("0" + now.getDate()).slice(-2);
            var time = ("0" + now.getHours()).slice(-2) + ":" + ("0" + now.getMinutes()).slice(-2) + ":" + ("0" + now.getSeconds()).slice(-2) + "." + ("00" + now.getMilliseconds()).slice(-3);
            return (date + " " + time);
        }
        /**
         * [Internal] Returns true if the browser is Internet Explorer 11.
         * @returns {boolean} Result.
         * @internal
         */
        function isIE11() {
            var isIE11 = !!window.MSInputMethodContext && !!document["documentMode"];
            if (isIE11) {
                var isIERunningInCompatabilityMode = (navigator.userAgent.indexOf("Trident") !== -1) && (navigator.userAgent.indexOf("MSIE") !== -1);
                if (isIERunningInCompatabilityMode) {
                    MIL.log("Warning: When running MIL on IE11 'Compatability View' should be turned off (by unchecking the 'Display intranet sites in Compatability View' option under Tools -> Compatability View settings)");
                }
            }
            return (isIE11);
        }
        Utils.isIE11 = isIE11;
        // See https://stackoverflow.com/questions/4565112/javascript-how-to-find-out-if-the-user-browser-is-chrome
        /**
         * [Internal] Returns true if the browser is Chrome.
         * @returns {boolean} Result.
         * @internal
         */
        function isChrome() {
            var winChrome = window.chrome; // IE11 returns undefined and Opera 30 returns true
            var winNav = window.navigator;
            var vendorName = winNav.vendor;
            var isOpera = (typeof window.opr !== "undefined");
            var isEdge = winNav.userAgent.indexOf("Edge") > -1;
            var isChrome = (winChrome !== null) && (typeof winChrome !== "undefined") && (vendorName === "Google Inc.") && (isOpera === false) && (isEdge === false);
            return (isChrome);
        }
        Utils.isChrome = isChrome;
        /**
         * Returns the DOM element represented by 'targetElement', which can be either be an actual SVG DOM element, a d3 selection containing a single SVG DOM element, or an HTML DOM element.
         * In either case, if 'domElementType' is specified (eg. SVGPathElement) then the DOM element represented by 'targetElement' must be of that type or an exception will be thrown.
         * @param {TargetDomElement | HTMLElement} targetElement An actual DOM element, or a d3 selection containing a single DOM element.
         * @param {any} domElementType The type (eg. SVGPathElement) of 'targetElement'. An exception will be thrown if 'targetElement' is of a different type.
         * @return {DomElement} The DOM element represented by 'targetElement'.
         */
        function GetDomElement(targetElement, domElementType) {
            // Local 'Type Guard' functions
            var isD3Selection = function (o) { return ((GetObjectType(o) === "Selection") && (typeof o.size === "function") && (typeof o.node === "function")); };
            var isDomElement = function (o) { return (o instanceof HTMLElement || o instanceof SVGElement); };
            // First, check if 'targetElement' is a d3 selection
            if (isD3Selection(targetElement)) {
                if (targetElement.size() === 0) {
                    throw new MIL.MILException("The d3 selection provided is empty");
                }
                if (targetElement.size() > 1) {
                    throw new MIL.MILException("The d3 selection provided contains more than a single element");
                }
                if ((domElementType !== undefined) && !(targetElement.node() instanceof domElementType)) {
                    throw new MIL.MILException("The element in the d3 selection is of type '" + GetObjectType(targetElement.node()) + "', not '" + GetObjectType(domElementType) + "' as expected");
                }
                return targetElement.node();
            }
            if ((domElementType !== undefined) && !(targetElement instanceof domElementType)) {
                throw new MIL.MILException("The element is of type '" + GetObjectType(targetElement) + "', not '" + GetObjectType(domElementType) + "' as expected");
            }
            else {
                if (!isDomElement(targetElement)) {
                    throw new MIL.MILException("The element is of type '" + GetObjectType(targetElement) + "', which is not an HTML or SVG DOM element as expected");
                }
                return (targetElement);
            }
        }
        Utils.GetDomElement = GetDomElement;
        /**
         * [Private Method] Returns the name of the type of the specified object.
         * @param {object} o Object to get type name of.
         * @returns {string} Type name of object.
         */
        function GetObjectType(o) {
            var c = o.constructor.toString();
            var objectType = null;
            if (c.indexOf("function") === 0) {
                objectType = c.slice(9, c.indexOf("(")).trim();
            }
            else {
                if (c.indexOf("[object") === 0) {
                    objectType = c.slice(8, c.indexOf("]")).trim();
                }
                else {
                    // Handle the case where o is a DOM element type (eg. SVGPathElement)
                    if (c.indexOf("[native code]") !== -1) {
                        var typeString = o.toString();
                        if (typeString.indexOf("[object") === 0) {
                            objectType = typeString.slice(8, typeString.indexOf("]")).trim();
                        }
                    }
                    else {
                        // PORT: Added
                        throw new MIL.MILException("Unable to determine type of object '" + o.toString() + "'");
                    }
                }
            }
            return (objectType);
        }
        Utils.GetObjectType = GetObjectType;
        /**
         * [Private Method] Checks whether the specified 'memberName' is the name of a member in the specified 'enumType'. If it is, the numeric value of the member is returned. If not, returns 'undefined'.
         * @param {EnumType} enumType An enum type (eg. Utils.Keys).
         * @param {string} memberName The name to be checked.
         * @returns {number | undefined} The numeric value of the enum member (if found), or undefined.
         */
        function getEnumValue(enumType, memberName) {
            for (var propName in enumType) {
                if ((typeof enumType[propName] === "number") && (propName === memberName)) {
                    return enumType[propName];
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
        function GetRulerControl(o) {
            if (o instanceof MIL.Controls.RulerControl) {
                return (o);
            }
            else {
                throw new MIL.MILException("The specified object is not a RulerControl instance");
            }
        }
        Utils.GetRulerControl = GetRulerControl;
        /**
         * Enables (or disables) the keyboard handler for the specified DOM element (normally a top-level element, like a containing/parent DIV).
         * There is only one keyboard handler, so only it can only be enabled for one DOM element at-a-time.
         * If the keyboard handler is not enabled, methods like IsKeyPressed() and IsNoKeyPressed() will throw when called.
         * @param {TargetDomElement | HTMLElement} targetElement The element to enable/disable the keyboard handler for.
         * @param {boolean} enable The enable/disable flag.
         * @returns {boolean} Whether the operation was successful or not.
         */
        function EnableKeyboardHandler(targetElement, enable) {
            var domElement = Utils.GetDomElement(targetElement);
            if (enable && !_keyboardHandlerEnabled) {
                if (domElement.getAttribute("tabindex") === null) {
                    domElement.setAttribute("tabindex", "0"); // Make it focusable [so that it will get key events]...
                    domElement.style.outline = "none"; // ...but hide the focus rectangle
                }
                domElement.focus();
                if ((document.activeElement !== domElement) || !document.hasFocus()) {
                    MIL.log("Warning: Focus could not be not set to " + MIL.Utils.GetObjectType(domElement) + " '" + domElement.id + "' (activeElement? " + (document.activeElement === domElement) + ", documentFocused? " + document.hasFocus() + ")");
                }
                domElement.addEventListener("keydown", onKeyDown);
                domElement.addEventListener("keyup", onKeyUp);
                _keyboardHandlerEnabled = true;
                return (true);
            }
            if (!enable && _keyboardHandlerEnabled) {
                domElement.removeEventListener("keydown", onKeyDown);
                domElement.removeEventListener("keyup", onKeyUp);
                _keyboardHandlerEnabled = false;
                return (true);
            }
            return (false);
        }
        Utils.EnableKeyboardHandler = EnableKeyboardHandler;
        /**
         * [Private Method] Handler for keyDown events. Used by EnableKeyboardHandler().
         * @param {KeyboardEvent} e A KeyboardEvent.
         */
        function onKeyDown(e) {
            if (_currentlyPressedKeys.indexOf(e.keyCode) === -1) {
                MIL.log("Pushing keyCode " + e.keyCode, MIL.FeatureNames.KeyboardHandler);
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
        function keyTimerTick(e) {
            // If we've started acquiring pointers, don't fire off a key 'up' since that may prevent a gesture from being recognized;
            // instead, just re-start the timer. This helps mitigate the race condition, but it can still happen if the timer ticks
            // immediately before a pointer makes contact (in which case the [new] KeyDown event may not fire until AFTER gesture
            // recognition has run [and possibly failed because the key wasn't flagged as currently pressed]).
            if (MIL.isAcquiringPointers()) {
                _keyUpTimerID[e.keyCode] = setTimeout(function () { keyTimerTick(e); }, KEYDOWN_TIMEOUT_IN_MS);
            }
            else {
                onKeyUp(e);
            }
        }
        /**
         * [Private Method] Handler for keyUp events. Used by EnableKeyboardHandler().
         * @param {KeyboardEvent} e A KeyboardEvent.
         */
        function onKeyUp(e) {
            clearTimeout(_keyUpTimerID[e.keyCode]);
            var index = _currentlyPressedKeys.indexOf(e.keyCode);
            if (index !== -1) {
                MIL.log("Popping keyCode " + e.keyCode, MIL.FeatureNames.KeyboardHandler);
                _currentlyPressedKeys.splice(index, 1);
            }
        }
        /**
         * Returns true if no key is currently being pressed for the DOM element supplied to Utils.EnableKeyboardHandler().
         * @returns {boolean} Flag indicating if no key is currently being pressed.
         */
        function IsNoKeyPressed() {
            if (!_keyboardHandlerEnabled) {
                throw new MIL.MILException("Utils.EnableKeyboardHandler() must be called prior to using Utils.IsNoKeyPressed()");
            }
            return (_currentlyPressedKeys.length === 0);
        }
        Utils.IsNoKeyPressed = IsNoKeyPressed;
        /**
         * Returns true if the specified key is currently being pressed.
         * @param {string | Keys} key Either be a Utils.Keys value (eg. Keys.CTRL), a Utils.Keys name (eg. "CTRL"), or a literal (eg. "S")
         * @returns {boolean} Whether the specified key is currently being pressed.
         */
        function IsKeyPressed(key) {
            if (!_keyboardHandlerEnabled) {
                throw new MIL.MILException("Utils.EnableKeyboardHandler() must be called prior to using Utils.IsKeyPressed()");
            }
            // 'key' can either be a Utils.Keys value (eg. Keys.CTRL), a Utils.Keys name (eg. "CTRL"), or a literal (eg. "S")
            // let keyCode = (typeof key === "number") ? key : (Utils.Keys.hasOwnProperty(key) ? Utils.Keys[key] : key.charCodeAt(0));
            var keyCode = (typeof key === "number") ? key : (getEnumValue(Keys, key) || key.charCodeAt(0));
            return (_currentlyPressedKeys.indexOf(keyCode) !== -1);
        }
        Utils.IsKeyPressed = IsKeyPressed;
        /**
         * Returns a string describing all the currently pressed keys.
         * @returns {string} A description of all the currently pressed keys.
         */
        function GetPressedKeyInfo() {
            var keyList = [];
            _currentlyPressedKeys.forEach(function (v, i) {
                var keyCode = v;
                var isKnownKey = false;
                for (var keyID in Keys) {
                    if (getEnumValue(Keys, keyID) === keyCode) {
                        keyList.push(keyID);
                        isKnownKey = true;
                        break;
                    }
                }
                if (!isKnownKey) {
                    keyList.push("'" + String.fromCharCode(keyCode % 128) + "'");
                }
                keyList[keyList.length - 1] += " (" + keyCode + ")";
            });
            return ("Count = " + _currentlyPressedKeys.length + ": " + keyList.join(", "));
        }
        Utils.GetPressedKeyInfo = GetPressedKeyInfo;
        /**
         * Converts the specified 'stringValue' to a number, or throws if the conversion to a number is not possible.
         * This is useful for converting CSS dimension values (like "200px") to their numeric equivalents.
         * @param {string} stringValue The string to attempt to convert to a number.
         * @returns {number} Result.
         */
        function ToNumber(stringValue) {
            var numberValue = +stringValue.replace(/[^0-9\.]/g, "");
            if (isNaN(numberValue)) {
                throw new MIL.MILException("Unabled to convert '" + stringValue + "' to a number");
            }
            return (numberValue);
        }
        Utils.ToNumber = ToNumber;
        /**
         * Searches through the document's CSS stylesheets and returns the value of 'propertyName' in the first rule that matches 'cssSelector'.
         * Returns null if no match is found. Note: The matching of cssSelector is a simple 'contains'.
         * @param {string} cssSelector The CSS selector (eg. ".MyClass") of the rule to look for.
         * @param {string} propertyName The name of the style property (eg. "stroke-width") to look for in the found rule.
         * @returns {string | null} Property value, or null if not found.
         */
        function GetCssProperty(cssSelector, propertyName) {
            // Search backwards through the stylesheets because the last match is more likely the right one
            for (var s = document.styleSheets.length - 1; s >= 0; s--) {
                if (document.styleSheets[s].type === "text/css") {
                    var cssRules = document.styleSheets[s].cssRules;
                    for (var i = 0; i < cssRules.length; i++) {
                        if (cssRules[i].type === CSSRule.STYLE_RULE) {
                            var cssStyleRule = cssRules[i];
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
        Utils.GetCssProperty = GetCssProperty;
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
        function Fade(d3Selection, durationInMs, className, onFadeComplete, isFadeIn, beginOpacity, endOpacity) {
            if (isFadeIn === void 0) { isFadeIn = false; }
            if (className) {
                d3Selection.classed(className, true);
            }
            var startOpacity = ((beginOpacity !== undefined) ? beginOpacity.toString() : null) || d3Selection.style("opacity") || (isFadeIn ? "0" : "1");
            if (endOpacity === undefined) {
                endOpacity = isFadeIn ? 1 : 0;
            }
            d3Selection
                .transition()
                .duration(durationInMs)
                .on("end", function () { if (onFadeComplete)
                onFadeComplete(); })
                .styleTween("opacity", function () { return d3.interpolate(startOpacity, endOpacity.toString()); });
        }
        Utils.Fade = Fade;
        /**
         * [Private Method] Returns true if the specified DOM element is visible.
         * @param { DomElement } domElement The DOM element to check.
         * @returns {boolean} Result.
         */
        function isElementVisible(domElement) {
            var style = window.getComputedStyle(domElement);
            var isVisible = (style.visibility === "visible") && (style.display !== "none");
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
        function isPointInPolygon(vertX, vertY, nVert, targetX, targetY) {
            var isTargetInside = false;
            if ((vertX.length !== vertY.length) || (nVert !== vertX.length)) {
                throw new MIL.MILException("vertX/vertY/nVert lengths don't all match");
            }
            for (var i = 0, j = nVert - 1; i < nVert; j = i++) {
                if (((vertY[i] > targetY) !== (vertY[j] > targetY)) &&
                    (targetX < (vertX[j] - vertX[i]) * (targetY - vertY[i]) / (vertY[j] - vertY[i]) + vertX[i])) {
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
        function IsPointInPolygon(polygonPoints, targetX, targetY) {
            // If needed, convert polygonPoints from [{x,y}] to [[x, y]] (often it is better that the caller do this for improved performance)
            var xyPolygonPoints = ConvertPointsToXYPoints(polygonPoints);
            var nVert = xyPolygonPoints.length;
            var vertX = d3.range(nVert).map(function (i) { return xyPolygonPoints[i][0]; });
            var vertY = d3.range(nVert).map(function (i) { return xyPolygonPoints[i][1]; });
            var isTargetInside = isPointInPolygon(vertX, vertY, nVert, targetX, targetY);
            return (isTargetInside);
        }
        Utils.IsPointInPolygon = IsPointInPolygon;
        /**
         * Returns true if any of the pointsToTest are inside the specified polygon.
         * @param {PolygonPoints} polygonPoints The verticies of the polygon.
         * @param {PolygonPoints} pointsToTest The points to test for inclusion.
         * @returns {boolean} Result.
         */
        function IsAnyPointInPolygon(polygonPoints, pointsToTest) {
            // If needed, convert inputs from [{x,y}] to [[x, y]] (often it is better that the caller do this for improved performance)
            var xyPolygonPoints = Utils.ConvertPointsToXYPoints(polygonPoints);
            var xyPointsToTest = Utils.ConvertPointsToXYPoints(pointsToTest);
            var nVert = xyPolygonPoints.length;
            var vertX = d3.range(nVert).map(function (i) { return xyPolygonPoints[i][0]; });
            var vertY = d3.range(nVert).map(function (i) { return xyPolygonPoints[i][1]; });
            for (var p = 0; p < pointsToTest.length; p++) {
                var targetX = xyPointsToTest[p][0];
                var targetY = xyPointsToTest[p][1];
                var isTargetInside = isPointInPolygon(vertX, vertY, nVert, targetX, targetY);
                if (isTargetInside) {
                    return (true);
                }
            }
            return (false);
        }
        Utils.IsAnyPointInPolygon = IsAnyPointInPolygon;
        /**
         * If needed, converts the supplied 'points' from [{x,y}] to [[x, y]].
         * @param {PolygonPoints} points The verticies of the polygon, in either [{x,y}] or [[x, y]] format (if in the latter format then this method is a no-op).
         * @returns {XY[]} The supplied 'points' in [[x, y]] format.
         */
        function ConvertPointsToXYPoints(points) {
            // Local 'Type Guard' function
            var isArrayOfPoint = function (o) { return (o[0].x !== undefined) && (o[0].y !== undefined); };
            if ((points.length > 0) && isArrayOfPoint(points)) {
                var xyArray = d3.range(points.length).map(function (i) { return ([points[i].x, points[i].y]); });
                return (xyArray);
            }
            else {
                return points;
            }
        }
        Utils.ConvertPointsToXYPoints = ConvertPointsToXYPoints;
        /**
         * If needed, converts the supplied 'points' from [[x, y]] to [{x,y}].
         * @param {PolygonPoints} points The verticies of the polygon, in either [[x, y]] of [{x,y}] format (if in the latter format then this method is a no-op).
         * @returns {Point[]} The supplied 'points' in [{x,y}] format.
         */
        function ConvertXYPointsToPoints(points) {
            // Local 'Type Guard' function
            var isArrayOfXY = function (o) { return (o[0] instanceof Array) && (o[0].length === 2); };
            if ((points.length > 0) && isArrayOfXY(points)) {
                var pointArray = d3.range(points.length).map(function (i) { return ({ x: points[i][0], y: points[i][1] }); });
                return (pointArray);
            }
            else {
                return points;
            }
        }
        Utils.ConvertXYPointsToPoints = ConvertXYPointsToPoints;
        /**
         * Returns the number of 'targetPointsToTest' points that are inside 'targetPolygonPoints'.
         * @param {PolygonPoints} targetPolygonPoints The verticies of the polygon.
         * @param {PolygonPoints} targetPointsToTest The points to test.
         * @returns {number} Result.
         */
        function CountPointsInPolygon(targetPolygonPoints, targetPointsToTest) {
            // If needed, convert inputs from [{x,y}] to [[x, y]] (often it is better that the caller do this for improved performance)
            var polygonPoints = ConvertPointsToXYPoints(targetPolygonPoints);
            var pointsToTest = ConvertPointsToXYPoints(targetPointsToTest);
            var nVert = polygonPoints.length;
            var vertX = d3.range(nVert).map(function (i) { return polygonPoints[i][0]; });
            var vertY = d3.range(nVert).map(function (i) { return polygonPoints[i][1]; });
            var pointCount = 0;
            for (var p = 0; p < pointsToTest.length; p++) {
                var targetX = pointsToTest[p][0];
                var targetY = pointsToTest[p][1];
                var isTargetInside = isPointInPolygon(vertX, vertY, nVert, targetX, targetY);
                if (isTargetInside) {
                    pointCount++;
                }
            }
            return (pointCount);
        }
        Utils.CountPointsInPolygon = CountPointsInPolygon;
        /**
         * Returns a best-guess (true/false) of whether the supplied path (and corresponding [[x,y]] points) is classified as a straight line.
         * @param {XY[]} polygonPoints The verticies in the SVGPathElement in 'path'.
         * @return {boolean} Result.
         */
        function IsStraightLine(polygonPoints) {
            var isLine = false;
            var convexHullVertices = d3.polygonHull(polygonPoints); // Returned points are in counter-clockwise order [which d3.polygonArea (see below) needs to return a positive value]
            if (convexHullVertices) {
                var lineLength = 0;
                for (var i = 1; i < polygonPoints.length; i++) {
                    var prevPoint = { x: polygonPoints[i - 1][0], y: polygonPoints[i - 1][1] };
                    var currPoint = { x: polygonPoints[i][0], y: polygonPoints[i][1] };
                    lineLength += Utils.GetDistanceBetweenPoints(prevPoint, currPoint);
                }
                var area = d3.polygonArea(convexHullVertices);
                var firstPoint = { x: polygonPoints[0][0], y: polygonPoints[0][1] };
                var lastPoint = { x: polygonPoints[polygonPoints.length - 1][0], y: polygonPoints[polygonPoints.length - 1][1] };
                var distance = GetDistanceBetweenPoints(firstPoint, lastPoint);
                var areaRatio = lineLength / area;
                var distanceRatio = distance / lineLength;
                // This determines if the line is straight(ish), but it's not infallible 
                // (in particular, lines that double-back to end close to where they start will fail this test)
                isLine = ((areaRatio > 0.1) && (distanceRatio > 0.5)) || (distanceRatio >= 0.95); // Guesstimated thresholds
                // log("DEBUG: " + (isLine ? "" : "Not ") + "Line (" + areaRatio.toFixed(2) + ", " + distanceRatio.toFixed(2) + ")", FeatureNames.Debug);
            }
            return (isLine);
        }
        Utils.IsStraightLine = IsStraightLine;
        /**
         * Returns the length of the line described by the supplied set of Points.
         * @param {Point[]} pathPoints A set of Points.
         * @returns {number} Result.
         */
        function ComputeTotalLength(pathPoints) {
            var totalLength = 0;
            for (var i = 0; i < pathPoints.length - 1; i++) {
                totalLength += Utils.GetDistanceBetweenPoints(pathPoints[i], pathPoints[i + 1]);
            }
            return (totalLength);
        }
        Utils.ComputeTotalLength = ComputeTotalLength;
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
        function FindShapeElementsInRegion(targetGElement, shapeNodeType, region, filter, percentageInside) {
            var regionPoints = (region instanceof MIL.Ink) ? region.PathPoints() : region;
            var foundElements = [];
            var foundInks = [];
            var boundingPoints = d3.range(regionPoints.length).map(function (d) { return ([regionPoints[d].x, regionPoints[d].y]); });
            var gDomElement = GetDomElement(targetGElement, SVGGElement);
            // Note: Local function
            function isMatch(targetPoints, defaultPercentageInside, domElementOrInk) {
                if (targetPoints.length > 0) {
                    if (percentageInside === undefined) {
                        percentageInside = defaultPercentageInside;
                    }
                    // Count how many element-points are inside the region (bounding) path
                    var containedPointCount = CountPointsInPolygon(boundingPoints, targetPoints);
                    // Were more than percentageInside of them inside?
                    // Note: We use '>' (not '>=') to allow the caller to specify 0 for percentageInside rather than having to specify
                    //       some tiny value (eg. 0.0001) when they just want to check if ANY point of a path is inside the region
                    var containedPointPercentage = containedPointCount / targetPoints.length;
                    if ((containedPointPercentage === 1) || (containedPointPercentage > percentageInside)) {
                        // Does the element (or Ink) pass the supplied filter (if supplied)?
                        if (!filter || (filter && filter(domElementOrInk))) {
                            return (true);
                        }
                    }
                }
                return (false);
            }
            if (shapeNodeType === ShapeNodeType.Ink) {
                var inks = MIL.Inks();
                for (var i = 0; i < inks.length; i++) {
                    var targetPoints = ConvertPointsToXYPoints(inks[i].PathPoints());
                    if (isMatch(targetPoints, 0.8, inks[i])) {
                        foundInks.push(inks[i]);
                    }
                }
                return (foundInks);
            }
            else {
                d3.select(gDomElement).selectAll(shapeNodeType).each(function (d) {
                    var domElement = this; // Note: When using .each(), 'this' is set to the DOM element associated with 'd'
                    if (isElementVisible(domElement) && !MIL.Controls.IsControl(domElement)) {
                        var defaultPercentageInside = 1; // 1 = 100%
                        var targetPoints = [];
                        switch (shapeNodeType) {
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
                                var rawPoints = domElement.getAttribute("points").split(" ");
                                for (var i = 0; i < rawPoints.length; i++) {
                                    var coords = rawPoints[i].split(",");
                                    targetPoints.push([+coords[0], +coords[1]]);
                                }
                                defaultPercentageInside = 0.8; // 80%
                                break;
                            case ShapeNodeType.Path:
                                // Add either all the points of an Ink, or a sampling of points from a non-Ink path
                                var ink = MIL.GetInkByElement(domElement);
                                var pathPoints = ink ? ink.PathPoints() : SamplePointsFromPath(domElement); // Note: Don't use 'let' here: it will result in the variable being renamed during compilation which means it won't surface correctly in the debugger
                                targetPoints = d3.range(pathPoints.length).map(function (d) { return ([pathPoints[d].x, pathPoints[d].y]); });
                                defaultPercentageInside = 0.8; // 80%
                                break;
                            default:
                                throw new MIL.MILException("shapeNodeType '" + shapeNodeType + "' is not currrently supported");
                        }
                        if (isMatch(targetPoints, defaultPercentageInside, domElement)) {
                            foundElements.push(domElement);
                        }
                    }
                });
                return (foundElements);
            }
        }
        Utils.FindShapeElementsInRegion = FindShapeElementsInRegion;
        /**
         * Returns the center point (in svg space) of the supplied DOM element.
         * @param {DomElement} targetDomElement The DOM element to find the centroid of.
         * @returns {Point} Result.
         */
        function GetCentroidPoint(targetDomElement) {
            var boundingRect = targetDomElement.getBoundingClientRect(); // In screen coordinates
            var centroidPoint = { x: boundingRect.left + (boundingRect.width / 2), y: boundingRect.top + (boundingRect.height / 2) };
            var transposedCentroidPoint = MIL.TransposeScreenPoint(centroidPoint, targetDomElement);
            return (transposedCentroidPoint);
        }
        Utils.GetCentroidPoint = GetCentroidPoint;
        /**
         * Returns an array of {x, y} points in the order [TL, TR, BR, BL].
         * @param {ClientRect | Rect} rect The rectangle to extract points from.
         * @returns { Point[] } Result.
         */
        function GetPointsFromRect(rect) {
            var points = [];
            // Local 'Type Guard' function
            var isClientRect = function (o) {
                var obj = o;
                return ((typeof o === "object") && obj.hasOwnProperty("left") && obj.hasOwnProperty("right") && obj.hasOwnProperty("top") && obj.hasOwnProperty("bottom"));
            };
            if (isClientRect(rect)) {
                points.push({ x: rect.left, y: rect.top });
                points.push({ x: rect.right, y: rect.top });
                points.push({ x: rect.right, y: rect.bottom });
                points.push({ x: rect.left, y: rect.bottom });
            }
            else {
                points.push({ x: rect.x, y: rect.y });
                points.push({ x: rect.x + rect.width, y: rect.y });
                points.push({ x: rect.x + rect.width, y: rect.y + rect.height });
                points.push({ x: rect.x, y: rect.y + rect.height });
            }
            return (points);
        }
        Utils.GetPointsFromRect = GetPointsFromRect;
        /**
         * Returns a Rect from the two supplied points.
         * @param {Point} point1 First point.
         * @param {Point} point2 Second point.
         * @returns {Rect} Result.
         */
        function GetRectFromPoints(point1, point2) {
            var x = Math.min(point1.x, point2.x), y = Math.min(point1.y, point2.y); // x/y specifies the top-left corner
            var width = Math.abs(point1.x - point2.x), height = Math.abs(point1.y - point2.y);
            return ({ x: x, y: y, width: width, height: height });
        }
        Utils.GetRectFromPoints = GetRectFromPoints;
        /**
         * Returns a set of SVGPoints sampled from the specified Path.
         * @param {SVGPathElement} pathDomElement The Path element to sample from.
         * @param {boolean} [showPoints] [Optional] Whether or not to display black dots representing the sampled points.
         * @param {number} [distanceInPxBetweenSamples] [Optional The number of pixels (along the Path) between samples.
         * @returns {SVGPoint[]} Result.
         */
        function SamplePointsFromPath(pathDomElement, showPoints, distanceInPxBetweenSamples) {
            if (showPoints === void 0) { showPoints = false; }
            if (distanceInPxBetweenSamples === void 0) { distanceInPxBetweenSamples = 5; }
            var svgInfo = MIL.getSvgInfo(pathDomElement);
            var pathLength = pathDomElement.getTotalLength();
            var maxSampleCount = Math.min(500, Math.max(10, pathLength / distanceInPxBetweenSamples));
            var stepSize = pathLength / maxSampleCount;
            var svgPoints = []; // [SVGPoint]
            for (var l = 0; l < pathLength; l += stepSize) {
                var svgPoint = pathDomElement.getPointAtLength(l);
                svgPoints.push(svgPoint);
            }
            // The SVGPoint returned by getPointAtLength() is in SVG coordinate space, so it already takes the translate/scale transform
            // (see zoomAtPoint()) of gDomElement into account (because pathDomElement has gDomElement as an ancestor), but it does not 
            // account for the transform of pathDomElement itself. Consequently we have to use GetTransformedPoints() to address this.
            svgPoints = GetTransformedPoints(pathDomElement, svgPoints);
            // DEBUG: Show the vertices
            if (Boolean(showPoints) === true) {
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
        Utils.SamplePointsFromPath = SamplePointsFromPath;
        /**
         * Returns the elementSvgPoints array modified for the transform (if any) of domElement, and for the transform (if any) of its host SVGGElement.
         * @param {SVGGraphicsElement} domElement An SVG shape element (path, rect, etc.) that has [or at least can be] transformed.
         * @param {SVGPoint} elementSvgPoints An array of SVGPoint's (in absolute coordinates) from domElement.
         * @returns {SVGPoint[]} Result.
         */
        function GetTransformedPoints(domElement, elementSvgPoints) {
            var svgInfo = MIL.getSvgInfo(domElement);
            var elementMatrix = domElement.getCTM();
            var gMatrixInverse = svgInfo.gDomElement.getCTM().inverse();
            var transformedPoints = [];
            for (var i = 0; i < elementSvgPoints.length; i++) {
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
        Utils.GetTransformedPoints = GetTransformedPoints;
        /**
         * Returns the closest point to targetPoint on the line described by lineStartPoint/lineEndPoint.
         * @param {Point} targetPoint The point to find the closet point to on the line.
         * @param {Point} lineStartPoint The start of the line.
         * @param {Point} lineEndPoint The end of the line.
         * @returns {Point} Result.
         */
        function GetClosestPointOnLine(targetPoint, lineStartPoint, lineEndPoint) {
            // See https://stackoverflow.com/questions/3120357/get-closest-point-to-a-line
            var P = targetPoint, A = lineStartPoint, B = lineEndPoint;
            var vectorAP = [(P.x - A.x), (P.y - A.y)];
            var vectorAB = [(B.x - A.x), (B.y - A.y)];
            var magnitudeVectorABSquared = Math.pow(vectorAB[0], 2) + Math.pow(vectorAB[1], 2);
            var dotProductOfVectors = (vectorAP[0] * vectorAB[0]) + (vectorAP[1] * vectorAB[1]);
            var normalizedDistanceAlongLineAB = dotProductOfVectors / magnitudeVectorABSquared; // 0..1
            if (normalizedDistanceAlongLineAB < 0) {
                return (A);
            }
            if (normalizedDistanceAlongLineAB > 1) {
                return (B);
            }
            return ({
                x: A.x + (vectorAB[0] * normalizedDistanceAlongLineAB),
                y: A.y + (vectorAB[1] * normalizedDistanceAlongLineAB)
            });
        }
        Utils.GetClosestPointOnLine = GetClosestPointOnLine;
        /**
         * Returns the distance (in pixels) between two PointerEvents.
         * @param {PointerEvent} e1 First event.
         * @param {PointerEvent} e2 Second event.
         * @returns {number} Result.
         */
        function GetDistanceBetweenEvents(e1, e2) {
            // Note: e.clientX/Y are relative to [the top-left (0,0)] of the document window
            var distance = Math.sqrt(Math.pow((e1.clientX - e2.clientX), 2) + Math.pow((e1.clientY - e2.clientY), 2));
            return (distance);
        }
        Utils.GetDistanceBetweenEvents = GetDistanceBetweenEvents;
        /**
         * Returns the distance (in pixels) between two Points.
         * @param {Point} point1 First point.
         * @param {Point} point2 Second point.
         * @returns {number} Result.
         */
        function GetDistanceBetweenPoints(point1, point2) {
            var distance = Math.sqrt(Math.pow((point1.x - point2.x), 2) + Math.pow((point1.y - point2.y), 2));
            return (distance);
        }
        Utils.GetDistanceBetweenPoints = GetDistanceBetweenPoints;
        /**
         * Returns a Rect that bounds all the Points in 'pathPoints'.
         * @param {Points[]} pathPoints The set of Points to find the bounding Rect for.
         * @returns {Rect} Result.
         */
        function GetBoundingRectForPoints(pathPoints) {
            var top = Number.MAX_VALUE;
            var left = Number.MAX_VALUE;
            var maxX = Number.MIN_VALUE;
            var maxY = Number.MIN_VALUE;
            for (var i = 0; i < pathPoints.length; i++) {
                top = Math.min(pathPoints[i].y, top);
                left = Math.min(pathPoints[i].x, left);
                maxY = Math.max(pathPoints[i].y, maxY);
                maxX = Math.max(pathPoints[i].x, maxX);
            }
            var height = maxY - top;
            var width = maxX - left;
            return ({ x: left, y: top, height: height, width: width });
        }
        Utils.GetBoundingRectForPoints = GetBoundingRectForPoints;
        /**
         * Returns the heading (>= 0, < 360) of 'endPoint' relative to 'startPoint'.
         * @param {Point} startPoint The starting Point.
         * @param {Point} endPoint The ending Point
         * @returns {number} Result.
         */
        function GetHeadingFromPoints(startPoint, endPoint) {
            var opposite = endPoint.y - startPoint.y;
            var adjacent = endPoint.x - startPoint.x;
            var hypotenuse = Math.sqrt(Math.pow(opposite, 2) + Math.pow(adjacent, 2));
            var sine = opposite / hypotenuse;
            var angleInRadians = Math.asin(sine);
            var angleInDegrees = angleInRadians * (180 / Math.PI);
            var heading = 0; // A value from 0 to 359.999
            if (endPoint.x > startPoint.x) {
                heading = 90 + angleInDegrees;
            }
            if (endPoint.x < startPoint.x) {
                heading = 270 - angleInDegrees;
            }
            if (endPoint.x === startPoint.x) {
                heading = (endPoint.y > startPoint.y) ? 180 : 0;
            }
            // let straightLineDistanceMoved: number = hypotenuse;
            return (heading);
        }
        Utils.GetHeadingFromPoints = GetHeadingFromPoints;
        /**
         * Returns a heading value determined by the value of 'numRadialSegments'.
         * When either 4 or 8 it will return a compase heading (eg. "NE" or "W"). When any other value it returns a 0..numRadialSegments - 1 segment ID.
         * See also: GetRadialSegmentID().
         * @param {number} heading A value in the range 0..359.999.
         * @param {number} [numRadialSegments] [Optional] The number of segment to quantize 'heading' into.
         * @returns {string | number} Result.
         */
        function GetCompassHeading(heading, numRadialSegments) {
            if (numRadialSegments === void 0) { numRadialSegments = 8; }
            var compassHeadings = (numRadialSegments === 8) ? ["N", "NE", "E", "SE", "S", "SW", "W", "NW"] : ((numRadialSegments === 4) ? ["N", "E", "S", "W"] : d3.range(numRadialSegments).map(function (d) { return (d); }));
            var halfSegmentAngle = (360 / compassHeadings.length) / 2;
            var compassHeading = d3.scaleQuantile().domain([-halfSegmentAngle, 360 - halfSegmentAngle]).range(compassHeadings);
            var adjustedHeading = (heading < (360 - halfSegmentAngle)) ? heading : -(360 - heading);
            return (compassHeading(adjustedHeading));
        }
        Utils.GetCompassHeading = GetCompassHeading;
        /**
         * Returns a segment ID (0..numRadialSegments - 1) for the specified heading.
         * @param {number} heading A value in the range 0..359.999.
         * @param {number} numRadialSegments The number of segment to quantize 'heading' into.
         * @returns {number} Result.
         */
        function GetRadialSegmentID(heading, numRadialSegments) {
            var halfSegmentAngle = (360 / numRadialSegments) / 2;
            var segmentIDs = d3.range(numRadialSegments).map(function (d) { return (d); });
            var headingToSegmentID = d3.scaleQuantile().domain([-halfSegmentAngle, 360 - halfSegmentAngle]).range(segmentIDs);
            var adjustedHeading = (heading < (360 - halfSegmentAngle)) ? heading : -(360 - heading);
            return (headingToSegmentID(adjustedHeading));
        }
        Utils.GetRadialSegmentID = GetRadialSegmentID;
        /**
         * Returns a Point on the circumference of a circle (with the specified radius and origin) at 'angleInDegrees' offset from the 12 o'clock position.
         * @param {number} angleInDegrees A value in the range 0..359.999 (0 is the 12 o'clock position).
         * @param {number} radius The radius of the circle.
         * @param {Point} originPoint The center of the circle.
         * @returns {Point} Result.
         */
        function GetPointOnCircle(angleInDegrees, radius, originPoint) {
            // Without this adjustment, an angleInDegrees of 0 is the 3 o'clock position (E), so we subtract 90 degrees to orient it to 12 o'clock (N)
            angleInDegrees -= 90;
            var angleInRadians = angleInDegrees * (Math.PI / 180);
            var x = (radius * Math.cos(angleInRadians)) + originPoint.x;
            var y = (radius * Math.sin(angleInRadians)) + originPoint.y;
            return ({ x: x, y: y });
        }
        Utils.GetPointOnCircle = GetPointOnCircle;
        /**
         * Returns a Points array (of length 'numPoints') taken at equal intervals along the circumference of a circle (with the specified radius and origin).
         * @param {number} numPoints The number of Points to include.
         * @param {number} radius The radius of the circle.
         * @param {Point} originPoint The center of the circle.
         * @returns {Point[]} Result.
         */
        function GetPointsOnCircle(numPoints, radius, originPoint) {
            var points = [];
            var angleStepSizeInDegrees = 360 / numPoints;
            for (var angleInDegrees = 0; angleInDegrees < 360; angleInDegrees += angleStepSizeInDegrees) {
                var point = GetPointOnCircle(angleInDegrees, radius, originPoint);
                points.push(point);
            }
            return (points);
        }
        Utils.GetPointsOnCircle = GetPointsOnCircle;
        /**
         * Returns the 'pathData' string (that describes an SVG path) scaled by the specified 'scale' ratio.
         * @param {string} pathData The path data to scale (eg. "M 0 0 L 100 0 L 100 100 Z"). Note: 'pathData' must have a 0,0 origin and can only contain M, L, Z, m, l, a or z commands.
         * @param {number} scale The ratio to scale by (eg. 1.2).
         * @returns {string} Result.
         */
        function ScalePathData(pathData, scale) {
            var values = pathData.split(" ");
            var scaledData = "";
            var lastCommand = "";
            for (var i = 0; i < values.length; i++) {
                var command = values[i];
                // Allow for shorthand versions [eg. "M 1,2 3,4" == "M 1,2 L 3,4" and "M 1,2 L 3,4 5,6" == "M 1,2 L 3,4 L 5,6"]
                if (!isNaN(+command) && ((lastCommand === "M") || (lastCommand === "L") || (lastCommand === "m") || (lastCommand === "l"))) {
                    var isUpperCaseCommand = (command.toUpperCase() === command);
                    command = isUpperCaseCommand ? "L" : "l";
                    i--;
                }
                if (isNaN(+command)) {
                    if (command.length !== 1) {
                        throw new MIL.MILException("Unexpected value ('" + command + "') in pathData '" + pathData + "'");
                    }
                    scaledData += command + " ";
                    switch (command) {
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
                            var x = +values[i + 1] * scale;
                            var y = +values[i + 2] * scale;
                            scaledData += x + " " + y + " ";
                            i += 2;
                            break;
                        case "Z":
                        case "z":
                            // No-op
                            break;
                        default:
                            throw new MIL.MILException("Unsupported command '" + command + "' in pathData: supported path commands are: M, L, Z, m, a, z");
                    }
                    lastCommand = command;
                }
                else {
                    throw new MIL.MILException("Unexpected path data token '" + values[i] + "'");
                }
            }
            return (scaledData.trim());
        }
        Utils.ScalePathData = ScalePathData;
        /**
         * Translates (shifts and scales) the 'pathData' string (that describes an SVG path). Returns the translated path data.
         * @param {string} pathData The path data to scale (eg. "M 0 0 L 100 0 L 100 100 Z"). Note: 'pathData' must have a 0,0 origin and can only contain M, L, Z, m, l, a or z commands.
         * @param {number} deltaX The x-offset to translate by
         * @param {number} deltaY The y-offset to translate by.
         * @param {number} scaleFactor The amount to scale by. Values in the range 0..1 will scale the path up, values greater than 1 will scale the path down.
         * @returns {string} Result.
         */
        function TranslatePathData(pathData, deltaX, deltaY, scaleFactor) {
            var values = pathData.split(" ");
            var translatedData = "";
            var lastCommand = "";
            for (var i = 0; i < values.length; i++) {
                var command = values[i];
                // Allow for shorthand versions [eg. "M 1,2 3,4" == "M 1,2 L 3,4" and "M 1,2 L 3,4 5,6" == "M 1,2 L 3,4 L 5,6"]
                if (!isNaN(+command) && ((lastCommand === "M") || (lastCommand === "L") || (lastCommand === "m") || (lastCommand === "l"))) {
                    var isUpperCaseCommand = (command.toUpperCase() === command);
                    command = isUpperCaseCommand ? "L" : "l";
                    i--;
                }
                if (isNaN(+command)) {
                    if (command.length !== 1) {
                        throw new MIL.MILException("Unexpected value ('" + command + "') in pathData '" + pathData + "'");
                    }
                    translatedData += command + " ";
                    switch (command) {
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
                            var translatedX = (+values[i + 1] / scaleFactor) + deltaX;
                            var translatedY = (+values[i + 2] / scaleFactor) + deltaY;
                            translatedData += translatedX + " " + translatedY + " ";
                            i += 2;
                            break;
                        case "Z":
                        case "z":
                            // No-op
                            break;
                        default:
                            throw new MIL.MILException("Unsupported command '" + command + "' in pathData: supported path commands are M, L, Z, m, a, z");
                    }
                    lastCommand = command;
                }
                else {
                    throw new MIL.MILException("Unexpected path data token '" + values[i] + "'");
                }
            }
            return (translatedData.trim());
        }
        Utils.TranslatePathData = TranslatePathData;
        /**
         * Generates the path data (string) for a circle of the specified origin and radius.
         * For example, GetCirclePathData(100, 100, 75) produces the same visual result as <circle cx="100" cy="100" r="75"/>.
         * @param {number} centerX The x-axis value of the origin point.
         * @param {number} centerY The y-axis value of the origin point.
         * @param {number} radius The radius of the circle.
         * @returns {string} Result.
         */
        function GetCirclePathData(centerX, centerY, radius) {
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
        Utils.GetCirclePathData = GetCirclePathData;
        /**
         * Returns the 4 SVG points that define the currently viewable (ie. on-screen) area, within the total panable area.
         * @param {SVGGElement} gDomElement The SVG 'g' element to inspect.
         * @param {number} [insetMargin] [Optional] The number of pixels (on all sides) to reduce the viewable area by.
         * @returns {Point[]} Result.
         */
        function ViewableSvgAreaPoints(gDomElement, insetMargin) {
            if (insetMargin === void 0) { insetMargin = 0; }
            var svgInfo = MIL.getSvgInfo(gDomElement);
            var viewRect = svgInfo.svgDomElement.getBoundingClientRect(); // In screen coordinates
            var viewRectInset = {
                x: viewRect.left + insetMargin,
                y: viewRect.top + insetMargin,
                width: viewRect.width - (insetMargin * 2),
                height: viewRect.height - (insetMargin * 2)
            };
            var screenPoints = GetPointsFromRect(viewRectInset);
            var svgPoints = [];
            for (var i = 0; i < screenPoints.length; i++) {
                svgPoints.push(MIL.TransposeScreenPoint(screenPoints[i], gDomElement));
            }
            return (svgPoints);
        }
        Utils.ViewableSvgAreaPoints = ViewableSvgAreaPoints;
        /**
         * Returns true if the angle beween headings is less than the specified range.
         * @param {number} heading1 The first heading (0..359.999).
         * @param {number} heading2 The second heading (0..359.999).
         * @param {number} range The maximum delta between the two headings for them to be considered aligned.
         * @returns {boolean} Result.
         */
        function AreHeadingsAligned(heading1, heading2, range) {
            if (range === void 0) { range = 30; }
            var headingDelta = Math.abs(heading1 - heading2);
            if (headingDelta > 270) {
                if (heading1 < range) {
                    heading1 += 360;
                }
                if (heading2 < range) {
                    heading2 += 360;
                }
                headingDelta = Math.abs(heading1 - heading2);
            }
            return (headingDelta < range);
        }
        Utils.AreHeadingsAligned = AreHeadingsAligned;
        /**
         * Returns the point at the middle of the line described by 'point1' and 'point2'.
         * @param {Point} point1 One end of the line.
         * @param {Point} point2 The other end of the line.
         * @returns {Point} Result.
         */
        function GetLineMidPoint(point1, point2) {
            var maxX = Math.max(point1.x, point2.x);
            var minX = Math.min(point1.x, point2.x);
            var maxY = Math.max(point1.y, point2.y);
            var minY = Math.min(point1.y, point2.y);
            return ({ x: minX + ((maxX - minX) / 2), y: minY + ((maxY - minY) / 2) });
        }
        Utils.GetLineMidPoint = GetLineMidPoint;
        /**
         * Creates (and returns) a d3 selection of an SVG path object [on 'gDomElement'] as described by the supplied 'points'. The path will be drawn in red using a line of 'strokeWidth' thickness.
         * @param {SVGGElement} gDomElement The SVG 'g' element to add the debug path to.
         * @param {Point[]} points The point that describe the debug path to add.
         * @param {number} strokeWidth The thickness (in px) of the line the debug path will be drawn with.
         * @returns {D3SingleSelection} Result.
         */
        function DebugDrawPoints(gDomElement, points, strokeWidth) {
            var d = "M " + points[0].x + " " + points[0].y; // This handles the case where points contains a single point
            for (var i = 0; i < points.length; i++) {
                d += " L " + points[i].x + " " + points[i].y;
            }
            var path = d3.select(gDomElement).append("path").attr("d", d);
            path.node().style.stroke = "red";
            path.node().style.strokeWidth = strokeWidth + "px";
            return (path);
        }
        Utils.DebugDrawPoints = DebugDrawPoints;
    })(Utils = MIL.Utils || (MIL.Utils = {}));
})(MIL || (MIL = {}));
var MIL;
(function (MIL) {
    // PORT: This class was formerly named 'settings'
    /** The MILSettings class */
    var MILSettings = /** @class */ (function () {
        function MILSettings() {
            this._minZoomLevel = 1;
            this._maxZoomLevel = 1;
            this._isRightMouseClickAllowed = true;
            this._inkAutoCombineMode = MIL.InkAutoCombineMode.Off;
            this._hoverTimeoutInMs = -1; // Disabled
        }
        MILSettings.prototype.MinZoomLevel = function (level) {
            if (level === undefined) {
                return (this._minZoomLevel);
            }
            else {
                if ((level <= 0) || (level > 1)) {
                    throw new MIL.MILException("MinZoomLevel (" + this._minZoomLevel + ") must be greater than 0 but no larger than 1");
                }
                this._minZoomLevel = level;
                return (this);
            }
        };
        MILSettings.prototype.MaxZoomLevel = function (level) {
            if (level === undefined) {
                return (this._maxZoomLevel);
            }
            else {
                if (level < 1) {
                    throw new MIL.MILException("MaxZoomLevel (" + this._maxZoomLevel + ") must be at least 1");
                }
                this._maxZoomLevel = level;
                return (this);
            }
        };
        MILSettings.prototype.IsRightMouseClickAllowed = function (allow) {
            var _this = this;
            return (MIL.getOrSetProperty(this, MIL.nameof(function () { return _this._isRightMouseClickAllowed; }), allow));
        };
        MILSettings.prototype.InkAutoCombineMode = function (mode) {
            var _this = this;
            return (MIL.getOrSetProperty(this, MIL.nameof(function () { return _this._inkAutoCombineMode; }), mode));
        };
        MILSettings.prototype.HoverTimeoutInMs = function (timeout) {
            if (timeout === undefined) {
                return (this._hoverTimeoutInMs);
            }
            else {
                if (timeout < 0) // This is how to specify that hover is disabled [hover adds considerable eventing overhead]
                 {
                    timeout = -1;
                    // Remove all hover state tracking
                    MIL.ResetHoverStateTracking();
                }
                this._hoverTimeoutInMs = timeout;
                return (this);
            }
        };
        return MILSettings;
    }());
    MIL.MILSettings = MILSettings;
})(MIL || (MIL = {}));
var MIL;
(function (MIL) {
    // PORT: This is essentially a static class: is there a better way to write this code?
    /**
     * The GestureDefaults namespace.
     * Setting GestureDefault properties saves having to re-specify the corresponding Gesture properties [repetitively] each time CreateGesture() is called.
     */
    var GestureDefaults;
    (function (GestureDefaults) {
        var _defaults = {
            targetDomElement: null,
            startedHandler: null,
            endedHandler: null,
            cancelledHandler: null,
            groupName: "default",
            recognitionTimeoutInMs: 0,
            _parentObj: GestureDefaults
        };
        /**
         * Resets all defaults. Returns the GestureDefaults namespace.
         * @returns {GestureDefaultsType} The GestureDefaults namespace.
         */
        function Reset() {
            _defaults.targetDomElement = null;
            _defaults.startedHandler = null;
            _defaults.endedHandler = null;
            _defaults.cancelledHandler = null;
            _defaults.groupName = "default";
            _defaults.recognitionTimeoutInMs = 0;
            _defaults._parentObj = this;
            return (this);
        }
        GestureDefaults.Reset = Reset;
        function Target(targetDomElement) {
            if (targetDomElement === undefined) {
                return (_defaults.targetDomElement);
            }
            else {
                var domElement = MIL.Utils.GetDomElement(targetDomElement);
                if (!document.body.contains(domElement)) {
                    throw new MIL.MILException("The specified targetDomElement does not exist in the document body");
                }
                MIL.tagWithTargetElementID(domElement);
                _defaults.targetDomElement = domElement;
                return (this);
            }
        }
        GestureDefaults.Target = Target;
        function StartedHandler(handler) {
            return (MIL.getOrSetProperty(_defaults, MIL.nameof(function () { return _defaults.startedHandler; }), handler));
        }
        GestureDefaults.StartedHandler = StartedHandler;
        function EndedHandler(handler) {
            return (MIL.getOrSetProperty(_defaults, MIL.nameof(function () { return _defaults.endedHandler; }), handler));
        }
        GestureDefaults.EndedHandler = EndedHandler;
        function CancelledHandler(handler) {
            return (MIL.getOrSetProperty(_defaults, MIL.nameof(function () { return _defaults.cancelledHandler; }), handler));
        }
        GestureDefaults.CancelledHandler = CancelledHandler;
        function RecognitionTimeoutInMs(timeoutInMs) {
            return (MIL.getOrSetProperty(_defaults, MIL.nameof(function () { return _defaults.recognitionTimeoutInMs; }), timeoutInMs));
        }
        GestureDefaults.RecognitionTimeoutInMs = RecognitionTimeoutInMs;
        function GroupName(name) {
            return (MIL.getOrSetProperty(_defaults, MIL.nameof(function () { return _defaults.groupName; }), name));
        }
        GestureDefaults.GroupName = GroupName;
    })(GestureDefaults = MIL.GestureDefaults || (MIL.GestureDefaults = {}));
})(MIL || (MIL = {}));
var MIL;
(function (MIL) {
    var _nextInkID = 1; // Used to assign ID's to Ink objects
    /**
     * [Internal] While being drawn, an Ink consists of a series of [slightly] overlapping paths; the path that is actively being drawn is the 'current' path.
     * @internal
     */
    MIL._inkCurrentPathPointData = {}; // Key: PointerID, Value: Array of points in current path
    var _inkCurrentPath = {}; // Key: PointerID, Value: Current path element
    /**
     * [Internal] All the points in the Ink (in all paths) as it is being drawn.
     * @internal
     */
    MIL._inkCompletePathPointData = {}; // Key: PointerID, Value: Cumulative array of unique points in all paths
    var _inkLineGenerator = null; // d3 line generator
    /** The Ink class. */
    var Ink = /** @class */ (function () {
        function Ink(pointerID) {
            this._inkID = "Ink" + _nextInkID++;
            this._pointerID = pointerID;
            this._isStarted = false;
            this._parentGesture = null;
            this._className = "";
            this._strokeColor = "";
            this._strokeWidth = "";
            this._eraserClassName = "";
            this._hullType = MIL.InkHullType.None;
            this._hullColor = "transparent";
            this._isNonDrawing = null;
            this._cometTailClassName = "";
            this._cometTailDurationInMs = 500;
            this._isAutoCose = false;
            this._hullPath = null;
            this._finalPath = null;
            this._nonDrawingPathPoints = null;
            this._combinedOutlinePathPoints = null;
            this._isEraserDrawing = false;
            this._isCoercingInkToRuler = false;
            this._resizeGesturePointerType = "";
            this._resizeGesture = null;
            this._onResizeCompleteHandler = null;
            this._scale = 1;
            this._onDragMoveHandler = null;
            this._previousDragMovePoint = null;
            this._groupDragSelectionClassName = null;
            this._dragGesture = null;
        }
        /**
         * [ReadOnly Property] The unique, system-supplied name of the Ink instance.
         * @returns {string} Property value.
        */
        Ink.prototype.InkID = function () {
            MIL.readOnlyProperty("InkID", arguments);
            return (this._inkID);
        };
        /**
         * [ReadOnly Property] The unique MIL PointerID that is currently being used to draw the Ink instance (will be null after the Ink is drawn).
         * @returns {string} Property value.
         */
        Ink.prototype.PointerID = function () {
            MIL.readOnlyProperty("PointerID", arguments);
            return (this._pointerID);
        };
        Ink.prototype.ParentGesture = function (gesture) {
            var _this = this;
            return (MIL.getOrSetProperty(this, MIL.nameof(function () { return _this._parentGesture; }), gesture));
        };
        Ink.prototype.Class = function (className) {
            var _this = this;
            return (MIL.getOrSetProperty(this, MIL.nameof(function () { return _this._className; }), className));
        };
        Ink.prototype.StrokeColor = function (color) {
            var _this = this;
            return (MIL.getOrSetProperty(this, MIL.nameof(function () { return _this._strokeColor; }), color));
        };
        Ink.prototype.StrokeWidth = function (width) {
            var _this = this;
            return (MIL.getOrSetProperty(this, MIL.nameof(function () { return _this._strokeWidth; }), width));
        };
        Ink.prototype.EraserClass = function (className) {
            var _this = this;
            return (MIL.getOrSetProperty(this, MIL.nameof(function () { return _this._eraserClassName; }), className));
        };
        Ink.prototype.CometTailClass = function (className) {
            var _this = this;
            return (MIL.getOrSetProperty(this, MIL.nameof(function () { return _this._cometTailClassName; }), className));
        };
        Ink.prototype.CometTailDurationInMs = function (durationInMs) {
            var _this = this;
            return (MIL.getOrSetProperty(this, MIL.nameof(function () { return _this._cometTailDurationInMs; }), durationInMs));
        };
        Ink.prototype.HullType = function (hullType) {
            if (hullType === undefined) {
                return (this._hullType);
            }
            else {
                if (this._hullPath !== null) {
                    // TODO: This is just for simplicity, but technically it could be changed
                    // Note: The hullType can be changed (one-way) from Concave to Convex as a side-effect of using Gesture.CombineInks()
                    throw new MIL.MILException("Ink.HullType cannot be changed after the Ink has been created");
                }
                this._hullType = hullType;
                return (this);
            }
        };
        Ink.prototype.HullColor = function (color) {
            var _this = this;
            return (MIL.getOrSetProperty(this, MIL.nameof(function () { return _this._hullColor; }), (color === "debug") ? "rgba(0,128,0,0.2)" : color));
        };
        Ink.prototype.IsNonDrawing = function (isNonDrawing) {
            if (isNonDrawing === undefined) {
                return ((this._isNonDrawing === null) ? false : this._isNonDrawing);
            }
            else {
                if (this._isNonDrawing !== null) {
                    throw new MIL.MILException("Ink.IsNonDrawing cannot be changed once set");
                }
                if (isNonDrawing && (this._hullType !== MIL.InkHullType.None)) {
                    throw new MIL.MILException("Ink.IsNonDrawing can only be set when Ink.HullType is 'None'");
                }
                this._isNonDrawing = isNonDrawing;
                return (this);
            }
        };
        Ink.prototype.IsAutoClose = function (isAutoClose) {
            if (isAutoClose === undefined) {
                return (this._isAutoCose);
            }
            else {
                if (this.Path() !== null) {
                    throw new MIL.MILException("Ink.IsAutoClose cannot be changed after the Ink has been created");
                }
                this._isAutoCose = isAutoClose;
                return (this);
            }
        };
        Ink.prototype.ResizeWith = function (pointerType) {
            if (pointerType === undefined) {
                return (this._resizeGesturePointerType);
            }
            else {
                if (this._resizeGesture !== null) {
                    MIL.RemoveGestureByName(this._resizeGesture.Name());
                    this._resizeGesture = null;
                }
                if (pointerType && this._hullPath) {
                    var ink = this; // Note: Don't use 'let' here: it will result in the variable being renamed during compilation which means it won't surface correctly in the debugger
                    var startInkScale; // Note: Don't use 'let' here: it will result in the variable being renamed during compilation which means it won't surface correctly in the debugger
                    var startInkStrokeWidth = MIL.Utils.ToNumber(window.getComputedStyle(ink.Path().node()).strokeWidth); // Note: Don't use 'let' here: it will result in the variable being renamed during compilation which means it won't surface correctly in the debugger
                    this._resizeGesture = MIL.CreateGesture("InkResize*", true).PointerType(pointerType).Target(this._hullPath)
                        .RecognitionTimeoutInMs(50) // TODO: The caller should have control over this timeout
                        .GestureStartedHandler(function () {
                        var gesture = this;
                        // To prevent the ink resize gesture from happening in parallel with an ink drag - which
                        // could potentially cause undesirable interactions - we terminate an in-progress drag
                        if (ink._dragGesture !== null) {
                            ink._dragGesture.Cancel("The Ink is being resized");
                            ink.DragEnd();
                        }
                        startInkScale = ink.Scale();
                        var startResizeDistance = gesture.GetDistance("{P1}", "{P2}");
                        var prevResizeDistance = startResizeDistance;
                        this.OnMoveHandler(function () {
                            var resizeDistance = this.GetDistance("{P1}", "{P2}");
                            if (resizeDistance !== prevResizeDistance) {
                                // For performance, we'll resize the hull (if any) only when the gesture ends
                                ink.Scale((resizeDistance / startResizeDistance) * startInkScale, startInkScale, startInkStrokeWidth, true);
                                prevResizeDistance = resizeDistance;
                            }
                        });
                    })
                        .GestureEndedHandler(function () {
                        ink.Scale(ink.Scale(), startInkScale, startInkStrokeWidth, false);
                        if (ink.OnResizeCompleteHandler() !== null) {
                            ink.OnResizeCompleteHandler().call(ink);
                        }
                    });
                    if (this._resizeGesture.PointerCount() !== 2) {
                        throw new MIL.MILException("The pointerType supplied to Ink.ResizeWith() must specify exactly 2 pointers (eg. 'touch:2' or 'pen+touch')");
                    }
                    MIL.AddGesture(this._resizeGesture);
                }
                this._resizeGesturePointerType = pointerType;
                return (this);
            }
        };
        Ink.prototype.OnResizeCompleteHandler = function (handler) {
            var _this = this;
            return (MIL.getOrSetProperty(this, MIL.nameof(function () { return _this._onResizeCompleteHandler; }), handler));
        };
        /**
         * [ReadOnly Property] Whether the Ink instance was drawn with the pen eraser tip.
         * Note: This is automatically set to true when the 'pointerType' of the Ink is 'pen', and the eraser-tip of the pen is used to draw with.
         * @returns {boolean} Property value.
         */
        Ink.prototype.IsEraserDrawing = function () {
            MIL.readOnlyProperty("IsEraserDrawing", arguments);
            return (this._isEraserDrawing);
        };
        /**
         * [ReadOnly Property] Whether the Ink instance is the result of combining one-or-more Inks.
         * @returns {boolean} Property value.
         */
        Ink.prototype.IsCombined = function () {
            MIL.readOnlyProperty("IsCombined", arguments);
            return (this._combinedOutlinePathPoints !== null);
        };
        /**
         * [ReadOnly Property] The hull path (as a d3 selection) of the Ink instance. Will be null if the Ink was created with HullType(InkHullType.None).
         * @returns {D3SingleSelection} Property value.
         */
        Ink.prototype.HullPath = function () {
            MIL.readOnlyProperty("HullPath", arguments);
            return (this._hullPath);
        };
        /**
         * [ReadOnly Property] The path (as a d3 selection) of the Ink instance. Will be null if the Ink was created with IsNonDrawing(true).
         * @returns {D3SingleSelection} Property value.
         */
        Ink.prototype.Path = function () {
            MIL.readOnlyProperty("Path", arguments);
            return (this._finalPath);
        };
        /**
         * [ReadOnly Property] The {x, y} points in the Ink instance.
         * @returns {Point[]} Property value.
         */
        Ink.prototype.PathPoints = function () {
            MIL.readOnlyProperty("PathPoints", arguments);
            if (this._isNonDrawing) {
                return (this._nonDrawingPathPoints);
            }
            else {
                var path = this._finalPath.node();
                var pathPointsCollection = path.__MILPathPointsCollection__;
                var pathLineCount = pathPointsCollection.length;
                if (this._combinedOutlinePathPoints) {
                    // Return the points of the convex hull that covers the original set of ink paths that were combined (via Gesture.CombineInks()).
                    // While a loss in fidelity, this is arguably consistent with the nature of what it means to combine ink paths.
                    // The alternative would be to return __MILPathPointsCollection__, but the caller is expecting Ink.PathPoints() to return a single array
                    // of points, not an array of array of points.
                    // Note: It's valid for __MILPathPointsCollection__ to only have one entry, yet also have _combinedOutlinePathPoints set: this can
                    //       legitimately happen if a single ink path is "combined", eg. to change the hull-type of the ink from concave to convex. 
                    return (this._combinedOutlinePathPoints);
                }
                else {
                    if (pathLineCount !== 1) {
                        throw new MIL.MILException("Internal state error: __MILPathPointsCollection__ was expected to contain 1 entry, but is has " + pathLineCount + " entries.");
                    }
                    return (pathPointsCollection[0]); // The {x, y} points of the final (consolidated) SVG path
                }
            }
        };
        /** Deletes the Ink's Hull. */
        Ink.prototype.DeleteHull = function () {
            if (this.HullPath()) {
                MIL.RemoveGesturesByTarget(this.HullPath()); // Note: Gestures on Ink usually target the hull-path
                this.HullPath().remove();
                this._hullPath = null;
            }
        };
        /** Cancels the Ink instance (while it's in the process of being created). */
        Ink.prototype.Cancel = function () {
            if (this._finalPath !== null) {
                MIL.log("Warning: Ink cannot be cancelled after it has been created");
                return;
            }
            var pointerID = this._pointerID;
            var svgInfo = MIL.getSvgInfo(this.ParentGesture().Target());
            // Remove the multiple [overlapping] constituent paths
            var constituentPaths = svgInfo.gSelection.selectAll("[data-pointerID=" + pointerID + "]");
            constituentPaths.remove();
            this._finalPath = null;
            this._pointerID = null;
            this._nonDrawingPathPoints = null;
            this._isStarted = false;
            this.deleteInksEntry();
            delete MIL._inkCompletePathPointData[pointerID];
            delete MIL._inkCurrentPathPointData[pointerID];
            delete _inkCurrentPath[pointerID];
        };
        /** Deletes the Ink instance. */
        Ink.prototype.Delete = function () {
            this.DeleteHull();
            MIL.RemoveGesturesByTarget(this.Path()); // Note: Gestures on Ink rarely target the ink-path (they typically target the hull-path)
            this.Path().remove();
            this.deleteInksEntry();
            MIL.log("Ink created by gesture '" + this.ParentGesture().Name() + "' was deleted (" + MIL._inks.length + " Inks remain)");
        };
        /** [Private Method] Removes the Ink instance from the list of all Inks (_inks). */
        Ink.prototype.deleteInksEntry = function () {
            // TODO: Ink shouldn't really have any knowledge of _inks
            var index = MIL._inks.indexOf(this);
            if (index !== -1) {
                MIL._inks.splice(index, 1);
            }
            // ParentGesture.Ink() is the LATEST Ink created by the Gesture (Gesture:Ink is 1:m)
            if (this.ParentGesture().Ink() === this) {
                this.ParentGesture().ink(null);
            }
        };
        Ink.prototype.Scale = function (scale, startScale, startStrokeWidth, excludeHull) {
            if ((scale === undefined) && (startScale === undefined) && (startStrokeWidth === undefined) && (excludeHull === undefined)) {
                return (this._scale);
            }
            else {
                var oldScale = excludeHull ? this._scale : startScale;
                var newScale = scale;
                this.scaleInkPath(this.Path(), oldScale, newScale, startStrokeWidth, excludeHull);
                if (this.HullPath()) {
                    // Hide the hull while we're scaling
                    this.HullPath().style("visibility", excludeHull ? "hidden" : "visible");
                    if (!excludeHull) {
                        var scaleDelta = (scale - startScale) / startScale;
                        this.scaleHullPath(this.HullPath(), scaleDelta);
                    }
                }
                this._scale = scale;
                // log("DEBUG: Ink scaled to " + this._scale.toFixed(2) + "x", FeatureNames.Debug);
                return (this);
            }
        };
        /**
         * [Internal] If the Ink is being dragged, returns the latest position of the pointer doing the dragging. Otherwise, returns null.
         * @returns {Point | null} Result.
         * @internal
         */
        Ink.prototype.previousDragMovePoint = function () {
            return (this._previousDragMovePoint);
        };
        /** [Private Method] Applies the current Class/StrokeColor/StrokeWidth to either the final "consolidated" path (if available), or the current constituent path of an in-flight inking. */
        Ink.prototype.applyStyle = function () {
            var pathSelection = (this._finalPath !== null) ? this._finalPath : _inkCurrentPath[this._pointerID];
            if (this._isEraserDrawing) {
                if (this._eraserClassName) {
                    pathSelection.attr("class", this._eraserClassName);
                }
                else {
                    // Apply defaults if no EraserClass was provided
                    pathSelection.node().style.stroke = "white";
                    pathSelection.node().style.strokeWidth = "20px";
                }
                pathSelection.node().__MILIsEraser__ = true; // To make it easy to detect eraser paths
            }
            else {
                // Apply Class/StrokeColor/StrokeWidth (if any)
                if (this._isNonDrawing && this._cometTailClassName) {
                    pathSelection.attr("class", this._cometTailClassName);
                }
                else {
                    pathSelection.attr("class", this._className);
                    pathSelection.node().style.stroke = !this._className ? this._strokeColor : "";
                    pathSelection.node().style.strokeWidth = !this._className ? this._strokeWidth : "";
                    // Apply defaults if no Class and no StrokeColor/StrokeWidth are provided
                    if (!this.Class()) {
                        if (!this.StrokeColor()) {
                            pathSelection.node().style.stroke = "black";
                        }
                        if (!this.StrokeWidth()) {
                            pathSelection.node().style.strokeWidth = "4px";
                        }
                    }
                }
            }
        };
        Ink.prototype.OnDragMoveHandler = function (handler) {
            var _this = this;
            return (MIL.getOrSetProperty(this, MIL.nameof(function () { return _this._onDragMoveHandler; }), handler));
        };
        /**
         * [Private Method] Returns true if the specified PointerEvent was generated from the pen eraser.
         * @param {PointerEvent} e A PointerEvent.
         * @return {boolean} Result.
         */
        Ink.prototype.isEraser = function (e) {
            // Check if the [pen] eraser button is currently pressed, or if 'e' is the [pointer-up] event when the [pen] eraser button stopped being pressed
            // (ie. the eraser button was the source of the [pen] button state-transition [to not-pressed]) [see http://www.w3.org/TR/pointerevents2/]
            var isEraser = (e.pointerType === "pen") && (((e.buttons & MIL.PenButton.Eraser) === MIL.PenButton.Eraser) || (e.button === 5));
            return (isEraser);
        };
        /**
         * Starts the Ink instance.
         * @returns {Ink} The Ink instance.
         */
        Ink.prototype.Start = function () {
            // Prevent starting more than once
            if (this._isStarted) {
                MIL.log("Warning: An Ink cannot be started more than once");
                return (this);
            }
            var e = MIL.getPointerDownEvent(this._pointerID, this.ParentGesture().Target());
            var isEraser = this.isEraser(e);
            var ruler = MIL.getSvgInfo(e.target).ruler;
            this._isEraserDrawing = !this.IsNonDrawing() && isEraser;
            if (!this._isNonDrawing && this._cometTailClassName) {
                throw new MIL.MILException("Ink.CometTailClass() can only be set when IsNonDrawing() is true");
            }
            // Determine if the Ink should be coerced to the Ruler (if available and visible)
            if (!this.IsNonDrawing() && ruler && ruler.IsVisible()) {
                var line = ruler.GetFaceEdgeLine();
                var inkStartPoint = this.ParentGesture().GetStartSvgPoint("{P1}");
                var pointOnLine = MIL.Utils.GetClosestPointOnLine(inkStartPoint, line[0], line[1]);
                var distanceToRuler = MIL.Utils.GetDistanceBetweenPoints(inkStartPoint, pointOnLine);
                this._isCoercingInkToRuler = (distanceToRuler < (ruler.Height() * 0.25));
            }
            else {
                this._isCoercingInkToRuler = false;
            }
            // Start a new line (path)
            this.startNewLine(e);
            // There's no need to track a non-drawing Ink because it doesn't add a Path element
            if (!this.IsNonDrawing()) {
                MIL._inks.push(this); // Note: Must be explicitly removed via Ink.Delete() or Ink.Cancel()
            }
            this._isStarted = true;
            return (this);
        };
        /**
         * [Private Method] Starts drawing a new line (path) using the specified pointerDown event. The line will be drawn on the corresponding svgInfo.gDomElement.
         * @param {PointerEvent} e A pointerDown event.
         */
        Ink.prototype.startNewLine = function (e) {
            var pointerID = MIL.makePointerID(e);
            var svgInfo = MIL.getSvgInfo(e.target);
            var isCometTail = this._isNonDrawing && Boolean(this._cometTailClassName);
            var isDrawing = !this._isNonDrawing || isCometTail;
            if (isDrawing) {
                if (_inkLineGenerator === null) {
                    _inkLineGenerator = d3.line()
                        .curve(d3.curveBasis) // See http://bl.ocks.org/mbostock/4342190
                        .x(function (d) { return (d.x); })
                        .y(function (d) { return (d.y); });
                }
                _inkCurrentPath[pointerID] = svgInfo.gSelection.append("path").attr("data-pointerID", pointerID); // "tag" the path with the pointerID that drew it
                this.applyStyle();
                if (isCometTail) {
                    // Start a fade-out of the new (current) path
                    var currentPath = _inkCurrentPath[pointerID]; // Note: Don't use 'let' here: it will result in the variable being renamed during compilation which means it won't surface correctly in the debugger
                    MIL.Utils.Fade(currentPath, this._cometTailDurationInMs, null, function onFadeComplete() { if (currentPath)
                        currentPath.remove(); });
                }
            }
            // Is this line brand new?
            if (MIL._inkCompletePathPointData[pointerID].length === 0) {
                if (MIL._postponedPointerEvents.length > 0) {
                    // Add the pending _postponedPointerEvents to the path
                    for (var i = 0; i < MIL._postponedPointerEvents.length; i++) {
                        if (this._pointerID === MIL.makePointerID(MIL._postponedPointerEvents[i])) {
                            this.OnPointerMove(MIL._postponedPointerEvents[i]);
                        }
                    }
                }
                else {
                    // Add the initial pointerDown point to the path
                    this.OnPointerMove(e);
                }
            }
        };
        /**
         * [Internal] Handler for a pointerMove event. Typically this is called by the Ink's owning Gesture (or by the Ink itself).
         * @param {PointerEvent} e A pointerMove event.
         */
        Ink.prototype.OnPointerMove = function (e) {
            var pointerID = MIL.makePointerID(e);
            var svgInfo = MIL.getSvgInfo(e.target);
            // Since the main 'g' element can be transformed (ie. zoomed and/or panned), we need to transform the e.clientX/Y point into the coordinate space of the [potentially transformed] 'g' element
            var pointInTransformSpace = MIL.TransposePointer(e, svgInfo.gDomElement);
            var x = pointInTransformSpace.x, y = pointInTransformSpace.y;
            var newPoint = { x: x, y: y };
            if (this._isCoercingInkToRuler) {
                // Was the ruler hidden while we were drawing?
                if (!svgInfo.ruler.IsVisible()) {
                    this.OnPointerUp(e);
                    return;
                }
                var line = svgInfo.ruler.GetFaceEdgeLine();
                var pointOnLine = MIL.Utils.GetClosestPointOnLine(newPoint, line[0], line[1]);
                var distanceToRuler = MIL.Utils.GetDistanceBetweenPoints(newPoint, pointOnLine);
                // Has the pointer moved too far away from the ruler?
                if (distanceToRuler > (svgInfo.ruler.Height() * 0.25)) {
                    this.OnPointerUp(e);
                    return;
                }
                newPoint = { x: pointOnLine.x, y: pointOnLine.y };
            }
            var maxPathSegments = this._isNonDrawing ? 8 : 100; // The non-drawing case is for a comet-tail
            var overlappingPathSegments = this._isNonDrawing ? 7 : 2; // The non-drawing case is for a comet-tail
            var pathPointData = MIL._inkCurrentPathPointData[pointerID];
            var completePathPointData = MIL._inkCompletePathPointData[pointerID];
            var isCometTail = this._isNonDrawing && Boolean(this._cometTailClassName);
            var isDrawing = !this._isNonDrawing || isCometTail;
            if (pathPointData === undefined) {
                // A movement of the touch/mouse/pen has been detected, but before we got a 'pointerDown' for it [which is a valid condition]
                return;
            }
            // To prevent a slow-down in rendering speed when pathPointData gets large [or to draw the comet-tail], we periodically spawn a new path
            if (isDrawing && (pathPointData.length === maxPathSegments)) {
                pathPointData.length = 0;
                // Smooth the "join" between the old and new path [by adding the last overlappingPathSegments from the complete path-point list to the new "component" path]
                if ((overlappingPathSegments > 0) && (overlappingPathSegments <= completePathPointData.length)) {
                    var tailPoints = completePathPointData.slice(-overlappingPathSegments);
                    Array.prototype.push.apply(pathPointData, tailPoints);
                }
                this.startNewLine(e);
            }
            // Append new data point [but only if it's "different" from the last point (to help smooth the line and to cut down on the number of points stored)]
            var isPointDifferentThanLast = true;
            if (completePathPointData.length > 0) {
                var lastPoint = completePathPointData[completePathPointData.length - 1];
                var distanceThreshold = 3;
                isPointDifferentThanLast = (Math.abs(lastPoint.x - newPoint.x) >= distanceThreshold) || (Math.abs(lastPoint.y - newPoint.y) >= distanceThreshold);
            }
            if (isPointDifferentThanLast) {
                completePathPointData.push(newPoint);
                if (isDrawing) {
                    // Redraw the path
                    pathPointData.push(newPoint);
                    _inkCurrentPath[pointerID].attr("d", _inkLineGenerator(pathPointData));
                }
            }
        };
        /**
         * [Internal] Handler for a pointerUp event. Typically this is called by the Ink's owning Gesture (or by the Ink itself).
         * @param {PointerEvent} e A pointerUp event.
         */
        Ink.prototype.OnPointerUp = function (e) {
            var pointerID = MIL.makePointerID(e);
            var svgInfo = MIL.getSvgInfo(e.target);
            if (this._isNonDrawing) {
                this._nonDrawingPathPoints = MIL._inkCompletePathPointData[pointerID];
            }
            else {
                if (MIL._inkCompletePathPointData[pointerID] !== undefined) {
                    // Handle a simple mouse click [in which case onPointerMove() will not have fired]
                    if ((e.pointerType === "mouse") && (MIL._inkCompletePathPointData[pointerID].length === 0)) {
                        // Since the main 'g' element can be transformed (ie. zoomed and/or panned), we need to transform the e.clientX/Y point into the coordinate space of the [potentially transformed] 'g' element
                        var pointInTransformSpace = MIL.TransposePointer(e, svgInfo.gDomElement);
                        MIL._inkCompletePathPointData[pointerID].push({ x: pointInTransformSpace.x, y: pointInTransformSpace.y });
                    }
                    this.consolidatePaths(e);
                }
                // We store the path-points on the Path DOM element directly because this makes it easier to subsequently access them.
                // Even though we only have a single array of points, we store them as an array of array of points in order to support
                // multi-line paths [created via Gesture.CombineInks()].
                this._finalPath.node().__MILPathPointsCollection__ = [MIL._inkCompletePathPointData[pointerID]];
            }
            this._pointerID = null; // To indicate that the inking is complete [and prevent getInkingGesture() from continuing to find gestures whose inking is complete]
            this._isStarted = false;
            delete MIL._inkCompletePathPointData[pointerID];
            delete MIL._inkCurrentPathPointData[pointerID];
            delete _inkCurrentPath[pointerID];
            // Check if we should automatically combine this Ink with one-or-more other Inks that overlap with it in some way
            if (!this._isEraserDrawing && !this._isNonDrawing && !this._isCoercingInkToRuler && (svgInfo.settings.InkAutoCombineMode() !== MIL.InkAutoCombineMode.Off)) {
                var inksToCombine = [this];
                var combinedPathClassName = "";
                var autoCombineMode = svgInfo.settings.InkAutoCombineMode();
                var combinationTargetFound = false;
                var pointsToTest = this.PathPoints();
                for (var i = 0; i < MIL._inks.length; i++) {
                    if (MIL._inks[i] === this) {
                        continue;
                    }
                    var polygonPoints = MIL._inks[i].PathPoints(); // Note: These are actually {x,y} points, not [x,y] points
                    if ((autoCombineMode & MIL.InkAutoCombineMode.ContainedWithin) === MIL.InkAutoCombineMode.ContainedWithin) {
                        var containedPointCount = MIL.Utils.CountPointsInPolygon(polygonPoints, pointsToTest);
                        combinationTargetFound = (containedPointCount === pointsToTest.length);
                    }
                    if (!combinationTargetFound && ((autoCombineMode & MIL.InkAutoCombineMode.StartsWithin) === MIL.InkAutoCombineMode.StartsWithin)) {
                        combinationTargetFound = MIL.Utils.IsPointInPolygon(polygonPoints, pointsToTest[0].x, pointsToTest[0].y);
                    }
                    if (!combinationTargetFound && ((autoCombineMode & MIL.InkAutoCombineMode.EndsWithin) === MIL.InkAutoCombineMode.EndsWithin)) {
                        combinationTargetFound = MIL.Utils.IsPointInPolygon(polygonPoints, pointsToTest[pointsToTest.length - 1].x, pointsToTest[pointsToTest.length - 1].y);
                    }
                    if (!combinationTargetFound && ((autoCombineMode & MIL.InkAutoCombineMode.AnyPointWithin) === MIL.InkAutoCombineMode.AnyPointWithin)) {
                        combinationTargetFound = MIL.Utils.IsAnyPointInPolygon(polygonPoints, pointsToTest);
                    }
                    if (combinationTargetFound) {
                        combinedPathClassName = MIL._inks[i].Class() ? MIL._inks[i].Class() : combinedPathClassName;
                        inksToCombine.push(MIL._inks[i]);
                        combinationTargetFound = false;
                    }
                }
                if (inksToCombine.length > 1) {
                    this.ParentGesture().CombineInks(inksToCombine, combinedPathClassName);
                }
            }
        };
        /**
         * Starts a drag operation for the Ink. When the drag is complete, call Ink.DragEnd().
         * @param {Gesture} dragGesture The Gesture being used to drag the Ink (must target the Ink's Hull).
         * @param {string} [groupDragSelectionClassName] [Optional] The name of a class used to find the set of Inks to drag (ie. a multi-select drag).
         */
        Ink.prototype.DragStart = function (dragGesture, groupDragSelectionClassName) {
            if (dragGesture.Target() !== this.HullPath().node()) {
                throw new MIL.MILException("The specified 'dragGesture' must target the Ink.HullPath()");
            }
            var ink = this;
            var startPoint = dragGesture.GetStartSvgPoint("{P1}"); // TODO: Revisit defaulting to using the {P1} pointer of the drag gesture
            var svgInfo = MIL.getSvgInfo(dragGesture.Target());
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
            if (isDraggedSelection) {
                var g = svgInfo.gSelection;
                selectedPaths = g.selectAll("path.MILInkPath" + (ink._groupDragSelectionClassName ? "." + ink._groupDragSelectionClassName : ""));
                selectedHulls = g.selectAll("path.MILInkHullPath").filter(function () { return (ink.getInkPathAssociatedWithHull(this).classed(ink._groupDragSelectionClassName)); });
            }
            var draggedPathElements = selectedPaths.remove().nodes();
            draggedPathElements.forEach(function (element) { svgInfo.gDomElement.appendChild(element); });
            var draggedHullElements = selectedHulls.remove().nodes();
            draggedHullElements.forEach(function (element) { svgInfo.gDomElement.appendChild(element); });
            // The dragGesture didn't create the Ink whose hull it's targeted on, but since it needs to operate on the
            // Ink.Path() in addition to the Ink.HullPath() [its Target()], we tag the gesture with its "host" Ink
            if ((dragGesture.Ink() !== null) && (dragGesture.Ink() !== this)) {
                throw new MIL.MILException("The specified 'dragGesture' has an unexpected Ink() value");
            }
            dragGesture.ink(this);
            dragGesture.OnMoveHandler(Ink.dragMove); // This handler will be removed automatically when the gesture ends [by removePointer()])
        };
        /**
         * [Private Static Method] A handler for pointerMove events when the Ink is being dragged.
         * Note: The value of 'this' must be explicitly set to the Gesture that is performing the drag [eg. using call()] otherwise the method will throw.
         * @param {PointerEvent} e A pointerMove event.
         */
        Ink.dragMove = function (e) {
            // Note: Gesture.OnMoveHandler() [which is how Ink.dragMove() gets called] will prevent e from bubbling
            // PORT: This check was added (because by default 'this' will be 'typeof Ink' due to it being a static member of the Ink class)
            if (MIL.Utils.GetObjectType(this) !== "Gesture") {
                throw new MIL.MILException("The value of 'this' has not been explicitly set to a Gesture instance");
            }
            var dragGesture = MIL.ThisGesture(this);
            var ink = dragGesture.Ink();
            var pointerID = dragGesture.GetPointerID("{P1}"); // TODO: Revisit defaulting to using the {P1} pointer of the drag gesture
            // We only care about pointer-move events for the {P1} pointer
            if (MIL.makePointerID(e) !== pointerID) {
                return;
            }
            var currentPoint = dragGesture.GetCurrentSvgPoint("{P1}");
            var previousPoint = ink._previousDragMovePoint;
            var svgInfo = MIL.getSvgInfo(dragGesture.Target());
            var deltaX = (currentPoint.x - previousPoint.x);
            var deltaY = (currentPoint.y - previousPoint.y);
            var inkPath = ink.Path();
            ink._previousDragMovePoint = currentPoint;
            if ((deltaX !== 0) || (deltaY !== 0)) {
                if (ink._groupDragSelectionClassName && inkPath.classed(ink._groupDragSelectionClassName)) {
                    var g = svgInfo.gSelection;
                    var selectedPaths = g.selectAll("path.MILInkPath" + (ink._groupDragSelectionClassName ? "." + ink._groupDragSelectionClassName : ""));
                    var selectedHulls = g.selectAll("path.MILInkHullPath").filter(function () { return (ink.getInkPathAssociatedWithHull(this).classed(ink._groupDragSelectionClassName)); });
                    // Move the inkPath(s) (using the "fast" translation method)
                    selectedPaths.each(function (d, i) {
                        var inkPath = d3.select(this);
                        ink.translateInkPath(inkPath, deltaX, deltaY, true);
                    });
                    // Move the inkHull(s)
                    selectedHulls.each(function (d, i) {
                        var inkHullPath = d3.select(this);
                        ink.translateHullPath(inkHullPath, deltaX, deltaY, true);
                    });
                }
                else {
                    // Move the inkPath (using the "fast" translation method)
                    ink.translateInkPath(inkPath, deltaX, deltaY, true);
                    // Move the inkHull
                    ink.translateHullPath(ink.HullPath(), deltaX, deltaY, true);
                }
                // Call the user-supplied drag-move handler (if any) [eg. to move user content associated with the ink/hull]
                if (ink.OnDragMoveHandler() !== null) {
                    ink.OnDragMoveHandler()(deltaX, deltaY); // PORT: Design change idea: should we modify this to a call() so that we can also supply the Ink instance?
                }
            }
        };
        /** Ends the drag operation started by Ink.DragStart(). */
        Ink.prototype.DragEnd = function () {
            if (this._dragGesture === null) {
                return;
            }
            var ink = this;
            var dragGesture = this._dragGesture;
            var currentPoint = dragGesture.GetCurrentSvgPoint("{P1}"); // TODO: Revisit defaulting to using the {P1} pointer of the drag gesture
            var startPoint = dragGesture.GetStartSvgPoint("{P1}");
            var deltaX = (currentPoint.x - startPoint.x);
            var deltaY = (currentPoint.y - startPoint.y);
            var svgInfo = MIL.getSvgInfo(dragGesture.Target());
            var inkPath = this.Path();
            var hullPath = this.HullPath();
            var isDraggedSelection = this._groupDragSelectionClassName && inkPath.classed(this._groupDragSelectionClassName);
            // Do the final "manual" translation of the ink (to update __MILPathPointsCollection__ and clear the transform) and hull
            if (isDraggedSelection) {
                var g = svgInfo.gSelection;
                var selectedPaths = g.selectAll("path.MILInkPath" + (ink._groupDragSelectionClassName ? "." + ink._groupDragSelectionClassName : ""));
                var selectedHulls = g.selectAll("path.MILInkHullPath").filter(function () { return (ink.getInkPathAssociatedWithHull(this).classed(ink._groupDragSelectionClassName)); });
                selectedPaths.each(function (d, i) {
                    var inkPath = d3.select(this);
                    ink.translateInkPath(inkPath, deltaX, deltaY, false);
                });
                selectedHulls.each(function (d, i) {
                    var inkHullPath = d3.select(this);
                    ink.translateHullPath(inkHullPath, deltaX, deltaY, false);
                });
            }
            else {
                this.translateInkPath(inkPath, deltaX, deltaY, false);
                this.translateHullPath(hullPath, deltaX, deltaY, false);
            }
            this._previousDragMovePoint = null;
            this._groupDragSelectionClassName = null;
            this._dragGesture = null;
        };
        /**
         * Returns the convex area of the Ink instance.
         * @returns {number} Result.
         */
        Ink.prototype.GetConvexArea = function () {
            var convexArea = 0;
            if (this._finalPath !== null) {
                var polygonPoints = MIL.Utils.ConvertPointsToXYPoints(this.PathPoints());
                var convexHullVertices = d3.polygonHull(polygonPoints); // Returned points are in counter-clockwise order [which d3.polygonArea (see below) needs to return a positive value]
                if (convexHullVertices) {
                    convexArea = d3.polygonArea(convexHullVertices);
                }
            }
            return (convexArea);
        };
        /**
         * Returns true if the Ink instance is completely within the specified targetInk, false otherwise.
         * Note: returns false if targetInk is the current Ink instance.
         * @param {Ink} targetInk The "bounding" Ink instance.
         * @returns {boolean} Result.
         */
        Ink.prototype.IsInside = function (targetInk) {
            if (targetInk === this) {
                return (false);
            }
            var pointsToTest = this.PathPoints();
            var containedPointCount = MIL.Utils.CountPointsInPolygon(targetInk.PathPoints(), pointsToTest);
            var isInside = (containedPointCount === pointsToTest.length);
            return (isInside);
        };
        /**
         * Using a grid-quantizing scheme, returns an array of {x,y} points (of length numGridPoints) that lie within the Ink instance.
         * An empty array will be returned if no layout grid can be computed.
         * Typically this is used to create locations ("landing sites") to move other items into the Ink region (eg. when the Ink is being used as a container).
         * @param {number} numGridPoints The number of grid points to create.
         * @returns {Point[]} Result.
         */
        Ink.prototype.GetLayoutGridPoints = function (numGridPoints) {
            var boundingRect = MIL.Utils.GetBoundingRectForPoints(this.PathPoints());
            var numCols = Math.ceil(Math.sqrt(numGridPoints)) + 2; // Just a [very] approximate starting value
            var numRows = Math.ceil(numCols * (boundingRect.height / boundingRect.width)); // Just a [very] approximate starting value
            // Step 1: Reduce numRows/numCols so that their product is LESS than numGridPoints
            if (boundingRect.height >= boundingRect.width) {
                while (((numRows * numCols) > numGridPoints) && (numCols > 1)) {
                    numCols--;
                }
                while (((numRows * numCols) > numGridPoints) && (numRows > 1)) {
                    numRows--;
                }
            }
            else {
                while (((numRows * numCols) > numGridPoints) && (numRows > 1)) {
                    numRows--;
                }
                while (((numRows * numCols) > numGridPoints) && (numCols > 1)) {
                    numCols--;
                }
            }
            var gridPoints = [];
            var polygonPoints = MIL.Utils.ConvertPointsToXYPoints(this.PathPoints());
            var retryCount = 0;
            var aborted = false;
            // Step 2: Iteratively create a grid of points using numRows/numCols, increasing both as needed until the grid has MORE [contained] points than numGridPoints
            while ((gridPoints.length < numGridPoints) && !aborted) {
                for (var r = (numRows === 1 ? 0 : 1); r < numRows; r++) {
                    var testPointY = boundingRect.y + ((numRows === 1) ? (boundingRect.height / 2) : (r * (boundingRect.height / numRows)));
                    for (var c = (numCols === 1 ? 0 : 1); c < numCols; c++) {
                        var testPointX = boundingRect.x + ((numCols === 1) ? (boundingRect.width / 2) : (c * (boundingRect.width / numCols)));
                        if (MIL.Utils.IsPointInPolygon(polygonPoints, testPointX, testPointY)) {
                            gridPoints.push({ x: testPointX, y: testPointY });
                        }
                    }
                }
                // Do we need to try again?
                if (gridPoints.length < numGridPoints) {
                    gridPoints.length = 0;
                    numRows += 1;
                    numCols += 1;
                    aborted = (retryCount++ === 5); // It's expensive to retry too many times
                }
            }
            // Step 3: Trim gridPoints to numGridPoints by a) [conservatively] downsampling, then b) trimming the remaining excess gridPoints equally from the start/end
            if (!aborted) {
                var deleteCount = gridPoints.length - numGridPoints;
                if (deleteCount > 0) {
                    var downsamplingStepSize = Math.floor(gridPoints.length / numGridPoints);
                    if (downsamplingStepSize > 1) {
                        var downsampledGridPoints = [];
                        for (var i = 0; i < gridPoints.length; i += downsamplingStepSize) {
                            downsampledGridPoints.push(gridPoints[i]);
                        }
                        gridPoints = downsampledGridPoints;
                        deleteCount = gridPoints.length - numGridPoints;
                    }
                    if (deleteCount > 0) {
                        var deleteFromStart = (deleteCount % 2 === 0) ? deleteCount / 2 : Math.floor(deleteCount / 2);
                        var deleteFromEnd = (deleteCount % 2 === 0) ? deleteCount / 2 : Math.ceil(deleteCount / 2);
                        gridPoints.splice(0, deleteFromStart);
                        gridPoints.splice(gridPoints.length - deleteFromEnd, deleteFromEnd);
                    }
                }
            }
            // DEBUG:
            // let gDomElement: SVGGElement = getSvgInfo(this.Path()).gDomElement;
            // gridPoints.forEach(function (point) { Utils.DebugDrawPoints(gDomElement, [point], 3); });
            return (gridPoints);
        };
        /**
         * Returns true if the Ink instance is [approximately] a straight line.
         * @returns {boolean} Result.
         */
        Ink.prototype.IsStraightLine = function () {
            var polygonPoints = MIL.Utils.ConvertPointsToXYPoints(this.PathPoints());
            var isStraightLine = MIL.Utils.IsStraightLine(polygonPoints);
            return (isStraightLine);
        };
        /**
         * [Private Method] Translates the specified Ink path by the specified x/y delta.
         * @param {D3SingleSelection} inkPath The Ink path to translate (as a D3 Selection of the svg Path element).
         * @param {number} deltaX The number of pixels to translate by on the x-axis.
         * @param {number} deltaY The number of pixels to translate by on the y-axis.
         * @param {boolean} useTransform If true, use a [fast] svg transform to do the translation (but doesn't update __MILPathPointsCollection__).
         *                               If false, uses a [slow] manual redraw to do the translation (and updates __MILPathPointsCollection__).
         */
        Ink.prototype.translateInkPath = function (inkPath, deltaX, deltaY, useTransform) {
            if (useTransform === true) {
                // Note: Updating the transform is MUCH faster than doing a "manual" translation followed by
                //       calling _inkLineGenerator(), but it doesn't update __MILPathPointsCollection__
                this.translateWithTransform(inkPath, deltaX, deltaY);
            }
            else {
                var pathPointsCollection = inkPath.node().__MILPathPointsCollection__;
                var translatedPathPointsCollection = [];
                var d = "";
                var isClosed = (inkPath.attr("d")[inkPath.attr("d").length - 1] === "Z");
                // Undo any existing transform translation [created when useTransform is 'true']
                inkPath.attr("transform", null);
                for (var l = 0; l < pathPointsCollection.length; l++) {
                    var pathData = pathPointsCollection[l];
                    var translatedPathPoints = [];
                    for (var i = 0; i < pathData.length; i++) {
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
        };
        /**
         * [Private Method] Translates the specified Ink Hull path by the specified x/y delta.
         * @param {D3SingleSelection} hullPath The Ink Hull path to translate (as a D3 Selection of the svg Path element).
         * @param {number} deltaX The number of pixels to translate by on the x-axis.
         * @param {number} deltaY The number of pixels to translate by on the y-axis.
         * @param {boolean} useTransform If true, use a [fast] svg transform to do the translation (but doesn't update __MILPathPointsCollection__).
         *                               If false, uses a [slow] manual redraw to do the translation (and updates __MILPathPointsCollection__).
         */
        Ink.prototype.translateHullPath = function (hullPath, deltaX, deltaY, useTransform) {
            if (useTransform === true) {
                // Note: Updating the transform is MUCH faster than doing a "manual" translation of the "d" attribute
                //       but it doesn't update ink._combinedOutlinePathPoints
                this.translateWithTransform(hullPath, deltaX, deltaY);
            }
            else {
                var hullPathDomElement = MIL.Utils.GetDomElement(hullPath, SVGPathElement);
                var values = hullPathDomElement.getAttribute("d").split(" ");
                var hullPathData = "";
                var ink = MIL.GetInkByElement(hullPath);
                var translatedOutlinePathPoints = [];
                // Undo any existing transform translation [created when useTransform is 'true']
                hullPath.attr("transform", null);
                for (var i = 0; i < values.length; i++) {
                    if (isNaN(+values[i])) {
                        if (values[i].length !== 1) {
                            throw new MIL.MILException("Unexpected value ('" + values[i] + "') in 'd'");
                        }
                        // M or L 
                        hullPathData += values[i] + " ";
                    }
                    else {
                        // x y
                        var translatedX = +values[i] + deltaX;
                        var translatedY = +values[++i] + deltaY;
                        hullPathData += translatedX + " " + translatedY + " ";
                        if (ink.IsCombined()) {
                            translatedOutlinePathPoints.push({ x: translatedX, y: translatedY });
                        }
                    }
                }
                hullPathDomElement.setAttribute("d", hullPathData.trim());
                if (ink.IsCombined()) {
                    ink._combinedOutlinePathPoints = translatedOutlinePathPoints;
                }
            }
        };
        // TODO: There may be a better way to do this [eg. https://mikewilliamson.wordpress.com/2013/08/27/matrix-transforms-in-svg/]
        /**
         * [Private Method] Translates [by altering the 'transform' attribute] the specified DOM element by the specified x/y delta.
         * @param {D3SingleSelection} element D3 selection of the DOM element to translate.
         * @param {number} deltaX The number of pixels to translate by on the x-axis.
         * @param {number} deltaY The number of pixels to translate by on the y-axis.
         */
        Ink.prototype.translateWithTransform = function (element, deltaX, deltaY) {
            var transform = element.attr("transform");
            if (transform) {
                var xy = transform.replace("translate(", "").replace(")", "").split(" ");
                if (xy.length > 2) {
                    throw new MIL.MILException("The 'transform' of the element contains more than just a 'translate()'");
                }
                var prevX = +xy[0];
                var prevY = (xy.length === 1) ? 0 : +xy[1];
                deltaX += prevX;
                deltaY += prevY;
            }
            element.attr("transform", "translate(" + deltaX + " " + deltaY + ")");
        };
        /**
         * [Private Method] Returns the Ink path (as a D3 Selection) that's associated with the specified Hull element.
         * @param {DomElement} hullPath The svg path element of an Ink Hull.
         * @returns {D3Selection} Result.
         */
        Ink.prototype.getInkPathAssociatedWithHull = function (hullPath) {
            var pathDomElement = MIL.Utils.GetDomElement(hullPath, SVGPathElement);
            // PORT: Original line:
            // return (pathDomElement !== null ? pathDomElement.__MILAssociatedInkPath__ as D3Selection : null);
            return pathDomElement.__MILAssociatedInkPath__;
        };
        /**
         * [Private Method] When an Ink is complete, creates a single "composite" path to replace the multiple [overlapping] constituent paths.
         * @param {PointerEvent} e The pointerUp event for the Ink (when it ends).
         */
        Ink.prototype.consolidatePaths = function (e) {
            var pointerID = MIL.makePointerID(e);
            var isEraser = this._isEraserDrawing;
            var svgInfo = MIL.getSvgInfo(e.target);
            // Add a single "composite" path to replace the multiple [overlapping] constituent paths
            var path = this._finalPath = svgInfo.gSelection.append("path").attr("d", _inkLineGenerator(MIL._inkCompletePathPointData[pointerID]) + (this._isAutoCose ? "Z" : ""));
            this.applyStyle();
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
            if ((this.HullType() !== MIL.InkHullType.None) && !isEraser) {
                var pathPoints = MIL._inkCompletePathPointData[pointerID];
                var boundingRect = MIL.Utils.GetBoundingRectForPoints(pathPoints);
                var offsetTop = boundingRect.y, offsetLeft = boundingRect.x;
                var height = boundingRect.height;
                var width = boundingRect.width;
                var penWidth = MIL.Utils.ToNumber(path.style("stroke-width"));
                var adj = penWidth / 2;
                var rectLeft = offsetLeft - adj;
                var rectTop = offsetTop - adj;
                var rectWidth = width + penWidth;
                var rectHeight = height + penWidth;
                var hullPath = svgInfo.gSelection.append("path");
                var d = "";
                hullPath.node().__MILAssociatedInkPath__ = path; // "tag" the hull with its corresponding Ink path
                hullPath.classed("MILInkHullPath", true); // Just to make it easier to find the hulls using CSS selector syntax ("path.MILInkHullPath")
                hullPath.style("stroke", this.HullColor());
                hullPath.style("stroke-width", "1px");
                hullPath.style("fill", this.HullColor());
                var polygonPoints = MIL.Utils.ConvertPointsToXYPoints(pathPoints);
                var isStraightLine = MIL.Utils.IsStraightLine(polygonPoints);
                if (this.HullType() === MIL.InkHullType.Concave) {
                    if (isStraightLine) {
                        MIL.log("Ink determined to be a straight-line");
                        for (var i = 0; i < polygonPoints.length; i++) {
                            d += (!d ? "M " : " L ") + polygonPoints[i][0] + " " + polygonPoints[i][1];
                        }
                        hullPath.attr("d", d);
                        hullPath.style("stroke-width", (MIL.Utils.ToNumber(window.getComputedStyle(this._finalPath.node()).strokeWidth) * 7) + "px");
                        hullPath.style("fill", "");
                    }
                    else {
                        for (var i = 0; i < pathPoints.length; i++) {
                            d += (!d ? "M " : " L ") + pathPoints[i].x + " " + pathPoints[i].y;
                        }
                        hullPath.attr("d", d);
                    }
                }
                if (this.HullType() === MIL.InkHullType.Convex) {
                    var hullVertices = d3.polygonHull(polygonPoints);
                    for (var i = 0; i < hullVertices.length; i++) {
                        d += (!d ? "M " : " L ") + hullVertices[i][0] + " " + hullVertices[i][1];
                    }
                    hullPath.attr("d", d);
                }
                this._hullPath = hullPath;
                // Ensure creation of the resize gesture [when the ResizeWith() setter is first called, it's target (Ink.HullPath()) won't yet exist so the gesture won't get created]
                if (this._resizeGesturePointerType) {
                    this.ResizeWith(this._resizeGesturePointerType);
                }
            }
        };
        /**
         * [Private Method] Scales (resizes) the specified Ink path.
         * @param {D3SingleSelection} inkPath The Ink path to scale (as a D3 Selection of the svg Path element).
         * @param {number} oldScale The old (starting) scale of the Ink.
         * @param {number} newScale The new (ending) scale of the Ink.
         * @param {number} startStrokeWidth The starting thickness (in pixels) of the Ink line.
         * @param {boolean} useTransform If true, use a [fast] svg transform to do the scaling (but doesn't update __MILPathPointsCollection__).
         *                               If false, uses a [slow] manual redraw to do the scaling (and updates __MILPathPointsCollection__).
         */
        Ink.prototype.scaleInkPath = function (inkPath, oldScale, newScale, startStrokeWidth, useTransform) {
            if (useTransform) {
                // Note: Updating the transform is faster than doing a "manual" scale followed by
                //       calling _inkLineGenerator(), but it doesn't update __MILPathPointsCollection__
                var pathDomElement = inkPath.node();
                var zoomFocalPoint = MIL.Utils.GetCentroidPoint(pathDomElement);
                var offsetX = zoomFocalPoint.x;
                var offsetY = zoomFocalPoint.y;
                var transformList = pathDomElement.transform.baseVal;
                var matrix = null; // Do NOT use pathDomElement.getCTM() since this will include the pan/zoom transform on the parent 'g' element
                var svg = MIL.getSvgInfo(pathDomElement).svgDomElement;
                var zoomFactor = newScale / oldScale; // Factor representing the relative CHANGE in scale
                if (transformList.numberOfItems === 0) {
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
            else {
                var scaleDelta = (newScale - oldScale) / oldScale;
                var pathPointsCollection = inkPath.node().__MILPathPointsCollection__;
                var scaledPathPointsCollection = [];
                var allPoints = [];
                var d = "";
                var isClosed = (inkPath.attr("d")[inkPath.attr("d").length - 1] === "Z");
                // Undo the existing scale transform [added when useTransform is 'true']
                // [the following will result in inkPath.node().transform.baseVal.numberOfItems becoming 0]
                inkPath.node().setAttribute("transform", ""); // Note: null works on IE11, but not on Chrome
                for (var c = 0; c < pathPointsCollection.length; c++) {
                    allPoints = allPoints.concat(pathPointsCollection[c]);
                }
                var boundingRect = MIL.Utils.GetBoundingRectForPoints(allPoints);
                for (var l = 0; l < pathPointsCollection.length; l++) {
                    var pathData = pathPointsCollection[l];
                    var scaledPathPoints = [];
                    for (var i = 0; i < pathData.length; i++) {
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
        };
        /**
         * [Private Method] Scales (resizes) the specified Ink Hull path (a d3 selection of an svg Path element). Also scales the Hull's line thickness.
         * @param {D3SingleSelection} hullPath The Ink Hull path to scale.
         * @param {number} scaleDelta The ratio to scale by.
         */
        Ink.prototype.scaleHullPath = function (hullPath, scaleDelta) {
            var hullPathDomElement = MIL.Utils.GetDomElement(hullPath, SVGPathElement);
            var values = hullPathDomElement.getAttribute("d").split(" ");
            var hullPathData = "";
            var ink = MIL.GetInkByElement(hullPath);
            var scaledOutlinePathPoints = [];
            var boundingRect = hullPathDomElement.getBBox();
            for (var i = 0; i < values.length; i++) {
                if (isNaN(+values[i])) {
                    if (values[i].length !== 1) {
                        throw new MIL.MILException("Unexpected value ('" + values[i] + "') in 'd'");
                    }
                    // M or L
                    hullPathData += values[i] + " ";
                }
                else {
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
                    hullPathData += scaledX + " " + scaledY + " ";
                    if (ink.IsCombined()) {
                        scaledOutlinePathPoints.push({ x: scaledX, y: scaledY });
                    }
                }
            }
            hullPathDomElement.setAttribute("d", hullPathData.trim());
            // Scale the hull stroke-width (we keep this proportional, unlike the Ink path)
            var strokeWidth = MIL.Utils.ToNumber(hullPath.style("stroke-width"));
            strokeWidth *= (1 + scaleDelta);
            hullPath.style("stroke-width", strokeWidth + "px");
            if (ink.IsCombined()) {
                ink._combinedOutlinePathPoints = scaledOutlinePathPoints;
            }
        };
        /**
         * [Internal] Directly sets the Ink/Hull Paths (eg. when combining Inks).
         * @param {D3SingleSelection} hullPath The new Hull path.
         * @param {D3SingleSelection} inkPath The new Ink path.
         * @param {Point[]} hullPoints The new Hull points (combined outline).
         * @internal
         */
        Ink.prototype.setHullAndPath = function (hullPath, inkPath, hullPoints) {
            this._hullPath = hullPath; // Ink.HullPath() is read-only
            this._finalPath = inkPath; // Ink.FinalPath() is read-only
            this._combinedOutlinePathPoints = hullPoints;
        };
        return Ink;
    }());
    MIL.Ink = Ink;
})(MIL || (MIL = {}));
var MIL;
(function (MIL) {
    // This is only exported because of the eventWatchdog() bug-detector code in MIL.Initialize()
    MIL._activePointerCaptures = {}; // The set of PointerID's being captured to an element - Key: TargetElementID, Value = Array of PointerID
    /** The Gesture class. To create a new Gesture, use MIL.CreateGesture(). */
    var Gesture = /** @class */ (function () {
        function Gesture(name, ignoreGestureDefaults) {
            if (name[name.length - 1] === "*") {
                throw new MIL.MILException("Gesture name '" + name + "' is invalid (cannot end with '*'): consider using MIL.CreateGesture() instead");
            }
            this._name = name;
            this._targetDomElement = ignoreGestureDefaults ? null : MIL.GestureDefaults.Target();
            this._pointerType = null;
            this._pointerTypePermutations = [];
            this._pointerTypeOrdinals = [];
            this._conditional = null;
            this._isExclusive = true;
            this._isEnabled = true;
            this._isCancelled = false;
            this._groupName = ignoreGestureDefaults ? "default" : MIL.GestureDefaults.GroupName();
            this._recognitionTimeoutInMs = ignoreGestureDefaults ? 0 : MIL.GestureDefaults.RecognitionTimeoutInMs();
            this._completionTimeoutInMs = -1;
            this._gestureStartedHandler = ignoreGestureDefaults ? null : MIL.GestureDefaults.StartedHandler();
            this._gestureEndedHandler = ignoreGestureDefaults ? null : MIL.GestureDefaults.EndedHandler();
            this._gestureCancelledHandler = ignoreGestureDefaults ? null : MIL.GestureDefaults.CancelledHandler();
            this._onMoveHandler = null;
            this._activePointerList = [];
            this._activePointerTypeOrdinals = [];
            this._capturesPointers = true;
            this._isCapturing = false;
            this._ink = null;
            this._startedTime = 0;
            this._endedTime = 0;
            this._repeatCount = 0;
            this._repeatTimeoutInMs = 0;
            this._repeatOccurrenceCount = 0;
            this._lastRepeatRecognitionTime = 0;
            this._checkForGesturesOnEnd = false;
            this._allowEventPropagation = true;
            this._completionTimerID = -1;
        }
        Gesture.prototype.Name = function (name) {
            var _this = this;
            return (MIL.getOrSetProperty(this, MIL.nameof(function () { return _this._name; }), name));
        };
        Gesture.prototype.Target = function (element) {
            if (element === undefined) {
                return (this._targetDomElement);
            }
            else {
                var targetDomElement = MIL.Utils.GetDomElement(element);
                if (!document.body.contains(targetDomElement)) {
                    throw new MIL.MILException("The specified DOM element does not exist in the document body");
                }
                MIL.tagWithTargetElementID(targetDomElement);
                this._targetDomElement = targetDomElement;
                return (this);
            }
        };
        Gesture.prototype.PointerType = function (pointerType) {
            if (pointerType === undefined) {
                return (this._pointerType);
            }
            else {
                var validTypes = ["pen", "touch", "mouse", "hover", "any"];
                var pointerTypePermutations = [];
                var pointerTypeOrdinals = []; // [string[]]
                pointerType = pointerType.toLowerCase();
                // Populate pointerTypePermutations [which is necessary to handle or-style pointerType values, eg. "pen|touch+touch" meaning "pen or touch, plus a second touch"].
                pointerTypePermutations = this.permutePointerType(pointerType);
                for (var p = 0; p < pointerTypePermutations.length; p++) {
                    var groups = pointerTypePermutations[p].split("+");
                    pointerTypeOrdinals.push([]);
                    // Populate pointerTypeOrdinals[] (and validate pointerType)
                    // Note that pointerType can be of the form "touch:2+pen" or "touch+touch+pen"
                    for (var g = 0; g < groups.length; g++) {
                        var parts = groups[g].split(":");
                        var type = parts[0];
                        var instanceCount = 1;
                        if (validTypes.indexOf(type) === -1) {
                            throw new MIL.MILException("Invalid pointerType '" + type + "'; valid values (separated by '+') are: " + validTypes.join(", "));
                        }
                        if (parts.length === 1) {
                            for (var i = 0; i < pointerTypeOrdinals[p].length; i++) {
                                if (pointerTypeOrdinals[p][i].indexOf(type) === 0) {
                                    instanceCount++;
                                }
                            }
                            pointerTypeOrdinals[p].push(type + ":" + instanceCount);
                        }
                        else {
                            instanceCount = Number(parts[1]);
                            if (isNaN(instanceCount)) {
                                throw new MIL.MILException("Invalid pointerType '" + groups[g] + "'; should be of the form '" + type + ":{number}'");
                            }
                            if ((instanceCount < 1) || (instanceCount > 10)) {
                                throw new MIL.MILException("Invalid pointerType '" + groups[g] + "'; the instance count must be between 1 and 10");
                            }
                            for (var i = 1; i <= instanceCount; i++) {
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
        };
        /**
         * [ReadOnly Property] The set of all permutations of PointerType.
         * @returns {string[]} Result.
         */
        Gesture.prototype.PointerTypePermutations = function () {
            MIL.readOnlyProperty("PointerTypePermutations", arguments);
            return (this._pointerTypePermutations);
        };
        Gesture.prototype.Conditional = function (callback) {
            var _this = this;
            return (MIL.getOrSetProperty(this, MIL.nameof(function () { return _this._conditional; }), callback));
        };
        Gesture.prototype.IsExclusive = function (exclusive) {
            var _this = this;
            return (MIL.getOrSetProperty(this, MIL.nameof(function () { return _this._isExclusive; }), exclusive));
        };
        Gesture.prototype.IsEnabled = function (enabled) {
            if (enabled === undefined) {
                return (this._isEnabled && MIL.IsGestureGroupEnabled(this._groupName));
            }
            else {
                this._isEnabled = Boolean(enabled);
                return (this);
            }
        };
        Gesture.prototype.GroupName = function (name) {
            var _this = this;
            return (MIL.getOrSetProperty(this, MIL.nameof(function () { return _this._groupName; }), name));
        };
        Gesture.prototype.RecognitionTimeoutInMs = function (timeout) {
            var _this = this;
            return (MIL.getOrSetProperty(this, MIL.nameof(function () { return _this._recognitionTimeoutInMs; }), timeout));
        };
        Gesture.prototype.CompletionTimeoutInMs = function (timeout) {
            var _this = this;
            return (MIL.getOrSetProperty(this, MIL.nameof(function () { return _this._completionTimeoutInMs; }), timeout));
        };
        Gesture.prototype.GestureStartedHandler = function (handler) {
            var _this = this;
            return (MIL.getOrSetProperty(this, MIL.nameof(function () { return _this._gestureStartedHandler; }), handler));
        };
        Gesture.prototype.GestureEndedHandler = function (handler) {
            var _this = this;
            return (MIL.getOrSetProperty(this, MIL.nameof(function () { return _this._gestureEndedHandler; }), handler));
        };
        Gesture.prototype.GestureCancelledHandler = function (handler) {
            var _this = this;
            return (MIL.getOrSetProperty(this, MIL.nameof(function () { return _this._gestureCancelledHandler; }), handler));
        };
        Gesture.prototype.OnMoveHandler = function (handler) {
            if (handler === undefined) {
                return (this._onMoveHandler);
            }
            else {
                if (this._targetDomElement === null) {
                    throw new MIL.MILException("The Target() of the Gesture must be defined before setting the OnMoveHandler()");
                }
                var gesture = this; // Note: Don't use 'let' here: it will result in the variable being renamed during compilation which means it won't surface correctly in the debugger
                var onMoveHandler = (handler instanceof Function) ? function onMoveHandlerWrapper(e) {
                    handler.call(gesture, e);
                    // Since we handled the PointerMove event, we prevent it from bubbling [up its parent chain].
                    // However, in order to allow other active gestures with a move handler on _targetDomElement) we use stopPropagation() NOT stopImmediatePropagation(). 
                    // An example of this would be when a 1-touch Pan becomes a 2-touch Zoom [Pan remains active during the Zoom], in which which case we want both gestures
                    // to continue to receive pointerMove events (in particular, we don't want the Pan to prevent the Zoom gesture from receiving pointerMove events).
                    e.stopPropagation();
                } : null;
                if (this._onMoveHandler !== null) {
                    this._targetDomElement.removeEventListener("pointermove", this._onMoveHandler);
                }
                if (onMoveHandler !== null) {
                    this._targetDomElement.addEventListener("pointermove", onMoveHandler);
                }
                this._onMoveHandler = onMoveHandler;
                return (this);
            }
        };
        Gesture.prototype.CapturesPointers = function (capturesPointers) {
            var _this = this;
            return (MIL.getOrSetProperty(this, MIL.nameof(function () { return _this._capturesPointers; }), capturesPointers));
        };
        /**
         * [ReadOnly Property] The most recent time the Gesture started (was recognized).
         * @returns {number} Result.
         */
        Gesture.prototype.StartedTime = function () {
            MIL.readOnlyProperty("StartedTime", arguments);
            return (this._startedTime);
        };
        /**
         * [Internal] Sets the most recent time the Gesture started (was recognized).
         * @param {number} time A time.
         * @internal
         */
        Gesture.prototype.startedTime = function (time) {
            this._startedTime = time;
        };
        /**
         * [ReadOnly Property] If the Gesture is currently active, returns the list of PointerID's involved.
         * @returns {string[]} Result.
         */
        Gesture.prototype.ActivePointerList = function () {
            MIL.readOnlyProperty("ActivePointerList", arguments);
            return (this._activePointerList);
        };
        /**
         * [Internal] Sets the pointer IDs that the Gesture was recognized with.
         * @param {string[]} pointerList A list of pointer IDs.
         * @internal
         */
        Gesture.prototype.activePointerList = function (pointerList) {
            this._activePointerList = pointerList;
        };
        /**
         *[ReadOnly Property] If the Gesture is currently active, returns the list of pointer type ordinals involved (eg. ["pen:1", "touch:1", "touch:2"]).
         * @returns {string[]} Result.
         */
        Gesture.prototype.ActivePointerTypeOrdinals = function () {
            MIL.readOnlyProperty("ActivePointerTypeOrdinals", arguments);
            return (this._activePointerTypeOrdinals);
        };
        /**
         * [Internal] Sets the pointer type ordinals that the Gesture was recognized with.
         * @param {string[]} pointerTypeOrdinalsList A list of pointer IDs.
         * @internal
         */
        Gesture.prototype.activePointerTypeOrdinals = function (pointerTypeOrdinalsList) {
            this._activePointerTypeOrdinals = pointerTypeOrdinalsList;
        };
        /**
         * [Internal] Returns the pointer type ordinal list for the specified permutationIndex (there is one index for each permutation of Gesture.PointerType [see Gesture.PointerTypePermutations]).
         * @param {number} permutationIndex An index value.
         * @returns {string[]} Result.
         * @internal
         */
        Gesture.prototype.getPointerTypeOrdinals = function (permutationIndex) {
            return (this._pointerTypeOrdinals[permutationIndex].slice()); // Note: We use slice() just to create a copy of the array
        };
        /**
         * [ReadOnly Property] Returns true if the Gesture is active (is currently a recognized Gesture).
         * Note that a Gesture can be both simultaneously active and cancelled (aborted).
         * @returns {boolean} Result.
         */
        Gesture.prototype.IsActive = function () {
            MIL.readOnlyProperty("IsActive", arguments);
            return (this._activePointerList.length > 0);
        };
        /**
         * [ReadOnly Property] Returns true if the Gesture was cancelled (after being recognized).
         * Note: Once set, will remain true until the Gesture is recognized again.
         * @returns {boolean} Result.
         */
        Gesture.prototype.IsCancelled = function () {
            MIL.readOnlyProperty("IsCancelled", arguments);
            return (this._isCancelled);
        };
        /**
         * [Internal] Sets the Gesture.IsCancelled state.
         * @param {boolean} cancelled Flag.
         * @internal
         */
        Gesture.prototype.isCancelled = function (cancelled) {
            this._isCancelled = cancelled;
        };
        /**
         * [ReadOnly Property] Returns the number of pointers that this gesture requires.
         * @returns {number} Result.
         */
        Gesture.prototype.PointerCount = function () {
            MIL.readOnlyProperty("PointerCount", arguments);
            return (this._pointerTypeOrdinals[0].length);
        };
        Gesture.prototype.RepeatCount = function (count) {
            if (count === undefined) {
                return (this._repeatCount);
            }
            else {
                if (count > 1) {
                    this._repeatCount = count;
                    // If needed, default the RepeatTimeoutInMs to 200ms
                    if (this._repeatTimeoutInMs === 0) {
                        this.RepeatTimeoutInMs(200);
                    }
                }
                return (this);
            }
        };
        Gesture.prototype.RepeatTimeoutInMs = function (timeout) {
            if (timeout === undefined) {
                return (this._repeatTimeoutInMs);
            }
            else {
                // Note: Timeouts less than 175ms are too small (most users typically can't double/triple-tap that fast, so the gesture would go unrecognized in too many instances)
                this._repeatTimeoutInMs = Math.min(1000, Math.max(175, timeout));
                // If needed, default the RepeatCount to 2
                if (this._repeatCount === 0) {
                    this.RepeatCount(2);
                }
                return (this);
            }
        };
        Gesture.prototype.repeatOccurrenceCount = function (count) {
            var _this = this;
            return (MIL.getOrSetProperty(this, MIL.nameof(function () { return _this._repeatOccurrenceCount; }), count));
        };
        Gesture.prototype.lastRepeatRecognitionTime = function (time) {
            var _this = this;
            return (MIL.getOrSetProperty(this, MIL.nameof(function () { return _this._lastRepeatRecognitionTime; }), time));
        };
        /**
         * [Internal] Sets the time the Gesture last ended.
         * @param {number} time A time.
         * @internal
         */
        Gesture.prototype.endedTime = function (time) {
            var _this = this;
            MIL.getOrSetProperty(this, MIL.nameof(function () { return _this._endedTime; }), time);
        };
        Gesture.prototype.CheckForGesturesOnEnd = function (check) {
            var _this = this;
            return (MIL.getOrSetProperty(this, MIL.nameof(function () { return _this._checkForGesturesOnEnd; }), check));
        };
        Gesture.prototype.AllowEventPropagation = function (allow) {
            var _this = this;
            return (MIL.getOrSetProperty(this, MIL.nameof(function () { return _this._allowEventPropagation; }), allow));
        };
        /**
         * Remove/re-add the Gesture.Target to change its z-order to "top most" [z-order = order added to SVG].
         * @returns {D3SingleSelection} A d3 selection of Gesture.Target().
         */
        Gesture.prototype.BringTargetToFront = function () {
            var gesture = this;
            var targetDomElement = gesture.Target();
            var svgInfo = MIL.getSvgInfo(targetDomElement);
            var gDomElement = svgInfo.gDomElement;
            gDomElement.removeChild(targetDomElement);
            gDomElement.appendChild(targetDomElement);
            return (d3.select(targetDomElement));
        };
        /** Capture all pointers used by this Gesture to the Gesture's target. */
        Gesture.prototype.SetPointerCapture = function () {
            var gesture = this;
            if (gesture.CapturesPointers()) {
                gesture.ActivePointerList().forEach(function (pointerID) {
                    // Note: Calling setPointerCapture() will prevent any further bubbling of events
                    var pointerId = MIL.getPointerDownEvent(pointerID, gesture.Target()).pointerId;
                    var targetElementID = MIL.getTargetElementID(gesture.Target());
                    gesture.Target().setPointerCapture(pointerId);
                    gesture._isCapturing = true;
                    // Note: Calling gesture_setPointerCapture() again [for the same element/pointer] is a valid condition, and since calling setPointerCapture()
                    //       twice (or more) seems to have no unwanted side-effects we don't check for or disallow it.
                    //       An example of this would be when 1-touch Pan becomes a 2-touch Zoom: the Pan will have captured the {P1} pointer to the SVG, then 
                    //       when the Zoom gesture starts (which also uses {P1}) it will capture it again.
                    if (MIL._activePointerCaptures[targetElementID] === undefined) {
                        MIL._activePointerCaptures[targetElementID] = [];
                    }
                    MIL._activePointerCaptures[targetElementID].push(pointerID);
                    MIL.log("SET pointer-capture for " + pointerID + " (" + pointerId + ") on " + targetElementID, MIL.FeatureNames.PointerCapture);
                });
            }
        };
        /** Releases capture of all pointers used by the Gesture from the Gesture's target. */
        Gesture.prototype.ReleasePointerCapture = function () {
            var gesture = this;
            if (gesture.CapturesPointers() && gesture._isCapturing) {
                gesture.ActivePointerList().forEach(function (pointerID) {
                    var pointerId = MIL.getPointerDownEvent(pointerID, gesture.Target()).pointerId;
                    var targetElementID = MIL.getTargetElementID(gesture.Target());
                    gesture.Target().releasePointerCapture(pointerId);
                    gesture._isCapturing = false;
                    // Check if we're trying to releasePointerCapture [on an element/pointer] without first capturing it
                    if (!MIL._activePointerCaptures[targetElementID] || (MIL._activePointerCaptures[targetElementID].indexOf(pointerID) === -1)) {
                        throw new MIL.MILException("Attempt to release pointer capture of '" + pointerID + "' from element '" + targetElementID + "' when it has not been captured");
                    }
                    MIL._activePointerCaptures[targetElementID].splice(MIL._activePointerCaptures[targetElementID].indexOf(pointerID), 1);
                    if (MIL._activePointerCaptures[targetElementID].length === 0) {
                        delete MIL._activePointerCaptures[targetElementID];
                    }
                    MIL.log("RELEASED pointer-capture for " + pointerID + " (" + pointerId + ") on " + targetElementID, MIL.FeatureNames.PointerCapture);
                });
            }
        };
        /**
         * [Internal] Starts a timer used to detect either:
         * 1) When a non-repeating gesture exceeds its CompletionTimeoutInMs(), or
         * 2) When a repeating gesture fails to be fully recognized [after being "partially" recognized (eg. only the first of two
         *    taps was recognized)] because the time between the prior occurrence being recognized and now exceeds RepeatTimeoutInMs()
         * @param {number} timeoutInMs A timeout (in milliseconds).
         * @param {string} timeoutType Either "completion" or "repeat". // PORT: Use an enum instead?
         * @param {boolean} propagateEventsOnTimeout Whether or not to propagate events if timeoutInMs expires. The onTick handler (if supplied) will always be called.
         * @param {VoidCallback} [onTick] [Optional] A callback to invoke if timeoutInMs expires.
         * @internal
         */
        Gesture.prototype.startCompletionTimeout = function (timeoutInMs, timeoutType, propagateEventsOnTimeout, onTick) {
            var gesture = this;
            if (gesture._completionTimerID !== -1) {
                clearTimeout(gesture._completionTimerID);
                gesture._completionTimerID = -1;
            }
            if (timeoutInMs > 0) {
                gesture._completionTimerID = setTimeout(function () {
                    if (onTick) {
                        onTick();
                    }
                    if (gesture._endedTime === 0) {
                        gesture.Cancel(timeoutType + " timeout [" + timeoutInMs + "ms] expired"); // timeoutType will be either "completion" or "repeat"
                        // Look for other gestures that may apply to the target of the [timed-out] gesture
                        var recognitionResult = MIL.recognizeGesture(gesture.Target(), 0, 0, false);
                        if (!recognitionResult.success && recognitionResult.propagateEvents && propagateEventsOnTimeout) {
                            // Propagate any queued events to allow any gestures on the target's parent element to be recognized
                            MIL.propagateQueuedEvents(gesture.Target());
                        }
                        gesture._repeatOccurrenceCount = 0;
                        gesture._isCancelled = false;
                        // Since the gesture was cancelled [due to not completing in time] we clear the gesture's 
                        // pointerList to prevent the gesture from subsequently being recognized during pointerUp
                        gesture._activePointerList.length = 0;
                        gesture._activePointerTypeOrdinals.length = 0;
                    }
                    else {
                        MIL.log("Gesture '" + gesture.Name() + "'" + (gesture._repeatOccurrenceCount > 0 ? (" [occurrence #" + gesture._repeatOccurrenceCount + "]") : "") + " completed within its " + gesture._completionTimeoutInMs + "ms timeout", MIL.FeatureNames.GestureRecognition);
                    }
                }, timeoutInMs);
            }
        };
        /**
         * [Internal] Stops the timer started with startCompletionTimeout().
         * @internal
         */
        Gesture.prototype.stopCompletionTimeout = function () {
            if (this._completionTimerID !== -1) {
                clearTimeout(this._completionTimerID);
                this._completionTimerID = -1;
            }
        };
        /**
         * Returns the name of the pointer (eg. "touch:2", meaning the second touch) at the specified ordinal (eg. "{P3}", meaning the third pointer in the Gesture).
         * Returns null if pointerOrdinal is not an ordinal specifier.
         * Note: If the Gesture.PointerType() includes an 'or' operator ('|') then the value of a given ordinal can change depending on which permutation of pointers invoked the Gesture.
         * @param {string} pointerOrdinal A pointer ordinal of the form "{Pn}", where n is 1..9.
         * @returns {string | null} Result.
         */
        Gesture.prototype.GetPointerNameByOrdinal = function (pointerOrdinal) {
            var matches = pointerOrdinal.match("{P([1-9])}");
            if (matches !== null) {
                var ordinal = Number(matches[1]);
                if (this._activePointerTypeOrdinals.length === 0) {
                    throw new MIL.MILException("Unable to determine the pointer name for ordinal identifier '" + pointerOrdinal + "' because gesture '" + this.Name() + "' is not active");
                }
                if (ordinal <= this._activePointerTypeOrdinals.length) {
                    return (this._activePointerTypeOrdinals[ordinal - 1]);
                }
                else {
                    throw new MIL.MILException("Ordinal identifier '" + pointerOrdinal + "' is invalid for gesture '" + this.Name() + "', which only uses " + this.PointerCount() + " pointer(s)");
                }
            }
            else {
                return (null);
            }
        };
        /**
         * Returns the pointer ID (eg. "PointerID_pen_123") for the specified pointer type, which can be in any of these forms: "touch:2" [meaning the second touch pointer that made contact],
         * "touch" [which is the same as "touch:1"], or "{P1}" [meaning pointer ordinal #1 in Gesture.PointerType()]. Throws if the Gesture does not have a pointer of the specified type.
         * @param {string} pointerType A pointer type.
         * @returns {string} A pointer ID.
         */
        Gesture.prototype.GetPointerID = function (pointerType) {
            if (!pointerType) {
                throw new MIL.MILException("The pointerType parameter is missing or invalid");
            }
            // If pointerType is of the form "{Pn}", then return the pointer at ordinal n (eg. for a gesture defined as "pen+touch:2", ordinal 1 = "pen:1", 2 = "touch:1", 3 = "touch:2").
            // Using ordinal notation allows calling code to be written more generically (if so desired) - eg. allowing a gesture to be redefined to use different pointer types with fewer code changes.
            var pointerName = this.GetPointerNameByOrdinal(pointerType);
            if (pointerName !== null) {
                return (this.GetPointerID(pointerName));
            }
            var targetType = pointerType;
            var targetInstance = 1;
            var instance = 0;
            // Note: pointerType can be of the form "touch:2" meaning "the second touch pointer that made contact"
            var parts = pointerType.split(":");
            targetType = parts[0];
            targetInstance = (parts.length === 1) ? 1 : +parts[1];
            for (var i = 0; i < this._activePointerList.length; i++) {
                var pointerID = this._activePointerList[i];
                if ((pointerID.indexOf(targetType) !== -1) || (targetType === "any") || ((targetType === "hover") && MIL.canHover(pointerID, this.Target()))) {
                    if (++instance === targetInstance) {
                        return (pointerID);
                    }
                }
            }
            throw new MIL.MILException("Gesture '" + this.Name() + "' (defined as '" + this.PointerType() + "') does not have a pointer of type '" + pointerType + "'");
        };
        /**
         * Returns the distance (in pixels) between 2 pointers in the [active] Gesture.
         * @param {string} pointerType1 The first pointer type (eg. "{P1}").
         * @param {string} pointerType2 The second pointer type (eg. "{P2}").
         * @returns {number} Result.
         */
        Gesture.prototype.GetDistance = function (pointerType1, pointerType2) {
            var e1 = MIL.getLatestPointerMoveEvent(this.GetPointerID(pointerType1), this.Target());
            var e2 = MIL.getLatestPointerMoveEvent(this.GetPointerID(pointerType2), this.Target());
            var pixelDistance = MIL.Utils.GetDistanceBetweenEvents(e1, e2);
            return (pixelDistance);
        };
        /**
         * Given a pointerType (eg. "{P1}", "touch:2") returns the point (in screen coordinates) where that pointer started (PointerDown).
         * @param {string} pointerType A pointer type.
         * @returns {Point} Result.
         */
        Gesture.prototype.GetStartScreenPoint = function (pointerType) {
            // Note: e.clientX/Y are relative to [the top-left (0,0)] of the document window; if the window (and/or container(s) of
            //       the SVG) has been scrolled, the caller will need to adjust for this (eg. by adding window.pageXOffset/pageYOffset)
            var e = MIL.getPointerDownEvent(this.GetPointerID(pointerType), this.Target());
            return ({ x: e.clientX, y: e.clientY });
        };
        /**
         * Given a pointerType (eg. "{P1}", "touch:2") returns the point (in svg space) where that pointer started (PointerDown).
         * @param {string} pointerType A pointer type.
         * @returns {Point} Result.
         */
        Gesture.prototype.GetStartSvgPoint = function (pointerType) {
            var e = MIL.getPointerDownEvent(this.GetPointerID(pointerType), this.Target());
            var svgInfo = MIL.getSvgInfo(e.target);
            // Since svgInfo.gDomElement can be transformed (ie. zoomed and/or panned), we need to transform the e.clientX/Y point into the coordinate space of the [potentially transformed] 'g' element
            // Note: e.clientX/Y are relative to [the top-left (0,0)] of the document window
            var pointInTransformSpace = MIL.TransposePointer(e, svgInfo.gDomElement);
            return ({ x: pointInTransformSpace.x, y: pointInTransformSpace.y });
        };
        /**
         * Given a pointerType (eg. "{P1}", "touch:2") returns the point (in screen coordinates) where that pointer started (PointerDown).
         * @param {string} pointerType A pointer type.
         * @returns {Point} Result.
         */
        Gesture.prototype.GetCurrentScreenPoint = function (pointerType) {
            // Note: e.clientX/Y are relative to [the top-left (0,0)] of the document window
            var e = MIL.getLatestPointerMoveEvent(this.GetPointerID(pointerType), this.Target());
            return ({ x: e.clientX, y: e.clientY });
        };
        /**
         * Returns the current position (in svg coordinates) of the specified pointer type (eg. "{P1}", "touch:2").
         * @param {string} pointerType A pointer type.
         * @returns {Point} Result.
         */
        Gesture.prototype.GetCurrentSvgPoint = function (pointerType) {
            var e = MIL.getLatestPointerMoveEvent(this.GetPointerID(pointerType), this.Target());
            var svgInfo = MIL.getSvgInfo(e.target);
            // Since svgInfo.gDomElement can be transformed (ie. zoomed and/or panned), we need to transform the e.clientX/Y point into the coordinate space of the [potentially transformed] 'g' element
            var pointInTransformSpace = MIL.TransposePointer(e, svgInfo.gDomElement);
            return (pointInTransformSpace);
        };
        /**
         * Returns the initial pointerDown event for the specified pointer type (eg. "{P1}", "touch:2").
         * @param {string} pointerType A pointer type.
         * @returns {PointerEvent} Result.
         */
        Gesture.prototype.GetStartEvent = function (pointerType) {
            var e = MIL.getPointerDownEvent(this.GetPointerID(pointerType), this.Target());
            return (e);
        };
        /**
         * Returns the latest pointerMove event for the specified pointer type (eg. "{P1}", "touch:2").
         * @param {string} pointerType A pointer type.
         * @returns {PointerEvent} Result.
         */
        Gesture.prototype.GetCurrentEvent = function (pointerType) {
            var e = MIL.getLatestPointerMoveEvent(this.GetPointerID(pointerType), this.Target());
            return (e);
        };
        Gesture.prototype.Ink = function (pointerType) {
            if (pointerType === undefined) {
                return (this._ink);
            }
            else {
                var pointerID = this.GetPointerID(pointerType);
                var e = MIL.getPointerDownEvent(pointerID, this.Target());
                if (MIL._inkCompletePathPointData[pointerID] !== undefined) {
                    throw new MIL.MILException("Inking has already started for gesture '" + this.Name() + "'");
                }
                MIL._inkCurrentPathPointData[pointerID] = []; // Reset point data
                MIL._inkCompletePathPointData[pointerID] = []; // Reset point data
                this._ink = new MIL.Ink(pointerID).ParentGesture(this);
                return (this._ink);
            }
        };
        /**
         * [Internal] Sets the latest Ink created by the Gesture.
         * @param {Ink | null} newInk An Ink instance (or null) to be assigned to the Gesture.
         * @internal
         */
        Gesture.prototype.ink = function (newInk) {
            this._ink = newInk;
        };
        /**
         * Combines the supplied Inks into a single Ink, which will have a new [convex] hull that covers the combined Ink paths.
         * Returns the new (combined) Ink instance, or null if inksToCombine is empty.
         * @param {Ink[]} inksToCombine The array of Inks to combine.
         * @param {string} className The name of the CSS class to apply to the combined ink.
         * @param {boolean} [makeInkPathMatchHull] [Optional] When true, the path of the new ink will match the new [convex] hull [eg. when combining 2 paths that are "grouping containers"]
         * @returns {Ink | null} The resulting [new] combined Ink.
         */
        Gesture.prototype.CombineInks = function (inksToCombine, className, makeInkPathMatchHull) {
            if (inksToCombine.length === 0) {
                return (null);
            }
            var svgInfo = MIL.getSvgInfo(inksToCombine[0].Path());
            var dInk = "", dHull = "";
            var allPathPointArrays = []; // Array of arrays of {x, y} points
            var allVertices = []; // Array of [x, y] arrays
            var resizeGesturePointerType = "";
            var onResizeCompleteHandler = null;
            var inkCount = 0;
            inksToCombine.forEach(function (ink) {
                var pathDomElement = ink.Path().node();
                var inkPathPointsCollection = pathDomElement.__MILPathPointsCollection__;
                dInk += pathDomElement.getAttribute("d");
                var _loop_2 = function (i) {
                    var pathPoints = inkPathPointsCollection[i];
                    var vertices = d3.range(pathPoints.length).map(function (d) { return ([pathPoints[d].x, pathPoints[d].y]); });
                    allPathPointArrays.push(pathPoints);
                    allVertices = allVertices.concat(vertices);
                };
                for (var i = 0; i < inkPathPointsCollection.length; i++) {
                    _loop_2(i);
                }
                // If ANY of the combined inks allows resizing, then so will the new combined ink
                if (ink.ResizeWith()) {
                    resizeGesturePointerType = ink.ResizeWith();
                    onResizeCompleteHandler = ink.OnResizeCompleteHandler();
                }
                ink.Delete();
                inkCount++;
            });
            var inkPath = svgInfo.gSelection.append("path");
            var hullPath = svgInfo.gSelection.append("path"); // Must add this AFTER adding the [new] inkPath (so that the Hull's z-order is higher)
            var hullVertices = d3.polygonHull(allVertices); // Produces a convex hull
            var hullPoints = MIL.Utils.ConvertXYPointsToPoints(hullVertices);
            var hullColor = inksToCombine[0].HullColor();
            // Note: We don't simply use _inkLineGenerator to create the hull 'd' in order to match how the hullPath
            //       is created in ink_consolidatePaths() [and how it's subsequently processed by translateHullPath()]
            for (var i = 0; i < hullPoints.length; i++) {
                dHull += (!dHull ? "M " : " L ") + hullPoints[i].x + " " + hullPoints[i].y;
            }
            hullPath.attr("d", dHull);
            hullPath.node().style.stroke = hullPath.node().style.fill = hullColor;
            hullPath.node().style.strokeWidth = "1px";
            hullPath.classed("MILInkHullPath", true); // Just to make it easier to find the hulls using CSS selector syntax ("path.MILInkHullPath")
            if (makeInkPathMatchHull) {
                // Re-create the inkPath to match the new [convex] hull
                inkPath.attr("d", dHull + "Z");
                // Re-sample the inkPath [so the "density" of __MILPathPointsCollection__ remains high enough that intersection
                // detection (ie. detecting if points of the new inkPath are inside another region) continues to work well]
                var sampledHullPoints = MIL.Utils.SamplePointsFromPath(inkPath.node(), false, 5);
                if (sampledHullPoints.length > hullPoints.length) {
                    dHull = "";
                    for (var i = 0; i < sampledHullPoints.length; i++) {
                        dHull += (!dHull ? "M " : " L ") + sampledHullPoints[i].x + " " + sampledHullPoints[i].y;
                    }
                    inkPath.attr("d", dHull + "Z");
                    hullPoints = sampledHullPoints;
                }
                inkPath.node().__MILPathPointsCollection__ = [hullPoints];
            }
            else {
                inkPath.attr("d", dInk);
                inkPath.node().__MILPathPointsCollection__ = allPathPointArrays;
            }
            inkPath.classed("MILInkPath", true).classed(className, true); // We add the 'MILInkPath' class just to make it easier to find the ink paths using CSS selector syntax ("path.MILInkPath") 
            // "tag" the hull with its corresponding ink path
            hullPath.node().__MILAssociatedInkPath__ = inkPath;
            var newInk = new MIL.Ink(null).Class(className).ParentGesture(this).IsNonDrawing(false).HullType(MIL.InkHullType.Convex).HullColor(hullColor);
            newInk.setHullAndPath(hullPath, inkPath, hullPoints); // Port: Added
            // If needed, ensure re-creation of the resize gesture
            if (resizeGesturePointerType) {
                newInk.ResizeWith(resizeGesturePointerType);
                newInk.OnResizeCompleteHandler(onResizeCompleteHandler);
            }
            this._ink = newInk;
            MIL._inks.push(newInk); // Note: Must be explicitly removed via Ink.Delete()
            MIL.log(allPathPointArrays.length + " Ink paths combined by gesture '" + this.Name() + "'");
            return (newInk);
        };
        /**
         * Cancels (stops) the Gesture (if it's active).
         * @param {string} reason The reason why the gesture was cancelled.
         */
        Gesture.prototype.Cancel = function (reason) {
            if (!this.IsActive()) {
                // It's OK to cancel an inactive gesture: setting a gesture as cancelled is how recognizeGesture() [et al] flags certain gestures to be skipped
            }
            this._isCancelled = true;
            // Note: We don't reset this._activePointerList here, we'll let the normal removePointer() pathway do that
            // Is the gesture currently in the process of creating an Ink?
            if ((this._ink !== null) && (this._ink.Path() === null)) {
                this._ink.Cancel();
                this._ink = null;
            }
            MIL.log("Gesture '" + this.Name() + "' cancelled (reason: " + (reason || "[None]") + ")");
            if (this.GestureCancelledHandler() !== null) {
                this.GestureCancelledHandler().call(this, (reason !== undefined) ? reason : null);
            }
            if (this._onMoveHandler !== null) {
                this._targetDomElement.removeEventListener("pointermove", this._onMoveHandler);
                this._onMoveHandler = null;
            }
            this.ReleasePointerCapture();
        };
        /**
         * [Private Method] Returns true if a permutation of targetPointerType [other than itself] exists in pointerTypePermutations.
         * @param {string} targetPointerType A pointer type (eg. "pen+touch")
         * @param {string[]} pointerTypePermutations An array of pointer types (eg. ["touch+pen", "pen+touch"]).
         * @returns {boolean} Result.
         */
        Gesture.prototype.isExistingPointerTypePermutation = function (targetPointerType, pointerTypePermutations) {
            var permutationExists = false;
            var targetGroups = targetPointerType.split("+");
            var targetIndex = pointerTypePermutations.indexOf(targetPointerType);
            for (var i = 0; i < pointerTypePermutations.length; i++) {
                var groups = pointerTypePermutations[i].split("+");
                if ((i === targetIndex) || (targetGroups.length !== groups.length)) {
                    continue;
                }
                for (var g = 0; g < targetGroups.length; g++) {
                    var matchIndex = groups.indexOf(targetGroups[g]);
                    if (matchIndex !== -1) {
                        groups.splice(matchIndex, 1);
                    }
                }
                if (groups.length === 0) {
                    permutationExists = true;
                    break;
                }
            }
            return (permutationExists);
        };
        /**
         * [Private Method] Given a pointer type specifier (eg. "pen|touch+touch"), returns all possible [and logically unique] permutations (there will only be more than one permutation if pointerType includes the 'or' operator (|)).
         * Example (for illustration only): A pointerType of "pen|touch:2+mouse|touch" will return ["pen+mouse", "pen+touch", "touch:2+mouse", "touch:2+touch"].
         * @param {string} pointerType A pointer type specifier.
         * @returns {string[]} Result.
         */
        Gesture.prototype.permutePointerType = function (pointerType) {
            if (pointerType.indexOf("|") === -1) {
                // Only or-style pointerType values result in permutations
                return ([pointerType]);
            }
            else {
                var andGroups = pointerType.split("+"); // Note: There may not be a "+"
                var pointerTypePermutations = [];
                for (var g = 0; g < andGroups.length; g++) {
                    var initialAdd = (pointerTypePermutations.length === 0);
                    var andGroup = andGroups[g];
                    if (andGroup.indexOf("|") === -1) {
                        // A "non-or" group (eg. "touch:2")
                        if (initialAdd) {
                            pointerTypePermutations.push(andGroup);
                        }
                        else {
                            // Add new permutations
                            for (var i = 0; i < pointerTypePermutations.length; i++) {
                                pointerTypePermutations[i] += "+" + andGroup;
                            }
                        }
                    }
                    else {
                        // An "or" group (eg. "touch|pen:2")
                        var types = andGroup.split("|");
                        if (andGroup.indexOf("any") !== -1) {
                            throw new MIL.MILException("Invalid pointerType '" + andGroup + "'; the pointerType 'any' is invalid when using the 'or' (|) specifier");
                        }
                        for (var type in types) {
                            var parts = type.split(":");
                            var instanceCount = (parts.length === 2) ? +parts[1] : 1;
                            if ((parts.length > 2) || isNaN(instanceCount)) {
                                throw new MIL.MILException("Invalid pointerType '" + andGroup + "'");
                            }
                        }
                        if (initialAdd) {
                            // Example: "touch:2|pen" becomes "touch:2", "pen"
                            for (var t = 0; t < types.length; t++) {
                                pointerTypePermutations.push(types[t]);
                            }
                        }
                        else {
                            // Add new permutations
                            var existingPermutationCount = pointerTypePermutations.length;
                            for (var i = 0; i < existingPermutationCount; i++) {
                                for (var t = 0; t < types.length; t++) {
                                    var newPermutation = pointerTypePermutations[i] + "+" + types[t];
                                    pointerTypePermutations.push(newPermutation);
                                }
                            }
                            // Remove the previous [partial] permutations
                            pointerTypePermutations.splice(0, existingPermutationCount);
                        }
                    }
                }
                // Remove any logical duplicates [eg. "pen+touch" is a duplicate of "touch+pen"]
                for (var i = pointerTypePermutations.length - 1; i >= 0; i--) {
                    if (this.isExistingPointerTypePermutation(pointerTypePermutations[i], pointerTypePermutations)) {
                        pointerTypePermutations.splice(i, 1);
                    }
                }
                return (pointerTypePermutations);
            }
        };
        return Gesture;
    }());
    MIL.Gesture = Gesture;
})(MIL || (MIL = {}));
var MIL;
(function (MIL) {
    /**
     * The BuiltInGestures namespace.
     * This namespace provides a quick way to create basic Gestures (trading granular control for simplicity).
     */
    var BuiltInGestures;
    (function (BuiltInGestures) {
        /**
         * Creates a 'Tap-and-Hold' Gesture. Can be used in conjunction with BuiltInGestures.Tap (even for the same pointerType) but only if added to the target AFTER adding Tap.
         * @param {string} gestureName The name of the Gesture.
         * @param {TargetDomElement} targetElement The DOM element the Gesture will target.
         * @param {string} pointerType A pointer type. If more than one pointer is specified, only {P1} will be used.
         * @param {GestureEventHandler} onTapAndHold A handler called when the tap-and-hold occurs.
         * @param {number} [holdTimeoutInMs] [Optional] The amount of time the tap should be held for. If the gesture ends before this timeout, the gesture will be cancelled.
         * @param {number} [maximumDistanceInPx] [Optional] The maximum distance the pointer can move from the original contact position to still be considered a tap-and-hold. If the pointer moves more than this, the gesture will be cancelled.
         * @returns {Gesture} Result.
         */
        function TapAndHold(gestureName, targetElement, pointerType, onTapAndHold, holdTimeoutInMs, maximumDistanceInPx) {
            if (holdTimeoutInMs === void 0) { holdTimeoutInMs = 333; }
            if (maximumDistanceInPx === void 0) { maximumDistanceInPx = 10; }
            gestureName = ensureNameCanBeMadeUnique(gestureName);
            var timerID = -1;
            var tapStartPoint = null;
            var tapAndHoldGesture = MIL.CreateGesture(gestureName, true)
                .Target(targetElement)
                .PointerType(pointerType)
                .GestureStartedHandler(function () {
                var gesture = this;
                tapStartPoint = gesture.GetCurrentScreenPoint("{P1}");
                timerID = setTimeout(function () {
                    if (!gesture.IsActive() || (timerID === -1)) {
                        return;
                    }
                    var distanceInPixels = MIL.Utils.GetDistanceBetweenPoints(tapStartPoint, gesture.GetCurrentScreenPoint("{P1}"));
                    if (distanceInPixels < maximumDistanceInPx) {
                        if (onTapAndHold) {
                            onTapAndHold.call(gesture);
                        }
                    }
                    else {
                        gesture.Cancel("The pointer moved more [" + distanceInPixels.toFixed(2) + "px] than the maximum specified [" + maximumDistanceInPx + "px])");
                    }
                    timerID = -1;
                }, holdTimeoutInMs);
            })
                .GestureEndedHandler(function () {
                var gesture = this;
                if (timerID !== -1) {
                    clearTimeout(timerID);
                    timerID = -1;
                    gesture.Cancel("The tap-and-hold ended before the hold timeout [" + holdTimeoutInMs + "ms] elapsed");
                }
            });
            return (tapAndHoldGesture);
        }
        BuiltInGestures.TapAndHold = TapAndHold;
        /**
         * Creates a 'Tap' Gesture.
         * @param {string} gestureName The name of the Gesture.
         * @param {TargetDomElement} targetElement The DOM element the Gesture will target.
         * @param {string} pointerType A pointer type. If more than one pointer is specified, only {P1} will be used.
         * @param {GestureEventHandler} onTap A handler called when the tap occurs.
         * @param {number} [completionTimeoutInMs] [Optional] The maximum amount of time the Gesture should take. If the gesture does not end before this timeout, the gesture will be cancelled.
         * @param {number} [maximumDistanceInPx] [Optional] The maximum distance the pointer can move from the original contact position to still be considered a tap.
         * @returns {Gesture} Result.
         */
        function Tap(gestureName, targetElement, pointerType, onTap, completionTimeoutInMs, maximumDistanceInPx) {
            if (completionTimeoutInMs === void 0) { completionTimeoutInMs = 150; }
            if (maximumDistanceInPx === void 0) { maximumDistanceInPx = 5; }
            gestureName = ensureNameCanBeMadeUnique(gestureName);
            var tapStartPoint = null;
            var tapGesture = MIL.CreateGesture(gestureName, true)
                .Target(targetElement)
                .PointerType(pointerType)
                .CompletionTimeoutInMs(completionTimeoutInMs) // If the gesture does not end before this timeout, the gesture will be cancelled
                .GestureStartedHandler(function () {
                var gesture = this;
                tapStartPoint = gesture.GetCurrentScreenPoint("{P1}");
            })
                .GestureEndedHandler(function () {
                var gesture = this;
                var distanceInPixels = MIL.Utils.GetDistanceBetweenPoints(tapStartPoint, gesture.GetCurrentScreenPoint("{P1}"));
                if (distanceInPixels < maximumDistanceInPx) {
                    if (onTap) {
                        onTap.call(gesture);
                    }
                }
                else {
                    MIL.log("Tap gesture '" + gesture.Name() + "' failed (reason: the pointer moved more [" + distanceInPixels.toFixed(2) + "px] than the maximum specified [" + maximumDistanceInPx + "px])");
                }
            });
            return (tapGesture);
        }
        BuiltInGestures.Tap = Tap;
        /**
         * Creates a shape-recognizer Gesture.
         * @param {string} gestureName The name of the Gesture.
         * @param {TargetDomElement} targetElement The DOM element the Gesture will target.
         * @param {string} pointerType A pointer type. If more than one pointer is specified, only {P1} will be used.
         * @param {number} minPercentMatch The percentage of points in the drawn path that must be inside the shape-template to trigger a match.
         * @param {ShapeRecognizedHandler} onShapeRecognized A handler called when the shape is recognized.
         * @param {string} [cometTailClassName] [Optional] The CSS class to use to draw a 'comet tail' as the shape is drawn.
         * @param {RecognizableShape[]} [shapeList] [Optional] The list of shapes to be recognized (must be MIL.RecognizableShape values). Note: Providing a shapeList helps to reduce false-positives (misrecognitions). // PORT: Was string[]
         * @param {number} [targetWidth] [Optional] The width (in pixels) of the area that the shape recognition will occur within.
         * @param {number} [targetHeight] [Optional] The height (in pixels) of the area that the shape recognition will occur within.
         * @returns {Gesture} Result.
         */
        function ShapeRecognizer(gestureName, targetElement, pointerType, minPercentMatch, onShapeRecognized, cometTailClassName, shapeList, targetWidth, targetHeight) {
            gestureName = ensureNameCanBeMadeUnique(gestureName);
            if (shapeList) {
                shapeList.forEach(function (v, i) {
                    if (MIL.RecognizableShape[i] === undefined) {
                        throw new MIL.MILException("shapeNameList[" + i + "] (" + v + ") is invalid");
                    }
                });
            }
            var shapeRecognitionGesture = MIL.CreateGesture(gestureName, true)
                .Target(targetElement)
                .PointerType(pointerType)
                .GestureStartedHandler(function () {
                var gesture = this;
                gesture.Ink("{P1}").IsNonDrawing(true).CometTailClass(cometTailClassName === undefined ? "" : cometTailClassName).Start();
            })
                .GestureEndedHandler(function () {
                var gesture = this;
                var gDomElement = MIL.DebugFeature(MIL.FeatureNames.ShapeRecognition) ? MIL.getSvgInfo(targetElement).gDomElement : undefined;
                var shape = MIL.RecognizeShape(gesture.Ink().PathPoints(), minPercentMatch, targetWidth, targetHeight, gDomElement, shapeList);
                if (onShapeRecognized && (shape !== null)) {
                    onShapeRecognized.call(gesture, shape);
                }
            });
            return (shapeRecognitionGesture);
        }
        BuiltInGestures.ShapeRecognizer = ShapeRecognizer;
        /**
         * Creates a radial-swipe Gesture.
         * @param {string} gestureName The name of the Gesture.
         * @param {TargetDomElement} targetElement The DOM element the Gesture will target.
         * @param {string} pointerType A pointer type. If more than one pointer is specified, only {P1} will be used.
         * @param {number} numRadialSegments The number of radial segments to quantize the gesture into.
         * @param {number} minDistance The minumum distance (in pixels) of the swipe for it to be recognized.
         * @param {RadialSwipeHandler} onSwipe A handler called when the swipe is recognized.
         * @param {function(): string} [getCometTailClassName] [Optional] A function that returns the name of a CSS class used to draw a 'comet tail' for the radial gesture.
         * @returns {Gesture} Result.
         */
        function RadialSwipe(gestureName, targetElement, pointerType, numRadialSegments, minDistance, onSwipe, getCometTailClassName) {
            gestureName = ensureNameCanBeMadeUnique(gestureName);
            var radialSwipeGesture = MIL.CreateGesture(gestureName, true)
                .Target(targetElement)
                .PointerType(pointerType)
                .GestureStartedHandler(function () {
                var gesture = this;
                var cometTailClassName = (getCometTailClassName && getCometTailClassName()) ? getCometTailClassName() : "";
                gesture.Ink("{P1}").IsNonDrawing(true).CometTailClass(cometTailClassName).CometTailDurationInMs(200).Start();
            })
                .GestureEndedHandler(function () {
                var gesture = this;
                var ink = gesture.Ink();
                var swipeResult = MIL.RecognizeRadialSwipe(ink.PathPoints(), numRadialSegments, minDistance);
                if (swipeResult && onSwipe) {
                    onSwipe.call(gesture, swipeResult);
                }
            });
            return (radialSwipeGesture);
        }
        BuiltInGestures.RadialSwipe = RadialSwipe;
        /**
         * Creates a circular-dial Gesture that detects changes in angle (eg. rotation) around the center of the specified targetElement.
         * @param {string} gestureName The name of the Gesture.
         * @param {TargetDomElement} targetElement The DOM element the Gesture will target.
         * @param {string} pointerType A pointer type.
         * @param {AngleChangedHandler} onAngleChanged A handler called each time the angle changes (ie. the pointer moves resulting in a different angle).
         * @returns {Gesture} Result.
         */
        function CircularDial(gestureName, targetElement, pointerType, onAngleChanged) {
            gestureName = ensureNameCanBeMadeUnique(gestureName);
            var previousHeading = -361; // PORT: This variable was added.
            var circularDialGesture = MIL.CreateGesture(gestureName, true)
                .Target(targetElement)
                .PointerType(pointerType)
                .GestureStartedHandler(function () {
                var gesture = this;
                gesture.OnMoveHandler(function () {
                    var centroidPoint = MIL.Utils.GetCentroidPoint(gesture.Target());
                    var heading = MIL.Utils.GetHeadingFromPoints(centroidPoint, gesture.GetCurrentSvgPoint("{P1}"));
                    if (onAngleChanged && (previousHeading !== heading)) {
                        onAngleChanged.call(gesture, heading);
                    }
                    previousHeading = heading;
                });
            });
            return (circularDialGesture);
        }
        BuiltInGestures.CircularDial = CircularDial;
        /**
         * [Private Method] If needed, modifies the supplied gestureName so that it can be made unique.
         * @param {string} gestureName A Gesture name.
         * @returns {string} Result.
         */
        function ensureNameCanBeMadeUnique(gestureName) {
            if (gestureName[gestureName.length - 1] !== "*") {
                gestureName += "*"; // The '*' will get replaced with a unique ID by CreateGesture()
            }
            return (gestureName);
        }
    })(BuiltInGestures = MIL.BuiltInGestures || (MIL.BuiltInGestures = {}));
})(MIL || (MIL = {}));
var MIL;
(function (MIL) {
    // Type aliases
    /**
     * The Controls namespace.
     */
    var Controls;
    (function (Controls) {
        var _nextRadialMenuID = 1; // Used to create a default menu name [if not supplied in CreateRadialMenu()]
        /**
         * Returns true if 'targetElement' is a MIL control, or has a parent which is a MIL control.
         * @param {TargetDomElement} targetElement The element to check.
         * @returns {boolean} Result.
         */
        function IsControl(targetElement) {
            var selfOrAncestorIsControl = false;
            var domElement = MIL.Utils.GetDomElement(targetElement);
            while (domElement && !selfOrAncestorIsControl) {
                if (domElement.hasOwnProperty("__MILIsControl__")) {
                    selfOrAncestorIsControl = true;
                }
                // PORT: This check was changed from: "domElement = domElement.parentElement || domElement.parentNode;"
                domElement = domElement.parentNode;
            }
            return (selfOrAncestorIsControl);
        }
        Controls.IsControl = IsControl;
        /**
         * Returns the RulerControl for the specified <svg> element, creating it if needed.
         * @param {SVGSVGElement} svg An <svg> element.
         * @returns {RulerControl} Result.
         */
        function Ruler(svg) {
            var svgDomElement = MIL.Utils.GetDomElement(svg, SVGSVGElement);
            var svgInfo = MIL.getSvgInfo(svgDomElement);
            if (svgInfo.ruler === null) {
                svgInfo.ruler = new RulerControl(svgInfo.gDomElement)
                    .BeginUpdate()
                    .Width(svgInfo.svgWidth * 0.4).BigTickCount(10).LittleTickCount(10).KeepConstantScale(true).CenterInView()
                    .EndUpdate();
            }
            return (svgInfo.ruler);
        }
        Controls.Ruler = Ruler;
        /**
         * Returns the FrameControl for the specified <svg> element, creating it if needed.
         * Note: As a side-effect of creation, the 'overflow' CSS attribute of the svg will be set to 'hidden'.
         * @param {SVGSVGElement} svg An <svg> element.
         * @returns {FrameControl} Result.
         */
        function Frame(svg) {
            var svgDomElement = MIL.Utils.GetDomElement(svg, SVGSVGElement);
            var svgInfo = MIL.getSvgInfo(svgDomElement);
            if (svgInfo.frame === null) {
                svgInfo.frame = new FrameControl(svgInfo.gDomElement);
                // Allow content to render outside the [currently] visible portion of the svg [because the FrameControl typically extends outside the svg].
                // The content will come into view [of the svg] when we pan/zoom the root <g>.
                svgInfo.svgDomElement.setAttribute("overflow", "hidden");
            }
            return (svgInfo.frame);
        }
        Controls.Frame = Frame;
        /**
         * Creates a new RadialMenuControl for the specified <svg> element. Unlike the Ruler and Frame controls, there can be multiple RadialMenu controls for a given <svg>.
         * Use DeleteRadialMenu() when you no longer need the control. This method adds the root level (0) to the menu. To add additional levels, use AddLevel().
         * @param {SVGSVGElement} svg An <svg> element.
         * @param {string} menuName The name of the menu. If null (or empty) a default name will be provided.
         * @param {string} centerImageURL The URL of the image to display at the center of the menu.
         * @param {number} sectorCount The number of sectors (menu item slots). Must be between 2 and 8.
         * @param {number[]} usedSectors The list of sector indexes (0 to sectorCount - 1) that will be used. These do not need to be sequential.
         * @param {string[]} usedSectorImageURLs The list of sector (item) image URLs. Must match the length of the usedSectors list. Note: Images should ideally have a transparent background.
         * @param {string[]} [usedSectorNames] [Optional] The list of sector (item) names. Must match the length of the usedSectors list. Specify null for no names.
         * @param {string[]} [usedSectorTooltipCaptions] [Optional] The list of sector (item) tooltip captions. Must match the length of the usedSectors list. Specify null to use the default tooltip captions.
         * @param {number} [tooltipHoverTimeoutInMs] [Optional] The timeout (in milliseconds) before the tooltip is shown (if available) for a hovered-over sector (item) image.
         * @returns {RadialMenuControl} Result.
         */
        function CreateRadialMenu(svg, menuName, centerImageURL, sectorCount, usedSectors, usedSectorImageURLs, usedSectorNames, usedSectorTooltipCaptions, tooltipHoverTimeoutInMs) {
            if (usedSectorNames === void 0) { usedSectorNames = null; }
            if (usedSectorTooltipCaptions === void 0) { usedSectorTooltipCaptions = null; }
            if (tooltipHoverTimeoutInMs === void 0) { tooltipHoverTimeoutInMs = 100; }
            if (!menuName) {
                menuName = "RadialMenu #" + _nextRadialMenuID++;
            }
            var svgDomElement = MIL.Utils.GetDomElement(svg, SVGSVGElement);
            var newRadialMenu = new MIL.Controls.RadialMenuControl(svgDomElement, menuName, centerImageURL, sectorCount, usedSectors, usedSectorImageURLs, usedSectorNames, usedSectorTooltipCaptions, tooltipHoverTimeoutInMs);
            // We keep track of all the radial menus so that we can, for example, scale them all in MIL.Zoom()
            MIL.getSvgInfo(svgDomElement).radialMenus.push(newRadialMenu);
            return (newRadialMenu);
        }
        Controls.CreateRadialMenu = CreateRadialMenu;
        /**
         * Deletes a RadialMenuControl created with CreateRadialMenu(). Returns true if the control was deleted, otherwise returns false.
         * @param {RadialMenuControl} radialMenu The radial-menu control to delete.
         * @returns {boolean} Result.
         */
        function DeleteRadialMenu(radialMenu) {
            var wasDeleted = false;
            var svgInfo = MIL.getSvgInfo(radialMenu.Parent());
            for (var i = 0; svgInfo.radialMenus.length; i++) {
                if (svgInfo.radialMenus[i] === radialMenu) {
                    svgInfo.radialMenus.splice(i, 1);
                    radialMenu.delete();
                    wasDeleted = true;
                    break;
                }
            }
            return (wasDeleted);
        }
        Controls.DeleteRadialMenu = DeleteRadialMenu;
        /**
         *  [Private Method] Ensures that the specified Control is the top-most element in the specified parent <g> element it was created in.
         *  @param {SVGGElement} control The main <g> element of the target control.
         *  @param {SVGGElement} parent The parent <g> element 'control' was created in.
         *  @returns {boolean} True if the menu was brought to the front, false if it was already at the front.
         */
        function bringToFront(control, parent) {
            var wasBroughtToFront = false;
            if ((parent.childNodes.length > 0) && (parent.childNodes[parent.childNodes.length - 1] !== control)) {
                var index = parent.childNodes.length - 1;
                // Skip over any d3.Transition (animation) objects (eg. the <path> elements we add/fade/remove when drawing a 'comet tail')
                while ((index >= 0) && (parent.childNodes[index].__transition !== undefined)) {
                    index--;
                }
                if ((index >= 0) && (parent.childNodes[index] !== control)) {
                    // Note: Calling 'parent.removeChild(control)' is not neded since appendChild() will automatically do a remove [on the current parent] first
                    // TODO: appendChild() causes a flicker on Chrome (but not IE11)
                    parent.appendChild(control);
                    wasBroughtToFront = true;
                }
            }
            return (wasBroughtToFront);
        }
        /**
         * The FrameControl class. Represents an SVG <rect> that visually indicates the edge of the zoomable/pannable area of a root <g> element.
         * Note: DO NOT instantiate this class directly: use the MIL.Controls.Frame() method instead.
         */
        var FrameControl = /** @class */ (function () {
            /**
             * [Internal] Creates a FrameControl instance in the specified gDomElement. Note: Do NOT call this directly - use Controls.Frame() instead.
             * @param {SVGGElement} gDomElement The parent <g> element.
             * @internal
             */
            function FrameControl(gDomElement) {
                this._rect = null;
                this._gDomElement = MIL.Utils.GetDomElement(gDomElement, SVGGElement);
                this._className = "";
                this.redraw(); // PORT: Added [because otherwise the frame will only be drawn if a property (eg. Class) is set]
            }
            FrameControl.prototype.Class = function (className) {
                if (className === undefined) {
                    return (this._className);
                }
                else {
                    this._className = className;
                    this.redraw();
                    return (this);
                }
            };
            /** [Private Method] Redraws the FrameControl instance. */
            FrameControl.prototype.redraw = function () {
                // If needed, create _rect
                if (this._rect === null) {
                    var svgInfo = MIL.getSvgInfo(this._gDomElement);
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
                if (this._className) {
                    this._rect.classed(this._className, true);
                }
                this._rect.node().style.stroke = this._className ? "" : "red";
                this._rect.node().style.strokeWidth = this._className ? "" : "3px";
                this._rect.node().style.fill = this._className ? "" : "transparent";
            };
            return FrameControl;
        }());
        Controls.FrameControl = FrameControl;
        /**
         * The RadialMenuControl class. Represents a radial menu control that's associated with a root <g> element.
         * Note: DO NOT instantiate this class directly: use the MIL.Controls.CreateRadialMenu() method instead.
         */
        var RadialMenuControl = /** @class */ (function () {
            /**
             * [Internal] Creates a RadialMenuControl instance in the specified parent svg. Note: Do NOT call this directly - use Controls.CreateRadialMenu() instead.
             * @param {SVGSVGElement} svg An <svg> element.
             * @param {string} menuName The name of the menu. If null (or empty) a default name will be provided.
             * @param {string} centerImageURL The URL of the image to display at the center of the menu.
             * @param {number} sectorCount The number of sectors (menu item slots). Must be between 2 and 8.
             * @param {number[]} usedSectors The list of sector indexes (0 to sectorCount - 1) that will be used. These do not need to be sequential.
             * @param {string[]} usedSectorImageURLs The list of sector (item) image URLs. Must match the length of the usedSectors list. Note: Images should ideally have a transparent background.
             * @param {string[]} [usedSectorNames] [Optional] The list of sector (item) names. Must match the length of the usedSectors list. Specify null for no names.
             * @param {string[]} [usedSectorTooltipCaptions] [Optional] The list of sector (item) tooltip captions. Must match the length of the usedSectors list. Specify null to use default tooltip captions.
             * @param {number} [tooltipHoverTimeoutInMs] [Optional] The timeout (in milliseconds) before the tooltip is shown (if available) for a hovered-over sector (item) image.
             * @internal
             */
            function RadialMenuControl(svg, menuName, centerImageURL, sectorCount, usedSectors, usedSectorImageURLs, usedSectorNames, usedSectorTooltipCaptions, tooltipHoverTimeoutInMs) {
                var svgDomElement = MIL.Utils.GetDomElement(svg, SVGSVGElement);
                this._svgInfo = MIL.getSvgInfo(svgDomElement);
                this._instanceID = RadialMenuControl.instanceID++;
                this._partNamePrefix = RadialMenuControl.ID_PREFIX.replace("#", this._instanceID.toString());
                this._gRadialMenu = null;
                this._gDomElement = this._svgInfo.gDomElement;
                this.Radius(100); // Sets this._outerRadius and this._innerRadius [but won't cause a redraw because _allowRedraw is still false]
                this._centerPoint = { x: this._outerRadius, y: this._outerRadius };
                this._isVisible = false;
                this._isCollapsed = false;
                this._keepConstantScale = true;
                this._isDeleted = false;
                this._sectorCount = sectorCount;
                this._usedSectors = usedSectors;
                this._usedSectorImageURLs = usedSectorImageURLs;
                this._unusedSectorImageURL = null;
                this._usedSectorNames = usedSectorNames;
                this._usedSectorTooltipCaptions = usedSectorTooltipCaptions;
                this._sectorImages = [];
                this._sectorLines = [];
                this._itemImageSize = -1;
                this._showSectorLines = true;
                this._cometTailClassName = "";
                this._stroke = "gray";
                this._outerCircleFill = "rgba(45, 45, 45, 0.03)";
                this._innerCircleFill = "rgba(5, 5, 5, 0.08)";
                this._onItemSelected = null;
                this._onItemImageHover = null;
                this._tooltipHoverTimeoutInMs = tooltipHoverTimeoutInMs;
                this._centerImageURL = centerImageURL;
                this._isAutoHideEnabled = false;
                this._isAutoCollapseEnabled = true;
                this._selectedItemSectorID = -1;
                this._selectedItemIndicatorColor = this._stroke;
                this._autoCollapseAfterHoverExpandTimeoutInMs = -1; // -1 means no timeout
                this._autoCollapseAfterHoverExpandTimerID = -1;
                this._defaultGesturesAdded = false;
                this._prevMovePoint = null;
                this._allowRedraw = true; // Do this last so that we can use property setters (if needed) without causing a redraw
                this.IsCollapsed(true);
            }
            /** Ensures that the RadialMenuControl is the top-most element in the parent <g> element it was created in. */
            RadialMenuControl.prototype.BringToFront = function () {
                if (bringToFront(this._gRadialMenu.node(), this._gDomElement)) {
                    MIL.log(RadialMenuControl.CONTROL_TYPE + ": Brought to front", MIL.FeatureNames.Controls);
                }
            };
            /**
             * Call before setting multiple RadialMenuControl properties to prevent redrawing after each property setter.
             * @returns {RadialMenuControl} The RadialMenuControl instance.
             */
            RadialMenuControl.prototype.BeginUpdate = function () {
                this._allowRedraw = false;
                return (this);
            };
            /**
             * Call after BeginUpdate() when all desired RadialMenuControl properties have been set.
             * @returns {RadialMenuControl} The RadialMenuControl instance.
             */
            RadialMenuControl.prototype.EndUpdate = function () {
                this._allowRedraw = true;
                this.redraw();
                return (this);
            };
            /** Redraws the RadialMenuControl instance. */
            RadialMenuControl.prototype.Redraw = function () {
                this._allowRedraw = true;
                this.redraw();
            };
            /** [Private Method] Redraws the RadialMenuControl instance, but only if a redraw is needed. */
            RadialMenuControl.prototype.redraw = function () {
                if (this._isDeleted) {
                    throw new MIL.MILException("The operation cannot be performed because the RadialMenuControl has been deleted");
                }
                if (!this._allowRedraw) {
                    return;
                }
                MIL.log(RadialMenuControl.CONTROL_TYPE + ": Redrawing...", MIL.FeatureNames.Controls);
                if (this._gRadialMenu === null) {
                    // Create the distinct parts of the control - but don't do any layout (positioning/sizing/drawing)
                    this._gRadialMenu = d3.select(this._gDomElement).append("g");
                    this._selectedItemImage = this._gRadialMenu.append("image").attr("id", this._partNamePrefix + "SelectedItemImage").style("visibility", "hidden");
                    this._itemTooltipRect = this._gRadialMenu.append("rect").attr("id", this._partNamePrefix + "ItemTooltipRect").style("visibility", "hidden");
                    this._itemTooltipText = this._gRadialMenu.append("text").attr("id", this._partNamePrefix + "ItemTooltipText").style("visibility", "hidden");
                    this._outerCircle = this._gRadialMenu.append("circle").attr("id", this._partNamePrefix + "OuterCircle");
                    this._innerBackgroundCircle = this._gRadialMenu.append("circle").attr("id", this._partNamePrefix + "InnerBackgroundCircle");
                    this._innerImage = this._gRadialMenu.append("image").attr("id", this._partNamePrefix + "InnerImage");
                    this._innerCircle = this._gRadialMenu.append("circle").attr("id", this._partNamePrefix + "InnerCircle"); // Must come AFTER _innerImage/_depthIndicatorPaths, because _innerCircle is a gesture target
                    for (var i = 0; i < this._sectorCount; i++) {
                        var sectorImage = this._gRadialMenu.append("image").attr("id", this._partNamePrefix + "Sector" + i + "Image");
                        this._sectorImages.push(sectorImage);
                        var sectorLine = this._gRadialMenu.append("line").attr("id", this._partNamePrefix + "Sector" + i + "Line");
                        this._sectorLines.push(sectorLine);
                    }
                    this._gRadialMenu.node().__MILIsControl__ = true;
                    // Add the default gestures to the menu
                    this.addDefaultGestures();
                }
                var scaleFactor = this._keepConstantScale ? this._svgInfo.zoomLevel : 1;
                var outerRadius = this._outerRadius / scaleFactor;
                var innerRadius = this._innerRadius / scaleFactor;
                var innerImageSize = Math.sqrt(Math.pow(innerRadius * 2, 2) / 2) * 0.8;
                var strokeWidth = 0.5 / scaleFactor;
                var isOuterCircleContentVisible = !this._isCollapsed && this._isVisible;
                // Draw the outer/inner circles
                this._outerCircle.attr("r", this._isCollapsed ? innerRadius * 1.2 : outerRadius).attr("cx", this._centerPoint.x).attr("cy", this._centerPoint.y).attr("stroke", this._stroke).attr("stroke-width", strokeWidth).attr("fill", this._outerCircleFill);
                this._innerCircle.attr("r", innerRadius).attr("cx", this._centerPoint.x).attr("cy", this._centerPoint.y).attr("stroke", this._stroke).attr("stroke-width", strokeWidth).attr("fill", "transparent"); // Note: MUST use "transparent" fill
                this._innerBackgroundCircle.attr("r", innerRadius).attr("cx", this._centerPoint.x).attr("cy", this._centerPoint.y).attr("stroke", this._stroke).attr("stroke-width", strokeWidth).attr("fill", this._innerCircleFill);
                this._innerImage.attr("width", innerImageSize).attr("height", innerImageSize).attr("x", this._centerPoint.x - (innerImageSize / 2)).attr("y", this._centerPoint.y - (innerImageSize / 2)).attr("href", this._centerImageURL);
                // Draw the sector (item) images
                var imageCenterRadius = innerRadius + ((outerRadius - innerRadius) / 2);
                var imageWidth = Math.round((outerRadius - innerRadius) * 0.50); // Rounding to try to avoid visual clipping artifacts
                for (var i = 0; i < this._sectorCount; i++) {
                    var usedSectorIndex = this._usedSectors.indexOf(i);
                    var isUsedSector = (usedSectorIndex !== -1);
                    var imageURL = isUsedSector ? this._usedSectorImageURLs[usedSectorIndex] : this._unusedSectorImageURL; // Note: _unusedSectorImageURL can be null, in which case no image will be rendered
                    var sectorCenter = MIL.Utils.GetPointOnCircle((360 / this._sectorCount) * i, imageCenterRadius, this._centerPoint);
                    this._sectorImages[i].attr("width", imageWidth).attr("height", imageWidth).attr("x", sectorCenter.x - (imageWidth / 2)).attr("y", sectorCenter.y - (imageWidth / 2)).attr("href", imageURL).attr("opacity", isUsedSector ? 1 : 0.4);
                    this._sectorImages[i].style("visibility", isOuterCircleContentVisible ? "visible" : "hidden");
                }
                this._itemImageSize = imageWidth;
                var sectorAngleInDegrees = 360 / this._sectorCount;
                var angle;
                var indicatorRadius;
                var startPoint;
                var endPoint;
                var d;
                // Optionally, draw the sector-delimiter lines
                for (var i = 0; i < this._sectorCount; i++) {
                    angle = (sectorAngleInDegrees * i) - (sectorAngleInDegrees / 2); // Adjust by 1/2 sector
                    var beginLinePoint = MIL.Utils.GetPointOnCircle(angle, outerRadius * 0.875, this._centerPoint);
                    var endLinePoint = MIL.Utils.GetPointOnCircle(angle, outerRadius, this._centerPoint);
                    this._sectorLines[i].attr("x1", beginLinePoint.x).attr("y1", beginLinePoint.y).attr("x2", endLinePoint.x).attr("y2", endLinePoint.y).attr("stroke", this._stroke).attr("stroke-width", strokeWidth / 2);
                    this._sectorLines[i].style("visibility", (isOuterCircleContentVisible && this._showSectorLines) ? "visible" : "hidden");
                }
                // Draw selected item indicator (if any)
                for (var i = 0; i < this._sectorCount; i++) {
                    var marginInDegrees = 3; // The "margin" at each end of the indicator
                    angle = (sectorAngleInDegrees * i) + marginInDegrees - (sectorAngleInDegrees / 2); // Adjust by 1/2 sector
                    indicatorRadius = outerRadius * 0.97;
                    startPoint = MIL.Utils.GetPointOnCircle(angle, indicatorRadius, this._centerPoint);
                    endPoint = MIL.Utils.GetPointOnCircle(angle + sectorAngleInDegrees - (marginInDegrees * 2), indicatorRadius, this._centerPoint);
                    d = "M " + startPoint.x + " " + startPoint.y + " A " + indicatorRadius + " " + indicatorRadius + " 0 0 1 " + endPoint.x + " " + endPoint.y;
                }
                // Note: We use 'visibility' (not 'display') so that we can still get the position/dimensions of the RadialMenuControl when it's not shown
                this._gRadialMenu.style("visibility", this._isVisible ? "visible" : "hidden");
                this.BringToFront();
            };
            /** [Private Method] Adds the default Gestures (Move, Tap, Swipe, Hover, etc.) to the RadialMenuControl instance. */
            RadialMenuControl.prototype.addDefaultGestures = function () {
                if (this._defaultGesturesAdded) {
                    return;
                }
                this._defaultGesturesAdded = true;
                var radialMenu = this;
                // Expand menu (with hover)
                MIL.AddGesture(MIL.CreateGesture("DefaultRadialMenuCenterHover*", true)
                    .Target(radialMenu._innerCircle)
                    .PointerType("Hover")
                    .GestureStartedHandler(function () {
                    if (radialMenu.IsCollapsed()) {
                        radialMenu.IsCollapsed(false);
                        // Optionally, collapse again after a timeout
                        if (radialMenu._autoCollapseAfterHoverExpandTimeoutInMs !== -1) {
                            if (this._autoCollapseAfterHoverExpandTimerID !== -1) {
                                clearTimeout(this._autoCollapseAfterHoverExpandTimerID);
                            }
                            radialMenu._autoCollapseAfterHoverExpandTimerID = setTimeout(function () {
                                radialMenu.IsCollapsed(true);
                            }, radialMenu._autoCollapseAfterHoverExpandTimeoutInMs);
                        }
                    }
                }));
                MIL.SetElementHoverTimeoutInMs(radialMenu._innerCircle, 333);
                // Radial swipe
                var scaleFactor = this._keepConstantScale ? this._svgInfo.zoomLevel : 1;
                var innerRadius = this._innerRadius / scaleFactor;
                MIL.AddGesture(MIL.BuiltInGestures.RadialSwipe("DefaultRadialMenuSwipe*", radialMenu._innerCircle, "pen", radialMenu._sectorCount, innerRadius, function onSwipe(swipeResult) {
                    var gesture = this;
                    if (swipeResult) {
                        var usedSectorIndex = radialMenu._usedSectors.indexOf(swipeResult.segmentID);
                        if (usedSectorIndex !== -1) {
                            var previousSectorID = radialMenu._selectedItemSectorID;
                            radialMenu._selectedItemSectorID = swipeResult.segmentID;
                            if (radialMenu._isAutoCollapseEnabled && !radialMenu._isCollapsed) {
                                radialMenu.IsCollapsed(true); // Note: This causes a redraw
                            }
                            else {
                                radialMenu.Redraw(); // Force a redraw to update the selected item indicator
                            }
                            if (radialMenu._isAutoHideEnabled) {
                                radialMenu.Hide(500);
                            }
                            // Animate _selectedItemImage (fade out)
                            var itemImage = radialMenu._sectorImages[swipeResult.segmentID];
                            var originImage_1 = radialMenu._isCollapsed ? radialMenu._innerImage : itemImage;
                            radialMenu._selectedItemImage.attr("href", itemImage.attr("href")).style("visibility", "visible");
                            radialMenu._selectedItemImage.attr("width", originImage_1.attr("width")).attr("height", originImage_1.attr("height"));
                            radialMenu._selectedItemImage.attr("x", originImage_1.attr("x")).attr("y", originImage_1.attr("y"));
                            radialMenu._selectedItemImage.transition()
                                .duration(1000)
                                .ease(d3.easeExpOut)
                                .tween("AnimatePosition", function animatePosition() {
                                var destinationRadius = MIL.Utils.ToNumber(radialMenu._outerCircle.attr("r")) + (MIL.Utils.ToNumber(originImage_1.attr("width")) * 1.5);
                                var destinationPoint = MIL.Utils.GetPointOnCircle(swipeResult.heading, destinationRadius, radialMenu._centerPoint);
                                var endX = destinationPoint.x - (MIL.Utils.ToNumber(originImage_1.attr("width")) / 2);
                                var endY = destinationPoint.y - (MIL.Utils.ToNumber(originImage_1.attr("height")) / 2);
                                var startX = endX;
                                var startY = endY;
                                var interpolateX = d3.interpolateNumber(startX, endX);
                                var interpolateY = d3.interpolateNumber(startY, endY);
                                return (function onAnimationTick(t) {
                                    radialMenu._selectedItemImage.attr("x", interpolateX(t));
                                    radialMenu._selectedItemImage.attr("y", interpolateY(t));
                                });
                            })
                                .styleTween("opacity", function () { return d3.interpolate("1", "0"); })
                                .on("end", function () { radialMenu._selectedItemImage.style("visibility", "hidden"); });
                            // Invoke the event handler
                            if (radialMenu._onItemSelected !== null) {
                                var sectorName = (radialMenu._usedSectorNames !== null) ? radialMenu._usedSectorNames[usedSectorIndex] : null;
                                radialMenu._onItemSelected.call(radialMenu, { sectorName: sectorName, sectorID: swipeResult.segmentID, previousSectorID: previousSectorID });
                            }
                        }
                    }
                }, function () { return (radialMenu._cometTailClassName); }).Conditional(function () { return (MIL.PenButtons(MIL.ThisGesture(this).Target()) === MIL.PenButton.None); }));
                // "Ignored" draw on outerCircle [to prevent event propagation to the <svg>]
                MIL.AddGesture(MIL.CreateGesture("DefaultRadialMenuIgnoredDraw*", true)
                    .Target(radialMenu._outerCircle)
                    .PointerType("pen|touch|mouse"));
                // Move
                MIL.AddGesture(MIL.CreateGesture("DefaultRadialMenuMove*", true)
                    .Target(radialMenu._innerCircle)
                    .PointerType("touch")
                    .Conditional(function () { return (MIL.Utils.IsNoKeyPressed()); })
                    .GestureStartedHandler(function () {
                    var gesture = this;
                    gesture.OnMoveHandler(function onRadialMenuMove(e) {
                        var newMovePoint = gesture.GetCurrentSvgPoint("{P1}");
                        if (radialMenu._prevMovePoint !== null) {
                            var deltaX = newMovePoint.x - radialMenu._prevMovePoint.x;
                            var deltaY = newMovePoint.y - radialMenu._prevMovePoint.y;
                            var newCenterPoint = { x: radialMenu.CenterPoint().x + deltaX, y: radialMenu.CenterPoint().y + deltaY };
                            radialMenu.CenterPoint(newCenterPoint);
                        }
                        radialMenu._prevMovePoint = newMovePoint;
                    });
                })
                    .GestureEndedHandler(function () {
                    radialMenu._prevMovePoint = null;
                }));
                var _loop_3 = function (i) {
                    var itemImage = radialMenu._sectorImages[i];
                    MIL.AddGesture(MIL.CreateGesture("DefaultRadialMenuItemHover*", true)
                        .Target(itemImage)
                        .PointerType("Hover")
                        .GestureStartedHandler(function () {
                        var sectorID = i;
                        var usedSectorIndex = radialMenu._usedSectors.indexOf(sectorID);
                        if (usedSectorIndex === -1) {
                            return;
                        }
                        var itemName = (radialMenu._usedSectorNames !== null) ? radialMenu._usedSectorNames[usedSectorIndex] : "";
                        var itemTooltipCaption = "";
                        if ((radialMenu._usedSectorTooltipCaptions !== null) && (radialMenu._usedSectorTooltipCaptions[usedSectorIndex] !== null)) {
                            itemTooltipCaption = radialMenu._usedSectorTooltipCaptions[usedSectorIndex];
                        }
                        else {
                            if (!itemName) // null or ""
                             {
                                itemName = "Item #" + (usedSectorIndex + 1);
                            }
                        }
                        if (itemTooltipCaption === "") {
                            // The user doesn't want a tooltip
                            return;
                        }
                        // Set text and position of the tooltip, then show it
                        var scaleFactor = radialMenu._keepConstantScale ? radialMenu._svgInfo.zoomLevel : 1;
                        var outerRadius = radialMenu._outerRadius / scaleFactor;
                        var textElement = radialMenu._itemTooltipText.node();
                        // First, set the attributes of the text that will affect the size of its bounding box
                        textElement.textContent = itemTooltipCaption;
                        radialMenu._itemTooltipText
                            .style("font-family", "Segoe UI")
                            .style("font-size", (13 / scaleFactor) + "px");
                        // Center the text above the menu (so that it's never occluded, although it may end up off-screen)
                        var boundingBox = textElement.getBBox();
                        var charTrimCount = 1;
                        while (boundingBox.width > outerRadius * 2.5) {
                            // The caption is too long, so trim it (using "TextTrimming.CharacterEllipsis")
                            textElement.textContent = itemTooltipCaption.slice(0, -charTrimCount++).trim() + "...";
                            boundingBox = textElement.getBBox();
                        }
                        var textWidth = boundingBox.width; // Alternative: textElement.getComputedTextLength();
                        var textX = radialMenu._centerPoint.x - (textWidth / 2);
                        var textY = radialMenu._centerPoint.y - (outerRadius * 1.2);
                        var marginX = 7;
                        var marginY = 2;
                        radialMenu._itemTooltipText
                            .attr("x", textX)
                            .attr("y", textY) // Note: This refers to the bottom of the text, not the top
                            .style("fill", "white") // Because the background (_itemTooltipRect) is always a translucent black
                            .style("visibility", "visible");
                        radialMenu._itemTooltipRect
                            .attr("x", textX - marginX)
                            .attr("y", textY - marginY - (boundingBox.height * 0.75))
                            .attr("rx", 3)
                            .attr("ry", 3)
                            .attr("width", textWidth + (marginX * 2))
                            .attr("height", boundingBox.height + (marginY * 2))
                            .attr("fill", "rgba(0, 0, 0, 0.55)") // Translucent black
                            .style("visibility", "visible");
                        // Invoke the event handler
                        if (radialMenu._onItemImageHover) {
                            var sectorName = (radialMenu._usedSectorNames !== null) ? radialMenu._usedSectorNames[usedSectorIndex] : null;
                            var imageURL = radialMenu._usedSectorImageURLs[usedSectorIndex];
                            radialMenu._onItemImageHover.call(radialMenu, { hoverStarted: true, sectorName: sectorName, sectorID: sectorID, imageURL: imageURL });
                        }
                    })
                        .GestureEndedHandler(function () {
                        radialMenu._itemTooltipRect.style("visibility", "hidden");
                        radialMenu._itemTooltipText.style("visibility", "hidden");
                        // Invoke the event handler
                        if (radialMenu._onItemImageHover) {
                            var sectorID = i;
                            var usedSectorIndex = radialMenu._usedSectors.indexOf(sectorID);
                            var sectorName = (radialMenu._usedSectorNames !== null) ? radialMenu._usedSectorNames[usedSectorIndex] : null;
                            var imageURL = radialMenu._usedSectorImageURLs[usedSectorIndex];
                            radialMenu._onItemImageHover.call(radialMenu, { hoverStarted: false, sectorName: sectorName, sectorID: sectorID, imageURL: imageURL });
                        }
                    }));
                    MIL.SetElementHoverTimeoutInMs(itemImage, radialMenu._tooltipHoverTimeoutInMs);
                };
                // Hover (over [all] sector images) to show tooltip text (if available)
                for (var i = 0; i < radialMenu._sectorCount; i++) {
                    _loop_3(i);
                }
                // "Ignored" draw (on any sector image) [to prevent event propagation to the <svg>]
                for (var i = 0; i < radialMenu._sectorCount; i++) {
                    var image = radialMenu._sectorImages[i];
                    MIL.AddGesture(MIL.CreateGesture("DefaultRadialMenuItemIgnoredDraw*", true)
                        .Target(image)
                        .PointerType("pen|touch|mouse"));
                }
            };
            /** Removes the default Gestures from the RadialMenuControl instance. This allows the control to be completely "re-skinned" with new gestures. */
            RadialMenuControl.prototype.RemoveDefaultGestures = function () {
                if (!this._defaultGesturesAdded) {
                    return;
                }
                this._defaultGesturesAdded = false;
                // Move
                MIL.RemoveGesturesByTarget(this._innerCircle, "DefaultRadialMenu");
                // "Ignored" draw
                MIL.RemoveGesturesByTarget(this._outerCircle, "DefaultRadialMenu");
                // Sector image gestures
                for (var i = 0; i < this._sectorCount; i++) {
                    var image = this._sectorImages[i];
                    MIL.RemoveGesturesByTarget(image, "DefaultRadialMenu");
                }
            };
            /**
             * [Internal] Logically deletes the RadialMenuControl and removes it from the DOM.
             * @internal
             */
            RadialMenuControl.prototype.delete = function () {
                if (!this._isDeleted) {
                    this._gRadialMenu.remove();
                    this._isDeleted = true;
                }
            };
            /**
             * Animates the radial-menu to full opacity (if it's not currently visible).
             * @param {number} [durationInMs] [Optional] How long the animation should take (in milliseceonds).
             */
            RadialMenuControl.prototype.Show = function (durationInMs) {
                if (durationInMs === void 0) { durationInMs = 300; }
                var currentOpacity = (this._gRadialMenu.style("opacity") === null) ? 1 : MIL.Utils.ToNumber(this._gRadialMenu.style("opacity"));
                if ((currentOpacity !== 1) || !this.IsVisible()) {
                    this._gRadialMenu.attr("opacity", (currentOpacity === 1) ? 0 : currentOpacity);
                    this.IsVisible(true);
                    MIL.Utils.Fade(this._gRadialMenu, durationInMs, null, null, true);
                }
            };
            /**
             * Animates the radial-menu to transparent (if it's currently visible).
             * @param {number} [durationInMs] [Optional] How long the animation should take (in milliseceonds).
             * @param {function(): void} [onHideComplete] [Optional] An action to perform after Hide completes.
             */
            RadialMenuControl.prototype.Hide = function (durationInMs, onHideComplete) {
                if (durationInMs === void 0) { durationInMs = 300; }
                if (onHideComplete === void 0) { onHideComplete = null; }
                var radialMenu = this;
                var currentOpacity = (this._gRadialMenu.style("opacity") === null) ? 1 : MIL.Utils.ToNumber(this._gRadialMenu.style("opacity"));
                if ((currentOpacity !== 0) && this.IsVisible()) {
                    MIL.Utils.Fade(this._gRadialMenu, durationInMs, null, function () {
                        radialMenu.IsVisible(false);
                        if (onHideComplete !== null) {
                            onHideComplete.call(radialMenu);
                        }
                    });
                }
            };
            /**
             * Clears the current selected item indicator (if any), optionally using a fade effect.
             * Note: This method will NOT invoke the ItemSelectedHandler().
             * @param {number} fadeTimeoutInMs A timeout (in milliseconds). Omit (or specify -1) for no fade effect.
             * @returns {RadialMenuControl} The RadialMenuControl instance.
             */
            RadialMenuControl.prototype.ClearSelectedItemIndicator = function (fadeTimeoutInMs) {
                if (fadeTimeoutInMs === void 0) { fadeTimeoutInMs = -1; }
                if (this._selectedItemSectorID !== -1) {
                    if (fadeTimeoutInMs === 0) {
                        this._selectedItemSectorID = -1;
                        this.redraw();
                    }
                    else {
                        var radialMenu = this;
                        var selectedItemSectorID = this._selectedItemSectorID;
                    }
                }
                return (this);
            };
            /**
             * Sets the current selected item indicator. To clear the indicator, use ClearSelectedItemIndicator().
             * Note: This method will NOT invoke the ItemSelectedHandler().
             * @param {number} sectorID The ID of the sector to update.
             * @returns {RadialMenuControl} The RadialMenuControl instance.
             */
            RadialMenuControl.prototype.SetSelectedItemIndicator = function (sectorID) {
                var isUsedSector = (this._usedSectors.indexOf(sectorID) !== -1);
                if (isUsedSector) {
                    this._selectedItemSectorID = sectorID;
                    this.redraw();
                    return (this);
                }
            };
            /**
             * Updates the image/name/tooltip of the specified sector (item) in the specified menu level.
             * @param {number} sectorID The ID of the sector to update.
             * @param {string} [imageURL] [Optional] The updated item image URL. Use undefined to retain the existing value.
             * @param {string} [name] [Optional] The updated item name (can be null). Use undefined to retain the existing value.
             * @param {string} [tooltipCaption] [Optional] The updated item tooltip caption (can be null). Use undefined to retain the existing value.
             * @returns {RadialMenuControl} The RadialMenuControl instance.
             */
            RadialMenuControl.prototype.UpdateItem = function (sectorID, imageURL, name, tooltipCaption) {
                return (this);
            };
            /**
             * [ReadOnly Property] The <svg> that the RadialMenuControl belongs to.
             * @returns {SVGSVGElement} Result.
             */
            RadialMenuControl.prototype.Parent = function () {
                MIL.readOnlyProperty("Parent", arguments);
                return (this._svgInfo.svgDomElement);
            };
            /**
             * [ReadOnly Property] Returns the sector ID (0 to sectorCount - 1) of the currently selected item, or -1 if no item is currently selected.
             * @returns {number} Result.
             */
            RadialMenuControl.prototype.SelectedItemSectorID = function () {
                MIL.readOnlyProperty("SelectedItemSectorID", arguments);
                return (this._selectedItemSectorID);
            };
            RadialMenuControl.prototype.SelectedItemIndicatorColor = function (color) {
                var _this = this;
                return (MIL.getOrSetProperty(this, MIL.nameof(function () { return _this._selectedItemIndicatorColor; }), color, function () { return _this.redraw(); }));
            };
            /**
             * [ReadOnly Property] Returns the timeout (in milliseconds) before the tooltip is shown (if available) for a hovered-over item image. Set via CreateRadialMenu().
             * @returns {number} Result.
             */
            RadialMenuControl.prototype.TooltipHoverTimeoutInMs = function () {
                MIL.readOnlyProperty("TooltipHoverTimeoutInMs", arguments);
                return (this._tooltipHoverTimeoutInMs);
            };
            /**
             * [ReadOnly Property] Returns the preferred "native" (ie. to avoid scaling) height/width of the item (sector) image. Will vary with the value of Radius().
             * @returns {number} Result.
             */
            RadialMenuControl.prototype.ItemImageSize = function () {
                MIL.readOnlyProperty("ItemImageSize", arguments);
                return (this._itemImageSize);
            };
            RadialMenuControl.prototype.CenterImageURL = function (imageURL) {
                var _this = this;
                return (MIL.getOrSetProperty(this, MIL.nameof(function () { return _this._centerImageURL; }), imageURL, function () { return _this.redraw(); }));
            };
            RadialMenuControl.prototype.UnusedSectorImageURL = function (imageURL) {
                var _this = this;
                return (MIL.getOrSetProperty(this, MIL.nameof(function () { return _this._unusedSectorImageURL; }), imageURL, function () { return _this.redraw(); }));
            };
            RadialMenuControl.prototype.KeepConstantScale = function (enable) {
                var _this = this;
                return (MIL.getOrSetProperty(this, MIL.nameof(function () { return _this._keepConstantScale; }), enable, function () { return _this.redraw(); }));
            };
            RadialMenuControl.prototype.IsVisible = function (visible) {
                var _this = this;
                return (MIL.getOrSetProperty(this, MIL.nameof(function () { return _this._isVisible; }), visible, function () { return _this.redraw(); }));
            };
            RadialMenuControl.prototype.IsCollapsed = function (collapsed) {
                var _this = this;
                return (MIL.getOrSetProperty(this, MIL.nameof(function () { return _this._isCollapsed; }), collapsed, function () {
                    if (_this._isCollapsed && (_this._autoCollapseAfterHoverExpandTimerID !== -1)) {
                        clearTimeout(_this._autoCollapseAfterHoverExpandTimerID);
                        _this._autoCollapseAfterHoverExpandTimerID = -1;
                    }
                    _this.redraw();
                }));
            };
            RadialMenuControl.prototype.AutoHideOnSelect = function (enable) {
                var _this = this;
                return (MIL.getOrSetProperty(this, MIL.nameof(function () { return _this._isAutoHideEnabled; }), enable));
            };
            RadialMenuControl.prototype.AutoCollapseOnSelect = function (enable) {
                var _this = this;
                return (MIL.getOrSetProperty(this, MIL.nameof(function () { return _this._isAutoCollapseEnabled; }), enable));
            };
            RadialMenuControl.prototype.AutoCollapseAfterHoverExpandTimeoutInMs = function (timeout) {
                var _this = this;
                if (timeout !== undefined) {
                    timeout = Math.max(-1, timeout);
                    if (timeout !== -1) {
                        timeout = Math.max(500, Math.min(8000, timeout));
                    }
                }
                return (MIL.getOrSetProperty(this, MIL.nameof(function () { return _this._autoCollapseAfterHoverExpandTimeoutInMs; }), timeout));
            };
            RadialMenuControl.prototype.CenterPoint = function (point) {
                var _this = this;
                return (MIL.getOrSetProperty(this, MIL.nameof(function () { return _this._centerPoint; }), point, function () { return _this.redraw(); }));
            };
            RadialMenuControl.prototype.Radius = function (radiusInPx) {
                if (radiusInPx === undefined) {
                    return (this._outerRadius);
                }
                else {
                    this._outerRadius = Math.max(RadialMenuControl.MIN_RADIUS, radiusInPx);
                    this._innerRadius = this._outerRadius / 3.333;
                    this.redraw();
                    return (this);
                }
            };
            RadialMenuControl.prototype.ShowSectorLines = function (showLines) {
                var _this = this;
                return (MIL.getOrSetProperty(this, MIL.nameof(function () { return _this._showSectorLines; }), showLines, function () { return _this.redraw(); }));
            };
            RadialMenuControl.prototype.CometTailClass = function (className) {
                var _this = this;
                return (MIL.getOrSetProperty(this, MIL.nameof(function () { return _this._cometTailClassName; }), className));
            };
            RadialMenuControl.prototype.ItemSelectedHandler = function (handler) {
                var _this = this;
                return (MIL.getOrSetProperty(this, MIL.nameof(function () { return _this._onItemSelected; }), handler));
            };
            RadialMenuControl.prototype.ItemImageHoverHandler = function (handler) {
                var _this = this;
                return (MIL.getOrSetProperty(this, MIL.nameof(function () { return _this._onItemImageHover; }), handler));
            };
            RadialMenuControl.prototype.LineColor = function (color) {
                var _this = this;
                return (MIL.getOrSetProperty(this, MIL.nameof(function () { return _this._stroke; }), color, function () { return _this.redraw; }));
            };
            RadialMenuControl.prototype.OuterCircleFill = function (color) {
                var _this = this;
                return (MIL.getOrSetProperty(this, MIL.nameof(function () { return _this._outerCircleFill; }), color, function () { return _this.redraw; }));
            };
            RadialMenuControl.prototype.InnerCircleFill = function (color) {
                var _this = this;
                return (MIL.getOrSetProperty(this, MIL.nameof(function () { return _this._innerCircleFill; }), color, function () { return _this.redraw; }));
            };
            RadialMenuControl.CONTROL_TYPE = "RadialMenuControl";
            RadialMenuControl.instanceID = 1; // Since we can have many radial-menu controls, we give each a unique ID
            RadialMenuControl.ID_PREFIX = "radialMenu#Part_";
            RadialMenuControl.MIN_RADIUS = 50; // In pixels
            return RadialMenuControl;
        }());
        Controls.RadialMenuControl = RadialMenuControl;
        /**
         * The RulerControl class. Represents a virtual ruler control that's associated with a root <g> element.
         * Note: DO NOT instantiate this class directly: use the MIL.Controls.Ruler() method instead.
         */
        var RulerControl = /** @class */ (function () {
            /**
             * [Internal] Creates a RulerControl instance in the specified gDomElement. Note: Do NOT call this directly - use Controls.Ruler() instead.
             * @param {SVGGElement} gDomElement The parent <g> element.
             * @internal
             */
            function RulerControl(gDomElement) {
                this.TOOLBAR_ITEM_WIDTH = 30; // [_height * 0.3] We'll adjust this in Height(), which is why it isn't 'readonly'
                this._gRuler = null;
                this._outlinePath = null;
                this._toolbarPath = null;
                this._selectionIndicatorPath = null;
                this._centerCirclePath = null;
                this._gDomElement = MIL.Utils.GetDomElement(gDomElement, SVGGElement);
                this._allowRedraw = true;
                this._width = 0;
                this._height = 100;
                this._bigTickCount = 0;
                this._littleTickCount = 0;
                this._className = "";
                this._strokeWidth = 0.5;
                this._centerPoint = { x: 0, y: 0 };
                this._rotationAngle = 90;
                this._keepConstantScale = true;
                this._isResizable = true;
                this._toolbarItemCount = 0;
                this._toolbarItemSelectedColor = "WhiteSmoke";
                this._toolbarItemStyler = null;
                this._selectedToolbarItemNumber = -1;
                this._onToolbarSelectionChanged = null;
                this._isVisible = false;
                this._faceEdgeStartPoint = null;
                this._faceEdgeEndPoint = null;
                this._centerLineStartPoint = null; // [x,y]
                this._centerLineEndPoint = null; // [x,y]
                this._toolbarWidth = 0;
                this._defaultMoveGesture = null;
                this._defaultRotateAndMoveGesture = null;
                this._defaultTapGesture = null;
                this._defaultToolbarTapGesture = null;
                this._prevMovePoint = null;
                this._oneTouchRotationInProgress = false;
                this._rulerResizeInProgress = false;
                this._rulerResizeStartDistance = 0;
                this._rulerResizeStartWidth = 0;
                this._rotateStartPointPointerType = null;
                this._rotateEndPointPointerType = null;
            }
            /**
             * Call before setting multiple RulerControl properties to prevent redrawing after each property setter.
             * @returns {RulerControl} The RulerControl instance.
             */
            RulerControl.prototype.BeginUpdate = function () {
                this._allowRedraw = false;
                return (this);
            };
            /**
             * Call after BeginUpdate() when all desired RulerControl properties have been set.
             * @returns {RulerControl} The RulerControl instance.
             */
            RulerControl.prototype.EndUpdate = function () {
                this._allowRedraw = true;
                this.redraw();
                return (this);
            };
            /** Redraws the RulerControl instance. */
            RulerControl.prototype.Redraw = function () {
                this._allowRedraw = true;
                this.redraw();
            };
            /** [Private Method] Redraws the RulerControl instance, but only if a redraw is needed. */
            RulerControl.prototype.redraw = function () {
                if (!this._allowRedraw) {
                    return;
                }
                MIL.log(RulerControl.CONTROL_TYPE + ": Redrawing...", MIL.FeatureNames.Controls);
                if (this._gRuler === null) {
                    var prefix = RulerControl.ID_PREFIX;
                    this._gRuler = d3.select(this._gDomElement).append("g");
                    this._centerCirclePath = this._gRuler.append("path").attr("id", prefix + "CenterCircle"); // We add this first so that it's behind _outlinePath and therefore isn't a hit-target
                    this._zoomLevelText = this._gRuler.append("text").attr("font-family", "Segoe UI").attr("id", prefix + "ZoomLevelText"); // This must be behind _outlinePath too
                    this._outlinePath = this._gRuler.append("path").attr("id", prefix + "Outline");
                    this._selectionIndicatorPath = this._gRuler.append("path").attr("id", prefix + "SelectionIndicator"); // This must be behind _toolbarPath
                    this._toolbarPath = this._gRuler.append("path").attr("id", prefix + "Toolbar");
                    this._gRuler.node().__MILIsControl__ = true;
                    this.addDefaultGestures();
                }
                var pathPointsCollection = [];
                var pathPoints = [];
                var d = "";
                // Optionally, scale the height and width to compensate for the zoom level (ie. make the ruler be constant-sized on the screen, regardless of the zoom level)
                var svgInfo = MIL.getSvgInfo(this._gDomElement);
                var scaleFactor = this._keepConstantScale ? svgInfo.zoomLevel : 1;
                var rulerWidth = this._width / scaleFactor;
                var rulerHeight = this._height / scaleFactor;
                // These are all relative (to [0,0]) coordinates
                pathPointsCollection.push([[0, 0], [rulerWidth, 0], [rulerWidth, rulerHeight], [0, rulerHeight], [0, 0]]);
                // Add hash marks
                var bigTickHeight = rulerHeight / 4;
                var littleTickHeight = bigTickHeight / 2;
                if (this._bigTickCount > 0) {
                    var bigTickInterval = rulerWidth / this._bigTickCount;
                    var littleTickInterval = bigTickInterval / this._littleTickCount;
                    for (var bigTick = 0; bigTick < this._bigTickCount; bigTick++) {
                        if (bigTick > 0) {
                            var x = bigTickInterval * bigTick;
                            pathPointsCollection.push([[x, 0], [x, bigTickHeight]]);
                        }
                        if (this._littleTickCount > 0) {
                            for (var littleTick = 1; littleTick < this._littleTickCount; littleTick++) {
                                var x = (bigTickInterval * bigTick) + (littleTickInterval * littleTick);
                                pathPointsCollection.push([[x, 0], [x, littleTickHeight]]);
                            }
                        }
                    }
                }
                // Add the "rotation/resize region" delimiting markers
                pathPointsCollection.push([[rulerWidth * RulerControl.RULER_ENDS_TARGET_REGION_WIDTH_RATIO, rulerHeight * 0.9], [rulerWidth * RulerControl.RULER_ENDS_TARGET_REGION_WIDTH_RATIO, rulerHeight]]);
                pathPointsCollection.push([[rulerWidth * (1 - RulerControl.RULER_ENDS_TARGET_REGION_WIDTH_RATIO), rulerHeight * 0.9], [rulerWidth * (1 - RulerControl.RULER_ENDS_TARGET_REGION_WIDTH_RATIO), rulerHeight]]);
                if (this._isResizable) {
                    // Add "grippers" at each end (for resizing)
                    var gripperLineHeight = rulerHeight / 6;
                    var gripperLineSpacing = gripperLineHeight / 3.5;
                    for (var gripperLine = 0; gripperLine < 3; gripperLine++) {
                        var x = (gripperLineSpacing * 4) + (gripperLineSpacing * gripperLine);
                        var y = littleTickHeight + ((rulerHeight - littleTickHeight - gripperLineHeight) / 2);
                        pathPointsCollection.push([[x, y], [x, y + gripperLineHeight]]);
                        pathPointsCollection.push([[rulerWidth - x, y], [rulerWidth - x, y + gripperLineHeight]]);
                    }
                }
                // Prepare the path data
                for (var c = 0; c < pathPointsCollection.length; c++) {
                    pathPoints = pathPointsCollection[c];
                    for (var i = 0; i < pathPoints.length; i++) {
                        // Transform from relative to absolute (svg) coordinates
                        pathPoints[i] = [
                            pathPoints[i][0] + this._centerPoint.x - (rulerWidth / 2),
                            pathPoints[i][1] + this._centerPoint.y - (rulerHeight / 2)
                        ];
                        d += ((i === 0) ? " M " : " L ") + pathPoints[i][0] + " " + pathPoints[i][1];
                    }
                    if (c === 0) {
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
                // Draw the toolbar (relative to _centerPoint to keep its position on the ruler fixed, ie. not changing if the ruler is resized)
                if ((this._toolbarItemCount > 0) && (this._centerPoint.x !== 0)) {
                    var toolbarPathData = "";
                    pathPointsCollection.length = 0;
                    this._toolbarWidth = tbWidth;
                    // Add left/top/right edges of toolbar
                    pathPointsCollection.push([[tbStartX, tbStartY + tbHeight], [tbStartX, tbStartY], [tbStartX + tbWidth, tbStartY], [tbStartX + tbWidth, tbStartY + tbHeight]]);
                    // Add toolbar item dividers
                    for (var i = 1; i < this._toolbarItemCount; i++) {
                        var x = tbStartX + (tbItemWidth * i);
                        pathPointsCollection.push([[x, tbStartY], [x, tbStartY + tbHeight]]);
                    }
                    // Position selection indicator
                    if (this._selectedToolbarItemNumber !== -1) {
                        var indicatorStartX = tbStartX + (tbItemWidth * this._selectedToolbarItemNumber);
                        var indicatorStartY = tbStartY;
                        var indicatorPathData = "M 0 0 L " + tbItemWidth + " 0 L " + tbItemWidth + " " + tbItemHeight + " L 0 " + tbItemHeight + " Z";
                        this._selectionIndicatorPath
                            .attr("d", MIL.Utils.TranslatePathData(indicatorPathData, indicatorStartX, indicatorStartY, 1))
                            .style("fill", this._toolbarItemSelectedColor);
                    }
                    this._selectionIndicatorPath.attr("display", ((this._selectedToolbarItemNumber !== -1) && this._isVisible) ? "inline" : "none");
                    // Prepare the path data
                    for (var c = 0; c < pathPointsCollection.length; c++) {
                        pathPoints = pathPointsCollection[c];
                        for (var i = 0; i < pathPoints.length; i++) {
                            toolbarPathData += ((i === 0) ? " M " : " L ") + pathPoints[i][0] + " " + pathPoints[i][1];
                        }
                    }
                    this._toolbarPath.attr("d", toolbarPathData);
                    this.applyStyle(this._toolbarPath, scaleFactor, "transparent");
                    // Position toolbar items [which were added by RulerControl.ToolbarItemCount()]
                    var toolbarItemPaths = this._gRuler.selectAll("path").filter(function () {
                        return (this.getAttribute("id").indexOf(RulerControl.ID_PREFIX + "ToolbarItem") === 0);
                    });
                    for (var t = 0; t < toolbarItemPaths.size(); t++) {
                        var itemPath = toolbarItemPaths.nodes()[t];
                        // Transform from relative to absolute (svg) coordinates
                        var dx = tbStartX + (t * tbItemWidth) + (RulerControl.TOOLBAR_ITEM_MARGIN / scaleFactor);
                        var dy = tbStartY + (RulerControl.TOOLBAR_ITEM_MARGIN / scaleFactor);
                        d = MIL.Utils.TranslatePathData(itemPath.__MILOriginalD__, dx, dy, scaleFactor);
                        itemPath.setAttribute("d", d);
                        itemPath.style.strokeWidth = (itemPath.__MILOriginalStrokeWidth__ / scaleFactor) + "px";
                    }
                }
                if (this._centerPoint.x !== 0) {
                    // Update the circle in the center of the ruler [this will appear behind _outlinePath]
                    var circlePathData = MIL.Utils.GetCirclePathData(this._centerPoint.x, this._centerPoint.y, 6 / scaleFactor) +
                        " " + MIL.Utils.TranslatePathData("M -10 0 L 10 0 M 0 -10 L 0 10", this._centerPoint.x, this._centerPoint.y, scaleFactor); // Add cross-hairs
                    var textHeight = 11 / scaleFactor;
                    var hasToolbar = this._toolbarItemCount > 0;
                    this._centerCirclePath.attr("d", circlePathData);
                    this.applyStyle(this._centerCirclePath, scaleFactor, "transparent");
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
                this.applyStyle(this._outlinePath, scaleFactor);
                // Note: We use 'visibility' (not 'display') so that we can still get the position/dimensions of the RulerControl when it's not shown
                this._gRuler.style("visibility", this._isVisible ? "visible" : "hidden");
                this.BringToFront();
            };
            /**
             * [Private Method] Applies the RulerControl.Class() [if any] to the specified RulerControl component (typically a Path), scaling ths stroke according to the specified scaleFactor.
             * @param {D3SingleSelection} rulerElement Ruler component.
             * @param {number} scaleFactor The factor to scale the stroke-width by.
             * @param {string} [fill] [Optional] The fill color to apply.
             */
            RulerControl.prototype.applyStyle = function (rulerElement, scaleFactor, fill) {
                var className = this.Class();
                if (className) {
                    rulerElement.classed(className, true);
                }
                rulerElement.node().style.stroke = className ? "" : "gray";
                rulerElement.node().style.strokeWidth = (this._strokeWidth / scaleFactor) + "px";
                rulerElement.node().style.fill = fill ? fill : (className ? "" : "rgba(5, 5, 5, 0.05)");
            };
            RulerControl.prototype.Width = function (widthInPx) {
                if (widthInPx === undefined) {
                    return (this._width);
                }
                else {
                    this._width = Math.max(RulerControl.RULER_MIN_WIDTH, widthInPx);
                    this.redraw();
                    return (this);
                }
            };
            RulerControl.prototype.Height = function (heightInPx) {
                if (heightInPx === undefined) {
                    return (this._height);
                }
                else {
                    this._height = Math.max(RulerControl.RULER_MIN_HEIGHT, heightInPx);
                    this.TOOLBAR_ITEM_WIDTH = this._height * 0.3;
                    this.redraw();
                    return (this);
                }
            };
            RulerControl.prototype.BigTickCount = function (bigTickCount) {
                var _this = this;
                return (MIL.getOrSetProperty(this, MIL.nameof(function () { return _this._bigTickCount; }), bigTickCount, function () { return _this.redraw(); }));
            };
            RulerControl.prototype.LittleTickCount = function (littleTickCount) {
                var _this = this;
                return (MIL.getOrSetProperty(this, MIL.nameof(function () { return _this._littleTickCount; }), littleTickCount, function () { return _this.redraw(); }));
            };
            RulerControl.prototype.Class = function (className) {
                if (className === undefined) {
                    return (this._className);
                }
                else {
                    this.BeginUpdate();
                    this._className = className;
                    var strokeWidth = MIL.Utils.GetCssProperty("." + className, "stroke-width");
                    if (strokeWidth) {
                        this.StrokeWidth(strokeWidth);
                    }
                    this.EndUpdate();
                    return (this);
                }
            };
            RulerControl.prototype.StrokeWidth = function (strokeWidth) {
                var _this = this;
                return (MIL.getOrSetProperty(this, MIL.nameof(function () { return _this._strokeWidth; }), (strokeWidth === undefined) ? strokeWidth : MIL.Utils.ToNumber(strokeWidth), function () { return _this.redraw(); }));
            };
            RulerControl.prototype.CenterPoint = function (point) {
                var _this = this;
                return (MIL.getOrSetProperty(this, MIL.nameof(function () { return _this._centerPoint; }), point, function () { return _this.redraw(); }));
            };
            RulerControl.prototype.RotationAngle = function (angle) {
                var _this = this;
                return (MIL.getOrSetProperty(this, MIL.nameof(function () { return _this._rotationAngle; }), (angle === undefined) ? angle : angle % 360, function () { return _this.redraw(); }));
            };
            RulerControl.prototype.KeepConstantScale = function (enable) {
                var _this = this;
                return (MIL.getOrSetProperty(this, MIL.nameof(function () { return _this._keepConstantScale; }), enable, function () { return _this.redraw(); }));
            };
            RulerControl.prototype.IsResizable = function (enable) {
                var _this = this;
                return (MIL.getOrSetProperty(this, MIL.nameof(function () { return _this._isResizable; }), enable));
            };
            RulerControl.prototype.ToolbarItemCount = function (count) {
                if (count === undefined) {
                    return (this._toolbarItemCount);
                }
                else {
                    var widthAvailableForToolbar = (this._isResizable ? RulerControl.RULER_MIN_WIDTH : this._width) * (1 - (RulerControl.RULER_ENDS_TARGET_REGION_WIDTH_RATIO * 2));
                    var maxToolbarItemCount = Math.floor(widthAvailableForToolbar / this.TOOLBAR_ITEM_WIDTH);
                    if (count > maxToolbarItemCount) {
                        throw new MIL.MILException("The [" + (this._isResizable ? "resizable" : "non-resizable") + "] ruler has a limit of " + maxToolbarItemCount + " toolbar items");
                    }
                    var newItemCount = Math.max(0, Math.min(count, maxToolbarItemCount));
                    if (newItemCount !== this._toolbarItemCount) {
                        // Remove all existing item paths
                        var ruler = this;
                        var toolbarItemPaths = this._gRuler.selectAll("path").filter(function () {
                            return (this.getAttribute("id").indexOf(RulerControl.ID_PREFIX + "ToolbarItem") === 0);
                        });
                        toolbarItemPaths.remove();
                        this._selectedToolbarItemNumber = -1;
                        // Add new items paths
                        for (var i = 0; i < newItemCount; i++) {
                            var itemPath = this._gRuler.append("path").attr("id", RulerControl.ID_PREFIX + "ToolbarItem" + i);
                            if (this._toolbarItemStyler !== null) {
                                this._toolbarItemStyler(itemPath, i);
                                // Scale the path (which must be made up of only M/L/m/a commands so that Utils.ScalePathData()/TranslatePathData() will work)
                                // Note: We don't need to account for the zoomLevel here: redraw() will handle that
                                var pathData = itemPath.attr("d");
                                var itemBoundingRect = itemPath.node().getBBox(); // The getBBox() return value is unaffected by the rotation transform [if any] on _gRuler
                                var scale = (this.TOOLBAR_ITEM_WIDTH - (RulerControl.TOOLBAR_ITEM_MARGIN * 2)) / itemBoundingRect.width;
                                var scaledPathData = MIL.Utils.ScalePathData(pathData, scale);
                                itemPath.attr("d", scaledPathData);
                                itemPath.node().__MILOriginalD__ = itemPath.attr("d");
                                var strokeWidth = MIL.Utils.ToNumber(itemPath.style("stroke-width"));
                                itemPath.node().__MILOriginalStrokeWidth__ = strokeWidth ? strokeWidth : 1;
                            }
                            else {
                                throw new MIL.MILException("RulerControl.ToolbarItemStyler() must be set before setting RulerControl.ToolbarItemCount()");
                            }
                        }
                        // Bring the toolbar path to the top so that it's the top hit-target, not the itemPath's
                        var toolbarPath = this._toolbarPath.remove().node();
                        this._gRuler.node().appendChild(toolbarPath);
                        this._toolbarItemCount = newItemCount;
                        this.redraw();
                    }
                    return (this);
                }
            };
            RulerControl.prototype.SelectedToolbarItemNumber = function (itemNumber) {
                if (itemNumber === undefined) {
                    return (this._selectedToolbarItemNumber);
                }
                else {
                    var oldItemNumber = this._selectedToolbarItemNumber;
                    var newItemNumber = Math.max(0, Math.min(itemNumber, this._toolbarItemCount - 1));
                    newItemNumber = (newItemNumber === this._selectedToolbarItemNumber) ? -1 : newItemNumber;
                    if (newItemNumber !== oldItemNumber) {
                        this._selectedToolbarItemNumber = newItemNumber;
                        if (this._onToolbarSelectionChanged !== null) {
                            this._onToolbarSelectionChanged.call(this, oldItemNumber);
                        }
                        this.redraw();
                    }
                    return (this);
                }
            };
            RulerControl.prototype.OnToolbarSelectionChanged = function (handler) {
                var _this = this;
                return (MIL.getOrSetProperty(this, MIL.nameof(function () { return _this._onToolbarSelectionChanged; }), handler));
            };
            RulerControl.prototype.ToolbarItemSelectedColor = function (color) {
                var _this = this;
                return (MIL.getOrSetProperty(this, MIL.nameof(function () { return _this._toolbarItemSelectedColor; }), color, function () { return _this.redraw(); }));
            };
            RulerControl.prototype.ToolbarItemStyler = function (callback) {
                var _this = this;
                return (MIL.getOrSetProperty(this, MIL.nameof(function () { return _this._toolbarItemStyler; }), callback));
            };
            RulerControl.prototype.IsVisible = function (visible) {
                var _this = this;
                return (MIL.getOrSetProperty(this, MIL.nameof(function () { return _this._isVisible; }), visible, function () { return _this.redraw(); }));
            };
            /**
             * Returns true if the RulerControl is is view by at least targetPercentVisible.
             * @param {number} [targetPercentVisible] [Optional] A percentage (> 0.00, <= 1.00) that specifies how much of the RulerControl has to be visible for it to be considered "in view".
             * @returns {boolean} Result.
             */
            RulerControl.prototype.IsInView = function (targetPercentVisible) {
                if (targetPercentVisible === void 0) { targetPercentVisible = 0.33; }
                var svgInfo = MIL.getSvgInfo(this._gDomElement);
                var viewRectPoints = MIL.Utils.ViewableSvgAreaPoints(svgInfo.gDomElement, 0);
                var rulerRectPoints = MIL.Utils.SamplePointsFromPath(this._outlinePath.node()); // This is a sampling of points, not all actual points
                var totalRulerRectPointsCount = rulerRectPoints.length;
                var visibleRulerRectPointsCount = MIL.Utils.CountPointsInPolygon(viewRectPoints, rulerRectPoints);
                var percentVisible = visibleRulerRectPointsCount / totalRulerRectPointsCount;
                var isInView = (percentVisible >= targetPercentVisible);
                return (isInView);
            };
            /**
             * Centers the RulerControl in the center of the parent <svg> element.
             * @returns {RulerControl} The RulerControl instance.
             */
            RulerControl.prototype.CenterInView = function () {
                var svgInfo = MIL.getSvgInfo(this._gDomElement);
                var viewRect = svgInfo.svgDomElement.getBoundingClientRect(); // In screen coordinates
                var centerPoint = { x: viewRect.left + (viewRect.width / 2), y: viewRect.top + (viewRect.height / 2) };
                this.CenterPoint(MIL.TransposeScreenPoint(centerPoint, this._gDomElement));
                return (this);
            };
            /** Ensures that the RulerControl is the top-most element in the parent <g> element it was created in. */
            RulerControl.prototype.BringToFront = function () {
                if (bringToFront(this._gRuler.node(), this._gDomElement)) {
                    MIL.log(RulerControl.CONTROL_TYPE + ": Brought to front", MIL.FeatureNames.Controls);
                }
            };
            /**
             * [Private Method] Returns a line (in svg space) of the supplied start and end points.
             * @param {XY} startPoint The start point of the line.
             * @param {XY} endPoint The end pointof the line.
             * @returns {SVGLine} Result.
             */
            RulerControl.prototype.getSvgLine = function (startPoint, endPoint) {
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
                    MIL.Utils.GetTransformedPoints(this._gRuler.node(), [startSvgPoint])[0],
                    MIL.Utils.GetTransformedPoints(this._gRuler.node(), [endSvgPoint])[0]
                ];
                return (line);
            };
            /**
             * Returns the line (in SVG space) of the face-edge of the RulerControl instance.
             * @returns {SVGLine} Result.
             */
            RulerControl.prototype.GetFaceEdgeLine = function () {
                var faceEdgeLine = this.getSvgLine(this._faceEdgeStartPoint, this._faceEdgeEndPoint);
                return (faceEdgeLine);
            };
            /**
             * Returns the line (in SVG space) of the center of the RulerControl instance.
             * @returns {SVGLine} Result.
             */
            RulerControl.prototype.GetCenterLine = function () {
                var centerLine = this.getSvgLine(this._centerLineStartPoint, this._centerLineEndPoint);
                return (centerLine);
            };
            /** [Private Method] Adds the default Gestures (Move, RotateAndMove, Tap, ToolbarTap) to the RulerControl instance. */
            RulerControl.prototype.addDefaultGestures = function () {
                if (this._defaultMoveGesture !== null) {
                    // Already added
                    return;
                }
                var ruler = this;
                var initialXOffsetToCenterLine = 0;
                var initialYOffsetToCenterLine = 0;
                var onRulerMove = function (e) {
                    ruler.onRulerMove(e, initialXOffsetToCenterLine, initialYOffsetToCenterLine);
                };
                var startPointXOffsetToCenterLine = 0;
                var startPointYOffsetToCenterLine = 0;
                var endPointXOffsetToCenterLine = 0;
                var endPointYOffsetToCenterLine = 0;
                var centerPointRatio = 0;
                var onRulerRotateAndMove = function (e) {
                    ruler.onRulerRotateAndMove(e, startPointXOffsetToCenterLine, startPointYOffsetToCenterLine, endPointXOffsetToCenterLine, endPointYOffsetToCenterLine, centerPointRatio);
                };
                this._defaultMoveGesture = MIL.CreateGesture("DefaultRulerMove*", true)
                    .Target(ruler._outlinePath)
                    .PointerType("touch")
                    .Conditional(function () { return (MIL.Utils.IsNoKeyPressed()); })
                    .GestureStartedHandler(function () {
                    var gesture = this;
                    var newMovePoint = ruler._prevMovePoint = gesture.GetCurrentSvgPoint("{P1}");
                    var line = ruler.GetFaceEdgeLine();
                    var lineStartPoint = line[0], lineEndPoint = line[1];
                    var lineLength = MIL.Utils.GetDistanceBetweenPoints(lineStartPoint, lineEndPoint);
                    var pointOnLine = MIL.Utils.GetClosestPointOnLine(newMovePoint, lineStartPoint, lineEndPoint);
                    // If the ruler is touched near either end then we rotate (instead of move) the ruler, but only if the ruler is 100% in-view
                    ruler._oneTouchRotationInProgress = ruler.IsInView(1) &&
                        ((MIL.Utils.GetDistanceBetweenPoints(pointOnLine, lineStartPoint) < (lineLength * RulerControl.RULER_ENDS_TARGET_REGION_WIDTH_RATIO)) ||
                            (MIL.Utils.GetDistanceBetweenPoints(pointOnLine, lineEndPoint) < (lineLength * RulerControl.RULER_ENDS_TARGET_REGION_WIDTH_RATIO)));
                    if (ruler._oneTouchRotationInProgress) {
                        var rulerCenterLine = ruler.GetCenterLine();
                        var pointOnRulerCenterLine = MIL.Utils.GetClosestPointOnLine(newMovePoint, rulerCenterLine[0], rulerCenterLine[1]);
                        initialXOffsetToCenterLine = pointOnRulerCenterLine.x - newMovePoint.x;
                        initialYOffsetToCenterLine = pointOnRulerCenterLine.y - newMovePoint.y;
                    }
                    gesture.OnMoveHandler(onRulerMove);
                })
                    .GestureEndedHandler(function () {
                    ruler._prevMovePoint = null;
                });
                this._defaultRotateAndMoveGesture = MIL.CreateGesture("DefaultRulerRotateAndMove*", true)
                    .Target(ruler._outlinePath)
                    .PointerType("touch:2")
                    .RecognitionTimeoutInMs(50)
                    .GestureStartedHandler(function () {
                    var gesture = this;
                    var rulerCenterLine = ruler.GetCenterLine();
                    var centerLineStartPoint = rulerCenterLine[0], centerLineEndPoint = rulerCenterLine[1];
                    var centerLineLength = MIL.Utils.GetDistanceBetweenPoints(centerLineStartPoint, centerLineEndPoint);
                    var point1 = gesture.GetCurrentSvgPoint("{P1}");
                    var point2 = gesture.GetCurrentSvgPoint("{P2}");
                    var heading = MIL.Utils.GetHeadingFromPoints(point1, point2);
                    // To prevent the ruler from doing a 180-degree "flip" (based on the the heading computed
                    // from the touch points) we check that the heading is aligned with the ruler angle
                    var isHeadingAlignedWithRuler = MIL.Utils.AreHeadingsAligned(heading, ruler.RotationAngle(), 30);
                    ruler._rotateStartPointPointerType = isHeadingAlignedWithRuler ? "{P1}" : "{P2}";
                    ruler._rotateEndPointPointerType = isHeadingAlignedWithRuler ? "{P2}" : "{P1}";
                    var startPointOnLine = MIL.Utils.GetClosestPointOnLine(isHeadingAlignedWithRuler ? point1 : point2, centerLineStartPoint, centerLineEndPoint);
                    var endPointOnLine = MIL.Utils.GetClosestPointOnLine(isHeadingAlignedWithRuler ? point2 : point1, centerLineStartPoint, centerLineEndPoint);
                    startPointXOffsetToCenterLine = startPointOnLine.x - (isHeadingAlignedWithRuler ? point1 : point2).x;
                    startPointYOffsetToCenterLine = startPointOnLine.y - (isHeadingAlignedWithRuler ? point1 : point2).y;
                    endPointXOffsetToCenterLine = endPointOnLine.x - (isHeadingAlignedWithRuler ? point2 : point1).x;
                    endPointYOffsetToCenterLine = endPointOnLine.y - (isHeadingAlignedWithRuler ? point2 : point1).y;
                    centerPointRatio = MIL.Utils.GetDistanceBetweenPoints(startPointOnLine, ruler.CenterPoint()) / MIL.Utils.GetDistanceBetweenPoints(startPointOnLine, endPointOnLine);
                    if (((startPointOnLine.x > ruler.CenterPoint().x) && (endPointOnLine.x > ruler.CenterPoint().x)) ||
                        ((startPointOnLine.x < ruler.CenterPoint().x) && (endPointOnLine.x < ruler.CenterPoint().x))) {
                        // We could support this but it would add complexity, so for simplicity we simply disallow it
                        gesture.Cancel("Touch points must be on different sides of the center-point of the ruler");
                        return;
                    }
                    if (ruler._isResizable) {
                        // If the ruler is touched close to its ends then we resize (instead of move/rotate) the ruler
                        ruler._rulerResizeInProgress =
                            (MIL.Utils.GetDistanceBetweenPoints(startPointOnLine, centerLineStartPoint) < (centerLineLength * RulerControl.RULER_ENDS_TARGET_REGION_WIDTH_RATIO)) &&
                                (MIL.Utils.GetDistanceBetweenPoints(endPointOnLine, centerLineEndPoint) < (centerLineLength * RulerControl.RULER_ENDS_TARGET_REGION_WIDTH_RATIO));
                        ruler._rulerResizeStartDistance = gesture.GetDistance("{P1}", "{P2}");
                        ruler._rulerResizeStartWidth = ruler.Width();
                    }
                    gesture.OnMoveHandler(onRulerRotateAndMove);
                })
                    .GestureEndedHandler(function () {
                    ruler._rotateStartPointPointerType = null;
                    ruler._rotateEndPointPointerType = null;
                });
                this._defaultTapGesture = MIL.BuiltInGestures.Tap("DefaultRulerTap", ruler._outlinePath, "touch", function () {
                    var currentAngle = ruler.RotationAngle();
                    ruler.RotationAngle(currentAngle + (90 - (currentAngle % 90)));
                    /*
                    // DEBUG!
                    let gesture: Gesture = this;
                    let targetPoint = gesture.GetStartSvgPoint("pen");
                    let line: SVGLine = ruler.GetFaceEdgeLine();
                    let pointOnLine: Point = Utils.GetClosestPointOnLine(targetPoint, line[0], line[1]);
                    Utils.DebugDrawPoints(ruler._gDomElement, [pointOnLine], 5);
                    */
                }, 120, 5).Conditional(function () { return (MIL.Utils.IsKeyPressed(MIL.Utils.Keys.CTRL)); });
                // Note: We always add this gesture - even if _toolbarItemCount is 0 - because _toolbarItemCount can be changed at any time
                this._defaultToolbarTapGesture = MIL.BuiltInGestures.Tap("DefaultRulerToolbarTap", ruler._toolbarPath, "any", function () {
                    // Determine which toolbar item was tapped
                    var gesture = this;
                    var tapPoint = gesture.GetStartSvgPoint("{P1}");
                    var line = ruler.GetFaceEdgeLine();
                    var lineStartPoint = line[0], lineEndPoint = line[1];
                    var pointOnLine = MIL.Utils.GetClosestPointOnLine(tapPoint, lineStartPoint, lineEndPoint);
                    var pointOffset = MIL.Utils.GetDistanceBetweenPoints(lineStartPoint, pointOnLine);
                    // Utils.DebugDrawPoints(ruler._gDomElement, [{ x: lineStartPoint.x + pointOffset, y: pointOnLine.y }], 5);
                    // Note: ruler._toolbarWidth already accounts for zooming
                    var scaleFactor = ruler._keepConstantScale ? MIL.getSvgInfo(ruler._gDomElement).zoomLevel : 1;
                    var toolbarStartOffset = (((ruler._width / scaleFactor) - ruler._toolbarWidth) / 2);
                    var toolbarItemWidth = (ruler.TOOLBAR_ITEM_WIDTH / scaleFactor);
                    var toolbarItemNumber = Math.floor((pointOffset - toolbarStartOffset) / toolbarItemWidth);
                    ruler.SelectedToolbarItemNumber(toolbarItemNumber);
                }, 200, 5).RecognitionTimeoutInMs(0).AllowEventPropagation(false);
                MIL.AddGesture(this._defaultMoveGesture);
                MIL.AddGesture(this._defaultRotateAndMoveGesture);
                MIL.AddGesture(this._defaultTapGesture);
                MIL.AddGesture(this._defaultToolbarTapGesture);
            };
            /** Removes the default Gestures from the RulerControl instance. This allows the control to be completely "re-skinned" with new gestures. */
            RulerControl.prototype.RemoveDefaultGestures = function () {
                MIL.RemoveGestureByName(this._defaultMoveGesture.Name());
                MIL.RemoveGestureByName(this._defaultRotateAndMoveGesture.Name());
                MIL.RemoveGestureByName(this._defaultTapGesture.Name());
                MIL.RemoveGestureByName(this._defaultToolbarTapGesture.Name());
                this._defaultMoveGesture = null;
                this._defaultRotateAndMoveGesture = null;
                this._defaultTapGesture = null;
                this._defaultToolbarTapGesture = null;
            };
            /**
             * [Private Method] Handler for the 'Move' event of _defaultMoveGesture.
             * @param {PointerEvent} e A pointerMove event.
             * @param {number} initialXOffsetToCenterLine The x-axis distance between the initial touch-point and the closest point to that touch-point on the RulerControl's centerline.
             * @param {number} initialYOffsetToCenterLine The y-axis distance between the initial touch-point and the closest point to that touch-point on the RulerControl's centerline.
             */
            RulerControl.prototype.onRulerMove = function (e, initialXOffsetToCenterLine, initialYOffsetToCenterLine) {
                var ruler = this; // PORT: Added
                // The _defaultRotateAndMoveGesture rule (if active) also handles moving the ruler
                if (ruler._defaultRotateAndMoveGesture.IsActive()) {
                    return;
                }
                var gesture = ruler._defaultMoveGesture;
                var newMovePoint = gesture.GetCurrentSvgPoint("{P1}");
                // If the ruler is touched in either the first or last 20% then we rotate (instead of move) the ruler
                if (ruler._oneTouchRotationInProgress) {
                    // To prevent the ruler's rotation from making a sudden "jump" to the rotation based on the heading from the
                    // center-point to the initial touch-point, we adjust the touch-point to as if it had occurred on the centerline
                    var adjustedMovePoint = { x: newMovePoint.x + initialXOffsetToCenterLine, y: newMovePoint.y + initialYOffsetToCenterLine };
                    var heading = MIL.Utils.GetHeadingFromPoints(ruler.CenterPoint(), adjustedMovePoint);
                    // To prevent the ruler from doing a 180-degree "flip" (based on the the heading computed
                    // from the touch point) we check that the heading is aligned with the ruler angle
                    var isHeadingAlignedWithRuler = MIL.Utils.AreHeadingsAligned(heading, ruler.RotationAngle(), 30);
                    if (!isHeadingAlignedWithRuler) {
                        heading = MIL.Utils.GetHeadingFromPoints(adjustedMovePoint, ruler.CenterPoint());
                    }
                    ruler.RotationAngle(heading);
                }
                else {
                    // The normal move case
                    var deltaX = newMovePoint.x - ruler._prevMovePoint.x;
                    var deltaY = newMovePoint.y - ruler._prevMovePoint.y;
                    var newCenterPoint = { x: ruler.CenterPoint().x + deltaX, y: ruler.CenterPoint().y + deltaY };
                    ruler.CenterPoint(newCenterPoint);
                    ruler._prevMovePoint = newMovePoint;
                }
            };
            /**
             * [Private Method] Handler for the 'Move' event of _defaultRotateAndMoveGesture.
             * @param {PointerEvent} e A pointerMove event.
             * @param {number} startPointXOffsetToCenterLine The x-axis distance between the initial "start" (first) touch-point and the closest point to that touch-point on the RulerControl's centerline.
             * @param {number} startPointYOffsetToCenterLine The y-axis distance between the initial "start" (first) touch-point and the closest point to that touch-point on the RulerControl's centerline.
             * @param {number} endPointXOffsetToCenterLine The x-axis distance between the initial "end" (second) touch-point and the closest point to that touch-point on the RulerControl's centerline.
             * @param {number} endPointYOffsetToCenterLine The y-axis distance between the initial "end" (second) touch-point and the closest point to that touch-point on the RulerControl's centerline.
             * @param {number} centerPointRatio The ratio describing how the startPoint/endPoint straddle the center-point of the RulerControl.
             */
            RulerControl.prototype.onRulerRotateAndMove = function (e, startPointXOffsetToCenterLine, startPointYOffsetToCenterLine, endPointXOffsetToCenterLine, endPointYOffsetToCenterLine, centerPointRatio) {
                var ruler = this; // PORT: Added
                var gesture = ruler._defaultRotateAndMoveGesture;
                if (ruler._rulerResizeInProgress) {
                    var distance = gesture.GetDistance("{P1}", "{P2}");
                    var newWidth = (distance / ruler._rulerResizeStartDistance) * ruler._rulerResizeStartWidth;
                    ruler.Width(newWidth);
                }
                else {
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
                    var angle = MIL.Utils.GetHeadingFromPoints(startPoint, endPoint);
                    var centerPoint = {
                        x: startPoint.x + ((endPoint.x - startPoint.x) * centerPointRatio),
                        y: startPoint.y + ((endPoint.y - startPoint.y) * centerPointRatio)
                    };
                    ruler.BeginUpdate().RotationAngle(angle).CenterPoint(centerPoint).EndUpdate();
                    // We do this so that the "move" gesture (which suspends itself while "rotateAndMove" is active) can resume smoothly
                    // (ie. when one finger is lifted [so "rotateAndMove" ends] but one finger remains [so "move" is still active])
                    ruler._prevMovePoint = gesture.GetCurrentSvgPoint("{P1}");
                }
            };
            RulerControl.CONTROL_TYPE = "RulerControl";
            RulerControl.ID_PREFIX = "rulerPart_";
            RulerControl.RULER_MIN_HEIGHT = 80;
            RulerControl.RULER_MIN_WIDTH = 300;
            RulerControl.TOOLBAR_ITEM_MARGIN = 4; // On all sides (around the item)
            RulerControl.RULER_ENDS_TARGET_REGION_WIDTH_RATIO = 0.2; // Defines the gesture target region (as a percentage of the width) for the ruler ends
            return RulerControl;
        }());
        Controls.RulerControl = RulerControl;
    })(Controls = MIL.Controls || (MIL.Controls = {}));
})(MIL || (MIL = {}));
//# sourceMappingURL=MIL.js.map