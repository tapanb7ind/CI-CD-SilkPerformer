const core= require('@actions/core');
const github= require('@actions/github');

async function main(){
    let canContinue = true;
    console.log('[INFO] Initializing for function execution...');
    const GITHUB_TOKEN = core.getInput('GITHUB_TOKEN');    
    const octokit = github.getOctokit(GITHUB_TOKEN);
    console.log('Getting execution context..');
    const { context = {} } = github;    
    let repo =  context.payload.repository;
    let _reason = null;
    /* Default values required when action is executed on PR activity */
    let PRTitleValidationRequired = true;
    let regexpattern = ''    
    let scriptTypeAllowedExtensionsCSV = '.bdf,.bdh'
    let dataTypeAllowedExtensionsCSV = '.csv,.dll,.txt,.exe,.config'
    /* END */

    let PR_NUM = 0;
    switch(context.eventName.toLowerCase()){
        case "workflow_dispatch":
            console.log(`[Debug] Executing as "workflow_dispatch". [Pull Request# ${context.payload.inputs.prNum}]. Default action params will be overwritten`);
            PR_NUM = parseInt(context.payload.inputs.prNum);
            PRTitleValidationRequired = context.payload.inputs.PRTitleValidationRequired.toLowerCase() === 'true';
            regexpattern = context.payload.inputs.prTitleTemplate;
            scriptTypeAllowedExtensionsCSV = '.bdf,.bdh'
            dataTypeAllowedExtensionsCSV = '.csv,.dll,.txt,.exe,.config'
            break;
        case "pull_request":
            console.log(`[Debug] Executing as "pull_request". [Pull Request# ${context.payload.number}]`);
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
            
            console.log(`[Debug] Pull-Request [${PR_NUM}] number is valid. Extracting PR details`);
            let pull_request = await octokit.request(`GET /repos/${repo.owner.login}/${repo.name}/pulls/${PR_NUM}`, {
                owner: repo.owner.login,
                repo: repo.name,
                pull_number: PR_NUM
            });
            
            if(pull_request){
                console.log(`[Debug] Extracted Pull-Request [${PR_NUM}]`);
                // console.log(JSON.stringify(pull_request));
                prdata = pull_request.data;
                if(PRTitleValidationRequired){
                    if(ValidatePRTitle(prdata.title, regexpattern)){
                        console.log(`[Debug] PR Title validation successful.[Title:'${prdata.title}', Regex: ${regexpattern}]`)
                        if(prdata)
                            canContinue = true;
                    }
                    else{
                        canContinue = false;
                        core.setFailed(`PR Title validation failed. [Title:'${prdata.title}', Regex: ${regexpattern}]`);
                        _reason = `PR Title validation failed. [Title:'${prdata.title}', Regex: ${regexpattern}]`
                        return;
                    }
                }
                else{
                    console.log(`[WARNING] Pull-Request Title validation is DISABLED`);
                    canContinue = true;
                }
            }
            else{
                core.setFailed(`Failed to get Pull-Request. Please retry`);
                _reason = `Failed to get Pull-Request. Please retry`
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
                let validFileExtensions = [];
                if(prProps){
                    console.log(`[Debug] Props from PR-Title [IH:${prProps.IH}, Test UUID: ${prProps.testuuid}, Update Type: ${prProps.updatetype}]`);
                    validFileExtensions = prProps.updatetype.toLowerCase().includes('script') ? scriptTypeAllowedExtensionsCSV : dataTypeAllowedExtensionsCSV;
                    console.log(`[Debug] Validating Files as per props from PR-Title [Allowed Extensions:${validFileExtensions}]`)
                }
                else{
                    core.setFailed(`Failed to get Props to validate files in PR`);
                    _reason = `Failed to get Props to validate files in PR`;
                    return;
                }

                /* Validate if any files are from different project folder */
                console.log(`[Debug] Validating if PR contains updates to multiple projects`)
                let projectInFile = filesInPR.map(item => item.project).filter((value, index, self) => self.indexOf(value) === index)                
                if(projectInFile.length > 1){
                    canContinue = false;
                    core.setFailed(`More than 1 project changes are not allowed in a single PR`);
                    _reason = `More than 1 project changes are not allowed in a single PR`;
                    console.log(projectInFile);
                    filesInPR.forEach(file => {                        
                        console.log(file)
                    });
                    return;
                }
                else
                    canContinue = true;
                
                if(canContinue){
                    let validatedFiles = ValidateFiles(filesInPR, validFileExtensions);
                    if(validatedFiles.find(item => item.isAllowedExtension === false)){
                        core.setFailed(`1 or more files in the PR are not included in the 'allowed' list [${validFileExtensions}]`);
                        _reason = `1 or more files in the PR are not included in the 'allowed' list [${validFileExtensions}]`;
                        return;
                    }                    
                }
            }
            else{
                console.log(`[ERROR] There are 0 files extracted the PR details`)
                console.log(filesInPR);
                core.setFailed(`There are 0 files extracted the PR details`); 
                _reason = `There are 0 files extracted the PR details`;
            }
        }catch(error){
            console.log(`[ERROR] Something was wrong in executing this action. Please check the logs above. [${error.message}]`);
            console.log(`Repo:\n${JSON.stringify(repo)}`);
            core.setFailed(`There was an error completing the Action Execution`);
        }
        finally{
            if(PR_NUM > 0)
                PostCommentToPR(octokit, repo.owner.login, repo.name, PR_NUM, _reason, _reason === null ? "Completed" : "Failed");
            console.log('[INFO] Ending function execution...');
        }
    }
}

