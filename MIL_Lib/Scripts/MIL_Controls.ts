// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

namespace MIL
{
    // Type aliases

    /** 
     * Type of a callback that will apply a CSS style (and specify its 'd') to the a RulerControl toolbar item (an SVG path). When the callback is invoked, 'this' will be set to the RulerControl instance. 
     * Note: The path data ('d') can only contain M, L, Z, m, l, a or z commands.
     */
    export type RulerToolbarItemStylerCallback = (itemPath: D3SingleSelection, itemIndex: number) => void;

    /** Type of a callback that will be called when the selected RulerControl toolbar item changes. When the callback is invoked, 'this' will be set to the RulerControl instance. */
    export type RulerToolbarItemSelectionChangedHandler = (previousItemIndex: number) => void

    /** Type of basic information about a selected RadialMenuControl item. */
    export type RadialMenuItemDetails =
    {
        /** The name of the selected sector, as provided in usedSectorNames in CreateRadialMenu() / AddLevel(). My be null. */
        sectorName: string,
        /** The ID of the sector (0 to sectorCount - 1). The sectorCount is provided in CreateRadialMenu() or AddLevel(). */
        sectorID: number,
        /** The ID of the level that the item came from. */
        levelID: number
    }

    /** Type of the result from a RadialMenuControl item selection. */
    export type RadialMenuSelectedItem = RadialMenuItemDetails &
    {
        /** The sector ID of the prior selection. If an already selected item is re-selected, this value will be the same as sectorID. */
        previousSectorID: Number
    };

    /** Type of the result from a RadialMenuControl item image hover start/stop. */
    export type RadialMenuHoverItem = RadialMenuItemDetails &
    {
        /** True if the hover has started, false if the hover has stopped. */
        hoverStarted: boolean,
        /** The current imageURL of the item. */
        imageURL: string
    };

    /** Type of a callback that will be invoked when a selection is made on a RadialMenuControl. */
    export type RadialMenuItemSelectedHandler = (selectedItem: RadialMenuSelectedItem) => void;

    /** Type of a callback that will be invoked when a hover starts or stops over an item image in a RadialMenuControl. */
    export type RadialMenuItemImageHoverHandler = (hoverItem: RadialMenuHoverItem) => void;

    /**
     * The Controls namespace.
     */
    export namespace Controls
    {
        let _nextRadialMenuID: number = 1; // Used to create a default menu name [if not supplied in CreateRadialMenu()]

        /**
         * Returns true if 'targetElement' is a MIL control, or has a parent which is a MIL control.
         * @param {TargetDomElement} targetElement The element to check.
         * @returns {boolean} Result.
         */
        export function IsControl(targetElement: TargetDomElement): boolean
        {
            let selfOrAncestorIsControl: boolean = false;
            let domElement: DomElement = Utils.GetDomElement(targetElement);

            while (domElement && !selfOrAncestorIsControl)
            {
                if (domElement.hasOwnProperty("__MILIsControl__"))
                {
                    selfOrAncestorIsControl = true;
                }

                // PORT: This check was changed from: "domElement = domElement.parentElement || domElement.parentNode;"
                domElement = domElement.parentNode as DomElement;
            }

            return (selfOrAncestorIsControl);
        }

        /**
         * Returns the RulerControl for the specified <svg> element, creating it if needed.
         * @param {SVGSVGElement} svg An <svg> element.
         * @returns {RulerControl} Result.
         */
        export function Ruler(svg: SVGSVGElement): RulerControl
        {
            let svgDomElement: DomElement = Utils.GetDomElement(svg, SVGSVGElement);
            let svgInfo: SVGInfo = getSvgInfo(svgDomElement);

            if (svgInfo.ruler === null)
            {
                svgInfo.ruler = new RulerControl(svgInfo.gDomElement)
                    .BeginUpdate()
                    .Width(svgInfo.svgWidth * 0.4).BigTickCount(10).LittleTickCount(10).KeepConstantScale(true).CenterInView()
                    .EndUpdate();
            }

            return (svgInfo.ruler);
        }

        /**
         * Returns the FrameControl for the specified <svg> element, creating it if needed.
         * Note: As a side-effect of creation, the 'overflow' CSS attribute of the svg will be set to 'hidden'.
         * @param {SVGSVGElement} svg An <svg> element.
         * @returns {FrameControl} Result.
         */
        export function Frame(svg: SVGSVGElement): FrameControl
        {
            let svgDomElement: DomElement = Utils.GetDomElement(svg, SVGSVGElement);
            let svgInfo: SVGInfo = getSvgInfo(svgDomElement);

            if (svgInfo.frame === null)
            {
                svgInfo.frame = new FrameControl(svgInfo.gDomElement);
                // Allow content to render outside the [currently] visible portion of the svg [because the FrameControl typically extends outside the svg].
                // The content will come into view [of the svg] when we pan/zoom the root <g>.
                svgInfo.svgDomElement.setAttribute("overflow", "hidden");
            }

            return (svgInfo.frame);
        }

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
        export function CreateRadialMenu(svg: SVGSVGElement, menuName: string, centerImageURL: string, sectorCount: number, usedSectors: number[], usedSectorImageURLs: string[], usedSectorNames: string[] = null, usedSectorTooltipCaptions: string[] = null, tooltipHoverTimeoutInMs: number = 100): RadialMenuControl
        {
            if (!menuName)
            {
                menuName = "RadialMenu #" + _nextRadialMenuID++;
            }

            let svgDomElement: SVGSVGElement = Utils.GetDomElement(svg, SVGSVGElement) as SVGSVGElement;
            let newRadialMenu = new MIL.Controls.RadialMenuControl(svgDomElement, menuName, centerImageURL, sectorCount, usedSectors, usedSectorImageURLs, usedSectorNames, usedSectorTooltipCaptions, tooltipHoverTimeoutInMs);

            // We keep track of all the radial menus so that we can, for example, scale them all in MIL.Zoom()
            getSvgInfo(svgDomElement).radialMenus.push(newRadialMenu);

            return (newRadialMenu);
        }

        /**
         * Deletes a RadialMenuControl created with CreateRadialMenu(). Returns true if the control was deleted, otherwise returns false.
         * @param {RadialMenuControl} radialMenu The radial-menu control to delete.
         * @returns {boolean} Result.
         */
        export function DeleteRadialMenu(radialMenu: RadialMenuControl): boolean
        {
            let wasDeleted: boolean = false;
            let svgInfo: SVGInfo = getSvgInfo(radialMenu.Parent());

            for (let i = 0; svgInfo.radialMenus.length; i++)
            {
                if (svgInfo.radialMenus[i] === radialMenu)
                {
                    svgInfo.radialMenus.splice(i, 1);
                    radialMenu.delete();
                    wasDeleted = true;
                    break;
                }
            }

            return (wasDeleted);
        }

