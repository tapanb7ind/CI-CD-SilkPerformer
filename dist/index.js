/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ 849:
/***/ ((module) => {

module.exports = eval("require")("@actions/core");


/***/ }),

/***/ 0:
/***/ ((module) => {

module.exports = eval("require")("@actions/github");


/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __nccwpck_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		var threw = true;
/******/ 		try {
/******/ 			__webpack_modules__[moduleId](module, module.exports, __nccwpck_require__);
/******/ 			threw = false;
/******/ 		} finally {
/******/ 			if(threw) delete __webpack_module_cache__[moduleId];
/******/ 		}
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat */
/******/ 	
/******/ 	if (typeof __nccwpck_require__ !== 'undefined') __nccwpck_require__.ab = __dirname + "/";/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be isolated against other modules in the chunk.
(() => {
const core= __nccwpck_require__(849);
const github= __nccwpck_require__(0);

async function run(){
    console.log('Initializing for function execution...');
    const GITHUB_TOKEN = core.getInput('GITHUB_TOKEN');    
    const octokit = github.getOctokit(GITHUB_TOKEN);
    console.log('Getting context..');
    const {context = {} } = github;
    const { pull_request } =  context.payload;

    console.log('Starting function execution...');

    await octokit.issues.createComment({
        ...context.repo,
        issue_number: pull_request.issue_number,
        body: 'Thank you for submitting a pull request. This will be reviewed using GitHub Actions'
    })
    // console.log()
    console.log('Ending function execution...');
}

run();
})();

module.exports = __webpack_exports__;
/******/ })()
;