async function PostCommentToPR(_octokit, _owner, _repo, _pr, reason, reviewStatus){
    let _body = `<b>Initial Review ${reviewStatus}.<b><br/>Reason: ${reason}`
    console.log(`[Debug] Posting comment for PR#${_pr} @ /repos/${_owner}/${_repo}/pulls/${_pr}/comments`);
    let response = await _octokit.request(`POST /repos/${_owner}/${_repo}/pulls/${_pr}/comments`, {
                            owner: _owner,
                            repo: _repo,
                            pull_number: _pr,
                            body: _body
                        });
    if(response.data){
        console.log(`[Debug] Comment ${response.data.body} posted to PR`);
    }
}

function ValidateFiles(filelist, allowedExtensions){
    let validatedFileList = filelist.map(file => {
                                console.log(`[Debug] Validating file. [${file.name}, type:${file.filetype}]`);                                
                                file.isAllowedExtension = allowedExtensions.includes(file.filetype);
                                if(!file.isAllowedExtension)
                                    core.warning(`File extension [${file.filetype}] is invalid as defined in the allowed extensions for this type of Pull-Request`)
                                return file;
                            });
    return validatedFileList;
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
    console.log(`[Debug] Requesting Files In PR#${_pr} @ /repos/${_owner}/${_repo}/pulls/${_pr}/files`);
    let pull_request_files = await _octokit.request(`GET /repos/${_owner}/${_repo}/pulls/${_pr}/files`, {
        owner: _owner,
        repo: _repo,
        pull_number: _pr
        });
                
    try{
        if(pull_request_files){
            console.log(`[Debug] Printing file information for all files in PR`)
            pull_request_files.data.forEach((itm) => {
                // console.log(itm);
                filesInPR.push(
                    { 
                          name: itm.filename
                        , sha: itm.sha
                        , status: itm.status
                        , blob: itm.blob_url
                        , raw: itm.raw_url 
                        , filetype: itm.filename.substr(itm.filename.lastIndexOf('.'))
                        , project: itm.filename.substr(0,itm.filename.indexOf('/'))
                    })
            })
        }
    }catch(error){
        console.log(`Failed to extract files in PR. [${error.message}]`);
        console.log(JSON.stringify(pull_request_files));
        canContinue = false;
    }finally{
        console.log(`[Debug] Found ${filesInPR.length} file(s) in PR:${_pr}`);
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