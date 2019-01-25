const {
	decodeNode, decodeString, decodeType, toUint16, next
} = require("./decode");
const tags = require("./tags");

function sepNode(node) {
	return node.nodeType === 8 && node.nodeValue === "__DONEJS-SEP__";
}

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
			if(sepNode(currentNode)) {
				var removeNode = currentNode;
				currentNode = walker.nextNode();
				removeNode.parentNode.removeChild(removeNode);
			}
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
		this._operation = null;
	}

	_startWalker() {
		this.walker = walk(this.root, 0);
		this.walker.next();
	}

	patch(bytes) {
		if(!this._operation) {
			this._operation = this._patch(bytes);
		}
		this._operation.next(bytes);
	}

	*_patch(bytes) {
		this.iter = bytes[Symbol.iterator]();
		const root = this.root;
		const document = getDocument(root);

		while(true) {
			let byte = yield* next(this);
			let index, ref, node, child;

			switch(byte) {
				case tags.Zero:
					break;
				case tags.Insert:
					index = yield* toUint16(this);
					ref = yield* toUint16(this);
					let nodeType = yield* next(this);
					child = yield* decodeNode(this, nodeType, document);
					let parent = this.walker.next(index).value;
					let sibling = getChild(parent, ref);
					parent.insertBefore(child, sibling);
					break;
				case tags.Remove:
					index = yield* toUint16(this);
					let childIndex = yield* toUint16(this);
					let el = this.walker.next(index).value;
					child = getChild(el, childIndex);
					el.removeChild(child);
					this._startWalker();
					break;
				case tags.Text: {}
					index = yield* toUint16(this);
					let nodeValue = yield* decodeString(this);
					node = this.walker.next(index).value;
					node.nodeValue = nodeValue;
					break;
				case tags.SetAttr:
					index = yield* toUint16(this);
					node = this.walker.next(index).value;
					let attrName = yield* decodeString(this);
					let attrValue = yield* decodeString(this);
					node.setAttribute(attrName, attrValue);
					break;
				case tags.RemoveAttr:
					index = yield* toUint16(this);
					node = this.walker.next(index).value;
					node.removeAttribute(yield* decodeString(this));
					break;
				case tags.Prop: {
					index = yield* toUint16(this);
					node = this.walker.next(index).value;
					let propName = yield* decodeString(this);
					let propValue = yield* decodeType(this);
					node[propName] = propValue;
				}

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

		if(child && sepNode(child)) {
			var node = child;
			child = child.nextSibling;
			node.parentNode.removeChild(node);
		}
	}
	return child;
}

module.exports = MutationPatcher;
