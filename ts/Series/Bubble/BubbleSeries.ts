/* *
 *
 *  (c) 2010-2021 Torstein Honsi
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 * */

'use strict';

/* *
 *
 *  Imports
 *
 * */

import type Axis from '../../Core/Axis/Axis';
import type BubbleSeriesOptions from './BubbleSeriesOptions';
import type Chart from '../../Core/Chart/Chart';
import type Legend from '../../Core/Legend/Legend';
import type Point from '../../Core/Series/Point';
import type SeriesType from '../../Core/Series/Series';
import type { StatesOptionsKey } from '../../Core/Series/StatesOptions';
import type SVGAttributes from '../../Core/Renderer/SVG/SVGAttributes';

import BubbleLegendComposition from './BubbleLegendComposition.js';
import BubblePoint from './BubblePoint.js';
import Color from '../../Core/Color/Color.js';
import ColorType from '../../Core/Color/ColorType';
const { parse: color } = Color;
import H from '../../Core/Globals.js';
const { noop } = H;
import SeriesRegistry from '../../Core/Series/SeriesRegistry.js';
import { SymbolKey } from '../../Core/Renderer/SVG/SymbolType';
const {
    series: Series,
    seriesTypes: {
        column: {
            prototype: columnProto
        },
        scatter: ScatterSeries
    }
} = SeriesRegistry;
import U from '../../Core/Utilities.js';
const {
    addEvent,
    arrayMax,
    arrayMin,
    clamp,
    correctFloat,
    defined,
    extend,
    isArray,
    isNumber,
    merge,
    pick
} = U;

/* *
 *
 *  Declarations
 *
 * */

declare module '../../Core/Chart/ChartLike'{
    interface ChartLike {
        bubbleZExtremes?: BubbleZExtremes;
    }
}

declare module '../../Core/Axis/AxisLike' {
    interface AxisLike {
        beforePadding?(): void;
    }
}

declare module '../../Core/Series/SeriesLike' {
    interface SeriesLike {
        bubblePadding?: BubbleSeries['bubblePadding'];
        radii?: BubbleSeries['radii'];
        specialGroup?: BubbleSeries['specialGroup'];
        zData?: BubbleSeries['zData'];
    }
}

type BubblePxExtremes = { minPxSize: number; maxPxSize: number };

type BubbleZExtremes = { zMin: number; zMax: number };

/* *
 *
 *  Constants
 *
 * */

const composedClasses: Array<Function> = [];

/* *
 *
 *  Functions
 *
 * */

/**
 * Add logic to pad each axis with the amount of pixels necessary to avoid the
 * bubbles to overflow.
 */
function axisBeforePadding(
    this: Axis
): void {
    const axisLength = this.len,
        chart = this.chart,
        isXAxis = this.isXAxis,
        dataKey = isXAxis ? 'xData' : 'yData',
        min = this.min,
        range = (this.max as any) - (min as any);

    let pxMin = 0,
        pxMax = axisLength,
        transA = axisLength / range,
        hasActiveSeries;

    // Handle padding on the second pass, or on redraw
    this.series.forEach((series): void => {

        if (
            series.bubblePadding &&
            (series.visible || !chart.options.chart.ignoreHiddenSeries)
        ) {
            // Correction for #1673
            this.allowZoomOutside = true;

            hasActiveSeries = true;

            const data = (series as any)[dataKey];

            if (isXAxis) {
                (series.onPoint || (series as any)).getRadii(0, 0, series);
                if (series.onPoint) {
                    series.radii = series.onPoint.radii;
                }
            }

            if (range > 0) {
                let i = data.length;
                while (i--) {
                    if (
                        isNumber(data[i]) &&
                        (this.dataMin as any) <= data[i] &&
                        data[i] <= (this.max as any)
                    ) {
                        const radius = series.radii && series.radii[i] || 0;
                        pxMin = Math.min(
                            ((data[i] - (min as any)) * transA) - radius,
                            pxMin
                        );
                        pxMax = Math.max(
                            ((data[i] - (min as any)) * transA) + radius,
                            pxMax
                        );
                    }
                }
            }
        }
    });

    // Apply the padding to the min and max properties
    if (hasActiveSeries && range > 0 && !this.logarithmic) {
        pxMax -= axisLength;
        transA *= (
            axisLength +
            Math.max(0, pxMin) - // #8901
            Math.min(pxMax, axisLength)
        ) / axisLength;
        (
            [
                ['min', 'userMin', pxMin],
                ['max', 'userMax', pxMax]
            ] as Array<[string, string, number]>
        ).forEach((keys: [string, string, number]): void => {
            if (
                typeof pick(
                    (this.options as any)[keys[0]],
                    (this as any)[keys[1]]
                ) === 'undefined'
            ) {
                (this as any)[keys[0]] += keys[2] / transA;
            }
        });
    }

}

