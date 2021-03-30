// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

namespace MIL
{
    // This is only exported because of the eventWatchdog() bug-detector code in MIL.Initialize()
    export let _activePointerCaptures: { [targetElementID: string]: string[] } = {}; // The set of PointerID's being captured to an element - Key: TargetElementID, Value = Array of PointerID

    /** The Gesture class. To create a new Gesture, use MIL.CreateGesture(). */
    export class Gesture
    {
        private _name: string;
        private _targetDomElement: DomElement;
        private _pointerType: string; // The pointer-type(s) that define this gesture
        private _pointerTypePermutations: string[]; // All possible permutations of _pointerType (permutations arise from or-style pointerType values, eg. "pen|mouse+touch" meaning "a pen or a mouse, plus a touch")
        private _pointerTypeOrdinals: string[][]; // Based on the _pointerType (eg. "pen+touch:2" results in ordinals ["pen:1", "touch:1", "touch:2"]): there is one _pointerTypeOrdinals value (an array of ordinals) for each _pointerTypePermutations value
        private _conditional: GestureConditionalCallback; // A callback that must return true for the gesture to be recognized
        private _isExclusive: boolean;
        private _isEnabled: boolean;
        private _isCancelled: boolean;
        private _groupName: string;
        private _recognitionTimeoutInMs: number;
        private _completionTimeoutInMs: number; // -1 means 'no timeout'
        private _gestureStartedHandler: GestureEventHandler;
        private _gestureEndedHandler: GestureEndedHandler;
        private _gestureCancelledHandler: GestureEventHandler;
        private _onMoveHandler: PointerEventHandler;
        private _activePointerList: string[]; // If this gesture is currently active, this is the list of PointerID's involved
        private _activePointerTypeOrdinals: string[]; // If this gesture is currently active, this is the list of PointerType ordinals involved (copied from one of the _pointerTypeOrdinals values), eg. ["pen:1", "touch:1", "touch:2"]
        private _capturesPointers: boolean;
        private _isCapturing: boolean; // True if the gesture is currently capturing pointer events on _targetDomElement
        private _ink: Ink; // The LATEST Ink created by the Gesture (Gesture:Ink is 1:m). Use Gesture.Ink() to access this value.
        private _startedTime: number; // Set when the gesture starts (is recognized): Milliseconds since January 1, 1970
        private _endedTime: number; // Set when the gesture ends (when the first pointer is lifted): Milliseconds since January 1, 1970
        private _repeatCount: number;
        private _repeatTimeoutInMs: number;
        private _repeatOccurrenceCount: number; // A runtime value
        private _lastRepeatRecognitionTime: number; // A runtime value
        private _checkForGesturesOnEnd: boolean;
        private _allowEventPropagation: boolean;
        private _completionTimerID: number;

