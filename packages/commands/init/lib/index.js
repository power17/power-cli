'use strict';



function init(projectName, cmdObj) {
  console.log('init', projectName, cmdObj)
  return 'Hello from init';
}

module.exports = init