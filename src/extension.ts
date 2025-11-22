// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import Completion from "./completion";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	console.log("synotra-vscode is now active! YATTAZE!");

	const completionProvider = vscode.languages.registerCompletionItemProvider(
		"synotra",
		new Completion(),
	);
	context.subscriptions.push(completionProvider);
}

// This method is called when your extension is deactivated
export function deactivate() {}
