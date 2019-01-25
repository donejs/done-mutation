var QUnit = require("steal-qunit");
var cloneUtils = require("ir-clone");
var MutationEncoder = require("../encoder");
var MutationPatcher = require("../patch");
var MutationDecoder = require("../decoder");
var NodeIndex = require("../index");
var helpers = require("./test-helpers");

function wait(ms = 0) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

QUnit.module("Node insertion/removal", {
	afterEach: function(){
		helpers.fixture.clear();
	}
});

QUnit.test("Nodes inserted before MutationObserver starts observing", function(assert){
	var done = assert.async();

	var root = document.createElement("div");
	helpers.fixture.el().appendChild(root);
	var clone = root.cloneNode(true);

	var index = new NodeIndex(root);
	index.startObserving();
	var encoder = new MutationEncoder(index);
	var decoder = new MutationDecoder(root.ownerDocument);

	var article = document.createElement("article");
	root.appendChild(article);

	var mo = new MutationObserver(function(records) {
		var instr = Array.from(decoder.decode(encoder.encode(records)));
		assert.equal(instr.length, 1, "There is one mutation instruction");
		assert.equal(instr[0].node.nodeName, "SPAN", "span mutation observed");
		index.stopObserving();
		done();
	});

	mo.observe(root, { subtree: true, childList: true });
	article.appendChild(document.createElement("span"));
});

QUnit.test("Inserting a large stylesheet", function(assert){
	var done = assert.async();

	var root = document.createElement("div");
	var main = document.createElement("main");
	root.appendChild(main);
	helpers.fixture.el().appendChild(root);

	var encoder = new MutationEncoder(root);
	var decoder = new MutationDecoder(root.ownerDocument);

	var css = `
		order-history {
			background: blue;
		}
		/*# sourceURL=/async/orders/orders.css */
	`;

	var mo = new MutationObserver(function(records) {
		var bytes = Uint8Array.from(encoder.encode(records));
		var instr = Array.from(decoder.decode(bytes));

		assert.equal(instr.length, 1, "There was one insertion");
		assert.equal(instr[0].node.nodeName, "STYLE", "it is a style");
		assert.equal(instr[0].node.getAttribute("asset-id"), "async/orders/orders.css!done-css@3.0.2#css", "Set the attribute");
		assert.equal(instr[0].node.textContent, css, "the css was applied");

		done();
	});

	mo.observe(root, { childList: true, subtree: true});

	var style = document.createElement("style");
	style.setAttribute("asset-id", "async/orders/orders.css!done-css@3.0.2#css");
	style.appendChild(document.createTextNode(css));
	main.appendChild(style);
});

QUnit.test("Correctly encodes elements with children", function(assert) {
	var done = assert.async();

	var root = document.createElement("div");
	var main = document.createElement("main");
	root.appendChild(main);
	helpers.fixture.el().appendChild(root);

	var encoder = new MutationEncoder(root);
	var decoder = new MutationDecoder(root.ownerDocument);

	var mo = new MutationObserver(function(records) {
		var bytes = Uint8Array.from(encoder.encode(records));
		var instrs = Array.from(decoder.decode(bytes));

		assert.equal(instrs.length, 1, "There is one instruction");

		var instr = instrs[0];
		assert.equal(instr.type, "insert");
		assert.equal(instr.node.nodeName, "HEADER");

		// First child
		assert.equal(instr.node.firstChild.nodeType, 3, "a TextNode");
		assert.equal(instr.node.firstChild.nodeValue, " ", "a space");

		// Next child
		assert.equal(instr.node.firstChild.nextSibling.nodeName, "DIV", "an element");

		done();
	});

	mo.observe(root, { childList: true, subtree: true});

	var header = document.createElement("header");
	header.innerHTML = ` <div></div>`;

	main.appendChild(header);
});

