# INSPIRE Polygons Downloader

> Downloads and munges [Land registry INSPIRE polygons](https://www.gov.uk/inspire-index-polygons-spatial-data) so thay can be easily mapped and/or traversed. 

### Usage:

```
var downloader = require('inspirepolygonsdownloader')();
var options = {
    areas: ["Blaby", "Uttlesford"],
    fromDate: "2015-04-03",
    geoJson: true
};

downloader.download(options).then(function(data) {
    console.log(data);
});
```

### Options:

#### areas

* Type: `array of strings`
* Required: `Yes`

The list of areas to download, should match the format of `http://data.inspire.landregistry.gov.uk/{area}.zip`. 

#### fromDate

* Type: `Date`
* Required: `No`
* Default: `null`

To filter out the list of polygons according to the polygon's from date. 

#### geoJson

* Type: `Date`
* Required: `No`
* Default: `False`

Whether or not to return the output in [geo json format](http://geojson.org/geojson-spec.html#examples) or as a plain array of polygon data (see below for more detail). 

### Returns:

`download()` returns a deferred. The deferred callback has one parameter, `data`, depending on the `geoJson` option this data is either [geojson](http://geojson.org/geojson-spec.html#examples) of polygons with the following additional properties:

* id - The Inspire Id. 
* cadastralReference
* validFrom

If `geoJson` is false `data` is an array of objects, each object has the following members:

* id - The Inspire Id. 
* geometry - An array of eastings and northings
* latLongs - An array of latitude/longitudes
* cadastralReference
* validFrom

### Further information:

* [Background about INSPIRE](http://data.gov.uk/location/inspire)
* [INSPIRE data - Conditions of use](https://www.gov.uk/inspire-index-polygons-spatial-data) (can be found at the bottom of the page)
* [OGL - Open Government Licence](http://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/)
* [Movable Type - Convert between Latitude/Longitude & OS National Grid References](http://www.movable-type.co.uk/scripts/latlong-gridref.html) - the key algorithm used to convert the GML to latatidue and longitude coordinates so it can be mapped. 

### Mapper:

[github.com/robert-waggott/INSPIREPolygonsMapper](https://github.com/robert-waggott/INSPIREPolygonsMapper) is intended as a working example of how to use this package. 