/* *
 *
 *  Class
 *
 * */

class BubbleSeries extends ScatterSeries {

    /* *
     *
     *  Static Properties
     *
     * */

    /**
     * A bubble series is a three dimensional series type where each point
     * renders an X, Y and Z value. Each points is drawn as a bubble where the
     * position along the X and Y axes mark the X and Y values, and the size of
     * the bubble relates to the Z value.
     *
     * @sample {highcharts} highcharts/demo/bubble/
     *         Bubble chart
     *
     * @extends      plotOptions.scatter
     * @excluding    cluster
     * @product      highcharts highstock
     * @requires     highcharts-more
     * @optionparent plotOptions.bubble
     */
    public static defaultOptions: BubbleSeriesOptions = merge(ScatterSeries.defaultOptions, {

        /**
         * Set of colors for each point (each point will have multiple
         * graphics). Can be an array of strings (if 3 colors defined, every
         * next marker is 33.3% smaller) or an array of color stops (e.g. for
         * `[[0.2, '#ff0000'], [1, '#0000ff']]` the smallest top marker is 5
         * times smaller than the biggest bottom one).
         *
         * @sample highcharts/demo/bubble-blend-colors
         *         Blend colors
         * @sample highcharts/series-bubble/blend-colors
         *         Blend colors themes and steps
         * @sample {highmaps} maps/demo/blend-colors
         *         Blend colors with mapbubble
         *
         * @since       {next}
         * @type        {Array<ColorType>|Array<Array<number,ColorType>>}
         * @apioption   plotOptions.bubble.blendColors
         */

        dataLabels: {
            formatter: function (
                this: Point.PointLabelObject
            ): string { // #2945
                const { numberFormatter } = this.series.chart;
                const { z } = (this.point as BubblePoint);

                return isNumber(z) ? numberFormatter(z, -1) : '';
            },
            inside: true,
            verticalAlign: 'middle'
        },

        /**
         * If there are more points in the series than the `animationLimit`, the
         * animation won't run. Animation affects overall performance and
         * doesn't work well with heavy data series.
         *
         * @since 6.1.0
         */
        animationLimit: 250,

        /**
         * Whether to display negative sized bubbles. The threshold is given
         * by the [zThreshold](#plotOptions.bubble.zThreshold) option, and negative
         * bubbles can be visualized by setting
         * [negativeColor](#plotOptions.bubble.negativeColor).
         *
         * @sample {highcharts} highcharts/plotoptions/bubble-negative/
         *         Negative bubbles
         *
         * @type      {boolean}
         * @default   true
         * @since     3.0
         * @apioption plotOptions.bubble.displayNegative
         */

        /**
         * @extends   plotOptions.series.marker
         * @excluding enabled, enabledThreshold, height, radius, width
         */
        marker: {

            lineColor: null as any, // inherit from series.color

            lineWidth: 1,

            /**
             * The fill opacity of the bubble markers.
             */
            fillOpacity: 0.5,

            /**
             * In bubble charts, the radius is overridden and determined based
             * on the point's data value.
             *
             * @ignore-option
             */
            radius: null as any,

            states: {
                hover: {
                    radiusPlus: 0
                }
            },

            /**
             * A predefined shape or symbol for the marker. Possible values are
             * "circle", "square", "diamond", "triangle" and "triangle-down".
             *
             * Additionally, the URL to a graphic can be given on the form
             * `url(graphic.png)`. Note that for the image to be applied to
             * exported charts, its URL needs to be accessible by the export
             * server.
             *
             * Custom callbacks for symbol path generation can also be added to
             * `Highcharts.SVGRenderer.prototype.symbols`. The callback is then
             * used by its method name, as shown in the demo.
             *
             * @sample {highcharts} highcharts/plotoptions/bubble-symbol/
             *         Bubble chart with various symbols
             * @sample {highcharts} highcharts/plotoptions/series-marker-symbol/
             *         General chart with predefined, graphic and custom markers
             *
             * @type  {Highcharts.SymbolKeyValue|string}
             * @since 5.0.11
             */
            symbol: 'circle'

        },

        /**
         * Minimum bubble size. Bubbles will automatically size between the
         * `minSize` and `maxSize` to reflect the `z` value of each bubble.
         * Can be either pixels (when no unit is given), or a percentage of
         * the smallest one of the plot width and height.
         *
         * @sample {highcharts} highcharts/plotoptions/bubble-size/
         *         Bubble size
         *
         * @type    {number|string}
         * @since   3.0
         * @product highcharts highstock
         */
        minSize: 8,

        /**
         * Maximum bubble size. Bubbles will automatically size between the
         * `minSize` and `maxSize` to reflect the `z` value of each bubble.
         * Can be either pixels (when no unit is given), or a percentage of
         * the smallest one of the plot width and height.
         *
         * @sample {highcharts} highcharts/plotoptions/bubble-size/
         *         Bubble size
         *
         * @type    {number|string}
         * @since   3.0
         * @product highcharts highstock
         */
        maxSize: '20%',

        /**
         * When a point's Z value is below the
         * [zThreshold](#plotOptions.bubble.zThreshold)
         * setting, this color is used.
         *
         * @sample {highcharts} highcharts/plotoptions/bubble-negative/
         *         Negative bubbles
         *
         * @type      {Highcharts.ColorString|Highcharts.GradientColorObject|Highcharts.PatternObject}
         * @since     3.0
         * @product   highcharts
         * @apioption plotOptions.bubble.negativeColor
         */

        /**
         * Whether the bubble's value should be represented by the area or the
         * width of the bubble. The default, `area`, corresponds best to the
         * human perception of the size of each bubble.
         *
         * @sample {highcharts} highcharts/plotoptions/bubble-sizeby/
         *         Comparison of area and size
         *
         * @type       {Highcharts.BubbleSizeByValue}
         * @default    area
         * @since      3.0.7
         * @apioption  plotOptions.bubble.sizeBy
         */

        /**
         * When this is true, the absolute value of z determines the size of
         * the bubble. This means that with the default `zThreshold` of 0, a
         * bubble of value -1 will have the same size as a bubble of value 1,
         * while a bubble of value 0 will have a smaller size according to
         * `minSize`.
         *
         * @sample    {highcharts} highcharts/plotoptions/bubble-sizebyabsolutevalue/
         *            Size by absolute value, various thresholds
         *
         * @type      {boolean}
         * @default   false
         * @since     4.1.9
         * @product   highcharts
         * @apioption plotOptions.bubble.sizeByAbsoluteValue
         */

        /**
         * When this is true, the series will not cause the Y axis to cross
         * the zero plane (or [threshold](#plotOptions.series.threshold) option)
         * unless the data actually crosses the plane.
         *
         * For example, if `softThreshold` is `false`, a series of 0, 1, 2,
         * 3 will make the Y axis show negative values according to the
         * `minPadding` option. If `softThreshold` is `true`, the Y axis starts
         * at 0.
         *
         * @since   4.1.9
         * @product highcharts
         */
        softThreshold: false,

        states: {
            hover: {
                halo: {
                    size: 5
                }
            }
        },

        tooltip: {
            pointFormat: '({point.x}, {point.y}), Size: {point.z}'
        },

        turboThreshold: 0,

        /**
         * The minimum for the Z value range. Defaults to the highest Z value
         * in the data.
         *
         * @see [zMin](#plotOptions.bubble.zMin)
         *
         * @sample {highcharts} highcharts/plotoptions/bubble-zmin-zmax/
         *         Z has a possible range of 0-100
         *
         * @type      {number}
         * @since     4.0.3
         * @product   highcharts
         * @apioption plotOptions.bubble.zMax
         */

        /**
         * @default   z
         * @apioption plotOptions.bubble.colorKey
         */

        /**
         * The minimum for the Z value range. Defaults to the lowest Z value
         * in the data.
         *
         * @see [zMax](#plotOptions.bubble.zMax)
         *
         * @sample {highcharts} highcharts/plotoptions/bubble-zmin-zmax/
         *         Z has a possible range of 0-100
         *
         * @type      {number}
         * @since     4.0.3
         * @product   highcharts
         * @apioption plotOptions.bubble.zMin
         */

        /**
         * When [displayNegative](#plotOptions.bubble.displayNegative) is `false`,
         * bubbles with lower Z values are skipped. When `displayNegative`
         * is `true` and a [negativeColor](#plotOptions.bubble.negativeColor)
         * is given, points with lower Z is colored.
         *
         * @sample {highcharts} highcharts/plotoptions/bubble-negative/
         *         Negative bubbles
         *
         * @since   3.0
         * @product highcharts
         */
        zThreshold: 0,

        zoneAxis: 'z'

    } as BubbleSeriesOptions);

