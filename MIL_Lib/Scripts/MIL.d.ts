/**
 * The MIL namespace.
 */
declare namespace MIL {
    /** Defines the type of an SVGGraphicsElement that can also be treated as a basic JavaScript object. */
    interface SVGElementEx extends SVGGraphicsElement, BaseObject {
    }
    /** Type of a base JavaScript object. This allows setting/getting dynamic properties (or private members) on strongly-typed objects by simple casting to BaseObject. */
    type BaseObject = {
        [key: string]: any;
    };
    /** Type of a PointerEvent handler (callback). */
    type PointerEventHandler = (event: PointerEvent) => void;
    /** Type of a Gesture Started/Cancelled handler (callback). When the handler is invoked, 'this' will be set to the Gesture instance. */
    type GestureEventHandler = () => void;
    /** Type of a Gesture Ended handler (callback). When the handler is invoked, 'this' will be set to the Gesture instance. */
    type GestureEndedHandler = (liftedPointerID?: string) => void;
    /** Type of a callback that takes no parameters and returns a boolean. When the handler is invoked, 'this' will be set to the Gesture instance. */
    type GestureConditionalCallback = () => boolean;
    /** Type of a handler (callback) for a recognize-shape Gesture. When the handler is invoked, 'this' will be set to the Gesture instance. */
    type ShapeRecognizedHandler = (shape: RecognizableShape) => void;
    /** Type of a handler (callback) for a radial-swipe Gesture. When the handler is invoked, 'this' will be set to the Gesture instance. */
    type RadialSwipeHandler = (swipeResult: RadialSwipeResult) => void;
    /** Type of a handler (callback) for an angle-changed event. When the handler is invoked, 'this' will be set to the Gesture instance. */
    type AngleChangedHandler = (angle: number) => void;
    /** Type of the result from a RadialSwipe Gesture. */
    type RadialSwipeResult = {
        /** A named direction ("NE", "W", etc.) when using 4 or 8 segments, or the segment ID. */
        compassHeading: string | number;
        /** The heading in degrees (0..359.99). */
        heading: number;
        /** The segment ID (0 to n - 1, where n is the number of possible segments). */
        segmentID: number;
        /** The length of the swipe (in SVG coordinate space). */
        length: number;
    };
    /** Type of a generic point object (with x and y members).  */
    type Point = {
        x: number;
        y: number;
    };
    /** Type of a 2-element point array, where [0] = x and [1] = y. */
    type XY = [number, number];
    /** The types of visual elements that can be used with MIL. */
    type DomElement = SVGElementEx;
    /** The type of a targetted visual element in a MIL operation. */
    type TargetDomElement = DomElement | D3SingleSelection;
    /** Type representing a d3 selection of one-or-more visual element(s). */
    type D3Selection = d3.Selection<DomElement, any, any, any>;
    /** Type representing a d3 selection of exactly one visual element. */
    type D3SingleSelection = d3.Selection<DomElement, any, any, any>;
    /** Type of points that represent a polygon. */
    type PolygonPoints = XY[] | Point[];
    /** Type of a 2-point line in svg space. */
    type SVGLine = [SVGPoint, SVGPoint];
    /** A rectangle representation. */
    type Rect = {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    /** Type of the [optional] callback passed to FindShapeElementsInRegion(). */
    type FindShapeFilter = (value: DomElement | Ink) => boolean;
    /** Type that describes the current SVG pan x/y offsets. */
    type PanPosition = {
        left: number;
        top: number;
    };
    /** Type of a callback that takes no parameters and returns void. */
    type VoidCallback = () => void;
    /** The names of features that can be provided to MIL.DebugFeature(). */
    enum FeatureNames {
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
        Default = 33
    }
    /** How Ink objects should be combined. */
    enum InkAutoCombineMode {
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
        Always = 15
    }
    /**
     * The possible pen buttons [see http://www.w3.org/TR/pointerevents2/].
     * Note that these are bitmask values for the PointerEvent.buttons property, and are distinct from the PointerEvent.button property values.
     */
    enum PenButton {
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
    enum InkHullType {
        None = 0,
        Concave = 1,
        Convex = 2
    }
    /**
     * Base exception for all errors raised by MIL.
     */
    class MILException extends Error {
        constructor(message: string);
    }
    /**
     * Enables or disabled debug console messages for the specified MIL feature, or returns whether logging for the specified feature is enabled.
     * Note: All "general" logging (ie. that is NOT feature-specific) done by MIL can be turned off with this command: MIL.DebugFeature(MIL.FeatureNames.MIL, false);
     * @param {FeatureNames} featureNames One-or-more MIL.FeatureNames value (eg. MIL.FeatureNames.MIL | MIL.FeatureNames.GestureRecognition).
     * @param {boolean} [enable] [Optional] Whether to turn debug messages on or off. If not supplied, the method with return whether logging for the specified feature(s) is enabled.
     * @returns {boolean | void} Result.
     */
    function DebugFeature(featureNames: FeatureNames, enable?: boolean): boolean | void;
    /** Reports debugging information to the console window about MIL state. */
    function ShowDebugInfo(): void;
    /**
     * Returns the MIL settings associated with the specified <SVG> element.
     * @param {SVGSVGElement} svg The SVG element to find the MIL settings for.
     * @returns {MILSettings} The associated MIL settings.
     */
    function Settings(svg: TargetDomElement): MILSettings;
    /**
     * Creates a new Gesture with the specified name.
     * @param {string} name The name of the Gesture. Add '*' as a suffix to create a unique name.
     * @param {boolean} [ignoreGestureDefaults] [Optional] Typically only used by internal Gestures [to allow MIL to create Gestures without having to call MIL.GestureDefaults.Reset(), which could be an unwanted side-effect].
     * @returns {Gesture} The created Gesture.
     */
    function CreateGesture(name: string, ignoreGestureDefaults?: boolean): Gesture;
    /**
     * Adds the specified Gesture, making it available to be recognized.
     * Note: If multiple Gestures have the same definition (target/pointerType/conditional), the one which was created first will be the one that gets recognized.
     * @param {Gesture} gesture The Gesture to add.
     * @returns {Gesture} The added Gesture.
     */
    function AddGesture(gesture: Gesture): Gesture;
    /**
     * Returns the Gesture that has the specified name.
     * @param {string} name The name of the Gesture to find.
     * @returns {Gesture | null} Either the found gesture, or null if no such Gesture exists.
     */
    function GetGestureByName(name: string): Gesture | null;
    /**
     * Returns the Gesture (if any) that is using the pointer that generated the supplied PointerEvent. Returns null if there is no such Gesture.
     * @param {PointerEvent} e A PointerEvent.
     * @param {string} [gestureNamePrefix] [Optional] Only if the Gesture starts with this prefix will it be returned.
     * @returns {Gesture | null} Either the found gesture, or null if no such Gesture exists.
     */
    function GetGestureFromEvent(e: PointerEvent, gestureNamePrefix?: string): Gesture | null;
    /**
     * Given an object (typically 'this') checks if it's a Gesture instance and, if so, returns the object. Throws if it's not a Gesture.
     * @param {object} o The object to check.
     * @returns {Gesture} Result.
     */
    function ThisGesture(o: object): Gesture;
    /**
     * Given an object (typically 'this') checks if it's an Ink instance and, if so, returns the object. Throws if it's not an Ink.
     * @param {object} o The object to check.
     * @returns {Ink} Result.
     */
    function ThisInk(o: object): Ink;
    /**
     * Given an object (typically 'this') checks if it's a Ruler control instance and, if so, returns the object. Throws if it's not a Ruler.
     * @param {object} o The object to check.
     * @returns {Controls.RulerControl} Result.
     */
    function ThisRuler(o: object): Controls.RulerControl;
    /**
     * Given an object (typically 'this') checks if it's a RadialMenuControl control instance and, if so, returns the object. Throws if it's not a RadialMenuControl.
     * @param {object} o The object to check.
     * @returns {Controls.RadialMenuControl} Result.
     */
    function ThisRadialMenu(o: object): Controls.RadialMenuControl;
    /**
     * Returns true if at least one Ink is currently being dragged.
     * @returns {boolean} Result.
     */
    function IsInkDragInProgress(): boolean;
    /**
     * Returns all the current Ink instances that have the specified 'className', or returns all Inks if no 'className' is specified.
     * @param {string} [className] [Optional] The class name an Ink instance should have to be included in the results.
     * @returns {Ink[]} Result.
     */
    function Inks(className?: string): Ink[];
    /**
     * Returns the Ink that corresponds to the supplied SVG Path, or null if the Path does not belong to any Ink (as either its Ink.Path or Ink.HullPath).
     * @param {TargetDomElement} targetElement The Path element to check.
     * @returns {Ink | null} Result.
     */
    function GetInkByElement(targetElement: TargetDomElement): Ink | null;
    /**
     * Returns the Ink that has the supplied ID, or null if there is no such Ink.
     * @param {string} targetInkID The ID of the Ink to find.
     * @returns {Ink | null} Result.
     */
    function GetInkByID(targetInkID: string): Ink | null;
    /**
     * The version of MIL.
     * @returns {string} Version in the form "Major.Minor.Date.IntraDayRevision" [where Date = YYYYMMDD].
     */
    function Version(): string;
    /**
     * Initializes MIL for use with the specified SVG element. The returned <g> element is automatically appended to the <svg>.
     * @param {SVGSVGElement | D3SingleSelection} svg The SVG element to enable for use with MIL. Can either be an SVG DOM element, or a d3 selection of that DOM element.
     * @returns {SVGGElement} The created SVG Group (<g>) DOM element.
     */
    function Initialize(svg: DomElement): SVGGElement;
    /**
     * Returns the count of active Gestures that target the specified element.
     * @param {DomElement | null} targetDomElement The element to filter by, or null to include all Gestures regardless of the element they target.
     * @returns {number} Result.
     */
    function GetActiveGestureCount(targetDomElement: DomElement): number;
    /**
     * Removes the Gesture with the specified name. A silent no-op if no such Gesture exists.
     * @param {string} name The name of the Gesture to remove.
     */
    function RemoveGestureByName(name: string): void;
    /**
     * Removes all the Gestures that target the specified element, optionally filtered by having a name that starts with gestureName.
     * @param {TargetDomElement} targetElement The element to inspect.
     * @param {string} [gestureName] [Optional] Only remove a Gesture if it starts with this name.
     */
    function RemoveGesturesByTarget(targetElement: TargetDomElement, gestureName?: string): void;
    /**
     * Transposes the clientX/Y of the supplied Pointer Event into the coordinate space of the specified svg 'g' element [which may have been transformed].
     * Returns the new point as an object with x/y members.
     * @param {PointerEvent} e The PointerEvent to transpose.
     * @param {SVGGElement} g The SVG group element (or other SVG Element that's in an SVG group) to transpose the PointerEvent into.
     * @returns {Point} Result.
     */
    function TransposePointer(e: PointerEvent, g: TargetDomElement): Point;
    /**
     * Transposes the supplied screen-point into the coordinate space of the svg 'g' element [which may have been transformed] to which targetElement belongs.
     * Returns the new point as an object with x/y members.
     * @param {Point} screenPoint A point in screen coordinates.
     * @param {SVGGElement | TargetDomElement} targetElement The SVG group element (or other SVGElement that's in the SVG group) to transpose the 'screenPoint' into.
     * @returns {Point} Result.
     */
    function TransposeScreenPoint(screenPoint: Point, targetElement: SVGGElement | TargetDomElement): Point;
    /**
     * Gets or sets the zoom level for the specified SVG element.
     * @param {TargetDomElement} svgDomElement An SVG element.
     * @param {number} [level] [Optional] The new zoom level.
     * @param {Point} [focalScreenPoint] [Optional] The focal point (in screen coordinates) of the zoom. If not supplied, the center of the SVG elment will be used.
     * @returns {number | void} Result (or void).
     */
    function Zoom(svgDomElement: TargetDomElement, level?: number, focalScreenPoint?: Point): number | void;
    /**
     * Returns the current pan position (x/y offsets) of the specified SVG element.
     * @param {TargetDomElement} svgDomElement An SVG element.
     * @returns {PanPosition} Result.
     */
    function Pan(svgDomElement: TargetDomElement): PanPosition;
    /**
     * Pans the specified SVG element by the specified number of pixels relative to the current pan position.
     * @param {TargetDomElement} svgDomElement An SVG element.
     * @param {number} deltaXInPixels The number of pixels to change the pan by on the x-axis.
     * @param {number} deltaYInPixels The number of pixels to change the pan by on the y-axis.
     */
    function PanRelative(svgDomElement: TargetDomElement, deltaXInPixels: number, deltaYInPixels: number): void;
    /**
     * Pans the specified SVG element to the specified absolute position. // PORT: Is this in screen coordinates?
     * @param {TargetDomElement} svgDomElement An SVG element.
     * @param {number} absoluteX The abolsolute position along the x-axis.
     * @param {number} absoluteY The abolsolute position along the y-axis.
     */
    function PanAbsolute(svgDomElement: TargetDomElement, absoluteX: number, absoluteY: number): void;
    /**
     * Returns the most recent pointerMove event for the specified pointerID on the specified targetDomElement, or null if no such event exists.
     * @param {string} pointerID A pointer ID. Can also be a PointerEvent.pointerType (eg. "pen").
     * @param {DomElement} targetDomElement The DOM element that the pointer is targeting.
     * @returns {PointerEvent | null} Result.
     */
    function getLatestPointerMoveEvent(pointerID: string, targetDomElement: DomElement): PointerEvent | null;
    /**
     * Enables or disables the specified Gesture group. Note: Gesture groups are enabled unless explictly disabled.
     * @param {string} groupName A Gesture group name.
     * @param {boolean} enable Flag.
     */
    function EnableGestureGroup(groupName: string, enable: boolean): void;
    /**
     * Returns true if the specified Gesture group is enabled.
     * @param {string} groupName The name of the Gesture group to check.
     * @returns {boolean} Result.
     */
    function IsGestureGroupEnabled(groupName: string): boolean;
    /**
     * Returns the current pen presssure (if any) on the targetElement. If the pen is not being used, returns null.
     * @param {TargetDomElement} targetElement The element to inspect.
     * @returns {number | null} Result.
     */
    function PenPressure(targetElement: TargetDomElement): number | null;
    /**
     * Returns the current pen buttons (if any) being used on the targetElement. If the pen is not being used, returns null.
     * @param {TargetDomElement} targetElement The element to inspect.
     * @returns {number | null} Result.
     */
    function PenButtons(targetElement: TargetDomElement): number | null;
    /** The shapes that can be recognized by MIL.RecognizeShape(). */
    enum RecognizableShape {
        /** A right-handed tick (✓). */
        CheckMark = 0,
        /** An equilateral triangle (△). */
        Triangle = 1,
        /** A 5-pointed "pentagram" star (⛤). */
        Star = 2,
        /** Can be made in either an E or W direction. */
        StrikeThroughHorizontal = 3,
        /** Has to be made in a SW direction. */
        StrikeThroughDiagonal = 4,
        /** Like a "reminder ribbon" (🎗) but rotated 90 degrees left. */
        XOut = 5,
        /** A rectangle (▭). */
        Rectangle = 6,
        /** A right chevron (>). */
        GreaterThan = 7,
        /** A left chevron (<). */
        LessThan = 8,
        /** An up chevron (^). */
        UpArrow = 9,
        /** An down chevron (v). */
        DownArrow = 10
    }
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
    function RecognizeShape(pathPoints: Point[], minMatchPercent?: number, targetWidth?: number, targetHeight?: number, gDomElement?: SVGGElement, targetShapeList?: RecognizableShape[]): RecognizableShape | null;
    /**
     * Interprets the supplied pathPoints as the path of a radial swipe gesture and returns information about the gesture. If the swipe is too short (less than minDistance), returns null.
     * @param {Point[]} pathPoints The set of Points to inspect (typically these are from an Ink).
     * @param {number} numRadialSegments The number of radial segments to quantize into.
     * @param {number} minDistance The minimum length (in pixels) of the path for it to be considered a radial swipe gesture.
     * @returns {RadialSwipeResult | null} Result.
     */
    function RecognizeRadialSwipe(pathPoints: Point[], numRadialSegments: number, minDistance: number): RadialSwipeResult | null;
    /**
     * Returns the hover timeout (in milliseconds) for the specified element. A value of -1 indicates that hovering is disabled.
     * See also: Settings.HoverTimeoutInMs().
     * @param {TargetDomElement} targetElement The element to get the hover timeout for.
     * @returns {number} Result.
     */
    function GetElementHoverTimeoutInMs(targetElement: TargetDomElement): number;
    /**
     * Sets the hover timeout (in milliseconds) for the specified element.
     * See also: Settings.HoverTimeoutInMs().
     * @param {TargetDomElement} targetElement The element to set the hover timeout for.
     * @param {number} hoverTimeoutInMs The hover timeout (in milliseconds).
     */
    function SetElementHoverTimeoutInMs(targetElement: TargetDomElement, hoverTimeoutInMs: number): void;
    /** Resets all hover state tracking. */
    function ResetHoverStateTracking(): void;
}
declare namespace MIL {
    /**
     * The Utils namespace.
     */
    namespace Utils {
        /** Key codes (like DELETE) that can't be expressed as a string (like "A"). */
        enum Keys {
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
        enum ShapeNodeType {
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
         * Logs the specified message (with the [optional] specified prefix) to the console.
         * @param {string} message Message to log.
         * @param {string} [prefix] [Optional] Prefix for the message.
         */
        function Log(message: string, prefix?: string): void;
        /**
         * Returns the DOM element represented by 'targetElement', which can be either be an actual SVG DOM element, a d3 selection containing a single SVG DOM element, or an HTML DOM element.
         * In either case, if 'domElementType' is specified (eg. SVGPathElement) then the DOM element represented by 'targetElement' must be of that type or an exception will be thrown.
         * @param {TargetDomElement | HTMLElement} targetElement An actual DOM element, or a d3 selection containing a single DOM element.
         * @param {any} domElementType The type (eg. SVGPathElement) of 'targetElement'. An exception will be thrown if 'targetElement' is of a different type.
         * @return {DomElement} The DOM element represented by 'targetElement'.
         */
        function GetDomElement(targetElement: TargetDomElement | HTMLElement, domElementType?: any): DomElement;
        /**
         * [Private Method] Returns the name of the type of the specified object.
         * @param {object} o Object to get type name of.
         * @returns {string} Type name of object.
         */
        function GetObjectType(o: object): string;
        /**
         * Given an object, checks if it's a RulerControl instance and - if so - returns the object. Throws if it's not a RulerControl.
         * @param {object} o The object to check.
         * @returns {Controls.RulerControl} Result.
         */
        function GetRulerControl(o: object): Controls.RulerControl;
        /**
         * Enables (or disables) the keyboard handler for the specified DOM element (normally a top-level element, like a containing/parent DIV).
         * There is only one keyboard handler, so only it can only be enabled for one DOM element at-a-time.
         * If the keyboard handler is not enabled, methods like IsKeyPressed() and IsNoKeyPressed() will throw when called.
         * @param {TargetDomElement | HTMLElement} targetElement The element to enable/disable the keyboard handler for.
         * @param {boolean} enable The enable/disable flag.
         * @returns {boolean} Whether the operation was successful or not.
         */
        function EnableKeyboardHandler(targetElement: TargetDomElement | HTMLElement, enable: boolean): boolean;
        /**
         * Returns true if no key is currently being pressed for the DOM element supplied to Utils.EnableKeyboardHandler().
         * @returns {boolean} Flag indicating if no key is currently being pressed.
         */
        function IsNoKeyPressed(): boolean;
        /**
         * Returns true if the specified key is currently being pressed.
         * @param {string | Keys} key Either be a Utils.Keys value (eg. Keys.CTRL), a Utils.Keys name (eg. "CTRL"), or a literal (eg. "S")
         * @returns {boolean} Whether the specified key is currently being pressed.
         */
        function IsKeyPressed(key: string | Keys): boolean;
        /**
         * Returns a string describing all the currently pressed keys.
         * @returns {string} A description of all the currently pressed keys.
         */
        function GetPressedKeyInfo(): string;
        /**
         * Converts the specified 'stringValue' to a number, or throws if the conversion to a number is not possible.
         * This is useful for converting CSS dimension values (like "200px") to their numeric equivalents.
         * @param {string} stringValue The string to attempt to convert to a number.
         * @returns {number} Result.
         */
        function ToNumber(stringValue: string): number;
        /**
         * Searches through the document's CSS stylesheets and returns the value of 'propertyName' in the first rule that matches 'cssSelector'.
         * Returns null if no match is found. Note: The matching of cssSelector is a simple 'contains'.
         * @param {string} cssSelector The CSS selector (eg. ".MyClass") of the rule to look for.
         * @param {string} propertyName The name of the style property (eg. "stroke-width") to look for in the found rule.
         * @returns {string | null} Property value, or null if not found.
         */
        function GetCssProperty(cssSelector: string, propertyName: string): string | null;
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
        function Fade(d3Selection: D3Selection, durationInMs: number, className?: string, onFadeComplete?: () => void, isFadeIn?: boolean, beginOpacity?: number, endOpacity?: number): void;
        /**
         * Returns true if the specified target X/Y lies inside the specified polygon.
         * @param {PolygonPoints} polygonPoints The verticies of the polygon.
         * @param {number} targetX The x-axis value of the point to test.
         * @param {number} targetY The x-axis value of the point to test.
         * @returns {boolean} Result.
         */
        function IsPointInPolygon(polygonPoints: PolygonPoints, targetX: number, targetY: number): boolean;
        /**
         * Returns true if any of the pointsToTest are inside the specified polygon.
         * @param {PolygonPoints} polygonPoints The verticies of the polygon.
         * @param {PolygonPoints} pointsToTest The points to test for inclusion.
         * @returns {boolean} Result.
         */
        function IsAnyPointInPolygon(polygonPoints: PolygonPoints, pointsToTest: PolygonPoints): boolean;
        /**
         * If needed, converts the supplied 'points' from [{x,y}] to [[x, y]].
         * @param {PolygonPoints} points The verticies of the polygon, in either [{x,y}] or [[x, y]] format (if in the latter format then this method is a no-op).
         * @returns {XY[]} The supplied 'points' in [[x, y]] format.
         */
        function ConvertPointsToXYPoints(points: PolygonPoints): XY[];
        /**
         * If needed, converts the supplied 'points' from [[x, y]] to [{x,y}].
         * @param {PolygonPoints} points The verticies of the polygon, in either [[x, y]] of [{x,y}] format (if in the latter format then this method is a no-op).
         * @returns {Point[]} The supplied 'points' in [{x,y}] format.
         */
        function ConvertXYPointsToPoints(points: PolygonPoints): Point[];
        /**
         * Returns the number of 'targetPointsToTest' points that are inside 'targetPolygonPoints'.
         * @param {PolygonPoints} targetPolygonPoints The verticies of the polygon.
         * @param {PolygonPoints} targetPointsToTest The points to test.
         * @returns {number} Result.
         */
        function CountPointsInPolygon(targetPolygonPoints: PolygonPoints, targetPointsToTest: PolygonPoints): number;
        /**
         * Returns a best-guess (true/false) of whether the supplied path (and corresponding [[x,y]] points) is classified as a straight line.
         * @param {XY[]} polygonPoints The verticies in the SVGPathElement in 'path'.
         * @return {boolean} Result.
         */
        function IsStraightLine(polygonPoints: XY[]): boolean;
        /**
         * Returns the length of the line described by the supplied set of Points.
         * @param {Point[]} pathPoints A set of Points.
         * @returns {number} Result.
         */
        function ComputeTotalLength(pathPoints: Point[]): number;
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
        function FindShapeElementsInRegion(targetGElement: TargetDomElement, shapeNodeType: ShapeNodeType, region: Point[] | Ink, filter?: FindShapeFilter, percentageInside?: number): Ink[] | DomElement[];
        /**
         * Returns the center point (in svg space) of the supplied DOM element.
         * @param {DomElement} targetDomElement The DOM element to find the centroid of.
         * @returns {Point} Result.
         */
        function GetCentroidPoint(targetDomElement: DomElement): Point;
        /**
         * Returns an array of {x, y} points in the order [TL, TR, BR, BL].
         * @param {ClientRect | Rect} rect The rectangle to extract points from.
         * @returns { Point[] } Result.
         */
        function GetPointsFromRect(rect: ClientRect | Rect): Point[];
        /**
         * Returns a Rect from the two supplied points.
         * @param {Point} point1 First point.
         * @param {Point} point2 Second point.
         * @returns {Rect} Result.
         */
        function GetRectFromPoints(point1: Point, point2: Point): Rect;
        /**
         * Returns a set of SVGPoints sampled from the specified Path.
         * @param {SVGPathElement} pathDomElement The Path element to sample from.
         * @param {boolean} [showPoints] [Optional] Whether or not to display black dots representing the sampled points.
         * @param {number} [distanceInPxBetweenSamples] [Optional The number of pixels (along the Path) between samples.
         * @returns {SVGPoint[]} Result.
         */
        function SamplePointsFromPath(pathDomElement: SVGPathElement, showPoints?: boolean, distanceInPxBetweenSamples?: number): SVGPoint[];
        /**
         * Returns the elementSvgPoints array modified for the transform (if any) of domElement, and for the transform (if any) of its host SVGGElement.
         * @param {SVGGraphicsElement} domElement An SVG shape element (path, rect, etc.) that has [or at least can be] transformed.
         * @param {SVGPoint} elementSvgPoints An array of SVGPoint's (in absolute coordinates) from domElement.
         * @returns {SVGPoint[]} Result.
         */
        function GetTransformedPoints(domElement: SVGGraphicsElement, elementSvgPoints: SVGPoint[]): SVGPoint[];
        /**
         * Returns the closest point to targetPoint on the line described by lineStartPoint/lineEndPoint.
         * @param {Point} targetPoint The point to find the closet point to on the line.
         * @param {Point} lineStartPoint The start of the line.
         * @param {Point} lineEndPoint The end of the line.
         * @returns {Point} Result.
         */
        function GetClosestPointOnLine(targetPoint: Point, lineStartPoint: Point, lineEndPoint: Point): Point;
        /**
         * Returns the distance (in pixels) between two PointerEvents.
         * @param {PointerEvent} e1 First event.
         * @param {PointerEvent} e2 Second event.
         * @returns {number} Result.
         */
        function GetDistanceBetweenEvents(e1: PointerEvent, e2: PointerEvent): number;
        /**
         * Returns the distance (in pixels) between two Points.
         * @param {Point} point1 First point.
         * @param {Point} point2 Second point.
         * @returns {number} Result.
         */
        function GetDistanceBetweenPoints(point1: Point, point2: Point): number;
        /**
         * Returns a Rect that bounds all the Points in 'pathPoints'.
         * @param {Points[]} pathPoints The set of Points to find the bounding Rect for.
         * @returns {Rect} Result.
         */
        function GetBoundingRectForPoints(pathPoints: Point[]): Rect;
        /**
         * Returns the heading (>= 0, < 360) of 'endPoint' relative to 'startPoint'.
         * @param {Point} startPoint The starting Point.
         * @param {Point} endPoint The ending Point
         * @returns {number} Result.
         */
        function GetHeadingFromPoints(startPoint: Point, endPoint: Point): number;
        /**
         * Returns a heading value determined by the value of 'numRadialSegments'.
         * When either 4 or 8 it will return a compase heading (eg. "NE" or "W"). When any other value it returns a 0..numRadialSegments - 1 segment ID.
         * See also: GetRadialSegmentID().
         * @param {number} heading A value in the range 0..359.999.
         * @param {number} [numRadialSegments] [Optional] The number of segment to quantize 'heading' into.
         * @returns {string | number} Result.
         */
        function GetCompassHeading(heading: number, numRadialSegments?: number): string | number;
        /**
         * Returns a segment ID (0..numRadialSegments - 1) for the specified heading.
         * @param {number} heading A value in the range 0..359.999.
         * @param {number} numRadialSegments The number of segment to quantize 'heading' into.
         * @returns {number} Result.
         */
        function GetRadialSegmentID(heading: number, numRadialSegments: number): number;
        /**
         * Returns a Point on the circumference of a circle (with the specified radius and origin) at 'angleInDegrees' offset from the 12 o'clock position.
         * @param {number} angleInDegrees A value in the range 0..359.999 (0 is the 12 o'clock position).
         * @param {number} radius The radius of the circle.
         * @param {Point} originPoint The center of the circle.
         * @returns {Point} Result.
         */
        function GetPointOnCircle(angleInDegrees: number, radius: number, originPoint: Point): Point;
        /**
         * Returns a Points array (of length 'numPoints') taken at equal intervals along the circumference of a circle (with the specified radius and origin).
         * @param {number} numPoints The number of Points to include.
         * @param {number} radius The radius of the circle.
         * @param {Point} originPoint The center of the circle.
         * @returns {Point[]} Result.
         */
        function GetPointsOnCircle(numPoints: number, radius: number, originPoint: Point): Point[];
        /**
         * Returns the 'pathData' string (that describes an SVG path) scaled by the specified 'scale' ratio.
         * @param {string} pathData The path data to scale (eg. "M 0 0 L 100 0 L 100 100 Z"). Note: 'pathData' must have a 0,0 origin and can only contain M, L, Z, m, l, a or z commands.
         * @param {number} scale The ratio to scale by (eg. 1.2).
         * @returns {string} Result.
         */
        function ScalePathData(pathData: string, scale: number): string;
        /**
         * Translates (shifts and scales) the 'pathData' string (that describes an SVG path). Returns the translated path data.
         * @param {string} pathData The path data to scale (eg. "M 0 0 L 100 0 L 100 100 Z"). Note: 'pathData' must have a 0,0 origin and can only contain M, L, Z, m, l, a or z commands.
         * @param {number} deltaX The x-offset to translate by
         * @param {number} deltaY The y-offset to translate by.
         * @param {number} scaleFactor The amount to scale by. Values in the range 0..1 will scale the path up, values greater than 1 will scale the path down.
         * @returns {string} Result.
         */
        function TranslatePathData(pathData: string, deltaX: number, deltaY: number, scaleFactor: number): string;
        /**
         * Generates the path data (string) for a circle of the specified origin and radius.
         * For example, GetCirclePathData(100, 100, 75) produces the same visual result as <circle cx="100" cy="100" r="75"/>.
         * @param {number} centerX The x-axis value of the origin point.
         * @param {number} centerY The y-axis value of the origin point.
         * @param {number} radius The radius of the circle.
         * @returns {string} Result.
         */
        function GetCirclePathData(centerX: number, centerY: number, radius: number): string;
        /**
         * Returns the 4 SVG points that define the currently viewable (ie. on-screen) area, within the total panable area.
         * @param {SVGGElement} gDomElement The SVG 'g' element to inspect.
         * @param {number} [insetMargin] [Optional] The number of pixels (on all sides) to reduce the viewable area by.
         * @returns {Point[]} Result.
         */
        function ViewableSvgAreaPoints(gDomElement: SVGGElement, insetMargin?: number): Point[];
        /**
         * Returns true if the angle beween headings is less than the specified range.
         * @param {number} heading1 The first heading (0..359.999).
         * @param {number} heading2 The second heading (0..359.999).
         * @param {number} range The maximum delta between the two headings for them to be considered aligned.
         * @returns {boolean} Result.
         */
        function AreHeadingsAligned(heading1: number, heading2: number, range?: number): boolean;
        /**
         * Returns the point at the middle of the line described by 'point1' and 'point2'.
         * @param {Point} point1 One end of the line.
         * @param {Point} point2 The other end of the line.
         * @returns {Point} Result.
         */
        function GetLineMidPoint(point1: Point, point2: Point): Point;
        /**
         * Creates (and returns) a d3 selection of an SVG path object [on 'gDomElement'] as described by the supplied 'points'. The path will be drawn in red using a line of 'strokeWidth' thickness.
         * @param {SVGGElement} gDomElement The SVG 'g' element to add the debug path to.
         * @param {Point[]} points The point that describe the debug path to add.
         * @param {number} strokeWidth The thickness (in px) of the line the debug path will be drawn with.
         * @returns {D3SingleSelection} Result.
         */
        function DebugDrawPoints(gDomElement: SVGGElement, points: Point[], strokeWidth: number): D3SingleSelection;
    }
}
declare namespace MIL {
    /** The MILSettings class */
    class MILSettings {
        private _minZoomLevel;
        private _maxZoomLevel;
        private _isRightMouseClickAllowed;
        private _inkAutoCombineMode;
        private _hoverTimeoutInMs;
        constructor();
        /**
         * [Chainable Property] The minimum allowed zoom-level. See Zoom().
         * @param {number} level A number in the range 0 < n <= 1.
         * @returns {this | number} Either the property value (if getting), or the MILSettings instance (if setting).
         */
        MinZoomLevel(level: number): this;
        MinZoomLevel(): number;
        /**
         * [Chainable Property] The maximum allowed zoom-level. See Zoom().
         * @param {number} level A number in the range n >= 1.
         * @returns {this | number} Either the property value (if getting), or the MILSettings instance (if setting).
         */
        MaxZoomLevel(level: number): this;
        MaxZoomLevel(): number;
        /**
         * [Chainable Property] Whether right-mouse clicking is allowed on MIL objects. This controls whether the built-in context menu displays or not.
         * @param {boolean} allow Flag.
         * @returns {this | boolean} Either the property value (if getting), or the MILSettings instance (if setting).
         */
        IsRightMouseClickAllowed(allow: boolean): this;
        IsRightMouseClickAllowed(): boolean;
        /**
         * [Chainable Property] How Inks should automatically combine (if at all) when they overlap.
         * @param {InkAutoCombineMode} mode The desired Ink auto-combine mode.
         * @returns {this | mode} Either the property value (if getting), or the MILSettings instance (if setting).
         */
        InkAutoCombineMode(mode: InkAutoCombineMode): this;
        InkAutoCombineMode(): InkAutoCombineMode;
        /**
         * [Chainable Property] The amount of time that must elapse after a potential hover starts before the actual over event is triggered.
         * Defaults to -1, which disables Hover events from happening (hovering adds considerable eventing overhead).
         * Note: The expected usage pattern is that hover will be enabled on a per-element basis using SetElementHoverTimeoutInMs().
         * @param {number} timeoutInMs A timeout in milliseconds (must be >= -1).
         * @returns {this | number} Either the property value (if getting), or the MILSettings instance (if setting).
         */
        HoverTimeoutInMs(timeout: number): this;
        HoverTimeoutInMs(): number;
    }
}
declare namespace MIL {
    type GestureDefaultsType = typeof GestureDefaults;
    /**
     * The GestureDefaults namespace.
     * Setting GestureDefault properties saves having to re-specify the corresponding Gesture properties [repetitively] each time CreateGesture() is called.
     */
    export namespace GestureDefaults {
        /**
         * Resets all defaults. Returns the GestureDefaults namespace.
         * @returns {GestureDefaultsType} The GestureDefaults namespace.
         */
        function Reset(): GestureDefaultsType;
        /**
         * [Chainable Property] The default target DOM element for a gesture.
         * @param {TargetDomElement} [targetElement] [Optional] A DOM element.
         * @returns {GestureDefaultsType | DomElement} Either the property value (if getting), or the GestureDefaults namespace (if setting).
         */
        function Target(targetElement: TargetDomElement): GestureDefaultsType;
        function Target(): DomElement;
        /**
         * [Chainable Property] The default GestureStarted handler.
         * @param {GestureEventHandler} [handler] [Optional] A GestureStarted event handler.
         * @returns {GestureDefaultsType | GestureEventHandler} Either the property value (if getting), or the GestureDefaults namespace (if setting).
         */
        function StartedHandler(handler: GestureEventHandler): GestureDefaultsType;
        function StartedHandler(): GestureEventHandler;
        /**
         * [Chainable Property] The default GestureEnded handler.
         * @param {GestureEndedHandler} [handler] [Optional] A GestureEnded event handler.
         * @returns {GestureDefaultsType | GestureEndedHandler} Either the property value (if getting), or the GestureDefaults namespace (if setting).
         */
        function EndedHandler(handler: GestureEndedHandler): GestureDefaultsType;
        function EndedHandler(): GestureEndedHandler;
        /**
         * [Chainable Property] The default GestureCancelled handler.
         * @param {GestureEventHandler} [handler] [Optional] A GestureCencelled event handler.
         * @returns {GestureDefaultsType | GestureEventHandler} Either the property value (if getting), or the GestureDefaults namespace (if setting).
         */
        function CancelledHandler(handler: GestureEventHandler): GestureDefaultsType;
        function CancelledHandler(): GestureEventHandler;
        /**
         * [Chainable Property] The default gesture recognition timeout (in milliseocnds).
         * @param {number} [timeoutInMs] [Optional] A number in the range n >= 0.
         * @returns {GestureDefaultsType | number} Either the property value (if getting), or the GestureDefaults namespace (if setting).
         */
        function RecognitionTimeoutInMs(timeoutInMs: number): GestureDefaultsType;
        function RecognitionTimeoutInMs(): number;
        /**
         * [Chainable Property] The default gesture group name.
         * @param {string} [name] [Optional] A name.
         * @returns {GestureDefaultsType | string} Either the property value (if getting), or the GestureDefaults namespace (if setting).
         */
        function GroupName(name: string): GestureDefaultsType;
        function GroupName(): string;
    }
    export {};
}
declare namespace MIL {
    /** Type of an event handler (callback) invoked when an Ink instance is being dragged. */
    type InkDragMoveEventHandler = (deltaX: number, deltaY: number) => void;
    /** Type of an Ink event handler (callback). When the handler is invoked, 'this' will be set to the Ink instance. */
    type InkEventHandler = () => void;
    /** The Ink class. */
    class Ink {
        private _inkID;
        private _pointerID;
        private _isStarted;
        private _parentGesture;
        private _className;
        private _strokeColor;
        private _strokeWidth;
        private _eraserClassName;
        private _hullType;
        private _hullColor;
        private _isNonDrawing;
        private _cometTailClassName;
        private _cometTailDurationInMs;
        private _isAutoCose;
        private _hullPath;
        private _finalPath;
        private _nonDrawingPathPoints;
        private _combinedOutlinePathPoints;
        private _isEraserDrawing;
        private _isCoercingInkToRuler;
        private _resizeGesturePointerType;
        private _resizeGesture;
        private _onResizeCompleteHandler;
        private _scale;
        private _onDragMoveHandler;
        private _previousDragMovePoint;
        private _groupDragSelectionClassName;
        private _dragGesture;
        constructor(pointerID: string);
        /**
         * [ReadOnly Property] The unique, system-supplied name of the Ink instance.
         * @returns {string} Property value.
        */
        InkID(): string;
        /**
         * [ReadOnly Property] The unique MIL PointerID that is currently being used to draw the Ink instance (will be null after the Ink is drawn).
         * @returns {string} Property value.
         */
        PointerID(): string;
        /**
         * [Chainable Property] The Gesture that created the Ink instance (a Gesture can be the parent of many Inks).
         * @param {Gesture} gesture A Gesture instance.
         * @returns {this | Gesture} Either the property value (if getting), or the Ink instance (if setting).
         */
        ParentGesture(gesture: Gesture): this;
        ParentGesture(): Gesture;
        /**
         * [Chainable Property] The CSS class to use to draw the Ink instance. Set before calling Start().
         * @param {string} className A CSS class name.
         * @returns {this | string} Either the property value (if getting), or the Ink instance (if setting).
         */
        Class(className: string): this;
        Class(): string;
        /**
         * [Chainable Property] The color to use to draw the Ink instance. Set before calling Start().
         * Note: The Class() property takes precedence over this property.
         * @param {string} color A CSS color.
         * @returns {this | string} Either the property value (if getting), or the Ink instance (if setting).
         */
        StrokeColor(color: string): this;
        StrokeColor(): string;
        /**
         * [Chainable Property] The thickness to use to draw the Ink instance. Set before calling Start().
         * Note: The Class() property takes precedence over this property.
         * @param {string} width A CSS width.
         * @returns {this | string} Either the property value (if getting), or the Ink instance (if setting).
         */
        StrokeWidth(width: string): this;
        StrokeWidth(): string;
        /**
         * [Chainable Property] The CSS class to use to draw the Ink instance when IsEraserDrawing() is true. Set before calling Start().
         * @param {string} className A CSS class name.
         * @returns {this | string} Either the property value (if getting), or the Ink instance (if setting).
         */
        EraserClass(className: string): this;
        EraserClass(): string;
        /**
         * [Chainable Property] The CSS class to use to draw the Ink instance when IsNonDrawing() is true. Set before calling Start().
         * @param {string} className A CSS class name.
         * @returns {this | string} Either the property value (if getting), or the Ink instance (if setting).
         */
        CometTailClass(className: string): this;
        CometTailClass(): string;
        /**
         * [Chainable Property] The fade out duration for the comet tail (when CometTailClass is used). Set before calling Start().
         * @param {number} durationInMs Duration in milliseconds. The default is 500ms.
         * @returns {this | string} Either the property value (if getting), or the Ink instance (if setting).
         */
        CometTailDurationInMs(durationInMs: number): this;
        CometTailDurationInMs(): number;
        /**
         * [Chainable Property] The type of hull (interactive layer over the Ink) that will be created for the Ink instance. Set before calling Start().
         * Note: This property cannot be changed after the Ink has been created.
         * @param {InkHullType} hullType An InkHullType value.
         * @returns {this | InkHullType} Either the property value (if getting), or the Ink instance (if setting).
         */
        HullType(hullType: InkHullType): this;
        HullType(): InkHullType;
        /**
         * [Chainable Property] The color to use to draw the hull for the Ink instance. Set before calling Start().
         * @param {string} color A CSS color, or "debug".
         * @returns {this | string} Either the property value (if getting), or the Ink instance (if setting).
         */
        HullColor(color: string): this;
        HullColor(): string;
        /**
         * [Chainable Property] When set to true, the Ink instance will not add a <path> element, although the accumulated point data can still be accessed via PathPoints(). Set before calling Start().
         * Note: Setting this property to true and also setting the CometTailClass() property will produce a comet-tail effect as the [non-drawing] Ink is created.
         * @param {boolean} isNonDrawing Flag.
         * @returns {this | boolean} Either the property value (if getting), or the Ink instance (if setting).
         */
        IsNonDrawing(isNonDrawing: boolean): this;
        IsNonDrawing(): boolean;
        /**
         * [Chainable Property] When set to true, the last point in the created path will automatically be joined to the first point when Ink creation ends. Set before calling Start().
         * @param {boolean} isAutoClose Flag.
         * @returns {this | boolean} Either the property value (if getting), or the Ink instance (if setting).
         */
        IsAutoClose(isAutoClose: boolean): this;
        IsAutoClose(): boolean;
        /**
         * [Chainable Property] The pointer type specifier (eg. "touch:2") for the Gesture used to resize the Ink instance. Must specify exactly 2 pointers.
         * When setting, a Gesture to do the resize will be automatically created (replacing any previously created resize Gesture).
         * @param {string} pointerType A pointer type specifier that must specify exactly 2 pointers.
         * @returns {this | string} Either the property value (if getting), or the Ink instance (if setting).
         */
        ResizeWith(pointerType: string): this;
        ResizeWith(): string;
        /**
         * [Chainable Property] The callback to invoke when Ink resizing (if enabled) completes. See Ink.ResizeWith().
         * @param {InkEventHandler} handler The callback to invoke.
         * @returns {this | InkEventHandler} Either the property value (if getting), or the Ink instance (if setting).
         */
        OnResizeCompleteHandler(handler: InkEventHandler): this;
        OnResizeCompleteHandler(): InkEventHandler;
        /**
         * [ReadOnly Property] Whether the Ink instance was drawn with the pen eraser tip.
         * Note: This is automatically set to true when the 'pointerType' of the Ink is 'pen', and the eraser-tip of the pen is used to draw with.
         * @returns {boolean} Property value.
         */
        IsEraserDrawing(): boolean;
        /**
         * [ReadOnly Property] Whether the Ink instance is the result of combining one-or-more Inks.
         * @returns {boolean} Property value.
         */
        IsCombined(): boolean;
        /**
         * [ReadOnly Property] The hull path (as a d3 selection) of the Ink instance. Will be null if the Ink was created with HullType(InkHullType.None).
         * @returns {D3SingleSelection} Property value.
         */
        HullPath(): D3SingleSelection;
        /**
         * [ReadOnly Property] The path (as a d3 selection) of the Ink instance. Will be null if the Ink was created with IsNonDrawing(true).
         * @returns {D3SingleSelection} Property value.
         */
        Path(): D3SingleSelection;
        /**
         * [ReadOnly Property] The {x, y} points in the Ink instance.
         * @returns {Point[]} Property value.
         */
        PathPoints(): Point[];
        /** Deletes the Ink's Hull. */
        DeleteHull(): void;
        /** Cancels the Ink instance (while it's in the process of being created). */
        Cancel(): void;
        /** Deletes the Ink instance. */
        Delete(): void;
        /** [Private Method] Removes the Ink instance from the list of all Inks (_inks). */
        private deleteInksEntry;
        /**
         * [Chainable Property] The scale of the Ink instance (default is 1). When setting, re-scales the Ink (and - optionally - its Hull), maintaining constant line thickness of the Ink.
         * @param {number} scale The new scale value.
         * @param {number} startScale The starting scale value. Ignored when excludeHull is true [PORT: Why is this restriction  necessary?].
         * @param {number} startStrokeWidth How thick the Ink's line is (in pixels) before re-scaling.
         * @param {boolean} [excludeHull] [Optional] If true, the hull (if any) will NOT be scaled.
         * @returns {this | number} Either the property value (if getting), or the Ink instance (if setting).
         */
        Scale(scale: number, startScale: number, startStrokeWidth: number, excludeHull?: boolean): this;
        Scale(): number;
        /** [Private Method] Applies the current Class/StrokeColor/StrokeWidth to either the final "consolidated" path (if available), or the current constituent path of an in-flight inking. */
        private applyStyle;
        /**
         * [Chainable Property] The callback that will be invoked for each move when the Ink is being dragged (by a Gesture).
         * @param {InkDragMoveEventHandler} handler An InkDragMoveEventHandler.
         * @returns {this | number} Either the property value (if getting), or the Ink instance (if setting).
         */
        OnDragMoveHandler(handler: InkDragMoveEventHandler): this;
        OnDragMoveHandler(): InkDragMoveEventHandler;
        /**
         * [Private Method] Returns true if the specified PointerEvent was generated from the pen eraser.
         * @param {PointerEvent} e A PointerEvent.
         * @return {boolean} Result.
         */
        private isEraser;
        /**
         * Starts the Ink instance.
         * @returns {Ink} The Ink instance.
         */
        Start(): this;
        /**
         * [Private Method] Starts drawing a new line (path) using the specified pointerDown event. The line will be drawn on the corresponding svgInfo.gDomElement.
         * @param {PointerEvent} e A pointerDown event.
         */
        private startNewLine;
        /**
         * [Internal] Handler for a pointerMove event. Typically this is called by the Ink's owning Gesture (or by the Ink itself).
         * @param {PointerEvent} e A pointerMove event.
         */
        OnPointerMove(e: PointerEvent): void;
        /**
         * [Internal] Handler for a pointerUp event. Typically this is called by the Ink's owning Gesture (or by the Ink itself).
         * @param {PointerEvent} e A pointerUp event.
         */
        OnPointerUp(e: PointerEvent): void;
        /**
         * Starts a drag operation for the Ink. When the drag is complete, call Ink.DragEnd().
         * @param {Gesture} dragGesture The Gesture being used to drag the Ink (must target the Ink's Hull).
         * @param {string} [groupDragSelectionClassName] [Optional] The name of a class used to find the set of Inks to drag (ie. a multi-select drag).
         */
        DragStart(dragGesture: Gesture, groupDragSelectionClassName: string): void;
        /**
         * [Private Static Method] A handler for pointerMove events when the Ink is being dragged.
         * Note: The value of 'this' must be explicitly set to the Gesture that is performing the drag [eg. using call()] otherwise the method will throw.
         * @param {PointerEvent} e A pointerMove event.
         */
        private static dragMove;
        /** Ends the drag operation started by Ink.DragStart(). */
        DragEnd(): void;
        /**
         * Returns the convex area of the Ink instance.
         * @returns {number} Result.
         */
        GetConvexArea(): number;
        /**
         * Returns true if the Ink instance is completely within the specified targetInk, false otherwise.
         * Note: returns false if targetInk is the current Ink instance.
         * @param {Ink} targetInk The "bounding" Ink instance.
         * @returns {boolean} Result.
         */
        IsInside(targetInk: Ink): boolean;
        /**
         * Using a grid-quantizing scheme, returns an array of {x,y} points (of length numGridPoints) that lie within the Ink instance.
         * An empty array will be returned if no layout grid can be computed.
         * Typically this is used to create locations ("landing sites") to move other items into the Ink region (eg. when the Ink is being used as a container).
         * @param {number} numGridPoints The number of grid points to create.
         * @returns {Point[]} Result.
         */
        GetLayoutGridPoints(numGridPoints: number): Point[];
        /**
         * Returns true if the Ink instance is [approximately] a straight line.
         * @returns {boolean} Result.
         */
        IsStraightLine(): boolean;
        /**
         * [Private Method] Translates the specified Ink path by the specified x/y delta.
         * @param {D3SingleSelection} inkPath The Ink path to translate (as a D3 Selection of the svg Path element).
         * @param {number} deltaX The number of pixels to translate by on the x-axis.
         * @param {number} deltaY The number of pixels to translate by on the y-axis.
         * @param {boolean} useTransform If true, use a [fast] svg transform to do the translation (but doesn't update __MILPathPointsCollection__).
         *                               If false, uses a [slow] manual redraw to do the translation (and updates __MILPathPointsCollection__).
         */
        private translateInkPath;
        /**
         * [Private Method] Translates the specified Ink Hull path by the specified x/y delta.
         * @param {D3SingleSelection} hullPath The Ink Hull path to translate (as a D3 Selection of the svg Path element).
         * @param {number} deltaX The number of pixels to translate by on the x-axis.
         * @param {number} deltaY The number of pixels to translate by on the y-axis.
         * @param {boolean} useTransform If true, use a [fast] svg transform to do the translation (but doesn't update __MILPathPointsCollection__).
         *                               If false, uses a [slow] manual redraw to do the translation (and updates __MILPathPointsCollection__).
         */
        private translateHullPath;
        /**
         * [Private Method] Translates [by altering the 'transform' attribute] the specified DOM element by the specified x/y delta.
         * @param {D3SingleSelection} element D3 selection of the DOM element to translate.
         * @param {number} deltaX The number of pixels to translate by on the x-axis.
         * @param {number} deltaY The number of pixels to translate by on the y-axis.
         */
        private translateWithTransform;
        /**
         * [Private Method] Returns the Ink path (as a D3 Selection) that's associated with the specified Hull element.
         * @param {DomElement} hullPath The svg path element of an Ink Hull.
         * @returns {D3Selection} Result.
         */
        private getInkPathAssociatedWithHull;
        /**
         * [Private Method] When an Ink is complete, creates a single "composite" path to replace the multiple [overlapping] constituent paths.
         * @param {PointerEvent} e The pointerUp event for the Ink (when it ends).
         */
        private consolidatePaths;
        /**
         * [Private Method] Scales (resizes) the specified Ink path.
         * @param {D3SingleSelection} inkPath The Ink path to scale (as a D3 Selection of the svg Path element).
         * @param {number} oldScale The old (starting) scale of the Ink.
         * @param {number} newScale The new (ending) scale of the Ink.
         * @param {number} startStrokeWidth The starting thickness (in pixels) of the Ink line.
         * @param {boolean} useTransform If true, use a [fast] svg transform to do the scaling (but doesn't update __MILPathPointsCollection__).
         *                               If false, uses a [slow] manual redraw to do the scaling (and updates __MILPathPointsCollection__).
         */
        private scaleInkPath;
        /**
         * [Private Method] Scales (resizes) the specified Ink Hull path (a d3 selection of an svg Path element). Also scales the Hull's line thickness.
         * @param {D3SingleSelection} hullPath The Ink Hull path to scale.
         * @param {number} scaleDelta The ratio to scale by.
         */
        private scaleHullPath;
    }
}
declare namespace MIL {
    let _activePointerCaptures: {
        [targetElementID: string]: string[];
    };
    /** The Gesture class. To create a new Gesture, use MIL.CreateGesture(). */
    class Gesture {
        private _name;
        private _targetDomElement;
        private _pointerType;
        private _pointerTypePermutations;
        private _pointerTypeOrdinals;
        private _conditional;
        private _isExclusive;
        private _isEnabled;
        private _isCancelled;
        private _groupName;
        private _recognitionTimeoutInMs;
        private _completionTimeoutInMs;
        private _gestureStartedHandler;
        private _gestureEndedHandler;
        private _gestureCancelledHandler;
        private _onMoveHandler;
        private _activePointerList;
        private _activePointerTypeOrdinals;
        private _capturesPointers;
        private _isCapturing;
        private _ink;
        private _startedTime;
        private _endedTime;
        private _repeatCount;
        private _repeatTimeoutInMs;
        private _repeatOccurrenceCount;
        private _lastRepeatRecognitionTime;
        private _checkForGesturesOnEnd;
        private _allowEventPropagation;
        private _completionTimerID;
        constructor(name: string, ignoreGestureDefaults: boolean);
        /**
         * [Chainable Property] The name of the Gesture.
         * @param {string} name The name to give the Gesture instance.
         * @returns {this | string} Either the property value (if getting), or the Gesture instance (if setting).
         */
        Name(name: string): this;
        Name(): string;
        /**
         * [Chainable Property] The DOM element that the Gesture is recognized on.
         * @param {TargetDomElement} element The target element.
         * @returns {this | boolean} Either the property value (if getting), or the Gesture instance (if setting).
         */
        Target(element: TargetDomElement): this;
        Target(): DomElement;
        /**
         * [Chainable Property] The pointer type of the Gesture (eg. "pen|touch+touch" meaning "pen+touch | touch+touch").
         * @param {string} pointerType The pointer type(s).
         * @returns {this | string} Either the property value (if getting), or the Gesture instance (if setting).
         */
        PointerType(pointerType: string): this;
        PointerType(): string;
        /**
         * [ReadOnly Property] The set of all permutations of PointerType.
         * @returns {string[]} Result.
         */
        PointerTypePermutations(): string[];
        /**
         * [Chainable Property] A callback that controls whether the Gesture should start once all pointers have been detected.
         * @param {GestureConditionalCallback} callback A callback that returns true if the Gesture should be started. When the callback is invoked, 'this' will be set to the Gesture instance.
         * @returns {this | GestureConditionalCallback} Either the property value (if getting), or the Gesture instance (if setting).
         */
        Conditional(callback: GestureConditionalCallback): this;
        Conditional(): GestureConditionalCallback;
        /**
         * [Chainable Property] Whether the Gesture, when active, prevents other Gestures from being recognized on Gesture.Target(). Defaults to true.
         * @param {boolean} exclusive Flag.
         * @returns {this | boolean} Either the property value (if getting), or the Gesture instance (if setting).
         */
        IsExclusive(exclusive: boolean): this;
        IsExclusive(): boolean;
        /**
         * [Chainable Property] Whether the Gesture is currently enabled or not.
         * @param {boolean} enabled Flag.
         * @returns {this | boolean} Either the property value (if getting), or the Gesture instance (if setting).
         */
        IsEnabled(enabled: boolean): this;
        IsEnabled(): boolean;
        /**
         * [Chainable Property] The name of the group that the Gesture belongs to.
         * @param {string} name A group name.
         * @returns {this | string} Either the property value (if getting), or the Gesture instance (if setting).
         */
        GroupName(name: string): this;
        GroupName(): string;
        /**
         * [Chainable Property] The timeout that pointers of the Gesture must all be detected within for the Gesture to be recognized.
         * @param {number} timeout A timeout in milliseconds.
         * @returns {this | number} Either the property value (if getting), or the Gesture instance (if setting).
         */
        RecognitionTimeoutInMs(timeout: number): this;
        RecognitionTimeoutInMs(): number;
        /**
         * [Chainable Property] The timeout that the Gesture must complete by before being automatically cancelled (-1 means no timeout).
         * @param {number} timeout A timeout in milliseconds.
         * @returns {this | number} Either the property value (if getting), or the Gesture instance (if setting).
         */
        CompletionTimeoutInMs(timeout: number): this;
        CompletionTimeoutInMs(): number;
        /**
         * [Chainable Property] The callback that will be invoked when the Gesture starts (ie. when it's been recognized).
         * @param {GestureEventHandler} handler The GestureStarted handler. When the handler is invoked, 'this' will be set to the Gesture instance.
         * @returns {this | GestureEventHandler} Either the property value (if getting), or the Gesture instance (if setting).
         */
        GestureStartedHandler(handler: GestureEventHandler): this;
        GestureStartedHandler(): GestureEventHandler;
        /**
         * [Chainable Property] The callback that will be invoked when the Gesture ends (when one of its required pointers is lifted).
         * @param {GestureEndedHandler} handler The GestureEnded handler. When the handler is invoked, 'this' will be set to the Gesture instance.
         * @returns {this | GestureEndedHandler} Either the property value (if getting), or the Gesture instance (if setting).
         */
        GestureEndedHandler(handler: GestureEndedHandler): this;
        GestureEndedHandler(): GestureEndedHandler;
        /**
         * [Chainable Property] The callback that will be invoked if the Gesture is cancelled.
         * @param {GestureEventHandler} handler The GestureCancelled handler. When the handler is invoked, 'this' will be set to the Gesture instance.
         * @returns {this | GestureEventHandler} Either the property value (if getting), or the Gesture instance (if setting).
         */
        GestureCancelledHandler(handler: GestureEventHandler): this;
        GestureCancelledHandler(): GestureEventHandler;
        /**
         * [Chainable Property] The callback that will be invoked when any pointer in the [active] Gesture moves.
         * @param {PointerEventHandler} handler A pointerMove handler. When the handler is invoked, 'this' will be set to the Gesture instance.
         * @returns {this | GestureEventHandler} Either the property value (if getting), or the Gesture instance (if setting).
         */
        OnMoveHandler(handler: PointerEventHandler): this;
        OnMoveHandler(): PointerEventHandler;
        /**
         * [Chainable Property] Whether the Gesture captures pointers to its target element (true by default).
         * @param {boolean} capturesPointers Flag.
         * @returns {this | boolean} Either the property value (if getting), or the Gesture instance (if setting).
         */
        CapturesPointers(capturesPointers: boolean): this;
        CapturesPointers(): boolean;
        /**
         * [ReadOnly Property] The most recent time the Gesture started (was recognized).
         * @returns {number} Result.
         */
        StartedTime(): number;
        /**
         * [ReadOnly Property] If the Gesture is currently active, returns the list of PointerID's involved.
         * @returns {string[]} Result.
         */
        ActivePointerList(): string[];
        /**
         *[ReadOnly Property] If the Gesture is currently active, returns the list of pointer type ordinals involved (eg. ["pen:1", "touch:1", "touch:2"]).
         * @returns {string[]} Result.
         */
        ActivePointerTypeOrdinals(): string[];
        /**
         * [ReadOnly Property] Returns true if the Gesture is active (is currently a recognized Gesture).
         * Note that a Gesture can be both simultaneously active and cancelled (aborted).
         * @returns {boolean} Result.
         */
        IsActive(): boolean;
        /**
         * [ReadOnly Property] Returns true if the Gesture was cancelled (after being recognized).
         * Note: Once set, will remain true until the Gesture is recognized again.
         * @returns {boolean} Result.
         */
        IsCancelled(): boolean;
        /**
         * [ReadOnly Property] Returns the number of pointers that this gesture requires.
         * @returns {number} Result.
         */
        PointerCount(): number;
        /**
         * [Chainable Property] The number of times the Gesture should be repeated in order to be recognized (eg. a double-tap gesture would set this to 2).
         * See also: Gesture.RepeatTimeoutInMs().
         * @param {number} count A count (must be at least 2).
         * @returns {this | number} Either the property value (if getting), or the Gesture instance (if setting).
         */
        RepeatCount(count: number): this;
        RepeatCount(): number;
        /**
         * [Chainable Property] The maximum amount of time (in milliseconds) that can elapse between repetitions of the Gesture in order for the Gesture to be recognized.
         * See also: Gesture.RepeatCount().
         * @param {number} timeout A timeout in milliseconds (must be at least 175).
         * @returns {this | number} Either the property value (if getting), or the Gesture instance (if setting).
         */
        RepeatTimeoutInMs(timeout: number): this;
        RepeatTimeoutInMs(): number;
        repeatOccurrenceCount(): number;
        lastRepeatRecognitionTime(): number;
        /**
         * [Chainable Property] Whether the end of the Gesture should trigger a gesture-recognition check.
         * This enables looking for another gesture that may still be applicable, ie. with the one-or-more pointers that may
         * still be down (for example, to allow a 2-finger zoom to become a 1-finger pan when the first zoom finger is lifted).
         * @param {boolean} check Flag
         * @returns {this | boolean} Either the property value (if getting), or the Gesture instance (if setting).
         */
        CheckForGesturesOnEnd(check: boolean): this;
        CheckForGesturesOnEnd(): boolean;
        /**
         * [Chainable Property] Whether the Gesture will allow (the default) or prevent event propagation for Target.
         * Note: This applies regardless of whether the Gesture is recognized.
         * @param {boolean} allow Flag
         * @returns {this | boolean} Either the property value (if getting), or the Gesture instance (if setting).
         */
        AllowEventPropagation(allow: boolean): this;
        AllowEventPropagation(): boolean;
        /**
         * Remove/re-add the Gesture.Target to change its z-order to "top most" [z-order = order added to SVG].
         * @returns {D3SingleSelection} A d3 selection of Gesture.Target().
         */
        BringTargetToFront(): D3SingleSelection;
        /** Capture all pointers used by this Gesture to the Gesture's target. */
        SetPointerCapture(): void;
        /** Releases capture of all pointers used by the Gesture from the Gesture's target. */
        ReleasePointerCapture(): void;
        /**
         * Returns the name of the pointer (eg. "touch:2", meaning the second touch) at the specified ordinal (eg. "{P3}", meaning the third pointer in the Gesture).
         * Returns null if pointerOrdinal is not an ordinal specifier.
         * Note: If the Gesture.PointerType() includes an 'or' operator ('|') then the value of a given ordinal can change depending on which permutation of pointers invoked the Gesture.
         * @param {string} pointerOrdinal A pointer ordinal of the form "{Pn}", where n is 1..9.
         * @returns {string | null} Result.
         */
        GetPointerNameByOrdinal(pointerOrdinal: string): string | null;
        /**
         * Returns the pointer ID (eg. "PointerID_pen_123") for the specified pointer type, which can be in any of these forms: "touch:2" [meaning the second touch pointer that made contact],
         * "touch" [which is the same as "touch:1"], or "{P1}" [meaning pointer ordinal #1 in Gesture.PointerType()]. Throws if the Gesture does not have a pointer of the specified type.
         * @param {string} pointerType A pointer type.
         * @returns {string} A pointer ID.
         */
        GetPointerID(pointerType: string): string;
        /**
         * Returns the distance (in pixels) between 2 pointers in the [active] Gesture.
         * @param {string} pointerType1 The first pointer type (eg. "{P1}").
         * @param {string} pointerType2 The second pointer type (eg. "{P2}").
         * @returns {number} Result.
         */
        GetDistance(pointerType1: string, pointerType2: string): number;
        /**
         * Given a pointerType (eg. "{P1}", "touch:2") returns the point (in screen coordinates) where that pointer started (PointerDown).
         * @param {string} pointerType A pointer type.
         * @returns {Point} Result.
         */
        GetStartScreenPoint(pointerType: string): Point;
        /**
         * Given a pointerType (eg. "{P1}", "touch:2") returns the point (in svg space) where that pointer started (PointerDown).
         * @param {string} pointerType A pointer type.
         * @returns {Point} Result.
         */
        GetStartSvgPoint(pointerType: string): Point;
        /**
         * Given a pointerType (eg. "{P1}", "touch:2") returns the point (in screen coordinates) where that pointer started (PointerDown).
         * @param {string} pointerType A pointer type.
         * @returns {Point} Result.
         */
        GetCurrentScreenPoint(pointerType: string): Point;
        /**
         * Returns the current position (in svg coordinates) of the specified pointer type (eg. "{P1}", "touch:2").
         * @param {string} pointerType A pointer type.
         * @returns {Point} Result.
         */
        GetCurrentSvgPoint(pointerType: string): Point;
        /**
         * Returns the initial pointerDown event for the specified pointer type (eg. "{P1}", "touch:2").
         * @param {string} pointerType A pointer type.
         * @returns {PointerEvent} Result.
         */
        GetStartEvent(pointerType: string): PointerEvent;
        /**
         * Returns the latest pointerMove event for the specified pointer type (eg. "{P1}", "touch:2").
         * @param {string} pointerType A pointer type.
         * @returns {PointerEvent} Result.
         */
        GetCurrentEvent(pointerType: string): PointerEvent;
        /**
         * When pointerType is supplied, creates a new Ink instance for the Gesture. Otherwise, returns the latest Ink instance created by the Gesture.
         * @param {string} pointerType The pointer type (eg. "touch:2") that will emit the ink. This pointer type must identify a single pointer in the Gesture.
         * @returns {Ink} Either the newly created or the last created Ink instance.
         */
        Ink(pointerType: string): Ink;
        Ink(): Ink;
        /**
         * Combines the supplied Inks into a single Ink, which will have a new [convex] hull that covers the combined Ink paths.
         * Returns the new (combined) Ink instance, or null if inksToCombine is empty.
         * @param {Ink[]} inksToCombine The array of Inks to combine.
         * @param {string} className The name of the CSS class to apply to the combined ink.
         * @param {boolean} [makeInkPathMatchHull] [Optional] When true, the path of the new ink will match the new [convex] hull [eg. when combining 2 paths that are "grouping containers"]
         * @returns {Ink | null} The resulting [new] combined Ink.
         */
        CombineInks(inksToCombine: Ink[], className: string, makeInkPathMatchHull?: boolean): Ink | null;
        /**
         * Cancels (stops) the Gesture (if it's active).
         * @param {string} reason The reason why the gesture was cancelled.
         */
        Cancel(reason: string): void;
        /**
         * [Private Method] Returns true if a permutation of targetPointerType [other than itself] exists in pointerTypePermutations.
         * @param {string} targetPointerType A pointer type (eg. "pen+touch")
         * @param {string[]} pointerTypePermutations An array of pointer types (eg. ["touch+pen", "pen+touch"]).
         * @returns {boolean} Result.
         */
        private isExistingPointerTypePermutation;
        /**
         * [Private Method] Given a pointer type specifier (eg. "pen|touch+touch"), returns all possible [and logically unique] permutations (there will only be more than one permutation if pointerType includes the 'or' operator (|)).
         * Example (for illustration only): A pointerType of "pen|touch:2+mouse|touch" will return ["pen+mouse", "pen+touch", "touch:2+mouse", "touch:2+touch"].
         * @param {string} pointerType A pointer type specifier.
         * @returns {string[]} Result.
         */
        private permutePointerType;
    }
}
declare namespace MIL {
    /**
     * The BuiltInGestures namespace.
     * This namespace provides a quick way to create basic Gestures (trading granular control for simplicity).
     */
    namespace BuiltInGestures {
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
        function TapAndHold(gestureName: string, targetElement: TargetDomElement, pointerType: string, onTapAndHold: GestureEventHandler, holdTimeoutInMs?: number, maximumDistanceInPx?: number): Gesture;
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
        function Tap(gestureName: string, targetElement: TargetDomElement, pointerType: string, onTap: GestureEventHandler, completionTimeoutInMs?: number, maximumDistanceInPx?: number): Gesture;
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
        function ShapeRecognizer(gestureName: string, targetElement: TargetDomElement, pointerType: string, minPercentMatch: number, onShapeRecognized: ShapeRecognizedHandler, cometTailClassName?: string, shapeList?: RecognizableShape[], targetWidth?: number, targetHeight?: number): Gesture;
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
        function RadialSwipe(gestureName: string, targetElement: TargetDomElement, pointerType: string, numRadialSegments: number, minDistance: number, onSwipe: RadialSwipeHandler, getCometTailClassName?: () => string): Gesture;
        /**
         * Creates a circular-dial Gesture that detects changes in angle (eg. rotation) around the center of the specified targetElement.
         * @param {string} gestureName The name of the Gesture.
         * @param {TargetDomElement} targetElement The DOM element the Gesture will target.
         * @param {string} pointerType A pointer type.
         * @param {AngleChangedHandler} onAngleChanged A handler called each time the angle changes (ie. the pointer moves resulting in a different angle).
         * @returns {Gesture} Result.
         */
        function CircularDial(gestureName: string, targetElement: TargetDomElement, pointerType: string, onAngleChanged: AngleChangedHandler): Gesture;
    }
}
declare namespace MIL {
    /**
     * Type of a callback that will apply a CSS style (and specify its 'd') to the a RulerControl toolbar item (an SVG path). When the callback is invoked, 'this' will be set to the RulerControl instance.
     * Note: The path data ('d') can only contain M, L, Z, m, l, a or z commands.
     */
    type RulerToolbarItemStylerCallback = (itemPath: D3SingleSelection, itemIndex: number) => void;
    /** Type of a callback that will be called when the selected RulerControl toolbar item changes. When the callback is invoked, 'this' will be set to the RulerControl instance. */
    type RulerToolbarItemSelectionChangedHandler = (previousItemIndex: number) => void;
    /** Type of basic information about a selected RadialMenuControl item. */
    type RadialMenuItemDetails = {
        /** The name of the selected sector, as provided in usedSectorNames in CreateRadialMenu() / AddLevel(). My be null. */
        sectorName: string;
        /** The ID of the sector (0 to sectorCount - 1). The sectorCount is provided in CreateRadialMenu() or AddLevel(). */
        sectorID: number;
        /** The ID of the level that the item came from. */
        levelID: number;
    };
    /** Type of the result from a RadialMenuControl item selection. */
    type RadialMenuSelectedItem = RadialMenuItemDetails & {
        /** The sector ID of the prior selection. If an already selected item is re-selected, this value will be the same as sectorID. */
        previousSectorID: Number;
    };
    /** Type of the result from a RadialMenuControl item image hover start/stop. */
    type RadialMenuHoverItem = RadialMenuItemDetails & {
        /** True if the hover has started, false if the hover has stopped. */
        hoverStarted: boolean;
        /** The current imageURL of the item. */
        imageURL: string;
    };
    /** Type of a callback that will be invoked when a selection is made on a RadialMenuControl. */
    type RadialMenuItemSelectedHandler = (selectedItem: RadialMenuSelectedItem) => void;
    /** Type of a callback that will be invoked when a hover starts or stops over an item image in a RadialMenuControl. */
    type RadialMenuItemImageHoverHandler = (hoverItem: RadialMenuHoverItem) => void;
    /**
     * The Controls namespace.
     */
    namespace Controls {
        /**
         * Returns true if 'targetElement' is a MIL control, or has a parent which is a MIL control.
         * @param {TargetDomElement} targetElement The element to check.
         * @returns {boolean} Result.
         */
        function IsControl(targetElement: TargetDomElement): boolean;
        /**
         * Returns the RulerControl for the specified <svg> element, creating it if needed.
         * @param {SVGSVGElement} svg An <svg> element.
         * @returns {RulerControl} Result.
         */
        function Ruler(svg: SVGSVGElement): RulerControl;
        /**
         * Returns the FrameControl for the specified <svg> element, creating it if needed.
         * Note: As a side-effect of creation, the 'overflow' CSS attribute of the svg will be set to 'hidden'.
         * @param {SVGSVGElement} svg An <svg> element.
         * @returns {FrameControl} Result.
         */
        function Frame(svg: SVGSVGElement): FrameControl;
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
        function CreateRadialMenu(svg: SVGSVGElement, menuName: string, centerImageURL: string, sectorCount: number, usedSectors: number[], usedSectorImageURLs: string[], usedSectorNames?: string[], usedSectorTooltipCaptions?: string[], tooltipHoverTimeoutInMs?: number): RadialMenuControl;
        /**
         * Deletes a RadialMenuControl created with CreateRadialMenu(). Returns true if the control was deleted, otherwise returns false.
         * @param {RadialMenuControl} radialMenu The radial-menu control to delete.
         * @returns {boolean} Result.
         */
        function DeleteRadialMenu(radialMenu: RadialMenuControl): boolean;
        /**
         * The FrameControl class. Represents an SVG <rect> that visually indicates the edge of the zoomable/pannable area of a root <g> element.
         * Note: DO NOT instantiate this class directly: use the MIL.Controls.Frame() method instead.
         */
        class FrameControl {
            private _rect;
            private _gDomElement;
            private _className;
            /**
             * [Chainable Property] The name of the CSS class used to draw the Frame.
             * At a minimum, the class should specify the stroke, strokeWidth and fill attributes.
             * @param {string} className A CSS class name.
             * @returns {this | string} Either the property value (if getting), or the Frame instance (if setting).
             */
            Class(className: string): this;
            Class(): string;
            /** [Private Method] Redraws the FrameControl instance. */
            private redraw;
        }
        /**
         * The RadialMenuControl class. Represents a radial menu control that's associated with a root <g> element.
         * Note: DO NOT instantiate this class directly: use the MIL.Controls.CreateRadialMenu() method instead.
         */
        class RadialMenuControl {
            private static readonly CONTROL_TYPE;
            private static instanceID;
            private static readonly ID_PREFIX;
            private static readonly MIN_RADIUS;
            private _svgInfo;
            private _gDomElement;
            private _gRadialMenu;
            private _instanceID;
            private _partNamePrefix;
            private _isVisible;
            private _isCollapsed;
            private _allowRedraw;
            private _centerPoint;
            private _outerRadius;
            private _innerRadius;
            private _outerCircle;
            private _innerCircle;
            private _innerBackgroundCircle;
            private _innerImage;
            private _selectedItemImage;
            private _itemTooltipText;
            private _itemTooltipRect;
            private _sectorImages;
            private _sectorLines;
            private _keepConstantScale;
            private _isDeleted;
            private _sectorCount;
            private _usedSectors;
            private _usedSectorImageURLs;
            private _usedSectorNames;
            private _usedSectorTooltipCaptions;
            private _unusedSectorImageURL;
            private _itemImageSize;
            private _showSectorLines;
            private _cometTailClassName;
            private _stroke;
            private _outerCircleFill;
            private _innerCircleFill;
            private _onItemSelected;
            private _onItemImageHover;
            private _tooltipHoverTimeoutInMs;
            private _centerImageURL;
            private _isAutoHideEnabled;
            private _isAutoCollapseEnabled;
            private _selectedItemSectorID;
            private _selectedItemIndicatorColor;
            private _autoCollapseAfterHoverExpandTimeoutInMs;
            private _autoCollapseAfterHoverExpandTimerID;
            private _defaultGesturesAdded;
            private _prevMovePoint;
            /** Ensures that the RadialMenuControl is the top-most element in the parent <g> element it was created in. */
            BringToFront(): void;
            /**
             * Call before setting multiple RadialMenuControl properties to prevent redrawing after each property setter.
             * @returns {RadialMenuControl} The RadialMenuControl instance.
             */
            BeginUpdate(): this;
            /**
             * Call after BeginUpdate() when all desired RadialMenuControl properties have been set.
             * @returns {RadialMenuControl} The RadialMenuControl instance.
             */
            EndUpdate(): this;
            /** Redraws the RadialMenuControl instance. */
            Redraw(): void;
            /** [Private Method] Redraws the RadialMenuControl instance, but only if a redraw is needed. */
            private redraw;
            /** [Private Method] Adds the default Gestures (Move, Tap, Swipe, Hover, etc.) to the RadialMenuControl instance. */
            private addDefaultGestures;
            /** Removes the default Gestures from the RadialMenuControl instance. This allows the control to be completely "re-skinned" with new gestures. */
            RemoveDefaultGestures(): void;
            /**
             * Animates the radial-menu to full opacity (if it's not currently visible).
             * @param {number} [durationInMs] [Optional] How long the animation should take (in milliseceonds).
             */
            Show(durationInMs?: number): void;
            /**
             * Animates the radial-menu to transparent (if it's currently visible).
             * @param {number} [durationInMs] [Optional] How long the animation should take (in milliseceonds).
             * @param {function(): void} [onHideComplete] [Optional] An action to perform after Hide completes.
             */
            Hide(durationInMs?: number, onHideComplete?: () => void): void;
            /**
             * Clears the current selected item indicator (if any), optionally using a fade effect.
             * Note: This method will NOT invoke the ItemSelectedHandler().
             * @param {number} fadeTimeoutInMs A timeout (in milliseconds). Omit (or specify -1) for no fade effect.
             * @returns {RadialMenuControl} The RadialMenuControl instance.
             */
            ClearSelectedItemIndicator(fadeTimeoutInMs?: number): this;
            /**
             * Sets the current selected item indicator. To clear the indicator, use ClearSelectedItemIndicator().
             * Note: This method will NOT invoke the ItemSelectedHandler().
             * @param {number} sectorID The ID of the sector to update.
             * @returns {RadialMenuControl} The RadialMenuControl instance.
             */
            SetSelectedItemIndicator(sectorID: number): this;
            /**
             * Updates the image/name/tooltip of the specified sector (item) in the specified menu level.
             * @param {number} sectorID The ID of the sector to update.
             * @param {string} [imageURL] [Optional] The updated item image URL. Use undefined to retain the existing value.
             * @param {string} [name] [Optional] The updated item name (can be null). Use undefined to retain the existing value.
             * @param {string} [tooltipCaption] [Optional] The updated item tooltip caption (can be null). Use undefined to retain the existing value.
             * @returns {RadialMenuControl} The RadialMenuControl instance.
             */
            UpdateItem(sectorID: number, imageURL?: string, name?: string, tooltipCaption?: string): this;
            /**
             * [ReadOnly Property] The <svg> that the RadialMenuControl belongs to.
             * @returns {SVGSVGElement} Result.
             */
            Parent(): SVGSVGElement;
            /**
             * [ReadOnly Property] Returns the sector ID (0 to sectorCount - 1) of the currently selected item, or -1 if no item is currently selected.
             * @returns {number} Result.
             */
            SelectedItemSectorID(): number;
            /**
             * [Chainable Property] The color used to draw the selected item idicator.
             * @param {string} color A CSS color.
             * @returns {this | string} Either the property value (if getting), or the RadialMenuControl instance (if setting).
             */
            SelectedItemIndicatorColor(color: string): this;
            SelectedItemIndicatorColor(): string;
            /**
             * [ReadOnly Property] Returns the timeout (in milliseconds) before the tooltip is shown (if available) for a hovered-over item image. Set via CreateRadialMenu().
             * @returns {number} Result.
             */
            TooltipHoverTimeoutInMs(): number;
            /**
             * [ReadOnly Property] Returns the preferred "native" (ie. to avoid scaling) height/width of the item (sector) image. Will vary with the value of Radius().
             * @returns {number} Result.
             */
            ItemImageSize(): number;
            /**
             * [Chainable Property] The URL of a image to show at the center of the RadialMenuControl.
             * @param {string} imageURL The URL of the image. Specify null for no image.
             * @returns {this | string} Either the property value (if getting), or the RadialMenuControl instance (if setting).
             */
            CenterImageURL(imageURL: string): this;
            CenterImageURL(): string;
            /**
             * [Chainable Property] The URL of a default image to show in a sector if not provided in the 'usedSectorImageURLs' parameter of the constructor.
             * @param {string} imageURL The URL of the image. Specify null for no image.
             * @returns {this | string} Either the property value (if getting), or the RadialMenuControl instance (if setting).
             */
            UnusedSectorImageURL(imageURL: string): this;
            UnusedSectorImageURL(): string;
            /**
             * [Chainable Property] Whether the RadialMenuControl will be rendered at constant scale (ie. to compensate for any zooming of the parent <g> element).
             * @param {boolean} enable Flag.
             * @returns {this | boolean} Either the property value (if getting), or the RadialMenuControl instance (if setting).
             */
            KeepConstantScale(enable: boolean): this;
            KeepConstantScale(): boolean;
            /**
             * [Chainable Property] Whether the RadialMenuControl is visible or not.
             * @param {boolean} visible Flag.
             * @returns {this | boolean} Either the property value (if getting), or the RadialMenuControl instance (if setting).
             */
            IsVisible(visible: boolean): this;
            IsVisible(): boolean;
            /**
             * [Chainable Property] Whether the RadialMenuControl will be rendered in a collapsed or expanded state.
             * @param {boolean} collapsed Flag.
             * @returns {this | boolean} Either the property value (if getting), or the RadialMenuControl instance (if setting).
             */
            IsCollapsed(collapsed: boolean): this;
            IsCollapsed(): boolean;
            /**
             * [Chainable Property] Whether the RadialMenuControl will automatically hide when an item is selected.
             * @param {boolean} enable Flag.
             * @returns {this | boolean} Either the property value (if getting), or the RadialMenuControl instance (if setting).
             */
            AutoHideOnSelect(enable: boolean): this;
            AutoHideOnSelect(): boolean;
            /**
             * [Chainable Property] Whether the RadialMenuControl will automatically collapse when an item is selected.
             * @param {boolean} enable Flag.
             * @returns {this | boolean} Either the property value (if getting), or the RadialMenuControl instance (if setting).
             */
            AutoCollapseOnSelect(enable: boolean): this;
            AutoCollapseOnSelect(): boolean;
            /**
             * [Chainable Property] The timeout (in milliseconds) after which the menu will automatically collapse after being expanded by hovering (over the center-circle of the menu).
             * Specify -1 for no timeout (the menu will stay expanded).
             * @param {number} timeout A timeout in milliseconds (between 500 and 8000).
             * @returns {this | number} Either the property value (if getting), or the RadialMenuControl instance (if setting).
             */
            AutoCollapseAfterHoverExpandTimeoutInMs(timeout: number): this;
            AutoCollapseAfterHoverExpandTimeoutInMs(): number;
            /**
             * [Chainable Property] The center of the RadialMenuControl (in SVG coordinates).
             * @param {Point} point The center point.
             * @returns {this | Point} Either the property value (if getting), or the RadialMenuControl instance (if setting).
             */
            CenterPoint(point: Point): this;
            CenterPoint(): Point;
            /**
             * [Chainable Property] The [outer] radius of the RadialMenuControl instance (in pixels). Must be at least RadialMenuControl.MIN_RADIUS.
             * @param {number} [radiusInPx] [Optional] Radius in pixels.
             * @returns {this | number} Either the property value (if getting), or the RadialMenuControl instance (if setting).
             */
            Radius(radiusInPx: number): this;
            Radius(): number;
            /**
             * [Chainable Property] Whether the RadialMenuControl will be rendered with sector lines drawn.
             * @param {boolean} enable Flag.
             * @returns {this | boolean} Either the property value (if getting), or the RadialMenuControl instance (if setting).
             */
            ShowSectorLines(showLines: boolean): this;
            ShowSectorLines(): boolean;
            /**
             * [Chainable Property] The CSS class used to draw the "comet tail" for the radial gesture.
             * @param {string} className A CSS class name.
             * @returns {this | string} Either the property value (if getting), or the RadialMenuControl instance (if setting).
             */
            CometTailClass(className: string): this;
            CometTailClass(): string;
            /**
             * [Chainable Property] The handler that will be invoked when an item is selected.
             * @param {RadialMenuItemSelectedHandler} handler The RadialMenuItemSelected handler. When the handler is invoked, 'this' will be set to the RadialMenuControl instance.
             * @returns {this | RadialMenuItemSelectedHandler} Either the property value (if getting), or the RadialMenuControl instance (if setting).
             */
            ItemSelectedHandler(handler: RadialMenuItemSelectedHandler): this;
            ItemSelectedHandler(): RadialMenuItemSelectedHandler;
            /**
             * [Chainable Property] The handler that will be invoked when a hover either starts or stop on an item image.
             * @param {RadialMenuItemImageHoverHandler} handler The RadialMenuItemImageHover handler. When the handler is invoked, 'this' will be set to the RadialMenuControl instance.
             * @returns {this | RadialMenuItemImageHoverHandler} Either the property value (if getting), or the RadialMenuControl instance (if setting).
             */
            ItemImageHoverHandler(handler: RadialMenuItemImageHoverHandler): this;
            ItemImageHoverHandler(): RadialMenuItemImageHoverHandler;
            /**
             * [Chainable Property] The color to use to draw the lines of the RadialMenuControl.
             * @param {string} color A CSS color.
             * @returns {this | string} Either the property value (if getting), or the RadialMenuControl instance (if setting).
             */
            LineColor(color: string): this;
            LineColor(): string;
            /**
             * [Chainable Property] The color to use to fill the outer-circle of the RadialMenuControl.
             * @param {string} color A CSS color.
             * @returns {this | string} Either the property value (if getting), or the RadialMenuControl instance (if setting).
             */
            OuterCircleFill(color: string): this;
            OuterCircleFill(): string;
            /**
             * [Chainable Property] The color to use to fill the inner-circle of the RadialMenuControl.
             * @param {string} color A CSS color.
             * @returns {this | string} Either the property value (if getting), or the RadialMenuControl instance (if setting).
             */
            InnerCircleFill(color: string): this;
            InnerCircleFill(): string;
        }
        /**
         * The RulerControl class. Represents a virtual ruler control that's associated with a root <g> element.
         * Note: DO NOT instantiate this class directly: use the MIL.Controls.Ruler() method instead.
         */
        class RulerControl {
            private static readonly CONTROL_TYPE;
            private static readonly ID_PREFIX;
            private static readonly RULER_MIN_HEIGHT;
            private static readonly RULER_MIN_WIDTH;
            private TOOLBAR_ITEM_WIDTH;
            private static readonly TOOLBAR_ITEM_MARGIN;
            private static readonly RULER_ENDS_TARGET_REGION_WIDTH_RATIO;
            private _gRuler;
            private _outlinePath;
            private _toolbarPath;
            private _selectionIndicatorPath;
            private _centerCirclePath;
            private _zoomLevelText;
            private _gDomElement;
            private _allowRedraw;
            private _width;
            private _height;
            private _bigTickCount;
            private _littleTickCount;
            private _className;
            private _strokeWidth;
            private _centerPoint;
            private _rotationAngle;
            private _keepConstantScale;
            private _isResizable;
            private _toolbarItemCount;
            private _toolbarItemSelectedColor;
            private _toolbarItemStyler;
            private _selectedToolbarItemNumber;
            private _onToolbarSelectionChanged;
            private _isVisible;
            private _faceEdgeStartPoint;
            private _faceEdgeEndPoint;
            private _centerLineStartPoint;
            private _centerLineEndPoint;
            private _toolbarWidth;
            private _defaultMoveGesture;
            private _defaultRotateAndMoveGesture;
            private _defaultTapGesture;
            private _defaultToolbarTapGesture;
            private _prevMovePoint;
            private _oneTouchRotationInProgress;
            private _rulerResizeInProgress;
            private _rulerResizeStartDistance;
            private _rulerResizeStartWidth;
            private _rotateStartPointPointerType;
            private _rotateEndPointPointerType;
            /**
             * Call before setting multiple RulerControl properties to prevent redrawing after each property setter.
             * @returns {RulerControl} The RulerControl instance.
             */
            BeginUpdate(): this;
            /**
             * Call after BeginUpdate() when all desired RulerControl properties have been set.
             * @returns {RulerControl} The RulerControl instance.
             */
            EndUpdate(): this;
            /** Redraws the RulerControl instance. */
            Redraw(): void;
            /** [Private Method] Redraws the RulerControl instance, but only if a redraw is needed. */
            private redraw;
            /**
             * [Private Method] Applies the RulerControl.Class() [if any] to the specified RulerControl component (typically a Path), scaling ths stroke according to the specified scaleFactor.
             * @param {D3SingleSelection} rulerElement Ruler component.
             * @param {number} scaleFactor The factor to scale the stroke-width by.
             * @param {string} [fill] [Optional] The fill color to apply.
             */
            private applyStyle;
            /**
             * [Chainable Property] The width of the RulerControl instance (in pixels). Must be at least RulerControl.RULER_MIN_WIDTH.
             * @param {number} [widthInPx] [Optional] Width in pixels.
             * @returns {this | number} Either the property value (if getting), or the RulerControl instance (if setting).
             */
            Width(widthInPx: number): this;
            Width(): number;
            /**
             * [Chainable Property] The height of the RulerControl instance (in pixels), but must be at least RulerControl.RULER_MIN_HEIGHT. Defaults to 100 if not set.
             * @param {number} [heightInPx] [Optional] Height in pixels.
             * @returns {this | number} Either the property value (if getting), or the RulerControl instance (if setting).
             */
            Height(heightInPx: number): this;
            Height(): number;
            /**
             * [Chainable Property] The number of large-interval ticks to draw on the face of the RulerControl.
             * @param {number} bigTickCount
             * @returns {this | number} Either the property value (if getting), or the RulerControl instance (if setting).
             */
            BigTickCount(bigTickCount: number): this;
            BigTickCount(): number;
            /**
             * [Chainable Property] The number of small ticks to draw (between large-interval ticks) on the face of the RulerControl.
             * @param {number} littleTickCount
             * @returns {this | number} Either the property value (if getting), or the RulerControl instance (if setting).
             */
            LittleTickCount(littleTickCount: number): this;
            LittleTickCount(): number;
            /**
             * [Chainable Property] The CSS class to use to draw the RulerControl.
             * @param {string} className A CSS class name.
             * @returns {this | string} Either the property value (if getting), or the RulerControl instance (if setting).
             */
            Class(className: string): this;
            Class(): string;
            /**
             * [Chainable Property] The stroke-width to use to draw the RulerControl. If provided, overrides the stroke-width [if any] set by RulerControl.Class().
             * @param {string} className A CSS class name.
             * @returns {this | string} Either the property value (if getting), or the RulerControl instance (if setting).
             */
            StrokeWidth(strokeWidth: string): this;
            StrokeWidth(): number;
            /**
             * [Chainable Property] The center of the RulerControl (in SVG coordinates).
             * @param {Point} point The center point.
             * @returns {this | Point} Either the property value (if getting), or the RulerControl instance (if setting).
             */
            CenterPoint(point: Point): this;
            CenterPoint(): Point;
            /**
             * [Chainable Property] The angle of rotation of the RulerControl.
             * @param {number} angle An angle (>= 0, < 360). 90 = horizontal (the default).
             * @returns {this | number} Either the property value (if getting), or the RulerControl instance (if setting).
             */
            RotationAngle(angle: number): this;
            RotationAngle(): number;
            /**
             * [Chainable Property] Whether the RulerControl will be rendered at constant scale (ie. to compensate for any zooming of the parent <g> element).
             * @param {boolean} enable Flag.
             * @returns {this | boolean} Either the property value (if getting), or the RulerControl instance (if setting).
             */
            KeepConstantScale(enable: boolean): this;
            KeepConstantScale(): boolean;
            /**
             * [Chainable Property] Whether the RulerControl can be resized.
             * @param {boolean} enable Flag.
             * @returns {this | boolean} Either the property value (if getting), or the RulerControl instance (if setting).
             */
            IsResizable(enable: boolean): this;
            IsResizable(): boolean;
            /**
             * [Chainable Property] The number of items in the toolbar.
             * @param {number} count A number in the range 0..n, where n is limited by RulerControl.RULER_MIN_WIDTH (if RulerControl.IsResizable() is true) and RulerControl.Width() if not.
             * @returns {this | number} Either the property value (if getting), or the RulerControl instance (if setting).
             */
            ToolbarItemCount(count: number): this;
            ToolbarItemCount(): number;
            /**
             * [Chainable Property] The index (0..n) of the currently selected toolbar item, or -1 if no toolbar item is currently selected.
             * If the toolbar item with the specified itemNumber (0..n) is already selected it will be de-selected.
             * @param {number} itemNumber A 0..n index.
             * @returns {this | number} Either the property value (if getting), or the RulerControl instance (if setting).
             */
            SelectedToolbarItemNumber(itemNumber: number): this;
            SelectedToolbarItemNumber(): number;
            /**
             * [Chainable Property] The callback that will be invoked when the selected toolbar item changes.
             * @param {RulerToolbarItemSelectionChangedHandler} handler A RulerToolbarItemSelectionChangedHandler.
             * @returns {this | RulerToolbarItemSelectionChangedHandler} Either the property value (if getting), or the RulerControl instance (if setting).
             */
            OnToolbarSelectionChanged(handler: RulerToolbarItemSelectionChangedHandler): this;
            OnToolbarSelectionChanged(): RulerToolbarItemSelectionChangedHandler;
            /**
             * [Chainable Property] The fill color to draw a selected toolbar item with.
             * @param {string} [color] [Optional] A CSS color.
             * @returns {this | string} Either the property value (if getting), or the RulerControl instance (if setting).
             */
            ToolbarItemSelectedColor(color: string): this;
            ToolbarItemSelectedColor(): string;
            /**
             * [Chainable Property] The callback that will be invoked when drawing the toolbar items.
             * @param {RulerToolbarItemStylerCallback} callback A RulerToolbarItemStylerCallback.
             * @returns {this | RulerToolbarItemStylerCallback} Either the property value (if getting), or the RulerControl instance (if setting).
             */
            ToolbarItemStyler(callback: RulerToolbarItemStylerCallback): this;
            ToolbarItemStyler(): RulerToolbarItemStylerCallback;
            /**
             * [Chainable Property] Whether the RulerControl is visible or not.
             * @param {boolean} visible Flag.
             * @returns {this | boolean} Either the property value (if getting), or the RulerControl instance (if setting).
             */
            IsVisible(visible: boolean): this;
            IsVisible(): boolean;
            /**
             * Returns true if the RulerControl is is view by at least targetPercentVisible.
             * @param {number} [targetPercentVisible] [Optional] A percentage (> 0.00, <= 1.00) that specifies how much of the RulerControl has to be visible for it to be considered "in view".
             * @returns {boolean} Result.
             */
            IsInView(targetPercentVisible?: number): boolean;
            /**
             * Centers the RulerControl in the center of the parent <svg> element.
             * @returns {RulerControl} The RulerControl instance.
             */
            CenterInView(): RulerControl;
            /** Ensures that the RulerControl is the top-most element in the parent <g> element it was created in. */
            BringToFront(): void;
            /**
             * [Private Method] Returns a line (in svg space) of the supplied start and end points.
             * @param {XY} startPoint The start point of the line.
             * @param {XY} endPoint The end pointof the line.
             * @returns {SVGLine} Result.
             */
            private getSvgLine;
            /**
             * Returns the line (in SVG space) of the face-edge of the RulerControl instance.
             * @returns {SVGLine} Result.
             */
            GetFaceEdgeLine(): SVGLine;
            /**
             * Returns the line (in SVG space) of the center of the RulerControl instance.
             * @returns {SVGLine} Result.
             */
            GetCenterLine(): SVGLine;
            /** [Private Method] Adds the default Gestures (Move, RotateAndMove, Tap, ToolbarTap) to the RulerControl instance. */
            private addDefaultGestures;
            /** Removes the default Gestures from the RulerControl instance. This allows the control to be completely "re-skinned" with new gestures. */
            RemoveDefaultGestures(): void;
            /**
             * [Private Method] Handler for the 'Move' event of _defaultMoveGesture.
             * @param {PointerEvent} e A pointerMove event.
             * @param {number} initialXOffsetToCenterLine The x-axis distance between the initial touch-point and the closest point to that touch-point on the RulerControl's centerline.
             * @param {number} initialYOffsetToCenterLine The y-axis distance between the initial touch-point and the closest point to that touch-point on the RulerControl's centerline.
             */
            private onRulerMove;
            /**
             * [Private Method] Handler for the 'Move' event of _defaultRotateAndMoveGesture.
             * @param {PointerEvent} e A pointerMove event.
             * @param {number} startPointXOffsetToCenterLine The x-axis distance between the initial "start" (first) touch-point and the closest point to that touch-point on the RulerControl's centerline.
             * @param {number} startPointYOffsetToCenterLine The y-axis distance between the initial "start" (first) touch-point and the closest point to that touch-point on the RulerControl's centerline.
             * @param {number} endPointXOffsetToCenterLine The x-axis distance between the initial "end" (second) touch-point and the closest point to that touch-point on the RulerControl's centerline.
             * @param {number} endPointYOffsetToCenterLine The y-axis distance between the initial "end" (second) touch-point and the closest point to that touch-point on the RulerControl's centerline.
             * @param {number} centerPointRatio The ratio describing how the startPoint/endPoint straddle the center-point of the RulerControl.
             */
            private onRulerRotateAndMove;
        }
    }
}
