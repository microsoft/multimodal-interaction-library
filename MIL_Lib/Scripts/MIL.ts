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

/**
 * The MIL namespace.
 */
namespace MIL
{
    /** Defines the type of an SVGGraphicsElement that can also be treated as a basic JavaScript object. */
    export interface SVGElementEx extends SVGGraphicsElement, BaseObject { }

    // Type aliases
    /** Type of a base JavaScript object. This allows setting/getting dynamic properties (or private members) on strongly-typed objects by simple casting to BaseObject. */
    export type BaseObject = { [key: string]: any; }

    /** Type of a PointerEvent handler (callback). */
    export type PointerEventHandler = (event: PointerEvent) => void;

    /** Type of a Gesture Started/Cancelled handler (callback). When the handler is invoked, 'this' will be set to the Gesture instance. */
    export type GestureEventHandler = () => void;

    /** Type of a Gesture Ended handler (callback). When the handler is invoked, 'this' will be set to the Gesture instance. */
    export type GestureEndedHandler = (liftedPointerID?: string) => void;

    /** Type of a callback that takes no parameters and returns a boolean. When the handler is invoked, 'this' will be set to the Gesture instance. */
    export type GestureConditionalCallback = () => boolean;

    /** Type of a handler (callback) for a recognize-shape Gesture. When the handler is invoked, 'this' will be set to the Gesture instance. */
    export type ShapeRecognizedHandler = (shape: RecognizableShape) => void;

    /** Type of a handler (callback) for a radial-swipe Gesture. When the handler is invoked, 'this' will be set to the Gesture instance. */
    export type RadialSwipeHandler = (swipeResult: RadialSwipeResult) => void;

    /** Type of a handler (callback) for an angle-changed event. When the handler is invoked, 'this' will be set to the Gesture instance. */
    export type AngleChangedHandler = (angle: number) => void;

    /** Type of the result from a RadialSwipe Gesture. */
    export type RadialSwipeResult =
    {
        /** A named direction ("NE", "W", etc.) when using 4 or 8 segments, or the segment ID. */
        compassHeading: string | number,
        /** The heading in degrees (0..359.99). */
        heading: number,
        /** The segment ID (0 to n - 1, where n is the number of possible segments). */
        segmentID: number,
        /** The length of the swipe (in SVG coordinate space). */
        length: number
    };

    /** Type of a generic point object (with x and y members).  */
    export type Point = { x: number, y: number };

    /** Type of a 2-element point array, where [0] = x and [1] = y. */
    export type XY = [number, number];

    /** The types of visual elements that can be used with MIL. */
    export type DomElement = SVGElementEx;

    /** The type of a targetted visual element in a MIL operation. */
    export type TargetDomElement = DomElement | D3SingleSelection;

    /** Type representing a d3 selection of one-or-more visual element(s). */
    export type D3Selection = d3.Selection<DomElement, any, any, any>;

    /** Type representing a d3 selection of exactly one visual element. */
    export type D3SingleSelection = d3.Selection<DomElement, any, any, any>;

    /** Type of points that represent a polygon. */
    export type PolygonPoints = XY[] | Point[];

    /** Type of a 2-point line in svg space. */
    export type SVGLine = [SVGPoint, SVGPoint];

    /** A rectangle representation. */
    export type Rect = { x: number, y: number, width: number, height: number };

    /** Type of the [optional] callback passed to FindShapeElementsInRegion(). */
    export type FindShapeFilter = (value: DomElement | Ink) => boolean;

    /** 
     * [Internal] Type of the result from a Gesture recognition. 
     * @internal
     */
    export type GestureRecognitionResult = { success: boolean, propagateEvents: boolean };

    /** [Internal] Type of information about a 'hover' event timer. */
    type HoverTimerInfo = { timerID: number, targetDomElement: DomElement, hoverMoveHandler: PointerEventHandler };

    /** [Internal] Type of information about the state of a target element during gesture recognition. */
    type TargetElementState =
    {
        /** Flag (boolean) set while we are acquiring pointers on the target [in the lead up to recognizing a combination of pointers that initiate a gesture]. */
        isAcquiringPointers: boolean,
        /** The ID of the timer [if any] used to call recognizeGesture(). A value of -1 means "not set". */
        recognizeGestureTimerID: number,
        /** Flag (boolean) set once recognizeGesture() has run [regardless of whether it finds a matching gesture or not]. */
        gestureRecognitionRan: boolean,
        /** Flag (boolean) set if we are waiting for a gesture to complete [ie. a PointerUp is received for one of its pointers]. */
        isAwaitingGestureCompletion: boolean
    };

    /** Type that describes the current SVG pan x/y offsets. */
    export type PanPosition = { left: number; top: number };

    /** Type of a callback that takes no parameters and returns void. */
    export type VoidCallback = () => void;

    /** The names of features that can be provided to MIL.DebugFeature(). */
    export enum FeatureNames 
    {
        /** General MIL functionality. */
        MIL = 1,
        /** The Gesture recognizer. */
        GestureRecognition = 2,
        /** The Shape recognizer. */
        ShapeRecognition = 4,
        /** Keyboard behavior. */
        KeyboardHandler = 8,
        /** Hover behavior. */
        Hover = 16,
        /** PointerEvent occurrences (excluding PointerMove). */
        PointerEvents = 32,
        /** PointerEvent occurrences (including PointerMove). */
        PointerEventsIncludingMove = 64,
        /** Pointer capturing. */
        PointerCapture = 128,
        /** MIL Controls (eg. RulerControl, RadialMenuControl). */
        Controls = 256,
        /** The default level of debug logging. */
        Default = FeatureNames.MIL | FeatureNames.PointerEvents
    }

    // MIL can be initialized for multiple [peer, NOT nested] SVG elements on the same web page
    let _svgInfo: { [MILIDofSVG: string]: SVGInfo } = {}; // Key: MILID of SVG, Value: SVGInfo

    let _gestures: Gesture[] = []; // Array of Gesture objects; the order in which gestures are added affects how gestures get recognized (the first match is returned)
    let _gestureID = 1; // Used to create a unique gesture name when the name ends in '*'
    let _targetElementID: { [elementNodeName: string]: number } = {}; // Key: ElementNodeName, Value: Count; used to create a unique __MILID__ value for a targetDomElement
    let _disabledGestureGroups: { [groupName: string]: boolean } = {}; // A dictionary of Gesture groups that have been disabled. (Key: groupName, Value: boolean)
    let _debugEnabledFeatures: string[] = []; // The names of features that debugging has been enabled for (initialized in Initialize())

    let _activePointerDownEvents: { [targetElementID: string]: { [pointerID: string]: PointerEvent } } = {}; // Key: TargetElementID, Value = (Key: PointerID, Value: PointerDown event)
    let _activePointerDownStartTime: { [targetElementID: string]: number } = {}; // Key: TargetElementID, Value = Time (in MS) of the first PointerDown event [that's currently active]
    let _activePointerLatestMoveEvents: { [targetElementID: string]: { [pointerID: string]: PointerEvent } } = {}; // Key: TargetElementID, Value = (Key: PointerID, Value: PointerMove event)

    let _activeHoverTimerInfo: { [pointerID: string]: HoverTimerInfo } = {}; // A dictionary of hover-timer information (per active hover pointerID) - Key: PointerID, Value: { HoverTimerInfo } 
    let _activeHoverEvents: { [targetElementID: string]: { [pointerID: string]: PointerEvent } } = {}; // A dictionary of active hover-event information (per element being hovered over) - Key: TargetElementID, Value: Value = (Key: PointerID, Value: PointerEnter event)
    let _activeHoverStartTime: { [targetElementID: string]: number } = {}; // A dictionary of hover-start times (per element being hovered over) - Key: TargetElementID, Value = Time (in MS) of the first PointerEnter event [that's currently active]

    // Stores per-target state needed for gesture recognition [Note: We never delete from this dictionary, so it grows over time]
    let _targetElementState: { [targetElementID: string]: TargetElementState } = {};

    // Stores per-target hover timeouts (in milliseconds)
    let _hoverTimeouts: { [targetElementID: string]: number } = {};

    /** 
     * [Internal] The queue of pointerDown/Move/Up events that are postponed while waiting to see if a gesture recognition will succeed. 
     * Note: Because this member is exported, it must always be referenced with a "MIL." prefix otherwise the VS[2017] debugger will not see it at runtime.
     * @internal
     */
    export let _postponedPointerEvents: PointerEvent[] = [];

    /** 
     * [Internal] All the Ink objects that have been created [via Gesture.Ink()]. 
     * Note: Because this member is exported, it must always be referenced with a "MIL." prefix otherwise the VS[2017] debugger will not see it at runtime.
     * @internal
     */
    export let _inks: Ink[] = [];

    /** How Ink objects should be combined. */
    export enum InkAutoCombineMode
    {
        /** No combining of inks. */
        Off = 0,
        /** If ink B starts within ink A, combine ink B with Ink A. */
        StartsWithin = 1,
        /** If ink B end within ink A, combine ink B with Ink A. */
        EndsWithin = 2,
        /** If ink B is wholly contained within ink A, combine ink B with Ink A. */
        ContainedWithin = 4,
        /** If any point of ink B lies within ink A, combine ink B with Ink A. */
        AnyPointWithin = 8,
        /** Always combine inks that overlap in any way. */
        Always = 1 | 2 | 4 | 8
    }

    /** 
     * The possible pen buttons [see http://www.w3.org/TR/pointerevents2/]. 
     * Note that these are bitmask values for the PointerEvent.buttons property, and are distinct from the PointerEvent.button property values. 
     */
    export enum PenButton
    {
        /** Pen moved while hovering with no buttons pressed. */
        NoneHover = 0,
        /** aka. "Contact": Not really a button (this is just the default value when the pen makes contact). */
        None = 1,
        /** The button on the side of the [Surface] pen. */
        Barrel = 2,
        /** The button on top of the [Surface] pen. */
        Eraser = 32
    }

    /** The type (style) of hull path to create for an Ink. */
    export enum InkHullType
    {
        None = 0,
        Concave = 1, // Note: MIL computes concave hulls
        Convex = 2  // Note: D3 computes convex hulls
    }

    /** 
     * [Internal] Information about the <svg> and <g> host containers. 
     * @internal
     */
    export class SVGInfo
    {
        svgDomElement: SVGSVGElement;
        gDomElement: SVGGElement;
        svgWidth: number; // In pixels
        svgHeight: number; // In pixels
        zoomLevel: number;
        panTop: number; // In zoom-adjusted (scaled) pixels
        panLeft: number; // In zoom-adjusted (scaled) pixels
        gSelection: D3SingleSelection; // The selection of gDomElement
        settings: MILSettings;
        ruler: Controls.RulerControl; // One per <svg>
        frame: Controls.FrameControl; // One per <svg>
        radialMenus: Controls.RadialMenuControl[]; // Many per <svg> 

        constructor(svgDomElement: SVGSVGElement, gDomElement: SVGGElement)
        {
            this.svgDomElement = svgDomElement;
            this.gDomElement = gDomElement;
            this.svgWidth = svgDomElement.clientWidth;
            this.svgHeight = svgDomElement.clientHeight;
            this.zoomLevel = 1;
            this.panTop = 0;
            this.panLeft = 0;
            this.gSelection = d3.select(gDomElement);
            this.settings = new MILSettings();
            this.ruler = null;
            this.frame = null;
            this.radialMenus = [];
        }
    }

    /**
     * Base exception for all errors raised by MIL.
     */
    export class MILException extends Error
    {
        constructor(message: string)
        {
            super((MIL.Utils.isIE11() ? "MILException: " : "") + message);
            this.name = "MILException";
        }
    }

    /**
     * [Internal] Returns true if gesture recognition is currently in the process of acquiring pointers.
     * @returns {boolean} Result.
     * @internal
     */
    export function isAcquiringPointers(): boolean
    {
        for (let targetElementID in _targetElementState)
        {
            if (_targetElementState[targetElementID].isAcquiringPointers === true)
            {
                return (true);
            }
        }
        return (false);
    }
    
    /**
     * [Internal] Logs a debug message to the console (if the specified feature has been enabled for logging).
     * @param {string} message The messsage to log.
     * @param {FeatureNames} [featureName] [Optional] The MIL feature that this message applies to. If supplied, the message will only be logged if debugging
     * has been turned on for that feature using MIL.DebugFeature() [it is on for FeatureNames.MIL by default].
     * @internal
     */
    export function log(message: string, featureName: FeatureNames = FeatureNames.MIL): void
    {
        // Don't log if debugging has not be turned on for the specified feature
        if (!DebugFeature(featureName))
        {
            return;
        }

        // Note: We always use FeatureNames.MIL (NOT featureName) as the logged prefix
        Utils.Log(message, FeatureNames[FeatureNames.MIL]);
    }

    /**
     * [Internal] Gets the name of a property of an object. Throws if the supplied 'fn' function cannot be parsed.
     * @param {function(): any} fn A lambda of the form "() => obj.prop", where "prop" is the property whose name will be returned.
     * @returns {string} The property name (eg. "prop").
     * @internal
     */
    export function nameof(fn: () => any): string
    {
        const fnStr: string = fn.toString(); // Eg. "function () { return _this._inkAutoCombineMode; }"
        const startPos: number = fnStr.indexOf(".") + 1;
        if (startPos > 0)
        {
            const endPos: number = fnStr.indexOf(";", startPos);
            if (endPos > startPos)
            {
                const propName: string = fnStr.substring(startPos, endPos);
                return (propName);
            }
        }
        throw new MILException("Unable to parse property name from '" + fnStr + "'");
    }

    /**
     * [Internal] Used to set/get a property of an object [when no special processing by either the getter or setter is needed].
     * @param {BaseObject} obj The object to get/set the property of.
     * @param {string} propertyName The name of the property to get/set.
     * @param {any} [newValue] [Optional] The new value for the property. Note: MUST be undefined to avoid invoking the setter.
     * @param {function(): void} [postSetAction] [Optional] An action to perform after setting the value.
     * @returns {any | BaseObject} Either the property value (if getting), or 'obj' (if setting).
     * @internal
     */
    export function getOrSetProperty(obj: BaseObject, propertyName: string, newValue?: any, postSetAction?: () => void): any | BaseObject
    {
        if (!obj.hasOwnProperty(propertyName))
        {
            throw new MILException ("Invalid propertyName '" + propertyName + "'");
        }

        if (newValue === undefined)
        {
            // Getter (return the property value)
            return (obj[propertyName]);
        }
        else
        {
            // Setter (return the object to support chaining)
            obj[propertyName] = newValue;

            if (postSetAction)
            {
                postSetAction();
            }

            return (obj.hasOwnProperty("_parentObj") ? obj._parentObj : obj);
        }
    }

