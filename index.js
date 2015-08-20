module.exports = function() {
   	var http = require("http");
	var fs = require("fs");
    var mkdirp = require("mkdirp");	
    var parser = require("xml2json");
	var path = require("path");
    var rimraf = require("rimraf");
    var unzip = require("unzip2");

    var FOLDER_PATH = "./Downloads/";

    var download = function(areas, fromDate) {
		if (!areas || !Array.isArray(areas) || areas.length == 0) {
			throw "Please specify at least one area to download";
		}

		rimraf.sync(FOLDER_PATH);

		mkdirp(FOLDER_PATH, function(error) {
			if (error) {
				throw error;
			}

			var numberOfResponses = 0;

			areas.forEach(function(area) {
				var filename = area + ".zip";
				var destination = path.join(FOLDER_PATH, filename);
				var file = fs.createWriteStream(destination);
				var url = "http://data.inspire.landregistry.gov.uk/" + filename;

				http.get(url, function(response) {
					numberOfResponses++;

					if (response.statusCode !== 200) {
						console.warn("Problem downloading " + area + ", please make sure the name corresponds with a polygon dataset");
					}

					response.pipe(file);

					file.close();

					if (numberOfResponses == areas.length) {
						process();
					}
				});
			});
		});
    };

    var process = function() {
	    var files = fs.readdirSync(FOLDER_PATH).filter(function(file) {
	    	return path.extname(file).toLowerCase() === ".zip";
	    });

	    console.log(unzip);

	    files.forEach(function(name) {
	    	var fullFilename = path.join(FOLDER_PATH, name);	    	
	    	var extractToPath = path.join(FOLDER_PATH, path.basename(name, ".zip"));

	    	mkdirp(extractToPath, function(error) {
				fs.createReadStream(fullFilename)
					.pipe(unzip.Extract({ 
						path: extractToPath 
					}));
  			});
	    });
    };



    return {
    	"download": download
    };
}