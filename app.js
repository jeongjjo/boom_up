var express = require('express');

var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
const compression = require('compression');

var i18n = require('i18n');
var ejs = require('ejs');

var redis = require('redis');
var session = require('express-session');
var redisStore = require('connect-redis')(session);

var passport = require('./module/auth.js');
var common = require('./module/common');
var googlesheet = require('./module/googlesheethelper');

var fs = require('fs-extra');

var app = express();

var moment = require('moment');

var schedule = require('node-schedule')
var db = require('./module/mongodbWrapper');
var betting = require('./module/data/betting');

if (!fs.existsSync(path.join(__dirname, 'locales'))) {
	fs.mkdirsSync(path.join(__dirname, 'locales'))
}

// temp 경로 처리 및 AWS 처리
var tempPath = path.join(__dirname, global.config.temppath);
if (!fs.existsSync(tempPath)) {
	fs.mkdirsSync(tempPath);
}

global.config.attach = global.config.attach || {}
global.config.attach.path = tempPath;
global.config.attach.getAttachUrl = function (s) {
	return s ? global.config.attach.src + (s.startsWith('/') ? s : '/' + s) : '/img/noimg.png';
};
if (global.config.aws && global.config.aws.enabled && global.config.aws.S3Url && global.config.aws.S3Url.length > 0) {
	global.config.attach.src = global.config.aws.S3Url;
} else {
	app.use(global.config.attach.src, express.static(global.config.attach.path));
}
app.locals.attachSrc = global.config.attach.src;
app.locals.getAttachUrl = global.config.attach.getAttachUrl;
app.locals.getPhoto = common.getPhoto;
app.locals.getLevelIcon = common.getLevelIcon;
app.locals._invalidUrlRegex = global.config.invalidUrlRegex;

function getMultilang() {
	multilang.get('$A:$Z', function (err, datas) {
		if (err) {
			console.log("google multilang read error.")
			return;
		}
		if (datas.length > 1 && datas[1]["values"] && datas[1]["values"].length > 0) {
			var langs = {};
			for (var i = 1; i < datas[1]["values"].length; i++) {
				var data = datas[1]["values"][i];
				var g = multilang.getData(data, 'group') || '';
				var c = multilang.getData(data, 'category') || '';
				var k = multilang.getData(data, 'key') || '';

				if (g == "") {
					var key = (c && c.length > 0 && k && k.length > 0 ? c + '_' + k : c || k || '');
					if (key.length > 0) {
						key = key.toUpperCase();
						for (li in global.config.locales) {
							var l = global.config.locales[li];
							if (l && typeof l != 'function' && l.length > 0) {
								var d = multilang.getData(data, l);

								if (d && d.length > 0) {
									langs[l] = langs[l] || {};
									langs[l][key] = d;
								}
							}
						}
					}
				} else if (g && g.length > 0) {
					for (li in global.config.locales) {
						var l = global.config.locales[li];
						if (l && typeof l != 'function') {
							var d = multilang.getData(data, l);

							d = d.replaceAll('"', "&00100010");
							d = d.replaceAll("'", "&00100111");

							global.code = global.code || {};
							global.code[l] = global.code[l] || {};
							global.code[l][g] = global.code[l][g] || {};
							global.code[l][g][c] = global.code[l][g][c] || {};

							if (k == "") {
								global.code[l][g][c]["name"] = d;
							} else if (k.length > 0) {
								global.code[l][g][c]["items"] = global.code[l][g][c]["items"] || {};
								global.code[l][g][c]["items"][k] = d;
							}
						}

					}
				}
			}

			if (global.code) {
				fs.writeFileSync(path.join(__dirname, 'code.json'), JSON.stringify(global.code));
			}

			for (i in global.config.locales) {
				var l = global.config.locales[i];
				if (l && typeof l != 'function' && l.length > 0 && langs[l]) {
					fs.writeFileSync(path.join(__dirname, 'locales', l + '.json'), JSON.stringify(langs[l]));
				}
			}
		}
	});
}
if (process.env.NODE_ENV === "development") {
	/* 멀티랭 파일을 구글에서 관리하기 위해서 추가 */
	var multilang = new googlesheethelper('1av4mDR_mhwJzGyGVJpl901AMVbqX0f2qdNRrpiRFkko', 'multilang', {
		date: "YYYY-MM-DD",
		datetime: "YYYY-MM-DD HH:mm:ss",
		time: "HH:mm:ss"
	});
	getMultilang();
} else if (fs.existsSync(path.join(__dirname, 'code.json'))) {
	var code = fs.readFileSync(path.join(__dirname, 'code.json'));
	if (code && code.length > 0) {
		global.code = JSON.parse(code);
	}
}
/* 멀티랭 자동 처리 끝 */

var admin = require("firebase-admin");

var serviceAccount = require("./config_firebase.json");

admin.initializeApp({
	credential: admin.credential.cert(serviceAccount),
	databaseURL: global.config.firebaseDatabaseUrl
});

global.notification = require('./module/notification.js');

i18n.configure({
	locales: global.config.locales,
	register: global,
	cookie: 'locale',
	queryParameter: 'lang',
	directory: path.join(__dirname, 'locales'),
	autoReload: true
});
global.i18n = i18n;
global.moment = moment;

Object.assign(app.locals, common);
app.locals.__env__ = process.env.NODE_ENV || "development";
app.locals.serviceinfo = global.config.serviceinfo;
app.locals.title = global.config.serviceinfo.sitename;

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
// app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));

app.use(logger('combined', {
	skip: function (req, res) {
		return res.statusCode === 200 || res.statusCode === 304 || res.statusCode === 302;
	}
}));
app.use(bodyParser.json({
	limit: '50mb'
}));
app.use(bodyParser.urlencoded({
	limit: '50mb',
	extended: false
}));