    /* *
     *
     *  Static Functions
     *
     * */

    public static compose(
        AxisClass: typeof Axis,
        ChartClass: typeof Chart,
        LegendClass: typeof Legend,
        SeriesClass: typeof SeriesType
    ): void {
        BubbleLegendComposition.compose(ChartClass, LegendClass, SeriesClass);

        if (composedClasses.indexOf(AxisClass) === -1) {
            composedClasses.push(AxisClass);

            AxisClass.prototype.beforePadding = axisBeforePadding;
        }

    }

    /* *
     *
     *  Properties
     *
     * */

    public data: Array<BubblePoint> = void 0 as any;

    public displayNegative: BubbleSeriesOptions['displayNegative'];

    public maxPxSize: number = void 0 as any;

    public minPxSize: number = void 0 as any;

    public options: BubbleSeriesOptions = void 0 as any;

    public points: Array<BubblePoint> = void 0 as any;

    public radii: Array<(number|null)> = void 0 as any;

    public yData: Array<(number|null)> = void 0 as any;

    public zData: Array<(number|null)> = void 0 as any;

    public zMax: BubbleSeriesOptions['zMax'];

    public zMin: BubbleSeriesOptions['zMin'];

    /* *
     *
     *  Functions
     *
     * */

    /**
     * Perform animation on the bubbles
     * @private
     */
    public animate(init?: boolean): void {
        const animationLimit = pick(this.options.animationLimit, Infinity);

        if (!init && this.points.length < animationLimit) { // #8099
            const blendColors = this.options.blendColors;

            // Why ['']? If standard single bubble, perform animation only for
            // one point (one graphic). String element matches in TS
            (blendColors || ['']).forEach((_, i: number): void => {
                this.points.forEach((point): void => {
                    const graphic =
                        (point.graphics && point.graphics[i]) || point.graphic;

                    if (
                        graphic &&
                        graphic.width // URL symbols don't have width
                    ) {
                        // Save the real bubble size
                        const size = {
                            width: graphic.width,
                            height: graphic.height,
                            x: (point.plotX || 0) - graphic.width / 2,
                            y: (point.plotY || 0) - graphic.height / 2
                        };

                        // Make the bubble small, prepare for size animation
                        if (!this.hasRendered) {
                            graphic.attr({
                                x: point.plotX,
                                y: point.plotY,
                                width: 1,
                                height: 1
                            });
                        }

                        // Run animation from 1x1 to a real size
                        graphic.animate(size, this.options.animation);
                    }
                });
            });
        }
    }

