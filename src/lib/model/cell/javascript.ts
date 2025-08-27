import type { ReactiveCell } from '../cell';

export async function executeJavaScript(cell: ReactiveCell): Promise<void> {
	try {
		// For now, let's use a simple eval approach to get basic functionality working
		// We'll implement proper shared context later
		const result = eval(cell.value);

		// Store the result
		cell.result.value = result;
		cell.result.error = null;
		cell.status = 'ok';
		cell.hasError = false;

		// Update shared context with any variables defined in this cell
		// For now, we'll store the result with the cell ID as the key
		cell.notebook.setSharedVariable(cell.id, result);

		cell.notifyObservers();
	} catch (error) {
		cell.handleError(error as Error);
	}
}
