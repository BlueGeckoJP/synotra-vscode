import type * as vscode from "vscode";

export default class Completion implements vscode.CompletionItemProvider {
	public provideCompletionItems(
		document: vscode.TextDocument,
		position: vscode.Position,
		token: vscode.CancellationToken,
		context: vscode.CompletionContext,
	): vscode.ProviderResult<
		vscode.CompletionItem[] | vscode.CompletionList<vscode.CompletionItem>
	> {
		return [];
	}
}
