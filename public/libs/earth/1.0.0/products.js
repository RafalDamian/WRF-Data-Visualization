/**
 * products - defines the behavior of weather data grids, including grid construction, interpolation, and color scales.
 *
 * Copyright (c) 2014 Cameron Beccario
 * The MIT License - http://opensource.org/licenses/MIT
 *
 * https://github.com/cambecc/earth
 */

 let products = function() {
    "use strict";

    let data_query = "div[class=variables]"
    let script = document.querySelector(data_query)
    let VARIABLES = JSON.parse(script.getAttribute('value'))

    let WEATHER_PATH = "/data/weather";
    let OSCAR_PATH = "/data/oscar";
    let catalogs = {
        // The OSCAR catalog is an array of file names, sorted and prefixed with yyyyMMdd. Last item is the
        // most recent. For example: [ 20140101-abc.json, 20140106-abc.json, 20140112-abc.json, ... ]
        oscar: µ.loadJson([OSCAR_PATH, "catalog.json"].join("/"))
    };

    function buildGradient(min_value, max_value){
        let diff = 1.2 * (max_value - min_value) / 10
        let segments = []
        let value
        let values = []
        let scale = [[41, 10, 130], [81, 40, 40], [192, 37, 149],  
                    [70, 215, 215], [21, 84, 187], [24, 132, 14],   
                    [247, 251, 59], [235, 167, 21], [230, 71, 39], [88, 27, 67]]
        for (let i = 0; i < 10; i++) {
            value = min_value + diff * (i - 1)
            values.push(value)
            segments.push([value, scale[i]])}
        return [values, segments]
    }

    function buildProduct(overrides) {
        let data_query = "div[class=" + overrides.type + "]"
        let script = document.querySelector(data_query)
        let data = JSON.parse(script.getAttribute('value'))
        let unit = script.getAttribute('unit')
        let arr_min = null
        let arr_max = null
        let colorscale = null
        let bounds = null
        let gradient = null
        //dynamic scale production
        if (overrides.type !== 'wind'){
            arr_min = Math.min(...data.filter(function(val) {
                return val !== 0;
            })) //removing zeros
            arr_max = Math.max(...data)
            colorscale = buildGradient(arr_min, arr_max)
            gradient = µ.segmentedColorScale(colorscale[1])
            bounds = [Math.min(...colorscale[0]), Math.max(...colorscale[0])]}
        else{
            bounds = [0,100]
            gradient = function(v, a) {
                return µ.extendedSinebowColor(Math.min(v, 100) / 100, a)}}

        return _.extend({
            description: "",
            date: null,
            navigate: function(step) {
                return gfsStep(this.date, step);
            },
            load: function(cancel) {
                try{
                    let header = null
                    let header_query = "div[class='header']"
                    script = document.querySelector(header_query)
                    header = JSON.parse(script.getAttribute('value'))
                    let vars = {'data': data, 'header': header}
                    return cancel.requested ? null : _.extend(this, buildGrid(this.builder.apply(this, [vars])))
                }
                catch(error){
                    console.error(error)
                }
                
            },
            scale: {
                bounds: bounds,
                gradient: gradient
            },
            units: [
                {label: unit,  conversion: function(x) { return x; }, precision: 2},
            ],
        }, overrides);
    }

    /**
     * @param attr
     * @param {String} type
     * @param {String?} surface
     * @param {String?} level
     * @returns {String}
     */
    function gfs1p0degPath(attr, type, surface, level) {
        let dir = attr.date, stamp = dir === "current" ? "current" : attr.hour;
        let file = [stamp, type, surface, level, "gfs", "1.0"].filter(µ.isValue).join("-") + ".json";
        return [WEATHER_PATH, dir, file].join("/");
    }

    function gfsDate(attr) {
        if (attr.date === "current") {
            // Construct the date from the current time, rounding down to the nearest three-hour block.
            let now = new Date(Date.now()), hour = Math.floor(now.getUTCHours() / 3);
            return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hour));
        }
        let parts = attr.date.split("/");
        return new Date(Date.UTC(+parts[0], parts[1] - 1, +parts[2], +attr.hour.substr(0, 2)));
    }

    /**
     * Returns a date for the chronologically next or previous GFS data layer. How far forward or backward in time
     * to jump is determined by the step. Steps of ±1 move in 3-hour jumps, and steps of ±10 move in 24-hour jumps.
     */
    function gfsStep(date, step) {
        let offset = (step > 1 ? 8 : step < -1 ? -8 : step) * 3, adjusted = new Date(date);
        adjusted.setHours(adjusted.getHours() + offset);
        return adjusted;
    }
    
    function netcdfHeader(time, lat, lon, center) {
        return {
            lo1: lon.sequence.start,
            la1: lat.sequence.start,
            dx: lon.sequence.delta,
            dy: -lat.sequence.delta,
            nx: lon.sequence.size,
            ny: lat.sequence.size,
            refTime: time.data[0],
            forecastTime: 0,
            centerName: center
        };
    }

    function describeSurface(attr) {
        return attr.surface === "surface" ? "Surface" : µ.capitalize(attr.level);
    }

    function describeSurfaceJa(attr) {
        return attr.surface === "surface" ? "地上" : µ.capitalize(attr.level);
    }

    /**
     * Returns a function f(langCode) that, given table:
     *     {foo: {en: "A", ja: "あ"}, bar: {en: "I", ja: "い"}}
     * will return the following when called with "en":
     *     {foo: "A", bar: "I"}
     * or when called with "ja":
     *     {foo: "あ", bar: "い"}
     */
    function localize(table) {
        return function(langCode) {
            let result = {};
            _.each(table, function(value, key) {
                result[key] = value[langCode] || value.en || value;
            });
            return result;
        }
    }

    let FACTORIES = {
        "wind": {
            matches: _.matches({param: "wind"}),
            create: function(attr) {
                return buildProduct({
                    field: "vector",
                    type: "wind",
                    description: localize({
                        name: {en: "wind"},
                        qualifier: {en: " @ " + describeSurface(attr)}
                    }),
                    date: gfsDate(attr),
                    builder: function(vars) {
                        let uData = vars['data'].u;
                        let vData = vars['data'].v;
                        return {
                            header: vars['header'].header,
                            interpolate: bilinearInterpolateVector,
                            data: function(i) {
                                return [uData[i], vData[i]];
                            }
                        }
                    },
                    particles: {velocityScale: 1/300000, maxIntensity: 10}
                });
            }
        },
    };

    for(let variable in VARIABLES){
        let var_name = VARIABLES[variable]
        FACTORIES[var_name] = {
            matches: _.matches({param: "wind", overlayType: var_name}),
            create: function(attr) {
                return buildProduct({
                    field: "scalar",
                    type: var_name,
                    description: localize({
                        name: {en: var_name},
                        qualifier: {en: " @ " + describeSurface(attr)}
                    }),
                    builder: function(vars) {
                        let data = vars['data']
                        let header = vars['header'].header
                        return {
                            header: header,
                            interpolate: bilinearInterpolateScalar,
                            data: function(i) {
                                return data[i];
                            }
                        }
                    },
                    
                });
            }
        }
    }



    /**
     * Returns the file name for the most recent OSCAR data layer to the specified date. If offset is non-zero,
     * the file name that many entries from the most recent is returned.
     *
     * The result is undefined if there is no entry for the specified date and offset can be found.
     *
     * UNDONE: the catalog object itself should encapsulate this logic. GFS can also be a "virtual" catalog, and
     *         provide a mechanism for eliminating the need for /data/weather/current/* files.
     *
     * @param {Array} catalog array of file names, sorted and prefixed with yyyyMMdd. Last item is most recent.
     * @param {String} date string with format yyyy/MM/dd or "current"
     * @param {Number?} offset
     * @returns {String} file name
     */
    function lookupOscar(catalog, date, offset) {
        offset = +offset || 0;
        if (date === "current") {
            return catalog[catalog.length - 1 + offset];
        }
        let prefix = µ.ymdRedelimit(date, "/", ""), i = _.sortedIndex(catalog, prefix);
        i = (catalog[i] || "").indexOf(prefix) === 0 ? i : i - 1;
        return catalog[i + offset];
    }

    function oscar0p33Path(catalog, attr) {
        let file = lookupOscar(catalog, attr.date);
        return file ? [OSCAR_PATH, file].join("/") : null;
    }

    function oscarDate(catalog, attr) {
        let file = lookupOscar(catalog, attr.date);
        let parts = file ? µ.ymdRedelimit(file, "", "/").split("/") : null;
        return parts ? new Date(Date.UTC(+parts[0], parts[1] - 1, +parts[2], 0)) : null;
    }

    /**
     * @returns {Date} the chronologically next or previous OSCAR data layer. How far forward or backward in
     * time to jump is determined by the step and the catalog of available layers. A step of ±1 moves to the
     * next/previous entry in the catalog (about 5 days), and a step of ±10 moves to the entry six positions away
     * (about 30 days).
     */
    function oscarStep(catalog, date, step) {
        let file = lookupOscar(catalog, µ.dateToUTCymd(date, "/"), step > 1 ? 6 : step < -1 ? -6 : step);
        let parts = file ? µ.ymdRedelimit(file, "", "/").split("/") : null;
        return parts ? new Date(Date.UTC(+parts[0], parts[1] - 1, +parts[2], 0)) : null;
    }

    function dataSource(header) {
        // noinspection FallthroughInSwitchStatementJS
        switch (header.center || header.centerName) {
            case -3:
                return "OSCAR / Earth & Space Research";
            case 7:
            case "US National Weather Service, National Centres for Environmental Prediction (NCEP)":
                return "GFS / NCEP / US National Weather Service";
            default:
                return header.centerName;
        }
    }

    function bilinearInterpolateScalar(x, y, g00, g10, g01, g11) {
        let rx = (1 - x);
        let ry = (1 - y);
        return g00 * rx * ry + g10 * x * ry + g01 * rx * y + g11 * x * y;
    }

    function bilinearInterpolateVector(x, y, g00, g10, g01, g11) {
        let rx = (1 - x);
        let ry = (1 - y);
        let a = rx * ry,  b = x * ry,  c = rx * y,  d = x * y;
        let u = g00[0] * a + g10[0] * b + g01[0] * c + g11[0] * d;
        let v = g00[1] * a + g10[1] * b + g01[1] * c + g11[1] * d;
        return [u, v, Math.sqrt(u * u + v * v)];
    }

    /**
     * Builds an interpolator for the specified data in the form of JSON-ified GRIB files. Example:
     *
     *     [
     *       {
     *         "header": {
     *           "refTime": "2013-11-30T18:00:00.000Z",
     *           "parameterCategory": 2,
     *           "parameterNumber": 2,
     *           "surface1Type": 100,
     *           "surface1Value": 100000.0,
     *           "forecastTime": 6,
     *           "scanMode": 0,
     *           "nx": 360,
     *           "ny": 181,
     *           "lo1": 0,
     *           "la1": 90,
     *           "lo2": 359,
     *           "la2": -90,
     *           "dx": 1,
     *           "dy": 1
     *         },
     *         "data": [3.42, 3.31, 3.19, 3.08, 2.96, 2.84, 2.72, 2.6, 2.47, ...]
     *       }
     *     ]
     *
     */
    function buildGrid(builder) {
        // let builder = createBuilder(data);

        let header = builder.header;
        let λ0 = header.lo1, φ0 = header.la1;  // the grid's origin (e.g., 0.0E, 90.0N)
        let Δλ = header.dx, Δφ = header.dy;    // distance between grid points (e.g., 2.5 deg lon, 2.5 deg lat)
        let ni = header.nx, nj = header.ny;    // number of grid points W-E and N-S (e.g., 144 x 73)
        let date = new Date(header.refTime);
        date.setHours(date.getHours() + header.forecastTime);

        // Scan mode 0 assumed. Longitude increases from λ0, and latitude decreases from φ0.
        // http://www.nco.ncep.noaa.gov/pmb/docs/grib2/grib2_table3-4.shtml
        let grid = [], p = 0;
        let isContinuous = Math.floor(ni * Δλ) >= 360;
        for (let j = 0; j < nj; j++) {
            let row = [];
            for (let i = 0; i < ni; i++, p++) {
                row[i] = builder.data(p);
            }
            if (isContinuous) {
                // For wrapped grids, duplicate first column as last column to simplify interpolation logic
                row.push(row[0]);
            }
            grid[j] = row;
        }

        function interpolate(λ, φ) {
            let i = µ.floorMod(λ - λ0, 360) / Δλ;  // calculate longitude index in wrapped range [0, 360)
            let j = (φ0 - φ) / Δφ;                 // calculate latitude index in direction +90 to -90

            //         1      2           After converting λ and φ to fractional grid indexes i and j, we find the
            //        fi  i   ci          four points "G" that enclose point (i, j). These points are at the four
            //         | =1.4 |           corners specified by the floor and ceiling of i and j. For example, given
            //      ---G--|---G--- fj 8   i = 1.4 and j = 8.3, the four surrounding grid points are (1, 8), (2, 8),
            //    j ___|_ .   |           (1, 9) and (2, 9).
            //  =8.3   |      |
            //      ---G------G--- cj 9   Note that for wrapped grids, the first column is duplicated as the last
            //         |      |           column, so the index ci can be used without taking a modulo.

            let fi = Math.floor(i), ci = fi + 1;
            let fj = Math.floor(j), cj = fj + 1;

            let row;
            if ((row = grid[fj])) {
                let g00 = row[fi];
                let g10 = row[ci];
                if (µ.isValue(g00) && µ.isValue(g10) && (row = grid[cj])) {
                    let g01 = row[fi];
                    let g11 = row[ci];
                    if (µ.isValue(g01) && µ.isValue(g11)) {
                        // All four points found, so interpolate the value.
                        return builder.interpolate(i - fi, j - fj, g00, g10, g01, g11);
                    }
                }
            }
            // console.log("cannot interpolate: " + λ + "," + φ + ": " + fi + " " + ci + " " + fj + " " + cj);
            return null;
        }

        return {
            source: dataSource(header),
            date: date,
            interpolate: interpolate,
            forEachPoint: function(cb) {
                for (let j = 0; j < nj; j++) {
                    let row = grid[j] || [];
                    for (let i = 0; i < ni; i++) {
                        cb(µ.floorMod(180 + λ0 + i * Δλ, 360) - 180, φ0 - j * Δφ, row[i]);
                    }
                }
            }
        };
    }

    //TODO uogolnic dla wszystkich
    function productsFor(attributes){
        let attr = _.clone(attributes), results = [];
        _.values(FACTORIES).forEach(function(factory) {
            if (factory.matches(attr)) {
                results.push(factory.create(attr));
            }
        });
        return results.filter(µ.isValue);
    }
    return {
        overlayTypes: d3.set(_.keys(FACTORIES)),
        productsFor: productsFor
    };
}();