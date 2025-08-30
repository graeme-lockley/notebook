// TypeScript declarations for Observable packages
declare module '@observablehq/runtime' {
	export class Runtime {
		constructor(library?: unknown);
		module(parsed: unknown, options?: unknown): ObservableVariable;
		run(): Promise<void>;
	}

	export interface ObservableVariable {
		define(callback: (value: unknown) => void): void;
		catch(callback: (error: unknown) => void): void;
		delete(): void;
	}
}

declare module '@observablehq/parser' {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	export function parseCell(code: string): any;
}

declare module '@observablehq/stdlib' {
	// Standard library exports - this is a placeholder
	// The actual stdlib provides many functions, but we'll declare them as unknown for now
	export const stdlib: unknown;

	// AbstractFile class for file handling
	export abstract class AbstractFile {
		name: string;

		constructor(name: string, url: string);
		abstract url(): string;
	}

	// Library class for runtime library
	export class Library {
		constructor();
	}
}

declare module '@observablehq/plot' {
	export const plot: (spec: unknown) => Promise<HTMLElement>;
	export const line: (data: unknown, options?: unknown) => unknown;
	export const dot: (data: unknown, options?: unknown) => unknown;
}

declare module '@observablehq/katex' {
	const katex: {
		renderToString: (tex: string, options?: unknown) => string;
	};
	export default katex;
}

declare module '@observablehq/graphviz' {
	export const options: unknown;
}

declare module '@observablehq/inputs' {
	export const text: (options?: unknown) => HTMLElement;
	export const number: (options?: unknown) => HTMLElement;
	export const range: (options?: unknown) => HTMLElement;
	export const select: (options?: unknown) => HTMLElement;
	export const checkbox: (options?: unknown) => HTMLElement;
	export const radio: (options?: unknown) => HTMLElement;
	export const textarea: (options?: unknown) => HTMLElement;
}

declare module '@observablehq/inspector' {
	export class Inspector {
		constructor(node: HTMLElement);
		pending(): void;
		fulfilled(value: unknown, name?: string): void;
		rejected(error: unknown, name?: string): void;
		static into(container: HTMLElement | string): (value: unknown) => void;
	}
}
