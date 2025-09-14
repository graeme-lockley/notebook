import type { Notebook } from '../../application/ports/inbound/notebook.service';

export class Library {
	private notebooks: Map<string, Notebook> = new Map();

	constructor() {
		this.notebooks = new Map();
	}

	has(notebookId: string): boolean {
		return this.notebooks.has(notebookId);
	}

	get(notebookId: string): Notebook | undefined {
		return this.notebooks.get(notebookId);
	}

	set(notebookId: string, notebook: Notebook) {
		this.notebooks.set(notebookId, notebook);
	}

	delete(notebookId: string) {
		this.notebooks.delete(notebookId);
	}

	clear() {
		this.notebooks.clear();
	}

	values() {
		return this.notebooks.values();
	}
}