QUnit.test("When a document is the root", function(assert) {
	var done = assert.async();

	var doc1 = document.implementation.createHTMLDocument("doc1");
	var doc2 = document.implementation.createHTMLDocument("doc2");

	var encoder = new MutationEncoder(doc1);
	var patcher = new MutationPatcher(doc2);

	var mo = new MutationObserver(function(records) {
		var bytes = Uint8Array.from(encoder.encode(records));
		patcher.patch(bytes);

		assert.equal(doc2.head.lastChild.nodeName, "STYLE", "the style was appended.");

		done();
	});

	mo.observe(doc1, { childList: true, subtree: true});

	doc1.head.appendChild(doc1.createElement("style"));
});

QUnit.test("Removing multiple sibling nodes", function(assert) {
	var done = assert.async();

	var root = document.createElement("div");
	var main = document.createElement("main");
	root.appendChild(main);
	["span", "ul", "style"].forEach(function(nodeName) {
		main.appendChild(document.createElement(nodeName));
	});
	helpers.fixture.el().appendChild(root);
	var clone = root.cloneNode(true);

	var encoder = new MutationEncoder(root);
	var patcher = new MutationPatcher(clone);

	var mo = new MutationObserver(function(records) {
		var bytes = encoder.encode(records);
		patcher.patch(bytes);

		var child = clone.firstChild.firstChild;
		assert.equal(child.nodeName, "STYLE", "The style tag remains");
		assert.equal(child.nextSibling, null, "Other nodes removed");

		done();
	});

	mo.observe(root, { childList: true, subtree: true});

	var span = root.querySelector("span");
	var ul = root.querySelector("ul");

	main.removeChild(span);
	main.removeChild(ul);
});

QUnit.test("Removing and replacing multiple sibling nodes", function(assert) {
	var done = assert.async();

	var root = document.createElement("div");
	var main = document.createElement("main");
	root.appendChild(main);
	["span", "ul", "style"].forEach(function(nodeName) {
		main.appendChild(document.createElement(nodeName));
	});
	helpers.fixture.el().appendChild(root);
	var clone = root.cloneNode(true);

	var encoder = new MutationEncoder(root);
	var patcher = new MutationPatcher(clone);

	var mo = new MutationObserver(function(records) {
		var bytes = encoder.encode(records);
		patcher.patch(bytes);

		var child = clone.firstChild.firstChild;
		assert.equal(child.nodeName, "STYLE", "The style tag remains");
		assert.equal(child.nextSibling.nodeName, "DATALIST", "New element");
		assert.equal(child.nextSibling.nextSibling.nodeName, "PROGRESS", "New element");

		done();
	});

	mo.observe(root, { childList: true, subtree: true});

	var span = root.querySelector("span");
	var ul = root.querySelector("ul");

	main.removeChild(span);
	main.removeChild(ul);

	main.appendChild(document.createElement("datalist"));
	main.appendChild(document.createElement("progress"));
});

QUnit.test("A node that is inserted and removed in the same mutation", function(assert) {
	var done = assert.async();

	var root = document.createElement("div");
	var main = document.createElement("main");
	root.appendChild(main);
	helpers.fixture.el().appendChild(root);
	var clone = root.cloneNode(true);

	var encoder = new MutationEncoder(root);
	var patcher = new MutationPatcher(clone);

	var mo = new MutationObserver(function(records) {
		var bytes = encoder.encode(records);
		patcher.patch(bytes);

		assert.equal(clone.firstChild.firstChild, null, "The main element has no children");
		done();
	});

	mo.observe(root, { childList: true, subtree: true});

	var span = document.createElement("span");
	main.appendChild(span);
	main.removeChild(span);
});

