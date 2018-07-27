const MutationEncoder = require("./encoder");
const MutationDecoder = require("./decoder");
const tags = require("./tags");

exports.element = function(root) {
	let encoder = new MutationEncoder(root);
	let decoder = new MutationDecoder(root.ownerDocument);

	function callback(records) {
		console.group("Mutations");
		let bytes = encoder.encode(records);
		for(let mutation of decoder.decode(bytes)) {
			console.log(mutation);
		}
		console.groupEnd();
	}

	let mo = new MutationObserver(callback);
	mo.observe(root, { characterData: true, childList: true, subtree: true });
	return mo;
};

function* deserialize(bytes) {
	let mutation;

	for(let byte of bytes) {
		let index, ref;

		switch(extractTag(byte)) {
			case tags.Zero:
				break;
			case tags.Insert:
				index = extractValue(byte);
				ref = bytes.next().value;
				let nodeType = bytes.next().value;
				mutation = {type: "insert", index, ref, nodeType};
				if(nodeType === 3) {
					mutation.nodeValue = decodeString(bytes);
				} else {
					mutation.element = decodeElement(bytes);
				}
				yield mutation;
				break;
		  case tags.Move:
				index = extractValue(byte);
				let from = bytes.next().value;
				ref = bytes.next().value;
				mutation = {type: "move", from, index, ref};
				yield mutation;
				break;
			case tags.Remove:
				index = extractValue(byte);
				mutation = {type: "remove", index};
				yield mutation;
				break;
			case tags.Text:
				index = extractValue(byte);
				let value = decodeString(bytes);
				mutation = {type: "text", index, value};
				yield mutation;
				break;
			default:
				console.log("Tag", extractTag(byte), extractValue(byte));
				break;
		}
	}
}

function decodeNode(bytes) {
	let nodeType = bytes.next().value;

	switch(nodeType) {
		case 1:
			return decodeElement(bytes);
		case 3:
			return decodeString(bytes);
		default:
			throw new Error(`Unable to decode nodeType ${nodeType}`);
	}
}
