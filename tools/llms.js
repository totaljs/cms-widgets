'use strict';

require('total5');

var root = Total.Path.join(__dirname, '..');
var pages = ['AGENTS.md', 'docs/ai.md', 'docs/format.md', 'docs/api.md', 'docs/workflow.md', 'docs/testing.md', 'docs/sources.md'];
var mode = process.argv[2];
if (mode !== '--write' && mode !== '--check') {
	console.error('Usage: node tools/llms.js --write|--check');
	process.exit(2);
}
var index = '# Total.js CMS Widgets\n\n> Author, review and verify single-file CMS widgets.\n\n## Documentation\n\n';
var full = '# Total.js CMS Widgets\n';
pages.forEach(function(page) {
	var text = Total.Fs.readFileSync(Total.Path.join(root, page), 'utf8');
	var title = text.split('\n')[0].replace(/^#+\s*/, '');
	index += '- [' + title + '](' + page + ')\n';
	full += '\n---\n\nSource: ' + page + '\n\n' + text;
});
var stale = [];
[['llms.txt', index], ['llms-full.txt', full]].forEach(function(pair) {
	var file = Total.Path.join(root, pair[0]);
	if (mode === '--write')
		Total.Fs.writeFileSync(file, pair[1]);
	else if (!Total.Fs.existsSync(file) || Total.Fs.readFileSync(file, 'utf8') !== pair[1])
		stale.push(pair[0]);
});
if (stale.length) {
	console.error('Regenerate with node tools/llms.js --write: ' + stale.join(', '));
	process.exit(1);
}
console.log(mode === '--write' ? 'Generated model documentation.' : 'Model documentation is current.');
