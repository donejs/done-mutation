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
					mutation.nodeValue = extractString(bytes);
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
				let value = extractString(bytes);
				mutation = {type: "text", index, value};
				yield mutation;
				break;
			default:
				console.log("Tag", extractTag(byte), extractValue(byte));
				break;
		}
	}
}

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
