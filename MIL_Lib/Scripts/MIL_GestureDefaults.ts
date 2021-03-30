// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

namespace MIL
{
    // Type aliases
    type GestureDefaultsType = typeof GestureDefaults;

    // PORT: This is essentially a static class: is there a better way to write this code?
    /**
     * The GestureDefaults namespace. 
     * Setting GestureDefault properties saves having to re-specify the corresponding Gesture properties [repetitively] each time CreateGesture() is called.
     */
    export namespace GestureDefaults
    {
        let _defaults:
        {
            targetDomElement: DomElement,
            startedHandler: GestureEventHandler,
            endedHandler: GestureEndedHandler,
            cancelledHandler: GestureEventHandler,
            groupName: string,
            recognitionTimeoutInMs: number,
            _parentObj: GestureDefaultsType // So that getOrSetProperty() can return the object that "owns" _defaults
        } =
        {
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
        export function Reset(): GestureDefaultsType
        {
            _defaults.targetDomElement = null;
            _defaults.startedHandler = null;
            _defaults.endedHandler = null;
            _defaults.cancelledHandler = null;
            _defaults.groupName = "default";
            _defaults.recognitionTimeoutInMs = 0;
            _defaults._parentObj = this;
            return (this);
        }

        /**
         * [Chainable Property] The default target DOM element for a gesture.
         * @param {TargetDomElement} [targetElement] [Optional] A DOM element.
         * @returns {GestureDefaultsType | DomElement} Either the property value (if getting), or the GestureDefaults namespace (if setting).
         */
        export function Target(targetElement: TargetDomElement): GestureDefaultsType;
        export function Target(): DomElement;
        export function Target(targetDomElement?: TargetDomElement): GestureDefaultsType | DomElement
        {
            if (targetDomElement === undefined)
            {
                return (_defaults.targetDomElement);
            }
            else
            {
                let domElement = Utils.GetDomElement(targetDomElement);

                if (!document.body.contains(domElement))
                {
                    throw new MILException("The specified targetDomElement does not exist in the document body");
                }

                tagWithTargetElementID(domElement);
                _defaults.targetDomElement = domElement;
                return (this);
            }
        }

        /**
         * [Chainable Property] The default GestureStarted handler.
         * @param {GestureEventHandler} [handler] [Optional] A GestureStarted event handler.
         * @returns {GestureDefaultsType | GestureEventHandler} Either the property value (if getting), or the GestureDefaults namespace (if setting).
         */
        export function StartedHandler(handler: GestureEventHandler): GestureDefaultsType;
        export function StartedHandler(): GestureEventHandler;
        export function StartedHandler(handler?: GestureEventHandler): GestureDefaultsType | GestureEventHandler
        {
            return (getOrSetProperty(_defaults, nameof(() => _defaults.startedHandler), handler));
        }

        /**
         * [Chainable Property] The default GestureEnded handler.
         * @param {GestureEndedHandler} [handler] [Optional] A GestureEnded event handler.
         * @returns {GestureDefaultsType | GestureEndedHandler} Either the property value (if getting), or the GestureDefaults namespace (if setting).
         */
        export function EndedHandler(handler: GestureEndedHandler): GestureDefaultsType;
        export function EndedHandler(): GestureEndedHandler;
        export function EndedHandler(handler?: GestureEndedHandler): GestureDefaultsType | GestureEndedHandler
        {
            return (getOrSetProperty(_defaults, nameof(() => _defaults.endedHandler), handler));
        }

        /**
         * [Chainable Property] The default GestureCancelled handler.
         * @param {GestureEventHandler} [handler] [Optional] A GestureCencelled event handler.
         * @returns {GestureDefaultsType | GestureEventHandler} Either the property value (if getting), or the GestureDefaults namespace (if setting).
         */
        export function CancelledHandler(handler: GestureEventHandler): GestureDefaultsType;
        export function CancelledHandler(): GestureEventHandler;
        export function CancelledHandler(handler?: GestureEventHandler): GestureDefaultsType | GestureEventHandler
        {
            return (getOrSetProperty(_defaults, nameof(() => _defaults.cancelledHandler), handler));
        }

        /**
         * [Chainable Property] The default gesture recognition timeout (in milliseocnds).
         * @param {number} [timeoutInMs] [Optional] A number in the range n >= 0.
         * @returns {GestureDefaultsType | number} Either the property value (if getting), or the GestureDefaults namespace (if setting).
         */
        export function RecognitionTimeoutInMs(timeoutInMs: number): GestureDefaultsType;
        export function RecognitionTimeoutInMs(): number;
        export function RecognitionTimeoutInMs(timeoutInMs?: number): GestureDefaultsType | number
        {
            return (getOrSetProperty(_defaults, nameof(() => _defaults.recognitionTimeoutInMs), timeoutInMs));
        }

        /**
         * [Chainable Property] The default gesture group name.
         * @param {string} [name] [Optional] A name.
         * @returns {GestureDefaultsType | string} Either the property value (if getting), or the GestureDefaults namespace (if setting).
         */
        export function GroupName(name: string): GestureDefaultsType;
        export function GroupName(): string;
        export function GroupName(name?: string): GestureDefaultsType | string
        {
            return (getOrSetProperty(_defaults, nameof(() => _defaults.groupName), name));
        }
    }
}