    /**
     * Get the radius for each point based on the minSize, maxSize and each
     * point's Z value. This must be done prior to Series.translate because
     * the axis needs to add padding in accordance with the point sizes.
     * @private
     */
    public getRadii(): void {
        const zData = this.zData,
            yData = this.yData,
            radii = [] as Array<(number|null)>;

        let len: number,
            i: number,
            value,
            zExtremes = this.chart.bubbleZExtremes;

        const { minPxSize, maxPxSize } = this.getPxExtremes();

        // Get the collective Z extremes of all bubblish series. The chart-level
        // `bubbleZExtremes` are only computed once, and reset on `updatedData`
        // in any member series.
        if (!zExtremes) {
            let zMin = Number.MAX_VALUE;
            let zMax = -Number.MAX_VALUE;
            let valid;
            this.chart.series.forEach((otherSeries): void => {
                if (
                    otherSeries.bubblePadding && (
                        otherSeries.visible ||
                        !this.chart.options.chart.ignoreHiddenSeries
                    )
                ) {
                    const zExtremes = (
                        otherSeries.onPoint || (otherSeries as any)
                    ).getZExtremes();

                    if (zExtremes) {
                        zMin = Math.min(zMin || zExtremes.zMin, zExtremes.zMin);
                        zMax = Math.max(zMax || zExtremes.zMax, zExtremes.zMax);
                        valid = true;
                    }
                }
            });
            if (valid) {
                zExtremes = { zMin, zMax };
                this.chart.bubbleZExtremes = zExtremes;
            } else {
                zExtremes = { zMin: 0, zMax: 0 };
            }
        }

        // Set the shape type and arguments to be picked up in drawPoints
        for (i = 0, len = zData.length; i < len; i++) {
            value = zData[i];
            // Separate method to get individual radius for bubbleLegend
            radii.push(this.getRadius(
                zExtremes.zMin,
                zExtremes.zMax,
                minPxSize,
                maxPxSize,
                value,
                yData && yData[i]
            ));
        }
        this.radii = radii;
    }