QUnit.test("Mutations occur top-down", function(assert) {
	var done = assert.async();

	var root = document.createElement("div");
	root.innerHTML = `
		<h1></h1>
		<article><h2>Some title</h2></article>
	`;
	var h1 = root.querySelector("h1");
	var h2 = root.querySelector("h2");
	helpers.fixture.el().appendChild(root);
	var clone = root.cloneNode(true);

	var encoder = new MutationEncoder(root);
	var patcher = new MutationPatcher(clone);

	var mo = new MutationObserver(function(records) {
		var bytes = encoder.encode(records);
		patcher.patch(bytes);

		assert.equal(clone.querySelector("h1").textContent, "Title", "Appended the title");
		assert.equal(clone.querySelector("h2").textContent, "Subtitle", "Appended the subtitle");
		done();
	});

	mo.observe(root, { childList: true, subtree: true});

	h2.removeChild(h2.firstChild);
	h2.appendChild(document.createTextNode("Subtitle"));
	h1.appendChild(document.createTextNode("Title"));
});


QUnit.test("Multiple removals and insertions", async function(assert) {
	var done = assert.async();

	function createElement(tag, text = "", attrs = []) {
		var el = document.createElement(tag);
		for(let pair of attrs) {
			el.setAttribute(pair[0], pair[1]);
		}
		el.textContent = text;
		return el;
	}

	function createText(text = "") {
		return document.createTextNode(text);
	}

	var root = document.createElement("section");
	root.innerHTML = '<ul>\n</ul>';
	helpers.fixture.el().appendChild(root);
	var clone = root.cloneNode(true);

	var encoder = new MutationEncoder(root);
	var patcher = new MutationPatcher(clone);

	var mo = new MutationObserver(function(records) {
		var bytes = encoder.encode(records);

		try {
			patcher.patch(bytes);
			assert.ok(true, "patch successful");
		} catch(err) {
			assert.ok(false, err);
		}
	});

	mo.observe(root, { childList: true, subtree: true});

	{
		let ul = root.firstChild;
		let frag = document.createDocumentFragment();
		frag.appendChild(createText("\n"));
		frag.appendChild(createElement("li", "", [["class", "active"]]));
		frag.appendChild(createText("\n"));
		ul.replaceChild(frag, ul.firstChild);

		frag = document.createDocumentFragment();
		frag.appendChild(createText("\n"));
		frag.appendChild(createElement("li", "", [["class", "active"]]));
		frag.appendChild(createText("\n"));
		frag.appendChild(createText("\n"));
		frag.appendChild(createElement("li"));
		frag.appendChild(createText("\n"));
		ul.appendChild(frag);

		ul.removeChild(ul.firstChild); // #text
		ul.removeChild(ul.firstChild); // <li.active>
		ul.removeChild(ul.firstChild); // #text
	}

	await wait();
	done();
});

