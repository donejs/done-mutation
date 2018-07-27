const { decodeNode, decodeString, extractTag, extractValue } = require("./decode");
const tags = require("./tags");

function* walk(root, nextIndex) {
	const document = root.ownerDocument;
	const walker = document.createTreeWalker(root, -1);
	let index = 0;
	let currentNode = walker.nextNode();

	while(true) {
		if(index === nextIndex) {
			nextIndex = yield currentNode;
		} else if(index < nextIndex) {
			index++;
			currentNode = walker.nextNode();
		} else {
			index--;
			currentNode = walker.previousNode();
		}
	}
}

class MutationPatcher {
	constructor(root) {
		this.root = root;
	}

	patch(bytes) {
		const iter = bytes[Symbol.iterator]();
		const root = this.root;
		const document = root.ownerDocument;
		const walker = walk(root, 0);
		walker.next();

		for(let byte of iter) {
			let index, ref;

			switch(extractTag(byte)) {
				case tags.Zero:
					break;
				case tags.Insert:
					index = extractValue(byte);
					ref = iter.next().value;
					let nodeType = iter.next().value;
					let child = decodeNode(iter, nodeType, document);
					let parent = walker.next(index).value;
					let sibling = getSibling(parent, ref);
					parent.insertBefore(child, sibling);
					break;
				case tags.Move:
					index = extractValue(byte);
					let from = iter.next().value;
					ref = iter.next().value;
					mutation = {type: "move", from, index, ref};
					break;
				case tags.Remove:
					index = extractValue(byte);
					let el = walker.next(index).value;
					el.parentNode.removeChild(el);
					break;
				case tags.Text:
					index = extractValue(byte);
					let value = decodeString(iter);
					let node = walker.next(index).value;
					node.nodeValue = value;
					break;
				default:
					console.log("Tag", extractTag(byte), extractValue(byte));
					break;
			}
		}
	}
}

function getSibling(parent, index) {
	let i = 0, child = parent.firstChild;
	while(i < index) {
		i++;
		child = child.nextSibling;
	}
	return child;
}

module.exports = MutationPatcher;
