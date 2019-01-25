const {
	decodeString,
	decodeNode,
	decodeType,
	toUint16,
	next
} = require("./decode");
const tags = require("./tags");

class MutationDecoder {
	constructor(document) {
		this.document = document || window.document;
		this._operation = null;
	}

	*decode(bytes) {
		if(!this._operation) {
			this._operation = this._decode(bytes);
		}

		while(true) {
			let { done, value } = this._operation.next(bytes);

			if(done || !value) {
				return;
			}

			yield value;
		}
	}

	*_decode(bytes) {
		this.iter = toIterator(bytes);
		const document = this.document;
		let mutation;

		while(true) {
			let byte = yield* next(this);
			let index, ref;

			switch(byte) {
				case tags.Zero:
					break;
				case tags.Insert:
					index = yield* toUint16(this);
					ref = yield* toUint16(this);
					let nodeType = yield* next(this);
					mutation = {type: "insert", index, ref, nodeType};
					mutation.node = yield* decodeNode(this, nodeType, document);
					yield mutation;
					break;
			  case tags.Move:
					index = yield* toUint16(this);
					let from = yield* next(this);
					ref = yield* next(this);
					mutation = {type: "move", from, index, ref};
					yield mutation;
					break;
				case tags.Remove:
					index = yield* toUint16(this);
					let child = yield* toUint16(this);
					mutation = {type: "remove", index, child};
					yield mutation;
					break;
				case tags.Text:
					index = yield* toUint16(this);
					let value = yield* decodeString(this);
					mutation = {type: "text", index, value};
					yield mutation;
					break;
				case tags.SetAttr:
					index = yield* toUint16(this);
					let attrName = yield* decodeString(this);
					let newValue = yield* decodeString(this);
					mutation = {type: "set-attribute", index, attrName, newValue};
					yield mutation;
					break;
				case tags.RemoveAttr: {
					index = yield* toUint16(this);
					let attrName = yield* decodeString(this);
					mutation = {type: "remove-attribute", index, attrName };
					yield mutation;
					break;
				}
				case tags.Prop:
					index = yield* toUint16(this);
					mutation = {type: "property", index, property: yield* decodeString(this), value: yield* decodeType(this)};
					yield mutation;
					break;
				default:
					throw new Error(`Cannot decode instruction '${byte}'.`);
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