QUnit.test("Applying changes to a full app load", async function(assert) {
	var done = assert.async();

	function createElement(tag, text = "", attrs = []) {
		var el = root.createElement(tag);
		for(let pair of attrs) {
			el.setAttribute(pair[0], pair[1]);
		}
		el.textContent = text;
		return el;
	}

	function createText(text = "") {
		return root.createTextNode(text);
	}

	var root = document.implementation.createHTMLDocument("Test");
	root.head.innerHTML = `
		<title>Test</title>
	`;
	root.documentElement.insertBefore(createText("\n"), root.body);
	root.body.innerHTML = `
		<script>"use strict";</script>
		<script></script>
	`;
	var clone = root.cloneNode(true);

	var encoder = new MutationEncoder(root);
	var patcher = new MutationPatcher(clone);

	var mo = new MutationObserver(function(records) {
		var bytes = encoder.encode(records);

		try {
			patcher.patch(bytes);
			assert.ok(true, "patch successful");
		} catch(err) {
			console.error(err);
			assert.ok(false, err);
		}
	});

	mo.observe(root, { childList: true, subtree: true});

	root.head.appendChild(createElement("style", "body {}"));
	root.head.appendChild(createElement("style", "body {}"));
	await wait();

	root.head.appendChild(createElement("style", "body {}"));
	await wait();

	root.head.removeChild(root.head.firstChild); // #text
	root.head.removeChild(root.head.firstChild); // <title>
	root.head.removeChild(root.head.firstChild); // #text
	root.head.appendChild(root.createTextNode("\n")); // #text
	root.head.appendChild(createElement("title", "New title")); // <title>
	root.head.appendChild(root.createTextNode("\n")); // #text

	// Remove text nodes before/after scripts
	root.body.removeChild(root.body.firstChild); // #text
	root.body.removeChild(root.body.firstChild.nextSibling); // #text
	root.body.removeChild(root.body.firstChild.nextSibling.nextSibling); // #text

	root.body.appendChild(createText("\n")); // #text
	root.body.appendChild(createElement("can-import")); // <can-import>
	root.body.appendChild(createText("\n")); // #text
	root.body.appendChild(createElement("can-import")); // <can-import>
	root.body.appendChild(createText("\n")); // #text
	root.body.appendChild(createElement("can-import")); // <can-import>
	root.body.appendChild(createText("\n")); // #text
	{
		let container = createElement("div", "", [["class", "container"]]);
		container.appendChild(createText("\n"));
		{
			let row = createElement("div", "", [["class", "row"]]);
			row.appendChild(createText("\n"));
			{
				let col = createElement("div", "", [["class", ".col-sm-8.col-sm-offset-2"]]);
				col.appendChild(createText("\n"));
				col.appendChild(createText("\n"));
				{
					let chat = createElement("chat-home");
					chat.appendChild(createText("\n"));
					chat.appendChild(createElement("can-import"));
					chat.appendChild(createText("\n"));
					chat.appendChild(createElement("can-import"));
					chat.appendChild(createText("\n"));
					chat.appendChild(createElement("h1"));
					chat.appendChild(createText("\n"));
					{
						let bitTabs = createElement("bit-tabs");
						bitTabs.appendChild(createText("\n"));
						bitTabs.appendChild(createText("\n"));
						{
							let ul = createElement("ul", "", [["class", "nav nav-tabs"]]);
							ul.appendChild(createText("\n"));
							bitTabs.appendChild(ul);
						}
						bitTabs.appendChild(createText("\n"));
						{
							let panel = createElement("bit-panel");
							panel.appendChild(createText("\n"));
							bitTabs.appendChild(panel);
						}
						bitTabs.appendChild(createText("\n"));
						{
							let panel = createElement("bit-panel");
							panel.appendChild(createText("\n"));
							bitTabs.appendChild(panel);
						}
						bitTabs.appendChild(createText("\n"));
						bitTabs.appendChild(createText("\n"));
						chat.appendChild(bitTabs);
					}
					chat.appendChild(createText("\n"));
					chat.appendChild(createElement("a", "", [["class", "btn"]]));
					chat.appendChild(createText("\n"));
					col.appendChild(chat);
				}
				col.appendChild(createText("\n"));
				col.appendChild(createText("\n"));
				row.appendChild(col);
			}
			row.appendChild(createText("\n"));
			container.appendChild(row);
		}
		container.appendChild(createText("\n"));
		root.body.appendChild(container);
	}
	root.body.appendChild(createText("\n")); // #text
	root.body.appendChild(createText("\n")); // #text
	root.body.appendChild(createText("\n")); // #text
	root.body.appendChild(createText("\n")); // #text
	root.body.appendChild(createText("\n")); // #text
	root.body.appendChild(createText("\n")); // #text
	root.body.appendChild(createText("\n")); // #text
	root.body.appendChild(createText("\n")); // #text
	await wait();

	// Replace the text node if bit-panel with some text
	{
		let frag = root.createDocumentFragment();
		frag.appendChild(createText("\n"));
		frag.appendChild(createElement("p", "panel one"));
		frag.appendChild(createText("\n"));
		let bitPanel = root.querySelector("bit-panel");
		bitPanel.replaceChild(frag, bitPanel.firstChild);
	}

	{
		let ul = root.querySelector(".nav-tabs");
		let frag = root.createDocumentFragment();
		frag.appendChild(createText("\n"));
		frag.appendChild(createElement("li", "", [["class", "active"]]));
		frag.appendChild(createText("\n"));
		ul.replaceChild(frag, ul.firstChild);

		frag = root.createDocumentFragment();
		frag.appendChild(createText("\n"));
		frag.appendChild(createElement("li", "", [["class", "active"]]));
		frag.appendChild(createText("\n"));
		frag.appendChild(createText("\n"));
		frag.appendChild(createElement("li"));
		frag.appendChild(createText("\n"));
		ul.appendChild(frag);

		ul.removeChild(ul.firstChild); // #text
		ul.removeChild(ul.firstChild); // <li.active>
		ul.removeChild(ul.firstChild); // #text
	}

	await wait();
	done();
});


