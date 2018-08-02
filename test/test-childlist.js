var QUnit = require("steal-qunit");
var MutationEncoder = require("../encoder");
var MutationPatcher = require("../patch");
var MutationDecoder = require("../decoder");
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

	var encoder = new MutationEncoder(root);
	var decoder = new MutationDecoder(root.ownerDocument);

	var article = document.createElement("article");
	root.appendChild(article);

	var mo = new MutationObserver(function(records) {
		var instr = Array.from(decoder.decode(encoder.encode(records)));
		assert.equal(instr.length, 1, "There is one mutation instruction");
		assert.equal(instr[0].node.nodeName, "SPAN", "span mutation observed");
		done();
	});

	mo.observe(root, { subtree: true, childList: true });
	article.appendChild(document.createElement("span"));
});