        /** 
         *  [Private Method] Ensures that the specified Control is the top-most element in the specified parent <g> element it was created in. 
         *  @param {SVGGElement} control The main <g> element of the target control.
         *  @param {SVGGElement} parent The parent <g> element 'control' was created in.
         *  @returns {boolean} True if the menu was brought to the front, false if it was already at the front.
         */
        function bringToFront(control: SVGGElement, parent: SVGGElement): boolean
        {
            let wasBroughtToFront: boolean = false;

            if ((parent.childNodes.length > 0) && (parent.childNodes[parent.childNodes.length - 1] !== control))
            {
                let index: number = parent.childNodes.length - 1;

                // Skip over any d3.Transition (animation) objects (eg. the <path> elements we add/fade/remove when drawing a 'comet tail')
                while ((index >= 0) && ((parent.childNodes[index] as BaseObject).__transition !== undefined))
                {
                    index--;
                }

                if ((index >= 0) && (parent.childNodes[index] !== control))
                {
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
        export class FrameControl
        {
            private _rect: D3SingleSelection;
            private _gDomElement: SVGGElement;
            private _className: string;

            /**
             * [Internal] Creates a FrameControl instance in the specified gDomElement. Note: Do NOT call this directly - use Controls.Frame() instead.
             * @param {SVGGElement} gDomElement The parent <g> element.
             * @internal
             */
            constructor(gDomElement: TargetDomElement)
            {
                this._rect = null;
                this._gDomElement = Utils.GetDomElement(gDomElement, SVGGElement);
                this._className = "";
                this.redraw(); // PORT: Added [because otherwise the frame will only be drawn if a property (eg. Class) is set]
            }

            /**
             * [Chainable Property] The name of the CSS class used to draw the Frame. 
             * At a minimum, the class should specify the stroke, strokeWidth and fill attributes.
             * @param {string} className A CSS class name.
             * @returns {this | string} Either the property value (if getting), or the Frame instance (if setting).
             */
            Class(className: string): this;
            Class(): string;
            Class(className?: string): this | string
            {
                if (className === undefined)
                {
                    return (this._className);
                }
                else
                {
                    this._className = className;
                    this.redraw();
                    return (this);
                }
            }

            /** [Private Method] Redraws the FrameControl instance. */
            private redraw(): void
            {
                // If needed, create _rect
                if (this._rect === null)
                {
                    let svgInfo: SVGInfo = getSvgInfo(this._gDomElement);
                    let rect: SVGRectElement = document.createElementNS("http://www.w3.org/2000/svg", "rect");

                    svgInfo.gDomElement.insertBefore(rect, svgInfo.gDomElement.firstChild); // Ensure it's the first child

                    let minZoomLevel: number = svgInfo.settings.MinZoomLevel();
                    let frameWidth: number = svgInfo.svgWidth / minZoomLevel;
                    let frameHeight: number = svgInfo.svgHeight / minZoomLevel;
                    let frameX: number = -((frameWidth - svgInfo.svgWidth) / 2);
                    let frameY: number = -((frameHeight - svgInfo.svgHeight) / 2);

                    this._rect = d3.select(rect);
                    this._rect.attr("width", frameWidth).attr("height", frameHeight).attr("x", frameX).attr("y", frameY);
                    this._rect.node().__MILIsControl__ = true;
                }

                if (this._className)
                {
                    this._rect.classed(this._className,  true);
                }
                this._rect.node().style.stroke = this._className ? "" : "red";
                this._rect.node().style.strokeWidth = this._className ? "" : "3px";
                this._rect.node().style.fill = this._className ? "" : "transparent";
            }
        }

        /**
         * The RadialMenuControl class. Represents a radial menu control that's associated with a root <g> element.
         * Note: DO NOT instantiate this class directly: use the MIL.Controls.CreateRadialMenu() method instead.
         */
        export class RadialMenuControl
        {
            private static readonly CONTROL_TYPE: string = "RadialMenuControl";
            private static instanceID: number = 1; // Since we can have many radial-menu controls, we give each a unique ID
            private static readonly ID_PREFIX: string = "radialMenu#Part_";
            private static readonly MIN_RADIUS: number = 50; // In pixels

            private _svgInfo: SVGInfo;
            private _gDomElement: SVGGElement; // The parent <g> element the radial-menu is created in
            private _gRadialMenu: D3SingleSelection; // The radial-menu is a "compound" object
            private _instanceID: number; // The unique instance ID of this radial-menu
            private _partNamePrefix: string; // The string used to prefix the id of each part of the radial-menu
            private _isVisible: boolean; // Whether the radial-menu is currently visible or not
            private _isCollapsed: boolean; // Whether the radial-menu is currently collapsed or not
            private _allowRedraw: boolean; // Whether the radial-menu should be allowed to redraw itself [see Begin/EndUpdate()]
            private _centerPoint: Point; // The center of the radial-menu (in SVG coordinates): all drawing is relative to this point
            private _outerRadius: number; // The outer radius of the radial-menu
            private _innerRadius: number; // The inner radius of the radial-menu
            private _outerCircle: D3SingleSelection; // The <circle> at the outer edge of the radial-menu
            private _innerCircle: D3SingleSelection; // The <circle> at the center of the radial-menu (used to drag the menu)
            private _innerBackgroundCircle: D3SingleSelection; // The "background" for _innerCircle
            private _innerImage: D3SingleSelection; // The <image> at the center of the radial-menu
            private _selectedItemImage: D3SingleSelection; // The animated <image> for the selected item
            private _itemTooltipText: D3SingleSelection; // The tooltip <text> for the hovered-over item 
            private _itemTooltipRect: D3SingleSelection; // The tooltip <rect> around the text for the hovered-over item 
            private _sectorImages: D3SingleSelection[]; // The sector <image> elements
            private _sectorLines: D3SingleSelection[]; // The sector <line> elements
            private _keepConstantScale: boolean;
            private _isDeleted: boolean; // Flag indicating that a "soft" delete of the control has occurred
            private _sectorCount: number; // How many sectors to draw (each sector can contain one item, but can also be empty)
            private _usedSectors: number[]; // The list of used sectors (out of _sectorCount)
            private _usedSectorImageURLs: string[]; // The image URLs for the used sectors
            private _usedSectorNames: string[]; // The names for the used sectors (can be null)
            private _usedSectorTooltipCaptions: string[]; // The tooltip captions for the used sectors (can be null)
            private _unusedSectorImageURL: string; // The URL of the default image to show in a sector if not provided in _usedSectorImageURLs
            private _itemImageSize: number; // The computed size (height/width) of an item (sector) image (based on _outerRadius)
            private _showSectorLines: boolean; // Whether to draw sector lines or not
            private _cometTailClassName: string; // The class (if any) to use for the the radial gesture 
            private _stroke: string;
            private _outerCircleFill: string;
            private _innerCircleFill: string;
            private _onItemSelected: RadialMenuItemSelectedHandler; 
            private _onItemImageHover: RadialMenuItemImageHoverHandler;
            private _tooltipHoverTimeoutInMs: number;
            private _centerImageURL: string;
            private _isAutoHideEnabled: boolean;
            private _isAutoCollapseEnabled: boolean;
            private _selectedItemSectorID: number;
            private _selectedItemIndicatorColor: string;
            private _autoCollapseAfterHoverExpandTimeoutInMs: number;
            private _autoCollapseAfterHoverExpandTimerID: number;

            private _defaultGesturesAdded: boolean; // Flag set once the default gestures have been added to the control
            private _prevMovePoint: Point // Used by the default "Move" gesture
            
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
            constructor(svg: SVGSVGElement, menuName: string, centerImageURL: string, sectorCount: number, usedSectors: number[], usedSectorImageURLs: string[], usedSectorNames: string[], usedSectorTooltipCaptions: string[], tooltipHoverTimeoutInMs: number)
            {
                let svgDomElement: DomElement = Utils.GetDomElement(svg, SVGSVGElement);

                this._svgInfo = getSvgInfo(svgDomElement);
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
            BringToFront(): void
            {
                if (bringToFront(this._gRadialMenu.node(), this._gDomElement))
                {
                    log(RadialMenuControl.CONTROL_TYPE + ": Brought to front", FeatureNames.Controls);
                }
            }

            /**
             * Call before setting multiple RadialMenuControl properties to prevent redrawing after each property setter.
             * @returns {RadialMenuControl} The RadialMenuControl instance.
             */
            BeginUpdate(): this
            {
                this._allowRedraw = false;
                return (this);
            }

            /**
             * Call after BeginUpdate() when all desired RadialMenuControl properties have been set.
             * @returns {RadialMenuControl} The RadialMenuControl instance.
             */
            EndUpdate(): this
            {
                this._allowRedraw = true;
                this.redraw();
                return (this);
            }

            /** Redraws the RadialMenuControl instance. */
            Redraw(): void
            {
                this._allowRedraw = true;
                this.redraw();
            }

            /** [Private Method] Redraws the RadialMenuControl instance, but only if a redraw is needed. */
            private redraw(): void
            {
                if (this._isDeleted)
                {
                    throw new MILException("The operation cannot be performed because the RadialMenuControl has been deleted");
                }

                if (!this._allowRedraw)
                {
                    return;
                }

                log(RadialMenuControl.CONTROL_TYPE + ": Redrawing...", FeatureNames.Controls);

                if (this._gRadialMenu === null)
                {
                    // Create the distinct parts of the control - but don't do any layout (positioning/sizing/drawing)
                    this._gRadialMenu = d3.select(this._gDomElement).append("g");
                    this._selectedItemImage = this._gRadialMenu.append("image").attr("id", this._partNamePrefix + "SelectedItemImage").style("visibility", "hidden");
                    this._itemTooltipRect = this._gRadialMenu.append("rect").attr("id", this._partNamePrefix + "ItemTooltipRect").style("visibility", "hidden");
                    this._itemTooltipText = this._gRadialMenu.append("text").attr("id", this._partNamePrefix + "ItemTooltipText").style("visibility", "hidden");
                    this._outerCircle = this._gRadialMenu.append("circle").attr("id", this._partNamePrefix + "OuterCircle");
                    this._innerBackgroundCircle = this._gRadialMenu.append("circle").attr("id", this._partNamePrefix + "InnerBackgroundCircle");
                    this._innerImage = this._gRadialMenu.append("image").attr("id", this._partNamePrefix + "InnerImage");
                    this._innerCircle = this._gRadialMenu.append("circle").attr("id", this._partNamePrefix + "InnerCircle"); // Must come AFTER _innerImage/_depthIndicatorPaths, because _innerCircle is a gesture target

                    for (let i = 0; i < this._sectorCount; i++)
                    {
                        let sectorImage: D3SingleSelection = this._gRadialMenu.append("image").attr("id", this._partNamePrefix + "Sector" + i + "Image");
                        this._sectorImages.push(sectorImage);
                        let sectorLine: D3SingleSelection = this._gRadialMenu.append("line").attr("id", this._partNamePrefix + "Sector" + i + "Line");
                        this._sectorLines.push(sectorLine);
                    }

                    this._gRadialMenu.node().__MILIsControl__ = true;

                    // Add the default gestures to the menu
                    this.addDefaultGestures();
                }

                let scaleFactor: number = this._keepConstantScale ? this._svgInfo.zoomLevel : 1;
                let outerRadius: number = this._outerRadius / scaleFactor;
                let innerRadius: number = this._innerRadius / scaleFactor;
                let innerImageSize: number = Math.sqrt(Math.pow(innerRadius * 2, 2) / 2) * 0.8;
                let strokeWidth: number = 0.5 / scaleFactor;
                let isOuterCircleContentVisible: boolean = !this._isCollapsed && this._isVisible;

                // Draw the outer/inner circles
                this._outerCircle.attr("r", this._isCollapsed ? innerRadius * 1.2 : outerRadius).attr("cx", this._centerPoint.x).attr("cy", this._centerPoint.y).attr("stroke", this._stroke).attr("stroke-width", strokeWidth).attr("fill", this._outerCircleFill);
                this._innerCircle.attr("r", innerRadius).attr("cx", this._centerPoint.x).attr("cy", this._centerPoint.y).attr("stroke", this._stroke).attr("stroke-width", strokeWidth).attr("fill", "transparent"); // Note: MUST use "transparent" fill
                this._innerBackgroundCircle.attr("r", innerRadius).attr("cx", this._centerPoint.x).attr("cy", this._centerPoint.y).attr("stroke", this._stroke).attr("stroke-width", strokeWidth).attr("fill", this._innerCircleFill);
                this._innerImage.attr("width", innerImageSize).attr("height", innerImageSize).attr("x", this._centerPoint.x - (innerImageSize / 2)).attr("y", this._centerPoint.y - (innerImageSize / 2)).attr("href", this._centerImageURL);

                // Draw the sector (item) images
                let imageCenterRadius: number = innerRadius + ((outerRadius - innerRadius) / 2);
                let imageWidth: number = Math.round((outerRadius - innerRadius) * 0.50); // Rounding to try to avoid visual clipping artifacts
                for (let i = 0; i < this._sectorCount; i++)
                {
                    let usedSectorIndex: number = this._usedSectors.indexOf(i);
                    let isUsedSector: boolean = (usedSectorIndex !== -1);
                    let imageURL = isUsedSector ? this._usedSectorImageURLs[usedSectorIndex] : this._unusedSectorImageURL; // Note: _unusedSectorImageURL can be null, in which case no image will be rendered
                    let sectorCenter: Point = Utils.GetPointOnCircle((360 / this._sectorCount) * i, imageCenterRadius, this._centerPoint);
                    this._sectorImages[i].attr("width", imageWidth).attr("height", imageWidth).attr("x", sectorCenter.x - (imageWidth / 2)).attr("y", sectorCenter.y - (imageWidth / 2)).attr("href", imageURL).attr("opacity", isUsedSector ? 1 : 0.4);
                    this._sectorImages[i].style("visibility", isOuterCircleContentVisible ? "visible" : "hidden");
                }
                this._itemImageSize = imageWidth;

                let sectorAngleInDegrees: number = 360 / this._sectorCount;
                let angle: number;
                let indicatorRadius: number;
                let startPoint: Point;
                let endPoint: Point;
                let d: string;

                // Optionally, draw the sector-delimiter lines
                for (let i = 0; i < this._sectorCount; i++)
                {
                    angle = (sectorAngleInDegrees * i) - (sectorAngleInDegrees / 2); // Adjust by 1/2 sector
                    let beginLinePoint: Point = Utils.GetPointOnCircle(angle, outerRadius * 0.875, this._centerPoint);
                    let endLinePoint: Point = Utils.GetPointOnCircle(angle, outerRadius, this._centerPoint);
                    this._sectorLines[i].attr("x1", beginLinePoint.x).attr("y1", beginLinePoint.y).attr("x2", endLinePoint.x).attr("y2", endLinePoint.y).attr("stroke", this._stroke).attr("stroke-width", strokeWidth / 2);
                    this._sectorLines[i].style("visibility", (isOuterCircleContentVisible && this._showSectorLines) ? "visible" : "hidden");
                }

                // Draw selected item indicator (if any)
                for (let i = 0; i < this._sectorCount; i++)
                {
                    const marginInDegrees: number = 3; // The "margin" at each end of the indicator
                    angle = (sectorAngleInDegrees * i) + marginInDegrees - (sectorAngleInDegrees / 2); // Adjust by 1/2 sector
                    indicatorRadius = outerRadius * 0.97;
                    startPoint = Utils.GetPointOnCircle(angle, indicatorRadius, this._centerPoint);
                    endPoint = Utils.GetPointOnCircle(angle + sectorAngleInDegrees - (marginInDegrees * 2), indicatorRadius, this._centerPoint);
                    d = "M " + startPoint.x + " " + startPoint.y + " A " + indicatorRadius + " " + indicatorRadius + " 0 0 1 " + endPoint.x + " " + endPoint.y;
                }

                // Note: We use 'visibility' (not 'display') so that we can still get the position/dimensions of the RadialMenuControl when it's not shown
                this._gRadialMenu.style("visibility", this._isVisible ? "visible" : "hidden");

                this.BringToFront();
            }

            /** [Private Method] Adds the default Gestures (Move, Tap, Swipe, Hover, etc.) to the RadialMenuControl instance. */
            private addDefaultGestures(): void
            {
                if (this._defaultGesturesAdded)
                {
                    return;
                }
                this._defaultGesturesAdded = true;

                let radialMenu: RadialMenuControl = this;

                // Expand menu (with hover)
                MIL.AddGesture(MIL.CreateGesture("DefaultRadialMenuCenterHover*", true)
                    .Target(radialMenu._innerCircle)
                    .PointerType("Hover")
                    .GestureStartedHandler(function ()
                    {
                        if (radialMenu.IsCollapsed())
                        {
                            radialMenu.IsCollapsed(false);

                            // Optionally, collapse again after a timeout
                            if (radialMenu._autoCollapseAfterHoverExpandTimeoutInMs !== -1)
                            {
                                if (this._autoCollapseAfterHoverExpandTimerID !== -1)
                                {
                                    clearTimeout(this._autoCollapseAfterHoverExpandTimerID);
                                }

                                radialMenu._autoCollapseAfterHoverExpandTimerID = setTimeout(function ()
                                {
                                    radialMenu.IsCollapsed(true);
                                }, radialMenu._autoCollapseAfterHoverExpandTimeoutInMs);
                            }
                        }
                    }));
                SetElementHoverTimeoutInMs(radialMenu._innerCircle, 333);

                // Radial swipe
                let scaleFactor: number = this._keepConstantScale ? this._svgInfo.zoomLevel : 1;
                let innerRadius: number = this._innerRadius / scaleFactor;
                MIL.AddGesture(BuiltInGestures.RadialSwipe("DefaultRadialMenuSwipe*", radialMenu._innerCircle, "pen", radialMenu._sectorCount, innerRadius, function onSwipe(swipeResult: RadialSwipeResult)
                {
                    let gesture: Gesture = this;
                    if (swipeResult)
                    {
                        let usedSectorIndex: number = radialMenu._usedSectors.indexOf(swipeResult.segmentID);

                        if (usedSectorIndex !== -1)
                        {
                            let previousSectorID: number = radialMenu._selectedItemSectorID;
                            radialMenu._selectedItemSectorID = swipeResult.segmentID;

                            if (radialMenu._isAutoCollapseEnabled && !radialMenu._isCollapsed)
                            {
                                radialMenu.IsCollapsed(true); // Note: This causes a redraw
                            }
                            else
                            {
                                radialMenu.Redraw(); // Force a redraw to update the selected item indicator
                            }

                            if (radialMenu._isAutoHideEnabled)
                            {
                                radialMenu.Hide(500);
                            }

                            // Animate _selectedItemImage (fade out)
                            let itemImage: D3SingleSelection = radialMenu._sectorImages[swipeResult.segmentID];
                            let originImage: D3SingleSelection = radialMenu._isCollapsed ? radialMenu._innerImage : itemImage;
                            radialMenu._selectedItemImage.attr("href", itemImage.attr("href")).style("visibility", "visible");
                            radialMenu._selectedItemImage.attr("width", originImage.attr("width")).attr("height", originImage.attr("height"));
                            radialMenu._selectedItemImage.attr("x", originImage.attr("x")).attr("y", originImage.attr("y"));

                            radialMenu._selectedItemImage.transition()
                                .duration(1000)
                                .ease(d3.easeExpOut)
                                .tween("AnimatePosition", function animatePosition()
                                {
                                    let destinationRadius: number = Utils.ToNumber(radialMenu._outerCircle.attr("r")) + (Utils.ToNumber(originImage.attr("width")) * 1.5);

                                    let destinationPoint: Point = Utils.GetPointOnCircle(swipeResult.heading, destinationRadius, radialMenu._centerPoint);
                                    let endX: number = destinationPoint.x - (Utils.ToNumber(originImage.attr("width")) / 2);
                                    let endY: number = destinationPoint.y - (Utils.ToNumber(originImage.attr("height")) / 2);

                                    let startX: number = endX;
                                    let startY: number = endY;
                                    let interpolateX = d3.interpolateNumber(startX, endX);
                                    let interpolateY = d3.interpolateNumber(startY, endY);

                                    return (function onAnimationTick(t: number)
                                    {
                                        radialMenu._selectedItemImage.attr("x", interpolateX(t));
                                        radialMenu._selectedItemImage.attr("y", interpolateY(t));
                                    });
                                })
                                .styleTween("opacity", function () { return d3.interpolate("1", "0"); })
                                .on("end", () => { radialMenu._selectedItemImage.style("visibility", "hidden"); });

                            // Invoke the event handler
                            if (radialMenu._onItemSelected !== null)
                            {
                                let sectorName: string = (radialMenu._usedSectorNames !== null) ? radialMenu._usedSectorNames[usedSectorIndex] : null;

                                radialMenu._onItemSelected.call(radialMenu, { sectorName: sectorName, sectorID: swipeResult.segmentID, previousSectorID: previousSectorID });
                            }
                        }
                    }
                }, () => { return (radialMenu._cometTailClassName); }).Conditional(function() { return (PenButtons(ThisGesture(this).Target()) === PenButton.None); }));   

                // "Ignored" draw on outerCircle [to prevent event propagation to the <svg>]
                MIL.AddGesture(MIL.CreateGesture("DefaultRadialMenuIgnoredDraw*", true)
                    .Target(radialMenu._outerCircle)
                    .PointerType("pen|touch|mouse"));

                // Move
                MIL.AddGesture(MIL.CreateGesture("DefaultRadialMenuMove*", true)
                    .Target(radialMenu._innerCircle)
                    .PointerType("touch")
                    .Conditional(function () { return (MIL.Utils.IsNoKeyPressed()); })
                    .GestureStartedHandler(function ()
                    {
                        let gesture: Gesture = this;
                        gesture.OnMoveHandler(function onRadialMenuMove(e: PointerEvent)
                        {
                            let newMovePoint: Point = gesture.GetCurrentSvgPoint("{P1}");

                            if (radialMenu._prevMovePoint !== null)
                            {
                                let deltaX: number = newMovePoint.x - radialMenu._prevMovePoint.x;
                                let deltaY: number = newMovePoint.y - radialMenu._prevMovePoint.y;
                                let newCenterPoint: Point = { x: radialMenu.CenterPoint().x + deltaX, y: radialMenu.CenterPoint().y + deltaY };
                                radialMenu.CenterPoint(newCenterPoint);
                            }
                            radialMenu._prevMovePoint = newMovePoint;
                        });
                    })
                    .GestureEndedHandler(function ()
                    {
                        radialMenu._prevMovePoint = null;
                    }));

                // Hover (over [all] sector images) to show tooltip text (if available)
                for (let i = 0; i < radialMenu._sectorCount; i++)
                {
                    let itemImage: D3SingleSelection = radialMenu._sectorImages[i];

                    MIL.AddGesture(MIL.CreateGesture("DefaultRadialMenuItemHover*", true)
                        .Target(itemImage)
                        .PointerType("Hover")
                        .GestureStartedHandler(function ()
                        {
                            let sectorID: number = i;
                            let usedSectorIndex: number = radialMenu._usedSectors.indexOf(sectorID);

                            if (usedSectorIndex === -1)
                            {
                                return;
                            }

                            let itemName: string = (radialMenu._usedSectorNames !== null) ? radialMenu._usedSectorNames[usedSectorIndex] : "";
                            let itemTooltipCaption: string = "";

                            if ((radialMenu._usedSectorTooltipCaptions !== null) && (radialMenu._usedSectorTooltipCaptions[usedSectorIndex] !== null))
                            {
                                itemTooltipCaption = radialMenu._usedSectorTooltipCaptions[usedSectorIndex];
                            }
                            else
                            {
                                if (!itemName) // null or ""
                                {
                                    itemName = "Item #" + (usedSectorIndex + 1);
                                }
                            }

                            if (itemTooltipCaption === "")
                            {
                                // The user doesn't want a tooltip
                                return;
                            }

                            // Set text and position of the tooltip, then show it
                            let scaleFactor: number = radialMenu._keepConstantScale ? radialMenu._svgInfo.zoomLevel : 1;
                            let outerRadius: number = radialMenu._outerRadius / scaleFactor;
                            let textElement: SVGTextElement = radialMenu._itemTooltipText.node() as SVGTextElement;

                            // First, set the attributes of the text that will affect the size of its bounding box
                            textElement.textContent = itemTooltipCaption;
                            radialMenu._itemTooltipText
                                .style("font-family", "Segoe UI")
                                .style("font-size", (13 / scaleFactor) + "px");

                            // Center the text above the menu (so that it's never occluded, although it may end up off-screen)
                            let boundingBox: DOMRect = textElement.getBBox();
                            let charTrimCount: number = 1;

                            while (boundingBox.width > outerRadius * 2.5)
                            {
                                // The caption is too long, so trim it (using "TextTrimming.CharacterEllipsis")
                                textElement.textContent = itemTooltipCaption.slice(0, -charTrimCount++).trim() + "...";
                                boundingBox = textElement.getBBox();
                            }

                            let textWidth: number = boundingBox.width; // Alternative: textElement.getComputedTextLength();
                            let textX: number = radialMenu._centerPoint.x - (textWidth / 2);
                            let textY: number = radialMenu._centerPoint.y - (outerRadius * 1.2); 
                            const marginX: number = 7;
                            const marginY: number = 2;

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
                            if (radialMenu._onItemImageHover)
                            {
                                let sectorName: string = (radialMenu._usedSectorNames !== null) ? radialMenu._usedSectorNames[usedSectorIndex] : null;
                                let imageURL: string = radialMenu._usedSectorImageURLs[usedSectorIndex];
                                radialMenu._onItemImageHover.call(radialMenu, { hoverStarted: true, sectorName: sectorName, sectorID: sectorID, imageURL: imageURL });
                            }
                        })
                        .GestureEndedHandler(function ()
                        {
                            radialMenu._itemTooltipRect.style("visibility", "hidden");
                            radialMenu._itemTooltipText.style("visibility", "hidden");

                            // Invoke the event handler
                            if (radialMenu._onItemImageHover)
                            {
                                let sectorID: number = i;
                                let usedSectorIndex: number = radialMenu._usedSectors.indexOf(sectorID);
                                let sectorName: string = (radialMenu._usedSectorNames !== null) ? radialMenu._usedSectorNames[usedSectorIndex] : null;
                                let imageURL: string = radialMenu._usedSectorImageURLs[usedSectorIndex];
                                radialMenu._onItemImageHover.call(radialMenu, { hoverStarted: false, sectorName: sectorName, sectorID: sectorID, imageURL: imageURL });
                            }
                        }));

                    SetElementHoverTimeoutInMs(itemImage, radialMenu._tooltipHoverTimeoutInMs);
                }

                // "Ignored" draw (on any sector image) [to prevent event propagation to the <svg>]
                for (let i = 0; i < radialMenu._sectorCount; i++)
                {
                    let image: D3SingleSelection = radialMenu._sectorImages[i];

                    MIL.AddGesture(MIL.CreateGesture("DefaultRadialMenuItemIgnoredDraw*", true)
                        .Target(image)
                        .PointerType("pen|touch|mouse"));
                }
            }

            /** Removes the default Gestures from the RadialMenuControl instance. This allows the control to be completely "re-skinned" with new gestures. */
            RemoveDefaultGestures(): void
            {
                if (!this._defaultGesturesAdded)
                {
                    return;
                }
                this._defaultGesturesAdded = false;

                // Move
                RemoveGesturesByTarget(this._innerCircle, "DefaultRadialMenu");

                // "Ignored" draw
                RemoveGesturesByTarget(this._outerCircle, "DefaultRadialMenu");

                // Sector image gestures
                for (let i = 0; i < this._sectorCount; i++)
                {
                    let image: D3SingleSelection = this._sectorImages[i];
                    RemoveGesturesByTarget(image, "DefaultRadialMenu");
                }
            }

            /**
             * [Internal] Logically deletes the RadialMenuControl and removes it from the DOM. 
             * @internal
             */
            delete(): void
            {
                if (!this._isDeleted)
                {
                    this._gRadialMenu.remove();
                    this._isDeleted = true;
                }
            }

            /** 
             * Animates the radial-menu to full opacity (if it's not currently visible).
             * @param {number} [durationInMs] [Optional] How long the animation should take (in milliseceonds).
             */
            Show(durationInMs: number = 300): void
            {
                let currentOpacity: number = (this._gRadialMenu.style("opacity") === null) ? 1 : Utils.ToNumber(this._gRadialMenu.style("opacity"));

                if ((currentOpacity !== 1) || !this.IsVisible())
                {
                    this._gRadialMenu.attr("opacity", (currentOpacity === 1) ? 0 : currentOpacity);
                    this.IsVisible(true);
                    Utils.Fade(this._gRadialMenu, durationInMs, null, null, true);
                }
            }

            /** 
             * Animates the radial-menu to transparent (if it's currently visible).
             * @param {number} [durationInMs] [Optional] How long the animation should take (in milliseceonds).
             * @param {function(): void} [onHideComplete] [Optional] An action to perform after Hide completes.
             */
            Hide(durationInMs: number = 300, onHideComplete: () => void = null): void
            {
                let radialMenu: RadialMenuControl = this;
                let currentOpacity: number = (this._gRadialMenu.style("opacity") === null) ? 1 : Utils.ToNumber(this._gRadialMenu.style("opacity"));

                if ((currentOpacity !== 0) && this.IsVisible())
                {
                    Utils.Fade(this._gRadialMenu, durationInMs, null, () =>
                    {
                        radialMenu.IsVisible(false);
                        if (onHideComplete !== null)
                        {
                            onHideComplete.call(radialMenu);
                        }
                    });
                }
            }

            /**
             * Clears the current selected item indicator (if any), optionally using a fade effect.
             * Note: This method will NOT invoke the ItemSelectedHandler().
             * @param {number} fadeTimeoutInMs A timeout (in milliseconds). Omit (or specify -1) for no fade effect.
             * @returns {RadialMenuControl} The RadialMenuControl instance.
             */
            ClearSelectedItemIndicator(fadeTimeoutInMs: number = -1): this
            {
                if (this._selectedItemSectorID !== -1)
                {
                    if (fadeTimeoutInMs === 0)
                    {
                        this._selectedItemSectorID = -1;
                        this.redraw();
                    }
                    else
                    {
                        let radialMenu: RadialMenuControl = this;
                        let selectedItemSectorID: number = this._selectedItemSectorID;
                    }
                }
                return (this);
            }

            /**
             * Sets the current selected item indicator. To clear the indicator, use ClearSelectedItemIndicator().
             * Note: This method will NOT invoke the ItemSelectedHandler().
             * @param {number} sectorID The ID of the sector to update.
             * @returns {RadialMenuControl} The RadialMenuControl instance.
             */
            SetSelectedItemIndicator(sectorID: number): this
            {
                let isUsedSector: boolean = (this._usedSectors.indexOf(sectorID) !== -1);
                if (isUsedSector)
                {
                    this._selectedItemSectorID = sectorID;
                    this.redraw();
                    return (this);
                }
            }

            /**
             * Updates the image/name/tooltip of the specified sector (item) in the specified menu level.
             * @param {number} sectorID The ID of the sector to update.
             * @param {string} [imageURL] [Optional] The updated item image URL. Use undefined to retain the existing value.
             * @param {string} [name] [Optional] The updated item name (can be null). Use undefined to retain the existing value.
             * @param {string} [tooltipCaption] [Optional] The updated item tooltip caption (can be null). Use undefined to retain the existing value.
             * @returns {RadialMenuControl} The RadialMenuControl instance.
             */
            UpdateItem(sectorID: number, imageURL?: string, name?: string, tooltipCaption?: string): this
            {
                return (this);
            }

            /** 
             * [ReadOnly Property] The <svg> that the RadialMenuControl belongs to. 
             * @returns {SVGSVGElement} Result.
             */
            Parent(): SVGSVGElement
            {
                readOnlyProperty("Parent", arguments);
                return (this._svgInfo.svgDomElement);
            }

            /**
             * [ReadOnly Property] Returns the sector ID (0 to sectorCount - 1) of the currently selected item, or -1 if no item is currently selected.
             * @returns {number} Result.
             */
            SelectedItemSectorID(): number
            {
                readOnlyProperty("SelectedItemSectorID", arguments);
                return (this._selectedItemSectorID);
            }

            /**
             * [Chainable Property] The color used to draw the selected item idicator.
             * @param {string} color A CSS color.
             * @returns {this | string} Either the property value (if getting), or the RadialMenuControl instance (if setting).
             */
            SelectedItemIndicatorColor(color: string): this;
            SelectedItemIndicatorColor(): string;
            SelectedItemIndicatorColor(color?: string): this | string
            {
                return (getOrSetProperty(this, nameof(() => this._selectedItemIndicatorColor), color, () => this.redraw()));
            }

            /**
             * [ReadOnly Property] Returns the timeout (in milliseconds) before the tooltip is shown (if available) for a hovered-over item image. Set via CreateRadialMenu().
             * @returns {number} Result.
             */
            TooltipHoverTimeoutInMs(): number
            {
                readOnlyProperty("TooltipHoverTimeoutInMs", arguments);
                return (this._tooltipHoverTimeoutInMs);
            }

            /**
             * [ReadOnly Property] Returns the preferred "native" (ie. to avoid scaling) height/width of the item (sector) image. Will vary with the value of Radius().
             * @returns {number} Result.
             */
            ItemImageSize(): number
            {
                readOnlyProperty("ItemImageSize", arguments);
                return (this._itemImageSize);
            }

            /**
             * [Chainable Property] The URL of a image to show at the center of the RadialMenuControl.
             * @param {string} imageURL The URL of the image. Specify null for no image.
             * @returns {this | string} Either the property value (if getting), or the RadialMenuControl instance (if setting).
             */
            CenterImageURL(imageURL: string): this;
            CenterImageURL(): string;
            CenterImageURL(imageURL?: string): this | string
            {
                return (getOrSetProperty(this, nameof(() => this._centerImageURL), imageURL, () => this.redraw()));
            }

            /**
             * [Chainable Property] The URL of a default image to show in a sector if not provided in the 'usedSectorImageURLs' parameter of the constructor.
             * @param {string} imageURL The URL of the image. Specify null for no image.
             * @returns {this | string} Either the property value (if getting), or the RadialMenuControl instance (if setting).
             */
            UnusedSectorImageURL(imageURL: string): this;
            UnusedSectorImageURL(): string;
            UnusedSectorImageURL(imageURL?: string): this | string
            {
                return (getOrSetProperty(this, nameof(() => this._unusedSectorImageURL), imageURL, () => this.redraw()));
            }

            /**
             * [Chainable Property] Whether the RadialMenuControl will be rendered at constant scale (ie. to compensate for any zooming of the parent <g> element).
             * @param {boolean} enable Flag.
             * @returns {this | boolean} Either the property value (if getting), or the RadialMenuControl instance (if setting).
             */
            KeepConstantScale(enable: boolean): this;
            KeepConstantScale(): boolean;
            KeepConstantScale(enable?: boolean): this | boolean
            {
                return (getOrSetProperty(this, MIL.nameof(() => this._keepConstantScale), enable, () => this.redraw()));
            }

            /**
             * [Chainable Property] Whether the RadialMenuControl is visible or not.
             * @param {boolean} visible Flag.
             * @returns {this | boolean} Either the property value (if getting), or the RadialMenuControl instance (if setting).
             */
            IsVisible(visible: boolean): this;
            IsVisible(): boolean;
            IsVisible(visible?: boolean): this | boolean
            {
                return (getOrSetProperty(this, MIL.nameof(() => this._isVisible), visible, () => this.redraw()));
            }

            /**
             * [Chainable Property] Whether the RadialMenuControl will be rendered in a collapsed or expanded state.
             * @param {boolean} collapsed Flag.
             * @returns {this | boolean} Either the property value (if getting), or the RadialMenuControl instance (if setting).
             */
            IsCollapsed(collapsed: boolean): this;
            IsCollapsed(): boolean;
            IsCollapsed(collapsed?: boolean): this | boolean
            {
                return (getOrSetProperty(this, MIL.nameof(() => this._isCollapsed), collapsed, () =>
                {
                    if (this._isCollapsed && (this._autoCollapseAfterHoverExpandTimerID !== -1))
                    {
                        clearTimeout(this._autoCollapseAfterHoverExpandTimerID);
                        this._autoCollapseAfterHoverExpandTimerID = -1;
                    }
                    this.redraw();
                }));
            }

            /**
             * [Chainable Property] Whether the RadialMenuControl will automatically hide when an item is selected.
             * @param {boolean} enable Flag.
             * @returns {this | boolean} Either the property value (if getting), or the RadialMenuControl instance (if setting).
             */
            AutoHideOnSelect(enable: boolean): this;
            AutoHideOnSelect(): boolean;
            AutoHideOnSelect(enable?: boolean): this | boolean
            {
                return (getOrSetProperty(this, MIL.nameof(() => this._isAutoHideEnabled), enable));
            }

            /**
             * [Chainable Property] Whether the RadialMenuControl will automatically collapse when an item is selected.
             * @param {boolean} enable Flag.
             * @returns {this | boolean} Either the property value (if getting), or the RadialMenuControl instance (if setting).
             */
            AutoCollapseOnSelect(enable: boolean): this;
            AutoCollapseOnSelect(): boolean;
            AutoCollapseOnSelect(enable?: boolean): this | boolean
            {
                return (getOrSetProperty(this, MIL.nameof(() => this._isAutoCollapseEnabled), enable));
            }

            /**
             * [Chainable Property] The timeout (in milliseconds) after which the menu will automatically collapse after being expanded by hovering (over the center-circle of the menu). 
             * Specify -1 for no timeout (the menu will stay expanded).
             * @param {number} timeout A timeout in milliseconds (between 500 and 8000).
             * @returns {this | number} Either the property value (if getting), or the RadialMenuControl instance (if setting).
             */
            AutoCollapseAfterHoverExpandTimeoutInMs(timeout: number): this;
            AutoCollapseAfterHoverExpandTimeoutInMs(): number;
            AutoCollapseAfterHoverExpandTimeoutInMs(timeout?: number): this | number
            {
                if (timeout !== undefined)
                {
                    timeout = Math.max(-1, timeout);
                    if (timeout !== -1)
                    {
                        timeout = Math.max(500, Math.min(8000, timeout));
                    }
                }
                return (getOrSetProperty(this, MIL.nameof(() => this._autoCollapseAfterHoverExpandTimeoutInMs), timeout));
            }

            /**
             * [Chainable Property] The center of the RadialMenuControl (in SVG coordinates).
             * @param {Point} point The center point.
             * @returns {this | Point} Either the property value (if getting), or the RadialMenuControl instance (if setting).
             */
            CenterPoint(point: Point): this;
            CenterPoint(): Point;
            CenterPoint(point?: Point): this | Point
            {
                return (getOrSetProperty(this, MIL.nameof(() => this._centerPoint), point, () => this.redraw()));
            }

            /**
             * [Chainable Property] The [outer] radius of the RadialMenuControl instance (in pixels). Must be at least RadialMenuControl.MIN_RADIUS.
             * @param {number} [radiusInPx] [Optional] Radius in pixels.
             * @returns {this | number} Either the property value (if getting), or the RadialMenuControl instance (if setting).
             */
            Radius(radiusInPx: number): this;
            Radius(): number;
            Radius(radiusInPx?: number): this | number
            {
                if (radiusInPx === undefined)
                {
                    return (this._outerRadius);
                }
                else
                {
                    this._outerRadius = Math.max(RadialMenuControl.MIN_RADIUS, radiusInPx);
                    this._innerRadius = this._outerRadius / 3.333;
                    this.redraw();
                    return (this);
                }
            }

            /**
             * [Chainable Property] Whether the RadialMenuControl will be rendered with sector lines drawn.
             * @param {boolean} enable Flag.
             * @returns {this | boolean} Either the property value (if getting), or the RadialMenuControl instance (if setting).
             */
            ShowSectorLines(showLines: boolean): this;
            ShowSectorLines(): boolean;
            ShowSectorLines(showLines?: boolean): this | boolean
            {
                return (getOrSetProperty(this, MIL.nameof(() => this._showSectorLines), showLines, () => this.redraw()));
            }

            /**
             * [Chainable Property] The CSS class used to draw the "comet tail" for the radial gesture.
             * @param {string} className A CSS class name.
             * @returns {this | string} Either the property value (if getting), or the RadialMenuControl instance (if setting).
             */
            CometTailClass(className: string): this;
            CometTailClass(): string;
            CometTailClass(className?: string): this | string
            {
                return (getOrSetProperty(this, nameof(() => this._cometTailClassName), className));
            }

            /**
             * [Chainable Property] The handler that will be invoked when an item is selected.
             * @param {RadialMenuItemSelectedHandler} handler The RadialMenuItemSelected handler. When the handler is invoked, 'this' will be set to the RadialMenuControl instance.
             * @returns {this | RadialMenuItemSelectedHandler} Either the property value (if getting), or the RadialMenuControl instance (if setting).
             */
            ItemSelectedHandler(handler: RadialMenuItemSelectedHandler): this;
            ItemSelectedHandler(): RadialMenuItemSelectedHandler;
            ItemSelectedHandler(handler?: RadialMenuItemSelectedHandler): this | RadialMenuItemSelectedHandler
            {
                return (getOrSetProperty(this, nameof(() => this._onItemSelected), handler));
            }

            /**
             * [Chainable Property] The handler that will be invoked when a hover either starts or stop on an item image.
             * @param {RadialMenuItemImageHoverHandler} handler The RadialMenuItemImageHover handler. When the handler is invoked, 'this' will be set to the RadialMenuControl instance.
             * @returns {this | RadialMenuItemImageHoverHandler} Either the property value (if getting), or the RadialMenuControl instance (if setting).
             */
            ItemImageHoverHandler(handler: RadialMenuItemImageHoverHandler): this;
            ItemImageHoverHandler(): RadialMenuItemImageHoverHandler;
            ItemImageHoverHandler(handler?: RadialMenuItemImageHoverHandler): this | RadialMenuItemImageHoverHandler
            {
                return (getOrSetProperty(this, nameof(() => this._onItemImageHover), handler));
            }

            /**
             * [Chainable Property] The color to use to draw the lines of the RadialMenuControl.
             * @param {string} color A CSS color.
             * @returns {this | string} Either the property value (if getting), or the RadialMenuControl instance (if setting).
             */
            LineColor(color: string): this;
            LineColor(): string;
            LineColor(color?: string): this | string
            {
                return (getOrSetProperty(this, nameof(() => this._stroke), color, () => this.redraw));
            }

            /**
             * [Chainable Property] The color to use to fill the outer-circle of the RadialMenuControl.
             * @param {string} color A CSS color.
             * @returns {this | string} Either the property value (if getting), or the RadialMenuControl instance (if setting).
             */
            OuterCircleFill(color: string): this;
            OuterCircleFill(): string;
            OuterCircleFill(color?: string): this | string
            {
                return (getOrSetProperty(this, nameof(() => this._outerCircleFill), color, () => this.redraw));
            }

            /**
             * [Chainable Property] The color to use to fill the inner-circle of the RadialMenuControl.
             * @param {string} color A CSS color.
             * @returns {this | string} Either the property value (if getting), or the RadialMenuControl instance (if setting).
             */
            InnerCircleFill(color: string): this;
            InnerCircleFill(): string;
            InnerCircleFill(color?: string): this | string
            {
                return (getOrSetProperty(this, nameof(() => this._innerCircleFill), color, () => this.redraw));
            }
        }

        /**
         * The RulerControl class. Represents a virtual ruler control that's associated with a root <g> element.
         * Note: DO NOT instantiate this class directly: use the MIL.Controls.Ruler() method instead.
         */
        export class RulerControl
        {
            private static readonly CONTROL_TYPE = "RulerControl";
            private static readonly ID_PREFIX = "rulerPart_";
            private static readonly RULER_MIN_HEIGHT = 80;
            private static readonly RULER_MIN_WIDTH = 300;
            private TOOLBAR_ITEM_WIDTH = 30; // [_height * 0.3] We'll adjust this in Height(), which is why it isn't 'readonly'
            private static readonly TOOLBAR_ITEM_MARGIN = 4; // On all sides (around the item)
            private static readonly RULER_ENDS_TARGET_REGION_WIDTH_RATIO = 0.2; // Defines the gesture target region (as a percentage of the width) for the ruler ends

            private _gRuler: D3SingleSelection; // The ruler is a "compound" object
            private _outlinePath: D3SingleSelection; // The "primary" outline + ticks + grabbers
            private _toolbarPath: D3SingleSelection; // The toolbar outline
            private _selectionIndicatorPath: D3SingleSelection; // The indicator for the selected item in the toolbar
            private _centerCirclePath: D3SingleSelection; // The circle at the center of the ruler
            private _zoomLevelText: D3SingleSelection; // The svg <text> displaying the current zoom level (of the parent <g> element)
            private _gDomElement: SVGGElement;
            private _allowRedraw: boolean; // Whether the ruler should be allowed to redraw itself [see Begin/EndUpdate()]
            private _width: number;
            private _height: number;
            private _bigTickCount: number
            private _littleTickCount: number;
            private _className: string;
            private _strokeWidth: number; // Pixels [overrides the strokeWidth set in _className, because we have to scale it]
            private _centerPoint: Point;
            private _rotationAngle: number; // 90 = Horizontal
            private _keepConstantScale: boolean;
            private _isResizable: boolean; // Whether the ruler can be stretched (by _defaultRotateAndMoveGesture)
            private _toolbarItemCount: number;
            private _toolbarItemSelectedColor: string;
            private _toolbarItemStyler: RulerToolbarItemStylerCallback;
            private _selectedToolbarItemNumber: number; // -1 means means no item is selected; 0..n means there's an active selection 
            private _onToolbarSelectionChanged: RulerToolbarItemSelectionChangedHandler;
            private _isVisible: boolean;
            private _faceEdgeStartPoint: XY; // [x,y]
            private _faceEdgeEndPoint: XY; // [x,y]
            private _centerLineStartPoint: XY; // [x,y]
            private _centerLineEndPoint: XY; // [x,y]
            private _toolbarWidth: number;

            private _defaultMoveGesture: Gesture;
            private _defaultRotateAndMoveGesture: Gesture;
            private _defaultTapGesture: Gesture;
            private _defaultToolbarTapGesture: Gesture;
            private _prevMovePoint: Point // Used by _defaultMoveGesture
            private _oneTouchRotationInProgress: boolean; // Used by _defaultMoveGesture
            private _rulerResizeInProgress: boolean; // Used by _defaultRotateAndMoveGesture
            private _rulerResizeStartDistance: number; // Used by _defaultRotateAndMoveGesture
            private _rulerResizeStartWidth: number; // Used by _defaultRotateAndMoveGesture
            private _rotateStartPointPointerType: string; // Used by _defaultRotateAndMoveGesture
            private _rotateEndPointPointerType: string; // Used by _defaultRotateAndMoveGesture

            /**
             * [Internal] Creates a RulerControl instance in the specified gDomElement. Note: Do NOT call this directly - use Controls.Ruler() instead.
             * @param {SVGGElement} gDomElement The parent <g> element.
             * @internal
             */
            constructor(gDomElement: SVGGElement)
            {
                this._gRuler = null;
                this._outlinePath = null;
                this._toolbarPath = null;
                this._selectionIndicatorPath = null;
                this._centerCirclePath = null;
                this._gDomElement = Utils.GetDomElement(gDomElement, SVGGElement) as SVGGElement;
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
            BeginUpdate(): this
            {
                this._allowRedraw = false;
                return (this);
            }

            /**
             * Call after BeginUpdate() when all desired RulerControl properties have been set.
             * @returns {RulerControl} The RulerControl instance.
             */
            EndUpdate(): this
            {
                this._allowRedraw = true;
                this.redraw();
                return (this);
            }

            /** Redraws the RulerControl instance. */
            Redraw(): void
            {
                this._allowRedraw = true;
                this.redraw();
            }

            /** [Private Method] Redraws the RulerControl instance, but only if a redraw is needed. */
            private redraw(): void
            {
                if (!this._allowRedraw)
                {
                    return;
                }

                log(RulerControl.CONTROL_TYPE + ": Redrawing...", FeatureNames.Controls);

                if (this._gRuler === null)
                {
                    let prefix: string = RulerControl.ID_PREFIX;
                    this._gRuler = d3.select(this._gDomElement).append("g");
                    this._centerCirclePath = this._gRuler.append("path").attr("id", prefix + "CenterCircle"); // We add this first so that it's behind _outlinePath and therefore isn't a hit-target
                    this._zoomLevelText = this._gRuler.append("text").attr("font-family", "Segoe UI").attr("id", prefix + "ZoomLevelText"); // This must be behind _outlinePath too
                    this._outlinePath = this._gRuler.append("path").attr("id", prefix + "Outline");
                    this._selectionIndicatorPath = this._gRuler.append("path").attr("id", prefix + "SelectionIndicator"); // This must be behind _toolbarPath
                    this._toolbarPath = this._gRuler.append("path").attr("id", prefix + "Toolbar");
                    this._gRuler.node().__MILIsControl__ = true;

                    this.addDefaultGestures();
                }

                let pathPointsCollection: XY[][] = [];
                let pathPoints: XY[] = [];
                let d: string = "";

                // Optionally, scale the height and width to compensate for the zoom level (ie. make the ruler be constant-sized on the screen, regardless of the zoom level)
                let svgInfo: SVGInfo = getSvgInfo(this._gDomElement);
                let scaleFactor: number = this._keepConstantScale ? svgInfo.zoomLevel : 1;
                let rulerWidth: number = this._width / scaleFactor;
                let rulerHeight: number = this._height / scaleFactor;

                // These are all relative (to [0,0]) coordinates
                pathPointsCollection.push([[0, 0], [rulerWidth, 0], [rulerWidth, rulerHeight], [0, rulerHeight], [0, 0]]);

                // Add hash marks
                let bigTickHeight: number = rulerHeight / 4;
                let littleTickHeight: number = bigTickHeight / 2;

                if (this._bigTickCount > 0)
                {
                    let bigTickInterval: number = rulerWidth / this._bigTickCount;
                    let littleTickInterval: number = bigTickInterval / this._littleTickCount;

                    for (let bigTick = 0; bigTick < this._bigTickCount; bigTick++)
                    {
                        if (bigTick > 0)
                        {
                            let x: number = bigTickInterval * bigTick;
                            pathPointsCollection.push([[x, 0], [x, bigTickHeight]]);
                        }

                        if (this._littleTickCount > 0)
                        {
                            for (let littleTick = 1; littleTick < this._littleTickCount; littleTick++)
                            {
                                let x: number = (bigTickInterval * bigTick) + (littleTickInterval * littleTick);
                                pathPointsCollection.push([[x, 0], [x, littleTickHeight]]);
                            }
                        }
                    }
                }

                // Add the "rotation/resize region" delimiting markers
                pathPointsCollection.push([[rulerWidth * RulerControl.RULER_ENDS_TARGET_REGION_WIDTH_RATIO, rulerHeight * 0.9], [rulerWidth * RulerControl.RULER_ENDS_TARGET_REGION_WIDTH_RATIO, rulerHeight]]);
                pathPointsCollection.push([[rulerWidth * (1 - RulerControl.RULER_ENDS_TARGET_REGION_WIDTH_RATIO), rulerHeight * 0.9], [rulerWidth * (1 - RulerControl.RULER_ENDS_TARGET_REGION_WIDTH_RATIO), rulerHeight]]);

                if (this._isResizable)
                {
                    // Add "grippers" at each end (for resizing)
                    let gripperLineHeight: number = rulerHeight / 6;
                    let gripperLineSpacing: number = gripperLineHeight / 3.5;
                    for (let gripperLine = 0; gripperLine < 3; gripperLine++)
                    {
                        let x: number = (gripperLineSpacing * 4) + (gripperLineSpacing * gripperLine);
                        let y: number = littleTickHeight + ((rulerHeight - littleTickHeight - gripperLineHeight) / 2);
                        pathPointsCollection.push([[x, y], [x, y + gripperLineHeight]]);
                        pathPointsCollection.push([[rulerWidth - x, y], [rulerWidth - x, y + gripperLineHeight]]);
                    }
                }

                // Prepare the path data
                for (let c = 0; c < pathPointsCollection.length; c++)
                {
                    pathPoints = pathPointsCollection[c];

                    for (let i = 0; i < pathPoints.length; i++)
                    {
                        // Transform from relative to absolute (svg) coordinates
                        pathPoints[i] = [
                            pathPoints[i][0] + this._centerPoint.x - (rulerWidth / 2),
                            pathPoints[i][1] + this._centerPoint.y - (rulerHeight / 2)
                        ];
                        d += ((i === 0) ? " M " : " L ") + pathPoints[i][0] + " " + pathPoints[i][1];
                    }

                    if (c === 0)
                    {
                        let inkOffset: number = 2 / scaleFactor; // So that coerced ink isn't drawn right under the edge of the ruler [although this will depend on the ink strokeWidth]
                        this._faceEdgeStartPoint = [pathPoints[0][0], pathPoints[0][1] - inkOffset];
                        this._faceEdgeEndPoint = [pathPoints[1][0], pathPoints[1][1] - inkOffset];

                        this._centerLineStartPoint = [pathPoints[0][0], pathPoints[0][1] + (rulerHeight / 2)];
                        this._centerLineEndPoint = [pathPoints[1][0], pathPoints[1][1] + (rulerHeight / 2)];
                    }
                }

                this._outlinePath.attr("d", d);

                let tbItemWidth: number = this.TOOLBAR_ITEM_WIDTH / scaleFactor;
                let tbItemHeight: number = this.TOOLBAR_ITEM_WIDTH / scaleFactor;
                let tbWidth: number = (this._toolbarItemCount * this.TOOLBAR_ITEM_WIDTH) / scaleFactor;
                let tbHeight: number = tbItemHeight;
                let tbStartX: number = this._centerPoint.x - (tbWidth / 2); // TopLeft.x
                let tbStartY: number = this._centerPoint.y + ((rulerHeight / 2) - tbItemHeight - (this._strokeWidth / scaleFactor)); // TopLeft.y

                // Draw the toolbar (relative to _centerPoint to keep its position on the ruler fixed, ie. not changing if the ruler is resized)
                if ((this._toolbarItemCount > 0) && (this._centerPoint.x !== 0))
                {
                    let toolbarPathData: string = "";

                    pathPointsCollection.length = 0;

                    this._toolbarWidth = tbWidth;

                    // Add left/top/right edges of toolbar
                    pathPointsCollection.push([[tbStartX, tbStartY + tbHeight], [tbStartX, tbStartY], [tbStartX + tbWidth, tbStartY], [tbStartX + tbWidth, tbStartY + tbHeight]]);

                    // Add toolbar item dividers
                    for (let i = 1; i < this._toolbarItemCount; i++)
                    {
                        let x: number = tbStartX + (tbItemWidth * i);
                        pathPointsCollection.push([[x, tbStartY], [x, tbStartY + tbHeight]]);
                    }

                    // Position selection indicator
                    if (this._selectedToolbarItemNumber !== -1)
                    {
                        let indicatorStartX: number = tbStartX + (tbItemWidth * this._selectedToolbarItemNumber);
                        let indicatorStartY: number = tbStartY;
                        let indicatorPathData = "M 0 0 L " + tbItemWidth + " 0 L " + tbItemWidth + " " + tbItemHeight + " L 0 " + tbItemHeight + " Z";
                        this._selectionIndicatorPath
                            .attr("d", Utils.TranslatePathData(indicatorPathData, indicatorStartX, indicatorStartY, 1))
                            .style("fill", this._toolbarItemSelectedColor);
                    }
                    this._selectionIndicatorPath.attr("display", ((this._selectedToolbarItemNumber !== -1) && this._isVisible) ? "inline" : "none");

                    // Prepare the path data
                    for (let c = 0; c < pathPointsCollection.length; c++)
                    {
                        pathPoints = pathPointsCollection[c];

                        for (let i = 0; i < pathPoints.length; i++)
                        {
                            toolbarPathData += ((i === 0) ? " M " : " L ") + pathPoints[i][0] + " " + pathPoints[i][1];
                        }
                    }

                    this._toolbarPath.attr("d", toolbarPathData);
                    this.applyStyle(this._toolbarPath, scaleFactor, "transparent");

                    // Position toolbar items [which were added by RulerControl.ToolbarItemCount()]
                    let toolbarItemPaths: D3Selection = this._gRuler.selectAll("path").filter<DomElement>(function ()
                    {
                        return ((this as DomElement).getAttribute("id").indexOf(RulerControl.ID_PREFIX + "ToolbarItem") === 0);
                    });

                    for (let t = 0; t < toolbarItemPaths.size(); t++)
                    {
                        let itemPath: DomElement = toolbarItemPaths.nodes()[t];

                        // Transform from relative to absolute (svg) coordinates
                        let dx: number = tbStartX + (t * tbItemWidth) + (RulerControl.TOOLBAR_ITEM_MARGIN / scaleFactor);
                        let dy: number = tbStartY + (RulerControl.TOOLBAR_ITEM_MARGIN / scaleFactor);
                        d = Utils.TranslatePathData(itemPath.__MILOriginalD__, dx, dy, scaleFactor);

                        itemPath.setAttribute("d", d);
                        itemPath.style.strokeWidth = (itemPath.__MILOriginalStrokeWidth__ / scaleFactor) + "px";
                    }
                }

                if (this._centerPoint.x !== 0)
                {
                    // Update the circle in the center of the ruler [this will appear behind _outlinePath]
                    let circlePathData: string = Utils.GetCirclePathData(this._centerPoint.x, this._centerPoint.y, 6 / scaleFactor) +
                        " " + Utils.TranslatePathData("M -10 0 L 10 0 M 0 -10 L 0 10", this._centerPoint.x, this._centerPoint.y, scaleFactor); // Add cross-hairs
                    let textHeight: number = 11 / scaleFactor;
                    let hasToolbar: boolean = this._toolbarItemCount > 0;

                    this._centerCirclePath.attr("d", circlePathData);
                    this.applyStyle(this._centerCirclePath, scaleFactor, "transparent");

                    // Update the zoom-level text [this will appear behind _outlinePath]
                    this._zoomLevelText
                        .text(svgInfo.zoomLevel.toFixed(2) + "x")
                        .attr("font-size", textHeight + "px")
                        .style("stroke", this._outlinePath.style("stroke"))
                        .style("stroke-width", this._outlinePath.style("stroke-width"));

                    let textWidth: number = this._zoomLevelText.node().getBBox().width;
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
            }

            /**
             * [Private Method] Applies the RulerControl.Class() [if any] to the specified RulerControl component (typically a Path), scaling ths stroke according to the specified scaleFactor.
             * @param {D3SingleSelection} rulerElement Ruler component.
             * @param {number} scaleFactor The factor to scale the stroke-width by.
             * @param {string} [fill] [Optional] The fill color to apply.
             */
            private applyStyle(rulerElement: D3SingleSelection, scaleFactor: number, fill?: string): void
            {
                let className: string = this.Class();

                if (className)
                {
                    rulerElement.classed(className, true);
                }
                rulerElement.node().style.stroke = className ? "" : "gray";
                rulerElement.node().style.strokeWidth = (this._strokeWidth / scaleFactor) + "px";
                rulerElement.node().style.fill = fill ? fill : (className ? "" : "rgba(5, 5, 5, 0.05)");
            }

            /**
             * [Chainable Property] The width of the RulerControl instance (in pixels). Must be at least RulerControl.RULER_MIN_WIDTH.
             * @param {number} [widthInPx] [Optional] Width in pixels.
             * @returns {this | number} Either the property value (if getting), or the RulerControl instance (if setting).
             */
            Width(widthInPx: number): this;
            Width(): number;
            Width(widthInPx?: number): this | number
            {
                if (widthInPx === undefined)
                {
                    return (this._width);
                }
                else
                {
                    this._width = Math.max(RulerControl.RULER_MIN_WIDTH, widthInPx);
                    this.redraw();
                    return (this);
                }
            }

            /**
             * [Chainable Property] The height of the RulerControl instance (in pixels), but must be at least RulerControl.RULER_MIN_HEIGHT. Defaults to 100 if not set.
             * @param {number} [heightInPx] [Optional] Height in pixels.
             * @returns {this | number} Either the property value (if getting), or the RulerControl instance (if setting).
             */
            Height(heightInPx: number): this;
            Height(): number;
            Height(heightInPx?: number): this | number
            {
                if (heightInPx === undefined)
                {
                    return (this._height);
                }
                else
                {
                    this._height = Math.max(RulerControl.RULER_MIN_HEIGHT, heightInPx);
                    this.TOOLBAR_ITEM_WIDTH = this._height * 0.3;
                    this.redraw();
                    return (this);
                }
            }

            /**
             * [Chainable Property] The number of large-interval ticks to draw on the face of the RulerControl.
             * @param {number} bigTickCount
             * @returns {this | number} Either the property value (if getting), or the RulerControl instance (if setting).
             */
            BigTickCount(bigTickCount: number): this;
            BigTickCount(): number;
            BigTickCount(bigTickCount?: number): this | number
            {
                return (getOrSetProperty(this, MIL.nameof(() => this._bigTickCount), bigTickCount, () => this.redraw()));
            }

            /**
             * [Chainable Property] The number of small ticks to draw (between large-interval ticks) on the face of the RulerControl.
             * @param {number} littleTickCount
             * @returns {this | number} Either the property value (if getting), or the RulerControl instance (if setting).
             */
            LittleTickCount(littleTickCount: number): this;
            LittleTickCount(): number;
            LittleTickCount(littleTickCount?: number): this | number
            {
                return (getOrSetProperty(this, MIL.nameof(() => this._littleTickCount), littleTickCount, () => this.redraw()));
            }

            /**
             * [Chainable Property] The CSS class to use to draw the RulerControl.
             * @param {string} className A CSS class name.
             * @returns {this | string} Either the property value (if getting), or the RulerControl instance (if setting).
             */
            Class(className: string): this;
            Class(): string;
            Class(className?: string): this | string
            {
                if (className === undefined)
                {
                    return (this._className);
                }
                else
                {
                    this.BeginUpdate();
                    this._className = className;

                    let strokeWidth: string = Utils.GetCssProperty("." + className, "stroke-width");
                    if (strokeWidth)
                    {
                        this.StrokeWidth(strokeWidth);
                    }
                    this.EndUpdate();
                    return (this);
                }
            }

            /**
             * [Chainable Property] The stroke-width to use to draw the RulerControl. If provided, overrides the stroke-width [if any] set by RulerControl.Class().
             * @param {string} className A CSS class name.
             * @returns {this | string} Either the property value (if getting), or the RulerControl instance (if setting).
             */
            StrokeWidth(strokeWidth: string): this;
            StrokeWidth(): number;
            StrokeWidth(strokeWidth?: string): this | number
            {
                return (getOrSetProperty(this, MIL.nameof(() => this._strokeWidth), (strokeWidth === undefined) ? strokeWidth : Utils.ToNumber(strokeWidth), () => this.redraw()));
            }

            /**
             * [Chainable Property] The center of the RulerControl (in SVG coordinates).
             * @param {Point} point The center point.
             * @returns {this | Point} Either the property value (if getting), or the RulerControl instance (if setting).
             */
            CenterPoint(point: Point): this;
            CenterPoint(): Point;
            CenterPoint(point?: Point): this | Point
            {
                return (getOrSetProperty(this, MIL.nameof(() => this._centerPoint), point, () => this.redraw()));
            }

            /**
             * [Chainable Property] The angle of rotation of the RulerControl.
             * @param {number} angle An angle (>= 0, < 360). 90 = horizontal (the default).
             * @returns {this | number} Either the property value (if getting), or the RulerControl instance (if setting).
             */
            RotationAngle(angle: number): this;
            RotationAngle(): number;
            RotationAngle(angle?: number): this | number
            {
                return (getOrSetProperty(this, MIL.nameof(() => this._rotationAngle), (angle === undefined) ? angle : angle % 360, () => this.redraw()));
            }

            /**
             * [Chainable Property] Whether the RulerControl will be rendered at constant scale (ie. to compensate for any zooming of the parent <g> element).
             * @param {boolean} enable Flag.
             * @returns {this | boolean} Either the property value (if getting), or the RulerControl instance (if setting).
             */
            KeepConstantScale(enable: boolean): this;
            KeepConstantScale(): boolean;
            KeepConstantScale(enable ?: boolean): this | boolean
            {
                return (getOrSetProperty(this, MIL.nameof(() => this._keepConstantScale), enable, () => this.redraw()));
            }

            /**
             * [Chainable Property] Whether the RulerControl can be resized.
             * @param {boolean} enable Flag.
             * @returns {this | boolean} Either the property value (if getting), or the RulerControl instance (if setting).
             */
            IsResizable(enable: boolean): this;
            IsResizable(): boolean;
            IsResizable(enable?: boolean): this | boolean
            {
                return (getOrSetProperty(this, nameof(() => this._isResizable), enable));
            }

            /**
             * [Chainable Property] The number of items in the toolbar.
             * @param {number} count A number in the range 0..n, where n is limited by RulerControl.RULER_MIN_WIDTH (if RulerControl.IsResizable() is true) and RulerControl.Width() if not.
             * @returns {this | number} Either the property value (if getting), or the RulerControl instance (if setting).
             */
            ToolbarItemCount(count: number): this;
            ToolbarItemCount(): number;
            ToolbarItemCount(count?: number): this | number
            {
                if (count === undefined)
                {
                    return (this._toolbarItemCount);
                }
                else
                {
                    let widthAvailableForToolbar: number = (this._isResizable ? RulerControl.RULER_MIN_WIDTH : this._width) * (1 - (RulerControl.RULER_ENDS_TARGET_REGION_WIDTH_RATIO * 2));
                    let maxToolbarItemCount: number = Math.floor(widthAvailableForToolbar / this.TOOLBAR_ITEM_WIDTH);

                    if (count > maxToolbarItemCount)
                    {
                        throw new MILException("The [" + (this._isResizable ? "resizable" : "non-resizable") + "] ruler has a limit of " + maxToolbarItemCount + " toolbar items");
                    }

                    let newItemCount: number = Math.max(0, Math.min(count, maxToolbarItemCount));

                    if (newItemCount !== this._toolbarItemCount)
                    {
                        // Remove all existing item paths
                        let ruler: RulerControl = this;
                        let toolbarItemPaths: D3Selection = this._gRuler.selectAll("path").filter<DomElement>(function ()
                        {
                            return ((this as SVGPathElement).getAttribute("id").indexOf(RulerControl.ID_PREFIX + "ToolbarItem") === 0);
                        });
                        toolbarItemPaths.remove();
                        this._selectedToolbarItemNumber = -1;

                        // Add new items paths
                        for (let i = 0; i < newItemCount; i++)
                        {
                            let itemPath: D3SingleSelection = this._gRuler.append("path").attr("id", RulerControl.ID_PREFIX + "ToolbarItem" + i);

                            if (this._toolbarItemStyler !== null)
                            {
                                this._toolbarItemStyler(itemPath, i);
                                // Scale the path (which must be made up of only M/L/m/a commands so that Utils.ScalePathData()/TranslatePathData() will work)
                                // Note: We don't need to account for the zoomLevel here: redraw() will handle that
                                let pathData: string = itemPath.attr("d");
                                let itemBoundingRect: DOMRect = itemPath.node().getBBox(); // The getBBox() return value is unaffected by the rotation transform [if any] on _gRuler
                                let scale: number = (this.TOOLBAR_ITEM_WIDTH - (RulerControl.TOOLBAR_ITEM_MARGIN * 2)) / itemBoundingRect.width;
                                let scaledPathData: string = Utils.ScalePathData(pathData, scale);

                                itemPath.attr("d", scaledPathData);
                                itemPath.node().__MILOriginalD__ = itemPath.attr("d");

                                let strokeWidth: number = Utils.ToNumber(itemPath.style("stroke-width"));
                                itemPath.node().__MILOriginalStrokeWidth__ = strokeWidth ? strokeWidth : 1;
                            }
                            else
                            {
                                throw new MILException("RulerControl.ToolbarItemStyler() must be set before setting RulerControl.ToolbarItemCount()");
                            }
                        }

                        // Bring the toolbar path to the top so that it's the top hit-target, not the itemPath's
                        let toolbarPath: DomElement = this._toolbarPath.remove().node();
                        this._gRuler.node().appendChild(toolbarPath);

                        this._toolbarItemCount = newItemCount;
                        this.redraw();
                    }

                    return (this);
                }
            }

            /**
             * [Chainable Property] The index (0..n) of the currently selected toolbar item, or -1 if no toolbar item is currently selected.
             * If the toolbar item with the specified itemNumber (0..n) is already selected it will be de-selected.
             * @param {number} itemNumber A 0..n index.
             * @returns {this | number} Either the property value (if getting), or the RulerControl instance (if setting).
             */
            SelectedToolbarItemNumber(itemNumber: number): this;
            SelectedToolbarItemNumber(): number;
            SelectedToolbarItemNumber(itemNumber?: number): this | number
            {
                if (itemNumber === undefined)
                {
                    return (this._selectedToolbarItemNumber);
                }
                else
                {
                    let oldItemNumber: number = this._selectedToolbarItemNumber;
                    let newItemNumber: number = Math.max(0, Math.min(itemNumber, this._toolbarItemCount - 1));

                    newItemNumber = (newItemNumber === this._selectedToolbarItemNumber) ? -1 : newItemNumber;

                    if (newItemNumber !== oldItemNumber)
                    {
                        this._selectedToolbarItemNumber = newItemNumber;
                        if (this._onToolbarSelectionChanged !== null)
                        {
                            this._onToolbarSelectionChanged.call(this, oldItemNumber);
                        }
                        this.redraw();
                    }
                    return (this);
                }
            }

            /**
             * [Chainable Property] The callback that will be invoked when the selected toolbar item changes.
             * @param {RulerToolbarItemSelectionChangedHandler} handler A RulerToolbarItemSelectionChangedHandler.
             * @returns {this | RulerToolbarItemSelectionChangedHandler} Either the property value (if getting), or the RulerControl instance (if setting).
             */
            OnToolbarSelectionChanged(handler: RulerToolbarItemSelectionChangedHandler): this;
            OnToolbarSelectionChanged(): RulerToolbarItemSelectionChangedHandler;
            OnToolbarSelectionChanged(handler?: RulerToolbarItemSelectionChangedHandler): this | RulerToolbarItemSelectionChangedHandler
            {
                return (getOrSetProperty(this, nameof(() => this._onToolbarSelectionChanged), handler));
            }

            /**
             * [Chainable Property] The fill color to draw a selected toolbar item with.
             * @param {string} [color] [Optional] A CSS color.
             * @returns {this | string} Either the property value (if getting), or the RulerControl instance (if setting).
             */
            ToolbarItemSelectedColor(color: string): this;
            ToolbarItemSelectedColor(): string;
            ToolbarItemSelectedColor(color?: string): this | string
            {
                return (getOrSetProperty(this, MIL.nameof(() => this._toolbarItemSelectedColor), color, () => this.redraw()));
            }

            /**
             * [Chainable Property] The callback that will be invoked when drawing the toolbar items.
             * @param {RulerToolbarItemStylerCallback} callback A RulerToolbarItemStylerCallback.
             * @returns {this | RulerToolbarItemStylerCallback} Either the property value (if getting), or the RulerControl instance (if setting).
             */
            ToolbarItemStyler(callback: RulerToolbarItemStylerCallback): this;
            ToolbarItemStyler(): RulerToolbarItemStylerCallback;
            ToolbarItemStyler(callback?: RulerToolbarItemStylerCallback): this | RulerToolbarItemStylerCallback
            {
                return (getOrSetProperty(this, nameof(() => this._toolbarItemStyler), callback));
            }

            /**
             * [Chainable Property] Whether the RulerControl is visible or not.
             * @param {boolean} visible Flag.
             * @returns {this | boolean} Either the property value (if getting), or the RulerControl instance (if setting).
             */
            IsVisible(visible: boolean): this;
            IsVisible(): boolean;
            IsVisible(visible?: boolean): this | boolean
            {
                return (getOrSetProperty(this, MIL.nameof(() => this._isVisible), visible, () => this.redraw()));
            }

            /**
             * Returns true if the RulerControl is is view by at least targetPercentVisible.
             * @param {number} [targetPercentVisible] [Optional] A percentage (> 0.00, <= 1.00) that specifies how much of the RulerControl has to be visible for it to be considered "in view".
             * @returns {boolean} Result.
             */
            IsInView(targetPercentVisible: number = 0.33): boolean
            {
                let svgInfo: SVGInfo = getSvgInfo(this._gDomElement);
                let viewRectPoints: Point[] = Utils.ViewableSvgAreaPoints(svgInfo.gDomElement, 0);
                let rulerRectPoints: Point[] = Utils.SamplePointsFromPath(this._outlinePath.node() as SVGPathElement); // This is a sampling of points, not all actual points
                let totalRulerRectPointsCount: number = rulerRectPoints.length;
                let visibleRulerRectPointsCount: number = Utils.CountPointsInPolygon(viewRectPoints, rulerRectPoints);
                let percentVisible: number = visibleRulerRectPointsCount / totalRulerRectPointsCount;
                let isInView: boolean = (percentVisible >= targetPercentVisible);

                return (isInView);
            }

            /** 
             * Centers the RulerControl in the center of the parent <svg> element. 
             * @returns {RulerControl} The RulerControl instance.
             */
            CenterInView(): RulerControl
            {
                let svgInfo: SVGInfo = getSvgInfo(this._gDomElement);
                let viewRect: ClientRect = svgInfo.svgDomElement.getBoundingClientRect(); // In screen coordinates
                let centerPoint: Point = { x: viewRect.left + (viewRect.width / 2), y: viewRect.top + (viewRect.height / 2) };

                this.CenterPoint(TransposeScreenPoint(centerPoint, this._gDomElement));
                return (this);
            }

            /** Ensures that the RulerControl is the top-most element in the parent <g> element it was created in. */
            BringToFront(): void
            {
                if (bringToFront(this._gRuler.node(), this._gDomElement))
                {
                    log(RulerControl.CONTROL_TYPE + ": Brought to front", FeatureNames.Controls);
                }
            }

            /**
             * [Private Method] Returns a line (in svg space) of the supplied start and end points.
             * @param {XY} startPoint The start point of the line.
             * @param {XY} endPoint The end pointof the line.
             * @returns {SVGLine} Result.
             */
            private getSvgLine(startPoint: XY, endPoint: XY): SVGLine
            {
                let svgDomElement = this._gDomElement.ownerSVGElement;
                let startSvgPoint = svgDomElement.createSVGPoint();
                let endSvgPoint = svgDomElement.createSVGPoint();

                startSvgPoint.x = startPoint[0];
                startSvgPoint.y = startPoint[1];
                endSvgPoint.x = endPoint[0];
                endSvgPoint.y = endPoint[1];

                let line: SVGLine = [
                    // startPoint/endPoint are in SVG coordinate space, so they already take the translate/scale transform (see zoomAtPoint()) of _gDomElement
                    // into account, but they do NOT take the ruler transform into account. Consequently we have to use GetTransformedPoints() to address this.
                    Utils.GetTransformedPoints(this._gRuler.node() as SVGGElement, [startSvgPoint])[0],
                    Utils.GetTransformedPoints(this._gRuler.node() as SVGGElement, [endSvgPoint])[0]
                ];

                return (line);
            }

            /**
             * Returns the line (in SVG space) of the face-edge of the RulerControl instance. 
             * @returns {SVGLine} Result.
             */
            GetFaceEdgeLine(): SVGLine
            {
                let faceEdgeLine = this.getSvgLine(this._faceEdgeStartPoint, this._faceEdgeEndPoint);
                return (faceEdgeLine);
            }

            /**
             * Returns the line (in SVG space) of the center of the RulerControl instance.
             * @returns {SVGLine} Result.
             */
            GetCenterLine(): SVGLine
            {
                let centerLine: SVGLine = this.getSvgLine(this._centerLineStartPoint, this._centerLineEndPoint);
                return (centerLine);
            }

            /** [Private Method] Adds the default Gestures (Move, RotateAndMove, Tap, ToolbarTap) to the RulerControl instance. */
            private addDefaultGestures(): void
            {
                if (this._defaultMoveGesture !== null)
                {
                    // Already added
                    return;
                }

                let ruler: RulerControl = this;
                let initialXOffsetToCenterLine: number = 0;
                let initialYOffsetToCenterLine: number = 0;
                let onRulerMove: PointerEventHandler = function (e: PointerEvent)
                {
                    ruler.onRulerMove(e, initialXOffsetToCenterLine, initialYOffsetToCenterLine);
                };
                let startPointXOffsetToCenterLine: number = 0;
                let startPointYOffsetToCenterLine: number = 0;
                let endPointXOffsetToCenterLine: number = 0;
                let endPointYOffsetToCenterLine: number = 0;
                let centerPointRatio: number = 0;
                let onRulerRotateAndMove: PointerEventHandler = function (e: PointerEvent)
                {
                    ruler.onRulerRotateAndMove(e, startPointXOffsetToCenterLine, startPointYOffsetToCenterLine, endPointXOffsetToCenterLine, endPointYOffsetToCenterLine, centerPointRatio);
                };

                this._defaultMoveGesture = MIL.CreateGesture("DefaultRulerMove*", true)
                    .Target(ruler._outlinePath)
                    .PointerType("touch")
                    .Conditional(function () { return (MIL.Utils.IsNoKeyPressed()); })
                    .GestureStartedHandler(function ()
                    {
                        let gesture: Gesture = this;
                        let newMovePoint: Point = ruler._prevMovePoint = gesture.GetCurrentSvgPoint("{P1}");
                        let line: SVGLine = ruler.GetFaceEdgeLine();
                        let lineStartPoint: Point = line[0], lineEndPoint: Point = line[1];
                        let lineLength: number = Utils.GetDistanceBetweenPoints(lineStartPoint, lineEndPoint);
                        let pointOnLine: Point = Utils.GetClosestPointOnLine(newMovePoint, lineStartPoint, lineEndPoint);

                        // If the ruler is touched near either end then we rotate (instead of move) the ruler, but only if the ruler is 100% in-view
                        ruler._oneTouchRotationInProgress = ruler.IsInView(1) &&
                            ((Utils.GetDistanceBetweenPoints(pointOnLine, lineStartPoint) < (lineLength * RulerControl.RULER_ENDS_TARGET_REGION_WIDTH_RATIO)) ||
                             (Utils.GetDistanceBetweenPoints(pointOnLine, lineEndPoint) < (lineLength * RulerControl.RULER_ENDS_TARGET_REGION_WIDTH_RATIO)));

                        if (ruler._oneTouchRotationInProgress)
                        {
                            let rulerCenterLine: SVGLine = ruler.GetCenterLine();
                            let pointOnRulerCenterLine: Point = Utils.GetClosestPointOnLine(newMovePoint, rulerCenterLine[0], rulerCenterLine[1]);
                            initialXOffsetToCenterLine = pointOnRulerCenterLine.x - newMovePoint.x;
                            initialYOffsetToCenterLine = pointOnRulerCenterLine.y - newMovePoint.y;
                        }

                        gesture.OnMoveHandler(onRulerMove);
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
                        let gesture: Gesture = this;
                        let rulerCenterLine: SVGLine = ruler.GetCenterLine();
                        let centerLineStartPoint: Point = rulerCenterLine[0], centerLineEndPoint: Point = rulerCenterLine[1];
                        let centerLineLength: number = Utils.GetDistanceBetweenPoints(centerLineStartPoint, centerLineEndPoint);
                        let point1: Point = gesture.GetCurrentSvgPoint("{P1}");
                        let point2: Point = gesture.GetCurrentSvgPoint("{P2}");
                        let heading: number = Utils.GetHeadingFromPoints(point1, point2);
                        // To prevent the ruler from doing a 180-degree "flip" (based on the the heading computed
                        // from the touch points) we check that the heading is aligned with the ruler angle
                        let isHeadingAlignedWithRuler: boolean = Utils.AreHeadingsAligned(heading, ruler.RotationAngle(), 30);
                        ruler._rotateStartPointPointerType = isHeadingAlignedWithRuler ? "{P1}" : "{P2}";
                        ruler._rotateEndPointPointerType = isHeadingAlignedWithRuler ? "{P2}" : "{P1}";

                        let startPointOnLine: Point = Utils.GetClosestPointOnLine(isHeadingAlignedWithRuler ? point1 : point2, centerLineStartPoint, centerLineEndPoint);
                        let endPointOnLine: Point = Utils.GetClosestPointOnLine(isHeadingAlignedWithRuler ? point2 : point1, centerLineStartPoint, centerLineEndPoint);

                        startPointXOffsetToCenterLine = startPointOnLine.x - (isHeadingAlignedWithRuler ? point1 : point2).x;
                        startPointYOffsetToCenterLine = startPointOnLine.y - (isHeadingAlignedWithRuler ? point1 : point2).y;
                        endPointXOffsetToCenterLine = endPointOnLine.x - (isHeadingAlignedWithRuler ? point2 : point1).x;
                        endPointYOffsetToCenterLine = endPointOnLine.y - (isHeadingAlignedWithRuler ? point2 : point1).y;
                        centerPointRatio = Utils.GetDistanceBetweenPoints(startPointOnLine, ruler.CenterPoint()) / Utils.GetDistanceBetweenPoints(startPointOnLine, endPointOnLine);

                        if (((startPointOnLine.x > ruler.CenterPoint().x) && (endPointOnLine.x > ruler.CenterPoint().x)) ||
                            ((startPointOnLine.x < ruler.CenterPoint().x) && (endPointOnLine.x < ruler.CenterPoint().x)))
                        {
                            // We could support this but it would add complexity, so for simplicity we simply disallow it
                            gesture.Cancel("Touch points must be on different sides of the center-point of the ruler");
                            return;
                        }

                        if (ruler._isResizable)
                        {
                            // If the ruler is touched close to its ends then we resize (instead of move/rotate) the ruler
                            ruler._rulerResizeInProgress =
                                (Utils.GetDistanceBetweenPoints(startPointOnLine, centerLineStartPoint) < (centerLineLength * RulerControl.RULER_ENDS_TARGET_REGION_WIDTH_RATIO)) &&
                                (Utils.GetDistanceBetweenPoints(endPointOnLine, centerLineEndPoint) < (centerLineLength * RulerControl.RULER_ENDS_TARGET_REGION_WIDTH_RATIO));
                            ruler._rulerResizeStartDistance = gesture.GetDistance("{P1}", "{P2}");
                            ruler._rulerResizeStartWidth = ruler.Width();
                        }

                        gesture.OnMoveHandler(onRulerRotateAndMove);
                    })
                    .GestureEndedHandler(function ()
                    {
                        ruler._rotateStartPointPointerType = null;
                        ruler._rotateEndPointPointerType = null;
                    });

                this._defaultTapGesture = MIL.BuiltInGestures.Tap("DefaultRulerTap", ruler._outlinePath, "touch", function ()
                {
                    let currentAngle: number = ruler.RotationAngle();
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
                this._defaultToolbarTapGesture = MIL.BuiltInGestures.Tap("DefaultRulerToolbarTap", ruler._toolbarPath, "any", function ()
                {
                    // Determine which toolbar item was tapped
                    let gesture: Gesture = this;
                    let tapPoint: Point = gesture.GetStartSvgPoint("{P1}");
                    let line: SVGLine = ruler.GetFaceEdgeLine();
                    let lineStartPoint: Point = line[0], lineEndPoint: Point = line[1];
                    let pointOnLine: Point = Utils.GetClosestPointOnLine(tapPoint, lineStartPoint, lineEndPoint);
                    let pointOffset: number = Utils.GetDistanceBetweenPoints(lineStartPoint, pointOnLine);

                    // Utils.DebugDrawPoints(ruler._gDomElement, [{ x: lineStartPoint.x + pointOffset, y: pointOnLine.y }], 5);

                    // Note: ruler._toolbarWidth already accounts for zooming
                    let scaleFactor: number = ruler._keepConstantScale ? getSvgInfo(ruler._gDomElement).zoomLevel : 1;
                    let toolbarStartOffset: number = (((ruler._width / scaleFactor) - ruler._toolbarWidth) / 2);
                    let toolbarItemWidth: number = (ruler.TOOLBAR_ITEM_WIDTH / scaleFactor);
                    let toolbarItemNumber: number = Math.floor((pointOffset - toolbarStartOffset) / toolbarItemWidth);

                    ruler.SelectedToolbarItemNumber(toolbarItemNumber);
                }, 200, 5).RecognitionTimeoutInMs(0).AllowEventPropagation(false);

                MIL.AddGesture(this._defaultMoveGesture);
                MIL.AddGesture(this._defaultRotateAndMoveGesture);
                MIL.AddGesture(this._defaultTapGesture);
                MIL.AddGesture(this._defaultToolbarTapGesture);
            }

            /** Removes the default Gestures from the RulerControl instance. This allows the control to be completely "re-skinned" with new gestures. */
            RemoveDefaultGestures(): void
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

            /**
             * [Private Method] Handler for the 'Move' event of _defaultMoveGesture.
             * @param {PointerEvent} e A pointerMove event.
             * @param {number} initialXOffsetToCenterLine The x-axis distance between the initial touch-point and the closest point to that touch-point on the RulerControl's centerline.
             * @param {number} initialYOffsetToCenterLine The y-axis distance between the initial touch-point and the closest point to that touch-point on the RulerControl's centerline.
             */
            private onRulerMove(e: PointerEvent, initialXOffsetToCenterLine: number, initialYOffsetToCenterLine: number): void
            {
                let ruler: RulerControl = this; // PORT: Added

                // The _defaultRotateAndMoveGesture rule (if active) also handles moving the ruler
                if (ruler._defaultRotateAndMoveGesture.IsActive())
                {
                    return;
                }

                let gesture: Gesture = ruler._defaultMoveGesture;
                let newMovePoint: Point = gesture.GetCurrentSvgPoint("{P1}");

                // If the ruler is touched in either the first or last 20% then we rotate (instead of move) the ruler
                if (ruler._oneTouchRotationInProgress)
                {
                    // To prevent the ruler's rotation from making a sudden "jump" to the rotation based on the heading from the
                    // center-point to the initial touch-point, we adjust the touch-point to as if it had occurred on the centerline
                    let adjustedMovePoint: Point = { x: newMovePoint.x + initialXOffsetToCenterLine, y: newMovePoint.y + initialYOffsetToCenterLine };
                    let heading: number = Utils.GetHeadingFromPoints(ruler.CenterPoint(), adjustedMovePoint);
                    // To prevent the ruler from doing a 180-degree "flip" (based on the the heading computed
                    // from the touch point) we check that the heading is aligned with the ruler angle
                    let isHeadingAlignedWithRuler: boolean = Utils.AreHeadingsAligned(heading, ruler.RotationAngle(), 30);

                    if (!isHeadingAlignedWithRuler)
                    {
                        heading = Utils.GetHeadingFromPoints(adjustedMovePoint, ruler.CenterPoint());
                    }
                    ruler.RotationAngle(heading);
                }
                else
                {
                    // The normal move case
                    let deltaX: number = newMovePoint.x - ruler._prevMovePoint.x;
                    let deltaY: number = newMovePoint.y - ruler._prevMovePoint.y;
                    let newCenterPoint: Point = { x: ruler.CenterPoint().x + deltaX, y: ruler.CenterPoint().y + deltaY };

                    ruler.CenterPoint(newCenterPoint);
                    ruler._prevMovePoint = newMovePoint;
                }
            }

            /**
             * [Private Method] Handler for the 'Move' event of _defaultRotateAndMoveGesture.
             * @param {PointerEvent} e A pointerMove event.
             * @param {number} startPointXOffsetToCenterLine The x-axis distance between the initial "start" (first) touch-point and the closest point to that touch-point on the RulerControl's centerline.
             * @param {number} startPointYOffsetToCenterLine The y-axis distance between the initial "start" (first) touch-point and the closest point to that touch-point on the RulerControl's centerline.
             * @param {number} endPointXOffsetToCenterLine The x-axis distance between the initial "end" (second) touch-point and the closest point to that touch-point on the RulerControl's centerline.
             * @param {number} endPointYOffsetToCenterLine The y-axis distance between the initial "end" (second) touch-point and the closest point to that touch-point on the RulerControl's centerline.
             * @param {number} centerPointRatio The ratio describing how the startPoint/endPoint straddle the center-point of the RulerControl.
             */
            private onRulerRotateAndMove(e: PointerEvent, startPointXOffsetToCenterLine: number, startPointYOffsetToCenterLine: number, endPointXOffsetToCenterLine: number, endPointYOffsetToCenterLine: number, centerPointRatio: number): void
            {
                let ruler: RulerControl = this; // PORT: Added
                let gesture: Gesture = ruler._defaultRotateAndMoveGesture;

                if (ruler._rulerResizeInProgress)
                {
                    let distance: number = gesture.GetDistance("{P1}", "{P2}");
                    let newWidth: number = (distance / ruler._rulerResizeStartDistance) * ruler._rulerResizeStartWidth;
                    ruler.Width(newWidth);
                }
                else
                {
                    // To prevent the ruler's rotation from making a sudden "jump" to the rotation based on the heading between
                    // the start/end touch-points, we adjust the touch-points to as if they had occurred on the centerline

                    let startPoint: Point = gesture.GetCurrentSvgPoint(ruler._rotateStartPointPointerType);
                    startPoint.x += startPointXOffsetToCenterLine;
                    startPoint.y += startPointYOffsetToCenterLine;

                    let endPoint: Point = gesture.GetCurrentSvgPoint(ruler._rotateEndPointPointerType);
                    endPoint.x += endPointXOffsetToCenterLine;
                    endPoint.y += endPointYOffsetToCenterLine;

                    // To prevent the ruler's position from making a sudden "jump" to a centerpoint based on the exact mid-point between
                    // the start/end touch points, we adjust the mid-point by the center-offset ratio determined during the initial contact
                    let angle: number = Utils.GetHeadingFromPoints(startPoint, endPoint);
                    let centerPoint: Point = {
                        x: startPoint.x + ((endPoint.x - startPoint.x) * centerPointRatio),
                        y: startPoint.y + ((endPoint.y - startPoint.y) * centerPointRatio)
                    };

                    ruler.BeginUpdate().RotationAngle(angle).CenterPoint(centerPoint).EndUpdate();

                    // We do this so that the "move" gesture (which suspends itself while "rotateAndMove" is active) can resume smoothly
                    // (ie. when one finger is lifted [so "rotateAndMove" ends] but one finger remains [so "move" is still active])
                    ruler._prevMovePoint = gesture.GetCurrentSvgPoint("{P1}");
                }
            }
        }
    }
}