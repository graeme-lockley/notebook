export interface MoveCellCommand {
	notebookId: string;
	cellId: string;
	position: number;
}

export interface MoveCellCommandResult {
	eventId: string;
}
