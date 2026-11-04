'use strict';

require('total5');

var Lib = require('./lib');

exports.run = async function(file, options) {
	if (!options.spa)
		throw new Error('Set spa in tests/config or pass --spa <url|file>.');
	var bundle = await Lib.source(options.spa);
	var widget = Lib.read(file);
	var scoped = Lib.scope(widget);
	var playwright = require('playwright');
	var browser = await playwright.chromium.launch({ headless: true, channel: options.channel || undefined });
	var failures = [];
	try {
		var page = await browser.newPage({ viewport: { width: 1000, height: 700 } });
		page.on('pageerror', function(err) { failures.push(err.message); });
		await page.route('**/*', function(route) {
			if (route.request().isNavigationRequest())
				route.fulfill({ contentType: 'text/html', body: '<!DOCTYPE html><html><head></head><body></body></html>' });
			else
				route.abort();
		});
		await page.goto('http://widget.invalid/');
		await page.setContent('<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{margin:0;padding:24px;font:16px/1.5 Arial,sans-serif;box-sizing:border-box}main{max-width:900px;margin:auto}*,*:before,*:after{box-sizing:border-box}</style></head><body><main></main></body></html>');
		await page.addScriptTag({ content: bundle });
		await page.waitForFunction(function() { return !!window.jQuery && typeof jQuery.fn.rclass2 === 'function'; });
		await page.addStyleTag({ content: scoped.sections.css || '' });
		var report = await page.evaluate(function(data) {
			var wrappers = [];
			var hooks = {};
			var match = (data.settings || '').match(/<script>([\s\S]*?)<\/script>/);
			if (match)
				new Function('exports', match[1])(hooks);
			var config = data.config || {};
			var variants = [];
			var controls = /<ui-component\b[^>]*>/g;
			var control;
			while ((control = controls.exec(data.settings || ''))) {
				var path = control[0].match(/path="\?\.([^".]+)"/);
				var source = control[0].match(/dirsource:([^";]+)/);
				if (path && source) {
					source[1].split(',').forEach(function(option) {
						var variant = Object.assign({}, config);
						variant[path[1]] = option.split('|')[0];
						variants.push(variant);
					});
				}
			}
			function content(el) {
				return JSON.stringify({
					editable: el.find('.CMS_edit').toArray().map(function(item) { return item.innerHTML; }),
					nested: el.find('.CMS_widgets').toArray().map(function(item) { return item.innerHTML; })
				});
			}
			for (var i = 0; i < 2; i++) {
				var el = $('<div class="' + data.cls + ' CMS_widget">' + data.html + '</div>').appendTo('main');
				el.find('.CMS_edit').first().text('Edited visitor content ' + i);
				el.find('.CMS_widgets').append('<div class="CMS_widget" data-cms="nested__%7B%7D">Nested content</div>');
				wrappers.push(el);
			}
			var snapshots = wrappers.map(content);
			var configs = [Object.assign({}, config), Object.assign({}, variants[variants.length - 1] || config)];
			wrappers.forEach(function(el, index) {
				if (hooks.check) hooks.check(configs[index], el);
				if (hooks.load) hooks.load(configs[index], el);
				if (hooks.save) hooks.save(configs[index], el);
			});
			var second = wrappers[1].html();
			variants.concat([config, config]).forEach(function(variant) {
				if (hooks.save) hooks.save(Object.assign({}, variant), wrappers[0]);
			});
			var first = wrappers[0].html();
			if (hooks.save) hooks.save(Object.assign({}, config), wrappers[0]);
			window.__widgetHarness = { hooks: hooks, wrappers: wrappers, config: config };
			return {
				preserved: wrappers.every(function(el, index) { return content(el) === snapshots[index]; }),
				isolated: wrappers[1].html() === second,
				idempotent: wrappers[0].html() === first,
				variants: variants.length,
				unresolvedClass: /CLASS/.test(document.querySelector('main').innerHTML)
			};
		}, { cls: scoped.cls, config: scoped.meta.config, html: scoped.sections.html, settings: scoped.sections.settings });
		if (!report.preserved)
			throw new Error('Settings discarded edited or nested content');
		if (!report.isolated)
			throw new Error('Saving one instance changed the other');
		if (!report.idempotent)
			throw new Error('Repeated identical saves changed the output');
		if (report.unresolvedClass)
			throw new Error('Unresolved CLASS in DOM');
		if (options.verify)
			await options.verify(page);
		var widths = [1000, 375];
		for (var i = 0; i < widths.length; i++) {
			var width = widths[i];
			await page.setViewportSize({ width: width, height: 700 });
			if (!(await page.evaluate(function() { return document.documentElement.scrollWidth <= innerWidth; })))
				throw new Error('Horizontal overflow at ' + width + 'px');
		}
		if (failures.length)
			throw new Error('Browser exceptions: ' + failures.join('; '));
		if (options.preview) {
			await page.setViewportSize({ width: 600, height: 400 });
			await page.evaluate(function() { var h = window.__widgetHarness; h.wrappers[1].hide(); });
			// Restore the authored content for the screenshot rather than the test sentinel.
			await page.evaluate(function(html) {
				var h = window.__widgetHarness;
				h.wrappers[0].html(html);
				if (h.hooks.save) h.hooks.save(Object.assign({}, h.config), h.wrappers[0]);
			}, scoped.sections.html);
			var png = await page.locator('main > div').first().screenshot({ type: 'png' });
			var matches = widget.source.match(/exports\.preview\s*=\s*(['"])[^'"\n]*\1\s*;/g) || [];
			if (matches.length !== 1)
				throw new Error('Preview update requires one literal exports.preview assignment');
			Total.Fs.writeFileSync(file, widget.source.replace(matches[0], "exports.preview = 'data:image/png;base64," + png.toString('base64') + "';"));
		}
		if (failures.length)
			throw new Error('Browser exceptions: ' + failures.join('; '));
		return report;
	} finally {
		await browser.close();
	}
};

if (require.main === module) {
	(async function() {
		var args = Lib.args(process.argv.slice(2));
		if (args.help || args.files.length !== 1) {
			console.log('Usage: node tools/browser.js <widget.html> [--spa <url|file>] [--channel chrome] [--preview]');
			process.exit(args.help ? 0 : 2);
		}
		LOADCONFIG(Total.Fs.readFileSync(Total.Path.join(__dirname, '../tests/config'), 'utf8'));
		args.spa = args.spa || CONF.spa;
		console.log(JSON.stringify(await exports.run(args.files[0], args), null, 2));
		process.exit(0);
	})().catch(function(err) { console.error(err.stack); process.exit(1); });
}
