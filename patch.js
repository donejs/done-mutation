const { extractString, extractTag, extractValue } = require("./decode");
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

exports.apply = function(root, bytes) {
	const document = root.ownerDocument;
	const walker = walk(root, 0);
	walker.next();

	for(let byte of bytes) {
		let index, ref;

		switch(extractTag(byte)) {
			case tags.Zero:
				break;
			case tags.Insert:
				index = extractValue(byte);
				ref = bytes.next().value;
				let nodeType = bytes.next().value;
				mutation = {type: "insert", index, ref, nodeType};
				if(nodeType === 3) {
					mutation.nodeValue = extractString(bytes);
				}
				//yield mutation;
				break;
		  case tags.Move:
				index = extractValue(byte);
				let from = bytes.next().value;
				ref = bytes.next().value;
				mutation = {type: "move", from, index, ref};
				//yield mutation;
				break;
			case tags.Remove:
				index = extractValue(byte);
				mutation = {type: "remove", index};
				//yield mutation;
				break;
			case tags.Text:
				index = extractValue(byte);
				let value = extractString(bytes);
				let node = walker.next(index).value;
				node.nodeValue = value;
				break;
			default:
				console.log("Tag", extractTag(byte), extractValue(byte));
				break;
		}
	}
}
