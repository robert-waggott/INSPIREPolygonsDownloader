module.exports = function() {
	"use strict";

	var defer = require("node-promise").defer;
   	var http = require("http");
	var fs = require("fs");
    var mkdirp = require("mkdirp");
	var moment = require("moment");    
    var parser = require("xml2json");
	var path = require("path");
    var unzip = require("yauzl");
    var osGridRef = require('geodesy').OsGridRef;

    var downloadsPath = "./Downloads/";

    var download = function(options) {
		if (!options) {
			throw "";
		}

		var areas = options.areas;

		if (!areas || !Array.isArray(areas) || areas.length === 0) {
			throw "Please specify at least one area to download";
		}

		var count = 0;
		var deferred = defer();
		var output = [];

		mkdirp(downloadsPath, function() {
			areas.forEach(function(area) {
				downloadArea(area).then(function(response) {
					var zipFile = downloadsPath + area + ".zip";

					downloadResponse(zipFile, response).then(function() {
						extractGMLFile(zipFile).then(function(gmlFile) {
							processGMLFile(gmlFile, options.fromDate, options.geoJson).then(function(data) {
								count++;

								fs.unlinkSync(zipFile);
								fs.unlinkSync(gmlFile);

								output = output.concat(data);

								if (count === areas.length) {
									if (options.geoJson) {
										deferred.resolve({ 
											type: "FeatureCollection",
											features: output
										});
									}
									else {
										deferred.resolve(output);
									}
								}
							});
						});
					});
				});
			});
		});

		return deferred;
    };

    var downloadArea = function(area) {
	    var deferred = defer();
		var url = "http://data.inspire.landregistry.gov.uk/" + area + ".zip";

		http.get(url, function(response) {
			if (response.statusCode !== 200) {
				throw "Problem downloading " + area + ", please make sure the name corresponds with a polygon dataset";
			}

			deferred.resolve(response);
		});

		return deferred;   	
    };

    var downloadResponse = function(filename, response) {
		var deferred = defer();
		var file = fs.createWriteStream(filename);

	    response
	    	.on("data", function(data) {
				file.write(data);
			})
			.on("end", function() {
				console.log("downloaded " + filename);

				file.end();

				deferred.resolve();
			});

		return deferred;
    };

    var extractGMLFile = function(filename) {
	    var deferred = defer();
    	var extractToPath = filename.toLowerCase().replace(".zip", ".gml");

		unzip.open(filename, function(error, zipfile) {
			if (error) {
				throw error;	
			} 
			
			zipfile.on("entry", function(entry) {
				if (path.extname(entry.fileName).toLowerCase() !== ".gml") {
					return;
				}

				zipfile.openReadStream(entry, function(error, readStream) {
  					if (error) {
  						throw error;
  					}

					var pipe = readStream.pipe(fs.createWriteStream(extractToPath));
					
					pipe.on("finish", function() {
						deferred.resolve(extractToPath);
					});
				});
			});
	    });

	    return deferred;
    };

    var processGMLFile = function(file, fromDate, returnAsGeoJson) {
        var deferred = defer();

        fs.readFile(file, "utf-8", function(error, xml) {
    		if (error) { 
				throw error; 
    		}

			var json = parser.toJson(xml, {
				object: true
			});
			var members = json["wfs:FeatureCollection"]["wfs:member"].map(mungeGMLMember).filter(function(member) {
				var fromDateMoment = moment(fromDate);

				if (!fromDateMoment.isValid()) {
					return true;
				}

				return moment(member.validFrom) <= fromDateMoment;
			});

			if (returnAsGeoJson) {
				members = members.map(castMemberToGeoJsonFeature);
			}

			deferred.resolve(members);
        });

		return deferred;
    };

    var mungeGMLMember = function(member) {
		var id = member["LR:PREDEFINED"]["LR:INSPIREID"];
		var eNs = member["LR:PREDEFINED"]["LR:GEOMETRY"]["gml:Polygon"]["gml:exterior"]["gml:LinearRing"]["gml:posList"];
		var validFrom = member["LR:PREDEFINED"]["LR:VALIDFROM"];
		var cadastralReference = member["LR:PREDEFINED"]["LR:NATIONALCADASTRALREFERENCE"];

		if (eNs["$t"]) {
			eNs = eNs["$t"];
		}

		var eastingsAndNorthings = getArrayOfEastingsAndNorthings(eNs);
		var latLongs = eastingsAndNorthings.map(function(eastingAndNorthing) {
			return osGridRef.osGridToLatLon(new osGridRef(eastingAndNorthing.easting, eastingAndNorthing.northing));
		});

		return {
			id: id,
			geometry: eastingsAndNorthings,
			latLongs: latLongs,
			cadastralReference: cadastralReference,
			validFrom: validFrom
		};
	};

	var castMemberToGeoJsonFeature = function(member) {
		var latLongs = member.latLongs.map(function(latLong) {
			return [latLong.lat, latLong.lon];
		});

		return { 
			type: "Feature",
         	geometry: {
           		type: "Polygon",
           		coordinates: [
             		latLongs
             	]
         	},
         	properties: {
           		id: member.id,
           		cadastralReference: member.cadastralReference,
           		validFrom: member.validFrom
           	}
         };
	};

    var getArrayOfEastingsAndNorthings = function(spaceDelimitedString) {
		var list = spaceDelimitedString.split(" ");
		var output =[];

		for (var i = 0; i < list.length; i += 2) {
		    output.push({
		    	easting: list[i],
		    	northing: list[i++]
		    });
		}

		return output;
    };

    return {
    	"download": download
    };
};