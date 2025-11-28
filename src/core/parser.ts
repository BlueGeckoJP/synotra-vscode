import { RegexPatterns } from "../inference/engine/regexPatterns";
import type { ASTNode } from "./ast";

export class Parser {
	private lines: string[];

	constructor(text: string) {
		this.lines = text.split("\n");
	}

	parse(): ASTNode {
		const root: ASTNode = {
			kind: "program",
			name: "root",
			line: 0,
			startLine: 0,
			endLine: this.lines.length - 1,
			children: [],
			parent: null,
		};

		this.parseTopLevel(root, 0, this.lines.length - 1);
		return root;
	}

	private parseTopLevel(
		parent: ASTNode,
		startLine: number,
		endLine: number,
	): void {
		for (let i = startLine; i <= endLine; i++) {
			const line = this.lines[i];

			// Match class definitions
			const classMatch = line.match(RegexPatterns.BUILTIN_TYPES.CLASS_NAME);
			if (classMatch) {
				const blockEnd = this.findBlockEnd(i);
				const classNode: ASTNode = {
					kind: "class",
					name: classMatch[1],
					line: i,
					startLine: i,
					endLine: blockEnd,
					children: [],
					parent,
				};
				this.parseBlockContent(classNode, i + 1, blockEnd);
				this.parseArguments(line, classNode, i);
				i = blockEnd;

				parent.children.push(classNode);
				continue;
			}

			// Match actor definitions
			const actorMatch = line.match(RegexPatterns.BUILTIN_TYPES.ACTOR_NAME);
			if (actorMatch) {
				const blockEnd = this.findBlockEnd(i);
				const actorNode: ASTNode = {
					kind: "actor",
					name: actorMatch[1],
					line: i,
					startLine: i,
					endLine: blockEnd,
					children: [],
					parent,
				};
				this.parseBlockContent(actorNode, i + 1, blockEnd);
				this.parseArguments(line, actorNode, i);
				i = blockEnd;

				parent.children.push(actorNode);
			}
		}
	}

	private parseBlockContent(
		parent: ASTNode,
		startLine: number,
		endLine: number,
	): void {
		for (let i = startLine; i <= endLine; i++) {
			const line = this.lines[i];

			// Match function definitions: fun funcName or io fun funcName
			const funMatch = line.match(RegexPatterns.FUNCTION.NAME_WITH_OPTIONAL_IO);
			if (funMatch) {
				const blockEnd = this.findBlockEnd(i);
				const funNode: ASTNode = {
					kind: "function",
					name: funMatch[1],
					line: i,
					startLine: i,
					endLine: blockEnd,
					children: [],
					parent,
				};
				this.parseBlockContent(funNode, i + 1, blockEnd);
				this.parseArguments(line, funNode, i);
				i = blockEnd;

				parent.children.push(funNode);
				continue;
			}

			// Match variable definitions: var varName or val varName
			const varMatch = line.match(RegexPatterns.DECLARATION.KEYWORD_AND_NAME);
			if (varMatch) {
				const varNode: ASTNode = {
					kind: "variable",
					name: varMatch[2],
					line: i,
					startLine: i,
					endLine: i,
					children: [],
					parent,
				};
				parent.children.push(varNode);
				continue;
			}

			// Match while/if/else/for blocks
			if (
				line.includes("while") ||
				line.includes("if") ||
				line.includes("else") ||
				line.includes("for")
			) {
				const blockEnd = this.findBlockEnd(i);
				const blockNode: ASTNode = {
					kind: "block",
					name: `block_${i}`,
					line: i,
					startLine: i,
					endLine: blockEnd,
					children: [],
					parent,
				};
				this.parseBlockContent(blockNode, i + 1, blockEnd);
				parent.children.push(blockNode);
				i = blockEnd;
			}
		}
	}

	private parseArguments(
		line: string,
		parentNode: ASTNode,
		lineNumber: number,
	): void {
		const argumentsMatch = line.match(
			RegexPatterns.PARAMETER.ARGUMENT_NAME_IN_SIGNATURE,
		);
		if (argumentsMatch) {
			const args = argumentsMatch[0].split(",");
			args.forEach((arg) => {
				const argName = arg.trim();
				const argNode: ASTNode = {
					kind: "variable",
					name: argName,
					line: lineNumber,
					startLine: lineNumber,
					endLine: lineNumber,
					children: [],
					parent: parentNode,
				};
				parentNode.children.push(argNode);
			});
		}
	}

	private findBlockEnd(startLine: number): number {
		let braceCount = 0;
		let foundStart = false;

		for (let i = startLine; i < this.lines.length; i++) {
			const line = this.lines[i];
			for (const char of line) {
				if (char === "{") {
					braceCount++;
					foundStart = true;
				} else if (char === "}") {
					braceCount--;
					if (foundStart && braceCount === 0) {
						return i;
					}
				}
			}
		}
		return this.lines.length - 1;
	}
}
