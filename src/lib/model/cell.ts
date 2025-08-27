// Cell type definitions for ObservableHQ clone
import { Runtime } from '@observablehq/runtime';
import type { ObservableVariable } from '@observablehq/runtime';

import { executeHtml } from './cell/html';
import { executeJavaScript } from './cell/javascript';
import { executeMarkdown } from './cell/markdown';

export type CellKind = 'js' | 'md' | 'html';

export type CellStatus = 'ok' | 'error' | 'pending';

export interface CellValue {
	value: unknown;
	error: Error | null;
	html?: string | null;
	console?: string[];
}

export interface BaseCell {
	id: string;
	kind: CellKind;
	value: string;
	status: CellStatus;
	result: CellValue; // Replace valueHtml with result
	isFocused: boolean;
	hasError: boolean;
	isClosed: boolean;
}

export interface Cell extends BaseCell {
	// Runtime methods
	execute(): Promise<void>;
	dispose(): void;
	getValue(): unknown;
	getError(): Error | null;
	getHtml(): string | null;
}

export interface NotebookOptions {
	title?: string;
	description?: string;
	createdAt?: Date;
	updatedAt?: Date;
}

export interface AddCellOptions {
	kind?: CellKind;
	value?: string;
	position?: 'above' | 'below';
	relativeToId?: string;
	focus?: boolean;
}

export class ReactiveCell implements Cell {
	id: string;
	kind: CellKind;
	value: string;
	status: CellStatus = 'pending';
	result: CellValue = { value: null, error: null, html: null, console: [] };
	isFocused: boolean = false;
	hasError: boolean = false;
	isClosed: boolean = true;
	runtime: Runtime;
	variable: ObservableVariable | null = null;
	notebook: ReactiveNotebook;

	private observers: Set<(cell: ReactiveCell) => void> = new Set();
	private dependencies: Set<string> = new Set(); // Track cell IDs this cell depends on
	private dependents: Set<string> = new Set(); // Track cell IDs that depend on this cell

	constructor(
		id: string,
		kind: CellKind,
		value: string,
		runtime: Runtime,
		notebook: ReactiveNotebook
	) {
		this.id = id;
		this.kind = kind;
		this.value = value;
		this.runtime = runtime;
		this.notebook = notebook;
	}

	// Add observer for value changes
	addObserver(observer: (cell: ReactiveCell) => void) {
		this.observers.add(observer);
	}

	removeObserver(observer: (cell: ReactiveCell) => void) {
		this.observers.delete(observer);
	}

	// Dependency management
	addDependency(cellId: string) {
		this.dependencies.add(cellId);
	}

	removeDependency(cellId: string) {
		this.dependencies.delete(cellId);
	}

	addDependent(cellId: string) {
		this.dependents.add(cellId);
	}

	removeDependent(cellId: string) {
		this.dependents.delete(cellId);
	}

	// Trigger cascading updates to dependent cells
	async triggerCascadingUpdate(): Promise<void> {
		for (const dependentId of this.dependents) {
			const dependentCell = this.notebook.getCell(dependentId);
			if (dependentCell) {
				await dependentCell.execute();
			}
		}
	}

	// Execute the cell
	async execute(): Promise<void> {
		try {
			this.status = 'pending';
			this.notifyObservers();

			// Dispose of previous variable if it exists
			if (this.variable) {
				this.variable.delete();
				this.variable = null;
			}

			// Parse and execute based on cell kind
			if (this.kind === 'js') {
				await executeJavaScript(this);
			} else if (this.kind === 'md') {
				await executeMarkdown(this);
			} else if (this.kind === 'html') {
				await executeHtml(this);
			}

			// Trigger cascading updates to dependent cells
			await this.triggerCascadingUpdate();
		} catch (error) {
			this.handleError(error as Error);
		}
	}

	handleError(error: unknown): void {
		this.result.error = error instanceof Error ? error : new Error(String(error));
		this.result.value = null;
		this.status = 'error';
		this.hasError = true;
		this.notifyObservers();
	}

	// Getters for reactive values
	getValue(): unknown {
		return this.result.value;
	}

