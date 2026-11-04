'use strict';

require('total5');

var Vm = REQUIRE('vm');
var ROOT = Total.Path.join(__dirname, '..');
var TAGS = { settings: '<settings>', css: '<style>', total: '<script total>', html: '<body>', js: '<script>', template: '<template>', readme: '<readme>' };

exports.args = function(args) {
	var result = { files: [] };
	for (var i = 0; i < args.length; i++) {
		var arg = args[i];
		if (arg === '--legacy' || arg === '--preview' || arg === '--help' || arg === '--browser')
			result[arg.substring(2)] = true;
		else if (['--cms', '--spa', '--channel'].indexOf(arg) !== -1) {
			if (!args[i + 1] || args[i + 1].substring(0, 2) === '--')
				throw new Error('Missing value for ' + arg);
			var value = args[++i];
			result[arg.substring(2)] = (arg === '--cms' || arg === '--spa') && !/^https:\/\//.test(value) ? Total.Path.resolve(ROOT, value) : value;
		} else if (arg.substring(0, 2) === '--')
			throw new Error('Unknown option: ' + arg);
		else
			result.files.push(Total.Path.resolve(ROOT, arg));
	}
	return result;
};

exports.files = function(paths) {
	var result = [];
	paths.forEach(function(path) {
		if (Total.Fs.statSync(path).isDirectory())
			Total.Fs.readdirSync(path).filter(function(name) { return /\.html$/.test(name); }).sort().forEach(function(name) { result.push(Total.Path.join(path, name)); });
		else
			result.push(path);
	});
	return result.filter(function(file, index) { return result.indexOf(file) === index; });
};

exports.read = function(file) {
	var source = Total.Fs.readFileSync(file, 'utf8');
	var sections = source.parseComponent(TAGS);
	return { file: file, source: source, sections: sections };
};

exports.metadata = function(widget) {
	var meta = {};
	new Function('exports', widget.sections.total)(meta);
	return meta;
};

exports.check = function(widget, legacy) {
	var errors = [];
	var warnings = [];
	var sections = widget.sections;
	var convention = legacy ? warnings : errors;
	['total', 'html'].forEach(function(key) {
		if (!sections[key] || !sections[key].trim())
			errors.push('Missing or malformed ' + TAGS[key] + ' section.');
	});
	var rest = widget.source;
	Object.keys(TAGS).forEach(function(key) {
		if (sections[key] != null) {
			var opening = TAGS[key];
			var end = '</' + opening.substring(1).split(/[ >]/)[0] + '>';
			var start = rest.indexOf(opening);
			var content = rest.indexOf(sections[key], start + opening.length);
			if (start !== -1 && content !== -1)
				rest = rest.substring(0, start) + rest.substring(rest.indexOf(end, content + sections[key].length) + end.length);
		}
	});
	if (/<(?:settings|style|body|template|readme|script)(?:\s[^>]*)?>/.test(rest))
		errors.push('Duplicate, malformed or unsupported outer section.');
	['total', 'js'].forEach(function(key) {
		if (sections[key]) {
			try { new Vm.Script(sections[key], { filename: widget.file + ':' + key }); }
			catch (err) { errors.push('Invalid ' + key + ' JavaScript: ' + err.message); }
		}
	});
	var settings = sections.settings || '';
	var scripts = /<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g;
	var match;
	while ((match = scripts.exec(settings))) {
		if (/type\s*=/.test(match[0].substring(0, match[0].indexOf('>'))))
			continue;
		try { new Vm.Script(match[1], { filename: widget.file + ':settings' }); }
		catch (err) { errors.push('Invalid settings JavaScript: ' + err.message); }
	}
	var meta;
	if (!errors.length) {
		try { meta = exports.metadata(widget); }
		catch (err) { errors.push('Metadata evaluation failed: ' + err.message); }
	}
	if (meta) {
		['id', 'name', 'author', 'version'].forEach(function(key) {
			if (typeof meta[key] !== 'string' || !meta[key].trim())
				convention.push('Metadata requires a nonempty string: ' + key);
		});
		if (!/^[a-z][a-z0-9]*$/.test(meta.id || ''))
			convention.push('Use a lowercase alphanumeric widget id beginning with a letter.');
		if (meta.id !== Total.Path.basename(widget.file, '.html'))
			convention.push('Filename must match exports.id.');
		if (!/^data:image\/(?:png|jpeg|gif|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(meta.preview || ''))
			convention.push('Embed a PNG/JPEG/GIF/WebP preview; generate it with tools/browser.js --preview.');
		else {
			var image = Buffer.from(meta.preview.split(',')[1], 'base64');
			var mime = meta.preview.split(';')[0];
			var valid = mime === 'data:image/png' ? image.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) : mime === 'data:image/jpeg' ? image[0] === 255 && image[1] === 216 : mime === 'data:image/gif' ? /^GIF8[79]a/.test(image.toString('ascii',0,6)) : image.toString('ascii',0,4) === 'RIFF' && image.toString('ascii',8,12) === 'WEBP';
			if (!valid)
				convention.push('Preview data does not match its image type.');
		}
		var config = meta.config === undefined ? {} : meta.config;
		if (!config || typeof config !== 'object' || Array.isArray(config)) {
			convention.push('exports.config must be an object.');
			config = {};
		}
		var keys = Object.keys(config);
		var paths = /\bpath=["']\?\.([a-zA-Z0-9_]+)(?:\.[^"']*)?["']/g;
		var path;
		while ((path = paths.exec(settings))) {
			if (keys.indexOf(path[1]) === -1)
				convention.push('Settings path has no default: ' + path[1]);
		}
		keys.forEach(function(key) {
			if (!(sections.readme || '').includes('`' + key + '`'))
				convention.push('Document config option in <readme>: `' + key + '`.');
		});
	}
	var css = (sections.css || '') + '\n' + (settings.match(/<style>[\s\S]*?<\/style>/g) || []).join('\n');
	css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/([^{}]+)\{/g, function(all, selectors) {
		selectors.trim().split(',').forEach(function(selector) {
			selector = selector.trim();
			if (!selector || selector[0] === '@' || /^(?:from|to|[\d.]+%)$/.test(selector))
				return;
			if (!/\.CLASS(?:\b|[-_])/.test(selector))
				convention.push('CSS selector may escape widget scope: ' + selector);
		});
		return all;
	});
	if (/\bid\s*=\s*["'][^"']+["']/.test(sections.html || ''))
		convention.push('Fixed DOM id in body; verify isolation of repeated instances.');
	return { errors: errors, warnings: warnings, meta: meta };
};

exports.scope = function(widget) {
	var meta = exports.metadata(widget);
	var cls = 'w-' + meta.id.slug().replace(/-/g, '');
	var scoped = {};
	Object.keys(widget.sections).forEach(function(key) {
		scoped[key] = key === 'total' || key === 'readme' ? widget.sections[key] : widget.sections[key].replace(/CLASS/g, cls);
	});
	return { meta: meta, sections: scoped, cls: cls };
};

exports.source = async function(location) {
	if (/^https:\/\//.test(location)) {
		var content = await RESTBuilder.GET(location).plain().timeout(15000).promise();
		if (typeof content !== 'string' || !content.trim())
			throw new Error('Empty source from ' + location);
		return content;
	}
	return Total.Fs.readFileSync(location, 'utf8');
};
