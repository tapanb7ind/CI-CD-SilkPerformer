# This repo has code to auto verify the GIT commits for a silk-performer based tool scripts/data files. #

Main repo should not contain any file/folders. 
We'll keep this clean so that we can create branches later in the future. Keeping this main/master branch clean will reduce the size of the repo.

Each product will have a separate branch. The base (Lightning) branch will be protected. 2 branches will be made from this base/Lightning branch
1. Allowed to create PR for scripts/ltp
2. Allowed to create PR for datafiles


Refer to [this comment](https://github.com/tapanb7ind/GitHubActionDemo/pull/11#issuecomment-824879663 "Comment Sample") for a comment sample.


## Goal ##
1. Let engineers edit and push script/data file changes to repo. These changes are for E2E/sandbox environment.
2. Any changes to scrits/data files for final release environment (pre-prod/performance) should be approved and merged after PR review.



## Plan ##
1. Create master branch with no files/folders
2. Create Develop/Lightning branch
3. Create 1 folder for each product. This folder will contain Scripts/Data files for this product only

At this point all scripts/data files for the supported products are commited to the Develop branch.

4. Create new branch from Develop. Name this branch **E2E**
5. Update script/data files in this branch. 

*Note
If a product requires different setup e.g., Rave -> Rave CDN, Rave SecurityPatching. 
In this case add a read me file to this specific folder adding detais about the purpose of creating a separate folder. On completion of task, these branches **should be DELETED** if there is no further use for these branches*


## PR Rules ##
1. **No PRs allowed from E2E to Develop**
2. PR should follow the following naming convention
   IH-xxxxx:UUID:type-\[script or data] :description
   * Example: ***IH-12345:a7a65740-967d-4e6d-8ce5-4b17a98946c5:type-script:login script change***
3. Separate PRs will be required for scripts and data files.
4. Each PR should contain changes for a single folder (product). PR containing changes to multiple folders will be **REJECTED**
5. You **must follow** PR naming convention to have the PR approved.

## Workflow ##
#### Scenario#1 : Login script modified ####
- [ ] step1: Create a new branch from E2E branch
- [ ] step2: Update script(s)
- [ ] step3: Push script changes to this new branch
- [ ] step4: Initiate test run using on-demand Performance testing tool (optional)
- [ ] step5: Check results. On error go to step2.
- [ ] step6: When no error, create PR to E2E branch. Provide mandatory information required for PR
- [ ] step7: Review and merge changes
- [ ] step8: **Delete branch**

Follow the next steps to push these changes to Develop/Lightning branch. ***Next steps requires the Lightning environment to be updated to support the script changes***
- [ ] step9: Create new branch from Develop/Lightning branch
- [ ] step10: Commit script changes to this branch
- [ ] step11: Initiate test run using on-demand performance testing tool
- [ ] step12: Check resuts. On error go to step #10 and verify scripts/errors on local machine
- [ ] step13: When no error, create PR to Lightning branch. Provide mandatory information required for PR
- [ ] step14: Review and merge changes
- [ ] step15: **Delete branch**


#### Scenario#2 : Data file for Login modified ####
