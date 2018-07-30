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
		this._startWalker();
	}

	_startWalker() {
		this.walker = walk(this.root, 0);
		this.walker.next();
	}

	patch(bytes) {
		const iter = bytes[Symbol.iterator]();
		const root = this.root;
		const document = root.ownerDocument;

		for(let byte of iter) {
			let index, ref, child;

			switch(extractTag(byte)) {
				case tags.Zero:
					break;
				case tags.Insert:
					index = extractValue(byte);
					ref = iter.next().value;
					let nodeType = iter.next().value;
					child = decodeNode(iter, nodeType, document);
					let parent = this.walker.next(index).value;
					let sibling = getChild(parent, ref);
					parent.insertBefore(child, sibling);
					break;
				case tags.Move:
					/*index = extractValue(byte);
					let from = iter.next().value;
					ref = iter.next().value;*/
					throw new Error('Moves have not been implemented');
				case tags.Remove:
					index = extractValue(byte);
					let childIndex = iter.next().value;
					let el = this.walker.next(index).value;
					child = getChild(el, childIndex);
					el.removeChild(child);
					this._startWalker();
					break;
				case tags.Text:
					index = extractValue(byte);
					let value = decodeString(iter);
					let node = this.walker.next(index).value;
					node.nodeValue = value;
					break;
				default:
					console.log("Tag", extractTag(byte), extractValue(byte));
					break;
			}
		}
	}
}

function getChild(parent, index) {
	let i = 0, child = parent.firstChild;
	while(i < index) {
		i++;
		child = child.nextSibling;
	}
	return child;
}

module.exports = MutationPatcher;
