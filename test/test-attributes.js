var QUnit = require("steal-qunit");
var MutationEncoder = require("../encoder");
var MutationPatcher = require("../patch");
var MutationDecoder = require("../decoder");
var helpers = require("./test-helpers");

QUnit.module("Attributes", {
	afterEach: function(){
		helpers.fixture.clear();
	}
});

QUnit.test("Setting attributes", function(assert){
	var done = assert.async();

	var root = document.createElement("div");
	var article = document.createElement("article");
	article.setAttribute("foo", "bar");
	root.appendChild(article);
	helpers.fixture.el().appendChild(root);
	var clone = root.cloneNode(true);

	var encoder = new MutationEncoder(root);
	var patcher = new MutationPatcher(clone);

	var mo = new MutationObserver(function(records) {
		patcher.patch(encoder.encode(records));
		assert.equal(clone.firstChild.getAttribute("foo"), "baz", "it is now baz");
		done();
	});

	mo.observe(root, { subtree: true, attributes: true });
	article.setAttribute("foo", "baz");
});

QUnit.test("Removing attributes", function(assert){
	var done = assert.async();

	var root = document.createElement("div");
	var article = document.createElement("article");
	article.setAttribute("foo", "bar");
	root.appendChild(article);
	helpers.fixture.el().appendChild(root);
	var clone = root.cloneNode(true);

	var encoder = new MutationEncoder(root);
	var decoder = new MutationDecoder(root.ownerDocument);
	var patcher = new MutationPatcher(clone);

	var mo = new MutationObserver(function(records) {
		var mutations = Array.from(decoder.decode(encoder.encode(records)));
		assert.equal(mutations.length, 1, "There was one mutation");

		patcher.patch(encoder.encode(records));
		assert.equal(clone.firstChild.getAttribute("foo"), undefined);
		done();
	});

	mo.observe(root, { subtree: true, attributes: true });
	article.removeAttribute("foo");
});

QUnit.test("Setting attributes after a node is inserted", function(assert) {
	var done = assert.async();

	var root = document.createElement("div");
	var parent = document.createElement("section");
	root.appendChild(parent);
	helpers.fixture.el().appendChild(root);
	var clone = root.cloneNode(true);

	var encoder = new MutationEncoder(root);
	var patcher = new MutationPatcher(clone);

	var mo = new MutationObserver(function(records) {
		patcher.patch(encoder.encode(records));
		assert.equal(clone.firstChild.firstChild.getAttribute("id"), "my-id");
		done();
	});

	mo.observe(root, { childList: true, subtree: true, attributes: true });

	var article = document.createElement("article");
	article.appendChild(document.createTextNode("Article"));
	parent.appendChild(article);

	article.setAttribute("id", "my-id");
});