    /**
     * Get the individual radius for one point.
     * @private
     */
    public getRadius(
        zMin: number,
        zMax: number,
        minSize: number,
        maxSize: number,
        value: (number|null|undefined),
        yValue?: (number|null|undefined)
    ): (number|null) {
        const options = this.options,
            sizeByArea = options.sizeBy !== 'width',
            zThreshold = options.zThreshold;

        let zRange = zMax - zMin,
            pos = 0.5;

        // #8608 - bubble should be visible when z is undefined
        if (yValue === null || value === null) {
            return null;
        }

        if (isNumber(value)) {
            // When sizing by threshold, the absolute value of z determines
            // the size of the bubble.
            if (options.sizeByAbsoluteValue) {
                value = Math.abs(value - (zThreshold as any));
                zMax = zRange = Math.max(
                    zMax - (zThreshold as any),
                    Math.abs(zMin - (zThreshold as any))
                );
                zMin = 0;
            }
            // Issue #4419 - if value is less than zMin, push a radius that's
            // always smaller than the minimum size
            if (value < zMin) {
                return minSize / 2 - 1;
            }

            // Relative size, a number between 0 and 1
            if (zRange > 0) {
                pos = (value - zMin) / zRange;
            }
        }

        if (sizeByArea && pos >= 0) {
            pos = Math.sqrt(pos);
        }

        let radius = Math.ceil(minSize + pos * (maxSize - minSize)) / 2;

        // Calculate radius of bubbles based on index of the color in the
        // series.blendColors array.
        if (this.options.blendColors) {
            const colorIndex = this.blendColorIndex || 0,
                sizeFactor = this.sizeFactor ?
                    // If stops defined
                    this.sizeFactor :
                    // If stops not defined, then bubbles sizes decrease evenly
                    // e.g. radii of 4 bubbles: 100%, 75%, 50%, 25%
                    1 - colorIndex / this.options.blendColors.length;

            // Ceiling solves decimal issues and rounds to 1px
            radius = Math.ceil(correctFloat(radius * sizeFactor) * 2) / 2;
        }

        return radius;
    }

    /**
     * Define hasData function for non-cartesian series.
     * Returns true if the series has points at all.
     * @private
     */
    public hasData(): boolean {
        return !!this.processedXData.length; // != 0
    }

