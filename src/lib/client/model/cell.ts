import {
	createRuntime,
	type IRuntime,
	type IModule,
	type Observer,
	type ObservableValue,
	type IVariable
} from '$lib/common/lib/runtime';
import type { CellKind } from '$lib/server/domain/value-objects/CellKind';
import { NotebookLoaderService } from '$lib/client/services/notebook-loader.service';

import { executeHtml } from './cell/html';
import { executeJavaScript } from './cell/javascript';
import { executeMarkdown } from './cell/markdown';
import { ImportedNotebookRegistry, Module } from './imported-module';

export type CellStatus = 'ok' | 'error' | 'pending';

export type VariableBinding = {
	observers: Observers;
	variable: IVariable;
};

export interface BaseCell {
	id: string;
	kind: CellKind;
	value: string;
	valueError: Error | null;
	variables: Map<string, VariableBinding>;
	isFocused: boolean;
	isClosed: boolean;
}

export interface Cell extends BaseCell {
	// Runtime methods
	execute(): Promise<void>;
	dispose(): void;
}

export interface NotebookOptions {
	title?: string;
	description?: string;
	createdAt?: Date;
	updatedAt?: Date;
}

export interface AddCellOptions {
	id: string;
	kind: CellKind;
	value: string;
	position?: number;
	focus?: boolean;
}

export class Observers implements Observer {
	_lastValue: ObservableValue | null = null;
	_observers: Map<number, Observer> = new Map();

	addObserver(observer: Observer): number {
		const id = Math.random();
		this._observers.set(id, observer);

		if (this._lastValue != null) {
			observer.fulfilled(this._lastValue);
		}

		return id;
	}

	removeObserver(id: number): void {
		this._observers.delete(id);
	}

	clear(): void {
		this._observers.clear();
	}

	fulfilled(value: ObservableValue): void {
		this._lastValue = value;
		this._observers.forEach((observer) => observer.fulfilled(value));
	}

	pending(): void {
		this._observers.forEach((observer) => observer.pending());
	}

	rejected(value?: ObservableValue): void {
		this._observers.forEach((observer) => observer.rejected(value));
	}
}

const CELL_ID_PREFIX = 'cell_';

export class ReactiveCell implements Cell {
	id: string;
	kind: CellKind;
	value: string;
	valueError: Error | null = null;
	isFocused: boolean = false;
	variables: Map<string, VariableBinding> = new Map();
	isClosed: boolean = true;
	module: IModule;
	notebook: ReactiveNotebook;
	private _cachedDefaultObservers: Observers | null = null;

	constructor(
		id: string,
		kind: CellKind,
		value: string,
		module: IModule,
		notebook: ReactiveNotebook
	) {
		this.id = id;
		this.kind = kind;
		this.value = value;
		this.module = module;
		this.notebook = notebook;
	}

	// Execute the cell
	async execute(): Promise<void> {
		try {
			// Parse and execute based on cell kind
			this.valueError = null;
			if (this.kind === 'js') {
				await executeJavaScript(this);
			} else if (this.kind === 'md') {
				await executeMarkdown(this);
			} else if (this.kind === 'html') {
				await executeHtml(this);
			}
		} catch (error) {
			this.handleError(error as Error);
		}
	}

	handleError(error: unknown): void {
		this.valueError =
			error instanceof Error ? error : new Error(typeof error === 'string' ? error : String(error));
	}

	// Dispose of runtime resources
	dispose(): void {
		this.variables.forEach((binding) => {
			binding.observers.clear();
			binding.variable.delete();
		});
		// Clear cache
		this._cachedDefaultObservers = null;
	}

	assignVariables(
		variables: Array<{ name: string | undefined; dependencies: Array<string>; body: string }>
	): void {
		// Invalidate cache when variables change
		this._cachedDefaultObservers = null;

		variables.forEach((variable, idx) => {
			if (variable.name === undefined) {
				variable.name = this.id + '_' + idx;
			}
		});

		const newNames = new Set(variables.map((variable) => variable.name));
		for (const name of this.variables.keys()) {
			if (!newNames.has(name)) {
				const binding = this.variables.get(name)!;
				binding.observers.clear();
				binding.variable.delete();
				this.variables.delete(name);
			}
		}

		variables.forEach((v) => {
			const newName = v.name || this.id;
			const binding = this.variables.get(newName);

			if (binding === undefined) {
				const newObservers = new Observers();
				const newVariable = this.module.variable(newObservers);
				newVariable.define(
					newName,
					v.dependencies,
					Eval(`(${v.dependencies.join(', ')}) => ${v.body}`)
				);
				this.variables.set(newName, { observers: newObservers, variable: newVariable });
			} else {
				binding.variable.define(
					newName,
					v.dependencies,
					Eval(`(${v.dependencies.join(', ')}) => ${v.body}`)
				);
			}
		});
	}

