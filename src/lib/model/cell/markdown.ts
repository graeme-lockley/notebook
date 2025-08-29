import { makeReactive } from './base';
import type { ReactiveCell } from '../cell';

export async function executeMarkdown(cell: ReactiveCell): Promise<void> {
	await makeReactive(cell);
}
