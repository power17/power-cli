"use strict"
const Command = require("@power-cli/command")
class PublishCommand extends Command {
  init() {
    console.log("init")
  }
  exec() {
    console.log("exec")
  }
}

function publish(argv) {
  return new PublishCommand(argv)
}

module.exports.PublishCommand = PublishCommand
module.exports = publish
