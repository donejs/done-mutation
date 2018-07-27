
exports.fixture = {
	clear: function(){
		this.el().innerHTML = '';
	},
	el: function(){
		return document.getElementById('qunit-fixture');
	}
};
