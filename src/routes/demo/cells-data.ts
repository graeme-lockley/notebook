import type { Cell } from '$lib/types/cell';

// Initial cells data with closed/open state
export const initialCells: Cell[] = [
	{
		id: 'cell-1',
		kind: 'html',
		value: '<h1>Hello, ObservableHQ!</h1>\n<p>This is an HTML cell with some basic content.</p>',
		status: 'ok',
		valueHtml: '<h1>Hello, ObservableHQ!</h1><p>This is an HTML cell with some basic content.</p>',
		isFocused: false,
		isPinned: false,
		hasError: false,
		isClosed: true // Closed cell example
	},
	{
		id: 'cell-2',
		kind: 'md',
		value:
			'# Markdown Cell\n\nThis is a **markdown** cell with:\n\n- Bullet points\n- *Italic text*\n- `code snippets`\n\n## Subsection\n\nAnd even more content!',
		status: 'ok',
		valueHtml:
			'<h1>Markdown Cell</h1><p>This is a <strong>markdown</strong> cell with:</p><ul><li>Bullet points</li><li><em>Italic text</em></li><li><code>code snippets</code></li></ul><h2>Subsection</h2><p>And even more content!</p>',
		isFocused: false,
		isPinned: false,
		hasError: false,
		isClosed: false // Open cell example with comment
	},
	{
		id: 'cell-3',
		kind: 'js',
		value:
			'// JavaScript Cell\nconst message = "Hello from JavaScript!";\nconst numbers = [1, 2, 3, 4, 5];\nconst sum = numbers.reduce((a, b) => a + b, 0);\n\nconsole.log(message);\nconsole.log("Sum of numbers:", sum);\n\n// Return a value to display\n`Sum: ${sum}`',
		status: 'ok',
		valueHtml: '<div>Sum: 15</div>',
		console: ['Hello from JavaScript!', 'Sum of numbers: 15'],
		isFocused: false,
		isPinned: false,
		hasError: false,
		isClosed: false // Open cell example
	},
	{
		id: 'cell-4',
		kind: 'js',
		value:
			'// Data Visualization Example\nconst data = [10, 20, 30, 40, 50];\nconst chart = {\n  type: "bar",\n  data: data,\n  labels: ["A", "B", "C", "D", "E"]\n};\n\n// This cell demonstrates a more complex JavaScript example\n// with data visualization concepts\n\n`Chart: ${JSON.stringify(chart, null, 2)}`',
		status: 'ok',
		valueHtml:
			'<div>Chart: {"type":"bar","data":[10,20,30,40,50],"labels":["A","B","C","D","E"]}</div>',
		console: ['Data visualization example loaded'],
		isFocused: false,
		isPinned: true, // Pinned cell example
		hasError: false,
		isClosed: true // Closed cell with pin and comment
	},
	{
		id: 'cell-5',
		kind: 'html',
		value:
			'<div class="error-demo">\n  <h2>Error Example</h2>\n  <p>This cell demonstrates error handling</p>\n</div>',
		status: 'error',
		valueHtml:
			'<div class="error-demo"><h2>Error Example</h2><p>This cell demonstrates error handling</p></div>',
		console: ['Error: This is a simulated error'],
		isFocused: false,
		isPinned: false,
		hasError: true, // Has error
		isClosed: false // Open cell with error
	}
];
