// Cell type definitions for ObservableHQ clone

export type CellKind = 'js' | 'md' | 'html';

export type CellStatus = 'ok' | 'error' | 'pending';

export interface Cell {
	id: string;
	kind: CellKind;
	value: string;
	status: CellStatus;
	valueHtml: string | null;
	console?: string[];
	isFocused: boolean;
	isPinned: boolean;
	hasError: boolean;
	isClosed: boolean;
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

export class Notebook {
	private _cells: Cell[] = [];
	private _title: string;
	private _description: string;
	private _createdAt: Date;
	private _updatedAt: Date;

	constructor(options: NotebookOptions = {}) {
		this._title = options.title || 'Untitled Notebook';
		this._description = options.description || '';
		this._createdAt = options.createdAt || new Date();
		this._updatedAt = options.updatedAt || new Date();
	}

	// Getters
	get cells(): readonly Cell[] {
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

	get updatedAt(): Date {
		return this._updatedAt;
	}

	get focusedCell(): Cell | null {
		return this._cells.find((cell) => cell.isFocused) || null;
	}

	get pinnedCells(): Cell[] {
		return this._cells.filter((cell) => cell.isPinned);
	}

	get openCells(): Cell[] {
		return this._cells.filter((cell) => !cell.isClosed);
	}

	get closedCells(): Cell[] {
		return this._cells.filter((cell) => cell.isClosed);
	}

	// Cell management methods
	addCell(options: AddCellOptions = {}): Cell {
		const {
			kind = 'js',
			value = this.getDefaultValue(kind),
			position = 'below',
			relativeToId,
			focus = false
		} = options;

		const newCell: Cell = {
			id: this.generateCellId(),
			kind,
			value,
			status: 'ok',
			valueHtml: null,
			console: [],
			isFocused: focus,
			isPinned: false,
			hasError: false,
			isClosed: true // New cells start closed
		};

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

		this._updatedAt = new Date();
		return newCell;
	}

	removeCell(id: string): boolean {
		const index = this._cells.findIndex((cell) => cell.id === id);
		if (index === -1) return false;

		this._cells.splice(index, 1);
		this._updatedAt = new Date();
		return true;
	}

	updateCell(id: string, updates: Partial<Omit<Cell, 'id'>>): boolean {
		const cell = this._cells.find((cell) => cell.id === id);
		if (!cell) return false;

		Object.assign(cell, updates);
		this._updatedAt = new Date();
		return true;
	}

	getCell(id: string): Cell | null {
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
		return true;
	}

	clearFocus(): void {
		this._cells.forEach((cell) => {
			cell.isFocused = false;
		});
		this._updatedAt = new Date();
	}

	// Cell operations
	toggleClosed(id: string): boolean {
		const cell = this._cells.find((cell) => cell.id === id);
		if (!cell) return false;

		cell.isClosed = !cell.isClosed;
		this._updatedAt = new Date();
		return true;
	}

	togglePinned(id: string): boolean {
		const cell = this._cells.find((cell) => cell.id === id);
		if (!cell) return false;

		cell.isPinned = !cell.isPinned;
		this._updatedAt = new Date();
		return true;
	}

	runCell(id: string): Promise<void> {
		return new Promise((resolve) => {
			const cell = this._cells.find((cell) => cell.id === id);
			if (!cell) {
				resolve();
				return;
			}

			// Set status to pending
			cell.status = 'pending';
			this._updatedAt = new Date();

			// Simulate execution (in real implementation, this would execute the cell)
			setTimeout(() => {
				cell.status = 'ok';
				cell.hasError = false;
				this._updatedAt = new Date();
				resolve();
			}, 1000);
		});
	}

	async runAllCells(): Promise<void> {
		await Promise.all(this._cells.map((cell) => this.runCell(cell.id)));
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

	// Notebook metadata
	updateTitle(title: string): void {
		this._title = title;
		this._updatedAt = new Date();
	}

	updateDescription(description: string): void {
		this._description = description;
		this._updatedAt = new Date();
	}

	// Utility methods
	private generateCellId(): string {
		return `cell-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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

	static fromJSON(data: Record<string, unknown>): Notebook {
		const notebook = new Notebook({
			title: data.title as string,
			description: data.description as string,
			createdAt: new Date(data.createdAt as string),
			updatedAt: new Date(data.updatedAt as string)
		});

		// Restore cells
		if (Array.isArray(data.cells)) {
			notebook._cells = data.cells.map((cellData: Record<string, unknown>) => ({
				...cellData,
				createdAt: cellData.createdAt ? new Date(cellData.createdAt as string) : new Date(),
				updatedAt: cellData.updatedAt ? new Date(cellData.updatedAt as string) : new Date()
			})) as unknown as Cell[];
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
}
