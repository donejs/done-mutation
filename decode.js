const tags = require("./tags");

exports.decodeNode = decodeNode;
exports.decodeString = decodeString;
exports.decodeType = decodeType;
exports.toUint16 = toUint16;

function toUint16(iter) {
	let high = iter.next().value;
	let low = iter.next().value;
	return (((high & 255) << 8) | (low & 255));
}

const decoder = new TextDecoder();

function decodeString(bytes) {
	let len = bytes.next().value;
	let array = new Uint8Array(len);
	for(let i = 0; i < len; i++) {
		array[i] = bytes.next().value;
	}
	return decoder.decode(array);
}

function decodeType(bytes) {
	let type = bytes.next().value;
	switch(type) {
		case 1:
			return Boolean(bytes.next().value);
		case 2:
			return Number(bytes.next().value);
		case 3:
			return decodeString(bytes);
		default:
			throw new Error(`The type ${type} is not recognized.`);
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
		let attributeValue = decodeString(bytes);
		el.setAttribute(attributeName, attributeValue);
		attributeName = decodeString(bytes);
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
