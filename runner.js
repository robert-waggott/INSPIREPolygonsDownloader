var downloader = require('./index.js')();

downloader.download({
	areas: ["Blaby", "Uttlesford"],
	geoJson: true
}).then(function(data) {
	console.log(JSON.stringify(data));
});