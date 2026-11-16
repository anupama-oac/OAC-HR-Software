// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
// apiUrl: 'https://leeds-api.aerohr.in',
  // faviconPath: 'leeds.png',
  // company: 'leeds',
  //  apiUrl: 'https://oac-api.aerohr.in',
  faviconPath: 'oac.png',
  company: 'oac',
  apiUrl:'https://oacnew-api.aerohr.in/api',
  AWS_BUCKET_NAME: "aerohr-uploads",
  AWS_REGION: "us-east-1",
  s3Url: "https://aerohr-uploads.s3.amazonaws.com/",
};