    /**
     * [Internal] Used to check if an attempt is being made to set a read-only property - in which case it will throw.
     * @param {string} propertyName The read-only property name.
     * @param {IArguments} args The list of arguments (if any) being passed to the getter [that's calling readOnlyProperty()].
     * @internal
     */
    export function readOnlyProperty(propertyName: string, args: IArguments): void
    {
        if (args.length > 0)
        {
            throw new MILException("The '" + propertyName + "' property is read-only");
        }
    }

    /**
     * Enables or disabled debug console messages for the specified MIL feature, or returns whether logging for the specified feature is enabled.
     * Note: All "general" logging (ie. that is NOT feature-specific) done by MIL can be turned off with this command: MIL.DebugFeature(MIL.FeatureNames.MIL, false);
     * @param {FeatureNames} featureNames One-or-more MIL.FeatureNames value (eg. MIL.FeatureNames.MIL | MIL.FeatureNames.GestureRecognition).
     * @param {boolean} [enable] [Optional] Whether to turn debug messages on or off. If not supplied, the method with return whether logging for the specified feature(s) is enabled. 
     * @returns {boolean | void} Result.
     */
    export function DebugFeature(featureNames: FeatureNames, enable?: boolean): boolean | void
    {
        let validMask: number = 0;
        let validFeatureNames: string[] = [];
        let suppliedFeatureNames: string[] = [];

        // Build validMask and populate suppliedFeatureNames
        for (let propName in FeatureNames)
        {
            if (isNaN(+propName))
            {
                validFeatureNames.push(propName);
            }
            else
            {
                let enumValue = +propName;
                validMask |= enumValue;
                if ((featureNames & enumValue) && (enumValue !== FeatureNames.Default))
                {
                    suppliedFeatureNames.push(FeatureNames[enumValue]);
                }
            }
        }

        // Check featureNames
        let isValidFeatures: boolean = (featureNames > 0) && ((featureNames & validMask) <= validMask);
        if (!isValidFeatures)
        {
            throw new MILException(`Invalid featureNames (${featureNames}); valid values are: ${validFeatureNames.join(", ")}`);
        }

        if (enable === undefined)
        {
            // Check if ALL the supplied featureNames are enabled
            let result: boolean = (suppliedFeatureNames.length > 0);
            suppliedFeatureNames.forEach(featureName =>
            {
                if (_debugEnabledFeatures.indexOf(featureName) === -1)
                {
                    result = false;
                }
            });
            return (result);
        }
        else
        {
            // Enable/disable the supplied featureNames
            suppliedFeatureNames.forEach(featureName =>
            {
                if (enable)
                {
                    if (_debugEnabledFeatures.indexOf(featureName) === -1)
                    {
                        _debugEnabledFeatures.push(featureName);
                    }
                }
                else
                {
                    let index = _debugEnabledFeatures.indexOf(featureName);
                    if (index !== -1)
                    {
                        _debugEnabledFeatures.splice(index, 1);
                    }
                }
            });
        }
    }

    /** Reports debugging information to the console window about MIL state. */
    export function ShowDebugInfo(): void
    {
        let pointerDownEventCount: number = Object.keys(_activePointerDownEvents).length;
        let pointerMoveEventCount: number = Object.keys(_activePointerLatestMoveEvents).length;
        let capturingElementsCount: number = Object.keys(_activePointerCaptures).length;
        let activeHoverTimerCount: number = Object.keys(_activeHoverTimerInfo).length;
        let activeHoverEventCount: number = Object.keys(_activeHoverEvents).length;
        let targetElementStateCount: number = Object.keys(_targetElementState).length;
        let pointerDownList: string = "";
        let pointerMoveList: string = "";
        let pointerCaptureList: string = "";
        let hoverEventList: string = "";
        let hoverTimerList: string = "";
        let targetElementID: string; // for-loop variable
        let pointerID: string; // for-loop variable

        log("DEBUG: All Gestures:");

        for (let g = 0; g < _gestures.length; g++)
        {
            let gesture: Gesture = _gestures[g];
            log("  " + gesture.Name() + " (on " + getTargetElementID(gesture.Target()) + ")");
        }
        log("DEBUG: Gesture count: " + _gestures.length);

        log("DEBUG: Active PointerDown event count: " + pointerDownEventCount);
        for (targetElementID in _activePointerDownEvents)
        {
            for (pointerID in _activePointerDownEvents[targetElementID])
            {
                pointerDownList += "[" + targetElementID + "][" + pointerID + "] ";
            }
        }
        if (pointerDownEventCount > 0)
        {
            log("  " + pointerDownList);
        }

        log("DEBUG: Active PointerMove event count: " + pointerMoveEventCount);
        for (targetElementID in _activePointerLatestMoveEvents)
        {
            for (pointerID in _activePointerLatestMoveEvents[targetElementID])
            {
                pointerMoveList += "[" + targetElementID + "][" + pointerID + "] ";
            }
        }
        if (pointerMoveEventCount > 0)
        {
            log("  " + pointerMoveList);
        }

        log("DEBUG: Elements capturing pointer events: " + capturingElementsCount);
        for (targetElementID in _activePointerCaptures)
        {
            pointerCaptureList += targetElementID + " [" + _activePointerCaptures[targetElementID].join(", ") + "] ";
        }
        if (capturingElementsCount > 0)
        {
            log("  " + pointerCaptureList);
        }

        log("DEBUG: Active Hover timer count: " + activeHoverTimerCount);
        for (pointerID in _activeHoverTimerInfo)
        {
            let hoverTimerInfo = _activeHoverTimerInfo[pointerID];
            hoverTimerList += "[" + getTargetElementID(hoverTimerInfo.targetDomElement) + "][" + pointerID + "] ";
        }
        if (activeHoverTimerCount > 0)
        {
            log("  " + hoverTimerList);
        }

        log("DEBUG: Active Hover event count: " + activeHoverEventCount);
        for (targetElementID in _activeHoverEvents)
        {
            for (pointerID in _activeHoverEvents[targetElementID])
            {
                hoverEventList += "[" + targetElementID + "][" + pointerID + "] ";
            }
        }
        if (activeHoverEventCount > 0)
        {
            log("  " + hoverEventList);
        }

        log("DEBUG: Ink count: " + MIL._inks.length);
        log("DEBUG: Elements interacted with: " + targetElementStateCount + (targetElementStateCount > 0 ? " (" + Object.keys(_targetElementState).join(", ") + ")" : ""));
        log("DEBUG: Pressed keys: " + Utils.GetPressedKeyInfo());
    }

    /**
     * [Internal] Returns the SVGInfo for the specified 'targetElement' (which must be an SVGElement).
     * @param {TargetDomElement} targetElement The SVGElement to inspect.
     * @returns {SVGInfo} Result.
     * @internal
     */
    export function getSvgInfo(targetElement: TargetDomElement): SVGInfo
    {
        let domElement: DomElement = Utils.GetDomElement(targetElement, SVGElement); // PORT: ", SVGElement" was added
        let isRootSvg: boolean = (domElement instanceof SVGSVGElement) && (domElement.ownerSVGElement === null);
        let svgDomElement: SVGSVGElement = null;

        if (isRootSvg)
        {
            svgDomElement = domElement as SVGSVGElement;
        }
        else
        {
            if ((domElement as SVGElement).ownerSVGElement !== null)
            {
                svgDomElement = (domElement as SVGElement).ownerSVGElement;
            }
            else
            {
                if ((domElement.ownerDocument !== null) && (domElement.ownerDocument.activeElement !== null) && (domElement.ownerDocument.activeElement instanceof SVGElement))
                {
                    if (domElement.ownerDocument.activeElement.ownerSVGElement !== null)
                    {
                        svgDomElement = domElement.ownerDocument.activeElement.ownerSVGElement;
                    }
                    else
                    {
                        if (domElement.ownerDocument.activeElement instanceof SVGSVGElement)
                        {
                            svgDomElement = domElement.ownerDocument.activeElement;
                        }
                    }
                }
            }
        }

        let svgID: string = getTargetElementID(svgDomElement);

        return (_svgInfo[svgID]);
    }

    /**
     * Returns the MIL settings associated with the specified <SVG> element.
     * @param {SVGSVGElement} svg The SVG element to find the MIL settings for.
     * @returns {MILSettings} The associated MIL settings.
     */
    export function Settings(svg: TargetDomElement): MILSettings
    {
        let svgDomElement: SVGSVGElement = Utils.GetDomElement(svg, SVGSVGElement) as SVGSVGElement;
        let svgInfo: SVGInfo = getSvgInfo(svgDomElement);
        return (svgInfo.settings);
    }

    // Note: This factory method just makes the syntax for creating a Gesture a little cleaner.
    /**
     * Creates a new Gesture with the specified name.
     * @param {string} name The name of the Gesture. Add '*' as a suffix to create a unique name.
     * @param {boolean} [ignoreGestureDefaults] [Optional] Typically only used by internal Gestures [to allow MIL to create Gestures without having to call MIL.GestureDefaults.Reset(), which could be an unwanted side-effect].
     * @returns {Gesture} The created Gesture.
     */
    export function CreateGesture(name: string, ignoreGestureDefaults?: boolean): Gesture
    {
        // If needed, make the name unique
        if (name[name.length - 1] === "*")
        {
            name = name.slice(0, name.length - 1) + "_#" + _gestureID++;
        }

        return (new Gesture(name, ignoreGestureDefaults));
    }

    /**
     * Adds the specified Gesture, making it available to be recognized.
     * Note: If multiple Gestures have the same definition (target/pointerType/conditional), the one which was created first will be the one that gets recognized.
     * @param {Gesture} gesture The Gesture to add.
     * @returns {Gesture} The added Gesture.
     */
    export function AddGesture(gesture: Gesture): Gesture
    {
        let svgInfo: SVGInfo = getSvgInfo(gesture.Target());

        if (!svgInfo)
        {
            throw new MILException ("Call Initialize() prior to calling AddGesture()");
        }

        if (!(gesture instanceof Gesture))
        {
            throw new MILException ("The supplied 'gesture' parameter must be of type Gesture");
        }

        // A gesture that uses multiple pointers must have a non-zero recognition timeout [because the pointers will make contact at slightly different times]
        let pointerCount: number = gesture.PointerCount();
        if ((gesture.RecognitionTimeoutInMs() === 0) && (pointerCount > 1))
        {
            throw new MILException("Gesture '" + gesture.Name() + "' uses " + pointerCount + " pointers so must specify a non-zero RecognitionTimeoutInMs()");
        }

        let name: string = gesture.Name();
        let targetDomElement: DomElement = gesture.Target();

        if (GetGestureByName(name) !== null)
        {
            throw new MILException("A gesture named '" + name + "' already exists; consider adding '*' to the end of the name to automatically make it unique");
        }

        if (!targetDomElement)
        {
            // Because we use the target to determine if we should call addPointerEventListeners() [see below]
            throw new MILException("Gesture '" + name + "' must specify a Target() before it can be added");
        }

        if (!gesture.PointerType())
        {
            // A gesture can never be recognized without this
            throw new MILException("Gesture '" + name + "' must specify a PointerType() before it can be added");
        }

        // Check if the gesture has a "mouse+" PointerType (because this likely will not work as expected on Chrome)
        // From https://www.w3.org/TR/pointerevents/#the-primary-pointer: "Some user agents may ignore the concurrent use of more than one type of pointer input to avoid accidental interactions."
        if (Utils.isChrome())
        {
            var permutation: string;
            for (permutation of gesture.PointerTypePermutations())
            {
                if ((permutation.indexOf("mouse+") !== -1) || (permutation.indexOf("+mouse") !== -1) || (permutation.indexOf("any+") !== -1) || (permutation.indexOf("+any") !== -1)) // "any" includes "mouse"
                {
                    log("Warning: Gesture '" + gesture.Name() + "' specifies simultaneous use of " + permutation + " so may not function as expected because Chrome will not generate all the expected PointerEvents for the mouse (such as pointerUp or pointerMove) during the gesture");
                    break;
                }
            }
        }

        // If this is the first gesture to use gesture.Target() then add the pointer-event listeners to the target
        if ((targetDomElement !== svgInfo.svgDomElement) && // MIL.Initialize() will already have done this
            (getGestureCountByTarget(targetDomElement) === 0))
        {
            addPointerEventListeners(targetDomElement);
        }

        _gestures.push(gesture);
        return (gesture);
    }

    /**
     * Returns the Gesture that has the specified name.
     * @param {string} name The name of the Gesture to find.
     * @returns {Gesture | null} Either the found gesture, or null if no such Gesture exists.
     */
    export function GetGestureByName(name: string): Gesture | null
    {
        for (let g = 0; g < _gestures.length; g++)
        {
            if (_gestures[g].Name() === name)
            {
                return (_gestures[g]);
            }
        }
        return (null);
    }

    /**
     * Returns the Gesture (if any) that is using the pointer that generated the supplied PointerEvent. Returns null if there is no such Gesture.
     * @param {PointerEvent} e A PointerEvent.
     * @param {string} [gestureNamePrefix] [Optional] Only if the Gesture starts with this prefix will it be returned.
     * @returns {Gesture | null} Either the found gesture, or null if no such Gesture exists.
     */
    export function GetGestureFromEvent(e: PointerEvent, gestureNamePrefix?: string): Gesture | null
    {
        let pointerID: string = makePointerID(e);

        for (let g = 0; g < _gestures.length; g++)
        {
            let gesture: Gesture = _gestures[g];

            if ((gesture.ActivePointerList().indexOf(pointerID) !== -1) && ((gestureNamePrefix === undefined) || (gesture.Name().indexOf(gestureNamePrefix) === 0)))
            {
                return (gesture);
            }
        }

        return (null);
    }

    // This method is useful in callbacks where a Gesture instance is assigned to 'this'. 
    // The JS callback function can use it get the correct VS IntelliSense for 'this', eg. by writing "var gesture = MIL.ThisGesture(this);".
    // An alternative would be for the JS callback to include the JSDoc comment "/** @this MIL.Gesture */", but this is less discoverable.
    /**
     * Given an object (typically 'this') checks if it's a Gesture instance and, if so, returns the object. Throws if it's not a Gesture.
     * @param {object} o The object to check.
     * @returns {Gesture} Result.
     */
    export function ThisGesture(o: object): Gesture
    {
        if (o instanceof Gesture)
        {
            return (o);
        }
        else
        {
            throw new MILException("The specified object is not a Gesture instance");
        }
    }

    // This method is useful in callbacks where an Ink instance is assigned to 'this'. 
    // The JS callback function can use it get the correct VS IntelliSense for 'this', eg. by writing "var ink = MIL.ThisInk(this);".
    // An alternative would be for the JS callback to include the JSDoc comment "/** @this MIL.Ink */", but this is less discoverable.
    /**
     * Given an object (typically 'this') checks if it's an Ink instance and, if so, returns the object. Throws if it's not an Ink.
     * @param {object} o The object to check.
     * @returns {Ink} Result.
     */
    export function ThisInk(o: object): Ink
    {
        if (o instanceof Ink)
        {
            return (o);
        }
        else
        {
            throw new MILException("The specified object is not an Ink instance");
        }
    }
        