QUnit.test("Applying changes to a full app load - incrementally", async function(assert) {
	var done = assert.async();

	function createElement(tag, text = "", attrs = []) {
		var el = root.createElement(tag);
		for(let pair of attrs) {
			el.setAttribute(pair[0], pair[1]);
		}
		el.textContent = text;
		return el;
	}

	function createText(text = "") {
		return root.createTextNode(text);
	}

	var root = document.implementation.createHTMLDocument("Test");
	root.head.innerHTML = `
		<title>Test</title>
	`;
	root.documentElement.insertBefore(createText("\n"), root.body);
	root.body.innerHTML = `
		<script>"use strict";</script>
		<script></script>
	`;
	var clone = root.cloneNode(true);

	var encoder = new MutationEncoder(root);
	var patcher = new MutationPatcher(clone);
	var decoder = new MutationDecoder(root.ownerDocument);

	function* chunk(bytes, count) {
		var len = bytes.length, l = -1;
		while(true) {
			var partial = [];
			for(var i = 0; i < count; i++) {
				l++;
				if(l < len) {
					partial.push(bytes[l]);
				} else {
					break;
				}
			}
			var instr = Uint8Array.from(partial);
			yield instr;
			if(l >= len) {
				break;
			}
		}
	}

	var mo = new MutationObserver(function(records) {
		var fullBytes = encoder.encode(records);

		for(let bytes of chunk(fullBytes, 10)) {
			try {
				for(let value of decoder.decode(bytes)) {
					assert.ok(value, "got some logging info");
				}

				patcher.patch(bytes);
				assert.ok(true, "patch successful");
			} catch(err) {
				console.error(err);
				assert.ok(false, err);
			}
		}
	});

	mo.observe(root, { childList: true, subtree: true});

	root.head.appendChild(createElement("style", "body {}"));
	root.head.appendChild(createElement("style", "body {}"));
	await wait();

	root.head.appendChild(createElement("style", "body {}"));
	await wait();

	root.head.removeChild(root.head.firstChild); // #text
	root.head.removeChild(root.head.firstChild); // <title>
	root.head.removeChild(root.head.firstChild); // #text
	root.head.appendChild(root.createTextNode("\n")); // #text
	root.head.appendChild(createElement("title", "New title")); // <title>
	root.head.appendChild(root.createTextNode("\n")); // #text

	// Remove text nodes before/after scripts
	root.body.removeChild(root.body.firstChild); // #text
	root.body.removeChild(root.body.firstChild.nextSibling); // #text
	root.body.removeChild(root.body.firstChild.nextSibling.nextSibling); // #text

	root.body.appendChild(createText("\n")); // #text
	root.body.appendChild(createElement("can-import")); // <can-import>
	root.body.appendChild(createText("\n")); // #text
	root.body.appendChild(createElement("can-import")); // <can-import>
	root.body.appendChild(createText("\n")); // #text
	root.body.appendChild(createElement("can-import")); // <can-import>
	root.body.appendChild(createText("\n")); // #text
	{
		let container = createElement("div", "", [["class", "container"]]);
		container.appendChild(createText("\n"));
		{
			let row = createElement("div", "", [["class", "row"]]);
			row.appendChild(createText("\n"));
			{
				let col = createElement("div", "", [["class", ".col-sm-8.col-sm-offset-2"]]);
				col.appendChild(createText("\n"));
				col.appendChild(createText("\n"));
				{
					let chat = createElement("chat-home");
					chat.appendChild(createText("\n"));
					chat.appendChild(createElement("can-import"));
					chat.appendChild(createText("\n"));
					chat.appendChild(createElement("can-import"));
					chat.appendChild(createText("\n"));
					chat.appendChild(createElement("h1"));
					chat.appendChild(createText("\n"));
					{
						let bitTabs = createElement("bit-tabs");
						bitTabs.appendChild(createText("\n"));
						bitTabs.appendChild(createText("\n"));
						{
							let ul = createElement("ul", "", [["class", "nav nav-tabs"]]);
							ul.appendChild(createText("\n"));
							bitTabs.appendChild(ul);
						}
						bitTabs.appendChild(createText("\n"));
						{
							let panel = createElement("bit-panel");
							panel.appendChild(createText("\n"));
							bitTabs.appendChild(panel);
						}
						bitTabs.appendChild(createText("\n"));
						{
							let panel = createElement("bit-panel");
							panel.appendChild(createText("\n"));
							bitTabs.appendChild(panel);
						}
						bitTabs.appendChild(createText("\n"));
						bitTabs.appendChild(createText("\n"));
						chat.appendChild(bitTabs);
					}
					chat.appendChild(createText("\n"));
					chat.appendChild(createElement("a", "", [["class", "btn"]]));
					chat.appendChild(createText("\n"));
					col.appendChild(chat);
				}
				col.appendChild(createText("\n"));
				col.appendChild(createText("\n"));
				row.appendChild(col);
			}
			row.appendChild(createText("\n"));
			container.appendChild(row);
		}
		container.appendChild(createText("\n"));
		root.body.appendChild(container);
	}
	root.body.appendChild(createText("\n")); // #text
	root.body.appendChild(createText("\n")); // #text
	root.body.appendChild(createText("\n")); // #text
	root.body.appendChild(createText("\n")); // #text
	root.body.appendChild(createText("\n")); // #text
	root.body.appendChild(createText("\n")); // #text
	root.body.appendChild(createText("\n")); // #text
	root.body.appendChild(createText("\n")); // #text
	await wait();

	// Replace the text node if bit-panel with some text
	{
		let frag = root.createDocumentFragment();
		frag.appendChild(createText("\n"));
		frag.appendChild(createElement("p", "panel one"));
		frag.appendChild(createText("\n"));
		let bitPanel = root.querySelector("bit-panel");
		bitPanel.replaceChild(frag, bitPanel.firstChild);
	}

	{
		let ul = root.querySelector(".nav-tabs");
		let frag = root.createDocumentFragment();
		frag.appendChild(createText("\n"));
		frag.appendChild(createElement("li", "", [["class", "active"]]));
		frag.appendChild(createText("\n"));
		ul.replaceChild(frag, ul.firstChild);

		frag = root.createDocumentFragment();
		frag.appendChild(createText("\n"));
		frag.appendChild(createElement("li", "", [["class", "active"]]));
		frag.appendChild(createText("\n"));
		frag.appendChild(createText("\n"));
		frag.appendChild(createElement("li"));
		frag.appendChild(createText("\n"));
		ul.appendChild(frag);

		ul.removeChild(ul.firstChild); // #text
		ul.removeChild(ul.firstChild); // <li.active>
		ul.removeChild(ul.firstChild); // #text
	}

	await wait();
	done();
});

