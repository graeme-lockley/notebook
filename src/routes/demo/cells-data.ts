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
		id: 'cell-1',
		kind: 'html',
		value:
			'<h1>Hello, ObservableHQ!</h1>\n<p>This is an HTML cell with some basic content and showing the sum is ${sum}.</p>',
		valueError: null,
		isFocused: false,
		hasError: false,
		isClosed: true
	},
	{
		id: 'cell-2',
		kind: 'md',
		value:
			'# Markdown Cell: ${sum}\n\nThis is a **markdown** cell with:\n\n- Bullet points\n- *Italic text*\n- `code snippets`\n\n## Subsection\n\nAnd even more content!',
		valueError: null,
		isFocused: false,
		hasError: false,
		isClosed: true
	},
	{
		id: 'cell-3',
		kind: 'js',
		value: 'sum = [1, 2, 3, 4, 5].reduce((a, b) => a + b, 0)',
		valueError: null,
		isFocused: false,
		hasError: false,
		isClosed: true
	},
	{
		id: 'cell-6',
		kind: 'js',
		value: 'x = 100',
		valueError: null,
		isFocused: false,
		hasError: true,
		isClosed: true
	}
];

/**
 * Creates a notebook with demo data
 */
export async function createDemoNotebook(): Promise<ReactiveNotebook> {
	const notebook = new ReactiveNotebook({
		title: 'ObservableHQ Clone - Closed & Open Cell Demo',
		description: 'A demonstration of the ObservableHQ clone with various cell types and states'
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

	return notebook;
}
