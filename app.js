var express  = require("express"),
    goggles  = require("./lib/goggles"),
    habitat  = require("habitat"),
    nunjucks = require("nunjucks"),
    path     = require("path");

// Load config from ".env"
habitat.load();

// Generate app variables
var app = express(),
    appName = "goggles",
    env = new habitat(),
    nunjucksEnv = new nunjucks.Environment(new nunjucks.FileSystemLoader(path.join(__dirname + "/views")));

// make it small.
app.use(express.favicon());
app.use(express.compress());
app.use(express.bodyParser());
app.use(express.cookieParser());
app.use(express.cookieSession({
  key: "goggles.sid",
  secret: env.get("SESSION_SECRET"),
  cookie: {
    maxAge: 2678400000, // 31 days. Persona saves session data for 1 month
    secure: !!env.get("FORCE_SSL")
  },
  proxy: true
}));
app.use(express.csrf());

// universal error handler
app.use(function(err, req, res, next) {
  console.log("error: ", err);
  res.render(500);
});

// Enable template rendering with nunjucks
nunjucksEnv.express(app);

// used for webxray .js source files
app.param("filename", function(req, res, next, filename) {
  req.params.filename = filename;
  next();
})

// reroute webxray .js source files when requested
app.get("/src/:filename", function(req, res) {
  res.render("./webxray/src/"+req.params.filename);
})

// intercept webxray's index.html and use our own
app.get("/", function(req, res) {
  res.render("index.html", {
    appName: appName,
    audience: env.get("audience"),
    csrf: req.session._csrf || "",
    email: req.session.email || "",
    login: env.get("login")
  });
});

// serve static content, resolved in this order:
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'webxray/static-files')));

// login API connections
require('webmaker-loginapi')(app, {
  loginURL: env.get('LOGINAPI'),
  audience: env.get('AUDIENCE')
});

// run server
goggles.build(env, nunjucksEnv, function() {
  app.listen(env.get("port"), function(){
    console.log('Express server listening on ' + env.get("hostname"));
  });
});
