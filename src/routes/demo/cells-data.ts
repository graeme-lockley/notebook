import { ReactiveNotebook } from '$lib/model/cell';
import type { CellKind } from '$lib/server/domain/value-objects/CellKind';

// Initial cells data with closed/open state
const initialCells: Array<{
	id: string;
	kind: CellKind;
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
		id: 'cell-3.1',
		kind: 'js',
		value: 'viewof n = Inputs.range([0, 255], {step: 1, label: "Favorite number"})',
		valueError: null,
		isFocused: false,
		hasError: false,
		isClosed: true
	},
	{
		id: 'cell-3.2',
		kind: 'js',
		value: 'n',
		valueError: null,
		isFocused: false,
		hasError: false,
		isClosed: true
	},
	{
		id: 'cell-4',
		kind: 'js',
		value: `// Test object for ObservableHQ Inspector
userData = {
  let v = {
    name: "John Doe",
    age: 30,
    email: "john.doe@example.com",
    isActive: true,
    preferences: {
      theme: "dark",
		language: "en",
		notifications: true
	},
	hobbies: ["coding", "reading", "gaming", "hiking"],
	stats: {
		posts: 42,
		followers: 1234,
		following: 567
	}
  };

  return v;
}`,
		valueError: null,
		isFocused: false,
		hasError: false,
		isClosed: true
	},
	{
		id: 'cell-5',
		kind: 'js',
		value: `// Test array for ObservableHQ Inspector
dataArray = [
  { id: 1, name: "Alice", score: 95, active: true },
  { id: 2, name: "Bob", score: 87, active: false },
  { id: 3, name: "Charlie", score: 92, active: true },
  { id: 4, name: "Diana", score: 78, active: true },
  { id: 5, name: "Eve", score: 88, active: false }
]`,
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
	},
	{
		id: 'cell-7',
		kind: 'js',
		value: `{
  // Declare the chart dimensions and margins.
  const width = 640;
  const height = 400;
  const marginTop = 20;
  const marginRight = 20;
  const marginBottom = 30;
  const marginLeft = 40;

  // Declare the x (horizontal position) scale.
  const x = d3.scaleUtc()
      .domain([new Date("2023-01-01"), new Date("2024-01-01")])
      .range([marginLeft, width - marginRight]);

  // Declare the y (vertical position) scale.
  const y = d3.scaleLinear()
      .domain([0, 100])
      .range([height - marginBottom, marginTop]);

  // Create the SVG container.
  const svg = d3.create("svg")
      .attr("width", width)
      .attr("height", height);

  // Add the x-axis.
  svg.append("g")
      .attr("transform", \`translate(0,\${height - marginBottom})\`)
      .call(d3.axisBottom(x));

  // Add the y-axis.
  svg.append("g")
      .attr("transform", \`translate(\${marginLeft},0)\`)
      .call(d3.axisLeft(y));

  // Return the SVG element.
  return svg.node();
}`,
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
		title: 'ObservableHQ Clone - Inspector Demo',
		description: 'A demonstration of the ObservableHQ clone with inspector functionality'
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