    /**
     * @private
     */
    public pointAttribs(
        point?: BubblePoint,
        state?: StatesOptionsKey
    ): SVGAttributes {
        const markerOptions = this.options.marker,
            fillOpacity = (markerOptions as any).fillOpacity,
            attr = Series.prototype.pointAttribs.call(this, point, state);

        if (fillOpacity !== 1) {
            attr.fill = color(attr.fill as any)
                .setOpacity(fillOpacity)
                .get('rgba');
        }

        return attr;
    }

    /**
     * Extend the base translate method to handle bubble size
     * @private
     */
    public translate(): void {

        // Run the parent method
        super.translate();

        this.getRadii();
        this.translateBubble();
    }

    public drawPoints(): void {
        if (!this.options.blendColors) {
            // Run the parent method
            super.drawPoints();
        } else {
            const series = this,
                options = series.options,
                blendColors = this.options.blendColors
                    .slice() // remove reference (for safe reverse)
                    .reverse(); // loop form backward (easier calculations)

            blendColors.forEach((
                color: ColorType|[number, ColorType],
                colorIndex: number
            ): void => {
                // Save size factor for further calculations
                if (isArray(color)) { // if stops defined
                    series.sizeFactor = color[0];

                    color = color[1];
                } else { // If size decreases evenly
                    series.blendColorIndex = colorIndex;
                }

                const colorsLength = blendColors.length,
                    fillColor = {
                        radialGradient: {
                            cx: 0.5,
                            cy: 0.5,
                            r: 0.5
                        },
                        stops: [
                            [colorIndex === colorsLength - 1 ? 0 : 0.5, color],
                            [1, (new Color(color)).setOpacity(0).get('rgba')]
                        ]
                    };

                options.marker = merge(options.marker, { fillColor });

                series.getRadii(); // recalculate radii

                series.translateBubble(); // use radii

                if (
                    options.marker.enabled !== false ||
                    series._hasPointMarkers
                ) {
                    const points = series.points,
                        chart = series.chart,
                        markerGroup = (
                            (series as any)[series.specialGroup as any] ||
                            series.markerGroup
                        );

                    points.forEach((point): void => {
                        point.graphics = point.graphics || [];

                        let graphic = point.graphics[colorIndex];

                        const pointMarkerOptions = point.marker || {},
                            hasPointMarker = !!point.marker,
                            verb = graphic ? 'animate' : 'attr',
                            zMin = this.options.zMin,
                            shouldDrawMarker = (
                                (
                                    (options.marker || {}).enabled &&
                                    typeof pointMarkerOptions.enabled ===
                                        'undefined'
                                ) || pointMarkerOptions.enabled
                            ) &&
                            !point.isNull &&
                            point.visible !== false &&
                            // Above zThreshold
                            (!defined(zMin) || (point.z && point.z >= zMin));

                        if (shouldDrawMarker) {
                            const symbol = pick(
                                    pointMarkerOptions.symbol,
                                    series.symbol,
                                    'rect' as SymbolKey
                                ),
                                markerAttribs = series.markerAttribs(
                                    point,
                                    point.selected ? 'select' : void 0
                                );

                            if (graphic) { // if exists
                                // Update
                                graphic.animate(markerAttribs);
                            } else if ( // if doesn't exist yet
                                (markerAttribs.width || 0) > 0 ||
                                point.hasImage
                            ) {
                                // Create
                                graphic = chart.renderer
                                    .symbol(
                                        symbol,
                                        markerAttribs.x,
                                        markerAttribs.y,
                                        markerAttribs.width,
                                        markerAttribs.height,
                                        hasPointMarker ?
                                            pointMarkerOptions :
                                            options.marker
                                    )
                                    .add(markerGroup);

                                (graphic.element as any).point = point;

                                point.graphics.push(graphic);
                            }

                            if (graphic) {
                                if (!chart.styledMode) {
                                    const pointAttribs = series.pointAttribs(
                                            point,
                                            point.selected ? 'select' : void 0
                                        ),
                                        attribs = merge(
                                            pointAttribs,
                                            verb === 'animate' ?
                                                markerAttribs :
                                                {},
                                            { zIndex: colorIndex }
                                        );

                                    graphic[verb](attribs);
                                } else {
                                    if (verb === 'animate') {
                                        graphic.animate(markerAttribs);
                                    }
                                }

                                graphic.addClass(point.getClassName(), true);
                            }
                        }
                    });
                }
            });

            // Set color for legend item marker
            if (options.marker) {
                options.marker.fillColor = series.color;
            }
        }
    }

