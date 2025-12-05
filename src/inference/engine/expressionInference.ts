import type { TypeInfo } from "../inference";
import {
	type BuiltinCollectionConstructorMatch,
	type ConstructorMatch,
	extractBuiltinCollectionConstructor,
	extractConstructor,
	extractFunctionName,
	type FunctionNameMatch,
	isBoolLiteral,
	isFunctionCallOrIdentifier,
	isIntLiteral,
	isStringLiteral,
} from "./regexPatterns";
import type { TypeParser } from "./typeParser";

function make(
	kind:
		| "Int"
		| "String"
		| "Bool"
		| "List"
		| "MutableMap"
		| "MutableSet"
		| "Function"
		| "Custom"
		| "Unknown"
		| "Unit",
	generics?: TypeInfo[],
	readonlyName?: string,
	hasTypeAnnotation?: boolean,
): TypeInfo {
	return { kind, generics, readonlyName, hasTypeAnnotation };
}

/**
 * Handles type inference for expressions including literals, constructors, and function calls.
 */
export class ExpressionInference {
	private functionReturnTypes: Map<string, TypeInfo>;
	private types: Map<string, TypeInfo>;
	public typeParser: TypeParser; // Reference to TypeParser instance

	constructor(
		functionReturnTypes: Map<string, TypeInfo>,
		types: Map<string, TypeInfo>,
		typeParser: TypeParser,
	) {
		this.functionReturnTypes = functionReturnTypes;
		this.types = types;
		this.typeParser = typeParser;
	}

	/**
	 * Process a builtin collection constructor match.
	 * e.g., List<Int>.new() -> { kind: "List", generics: [Int] }
	 */
	private processBuiltinCollectionConstructor(
		match: BuiltinCollectionConstructorMatch,
		expr: string,
	): TypeInfo {
		const kind = this.typeParser.typeNameToKind(match.collectionType);

		// Extract generic content if present
		const genericContent = this.typeParser.extractGenericContent(expr);
		if (genericContent) {
			const genericParams = this.typeParser.parseCommaSeparated(genericContent);
			const generics = genericParams.map((p: string) =>
				this.typeParser.parseTypeString(p),
			);
			const collectionKind = kind as "List" | "MutableMap" | "MutableSet";
			return make(collectionKind, generics);
		}

		// No generic parameters specified
		switch (kind) {
			case "List":
			case "MutableSet":
				return make(kind, [make("Unknown")]);
			case "MutableMap":
				return make(kind, [make("Unknown"), make("Unknown")]);
			default:
				return make("Unknown");
		}
	}

	/**
	 * Process a custom type constructor match.
	 * e.g., MyClass<Int>.new() -> { kind: "Custom", readonlyName: "MyClass", generics: [Int] }
	 */
	private processCustomTypeConstructor(
		match: ConstructorMatch,
		expr: string,
	): TypeInfo {
		const genericContent = this.typeParser.extractGenericContent(expr);
		if (genericContent) {
			const genericParams = this.typeParser.parseCommaSeparated(genericContent);
			const generics = genericParams.map((p: string) =>
				this.typeParser.parseTypeString(p),
			);
			return make("Custom", generics, match.typeName);
		}
		return make("Custom", undefined, match.typeName);
	}

	/**
	 * Process a function call match.
	 * Returns the function's return type if known.
	 */
	private processFunctionCall(match: FunctionNameMatch): TypeInfo | null {
		const returnType = this.functionReturnTypes.get(match.name);
		return returnType ?? null;
	}

	/**
	 * Infer the type of an expression.
	 * Handles string/boolean/numeric literals, collection constructors, custom types, and function calls.
	 */
	public inferExpressionType(expr: string): TypeInfo {
		// String literal
		if (isStringLiteral(expr)) {
			return make("String");
		}
		// Boolean literal
		if (isBoolLiteral(expr)) {
			return make("Bool");
		}
		// Numeric literal (integer or float) -> Int for simplicity
		if (isIntLiteral(expr)) {
			return make("Int");
		}

		// Collection construction: TypeName<...>.new(...)
		// Supports nested generics like List<List<Int>>.new() or Map<String, List<Int>>.new()
		const collectionMatch = extractBuiltinCollectionConstructor(expr);
		if (collectionMatch) {
			return this.processBuiltinCollectionConstructor(collectionMatch, expr);
		}

		// User-defined type constructor: ClassName.new(...) or ClassName<...>.new(...)
		const customTypeMatch = extractConstructor(expr);
		if (customTypeMatch) {
			return this.processCustomTypeConstructor(customTypeMatch, expr);
		}

		// Function call: funcName(...) - check return type from collected functions
		const funcCallMatch = extractFunctionName(expr);
		if (funcCallMatch) {
			const returnType = this.processFunctionCall(funcCallMatch);
			if (returnType) {
				return returnType;
			}
		}

		// Function call or identifier
		if (isFunctionCallOrIdentifier(expr)) {
			const existingType = this.types.get(expr);
			if (existingType) {
				return existingType;
			}
			return make("Unit");
		}
		// Fallback: Unknown
		return make("Unknown");
	}

	/**
	 * Infer the type of an operand (literal or variable).
	 */
	public inferOperandType(operand: string): TypeInfo {
		// Check if it's a numeric literal
		if (isIntLiteral(operand)) {
			return make("Int");
		}

		// Check if it's a string literal
		if (isStringLiteral(operand)) {
			return make("String");
		}

		// Check if it's a boolean literal
		if (isBoolLiteral(operand)) {
			return make("Bool");
		}

		// Otherwise, look it up in the types map
		return this.types.get(operand) ?? make("Unknown");
	}
}
