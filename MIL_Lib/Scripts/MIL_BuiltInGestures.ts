namespace MIL
{
    /** 
     * The BuiltInGestures namespace. 
     * This namespace provides a quick way to create basic Gestures (trading granular control for simplicity). 
     */
    export namespace BuiltInGestures
    {
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
        export function TapAndHold(gestureName: string, targetElement: TargetDomElement, pointerType: string, onTapAndHold: GestureEventHandler, holdTimeoutInMs: number = 333, maximumDistanceInPx: number = 10): Gesture
        {
            gestureName = ensureNameCanBeMadeUnique(gestureName);

            let timerID: number = -1;
            let tapStartPoint: Point = null;

            let tapAndHoldGesture: Gesture = CreateGesture(gestureName, true)
                .Target(targetElement)
                .PointerType(pointerType)
                .GestureStartedHandler(function ()
                {
                    let gesture: Gesture = this;

                    tapStartPoint = gesture.GetCurrentScreenPoint("{P1}");
                    timerID = setTimeout(function ()
                    {
                        if (!gesture.IsActive() || (timerID === -1))
                        {
                            return;
                        }

                        let distanceInPixels: number = Utils.GetDistanceBetweenPoints(tapStartPoint, gesture.GetCurrentScreenPoint("{P1}"));

                        if (distanceInPixels < maximumDistanceInPx)
                        {
                            if (onTapAndHold)
                            {
                                onTapAndHold.call(gesture);
                            }
                        }
                        else
                        {
                            gesture.Cancel("The pointer moved more [" + distanceInPixels.toFixed(2) + "px] than the maximum specified [" + maximumDistanceInPx + "px])");
                        }
                        timerID = -1;
                    }, holdTimeoutInMs);
                })
                .GestureEndedHandler(function ()
                {
                    let gesture: Gesture = this;

                    if (timerID !== -1)
                    {
                        clearTimeout(timerID);
                        timerID = -1;
                        gesture.Cancel("The tap-and-hold ended before the hold timeout [" + holdTimeoutInMs + "ms] elapsed");
                    }
                });

            return (tapAndHoldGesture)
        }

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
        export function Tap(gestureName: string, targetElement: TargetDomElement, pointerType: string, onTap: GestureEventHandler, completionTimeoutInMs: number = 150, maximumDistanceInPx: number = 5): Gesture
        {
            gestureName = ensureNameCanBeMadeUnique(gestureName);

            let tapStartPoint: Point = null;

            let tapGesture: Gesture = CreateGesture(gestureName, true)
                .Target(targetElement)
                .PointerType(pointerType)
                .CompletionTimeoutInMs(completionTimeoutInMs) // If the gesture does not end before this timeout, the gesture will be cancelled
                .GestureStartedHandler(function ()
                {
                    let gesture: Gesture = this;
                    tapStartPoint = gesture.GetCurrentScreenPoint("{P1}");
                })
                .GestureEndedHandler(function ()
                {
                    let gesture: Gesture = this;
                    let distanceInPixels: number = Utils.GetDistanceBetweenPoints(tapStartPoint, gesture.GetCurrentScreenPoint("{P1}"));

                    if (distanceInPixels < maximumDistanceInPx)
                    {
                        if (onTap)
                        {
                            onTap.call(gesture);
                        }
                    }
                    else
                    {
                        log("Tap gesture '" + gesture.Name() + "' failed (reason: the pointer moved more [" + distanceInPixels.toFixed(2) + "px] than the maximum specified [" + maximumDistanceInPx + "px])");
                    }
                });

            return (tapGesture);
        }

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
        export function ShapeRecognizer(gestureName: string, targetElement: TargetDomElement, pointerType: string, minPercentMatch: number, onShapeRecognized: ShapeRecognizedHandler,
            cometTailClassName?: string, shapeList?: RecognizableShape[], targetWidth?: number, targetHeight?: number): Gesture
        {
            gestureName = ensureNameCanBeMadeUnique(gestureName);

            if (shapeList)
            {
                shapeList.forEach(function (v: RecognizableShape, i)
                {
                    if (RecognizableShape[i] === undefined)
                    {
                        throw new MILException("shapeNameList[" + i + "] (" + v + ") is invalid");
                    }
                });
            }

            let shapeRecognitionGesture: Gesture = CreateGesture(gestureName, true)
                .Target(targetElement)
                .PointerType(pointerType)
                .GestureStartedHandler(function ()
                {
                    let gesture: Gesture = this;
                    gesture.Ink("{P1}").IsNonDrawing(true).CometTailClass(cometTailClassName === undefined ? "" : cometTailClassName).Start();
                })
                .GestureEndedHandler(function ()
                {
                    let gesture: Gesture = this;
                    let gDomElement: SVGGElement = DebugFeature(FeatureNames.ShapeRecognition) ? getSvgInfo(targetElement).gDomElement : undefined;
                    let shape: RecognizableShape = RecognizeShape(gesture.Ink().PathPoints(), minPercentMatch, targetWidth, targetHeight, gDomElement, shapeList);

                    if (onShapeRecognized && (shape !== null))
                    {
                        onShapeRecognized.call(gesture, shape);
                    }
                });

            return (shapeRecognitionGesture);
        }

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
        export function RadialSwipe(gestureName: string, targetElement: TargetDomElement, pointerType: string, numRadialSegments: number, minDistance: number, onSwipe: RadialSwipeHandler, getCometTailClassName?: () => string): Gesture
        {
            gestureName = ensureNameCanBeMadeUnique(gestureName);

            let radialSwipeGesture: Gesture = CreateGesture(gestureName, true)
                .Target(targetElement)
                .PointerType(pointerType)
                .GestureStartedHandler(function ()
                {
                    let gesture: Gesture = this;
                    let cometTailClassName: string = (getCometTailClassName && getCometTailClassName()) ? getCometTailClassName() : "";
                    gesture.Ink("{P1}").IsNonDrawing(true).CometTailClass(cometTailClassName).CometTailDurationInMs(200).Start();
                })
                .GestureEndedHandler(function ()
                {
                    let gesture: Gesture = this;
                    let ink: Ink = gesture.Ink();
                    let swipeResult: RadialSwipeResult = RecognizeRadialSwipe(ink.PathPoints(), numRadialSegments, minDistance);

                    if (swipeResult && onSwipe)
                    {
                        onSwipe.call(gesture, swipeResult);
                    }
                });

            return (radialSwipeGesture);
        }

        /**
         * Creates a circular-dial Gesture that detects changes in angle (eg. rotation) around the center of the specified targetElement.
         * @param {string} gestureName The name of the Gesture.
         * @param {TargetDomElement} targetElement The DOM element the Gesture will target.
         * @param {string} pointerType A pointer type.
         * @param {AngleChangedHandler} onAngleChanged A handler called each time the angle changes (ie. the pointer moves resulting in a different angle).
         * @returns {Gesture} Result.
         */
        export function CircularDial(gestureName: string, targetElement: TargetDomElement, pointerType: string, onAngleChanged: AngleChangedHandler): Gesture
        {
            gestureName = ensureNameCanBeMadeUnique(gestureName);

            let previousHeading: number = -361; // PORT: This variable was added.

            let circularDialGesture: Gesture = CreateGesture(gestureName, true)
                .Target(targetElement)
                .PointerType(pointerType)
                .GestureStartedHandler(function ()
                {
                    let gesture: Gesture = this;
                    gesture.OnMoveHandler(function ()
                    {
                        let centroidPoint: Point = Utils.GetCentroidPoint(gesture.Target());
                        let heading: number = Utils.GetHeadingFromPoints(centroidPoint, gesture.GetCurrentSvgPoint("{P1}"));

                        if (onAngleChanged && (previousHeading !== heading))
                        {
                            onAngleChanged.call(gesture, heading);
                        }

                        previousHeading = heading;
                    });
                });

            return (circularDialGesture);
        }

        /**
         * [Private Method] If needed, modifies the supplied gestureName so that it can be made unique.
         * @param {string} gestureName A Gesture name.
         * @returns {string} Result.
         */
        function ensureNameCanBeMadeUnique(gestureName: string): string
        {
            if (gestureName[gestureName.length - 1] !== "*")
            {
                gestureName += "*"; // The '*' will get replaced with a unique ID by CreateGesture()
            }
            return (gestureName);
        }
    }
}