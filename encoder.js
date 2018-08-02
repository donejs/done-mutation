const tags = require("./tags");
const NodeIndex = require("./index");

const TAG_SIZE = 3;

function tagValue(value, tag) {
	return (value << TAG_SIZE) | tag;
}

function* encodeString(text) {
	for(let i = 0, len = text.length; i < len; i++) {
		yield text.charCodeAt(i);
	}
	yield tags.Zero;
}

function* encodeType(val) {
	switch(typeof val) {
		case "boolean":
			yield 1;
			yield Number(val);
			break;
		case "number":
			yield 2;
			yield val|0;
			break;
		case "string":
			yield 3;
			yield* encodeString(val);
			break;
	}
}

function* encodeElement(element) {
	// Tag Name
	yield* encodeString(element.tagName.toLowerCase());

	// Attributes
	for(let attribute of element.attributes) {
		yield* encodeString(attribute.name);
		yield* encodeString(attribute.value);
	}
	yield tags.Zero;

	// Children
	let child = element.firstChild;
	while(child) {
		yield* encodeNode(child);
		yield tags.Zero;

		child = child.nextSibling;
	}
	yield tags.Zero;
}

function* encodeNode(node) {
	yield node.nodeType;

	switch(node.nodeType) {
		case 1:
			yield* encodeElement(node);
			break;
		case 3:
			yield* encodeString(node.nodeValue);
			break;
		default:
			throw new Error(`Cannot yet encode nodeType ${node.nodeType}`);
	}

	// End of element
	yield tags.Zero;
}

class MutationEncoder {
	constructor(rootOrIndex) {
		if(rootOrIndex instanceof NodeIndex) {
			this.index = rootOrIndex;
		} else {
			this.index = new NodeIndex(rootOrIndex);
		}

		this._indexed = false;
	}

	encodeEvent(event) {
		return Uint8Array.from(this.event(event));
	}

	encode(records) {
		return Uint8Array.from(this.mutations(records));
	}

	*mutations(records) {
		const index = this.index;
		const movedNodes = new WeakSet();

		let i = 0, iLen = records.length;
		for(;i < iLen; i++) {
			let record = records[i];
			let j, jLen;

			switch(record.type) {
				case "childList":
					for(j = 0, jLen = record.removedNodes.length; j < jLen; j++) {
						let node = record.removedNodes[j];

						if(false && nodeMoved(node, j, records)) {
							// TODO implement node moving

							movedNodes.add(node);
							yield tagValue(index.for(node), tags.Move); // index
							yield 1; // parent index
							yield 0; // ref
						} else {
							let [parentIndex, childIndex] = index.fromParent(node);
							index.purge(node);
							yield tagValue(parentIndex, tags.Remove);
							yield childIndex;
						}
					}

					for (let node of record.addedNodes) {
						// If this node was moved we have already done a move instruction
						if(movedNodes.has(node)) {
							throw new Error("Moving nodes is not yet supported");
							//movedNodes.delete(node);
							//continue;
						}

						let parentIndex = index.for(node.parentNode);
						index.reIndexFrom(node);

						yield tagValue(parentIndex, tags.Insert);
						yield getChildIndex(node.parentNode, node); // ref
						yield* encodeNode(node);
					}

					break;
				case "characterData":
					yield tagValue(index.for(record.target), tags.Text);
					yield* encodeString(record.target.nodeValue);
					break;
				case "attributes":
					let attributeValue = record.target.getAttribute(record.attributeName);
					if(attributeValue == null) {
						yield tagValue(index.for(record.target), tags.RemoveAttr);
						yield* encodeString(record.attributeName);
					} else {
						yield tagValue(index.for(record.target), tags.SetAttr);
						yield* encodeString(record.attributeName);
						yield* encodeString(attributeValue);
					}
					break;
			}
		}
	}

	*event(event) {
		let index = this.index;
		switch(event.type) {
			case "change":
				yield tagValue(index.for(event.target), tags.Prop);
				if(event.target.type === "checkbox") {
					yield* encodeString("checked");
					yield* encodeType(event.target.checked);
				} else {
					yield* encodeString("value");
					yield* encodeType(event.target.value);
				}
				break;
			default:
				throw new Error(`Encoding the event '${event.type}' is not supported.`);
		}
	}
}

function getChildIndex(parent, child) {
	let index = 0;
	let node = parent.firstChild;
	while(node) {
		if(node === child) {
			return index;
		}
		index++;
		node = node.nextSibling;
	}
	return -1;
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


module.exports = MutationEncoder;
