const core= require('@actions/core');
const github= require('@actions/github');

async function main(){
    console.log('Initializing for function execution...');
    const GITHUB_TOKEN = core.getInput('GITHUB_TOKEN');    
    const octokit = github.getOctokit(GITHUB_TOKEN);
    console.log('Getting execution context..');
    const { context = {} } = github;
    const { pull_request } =  context.payload;
    let PR_NUM = 0;

    switch(github.eventName.toLowerCase()){
        case "workflow_dispatch":
            console.log(`[DEBUG] Executing as "workflow_dispatch". [Pull Request# ${github.payload.inputs.prNum}]`);            
            PR_NUM = parseInt(github.payload.inputs.prNum);
            break;
        case "pull_request":
            console.log(`[DEBUG] Executing as "pull_request". [Pull Request# ${github.payload.inputs.prNum}]`);
            PR_NUM = parseInt(github.payload.inputs.prNum)
            break;
        default:
            core.setFailed(`"eventName" [${github.eventName}] is not valid`);
            break;
    }

    if(isNaN(PR_NUM) || PR_NUM === 0){
        core.setFailed(`INVALID Pull-Request provided.[PR#${PR_NUM}]`);
    }
    else{
        console.log(`[DEBUG] Pull-Request [${PR_NUM}] number is valid. Continuing with validation`);
        // await GetCommitsInPR(PR_NUM);
    }
}

// async function GetPRByNumber(pull_request_number){

//     return null;
// }

// async function GetCommitsInPR(pull_request_number){
//     return null;
// }

async function run(){
    try{
        // console.log('Initializing for function execution...');
        const GITHUB_TOKEN = core.getInput('GITHUB_TOKEN');    
        const octokit = github.getOctokit(GITHUB_TOKEN);
        // console.log('Getting context..');
        const { context = {} } = github;
        const { pull_request } =  context.payload;

        console.log('Starting function execution...');
        console.log(JSON.stringify(context));
        console.log(JSON.stringify(octokit));
        await octokit.issues.createComment({
            ...context.repo,
            issue_number: pull_request.issue_number,
            body: 'Thank you for submitting a pull request. This will be reviewed using GitHub Actions'
        })
        // console.log()
    }catch(error){console.log(`Error in execution: ${error.message}`)}
    finally{
        console.log('Ending function execution...');
    }
}

main();