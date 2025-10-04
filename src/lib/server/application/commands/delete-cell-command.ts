export interface DeleteCellCommand {
	notebookId: string;
	cellId: string;
}

export interface DeleteCellCommandResult {
	eventId: string;
}
