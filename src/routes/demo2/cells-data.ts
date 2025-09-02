import { ReactiveNotebook } from '$lib/model/cell';

// Initial cells data with closed/open state
const initialCells: Array<{
	id: string;
	kind: 'js' | 'md' | 'html';
	value: string;
	valueError: Error | null;
	isFocused: boolean;
	hasError: boolean;
	isClosed: boolean;
}> = [
	{
		id: 'cell-3',
		kind: 'js',
		value: 'sum = [1, 2, 3, 4, 5].reduce((a, b) => a + b, 0)',
		valueError: null,
		isFocused: false,
		hasError: false,
		isClosed: true
	}
];

/**
 * Creates an empty notebook for demo2
 */
export async function createDemoNotebook(): Promise<ReactiveNotebook> {
	const notebook = new ReactiveNotebook({
		title: 'ObservableHQ Clone - Empty Demo',
		description: 'A demonstration of the ObservableHQ clone with an empty notebook'
	});

	// Add demo cells to the notebook
	for (const cellData of initialCells) {
		const cell = await notebook.addCell({
			kind: cellData.kind,
			value: cellData.value,
			focus: cellData.isFocused
		});

		// Update cell with demo-specific properties
		await notebook.updateCell(cell.id, {
			valueError: cellData.valueError,
			isClosed: cellData.isClosed
		});
	}

	// Return empty notebook - no cells added
	return notebook;
}
