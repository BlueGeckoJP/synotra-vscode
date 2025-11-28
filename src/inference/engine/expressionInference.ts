import type { TypeInfo } from "../inference";
import { RegexPatterns } from "./regexPatterns";
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
	 * Infer the type of an expression.
	 * Handles string/boolean/numeric literals, collection constructors, custom types, and function calls.
	 */
	public inferExpressionType(expr: string): TypeInfo {
		// String literal
		if (RegexPatterns.BUILTIN_TYPES.STRING.test(expr)) {
			return make("String");
		}
		// Boolean literal
		if (RegexPatterns.BUILTIN_TYPES.BOOL.test(expr)) {
			return make("Bool");
		}
		// Numeric literal (integer or float) -> Int for simplicity
		if (RegexPatterns.BUILTIN_TYPES.INT.test(expr)) {
			return make("Int");
		}

		// Collection construction: TypeName<...>.new(...)
		// Supports nested generics like List<List<Int>>.new() or Map<String, List<Int>>.new()
		const collectionMatch = expr.match(
			RegexPatterns.OTHER.BUILTIN_COLLECTION_CONSTRUCTOR_NAME_AND_OPTIONAL_TYPE,
		);
		if (collectionMatch) {
			const typeName = collectionMatch[1];
			const kind = this.typeParser.typeNameToKind(typeName);

			// Extract generic content if present
			const genericContent = this.typeParser.extractGenericContent(expr);
			if (genericContent) {
				const genericParams =
					this.typeParser.parseCommaSeparated(genericContent);
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

		// User-defined type constructor: ClassName.new(...) or ClassName<...>.new(...)
		const customTypeMatch = expr.match(
			RegexPatterns.OTHER.CONSTRUCTOR_NAME_AND_OPTIONAL_TYPE,
		);
		if (customTypeMatch) {
			const typeName = customTypeMatch[1];
			const genericContent = this.typeParser.extractGenericContent(expr);
			if (genericContent) {
				const genericParams =
					this.typeParser.parseCommaSeparated(genericContent);
				const generics = genericParams.map((p: string) =>
					this.typeParser.parseTypeString(p),
				);
				return make("Custom", generics, typeName);
			}
			return make("Custom", undefined, typeName);
		}

		// Function call: funcName(...) - check return type from collected functions
		const funcCallMatch = expr.match(RegexPatterns.FUNCTION.NAME);
		if (funcCallMatch) {
			const funcName = funcCallMatch[1];
			const returnType = this.functionReturnTypes.get(funcName);
			if (returnType) {
				return returnType;
			}
		}

		// Function call or identifier
		if (RegexPatterns.FUNCTION.ARGUMENTS_WITH_EOL.test(expr)) {
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
		if (/^[+-]?\d+(\.\d+)?$/.test(operand)) {
			return make("Int");
		}

		// Check if it's a string literal
		if (/^".*"$/.test(operand)) {
			return make("String");
		}

		// Check if it's a boolean literal
		if (/^(true|false)$/.test(operand)) {
			return make("Bool");
		}

		// Otherwise, look it up in the types map
		return this.types.get(operand) ?? make("Unknown");
	}
}
