import { program } from 'commander';
import { jenkins } from "./command/jenkins-job.js"

// 定义子命令 "jenkins"
program
  .command('j <jenkins-job...>')
  .description('Specify the Jenkins job name')
  .option('-n, --not <value>', 'exclude from the options', '') // 添加 options 配置
  .action(jenkins)

// 定义子命令 "other"
program
  .command('other <arg>')
  .description('Other command')
  .action((arg) => {
    console.log(`Other command argument: ${arg}`);
  });

program.parse(process.argv);