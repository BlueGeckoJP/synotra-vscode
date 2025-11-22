// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import type * as vscode from "vscode";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	console.log("synotra-vscode is now active! YATTAZE!");
}

// This method is called when your extension is deactivated
export function deactivate() {}