// Gzip
app.use(compression());

app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

let redisClient = redis.createClient(global.config.redis);
redisClient.on('error', console.error);
global.pubAgentService = redis.createClient(global.config.redis);

app.use(session({
	key: global.config.session.key,
	secret: global.config.session.secret,
	store: new redisStore(
		common.extend({
			// host: "127.0.0.1",
			// port: 6379,
			prefix: "session:",
			db: 0
		}, global.config.redis, {
			client: redisClient
		})
	),
	saveUninitialized: false, // false == don't create session until something stored,
	resave: false // don't save session if unmodified
}));

app.disable('x-powered-by');

// 모든 ip에 대해서 proxy 처리 OK
app.enable('trust proxy');

// General security/cache related headers + server header
// app.use(function (req, res, next) {
// 	let x_frame_options = 'DENY';

// 	if (typeof process.env.X_FRAME_OPTIONS !== 'undefined' && process.env.X_FRAME_OPTIONS) {
// 		x_frame_options = process.env.X_FRAME_OPTIONS;
// 	}

// 	res.set({
// 		'Strict-Transport-Security': 'includeSubDomains; max-age=631138519; preload',
// 		'X-XSS-Protection':          '1; mode=block',
// 		'X-Content-Type-Options':    'nosniff',
// 		'X-Frame-Options':           x_frame_options,
// 		'Cache-Control':             'no-cache, no-store, max-age=0, must-revalidate',
// 		Pragma:                      'no-cache',
// 		Expires:                     0
// 	});
// 	next();
// });

// Initialize Passport and restore authentication state, if any, from the
// session.
app.use(passport.initialize());
app.use(passport.session());

app.use(i18n.init);

app.use(passport.checkResponseLocalInfomations);

app.use(function (req, res, next) {
	res.header("Access-Control-Allow-Origin", '*');
	res.header("Access-Control-Allow-Headers", "X-Requested-With");
	res.header("Access-Control-Allow-Methods", "POST, GET, OPTIONS, DELETE");
	// if (req.headers.origin) {
	// res.set({
	//     'Access-Control-Allow-Origin':      req.headers.origin,
	//     'Access-Control-Allow-Credentials': true,
	//     'Access-Control-Allow-Methods':     'OPTIONS, GET, POST',
	//     'Access-Control-Allow-Headers':     'Content-Type, Cache-Control, Pragma, Expires, Authorization, X-Dataset-Total, X-Dataset-Offset, X-Dataset-Limit',
	//     'Access-Control-Max-Age':           5 * 60,
	//     'Access-Control-Expose-Headers':    'X-Dataset-Total, X-Dataset-Offset, X-Dataset-Limit'
	// });
	// }
	next();
});

// Routes(controllers)
function loadServiceModule(modulesList, baseDir) {
	Object.keys(modulesList).forEach(key => {
		var mod = baseDir + key;
		if (fs.existsSync(mod)) {
			var uri = modulesList[key].length > 0 ? '/' + modulesList[key] : '';

			console.log('[ROUTE]', 'NAME=' + key, 'URI=' + uri, 'PATH=' + mod);
			// require(mod)(app, uri);

			var modList = fs.readdirSync(mod);
			if (modList && modList.length > 0) {
				modList.forEach(file => {
					if (/^(get|post|delete|put|all){1}_(.*)\.js$/.test(file)) {
						var patt = file.split(/[_\\.]/g);
						if (patt && patt.length === 3) {
							try {
								var module = require(mod + '/' + file);
								if (Array.isArray(module)) {
									console.log('  +', uri + (!module[0] ? ('/' + patt[1]) : module[0]), '(' + file + ')');
									module[0] = uri + (!module[0] ? ('/' + patt[1]) : module[0]);
									if (module[1] === null) {
										module.splice(1, 1);
									} else {
										module[1] = module[1].length < 1 ? passport.isAuthenticated : passport.isAuthenticatedRole(module[1]);
									}
									app[patt[0]] && app[patt[0]].apply(app, module);
								} else {
									console.warn('  +', 'INVALID ENTRY', file);
								}
							} catch (e) {
								console.error(e);
							}
						} else {
							console.error('  +', 'INVALID', file);
						}
					}
				});
			} else {
				console.info('  +', 'NOT FOUND ANY', __dirname);
			}


		} else {
			console.error('  +', 'NOT FOUND', key, mod);
		}
	});
}
loadServiceModule(global.config.servicemodule, './routes/');

// catch 404 and forward to error handler
app.use(function (req, res, next) {
	console.error('404', req.ip, req.originalUrl, req.refer || '');
	var err = new Error('Not Found');
	err.status = 404;
	next(err);
});

// production error handler
// no stacktraces leaked to user
app.use(function (err, req, res, next) {
	console.error('SYSERR', req.ip, req.originalUrl, req.refer || '', err);
	res.render('error', {
		title: err.status,
		message: err.message,
		refer: req.originalUrl,
		error: (app.get('env') === 'development') ? err : {}
	});
});

//매일 23시 59분마다
schedule.scheduleJob('55 23 * * *', async () => {
	console.log('test Module2')
	let count = await db.count("board", {delete: false})
	let pageCount = Math.ceil(count / 100)
	let limit = 100
	let procCount = 0;
	for (let i = 0; i < pageCount; i++) {
		await betting.rankInit(i * limit, 100)
		procCount ++
	}
	if(procCount === pageCount){
		await betting.rankPointInit()
		console.log('rankInit')
	}
	await betting.dayInit()
	console.log('dayInit')
	await betting.userInit()
	console.log('userInit')
})
//일요일 23시 59분마다
schedule.scheduleJob('59 23 * * 0', async () => {
	await betting.weekInit()
	console.log('weekInit')
})

module.exports = app;
