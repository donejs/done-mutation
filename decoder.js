const {
	decodeString,
	decodeNode,
	decodeType,
	extractTag,
	extractValue
} = require("./decode");
const tags = require("./tags");

class MutationDecoder {
	constructor(document) {
		this.document = document || window.document;
	}

	*decode(bytes) {
		const document = this.document;
		let iter = toIterator(bytes);
		let mutation;

		for(let byte of iter) {
			let index, ref;

			switch(extractTag(byte)) {
				case tags.Zero:
					break;
				case tags.Insert:
					index = extractValue(byte);
					ref = iter.next().value;
					let nodeType = iter.next().value;
					mutation = {type: "insert", index, ref, nodeType};
					mutation.node = decodeNode(iter, nodeType, document);
					yield mutation;
					break;
			  case tags.Move:
					index = extractValue(byte);
					let from = iter.next().value;
					ref = iter.next().value;
					mutation = {type: "move", from, index, ref};
					yield mutation;
					break;
				case tags.Remove:
					index = extractValue(byte);
					let child = iter.next().value;
					mutation = {type: "remove", index, child};
					yield mutation;
					break;
				case tags.Text:
					index = extractValue(byte);
					let value = decodeString(iter);
					mutation = {type: "text", index, value};
					yield mutation;
					break;
				case tags.SetAttr:
					index = extractValue(byte);
					let attrName = decodeString(iter);
					let newValue = decodeString(iter);
					mutation = {type: "set-attribute", index, attrName, newValue};
					yield mutation;
					break;
				case tags.RemoveAttr:
					index = extractValue(byte);
					mutation = {type: "remove-attribute", index, attrName: decodeString(iter)};
					yield mutation;
					break;
				case tags.Prop:
					index = extractValue(byte);
					mutation = {type: "property", index, property: decodeString(iter), value: decodeType(iter)};
					yield mutation;
					break;
				default:
					throw new Error(`Cannot decode instruction '${extractTag(byte)}'.`);
			}
		}
	}
}

function toIterator(obj) {
	if(obj[Symbol.iterator]) {
		return obj[Symbol.iterator]();
	}
	return obj;
}

module.exports = MutationDecoder;
