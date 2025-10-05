import { Runtime } from '@observablehq/runtime';
import { AbstractFile, Library } from '@observablehq/stdlib';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ObservableValue = any;

export interface Observer {
	fulfilled(value: ObservableValue): void;
	pending(): void;
	rejected(value?: ObservableValue): void;
}

export interface IRuntime {
	dispose(): void;
	module(): IModule;
}

export interface IModule {
	_runtime: IRuntime;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	_scope: Map<string, Promise<any>>;

	variable(observer?: Observer): IVariable;
	value(name: string): Promise<ObservableValue>;
	removeVariable(name: string): void;
}

export interface IVariable {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	define(name: string | undefined, dependencies: Array<string>, body: any): void;
	import(name: string, alias: string | null, fromModule: IModule): void;
	import(name: string, fromModule: IModule): void;
	delete(): void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const createRuntime = (library?: any): IRuntime => {
	library = library || defaultLibrary();

	return new Runtime(library) as unknown as IRuntime;
};

export const defineVariable = (
	module: IModule,
	observer: Observer | undefined,
	name: string | undefined,
	dependencies: Array<string>,
	body: string
): void =>
	module
		.variable(observer)
		.define(name, dependencies, Eval(`(${dependencies.join(', ')}) => ${body}`));

const Eval = eval;

export const load = async (name: string) => {
	const fetchResponse = await fetch(name);

	return await fetchResponse.text();
};

class FA extends AbstractFile {
	constructor(name: string) {
		super(name, name);
	}

	url() {
		return this.name;
	}
}

export const loadSource = (url: string): FA => new FA(url);

const localBindings = {
	load: () => (url: string) => loadSource(url)
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const defaultLibrary = (bindings?: any): any =>
	Object.assign(new Library(), localBindings, bindings);