	getError(): Error | null {
		return this.result.error;
	}

	getHtml(): string | null {
		return this.result.html || null;
	}

	// Update cell content
	async updateContent(newValue: string): Promise<void> {
		this.value = newValue;
		await this.execute();
	}

	// Dispose of runtime resources
	dispose(): void {
		if (this.variable) {
			this.variable.delete();
			this.variable = null;
		}
		this.observers.clear();
	}

	notifyObservers(): void {
		this.observers.forEach((observer) => {
			try {
				observer(this);
			} catch (e) {
				console.error('Observer error:', e);
			}
		});
	}
}

export class ReactiveNotebook {
	private _cells: ReactiveCell[] = [];
	private _title: string;
	private _description: string;
	private _createdAt: Date;
	private _updatedAt: Date;
	private _version = 0;
	private runtime: Runtime;
	private observers: Set<(notebook: ReactiveNotebook) => void> = new Set();
	private sharedContext: Record<string, unknown> = {}; // Shared variables between cells

	constructor(options: NotebookOptions = {}) {
		this._title = options.title || 'Untitled Notebook';
		this._description = options.description || '';
		this._createdAt = options.createdAt || new Date();
		this._updatedAt = options.updatedAt || new Date();

		// Initialize Observable runtime with standard library
		this.runtime = new Runtime(import('@observablehq/stdlib'));
	}

	// Add observer for notebook changes
	addObserver(observer: (notebook: ReactiveNotebook) => void) {
		this.observers.add(observer);
	}

	removeObserver(observer: (notebook: ReactiveNotebook) => void) {
		this.observers.delete(observer);
	}

