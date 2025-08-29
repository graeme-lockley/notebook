import type { ReactiveCell } from '../cell';
import { parse } from '../../parser';

// Extract JavaScript expressions from markdown/HTML
export function extractExpressions(content: string): {
	processedContent: string;
	expressions: string[];
} {
	const expressions: string[] = [];
	let processedContent = content;
	let expressionIndex = 0;

	// Match expressions like {expression} or ${expression}
	const expressionRegex = /\{([^}]+)\}|\$\{([^}]+)\}/g;

	processedContent = processedContent.replace(expressionRegex, (match, expr1, expr2) => {
		const expression = expr1 || expr2;
		expressions.push(expression.trim());
		return `__EXPR_${expressionIndex++}__`;
	});

	return { processedContent, expressions };
}

// Create JavaScript code that evaluates expressions and interpolates them
export function createExpressionEvaluator(expressions: string[], template: string): string {
	const expressionVars = expressions
		.map((expr, index) => {
			// Try to evaluate the expression in the context of other cells
			return `const __EXPR_${index}__ = (() => {
            try {
                return ${expr};
            } catch (error) {
                console.error('Expression error:', error);
                return \`[Error: \${error.message}]\`;
            }
        })();`;
		})
		.join('\n');

	return `{
${expressionVars}

// Interpolate expressions into template
const result = \`${template.replace(/`/g, '\\`').replace(/__EXPR_(\d+)__/g, '${__EXPR_$1__}')}\`;

// Return the result
return result;
}`;
}

export async function makeReactive(cell: ReactiveCell): Promise<void> {
	try {
		// Extract embedded JavaScript expressions from HTML
		const { processedContent, expressions } = extractExpressions(cell.value);

		const evaluator = createExpressionEvaluator(expressions, processedContent);

		let dependencies: Array<string> = [];
		for (const expr of expressions) {
			const pr = parse(expr);
			if (pr.type === 'exception') {
				cell.handleError(pr.exception);
				return;
			} else if (pr.type === 'assignment' && pr.name !== null) {
				dependencies = [...dependencies, ...pr.dependencies];
			} else {
				cell.handleError(Error('Invalid expression: ' + pr.type));
				return;
			}
		}

		dependencies = uniqueElementsInStringArray(dependencies);

		cell.assignVariable(undefined, dependencies, evaluator);
	} catch (error) {
		console.log('Error: ', error);
		cell.handleError(error);
	}
}

const uniqueElementsInStringArray = (inp: Array<string>): Array<string> =>
	Array.from(new Set<string>(inp));
