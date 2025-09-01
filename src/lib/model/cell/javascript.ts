import type { ReactiveCell } from '../cell';
import { parse } from '../../parser';

export async function executeJavaScript(cell: ReactiveCell): Promise<void> {
	const pr = parse(cell.value);

	if (pr.type === 'exception') {
		cell.handleError(pr.exception);
		return;
	} else if (pr.type === 'assignment') {
		const name = pr.name || cell.id;

		cell.assignVariables([{ name, dependencies: pr.dependencies, body: pr.body }]);
	} else if (pr.type === 'import') {
		console.log('import', pr);
		cell.handleError(Error('Unsupported statement: ' + pr.type));
		return;
	} else {
		cell.handleError(Error('Unknown statement: ' + pr));
		return;
	}
}
