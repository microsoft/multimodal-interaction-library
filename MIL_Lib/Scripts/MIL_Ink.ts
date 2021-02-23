namespace MIL
{
    // Type aliases
    /** Type of an event handler (callback) invoked when an Ink instance is being dragged. */
    export type InkDragMoveEventHandler = (deltaX: number, deltaY: number) => void;

    /** Type of an Ink event handler (callback). When the handler is invoked, 'this' will be set to the Ink instance. */
    export type InkEventHandler = () => void;

    let _nextInkID: number = 1; // Used to assign ID's to Ink objects
    
    /** 
     * [Internal] While being drawn, an Ink consists of a series of [slightly] overlapping paths; the path that is actively being drawn is the 'current' path. 
     * @internal
     */
    export let _inkCurrentPathPointData: { [pointerID: string]: Point[] } = {}; // Key: PointerID, Value: Array of points in current path

    let _inkCurrentPath: { [pointerID: string]: D3SingleSelection } = {}; // Key: PointerID, Value: Current path element
    
    /** 
     * [Internal] All the points in the Ink (in all paths) as it is being drawn. 
     * @internal
     */
    export let _inkCompletePathPointData: { [pointerID: string]: Point[] } = {}; // Key: PointerID, Value: Cumulative array of unique points in all paths

    let _inkLineGenerator: d3.Line<Point> = null; // d3 line generator

    /** The Ink class. */
    export class Ink
    {
        private _inkID: string;
        private _pointerID: string;
        private _isStarted: boolean; // True once the Ink has been started
        private _parentGesture: Gesture;
        private _className: string;
        private _strokeColor: string; // If set, overrides the stroke from _className (if any)
        private _strokeWidth: string; // If set, overrides the strokeWidth from _className (if any)
        private _eraserClassName: string;
        private _hullType: InkHullType;
        private _hullColor: string;
        private _isNonDrawing: boolean | null; // We use null to mean 'not yet set'
        private _cometTailClassName: string; // Only applies when _isNonDrawing is true
        private _cometTailDurationInMs: number; // // Only applies when _isNonDrawing is true
        private _isAutoCose: boolean; // If set, when the ink ends the draw path will be automatically closed (with 'Z')
        private _hullPath: D3SingleSelection;
        private _finalPath: D3SingleSelection; // The d3 selection of the final (consolidated) SVG path
        private _nonDrawingPathPoints: Point[]; // Only set when _isNonDrawing is true
        private _combinedOutlinePathPoints: Point[]; // Only set when the Ink is created by Gesture.CombineInks()
        private _isEraserDrawing: boolean; // If set, the ink was drawn using the [pen] eraser
        private _isCoercingInkToRuler: boolean;
        private _resizeGesturePointerType: string; // Must specify 2 pointers (eg. "touch:2") 
        private _resizeGesture: Gesture;
        private _onResizeCompleteHandler: InkEventHandler; // A [optional] callback (which takes no parameters) that's invoked when _resizeGesture completes
        private _scale: number; // The "zoom level" of the ink/hull (changed via _resizeGesture)
        private _onDragMoveHandler: InkDragMoveEventHandler; // A [optional] callback (which takes parameters: deltaX, deltaY) that's invoked when the Ink is being dragged
        private _previousDragMovePoint: Point; // Tracks position while dragging
        private _groupDragSelectionClassName: string; // When set, all ink paths that have this class will be dragged together
        private _dragGesture: Gesture; // The gesture (if any) currently being used to drag the ink

        constructor(pointerID: string)
        {
            this._inkID = "Ink" + _nextInkID++;
            this._pointerID = pointerID;
            this._isStarted = false;
            this._parentGesture = null;
            this._className = "";
            this._strokeColor = "";
            this._strokeWidth = "";
            this._eraserClassName = "";
            this._hullType = InkHullType.None;
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
        InkID(): string
        {
            readOnlyProperty("InkID", arguments);
            return (this._inkID);
        }

        /** 
         * [ReadOnly Property] The unique MIL PointerID that is currently being used to draw the Ink instance (will be null after the Ink is drawn).
         * @returns {string} Property value. 
         */
        PointerID(): string
        {
            readOnlyProperty("PointerID", arguments);
            return (this._pointerID);
        }

        /**
         * [Chainable Property] The Gesture that created the Ink instance (a Gesture can be the parent of many Inks).
         * @param {Gesture} gesture A Gesture instance.
         * @returns {this | Gesture} Either the property value (if getting), or the Ink instance (if setting).
         */
        ParentGesture(gesture: Gesture): this;
        ParentGesture(): Gesture;
        ParentGesture(gesture?: Gesture): this | Gesture
        {
            return (getOrSetProperty(this, nameof(() => this._parentGesture), gesture));
        }

        /**
         * [Chainable Property] The CSS class to use to draw the Ink instance. Set before calling Start().
         * @param {string} className A CSS class name.
         * @returns {this | string} Either the property value (if getting), or the Ink instance (if setting).
         */
        Class(className: string): this;
        Class(): string;
        Class(className?: string): this | string
        {
            return (getOrSetProperty(this, nameof(() => this._className), className));
        }

        /**
         * [Chainable Property] The color to use to draw the Ink instance. Set before calling Start().
         * Note: The Class() property takes precedence over this property.
         * @param {string} color A CSS color.
         * @returns {this | string} Either the property value (if getting), or the Ink instance (if setting).
         */
        StrokeColor(color: string): this;
        StrokeColor(): string;
        StrokeColor(color?: string): this | string
        {
            return (getOrSetProperty(this, nameof(() => this._strokeColor), color));
        }

        /**
         * [Chainable Property] The thickness to use to draw the Ink instance. Set before calling Start().
         * Note: The Class() property takes precedence over this property.
         * @param {string} width A CSS width.
         * @returns {this | string} Either the property value (if getting), or the Ink instance (if setting).
         */
        StrokeWidth(width: string): this;
        StrokeWidth(): string;
        StrokeWidth(width?: string): this | string
        {
            return (getOrSetProperty(this, nameof(() => this._strokeWidth), width));
        }

        /**
         * [Chainable Property] The CSS class to use to draw the Ink instance when IsEraserDrawing() is true. Set before calling Start().
         * @param {string} className A CSS class name.
         * @returns {this | string} Either the property value (if getting), or the Ink instance (if setting).
         */
        EraserClass(className: string): this;
        EraserClass(): string;
        EraserClass(className?: string): this | string
        {
            return (getOrSetProperty(this, nameof(() => this._eraserClassName), className));
        }

        /**
         * [Chainable Property] The CSS class to use to draw the Ink instance when IsNonDrawing() is true. Set before calling Start().
         * @param {string} className A CSS class name.
         * @returns {this | string} Either the property value (if getting), or the Ink instance (if setting).
         */
        CometTailClass(className: string): this;
        CometTailClass(): string;
        CometTailClass(className?: string): this | string
        {
            return (getOrSetProperty(this, nameof(() => this._cometTailClassName), className));
        }

        /**
         * [Chainable Property] The fade out duration for the comet tail (when CometTailClass is used). Set before calling Start().
         * @param {number} durationInMs Duration in milliseconds. The default is 500ms.
         * @returns {this | string} Either the property value (if getting), or the Ink instance (if setting).
         */
        CometTailDurationInMs(durationInMs: number): this;
        CometTailDurationInMs(): number;
        CometTailDurationInMs(durationInMs?: number): this | number
        {
            return (getOrSetProperty(this, nameof(() => this._cometTailDurationInMs), durationInMs));
        }

        /**
         * [Chainable Property] The type of hull (interactive layer over the Ink) that will be created for the Ink instance. Set before calling Start(). 
         * Note: This property cannot be changed after the Ink has been created.
         * @param {InkHullType} hullType An InkHullType value.
         * @returns {this | InkHullType} Either the property value (if getting), or the Ink instance (if setting).
         */
        HullType(hullType: InkHullType): this;
        HullType(): InkHullType;
        HullType(hullType?: InkHullType): this | InkHullType
        {
            if (hullType === undefined)
            {
                return (this._hullType);
            }
            else
            {
                if (this._hullPath !== null)
                {
                    // TODO: This is just for simplicity, but technically it could be changed
                    // Note: The hullType can be changed (one-way) from Concave to Convex as a side-effect of using Gesture.CombineInks()
                    throw new MILException("Ink.HullType cannot be changed after the Ink has been created");
                }

                this._hullType = hullType;
                return (this);
            }
        }

        /**
         * [Chainable Property] The color to use to draw the hull for the Ink instance. Set before calling Start().
         * @param {string} color A CSS color, or "debug".
         * @returns {this | string} Either the property value (if getting), or the Ink instance (if setting).
         */
        HullColor(color: string): this;
        HullColor(): string;
        HullColor(color?: string): this | string
        {
            return (getOrSetProperty(this, nameof(() => this._hullColor), (color === "debug") ? "rgba(0,128,0,0.2)" : color));
        }

        /**
         * [Chainable Property] When set to true, the Ink instance will not add a <path> element, although the accumulated point data can still be accessed via PathPoints(). Set before calling Start().
         * Note: Setting this property to true and also setting the CometTailClass() property will produce a comet-tail effect as the [non-drawing] Ink is created.
         * @param {boolean} isNonDrawing Flag.
         * @returns {this | boolean} Either the property value (if getting), or the Ink instance (if setting).
         */
        IsNonDrawing(isNonDrawing: boolean): this;
        IsNonDrawing(): boolean;
        IsNonDrawing(isNonDrawing?: boolean): this | boolean
        {
            if (isNonDrawing === undefined)
            {
                return ((this._isNonDrawing === null) ? false : this._isNonDrawing);
            }
            else
            {
                if (this._isNonDrawing !== null)
                {
                    throw new MILException("Ink.IsNonDrawing cannot be changed once set");
                }

                if (isNonDrawing && (this._hullType !== InkHullType.None))
                {
                    throw new MILException("Ink.IsNonDrawing can only be set when Ink.HullType is 'None'");
                }

                this._isNonDrawing = isNonDrawing;
                return (this);
            }
        }

        /**
         * [Chainable Property] When set to true, the last point in the created path will automatically be joined to the first point when Ink creation ends. Set before calling Start().
         * @param {boolean} isAutoClose Flag.
         * @returns {this | boolean} Either the property value (if getting), or the Ink instance (if setting).
         */
        IsAutoClose(isAutoClose: boolean): this;
        IsAutoClose(): boolean;
        IsAutoClose(isAutoClose?: boolean): this | boolean
        {
            if (isAutoClose === undefined)
            {
                return (this._isAutoCose);
            }
            else
            {
                if (this.Path() !== null)
                {
                    throw new MILException("Ink.IsAutoClose cannot be changed after the Ink has been created");
                }
                this._isAutoCose = isAutoClose;
                return (this);
            }
        }

        /**
         * [Chainable Property] The pointer type specifier (eg. "touch:2") for the Gesture used to resize the Ink instance. Must specify exactly 2 pointers.
         * When setting, a Gesture to do the resize will be automatically created (replacing any previously created resize Gesture).
         * @param {string} pointerType A pointer type specifier that must specify exactly 2 pointers.
         * @returns {this | string} Either the property value (if getting), or the Ink instance (if setting).
         */
        ResizeWith(pointerType: string): this;
        ResizeWith(): string;
        ResizeWith(pointerType?: string): this | string
        {
            if (pointerType === undefined)
            {
                return (this._resizeGesturePointerType);
            }
            else
            {
                if (this._resizeGesture !== null)
                {
                    RemoveGestureByName(this._resizeGesture.Name());
                    this._resizeGesture = null;
                }

                if (pointerType && this._hullPath)
                {
                    var ink: Ink = this; // Note: Don't use 'let' here: it will result in the variable being renamed during compilation which means it won't surface correctly in the debugger
                    var startInkScale: number; // Note: Don't use 'let' here: it will result in the variable being renamed during compilation which means it won't surface correctly in the debugger
                    var startInkStrokeWidth: number = Utils.ToNumber(window.getComputedStyle(ink.Path().node()).strokeWidth); // Note: Don't use 'let' here: it will result in the variable being renamed during compilation which means it won't surface correctly in the debugger

                    this._resizeGesture = CreateGesture("InkResize*", true).PointerType(pointerType).Target(this._hullPath)
                        .RecognitionTimeoutInMs(50) // TODO: The caller should have control over this timeout
                        .GestureStartedHandler(function ()
                        {
                            let gesture: Gesture = this;

                            // To prevent the ink resize gesture from happening in parallel with an ink drag - which
                            // could potentially cause undesirable interactions - we terminate an in-progress drag
                            if (ink._dragGesture !== null)
                            {
                                ink._dragGesture.Cancel("The Ink is being resized");
                                ink.DragEnd();
                            }

                            startInkScale = ink.Scale();
                            let startResizeDistance: number = gesture.GetDistance("{P1}", "{P2}");
                            let prevResizeDistance: number = startResizeDistance;

                            this.OnMoveHandler(function ()
                            {
                                let resizeDistance: number = this.GetDistance("{P1}", "{P2}");

                                if (resizeDistance !== prevResizeDistance)
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

                            if (ink.OnResizeCompleteHandler() !== null)
                            {
                                ink.OnResizeCompleteHandler().call(ink);
                            }
                        });

                    if (this._resizeGesture.PointerCount() !== 2)
                    {
                        throw new MILException("The pointerType supplied to Ink.ResizeWith() must specify exactly 2 pointers (eg. 'touch:2' or 'pen+touch')");
                    }

                    AddGesture(this._resizeGesture);
                }

                this._resizeGesturePointerType = pointerType;
                return (this);
            }
        }

        /**
         * [Chainable Property] The callback to invoke when Ink resizing (if enabled) completes. See Ink.ResizeWith().
         * @param {InkEventHandler} handler The callback to invoke.
         * @returns {this | InkEventHandler} Either the property value (if getting), or the Ink instance (if setting).
         */
        OnResizeCompleteHandler(handler: InkEventHandler): this;
        OnResizeCompleteHandler(): InkEventHandler
        OnResizeCompleteHandler(handler?: InkEventHandler): this | InkEventHandler
        {
            return (getOrSetProperty(this, nameof(() => this._onResizeCompleteHandler), handler));
        }

        /**
         * [ReadOnly Property] Whether the Ink instance was drawn with the pen eraser tip.
         * Note: This is automatically set to true when the 'pointerType' of the Ink is 'pen', and the eraser-tip of the pen is used to draw with.
         * @returns {boolean} Property value.
         */
        IsEraserDrawing(): boolean
        {
            readOnlyProperty("IsEraserDrawing", arguments);
            return (this._isEraserDrawing);
        }

        /**
         * [ReadOnly Property] Whether the Ink instance is the result of combining one-or-more Inks.
         * @returns {boolean} Property value.
         */
        IsCombined(): boolean
        {
            readOnlyProperty("IsCombined", arguments);
            return (this._combinedOutlinePathPoints !== null);
        }

        /**
         * [ReadOnly Property] The hull path (as a d3 selection) of the Ink instance. Will be null if the Ink was created with HullType(InkHullType.None).
         * @returns {D3SingleSelection} Property value.
         */
        HullPath(): D3SingleSelection
        {
            readOnlyProperty("HullPath", arguments);
            return (this._hullPath);
        }

        /**
         * [ReadOnly Property] The path (as a d3 selection) of the Ink instance. Will be null if the Ink was created with IsNonDrawing(true).
         * @returns {D3SingleSelection} Property value.
         */
        Path(): D3SingleSelection
        {
            readOnlyProperty("Path", arguments);
            return (this._finalPath);
        }

        /**
         * [ReadOnly Property] The {x, y} points in the Ink instance.
         * @returns {Point[]} Property value.
         */
        PathPoints(): Point[]
        {
            readOnlyProperty("PathPoints", arguments);

            if (this._isNonDrawing)
            {
                return (this._nonDrawingPathPoints);
            }
            else
            {
                let path: SVGElementEx = this._finalPath.node();
                let pathPointsCollection: Point[][] = path.__MILPathPointsCollection__ as Point[][];
                let pathLineCount = pathPointsCollection.length;

                if (this._combinedOutlinePathPoints)
                {
                    // Return the points of the convex hull that covers the original set of ink paths that were combined (via Gesture.CombineInks()).
                    // While a loss in fidelity, this is arguably consistent with the nature of what it means to combine ink paths.
                    // The alternative would be to return __MILPathPointsCollection__, but the caller is expecting Ink.PathPoints() to return a single array
                    // of points, not an array of array of points.
                    // Note: It's valid for __MILPathPointsCollection__ to only have one entry, yet also have _combinedOutlinePathPoints set: this can
                    //       legitimately happen if a single ink path is "combined", eg. to change the hull-type of the ink from concave to convex. 
                    return (this._combinedOutlinePathPoints);
                }
                else
                {
                    if (pathLineCount !== 1)
                    {
                        throw new MILException("Internal state error: __MILPathPointsCollection__ was expected to contain 1 entry, but is has " + pathLineCount + " entries.");
                    }
                    return (pathPointsCollection[0]); // The {x, y} points of the final (consolidated) SVG path
                }
            }
        }

        /** Deletes the Ink's Hull. */
        DeleteHull(): void
        {
            if (this.HullPath())
            {
                RemoveGesturesByTarget(this.HullPath()); // Note: Gestures on Ink usually target the hull-path
                this.HullPath().remove();
                this._hullPath = null;
            }
        }

        /** Cancels the Ink instance (while it's in the process of being created). */
        Cancel(): void
        {
            if (this._finalPath !== null)
            {
                log("Warning: Ink cannot be cancelled after it has been created");
                return;
            }

            let pointerID: string = this._pointerID;
            let svgInfo: SVGInfo = getSvgInfo(this.ParentGesture().Target());

            // Remove the multiple [overlapping] constituent paths
            let constituentPaths: D3Selection = svgInfo.gSelection.selectAll("[data-pointerID=" + pointerID + "]");
            constituentPaths.remove();

            this._finalPath = null;
            this._pointerID = null;
            this._nonDrawingPathPoints = null;
            this._isStarted = false;

            this.deleteInksEntry();

            delete _inkCompletePathPointData[pointerID];
            delete _inkCurrentPathPointData[pointerID];
            delete _inkCurrentPath[pointerID];
        }

        /** Deletes the Ink instance. */
        Delete(): void
        {
            this.DeleteHull();

            RemoveGesturesByTarget(this.Path()); // Note: Gestures on Ink rarely target the ink-path (they typically target the hull-path)
            this.Path().remove();

            this.deleteInksEntry();

            log("Ink created by gesture '" + this.ParentGesture().Name() + "' was deleted (" + MIL._inks.length + " Inks remain)");
        }

        /** [Private Method] Removes the Ink instance from the list of all Inks (_inks). */
        private deleteInksEntry(): void
        {
            // TODO: Ink shouldn't really have any knowledge of _inks
            let index = MIL._inks.indexOf(this);

            if (index !== -1)
            {
                MIL._inks.splice(index, 1);
            }

            // ParentGesture.Ink() is the LATEST Ink created by the Gesture (Gesture:Ink is 1:m)
            if (this.ParentGesture().Ink() === this)
            {
                this.ParentGesture().ink(null);
            }
        }

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
        Scale(scale?: number, startScale?: number, startStrokeWidth?: number, excludeHull?: boolean): this | number
        {
            if ((scale === undefined) && (startScale === undefined) && (startStrokeWidth === undefined) && (excludeHull === undefined))
            {
                return (this._scale);
            }
            else
            {
                let oldScale: number = excludeHull ? this._scale : startScale;
                let newScale: number = scale;

                this.scaleInkPath(this.Path(), oldScale, newScale, startStrokeWidth, excludeHull);

                if (this.HullPath())
                {
                    // Hide the hull while we're scaling
                    this.HullPath().style("visibility", excludeHull ? "hidden" : "visible");

                    if (!excludeHull)
                    {
                        let scaleDelta = (scale - startScale) / startScale;
                        this.scaleHullPath(this.HullPath(), scaleDelta);
                    }
                }

                this._scale = scale;

                // log("DEBUG: Ink scaled to " + this._scale.toFixed(2) + "x", FeatureNames.Debug);
                return (this);
            }
        }

        /** 
         * [Internal] If the Ink is being dragged, returns the latest position of the pointer doing the dragging. Otherwise, returns null. 
         * @returns {Point | null} Result.
         * @internal
         */
        previousDragMovePoint(): Point | null
        {
            return (this._previousDragMovePoint);
        }

        /** [Private Method] Applies the current Class/StrokeColor/StrokeWidth to either the final "consolidated" path (if available), or the current constituent path of an in-flight inking. */
        private applyStyle(): void
        {
            let pathSelection: D3SingleSelection = (this._finalPath !== null) ? this._finalPath : _inkCurrentPath[this._pointerID];

            if (this._isEraserDrawing)
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
                        if (!this.StrokeColor()) { pathSelection.node().style.stroke = "black"; }
                        if (!this.StrokeWidth()) { pathSelection.node().style.strokeWidth = "4px"; }
                    }
                }
            }
        }

        /**
         * [Chainable Property] The callback that will be invoked for each move when the Ink is being dragged (by a Gesture).
         * @param {InkDragMoveEventHandler} handler An InkDragMoveEventHandler.
         * @returns {this | number} Either the property value (if getting), or the Ink instance (if setting).
         */
        OnDragMoveHandler(handler: InkDragMoveEventHandler): this;
        OnDragMoveHandler(): InkDragMoveEventHandler;
        OnDragMoveHandler(handler?: InkDragMoveEventHandler): this | InkDragMoveEventHandler
        {
            return (getOrSetProperty(this, nameof(() => this._onDragMoveHandler), handler));
        }

        /**
         * [Private Method] Returns true if the specified PointerEvent was generated from the pen eraser.
         * @param {PointerEvent} e A PointerEvent.
         * @return {boolean} Result.
         */
        private isEraser(e: PointerEvent): boolean
        {
            // Check if the [pen] eraser button is currently pressed, or if 'e' is the [pointer-up] event when the [pen] eraser button stopped being pressed
            // (ie. the eraser button was the source of the [pen] button state-transition [to not-pressed]) [see http://www.w3.org/TR/pointerevents2/]
            let isEraser = (e.pointerType === "pen") && (((e.buttons & PenButton.Eraser) === PenButton.Eraser) || (e.button === 5));
            return (isEraser);
        }

        /** 
         * Starts the Ink instance. 
         * @returns {Ink} The Ink instance.
         */
        Start(): this
        {
            // Prevent starting more than once
            if (this._isStarted)
            {
                log("Warning: An Ink cannot be started more than once");
                return (this);
            }

            let e: PointerEvent = getPointerDownEvent(this._pointerID, this.ParentGesture().Target());
            let isEraser: boolean = this.isEraser(e);
            let ruler: Controls.RulerControl = getSvgInfo(e.target as DomElement).ruler;

            this._isEraserDrawing = !this.IsNonDrawing() && isEraser;

            if (!this._isNonDrawing && this._cometTailClassName)
            {
                throw new MILException("Ink.CometTailClass() can only be set when IsNonDrawing() is true");
            }

            // Determine if the Ink should be coerced to the Ruler (if available and visible)
            if (!this.IsNonDrawing() && ruler && ruler.IsVisible())
            {
                let line: SVGLine = ruler.GetFaceEdgeLine();
                let inkStartPoint: Point = this.ParentGesture().GetStartSvgPoint("{P1}");
                let pointOnLine: Point = Utils.GetClosestPointOnLine(inkStartPoint, line[0], line[1]);
                let distanceToRuler: number = Utils.GetDistanceBetweenPoints(inkStartPoint, pointOnLine);
                this._isCoercingInkToRuler = (distanceToRuler < (ruler.Height() * 0.25));
            }
            else
            {
                this._isCoercingInkToRuler = false;
            }

            // Start a new line (path)
            this.startNewLine(e);

            // There's no need to track a non-drawing Ink because it doesn't add a Path element
            if (!this.IsNonDrawing())
            {
                MIL._inks.push(this); // Note: Must be explicitly removed via Ink.Delete() or Ink.Cancel()
            }

            this._isStarted = true;
            return (this);
        }

        /**
         * [Private Method] Starts drawing a new line (path) using the specified pointerDown event. The line will be drawn on the corresponding svgInfo.gDomElement.
         * @param {PointerEvent} e A pointerDown event.
         */
        private startNewLine(e: PointerEvent): void
        {
            let pointerID: string = makePointerID(e);
            let svgInfo: SVGInfo = getSvgInfo(e.target as DomElement);
            let isCometTail: boolean = this._isNonDrawing && Boolean(this._cometTailClassName);
            let isDrawing: boolean = !this._isNonDrawing || isCometTail;

            if (isDrawing)
            {
                if (_inkLineGenerator === null)
                {
                    _inkLineGenerator = d3.line<Point>()
                        .curve(d3.curveBasis) // See http://bl.ocks.org/mbostock/4342190
                        .x(function (d) { return (d.x); })
                        .y(function (d) { return (d.y); });
                }

                _inkCurrentPath[pointerID] = svgInfo.gSelection.append("path").attr("data-pointerID", pointerID); // "tag" the path with the pointerID that drew it
                this.applyStyle();

                if (isCometTail)
                {
                    // Start a fade-out of the new (current) path
                    var currentPath: D3SingleSelection = _inkCurrentPath[pointerID]; // Note: Don't use 'let' here: it will result in the variable being renamed during compilation which means it won't surface correctly in the debugger
                    Utils.Fade(currentPath, this._cometTailDurationInMs, null, function onFadeComplete() { if (currentPath) currentPath.remove(); });
                }
            }

            // Is this line brand new?
            if (_inkCompletePathPointData[pointerID].length === 0)
            {
                if (MIL._postponedPointerEvents.length > 0)
                {
                    // Add the pending _postponedPointerEvents to the path
                    for (let i = 0; i < MIL._postponedPointerEvents.length; i++)
                    {
                        if (this._pointerID === makePointerID(MIL._postponedPointerEvents[i]))
                        {
                            this.OnPointerMove(MIL._postponedPointerEvents[i]);
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

        /**
         * [Internal] Handler for a pointerMove event. Typically this is called by the Ink's owning Gesture (or by the Ink itself).
         * @param {PointerEvent} e A pointerMove event.
         */
        OnPointerMove(e: PointerEvent): void
        {
            let pointerID: string = makePointerID(e);
            let svgInfo: SVGInfo = getSvgInfo(e.target as DomElement);

            // Since the main 'g' element can be transformed (ie. zoomed and/or panned), we need to transform the e.clientX/Y point into the coordinate space of the [potentially transformed] 'g' element
            let pointInTransformSpace: Point = TransposePointer(e, svgInfo.gDomElement);
            let x: number = pointInTransformSpace.x, y: number = pointInTransformSpace.y;
            let newPoint: Point = { x: x, y: y };

            if (this._isCoercingInkToRuler)
            {
                // Was the ruler hidden while we were drawing?
                if (!svgInfo.ruler.IsVisible())
                {
                    this.OnPointerUp(e);
                    return;
                }

                let line: SVGLine = svgInfo.ruler.GetFaceEdgeLine();
                let pointOnLine: Point = Utils.GetClosestPointOnLine(newPoint, line[0], line[1]);
                let distanceToRuler: number = Utils.GetDistanceBetweenPoints(newPoint, pointOnLine);

                // Has the pointer moved too far away from the ruler?
                if (distanceToRuler > (svgInfo.ruler.Height() * 0.25))
                {
                    this.OnPointerUp(e);
                    return;
                }

                newPoint = { x: pointOnLine.x, y: pointOnLine.y };
            }

            let maxPathSegments: number = this._isNonDrawing ? 8 : 100; // The non-drawing case is for a comet-tail
            let overlappingPathSegments: number = this._isNonDrawing ? 7 : 2; // The non-drawing case is for a comet-tail
            let pathPointData: Point[] = _inkCurrentPathPointData[pointerID];
            let completePathPointData: Point[] = _inkCompletePathPointData[pointerID];
            let isCometTail: boolean = this._isNonDrawing && Boolean(this._cometTailClassName);
            let isDrawing: boolean = !this._isNonDrawing || isCometTail;

            if (pathPointData === undefined)
            {
                // A movement of the touch/mouse/pen has been detected, but before we got a 'pointerDown' for it [which is a valid condition]
                return;
            }

            // To prevent a slow-down in rendering speed when pathPointData gets large [or to draw the comet-tail], we periodically spawn a new path
            if (isDrawing && (pathPointData.length === maxPathSegments))
            {
                pathPointData.length = 0;

                // Smooth the "join" between the old and new path [by adding the last overlappingPathSegments from the complete path-point list to the new "component" path]
                if ((overlappingPathSegments > 0) && (overlappingPathSegments <= completePathPointData.length))
                {
                    let tailPoints: Point[] = completePathPointData.slice(-overlappingPathSegments);
                    Array.prototype.push.apply(pathPointData, tailPoints);
                }

                this.startNewLine(e);
            }

            // Append new data point [but only if it's "different" from the last point (to help smooth the line and to cut down on the number of points stored)]
            let isPointDifferentThanLast: boolean = true;

            if (completePathPointData.length > 0)
            {
                let lastPoint: Point = completePathPointData[completePathPointData.length - 1];
                let distanceThreshold: number = 3;
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

        /**
         * [Internal] Handler for a pointerUp event. Typically this is called by the Ink's owning Gesture (or by the Ink itself).
         * @param {PointerEvent} e A pointerUp event.
         */
        OnPointerUp(e: PointerEvent): void
        {
            let pointerID: string = makePointerID(e);
            let svgInfo: SVGInfo = getSvgInfo(e.target as DomElement);

            if (this._isNonDrawing)
            {
                this._nonDrawingPathPoints = _inkCompletePathPointData[pointerID];
            }
            else
            {
                if (_inkCompletePathPointData[pointerID] !== undefined)
                {
                    // Handle a simple mouse click [in which case onPointerMove() will not have fired]
                    if ((e.pointerType === "mouse") && (_inkCompletePathPointData[pointerID].length === 0))
                    {
                        // Since the main 'g' element can be transformed (ie. zoomed and/or panned), we need to transform the e.clientX/Y point into the coordinate space of the [potentially transformed] 'g' element
                        let pointInTransformSpace: Point = TransposePointer(e, svgInfo.gDomElement);
                        _inkCompletePathPointData[pointerID].push({ x: pointInTransformSpace.x, y: pointInTransformSpace.y });
                    }

                    this.consolidatePaths(e);
                }

                // We store the path-points on the Path DOM element directly because this makes it easier to subsequently access them.
                // Even though we only have a single array of points, we store them as an array of array of points in order to support
                // multi-line paths [created via Gesture.CombineInks()].
                this._finalPath.node().__MILPathPointsCollection__ = [_inkCompletePathPointData[pointerID]];
            }

            this._pointerID = null; // To indicate that the inking is complete [and prevent getInkingGesture() from continuing to find gestures whose inking is complete]
            this._isStarted = false;

            delete _inkCompletePathPointData[pointerID];
            delete _inkCurrentPathPointData[pointerID];
            delete _inkCurrentPath[pointerID];

            // Check if we should automatically combine this Ink with one-or-more other Inks that overlap with it in some way
            if (!this._isEraserDrawing && !this._isNonDrawing && !this._isCoercingInkToRuler && (svgInfo.settings.InkAutoCombineMode() !== InkAutoCombineMode.Off))
            {
                let inksToCombine: Ink[] = [this];
                let combinedPathClassName: string = "";
                let autoCombineMode: InkAutoCombineMode = svgInfo.settings.InkAutoCombineMode();
                let combinationTargetFound: boolean = false;
                let pointsToTest: Point[] = this.PathPoints();

                for (let i = 0; i < MIL._inks.length; i++)
                {
                    if (MIL._inks[i] === this)
                    {
                        continue;
                    }

                    let polygonPoints: Point[] = MIL._inks[i].PathPoints(); // Note: These are actually {x,y} points, not [x,y] points

                    if ((autoCombineMode & InkAutoCombineMode.ContainedWithin) === InkAutoCombineMode.ContainedWithin)
                    {
                        let containedPointCount = Utils.CountPointsInPolygon(polygonPoints, pointsToTest);
                        combinationTargetFound = (containedPointCount === pointsToTest.length);
                    }

                    if (!combinationTargetFound && ((autoCombineMode & InkAutoCombineMode.StartsWithin) === InkAutoCombineMode.StartsWithin))
                    {
                        combinationTargetFound = Utils.IsPointInPolygon(polygonPoints, pointsToTest[0].x, pointsToTest[0].y);
                    }

                    if (!combinationTargetFound && ((autoCombineMode & InkAutoCombineMode.EndsWithin) === InkAutoCombineMode.EndsWithin))
                    {
                        combinationTargetFound = Utils.IsPointInPolygon(polygonPoints, pointsToTest[pointsToTest.length - 1].x, pointsToTest[pointsToTest.length - 1].y);
                    }

                    if (!combinationTargetFound && ((autoCombineMode & InkAutoCombineMode.AnyPointWithin) === InkAutoCombineMode.AnyPointWithin))
                    {
                        combinationTargetFound = Utils.IsAnyPointInPolygon(polygonPoints, pointsToTest);
                    }

                    if (combinationTargetFound)
                    {
                        combinedPathClassName = MIL._inks[i].Class() ? MIL._inks[i].Class() : combinedPathClassName;
                        inksToCombine.push(MIL._inks[i]);
                        combinationTargetFound = false;
                    }
                }

                if (inksToCombine.length > 1)
                {
                    this.ParentGesture().CombineInks(inksToCombine, combinedPathClassName);
                }
            }
        }

        /**
         * Starts a drag operation for the Ink. When the drag is complete, call Ink.DragEnd().
         * @param {Gesture} dragGesture The Gesture being used to drag the Ink (must target the Ink's Hull).
         * @param {string} [groupDragSelectionClassName] [Optional] The name of a class used to find the set of Inks to drag (ie. a multi-select drag).
         */
        DragStart(dragGesture: Gesture, groupDragSelectionClassName: string): void
        {
            if (dragGesture.Target() !== this.HullPath().node())
            {
                throw new MILException("The specified 'dragGesture' must target the Ink.HullPath()");
            }

            let ink: Ink = this;
            let startPoint: Point = dragGesture.GetStartSvgPoint("{P1}"); // TODO: Revisit defaulting to using the {P1} pointer of the drag gesture
            let svgInfo: SVGInfo = getSvgInfo(dragGesture.Target());
            let inkPath: D3SingleSelection = this.Path();
            let hullPath: D3SingleSelection = this.HullPath();
            let isDraggedSelection: boolean = groupDragSelectionClassName && inkPath.classed(groupDragSelectionClassName);

            this._previousDragMovePoint = startPoint;
            this._groupDragSelectionClassName = groupDragSelectionClassName || null;
            this._dragGesture = dragGesture;

            // Re-create the inkHull (drag target) and the inkPath (we do this to change the z-order of these elements [z-order = order
            // added to SVG] to "top", so that they are dragged above erasure paths and other draggable elements)
            let selectedPaths: D3Selection = inkPath;
            let selectedHulls: D3Selection = hullPath;

            if (isDraggedSelection)
            {
                let g: D3SingleSelection = svgInfo.gSelection;
                selectedPaths = g.selectAll("path.MILInkPath" + (ink._groupDragSelectionClassName ? "." + ink._groupDragSelectionClassName : ""));
                selectedHulls = g.selectAll("path.MILInkHullPath").filter<DomElement>(function () { return (ink.getInkPathAssociatedWithHull(this as DomElement).classed(ink._groupDragSelectionClassName)); });
            }

            let draggedPathElements: DomElement[] = selectedPaths.remove().nodes();
            draggedPathElements.forEach(function (element) { svgInfo.gDomElement.appendChild(element); });

            let draggedHullElements: DomElement[] = selectedHulls.remove().nodes();
            draggedHullElements.forEach(function (element) { svgInfo.gDomElement.appendChild(element); });

            // The dragGesture didn't create the Ink whose hull it's targeted on, but since it needs to operate on the
            // Ink.Path() in addition to the Ink.HullPath() [its Target()], we tag the gesture with its "host" Ink
            if ((dragGesture.Ink() !== null) && (dragGesture.Ink() !== this))
            {
                throw new MILException("The specified 'dragGesture' has an unexpected Ink() value");
            }
            dragGesture.ink(this);

            dragGesture.OnMoveHandler(Ink.dragMove); // This handler will be removed automatically when the gesture ends [by removePointer()])
        }

        /**
         * [Private Static Method] A handler for pointerMove events when the Ink is being dragged.
         * Note: The value of 'this' must be explicitly set to the Gesture that is performing the drag [eg. using call()] otherwise the method will throw.
         * @param {PointerEvent} e A pointerMove event.
         */
        private static dragMove(e: PointerEvent): void
        {
            // Note: Gesture.OnMoveHandler() [which is how Ink.dragMove() gets called] will prevent e from bubbling

            // PORT: This check was added (because by default 'this' will be 'typeof Ink' due to it being a static member of the Ink class)
            if (Utils.GetObjectType(this) !== "Gesture")
            {
                throw new MILException("The value of 'this' has not been explicitly set to a Gesture instance");
            }

            let dragGesture: Gesture = ThisGesture(this);
            let ink: Ink = dragGesture.Ink();
            let pointerID: string = dragGesture.GetPointerID("{P1}"); // TODO: Revisit defaulting to using the {P1} pointer of the drag gesture

            // We only care about pointer-move events for the {P1} pointer
            if (makePointerID(e) !== pointerID)
            {
                return;
            }

            let currentPoint: Point = dragGesture.GetCurrentSvgPoint("{P1}");
            let previousPoint: Point = ink._previousDragMovePoint;
            let svgInfo: SVGInfo = getSvgInfo(dragGesture.Target());
            let deltaX: number = (currentPoint.x - previousPoint.x);
            let deltaY: number = (currentPoint.y - previousPoint.y);
            let inkPath: D3SingleSelection = ink.Path();

            ink._previousDragMovePoint = currentPoint;

            if ((deltaX !== 0) || (deltaY !== 0))
            {
                if (ink._groupDragSelectionClassName && inkPath.classed(ink._groupDragSelectionClassName))
                {
                    let g: D3SingleSelection = svgInfo.gSelection;
                    let selectedPaths: D3Selection = g.selectAll("path.MILInkPath" + (ink._groupDragSelectionClassName ? "." + ink._groupDragSelectionClassName : ""));
                    let selectedHulls: D3Selection = g.selectAll("path.MILInkHullPath").filter<DomElement>(function () { return (ink.getInkPathAssociatedWithHull(this as DomElement).classed(ink._groupDragSelectionClassName)); });

                    // Move the inkPath(s) (using the "fast" translation method)
                    selectedPaths.each(function (d, i)
                    {
                        let inkPath: D3SingleSelection = d3.select(this);
                        ink.translateInkPath(inkPath, deltaX, deltaY, true);
                    });

                    // Move the inkHull(s)
                    selectedHulls.each(function (d, i)
                    {
                        let inkHullPath: D3SingleSelection = d3.select(this);
                        ink.translateHullPath(inkHullPath, deltaX, deltaY, true);
                    });
                }
                else
                {
                    // Move the inkPath (using the "fast" translation method)
                    ink.translateInkPath(inkPath, deltaX, deltaY, true);

                    // Move the inkHull
                    ink.translateHullPath(ink.HullPath(), deltaX, deltaY, true);
                }

                // Call the user-supplied drag-move handler (if any) [eg. to move user content associated with the ink/hull]
                if (ink.OnDragMoveHandler() !== null)
                {
                    ink.OnDragMoveHandler()(deltaX, deltaY); // PORT: Design change idea: should we modify this to a call() so that we can also supply the Ink instance?
                }
            }
        }

        /** Ends the drag operation started by Ink.DragStart(). */
        DragEnd(): void
        {
            if (this._dragGesture === null)
            {
                return;
            }

            let ink: Ink = this;
            let dragGesture: Gesture = this._dragGesture;
            let currentPoint: Point = dragGesture.GetCurrentSvgPoint("{P1}"); // TODO: Revisit defaulting to using the {P1} pointer of the drag gesture
            let startPoint: Point = dragGesture.GetStartSvgPoint("{P1}");
            let deltaX: number = (currentPoint.x - startPoint.x);
            let deltaY: number = (currentPoint.y - startPoint.y);
            let svgInfo: SVGInfo = getSvgInfo(dragGesture.Target());
            let inkPath: D3SingleSelection = this.Path();
            let hullPath: D3SingleSelection = this.HullPath();
            let isDraggedSelection: Boolean = this._groupDragSelectionClassName && inkPath.classed(this._groupDragSelectionClassName);

            // Do the final "manual" translation of the ink (to update __MILPathPointsCollection__ and clear the transform) and hull
            if (isDraggedSelection)
            {
                let g: D3SingleSelection = svgInfo.gSelection;
                let selectedPaths: D3Selection = g.selectAll("path.MILInkPath" + (ink._groupDragSelectionClassName ? "." + ink._groupDragSelectionClassName : ""));
                let selectedHulls: D3Selection = g.selectAll("path.MILInkHullPath").filter<DomElement>(function () { return (ink.getInkPathAssociatedWithHull(this as DomElement).classed(ink._groupDragSelectionClassName)); });

                selectedPaths.each(function (d, i)
                {
                    let inkPath: D3SingleSelection = d3.select(this);
                    ink.translateInkPath(inkPath, deltaX, deltaY, false);
                });

                selectedHulls.each(function (d, i)
                {
                    let inkHullPath: D3SingleSelection = d3.select(this);
                    ink.translateHullPath(inkHullPath, deltaX, deltaY, false);
                });
            }
            else
            {
                this.translateInkPath(inkPath, deltaX, deltaY, false);
                this.translateHullPath(hullPath, deltaX, deltaY, false);
            }

            this._previousDragMovePoint = null;
            this._groupDragSelectionClassName = null;
            this._dragGesture = null;
        }

        /** 
         * Returns the convex area of the Ink instance. 
         * @returns {number} Result.
         */
        GetConvexArea(): number
        {
            let convexArea: number = 0;

            if (this._finalPath !== null)
            {
                let polygonPoints: XY[] = Utils.ConvertPointsToXYPoints(this.PathPoints());
                let convexHullVertices: XY[] = d3.polygonHull(polygonPoints); // Returned points are in counter-clockwise order [which d3.polygonArea (see below) needs to return a positive value]

                if (convexHullVertices)
                {
                    convexArea = d3.polygonArea(convexHullVertices);
                }
            }
            return (convexArea);
        }

        /**
         * Returns true if the Ink instance is completely within the specified targetInk, false otherwise.
         * Note: returns false if targetInk is the current Ink instance.
         * @param {Ink} targetInk The "bounding" Ink instance.
         * @returns {boolean} Result.
         */
        IsInside(targetInk: Ink): boolean
        {
            if (targetInk === this)
            {
                return (false);
            }

            let pointsToTest: Point[] = this.PathPoints();
            let containedPointCount: number = Utils.CountPointsInPolygon(targetInk.PathPoints(), pointsToTest);
            let isInside: boolean = (containedPointCount === pointsToTest.length);

            return (isInside);
        }

        /**
         * Using a grid-quantizing scheme, returns an array of {x,y} points (of length numGridPoints) that lie within the Ink instance.
         * An empty array will be returned if no layout grid can be computed.
         * Typically this is used to create locations ("landing sites") to move other items into the Ink region (eg. when the Ink is being used as a container).
         * @param {number} numGridPoints The number of grid points to create.
         * @returns {Point[]} Result.
         */
        GetLayoutGridPoints(numGridPoints: number): Point[]
        {
            let boundingRect: Rect = Utils.GetBoundingRectForPoints(this.PathPoints());
            let numCols: number = Math.ceil(Math.sqrt(numGridPoints)) + 2; // Just a [very] approximate starting value
            let numRows: number = Math.ceil(numCols * (boundingRect.height / boundingRect.width)); // Just a [very] approximate starting value

            // Step 1: Reduce numRows/numCols so that their product is LESS than numGridPoints
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

            let gridPoints: Point[] = [];
            let polygonPoints: XY[] = Utils.ConvertPointsToXYPoints(this.PathPoints());
            let retryCount: number = 0;
            let aborted: boolean = false;

            // Step 2: Iteratively create a grid of points using numRows/numCols, increasing both as needed until the grid has MORE [contained] points than numGridPoints
            while ((gridPoints.length < numGridPoints) && !aborted)
            {
                for (let r = (numRows === 1 ? 0 : 1); r < numRows; r++)
                {
                    let testPointY: number = boundingRect.y + ((numRows === 1) ? (boundingRect.height / 2) : (r * (boundingRect.height / numRows)));

                    for (let c = (numCols === 1 ? 0 : 1); c < numCols; c++)
                    {
                        let testPointX: number = boundingRect.x + ((numCols === 1) ? (boundingRect.width / 2) : (c * (boundingRect.width / numCols)));

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
                    aborted = (retryCount++ === 5); // It's expensive to retry too many times
                }
            }

            // Step 3: Trim gridPoints to numGridPoints by a) [conservatively] downsampling, then b) trimming the remaining excess gridPoints equally from the start/end
            if (!aborted)
            {
                let deleteCount: number = gridPoints.length - numGridPoints;

                if (deleteCount > 0)
                {
                    let downsamplingStepSize: number = Math.floor(gridPoints.length / numGridPoints);
                    if (downsamplingStepSize > 1)
                    {
                        let downsampledGridPoints: Point[] = [];
                        for (let i = 0; i < gridPoints.length; i += downsamplingStepSize)
                        {
                            downsampledGridPoints.push(gridPoints[i]);
                        }
                        gridPoints = downsampledGridPoints;
                        deleteCount = gridPoints.length - numGridPoints;
                    }

                    if (deleteCount > 0)
                    {
                        let deleteFromStart: number = (deleteCount % 2 === 0) ? deleteCount / 2 : Math.floor(deleteCount / 2);
                        let deleteFromEnd: number = (deleteCount % 2 === 0) ? deleteCount / 2 : Math.ceil(deleteCount / 2);
                        gridPoints.splice(0, deleteFromStart);
                        gridPoints.splice(gridPoints.length - deleteFromEnd, deleteFromEnd);
                    }
                }
            }

            // DEBUG:
            // let gDomElement: SVGGElement = getSvgInfo(this.Path()).gDomElement;
            // gridPoints.forEach(function (point) { Utils.DebugDrawPoints(gDomElement, [point], 3); });

            return (gridPoints);
        }

        /** 
         * Returns true if the Ink instance is [approximately] a straight line. 
         * @returns {boolean} Result.
         */
        IsStraightLine(): boolean
        {
            let polygonPoints: XY[] = Utils.ConvertPointsToXYPoints(this.PathPoints());
            let isStraightLine: boolean = Utils.IsStraightLine(polygonPoints);
            return (isStraightLine);
        }

        /**
         * [Private Method] Translates the specified Ink path by the specified x/y delta.
         * @param {D3SingleSelection} inkPath The Ink path to translate (as a D3 Selection of the svg Path element).
         * @param {number} deltaX The number of pixels to translate by on the x-axis.
         * @param {number} deltaY The number of pixels to translate by on the y-axis.
         * @param {boolean} useTransform If true, use a [fast] svg transform to do the translation (but doesn't update __MILPathPointsCollection__).
         *                               If false, uses a [slow] manual redraw to do the translation (and updates __MILPathPointsCollection__).
         */
        private translateInkPath(inkPath: D3SingleSelection, deltaX: number, deltaY: number, useTransform: boolean): void
        {
            if (useTransform === true)
            {
                // Note: Updating the transform is MUCH faster than doing a "manual" translation followed by
                //       calling _inkLineGenerator(), but it doesn't update __MILPathPointsCollection__
                this.translateWithTransform(inkPath, deltaX, deltaY);
            }
            else
            {
                let pathPointsCollection: Point[][] = inkPath.node().__MILPathPointsCollection__ as Point[][];
                let translatedPathPointsCollection: Point[][] = [];
                let d: string = "";
                let isClosed: boolean = (inkPath.attr("d")[inkPath.attr("d").length - 1] === "Z");

                // Undo any existing transform translation [created when useTransform is 'true']
                inkPath.attr("transform", null);

                for (let l = 0; l < pathPointsCollection.length; l++)
                {
                    let pathData: Point[] = pathPointsCollection[l];
                    let translatedPathPoints: Point[] = [];

                    for (let i = 0; i < pathData.length; i++)
                    {
                        let translatedX: number = pathData[i].x + deltaX;
                        let translatedY: number = pathData[i].y + deltaY;

                        translatedPathPoints.push({ x: translatedX, y: translatedY });
                    }

                    translatedPathPointsCollection.push(translatedPathPoints);
                    d += _inkLineGenerator(translatedPathPoints);
                }

                inkPath.attr("d", d + (isClosed ? "Z" : ""));
                inkPath.node().__MILPathPointsCollection__ = translatedPathPointsCollection;
            }
        }

        /**
         * [Private Method] Translates the specified Ink Hull path by the specified x/y delta.
         * @param {D3SingleSelection} hullPath The Ink Hull path to translate (as a D3 Selection of the svg Path element).
         * @param {number} deltaX The number of pixels to translate by on the x-axis.
         * @param {number} deltaY The number of pixels to translate by on the y-axis.
         * @param {boolean} useTransform If true, use a [fast] svg transform to do the translation (but doesn't update __MILPathPointsCollection__).
         *                               If false, uses a [slow] manual redraw to do the translation (and updates __MILPathPointsCollection__).
         */
        private translateHullPath(hullPath: D3SingleSelection, deltaX: number, deltaY: number, useTransform: boolean): void
        {
            if (useTransform === true)
            {
                // Note: Updating the transform is MUCH faster than doing a "manual" translation of the "d" attribute
                //       but it doesn't update ink._combinedOutlinePathPoints
                this.translateWithTransform(hullPath, deltaX, deltaY);
            }
            else
            {
                let hullPathDomElement: DomElement = Utils.GetDomElement(hullPath, SVGPathElement);
                let values: string[] = hullPathDomElement.getAttribute("d").split(" ");
                let hullPathData: string = "";
                let ink: Ink = GetInkByElement(hullPath);
                let translatedOutlinePathPoints: Point[] = [];

                // Undo any existing transform translation [created when useTransform is 'true']
                hullPath.attr("transform", null);

                for (let i = 0; i < values.length; i++)
                {
                    if (isNaN(+values[i]))
                    {
                        if (values[i].length !== 1)
                        {
                            throw new MILException("Unexpected value ('" + values[i] + "') in 'd'");
                        }

                        // M or L 
                        hullPathData += values[i] + " ";
                    }
                    else
                    {
                        // x y
                        let translatedX: number = +values[i] + deltaX;
                        let translatedY: number = +values[++i] + deltaY;
                        hullPathData += translatedX + " " + translatedY + " ";

                        if (ink.IsCombined())
                        {
                            translatedOutlinePathPoints.push({ x: translatedX, y: translatedY });
                        }
                    }
                }

                hullPathDomElement.setAttribute("d", hullPathData.trim());

                if (ink.IsCombined())
                {
                    ink._combinedOutlinePathPoints = translatedOutlinePathPoints;
                }
            }
        }

        // TODO: There may be a better way to do this [eg. https://mikewilliamson.wordpress.com/2013/08/27/matrix-transforms-in-svg/]
        /**
         * [Private Method] Translates [by altering the 'transform' attribute] the specified DOM element by the specified x/y delta.
         * @param {D3SingleSelection} element D3 selection of the DOM element to translate.
         * @param {number} deltaX The number of pixels to translate by on the x-axis.
         * @param {number} deltaY The number of pixels to translate by on the y-axis.
         */
        private translateWithTransform(element: D3SingleSelection, deltaX: number, deltaY: number): void
        {
            let transform: string = element.attr("transform");

            if (transform)
            {
                let xy: string[] = transform.replace("translate(", "").replace(")", "").split(" ");

                if (xy.length > 2)
                {
                    throw new MILException("The 'transform' of the element contains more than just a 'translate()'");
                }

                let prevX: number = +xy[0];
                let prevY: number = (xy.length === 1) ? 0 : +xy[1];

                deltaX += prevX;
                deltaY += prevY;
            }

            element.attr("transform", "translate(" + deltaX + " " + deltaY + ")");
        }

        /**
         * [Private Method] Returns the Ink path (as a D3 Selection) that's associated with the specified Hull element.
         * @param {DomElement} hullPath The svg path element of an Ink Hull.
         * @returns {D3Selection} Result.
         */
        private getInkPathAssociatedWithHull(hullPath: DomElement): D3SingleSelection
        {
            let pathDomElement: DomElement = Utils.GetDomElement(hullPath, SVGPathElement);
            // PORT: Original line:
            // return (pathDomElement !== null ? pathDomElement.__MILAssociatedInkPath__ as D3Selection : null);
            return (pathDomElement.__MILAssociatedInkPath__ as D3Selection);
        }

        /**
         * [Private Method] When an Ink is complete, creates a single "composite" path to replace the multiple [overlapping] constituent paths.
         * @param {PointerEvent} e The pointerUp event for the Ink (when it ends).
         */
        private consolidatePaths(e: PointerEvent): void
        {
            let pointerID: string = makePointerID(e);
            let isEraser: boolean = this._isEraserDrawing;
            let svgInfo: SVGInfo = getSvgInfo(e.target as DomElement);

            // Add a single "composite" path to replace the multiple [overlapping] constituent paths
            let path: D3SingleSelection = this._finalPath = svgInfo.gSelection.append("path").attr("d", _inkLineGenerator(_inkCompletePathPointData[pointerID]) + (this._isAutoCose ? "Z" : ""));

            this.applyStyle();
            path.classed("MILInkPath", true); // Just to make it easier to find the ink paths using CSS selector syntax ("path.MILInkPath") 

            // Remove the multiple [overlapping] constituent paths
            let constituentPaths: D3Selection = svgInfo.gSelection.selectAll("[data-pointerID=" + pointerID + "]");
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
            if ((this.HullType() !== InkHullType.None) && !isEraser)
            {
                let pathPoints: Point[] = _inkCompletePathPointData[pointerID];
                let boundingRect: Rect = Utils.GetBoundingRectForPoints(pathPoints);
                let offsetTop: number = boundingRect.y, offsetLeft: number = boundingRect.x;
                let height: number = boundingRect.height;
                let width: number = boundingRect.width;
                let penWidth: number = Utils.ToNumber(path.style("stroke-width"));
                let adj: number = penWidth / 2;
                let rectLeft: number = offsetLeft - adj;
                let rectTop: number = offsetTop - adj;
                let rectWidth: number = width + penWidth;
                let rectHeight: number = height + penWidth;
                let hullPath: D3SingleSelection = svgInfo.gSelection.append("path");
                let d: string = "";

                hullPath.node().__MILAssociatedInkPath__ = path; // "tag" the hull with its corresponding Ink path
                hullPath.classed("MILInkHullPath", true); // Just to make it easier to find the hulls using CSS selector syntax ("path.MILInkHullPath")
                hullPath.style("stroke", this.HullColor());
                hullPath.style("stroke-width", "1px");
                hullPath.style("fill", this.HullColor());

                let polygonPoints: XY[] = Utils.ConvertPointsToXYPoints(pathPoints);
                let isStraightLine: boolean = Utils.IsStraightLine(polygonPoints);

                if (this.HullType() === InkHullType.Concave)
                {
                    if (isStraightLine)
                    {
                        log("Ink determined to be a straight-line");
                        for (let i = 0; i < polygonPoints.length; i++)
                        {
                            d += (!d ? "M " : " L ") + polygonPoints[i][0] + " " + polygonPoints[i][1];
                        }
                        hullPath.attr("d", d);
                        hullPath.style("stroke-width", (Utils.ToNumber(window.getComputedStyle(this._finalPath.node()).strokeWidth) * 7) + "px");
                        hullPath.style("fill", "");
                    }
                    else
                    {
                        for (let i = 0; i < pathPoints.length; i++)
                        {
                            d += (!d ? "M " : " L ") + pathPoints[i].x + " " + pathPoints[i].y;
                        }
                        hullPath.attr("d", d);
                    }
                }

                if (this.HullType() === InkHullType.Convex)
                {
                    let hullVertices: XY[] = d3.polygonHull(polygonPoints);
                    for (let i = 0; i < hullVertices.length; i++)
                    {
                        d += (!d ? "M " : " L ") + hullVertices[i][0] + " " + hullVertices[i][1];
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

        /**
         * [Private Method] Scales (resizes) the specified Ink path.
         * @param {D3SingleSelection} inkPath The Ink path to scale (as a D3 Selection of the svg Path element).
         * @param {number} oldScale The old (starting) scale of the Ink.
         * @param {number} newScale The new (ending) scale of the Ink.
         * @param {number} startStrokeWidth The starting thickness (in pixels) of the Ink line.
         * @param {boolean} useTransform If true, use a [fast] svg transform to do the scaling (but doesn't update __MILPathPointsCollection__). 
         *                               If false, uses a [slow] manual redraw to do the scaling (and updates __MILPathPointsCollection__).
         */
        private scaleInkPath(inkPath: D3SingleSelection, oldScale: number, newScale: number, startStrokeWidth: number, useTransform: boolean): void
        {
            if (useTransform)
            {
                // Note: Updating the transform is faster than doing a "manual" scale followed by
                //       calling _inkLineGenerator(), but it doesn't update __MILPathPointsCollection__
                let pathDomElement: DomElement = inkPath.node();
                let zoomFocalPoint: Point = Utils.GetCentroidPoint(pathDomElement);
                let offsetX: number = zoomFocalPoint.x;
                let offsetY: number = zoomFocalPoint.y;
                let transformList: SVGTransformList = pathDomElement.transform.baseVal;
                let matrix: DOMMatrix = null; // Do NOT use pathDomElement.getCTM() since this will include the pan/zoom transform on the parent 'g' element
                let svg: SVGSVGElement = getSvgInfo(pathDomElement).svgDomElement;
                let zoomFactor: number = newScale / oldScale; // Factor representing the relative CHANGE in scale

                if (transformList.numberOfItems === 0)
                {
                    // The zoom is just starting, so there's no transform
                    let emptyMatrixTransform: SVGTransform = svg.createSVGTransformFromMatrix(svg.createSVGMatrix());
                    transformList.appendItem(emptyMatrixTransform);
                }
                matrix = transformList.getItem(0).matrix;

                // Note: These matrix multiplications are performed in right-to-left order (just like the "transform" attribute)
                let modifierMatrix: DOMMatrix = svg.createSVGMatrix().translate(offsetX, offsetY).scale(zoomFactor).translate(-offsetX, -offsetY);
                let newMatrix: DOMMatrix = matrix.multiply(modifierMatrix);
                transformList.getItem(0).setMatrix(newMatrix);

                // Finally, adjust the stroke-width (which has also been scaled by the transform) to keep it constant
                // Note: pathDomElement.setAttribute("vector-effect", "non-scaling-stroke") doesn't work on IE11 (which implements SVG 1.1 that doesn't include vector-effect).
                // Note: We don't try to adjust stroke-dasharray (if set) because doing so causes performance issues (on IE11).
                let finalScale: number = newMatrix.a;
                let newStrokeWidth: number = startStrokeWidth / finalScale;
                inkPath.style("stroke-width", newStrokeWidth + "px");
            }
            else
            {
                let scaleDelta: number = (newScale - oldScale) / oldScale;
                let pathPointsCollection: Point[][] = inkPath.node().__MILPathPointsCollection__ as Point[][];
                let scaledPathPointsCollection: Point[][] = [];
                let allPoints: Point[] = [];
                let d: string = "";
                let isClosed: boolean = (inkPath.attr("d")[inkPath.attr("d").length - 1] === "Z");

                // Undo the existing scale transform [added when useTransform is 'true']
                // [the following will result in inkPath.node().transform.baseVal.numberOfItems becoming 0]
                inkPath.node().setAttribute("transform", ""); // Note: null works on IE11, but not on Chrome

                for (let c = 0; c < pathPointsCollection.length; c++)
                {
                    allPoints = allPoints.concat(pathPointsCollection[c]);
                }

                let boundingRect: Rect = Utils.GetBoundingRectForPoints(allPoints);

                for (let l = 0; l < pathPointsCollection.length; l++)
                {
                    let pathData: Point[] = pathPointsCollection[l];
                    let scaledPathPoints: Point[] = [];

                    for (let i = 0; i < pathData.length; i++)
                    {
                        // "Re-origin" the points to 0,0
                        let scaledX: number = pathData[i].x - boundingRect.x;
                        let scaledY: number = pathData[i].y - boundingRect.y;

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

        /**
         * [Private Method] Scales (resizes) the specified Ink Hull path (a d3 selection of an svg Path element). Also scales the Hull's line thickness.
         * @param {D3SingleSelection} hullPath The Ink Hull path to scale.
         * @param {number} scaleDelta The ratio to scale by.
         */
        private scaleHullPath(hullPath: D3SingleSelection, scaleDelta: number): void
        {
            let hullPathDomElement: DomElement = Utils.GetDomElement(hullPath, SVGPathElement);
            let values: string[] = hullPathDomElement.getAttribute("d").split(" ");
            let hullPathData: string = "";
            let ink: Ink = GetInkByElement(hullPath);
            let scaledOutlinePathPoints: Point[] = [];
            let boundingRect: DOMRect = hullPathDomElement.getBBox();

            for (let i = 0; i < values.length; i++)
            {
                if (isNaN(+values[i]))
                {
                    if (values[i].length !== 1)
                    {
                        throw new MILException("Unexpected value ('" + values[i] + "') in 'd'");
                    }

                    // M or L
                    hullPathData += values[i] + " ";
                }
                else
                {
                    // x y
                    // "Re-origin" the points to 0,0
                    let scaledX: number = +values[i] - boundingRect.x;
                    let scaledY: number = +values[++i] - boundingRect.y;

                    // Now scale them
                    scaledX *= (1 + scaleDelta);
                    scaledY *= (1 + scaleDelta);

                    // Finally, move them back so that they stay centered on the bounding rect
                    scaledX += boundingRect.x - ((boundingRect.width * scaleDelta) / 2);
                    scaledY += boundingRect.y - ((boundingRect.height * scaleDelta) / 2);

                    hullPathData += scaledX + " " + scaledY + " ";

                    if (ink.IsCombined())
                    {
                        scaledOutlinePathPoints.push({ x: scaledX, y: scaledY });
                    }
                }
            }
            hullPathDomElement.setAttribute("d", hullPathData.trim());

            // Scale the hull stroke-width (we keep this proportional, unlike the Ink path)
            let strokeWidth = Utils.ToNumber(hullPath.style("stroke-width"));
            strokeWidth *= (1 + scaleDelta);
            hullPath.style("stroke-width", strokeWidth + "px");

            if (ink.IsCombined())
            {
                ink._combinedOutlinePathPoints = scaledOutlinePathPoints;
            }
        }

        /**
         * [Internal] Directly sets the Ink/Hull Paths (eg. when combining Inks).
         * @param {D3SingleSelection} hullPath The new Hull path.
         * @param {D3SingleSelection} inkPath The new Ink path.
         * @param {Point[]} hullPoints The new Hull points (combined outline).
         * @internal
         */
        setHullAndPath(hullPath: D3SingleSelection, inkPath: D3SingleSelection, hullPoints: Point[]): void
        {
            this._hullPath = hullPath; // Ink.HullPath() is read-only
            this._finalPath = inkPath; // Ink.FinalPath() is read-only
            this._combinedOutlinePathPoints = hullPoints;
        }
    }
}