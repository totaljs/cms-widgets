'use strict';

require('total5');

var Lib = require('./lib');

(async function() {
	var args = Lib.args(process.argv.slice(2));
	if (args.files.length !== 1 || !args.cms)
		throw new Error('Usage: node tools/cms-check.js <widget.html> --cms <source-url|checkout>');
	var location = args.cms;
	if (!/^https:\/\//.test(location) && Total.Fs.statSync(location).isDirectory())
		location = Total.Path.join(location, 'definitions/func.js');
	var source = await Lib.source(location);
	new Function(source)();
	var widget = Lib.read(args.files[0]);
	var expected = Lib.scope(widget);
	var item = { html: widget.source };
	FUNC.recompile(item);
	if (item.ref.id !== expected.meta.id)
		throw new Error('Widget id differs after actual CMS recompile');
	['html', 'css', 'settings', 'template', 'js'].forEach(function(key) {
		if (item.ref.ui[key] !== expected.sections[key])
			throw new Error(key + ' differs from actual CMS processing');
	});
	if (!item.ref.ui.html)
		throw new Error('CMS recompile produced no body');
	console.log('CMS recompile OK: ' + item.ref.id);
	process.exit(0);
})().catch(function(err) {
	console.error(err.stack);
	process.exit(1);
});
