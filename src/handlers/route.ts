import { Handler, HandlerFunction, isHandlerFunction } from './Handler';
import Functional from './Functional';
import { proxy as filterProxy, Filter } from './filter';
import { Transform, proxy as transformProxy } from './transform';
import Group from './Group';

export type RouteHandler = Handler | HandlerFunction | Array<Handler | HandlerFunction>;

/**
 * A route is comprised of an number of Filters or Transforms followed which wraps a Handler
 */
export class Route {
	protected stack: Array<(handler: Handler) => Handler> = [];

	filter(filter: Filter): this {
		this.stack.unshift(function (handler) {
			return filterProxy(handler, filter);
		});
		return this;
	}

	transform(func: Transform): this {
		this.stack.unshift(function (handler) {
			return transformProxy(handler, func);
		});
		return this;
	}

	wrap(handler: RouteHandler): Handler {
		if (Array.isArray(handler)) {
			handler = new Group(handler);
		}
		else if (isHandlerFunction(handler)) {
			handler = new Functional(handler);
		}

		for (let factory of this.stack) {
			handler = factory(handler);
		}
		return handler;
	}
}

/**
 * A helper function used for defining a route
 * @param filter an optional filter that must be matched for the wrapped handler to be called
 * @return a new Route which must wrap a Handler
 */
export default function route(filter?: Filter): Route {
	const route = new Route();

	if (filter) {
		route.filter(filter);
	}

	return route;
}
