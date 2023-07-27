import { JENKINS_REPO_PATH, QA_MAP_DEPLOY } from "../jenkins/configs.js"
import { modifyEnvRepoYmlConfig } from "../jenkins/git.js"
import { createJenkins } from "../jenkins/util.js"

async function getCurrentJobItem (projectName,envName,jenkins){
  const jobs = await jenkins.getJenkinsJobs()

  const hasJobs = jobs.filter(item=>item.name.includes(projectName)) || []
  const jobItem = hasJobs[0]

  if(!jobItem) {
    return [`❌ jenkins cannot find "${projectName}" jobName , environment = ${envName}`]
  }

  if(hasJobs.length > 1) {
    hasJobs.forEach(item=>{
      delete item._class
      delete item.color
    })
    return [`❗️ jenkins 根据您输的 "${projectName}"，共${hasJobs.length}个项目 \n\n${JSON.stringify(hasJobs,null,4)}`]
  }

  delete jobItem._class
  delete jobItem.color
  
  return [null,jobItem]
}

async function modifyRepositoryConfig(projectName,dockerImgVersion,compileEnv){
  const compileEnvVars = compileEnv.split(",")
  for(let modifyEnv of compileEnvVars) {
    console.log(`\n修改${modifyEnv}仓库YML文件`)
    const ok = await modifyEnvRepoYmlConfig(projectName,dockerImgVersion,modifyEnv)
    if(ok) console.log(`\n✅ 操作成功，请通知测试人员构建${modifyEnv}环境 \n`)
  }
}

async function multiEnvironmentBuild(jobItem,compileEnv){
  console.log("\n开始准备在deploy进行构建生成docker版本号...\n")
  const deploy = JENKINS_REPO_PATH.deploy
  const jenkins = createJenkins(deploy)
  let deployName = QA_MAP_DEPLOY[jobItem.name] ? QA_MAP_DEPLOY[jobItem.name] : jobItem.name.replace("qa-","deploy-")
  const consoleLog = await jenkins.buildJenkinsJob(deployName)
  const dockerImgVersion =  jenkins.getDockerImageVersion(consoleLog)
  if(!dockerImgVersion) return console.log("❌ deploying docker image failed")
  console.log(`\n✅ dockerImgVersion: ${dockerImgVersion}`)
  await modifyRepositoryConfig(jobItem.name.replace("qa-",""),dockerImgVersion,compileEnv)
}

export async function jenkins(arg,options){
  
  const [ projectName,envName = 156,compileEnv ] = arg;

  let jobPath = JENKINS_REPO_PATH[envName]

  if(envName !== "to" && !jobPath) {
    console.error(`\n❌ JENKINS_REPO_PATH cannot find "${envName}" environment `)
    console.log("\n 请尝试命令：o j <project-name> <156|38> \n")
    return 
  }
  
  const jenkins = createJenkins(jobPath)

  const [error,jobItem] = await getCurrentJobItem(projectName,envName,jenkins)
  if(error) return console.log(error)

  if(options.not !== "38") await jenkins.buildJenkinsJob(jobItem.name)

  if(arg.length === 3 && envName=="to") multiEnvironmentBuild(jobItem,compileEnv)
}