const path = require('path');
const express = require('express');
const RateLimit = require('express-rate-limit');
const { Sequelize } = require('sequelize');

const fs =require('fs') ;



const app = express();
 
// enable frontend access
const cors = require('cors');
const frontendOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:8000';
const corsOptions = {
  origin: frontendOrigin,
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
};
app.use(cors(corsOptions));

// enable json middleware
app.use(express.json());

// enable rate limiter
const limiter = RateLimit({
  windowMs: 60 * 60 * 1000, // 1h
  max: 1000, // 1000 requests per hour
  message: 'Too many requests from this IP, please try again after an hour',
});
app.use(limiter);
// Specify the directory to serve static files
app.use(express.static(path.join(__dirname, 'public')));
 
// init sequalize
// const databasePath = path.resolve(__dirname, 'database/database.sqlite');
// const sequelize = new Sequelize({
//   dialect: 'sqlite',
//   storage: databasePath,
//   logging: false,
// });
const { sequelize } = require('./models');
// "/"
const indexRoute = require('./routes/index');
app.use('/', indexRoute);

// "/health"
const healthIndexRoute = require('./routes/health/index')();
app.use('/health', healthIndexRoute);

//const { roleInterceptor } = require('./middleware/roleInterceptor');
//app.use(roleInterceptor);
// "users"
const usersIndexRoute = require('./routes/users/index')(sequelize);
const usersFindRoute = require('./routes/users/find')(sequelize);
const usersSearchRoute = require('./routes/users/search')(sequelize);
const signUpRoute = require('./routes/users/signup')(sequelize);
const signInRoute = require('./routes/users/signin')(sequelize);
app.use('/users', usersIndexRoute);
app.use('/users', usersFindRoute);
app.use('/users', usersSearchRoute);
app.use('/users', signUpRoute);
app.use('/users', signInRoute);
// ESM import
(async () => {
  const updateRoute = await import('./routes/users/update.mjs');
  app.use('/users', updateRoute.default(sequelize));
})();

// "/projects"
const projectsIndexRoute = require('./routes/projects/index')(sequelize);
const projectsShowRoute = require('./routes/projects/show')(sequelize);
const projectsNewRoute = require('./routes/projects/new')(sequelize);
const projectsEditRoute = require('./routes/projects/edit')(sequelize);
const projectsDeleteRoute = require('./routes/projects/delete')(sequelize);
app.use('/projects', projectsIndexRoute);
app.use('/projects', projectsShowRoute);
app.use('/projects', projectsNewRoute);
app.use('/projects', projectsEditRoute);
app.use('/projects', projectsDeleteRoute);

// "/folders"
const foldersIndexRoute = require('./routes/folders/index')(sequelize);
const foldersNewRoute = require('./routes/folders/new')(sequelize);
const foldersEditRoute = require('./routes/folders/edit')(sequelize);
const foldersDeleteRoute = require('./routes/folders/delete')(sequelize);
app.use('/folders', foldersIndexRoute);
app.use('/folders', foldersNewRoute);
app.use('/folders', foldersEditRoute);
app.use('/folders', foldersDeleteRoute);

// "/cases"
// "/cases"
const casesDownloadRoute = require('./routes/cases/download')(sequelize);
const casesIndexRoute = require('./routes/cases/index')(sequelize);
const casesIndexByProjectIdRoute = require('./routes/cases/indexByProjectId')(sequelize);
const casesShowRoute = require('./routes/cases/show')(sequelize);
const casesNewRoute = require('./routes/cases/new')(sequelize);
const casesEditRoute = require('./routes/cases/edit')(sequelize);
const casesDeleteRoute = require('./routes/cases/delete')(sequelize);
app.use('/cases', casesDownloadRoute);
app.use('/cases', casesIndexRoute);
app.use('/cases', casesIndexByProjectIdRoute);
app.use('/cases', casesShowRoute);
app.use('/cases', casesNewRoute);
app.use('/cases', casesEditRoute);
app.use('/cases', casesDeleteRoute);

