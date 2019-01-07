var QUnit = require("steal-qunit");
var MutationEncoder = require("../encoder");
var MutationPatcher = require("../patch");
var helpers = require("./test-helpers");

QUnit.module("TextNodes", {
	afterEach: function(){
		helpers.fixture.clear();
	}
});

QUnit.test("Setting nodeValue", function(assert){
	var done = assert.async();

	var root = document.createElement("div");
	var article = document.createElement("article");
	article.appendChild(document.createTextNode("Article"));
	root.appendChild(article);
	helpers.fixture.el().appendChild(root);
	var clone = root.cloneNode(true);

	var encoder = new MutationEncoder(root);
	var patcher = new MutationPatcher(clone);

	var mo = new MutationObserver(function(records) {
		patcher.patch(encoder.encode(records));
		assert.equal(clone.textContent, "A title", "Patched correctly");
		done();
	});

	mo.observe(root, { childList: true, subtree: true, characterData: true });
	article.firstChild.nodeValue = "A title";
});

QUnit.test("Setting textContent", function(assert){
	var done = assert.async();

	var root = document.createElement("div");
	var article = document.createElement("article");
	article.appendChild(document.createTextNode("Article"));
	root.appendChild(article);
	helpers.fixture.el().appendChild(root);
	var clone = root.cloneNode(true);

	var encoder = new MutationEncoder(root);
	var patcher = new MutationPatcher(clone);

	var mo = new MutationObserver(function(records) {
		patcher.patch(encoder.encode(records));
		assert.equal(clone.textContent, "A title", "Patched correctly");
		done();
	});

	mo.observe(root, { childList: true, subtree: true, characterData: true });
	article.textContent = "A title";
});

QUnit.test("Deleting TextNodes", function(assert){
	var done = assert.async();

	var root = document.createElement("div");
	var article = document.createElement("article");
	var tn = document.createTextNode("Article");
	article.appendChild(tn);
	root.appendChild(article);
	helpers.fixture.el().appendChild(root);
	var clone = root.cloneNode(true);

	var encoder = new MutationEncoder(root);
	var patcher = new MutationPatcher(clone);

	var mo = new MutationObserver(function(records) {
		patcher.patch(encoder.encode(records));
		assert.equal(clone.firstChild.firstChild, null, "There is no child of article");
		done();
	});

	mo.observe(root, { childList: true, subtree: true, characterData: true });
	article.removeChild(tn);
});

QUnit.test("Large trees that exceed 255 index", function(assert) {
	var done = assert.async();

	var doc1 = document.implementation.createHTMLDocument("doc1");
	var doc2 = document.implementation.createHTMLDocument("doc2");

	function addDiv(doc, i) {
		var div = doc.createElement("div");
		div.textContent = i.toString();
		doc.body.appendChild(div);
	}

	for(var i = 0; i < 300; i++) {
		addDiv(doc1, i);
		addDiv(doc2, i);
	}

	var encoder = new MutationEncoder(doc1);
	var patcher = new MutationPatcher(doc2);

	var mo = new MutationObserver(function(records) {
		patcher.patch(encoder.encode(records));

		assert.equal(doc2.body.lastChild.firstChild.nodeValue, "new value", "updated the right node");

		done();
	});

	mo.observe(doc1, { childList: true, subtree: true, characterData: true });
	doc1.body.lastChild.firstChild.nodeValue = "new value";
});

QUnit.test("Changing nodeValue before parent is inserted", function(assert) {
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
		assert.equal(clone.textContent, "A title", "Patched correctly");
		done();
	});

	mo.observe(root, { childList: true, subtree: true, characterData: true });

	var article = document.createElement("article");
	article.appendChild(document.createTextNode("Article"));
	parent.appendChild(article);

	article.firstChild.nodeValue = "A title";
});

QUnit.test("Works with emojis", function(assert) {
	var done = assert.async();

	var root = document.createElement("div");
	var parent = document.createElement("section");
	parent.appendChild(document.createTextNode(""));
	root.appendChild(parent);
	helpers.fixture.el().appendChild(root);
	var clone = root.cloneNode(true);

	var encoder = new MutationEncoder(root);
	var patcher = new MutationPatcher(clone);

	var mo = new MutationObserver(function(records) {
		patcher.patch(encoder.encode(records));
		assert.equal(clone.firstChild.firstChild.nodeValue, "🏁", "emoji patched");
		done();
	});

	mo.observe(root, { childList: true, subtree: true, characterData: true });

	parent.firstChild.nodeValue = "🏁";
});

QUnit.test("Setting .data", function(assert){
	var done = assert.async();

	var root = document.createElement("div");
	var article = document.createElement("article");
	article.appendChild(document.createTextNode("Article"));
	root.appendChild(article);
	helpers.fixture.el().appendChild(root);
	var clone = root.cloneNode(true);

	var encoder = new MutationEncoder(root);
	var patcher = new MutationPatcher(clone);

	var mo = new MutationObserver(function(records) {
		patcher.patch(encoder.encode(records));
		assert.equal(clone.textContent, "A title", "Patched correctly");
		done();
	});

	mo.observe(root, { childList: true, subtree: true, characterData: true });
	Object.defineProperty(article.firstChild, "nodeValue", {
		value: undefined
	});
	article.firstChild.data = "A title";
});
