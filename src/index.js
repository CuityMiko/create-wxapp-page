import fs from 'fs';
import path from 'path';
import mkdirp from 'mkdirp';
import inquirer from 'inquirer';
import yargs from 'yargs';
import pkg, { version } from '../package.json';
import updateNotifier from 'update-notifier';

const cwd = process.cwd();

const defaultValue = {
	name: 'index',
	indent: 'tab',
	dir: cwd,
	json: false,
	style: 'wxss',
};

const formatTemplate = (template, options) => {
	let templateStr = template(options);
	const { indent } = options;
	if (indent !== defaultValue.indent) {
		const intNum = ~~indent;
		const spaces = new Array(intNum).fill(' ').join('');
		templateStr = templateStr.replace(/\t/g, spaces);
	}
	return templateStr;
};

const generateJson = (root, name, indent) => {
	const filename = root + '/app.json';
	const content = fs.readFileSync(filename, 'utf8');
	const json = JSON.parse(content);
	json.pages.push(`pages/${name}/${name}`);
	const formatedIndent = indent === 'tab' ? '\t' : ~~indent;
	const result = JSON.stringify(json, null, formatedIndent);
	fs.writeFileSync(filename, result);
};

export const createPage = (options) => {
	// const cwd = process.cwd();

	if (typeof options !== 'object') {
		throw new Error('options must be a object.');
	}

	options = Object.assign({
		name: 'index',
		indent: 'tab',
		dir: cwd,
		json: false,
		style: 'wxss',
	}, options);

	const { dir, name, indent } = options;

	const root = path.isAbsolute(dir) ? dir : path.resolve(cwd, dir);
	const hasAppJsonFile = fs.existsSync(path.resolve(root, 'app.json'));
	if (!hasAppJsonFile) {
		throw new Error('app.json does not exist.');
	}

	const pageRoot = path.resolve(root, 'pages', name);

	if (fs.existsSync(pageRoot)) {
		throw new Error('file already exited.');
	}

	mkdirp.sync(pageRoot);

	const filesType = ['js', 'wxml', options.style, options.json ? 'json' : null];

	filesType.forEach((type) => {
		if (!type) { return; }
		const filePath = path.resolve(pageRoot, name + `.${type}`);
		const { default: template } = require(`./templates/${type}`);
		const formatedTemplate = formatTemplate(template, options);
		fs.writeFileSync(filePath, formatedTemplate);
		console.log('file created:', filePath);
	});
	console.log('files create complete');
	generateJson(root, name, indent);
};

const app = async () => {
	// eslint-disable-next-line
	const argv = yargs
		.options({
			i: {
				alias: 'indent',
				describe: '文件缩进的方式',
			},
			d: {
				alias: 'dir',
				describe: '生成的文件所放置的根目录',
				type: 'string',
			},
			n: {
				alias: 'name',
				describe: '生成页面的名称',
				type: 'string',
			},
			j: {
				alias: 'json',
				describe: '是否需要生成配置文件(.json)',
				type: 'boolean',
			},
			s: {
				alias: 'style',
				describe: '样式文件的类型',
				choices: ['wxss', 'scss', 'less'],
				type: 'string',
			},
			y: {
				alias: 'yes',
				describe: '使用默认值生成相关文件',
				type: 'boolean',
			},
		})
		.alias('h', 'help')
		.alias('v', 'version')
		.help()
		.version(version)
		.argv;

	const promptItem = {
		dir: {
			message: '请输入生成的文件所放置的根目录',
			default: defaultValue.dir,
			type: 'input',
			name: 'dir',
		},
		indent: {
			message: '请输入文件缩进的方式',
			default: defaultValue.indent,
			type: 'input',
			name: 'indent',
		},
		name: {
			message: '请输入页面名称',
			default: defaultValue.name,
			type: 'input',
			name: 'name',
		},
		json: {
			message: '是否需要生成配置文件(.json)',
			default: defaultValue.json,
			type: 'confirm',
			name: 'json',
		},
		style: {
			type: 'list',
			message: '请选择样式文件的类型',
			choices: ['wxss', 'scss', 'less'],
			name: 'style',
		},
	};

	const { dir, name, indent, json, style, yes } = argv;
	const options = {
		dir: dir || defaultValue.dir,
		name: name || defaultValue.name,
		indent: indent || defaultValue.indent,
		json: json || defaultValue.json,
		style: style || defaultValue.style,
	};

	if (!yes) {
		const activePromptItem = [];
		!dir && activePromptItem.push(promptItem.dir);
		!name && activePromptItem.push(promptItem.name);
		!indent && activePromptItem.push(promptItem.indent);
		!json && activePromptItem.push(promptItem.json);
		!style && activePromptItem.push(promptItem.style);
		if (activePromptItem.length) {
			const answers = await inquirer.prompt(activePromptItem);

			Object.keys(answers).forEach((key) => {
				options[key] = answers[key];
			});
		}
	}
	createPage(options);
};

app();
updateNotifier({ pkg }).notify();
