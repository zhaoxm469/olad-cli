import { BASE_URL } from "./configs.js";
import { post, get } from "./fetch.js";
import { grayLog, greenLog, redLog } from "./log.js";

class Jenkins {
  jobPath = "";

  constructor(config) {
    this.jobPath = config.jobPath;
  }

  async getJenkinsJobs() {
    try {
      const response = await get(`/job/${this.jobPath}/api/json`);
      const { jobs } = response.data;
      // 打印构建任务列表
      return jobs;
    } catch (error) {
      console.error("Error:", error.message);
    }
  }

  // 执行构建
  async triggerJenkinsBuild(jobName) {
    const url = `/job/${this.jobPath}/job/${jobName}/build`
    try {
      const response = await post(url);
      const buildURL = response.headers["location"];
      return buildURL
    }catch(err){
      return redLog(`构建失败，请检查生成的urlPath：${url}`)
    }
  }

  async build(jobName){
    const buildURL = await this.triggerJenkinsBuild(jobName)
    const jenkinsBuild = `\n${BASE_URL}/job/${this.jobPath}/job/${jobName}\n`
    greenLog(`正在构建 ， jenkins 任务地址为：${jenkinsBuild}`)
    return this.getBuildLog(buildURL)
  }


  getDockerImageVersion(str) {
    const pattern = /镜像名称: (\S+)/;
    const match = str.match(pattern);
    let imageName = "";
    if (match) {
      imageName = match[1];
    }
    return imageName;
  }

  // 轮询获取构建状态和日志
  async getBuildLog(buildURL) {
    try {
      while (true) {
        const response = await get(buildURL + "/api/json");

        const queueItem = response.data;
        const { executable, cancelled, task ,result } = queueItem;

        // 检查构建状态和结果
        if (cancelled) {
          return Promise.resolve(["取消构建"],null)
        } else if (executable) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
          const buildURL = executable.url;
          const buildResponse = await get(buildURL + "/api/json");
          const build = buildResponse.data;
          const { building, result } = build;
          const logResponse = await get(buildURL + "/consoleText");

          const log = logResponse.data;

          console.log("\n Build Log:", log);

          // 检查构建结果
          if (building) {
            console.log("Build is still in progress...");
          } else if (result === "SUCCESS") {
            return Promise.resolve([null,logResponse.data.slice(-500)]);
          } else{
            return Promise.resolve([`❌ Build failed! ${task.url}`,logResponse.data.slice(-500)]);
          }
        } else {
          console.log("Waiting for build to start...");
          await new Promise((resolve) => setTimeout(resolve, 5000)); // 5秒钟轮询一次
        }
      }
    } catch (error) {
      console.error("Error:", error.message);
    }
  }
}

export function createJenkins(jobPath) {
  return new Jenkins({
    jobPath,
  });
}

export function replaceImageName(content, newImageLine) {
  newImageLine = `        image: ${newImageLine}`;
  const lines = content.split("\n");
  const updatedContent = [];
  let inImageBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.trim().startsWith("image:")) {
      if (!inImageBlock) {
        inImageBlock = true;
        updatedContent.push(newImageLine);
      }
    } else {
      inImageBlock = false;
      updatedContent.push(line);
    }
  }

  return updatedContent.join("\n");
}
