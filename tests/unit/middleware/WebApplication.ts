import { assert } from 'chai';
import registerSuite from 'intern/lib/interfaces/object';
import WebApplication, { Application } from 'src/middleware/WebApplication';
import * as sinon from 'sinon';
import { createMockMiddleware, createMockResponse } from '../_support/mocks';
import { Handler } from 'src/handlers/Handler';

registerSuite('src/middleware/WebApplication', {
	construction: {
		'default'() {
			const app = new WebApplication();
			assert.isNotNull(app.middleware);
			assert.strictEqual(app.timeout, 5000);
		},

		'provided middleware'() {
			const middleware = createMockMiddleware();

			const app = new Application(middleware);
			assert.strictEqual(app.middleware, middleware);
		},

		'custom options': {
			timeout() {
				const app = new WebApplication({
					timeout: 5000
				});

				assert.strictEqual(app.timeout, 5000);
				assert.isNotNull(app.middleware);
			},

			errorHandler() {
				const errorHandler = sinon.stub();
				const app = new WebApplication({
					errorHandler
				});

				assert.strictEqual(app['errorHandler'], errorHandler);
				assert.isNotNull(app.middleware);
			}
		}
	},

	'#handle()': {
		'on timeout; rejects and is handled by errorHandler'() {
			const middleware: Handler = <any> { handle: () => new Promise(() => {}) };
			const app = new Application(middleware, {
				timeout: 100
			});

			return app.handle(null, createMockResponse());
		},

		'request and response passed to middleware'() {
			const middleware = createMockMiddleware();
			const app = new Application(middleware);
			const response = createMockResponse();

			return app.handle(null, response)
				.then(function () {
					const spy: sinon.SinonSpy = <sinon.SinonSpy> middleware.handle;
					assert.isTrue(spy.calledOnce);
					assert.isTrue(spy.firstCall.calledWith(null, response));
				});
		},

		'response is not marked as finished; postProcessing sends to errorHandler'() {
			const middleware = createMockMiddleware();
			const app = new Application(middleware);
			const response = createMockResponse();
			response.finished = false;

			return app.handle(null, response)
				.then(function () {
					const spy: sinon.SinonSpy = <sinon.SinonSpy> response.end;
					assert.strictEqual(response.statusCode, 404);
					assert.isTrue(spy.calledOnce);
					assert.isTrue(spy.firstCall.calledWith('Not Found'));
				});
		}
	}
});
