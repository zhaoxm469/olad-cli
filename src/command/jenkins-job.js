import { JENKINS_REPO_PATH, deployNameMap } from "../jenkins/configs.js"
import { modifyEnvRepoYmlConfig } from "../jenkins/git.js"
import { grayLog, greenLog, redLog, yellowLog } from "../jenkins/log.js"
import { createJenkins } from "../jenkins/util.js"

async function getCurrentJobItem (projectName,envName,jenkins){
  const jobs = await jenkins.getJenkinsJobs()

  const hasJobs = jobs.filter(item=>item.name.includes(projectName)) || []
  const objNameMap = hasJobs.reduce((a,b)=>{
    a[b.name] = b 
    return a
  },{})

  const jobItem = objNameMap[projectName] || hasJobs[0]

  if(!jobItem) {
    return [`❌ jenkins cannot find "${projectName}" jobName , environment = ${envName}`]
  }

  if(hasJobs.length > 1 && !objNameMap[projectName]) {
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
    const [err] = await modifyEnvRepoYmlConfig(projectName,dockerImgVersion,modifyEnv)
    if(err) return yellowLog(`${err} ，检查qa->deploy jenkins 分支是否正确 \n `)
    greenLog(`\n✅ 操作成功，请通知测试人员构建${modifyEnv}环境 \n`)
  }
}

async function multiEnvironmentBuild(jobItem,compileEnv){
  const jenkinsProjectName = jobItem.name 
  greenLog(`1. 开始准备在deploy进行构建生成docker版本号...`)
  const deploy = JENKINS_REPO_PATH.deploy
  const jenkins = createJenkins(deploy)
  let deployName = deployNameMap[jenkinsProjectName] || jenkinsProjectName.replace("qa-","deploy-")
  greenLog(`2. deploy项目任务名称：${deployName}`)

  greenLog(`3. 触发jenkins构建`)
  const buildURL = await jenkins.triggerJenkinsBuild(deployName)
  greenLog(`buildURL：${buildURL}`)

  greenLog(`输出 jenkins 构建日志 \n `)

  const [logErrMsg,buildLog] = await jenkins.getBuildLog(buildURL)
  if(logErrMsg) return redLog(logErrMsg)

  const dockerImgVersion = jenkins.getDockerImageVersion(buildLog)
  if(!dockerImgVersion) return redLog(`deploy根据buildLog 解析失败 buildLog->${buildLog}`)
  greenLog(`4. deploy项目任务名称：${deployName} 镜像版本为：\n   ${dockerImgVersion}`)

  modifyRepositoryConfig(jobItem.name.replace("qa-",""),dockerImgVersion,compileEnv)
}

export async function action(arg,options){
  
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


  // o j qa-salary-front to 46 -n 38 , 不打包38环境 ， 直接从 deploy 构建到 36 
  if(options.not === "38") {
    return multiEnvironmentBuild(jobItem,compileEnv)
  }
  
  const [errMsg] = await jenkins.build(jobItem.name)
  if(errMsg) return redLog(errMsg)
  
  if (envName === "to" && compileEnv ) {
    multiEnvironmentBuild(jobItem,compileEnv)
  }
}