// "/steps"
const stepsEditRoute = require('./routes/steps/edit')(sequelize);
app.use('/steps', stepsEditRoute);

// "/attachments"
const attachmentsNewRoute = require('./routes/attachments/new')(sequelize);
const attachmentsDeleteRoute = require('./routes/attachments/delete')(sequelize);
const attachmentsDownloadRoute = require('./routes/attachments/download')(sequelize);
app.use('/attachments', attachmentsNewRoute);
app.use('/attachments', attachmentsDeleteRoute);
app.use('/attachments', attachmentsDownloadRoute);

// "/runs"
const runsDownloadRoute = require('./routes/runs/download')(sequelize);
const runsIndexRoute = require('./routes/runs/index')(sequelize);
const runsShowRoute = require('./routes/runs/show')(sequelize);
const runsNewRoute = require('./routes/runs/new')(sequelize);
const runsEditRoute = require('./routes/runs/edit')(sequelize);
const runDeleteRoute = require('./routes/runs/delete')(sequelize);
app.use('/runs', runsDownloadRoute);
app.use('/runs', runsIndexRoute);
app.use('/runs', runsShowRoute);
app.use('/runs', runsNewRoute);
app.use('/runs', runsEditRoute);
app.use('/runs', runDeleteRoute);

// "/runcases"
const runCaseIndexRoute = require('./routes/runcases/index')(sequelize);
const runCaseEditRoute = require('./routes/runcases/edit')(sequelize);
const runCaseExecutionsRoute = require('./routes/runcases/executions')(sequelize);
app.use('/runcases', runCaseIndexRoute);
app.use('/runcases', runCaseEditRoute);
app.use('/runcases/executions', runCaseExecutionsRoute);
// "/members"
const membersIndexRoute = require('./routes/members/index')(sequelize);
const membersNewRoute = require('./routes/members/new')(sequelize);
const membersEditRoute = require('./routes/members/edit')(sequelize);
const membersDeleteRoute = require('./routes/members/delete')(sequelize);
const membersCheckRoute = require('./routes/members/check')(sequelize);
app.use('/members', membersIndexRoute);
app.use('/members', membersNewRoute);
app.use('/members', membersEditRoute);
app.use('/members', membersDeleteRoute);
app.use('/members', membersCheckRoute);

const autoTestCasesRouter = require('./routes/automation/autotestcases')(sequelize);
const autoTestCaseGroupsRouter = require('./routes/automation/autotestcasegroups')(sequelize);
const autoTestRunsRouter = require('./routes/automation/autotestruns')(sequelize);
const allureRouter= require('./routes/automation/allurereport')(sequelize);
//const Scheduler  = require('./routes/automation/service/scheduler')(sequelize);
// mount CommonJS routers under /api/*
app.use('/api/autotestcases', autoTestCasesRouter);
app.use('/api/autotestcasegroups', autoTestCaseGroupsRouter);
app.use('/api/autotestruns', autoTestRunsRouter);
app.use('/api/allure-report',allureRouter)

// restore queued scheduled jobs on boot (fire-and-forget; no top-level await)
// const scheduler = new Scheduler();
// (async () => {
//   try {
//     await scheduler.scheduleFromDB();
//     console.log("[scheduler] restored queued automation jobs");
//   } catch (err) {
//     console.error("[scheduler] restore failed:", err);
//   }
// })();
// "/home"
const homeIndexRoute = require('./routes/home/index')(sequelize);
app.use('/home', homeIndexRoute);

const filesRouter = require('./routes/files/files');
app.use('/files', filesRouter);

const bugController = require('./routes/bugs/bugController')((sequelize));

app.use('/api/bugzilla/bugs', bugController);

const kpiController = require('./routes/kpis')((sequelize));

app.use('/api/kpis', kpiController);