	/**
	 * Imports variables from another module into this cell.
	 *
	 * This method:
	 * - Removes any existing variables that are not in the new import list
	 * - Creates new variable bindings for imported variables
	 * - For multiple imports, creates a default observer that wraps all values as an array
	 *   (this allows the cell to have a default output showing all imported values)
	 *
	 * @param names - Array of variable names and their aliases to import
	 * @param module - The Observable module to import from
	 */
	importVariables(names: Array<{ name: string; alias: string }>, module: IModule): void {
		// Invalidate cache when variables change
		this._cachedDefaultObservers = null;

		const newNames = new Set(names.map((variable) => variable.alias || variable.name));
		// Add this.id to preserved names if it will be recreated for multiple imports
		if (names.length > 1) {
			newNames.add(this.id);
		}

		for (const name of this.variables.keys()) {
			if (!newNames.has(name)) {
				const binding = this.variables.get(name)!;
				binding.observers.clear();
				binding.variable.delete();
				this.variables.delete(name);
			}
		}
		names.forEach((name) => {
			const newName = name.alias || name.name;
			const binding = this.variables.get(newName);

			if (binding === undefined) {
				const newObservers = new Observers();
				const newVariable = this.module.variable(newObservers);
				newVariable.import(name.name, name.alias, module);
				this.variables.set(newName, { observers: newObservers, variable: newVariable });
			} else {
				binding.variable.import(name.name, name.alias, module);
			}
		});

		if (names.length > 1) {
			// Create a default observer for the cell wrapping all of the values as a map
			const newObservers = new Observers();
			const newVariable = this.module.variable(newObservers);
			const nameList = names.map((name) => name.alias || name.name);
			const params = nameList.join(', ');
			const body = `(${params}) => [${params}]`;
			newVariable.define(this.id, nameList, Eval(body));
			this.variables.set(this.id, { observers: newObservers, variable: newVariable });
		}
	}

	names(): string[] {
		return Array.from(this.variables.keys()).filter((n) => !n.startsWith(CELL_ID_PREFIX));
	}

	defaultObservers(): Observers {
		// Return cached value if available
		if (this._cachedDefaultObservers) {
			return this._cachedDefaultObservers;
		}

		// Compute and cache the result
		if (this.variables.size === 1) {
			const firstBinding = this.variables.values().next().value;
			if (!firstBinding) {
				throw new Error('No variable binding found in single-variable cell');
			}
			this._cachedDefaultObservers = firstBinding.observers;
		} else {
			const binding = this.variables.get(this.id);
			if (!binding) {
				throw new Error(`No variable binding found for cell ${this.id}`);
			}
			this._cachedDefaultObservers = binding.observers;
		}

		return this._cachedDefaultObservers;
	}
}

const Eval = eval;

export class ReactiveNotebook {
	private _cells: ReactiveCell[] = [];
	private _title: string;
	private _description: string;
	private _createdAt: Date;
	private _updatedAt: Date;
	private _version = 0;
	private runtime: IRuntime;
	private module: IModule;
	private _modules: ImportedNotebookRegistry;

	constructor(options: NotebookOptions = {}) {
		this._title = options.title || 'Untitled Notebook';
		this._description = options.description || '';
		this._createdAt = options.createdAt || new Date();
		this._updatedAt = options.updatedAt || new Date();

		// Initialize Observable runtime with standard library
		this.runtime = createRuntime();
		this.module = this.runtime.module();

		this._modules = new ImportedNotebookRegistry(this.runtime, new NotebookLoaderService());
	}

	// Getters
	get cells(): readonly ReactiveCell[] {
		return this._cells;
	}

	get title(): string {
		return this._title;
	}

	get description(): string {
		return this._description;
	}

	get createdAt(): Date {
		return this._createdAt;
	}

	get version(): number {
		return this._version;
	}

	get updatedAt(): Date {
		return this._updatedAt;
	}