    public translateBubble(): void {
        const { data, radii } = this;
        const { minPxSize } = this.getPxExtremes(true);

        // Set the shape type and arguments to be picked up in drawPoints
        let i = data.length;

        while (i--) {
            const point = data[i];
            const radius = radii ? radii[i] : 0; // #1737

            if (isNumber(radius) && radius >= minPxSize / 2) {
                // Shape arguments
                point.marker = extend(point.marker, {
                    radius,
                    width: 2 * radius,
                    height: 2 * radius
                });

                // Alignment box for the data label
                point.dlBox = {
                    x: (point.plotX as any) - radius,
                    y: (point.plotY as any) - radius,
                    width: 2 * radius,
                    height: 2 * radius
                };
            } else { // below zThreshold
                point.shapeArgs = point.dlBox = void 0; // #1691
                point.plotY = 0; // #17281
                point.marker = {
                    width: 0,
                    height: 0
                };
            }
        }

    }

    public getPxSize(
        length: number|string|undefined,
        isMinSize?: boolean
    ): number {
        const defaultValue = isMinSize ?
            BubbleSeries.defaultOptions.minSize :
            BubbleSeries.defaultOptions.maxSize;
        const smallestSize = Math.min(
            this.chart.plotWidth,
            this.chart.plotHeight
        );
        let isPercent;

        length = pick(length, defaultValue as number|string);

        if (typeof length === 'string') {
            isPercent = /%$/.test(length);
            length = parseInt(length, 10);
        }

        return isPercent ? smallestSize * length / 100 : length;
    }

    public getPxExtremes(allowSmaller?: boolean): BubblePxExtremes {
        let minPxSize = this.getPxSize(this.options.minSize, true);

        // Prioritize min size if conflict to make sure bubbles are
        // always visible. #5873
        const maxPxSize = Math.max(
            this.getPxSize(this.options.maxSize),
            minPxSize
        );

        if (allowSmaller && this.options.blendColors) {
            const sizeFactor = this.sizeFactor ||
                (1 / this.options.blendColors.length);

            // Recalculate minPxSize to draw smaller bubbles for blendColors
            minPxSize = minPxSize * sizeFactor;
        }

        return { minPxSize, maxPxSize };
    }

    public getZExtremes(): BubbleZExtremes|undefined {

        const options = this.options,
            zData = (this.zData || []).filter(isNumber);

        if (zData.length) {
            const zMin = pick(options.zMin, clamp(
                arrayMin(zData),
                options.displayNegative === false ?
                    (options.zThreshold || 0) :
                    -Number.MAX_VALUE,
                Number.MAX_VALUE
            ));
            const zMax = pick(options.zMax, arrayMax(zData));

            if (isNumber(zMin) && isNumber(zMax)) {
                return { zMin, zMax };
            }
        }
    }

}

/* *
 *
 *  Class Prototype
 *
 * */

interface BubbleSeries {
    alignDataLabel: typeof columnProto.alignDataLabel;
    bubblePadding: boolean;
    isBubble: true;
    pointClass: typeof BubblePoint;
    sizeFactor?: number;
    specialGroup: string;
    blendColorIndex?: number;
    blendColors: [ColorType|[number, ColorType]];
    zoneAxis: string;
}

extend(BubbleSeries.prototype, {
    alignDataLabel: columnProto.alignDataLabel,
    applyZones: noop,
    bubblePadding: true,
    buildKDTree: noop,
    directTouch: true,
    isBubble: true,
    pointArrayMap: ['y', 'z'],
    pointClass: BubblePoint,
    parallelArrays: ['x', 'y', 'z'],
    trackerGroups: ['group', 'dataLabelsGroup'],
    specialGroup: 'group', // To allow clipping (#6296)
    zoneAxis: 'z'
});

