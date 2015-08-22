module.exports = function() {
	var defer = require("node-promise").defer;
   	var http = require("http");
	var fs = require("fs");
    var mkdirp = require("mkdirp");
    var parser = require("xml2json");
	var path = require("path");
    var rimraf = require("rimraf");
    var unzip = require("yauzl");
    var osGridRef = require('geodesy').OsGridRef;

    var downloadsPath = "./Downloads/";
	var fromDate;
	var downloadDeferred;

    var download = function(areas, fromDate) {
		if (!areas || !Array.isArray(areas) || areas.length == 0) {
			throw "Please specify at least one area to download";
		}

		downloadDeferred = new defer();
		fromDate = fromDate;

		rimraf.sync(downloadsPath);

		mkdirp(downloadsPath, function() {
			mkdirp(path.join(downloadsPath, "gml"), function() {
				areas.forEach(function(area) {
					downloadArea(area).then(function() {
						// unzip then
						// read
					});
				});
			});
		});

		return downloadDeferred;
    };

    var downloadArea = function(area) {
	    var deferred = defer();
		var filename = area + ".zip";
		var url = "http://data.inspire.landregistry.gov.uk/" + filename;

		http.get(url, function(response) {
			if (response.statusCode !== 200) {
				throw "Problem downloading " + area + ", please make sure the name corresponds with a polygon dataset";
			}

			downloadResponse(filename, response).then(function () {
				unzipGMLFiles().then(readGMLFiles);
			});
		});

		return deferred;   	
    };

    var downloadResponse = function(filename, response) {
		var deferred = defer();
		var destination = path.join(downloadsPath, filename);
		var file = fs.createWriteStream(destination);

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

    var unzipGMLFiles = function() {
	    var deferred = defer();
	    var files = fs.readdirSync(downloadsPath).filter(function(file) {
	    	return path.extname(file).toLowerCase() === ".zip";
	    });
	    var count = 0;

	    files.forEach(function(name) {
	    	var fullFilename = path.join(downloadsPath, name);	    	
	    	var extractToPath = path.join(downloadsPath, "gml", path.basename(name, ".zip") + ".gml");

			unzip.open(fullFilename, function(error, zipfile) {
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

						readStream.pipe(fs.createWriteStream(extractToPath));

						console.log("extracted " + extractToPath);

						count++;

						if (count === files.length) {
							deferred.resolve();
						}
					});
				});
			});
	    });

	    return deferred;
    };

    var readGMLFiles = function() {
    	var directory = path.join(downloadsPath, "gml");

    	fs.readdir(directory, function(error, files) {
    		var data = {};
    		var numberOfExtractedFiles = 0;

		    files.forEach(function(file) {
	    		console.log(directory + file);

		        fs.readFile(directory + "/" + file, "utf-8", function(error, xml) {
            		if (error) { 
    					throw error; 
		    		}

					numberOfExtractedFiles++;

					var json = parser.toJson(xml, {
						object: true
					});
					var members = json["wfs:FeatureCollection"]["wfs:member"].map(function(member) {
						var id = member["LR:PREDEFINED"]["LR:INSPIREID"];
						var eNs = member["LR:PREDEFINED"]["LR:GEOMETRY"]["gml:Polygon"]["gml:exterior"]["gml:LinearRing"]["gml:posList"];
						var validFrom = member["LR:PREDEFINED"]["LR:VALIDFROM"];
						var cadastralReference = member["LR:PREDEFINED"]["LR:NATIONALCADASTRALREFERENCE"];

						if (eNs["$t"]) {
							eNs = eNs["$t"];
						}

						var eastingsAndNorthings = getArrayOfEastingsAndNorthings(eNs);
						var latLongs = eastingsAndNorthings.map(function(eastingAndNorthing) {
							return osGridRef.osGridToLatLon(new osGridRef(eastingAndNorthing.easting, eastingAndNorthing.northing))
						});

						return {
							id: id,
							geometry: eastingsAndNorthings,
							latLongs: latLongs,
							cadastralReference: cadastralReference,
							validFrom: validFrom
						}
					});

					// todo: filter out according to from date. 
					// todo: convert to geojson. 

		            if (numberOfExtractedFiles === files.length) {
		                console.log(data);
		            }
		        });
		    });    		
		});
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
}