const tags = require("./tags");

exports.decodeNode = decodeNode;
exports.decodeString = decodeString;
exports.decodeType = decodeType;
exports.toUint16 = toUint16;
exports.next = next;

function* next(context) {
	let iter = context.iter;
	let r = iter.next();
	if(r.done) {
		let bytes = yield;
		context.iter = bytes[Symbol.iterator]();
		return yield* next(context);
	}
	return r.value;
}

function* toUint16(iter) {
	let high = yield* next(iter);
	let low = yield* next(iter);
	return (((high & 255) << 8) | (low & 255));
}

const decoder = new TextDecoder();

function* decodeString(bytes) {
	let len = yield* toUint16(bytes);

	let array = new Uint8Array(len);
	for(let i = 0; i < len; i++) {
		array[i] = yield* next(bytes);
	}
	return decoder.decode(array);
}

function* decodeType(bytes) {
	let type = yield* next(bytes);
	switch(type) {
		case 1:
			return Boolean(yield* next(bytes));
		case 2:
			return Number(yield* next(bytes));
		case 3:
			return yield* decodeString(bytes);
		default:
			throw new Error(`The type ${type} is not recognized.`);
	}
}

function* decodeNode(bytes, nodeType, document) {
	switch(nodeType) {
		case 3:
			return document.createTextNode(yield* decodeString(bytes));
		case 1:
			return yield* decodeElement(bytes, document);
		case 8:
			return document.createComment(yield* decodeString(bytes));
		default:
			throw new Error(`Unable to decode nodeType ${nodeType}`);
	}
}

function* decodeElement(bytes, document) {
	let el = document.createElement(yield* decodeString(bytes));

	let attributeCount = yield* toUint16(bytes);
	for(let i = 0; i < attributeCount; i++) {
		let attributeName = yield* decodeString(bytes);
		let attributeValue = yield* decodeString(bytes);
		el.setAttribute(attributeName, attributeValue);
	}

	let parent = el;
	let hasChildren = yield* next(bytes);
	if(hasChildren) {
		let nodeType = yield* next(bytes);
		while(nodeType !== tags.Zero) {
			let el = yield* decodeNode(bytes, nodeType, document);
			parent.appendChild(el);
			nodeType = yield* next(bytes);
		}
	}

	return el;
}
