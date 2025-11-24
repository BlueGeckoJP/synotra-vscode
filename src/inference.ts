import type { ASTNode } from "./ast";

export type TypeKind =
	| "Int"
	| "String"
	| "Bool"
	| "List"
	| "Map"
	| "Set"
	| "Function"
	| "Custom"
	| "RandomAny";

export interface TypeInfo {
	kind: TypeKind;
	generics?: TypeInfo[]; // e.g. List<T> -> generics = [T]
	readonlyName?: string; // optional friendly name
}

function make(
	kind: TypeKind,
	generics?: TypeInfo[],
	readonlyName?: string,
): TypeInfo {
	return { kind, generics, readonlyName };
}

export function typeToString(t?: TypeInfo): string {
	if (!t) {
		return "RandomAny";
	}
	if (!t.generics || t.generics.length === 0) {
		return t.readonlyName ?? t.kind;
	}
	const gen = t.generics.map((g) => typeToString(g)).join(", ");
	return `${t.readonlyName ?? t.kind}<${gen}>`;
}

export class InferenceEngine {
	private types: Map<string, TypeInfo> = new Map();

	public inferFromText(text: string, ast?: ASTNode): Map<string, TypeInfo> {
		this.types = new Map();
		const lines = text.split(/\r?\n/);
		if (ast) {
			this.collectDeclarationsFromAST(ast);
		}
		this.scanInitializers(lines);
		this.scanCollectionUsages(lines);
		this.scanBinaryOps(lines);
		return this.types;
	}

	private collectDeclarationsFromAST(ast: ASTNode) {
		const stack: ASTNode[] = [ast];
		while (stack.length) {
			const node = stack.pop()!;
			if (node.kind === "variable") {
				if (!this.types.has(node.name)) {
					this.types.set(node.name, make("RandomAny"));
				}
			}
			for (const c of node.children) {
				stack.push(c);
			}
		}
	}

	private scanInitializers(lines: string[]) {
		const initRegex = /\b(?:var|val)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(.+)$/;
		for (const raw of lines) {
			const line = raw.trim();
			const m = line.match(initRegex);
			if (!m) {
				continue;
			}
			const name = m[1];
			let rhs = m[2].trim();
			rhs = rhs.replace(/;$/, "");
			const inferred = this.inferExpressionType(rhs);
			this.types.set(name, inferred);
		}
	}

