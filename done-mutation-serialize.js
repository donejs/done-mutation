const Instructions = require("./tags");

const TAG_SIZE = 3;

const NullTag = "\0".charCodeAt(0);

function encode(value, tag) {
	return (value << TAG_SIZE) | tag;
}

exports.bytes = function* (records) {
	const movedNodes = new WeakSet();

	let i = 0, iLen = records.length;
	for(;i < iLen; i++) {
		let record = records[i];
		let j, jLen;

		for (let node of record.addedNodes) {
			// If this node was moved we have already done a move instruction
			if(movedNodes.has(node)) {
				movedNodes.delete(node);
				continue;
			}

			yield encode(Instructions.Insert, 1);
			yield 0; // ref
			yield node.nodeType;
			switch(node.nodeType) {
				case 3:
					let text = node.nodeValue;
					for(let i = 0, len = text.length; i < len; i++) {
						yield encode(text.charCodeAt(i), Instructions.String);
					}
					yield encode(0, Instructions.Null);
					break;
				default:
					yield node;
					break;
			}
		}

		for(j = 0, jLen = record.removedNodes.length; j < jLen; j++) {
			let node = record.removedNodes[j];

			if(nodeMoved(node, j, records)) {
				movedNodes.add(node);
				yield encode(2, Instructions.Move); // index
				yield 1; // parent index
				yield 0; // ref
			}
		}
	}
};

function nodeMoved(node, recordIndex, records) {
	let nextIndex = recordIndex + 1;
	let nextRecord = records[nextIndex];
	if(nextRecord) {
		for(let removedNode of nextRecord.removedNodes) {
			if(node === removedNode) {
				return true;
			}
		}
	}
	return false;
}
