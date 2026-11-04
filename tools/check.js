'use strict';

require('total5');

var Lib = require('./lib');

try {
	var args = Lib.args(process.argv.slice(2));
	if (args.help || !args.files.length) {
		console.log('Usage: node tools/check.js <file|directory> [...] [--cms <source-url|checkout>] [--legacy]');
		process.exit(args.help ? 0 : 2);
	}
	var files = Lib.files(args.files);
	if (!files.length)
		throw new Error('No widget HTML files found.');
	var seen = Object.create(null);
	var errors = 0;
	var warnings = 0;
	var catalogue = Total.Path.join(__dirname, '../widgets');
	Total.Fs.readdirSync(catalogue).filter(function(name) { return /\.html$/.test(name); }).forEach(function(name) {
		var file = Total.Path.join(catalogue, name);
		var match = Total.Fs.readFileSync(file, 'utf8').match(/exports\.id\s*=\s*['"]([^'"]+)['"]/);
		if (match)
			(seen[match[1]] || (seen[match[1]] = [])).push(file);
	});
	files.forEach(function(file) {
		console.log(Total.Path.relative(Total.Path.join(__dirname, '..'), file));
		var widget = Lib.read(file);
		var result = Lib.check(widget, args.legacy);
		if (result.meta) {
			var duplicates = (seen[result.meta.id] || []).filter(function(other) { return other !== file; });
			if (duplicates.length)
				result.errors.push('Duplicate widget id: ' + result.meta.id + ' (' + duplicates.join(', ') + ')');
			if (!(seen[result.meta.id] || []).includes(file))
				(seen[result.meta.id] || (seen[result.meta.id] = [])).push(file);
		}
		if (args.cms && !result.errors.length) {
			var cmd = [Total.Path.join(__dirname, 'cms-check.js'), file, '--cms', args.cms];
			var run = Total.Child.spawnSync(process.execPath, cmd, { encoding: 'utf8', timeout: 30000 });
			if (run.status !== 0)
				result.errors.push('CMS recompile failed: ' + (run.error || run.stderr || run.stdout));
			else
				console.log('  OK actual CMS recompile');
		}
		result.errors.forEach(function(message) { console.log('  ERROR ' + message); });
		result.warnings.forEach(function(message) { console.log('  WARN ' + message); });
		errors += result.errors.length;
		warnings += result.warnings.length;
		if (!result.errors.length && !result.warnings.length)
			console.log('  OK native sections, metadata, configuration and scripts');
	});
	console.log('Errors: ' + errors + ', warnings: ' + warnings);
	process.exit(errors ? 1 : 0);
} catch (err) {
	console.error(err.message);
	process.exit(1);
}
