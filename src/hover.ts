import * as vscode from "vscode";
import type { ASTNode } from "./ast";
import { InferenceEngine, type TypeInfo, typeToString } from "./inference";
import { Parser } from "./parser";
import { ScopeResolver } from "./scope";

export default class SynotraHoverProvider implements vscode.HoverProvider {
	private engine = new InferenceEngine();
	private resolver = new ScopeResolver();
	private cached: {
		uri: string;
		version: number;
		ast: ASTNode;
		types: Map<string, TypeInfo>;
	} | null = null;

	provideHover(
		document: vscode.TextDocument,
		position: vscode.Position,
		_token: vscode.CancellationToken,
	): vscode.ProviderResult<vscode.Hover> {
		const wordRange = document.getWordRangeAtPosition(
			position,
			/[a-zA-Z_][a-zA-Z0-9_]*/,
		);
		if (!wordRange) {
			return null;
		}
		const word = document.getText(wordRange);
		const currentVersion = document.version;
		const uri = document.uri.toString();
		if (
			!this.cached ||
			this.cached.uri !== uri ||
			this.cached.version !== currentVersion
		) {
			const parser = new Parser(document.getText());
			const ast = parser.parse();
			const types = this.engine.inferFromText(document.getText(), ast);
			this.cached = { uri, version: currentVersion, ast, types };
		}
		const inferred = this.cached.types.get(word);
		if (inferred) {
			const md = new vscode.MarkdownString();
			md.appendCodeblock(typeToString(inferred), "text");
			md.isTrusted = false;
			return new vscode.Hover(md, wordRange);
		}
		return null;
	}
}
