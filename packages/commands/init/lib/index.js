'use strict';



function init(projectName, cmdObj) {
  console.log('init', projectName,  process.env.CLI_TARGET_PATH)
  return 'Hello from init';
}

module.exports = init