import { BASE_URL } from "./configs.js";
import { post,get } from "./fetch.js"

class Jenkins {

  jobPath = ""

  constructor (config){
    this.jobPath = config.jobPath
  }

  async getJenkinsJobs(){
    try {
      const response = await get(`/job/${this.jobPath}/api/json`);
      const { jobs } = response.data;
      // 打印构建任务列表
      return jobs
    } catch (error) {
      console.error('Error:', error.message);
    }
  }

  // 执行构建
  async buildJenkinsJob(jobName){
    try {
      const response = await post(`/job/${this.jobPath}/job/${jobName}/build`);
      const buildURL = response.headers['location'];
      console.log('✅ Build triggered successfully!',`\n${BASE_URL}/job/${this.jobPath}/job/${jobName}\n`);
      return await this.pollBuildStatus(buildURL)
    } catch (error) {
      console.log('\n❌ Build failed!\n');
    }
  }

  getDockerImageVersion(str){
    const pattern = /镜像名称: (\S+)/;
    const match = str.match(pattern);
    let imageName = ""
    if (match) {
      imageName = match[1];
    }
    return imageName
  }

  // 轮询获取构建状态和日志
  async pollBuildStatus(queueItemURL){
    try {
      while (true) {
        const response = await get(queueItemURL + '/api/json');

        const queueItem = response.data;
        const { executable, cancelled, result } = queueItem;
  
        // 检查构建状态和结果
        if (cancelled) {
          console.log('Build was cancelled.');
          break;
        } else if (executable) {
          await new Promise(resolve => setTimeout(resolve, 2000)); 
          const buildURL = executable.url;
          const buildResponse = await get(buildURL + '/api/json');
          const build = buildResponse.data;
          const { building, result } = build;
          const logResponse = await get(buildURL + '/consoleText');

          const log = logResponse.data;
          console.clear();
          console.log('Build Log:', log);
  
          // 检查构建结果
          if (building) {
            console.log('Build is still in progress...');
          } else if (result === 'SUCCESS') {
            console.clear()
            console.log('\n✅ Build succeeded!');
            return Promise.resolve(logResponse.data.slice(-100));
          } else {
            console.log('\n❌ Build failed!\n','\n  ',buildURL+"console","\n");
            return Promise.reject()
          }
        } else {
          console.log('Waiting for build to start...');
          await new Promise(resolve => setTimeout(resolve, 5000)); // 5秒钟轮询一次
        }
      }
    } catch (error) {
      console.error('Error:', error.message);
    }
  }
}

export function createJenkins(jobPath){
  return new Jenkins({
    jobPath
  })
}

export function replaceDockerVersion (content,version){
  // 使用正则表达式进行匹配和替换
  const regex = /registry\.cn-beijing\.aliyuncs\.com\/zhicun\/olading-hro-front:hro-feature-1004244-eeae895a/g;
  const replacedString = content.replace(regex, version);
  return replacedString
}