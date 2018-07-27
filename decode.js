const tags = require("./tags");

exports.decodeNode = decodeNode;
exports.decodeString = decodeString;
exports.extractTag = extractTag;
exports.extractValue = extractValue;

function extractTag(value) {
	return value & ((1 << 3) - 1);
}

function extractValue(value) {
	return value >>> 3;
}

function decodeString(bytes) {
	let string = "";
	while(true) {
		let { value } = bytes.next();
		switch(value) {
			case tags.Zero:
				return string;
			default:
				string += String.fromCharCode(value);
				break;
		}
	}
}

function decodeNode(bytes, nodeType, document) {
	switch(nodeType) {
		case 3:
			return document.createTextNode(decodeString(bytes));
		case 1:
			return decodeElement(bytes, document);
		default:
			throw new Error(`Unable to decode nodeType ${nodeType}`);
	}
}

function decodeElement(bytes, document) {
	let el = document.createElement(decodeString(bytes));

	let attributeName = decodeString(bytes);
	while(attributeName) {
		attributeName = false;
		console.log("NAME", attributeName, "VALUE", decodeString(bytes));
		// TODO set it
	}

	let parent = el;
	let nodeType = bytes.next().value;
	while(nodeType !== tags.Zero) {
		let el = decodeNode(bytes, nodeType, document);
		parent.appendChild(el);
		nodeType = bytes.next().value;
	}

	return el;
}
