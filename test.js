'use strict';

require('total5');
require('total5/test');

process.on('uncaughtException', function() {
	process.exit(1);
});

var Lib = require('./tools/lib');
var args = Lib.args(process.argv.slice(2));
var skipped = [];

LOADCONFIG(Total.Fs.readFileSync(Total.Path.join(__dirname, 'tests/config'), 'utf8'));

function skip(name, reason) {
	skipped.push(name);
	console.log('[SKIP]', name + ': ' + reason);
}

function walk(dir) {
	var files = [];
	Total.Fs.readdirSync(dir, { withFileTypes: true }).forEach(function(entry) {
		var file = Total.Path.join(dir, entry.name);
		files = files.concat(entry.isDirectory() ? walk(file) : [file]);
	});
	return files;
}

function command(file, values) {
	return Total.Child.spawnSync(process.execPath, [Total.Path.join(__dirname, file)].concat(values || []), { encoding: 'utf8', timeout: 30000 });
}

Test.push('Instructions and documentation', function(next) {
	var files = ['AGENTS.md', 'CLAUDE.md', 'GEMINI.md', '.github/copilot-instructions.md'].map(function(file) { return Total.Path.join(__dirname, file); }).concat(walk(Total.Path.join(__dirname, 'docs')), walk(Total.Path.join(__dirname, '.agents')), walk(Total.Path.join(__dirname, '.claude')));
	var broken = [];
	files.forEach(function(file) {
		var text = Total.Fs.readFileSync(file, 'utf8');
		var regex = /\[[^\]]+\]\(([^)]+)\)/g;
		var link;
		while ((link = regex.exec(text))) {
			if (/^(?:https?:|#)/.test(link[1]))
				continue;
			if (!Total.Fs.existsSync(Total.Path.resolve(Total.Path.dirname(file), link[1].split('#')[0])))
				broken.push(file + ': ' + link[1]);
		}
	});
	Test.print('local documentation and skill links resolve', broken.length ? broken.join('\n') : null);
	var index = Total.Fs.readFileSync(Total.Path.join(__dirname, 'llms.txt'), 'utf8');
	var missing = walk(Total.Path.join(__dirname, 'docs')).filter(function(file) { return !index.includes('docs/' + Total.Path.basename(file)); });
	Test.print('model index covers every documentation page', missing.length ? missing.join(', ') : null);
	['cms-widget-create', 'cms-widget-review'].forEach(function(name) {
		var canonical = Total.Fs.readFileSync(Total.Path.join(__dirname, '.agents/skills', name, 'SKILL.md'), 'utf8');
		var alias = Total.Fs.readFileSync(Total.Path.join(__dirname, '.claude/skills', name, 'SKILL.md'), 'utf8');
		var valid = canonical.match(/^name: (.+)$/m)[1] === name && canonical.match(/^description: (.+)$/m)[1] === alias.match(/^description: (.+)$/m)[1] && alias.includes('../../../.agents/skills/' + name + '/SKILL.md');
		Test.print(name + ' shares its workflow across agents', valid ? null : 'Skill discovery metadata or shared link differs');
	});
	var result = command('tools/llms.js', ['--check']);
	Test.print('generated model documentation is current', result.status === 0 ? null : result.stdout + result.stderr);
	result = command('tools/check.js', ['--unknown']);
	Test.print('unknown checker options fail', result.status === 1 && result.stderr.includes('Unknown option') ? null : result.stdout + result.stderr);
	next();
});

