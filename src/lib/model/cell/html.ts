import { parseCell } from '@observablehq/parser';
import { createExpressionEvaluator, extractExpressions } from './base';
import type { ReactiveCell } from '../cell';

export async function executeHtml(cell: ReactiveCell): Promise<void> {
	try {
		// Extract embedded JavaScript expressions from HTML
		const { processedContent, expressions } = extractExpressions(cell.value);

		if (expressions.length === 0) {
			// No expressions, just render HTML
			cell.result.value = processedContent;
			cell.result.html = processedContent;
			cell.status = 'ok';
			cell.hasError = false;
			cell.notifyObservers();
			return;
		}

		console.log('Expressions:', expressions, 'processedContent:', processedContent);

		// Create a JavaScript cell that evaluates the expressions
		const jsCode = createExpressionEvaluator(expressions, processedContent);

		console.log('jsCode:', jsCode);

		// Parse and execute the generated JavaScript
		const parsed = parseCell(jsCode);

		console.log('parsed:', parsed);

		cell.variable = cell.runtime.module(parsed);

		// Set up reactive updates
		cell.variable.define((value: unknown) => {
			cell.result.value = value;
			cell.result.html = String(value);
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
		console.log('error:', error);
		cell.handleError(error as Error);
	}
}
