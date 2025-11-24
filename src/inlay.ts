import * as vscode from "vscode";
import { InferenceEngine, typeToString } from "./inference";

export default class SynotraInlayProvider implements vscode.InlayHintsProvider {
	private engine = new InferenceEngine();

	provideInlayHints(
		document: vscode.TextDocument,
		_range: vscode.Range,
		_token: vscode.CancellationToken,
	): vscode.ProviderResult<vscode.InlayHint[]> {
		const text = document.getText();
		const lines = text.split(/\r?\n/);
		const hints: vscode.InlayHint[] = [];

		const initRegex = /^\s*(?:var|val)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*(?:=|:|\b)/;
		const types = this.engine.inferFromText(text);

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			const m = line.match(initRegex);
			if (!m) {
				continue;
			}
			const name = m[1];
			const inferred = types.get(name);
			if (!inferred) {
				continue;
			}
			const col = line.indexOf(name) + name.length;
			const label = `: ${typeToString(inferred)}`;
			const hint = new vscode.InlayHint(
				new vscode.Position(i, col),
				label,
				vscode.InlayHintKind.Type,
			);
			hint.paddingLeft = true;
			hints.push(hint);
		}

		return hints;
	}
}
