import { NotebookLoaderService } from '$lib/client/services/notebook-loader.service';
import { type IModule, type IRuntime, type IVariable } from '$lib/common/lib/runtime';
import type { ApiCell, GetNotebookResponse } from '$lib/types/api-contracts';
import { parse } from '$lib/common/lib/parser';
import { logger } from '$lib/common/infrastructure/logging/logger.service';

export class Modules {
	private modules: Map<string, Module> = new Map();
	private runtime: IRuntime;
	private notebookLoaderService: NotebookLoaderService;

	constructor(runtime: IRuntime) {
		this.modules = new Map();
		this.runtime = runtime;
		this.notebookLoaderService = new NotebookLoaderService();
	}

	async getModule(name: string): Promise<Module> {
		let module = this.modules.get(name);
		if (!module) {
			module = await this.loadModule(name);
			this.modules.set(name, module);
		}
		return module;
	}

	async loadModule(name: string): Promise<Module> {
		const notebook: GetNotebookResponse = await this.notebookLoaderService.fetchNotebookData(name);
		const runtimeModule = this.runtime.module();

		const cells: Cell[] = [];

		for (const cell of notebook.cells) {
			if (cell.kind === 'js') {
				logger.info(`calling createCell for ${name} with cell ${cell.id}`, cell.value);
				cells.push(await this.createCell(name, runtimeModule, cell));
			} else {
				logger.info(`skipping cell for ${name} of kind ${cell.kind}`);
			}
		}

		return new Module(runtimeModule, notebook, cells);
	}

	async createCell(name: string, runtimeModule: IModule, cell: ApiCell): Promise<Cell> {
		const pr = parse(cell.value);

		if (pr.type === 'exception') {
			logger.info(`createCell: ${cell.value}:`, pr.exception);
			throw new Error(`Exception in loading module ${name}: ${pr.exception}`);
		} else if (pr.type === 'assignment' && !pr.viewof) {
			const name = pr.name || cell.id;

			const variable = runtimeModule.variable();
			variable.define(name, pr.dependencies, Eval(`(${pr.dependencies.join(', ')}) => ${pr.body}`));

			return {
				id: cell.id,
				variables: [{ name, variable }]
			};
		} else if (pr.type === 'import') {
			const importedModule = await this.getModule(pr.urn);
			const variables: { name: string; variable: IVariable }[] = [];
			for (const name of pr.names) {
				const variable = runtimeModule.variable();
				variable.import(name.name, name.alias, importedModule.runtimeModule);
				variables.push({ name: name.name, variable });
			}

			return {
				id: cell.id,
				variables
			};
		} else {
			throw new Error(`Unknown statement: ${pr}`);
		}
	}
}

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

interface Cell {
	id: string;
	variables: { name: string; variable: IVariable }[];
}

const Eval = eval;
