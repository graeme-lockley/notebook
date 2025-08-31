import { describe, expect, it } from 'vitest';
import {
	parse,
	type AssignmentStatement,
	type ExceptionStatement,
	type ImportStatement
} from './parser';

describe('Parser', () => {
	it('Simple expression', () => {
		const ast = parse('1 + 2') as AssignmentStatement;

		expect(ast.type).toEqual('assignment');
		expect(ast.name).toBeUndefined();
		expect(ast.dependencies).toEqual([]);
		expect(ast.body).toEqual('1 + 2');
	});

	describe('Assignment', () => {
		it('Simple', () => {
			const ast = parse('x = y + 2') as AssignmentStatement;

			expect(ast.type).toEqual('assignment');
			expect(ast.name).toEqual('x');
			expect(ast.dependencies).toEqual(['y']);
			expect(ast.body).toEqual('y + 2');
			expect(ast.viewof).toBe(false);
		});

		it('Block', () => {
			const ast = parse('x = { const z = y + 2; return z + 1; }') as AssignmentStatement;

			expect(ast.type).toEqual('assignment');
			expect(ast.name).toEqual('x');
			expect(ast.dependencies).toEqual(['y']);
			expect(ast.body).toEqual('{ const z = y + 2; return z + 1; }');
			expect(ast.viewof).toBe(false);
		});

		it('Viewof', () => {
			const ast = parse(
				'viewof flavor = Inputs.radio(["salty", "sweet", "bitter", "sour", "umami"], {label: "Flavor"})'
			) as AssignmentStatement;

			expect(ast.type).toEqual('assignment');
			expect(ast.name).toEqual('flavor');
			expect(ast.dependencies).toEqual(['Inputs']);
			expect(ast.body).toEqual(
				'Inputs.radio(["salty", "sweet", "bitter", "sour", "umami"], {label: "Flavor"})'
			);
			expect(ast.viewof).toBe(true);
		});
	});

	it('Import', () => {
		const ast = parse("import { a as a1, b } from 'https://hello.world/bob.md'") as ImportStatement;

		expect(ast.type).toEqual('import');
		expect(ast.names).toEqual([
			{ alias: 'a1', name: 'a' },
			{ alias: 'b', name: 'b' }
		]);
		expect(ast.urn).toEqual('https://hello.world/bob.md');
	});

	it('Error', () => {
		const ast = parse(
			"import { a as a1 b } from 'https://hello.world/bob.md'"
		) as ExceptionStatement;

		expect(ast.type).toEqual('exception');
		expect(ast.exception).toBeTruthy();
	});
});
