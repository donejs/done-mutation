const Instructions = require("./tags");
const NodeIndex = require("./index");

const TAG_SIZE = 3;

function encode(value, tag) {
	return (value << TAG_SIZE) | tag;
}

class Serializer {
	constructor(root) {
		this.index = new NodeIndex(root);
	}

	*bytes(records) {
		const index = this.index;
		const movedNodes = new WeakSet();

		let i = 0, iLen = records.length;
		for(;i < iLen; i++) {
			let record = records[i];
			let j, jLen;

			switch(record.type) {
				case "childList":
					for (let node of record.addedNodes) {
						// If this node was moved we have already done a move instruction
						if(movedNodes.has(node)) {
							movedNodes.delete(node);
							continue;
						}

						yield encode(index.for(node), Instructions.Insert);
						yield 0; // ref
						yield node.nodeType;
						switch(node.nodeType) {
							case 3:
								let text = node.nodeValue;
								for(let i = 0, len = text.length; i < len; i++) {
									yield encode(text.charCodeAt(i), Instructions.String);
								}
								yield encode(0, Instructions.Zero);
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
							yield encode(index.for(node), Instructions.Move); // index
							yield 1; // parent index
							yield 0; // ref
						} else {
							yield encode(index.for(node), Instructions.Remove);
						}
					}
					break;
				case "characterData":
					let text = record.target.nodeValue;
					yield encode(index.for(record.target), Instructions.Text);
					for(let i = 0, len = text.length; i < len; i++) {
						yield encode(text.charCodeAt(i), Instructions.String);
					}
					yield encode(0, Instructions.Zero);
					break;
			}


		}
	}
}

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


module.exports = Serializer;
