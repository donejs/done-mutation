const { decodeString } = require("./decode");
const Serializer = require("./done-mutation-serialize");
const tags = require("./tags");

exports.element = function(root) {
	let serializer = new Serializer(root);

	function callback(records) {
		console.group("Mutations");
		for(let mutation of deserialize(serializer.bytes(records))) {
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

function decodeElement(bytes) {
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
		let el;
		switch(nodeType) {
			case 3:
				el = document.createTextNode(decodeString(bytes));
				break;
			case 1:
				el = decodeElement(bytes);
				break;
		}
		parent.appendChild(el);
		nodeType = bytes.next().value;
	}

	return el;
}

function extractTag(value) {
	return value & ((1 << 3) - 1);
}

function extractValue(value) {
	return value >>> 3;
}
