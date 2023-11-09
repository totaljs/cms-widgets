require('total4');

FUNC.indent = function(count, val) {

	var lines = val.split('\n');
	var str = '';
	var total = Math.abs(count);
	var is = false;

	for (var i = 0; i < total; i++)
		str += '\t';

	for (var i = 0; i < lines.length; i++) {
		if (count > 0 && lines[i])
			lines[i] = str + lines[i];
		else if (lines[i].substring(0, total) === str) {
			lines[i] = lines[i].substring(total);
			is = true;
		} else if (lines[i] && !is)
			break;
	}

	return lines.join('\n');
};

PATH.fs.readdir('widgets', function(err, response) {

	var arr = [];
	var evaluate = function(code) {
		var obj = {};
		new Function('exports', code)(obj);
		return obj;
	};

	response.wait(function(filename, next) {

		PATH.fs.readFile('widgets/' + filename, function(err, response) {

			if (err) {
				next();
				return;
			}

			var data = {};
			data.id = filename.substring(0, filename.length - 5);

			response = response.toString('utf8');

			var author = response.match(/exports\.author.*?;\n/);
			var name = response.match(/exports\.name.*?;\n/);
			var preview = response.match(/exports\.preview.*?;\n/);

			data.name = name ? evaluate(name[0]).name : '';
			data.preview = preview ? evaluate(preview[0]).preview : '';
			data.url = 'https://cdn.totaljs.com/cms/' + filename;
			data.author = author ? evaluate(author[0]).author : '';
			arr.push(data);
			next();
		});

	}, function() {
		arr.quicksort('name');
		PATH.fs.writeFile('db.json', JSON.stringify(arr, null, '\t'), NOOP);
	});

});