const kpiUserWiseController = require('./routes/kpis/userWiseSummary')((sequelize));

app.use('/api/kpis/userwise', kpiUserWiseController);

const kpiExecutionRawController = require('./routes/kpis/executionsRaw')((sequelize));
app.use('/api/kpis/executionsRaw', kpiExecutionRawController);

const testcasesController=  require('./routes/testcases/testCases')(sequelize);
app.use('/api/testcases',testcasesController);

   
const testUsecaseController= require('./routes/testusecases/testUseCases')(sequelize);
app.use('/api/testusecases', testUsecaseController);
 
const testmodulesController= require('./routes/testmodules/testModules')(sequelize);
app.use('/api/testmodules',testmodulesController);

const testScenariosController=  require('./routes/testscenarios/testScenarios')(sequelize);
app.use('/api/testscenarios',testScenariosController);


const refDocController= require('./routes/testdocs/referenceDocs')(sequelize);
app.use('/api/referencedocs', refDocController);

const projectconfigController= require('./routes/projectconfig')(sequelize);
app.use('/api/projectconfig', projectconfigController);

const rawUploadsRoutes = require("./routes/rawTestDataUpload/raw_test_uploads")(sequelize);
app.use("/api/rawuploads", rawUploadsRoutes);

const reportsRouter = require('./routes/kpis/overallReport')(sequelize);
app.use('/api/reports', reportsRouter);

// Kanban board routes
const kanbanRouter = require('./routes/kanban/index')(sequelize);
app.use('/api/kanban', kanbanRouter);

// Assignment routes
const assignmentsRouter = require('./routes/assignments/index')(sequelize);
app.use('/api/assignments', assignmentsRouter);

// Dashboard routes
const dashboardRouter = require('./routes/dashboard/index')(sequelize);
app.use('/api/dashboard', dashboardRouter);

// after you created `const app = express();` and mounted routes:
const swaggerUi = require('swagger-ui-express');
 
let swaggerDoc = null;
try {
  swaggerDoc = require('./swagger-output.json');
} catch {
  console.warn('[swagger] swagger-output.json not found yet. It will be generated by npm script.');
}

if (swaggerDoc) {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDoc, { explorer: true }));
  app.get('/api-docs.json', (_req, res) => res.json(swaggerDoc));
} else {
  app.get('/api-docs', (_req, res) =>
    res.status(503).send('Swagger not generated. Run `npm run swagger` or start with `npm run start`.'));
  app.get('/api-docs.json', (_req, res) =>
    res.status(503).json({ error: 'Swagger not generated' }));
}
const mountedReports = new Map();
app.get("/allure/view-report", (req, res) => {
    let reportPath = req.query.path;

    if (!reportPath) {
        return res.status(400).send("Error: 'path' query parameter is required.");
    }

    // Trim quotes if any
    reportPath = reportPath.replace(/^"|"$/g, "");

    const absPath = path.resolve(reportPath);

    if (!fs.existsSync(absPath)) {
        return res.status(404).send(`Error: Path does not exist: ${absPath}`);
    }

    if (!fs.lstatSync(absPath).isDirectory()) {
        return res.status(400).send(`Error: Path is not a directory: ${absPath}`);
    }

    console.log(`Serving Allure report from: ${absPath}`);

    // Generate a base64 mount path
    const base64Path = Buffer.from(absPath).toString("base64");

    // Mount it only once
    if (!mountedReports.has(base64Path)) {
        app.use(`/${base64Path}`, express.static(absPath));
        mountedReports.set(base64Path, absPath);
    }

    // Redirect to the index.html inside the mounted folder
    res.redirect(`/${base64Path}/index.html`);
});


if (!process.env.SECRET_KEY) {
  console.log(
    "[Warning]: Default key is used for token generation. Please set the environment variable 'SECRET_KEY'`."
  );
}

// Export the app instead of starting the server
module.exports = app;


