import QUnit from 'steal-qunit';
import plugin from './done-mutation-serialize';

QUnit.module('done-mutation-serialize');

QUnit.test('Initialized the plugin', function(){
  QUnit.equal(typeof plugin, 'function');
  QUnit.equal(plugin(), 'This is the done-mutation-serialize plugin');
});
