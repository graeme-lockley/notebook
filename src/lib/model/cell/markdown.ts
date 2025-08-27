import { parseCell } from '@observablehq/parser';
import { extractExpressions, createExpressionEvaluator } from './base';
import type { ReactiveCell } from '../cell';

export async function executeMarkdown(cell: ReactiveCell): Promise<void> {
	try {
		// Extract embedded JavaScript expressions from markdown
		const { processedContent, expressions } = extractExpressions(cell.value);

		if (expressions.length === 0) {
			// No expressions, just render markdown
			cell.result.value = processedContent;
			cell.result.html = renderMarkdown(processedContent);
			cell.status = 'ok';
			cell.hasError = false;
			cell.notifyObservers();
			return;
		}

		// Create a JavaScript cell that evaluates the expressions
		const jsCode = createExpressionEvaluator(expressions, processedContent);

		// Parse and execute the generated JavaScript
		const parsed = parseCell(jsCode);

		cell.variable = cell.runtime.module(parsed);

		// Set up reactive updates
		cell.variable.define((value: unknown) => {
			cell.result.value = value;
			cell.result.html = renderMarkdown(String(value));
			cell.result.error = null;
			cell.status = 'ok';
			cell.hasError = false;
			cell.notifyObservers();
		});

		// Handle errors
		cell.variable.catch((error: unknown) => {
			cell.handleError(error);
		});
	} catch (error) {
		cell.handleError(error as Error);
	}
}

// Render markdown to HTML (you can use a markdown parser here)
function renderMarkdown(markdown: string): string {
	// For now, a simple implementation - you might want to use a proper markdown parser
	return markdown
		.replace(/^### (.*$)/gim, '<h3>$1</h3>')
		.replace(/^## (.*$)/gim, '<h2>$1</h2>')
		.replace(/^# (.*$)/gim, '<h1>$1</h1>')
		.replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
		.replace(/\*(.*)\*/gim, '<em>$1</em>')
		.replace(/\n/gim, '<br>');
}