    // This method is useful in callbacks where an RulerControl instance is assigned to 'this'. 
    // The JS callback function can use it get the correct VS IntelliSense for 'this', eg. by writing "var ruler = MIL.ThisRuler(this);".
    // An alternative would be for the JS callback to include the JSDoc comment "/** @this MIL.Controls.RulerControl */", but this is less discoverable.
    /**
     * Given an object (typically 'this') checks if it's a Ruler control instance and, if so, returns the object. Throws if it's not a Ruler.
     * @param {object} o The object to check.
     * @returns {Controls.RulerControl} Result.
     */
    export function ThisRuler(o: object): Controls.RulerControl
    {
        if (o instanceof Controls.RulerControl)
        {
            return (o);
        }
        else
        {
            throw new MILException("The specified object is not a Controls.RulerControl instance");
        }
    }

    /**
     * Given an object (typically 'this') checks if it's a RadialMenuControl control instance and, if so, returns the object. Throws if it's not a RadialMenuControl.
     * @param {object} o The object to check.
     * @returns {Controls.RadialMenuControl} Result.
     */
    export function ThisRadialMenu(o: object): Controls.RadialMenuControl
    {
        if (o instanceof Controls.RadialMenuControl)
        {
            return (o);
        }
        else
        {
            throw new MILException("The specified object is not a Controls.RadialMenuControl instance");
        }
    }

    /**
     * [Internal] Returns the __MILID__ (eg. "svg_1") of the specified targetDomElement. Throws if the ID is missing.
     * @param {DomElement} targetDomElement The DOM element to inspect.
     * @returns {string} Result.
     * @internal
     */
    export function getTargetElementID(targetDomElement: DomElement): string
    {
        if (targetDomElement.__MILID__ === undefined)
        {
            throw new MILException(`The MIL TargetElementID is missing from the specified targetDomElement (${ targetDomElement.nodeName })`);
        }

        return (targetDomElement.__MILID__);
    }

    /**
     * [Internal] Sets the __MILID__ property (eg. "svg_1") of the specified 'targetDomElement' (if not already set).
     * @param {DomElement} targetDomElement The DOM element to tag.
     * @internal
     */
    export function tagWithTargetElementID(targetDomElement: DomElement): void
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

    /** 
     * Returns true if at least one Ink is currently being dragged. 
     * @returns {boolean} Result.
     */
    export function IsInkDragInProgress(): boolean
    {
        for (let i = 0; i < MIL._inks.length; i++)
        {
            if (MIL._inks[i].previousDragMovePoint() !== null)
            {
                return (true);
            }
        }
        return (false);
    }

    /**
     * Returns all the current Ink instances that have the specified 'className', or returns all Inks if no 'className' is specified.
     * @param {string} [className] [Optional] The class name an Ink instance should have to be included in the results.
     * @returns {Ink[]} Result.
     */
    export function Inks(className?: string): Ink[]
    {
        let filteredInks: Ink[] = [];

        for (let i = 0; i < MIL._inks.length; i++)
        {
            if ((className === undefined) || MIL._inks[i].Path().classed(className))
            {
                filteredInks.push(MIL._inks[i]);
            }
        }

        // We don't return _inks directly so that Inks() can be iterated over and freely delete from _inks (eg. via Ink.Delete()) without issue
        return (filteredInks);
    }

    /**
     * Returns the Ink that corresponds to the supplied SVG Path, or null if the Path does not belong to any Ink (as either its Ink.Path or Ink.HullPath).
     * @param {TargetDomElement} targetElement The Path element to check.
     * @returns {Ink | null} Result.
     */
    export function GetInkByElement(targetElement: TargetDomElement): Ink | null
    {
        let domElement: DomElement = Utils.GetDomElement(targetElement);

        if (domElement instanceof SVGPathElement)
        {
            for (let i = 0; i < MIL._inks.length; i++)
            {
                let inkPathMatches = (MIL._inks[i].Path().node() === domElement);
                let hullPathMatches = (MIL._inks[i].HullPath() !== null) && (MIL._inks[i].HullPath().node() === domElement);

                if (inkPathMatches || hullPathMatches)
                {
                    return (MIL._inks[i]);
                }
            }
        }
        return (null);
    }

    /**
     * Returns the Ink that has the supplied ID, or null if there is no such Ink.
     * @param {string} targetInkID The ID of the Ink to find.
     * @returns {Ink | null} Result.
     */
    export function GetInkByID(targetInkID: string): Ink | null
    {
        for (let i = 0; i < MIL._inks.length; i++)
        {
            if (MIL._inks[i].InkID() === targetInkID)
            {
                return (MIL._inks[i]);
            }
        }
        return (null);
    }

    /** 
     * [Private Method] Returns true if a Gesture has started. 
     * @returns {boolean} Result.
     */
    function isAwaitingGestureCompletion()
    {
        for (let targetElementID in _targetElementState)
        {
            if (_targetElementState[targetElementID].isAwaitingGestureCompletion === true)
            {
                return (true);
            }
        }
        return (false);
    }

