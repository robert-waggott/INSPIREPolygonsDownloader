module.exports = function() {
   	var http = require("http");
	var fs = require("fs");
    var mkdirp = require("mkdirp");	
    var parser = require("xml2json");
	var path = require("path");
    var rimraf = require("rimraf");
    var unzip = require("yauzl");

    var downloadsPath = "./Downloads/";
	var numberOfResponses = 0;
	var numberOfAreas;
	var fromDate;
	var callback;

    var download = function(areas, fromDate, callback) {
		if (!areas || !Array.isArray(areas) || areas.length == 0) {
			throw "Please specify at least one area to download";
		}

		numberOfAreas = areas.length;
		fromDate = fromDate;
		callback = callback;

		rimraf.sync(downloadsPath);

		mkdirp(downloadsPath, function() {
			mkdirp(path.join(downloadsPath, "gml"), function() {
				areas.forEach(downloadArea);
			});
		});
    };

    var downloadArea = function(area) {
		var filename = area + ".zip";
		var url = "http://data.inspire.landregistry.gov.uk/" + filename;

		http.get(url, function(response) {
			if (response.statusCode !== 200) {
				throw "Problem downloading " + area + ", please make sure the name corresponds with a polygon dataset";
			}

			downloadResponse(filename, response);
		});    	
    };

    var downloadResponse = function(filename, response) {
		var destination = path.join(downloadsPath, filename);
		var file = fs.createWriteStream(destination);

	    response
	    	.on("data", function(data) {
				file.write(data);
			})
			.on("end", function() {
				console.log("downloaded " + filename);

				file.end();

				numberOfResponses++;

				if (numberOfResponses == numberOfAreas) {
					unzipGMLFiles();
					readGMLFiles();
				}						
			});
    };

    var unzipGMLFiles = function() {
	    var files = fs.readdirSync(downloadsPath).filter(function(file) {
	    	return path.extname(file).toLowerCase() === ".zip";
	    });

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
					});
				});
			});
	    });
    };

    var readGMLFiles = function() {
    	var directory = path.join(downloadsPath, "gml");

    	fs.readdir(directory, function(error, files) {
    		var data = {};
    		var numberOfExtractedFiles = 0;

		    files.forEach(function(file) {
		        fs.readFile(directory + file, "utf-8", function(err, xml) {
            		if (error) { 
    					throw error; 
		    		}

					numberOfExtractedFiles++;

		            data[file] = parser.toJson(xml);

		            if (numberOfExtractedFiles === files.length) {
		                console.log(data);
		            }
		        });
		    });    		
		});
    };

    return {
    	"download": download
    };
}