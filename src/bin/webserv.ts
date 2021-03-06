#!/usr/bin/env node
import * as yargs from 'yargs';
import { App } from '../core/app';
import { logRequest } from '../core/processors/log.processor';
import { fileBrowser } from '../core/routes/fileBrowser.route';
import { proxyRoute } from '../core/routes/proxy.route';
import { route } from '../core/routes/route';
import { body } from '../core/processors/body.processor';
import { uploadRoute } from '../core/routes/upload.route';
import { crudRoute } from '../core/routes/crud.route';
import { response } from '../core/middleware/response';
import { startNgrok } from './addons/ngrok';

const argv = yargs
	.options('log', {
		alias: 'l',
		describe: 'display all logs to the console'
	})
	.option('mode', {
		alias: 'm',
		describe: 'use http or https',
		choices: ['http', 'https', 'ngrok'],
		default: 'http'
	})
	.option('port', {
		alias: 'p',
		describe: 'sets the server port to use',
		default: 8888,
		type: 'number'
	})
	.option('type', {
		alias: 't',
		describe: 'start a predefined server',
		type: 'array',
		default: ['file']
	}).argv;

export async function start() {
	const app = new App();

	if (argv.log) {
		app.before.push(body({}), logRequest({ logBody: true }));
	}

	switch (argv.type[0]) {
		case 'crud':
			app.routes.push(crudRoute({}));
			break;
		case 'proxy':
			{
				const target = String(argv.type[1]);
				const proxy = proxyRoute({
					target,
					changeOrigin: true,
					followRedirects: false,
					ws: true
				});
				app.routes.push(
					route({
						middleware: proxy.middleware
					})
				);
				app.upgrader = proxy.upgrader;
			}
			break;
		case 'file':
			{
				const basePath = String(argv.type[1] || process.cwd());
				app.routes.push(fileBrowser({ basePath }));
			}
			break;
		case 'upload':
			const directory = String(argv.type[1]);
			app.routes.push(uploadRoute({ directory }));
			break;
		case 'log':
			if (!argv.log) {
				app.before.push(body({}), logRequest({ logBody: true }));
			}
			app.routes.push(route({ middleware: response({ statusCode: 200 }) }));
			break;
		default:
			throw new Error(`unknown server type ${argv.type[0]}`);
	}

	const mode = argv.mode === 'https' ? 'https' : 'http';
	const controls = await app.start(mode, {
		port: argv.port
	});

	if (argv.mode === 'ngrok') {
		await startNgrok(argv.port);
	}

	return controls;
}

start().catch((err: Error) => {
	console.error('failed to start webserv');
	console.error(`reason: ${err.message}`);
	console.error(err.stack);
	process.exitCode = 1;
	process.exit();
});