    /**
     * [Private Method] Adds MIL's event listeners to the specified element.
     * @param {DomElement} domElement The target element.
     */
    function addPointerEventListeners(domElement: DomElement): void
    {
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
    function removePointerEventListeners(domElement: DomElement): void
    {
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
    export function Version()
    {
        return ("0.0.20200224.0"); // Major.Minor.Date.IntraDayRevision [Date = YYYYMMDD]
    }

    /**
     * Initializes MIL for use with the specified SVG element. The returned <g> element is automatically appended to the <svg>.
     * @param {SVGSVGElement | D3SingleSelection} svg The SVG element to enable for use with MIL. Can either be an SVG DOM element, or a d3 selection of that DOM element.
     * @returns {SVGGElement} The created SVG Group (<g>) DOM element.
     */
    export function Initialize(svg: DomElement): SVGGElement
    {
        if (typeof (d3) === "undefined")
        {
            throw new MILException("MIL requires d3.js (v4): visit https://d3js.org/");
        }

        let svgDomElement: DomElement = Utils.GetDomElement(svg, SVGSVGElement);

        if (svgDomElement.ownerSVGElement !== null)
        {
            // This would allow independent panning/zooming of the nested SVG, which is not currently supported 
            // [it would break the "linearity" of the original SVG's drawing surface]
            throw new MILException("Calling Initialize() on a nested SVG element is not allowed");
        }

        if (window.getComputedStyle(svgDomElement).touchAction !== "none")
        {
            throw new MILException("When using MIL the target SVG element must have its 'touch-action' CSS property set to 'none' to turn off the browser's default touch gestures");
        }

        // Turn on the default level of logging
        DebugFeature(FeatureNames.Default, true);

        tagWithTargetElementID(svgDomElement);
        let svgID: string = getTargetElementID(svgDomElement);

        if (_svgInfo[svgID] === undefined)
        {
            let gDomElement: SVGGElement = document.createElementNS("http://www.w3.org/2000/svg", "g");
            svgDomElement.appendChild(gDomElement);

            // Rather than wait for AddGesture() to be called (which is the normal way addPointerEventListeners() gets called)
            // we treat svgDomElement as a special case because we want our SVG handlers to be first in the invocation chain
            // (ie. called before any pointer-event handlers that the user may add to svgDomElement independently of MIL)
            addPointerEventListeners(svgDomElement);

            _svgInfo[svgID] =
            {
                svgDomElement: svgDomElement as SVGSVGElement,
                gDomElement: gDomElement,
                svgWidth: svgDomElement.clientWidth, // In pixels
                svgHeight: svgDomElement.clientHeight, // In pixels
                zoomLevel: 1,
                panTop: 0, // In zoom-adjusted (scaled) pixels
                panLeft: 0, // In zoom-adjusted (scaled) pixels
                gSelection: d3.select(gDomElement),
                settings: new MILSettings(),
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
            const checkIntervalInMs: number = 200;
            setInterval(function eventWatchdog()
            {
                const normalMaxAgeInMs: number = (checkIntervalInMs / 2) + 50; // 150ms

                for (let targetElementID in _activePointerLatestMoveEvents)
                {
                    for (let pointerID in _activePointerLatestMoveEvents[targetElementID])
                    {
                        let e: PointerEvent = _activePointerLatestMoveEvents[targetElementID][pointerID];
                        let now: number = Date.now(); // Just to make debugging easier
                        let isPointerCapturedByElement: boolean = _activePointerCaptures.hasOwnProperty(targetElementID) && (_activePointerCaptures[targetElementID].indexOf(pointerID) !== 1);

                        // Pen and touch (but not mouse) pointer-move events get generated with high-frequency [after a pointer-down],
                        // so if the latest pointer-move event becomes "too old" it indicates that pointer events have stopped happening,
                        // which is BUGBUG#1 (a capturing element stops receiving pointer-events)

                        if (isPointerCapturedByElement && ((e.pointerType === "touch") || (e.pointerType === "pen")) && (e.type === "pointermove"))
                        {
                            let moveEventAgeInMs: number = now - (e as BaseObject).__MILTimeStamp__;

                            if (moveEventAgeInMs > (checkIntervalInMs + (normalMaxAgeInMs * 3))) // 650ms
                            {
                                log("Warning: BUGBUG#1 detected for " + pointerID + " on " + targetElementID + " [pointer is captured, but last pointerMove event age is " + moveEventAgeInMs + "ms]");
                                onPointerUp(e); // Try to recover
                            }
                        }
                    }
                }
            }, checkIntervalInMs);
        }

        return (_svgInfo[svgID].gDomElement);
    }

    /**
     * Returns the count of active Gestures that target the specified element.
     * @param {DomElement | null} targetDomElement The element to filter by, or null to include all Gestures regardless of the element they target.
     * @returns {number} Result.
     */
    export function GetActiveGestureCount(targetDomElement: DomElement): number
    {
        let domElement: DomElement = Utils.GetDomElement(targetDomElement);
        let activeGestureCount: number = 0;

        for (let g = 0; g < _gestures.length; g++)
        {
            if ((targetDomElement === null) || (_gestures[g].Target() === domElement))
            {
                if (_gestures[g].IsActive() && !_gestures[g].IsCancelled())
                {
                    activeGestureCount++;
                }
            }
        }

        return (activeGestureCount);
    }

    /**
     * [Private Method] Returns a count of the number of Gestures that target the specified element.
     * @param {DomElement} targetDomElement The element to inspect.
     * @returns {number} Result.
     */
    function getGestureCountByTarget(targetDomElement: DomElement): number
    {
        let gestureCountForTarget: number = 0;

        for (let g = 0; g < _gestures.length; g++)
        {
            if (_gestures[g].Target() === targetDomElement)
            {
                gestureCountForTarget++;
            }
        }

        return (gestureCountForTarget);
    }

    /**
     * Removes the Gesture with the specified name. A silent no-op if no such Gesture exists.
     * @param {string} name The name of the Gesture to remove.
     */
    export function RemoveGestureByName(name: string)
    {
        for (let g = 0; g < _gestures.length; g++)
        {
            let gesture = _gestures[g];

            if (gesture.Name() === name)
            {
                removeGestureAtIndex(g);
                // No need to keep looking since gesture names are unique
                break;
            }
        }
    }

    /**
     * [Private Method] Removes the Gesture at the specified index (of _gestures). A silent no-op if no such index exists.
     * @param {number} index The index of the Gesture to remove.
     */
    function removeGestureAtIndex(index: number): void
    {
        if (index < _gestures.length)
        {
            let gesture: Gesture = _gestures[index];
            let targetDomElement: DomElement = gesture.Target();

            // Remove the Gesture
            _gestures.splice(index, 1);

            // If this was the last gesture to use gesture.Target() then remove the pointer-event listeners from the target
            if (getGestureCountByTarget(targetDomElement) === 0)
            {
                removePointerEventListeners(targetDomElement);
            }
        }
    }

    /**
     * Removes all the Gestures that target the specified element, optionally filtered by having a name that starts with gestureName.
     * @param {TargetDomElement} targetElement The element to inspect.
     * @param {string} [gestureName] [Optional] Only remove a Gesture if it starts with this name.
     */
    export function RemoveGesturesByTarget(targetElement: TargetDomElement, gestureName?: string): void
    {
        let domElement: DomElement = Utils.GetDomElement(targetElement);

        for (let g = _gestures.length - 1; g >= 0; g--)
        {
            let gesture: Gesture = _gestures[g];
            var name: string = gesture.Name(); // Note: Don't use 'let' here: it will result in the variable being renamed during compilation which means it won't surface correctly in the debugger

            if (gesture.Target() === domElement)
            {
                if ((gestureName === undefined) || (name.indexOf(gestureName) === 0))
                {
                    removeGestureAtIndex(g);
                    // Note that we keep looking for additional gestures on the domElement
                }
            }
        }
    }

    /**
     * Transposes the clientX/Y of the supplied Pointer Event into the coordinate space of the specified svg 'g' element [which may have been transformed].
     * Returns the new point as an object with x/y members.
     * @param {PointerEvent} e The PointerEvent to transpose.
     * @param {SVGGElement} g The SVG group element (or other SVG Element that's in an SVG group) to transpose the PointerEvent into.
     * @returns {Point} Result.
     */
    export function TransposePointer(e: PointerEvent, g: TargetDomElement): Point
    {
        // Note: e.clientX/Y are relative to [the top-left (0,0)] of the document window
        let pointInGSpace: Point = TransposeScreenPoint({ x: e.clientX, y: e.clientY }, g);
        return (pointInGSpace); // With no zooming, this point will be the same as { x: e.clientX, y: e.clientY } [assuming the svg is at 0,0 in the document]
    }

    /**
     * Transposes the supplied screen-point into the coordinate space of the svg 'g' element [which may have been transformed] to which targetElement belongs.
     * Returns the new point as an object with x/y members.
     * @param {Point} screenPoint A point in screen coordinates.
     * @param {SVGGElement | TargetDomElement} targetElement The SVG group element (or other SVGElement that's in the SVG group) to transpose the 'screenPoint' into.
     * @returns {Point} Result.
     */
    export function TransposeScreenPoint(screenPoint: Point, targetElement: SVGGElement | TargetDomElement): Point
    {
        let gDomElement: SVGGElement = null;

        if (targetElement instanceof SVGGElement)
        {
            gDomElement = targetElement;
        }
        else
        {
            let svgInfo: SVGInfo = getSvgInfo(targetElement);
            gDomElement = svgInfo.gDomElement;
        }

        let svgDomElement: SVGSVGElement = gDomElement.ownerSVGElement;
        let svgPoint: SVGPoint = svgDomElement.createSVGPoint();

        svgPoint.x = screenPoint.x;
        svgPoint.y = screenPoint.y;
        svgPoint = svgPoint.matrixTransform(gDomElement.getScreenCTM().inverse());
        let pointInGSpace = { x: svgPoint.x, y: svgPoint.y };

        return (pointInGSpace); // With no zooming, this point will be the same as { x: screenPoint.x, y: screenPoint.y } [assuming the svg is at 0,0 in the document]
    }

    /**
     * Gets or sets the zoom level for the specified SVG element.
     * @param {TargetDomElement} svgDomElement An SVG element.
     * @param {number} [level] [Optional] The new zoom level.
     * @param {Point} [focalScreenPoint] [Optional] The focal point (in screen coordinates) of the zoom. If not supplied, the center of the SVG elment will be used.
     * @returns {number | void} Result (or void).
     */
    export function Zoom(svgDomElement: TargetDomElement, level?: number, focalScreenPoint?: Point): number | void
    {
        let svgInfo: SVGInfo = getSvgInfo(svgDomElement);
        let settings: MILSettings = svgInfo.settings;
        let ruler: Controls.RulerControl = svgInfo.ruler;

        if (level === undefined)
        {
            return (svgInfo.zoomLevel);
        }
        else
        {
            if (level !== svgInfo.zoomLevel)
            {
                let prevZoomLevel: number = svgInfo.zoomLevel;
                let newZoomLevel: number = svgInfo.zoomLevel = Math.min(settings.MaxZoomLevel(), Math.max(settings.MinZoomLevel(), level));

                if (ruler && ruler.IsVisible())
                {
                    // To re-scale (if KeepConstantScale() is true) and/or to update the displayed zoom-level
                    ruler.Redraw();
                }

                svgInfo.radialMenus.forEach(function (radialMenu)
                {
                    if (radialMenu.IsVisible() && radialMenu.KeepConstantScale())
                    {
                        // To re-scaled the radial menu
                        radialMenu.Redraw();
                    }
                });

                if (focalScreenPoint === undefined)
                {
                    // Use the center of the svg
                    let svgRect: ClientRect = svgInfo.svgDomElement.getBoundingClientRect();
                    focalScreenPoint = { x: svgRect.left + (svgRect.width / 2), y: svgRect.top + (svgRect.height / 2) };
                }

                zoomAtPoint(svgInfo, focalScreenPoint, prevZoomLevel, newZoomLevel);
            }
        }
    }

    /**
     * Returns the current pan position (x/y offsets) of the specified SVG element.
     * @param {TargetDomElement} svgDomElement An SVG element.
     * @returns {PanPosition} Result.
     */
    export function Pan(svgDomElement: TargetDomElement): PanPosition
    {
        let svgInfo: SVGInfo = getSvgInfo(svgDomElement);
        return ({ left: svgInfo.panLeft, top: svgInfo.panTop });
    }

    /**
     * Pans the specified SVG element by the specified number of pixels relative to the current pan position.
     * @param {TargetDomElement} svgDomElement An SVG element.
     * @param {number} deltaXInPixels The number of pixels to change the pan by on the x-axis.
     * @param {number} deltaYInPixels The number of pixels to change the pan by on the y-axis.
     */
    export function PanRelative(svgDomElement: TargetDomElement, deltaXInPixels: number, deltaYInPixels: number): void
    {
        let svgInfo: SVGInfo = getSvgInfo(svgDomElement);
        pan(svgInfo, deltaXInPixels, deltaYInPixels, false);
    }

    /**
     * Pans the specified SVG element to the specified absolute position. // PORT: Is this in screen coordinates?
     * @param {TargetDomElement} svgDomElement An SVG element.
     * @param {number} absoluteX The abolsolute position along the x-axis.
     * @param {number} absoluteY The abolsolute position along the y-axis.
     */
    export function PanAbsolute(svgDomElement: TargetDomElement, absoluteX: number, absoluteY: number): void
    {
        let svgInfo: SVGInfo = getSvgInfo(svgDomElement);
        pan(svgInfo, absoluteX, absoluteY, true);
    }

    /**
     * [Private Method] Returns the matrix transform (which describes the current pan/zoom) for the root <g> element of the supplied svgInfo.
     * @param {SVGInfo} svgInfo An SVGInfo.
     * @returns {DOMMatrix} Result.
     */
    function getPanZoomMatrix(svgInfo: SVGInfo): DOMMatrix
    {
        let svg: SVGSVGElement = svgInfo.svgDomElement;
        let g: SVGGElement = svgInfo.gDomElement;
        let transformList: SVGTransformList = g.transform.baseVal;

        if (transformList.numberOfItems === 0)
        {
            // No panning/zooming so far
            let emptyMatrixTransform: SVGTransform = svg.createSVGTransformFromMatrix(svg.createSVGMatrix());
            transformList.appendItem(emptyMatrixTransform);
        }
        else 
        {
            // Check that the root (first) transform of the <g> is a "composite" matrix transform (as opposed to a individual scale/skew/translate/etc. transform)
            if (transformList.getItem(0).type !== SVGTransform.SVG_TRANSFORM_MATRIX)
            {
                throw new MILException("The first transform of the root SVGGElement of '" + getTargetElementID(svg) + "' was expected to be a of type " + SVGTransform.SVG_TRANSFORM_MATRIX + " (matrix), but it is of type " + transformList.getItem(0).type);
            }
        }

        let matrix: DOMMatrix = transformList.getItem(0).matrix;

        return (matrix);
    }

    /**
     * [Private Method] Zooms the <g> element of the supplied svgInfo to the specified newZoomLevel [from the specified prevZoomLevel].
     * @param {SVGInfo} svgInfo An SVGInfo.
     * @param {Point} focalScreenPoint The focal point (in screen coordinates) of the zoom.
     * @param {number} prevZoomLevel The previous (current) zoom level.
     * @param {number} newZoomLevel The new zoom level.
     */
    function zoomAtPoint(svgInfo: SVGInfo, focalScreenPoint: Point, prevZoomLevel: number, newZoomLevel: number): void
    {
        let svg: SVGSVGElement = svgInfo.svgDomElement;
        let settings: MILSettings = svgInfo.settings;
        let transformList: SVGTransformList = svgInfo.gDomElement.transform.baseVal;
        let matrix: DOMMatrix = getPanZoomMatrix(svgInfo);
        let absolutePoint: Point = MIL.TransposeScreenPoint(focalScreenPoint, svgInfo.gDomElement);
        let offsetX: number = absolutePoint.x;
        let offsetY: number = absolutePoint.y;
        let zoomFactor: number = newZoomLevel / prevZoomLevel; // Factor representing the relative CHANGE in zoomLevel

        // Note: These matrix multiplications are performed in right-to-left order (just like the "transform" attribute)
        let modifierMatrix: DOMMatrix = svg.createSVGMatrix().translate(offsetX, offsetY).scale(zoomFactor).translate(-offsetX, -offsetY);
        let newMatrix: DOMMatrix = matrix.multiply(modifierMatrix);

        transformList.getItem(0).setMatrix(newMatrix);

        // Sanity check that our matrix math hasn't scaled beyond the user-specified zoom limits [Zoom() should have bounded newZoomLevel to prevent this]
        // Note: Over time the repeated matrix multiplications adds some floating point imprecision, so we check using only the first 5 decimal places
        let actualScale: number = +newMatrix.a.toFixed(5);
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
    function pan(svgInfo: SVGInfo, deltaXInPixels: number, deltaYInPixels: number, isAbsoluteValues: boolean): void
    {
        let transformList: SVGTransformList = svgInfo.gDomElement.transform.baseVal;
        let matrix: DOMMatrix = getPanZoomMatrix(svgInfo);

        if (isAbsoluteValues)
        {
            // Note: deltaXInPixels and deltaYInPixels are actually absolute values in this case
            if ((deltaXInPixels === matrix.e) && (deltaYInPixels === matrix.f))
            {
                return;
            }

            matrix.e = deltaXInPixels;
            matrix.f = deltaYInPixels;
        }
        else
        {
            if ((deltaXInPixels === 0) && (deltaYInPixels === 0))
            {
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
    function enforcePanLimits(svgInfo: SVGInfo): void
    {
        let svg: SVGSVGElement = svgInfo.svgDomElement;
        let svgRect: ClientRect = svg.getBoundingClientRect();
        let transformList: SVGTransformList = svgInfo.gDomElement.transform.baseVal;
        let matrix: DOMMatrix = getPanZoomMatrix(svgInfo);

        let upperLeftScreenPoint: Point = { x: svgRect.left, y: svgRect.top };
        let lowerRightScreenPoint: Point = { x: svgRect.right, y: svgRect.bottom };
        let upperLeftAbsolutePoint: Point = MIL.TransposeScreenPoint(upperLeftScreenPoint, svgInfo.gDomElement);
        let lowerRightAbsolutePoint: Point = MIL.TransposeScreenPoint(lowerRightScreenPoint, svgInfo.gDomElement);
        let top: number = upperLeftAbsolutePoint.y;
        let left: number = upperLeftAbsolutePoint.x;
        let bottom: number = lowerRightAbsolutePoint.y;
        let right: number = lowerRightAbsolutePoint.x;

        let minZoomLevel: number = svgInfo.settings.MinZoomLevel();
        let panableWidth: number = svgInfo.svgWidth / minZoomLevel; // Eg. 500 / 0.5 = 1000
        let panableHeight: number = svgInfo.svgHeight / minZoomLevel; // Eg. 400 / 0.5 = 800
        let rangeX: number = (panableWidth - svgInfo.svgWidth) / 2; // The +/- pannable x-range
        let rangeY: number = (panableHeight - svgInfo.svgHeight) / 2; // The +/- pannable y-range

        let adjustmentX: number;
        let adjustmentY: number;

        if (left < -rangeX)
        {
            adjustmentX = left - (-rangeX);
            matrix.e += adjustmentX * svgInfo.zoomLevel;
            transformList.getItem(0).setMatrix(matrix);
        }

        if (top < -rangeY)
        {
            adjustmentY = top - (-rangeY);
            matrix.f += adjustmentY * svgInfo.zoomLevel;
            transformList.getItem(0).setMatrix(matrix);
        }

        if (right > (svgInfo.svgWidth + rangeX))
        {
            adjustmentX = right - (svgInfo.svgWidth + rangeX);
            matrix.e += adjustmentX * svgInfo.zoomLevel;
            transformList.getItem(0).setMatrix(matrix);
        }

        if (bottom > (svgInfo.svgHeight + rangeY))
        {
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
    export function getPointerDownEvent(pointerID: string, targetDomElement: DomElement): PointerEvent
    {
        let targetElementID: string = getTargetElementID(targetDomElement);

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

    /**
     * Returns the most recent pointerMove event for the specified pointerID on the specified targetDomElement, or null if no such event exists.
     * @param {string} pointerID A pointer ID. Can also be a PointerEvent.pointerType (eg. "pen").
     * @param {DomElement} targetDomElement The DOM element that the pointer is targeting.
     * @returns {PointerEvent | null} Result.
     */
    export function getLatestPointerMoveEvent(pointerID: string, targetDomElement: DomElement): PointerEvent | null
    {
        let targetElementID: string = getTargetElementID(targetDomElement);

        if (_activePointerLatestMoveEvents[targetElementID].hasOwnProperty(pointerID))
        {
            return (_activePointerLatestMoveEvents[targetElementID][pointerID]);
        }
        else
        {
            // If the supplied pointerID specifies a pointerType, return the most recent PointerMove event (if any) of that pointerType
            if ((pointerID === "pen") || (pointerID === "touch") || (pointerID === "mouse"))
            {
                let targetType: string = pointerID;
                let e: PointerEvent = null;

                for (let pid in _activePointerLatestMoveEvents[targetElementID])
                {
                    if (_activePointerLatestMoveEvents[targetElementID][pid].pointerType === targetType)
                    {
                        e = _activePointerLatestMoveEvents[targetElementID][pid];
                    }
                }
                return (e);
            }
        }
        return (null);
    }

    /**
     * [Internal] Creates a MIL pointer ID (eg. "PointerID_touch_1234") for the specified PointerEvent.
     * @param {PointerEvent} e A PointerEvent.
     * @returns {string} Result.
     * @internal
     */
    export function makePointerID(e: PointerEvent)
    {
        // Note: e.pointerId for a pen DOES NOT increment at pointerUp: it increments at pointerLeave (when the pen leaves the hover range detectable by the digitizer)
        return ("PointerID_" + e.pointerType + "_" + e.pointerId);
    }

    /**
     * Enables or disables the specified Gesture group. Note: Gesture groups are enabled unless explictly disabled.
     * @param {string} groupName A Gesture group name.
     * @param {boolean} enable Flag.
     */
    export function EnableGestureGroup(groupName: string, enable: boolean): void
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

    /**
     * Returns true if the specified Gesture group is enabled.
     * @param {string} groupName The name of the Gesture group to check.
     * @returns {boolean} Result.
     */
    export function IsGestureGroupEnabled(groupName: string): boolean
    {
        return (_disabledGestureGroups[groupName] === undefined);
    }

    // There is only ever one pen, so this is a global function
    // Note: Sometimes [on a Surface Studio] the pen pressure calibration seems to get out of whack (readings are way too high for light pressure); 
    //       this can sometimes be resolved by briefly removing/re-seating the AAAA battery in the pen
    /**
     * Returns the current pen presssure (if any) on the targetElement. If the pen is not being used, returns null.
     * @param {TargetDomElement} targetElement The element to inspect.
     * @returns {number | null} Result.
     */
    export function PenPressure(targetElement: TargetDomElement): number | null
    {
        let domElement: DomElement = Utils.GetDomElement(targetElement);
        let e: PointerEvent = getLatestPointerMoveEvent("pen", domElement);
        return (e === null ? null : e.pressure);
    }

    // There is only ever one pen, so this is a global function
    /**
     * Returns the current pen buttons (if any) being used on the targetElement. If the pen is not being used, returns null.
     * @param {TargetDomElement} targetElement The element to inspect.
     * @returns {number | null} Result.
     */
    export function PenButtons(targetElement: TargetDomElement): number | null
    {
        let domElement: DomElement = Utils.GetDomElement(targetElement);
        let e: PointerEvent = getLatestPointerMoveEvent("pen", domElement);
        return (e === null ? null : e.buttons);
    }

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
    export function recognizeGesture(targetDomElement: DomElement, actualRecognitionTimeoutInMs: number, maxRecognitionTimeoutInMs: number, allowSimultaneousGestureInstances: boolean = true): GestureRecognitionResult
    {
        let targetElementID: string = getTargetElementID(targetDomElement);
        let isFromPointerUp: boolean = (actualRecognitionTimeoutInMs === -1); // This is really 'isFromRemovePointer', which includes both pointerUp and pointerLeave
        let recognizedGesture: Gesture = null;
        let pointerTypePermutationIndex: number = 0;
        let pointerList: string[] = [];
        let touchCount: number = 0;
        let penCount: number = 0; // Will only ever be 0 or 1
        let mouseCount: number = 0; // Will only ever be 0 or 1
        let hoverCount: number = 0;
        let requiredTouchCount: number = 0;
        let requiredPenCount: number = 0; // Will only ever be 0 or 1
        let requiredMouseCount: number = 0; // Will only ever be 0 or 1
        let requiredHoverCount: number = 0;
        let requiredAnyCount: number = 0;
        let recognitionResult: GestureRecognitionResult = { success: false, propagateEvents: true };
        let continueSearching: boolean = true;
        let permutationQualifier: string = "";

        log("Starting gesture recognition" + (isFromPointerUp ? " [during pointer-up]" : (" [after " + actualRecognitionTimeoutInMs + "ms]")) + " on '" + targetElementID + "'...", FeatureNames.GestureRecognition);

        // Cancel any pending recognition timer
        cancelRecognizeGestureTimer(targetElementID);

        // Match _activePointerDownEvents (for targetDomElement) to _gestures (that target targetDomElement)
        for (let pointerID in _activePointerDownEvents[targetElementID])
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

        for (let hoverPointerID in _activeHoverEvents[targetElementID])
        {
            hoverCount++;
            pointerList.push(hoverPointerID);
        }

        if ((penCount === 0) && (touchCount === 0) && (mouseCount === 0) && (hoverCount === 0))
        {
            // The timer that called recognizeGesture() ticked AFTER all pointers have been removed
            log("Gesture recognition skipped (reason: There are no active pointers" + ((maxRecognitionTimeoutInMs > 0) ? "; the largest RecognitionTimeoutInMs (" + maxRecognitionTimeoutInMs + "ms) for gestures on '" + targetElementID + "' may be too long)" : ")"), FeatureNames.GestureRecognition);
            _targetElementState[targetElementID].isAcquiringPointers = false;
            _targetElementState[targetElementID].gestureRecognitionRan = true;
            return (recognitionResult);
        }

        log("Looking for gestures on " + targetElementID + " that require pen:" + penCount + "+touch:" + touchCount + "+mouse:" + mouseCount + "+hover:" + hoverCount, FeatureNames.GestureRecognition);

        for (let g = 0; (g < _gestures.length) && continueSearching; g++)
        {
            let gesture: Gesture = _gestures[g];
            let isMatch: boolean = true;

            if (gesture.Target() !== targetDomElement)
            {
                continue;
            }

            if (!gesture.IsEnabled())
            {
                log("Skipping gesture '" + gesture.Name() + "' (reason: gesture is disabled)", FeatureNames.GestureRecognition);
                continue;
            }

            // If ANY gesture [even if NOT recognized] on the target doesn't allow events to be propagated, then we prevent propagation
            recognitionResult.propagateEvents = (recognitionResult.propagateEvents && gesture.AllowEventPropagation());

            if (gesture.IsActive() && !allowSimultaneousGestureInstances)
            {
                log("Skipping gesture '" + gesture.Name() + "' (reason: gesture is already active" + (gesture.IsCancelled() ? " [cancelled]" : "") + ")", FeatureNames.GestureRecognition);
                continue;
            }

            let isIncompleteRecognition: boolean = (gesture.repeatOccurrenceCount() > 0) && gesture.IsCancelled();
            if (isIncompleteRecognition)
            {
                // One (or more) occurrence of a repeating gesture has happened, but the next occurrence took too long so the gesture was cancelled
                log("Skipping gesture '" + gesture.Name() + "' (reason: repeating gesture is incomplete [occurrence " + (gesture.repeatOccurrenceCount() + 1) + " of " + gesture.RepeatCount() + " timed-out])");
                continue;
            }

            for (pointerTypePermutationIndex = 0; pointerTypePermutationIndex < gesture.PointerTypePermutations().length; pointerTypePermutationIndex++)
            {
                // Note: pointerType can be of the form "touch:2+pen" or "touch+touch+pen"
                let pointerType: string = gesture.PointerTypePermutations()[pointerTypePermutationIndex];
                let types: string[] = pointerType.split("+");

                isMatch = true;
                requiredTouchCount = 0;
                requiredPenCount = 0;
                requiredMouseCount = 0;
                requiredHoverCount = 0;
                requiredAnyCount = 0;

                for (let i = 0; i < types.length; i++)
                {
                    let parts: string[] = types[i].split(":");
                    let type: string = parts[0];
                    let requiredCount: number = (parts.length === 1) ? 1 : +parts[1];

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
                    isMatch = isMatch && (touchCount === requiredTouchCount);
                }
                if (requiredPenCount > 0)
                {
                    isMatch = isMatch && (penCount === requiredPenCount);
                }
                if (requiredMouseCount > 0)
                {
                    isMatch = isMatch && (mouseCount === requiredMouseCount);
                }
                if (requiredHoverCount > 0)
                {
                    isMatch = isMatch && (hoverCount === requiredHoverCount);
                }
                if (requiredAnyCount > 0)
                {
                    isMatch = isMatch && (touchCount + penCount + mouseCount + hoverCount === requiredAnyCount);
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
                    if (isFromPointerUp && (gesture.CompletionTimeoutInMs() > 0))
                    {
                        // For gestures that specify a CompletionTimeoutInMs (eg. a tap), check if the pointer-up (or pointer-leave [for hover]) is happening during the completion window
                        let elapsedMsFromFirstPointerDownToFirstPointerUp: number = Date.now() - (_activePointerDownStartTime[targetElementID] || _activeHoverStartTime[targetElementID]);
                        isMatch = (elapsedMsFromFirstPointerDownToFirstPointerUp < gesture.CompletionTimeoutInMs());

                        if (!isMatch)
                        {
                            log("Skipping gesture '" + gesture.Name() + "' (reason: Gesture completion time [" + elapsedMsFromFirstPointerDownToFirstPointerUp + "ms] exceeded its CompletionTimeout [" + gesture.CompletionTimeoutInMs() + "ms])", FeatureNames.GestureRecognition);
                        }
                    }

                    if (isMatch && (gesture.Conditional() !== null))
                    {
                        isMatch = gesture.Conditional().call(gesture);

                        if (!isMatch)
                        {
                            log("Skipping gesture '" + gesture.Name() + "' (reason: Conditional() returned false)", FeatureNames.GestureRecognition);
                        }
                    }

                    if (isMatch && gesture.IsExclusive())
                    {
                        isMatch = GetActiveGestureCount(gesture.Target()) === 0;

                        if (!isMatch)
                        {
                            log("Skipping gesture '" + gesture.Name() + "' (reason: IsExclusive() is true and another Gesture is already active on the Target())", FeatureNames.GestureRecognition);
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
                            _targetElementState[targetElementID].isAwaitingGestureCompletion = false;
                            log("Warning: Preventing propagation of events on '" + targetElementID + "' because gesture '" + gesture.Name() + "' uses RepeatCount(" + gesture.RepeatCount() + ")", FeatureNames.GestureRecognition);
                        }

                        if (isMatch)
                        {
                            let timeSinceLastRecognitionInMs: number = Date.now() - gesture.lastRepeatRecognitionTime();

                            if (timeSinceLastRecognitionInMs > gesture.RepeatTimeoutInMs())
                            {
                                gesture.repeatOccurrenceCount(0);
                            }

                            gesture.repeatOccurrenceCount(gesture.repeatOccurrenceCount() + 1);

                            isMatch = (gesture.repeatOccurrenceCount() === gesture.RepeatCount()) && (timeSinceLastRecognitionInMs <= gesture.RepeatTimeoutInMs());
                            gesture.lastRepeatRecognitionTime(Date.now());

                            if (!isMatch)
                            {
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
                            else
                            {
                                gesture.stopCompletionTimeout();
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
                    permutationQualifier = (gesture.PointerTypePermutations().length > 1) ? " [permutation '" + gesture.PointerTypePermutations()[pointerTypePermutationIndex] + "']" : "";
                    log("Skipping gesture '" + gesture.Name() + "' (reason: PointerType()" + permutationQualifier + " does not match)", FeatureNames.GestureRecognition);
                }
            }
        }

        if (recognizedGesture !== null)
        {
            // PORT: All these getters/setters are new
            recognizedGesture.activePointerList(pointerList);
            recognizedGesture.activePointerTypeOrdinals(recognizedGesture.getPointerTypeOrdinals(pointerTypePermutationIndex));
            recognizedGesture.startedTime(Date.now());
            recognizedGesture.endedTime(0);
            recognizedGesture.isCancelled(false);

            permutationQualifier = (recognizedGesture.PointerTypePermutations().length > 1) ? " [permutation '" + recognizedGesture.PointerTypePermutations()[pointerTypePermutationIndex] + "']" : "";
            log("Gesture '" + recognizedGesture.Name() + "'" + permutationQualifier + " recognized"); // We always want to report this message, so we don't specify FeatureNames.GestureRecognition

            // If needed, start a gesture completion timer [unless we're being called from pointer-up, in which case the gesture is already ending]
            if ((recognizedGesture.CompletionTimeoutInMs() > 0) && !isFromPointerUp)
            {
                _targetElementState[targetElementID].isAwaitingGestureCompletion = true;

                // Note: If this timeout expires it will cancel the gesture, but it will also trigger another 'recognizeGesture()' call
                recognizedGesture.startCompletionTimeout(recognizedGesture.CompletionTimeoutInMs(), "completion", true, function () { _targetElementState[targetElementID].isAwaitingGestureCompletion = false; });
            }

            if (recognizedGesture.GestureStartedHandler() !== null)
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
        _targetElementState[targetElementID].isAcquiringPointers = false;
        _targetElementState[targetElementID].gestureRecognitionRan = true;

        recognitionResult.success = (recognizedGesture !== null);
        return (recognitionResult);
    }

    /**
     * [Private Method] Returns the Gesture that's currently inking using the specified pointerID, or null if there's no such Gesture.
     * @param {string} pointerID A pointer ID.
     * @returns {Gesture | null} Result.
     */
    function getInkingGesture(pointerID: string): Gesture | null
    {
        if (pointerID)
        {
            for (let g = 0; g < _gestures.length; g++)
            {
                let gesture: Gesture = _gestures[g];
                let ink: Ink = gesture.Ink();

                if ((ink !== null) && (ink.PointerID() !== null) && (ink.PointerID() === pointerID))
                {
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
    export function propagateQueuedEvents(targetDomElement: DomElement): void
    {
        if (MIL._postponedPointerEvents.length === 0)
        {
            log("There are no events to propagate");
            return;
        }

        let eventList: PointerEvent[] = [];
        let atSVGRoot: boolean = (targetDomElement instanceof SVGSVGElement); // This is a special case: we want to redispatch back to the SVG element to be picked up by any user-installed handlers on the SVG element

        // PORT: This assignment was changed from: "atSVGRoot ? targetDomElement : (targetDomElement.parentElement || targetDomElement.parentNode);"
        let parentDomElement: DomElement = atSVGRoot ? targetDomElement : (targetDomElement.parentNode as DomElement);

        if (!parentDomElement)
        {
            return;
        }

        // Propagating "hover" events (pointerEnter/Move/Leave) is potentially problematic, both technically (due to the delayed nature of a "hover-start" 
        // and the less deterministic nature of pointerEnter/Leave events) as well as logically (due to the fact that the target being propagated to is 
        // usually partially occluded by the element that didn't have a hover gesture of its own).
        // So to avoid dealing with this added complexity we simply abort propagation if we encounter a "hover-start" event.
        for (let i = 0; i < MIL._postponedPointerEvents.length; i++)
        {
            if ((MIL._postponedPointerEvents[0] as BaseObject).__MILIsMILHoverStartEvent__ === true)
            {
                log("Event propagation skipped (reason: The queue contains a 'hover-start' event); Clearing " + MIL._postponedPointerEvents.length + " queued pointer events");
                MIL._postponedPointerEvents.length = 0;
                return;
            }
        }

        if (MIL._postponedPointerEvents[0].type !== "pointerdown")
        {
            throw new MILException("The postponed pointer-event queue must always start with a 'pointerdown' event"); // See comments at end of function
        }

        // First, we make a copy of _postponedPointerEvents [since as we dispatch the 'pointerdown' event the onPointerDown handler will reset _postponedPointerEvents]
        for (let i = 0; i < MIL._postponedPointerEvents.length; i++)
        {
            eventList.push(MIL._postponedPointerEvents[i]);
        }

        for (let i = 0; i < eventList.length; i++)
        {
            let e: PointerEvent & BaseObject = eventList[i];

            // Aside: This is far simpler, but not available in IE11
            // let newEvent = Object.assign({}, e);

            // Propagate the event (to - potentially - either MIL or non-MIL handlers)
            // Note: We have to create a clone of the event (e) because a received event cannot be re-dispatched [dispatchEvent() will throw a NotSupportedError]
            log("Propagating " + e.type + " (" + e.pointerType + ")...");
            let newEvent: Event & BaseObject = MIL.Utils.isIE11() ? document.createEvent("Event") : new Event(e.type);

            newEvent.initEvent(e.type, true, true);

            for (let prop in e)
            {
                // Note: Some properties of an event (eg. eventPhase, isTrusted, srcElement, target, timeStamp) are read-only so
                //       the assignment below will fail due to the "Cannot assign new value to a read-only attribute" condition.
                //       However, these values will become set when the event is dispatched.
                try
                {
                    newEvent[prop] = e[prop];
                }
                catch (error)
                {
                    // Note: IE11 doesn't error when the assignment fails, it just fails silently
                    if ((error as Error).message.indexOf("Cannot assign to read only property") === -1)
                    {
                        log(error);
                    }
                }
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

    /** The shapes that can be recognized by MIL.RecognizeShape(). */
    export enum RecognizableShape
    {
        /** A right-handed tick (✓). */
        CheckMark,
        /** An equilateral triangle (△). */
        Triangle,
        /** A 5-pointed "pentagram" star (⛤). */
        Star,
        /** Can be made in either an E or W direction. */
        StrikeThroughHorizontal,
        /** Has to be made in a SW direction. */
        StrikeThroughDiagonal,
        /** Like a "reminder ribbon" (🎗) but rotated 90 degrees left. */
        XOut,
        /** A rectangle (▭). */
        Rectangle,
        /** A right chevron (>). */
        GreaterThan,
        /** A left chevron (<). */
        LessThan,
        /** An up chevron (^). */
        UpArrow,
        /** An down chevron (v). */
        DownArrow
    }

    /** Type of a method that computes either a min or a max path-length from the bounding width/height of a Gesture (and/or the bounding width/height that the recognition must occur within). */
    type PathLengthFunction = (gestureWidth: number, gestureHeight: number, targetWidth?: number, targetHeight?: number) => number;
    /** Type of the definition of a recognizable shape. */
    type ShapeDefinition = { id: RecognizableShape, outline: XY[], padding: number, compassHeading?: string, maxHeightRatio?: number, minPathLengthFn?: PathLengthFunction, maxPathLengthFn?: PathLengthFunction};

    // TODO: Make this extensible by the user
    // Shape recognition is done via a combination of pattern matching [on a predefined outline] and heuristics [for start/end compass heading and line-length].
    // Shapes will often overlap based on pattern matching alone, so the heuristics are critical for shape differentiation. Providing a 'shapeNameList' to 
    // RecognizeShape() also helps reduce false positives because it shrinks the number of possible matches.
    let _recognizableShapes: ShapeDefinition[] =
        [
            { id: RecognizableShape.CheckMark, outline: [[0.75, 0], [1, 0], [1, 0.25], [0.4, 1], [0, 1], [0, 0.6], [0.15, 0.5], [0.25, 0.7]], padding: 0, compassHeading: "NE|E", maxPathLengthFn: (gestureHeight, gestureWidth) => Math.sqrt(Math.pow(gestureWidth, 2) + Math.pow(gestureHeight, 2)) * 1.5 },
            { id: RecognizableShape.Triangle, outline: [[0.4, 0], [0.6, 0], [1, 0.8], [1, 1], [0, 1], [0, 0.8]], padding: 0, minPathLengthFn: (gestureHeight, gestureWidth) => Math.sqrt(Math.pow(gestureWidth / 2, 2) + Math.pow(gestureHeight, 2)) * 2.25, maxPathLengthFn: (gestureHeight, gestureWidth) => Math.sqrt(Math.pow(gestureWidth / 2, 2) + Math.pow(gestureHeight, 2)) * 3.3 },
            { id: RecognizableShape.Star, outline: [[0.50, 0], [0.612, 0.345], [0.976, 0.345], [0.682, 0.559], [0.794, 0.905], [0.5, 0.691], [0.206, 0.905], [0.318, 0.559], [0.024, 0.345], [0.388, 0.345]], padding: 0.25 },
            { id: RecognizableShape.StrikeThroughHorizontal, outline: [[0, 0], [1, 0], [1, 1], [0, 1]], padding: 0, maxHeightRatio: 0.1, compassHeading: "E|W", minPathLengthFn: (gestureHeight, gestureWidth, targetWidth) => targetWidth / 2, maxPathLengthFn: (gestureHeight, gestureWidth, targetWidth) => targetWidth * 1.2 },
            { id: RecognizableShape.StrikeThroughDiagonal, outline: [[0.8, 0], [1, 0], [1, 0.2], [0.2, 1], [0, 1], [0, 0.8]], padding: 0, compassHeading: "SW" }, // 100% overlap with "CheckMark" (compassHeading differentiates them)
            { id: RecognizableShape.XOut, outline: [[0, 0.25], [0.1, 0], [0.4, 0], [0.5, 0.25], [1, 0], [1, 0.33], [0.8, 0.5], [1, 0.66], [1, 1], [0.5, 0.75], [0.4, 1], [0.1, 1], [0, 0.75]], padding: 0, minPathLengthFn: (gestureHeight, gestureWidth) => Math.max(gestureHeight, gestureWidth) * 2.2, maxPathLengthFn: (gestureHeight, gestureWidth) => Math.max(gestureHeight, gestureWidth) * 3 }, // Overlaps with "CheckMark"
            { id: RecognizableShape.Rectangle, outline: [[0, 0], [1, 0], [1, 1], [0, 1]], padding: 0, minPathLengthFn: (gestureHeight, gestureWidth) => ((gestureWidth * 2) + (gestureHeight * 2)) * 0.85, maxPathLengthFn: (gestureHeight, gestureWidth) => (gestureWidth * 2) + (gestureHeight * 2) }, // 100% overlap with "StrikeThroughHorizontal"
            { id: RecognizableShape.GreaterThan, outline: [[0, 0], [0.2, 0], [1, 0.3], [1, 0.7], [0.2, 1], [0, 1], [0, 0.8], [0.7, 0.5], [0, 0.2]], padding: 0, compassHeading: "S", maxPathLengthFn: (gestureHeight, gestureWidth) => Math.max(gestureHeight, gestureWidth) * 2.3 },
            { id: RecognizableShape.LessThan, outline: [[1, 0], [0.8, 0], [0, 0.3], [0, 0.7], [0.8, 1], [1, 1], [1, 0.8], [0.3, 0.5], [1, 0.2]], padding: 0, compassHeading: "S", maxPathLengthFn: (gestureHeight, gestureWidth) => Math.max(gestureHeight, gestureWidth) * 2.3 },
            { id: RecognizableShape.UpArrow, outline: [[0, 1], [0, 0.8], [0.3, 0], [0.7, 0], [1, 0.8], [1, 1], [0.8, 1], [0.5, 0.3], [0.2, 1]], padding: 0, compassHeading: "E|W", maxPathLengthFn: (gestureHeight, gestureWidth) => Math.max(gestureHeight, gestureWidth) * 2.3 },
            { id: RecognizableShape.DownArrow, outline: [[0, 0], [0.2, 0], [0.5, 0.7], [0.8, 0], [1, 0], [1, 0.2], [0.7, 1], [0.3, 1], [0, 0.2]], padding: 0, compassHeading: "E|W", maxPathLengthFn: (gestureHeight, gestureWidth) => Math.max(gestureHeight, gestureWidth) * 2.3 }
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
    export function RecognizeShape(pathPoints: Point[], minMatchPercent: number = 0.8, targetWidth?: number, targetHeight?: number, gDomElement?: SVGGElement, targetShapeList?: RecognizableShape[]): RecognizableShape | null
    {
        if (DebugFeature(FeatureNames.ShapeRecognition) && (gDomElement === undefined))
        {
            throw new MILException("The 'gDomElement' parameter must be supplied when the debug flag for '" + FeatureNames.ShapeRecognition + "' is true");
        }

        let shapeList: ShapeDefinition[] = [];

        if (!targetShapeList)
        {
            shapeList = _recognizableShapes;
        }
        else
        {
            _recognizableShapes.forEach(function (v: ShapeDefinition, i)
            {
                if (targetShapeList.indexOf(v.id) !== -1)
                {
                    shapeList.push(v);
                }
            });
        }

        let svgInfo: SVGInfo = DebugFeature(FeatureNames.ShapeRecognition) ? getSvgInfo(gDomElement) : null;
        let boundingRect: Rect = Utils.GetBoundingRectForPoints(pathPoints);
        let pointsToTest: XY[] = d3.range(pathPoints.length).map(function (d) { return ([pathPoints[d].x, pathPoints[d].y]); });
        let bestMatchPercent: number = 0;
        let bestMatchShape: ShapeDefinition = null;
        let pathLength: number = Utils.ComputeTotalLength(pathPoints);
        let d: string = "";

        for (let i = 0; i < shapeList.length; i++)
        {
            let shape: ShapeDefinition = shapeList[i];
            let shapePathPoints: XY[] = [];

            d = "";

            // Convert shape outline (in relative path-points) into absolute path-points within the boundingRect.
            // Note: We use shape.padding [if specified] to expand the absolute shape since for certain shapes (eg. Star) the drawn shape
            //       can be "sloppy" and so it requires an additional allowance if it's to be recognized with any reasonable accuracy.
            //       Further, drawn points that fall right on the edge of the absolute shape are typically not counted as being inside
            //       the shape, so it requires minor padding (eg. 0.01) to ensure we can reach a count of 100% inside.
            shape.padding = Math.max(shape.padding, 0.01);
            for (let p = 0; p < shape.outline.length; p++)
            {
                let relativePathPoint: XY = shape.outline[p];
                let absoluteX: number = (boundingRect.x - (boundingRect.width * shape.padding)) + (relativePathPoint[0] * (boundingRect.width * (1 + (shape.padding * 2))));
                let absoluteY: number = (boundingRect.y - (boundingRect.height * shape.padding)) + (relativePathPoint[1] * (boundingRect.height * (1 + (shape.padding * 2))));
                shapePathPoints.push([absoluteX, absoluteY]);
                d += (!d ? "M " : " L ") + Math.round(absoluteX) + " " + Math.round(absoluteY);
            }

            // Count how many path-points are inside the shape path
            let containedPathPointCount: number = Utils.CountPointsInPolygon(shapePathPoints, pointsToTest);
            let percentInside: number = containedPathPointCount / pathPoints.length;

            if (DebugFeature(FeatureNames.ShapeRecognition))
            {
                // Draw a path for the shape
                svgInfo.gSelection.append("path").attr("d", d + "Z").attr("stroke", "red").attr("fill", "transparent").node().style.strokeWidth = "1px";
                log("Shape '" + RecognizableShape[shape.id] + "' matches " + (percentInside * 100).toFixed(2) + "% of path-points [vs " + (minMatchPercent * 100) + "% required]");
            }

            if ((percentInside >= minMatchPercent) && (percentInside > bestMatchPercent))
            {
                // We've found a possible match, so now check heuristics

                if (shape.compassHeading)
                {
                    let compassHeadings: string[] = shape.compassHeading.split("|");
                    let compassHeadingMatches: boolean = false;

                    for (let h = 0; h < compassHeadings.length; h++)
                    {
                        let compassHeading: string = compassHeadings[h];
                        let actualCompassHeading = Utils.GetCompassHeading(Utils.GetHeadingFromPoints(pathPoints[0], pathPoints[pathPoints.length - 1]));
                        compassHeadingMatches = (compassHeading === actualCompassHeading);

                        if (compassHeadingMatches)
                        {
                            break;
                        }
                    }

                    if (!compassHeadingMatches)
                    {
                        log("Shape '" + RecognizableShape[shape.id] + "' doesn't match on compassHeading", FeatureNames.ShapeRecognition);
                        continue;
                    }
                }

                if (shape.maxHeightRatio)
                {
                    let heightRatio: number = (boundingRect.height / boundingRect.width);
                    if (heightRatio > shape.maxHeightRatio)
                    {
                        log("Shape '" + RecognizableShape[shape.id] + "' doesn't match on maxHeightRatio (expected: " + shape.maxHeightRatio + ", actual: " + heightRatio.toFixed(2) + ")", FeatureNames.ShapeRecognition);
                        continue;
                    }
                }

                if (shape.minPathLengthFn || shape.maxPathLengthFn)
                {
                    let gestureWidth: number = boundingRect.width;
                    let gestureHeight: number = boundingRect.height;

                    if (shape.minPathLengthFn)
                    {
                        if (((shape.minPathLengthFn.toString().indexOf("targetWidth") !== -1) && !targetWidth) ||
                            ((shape.minPathLengthFn.toString().indexOf("targetHeight") !== -1) && !targetHeight))
                        {
                            log("Shape '" + RecognizableShape[shape.id] + "': Cannot evaluate minPathLength because targetWidth and/or targetHeight was not supplied", FeatureNames.ShapeRecognition);
                        }
                        else
                        {
                            let minPathLength: number = shape.minPathLengthFn(gestureWidth, gestureHeight, targetWidth, targetHeight);
                            if (pathLength < minPathLength)
                            {
                                log("Shape '" + RecognizableShape[shape.id] + "' doesn't match on minPathLength (expected: " + minPathLength.toFixed(2) + ", actual: " + pathLength.toFixed(2) + ")", FeatureNames.ShapeRecognition);
                                continue;
                            }
                        }
                    }

                    if (shape.maxPathLengthFn)
                    {
                        if (((shape.maxPathLengthFn.toString().indexOf("targetWidth") !== -1) && !targetWidth) ||
                            ((shape.maxPathLengthFn.toString().indexOf("targetHeight") !== -1) && !targetHeight))
                        {
                            log("Shape '" + RecognizableShape[shape.id] + "': Cannot evaluate maxPathLength because targetWidth and/or targetHeight was not supplied", FeatureNames.ShapeRecognition);
                        }
                        else
                        {
                            let maxPathLength: number = shape.maxPathLengthFn(gestureWidth, gestureHeight, targetWidth, targetHeight);
                            if (pathLength > maxPathLength)
                            {
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

        if (DebugFeature(FeatureNames.ShapeRecognition))
        {
            // Draw a path for the pathPoints
            d = "";
            for (let i = 0; i < pathPoints.length; i++)
            {
                d += (!d ? "M " : " L ") + Math.round(pathPoints[i].x) + " " + Math.round(pathPoints[i].y);
            }
            svgInfo.gSelection.append("path").attr("d", d).attr("stroke", "blue").attr("fill", "transparent").node().style.strokeWidth = "1px";
        }

        return (bestMatchShape ? bestMatchShape.id : null);
    }

    /**
     * Interprets the supplied pathPoints as the path of a radial swipe gesture and returns information about the gesture. If the swipe is too short (less than minDistance), returns null.
     * @param {Point[]} pathPoints The set of Points to inspect (typically these are from an Ink).
     * @param {number} numRadialSegments The number of radial segments to quantize into.
     * @param {number} minDistance The minimum length (in pixels) of the path for it to be considered a radial swipe gesture.
     * @returns {RadialSwipeResult | null} Result.
     */
    export function RecognizeRadialSwipe(pathPoints: Point[], numRadialSegments: number, minDistance: number): RadialSwipeResult | null
    {
        let heading: number = Utils.GetHeadingFromPoints(pathPoints[0], pathPoints[pathPoints.length - 1]);
        let compassHeading: string | number = Utils.GetCompassHeading(heading, numRadialSegments);
        let pathLength: number = Utils.ComputeTotalLength(pathPoints);
        let isStraightLine = Utils.IsStraightLine(Utils.ConvertPointsToXYPoints(pathPoints));

        return ((pathLength > minDistance) && isStraightLine ? { compassHeading: compassHeading, heading: heading, segmentID: Utils.GetRadialSegmentID(heading, numRadialSegments), length: pathLength } : null);
    }

    /**
     * [Private Method] Handler for contextMenu events.
     * @param {Event} e A contextMenu event.
     */
    function onContextMenu(e: Event): void
    {
        if (!getSvgInfo(e.target as DomElement).settings.IsRightMouseClickAllowed())
        {
            e.preventDefault();
            return;
        }
    }

    /**
     * [Private Method] Returns true if the event has been propagated by MIL.
     * @param {PointerEvent} e The PointerEvent to check.
     * @returns {boolean} Result.
     */
    function isPropagatedEvent(e: PointerEvent): boolean
    {
        return (((e as BaseObject).__MILRedispatchedToParent__ !== undefined) || ((e as BaseObject).__MILRedispatchedToSvg__ !== undefined));
    }
    
    /**
     * [Private Method] Returns true if the event should be processed by MIL.
     * @param {DomElement} currentTarget The element whose event listener is being invoked.
     * @param {PointerEvent} e The PointerEvent to check.
     * @returns {boolean} Result.
     */
    function isEventProcessable(currentTarget: DomElement, e: PointerEvent): boolean
    {
        // This is just a sanity check
        // eslint-disable-next-line eqeqeq
        if (currentTarget != e.currentTarget) // PORT: The change to "!==" is causing problems, so reverting to "!=". TODO: Investigate this.
        {
            throw new MILException("Unexpected 'currentTarget' value: this could be a coding error in MIL");
        }

        // This is the case where we've redispatched an event to the SVG element [after our gestures on the SVG
        // didn't hit] to be processed by the handlers that the user may have added directly to the SVG element
        if ((e as BaseObject).__MILRedispatchedToSvg__)
        {
            return (false);
        }

        return (true);
    }

    /**
     * [Private Method] Handler for pointerDown events.
     * @param {PointerEvent} e A PointerEvent.
     */
    function onPointerDown(e: PointerEvent): void
    {
        let domElement: DomElement = this; // Note: 'this' should be e.currentTarget
        if (!isEventProcessable(domElement, e))
        {
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
    function onPointerMove(e: PointerEvent): void
    {
        let domElement: DomElement = this; // Note: 'this' should be e.currentTarget
        if (!isEventProcessable(domElement, e))
        {
            return;
        }

        let pointerID: string = makePointerID(e);
        let targetDomElement: DomElement = e.currentTarget as DomElement;
        let targetElementID: string = getTargetElementID(targetDomElement);

        logPointerEvent(e, MIL.FeatureNames.PointerEventsIncludingMove);

        if (_activePointerLatestMoveEvents[targetElementID])
        {
            // Are we getting a PointerMove before either a PointerDown (or after a PointerUp) or a 'hover-start'? If so, ignore the event
            let hasPointerDownHappened: boolean = Boolean(_activePointerDownEvents[targetElementID]) && _activePointerDownEvents[targetElementID].hasOwnProperty(pointerID);
            let hasHoverStartHappened: boolean = Boolean(_activeHoverEvents[targetElementID]) && _activeHoverEvents[targetElementID].hasOwnProperty(pointerID);
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

            (e as BaseObject).__MILTimeStamp__ = Date.now(); // e.TimeStamp is not consistent bewteen IE11 and Chrome, so we add our own
            _activePointerLatestMoveEvents[targetElementID][pointerID] = e;
        }

        queueEventForPropagation(e);

        // Pass the event along to the Ink (if any) that's currently using [ie. is being created with] this pointer
        if (_inkCompletePathPointData[pointerID])
        {
            let gesture: Gesture = getInkingGesture(pointerID);

            if (!gesture.IsCancelled())
            {
                gesture.Ink().OnPointerMove(e);
            }
        }
    }

    /**
     * [Private Method] Handler for pointerUp events.
     * @param {PointerEvent} e A PointerEvent.
     */
    function onPointerUp(e: PointerEvent): void
    {
        let domElement: DomElement = this; // Note: 'this' should be e.currentTarget
        if (!isEventProcessable(domElement, e))
        {
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
    function onPointerEnter(e: PointerEvent): void
    {
        let domElement: DomElement = this; // Note: 'this' should be e.currentTarget
        if (!isEventProcessable(domElement, e))
        {
            return;
        }

        let pointerID: string = makePointerID(e);
        let targetDomElement: DomElement = e.currentTarget as DomElement;
        let targetElementID: string = getTargetElementID(targetDomElement);

        logPointerEvent(e);

        // Hover-start
        if (canHover(e.pointerType, targetDomElement))
        {
            if (e.buttons === 0) // Hover [we handle Contact (ie. hover-cancel) in onPointerDown()]
            {
                // Any given pointer can only hover over one element at-a-time
                let existingHoverTargetElementID: string = getHoverTarget(pointerID);
                if (existingHoverTargetElementID !== null)
                {
                    log("Ignoring PointerEnter for '" + pointerID + "' on '" + targetElementID + "' (reason: the pointer is already being used in a hover for '" + existingHoverTargetElementID + "')", FeatureNames.Hover);
                    return;
                }

                // Any given element can only be hovered over by one pointer at-a-time
                // Note: On Chrome we observe that [sometimes] a pointerEnter for the pen is either preceded or followed by a
                //       pointerEnter for the mouse. When this happens, the mouse does not generate any pointerMove events.
                let existingHoverPointerID = getHoverPointerID(targetElementID);
                if (existingHoverPointerID !== null)
                {
                    log("Ignoring PointerEnter for '" + pointerID + "' on '" + targetElementID + "' (reason: the element is already involved in a hover using '" + existingHoverPointerID + "')", FeatureNames.Hover);
                    return;
                }

                // Note: Don't use 'let' for these variables: it will result in the variable being renamed during compilation which means it won't surface correctly in the debugger
                var latestMoveEvent: PointerEvent = null;
                var hoverTimeoutInMs: number = GetElementHoverTimeoutInMs(targetDomElement);

                let onMoveHandler: PointerEventHandler = function (pointerMoveEvent: PointerEvent)
                {
                    // We only want to capture the pointerMove events of the same pointer that generated the original pointerEnter
                    if (makePointerID(pointerMoveEvent) !== pointerID)
                    {
                        return;
                    }

                    // Keep track of the pointer position while we wait for waitForHover() to tick
                    latestMoveEvent = pointerMoveEvent;

                    // Note: Because waitForHover() [see below] executes asynchronously [rather than directly in an event handler], the 'currentTarget'
                    //       property of either 'e' or 'latestMoveEvent' will be null, so we save currentTarget in latestMoveEvent.__MILCurrentTarget__
                    (latestMoveEvent as BaseObject).__MILCurrentTarget__ = pointerMoveEvent.currentTarget;
                };

                // Only the most recent [ie. top-most] e.currentTarget of pointerID will become the hover target, because pointerEnter events appear to be
                // raised on elements in z-index order (for the elements under the pointer). TODO: Is this the same for all browsers [because we are relying on it]?
                if (_activeHoverTimerInfo[pointerID] && (_activeHoverTimerInfo[pointerID].timerID > 0))
                {
                    removeTemporaryHoverMoveHandler(_activeHoverTimerInfo[pointerID]);
                }

                // A hover doesn't start immediately, it requires hoverTimeoutInMs to elapse first
                let timerID: number = setTimeout(function waitForHover(pointerEnterEvent: PointerEvent)
                {
                    log("Hover started for '" + targetElementID + "' using '" + pointerID + "'", FeatureNames.Hover);
                    removeTemporaryHoverMoveHandler(_activeHoverTimerInfo[pointerID]);
                    delete _activeHoverTimerInfo[pointerID];

                    (pointerEnterEvent as BaseObject).__MILCurrentTarget__ = targetDomElement;

                    if ((hoverTimeoutInMs > 0) && (latestMoveEvent !== null))
                    {
                        // Note: We can't just use 'pointerEnterEvent' in the call to addPointer() below because the position
                        //       of 'pointerEnterEvent' is stale by hoverTimeoutInMs, so we use latestMoveEvent instead
                        pointerEnterEvent = latestMoveEvent;
                    }
                    (pointerEnterEvent as BaseObject).__MILIsMILHoverStartEvent__ = true; // Flag the event as being the one that represents a hover-start

                    // Note: pointerEnterEvent.currentTarget will always be null [see note about __MILCurrentTarget__ above]
                    addPointer(pointerEnterEvent);

                    // Note: We don't actually propagate hover-related events: the purpose of enqueing it is purely to mark the queue as needing to be purged [see propagateQueuedEvents()]
                    queueEventForPropagation(pointerEnterEvent);
                }, hoverTimeoutInMs, e);

                _activeHoverTimerInfo[pointerID] = { timerID: timerID, targetDomElement: targetDomElement, hoverMoveHandler: null };

                if (hoverTimeoutInMs > 0)
                {
                    // This listener is only temporary and will be removed when hover starts, or is cancelled (by contact), or ends (pointerLeave)
                    targetDomElement.addEventListener("pointermove", onMoveHandler);
                    _activeHoverTimerInfo[pointerID].hoverMoveHandler = onMoveHandler;
                    log("Added temporary 'hover-start' pointerMove handler (for " + targetElementID + ")", FeatureNames.Hover);
                }
            }
        }

        // Are we getting a new pointerEnter without getting a prior pointerUp? This happens on Chrome with a touch+mouse Gesture (for the mouse).
        // From https://www.w3.org/TR/pointerevents/#the-primary-pointer: "Some user agents may ignore the concurrent use of more than one type of pointer input to avoid accidental interactions."
        if (_activePointerDownEvents[targetElementID] && _activePointerDownEvents[targetElementID][pointerID] && !MIL.GetGestureFromEvent(e))
        {
            log("Warning: No pointerUp received for " + pointerID, FeatureNames.PointerEvents);
            onPointerUp.call(targetDomElement, e);
        }
    }

    /**
     * [Private Method] Handler for pointerLeave events (which potentially ends a hover event).
     * @param {PointerEvent} e A PointerEvent.
     */
    function onPointerLeave(e: PointerEvent): void
    {
        // Note: We'll get a pointerLeave event for the SVG element when a child element (like a circle) - or even the SVG itself - captures the pointer.
        //       We'll get another pointerLeave for both the circle and the SVG when the pointer is lifted from the circle. 
        let domElement: DomElement = this; // Note: 'this' should be e.currentTarget
        if (!isEventProcessable(domElement, e))
        {
            return;
        }

        let pointerID: string = makePointerID(e);
        let targetDomElement: DomElement = e.currentTarget as DomElement;
        let targetElementID: string = getTargetElementID(targetDomElement);

        logPointerEvent(e);

        // Treat a pointer moving outside the SVG element the same as if the pointer had been lifted
        // Note: Chrome and IE11 exhibit slightly different behavior when a pen in contact leaves the SVG element:
        //       - Chrome will fire PointerUp followed by PointerLeave but not until until the pen [outside the SVG] is lifted, and as a result e.buttons will be 0.
        //       - IE11 does not fire PointerUp but fires PointerLeave as soon as the pen leaves the SVG (with e.buttons = 1).
        if ((targetDomElement instanceof SVGSVGElement) && (e.buttons !== 0)) // The buttons check is so that we ignore [pen] hover [we want the code below to apply only if the pointer is in contact]
        {
            let svgInfo: SVGInfo = getSvgInfo(targetDomElement);

            // Note: e.offsetX/Y is relative to the SVG element [offsetX/Y 0,0 is always the top-left corner]
            //       We want to use offsetX/Y (not clientX/Y) in this instance.
            if ((e.offsetX < 0) || (e.offsetY < 0) || (e.offsetX > (svgInfo.svgWidth - 1)) || (e.offsetY > (svgInfo.svgHeight - 1)))
            {
                onPointerUp.call(targetDomElement, e);
            }
        }

        // Are we getting a pointerLeave without first getting a pointerUp? This happens on Chrome with a touch+mouse Gesture (for the mouse).
        // From https://www.w3.org/TR/pointerevents/#the-primary-pointer: "Some user agents may ignore the concurrent use of more than one type of pointer input to avoid accidental interactions."
        if (_activePointerDownEvents[targetElementID] && _activePointerDownEvents[targetElementID][pointerID] && !MIL.GetGestureFromEvent(e))
        {
            log("Warning: No pointerUp received for " + pointerID, FeatureNames.PointerEvents);
            onPointerUp.call(targetDomElement, e);
        }
        
        endHover(e); // Hover-end
    }

    /**
     * [Private Method] Handler for pointerCancel events.
     * @param {PointerEvent} e A PointerEvent.
     */
    function onPointerCancel(e: PointerEvent): void
    {
        let domElement: DomElement = this; // Note: 'this' should be e.currentTarget
        let pointerID: string = makePointerID(e);

        logPointerEvent(e);

        // PointerCancel rarely occurs, but if is does happen we need to ensure that the pointer gets removed
        if (isHoverPointer(pointerID))
        {
            endHover(e, true);
        }
        else
        {
            onPointerUp.call(domElement, e);
        }
    }

    /**
     * [Private Method] Logs the supplied PointerEvent.
     * @param {PointerEvent} e A PointerEvent.
     * @param {FeatureNames} [featureName] [Optional] The MIL.FeatureNames value (eg. PointerEventsIncludingMove) that must be enabled for the logging to occur.
     */
    function logPointerEvent(e: PointerEvent, featureName: FeatureNames = FeatureNames.PointerEvents): void
    {
        if (!DebugFeature(featureName) || (e as BaseObject).__MILLogged__)
        {
            return;
        }

        let pointerID: string = makePointerID(e);
        let targetDomElement: DomElement = e.currentTarget as DomElement;
        let targetElementID: string = getTargetElementID(targetDomElement);
        let typeName: string = e.type.replace("pointer", "");
        let pointerTypeName: string = (e.type.indexOf("pointer") === 0) ? "Pointer" + typeName[0].toUpperCase() + typeName.slice(1) : e.type;

        log("EVENT: " + pointerTypeName + " [" + pointerID + " on " + targetElementID + "] Buttons = " + e.buttons, featureName);

        // To prevent re-logging the event, mark it as logged
        (e as BaseObject).__MILLogged__ = true;
    }

    /**
     * [Private Method] Queues the specified PointerEvent for (later) propagation. This postponing mechanism works while Gesture recognition is running.
     * @param {PointerEvent} e A PointerEvent.
     */
    function queueEventForPropagation(e: PointerEvent): void
    {
        // While we wait to see if our gesture recognition will succeed - or if a recognized gesture will complete - we [temporarily] prevent downstream handlers from getting the event
        // [we'll dispatch the event later on if our recognition fails (or the gesture completion timeout expires)]
        if (isAcquiringPointers() || isAwaitingGestureCompletion())
        {
            // Add a property so that we can easily detect the events that we redispatch (and their age)
            if ((e as BaseObject).__MILRedispatchedToParent__ === undefined)
            {
                (e as BaseObject).__MILRedispatchedToParent__ = Date.now();
            }
            else
            {
                // The event has been previously redispatched, and now it's being queued having been received by a parent.
                // In this case we don't update the value (time) of __MILRedispatchedToParent__, we keep the original.
            }

            // log("Queuing " + e.type + " (targeting " + ((e.currentTarget as BaseObject).__MILID__ || "?") + ")");
            MIL._postponedPointerEvents.push(e);

            // Prevent parent+peer handlers from processing the event
            if ((e.type === "pointermove") && isAwaitingGestureCompletion())
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

    /**
     * [Private Method] Returns the targetElementID that the specified pointerID is currently hovering over; returns null if the pointer is not hovering.
     * @param {string} targetPointerID A pointer ID.
     * @returns {string | null} Result.
     */
    function getHoverTarget(targetPointerID: string): string | null
    {
        for (let targetElementID in _activeHoverEvents)
        {
            for (let pointerID in _activeHoverEvents[targetElementID])
            {
                if (pointerID === targetPointerID)
                {
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
    function getHoverPointerID(targetElementID: string): string
    {
        let pointerID: string;

        if (_activeHoverEvents[targetElementID])
        {
            // A hover "event" is active on the element
            pointerID = Object.keys(_activeHoverEvents[targetElementID])[0];
            return (pointerID);
        }

        for (pointerID in _activeHoverTimerInfo)
        {
            let hoverTimerInfo: HoverTimerInfo = _activeHoverTimerInfo[pointerID];

            if (getTargetElementID(hoverTimerInfo.targetDomElement) === targetElementID)
            {
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
    function isHoverPointer(targetPointerID: string): boolean
    {
        return (getHoverTarget(targetPointerID) !== null);
    }

    /**
     * [Internal] Returns true if the specified pointerType (or pointerID) is capable of hover behavior for the specified DOM element.
     * @param {string} pointerTypeOrID Either a PointerEvent.pointerType (eg. "pen") or a pointerID (eg. "PointerID_pen_123").
     * @param {TargetDomElement} targetElement The element the pointer will hover over.
     * @returns {boolean} Result.
     * @internal
     */
    export function canHover(pointerTypeOrID: string, targetElement: TargetDomElement): boolean
    {
        let pointerType: string = "";
        let domElement: DomElement = Utils.GetDomElement(targetElement);

        if (GetElementHoverTimeoutInMs(domElement) < 0) // -1 indicates that hovering is disabled
        {
            return (false);
        }

        // Hovering on the SVG is disallowed because we won't get a pointerLeave for the SVG (thus ending the hover)
        // until the pointer leaves the *entire* SVG area - so no further hover "events" on other elements can happen
        if (domElement instanceof SVGSVGElement)
        {
            return (false);
        }

        // Handle the case of pointerTypeOrID being a pointerID
        if (pointerTypeOrID.indexOf("_") !== -1)
        {
            pointerType = pointerTypeOrID.split("_")[1];
        }
        else
        {
            pointerType = pointerTypeOrID;
        }

        // Note: Our current approach of treating "hover" as a distinct PointerType does not allow us to readily distinguish between a pen-hover and a mouse-hover.
        return ((pointerType === "pen") || (pointerType === "mouse"));
    }

    /**
     * [Private Method] Removes the temporary pointerMove handler (from the supplied hoverInfo) that was installed while we wait for a 'hover' event to start.
     * @param {HoverTimerInfo} hoverInfo A HoverTimerInfo.
     */
    function removeTemporaryHoverMoveHandler(hoverInfo: HoverTimerInfo): void
    {
        if (hoverInfo.hoverMoveHandler)
        {
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
    function endHover(e: PointerEvent, forceEnd?: boolean): void
    {
        if (forceEnd === undefined)
        {
            forceEnd = false;
        }

        if (!canHover(e.pointerType, e.currentTarget as DomElement))
        {
            return;
        }

        let pointerID: string = makePointerID(e);
        let targetDomElement: DomElement = e.currentTarget as DomElement;
        let targetElementID: string = getTargetElementID(targetDomElement);

        if (((e.type === "pointerleave") && (e.buttons === 0)) || // Hover
            ((e.type === "pointerdown") && (e.buttons > 0)) ||    // Contact [optionally with one or more buttons pressed]
            forceEnd)    
        {
            if (_activeHoverTimerInfo[pointerID] && (_activeHoverTimerInfo[pointerID].timerID > 0))
            {
                removeTemporaryHoverMoveHandler(_activeHoverTimerInfo[pointerID]);
                delete _activeHoverTimerInfo[pointerID];
            }

            // Has Hover started?
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

    /**
     * Returns the hover timeout (in milliseconds) for the specified element. A value of -1 indicates that hovering is disabled.
     * See also: Settings.HoverTimeoutInMs().
     * @param {TargetDomElement} targetElement The element to get the hover timeout for.
     * @returns {number} Result.
     */
    export function GetElementHoverTimeoutInMs(targetElement: TargetDomElement): number
    {
        let domElement: DomElement = Utils.GetDomElement(targetElement);
        let targetElementID: string = getTargetElementID(domElement);
        let hoverTimeoutInMs: number = _hoverTimeouts[targetElementID];
        let settings: MILSettings = getSvgInfo(targetElement).settings;

        return ((hoverTimeoutInMs !== undefined) ? hoverTimeoutInMs : settings.HoverTimeoutInMs());
    }

    /**
     * Sets the hover timeout (in milliseconds) for the specified element.
     * See also: Settings.HoverTimeoutInMs().
     * @param {TargetDomElement} targetElement The element to set the hover timeout for.
     * @param {number} hoverTimeoutInMs The hover timeout (in milliseconds).
     */
    export function SetElementHoverTimeoutInMs(targetElement: TargetDomElement, hoverTimeoutInMs: number): void
    {
        let domElement: DomElement = Utils.GetDomElement(targetElement);
        let targetElementID: string = getTargetElementID(domElement);
        _hoverTimeouts[targetElementID] = Math.max(-1, hoverTimeoutInMs); // A value of -1 indicates that hovering is disabled
    }

    /**
     * [Private Method] Handles the adding of a pointer. This happens at pointerDown, but can also happen at pointerEnter/Move (for hover).
     * @param {PointerEvent} e A PointerEvent.
     */
    function addPointer(e: PointerEvent): void
    {
        let pointerID: string = makePointerID(e);
        let targetDomElement: DomElement = (e.currentTarget || (e as BaseObject).__MILCurrentTarget__) as DomElement; // We use "|| e.__MILCurrentTarget__" to handle being called via waitForHover() in onPointerEnter()
        let targetElementID: string = getTargetElementID(targetDomElement);
        let maxRecognitionTimeoutInMs: number = -2; // -1 means "from pointer-up" to recognizeGesture(), so we use -2 to mean "not yet assigned" to avoid potential confusion
        let definedMaxRecognitionTimeoutInMs: number = -2; // Ditto

        (e as BaseObject).__MILTimeStamp__ = Date.now(); // e.TimeStamp is not consistent bewteen IE11 and Chrome, so we add our own

        log("Adding " + pointerID + " [to " + targetElementID + "]" + ((e.type !== "pointerdown") ? " [via " + e.type + "]" : ""));

        if (e.type === "pointerdown")
        {
            if (_activePointerDownEvents[targetElementID] === undefined)
            {
                _activePointerDownEvents[targetElementID] = {};
                _activePointerDownStartTime[targetElementID] = Date.now();
            }
            _activePointerDownEvents[targetElementID][pointerID] = e;
        }

        if ((e as BaseObject).__MILIsMILHoverStartEvent__ === true)
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
        for (let g = 0; g < _gestures.length; g++)
        {
            let gesture: Gesture = _gestures[g];
            if (gesture.Target() === targetDomElement)
            {
                if ((gesture.PointerType().indexOf(e.pointerType) !== -1) || (gesture.PointerType() === "any") || (canHover(e.pointerType, targetDomElement) && (gesture.PointerType().indexOf("hover") !== -1)))
                {
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
        if (isPropagatedEvent(e) && (maxRecognitionTimeoutInMs > 0))
        {
            let eventAgeInMs: number = Date.now() - ((e as BaseObject).__MILRedispatchedToParent__ as number);
            // Note: We set maxRecognitionTimeoutInMs to at least 1ms to avoid affecting the code-path we'll follow below
            maxRecognitionTimeoutInMs = Math.max(1, maxRecognitionTimeoutInMs - eventAgeInMs);
        }

        if (!_targetElementState[targetElementID])
        {
            _targetElementState[targetElementID] = { isAcquiringPointers: false, recognizeGestureTimerID: -1, gestureRecognitionRan: false, isAwaitingGestureCompletion: false };
        }

        // If not already in the "acquiring" phase, kick-off a [delayed] gesture recognition (the delay allows enough time for the required pointers to make contact with the screen)
        if (!_targetElementState[targetElementID].isAcquiringPointers)
        {
            _targetElementState[targetElementID].isAcquiringPointers = true;
            _targetElementState[targetElementID].gestureRecognitionRan = false;

            if (MIL._postponedPointerEvents.length > 0)
            {
                log("Clearing " + MIL._postponedPointerEvents.length + " queued pointer events", FeatureNames.GestureRecognition);
                MIL._postponedPointerEvents.length = 0;
            }

            if (maxRecognitionTimeoutInMs === 0) // A timeout of zero only makes sense for a single-pointer gesture
            {
                let recognitionResult: GestureRecognitionResult = recognizeGesture(targetDomElement, maxRecognitionTimeoutInMs, definedMaxRecognitionTimeoutInMs);
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
                    let recognitionResult: GestureRecognitionResult = recognizeGesture(targetDomElement, maxRecognitionTimeoutInMs, definedMaxRecognitionTimeoutInMs);
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

    /**
     * [Private Method] Handles the removing of a pointer. This happens at pointerUp, but can also happen at pointerLeave and pointerDown [see endHover()].
     * @param {PointerEvent} e A PointerEvent.
     */
    function removePointer(e: PointerEvent): void
    {
        let liftedPointerID: string = makePointerID(e);
        let targetElementID: string = getTargetElementID((e.currentTarget || e.target) as DomElement); // We use "|| e.target" to handle being called with a pointerMove event
        let endedGestures: Gesture[] = [];

        log("Removing " + liftedPointerID + " [from " + targetElementID + "]" + ((e.type !== "pointerup") ? " [via " + e.type + "]" : ""));

        // Handle the case where a pointer is removed BEFORE recognizeGesture() has run [typically
        // this happens if a pointer is lifted before the maximum RecognitionTimeoutInMs elapses].
        // Note that we only handle this once [if at all], when the first pointer is removed.
        if (_targetElementState[targetElementID] && (_targetElementState[targetElementID].gestureRecognitionRan === false) && (e.type === "pointerup"))
        {
            let targetDomElement: DomElement = e.currentTarget as DomElement;
            recognizeGesture(targetDomElement, -1, -1);
        }

        // Call the GestureEndedHandler (and update the PointerList) for any gesture that is using this pointerID
        for (let g = 0; g < _gestures.length; g++)
        {
            let gesture: Gesture = _gestures[g];
            let pointerList: string[] = gesture.ActivePointerList();
            let isGestureUsingLiftedPointerID: boolean = false;

            for (let i = 0; i < pointerList.length; i++)
            {
                if (pointerList[i] === liftedPointerID)
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
                    let ink: Ink = gesture.Ink();
                    if ((ink !== null) && (ink.PointerID() === liftedPointerID))
                    {
                        ink.OnPointerUp(e);
                    }

                    gesture.endedTime(Date.now());

                    if (gesture.GestureEndedHandler() !== null)
                    {
                        gesture.GestureEndedHandler().call(gesture, liftedPointerID);
                    }

                    endedGestures.push(gesture);
                }

                if (gesture.OnMoveHandler() !== null)
                {
                    // Remove the handler
                    gesture.OnMoveHandler(null);
                }

                gesture.ActivePointerList().length = 0;
                gesture.ActivePointerTypeOrdinals().length = 0;

                // We handled the pointer event, so we prevent parent+peer handlers from also processing it
                e.stopImmediatePropagation();
            }
        }

        let deletedItems: string = "";
        let elementID: string;

        for (elementID in _activePointerDownEvents)
        {
            if (_activePointerDownEvents[elementID][liftedPointerID])
            {
                delete _activePointerDownEvents[elementID][liftedPointerID];
                deletedItems += "_activePointerDownEvents[" + elementID + "][" + liftedPointerID + "] ";
            }
            if (Object.keys(_activePointerDownEvents[elementID]).length === 0)
            {
                delete _activePointerDownEvents[elementID];
                delete _activePointerDownStartTime[elementID];
                deletedItems += "_activePointerDownEvents[" + elementID + "] ";
            }
        }

        for (elementID in _activeHoverEvents)
        {
            if (_activeHoverEvents[elementID][liftedPointerID])
            {
                delete _activeHoverEvents[elementID][liftedPointerID];
                deletedItems += "_activeHoverEvents[" + elementID + "][" + liftedPointerID + "] ";
            }
            if (Object.keys(_activeHoverEvents[elementID]).length === 0)
            {
                delete _activeHoverEvents[elementID];
                delete _activeHoverStartTime[elementID];
                deletedItems += "_activeHoverEvents[" + elementID + "] ";
            }
        }

        for (elementID in _activePointerLatestMoveEvents)
        {
            if (_activePointerLatestMoveEvents[elementID][liftedPointerID])
            {
                delete _activePointerLatestMoveEvents[elementID][liftedPointerID];
                deletedItems += "_activePointerLatestMoveEvents[" + elementID + "][" + liftedPointerID + "] ";
            }
            if (Object.keys(_activePointerLatestMoveEvents[elementID]).length === 0)
            {
                delete _activePointerLatestMoveEvents[elementID];
                deletedItems += "_activePointerLatestMoveEvents[" + elementID + "] ";
            }
        }

        if (deletedItems)
        {
            log("Removed " + deletedItems);
        }

        // For each ended gesture, [optionally] look for another gesture that may still be applicable [ie. with the one-or-more pointers that may still be down].
        // For example, the user wants a 2-finger zoom to become a 1-finger pan when the first zoom finger is lifted.
        for (let i = 0; i < endedGestures.length; i++)
        {
            let gesture: Gesture = endedGestures[i];

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

    /**
     * [Private Method] Starts a timer (for the specified targetElementID) to call recognizeGesture() via the supplied callback.
     * @param {string} targetElementID A __MILID__ value.
     * @param {VoidCallback} callback The callback to invoke (after timeoutInMs have elapsed) [that must call recognizeGesture()].
     * @param {number} timeoutInMs A timeout (in milliseconds).
     */
    function startRecognizeGestureTimer(targetElementID: string, callback: VoidCallback, timeoutInMs: number): void
    {
        if (_targetElementState[targetElementID].recognizeGestureTimerID >= 0)
        {
            log("Recognize-gesture timer not started (reason: An existing timer (ID:" + _targetElementState[targetElementID].recognizeGestureTimerID + ") has already been started for '" + targetElementID + "')", FeatureNames.GestureRecognition);
        }
        else
        {
            let timerID: number = setTimeout(function ()
            {
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
    function cancelRecognizeGestureTimer(targetElementID: string): void
    {
        let timerID: number = _targetElementState[targetElementID].recognizeGestureTimerID;

        if (timerID >= 0)
        {
            clearTimeout(timerID);
            _targetElementState[targetElementID].recognizeGestureTimerID = -1;
            log("Recognize-gesture timer (ID:" + timerID + ") cancelled for '" + targetElementID + "'", FeatureNames.GestureRecognition);
        }
    }

    /** Resets all hover state tracking. */
    export function ResetHoverStateTracking()
    {
        _activeHoverEvents = {};
        _activeHoverStartTime = {};
        _activeHoverTimerInfo = {};
    }
}