// On updated data in any series, delete the chart-level Z extremes cache
addEvent(BubbleSeries, 'updatedData', (e): void => {
    delete e.target.chart.bubbleZExtremes;
});

// After removing series, delete the chart-level Z extremes cache, #17502.
addEvent(BubbleSeries, 'remove', (e): void => {
    delete e.target.chart.bubbleZExtremes;
});

/* *
 *
 *  Registry
 *
 * */

declare module '../../Core/Series/SeriesType' {
    interface SeriesTypeRegistry {
        bubble: typeof BubbleSeries;
    }
}
SeriesRegistry.registerSeriesType('bubble', BubbleSeries);

/* *
 *
 *  Default Export
 *
 * */

export default BubbleSeries;

/* *
 *
 *  API Declarations
 *
 * */

/**
 * @typedef {"area"|"width"} Highcharts.BubbleSizeByValue
 */

''; // detach doclets above

/* *
 *
 *  API Options
 *
 * */

/**
 * A `bubble` series. If the [type](#series.bubble.type) option is
 * not specified, it is inherited from [chart.type](#chart.type).
 *
 * @extends   series,plotOptions.bubble
 * @excluding dataParser, dataURL, stack
 * @product   highcharts highstock
 * @requires  highcharts-more
 * @apioption series.bubble
 */

/**
 * An array of data points for the series. For the `bubble` series type,
 * points can be given in the following ways:
 *
 * 1. An array of arrays with 3 or 2 values. In this case, the values correspond
 *    to `x,y,z`. If the first value is a string, it is applied as the name of
 *    the point, and the `x` value is inferred. The `x` value can also be
 *    omitted, in which case the inner arrays should be of length 2\. Then the
 *    `x` value is automatically calculated, either starting at 0 and
 *    incremented by 1, or from `pointStart` and `pointInterval` given in the
 *    series options.
 *    ```js
 *    data: [
 *        [0, 1, 2],
 *        [1, 5, 5],
 *        [2, 0, 2]
 *    ]
 *    ```
 *
 * 2. An array of objects with named values. The following snippet shows only a
 *    few settings, see the complete options set below. If the total number of
 *    data points exceeds the series'
 *    [turboThreshold](#series.bubble.turboThreshold), this option is not
 *    available.
 *    ```js
 *    data: [{
 *        x: 1,
 *        y: 1,
 *        z: 1,
 *        name: "Point2",
 *        color: "#00FF00"
 *    }, {
 *        x: 1,
 *        y: 5,
 *        z: 4,
 *        name: "Point1",
 *        color: "#FF00FF"
 *    }]
 *    ```
 *
 * @sample {highcharts} highcharts/series/data-array-of-arrays/
 *         Arrays of numeric x and y
 * @sample {highcharts} highcharts/series/data-array-of-arrays-datetime/
 *         Arrays of datetime x and y
 * @sample {highcharts} highcharts/series/data-array-of-name-value/
 *         Arrays of point.name and y
 * @sample {highcharts} highcharts/series/data-array-of-objects/
 *         Config objects
 *
 * @type      {Array<Array<(number|string),number>|Array<(number|string),number,number>|*>}
 * @extends   series.line.data
 * @product   highcharts
 * @apioption series.bubble.data
 */

/**
 * @extends     series.line.data.marker
 * @excluding   enabledThreshold, height, radius, width
 * @product     highcharts
 * @apioption   series.bubble.data.marker
 */

/**
 * The size value for each bubble. The bubbles' diameters are computed
 * based on the `z`, and controlled by series options like `minSize`,
 * `maxSize`, `sizeBy`, `zMin` and `zMax`.
 *
 * @type      {number|null}
 * @product   highcharts
 * @apioption series.bubble.data.z
 */

/**
 * @excluding enabled, enabledThreshold, height, radius, width
 * @apioption series.bubble.marker
 */

''; // adds doclets above to transpiled file
