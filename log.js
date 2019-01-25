const MutationEncoder = require("./encoder");
const MutationDecoder = require("./decoder");

class Logger {
	constructor() {
		this._decoder = new MutationDecoder(document);
	}

	mutations(bytes) {
		let decoder = this._decoder;
		console.group("Mutations");
		for(let mutation of decoder.decode(bytes)) {
			console.log(mutation);
		}
		console.groupEnd();
	}
}

exports.Logger = Logger;

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

exports.instructions = function(bytes) {
	console.warn("log.instructions is deprecated. Use log.Logger instead.");
	let log = new Logger();
	log.mutations(bytes);
};