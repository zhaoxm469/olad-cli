import fs from "fs";
import { simpleGit } from "simple-git";
import { replaceImageName } from "./util.js";
import { PROJECT_PATH, QA_PROJECT_REPO_YML_MAP } from "./configs.js";

export async function modifyEnvRepoYmlConfig(
  projectName,
  dockerImgVersion,
  envVar
) {
  console.log({ projectName, dockerImgVersion, envVar });

  const ymlFileNameMapping =
    QA_PROJECT_REPO_YML_MAP[projectName] || projectName;

  const getGitRepoPath = (envVar) => `${PROJECT_PATH}cluster-${envVar}/`;

  const ymlConfigPath = `${getGitRepoPath(
    envVar
  )}deploy/release/${ymlFileNameMapping}.yml`;

  const repositoryPath = getGitRepoPath(envVar);

  const git = simpleGit(repositoryPath);

  const update = await git.pull();

  if (update && update.summary.changes) {
    console.log("代码已更新，进行拉取");
    console.log("拉取摘要:", update.summary);
  } else {
    console.log("代码已是最新，无需拉取");
  }

  if (!fs.existsSync(ymlConfigPath)) {
    console.log(`\n❌
      找不到ymlConfigPath路径的文件：\n${ymlConfigPath}\n
      请检查 configs.js -> QA_PROJECT_REPO_YML_MAP 变量是否存在映射关系\n
      /Users/zhaoxingming/zhaoxm/olad/npm/olad-cli/src/jenkins/configs.js\n
    `);
    return;
  }

  // 读取文件内容
  const ymlConfigContent = fs.readFileSync(ymlConfigPath, "utf-8");

  // 替换docker版本号
  const newYmlContent = replaceImageName(ymlConfigContent, dockerImgVersion);

  if (newYmlContent === ymlConfigContent) {
    console.log("❌ 注意！仓库yml 文件无修改", "ymlFilePath:" + ymlConfigPath);
  }

  // 写入文件
  fs.writeFileSync(ymlConfigPath, newYmlContent, "utf-8");

  console.log(`git add ${ymlConfigPath}`);
  await git.add(ymlConfigPath);

  console.log(`git commit : 修改版本号 ${dockerImgVersion}`);
  await git.commit(`修改版本号 ${dockerImgVersion}`);

  console.log(`git push 推送到远程`);
  await git.push(["-u", "origin", "master"]);

  return "ok";
}
