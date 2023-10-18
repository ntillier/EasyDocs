declare module 'marked-extended-tables';
declare module 'marked-linkify-it';
declare module 'yargs/yargs';
declare module 'fastify';

/* Header */
type EasyDocsHeaderLink = {
  label: string;
  link: string;
}

type EasyDocsHeaderConfig = {
  title?: string;
  icon?: string;
  links?: EasyDocsHeaderLink[];
}


type EasyDocsConfig = {
  hostname?: string;
  title?: string;
  favicon?: string;
  header?: EasyDocsHeaderConfig,
  // meta?: any[];
}