        constructor(name: string, ignoreGestureDefaults: boolean)
        {
            if (name[name.length - 1] === "*")
            {
                throw new MILException("Gesture name '" + name + "' is invalid (cannot end with '*'): consider using MIL.CreateGesture() instead");
            }

            this._name = name;
            this._targetDomElement = ignoreGestureDefaults ? null : GestureDefaults.Target();
            this._pointerType = null;
            this._pointerTypePermutations = [];
            this._pointerTypeOrdinals = [];
            this._conditional = null;
            this._isExclusive = true;
            this._isEnabled = true;
            this._isCancelled = false;
            this._groupName = ignoreGestureDefaults ? "default" : GestureDefaults.GroupName();
            this._recognitionTimeoutInMs = ignoreGestureDefaults ? 0 : GestureDefaults.RecognitionTimeoutInMs();
            this._completionTimeoutInMs = -1;
            this._gestureStartedHandler = ignoreGestureDefaults ? null : GestureDefaults.StartedHandler();
            this._gestureEndedHandler = ignoreGestureDefaults ? null : GestureDefaults.EndedHandler();
            this._gestureCancelledHandler = ignoreGestureDefaults ? null : GestureDefaults.CancelledHandler();
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

        /**
         * [Chainable Property] The name of the Gesture.
         * @param {string} name The name to give the Gesture instance.
         * @returns {this | string} Either the property value (if getting), or the Gesture instance (if setting).
         */
        Name(name: string): this;
        Name(): string;
        Name(name?: string): this | string
        {
            return (getOrSetProperty(this, nameof(() => this._name), name));
        }

        /**
         * [Chainable Property] The DOM element that the Gesture is recognized on.
         * @param {TargetDomElement} element The target element.
         * @returns {this | boolean} Either the property value (if getting), or the Gesture instance (if setting).
         */
        Target(element: TargetDomElement): this;
        Target(): DomElement;
        Target(element?: TargetDomElement): this | DomElement
        {
            if (element === undefined)
            {
                return (this._targetDomElement);
            }
            else
            {
                let targetDomElement: DomElement = Utils.GetDomElement(element);

                if (!document.body.contains(targetDomElement))
                {
                    throw new MILException("The specified DOM element does not exist in the document body");
                }

                tagWithTargetElementID(targetDomElement);
                this._targetDomElement = targetDomElement;
                return (this);
            }
        }

        /**
         * [Chainable Property] The pointer type of the Gesture (eg. "pen|touch+touch" meaning "pen+touch | touch+touch").
         * @param {string} pointerType The pointer type(s).
         * @returns {this | string} Either the property value (if getting), or the Gesture instance (if setting).
         */
        PointerType(pointerType: string): this;
        PointerType(): string;
        PointerType(pointerType?: string): this | string
        {
            if (pointerType === undefined)
            {
                return (this._pointerType);
            }
            else
            {
                let validTypes: string[] = ["pen", "touch", "mouse", "hover", "any"];
                let pointerTypePermutations: string[] = [];
                let pointerTypeOrdinals: string[][] = []; // [string[]]

                pointerType = pointerType.toLowerCase();

                // Populate pointerTypePermutations [which is necessary to handle or-style pointerType values, eg. "pen|touch+touch" meaning "pen or touch, plus a second touch"].
                pointerTypePermutations = this.permutePointerType(pointerType);

                for (let p = 0; p < pointerTypePermutations.length; p++)
                {
                    let groups: string[] = pointerTypePermutations[p].split("+");

                    pointerTypeOrdinals.push([]);

                    // Populate pointerTypeOrdinals[] (and validate pointerType)
                    // Note that pointerType can be of the form "touch:2+pen" or "touch+touch+pen"
                    for (let g = 0; g < groups.length; g++)
                    {
                        let parts: string[] = groups[g].split(":");
                        let type: string = parts[0];
                        let instanceCount: number = 1;

                        if (validTypes.indexOf(type) === -1)
                        {
                            throw new MILException("Invalid pointerType '" + type + "'; valid values (separated by '+') are: " + validTypes.join(", "));
                        }

                        if (parts.length === 1)
                        {
                            for (let i = 0; i < pointerTypeOrdinals[p].length; i++)
                            {
                                if (pointerTypeOrdinals[p][i].indexOf(type) === 0)
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
                                throw new MILException("Invalid pointerType '" + groups[g] + "'; should be of the form '" + type + ":{number}'");
                            }
                            if ((instanceCount < 1) || (instanceCount > 10))
                            {
                                throw new MILException("Invalid pointerType '" + groups[g] + "'; the instance count must be between 1 and 10");
                            }

                            for (let i = 1; i <= instanceCount; i++)
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

        /**
         * [ReadOnly Property] The set of all permutations of PointerType.
         * @returns {string[]} Result.
         */
        PointerTypePermutations(): string[]
        {
            readOnlyProperty("PointerTypePermutations", arguments);
            return (this._pointerTypePermutations);
        }

        /**
         * [Chainable Property] A callback that controls whether the Gesture should start once all pointers have been detected.
         * @param {GestureConditionalCallback} callback A callback that returns true if the Gesture should be started. When the callback is invoked, 'this' will be set to the Gesture instance.
         * @returns {this | GestureConditionalCallback} Either the property value (if getting), or the Gesture instance (if setting).
         */
        Conditional(callback: GestureConditionalCallback): this;
        Conditional(): GestureConditionalCallback;
        Conditional(callback?: GestureConditionalCallback): this | GestureConditionalCallback
        {
            return (getOrSetProperty(this, nameof(() => this._conditional), callback));
        }

        /**
         * [Chainable Property] Whether the Gesture, when active, prevents other Gestures from being recognized on Gesture.Target(). Defaults to true.
         * @param {boolean} exclusive Flag.
         * @returns {this | boolean} Either the property value (if getting), or the Gesture instance (if setting).
         */
        IsExclusive(exclusive: boolean): this;
        IsExclusive(): boolean;
        IsExclusive(exclusive?: boolean): this | boolean
        {
            return (getOrSetProperty(this, nameof(() => this._isExclusive), exclusive));
        }

        /**
         * [Chainable Property] Whether the Gesture is currently enabled or not.
         * @param {boolean} enabled Flag.
         * @returns {this | boolean} Either the property value (if getting), or the Gesture instance (if setting).
         */
        IsEnabled(enabled: boolean): this;
        IsEnabled(): boolean;
        IsEnabled(enabled?: boolean): this | boolean
        {
            if (enabled === undefined)
            {
                return (this._isEnabled && IsGestureGroupEnabled(this._groupName));
            }
            else
            {
                this._isEnabled = Boolean(enabled);
                return (this);
            }
        }

        /**
         * [Chainable Property] The name of the group that the Gesture belongs to.
         * @param {string} name A group name.
         * @returns {this | string} Either the property value (if getting), or the Gesture instance (if setting).
         */
        GroupName(name: string): this;
        GroupName(): string;
        GroupName(name?: string): this | string
        {
            return (getOrSetProperty(this, nameof(() => this._groupName), name));
        }

        /**
         * [Chainable Property] The timeout that pointers of the Gesture must all be detected within for the Gesture to be recognized.
         * @param {number} timeout A timeout in milliseconds.
         * @returns {this | number} Either the property value (if getting), or the Gesture instance (if setting).
         */
        RecognitionTimeoutInMs(timeout: number): this;
        RecognitionTimeoutInMs(): number;
        RecognitionTimeoutInMs(timeout?: number): this | number
        {
            return (getOrSetProperty(this, nameof(() => this._recognitionTimeoutInMs), timeout));
        }

        /**
         * [Chainable Property] The timeout that the Gesture must complete by before being automatically cancelled (-1 means no timeout).
         * @param {number} timeout A timeout in milliseconds.
         * @returns {this | number} Either the property value (if getting), or the Gesture instance (if setting).
         */
        CompletionTimeoutInMs(timeout: number): this;
        CompletionTimeoutInMs(): number;
        CompletionTimeoutInMs(timeout?: number): this | number
        {
            return (getOrSetProperty(this, nameof(() => this._completionTimeoutInMs), timeout));
        }

        /**
         * [Chainable Property] The callback that will be invoked when the Gesture starts (ie. when it's been recognized).
         * @param {GestureEventHandler} handler The GestureStarted handler. When the handler is invoked, 'this' will be set to the Gesture instance.
         * @returns {this | GestureEventHandler} Either the property value (if getting), or the Gesture instance (if setting).
         */
        GestureStartedHandler(handler: GestureEventHandler): this;
        GestureStartedHandler(): GestureEventHandler
        GestureStartedHandler(handler?: GestureEventHandler): this | GestureEventHandler
        {
            return (getOrSetProperty(this, nameof(() => this._gestureStartedHandler), handler));
        }

        /**
         * [Chainable Property] The callback that will be invoked when the Gesture ends (when one of its required pointers is lifted).
         * @param {GestureEndedHandler} handler The GestureEnded handler. When the handler is invoked, 'this' will be set to the Gesture instance.
         * @returns {this | GestureEndedHandler} Either the property value (if getting), or the Gesture instance (if setting).
         */
        GestureEndedHandler(handler: GestureEndedHandler): this;
        GestureEndedHandler(): GestureEndedHandler
        GestureEndedHandler(handler?: GestureEndedHandler): this | GestureEndedHandler
        {
            return (getOrSetProperty(this, nameof(() => this._gestureEndedHandler), handler));
        }

        /**
         * [Chainable Property] The callback that will be invoked if the Gesture is cancelled.
         * @param {GestureEventHandler} handler The GestureCancelled handler. When the handler is invoked, 'this' will be set to the Gesture instance.
         * @returns {this | GestureEventHandler} Either the property value (if getting), or the Gesture instance (if setting).
         */
        GestureCancelledHandler(handler: GestureEventHandler): this;
        GestureCancelledHandler(): GestureEventHandler
        GestureCancelledHandler(handler?: GestureEventHandler): this | GestureEventHandler
        {
            return (getOrSetProperty(this, nameof(() => this._gestureCancelledHandler), handler));
        }

        /**
         * [Chainable Property] The callback that will be invoked when any pointer in the [active] Gesture moves.
         * @param {PointerEventHandler} handler A pointerMove handler. When the handler is invoked, 'this' will be set to the Gesture instance.
         * @returns {this | GestureEventHandler} Either the property value (if getting), or the Gesture instance (if setting).
         */
        OnMoveHandler(handler: PointerEventHandler): this;
        OnMoveHandler(): PointerEventHandler;
        OnMoveHandler(handler?: PointerEventHandler): this | PointerEventHandler
        {
            if (handler === undefined)
            {
                return (this._onMoveHandler);
            }
            else
            {
                if (this._targetDomElement === null)
                {
                    throw new MILException("The Target() of the Gesture must be defined before setting the OnMoveHandler()");
                }

                var gesture: Gesture = this; // Note: Don't use 'let' here: it will result in the variable being renamed during compilation which means it won't surface correctly in the debugger
                let onMoveHandler: PointerEventHandler = (handler instanceof Function) ? function onMoveHandlerWrapper(e: PointerEvent)
                {
                    handler.call(gesture, e);

                    // Since we handled the PointerMove event, we prevent it from bubbling [up its parent chain].
                    // However, in order to allow other active gestures with a move handler on _targetDomElement) we use stopPropagation() NOT stopImmediatePropagation(). 
                    // An example of this would be when a 1-touch Pan becomes a 2-touch Zoom [Pan remains active during the Zoom], in which which case we want both gestures
                    // to continue to receive pointerMove events (in particular, we don't want the Pan to prevent the Zoom gesture from receiving pointerMove events).
                    e.stopPropagation();
                } : null;

                if (this._onMoveHandler !== null)
                {
                    this._targetDomElement.removeEventListener("pointermove", this._onMoveHandler);
                }
                if (onMoveHandler !== null)
                {
                    this._targetDomElement.addEventListener("pointermove", onMoveHandler);
                }

                this._onMoveHandler = onMoveHandler;
                return (this);
            }
        }

        /**
         * [Chainable Property] Whether the Gesture captures pointers to its target element (true by default).
         * @param {boolean} capturesPointers Flag.
         * @returns {this | boolean} Either the property value (if getting), or the Gesture instance (if setting).
         */
        CapturesPointers(capturesPointers: boolean): this;
        CapturesPointers(): boolean;
        CapturesPointers(capturesPointers?: boolean): this | boolean
        {
            return (getOrSetProperty(this, nameof(() => this._capturesPointers), capturesPointers));
        }

        /**
         * [ReadOnly Property] The most recent time the Gesture started (was recognized).
         * @returns {number} Result.
         */
        StartedTime(): number
        {
            readOnlyProperty("StartedTime", arguments);
            return (this._startedTime);
        }
        /**
         * [Internal] Sets the most recent time the Gesture started (was recognized).
         * @param {number} time A time.
         * @internal
         */
        startedTime(time: number): void
        {
            this._startedTime = time;
        }

        /**
         * [ReadOnly Property] If the Gesture is currently active, returns the list of PointerID's involved.
         * @returns {string[]} Result.
         */
        ActivePointerList(): string[]
        {
            readOnlyProperty("ActivePointerList", arguments);
            return (this._activePointerList);
        }
        /**
         * [Internal] Sets the pointer IDs that the Gesture was recognized with.
         * @param {string[]} pointerList A list of pointer IDs.
         * @internal
         */
        activePointerList(pointerList: string[]): void
        {
            this._activePointerList = pointerList;
        }

        /**
         *[ReadOnly Property] If the Gesture is currently active, returns the list of pointer type ordinals involved (eg. ["pen:1", "touch:1", "touch:2"]).
         * @returns {string[]} Result.
         */
        ActivePointerTypeOrdinals(): string[]
        {
            readOnlyProperty("ActivePointerTypeOrdinals", arguments);
            return (this._activePointerTypeOrdinals);
        }
        /**
         * [Internal] Sets the pointer type ordinals that the Gesture was recognized with.
         * @param {string[]} pointerTypeOrdinalsList A list of pointer IDs.
         * @internal
         */
        activePointerTypeOrdinals(pointerTypeOrdinalsList: string[]): void
        {
            this._activePointerTypeOrdinals = pointerTypeOrdinalsList;
        }

        /**
         * [Internal] Returns the pointer type ordinal list for the specified permutationIndex (there is one index for each permutation of Gesture.PointerType [see Gesture.PointerTypePermutations]).
         * @param {number} permutationIndex An index value.
         * @returns {string[]} Result.
         * @internal
         */
        getPointerTypeOrdinals(permutationIndex: number): string[]
        {
            return (this._pointerTypeOrdinals[permutationIndex].slice()); // Note: We use slice() just to create a copy of the array
        }

        /**
         * [ReadOnly Property] Returns true if the Gesture is active (is currently a recognized Gesture). 
         * Note that a Gesture can be both simultaneously active and cancelled (aborted).
         * @returns {boolean} Result.
         */
        IsActive(): boolean
        {
            readOnlyProperty("IsActive", arguments);
            return (this._activePointerList.length > 0);
        }

        /** 
         * [ReadOnly Property] Returns true if the Gesture was cancelled (after being recognized).
         * Note: Once set, will remain true until the Gesture is recognized again.
         * @returns {boolean} Result.
         */
        IsCancelled(): boolean
        {
            readOnlyProperty("IsCancelled", arguments);
            return (this._isCancelled);
        }
        /**
         * [Internal] Sets the Gesture.IsCancelled state.
         * @param {boolean} cancelled Flag.
         * @internal
         */
        isCancelled(cancelled: boolean): void
        {
            this._isCancelled = cancelled;
        }

        /** 
         * [ReadOnly Property] Returns the number of pointers that this gesture requires.
         * @returns {number} Result.
         */
        PointerCount(): number
        {
            readOnlyProperty("PointerCount", arguments);
            return (this._pointerTypeOrdinals[0].length);
        }

        /**
         * [Chainable Property] The number of times the Gesture should be repeated in order to be recognized (eg. a double-tap gesture would set this to 2).
         * See also: Gesture.RepeatTimeoutInMs().
         * @param {number} count A count (must be at least 2).
         * @returns {this | number} Either the property value (if getting), or the Gesture instance (if setting).
         */
        RepeatCount(count: number): this;
        RepeatCount(): number;
        RepeatCount(count?: number): this | number
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

                    // If needed, default the RepeatTimeoutInMs to 200ms
                    if (this._repeatTimeoutInMs === 0)
                    {
                        this.RepeatTimeoutInMs(200);
                    }
                }
                return (this);
            }
        }

        /**
         * [Chainable Property] The maximum amount of time (in milliseconds) that can elapse between repetitions of the Gesture in order for the Gesture to be recognized.
         * See also: Gesture.RepeatCount().
         * @param {number} timeout A timeout in milliseconds (must be at least 175).
         * @returns {this | number} Either the property value (if getting), or the Gesture instance (if setting).
         */
        RepeatTimeoutInMs(timeout: number): this;
        RepeatTimeoutInMs(): number;
        RepeatTimeoutInMs(timeout?: number): this | number
        {
            if (timeout === undefined)
            {
                return (this._repeatTimeoutInMs);
            }
            else
            {
                // Note: Timeouts less than 175ms are too small (most users typically can't double/triple-tap that fast, so the gesture would go unrecognized in too many instances)
                this._repeatTimeoutInMs = Math.min(1000, Math.max(175, timeout));

                // If needed, default the RepeatCount to 2
                if (this._repeatCount === 0)
                {
                    this.RepeatCount(2);
                }
                return (this);
            }
        }

        /**
         * [Internal] [Chainable Property] The current number of times the Gesture has been repeated (at runtime).
         * @param {number} count A count.
         * @returns {this | number} Either the property value (if getting), or the Gesture instance (if setting).
         * @internal
         */
        repeatOccurrenceCount(count: number): this;
        repeatOccurrenceCount(): number;
        repeatOccurrenceCount(count?: number): this | number
        {
            return (getOrSetProperty(this, nameof(() => this._repeatOccurrenceCount), count));
        }

        /**
         * [Internal] [Chainable Property] The last time the Gesture (if it has a RepeatCount greater than 1) was recognized (at runtime).
         * @param {number} time A time.
         * @returns {this | number} Either the property value (if getting), or the Gesture instance (if setting).
         * @internal
         */
        lastRepeatRecognitionTime(time: number): this;
        lastRepeatRecognitionTime(): number;
        lastRepeatRecognitionTime(time?: number): this | number
        {
            return (getOrSetProperty(this, nameof(() => this._lastRepeatRecognitionTime), time));
        }

        /**
         * [Internal] Sets the time the Gesture last ended.
         * @param {number} time A time.
         * @internal
         */
        endedTime(time: number): void
        {
            getOrSetProperty(this, nameof(() => this._endedTime), time);
        }

        /**
         * [Chainable Property] Whether the end of the Gesture should trigger a gesture-recognition check.
         * This enables looking for another gesture that may still be applicable, ie. with the one-or-more pointers that may 
         * still be down (for example, to allow a 2-finger zoom to become a 1-finger pan when the first zoom finger is lifted).
         * @param {boolean} check Flag
         * @returns {this | boolean} Either the property value (if getting), or the Gesture instance (if setting).
         */
        CheckForGesturesOnEnd(check: boolean): this;
        CheckForGesturesOnEnd(): boolean;
        CheckForGesturesOnEnd(check?: boolean): this | boolean
        {
            return (getOrSetProperty(this, nameof(() => this._checkForGesturesOnEnd), check));
        }

        // PORT: Do we still need this property?
        /**
         * [Chainable Property] Whether the Gesture will allow (the default) or prevent event propagation for Target.
         * Note: This applies regardless of whether the Gesture is recognized.
         * @param {boolean} allow Flag
         * @returns {this | boolean} Either the property value (if getting), or the Gesture instance (if setting).
         */
        AllowEventPropagation(allow: boolean): this;
        AllowEventPropagation(): boolean;
        AllowEventPropagation(allow?: boolean): this | boolean
        {
            return (getOrSetProperty(this, nameof(() => this._allowEventPropagation), allow));
        }

        /** 
         * Remove/re-add the Gesture.Target to change its z-order to "top most" [z-order = order added to SVG]. 
         * @returns {D3SingleSelection} A d3 selection of Gesture.Target(). 
         */
        BringTargetToFront(): D3SingleSelection
        {
            let gesture: Gesture = this;
            let targetDomElement: DomElement = gesture.Target();
            let svgInfo: SVGInfo = getSvgInfo(targetDomElement);
            let gDomElement: SVGGElement = svgInfo.gDomElement;

            gDomElement.removeChild(targetDomElement);
            gDomElement.appendChild(targetDomElement);

            return (d3.select(targetDomElement));
        }

        /** Capture all pointers used by this Gesture to the Gesture's target. */
        SetPointerCapture(): void
        {
            let gesture: Gesture = this;

            if (gesture.CapturesPointers())
            {
                gesture.ActivePointerList().forEach(function (pointerID)
                {
                    // Note: Calling setPointerCapture() will prevent any further bubbling of events
                    let pointerId: number = getPointerDownEvent(pointerID, gesture.Target()).pointerId;
                    let targetElementID: string = getTargetElementID(gesture.Target());

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

                    log("SET pointer-capture for " + pointerID + " (" + pointerId + ") on " + targetElementID, FeatureNames.PointerCapture);
                });
            }
        }

        /** Releases capture of all pointers used by the Gesture from the Gesture's target. */
        ReleasePointerCapture(): void
        {
            let gesture: Gesture = this;

            if (gesture.CapturesPointers() && gesture._isCapturing)
            {
                gesture.ActivePointerList().forEach(function (pointerID: string)
                {
                    let pointerId: number = getPointerDownEvent(pointerID, gesture.Target()).pointerId;
                    let targetElementID: string = getTargetElementID(gesture.Target());

                    gesture.Target().releasePointerCapture(pointerId);
                    gesture._isCapturing = false;

                    // Check if we're trying to releasePointerCapture [on an element/pointer] without first capturing it
                    if (!_activePointerCaptures[targetElementID] || (_activePointerCaptures[targetElementID].indexOf(pointerID) === -1))
                    {
                        throw new MILException("Attempt to release pointer capture of '" + pointerID + "' from element '" + targetElementID + "' when it has not been captured");
                    }

                    _activePointerCaptures[targetElementID].splice(_activePointerCaptures[targetElementID].indexOf(pointerID), 1);
                    if (_activePointerCaptures[targetElementID].length === 0)
                    {
                        delete _activePointerCaptures[targetElementID];
                    }

                    log("RELEASED pointer-capture for " + pointerID + " (" + pointerId + ") on " + targetElementID, FeatureNames.PointerCapture);
                });
            }
        }

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
        startCompletionTimeout(timeoutInMs: number, timeoutType: string, propagateEventsOnTimeout: boolean, onTick?: VoidCallback): void
        {
            let gesture: Gesture = this;

            if (gesture._completionTimerID !== -1)
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

                    if (gesture._endedTime === 0)
                    {
                        gesture.Cancel(timeoutType + " timeout [" + timeoutInMs + "ms] expired"); // timeoutType will be either "completion" or "repeat"

                        // Look for other gestures that may apply to the target of the [timed-out] gesture
                        let recognitionResult: GestureRecognitionResult = recognizeGesture(gesture.Target(), 0, 0, false);
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

        /** 
         * [Internal] Stops the timer started with startCompletionTimeout(). 
         * @internal
         */
        stopCompletionTimeout()
        {
            if (this._completionTimerID !== -1)
            {
                clearTimeout(this._completionTimerID);
                this._completionTimerID = -1;
            }
        }

        /**
         * Returns the name of the pointer (eg. "touch:2", meaning the second touch) at the specified ordinal (eg. "{P3}", meaning the third pointer in the Gesture).
         * Returns null if pointerOrdinal is not an ordinal specifier.
         * Note: If the Gesture.PointerType() includes an 'or' operator ('|') then the value of a given ordinal can change depending on which permutation of pointers invoked the Gesture. 
         * @param {string} pointerOrdinal A pointer ordinal of the form "{Pn}", where n is 1..9.
         * @returns {string | null} Result.
         */
        GetPointerNameByOrdinal(pointerOrdinal: string): string | null
        {
            let matches = pointerOrdinal.match("{P([1-9])}");

            if (matches !== null)
            {
                let ordinal = Number(matches[1]);

                if (this._activePointerTypeOrdinals.length === 0)
                {
                    throw new MILException("Unable to determine the pointer name for ordinal identifier '" + pointerOrdinal + "' because gesture '" + this.Name() + "' is not active");
                }

                if (ordinal <= this._activePointerTypeOrdinals.length)
                {
                    return (this._activePointerTypeOrdinals[ordinal - 1]);
                }
                else
                {
                    throw new MILException("Ordinal identifier '" + pointerOrdinal + "' is invalid for gesture '" + this.Name() + "', which only uses " + this.PointerCount() + " pointer(s)");
                }
            }
            else
            {
                return (null);
            }
        }

        /**
         * Returns the pointer ID (eg. "PointerID_pen_123") for the specified pointer type, which can be in any of these forms: "touch:2" [meaning the second touch pointer that made contact],
         * "touch" [which is the same as "touch:1"], or "{P1}" [meaning pointer ordinal #1 in Gesture.PointerType()]. Throws if the Gesture does not have a pointer of the specified type.
         * @param {string} pointerType A pointer type.
         * @returns {string} A pointer ID.
         */
        GetPointerID(pointerType: string): string
        {
            if (!pointerType)
            {
                throw new MILException("The pointerType parameter is missing or invalid");
            }

            // If pointerType is of the form "{Pn}", then return the pointer at ordinal n (eg. for a gesture defined as "pen+touch:2", ordinal 1 = "pen:1", 2 = "touch:1", 3 = "touch:2").
            // Using ordinal notation allows calling code to be written more generically (if so desired) - eg. allowing a gesture to be redefined to use different pointer types with fewer code changes.
            let pointerName: string = this.GetPointerNameByOrdinal(pointerType);
            if (pointerName !== null)
            {
                return (this.GetPointerID(pointerName));
            }

            let targetType: string = pointerType;
            let targetInstance: number = 1;
            let instance: number = 0;

            // Note: pointerType can be of the form "touch:2" meaning "the second touch pointer that made contact"
            let parts: string[] = pointerType.split(":");
            targetType = parts[0];
            targetInstance = (parts.length === 1) ? 1 : +parts[1];

            for (let i = 0; i < this._activePointerList.length; i++)
            {
                let pointerID: string = this._activePointerList[i];

                if ((pointerID.indexOf(targetType) !== -1) || (targetType === "any") || ((targetType === "hover") && canHover(pointerID, this.Target())))
                {
                    if (++instance === targetInstance)
                    {
                        return (pointerID);
                    }
                }
            }

            throw new MILException(`Gesture '${this.Name()}' (defined as '${this.PointerType()}') does not have a pointer of type '${pointerType}'`);
        }

        /**
         * Returns the distance (in pixels) between 2 pointers in the [active] Gesture.
         * @param {string} pointerType1 The first pointer type (eg. "{P1}").
         * @param {string} pointerType2 The second pointer type (eg. "{P2}").
         * @returns {number} Result.
         */
        GetDistance(pointerType1: string, pointerType2: string): number
        {
            let e1: PointerEvent = getLatestPointerMoveEvent(this.GetPointerID(pointerType1), this.Target());
            let e2: PointerEvent = getLatestPointerMoveEvent(this.GetPointerID(pointerType2), this.Target());
            let pixelDistance: number = Utils.GetDistanceBetweenEvents(e1, e2);
            return (pixelDistance);
        }

        /**
         * Given a pointerType (eg. "{P1}", "touch:2") returns the point (in screen coordinates) where that pointer started (PointerDown).
         * @param {string} pointerType A pointer type.
         * @returns {Point} Result.
         */
        GetStartScreenPoint(pointerType: string): Point
        {
            // Note: e.clientX/Y are relative to [the top-left (0,0)] of the document window; if the window (and/or container(s) of
            //       the SVG) has been scrolled, the caller will need to adjust for this (eg. by adding window.pageXOffset/pageYOffset)
            let e: PointerEvent = getPointerDownEvent(this.GetPointerID(pointerType), this.Target());
            return ({ x: e.clientX, y: e.clientY });
        }

        /**
         * Given a pointerType (eg. "{P1}", "touch:2") returns the point (in svg space) where that pointer started (PointerDown).
         * @param {string} pointerType A pointer type.
         * @returns {Point} Result.
         */
        GetStartSvgPoint(pointerType: string): Point
        {
            let e: PointerEvent = getPointerDownEvent(this.GetPointerID(pointerType), this.Target());
            let svgInfo: SVGInfo = getSvgInfo(e.target as DomElement);

            // Since svgInfo.gDomElement can be transformed (ie. zoomed and/or panned), we need to transform the e.clientX/Y point into the coordinate space of the [potentially transformed] 'g' element
            // Note: e.clientX/Y are relative to [the top-left (0,0)] of the document window
            let pointInTransformSpace: Point = TransposePointer(e, svgInfo.gDomElement);
            return ({ x: pointInTransformSpace.x, y: pointInTransformSpace.y });
        }

        /**
         * Given a pointerType (eg. "{P1}", "touch:2") returns the point (in screen coordinates) where that pointer started (PointerDown).
         * @param {string} pointerType A pointer type.
         * @returns {Point} Result.
         */
        GetCurrentScreenPoint(pointerType: string): Point
        {
            // Note: e.clientX/Y are relative to [the top-left (0,0)] of the document window
            let e: PointerEvent = getLatestPointerMoveEvent(this.GetPointerID(pointerType), this.Target());
            return ({ x: e.clientX, y: e.clientY });
        }

        /**
         * Returns the current position (in svg coordinates) of the specified pointer type (eg. "{P1}", "touch:2").
         * @param {string} pointerType A pointer type.
         * @returns {Point} Result.
         */
        GetCurrentSvgPoint(pointerType: string): Point
        {
            let e: PointerEvent = getLatestPointerMoveEvent(this.GetPointerID(pointerType), this.Target());
            let svgInfo: SVGInfo = getSvgInfo(e.target as DomElement);

            // Since svgInfo.gDomElement can be transformed (ie. zoomed and/or panned), we need to transform the e.clientX/Y point into the coordinate space of the [potentially transformed] 'g' element
            let pointInTransformSpace: Point = TransposePointer(e, svgInfo.gDomElement);
            return (pointInTransformSpace);
        }

        /**
         * Returns the initial pointerDown event for the specified pointer type (eg. "{P1}", "touch:2").
         * @param {string} pointerType A pointer type.
         * @returns {PointerEvent} Result.
         */
        GetStartEvent(pointerType: string): PointerEvent
        {
            let e: PointerEvent = getPointerDownEvent(this.GetPointerID(pointerType), this.Target());
            return (e);
        }

        /**
         * Returns the latest pointerMove event for the specified pointer type (eg. "{P1}", "touch:2").
         * @param {string} pointerType A pointer type.
         * @returns {PointerEvent} Result.
         */
        GetCurrentEvent(pointerType: string): PointerEvent
        {
            let e: PointerEvent = getLatestPointerMoveEvent(this.GetPointerID(pointerType), this.Target());
            return (e);
        }

        /**
         * When pointerType is supplied, creates a new Ink instance for the Gesture. Otherwise, returns the latest Ink instance created by the Gesture.
         * @param {string} pointerType The pointer type (eg. "touch:2") that will emit the ink. This pointer type must identify a single pointer in the Gesture.
         * @returns {Ink} Either the newly created or the last created Ink instance.
         */
        Ink(pointerType: string): Ink;
        Ink(): Ink;
        Ink(pointerType?: string): Ink 
        {
            if (pointerType === undefined)
            {
                return (this._ink);
            }
            else
            {
                let pointerID: string = this.GetPointerID(pointerType);
                let e: PointerEvent = getPointerDownEvent(pointerID, this.Target());

                if (_inkCompletePathPointData[pointerID] !== undefined)
                {
                    throw new MILException("Inking has already started for gesture '" + this.Name() + "'");
                }

                _inkCurrentPathPointData[pointerID] = []; // Reset point data
                _inkCompletePathPointData[pointerID] = []; // Reset point data

                this._ink = new Ink(pointerID).ParentGesture(this);

                return (this._ink);
            }
        }

        /**
         * [Internal] Sets the latest Ink created by the Gesture.
         * @param {Ink | null} newInk An Ink instance (or null) to be assigned to the Gesture.
         * @internal
         */
        ink(newInk: Ink | null): void
        {
            this._ink = newInk;
        }

        /**
         * Combines the supplied Inks into a single Ink, which will have a new [convex] hull that covers the combined Ink paths.
         * Returns the new (combined) Ink instance, or null if inksToCombine is empty.
         * @param {Ink[]} inksToCombine The array of Inks to combine.
         * @param {string} className The name of the CSS class to apply to the combined ink.
         * @param {boolean} [makeInkPathMatchHull] [Optional] When true, the path of the new ink will match the new [convex] hull [eg. when combining 2 paths that are "grouping containers"]
         * @returns {Ink | null} The resulting [new] combined Ink.
         */
        CombineInks(inksToCombine: Ink[], className: string, makeInkPathMatchHull?: boolean): Ink | null
        {
            if (inksToCombine.length === 0)
            {
                return (null);
            }

            let svgInfo: SVGInfo = getSvgInfo(inksToCombine[0].Path());
            let dInk: string = "", dHull: string = "";
            let allPathPointArrays: Point[][] = []; // Array of arrays of {x, y} points
            let allVertices: XY[] = []; // Array of [x, y] arrays
            let resizeGesturePointerType: string = "";
            let onResizeCompleteHandler: InkEventHandler = null;
            let inkCount: number = 0;

            inksToCombine.forEach(function (ink: Ink)
            {
                let pathDomElement: DomElement = ink.Path().node();
                let inkPathPointsCollection: Point[][] = pathDomElement.__MILPathPointsCollection__ as Point[][];

                dInk += pathDomElement.getAttribute("d");

                for (let i = 0; i < inkPathPointsCollection.length; i++)
                {
                    let pathPoints: Point[] = inkPathPointsCollection[i];
                    let vertices: XY[] = d3.range(pathPoints.length).map(function (d: number) { return ([pathPoints[d].x, pathPoints[d].y]); });

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

            let inkPath: D3SingleSelection = svgInfo.gSelection.append("path");
            let hullPath: D3SingleSelection = svgInfo.gSelection.append("path"); // Must add this AFTER adding the [new] inkPath (so that the Hull's z-order is higher)
            let hullVertices: XY[] = d3.polygonHull(allVertices); // Produces a convex hull
            let hullPoints: Point[] = Utils.ConvertXYPointsToPoints(hullVertices);
            let hullColor: string = inksToCombine[0].HullColor();

            // Note: We don't simply use _inkLineGenerator to create the hull 'd' in order to match how the hullPath
            //       is created in ink_consolidatePaths() [and how it's subsequently processed by translateHullPath()]
            for (let i = 0; i < hullPoints.length; i++)
            {
                dHull += (!dHull ? "M " : " L ") + hullPoints[i].x + " " + hullPoints[i].y;
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
                let sampledHullPoints: SVGPoint[] = Utils.SamplePointsFromPath(inkPath.node() as SVGPathElement, false, 5);
                if (sampledHullPoints.length > hullPoints.length)
                {
                    dHull = "";
                    for (let i = 0; i < sampledHullPoints.length; i++)
                    {
                        dHull += (!dHull ? "M " : " L ") + sampledHullPoints[i].x + " " + sampledHullPoints[i].y;
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

            let newInk: Ink = new Ink(null).Class(className).ParentGesture(this).IsNonDrawing(false).HullType(InkHullType.Convex).HullColor(hullColor);

            newInk.setHullAndPath(hullPath, inkPath, hullPoints); // Port: Added

            // If needed, ensure re-creation of the resize gesture
            if (resizeGesturePointerType)
            {
                newInk.ResizeWith(resizeGesturePointerType);
                newInk.OnResizeCompleteHandler(onResizeCompleteHandler);
            }

            this._ink = newInk;
            MIL._inks.push(newInk); // Note: Must be explicitly removed via Ink.Delete()

            log(allPathPointArrays.length + " Ink paths combined by gesture '" + this.Name() + "'");

            return (newInk);
        }

        /**
         * Cancels (stops) the Gesture (if it's active).
         * @param {string} reason The reason why the gesture was cancelled.
         */
        Cancel(reason: string): void
        {
            if (!this.IsActive())
            {
                // It's OK to cancel an inactive gesture: setting a gesture as cancelled is how recognizeGesture() [et al] flags certain gestures to be skipped
            }

            this._isCancelled = true;
            // Note: We don't reset this._activePointerList here, we'll let the normal removePointer() pathway do that

            // Is the gesture currently in the process of creating an Ink?
            if ((this._ink !== null) && (this._ink.Path() === null))
            {
                this._ink.Cancel();
                this._ink = null;
            }

            log("Gesture '" + this.Name() + "' cancelled (reason: " + (reason || "[None]") + ")");

            if (this.GestureCancelledHandler() !== null)
            {
                this.GestureCancelledHandler().call(this, (reason !== undefined) ? reason : null);
            }

            if (this._onMoveHandler !== null)
            {
                this._targetDomElement.removeEventListener("pointermove", this._onMoveHandler);
                this._onMoveHandler = null;
            }

            this.ReleasePointerCapture();
        }

        /**
         * [Private Method] Returns true if a permutation of targetPointerType [other than itself] exists in pointerTypePermutations.
         * @param {string} targetPointerType A pointer type (eg. "pen+touch")
         * @param {string[]} pointerTypePermutations An array of pointer types (eg. ["touch+pen", "pen+touch"]).
         * @returns {boolean} Result.
         */
        private isExistingPointerTypePermutation(targetPointerType: string, pointerTypePermutations: string[]): boolean
        {
            let permutationExists: boolean = false;
            let targetGroups: string[] = targetPointerType.split("+");
            let targetIndex: number = pointerTypePermutations.indexOf(targetPointerType);

            for (let i = 0; i < pointerTypePermutations.length; i++)
            {
                let groups: string[] = pointerTypePermutations[i].split("+");

                if ((i === targetIndex) || (targetGroups.length !== groups.length))
                {
                    continue;
                }

                for (let g = 0; g < targetGroups.length; g++)
                {
                    let matchIndex = groups.indexOf(targetGroups[g]);
                    if (matchIndex !== -1)
                    {
                        groups.splice(matchIndex, 1);
                    }
                }

                if (groups.length === 0)
                {
                    permutationExists = true;
                    break;
                }
            }
            return (permutationExists);
        }

        /**
         * [Private Method] Given a pointer type specifier (eg. "pen|touch+touch"), returns all possible [and logically unique] permutations (there will only be more than one permutation if pointerType includes the 'or' operator (|)).
         * Example (for illustration only): A pointerType of "pen|touch:2+mouse|touch" will return ["pen+mouse", "pen+touch", "touch:2+mouse", "touch:2+touch"].
         * @param {string} pointerType A pointer type specifier.
         * @returns {string[]} Result.
         */
        private permutePointerType(pointerType: string): string[]
        {
            if (pointerType.indexOf("|") === -1)
            {
                // Only or-style pointerType values result in permutations
                return ([pointerType]);
            }
            else
            {
                let andGroups: string[] = pointerType.split("+"); // Note: There may not be a "+"
                let pointerTypePermutations: string[] = [];

                for (let g = 0; g < andGroups.length; g++)
                {
                    let initialAdd: boolean = (pointerTypePermutations.length === 0);
                    let andGroup: string = andGroups[g];

                    if (andGroup.indexOf("|") === -1)
                    {
                        // A "non-or" group (eg. "touch:2")
                        if (initialAdd)
                        {
                            pointerTypePermutations.push(andGroup);
                        }
                        else
                        {
                            // Add new permutations
                            for (let i = 0; i < pointerTypePermutations.length; i++)
                            {
                                pointerTypePermutations[i] += "+" + andGroup;
                            }
                        }
                    }
                    else
                    {
                        // An "or" group (eg. "touch|pen:2")
                        let types: string[] = andGroup.split("|");

                        if (andGroup.indexOf("any") !== -1)
                        {
                            throw new MILException("Invalid pointerType '" + andGroup + "'; the pointerType 'any' is invalid when using the 'or' (|) specifier");
                        }

                        for (let type in types)
                        {
                            let parts: string[] = type.split(":");
                            let instanceCount: number = (parts.length === 2) ? +parts[1] : 1;

                            if ((parts.length > 2) || isNaN(instanceCount))
                            {
                                throw new MILException("Invalid pointerType '" + andGroup + "'");
                            }
                        }

                        if (initialAdd)
                        {
                            // Example: "touch:2|pen" becomes "touch:2", "pen"
                            for (let t = 0; t < types.length; t++)
                            {
                                pointerTypePermutations.push(types[t]);
                            }
                        }
                        else
                        {
                            // Add new permutations
                            let existingPermutationCount: number = pointerTypePermutations.length;
                            for (let i = 0; i < existingPermutationCount; i++)
                            {
                                for (let t = 0; t < types.length; t++)
                                {
                                    let newPermutation: string = pointerTypePermutations[i] + "+" + types[t];
                                    pointerTypePermutations.push(newPermutation);
                                }
                            }
                            // Remove the previous [partial] permutations
                            pointerTypePermutations.splice(0, existingPermutationCount);
                        }
                    }
                }

                // Remove any logical duplicates [eg. "pen+touch" is a duplicate of "touch+pen"]
                for (let i = pointerTypePermutations.length - 1; i >= 0; i--)
                {
                    if (this.isExistingPointerTypePermutation(pointerTypePermutations[i], pointerTypePermutations))
                    {
                        pointerTypePermutations.splice(i, 1);
                    }
                }

                return (pointerTypePermutations);
            }
        }
    }
}