	private inferExpressionType(expr: string): TypeInfo {
		// String literal
		if (/^".*"$/.test(expr) || /^'.*'$/.test(expr)) {
			return make("String");
		}
		// Boolean literal
		if (/^(true|false)$/.test(expr)) {
			return make("Bool");
		}
		// Numeric literal (integer or float) -> Int for simplicity
		if (/^\d+(\.\d+)?$/.test(expr)) {
			return make("Int");
		}
		// List/Map/Set construction
		if (
			/^\s*List(\s*<.*>)?\.new\s*\(/.test(expr) ||
			/^\s*List\.new\s*\(/.test(expr)
		) {
			return make("List", [make("RandomAny")]);
		}
		if (
			/^\s*MutableMap(\s*<.*>)?\.new\s*\(/.test(expr) ||
			/^\s*MutableMap\.new\s*\(/.test(expr)
		) {
			return make("Map", [make("RandomAny"), make("RandomAny")]);
		}
		if (
			/^\s*MutableSet(\s*<.*>)?\.new\s*\(/.test(expr) ||
			/^\s*MutableSet\.new\s*\(/.test(expr)
		) {
			return make("Set", [make("RandomAny")]);
		}
		// Function call or identifier -> unknown/custom
		if (/^[a-zA-Z_][a-zA-Z0-9_]*\(.*\)$/.test(expr)) {
			return make("RandomAny");
		}
		// Fallback: RandomAny
		return make("RandomAny");
	}

	private scanCollectionUsages(lines: string[]) {
		// list.add(10) -> infer list as List<Int>
		const addRegex = /([a-zA-Z_][a-zA-Z0-9_]*)\.add\s*\(\s*(.+?)\s*\)/;
		const putRegex =
			/([a-zA-Z_][a-zA-Z0-9_]*)\.put\s*\(\s*(.+?)\s*,\s*(.+?)\s*\)/;
		const getRegex = /([a-zA-Z_][a-zA-Z0-9_]*)\.get\s*\(\s*(.+?)\s*\)/;
		for (const raw of lines) {
			const line = raw.trim();
			let m = line.match(addRegex);
			if (m) {
				const name = m[1];
				const arg = m[2];
				const elemType = this.inferExpressionType(arg);
				this.mergeListElementType(name, elemType);
			}
			m = line.match(putRegex);
			if (m) {
				const name = m[1];
				const keyExpr = m[2];
				const valExpr = m[3];
				const keyType = this.inferExpressionType(keyExpr);
				const valType = this.inferExpressionType(valExpr);
				this.mergeMapTypes(name, keyType, valType);
			}
		}
	}

	private mergeListElementType(listName: string, elemType: TypeInfo) {
		const existing = this.types.get(listName);
		if (!existing || existing.kind === "RandomAny") {
			this.types.set(listName, make("List", [elemType]));
			return;
		}
		if (existing.kind === "List") {
			const cur =
				existing.generics && existing.generics[0]
					? existing.generics[0]
					: make("RandomAny");
			const merged = this.mergeTypes(cur, elemType);
			this.types.set(listName, make("List", [merged]));
			return;
		}
		// If existing is not a List, leave it unchanged
	}

	private mergeMapTypes(mapName: string, keyType: TypeInfo, valType: TypeInfo) {
		const existing = this.types.get(mapName);
		if (!existing || existing.kind === "RandomAny") {
			this.types.set(mapName, make("Map", [keyType, valType]));
			return;
		}
		if (existing.kind === "Map") {
			const curKey =
				existing.generics && existing.generics[0]
					? existing.generics[0]
					: make("RandomAny");
			const curVal =
				existing.generics && existing.generics[1]
					? existing.generics[1]
					: make("RandomAny");
			const mergedKey = this.mergeTypes(curKey, keyType);
			const mergedVal = this.mergeTypes(curVal, valType);
			this.types.set(mapName, make("Map", [mergedKey, mergedVal]));
			return;
		}
	}

	private mergeTypes(a: TypeInfo, b: TypeInfo): TypeInfo {
		// Simple merge: if same kind return that, otherwise RandomAny or Custom
		if (a.kind === b.kind) {
			// Merge generics recursively if present
			if (a.generics && b.generics && a.generics.length === b.generics.length) {
				const gens = a.generics.map((g, i) =>
					this.mergeTypes(g, b.generics![i]),
				);
				return make(a.kind, gens);
			}
			return a;
		}
		// If one is RandomAny return the other
		if (a.kind === "RandomAny") {
			return b;
		}
		if (b.kind === "RandomAny") {
			return a;
		}
		// Otherwise fallback to Custom with combined name
		return make("Custom", undefined, `${a.kind}|${b.kind}`);
	}

	private scanBinaryOps(lines: string[]) {
		// Very simple: if we detect `a + b` where both operands numeric literals or numeric vars, infer Int
		const binRegex =
			/([a-zA-Z_][a-zA-Z0-9_]*|\d+)\s*([+\-*/])\s*([a-zA-Z_][a-zA-Z0-9_]*|\d+)/;
		for (const raw of lines) {
			const line = raw.trim();
			const m = line.match(binRegex);
			if (!m) {
				continue;
			}
			const left = m[1];
			const right = m[3];
			const leftType = /^\d+$/.test(left)
				? make("Int")
				: (this.types.get(left) ?? make("RandomAny"));
			const rightType = /^\d+$/.test(right)
				? make("Int")
				: (this.types.get(right) ?? make("RandomAny"));
			if (leftType.kind === "Int" && rightType.kind === "Int") {
				// find variable being assigned to, e.g. var x = a + b
				const assignMatch = line.match(
					/\b(?:var|val)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*.+/,
				);
				if (assignMatch) {
					const name = assignMatch[1];
					this.types.set(name, make("Int"));
				}
			}
		}
	}
}
