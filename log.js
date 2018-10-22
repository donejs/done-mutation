const MutationEncoder = require("./encoder");
const MutationDecoder = require("./decoder");

exports.instructions = function(bytes) {
	let decoder = new MutationDecoder(document);
	console.group("Mutations");
	for(let mutation of decoder.decode(bytes)) {
		console.log(mutation);
	}
	console.groupEnd();
};

exports.element = function(root, options) {
	let encoder = new MutationEncoder(root, options);
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
	mo.observe(root, { subtree: true, characterData: true, childList: true, attributes: true });
	return mo;
};
