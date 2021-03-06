#!/usr/bin/env node

/*jshint node:true */
var express    = require('express'),
    middleware = require('./lib/middleware');

// -- Configure Express --------------------------------------------------------
var app       = express(),
    publicDir = __dirname + '/public';

app.disable('x-powered-by');

if (app.get('env') === 'development') {
    app.use(express.responseTime());
    app.use(express.logger('tiny'));
}

app.use(express.static(publicDir));
app.use(middleware.blacklist);

// Global middleware to set some security-related headers.
app.use(function (req, res, next) {
    res.set({
        'Access-Control-Allow-Origin': '*',
        'X-Content-Type-Options'     : 'nosniff'
    });

    next();
});

app.use(app.router);

// -- Routes -------------------------------------------------------------------

// Don't allow requests for Google Webmaster Central verification files, because
// rawgithub.com isn't a hosting provider and people can't own URLs under its
// domain.
app.get('*/google[0-9a-f]{16}.html',
    middleware.error403);

// Public or private gist.
app.get(/^\/[0-9A-Za-z-]+\/[0-9a-f]+\/raw\//,
    middleware.noRobots,
    middleware.imageRedirect('https://gist.github.com'),
    middleware.proxyPath('https://gist.github.com'));

// Repo file.
app.get('/:user/:repo/:branch/*',
    middleware.noRobots,
    middleware.imageRedirect('https://raw.github.com'),
    middleware.proxyPath('https://raw.github.com'));

// -- Error handlers -----------------------------------------------------------
app.use(function (req, res, next) {
    res.status(404);

    if (req.accepts('html')) {
        res.sendfile(publicDir + '/errors/404.html');
        return;
    }

    if (req.accepts('json')) {
        res.send({error: 'Not found.'});
        return;
    }

    res.type('txt').send('Not found.');
});

app.use(function (err, req, res, next) {
    console.error(err.stack);

    res.status(err.status || 500);

    if (req.accepts('html')) {
        res.sendfile(publicDir + '/errors/500.html');
        return;
    }

    if (req.accepts('json')) {
        res.send({error: '500 Internal Server Error'});
        return;
    }

    res.type('txt').send('Internal Server Error');
});

// -- Server -------------------------------------------------------------------
var port = process.env.PORT || 5000;

app.listen(port, function () {
    console.log('Listening on port ' + port);
});
