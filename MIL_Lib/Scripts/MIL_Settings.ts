namespace MIL
{
    // PORT: This class was formerly named 'settings'
    /** The MILSettings class */
    export class MILSettings
    {
        private _minZoomLevel: number;
        private _maxZoomLevel: number;
        private _isRightMouseClickAllowed: boolean;
        private _inkAutoCombineMode: InkAutoCombineMode;
        private _hoverTimeoutInMs: number;

        constructor()
        {
            this._minZoomLevel = 1;
            this._maxZoomLevel = 1;
            this._isRightMouseClickAllowed = true;
            this._inkAutoCombineMode = InkAutoCombineMode.Off;
            this._hoverTimeoutInMs = -1; // Disabled
        }

        /**
         * [Chainable Property] The minimum allowed zoom-level. See Zoom().
         * @param {number} level A number in the range 0 < n <= 1.
         * @returns {this | number} Either the property value (if getting), or the MILSettings instance (if setting).
         */
        MinZoomLevel(level: number): this;
        MinZoomLevel(): number;
        MinZoomLevel(level?: number): this | number
        {
            if (level === undefined)
            {
                return (this._minZoomLevel);
            }
            else
            {
                if ((level <= 0) || (level > 1))
                {
                    throw new MILException("MinZoomLevel (" + this._minZoomLevel + ") must be greater than 0 but no larger than 1");
                }
                this._minZoomLevel = level;
                return (this);
            }
        }

        /**
         * [Chainable Property] The maximum allowed zoom-level. See Zoom().
         * @param {number} level A number in the range n >= 1.
         * @returns {this | number} Either the property value (if getting), or the MILSettings instance (if setting).
         */
        MaxZoomLevel(level: number): this;
        MaxZoomLevel(): number;
        MaxZoomLevel(level?: number): this | number
        {
            if (level === undefined)
            {
                return (this._maxZoomLevel);
            }
            else
            {
                if (level < 1)
                {
                    throw new MILException("MaxZoomLevel (" + this._maxZoomLevel + ") must be at least 1");
                }
                this._maxZoomLevel = level;
                return (this);
            }
        }

        /**
         * [Chainable Property] Whether right-mouse clicking is allowed on MIL objects. This controls whether the built-in context menu displays or not.
         * @param {boolean} allow Flag.
         * @returns {this | boolean} Either the property value (if getting), or the MILSettings instance (if setting).
         */
        IsRightMouseClickAllowed(allow: boolean): this;
        IsRightMouseClickAllowed(): boolean;
        IsRightMouseClickAllowed(allow?: boolean): this | boolean
        {
            return (getOrSetProperty(this, nameof(() => this._isRightMouseClickAllowed), allow));
        }

        /**
         * [Chainable Property] How Inks should automatically combine (if at all) when they overlap.
         * @param {InkAutoCombineMode} mode The desired Ink auto-combine mode.
         * @returns {this | mode} Either the property value (if getting), or the MILSettings instance (if setting).
         */
        InkAutoCombineMode(mode: InkAutoCombineMode): this;
        InkAutoCombineMode(): InkAutoCombineMode;
        InkAutoCombineMode(mode?: InkAutoCombineMode): this | InkAutoCombineMode
        {
            return (getOrSetProperty(this, nameof(() => this._inkAutoCombineMode), mode));
        }

        /**
         * [Chainable Property] The amount of time that must elapse after a potential hover starts before the actual over event is triggered.
         * Defaults to -1, which disables Hover events from happening (hovering adds considerable eventing overhead).
         * Note: The expected usage pattern is that hover will be enabled on a per-element basis using SetElementHoverTimeoutInMs().
         * @param {number} timeoutInMs A timeout in milliseconds (must be >= -1).
         * @returns {this | number} Either the property value (if getting), or the MILSettings instance (if setting).
         */
        HoverTimeoutInMs(timeout: number): this;
        HoverTimeoutInMs(): number;
        HoverTimeoutInMs(timeout?: number): this | number
        {
            if (timeout === undefined)
            {
                return (this._hoverTimeoutInMs);
            }
            else
            {
                if (timeout < 0) // This is how to specify that hover is disabled [hover adds considerable eventing overhead]
                {
                    timeout = -1;

                    // Remove all hover state tracking
                    ResetHoverStateTracking();
                }
                this._hoverTimeoutInMs = timeout;
                return (this);
            }
        }
    }
}