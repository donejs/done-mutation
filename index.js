const walk = require("./walk");
const parentSymbol = Symbol.for("done.parentNode");

class NodeIndex {
	constructor(root) {
		this.root = root;
		this.map = new WeakMap();
		this.parentMap = new WeakMap();
		this.walk(root);
		this._onMutations = this._onMutations.bind(this);
	}

	reindex() {
		this.walk(this.root);
	}

	reIndexFrom(startNode) {
		this.walk(startNode);
	}

	setParentIndex(searchNode) {
		let parent = searchNode.parentNode;
		let node = parent.firstChild;
		let index = 0;

		while(node && node !== searchNode) {
			index++;
			node = node.nextSibling;
		}

		this.parentMap.set(searchNode, index);
	}

	// Based on https://gist.github.com/cowboy/958000
	walk(node, startIndex = 0) {
		let parentIndex = new Map();
		parentIndex.set(node, 0);

		walk(node, (type, node, child, index) => {
			switch(type) {
				case 'child': {
					// Set the index of this node
					this.map.set(child, index);

					parentIndex.set(node, 0);
					this.parentMap.set(child, 0);
					child[parentSymbol] = node;
					break;
				}
				case 'sibling': {
					this.map.set(child, index);

					let parentI = parentIndex.get(child.parentNode) + 1;
					parentIndex.set(child.parentNode, parentI);
					this.parentMap.set(child, parentI);

					child[parentSymbol] = child.parentNode;
					break;
				}
			}
		}, startIndex);
	}

	contains(node) {
		return this.map.has(node);
	}

	// Get the cached index of a Node. If you can't find that,
	// Walk up to a parent that is indexed. At that point index down its children.
	for(node) {
		if(this.map.has(node)) {
			return this.map.get(node);
		}

		throw new Error("We don't know about this node", node);
	}

	fromParent(node) {
		let parent = node[parentSymbol];

		// If there is no parent it usually means the element was removed
		// before the parent's insertion mutation occurred.
		if(!parent) {
			return null;
		}

		let parentIndex = this.for(parent);
		let childIndex = this.parentMap.get(node);
		return [parentIndex, childIndex];
	}

	purge(node) {
		// TODO this should do something different...
		let index = this.for(node);
		this.map.delete(node);
		this.parentMap.delete(node);
		return index;
	}

	startObserving() {
		let doc = this.root.nodeType === 9 ? this.root : this.root.ownerDocument;
		let window = doc.defaultView;
		console.assert(window, "Cannot observe without a 'window' object");
		let MutationObserver = window.MutationObserver;
		console.assert(MutationObserver, "Cannot observe without a MutationObserver");
		this._observer = new MutationObserver(this._onMutations);
		this._observer.observe(this.root, {
			subtree: true,
			childList: true
		});
	}

	stopObserving() {
		if(this._observer) {
			this._observer.disconnect();
		}
	}

	_onMutations(records) {
		// Ensure that we have indexed each added Node.
		let index = this;
		records.forEach(function(record){
			record.addedNodes.forEach(function(node){
				index.reIndexFrom(node.parentNode);
			});
		});
	}
}



module.exports = NodeIndex;
