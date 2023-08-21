import chalk from "chalk";

type LogType = 'error' | 'success' | 'info';

const colorText = (type: LogType, text: string): string => {
  switch (type) {
    case 'error':
      return chalk.red(text);
    case 'info':
      return chalk.blue(text);
    case 'success':
      return chalk.green(text);
  }
}

export function log (type: LogType, content: string) {
  console.log(
    `- ${ colorText(type, type) } ${content}`
  );
}