QUnit.test("Consecutive TextNodes and replacement", function(assert) {
	var done = assert.async();

	var root = document.createElement("div");
	root.appendChild(document.createTextNode("\n"));
	root.appendChild(document.createTextNode("\n"));
	var h1 = document.createElement("h1");
	h1.appendChild(document.createTextNode("\n"));
	h1.appendChild(document.createTextNode("first"));
	root.appendChild(h1);
	helpers.fixture.el().appendChild(root);
	var clone = root.cloneNode();
	clone.innerHTML = cloneUtils.serializeToString(root);
	clone = clone.firstChild;

	var encoder = new MutationEncoder(root);
	var patcher = new MutationPatcher(clone);

	var mo = new MutationObserver(function(records) {
		var bytes = encoder.encode(records);
		patcher.patch(bytes);

		var h1 = clone.querySelector("h1");
		assert.equal(h1.childNodes.length, 2, "There are two TextNodes");
		assert.equal(h1.firstChild.nextSibling.nodeValue, "second");
		done();
	});

	mo.observe(root, { childList: true, subtree: true});

	h1.removeChild(h1.firstChild.nextSibling);
	h1.appendChild(document.createTextNode("second"));
});


QUnit.test("Consecutive TextNodes and appending", function(assert) {
	var done = assert.async();

	var root = document.createElement("div");
	root.appendChild(document.createTextNode("\n"));
	root.appendChild(document.createTextNode(""));
	var h1 = document.createElement("h1");
	h1.appendChild(document.createTextNode("\n"));
	h1.appendChild(document.createTextNode("first"));
	root.appendChild(h1);
	helpers.fixture.el().appendChild(root);
	var clone = root.cloneNode();
	clone.innerHTML = cloneUtils.serializeToString(root);
	clone = clone.firstChild;

	var encoder = new MutationEncoder(root);
	var patcher = new MutationPatcher(clone);

	var mo = new MutationObserver(function(records) {
		var bytes = encoder.encode(records);
		patcher.patch(bytes);

		assert.equal(clone.textContent.trim(), "firstsecond");
		done();
	});

	mo.observe(root, { childList: true, subtree: true});

	h1.appendChild(document.createTextNode("second"));
});

