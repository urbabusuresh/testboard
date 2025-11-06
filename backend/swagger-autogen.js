// CommonJS
const swaggerAutogen = require('swagger-autogen')();

const doc = {
  info: { title: 'Raptr Automation API', description: 'Automation + Manual Test management API' },
  host: process.env.SWAGGER_HOST || 'localhost:8001',
  basePath: '/',
  schemes: ['http'],
  consumes: ['application/json'],
  produces: ['application/json'],
};

const outputFile = './swagger-output.json';

// IMPORTANT: include files that actually call router.get/post/... 
// Add more patterns as needed.
const endpointsFiles = [
  './server.js',
  './routes/**/*.js',
];

swaggerAutogen(outputFile, endpointsFiles, doc).then(() => {
  console.log('[swagger-autogen] generated swagger-output.json');
});