	get focusedCell(): ReactiveCell | null {
		return this._cells.find((cell) => cell.isFocused) || null;
	}

	get openCells(): ReactiveCell[] {
		return this._cells.filter((cell) => !cell.isClosed);
	}

	get closedCells(): ReactiveCell[] {
		return this._cells.filter((cell) => cell.isClosed);
	}

	async getModule(urn: string): Promise<Module> {
		return this._modules.getModule(urn);
	}

	// Cell management methods
	async addCell(options: AddCellOptions): Promise<ReactiveCell> {
		const { id, kind, value, position, focus = false } = options;

		const clientId = serverIdToClientId(id);
		const newCell = new ReactiveCell(clientId, kind, value, this.module, this);

		if (position && position < this._cells.length) {
			this._cells.splice(position, 0, newCell);
		} else {
			this._cells.push(newCell);
		}

		// Update focus if needed
		if (focus) {
			this.setFocus(newCell.id);
		}

		// Execute the cell
		await newCell.execute();

		this._updatedAt = new Date();
		this._version++;

		return newCell;
	}

	removeCell(id: string): boolean {
		const index = this.getCellIndex(id);
		if (index === -1) {
			return false;
		}

		this._cells.splice(index, 1);
		this._updatedAt = new Date();
		this._version++;

		return true;
	}

	async updateCell(id: string, updates: Partial<Omit<BaseCell, 'id'>>): Promise<boolean> {
		const cell = this.getCell(id);
		if (!cell) return false;

		// Check if the value is being updated
		const valueChanged = 'value' in updates && updates.value !== cell.value;
		const kindChanged = 'kind' in updates && updates.kind !== cell.kind;

		// Apply updates
		Object.assign(cell, updates);

		// Re-execute the cell if value or kind changed
		if (valueChanged || kindChanged) {
			await cell.execute();
		}

		this._updatedAt = new Date();
		this._version++;

		return true;
	}

	getCell(id: string): ReactiveCell | null {
		return this._cells.find((cell) => cell.id === id) || null;
	}

	getCellIndex(id: string): number {
		return this._cells.findIndex((cell) => cell.id === id);
	}

	// Focus management
	setFocus(id: string): boolean {
		const cell = this.getCell(id);
		if (!cell) return false;

		// Clear focus from all cells
		this._cells.forEach((cell) => {
			cell.isFocused = false;
		});

		// Set focus on target cell
		cell.isFocused = true;
		this._updatedAt = new Date();
		this._version++;
		return true;
	}

	clearFocus(): void {
		this._cells.forEach((cell) => {
			cell.isFocused = false;
		});
		this._updatedAt = new Date();
		this._version++;
	}

	// Cell operations
	toggleClosed(id: string): boolean {
		const cell = this.getCell(id);
		if (!cell) return false;

		cell.isClosed = !cell.isClosed;
		this._updatedAt = new Date();
		this._version++;
		return true;
	}

	// Cell reordering
	moveCell(id: string, newIndex: number): boolean {
		const currentIndex = this.getCellIndex(id);
		if (currentIndex === -1 || newIndex < 0 || newIndex >= this._cells.length) {
			return false;
		}

		const cell = this._cells.splice(currentIndex, 1)[0];
		this._cells.splice(newIndex, 0, cell);
		this._updatedAt = new Date();
		this._version++;
		return true;
	}

	moveCellUp(id: string): boolean {
		const currentIndex = this.getCellIndex(id);
		if (currentIndex <= 0) return false;

		return this.moveCell(id, currentIndex - 1);
	}

	moveCellDown(id: string): boolean {
		const currentIndex = this.getCellIndex(id);
		if (currentIndex === -1 || currentIndex >= this._cells.length - 1) return false;

		return this.moveCell(id, currentIndex + 1);
	}

	// Notebook metadata
	updateMetadata(updates: { title?: string; description?: string }): void {
		if (updates.title !== undefined) {
			this._title = updates.title;
		}
		if (updates.description !== undefined) {
			this._description = updates.description;
		}
		this._updatedAt = new Date();
		this._version++;
	}

	// Dispose of all resources
	dispose(): void {
		this._cells.forEach((cell) => cell.dispose());
		this._cells = [];
		this._modules.dispose();
	}
}

export function serverIdToClientId(serverId: string): string {
	return serverId.replaceAll('-', '_');
}

export function clientIdToServerId(clientId: string): string {
	return clientId.replaceAll('_', '-');
}