QUnit.test("NodeIndex exposes a reindex function", function(assert) {
	var done = assert.async();

	var root = document.createElement("div");
	helpers.fixture.el().appendChild(root);
	var clone = root.cloneNode(true);

	var index = new NodeIndex(root);
	var encoder = new MutationEncoder(index);
	var decoder = new MutationDecoder(root.ownerDocument);

	var article = document.createElement("article");
	root.appendChild(article);

	var mo = new MutationObserver(function(records) {
		var instr = Array.from(decoder.decode(encoder.encode(records)));
		assert.equal(instr.length, 1, "There is one mutation instruction");
		assert.equal(instr[0].node.nodeName, "SPAN", "span mutation observed");
		done();
	});

	index.reindex();
	mo.observe(root, { subtree: true, childList: true });
	article.appendChild(document.createElement("span"));
});

QUnit.test("Inserting an element and that replaces another", function(assert) {
	var done = assert.async();

	var doc = document.createElement("div");
	var root = document.createElement("div");
	doc.appendChild(root);
	var main = document.createElement("main");
	main.setAttribute("id", "main1");
	root.appendChild(main);
	helpers.fixture.el().appendChild(doc);
	var clone = doc.cloneNode(true);

	var encoder = new MutationEncoder(doc);
	var patcher = new MutationPatcher(clone);

	function patch(records) {
		var bytes = encoder.encode(records);
		patcher.patch(bytes);
	}

	var mo = new MutationObserver(function(records){
		patch(records);

		assert.equal(clone.firstChild.firstChild.id, "main2", "Main2 replaces main1");
		done();
	});
	mo.observe(root, { subtree: true, childList: true });

	var main2 = document.createElement("main");
	main2.setAttribute("id", "main2");
	root.appendChild(main2);
	root.removeChild(main);
});

QUnit.test("Element removed from parent before parent's insert occurs", function(assert) {
	var done = assert.async();

	var doc = document.createElement("div");
	var root = document.createElement("div");
	doc.appendChild(root);
	helpers.fixture.el().appendChild(doc);
	var clone = doc.cloneNode(true);

	var encoder = new MutationEncoder(doc);
	var patcher = new MutationPatcher(clone);

	function patch(records) {
		var bytes = encoder.encode(records);
		patcher.patch(bytes);
	}

	var mo = new MutationObserver(function(records){
		patch(records);

		assert.equal(clone.firstChild.firstChild.firstChild.nodeName, "LABEL", "there's just a label");
		done();
	});
	mo.observe(root, { subtree: true, childList: true });

	var parent = document.createElement("main");
	parent.appendChild(document.createElement("span"));
	parent.appendChild(document.createElement("label"));
	root.appendChild(parent);
	parent.removeChild(parent.firstChild);
});

