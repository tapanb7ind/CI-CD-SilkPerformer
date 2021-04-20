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

    /* Default values required when action is executed on PR activity */
    let PRTitleValidationRequired = true;
    let regexpattern = ''    
    let scriptTypeAllowedExtensionsCSV = '.bdf,.bdh'
    let dataTypeAllowedExtensionsCSV = '.csv,.dll,.txt,.exe,.config'
    /* END */

    let PR_NUM = 0;
    switch(context.eventName.toLowerCase()){
        case "workflow_dispatch":
            console.log(`[DEBUG] Executing as "workflow_dispatch". [Pull Request# ${context.payload.inputs.prNum}]. Default action params will be overwritten`);
            PR_NUM = parseInt(context.payload.inputs.prNum);
            PRTitleValidationRequired = context.payload.inputs.PRTitleValidationRequired.toLowerCase() === 'true';
            regexpattern = context.payload.inputs.prTitleTemplate;
            scriptTypeAllowedExtensionsCSV = '.bdf,.bdh'
            dataTypeAllowedExtensionsCSV = '.csv,.dll,.txt,.exe,.config'
            break;
        case "pull_request":
            console.log(`[DEBUG] Executing as "pull_request". [Pull Request# ${context.payload.number}]`);
            PR_NUM = parseInt(context.payload.number)
            PRTitleValidationRequired = true;
            regexpattern = 'IH-\\d+:[\\w\\-]{36}:type\\-[data|script]+:.+'
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
        return;      
    }
    else{        
        let prdata = null;
        let prProps = null;
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
                if(PRTitleValidationRequired){
                    if(ValidatePRTitle(prdata.title, regexpattern)){
                        console.log(`[DEBUG] PR Title validation successful.[Title:'${prdata.title}', Regex: ${regexpattern}]`)
                        if(prdata)
                            canContinue = true;
                    }
                    else{
                        canContinue = false;
                        core.setFailed(`PR Title validation failed. [Title:'${prdata.title}', Regex: ${regexpattern}]`);
                        return;
                    }
                }
                else{
                    console.log(`[WARNING] Pull-Request Title validation is DISABLED`);
                    canContinue = true;
                }
            }

            prProps = GetIhProps(prdata.title);
            /*
                Get list of all files changed in the PR
            */
            if(canContinue){
                filesInPR = await GetFilesInPR(octokit, repo.owner.login, repo.name, PR_NUM);
                canContinue = filesInPR.length > 0;                
            }
            /*
                Process files found in PR
            */
            if(canContinue){
                console.log(`[INFO] Extracted ${filesInPR.length} files in Pull-Request [${PR_NUM}]`);

                /* Validate if any files are from different project folder */
                console.log(`[DEBUG] Validating if PR contains updates to multiple projects`)
                let projectInFile = ''
                filesInPR.forEach(file => {
                    console.log(`[DEBUG] Validating file. [${file.name}]`);
                    console.log(file)
                });

                if(prProps){                    
                    console.log(`[DEBUG] Props from PR-Title [IH:${prProps.IH}, Test UUID: ${prProps.testuuid}, Update Type: ${prProps.updatetype}]`);
                    let validFileExtensions = prProps.updatetype.toLowerCase().includes('script') ? scriptTypeAllowedExtensionsCSV : dataTypeAllowedExtensionsCSV;
                    console.log(`[DEBUG] Validating Files as per props from PR-Title [Allowed Extensions:${validFileExtensions}]`)
                }
                else{
                    core.setFailed(`Failed to get Props to validate files in PR`);
                    return;
                }
            }
            else{
                console.log(`[ERROR] There are 0 files extracted the PR details`)
                console.log(filesInPR);
                core.setFailed(`There are 0 files extracted the PR details`); 
            }
        }catch(error){
            console.log(`[ERROR] Something was wrong in executing this action. Please check the logs above. [${error.message}]`);
            console.log(`Repo:\n${JSON.stringify(repo)}`);
        }
        finally{
            console.log('[INFO] Ending function execution...');
        }
    }
}

function GetIhProps(title){    
    try{
        let regexpattern = '(?<ih>IH\\-\\d+):(?<testuuid>[\\w\\-]{36}):type\\-(?<updatetype>[data|script]+):(?<rest>.+)'
        var found = title.match(regexpattern);
        if(found)
            return { IH: found[1], testuuid: found[2], updatetype: found[3], rest: found[4] }
    }catch(error){
        console.log(`[WARN] Failed to match RegexPattern [${regexpattern}] for pull_request title [${title}]`)
    }
    return null;
}

function ValidatePRTitle(title, regexpattern){    
    try{        
        return title.match(regexpattern).length >= 1;
    }catch(error){        
        console.log(`[WARN] Failed to match RegexPattern [${regexpattern}] for pull_request title [${title}]`)
    }
    return false;
}

async function GetFilesInPR(_octokit, _owner, _repo, _pr){
    let filesInPR = [];
    console.log(`[DEBUG] Requesting Files In PR @ /repos/${_owner}/${_repo}/pulls/${_pr}/files`);
    let pull_request_files = await _octokit.request(`GET /repos/${_owner}/${_repo}/pulls/${_pr}/files`, {
        owner: _owner,
        repo: _repo,
        pull_number: _pr
        });
                
    try{
        if(pull_request_files)
            pull_request_files.data.forEach((itm) => {
                filesInPR.push({ name: itm.filename, sha: itm.sha, status: itm.status, blob: itm.blob_url, raw: itm.raw_url })
        })
    }catch(error){
        console.log(`Failed to extract files in PR. [${error.message}]`);
        console.log(JSON.stringify(pull_request_files));
        canContinue = false;
    }finally{
        console.log(`[DEBUG] Found ${filesInPR.length} file(s) in PR:${_pr}`);
        return filesInPR;
    }
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