export const RegexPatterns = {
	DECLARATION: {
		NAME_AND_VALUE_ONLY: /\b(?:var|val)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(.+)/,
		NAME_AND_TYPE_WITHOUT_VALUE:
			/\b(?:var|val)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*([^=]+)$/,
		NAME_VALUE_AND_OPTIONAL_TYPE:
			/\b(?:var|val)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*(?::\s*(.+?))?\s*=\s*(.+)$/,
		KEYWORD_AND_NAME: /\b(var|val)\s+([a-zA-Z_][a-zA-Z0-9_]*)/,
		KEYWORD_NAME_AND_OPTIONAL_TYPE:
			/\b(var|val)\s+([a-zA-Z_][a-zA-Z0-9_]*)(?:\s*:\s*([^=]+))?/,
		NAME_WITH_ASSIGN_OR_TYPE_AT_LINE_START:
			/^\s*(?:var|val)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*(?:=|:)/,
	},
	FUNCTION: {
		RETURN_TYPE: /fun\s+[a-zA-Z_][a-zA-Z0-9_]*\s*\([^)]*\)\s*:\s*(.+?)\s*\{?$/,
		NAME: /^([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/,
		NAME_WITH_OPTIONAL_IO: /(?:io\s+)?fun\s+([a-zA-Z_][a-zA-Z0-9_]*)/,
		NAME_PARAMS_AND_OPTIONAL_RETURN:
			/(?:io\s+)?fun\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([^)]*)\)(?:\s*->\s*(.+))?/,
		ARGUMENTS_WITH_EOL: /^[a-zA-Z_][a-zA-Z0-9_]*(\(.*\))?$/,
	},
	METHOD: {
		OBJECT_AND_METHOD_NAME:
			/([a-zA-Z_][a-zA-Z0-9_]*)\.([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/,
	},
	PARAMETER: {
		ARGUMENT_NAME_IN_SIGNATURE: /(?<=[(,]\s*)[a-zA-Z_][a-zA-Z0-9_]*(?=\s*:)/g,
		NAME_AND_TYPE: /([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*(.+)/,
	},
	OTHER: {
		CONSTRUCTOR_NAME_AND_OPTIONAL_TYPE:
			/^\s*([A-Z][a-zA-Z0-9_]*)\s*(<.+>)?\s*\.new\s*\(/,
		TYPE_NAME_AND_GENERIC_CONTENT: /^([a-zA-Z_][a-zA-Z0-9_]*)\s*<(.+)>$/,
		BUILTIN_COLLECTION_CONSTRUCTOR_NAME_AND_OPTIONAL_TYPE:
			/^\s*(List|MutableMap|MutableSet)\s*(<.+>)?\s*\.new\s*\(/,
	},
	BUILTIN_TYPES: {
		STRING: /^".*"$/,
		BOOL: /^(true|false)$/,
		INT: /^[+-]?\d+(\.\d+)?$/,
		CLASS_NAME: /\bclass\s+([a-zA-Z_][a-zA-Z0-9_]*)/,
		ACTOR_NAME: /\bactor\s+([a-zA-Z_][a-zA-Z0-9_]*)/,
	},
} as const;
