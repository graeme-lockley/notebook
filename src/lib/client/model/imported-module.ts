import { NotebookLoaderService } from '$lib/client/services/notebook-loader.service';
import { type IModule, type IRuntime, type IVariable } from '$lib/common/lib/runtime';
import type { ApiCell, GetNotebookResponse } from '$lib/types/api-contracts';
import type { CellKind } from '$lib/server/domain/value-objects/CellKind';
import { parse } from '$lib/common/lib/parser';

/**
 * Manages imported notebook modules with caching and circular import detection.
 *
 * This class is responsible for:
 * - Loading notebooks as Observable runtime modules
 * - Caching loaded modules to avoid redundant loads
 * - Detecting and preventing circular import dependencies
 * - Managing the loading state to ensure proper cleanup
 *
 * @example
 * ```typescript
 * const registry = new ImportedNotebookRegistry(runtime, notebookLoaderService);
 * const module = await registry.getModule('NotebookA');
 * // Use module.runtimeModule for imports
 * registry.dispose(); // Clean up when done
 * ```
 */
export class ImportedNotebookRegistry {
	private modules: Map<string, Module> = new Map();
	private loading: Set<string> = new Set();
	private runtime: IRuntime;
	private notebookLoaderService: NotebookLoaderService;

	constructor(runtime: IRuntime, notebookLoaderService: NotebookLoaderService) {
		this.modules = new Map();
		this.loading = new Set();
		this.runtime = runtime;
		this.notebookLoaderService = notebookLoaderService;
	}

	/**
	 * Gets a module by name, loading it if necessary.
	 *
	 * This method implements:
	 * - Caching: Returns cached module if already loaded
	 * - Circular detection: Throws error if module is currently being loaded
	 * - Cleanup: Guarantees removal from loading state even on errors
	 *
	 * @param name - The notebook ID to load as a module
	 * @returns Promise resolving to the loaded Module
	 * @throws Error if circular import detected or loading fails
	 */
	async getModule(name: string): Promise<Module> {
		// Check if already loaded (cache hit)
		let module = this.modules.get(name);
		if (module) {
			return module;
		}

		// Check if currently loading (circular import detected)
		if (this.loading.has(name)) {
			throw new Error(
				`Circular import detected: Cannot import notebook "${name}" ` +
					`because it is already being loaded in the import chain.`
			);
		}

		// Mark as loading
		this.loading.add(name);

		try {
			// Load the module (may recursively call getModule)
			module = await this.loadModule(name);

			// Cache the loaded module
			this.modules.set(name, module);

			return module;
		} catch (error) {
			// Re-throw with context
			throw new Error(
				`Failed to load notebook "${name}": ${error instanceof Error ? error.message : String(error)}`
			);
		} finally {
			// Always remove from loading state (cleanup)
			this.loading.delete(name);
		}
	}

	async loadModule(name: string): Promise<Module> {
		const notebook: GetNotebookResponse = await this.notebookLoaderService.fetchNotebookData(name);
		const runtimeModule = this.runtime.module();

		const cells: Cell[] = [];
		const JS_CELL_KIND: CellKind = 'js';

		for (const cell of notebook.cells) {
			if (cell.kind === JS_CELL_KIND) {
				cells.push(await this.createCell(name, runtimeModule, cell));
			}
		}

		return new Module(runtimeModule, notebook, cells);
	}

	async createCell(moduleName: string, runtimeModule: IModule, cell: ApiCell): Promise<Cell> {
		const pr = parse(cell.value);

		if (pr.type === 'exception') {
			throw new Error(`Failed to parse cell in module ${moduleName}: ${pr.exception}`);
		} else if (pr.type === 'assignment' && !pr.viewof) {
			const variableName = pr.name || cell.id;

			const variable = runtimeModule.variable();
			variable.define(
				variableName,
				pr.dependencies,
				Eval(`(${pr.dependencies.join(', ')}) => ${pr.body}`)
			);

			return {
				id: cell.id,
				variables: [{ name: variableName, variable }]
			};
		} else if (pr.type === 'import') {
			const importedModule = await this.getModule(pr.urn);
			const variables: { name: string; variable: IVariable }[] = [];
			for (const importSpec of pr.names) {
				const variable = runtimeModule.variable();
				variable.import(importSpec.name, importSpec.alias, importedModule.runtimeModule);
				variables.push({ name: importSpec.name, variable });
			}

			return {
				id: cell.id,
				variables
			};
		} else {
			throw new Error(`Unknown statement: ${pr}`);
		}
	}

	/**
	 * Disposes of all cached modules and clears loading state.
	 *
	 * This should be called when the notebook is disposed to prevent memory leaks.
	 * After disposal, subsequent getModule() calls will reload modules from scratch.
	 */
	dispose(): void {
		this.modules.clear();
		this.loading.clear();
	}
}

/**
 * Represents a loaded notebook module with its runtime and cells.
 */
export class Module {
	public runtimeModule: IModule;
	private notebook: GetNotebookResponse;
	private cells: Cell[];

	constructor(runtimeModule: IModule, notebook: GetNotebookResponse, cells: Cell[]) {
		this.runtimeModule = runtimeModule;
		this.notebook = notebook;
		this.cells = cells;
	}
}

/**
 * Internal representation of a cell within an imported module.
 *
 * Each cell contains its ID and the Observable variables it defines.
 * This is used internally by the Modules class to track what has been loaded.
 */
interface Cell {
	id: string;
	variables: { name: string; variable: IVariable }[];
}

const Eval = eval;
