var QUnit = require("steal-qunit");
var MutationEncoder = require("../encoder");
var MutationPatcher = require("../patch");
var MutationDecoder = require("../decoder");
var NodeIndex = require("../index");
var helpers = require("./test-helpers");

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
