const core= require('@actions/core');
const github= require('@actions/github');

async function main(){
    let canContinue = true;
    console.log('[INFO] Initializing for function execution...');
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
            canContinue = false;
            core.setFailed(`"eventName" [${context.eventName}] is not valid`);            
            break;
    }

    if(isNaN(PR_NUM) || PR_NUM === 0){
        canContinue = false;
        core.setFailed(`INVALID Pull-Request provided.[PR#${PR_NUM}]`);        
    }
    else{        
        let prdata = null;
        let filesInPR = [];
        canContinue = false;
        try{
            
            console.log(`[DEBUG] Pull-Request [${PR_NUM}] number is valid. Extracting PR details`);            
            let pull_request = await octokit.request(`GET /repos/${repo.owner.login}/${repo.name}/pulls/${PR_NUM}`, {
                owner: repo.owner.login,
                repo: repo.name,
                pull_number: PR_NUM
            });
            
            if(pull_request){
                console.log(`[DEBUG] Extracted Pull-Request [${PR_NUM}]`);
                // console.log(JSON.stringify(pull_request));
                prdata = pull_request.data;
                if(prdata)
                    canContinue = true;                
            }

            /*
                Get list of all files changed in the PR
            */

            if(canContinue){                
                console.log(`[DEBUG] Requesting Files In PR @ /repos/${repo.owner.login}/${repo.name}/pulls/${PR_NUM}/files`);
                let pull_request_files = await octokit.request(`GET /repos/${repo.owner.login}/${repo.name}/pulls/${PR_NUM}/files`, {
                    owner: repo.owner.login,
                    repo: repo.name,
                    pull_number: PR_NUM
                    });
                            
                try{
                    if(pull_request_files)
                        filesInPR.push(pull_request_files.data.map(itm => {
                            return { name: itm.filename, sha: itm.sha, status: itm.status, blob: itm.blob_url, raw: itm.raw_url }
                    }))
                }catch(error){
                    console.log(`Failed to extract files in PR. [${error.message}]`);
                    console.log(JSON.stringify(pull_request_files));
                    canContinue = false;
                }finally{
                    console.log(`[DEBUG] Found ${filesInPR.length} file(s) in PR:${PR_NUM}`);
                    canContinue = filesInPR.length > 0;
                }
            }

            /*
                Process files found in PR
            */
            if(canContinue){
                console.log(`[INFO] Extracted ${filesInPR.length} files in Pull-Request [${PR_NUM}]`);
            }
            else{
                console.log(`[ERROR] There are 0 files extracted the PR details`)
                core.setFailed(`There are 0 files extracted the PR details`); 
            }
        }catch(error){
            console.log(repo)
            console.log(`[ERROR] Something was wrong in executing this action. Please check the logs above. [${error.message}]`);
        }
        finally{
            console.log('[INFO] Ending function execution...');
        }
    }
}

async function ValidateFilesInPR(data){
    
}

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