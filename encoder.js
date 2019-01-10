const tags = require("./tags");
const NodeIndex = require("./index");
const walk = require("./walk");
const utf8 = require("utf8");

function* toUint8(n) {
	yield ((n >> 8) & 0xff); // high
	yield n & 0xff; // low
}

function* stringToBytes(text) {
	let enc = utf8.encode(text);
	let i = 0, point;
	while((point = enc.codePointAt(i)) !== undefined) {
		yield point;
		i++;
	}
}

function* encodeString(text) {
	let arr = Uint8Array.from(stringToBytes(text));
	yield* toUint8(arr.length);
	yield* arr;
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
	yield* toUint8(element.attributes.length);
	for(let attribute of element.attributes) {
		yield* encodeString(attribute.name);
		yield* encodeString(attribute.value);
	}

	// Children
	let child = element.firstChild;
	let hasChildren = !!child;
	yield Number(hasChildren);

	if(hasChildren) {
		while(child) {
			yield* encodeNode(child);
			child = child.nextSibling;
		}
		yield tags.Zero; // End of children
	}
}

function* encodeNode(node) {
	yield node.nodeType;

	switch(node.nodeType) {
		case 1:
			yield* encodeElement(node);
			break;
		case 3:
		case 8:
			yield* encodeString(textValue(node));
			break;
		default:
			throw new Error(`Cannot yet encode nodeType ${node.nodeType}`);
	}
}

function* encodeRemovalMutation(node, parentIndex, childIndex) {
	yield tags.Remove;
	yield* toUint8(parentIndex);
	yield* toUint8(childIndex);
}

function* encodeAddedMutation(node, parentIndex, childIndex) {
	yield tags.Insert;
	yield* toUint8(parentIndex);
	yield* toUint8(childIndex); // ref
	yield* encodeNode(node);
}

function* encodeCharacterMutation(node, parentIndex) {
	yield tags.Text;
	yield* toUint8(parentIndex);
	yield* encodeString(textValue(node));
}

function* encodeAttributeMutation(record, parentIndex) {
	let attributeValue = record.target.getAttribute(record.attributeName);
	if(attributeValue == null) {
		yield tags.RemoveAttr;
		yield* toUint8(parentIndex);
		yield* encodeString(record.attributeName);
	} else {
		yield tags.SetAttr;
		yield* toUint8(parentIndex);
		yield* encodeString(record.attributeName);
		yield* encodeString(attributeValue);
	}
}

function textValue(node) {
	return node.data != null ? node.data : node.nodeValue;
}

function sortMutations(a, b) {
	let aType = a[0];
	let bType = b[0];
	let aIndex = a[1];
	let bIndex = b[1];

	if(aIndex > bIndex) {
		return -1;
	} else if(aIndex < bIndex) {
		return 1;
	}

	if(aType === 0) {
		if(bType === 0) {
			let aChild = a[3];
			let bChild = b[3];

			if(aIndex >= bIndex) {
				if(aChild > bChild) {
					return -1;
				} else {
					return 1;
				}
			} else {
				return 1;
			}
		} else {
			return -1;
		}
	}
	else if(aType === 1) {
		if(bType === 1) {
			let aChild = a[3];
			let bChild = b[3];

			if(aIndex >= bIndex) {
				if(aChild > bChild) {
					return 1;
				} else {
					return -1;
				}
			} else {
				return -1;
			}
		} else if(bType === 0) {
			return 1;
		} else {
			return -1;
		}
	}
	else {
		if(aType > bType) {
			return 1;
		} else {
			return -1;
		}
	}
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
		const removedNodes = new WeakSet();
		const addedNodes = new Set();
		const instructions = [];

		for(let record of records) {
			switch(record.type) {
				case "childList":
					for(let node of record.removedNodes) {
						// If part of this set, it means that this node
						// was inserted and removed in the same Mutation event
						// in this case nothing needs to be encoded.
						if(removedNodes.has(node)) {
							continue;
						}

						let indices = index.fromParent(node);
						if(indices !== null) {
							let [parentIndex, childIndex] = indices;
							index.purge(node);
							instructions.push([0, parentIndex,
								encodeRemovalMutation(node, parentIndex, childIndex),
									childIndex]);
						}

					}

					for (let node of record.addedNodes) {
						// If the parent was added in this same mutation set
						// we don't need to (and can't) encode this mutation.
						if(addedNodes.has(node.parentNode)) {
							continue;
						} else if(node.parentNode) {
							let parentIndex = index.for(node.parentNode);
							let childIndex = getChildIndex(node.parentNode, node);

							instructions.push([1, parentIndex, encodeAddedMutation(node, parentIndex, childIndex), childIndex]);

							walk(node, (type, node) => {
								addedNodes.add(node);
							});
						} else {
							// No parent means it was removed in the same mutation.
							// Add it to this set so that the removal can be ignored.
							removedNodes.add(node);
						}
					}

					break;
				case "characterData":
					let node = record.target;
					if(index.contains(node)) {
						let parentIndex = index.for(node);
						instructions.push([2, parentIndex,
							encodeCharacterMutation(node, parentIndex)]);
					}

					break;
				case "attributes": {
					let node = record.target;
					if(index.contains(node)) {
						let parentIndex = index.for(record.target);
						instructions.push([3, parentIndex,
							encodeAttributeMutation(record, parentIndex)]);
					}
					break;
				}
			}
		}

		instructions.sort(sortMutations);
		for(let [,,gen] of instructions) {
			yield* gen;
		}

		// Reindex so that the next set up mutations will start from the correct indices
		index.reindex();
	}

	*event(event) {
		let index = this.index;
		switch(event.type) {
			case "change":
				yield tags.Prop;
				yield* toUint8(index.for(event.target));
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
	let index = -1;
	let node = parent.firstChild;
	let prev;
	while(node) {
		index++;

		if(node === child) {
			return index;
		}

		prev = node;
		node = node.nextSibling;
	}
	return -1;
}

module.exports = MutationEncoder;
