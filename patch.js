const {
	decodeNode, decodeString, decodeType, toUint16
} = require("./decode");
const tags = require("./tags");

function* walk(root, nextIndex) {
	const document = getDocument(root);
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

function getDocument(node) {
		return node.nodeType === 9 ? node : node.ownerDocument;
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
		const document = getDocument(root);

		for(let byte of iter) {
			let index, ref, node, child;

			switch(byte) {
				case tags.Zero:
					break;
				case tags.Insert:
					index = toUint16(iter);
					ref = toUint16(iter);
					let nodeType = iter.next().value;
					child = decodeNode(iter, nodeType, document);
					let parent = this.walker.next(index).value;
					let sibling = getChild(parent, ref);
					parent.insertBefore(child, sibling);
					break;
				case tags.Move:
					throw new Error('Moves have not been implemented');
				case tags.Remove:
					index = toUint16(iter);
					let childIndex = toUint16(iter);
					let el = this.walker.next(index).value;
					child = getChild(el, childIndex);
					el.removeChild(child);
					this._startWalker();
					break;
				case tags.Text:
					index = toUint16(iter);
					let value = decodeString(iter);
					node = this.walker.next(index).value;
					node.nodeValue = value;
					break;
				case tags.SetAttr:
					index = toUint16(iter);
					node = this.walker.next(index).value;
					let attrName = decodeString(iter);
					let attrValue = decodeString(iter);
					node.setAttribute(attrName, attrValue);
					break;
				case tags.RemoveAttr:
					index = toUint16(iter);
					node = this.walker.next(index).value;
					node.removeAttribute(decodeString(iter));
					break;
				case tags.Prop:
					index = toUint16(iter);
					node = this.walker.next(index).value;
					node[decodeString(iter)] = decodeType(iter);
					break;
				default:
					throw new Error(`The instruction ${byte} is not supported.`);
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
