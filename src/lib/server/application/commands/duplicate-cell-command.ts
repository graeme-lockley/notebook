export interface DuplicateCellCommand {
	notebookId: string;
	cellId: string;
}

export interface DuplicateCellCommandResult {
	cellId: string;
	eventId: string;
}
