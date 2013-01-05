/*
 *  jazz -- A simple template engine for nodejs
 *  Copyright (c) 2010 Shine Technologies
 *  Copyright (c) 2013 Softmotions
 */

var fs = require("fs");
var scanner = require("./jazz/scanner");
var parser = require("./jazz/parser");
var compiler = require("./jazz/compiler");
var error = require("./jazz/error");

//templates cache
var cache = exports.cache = {};

exports.SyntaxError = error.SyntaxError;
exports.createScanner = scanner.createScanner;
exports.createParser = parser.createParser;
exports.createCompiler = compiler.createCompiler;

var compile = exports.compile = function(source, options) {
    options = options || {};
    var s = scanner.createScanner(source, options["filename"]);
    var p = parser.createParser(s);
    p.debug = options["parser:debug"] || false;
    var c = compiler.createCompiler();
    c.debug = options["compiler:debug"] || false;
    return c.compile(p.parse());
};

function defaultMediator(data, opts, dynamic) { //Mediator XHTML mediator
    if (data == null || !dynamic || (opts && opts["escaping"] === false)) {
        return data;
    }
    const XML_ENTRY_MAP = {
        34 : "quot", // " - double-quote
        38 : "amp", // &
        60 : "lt", // <
        62 : "gt", // >
        39 : "apos"  // XML apostrophe
    };

    function escapeXML(str) {
        if (typeof str !== "string") {
            return str;
        }
        var entity;
        var result = [];
        for (var i = 0, l = str.length; i < l; i++) {
            var chr = str[i];
            var code = chr.charCodeAt(0);
            if (XML_ENTRY_MAP[code]) {
                entity = "&" + XML_ENTRY_MAP[code] + ";";
            } else {
                entity = chr;
            }
            result.push(entity);
        }
        return result.join("");
    }

    return escapeXML(data);
}

exports.renderFile = function(path, opts, cb) {
    if (typeof opts === "function") {
        cb = opts, opts = {};
    }
    var key = "" + path;
    var tmpl = null;
    if (opts.cache && cache[key]) {
        tmpl = cache[key];
        try {
            tmpl.process(opts, (typeof opts["mediator"] !== "function") ? defaultMediator : opts["mediator"],
                    function(data) {
                        cb(null, data);
                    });
        } catch (e) {
            cb(e);
        }
    } else {
        fs.readFile(path, "utf8", function(err, data) {
            if (err) {
                cb(err);
                return;
            }
            try {
                tmpl = compile(data, opts);
                if (opts.cache) {
                    cache[key] = tmpl;
                }
                tmpl.process(opts, (typeof opts["mediator"] !== "function") ? defaultMediator : opts["mediator"],
                        function(data) {
                            cb(null, data);
                        });
            } catch (e) {
                cb(e);
            }
        });
    }
};

exports.__express = exports.renderFile;