	private notifyObservers(): void {
		this.observers.forEach((observer) => {
			try {
				observer(this);
			} catch (e) {
				console.error('Observer error:', e);
			}
		});
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

	// Shared context management
	getSharedContext(): Record<string, unknown> {
		return { ...this.sharedContext };
	}

	setSharedVariable(name: string, value: unknown) {
		this.sharedContext[name] = value;
	}

	clearSharedContext() {
		this.sharedContext = {};
	}

	// Cell management methods
	async addCell(options: AddCellOptions = {}): Promise<ReactiveCell> {
		const {
			kind = 'js',
			value = this.getDefaultValue(kind),
			position = 'below',
			relativeToId,
			focus = false
		} = options;

		const newCell = new ReactiveCell(this.generateCellId(), kind, value, this.runtime, this);

		// Set up cell observer
		newCell.addObserver(() => {
			this.notifyObservers();
		});

		if (relativeToId) {
			const refIndex = this._cells.findIndex((cell) => cell.id === relativeToId);
			if (refIndex !== -1) {
				const insertIndex = position === 'above' ? refIndex : refIndex + 1;
				this._cells.splice(insertIndex, 0, newCell);
			} else {
				this._cells.push(newCell);
			}
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
		this.notifyObservers();

		return newCell;
	}

	removeCell(id: string): boolean {
		const index = this._cells.findIndex((cell) => cell.id === id);
		if (index === -1) return false;

		this._cells.splice(index, 1);
		this._updatedAt = new Date();
		this._version++;
		return true;
	}

	async updateCell(id: string, updates: Partial<Omit<BaseCell, 'id'>>): Promise<boolean> {
		const cell = this._cells.find((cell) => cell.id === id);
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
		this.notifyObservers();
		return true;
	}

	getCell(id: string): ReactiveCell | null {
		return this._cells.find((cell) => cell.id === id) || null;
	}

	// Focus management
	setFocus(id: string): boolean {
		const cell = this._cells.find((cell) => cell.id === id);
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
		const cell = this._cells.find((cell) => cell.id === id);
		if (!cell) return false;

		cell.isClosed = !cell.isClosed;
		this._updatedAt = new Date();
		this._version++;
		return true;
	}

	async runCell(id: string): Promise<void> {
		const cell = this._cells.find((cell) => cell.id === id);
		if (cell) {
			await cell.execute();
		}
	}

	async runAllCells(): Promise<void> {
		await Promise.all(this._cells.map((cell) => cell.execute()));
	}

	// Cell reordering
	moveCell(id: string, newIndex: number): boolean {
		const currentIndex = this._cells.findIndex((cell) => cell.id === id);
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
		const currentIndex = this._cells.findIndex((cell) => cell.id === id);
		if (currentIndex <= 0) return false;

		return this.moveCell(id, currentIndex - 1);
	}

	moveCellDown(id: string): boolean {
		const currentIndex = this._cells.findIndex((cell) => cell.id === id);
		if (currentIndex === -1 || currentIndex >= this._cells.length - 1) return false;

		return this.moveCell(id, currentIndex + 1);
	}

	async duplicateCell(id: string): Promise<ReactiveCell | null> {
		const cell = this._cells.find((cell) => cell.id === id);
		if (!cell) return null;

		const duplicatedCell = new ReactiveCell(
			this.generateCellId(),
			cell.kind,
			cell.value,
			this.runtime,
			this
		);

		// Copy properties
		duplicatedCell.isClosed = cell.isClosed;

		// Set up observer
		duplicatedCell.addObserver(() => {
			this.notifyObservers();
		});

		const currentIndex = this._cells.findIndex((cell) => cell.id === id);
		this._cells.splice(currentIndex + 1, 0, duplicatedCell);

		// Execute the duplicated cell
		await duplicatedCell.execute();

		this._updatedAt = new Date();
		this._version++;
		this.notifyObservers();
		return duplicatedCell;
	}

	// Notebook metadata
	updateTitle(title: string): void {
		this._title = title;
		this._updatedAt = new Date();
		this._version++;
	}

	updateDescription(description: string): void {
		this._description = description;
		this._updatedAt = new Date();
		this._version++;
	}

	// Utility methods
	private generateCellId(): string {
		return `cell-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
	}

	private getDefaultValue(kind: CellKind): string {
		switch (kind) {
			case 'js':
				return '// New JavaScript cell\nconsole.log("Hello!");';
			case 'md':
				return '# New Markdown Cell\n\nStart typing here...';
			case 'html':
				return '<div>New HTML Cell</div>';
			default:
				return '';
		}
	}

	// Serialization
	toJSON(): object {
		return {
			title: this._title,
			description: this._description,
			createdAt: this._createdAt.toISOString(),
			updatedAt: this._updatedAt.toISOString(),
			cells: this._cells
		};
	}

	static async fromJSON(data: Record<string, unknown>): Promise<ReactiveNotebook> {
		const notebook = new ReactiveNotebook({
			title: data.title as string,
			description: data.description as string,
			createdAt: new Date(data.createdAt as string),
			updatedAt: new Date(data.updatedAt as string)
		});

		// Restore cells
		if (Array.isArray(data.cells)) {
			for (const cellData of data.cells) {
				await notebook.addCell({
					kind: cellData.kind as CellKind,
					value: cellData.value as string
				});
			}
		}

		return notebook;
	}

	// Validation
	validate(): { isValid: boolean; errors: string[] } {
		const errors: string[] = [];

		// Check for duplicate cell IDs
		const cellIds = this._cells.map((cell) => cell.id);
		const duplicateIds = cellIds.filter((id, index) => cellIds.indexOf(id) !== index);
		if (duplicateIds.length > 0) {
			errors.push(`Duplicate cell IDs found: ${duplicateIds.join(', ')}`);
		}

		// Check for invalid cell kinds
		const invalidCells = this._cells.filter((cell) => !['js', 'md', 'html'].includes(cell.kind));
		if (invalidCells.length > 0) {
			errors.push(`Invalid cell kinds found: ${invalidCells.map((cell) => cell.kind).join(', ')}`);
		}

		// Check for multiple focused cells
		const focusedCells = this._cells.filter((cell) => cell.isFocused);
		if (focusedCells.length > 1) {
			errors.push('Multiple cells are focused');
		}

		return {
			isValid: errors.length === 0,
			errors
		};
	}

	// Dispose of all resources
	dispose(): void {
		this._cells.forEach((cell) => cell.dispose());
		this._cells = [];
		this.observers.clear();
	}
}
