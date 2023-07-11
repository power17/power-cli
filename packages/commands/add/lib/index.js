'use strict';
const Command = require('@power-cli/command');
const { InitCommand } = require('@power-cli/init');

class AddCommand extends Command {
  init () {
    console.log('init')
    
  }
  exec () {
    console.log('exec')
    
  }
}
function add (argv) {
  return new AddCommand(argv)
}

module.exports = add
module.exports.AddCommand = AddCommand;


