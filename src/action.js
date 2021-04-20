const core= require('@actions/core');
const github= require('@actions/github');

async function main(){
    console.log('Initializing for function execution...');
    const GITHUB_TOKEN = core.getInput('GITHUB_TOKEN');    
    const octokit = github.getOctokit(GITHUB_TOKEN);
    console.log('Getting execution context..');
    const { context = {} } = github;
    // const { pull_request } =  context.payload;
    let repo =  context.payload.repository;
    let PR_NUM = 0;
    switch(context.eventName.toLowerCase()){
        case "workflow_dispatch":
            console.log(`[DEBUG] Executing as "workflow_dispatch". [Pull Request# ${context.payload.inputs.prNum}]`);            
            PR_NUM = parseInt(context.payload.inputs.prNum);
            break;
        case "pull_request":
            console.log(`[DEBUG] Executing as "pull_request". [Pull Request# ${context.payload.number}]`);
            PR_NUM = parseInt(context.payload.number)
            break;
        default:            
            console.log(context);
            core.setFailed(`"eventName" [${context.eventName}] is not valid`);            
            break;
    }

    if(isNaN(PR_NUM) || PR_NUM === 0){
        core.setFailed(`INVALID Pull-Request provided.[PR#${PR_NUM}]`);
    }
    else{        
        try{
            console.log(`[DEBUG] Pull-Request [${PR_NUM}] number is valid. Extracting PR details`);
            let pull_request = await octokit.request(`GET /repos/${repo.owner.login}/${repo.name}/pulls/${PR_NUM}`, {
                owner: repo.owner.login,
                repo: repo.name,
                pull_number: PR_NUM
            });            
            if(pull_request){
                console.log(`[DEBUG] Extracted Pull-Request [${PR_NUM}]`);
                console.log(pull_request);
            }
        }catch(error){
            console.log(repo)
            console.log(`[ERROR] Failed to get PR. [${error.message}]`);
        }
        finally{
            console.log('Ending function execution...');
        }
    }
}


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