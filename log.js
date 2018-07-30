const MutationEncoder = require("./encoder");
const MutationDecoder = require("./decoder");

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
	mo.observe(root, { subtree: true, characterData: true, childList: true, attributes: true });
	return mo;
};