QUnit.test("Element appended to parent before parent's insert occurs", function(assert) {
	var done = assert.async();

	var doc = document.createElement("div");
	var root = document.createElement("div");
	doc.appendChild(root);
	helpers.fixture.el().appendChild(doc);
	var clone = doc.cloneNode(true);

	var encoder = new MutationEncoder(doc);
	var patcher = new MutationPatcher(clone);

	function patch(records) {
		var bytes = encoder.encode(records);
		patcher.patch(bytes);
	}

	var mo = new MutationObserver(function(records){
		patch(records);

		assert.equal(clone.firstChild.firstChild.firstChild.nodeName, "LABEL", "there's just a label");
		done();
	});
	mo.observe(root, { subtree: true, childList: true });

	var parent = document.createElement("main");
	var label = document.createElement("label");
	parent.appendChild(label);
	root.appendChild(parent);
	label.appendChild(document.createTextNode("User"));
});

QUnit.test("Correctly encodes/decodes comment nodes", function(assert) {
	var done = assert.async();

	var doc = document.createElement("div");
	var root = document.createElement("div");
	doc.appendChild(root);
	helpers.fixture.el().appendChild(doc);
	var clone = doc.cloneNode(true);

	var encoder = new MutationEncoder(doc);
	var patcher = new MutationPatcher(clone);

	var mo = new MutationObserver(function(records){
		var bytes = encoder.encode(records);
		patcher.patch(bytes);

		assert.equal(clone.firstChild.firstChild.nodeValue, "hello world");
		done();
	});
	mo.observe(root, { subtree: true, childList: true });

	root.appendChild(document.createComment("hello world"));
});

QUnit.test("Encoding long strings", function(assert) {
	var done = assert.async();

	var doc = document.createElement("div");
	var root = document.createElement("div");
	doc.appendChild(root);
	helpers.fixture.el().appendChild(doc);
	var clone = doc.cloneNode(true);

	var encoder = new MutationEncoder(doc);
	var patcher = new MutationPatcher(clone);

	var mo = new MutationObserver(function(records){
		var bytes = encoder.encode(records);
		patcher.patch(bytes);

		var tn = clone.querySelector('.product-desc').firstChild;
		assert.equal(tn.data, "New Classic – the classic, perfect retractable leash from flexi, featuring a stylish design and an ergonomic grip handle. It can be accessorized with Multi Box and LED Lighting System (for size S and up). With its innovative Short-Stroke Braking System, the New Classic creates a high level of safety and comfort during walks. The modern New Classic leashes are available as tape and cord models in sizes XS, S, M and M/L, each in red, blue, black or pink.",
			"Contains the full string");
		assert.ok(true);
		done();
	});
	mo.observe(root, { subtree: true, childList: true });

	let li = document.createElement("li");
	li.setAttribute("id", "product-3");
	li.innerHTML = '<aside><img class="product-image" src="https://images-na.ssl-images-amazon.com/images/I/61EYu9vPcQL._SL1500_.jpg" alt="The product"></aside><div class="product-info"><header><h1>Retractable Leash</h1></header><div class="product-desc">New Classic – the classic, perfect retractable leash from flexi, featuring a stylish design and an ergonomic grip handle. It can be accessorized with Multi Box and LED Lighting System (for size S and up). With its innovative Short-Stroke Braking System, the New Classic creates a high level of safety and comfort during walks. The modern New Classic leashes are available as tape and cord models in sizes XS, S, M and M/L, each in red, blue, black or pink.</div></div>';

	root.appendChild(li);
});
