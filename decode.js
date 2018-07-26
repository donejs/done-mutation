const tags = require("./tags");

exports.extractString = extractString;
exports.extractTag = extractTag;
exports.extractValue = extractValue;

function extractString(bytes) {
	let string = "";
	while(true) {
		let { value } = bytes.next();
		switch(extractTag(value)) {
			case tags.String:
				string += String.fromCharCode(extractValue(value));
				break;
			case tags.Zero:
				return string;
		}
	}
}

function extractTag(value) {
	return value & ((1 << 3) - 1);
}

function extractValue(value) {
	return value >>> 3;
}