Test.push('Native sections and widget contract', function(next) {
	var sample = Lib.read(Total.Path.join(__dirname, 'examples/notice.html'));
	Lib.files([Total.Path.join(__dirname, 'examples')]).forEach(function(file) {
		var result = Lib.check(Lib.read(file));
		Test.print(Total.Path.basename(file) + ' passes the native checker', result.errors.length ? result.errors.join('; ') : null);
	});
	function broken(label, transform, expected) {
		var source = transform(sample.source);
		var result = Lib.check({ source: source, file: sample.file, sections: source.parseComponent({ settings: '<settings>', css: '<style>', total: '<script total>', html: '<body>', js: '<script>', template: '<template>', readme: '<readme>' }) });
		Test.print(label, result.errors.some(function(message) { return message.includes(expected); }) ? null : 'Expected failure containing ' + expected + ': ' + result.errors.join('; '));
	}
	broken('rejects an unterminated body', function(s) { return s.replace('</body>', ''); }, 'body');
	broken('rejects duplicate outer body blocks', function(s) { return s + '\n<body>Second</body>'; }, 'Duplicate');
	broken('rejects invalid server JavaScript', function(s) { return s.replace('exports.id =', 'var =; exports.id ='); }, 'JavaScript');
	broken('rejects invalid settings JavaScript', function(s) { return s.replace('exports.save =', 'var =; exports.save ='); }, 'settings JavaScript');
	broken('rejects mismatched filename and id', function(s) { return s.replace("exports.id = 'notice'", "exports.id = 'different'"); }, 'Filename');
	broken('rejects an unknown settings key', function(s) { return s.replace('?.tone', '?.unknown'); }, 'no default');
	broken('rejects undocumented options', function(s) { return s.replace('- `tone`', '- Tone'); }, 'Document config');
	['null', 'false', '[]', '42'].forEach(function(value) {
		broken('rejects non-object config: ' + value, function(s) { return s.replace(/exports\.config = [^;]+;/, 'exports.config = ' + value + ';'); }, 'config must be an object');
	});
	broken('rejects non-image preview bytes', function(s) { return s.replace(/exports\.preview\s*=\s*'[^']*';/, "exports.preview = 'data:image/png;base64,YmFk';"); }, 'image type');
	broken('rejects CSS outside widget scope', function(s) { return s.replace('<style>', '<style>\np { color: red; }'); }, 'scope');
	var invalid = sample.source.replace('exports.save =', 'var =; exports.save =');
	var legacy = Lib.check({ source: invalid, file: sample.file, sections: invalid.parseComponent({ settings: '<settings>', total: '<script total>', html: '<body>' }) }, true);
	Test.print('legacy mode still rejects invalid JavaScript', legacy.errors.length ? null : 'Invalid code passed');
	var folder = Total.Fs.mkdtempSync(Total.Path.join(Total.Os.tmpdir(), 'cms-widget-check-'));
	try {
		['a', 'b'].forEach(function(name) {
			Total.Fs.mkdirSync(Total.Path.join(folder, name));
			Total.Fs.writeFileSync(Total.Path.join(folder, name, 'notice.html'), sample.source);
		});
		var result = command('tools/check.js', [Total.Path.join(folder, 'a/notice.html'), Total.Path.join(folder, 'b/notice.html')]);
		Test.print('rejects duplicate ids across files', result.status === 1 && result.stdout.includes('Duplicate widget id') ? null : result.stdout + result.stderr);
		var constructorfile = Total.Path.join(folder, 'constructor.html');
		Total.Fs.writeFileSync(constructorfile, sample.source.replace("exports.id = 'notice'", "exports.id = 'constructor'"));
		result = command('tools/check.js', [constructorfile]);
		Test.print('supports ids matching object property names', result.status === 0 ? null : result.stdout + result.stderr);
	} finally {
		Total.Fs.rmSync(folder, { recursive: true, force: true });
	}
	var scoped = Lib.scope(sample);
	Test.print('CLASS is scoped in settings, body and CSS', scoped.sections.settings.includes('w-notice-content') && scoped.sections.html.includes('w-notice-content') && scoped.sections.css.includes('.w-notice-content') ? null : 'Missing scoped class');
	next();
});

Test.push('Framework 5 published rendering', async function(next) {
	var TCMS = Total.TCMS;
	var dynamic = Lib.scope(Lib.read(Total.Path.join(__dirname, 'examples/statusmessage.html')));
	function render(configs) {
		var html = configs.map(function(config, i) {
			return '<div class="CMS_widget w-statusmessage" data-cms="statusmessage__' + encodeURIComponent(JSON.stringify(config)) + '" data-cms-id="instance' + i + '">' + dynamic.sections.html + '</div>';
		}).join('');
		return TCMS.compile(html, [dynamic.meta]).render({ url: '/', vars: {}, refs: {} });
	}
	var output = await render([{ message: '<img src=x onerror=alert(1)>' }, { message: 'Second & separate' }]);
	Test.print('server rendering encodes hostile text', !output.includes('<img') && output.includes('&lt;img') ? null : output);
	Test.print('server rendering keeps instance values separate', output.includes('Second &amp; separate') ? null : output);
	output = await render([{ message: '' }, {}]);
	Test.print('missing message uses the default and empty message stays empty', (output.match(/We are here to help\./g) || []).length === 1 ? null : output);
	next();
});

Test.push('Consuming CMS compilation', function(next) {
	var cms = args.cms || CONF.cms;
	if (!cms) {
		skip('CMS compilation', 'Set cms in tests/config or pass --cms /path/to/cms');
		next();
		return;
	}
	Lib.files([Total.Path.join(__dirname, 'examples')]).forEach(function(file) {
		var result = command('tools/check.js', [file, '--cms', cms]);
		Test.print(Total.Path.basename(file) + ' compiles with the actual CMS', result.status === 0 ? null : result.stdout + result.stderr);
	});
	next();
});

Test.push('Browser settings and instance isolation', async function(next) {
	var spa = args.spa || CONF.spa;
	if (!spa && !args.browser) {
		skip('Browser checks', 'Set spa in tests/config or pass --browser --spa <url|file>');
		next();
		return;
	}
	Test.print('browser checks have a matching UI bundle', spa ? null : 'Missing spa URL or path');
	var Browser = require('./tools/browser');
	var names = ['notice', 'insetpanel', 'statusmessage'];
	for (var i = 0; i < names.length; i++) {
		var name = names[i];
		await Browser.run(Total.Path.join(__dirname, 'examples', name + '.html'), {
			spa: spa,
			channel: args.channel,
			verify: async function(page) {
				var valid = await page.evaluate(function(name) {
					var h = window.__widgetHarness;
					var el = h.wrappers[0];
					if (name === 'notice') {
						h.hooks.save({ tone: 'success', align: 'right' }, el);
						var right = getComputedStyle(el.find('p')[0]).textAlign;
						h.hooks.save({ tone: 'bad', align: 'bad' }, el);
						return right === 'right' && el.find('.w-notice-tone-info.w-notice-align-left').length === 1 && el.find('p').text() === 'Edited visitor content 0';
					}
					if (name === 'insetpanel') {
						h.hooks.save({ spacing: 'compact' }, el);
						return getComputedStyle(el.find('section')[0]).paddingTop === '12px' && el.find('.CMS_widgets .CMS_widget').text() === 'Nested content';
					}
					var input = '<img src=x onerror=alert(1)>';
					h.hooks.save({ message: input }, el);
					var safe = el.find('img').length === 0 && el.find('p').text() === input;
					h.hooks.save({ message: '' }, el);
					return safe && el.find('p').text() === '';
				}, name);
				Test.print(name + ' applies settings and handles edge cases', valid ? null : 'Unexpected DOM or style');
			}
		});
		Test.print(name + ' preserves content, isolates instances and fits desktop/mobile');
	}
	next();
});

process.on('unhandledRejection', function(err) {
	Test.print('asynchronous execution', err);
});

Test.run(function() {
	console.log('Skipped groups:', skipped.length);
	process.exit(0);
});
