(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            var source = ev.source;
            if ((source === window || source === null) && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
}

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}],2:[function(require,module,exports){
(function (process){
// vim:ts=4:sts=4:sw=4:
/*!
 *
 * Copyright 2009-2012 Kris Kowal under the terms of the MIT
 * license found at http://github.com/kriskowal/q/raw/master/LICENSE
 *
 * With parts by Tyler Close
 * Copyright 2007-2009 Tyler Close under the terms of the MIT X license found
 * at http://www.opensource.org/licenses/mit-license.html
 * Forked at ref_send.js version: 2009-05-11
 *
 * With parts by Mark Miller
 * Copyright (C) 2011 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

(function (definition) {
    "use strict";

    // This file will function properly as a <script> tag, or a module
    // using CommonJS and NodeJS or RequireJS module formats.  In
    // Common/Node/RequireJS, the module exports the Q API and when
    // executed as a simple <script>, it creates a Q global instead.

    // Montage Require
    if (typeof bootstrap === "function") {
        bootstrap("promise", definition);

    // CommonJS
    } else if (typeof exports === "object" && typeof module === "object") {
        module.exports = definition();

    // RequireJS
    } else if (typeof define === "function" && define.amd) {
        define(definition);

    // SES (Secure EcmaScript)
    } else if (typeof ses !== "undefined") {
        if (!ses.ok()) {
            return;
        } else {
            ses.makeQ = definition;
        }

    // <script>
    } else if (typeof window !== "undefined" || typeof self !== "undefined") {
        // Prefer window over self for add-on scripts. Use self for
        // non-windowed contexts.
        var global = typeof window !== "undefined" ? window : self;

        // Get the `window` object, save the previous Q global
        // and initialize Q as a global.
        var previousQ = global.Q;
        global.Q = definition();

        // Add a noConflict function so Q can be removed from the
        // global namespace.
        global.Q.noConflict = function () {
            global.Q = previousQ;
            return this;
        };

    } else {
        throw new Error("This environment was not anticipated by Q. Please file a bug.");
    }

})(function () {
"use strict";

var hasStacks = false;
try {
    throw new Error();
} catch (e) {
    hasStacks = !!e.stack;
}

// All code after this point will be filtered from stack traces reported
// by Q.
var qStartingLine = captureLine();
var qFileName;

// shims

// used for fallback in "allResolved"
var noop = function () {};

// Use the fastest possible means to execute a task in a future turn
// of the event loop.
var nextTick =(function () {
    // linked list of tasks (single, with head node)
    var head = {task: void 0, next: null};
    var tail = head;
    var flushing = false;
    var requestTick = void 0;
    var isNodeJS = false;
    // queue for late tasks, used by unhandled rejection tracking
    var laterQueue = [];

    function flush() {
        /* jshint loopfunc: true */
        var task, domain;

        while (head.next) {
            head = head.next;
            task = head.task;
            head.task = void 0;
            domain = head.domain;

            if (domain) {
                head.domain = void 0;
                domain.enter();
            }
            runSingle(task, domain);

        }
        while (laterQueue.length) {
            task = laterQueue.pop();
            runSingle(task);
        }
        flushing = false;
    }
    // runs a single function in the async queue
    function runSingle(task, domain) {
        try {
            task();

        } catch (e) {
            if (isNodeJS) {
                // In node, uncaught exceptions are considered fatal errors.
                // Re-throw them synchronously to interrupt flushing!

                // Ensure continuation if the uncaught exception is suppressed
                // listening "uncaughtException" events (as domains does).
                // Continue in next event to avoid tick recursion.
                if (domain) {
                    domain.exit();
                }
                setTimeout(flush, 0);
                if (domain) {
                    domain.enter();
                }

                throw e;

            } else {
                // In browsers, uncaught exceptions are not fatal.
                // Re-throw them asynchronously to avoid slow-downs.
                setTimeout(function () {
                    throw e;
                }, 0);
            }
        }

        if (domain) {
            domain.exit();
        }
    }

    nextTick = function (task) {
        tail = tail.next = {
            task: task,
            domain: isNodeJS && process.domain,
            next: null
        };

        if (!flushing) {
            flushing = true;
            requestTick();
        }
    };

    if (typeof process === "object" &&
        process.toString() === "[object process]" && process.nextTick) {
        // Ensure Q is in a real Node environment, with a `process.nextTick`.
        // To see through fake Node environments:
        // * Mocha test runner - exposes a `process` global without a `nextTick`
        // * Browserify - exposes a `process.nexTick` function that uses
        //   `setTimeout`. In this case `setImmediate` is preferred because
        //    it is faster. Browserify's `process.toString()` yields
        //   "[object Object]", while in a real Node environment
        //   `process.nextTick()` yields "[object process]".
        isNodeJS = true;

        requestTick = function () {
            process.nextTick(flush);
        };

    } else if (typeof setImmediate === "function") {
        // In IE10, Node.js 0.9+, or https://github.com/NobleJS/setImmediate
        if (typeof window !== "undefined") {
            requestTick = setImmediate.bind(window, flush);
        } else {
            requestTick = function () {
                setImmediate(flush);
            };
        }

    } else if (typeof MessageChannel !== "undefined") {
        // modern browsers
        // http://www.nonblocking.io/2011/06/windownexttick.html
        var channel = new MessageChannel();
        // At least Safari Version 6.0.5 (8536.30.1) intermittently cannot create
        // working message ports the first time a page loads.
        channel.port1.onmessage = function () {
            requestTick = requestPortTick;
            channel.port1.onmessage = flush;
            flush();
        };
        var requestPortTick = function () {
            // Opera requires us to provide a message payload, regardless of
            // whether we use it.
            channel.port2.postMessage(0);
        };
        requestTick = function () {
            setTimeout(flush, 0);
            requestPortTick();
        };

    } else {
        // old browsers
        requestTick = function () {
            setTimeout(flush, 0);
        };
    }
    // runs a task after all other tasks have been run
    // this is useful for unhandled rejection tracking that needs to happen
    // after all `then`d tasks have been run.
    nextTick.runAfter = function (task) {
        laterQueue.push(task);
        if (!flushing) {
            flushing = true;
            requestTick();
        }
    };
    return nextTick;
})();

// Attempt to make generics safe in the face of downstream
// modifications.
// There is no situation where this is necessary.
// If you need a security guarantee, these primordials need to be
// deeply frozen anyway, and if you don’t need a security guarantee,
// this is just plain paranoid.
// However, this **might** have the nice side-effect of reducing the size of
// the minified code by reducing x.call() to merely x()
// See Mark Miller’s explanation of what this does.
// http://wiki.ecmascript.org/doku.php?id=conventions:safe_meta_programming
var call = Function.call;
function uncurryThis(f) {
    return function () {
        return call.apply(f, arguments);
    };
}
// This is equivalent, but slower:
// uncurryThis = Function_bind.bind(Function_bind.call);
// http://jsperf.com/uncurrythis

var array_slice = uncurryThis(Array.prototype.slice);

var array_reduce = uncurryThis(
    Array.prototype.reduce || function (callback, basis) {
        var index = 0,
            length = this.length;
        // concerning the initial value, if one is not provided
        if (arguments.length === 1) {
            // seek to the first value in the array, accounting
            // for the possibility that is is a sparse array
            do {
                if (index in this) {
                    basis = this[index++];
                    break;
                }
                if (++index >= length) {
                    throw new TypeError();
                }
            } while (1);
        }
        // reduce
        for (; index < length; index++) {
            // account for the possibility that the array is sparse
            if (index in this) {
                basis = callback(basis, this[index], index);
            }
        }
        return basis;
    }
);

var array_indexOf = uncurryThis(
    Array.prototype.indexOf || function (value) {
        // not a very good shim, but good enough for our one use of it
        for (var i = 0; i < this.length; i++) {
            if (this[i] === value) {
                return i;
            }
        }
        return -1;
    }
);

var array_map = uncurryThis(
    Array.prototype.map || function (callback, thisp) {
        var self = this;
        var collect = [];
        array_reduce(self, function (undefined, value, index) {
            collect.push(callback.call(thisp, value, index, self));
        }, void 0);
        return collect;
    }
);

var object_create = Object.create || function (prototype) {
    function Type() { }
    Type.prototype = prototype;
    return new Type();
};

var object_hasOwnProperty = uncurryThis(Object.prototype.hasOwnProperty);

var object_keys = Object.keys || function (object) {
    var keys = [];
    for (var key in object) {
        if (object_hasOwnProperty(object, key)) {
            keys.push(key);
        }
    }
    return keys;
};

var object_toString = uncurryThis(Object.prototype.toString);

function isObject(value) {
    return value === Object(value);
}

// generator related shims

// FIXME: Remove this function once ES6 generators are in SpiderMonkey.
function isStopIteration(exception) {
    return (
        object_toString(exception) === "[object StopIteration]" ||
        exception instanceof QReturnValue
    );
}

// FIXME: Remove this helper and Q.return once ES6 generators are in
// SpiderMonkey.
var QReturnValue;
if (typeof ReturnValue !== "undefined") {
    QReturnValue = ReturnValue;
} else {
    QReturnValue = function (value) {
        this.value = value;
    };
}

// long stack traces

var STACK_JUMP_SEPARATOR = "From previous event:";

function makeStackTraceLong(error, promise) {
    // If possible, transform the error stack trace by removing Node and Q
    // cruft, then concatenating with the stack trace of `promise`. See #57.
    if (hasStacks &&
        promise.stack &&
        typeof error === "object" &&
        error !== null &&
        error.stack &&
        error.stack.indexOf(STACK_JUMP_SEPARATOR) === -1
    ) {
        var stacks = [];
        for (var p = promise; !!p; p = p.source) {
            if (p.stack) {
                stacks.unshift(p.stack);
            }
        }
        stacks.unshift(error.stack);

        var concatedStacks = stacks.join("\n" + STACK_JUMP_SEPARATOR + "\n");
        error.stack = filterStackString(concatedStacks);
    }
}

function filterStackString(stackString) {
    var lines = stackString.split("\n");
    var desiredLines = [];
    for (var i = 0; i < lines.length; ++i) {
        var line = lines[i];

        if (!isInternalFrame(line) && !isNodeFrame(line) && line) {
            desiredLines.push(line);
        }
    }
    return desiredLines.join("\n");
}

function isNodeFrame(stackLine) {
    return stackLine.indexOf("(module.js:") !== -1 ||
           stackLine.indexOf("(node.js:") !== -1;
}

function getFileNameAndLineNumber(stackLine) {
    // Named functions: "at functionName (filename:lineNumber:columnNumber)"
    // In IE10 function name can have spaces ("Anonymous function") O_o
    var attempt1 = /at .+ \((.+):(\d+):(?:\d+)\)$/.exec(stackLine);
    if (attempt1) {
        return [attempt1[1], Number(attempt1[2])];
    }

    // Anonymous functions: "at filename:lineNumber:columnNumber"
    var attempt2 = /at ([^ ]+):(\d+):(?:\d+)$/.exec(stackLine);
    if (attempt2) {
        return [attempt2[1], Number(attempt2[2])];
    }

    // Firefox style: "function@filename:lineNumber or @filename:lineNumber"
    var attempt3 = /.*@(.+):(\d+)$/.exec(stackLine);
    if (attempt3) {
        return [attempt3[1], Number(attempt3[2])];
    }
}

function isInternalFrame(stackLine) {
    var fileNameAndLineNumber = getFileNameAndLineNumber(stackLine);

    if (!fileNameAndLineNumber) {
        return false;
    }

    var fileName = fileNameAndLineNumber[0];
    var lineNumber = fileNameAndLineNumber[1];

    return fileName === qFileName &&
        lineNumber >= qStartingLine &&
        lineNumber <= qEndingLine;
}

// discover own file name and line number range for filtering stack
// traces
function captureLine() {
    if (!hasStacks) {
        return;
    }

    try {
        throw new Error();
    } catch (e) {
        var lines = e.stack.split("\n");
        var firstLine = lines[0].indexOf("@") > 0 ? lines[1] : lines[2];
        var fileNameAndLineNumber = getFileNameAndLineNumber(firstLine);
        if (!fileNameAndLineNumber) {
            return;
        }

        qFileName = fileNameAndLineNumber[0];
        return fileNameAndLineNumber[1];
    }
}

function deprecate(callback, name, alternative) {
    return function () {
        if (typeof console !== "undefined" &&
            typeof console.warn === "function") {
            console.warn(name + " is deprecated, use " + alternative +
                         " instead.", new Error("").stack);
        }
        return callback.apply(callback, arguments);
    };
}

// end of shims
// beginning of real work

/**
 * Constructs a promise for an immediate reference, passes promises through, or
 * coerces promises from different systems.
 * @param value immediate reference or promise
 */
function Q(value) {
    // If the object is already a Promise, return it directly.  This enables
    // the resolve function to both be used to created references from objects,
    // but to tolerably coerce non-promises to promises.
    if (value instanceof Promise) {
        return value;
    }

    // assimilate thenables
    if (isPromiseAlike(value)) {
        return coerce(value);
    } else {
        return fulfill(value);
    }
}
Q.resolve = Q;

/**
 * Performs a task in a future turn of the event loop.
 * @param {Function} task
 */
Q.nextTick = nextTick;

/**
 * Controls whether or not long stack traces will be on
 */
Q.longStackSupport = false;

// enable long stacks if Q_DEBUG is set
if (typeof process === "object" && process && process.env && process.env.Q_DEBUG) {
    Q.longStackSupport = true;
}

/**
 * Constructs a {promise, resolve, reject} object.
 *
 * `resolve` is a callback to invoke with a more resolved value for the
 * promise. To fulfill the promise, invoke `resolve` with any value that is
 * not a thenable. To reject the promise, invoke `resolve` with a rejected
 * thenable, or invoke `reject` with the reason directly. To resolve the
 * promise to another thenable, thus putting it in the same state, invoke
 * `resolve` with that other thenable.
 */
Q.defer = defer;
function defer() {
    // if "messages" is an "Array", that indicates that the promise has not yet
    // been resolved.  If it is "undefined", it has been resolved.  Each
    // element of the messages array is itself an array of complete arguments to
    // forward to the resolved promise.  We coerce the resolution value to a
    // promise using the `resolve` function because it handles both fully
    // non-thenable values and other thenables gracefully.
    var messages = [], progressListeners = [], resolvedPromise;

    var deferred = object_create(defer.prototype);
    var promise = object_create(Promise.prototype);

    promise.promiseDispatch = function (resolve, op, operands) {
        var args = array_slice(arguments);
        if (messages) {
            messages.push(args);
            if (op === "when" && operands[1]) { // progress operand
                progressListeners.push(operands[1]);
            }
        } else {
            Q.nextTick(function () {
                resolvedPromise.promiseDispatch.apply(resolvedPromise, args);
            });
        }
    };

    // XXX deprecated
    promise.valueOf = function () {
        if (messages) {
            return promise;
        }
        var nearerValue = nearer(resolvedPromise);
        if (isPromise(nearerValue)) {
            resolvedPromise = nearerValue; // shorten chain
        }
        return nearerValue;
    };

    promise.inspect = function () {
        if (!resolvedPromise) {
            return { state: "pending" };
        }
        return resolvedPromise.inspect();
    };

    if (Q.longStackSupport && hasStacks) {
        try {
            throw new Error();
        } catch (e) {
            // NOTE: don't try to use `Error.captureStackTrace` or transfer the
            // accessor around; that causes memory leaks as per GH-111. Just
            // reify the stack trace as a string ASAP.
            //
            // At the same time, cut off the first line; it's always just
            // "[object Promise]\n", as per the `toString`.
            promise.stack = e.stack.substring(e.stack.indexOf("\n") + 1);
        }
    }

    // NOTE: we do the checks for `resolvedPromise` in each method, instead of
    // consolidating them into `become`, since otherwise we'd create new
    // promises with the lines `become(whatever(value))`. See e.g. GH-252.

    function become(newPromise) {
        resolvedPromise = newPromise;
        promise.source = newPromise;

        array_reduce(messages, function (undefined, message) {
            Q.nextTick(function () {
                newPromise.promiseDispatch.apply(newPromise, message);
            });
        }, void 0);

        messages = void 0;
        progressListeners = void 0;
    }

    deferred.promise = promise;
    deferred.resolve = function (value) {
        if (resolvedPromise) {
            return;
        }

        become(Q(value));
    };

    deferred.fulfill = function (value) {
        if (resolvedPromise) {
            return;
        }

        become(fulfill(value));
    };
    deferred.reject = function (reason) {
        if (resolvedPromise) {
            return;
        }

        become(reject(reason));
    };
    deferred.notify = function (progress) {
        if (resolvedPromise) {
            return;
        }

        array_reduce(progressListeners, function (undefined, progressListener) {
            Q.nextTick(function () {
                progressListener(progress);
            });
        }, void 0);
    };

    return deferred;
}

/**
 * Creates a Node-style callback that will resolve or reject the deferred
 * promise.
 * @returns a nodeback
 */
defer.prototype.makeNodeResolver = function () {
    var self = this;
    return function (error, value) {
        if (error) {
            self.reject(error);
        } else if (arguments.length > 2) {
            self.resolve(array_slice(arguments, 1));
        } else {
            self.resolve(value);
        }
    };
};

/**
 * @param resolver {Function} a function that returns nothing and accepts
 * the resolve, reject, and notify functions for a deferred.
 * @returns a promise that may be resolved with the given resolve and reject
 * functions, or rejected by a thrown exception in resolver
 */
Q.Promise = promise; // ES6
Q.promise = promise;
function promise(resolver) {
    if (typeof resolver !== "function") {
        throw new TypeError("resolver must be a function.");
    }
    var deferred = defer();
    try {
        resolver(deferred.resolve, deferred.reject, deferred.notify);
    } catch (reason) {
        deferred.reject(reason);
    }
    return deferred.promise;
}

promise.race = race; // ES6
promise.all = all; // ES6
promise.reject = reject; // ES6
promise.resolve = Q; // ES6

// XXX experimental.  This method is a way to denote that a local value is
// serializable and should be immediately dispatched to a remote upon request,
// instead of passing a reference.
Q.passByCopy = function (object) {
    //freeze(object);
    //passByCopies.set(object, true);
    return object;
};

Promise.prototype.passByCopy = function () {
    //freeze(object);
    //passByCopies.set(object, true);
    return this;
};

/**
 * If two promises eventually fulfill to the same value, promises that value,
 * but otherwise rejects.
 * @param x {Any*}
 * @param y {Any*}
 * @returns {Any*} a promise for x and y if they are the same, but a rejection
 * otherwise.
 *
 */
Q.join = function (x, y) {
    return Q(x).join(y);
};

Promise.prototype.join = function (that) {
    return Q([this, that]).spread(function (x, y) {
        if (x === y) {
            // TODO: "===" should be Object.is or equiv
            return x;
        } else {
            throw new Error("Can't join: not the same: " + x + " " + y);
        }
    });
};

/**
 * Returns a promise for the first of an array of promises to become settled.
 * @param answers {Array[Any*]} promises to race
 * @returns {Any*} the first promise to be settled
 */
Q.race = race;
function race(answerPs) {
    return promise(function (resolve, reject) {
        // Switch to this once we can assume at least ES5
        // answerPs.forEach(function (answerP) {
        //     Q(answerP).then(resolve, reject);
        // });
        // Use this in the meantime
        for (var i = 0, len = answerPs.length; i < len; i++) {
            Q(answerPs[i]).then(resolve, reject);
        }
    });
}

Promise.prototype.race = function () {
    return this.then(Q.race);
};

/**
 * Constructs a Promise with a promise descriptor object and optional fallback
 * function.  The descriptor contains methods like when(rejected), get(name),
 * set(name, value), post(name, args), and delete(name), which all
 * return either a value, a promise for a value, or a rejection.  The fallback
 * accepts the operation name, a resolver, and any further arguments that would
 * have been forwarded to the appropriate method above had a method been
 * provided with the proper name.  The API makes no guarantees about the nature
 * of the returned object, apart from that it is usable whereever promises are
 * bought and sold.
 */
Q.makePromise = Promise;
function Promise(descriptor, fallback, inspect) {
    if (fallback === void 0) {
        fallback = function (op) {
            return reject(new Error(
                "Promise does not support operation: " + op
            ));
        };
    }
    if (inspect === void 0) {
        inspect = function () {
            return {state: "unknown"};
        };
    }

    var promise = object_create(Promise.prototype);

    promise.promiseDispatch = function (resolve, op, args) {
        var result;
        try {
            if (descriptor[op]) {
                result = descriptor[op].apply(promise, args);
            } else {
                result = fallback.call(promise, op, args);
            }
        } catch (exception) {
            result = reject(exception);
        }
        if (resolve) {
            resolve(result);
        }
    };

    promise.inspect = inspect;

    // XXX deprecated `valueOf` and `exception` support
    if (inspect) {
        var inspected = inspect();
        if (inspected.state === "rejected") {
            promise.exception = inspected.reason;
        }

        promise.valueOf = function () {
            var inspected = inspect();
            if (inspected.state === "pending" ||
                inspected.state === "rejected") {
                return promise;
            }
            return inspected.value;
        };
    }

    return promise;
}

Promise.prototype.toString = function () {
    return "[object Promise]";
};

Promise.prototype.then = function (fulfilled, rejected, progressed) {
    var self = this;
    var deferred = defer();
    var done = false;   // ensure the untrusted promise makes at most a
                        // single call to one of the callbacks

    function _fulfilled(value) {
        try {
            return typeof fulfilled === "function" ? fulfilled(value) : value;
        } catch (exception) {
            return reject(exception);
        }
    }

    function _rejected(exception) {
        if (typeof rejected === "function") {
            makeStackTraceLong(exception, self);
            try {
                return rejected(exception);
            } catch (newException) {
                return reject(newException);
            }
        }
        return reject(exception);
    }

    function _progressed(value) {
        return typeof progressed === "function" ? progressed(value) : value;
    }

    Q.nextTick(function () {
        self.promiseDispatch(function (value) {
            if (done) {
                return;
            }
            done = true;

            deferred.resolve(_fulfilled(value));
        }, "when", [function (exception) {
            if (done) {
                return;
            }
            done = true;

            deferred.resolve(_rejected(exception));
        }]);
    });

    // Progress propagator need to be attached in the current tick.
    self.promiseDispatch(void 0, "when", [void 0, function (value) {
        var newValue;
        var threw = false;
        try {
            newValue = _progressed(value);
        } catch (e) {
            threw = true;
            if (Q.onerror) {
                Q.onerror(e);
            } else {
                throw e;
            }
        }

        if (!threw) {
            deferred.notify(newValue);
        }
    }]);

    return deferred.promise;
};

Q.tap = function (promise, callback) {
    return Q(promise).tap(callback);
};

/**
 * Works almost like "finally", but not called for rejections.
 * Original resolution value is passed through callback unaffected.
 * Callback may return a promise that will be awaited for.
 * @param {Function} callback
 * @returns {Q.Promise}
 * @example
 * doSomething()
 *   .then(...)
 *   .tap(console.log)
 *   .then(...);
 */
Promise.prototype.tap = function (callback) {
    callback = Q(callback);

    return this.then(function (value) {
        return callback.fcall(value).thenResolve(value);
    });
};

/**
 * Registers an observer on a promise.
 *
 * Guarantees:
 *
 * 1. that fulfilled and rejected will be called only once.
 * 2. that either the fulfilled callback or the rejected callback will be
 *    called, but not both.
 * 3. that fulfilled and rejected will not be called in this turn.
 *
 * @param value      promise or immediate reference to observe
 * @param fulfilled  function to be called with the fulfilled value
 * @param rejected   function to be called with the rejection exception
 * @param progressed function to be called on any progress notifications
 * @return promise for the return value from the invoked callback
 */
Q.when = when;
function when(value, fulfilled, rejected, progressed) {
    return Q(value).then(fulfilled, rejected, progressed);
}

Promise.prototype.thenResolve = function (value) {
    return this.then(function () { return value; });
};

Q.thenResolve = function (promise, value) {
    return Q(promise).thenResolve(value);
};

Promise.prototype.thenReject = function (reason) {
    return this.then(function () { throw reason; });
};

Q.thenReject = function (promise, reason) {
    return Q(promise).thenReject(reason);
};

/**
 * If an object is not a promise, it is as "near" as possible.
 * If a promise is rejected, it is as "near" as possible too.
 * If it’s a fulfilled promise, the fulfillment value is nearer.
 * If it’s a deferred promise and the deferred has been resolved, the
 * resolution is "nearer".
 * @param object
 * @returns most resolved (nearest) form of the object
 */

// XXX should we re-do this?
Q.nearer = nearer;
function nearer(value) {
    if (isPromise(value)) {
        var inspected = value.inspect();
        if (inspected.state === "fulfilled") {
            return inspected.value;
        }
    }
    return value;
}

/**
 * @returns whether the given object is a promise.
 * Otherwise it is a fulfilled value.
 */
Q.isPromise = isPromise;
function isPromise(object) {
    return object instanceof Promise;
}

Q.isPromiseAlike = isPromiseAlike;
function isPromiseAlike(object) {
    return isObject(object) && typeof object.then === "function";
}

/**
 * @returns whether the given object is a pending promise, meaning not
 * fulfilled or rejected.
 */
Q.isPending = isPending;
function isPending(object) {
    return isPromise(object) && object.inspect().state === "pending";
}

Promise.prototype.isPending = function () {
    return this.inspect().state === "pending";
};

/**
 * @returns whether the given object is a value or fulfilled
 * promise.
 */
Q.isFulfilled = isFulfilled;
function isFulfilled(object) {
    return !isPromise(object) || object.inspect().state === "fulfilled";
}

Promise.prototype.isFulfilled = function () {
    return this.inspect().state === "fulfilled";
};

/**
 * @returns whether the given object is a rejected promise.
 */
Q.isRejected = isRejected;
function isRejected(object) {
    return isPromise(object) && object.inspect().state === "rejected";
}

Promise.prototype.isRejected = function () {
    return this.inspect().state === "rejected";
};

//// BEGIN UNHANDLED REJECTION TRACKING

// This promise library consumes exceptions thrown in handlers so they can be
// handled by a subsequent promise.  The exceptions get added to this array when
// they are created, and removed when they are handled.  Note that in ES6 or
// shimmed environments, this would naturally be a `Set`.
var unhandledReasons = [];
var unhandledRejections = [];
var reportedUnhandledRejections = [];
var trackUnhandledRejections = true;

function resetUnhandledRejections() {
    unhandledReasons.length = 0;
    unhandledRejections.length = 0;

    if (!trackUnhandledRejections) {
        trackUnhandledRejections = true;
    }
}

function trackRejection(promise, reason) {
    if (!trackUnhandledRejections) {
        return;
    }
    if (typeof process === "object" && typeof process.emit === "function") {
        Q.nextTick.runAfter(function () {
            if (array_indexOf(unhandledRejections, promise) !== -1) {
                process.emit("unhandledRejection", reason, promise);
                reportedUnhandledRejections.push(promise);
            }
        });
    }

    unhandledRejections.push(promise);
    if (reason && typeof reason.stack !== "undefined") {
        unhandledReasons.push(reason.stack);
    } else {
        unhandledReasons.push("(no stack) " + reason);
    }
}

function untrackRejection(promise) {
    if (!trackUnhandledRejections) {
        return;
    }

    var at = array_indexOf(unhandledRejections, promise);
    if (at !== -1) {
        if (typeof process === "object" && typeof process.emit === "function") {
            Q.nextTick.runAfter(function () {
                var atReport = array_indexOf(reportedUnhandledRejections, promise);
                if (atReport !== -1) {
                    process.emit("rejectionHandled", unhandledReasons[at], promise);
                    reportedUnhandledRejections.splice(atReport, 1);
                }
            });
        }
        unhandledRejections.splice(at, 1);
        unhandledReasons.splice(at, 1);
    }
}

Q.resetUnhandledRejections = resetUnhandledRejections;

Q.getUnhandledReasons = function () {
    // Make a copy so that consumers can't interfere with our internal state.
    return unhandledReasons.slice();
};

Q.stopUnhandledRejectionTracking = function () {
    resetUnhandledRejections();
    trackUnhandledRejections = false;
};

resetUnhandledRejections();

//// END UNHANDLED REJECTION TRACKING

/**
 * Constructs a rejected promise.
 * @param reason value describing the failure
 */
Q.reject = reject;
function reject(reason) {
    var rejection = Promise({
        "when": function (rejected) {
            // note that the error has been handled
            if (rejected) {
                untrackRejection(this);
            }
            return rejected ? rejected(reason) : this;
        }
    }, function fallback() {
        return this;
    }, function inspect() {
        return { state: "rejected", reason: reason };
    });

    // Note that the reason has not been handled.
    trackRejection(rejection, reason);

    return rejection;
}

/**
 * Constructs a fulfilled promise for an immediate reference.
 * @param value immediate reference
 */
Q.fulfill = fulfill;
function fulfill(value) {
    return Promise({
        "when": function () {
            return value;
        },
        "get": function (name) {
            return value[name];
        },
        "set": function (name, rhs) {
            value[name] = rhs;
        },
        "delete": function (name) {
            delete value[name];
        },
        "post": function (name, args) {
            // Mark Miller proposes that post with no name should apply a
            // promised function.
            if (name === null || name === void 0) {
                return value.apply(void 0, args);
            } else {
                return value[name].apply(value, args);
            }
        },
        "apply": function (thisp, args) {
            return value.apply(thisp, args);
        },
        "keys": function () {
            return object_keys(value);
        }
    }, void 0, function inspect() {
        return { state: "fulfilled", value: value };
    });
}

/**
 * Converts thenables to Q promises.
 * @param promise thenable promise
 * @returns a Q promise
 */
function coerce(promise) {
    var deferred = defer();
    Q.nextTick(function () {
        try {
            promise.then(deferred.resolve, deferred.reject, deferred.notify);
        } catch (exception) {
            deferred.reject(exception);
        }
    });
    return deferred.promise;
}

/**
 * Annotates an object such that it will never be
 * transferred away from this process over any promise
 * communication channel.
 * @param object
 * @returns promise a wrapping of that object that
 * additionally responds to the "isDef" message
 * without a rejection.
 */
Q.master = master;
function master(object) {
    return Promise({
        "isDef": function () {}
    }, function fallback(op, args) {
        return dispatch(object, op, args);
    }, function () {
        return Q(object).inspect();
    });
}

/**
 * Spreads the values of a promised array of arguments into the
 * fulfillment callback.
 * @param fulfilled callback that receives variadic arguments from the
 * promised array
 * @param rejected callback that receives the exception if the promise
 * is rejected.
 * @returns a promise for the return value or thrown exception of
 * either callback.
 */
Q.spread = spread;
function spread(value, fulfilled, rejected) {
    return Q(value).spread(fulfilled, rejected);
}

Promise.prototype.spread = function (fulfilled, rejected) {
    return this.all().then(function (array) {
        return fulfilled.apply(void 0, array);
    }, rejected);
};

/**
 * The async function is a decorator for generator functions, turning
 * them into asynchronous generators.  Although generators are only part
 * of the newest ECMAScript 6 drafts, this code does not cause syntax
 * errors in older engines.  This code should continue to work and will
 * in fact improve over time as the language improves.
 *
 * ES6 generators are currently part of V8 version 3.19 with the
 * --harmony-generators runtime flag enabled.  SpiderMonkey has had them
 * for longer, but under an older Python-inspired form.  This function
 * works on both kinds of generators.
 *
 * Decorates a generator function such that:
 *  - it may yield promises
 *  - execution will continue when that promise is fulfilled
 *  - the value of the yield expression will be the fulfilled value
 *  - it returns a promise for the return value (when the generator
 *    stops iterating)
 *  - the decorated function returns a promise for the return value
 *    of the generator or the first rejected promise among those
 *    yielded.
 *  - if an error is thrown in the generator, it propagates through
 *    every following yield until it is caught, or until it escapes
 *    the generator function altogether, and is translated into a
 *    rejection for the promise returned by the decorated generator.
 */
Q.async = async;
function async(makeGenerator) {
    return function () {
        // when verb is "send", arg is a value
        // when verb is "throw", arg is an exception
        function continuer(verb, arg) {
            var result;

            // Until V8 3.19 / Chromium 29 is released, SpiderMonkey is the only
            // engine that has a deployed base of browsers that support generators.
            // However, SM's generators use the Python-inspired semantics of
            // outdated ES6 drafts.  We would like to support ES6, but we'd also
            // like to make it possible to use generators in deployed browsers, so
            // we also support Python-style generators.  At some point we can remove
            // this block.

            if (typeof StopIteration === "undefined") {
                // ES6 Generators
                try {
                    result = generator[verb](arg);
                } catch (exception) {
                    return reject(exception);
                }
                if (result.done) {
                    return Q(result.value);
                } else {
                    return when(result.value, callback, errback);
                }
            } else {
                // SpiderMonkey Generators
                // FIXME: Remove this case when SM does ES6 generators.
                try {
                    result = generator[verb](arg);
                } catch (exception) {
                    if (isStopIteration(exception)) {
                        return Q(exception.value);
                    } else {
                        return reject(exception);
                    }
                }
                return when(result, callback, errback);
            }
        }
        var generator = makeGenerator.apply(this, arguments);
        var callback = continuer.bind(continuer, "next");
        var errback = continuer.bind(continuer, "throw");
        return callback();
    };
}

/**
 * The spawn function is a small wrapper around async that immediately
 * calls the generator and also ends the promise chain, so that any
 * unhandled errors are thrown instead of forwarded to the error
 * handler. This is useful because it's extremely common to run
 * generators at the top-level to work with libraries.
 */
Q.spawn = spawn;
function spawn(makeGenerator) {
    Q.done(Q.async(makeGenerator)());
}

// FIXME: Remove this interface once ES6 generators are in SpiderMonkey.
/**
 * Throws a ReturnValue exception to stop an asynchronous generator.
 *
 * This interface is a stop-gap measure to support generator return
 * values in older Firefox/SpiderMonkey.  In browsers that support ES6
 * generators like Chromium 29, just use "return" in your generator
 * functions.
 *
 * @param value the return value for the surrounding generator
 * @throws ReturnValue exception with the value.
 * @example
 * // ES6 style
 * Q.async(function* () {
 *      var foo = yield getFooPromise();
 *      var bar = yield getBarPromise();
 *      return foo + bar;
 * })
 * // Older SpiderMonkey style
 * Q.async(function () {
 *      var foo = yield getFooPromise();
 *      var bar = yield getBarPromise();
 *      Q.return(foo + bar);
 * })
 */
Q["return"] = _return;
function _return(value) {
    throw new QReturnValue(value);
}

/**
 * The promised function decorator ensures that any promise arguments
 * are settled and passed as values (`this` is also settled and passed
 * as a value).  It will also ensure that the result of a function is
 * always a promise.
 *
 * @example
 * var add = Q.promised(function (a, b) {
 *     return a + b;
 * });
 * add(Q(a), Q(B));
 *
 * @param {function} callback The function to decorate
 * @returns {function} a function that has been decorated.
 */
Q.promised = promised;
function promised(callback) {
    return function () {
        return spread([this, all(arguments)], function (self, args) {
            return callback.apply(self, args);
        });
    };
}

/**
 * sends a message to a value in a future turn
 * @param object* the recipient
 * @param op the name of the message operation, e.g., "when",
 * @param args further arguments to be forwarded to the operation
 * @returns result {Promise} a promise for the result of the operation
 */
Q.dispatch = dispatch;
function dispatch(object, op, args) {
    return Q(object).dispatch(op, args);
}

Promise.prototype.dispatch = function (op, args) {
    var self = this;
    var deferred = defer();
    Q.nextTick(function () {
        self.promiseDispatch(deferred.resolve, op, args);
    });
    return deferred.promise;
};

/**
 * Gets the value of a property in a future turn.
 * @param object    promise or immediate reference for target object
 * @param name      name of property to get
 * @return promise for the property value
 */
Q.get = function (object, key) {
    return Q(object).dispatch("get", [key]);
};

Promise.prototype.get = function (key) {
    return this.dispatch("get", [key]);
};

/**
 * Sets the value of a property in a future turn.
 * @param object    promise or immediate reference for object object
 * @param name      name of property to set
 * @param value     new value of property
 * @return promise for the return value
 */
Q.set = function (object, key, value) {
    return Q(object).dispatch("set", [key, value]);
};

Promise.prototype.set = function (key, value) {
    return this.dispatch("set", [key, value]);
};

/**
 * Deletes a property in a future turn.
 * @param object    promise or immediate reference for target object
 * @param name      name of property to delete
 * @return promise for the return value
 */
Q.del = // XXX legacy
Q["delete"] = function (object, key) {
    return Q(object).dispatch("delete", [key]);
};

Promise.prototype.del = // XXX legacy
Promise.prototype["delete"] = function (key) {
    return this.dispatch("delete", [key]);
};

/**
 * Invokes a method in a future turn.
 * @param object    promise or immediate reference for target object
 * @param name      name of method to invoke
 * @param value     a value to post, typically an array of
 *                  invocation arguments for promises that
 *                  are ultimately backed with `resolve` values,
 *                  as opposed to those backed with URLs
 *                  wherein the posted value can be any
 *                  JSON serializable object.
 * @return promise for the return value
 */
// bound locally because it is used by other methods
Q.mapply = // XXX As proposed by "Redsandro"
Q.post = function (object, name, args) {
    return Q(object).dispatch("post", [name, args]);
};

Promise.prototype.mapply = // XXX As proposed by "Redsandro"
Promise.prototype.post = function (name, args) {
    return this.dispatch("post", [name, args]);
};

/**
 * Invokes a method in a future turn.
 * @param object    promise or immediate reference for target object
 * @param name      name of method to invoke
 * @param ...args   array of invocation arguments
 * @return promise for the return value
 */
Q.send = // XXX Mark Miller's proposed parlance
Q.mcall = // XXX As proposed by "Redsandro"
Q.invoke = function (object, name /*...args*/) {
    return Q(object).dispatch("post", [name, array_slice(arguments, 2)]);
};

Promise.prototype.send = // XXX Mark Miller's proposed parlance
Promise.prototype.mcall = // XXX As proposed by "Redsandro"
Promise.prototype.invoke = function (name /*...args*/) {
    return this.dispatch("post", [name, array_slice(arguments, 1)]);
};

/**
 * Applies the promised function in a future turn.
 * @param object    promise or immediate reference for target function
 * @param args      array of application arguments
 */
Q.fapply = function (object, args) {
    return Q(object).dispatch("apply", [void 0, args]);
};

Promise.prototype.fapply = function (args) {
    return this.dispatch("apply", [void 0, args]);
};

/**
 * Calls the promised function in a future turn.
 * @param object    promise or immediate reference for target function
 * @param ...args   array of application arguments
 */
Q["try"] =
Q.fcall = function (object /* ...args*/) {
    return Q(object).dispatch("apply", [void 0, array_slice(arguments, 1)]);
};

Promise.prototype.fcall = function (/*...args*/) {
    return this.dispatch("apply", [void 0, array_slice(arguments)]);
};

/**
 * Binds the promised function, transforming return values into a fulfilled
 * promise and thrown errors into a rejected one.
 * @param object    promise or immediate reference for target function
 * @param ...args   array of application arguments
 */
Q.fbind = function (object /*...args*/) {
    var promise = Q(object);
    var args = array_slice(arguments, 1);
    return function fbound() {
        return promise.dispatch("apply", [
            this,
            args.concat(array_slice(arguments))
        ]);
    };
};
Promise.prototype.fbind = function (/*...args*/) {
    var promise = this;
    var args = array_slice(arguments);
    return function fbound() {
        return promise.dispatch("apply", [
            this,
            args.concat(array_slice(arguments))
        ]);
    };
};

/**
 * Requests the names of the owned properties of a promised
 * object in a future turn.
 * @param object    promise or immediate reference for target object
 * @return promise for the keys of the eventually settled object
 */
Q.keys = function (object) {
    return Q(object).dispatch("keys", []);
};

Promise.prototype.keys = function () {
    return this.dispatch("keys", []);
};

/**
 * Turns an array of promises into a promise for an array.  If any of
 * the promises gets rejected, the whole array is rejected immediately.
 * @param {Array*} an array (or promise for an array) of values (or
 * promises for values)
 * @returns a promise for an array of the corresponding values
 */
// By Mark Miller
// http://wiki.ecmascript.org/doku.php?id=strawman:concurrency&rev=1308776521#allfulfilled
Q.all = all;
function all(promises) {
    return when(promises, function (promises) {
        var pendingCount = 0;
        var deferred = defer();
        array_reduce(promises, function (undefined, promise, index) {
            var snapshot;
            if (
                isPromise(promise) &&
                (snapshot = promise.inspect()).state === "fulfilled"
            ) {
                promises[index] = snapshot.value;
            } else {
                ++pendingCount;
                when(
                    promise,
                    function (value) {
                        promises[index] = value;
                        if (--pendingCount === 0) {
                            deferred.resolve(promises);
                        }
                    },
                    deferred.reject,
                    function (progress) {
                        deferred.notify({ index: index, value: progress });
                    }
                );
            }
        }, void 0);
        if (pendingCount === 0) {
            deferred.resolve(promises);
        }
        return deferred.promise;
    });
}

Promise.prototype.all = function () {
    return all(this);
};

/**
 * Returns the first resolved promise of an array. Prior rejected promises are
 * ignored.  Rejects only if all promises are rejected.
 * @param {Array*} an array containing values or promises for values
 * @returns a promise fulfilled with the value of the first resolved promise,
 * or a rejected promise if all promises are rejected.
 */
Q.any = any;

function any(promises) {
    if (promises.length === 0) {
        return Q.resolve();
    }

    var deferred = Q.defer();
    var pendingCount = 0;
    array_reduce(promises, function (prev, current, index) {
        var promise = promises[index];

        pendingCount++;

        when(promise, onFulfilled, onRejected, onProgress);
        function onFulfilled(result) {
            deferred.resolve(result);
        }
        function onRejected() {
            pendingCount--;
            if (pendingCount === 0) {
                deferred.reject(new Error(
                    "Can't get fulfillment value from any promise, all " +
                    "promises were rejected."
                ));
            }
        }
        function onProgress(progress) {
            deferred.notify({
                index: index,
                value: progress
            });
        }
    }, undefined);

    return deferred.promise;
}

Promise.prototype.any = function () {
    return any(this);
};

/**
 * Waits for all promises to be settled, either fulfilled or
 * rejected.  This is distinct from `all` since that would stop
 * waiting at the first rejection.  The promise returned by
 * `allResolved` will never be rejected.
 * @param promises a promise for an array (or an array) of promises
 * (or values)
 * @return a promise for an array of promises
 */
Q.allResolved = deprecate(allResolved, "allResolved", "allSettled");
function allResolved(promises) {
    return when(promises, function (promises) {
        promises = array_map(promises, Q);
        return when(all(array_map(promises, function (promise) {
            return when(promise, noop, noop);
        })), function () {
            return promises;
        });
    });
}

Promise.prototype.allResolved = function () {
    return allResolved(this);
};

/**
 * @see Promise#allSettled
 */
Q.allSettled = allSettled;
function allSettled(promises) {
    return Q(promises).allSettled();
}

/**
 * Turns an array of promises into a promise for an array of their states (as
 * returned by `inspect`) when they have all settled.
 * @param {Array[Any*]} values an array (or promise for an array) of values (or
 * promises for values)
 * @returns {Array[State]} an array of states for the respective values.
 */
Promise.prototype.allSettled = function () {
    return this.then(function (promises) {
        return all(array_map(promises, function (promise) {
            promise = Q(promise);
            function regardless() {
                return promise.inspect();
            }
            return promise.then(regardless, regardless);
        }));
    });
};

/**
 * Captures the failure of a promise, giving an oportunity to recover
 * with a callback.  If the given promise is fulfilled, the returned
 * promise is fulfilled.
 * @param {Any*} promise for something
 * @param {Function} callback to fulfill the returned promise if the
 * given promise is rejected
 * @returns a promise for the return value of the callback
 */
Q.fail = // XXX legacy
Q["catch"] = function (object, rejected) {
    return Q(object).then(void 0, rejected);
};

Promise.prototype.fail = // XXX legacy
Promise.prototype["catch"] = function (rejected) {
    return this.then(void 0, rejected);
};

/**
 * Attaches a listener that can respond to progress notifications from a
 * promise's originating deferred. This listener receives the exact arguments
 * passed to ``deferred.notify``.
 * @param {Any*} promise for something
 * @param {Function} callback to receive any progress notifications
 * @returns the given promise, unchanged
 */
Q.progress = progress;
function progress(object, progressed) {
    return Q(object).then(void 0, void 0, progressed);
}

Promise.prototype.progress = function (progressed) {
    return this.then(void 0, void 0, progressed);
};

/**
 * Provides an opportunity to observe the settling of a promise,
 * regardless of whether the promise is fulfilled or rejected.  Forwards
 * the resolution to the returned promise when the callback is done.
 * The callback can return a promise to defer completion.
 * @param {Any*} promise
 * @param {Function} callback to observe the resolution of the given
 * promise, takes no arguments.
 * @returns a promise for the resolution of the given promise when
 * ``fin`` is done.
 */
Q.fin = // XXX legacy
Q["finally"] = function (object, callback) {
    return Q(object)["finally"](callback);
};

Promise.prototype.fin = // XXX legacy
Promise.prototype["finally"] = function (callback) {
    callback = Q(callback);
    return this.then(function (value) {
        return callback.fcall().then(function () {
            return value;
        });
    }, function (reason) {
        // TODO attempt to recycle the rejection with "this".
        return callback.fcall().then(function () {
            throw reason;
        });
    });
};

/**
 * Terminates a chain of promises, forcing rejections to be
 * thrown as exceptions.
 * @param {Any*} promise at the end of a chain of promises
 * @returns nothing
 */
Q.done = function (object, fulfilled, rejected, progress) {
    return Q(object).done(fulfilled, rejected, progress);
};

Promise.prototype.done = function (fulfilled, rejected, progress) {
    var onUnhandledError = function (error) {
        // forward to a future turn so that ``when``
        // does not catch it and turn it into a rejection.
        Q.nextTick(function () {
            makeStackTraceLong(error, promise);
            if (Q.onerror) {
                Q.onerror(error);
            } else {
                throw error;
            }
        });
    };

    // Avoid unnecessary `nextTick`ing via an unnecessary `when`.
    var promise = fulfilled || rejected || progress ?
        this.then(fulfilled, rejected, progress) :
        this;

    if (typeof process === "object" && process && process.domain) {
        onUnhandledError = process.domain.bind(onUnhandledError);
    }

    promise.then(void 0, onUnhandledError);
};

/**
 * Causes a promise to be rejected if it does not get fulfilled before
 * some milliseconds time out.
 * @param {Any*} promise
 * @param {Number} milliseconds timeout
 * @param {Any*} custom error message or Error object (optional)
 * @returns a promise for the resolution of the given promise if it is
 * fulfilled before the timeout, otherwise rejected.
 */
Q.timeout = function (object, ms, error) {
    return Q(object).timeout(ms, error);
};

Promise.prototype.timeout = function (ms, error) {
    var deferred = defer();
    var timeoutId = setTimeout(function () {
        if (!error || "string" === typeof error) {
            error = new Error(error || "Timed out after " + ms + " ms");
            error.code = "ETIMEDOUT";
        }
        deferred.reject(error);
    }, ms);

    this.then(function (value) {
        clearTimeout(timeoutId);
        deferred.resolve(value);
    }, function (exception) {
        clearTimeout(timeoutId);
        deferred.reject(exception);
    }, deferred.notify);

    return deferred.promise;
};

/**
 * Returns a promise for the given value (or promised value), some
 * milliseconds after it resolved. Passes rejections immediately.
 * @param {Any*} promise
 * @param {Number} milliseconds
 * @returns a promise for the resolution of the given promise after milliseconds
 * time has elapsed since the resolution of the given promise.
 * If the given promise rejects, that is passed immediately.
 */
Q.delay = function (object, timeout) {
    if (timeout === void 0) {
        timeout = object;
        object = void 0;
    }
    return Q(object).delay(timeout);
};

Promise.prototype.delay = function (timeout) {
    return this.then(function (value) {
        var deferred = defer();
        setTimeout(function () {
            deferred.resolve(value);
        }, timeout);
        return deferred.promise;
    });
};

/**
 * Passes a continuation to a Node function, which is called with the given
 * arguments provided as an array, and returns a promise.
 *
 *      Q.nfapply(FS.readFile, [__filename])
 *      .then(function (content) {
 *      })
 *
 */
Q.nfapply = function (callback, args) {
    return Q(callback).nfapply(args);
};

Promise.prototype.nfapply = function (args) {
    var deferred = defer();
    var nodeArgs = array_slice(args);
    nodeArgs.push(deferred.makeNodeResolver());
    this.fapply(nodeArgs).fail(deferred.reject);
    return deferred.promise;
};

/**
 * Passes a continuation to a Node function, which is called with the given
 * arguments provided individually, and returns a promise.
 * @example
 * Q.nfcall(FS.readFile, __filename)
 * .then(function (content) {
 * })
 *
 */
Q.nfcall = function (callback /*...args*/) {
    var args = array_slice(arguments, 1);
    return Q(callback).nfapply(args);
};

Promise.prototype.nfcall = function (/*...args*/) {
    var nodeArgs = array_slice(arguments);
    var deferred = defer();
    nodeArgs.push(deferred.makeNodeResolver());
    this.fapply(nodeArgs).fail(deferred.reject);
    return deferred.promise;
};

/**
 * Wraps a NodeJS continuation passing function and returns an equivalent
 * version that returns a promise.
 * @example
 * Q.nfbind(FS.readFile, __filename)("utf-8")
 * .then(console.log)
 * .done()
 */
Q.nfbind =
Q.denodeify = function (callback /*...args*/) {
    var baseArgs = array_slice(arguments, 1);
    return function () {
        var nodeArgs = baseArgs.concat(array_slice(arguments));
        var deferred = defer();
        nodeArgs.push(deferred.makeNodeResolver());
        Q(callback).fapply(nodeArgs).fail(deferred.reject);
        return deferred.promise;
    };
};

Promise.prototype.nfbind =
Promise.prototype.denodeify = function (/*...args*/) {
    var args = array_slice(arguments);
    args.unshift(this);
    return Q.denodeify.apply(void 0, args);
};

Q.nbind = function (callback, thisp /*...args*/) {
    var baseArgs = array_slice(arguments, 2);
    return function () {
        var nodeArgs = baseArgs.concat(array_slice(arguments));
        var deferred = defer();
        nodeArgs.push(deferred.makeNodeResolver());
        function bound() {
            return callback.apply(thisp, arguments);
        }
        Q(bound).fapply(nodeArgs).fail(deferred.reject);
        return deferred.promise;
    };
};

Promise.prototype.nbind = function (/*thisp, ...args*/) {
    var args = array_slice(arguments, 0);
    args.unshift(this);
    return Q.nbind.apply(void 0, args);
};

/**
 * Calls a method of a Node-style object that accepts a Node-style
 * callback with a given array of arguments, plus a provided callback.
 * @param object an object that has the named method
 * @param {String} name name of the method of object
 * @param {Array} args arguments to pass to the method; the callback
 * will be provided by Q and appended to these arguments.
 * @returns a promise for the value or error
 */
Q.nmapply = // XXX As proposed by "Redsandro"
Q.npost = function (object, name, args) {
    return Q(object).npost(name, args);
};

Promise.prototype.nmapply = // XXX As proposed by "Redsandro"
Promise.prototype.npost = function (name, args) {
    var nodeArgs = array_slice(args || []);
    var deferred = defer();
    nodeArgs.push(deferred.makeNodeResolver());
    this.dispatch("post", [name, nodeArgs]).fail(deferred.reject);
    return deferred.promise;
};

/**
 * Calls a method of a Node-style object that accepts a Node-style
 * callback, forwarding the given variadic arguments, plus a provided
 * callback argument.
 * @param object an object that has the named method
 * @param {String} name name of the method of object
 * @param ...args arguments to pass to the method; the callback will
 * be provided by Q and appended to these arguments.
 * @returns a promise for the value or error
 */
Q.nsend = // XXX Based on Mark Miller's proposed "send"
Q.nmcall = // XXX Based on "Redsandro's" proposal
Q.ninvoke = function (object, name /*...args*/) {
    var nodeArgs = array_slice(arguments, 2);
    var deferred = defer();
    nodeArgs.push(deferred.makeNodeResolver());
    Q(object).dispatch("post", [name, nodeArgs]).fail(deferred.reject);
    return deferred.promise;
};

Promise.prototype.nsend = // XXX Based on Mark Miller's proposed "send"
Promise.prototype.nmcall = // XXX Based on "Redsandro's" proposal
Promise.prototype.ninvoke = function (name /*...args*/) {
    var nodeArgs = array_slice(arguments, 1);
    var deferred = defer();
    nodeArgs.push(deferred.makeNodeResolver());
    this.dispatch("post", [name, nodeArgs]).fail(deferred.reject);
    return deferred.promise;
};

/**
 * If a function would like to support both Node continuation-passing-style and
 * promise-returning-style, it can end its internal promise chain with
 * `nodeify(nodeback)`, forwarding the optional nodeback argument.  If the user
 * elects to use a nodeback, the result will be sent there.  If they do not
 * pass a nodeback, they will receive the result promise.
 * @param object a result (or a promise for a result)
 * @param {Function} nodeback a Node.js-style callback
 * @returns either the promise or nothing
 */
Q.nodeify = nodeify;
function nodeify(object, nodeback) {
    return Q(object).nodeify(nodeback);
}

Promise.prototype.nodeify = function (nodeback) {
    if (nodeback) {
        this.then(function (value) {
            Q.nextTick(function () {
                nodeback(null, value);
            });
        }, function (error) {
            Q.nextTick(function () {
                nodeback(error);
            });
        });
    } else {
        return this;
    }
};

Q.noConflict = function() {
    throw new Error("Q.noConflict only works when Q is used as a global");
};

// All code before this point will be filtered from stack traces.
var qEndingLine = captureLine();

return Q;

});

}).call(this,require("FWaASH"))
},{"FWaASH":1}],3:[function(require,module,exports){
var Config;

Config = {
  NAME: "CLC Pricing Estimator",
  PRICING_ROOT_PATH: "/prices/",
  DATACENTERS_URL: "/prices/data-center-prices.json",
  CURRENCY_URL: "./json/exchange-rates.json",
  DEFAULT_CURRENCY: {
    id: "USD",
    rate: 1.0,
    symbol: "$"
  },
  init: function(app, cb) {
    $.getJSON('./json/data-config.json', (function(_this) {
      return function(data) {
        var config;
        config = data;
        _this.NAME = config.name;
        _this.PRICING_ROOT_PATH = config.pricingRootPath;
        _this.DATACENTERS_URL = config.datacentersUrl;
        _this.CURRENCY_URL = config.currencyUrl;
        _this.SUPPORT_PRICING_URL = config.supportPricingUrl;
        _this.DEFAULT_CURRENCY = config.defaultCurrency;
        return $.getJSON(_this.DATACENTERS_URL, function(datacentersData) {
          app.datacentersData = datacentersData;
          return $.getJSON(_this.CURRENCY_URL, function(currencyData) {
            app.currencyData = currencyData;
            return cb.resolve();
          });
        });
      };
    })(this));
    return cb.promise;
  }
};

module.exports = Config;


},{}],4:[function(require,module,exports){
var Utils;

Utils = {
  getUrlParameter: function(sParam) {
    var i, sPageURL, sParameterName, sURLVariables;
    sPageURL = window.location.search.substring(1);
    sURLVariables = sPageURL.split('&');
    i = 0;
    while (i < sURLVariables.length) {
      sParameterName = sURLVariables[i].split('=');
      if (sParameterName[0] === sParam) {
        return sParameterName[1];
      }
      i++;
    }
  },
  getUrlParameterFromHash: function(sParam) {
    var i, sPageURL, sParameterName, sURLVariables;
    sPageURL = window.location.hash.substring(1);
    sURLVariables = sPageURL.split('&');
    i = 0;
    while (i < sURLVariables.length) {
      sParameterName = sURLVariables[i].split('=');
      if (sParameterName[0] === sParam) {
        return sParameterName[1];
      }
      i++;
    }
  }
};

module.exports = Utils;


},{}],5:[function(require,module,exports){
var AppfogCollection, AppfogModel;

AppfogModel = require('../models/AppfogModel.coffee');

AppfogCollection = Backbone.Collection.extend({
  model: AppfogModel,
  parse: function(data) {
    return data;
  },
  initPricing: function(pricingMap) {
    this.each((function(_this) {
      return function(appfog) {
        return appfog.updatePricing(pricingMap);
      };
    })(this));
    return this.trigger('datacenterUpdate');
  },
  subtotal: function() {
    return _.reduce(this.models, function(memo, appfog) {
      return memo + appfog.totalPricePerMonth();
    }, 0);
  },
  removeAll: function() {
    return this.each((function(_this) {
      return function(appfog) {
        return appfog.destroy();
      };
    })(this));
  }
});

module.exports = AppfogCollection;


},{"../models/AppfogModel.coffee":13}],6:[function(require,module,exports){
var BaremetalCollection, BaremetalModel;

BaremetalModel = require('../models/BaremetalModel.coffee');

BaremetalCollection = Backbone.Collection.extend({
  model: BaremetalModel,
  parse: function(data) {
    return data;
  },
  initPricing: function(pricingMap) {
    this.each((function(_this) {
      return function(baremetal) {
        return baremetal.updatePricing(pricingMap);
      };
    })(this));
    return this.trigger('datacenterUpdate');
  },
  subtotal: function() {
    return _.reduce(this.models, function(memo, baremetal) {
      return memo + baremetal.totalPricePerMonth();
    }, 0);
  },
  removeAll: function() {
    return this.each((function(_this) {
      return function(baremetal) {
        return baremetal.destroy();
      };
    })(this));
  }
});

module.exports = BaremetalCollection;


},{"../models/BaremetalModel.coffee":14}],7:[function(require,module,exports){
var IpsCollection, IpsModel;

IpsModel = require('../models/IpsModel.coffee');

IpsCollection = Backbone.Collection.extend({
  model: IpsModel,
  parse: function(data) {
    return data;
  },
  initPricing: function(pricingMap) {
    this.each((function(_this) {
      return function(ips) {
        return ips.updatePricing(pricingMap);
      };
    })(this));
    return this.trigger('datacenterUpdate');
  },
  subtotal: function() {
    return _.reduce(this.models, function(memo, ips) {
      return memo + ips.totalPricePerMonth();
    }, 0);
  },
  removeAll: function() {
    return this.each((function(_this) {
      return function(ips) {
        return ips.destroy();
      };
    })(this));
  }
});

module.exports = IpsCollection;


},{"../models/IpsModel.coffee":15}],8:[function(require,module,exports){
var Config, DEFAULT_SERVER_DATA, HOURS_IN_MONTH, PricingMapsCollection, PricingModel;

PricingModel = require('../models/PricingMapModel.coffee');

Config = require('../Config.coffee');

DEFAULT_SERVER_DATA = require('../data/server.coffee');

HOURS_IN_MONTH = 720;

PricingMapsCollection = Backbone.Collection.extend({
  model: PricingModel,
  initialize: function(models, options) {
    this.currencyId = options.currency;
    this.app = options.app;
    this.url = options.url;
    this.currency = options.currency;
    return this.fetch();
  },
  parse: function(data) {
    return this._parsePricingData(data);
  },
  forKey: function(type) {
    return _.first(this.where({
      "type": type
    }));
  },
  _parsePricingData: function(data) {
    var additional_services, baremetal, output, rdbs, server, software_licenses;
    output = [];
    additional_services = [];
    software_licenses = [];
    rdbs = {
      type: "rdbs",
      options: {}
    };
    server = {
      type: "server",
      options: {
        os: {
          linux: 0,
          redhat: 0.04,
          windows: 0.04,
          "redhat-managed": "disabled",
          "windows-managed": "disabled"
        },
        storage: {
          standard: 0.15,
          premium: 0.5,
          "hyperscale": "disabled"
        }
      }
    };
    baremetal = {
      type: 'baremetal',
      options: {
        config: {},
        os: {}
      }
    };
    _.each(data, (function(_this) {
      return function(section) {
        if (section.name === "Software") {
          _.each(section.products, function(product) {
            var item, software_price;
            software_price = product.hourly;
            item = {
              name: product.name,
              price: software_price
            };
            return software_licenses.push(item);
          });
        }
        if (section.products != null) {
          return _.each(section.products, function(product) {
            var enabled, ids, price, service;
            if (_.has(product, 'key')) {
              ids = product.key.split(":");
              if (ids[0] === 'server') {
                if (ids[1] === 'os') {
                  price = product.hourly || 0;
                  return server.options[ids[1]][ids[2]] = price;
                } else if (ids[1] === 'storage') {
                  price = product.hourly * HOURS_IN_MONTH;
                  return server.options[ids[1]][ids[2]] = price;
                } else {
                  price = product.hourly || product.monthly;
                  return server.options[ids[1]] = price;
                }
              } else if (ids[0] === 'rdbs') {
                if (ids[2]) {
                  if (!rdbs.options[ids[2]]) {
                    rdbs.options[ids[2]] = {};
                  }
                  price = product.hourly;
                  if (ids[2] === 'storage') {
                    price = price * HOURS_IN_MONTH;
                  }
                  return rdbs.options[ids[2]][ids[1]] = price;
                }
              } else if (ids[0] === 'networking-services') {
                if (ids[1] === 'shared-load-balancer') {
                  price = product.hourly * HOURS_IN_MONTH;
                } else if (ids[1] === 'dedicated-load-balancer-200' || ids[1] === 'dedicated-load-balancer-1000') {
                  price = product.monthly;
                } else {
                  price = product.monthly;
                }
                service = {
                  type: ids[1],
                  price: price,
                  hasSetupFee: product.setupFee != null
                };
                return additional_services.push(service);
              } else if (ids[0] === 'managed-apps') {
                price = product.hourly;
                return server.options[ids[1]] = price;
              } else if (ids[0] === 'networking') {
                if (ids[1] === 'bandwidth') {
                  price = product.monthly;
                  service = {
                    type: 'bandwidth',
                    price: price,
                    hasSetupFee: product.setupFee != null
                  };
                  return additional_services.push(service);
                } else if (ids[1] === 'object-storage') {
                  price = product.monthly;
                  enabled = (ids[2] != null) && ids[2] === 'enabled';
                  service = {
                    type: 'object-storage',
                    price: price,
                    disabled: !enabled,
                    hasSetupFee: product.setupFee != null
                  };
                  return additional_services.push(service);
                }
              } else if (ids[0] === 'ips') {
                price = product.hourly;
                service = {
                  type: 'ips',
                  price: price
                };
                return additional_services.push(service);
              } else if (ids[0] === 'appfog') {
                price = product.hourly;
                service = {
                  type: 'appfog',
                  price: price
                };
                return additional_services.push(service);
              } else if (ids[0] === 'baremetal') {
                return baremetal.options[ids[1]][ids[2]] = product;
              }
            }
          });
        }
      };
    })(this));
    server.options["software"] = software_licenses;
    if (rdbs.options.cpu) {
      output.push(rdbs);
    }
    output.push(server);
    output.push(baremetal);
    _.each(additional_services, function(ser) {
      return output.push(ser);
    });
    return output;
  }
});

module.exports = PricingMapsCollection;


},{"../Config.coffee":3,"../data/server.coffee":12,"../models/PricingMapModel.coffee":16}],9:[function(require,module,exports){
var RdbsModel, RdbssCollection;

RdbsModel = require('../models/RdbsModel.coffee');

RdbssCollection = Backbone.Collection.extend({
  model: RdbsModel,
  parse: function(data) {
    return data;
  },
  subtotal: function() {
    return _.reduce(this.models, function(memo, rdbs) {
      return memo + rdbs.totalPricePerMonth();
    }, 0);
  },
  removeAll: function() {
    return this.each((function(_this) {
      return function(rdbs) {
        return rdbs.destroy();
      };
    })(this));
  },
  initPricing: function(pricingMaps) {
    this.each((function(_this) {
      return function(rdbs) {
        var pricingMap;
        pricingMap = pricingMaps.forKey("rdbs");
        return rdbs.updatePricing(pricingMap);
      };
    })(this));
    return this.trigger('datacenterUpdate');
  }
});

module.exports = RdbssCollection;


},{"../models/RdbsModel.coffee":17}],10:[function(require,module,exports){
var ServerModel, ServersCollection;

ServerModel = require('../models/ServerModel.coffee');

ServersCollection = Backbone.Collection.extend({
  model: ServerModel,
  parse: function(data) {
    return data;
  },
  subtotal: function() {
    return _.reduce(this.models, function(memo, server) {
      return memo + server.totalPricePerMonth() + server.managedAppsPricePerMonth();
    }, 0);
  },
  oSSubtotal: function() {
    return _.reduce(this.models, function(memo, server) {
      return memo + server.totalOSPricePerMonth();
    }, 0);
  },
  managedTotal: function() {
    return _.reduce(this.models, function(memo, server) {
      return memo + server.managedAppsPricePerMonth() + server.managedBasePricePerMonth();
    }, 0);
  },
  removeAll: function() {
    return this.each((function(_this) {
      return function(server) {
        return server.destroy();
      };
    })(this));
  },
  initPricing: function(pricingMaps) {
    this.each((function(_this) {
      return function(server) {
        var pricingMap;
        pricingMap = pricingMaps.forKey("server");
        return server.updatePricing(pricingMap);
      };
    })(this));
    return this.trigger('datacenterUpdate');
  }
});

module.exports = ServersCollection;


},{"../models/ServerModel.coffee":18}],11:[function(require,module,exports){
var ServiceModel, ServicesCollection;

ServiceModel = require('../models/ServiceModel.coffee');

ServicesCollection = Backbone.Collection.extend({
  model: ServiceModel,
  url: function() {
    return this.options.collectionUrl;
  },
  initialize: function(options) {
    this.options = options || {};
    return this.fetch();
  },
  initPricing: function(pricingMaps) {
    return this.each((function(_this) {
      return function(service) {
        var pricingMap;
        pricingMap = pricingMaps.forKey(service.get("key"));
        return service.initPricing(pricingMap);
      };
    })(this));
  },
  subtotal: function() {
    return _.reduce(this.models, function(memo, service) {
      return memo + service.totalPricePerMonth();
    }, 0);
  }
});

module.exports = ServicesCollection;


},{"../models/ServiceModel.coffee":19}],12:[function(require,module,exports){
module.exports = {
  type: "server",
  options: {
    os: {
      linux: 0,
      redhat: 0.04,
      windows: 0.04,
      "redhat-managed": "disabled",
      "windows-managed": "disabled"
    },
    storage: {
      standard: 0.15,
      premium: 0.5,
      "hyperscale": "disabled"
    }
  }
};


},{}],13:[function(require,module,exports){
var AppfogModel;

AppfogModel = Backbone.Model.extend({
  HOURS_PER_DAY: "hours_per_day",
  HOURS_PER_WEEK: "hours_per_week",
  HOURS_PER_MONTH: "hours_per_month",
  PERCENTAGE_OF_MONTH: "percentage_of_month",
  HOURS_IN_MONTH: 720,
  DAYS_IN_MONTH: 30.41666667,
  WEEKS_IN_MONTH: 4.345238095,
  defaults: {
    quantity: 1,
    memory: 1024,
    usage: 100,
    usagePeriod: 'percentage_of_month'
  },
  initialize: function() {
    return this.initPricing();
  },
  parse: function(data) {
    return data;
  },
  initPricing: function() {
    var pricing, pricingMap;
    pricingMap = this.get("pricingMap");
    if (pricingMap) {
      pricing = pricingMap.attributes.price;
    }
    return this.set("pricing", pricing || 0);
  },
  updatePricing: function(pricingMap) {
    var pricing;
    this.set("pricingMap", pricingMap);
    if (pricingMap) {
      pricing = pricingMap.attributes.price;
    }
    return this.set("pricing", pricing || 0);
  },
  totalPricePerMonth: function() {
    var memory, price, quantity;
    price = this.get("pricing");
    quantity = this.get("quantity");
    memory = this.get("memory");
    return this.priceForMonth(price * quantity * (memory / 1024));
  },
  priceForMonth: function(hourlyPrice) {
    switch (this.get("usagePeriod")) {
      case this.HOURS_PER_DAY:
        return hourlyPrice * this.get("usage") * this.DAYS_IN_MONTH;
      case this.HOURS_PER_WEEK:
        return hourlyPrice * this.get("usage") * this.WEEKS_IN_MONTH;
      case this.HOURS_PER_MONTH:
        return hourlyPrice * this.get("usage");
      case this.PERCENTAGE_OF_MONTH:
        return this.get("usage") / 100 * this.HOURS_IN_MONTH * hourlyPrice;
    }
  }
});

module.exports = AppfogModel;


},{}],14:[function(require,module,exports){
var BaremetalModel;

BaremetalModel = Backbone.Model.extend({
  HOURS_PER_DAY: "hours_per_day",
  HOURS_PER_WEEK: "hours_per_week",
  HOURS_PER_MONTH: "hours_per_month",
  PERCENTAGE_OF_MONTH: "percentage_of_month",
  HOURS_IN_MONTH: 720,
  DAYS_IN_MONTH: 30.41666667,
  WEEKS_IN_MONTH: 4.345238095,
  defaults: {
    quantity: 1,
    config: 1,
    os: 1,
    usage: 100,
    usagePeriod: 'percentage_of_month'
  },
  initialize: function() {
    return this.initPricing();
  },
  parse: function(data) {
    return data;
  },
  initPricing: function() {
    var pricing, pricingMap;
    pricingMap = this.get("pricingMap");
    if (pricingMap) {
      pricing = pricingMap.attributes.options;
    }
    return this.set("pricing", pricing || {});
  },
  updatePricing: function(pricingMap) {
    var pricing;
    this.set("pricingMap", pricingMap);
    if (pricingMap) {
      pricing = pricingMap.attributes.options;
    }
    return this.set("pricing", pricing || 0);
  },
  totalPricePerMonth: function() {
    var configPrice, configProduct, osPrice, osProduct, pricingMap, quantity, selectedConfig, selectedOs, sockets;
    pricingMap = this.get("pricing");
    if (!pricingMap || _.isEmpty(pricingMap.config)) {
      return 0;
    } else {
      quantity = this.get("quantity");
      selectedConfig = this.get("config");
      selectedOs = this.get("os");
      configProduct = pricingMap.config[selectedConfig];
      configPrice = this.priceForMonth(configProduct.hourly * quantity);
      osProduct = pricingMap.os[selectedOs];
      sockets = configProduct.sockets;
      osPrice = this.priceForMonth(osProduct.hourly * quantity * sockets);
      return configPrice + osPrice;
    }
  },
  priceForMonth: function(hourlyPrice) {
    switch (this.get("usagePeriod")) {
      case this.HOURS_PER_DAY:
        return hourlyPrice * this.get("usage") * this.DAYS_IN_MONTH;
      case this.HOURS_PER_WEEK:
        return hourlyPrice * this.get("usage") * this.WEEKS_IN_MONTH;
      case this.HOURS_PER_MONTH:
        return hourlyPrice * this.get("usage");
      case this.PERCENTAGE_OF_MONTH:
        return this.get("usage") / 100 * this.HOURS_IN_MONTH * hourlyPrice;
    }
  }
});

module.exports = BaremetalModel;


},{}],15:[function(require,module,exports){
var IpsModel;

IpsModel = Backbone.Model.extend({
  HOURS_PER_DAY: "hours_per_day",
  HOURS_PER_WEEK: "hours_per_week",
  HOURS_PER_MONTH: "hours_per_month",
  PERCENTAGE_OF_MONTH: "percentage_of_month",
  HOURS_IN_MONTH: 720,
  DAYS_IN_MONTH: 30.41666667,
  WEEKS_IN_MONTH: 4.345238095,
  defaults: {
    quantity: 1,
    memory: 1024,
    usage: 100,
    usagePeriod: 'percentage_of_month'
  },
  initialize: function() {
    return this.initPricing();
  },
  parse: function(data) {
    return data;
  },
  initPricing: function() {
    var pricing, pricingMap;
    pricingMap = this.get("pricingMap");
    if (pricingMap) {
      pricing = pricingMap.attributes.price;
    }
    return this.set("pricing", pricing || 0);
  },
  updatePricing: function(pricingMap) {
    var pricing;
    this.set("pricingMap", pricingMap);
    if (pricingMap) {
      pricing = pricingMap.attributes.price;
    }
    return this.set("pricing", pricing || 0);
  },
  totalPricePerMonth: function() {
    var price, quantity;
    price = this.get("pricing");
    quantity = this.get("quantity");
    return this.priceForMonth(price * quantity);
  },
  priceForMonth: function(hourlyPrice) {
    switch (this.get("usagePeriod")) {
      case this.HOURS_PER_DAY:
        return hourlyPrice * this.get("usage") * this.DAYS_IN_MONTH;
      case this.HOURS_PER_WEEK:
        return hourlyPrice * this.get("usage") * this.WEEKS_IN_MONTH;
      case this.HOURS_PER_MONTH:
        return hourlyPrice * this.get("usage");
      case this.PERCENTAGE_OF_MONTH:
        return this.get("usage") / 100 * this.HOURS_IN_MONTH * hourlyPrice;
    }
  }
});

module.exports = IpsModel;


},{}],16:[function(require,module,exports){
var PricingMapModel;

PricingMapModel = Backbone.Model.extend({
  initialize: function() {},
  parse: function(data) {
    return data;
  }
});

module.exports = PricingMapModel;


},{}],17:[function(require,module,exports){
var RdbsModel;

RdbsModel = Backbone.Model.extend({
  HOURS_PER_DAY: "hours_per_day",
  HOURS_PER_WEEK: "hours_per_week",
  HOURS_PER_MONTH: "hours_per_month",
  PERCENTAGE_OF_MONTH: "percentage_of_month",
  HOURS_IN_MONTH: 720,
  DAYS_IN_MONTH: 30.41666667,
  WEEKS_IN_MONTH: 4.345238095,
  defaults: {
    type: "single",
    cpu: 1,
    memory: 1,
    storage: 1,
    quantity: 1,
    usagePeriod: "percentage_of_month",
    usage: 100
  },
  initialize: function() {
    return this.initPricing();
  },
  parse: function(data) {
    return data;
  },
  initPricing: function() {
    var pricing;
    pricing = this.get("pricingMap").attributes.options;
    return this.set("pricing", pricing);
  },
  updatePricing: function(pricingMap) {
    var pricing;
    this.set("pricingMap", pricingMap);
    if (this.get("pricingMap")) {
      pricing = this.get("pricingMap").attributes.options;
      return this.set("pricing", pricing);
    }
  },
  totalCpuPerHour: function() {
    var type;
    type = this.get("type");
    return this.get("cpu") * this.get("pricing").cpu[type];
  },
  totalMemoryPerHour: function() {
    var type;
    type = this.get("type");
    return this.get("memory") * this.get("pricing").memory[type];
  },
  utilityPricePerHourPerInstance: function() {
    return this.totalCpuPerHour() + this.totalMemoryPerHour();
  },
  utilityPricePerHourTotal: function() {
    return this.utilityPricePerHourPerInstance() * this.get("quantity");
  },
  storagePricePerMonth: function() {
    var type;
    type = this.get("type");
    return this.get("storage") * this.get("pricing").storage[type] * this.get("quantity");
  },
  totalPricePerMonth: function() {
    var total, utilityPerMonth;
    utilityPerMonth = 0;
    utilityPerMonth = this.priceForMonth(this.utilityPricePerHourTotal());
    total = utilityPerMonth + this.storagePricePerMonth();
    return total;
  },
  priceForMonth: function(hourlyPrice) {
    switch (this.get("usagePeriod")) {
      case this.HOURS_PER_DAY:
        return hourlyPrice * this.get("usage") * this.DAYS_IN_MONTH;
      case this.HOURS_PER_WEEK:
        return hourlyPrice * this.get("usage") * this.WEEKS_IN_MONTH;
      case this.HOURS_PER_MONTH:
        return hourlyPrice * this.get("usage");
      case this.PERCENTAGE_OF_MONTH:
        return this.get("usage") / 100 * this.HOURS_IN_MONTH * hourlyPrice;
    }
  }
});

module.exports = RdbsModel;


},{}],18:[function(require,module,exports){
var ServerModel;

ServerModel = Backbone.Model.extend({
  HOURS_PER_DAY: "hours_per_day",
  HOURS_PER_WEEK: "hours_per_week",
  HOURS_PER_MONTH: "hours_per_month",
  PERCENTAGE_OF_MONTH: "percentage_of_month",
  HOURS_IN_MONTH: 720,
  DAYS_IN_MONTH: 30.41666667,
  WEEKS_IN_MONTH: 4.345238095,
  defaults: {
    type: "standard",
    os: "linux",
    cpu: 1,
    memory: 1,
    storage: 1,
    quantity: 1,
    usagePeriod: "percentage_of_month",
    usage: 100,
    managed: false,
    managedApps: []
  },
  initialize: function() {
    this.initPricing();
    return this.set("managedApps", []);
  },
  parse: function(data) {
    return data;
  },
  initPricing: function() {
    var pricing;
    pricing = this.get("pricingMap").attributes.options;
    return this.set("pricing", pricing);
  },
  updatePricing: function(pricingMap) {
    var pricing;
    this.set("pricingMap", pricingMap);
    pricing = this.get("pricingMap").attributes.options;
    return this.set("pricing", pricing);
  },
  totalCpuPerHour: function() {
    var price;
    price = this.get("cpu") * this.get("pricing").cpu;
    return price;
  },
  totalMemoryPerHour: function() {
    return this.get("memory") * this.get("pricing").memory;
  },
  totalOSPerHour: function() {
    var os;
    os = this.get("os");
    return this.get("pricing").os[os] * this.get("cpu");
  },
  managedBasePricePerHour: function() {
    var os, osPrice;
    if (this.get("managed")) {
      os = this.get("os");
      osPrice = this.get("pricing").os["" + os + "-managed"];
      return osPrice;
    } else {
      return 0;
    }
  },
  managedBasePricePerMonth: function() {
    return this.priceForMonth(this.managedBasePricePerHour());
  },
  utilityPricePerHourPerInstance: function() {
    return this.totalCpuPerHour() + this.totalMemoryPerHour() + this.totalOSPerHour() + this.managedBasePricePerHour();
  },
  utilityPricePerHourTotal: function() {
    return this.utilityPricePerHourPerInstance() * this.get("quantity");
  },
  storagePricePerMonth: function() {
    var type;
    type = this.get("type");
    return this.get("storage") * this.get("pricing").storage[type] * this.get("quantity");
  },
  managedAppPricePerMonth: function(managedAppKey, instances, softwareId) {
    var appPerHour, appSoftwareHourlyPrice, softwarePricing, software_selection;
    softwarePricing = this.get('pricing').software;
    software_selection = _.findWhere(softwarePricing, {
      name: softwareId
    });
    appSoftwareHourlyPrice = software_selection != null ? software_selection.price : 0;
    appSoftwareHourlyPrice *= this.get("cpu") || 1;
    appPerHour = this.get("pricing")[managedAppKey];
    return ((this.priceForMonth(appPerHour) + this.priceForMonth(appSoftwareHourlyPrice)) * this.get("quantity")) * instances;
  },
  managedAppsPricePerMonth: function() {
    var apps, total;
    apps = this.get("managedApps");
    total = 0;
    _.each(apps, (function(_this) {
      return function(app) {
        return total += _this.managedAppPricePerMonth(app.key, app.instances, app.softwareId);
      };
    })(this));
    return total;
  },
  totalOSPricePerMonth: function() {
    return this.priceForMonth(this.totalOSPerHour()) * this.get("quantity");
  },
  totalPricePerMonth: function() {
    var total, utilityPerMonth;
    utilityPerMonth = 0;
    utilityPerMonth = this.priceForMonth(this.utilityPricePerHourTotal());
    total = utilityPerMonth + this.storagePricePerMonth();
    return total;
  },
  totalPricePerMonthWithApps: function() {
    var total;
    total = this.totalPricePerMonth + this.managedAppsPricePerMonth();
    return total;
  },
  priceForMonth: function(hourlyPrice) {
    switch (this.get("usagePeriod")) {
      case this.HOURS_PER_DAY:
        return hourlyPrice * this.get("usage") * this.DAYS_IN_MONTH;
      case this.HOURS_PER_WEEK:
        return hourlyPrice * this.get("usage") * this.WEEKS_IN_MONTH;
      case this.HOURS_PER_MONTH:
        return hourlyPrice * this.get("usage");
      case this.PERCENTAGE_OF_MONTH:
        return this.get("usage") / 100 * this.HOURS_IN_MONTH * hourlyPrice;
    }
  },
  addManagedApp: function(key, name) {
    var apps, exists;
    apps = this.get("managedApps");
    exists = false;
    _.each(apps, function(app) {
      if (app.key === key) {
        return exists = true;
      }
    });
    if (exists === false) {
      if (key === 'ms-sql') {
        apps.push({
          "key": key,
          "name": name,
          "instances": 1,
          "softwareId": "Microsoft SQL Server Standard Edition"
        });
      } else {
        apps.push({
          "key": key,
          "name": name,
          "instances": 1,
          "softwareId": ""
        });
      }
      this.set("managedApps", apps);
      this.trigger("change", this);
      return this.trigger("change:managedApps", this);
    }
  },
  updateManagedAppIntances: function(key, quantity, softwareId) {
    var apps;
    apps = this.get("managedApps");
    _.each(apps, function(app) {
      if (app.key === key) {
        app.instances = quantity;
        return app.softwareId = softwareId;
      }
    });
    this.set("managedApps", apps);
    return this.trigger("change:managedApps", this);
  }
});

module.exports = ServerModel;


},{}],19:[function(require,module,exports){
var ServiceModel;

ServiceModel = Backbone.Model.extend({
  defaults: {
    title: "",
    description: "",
    input: "select",
    quantity: 0,
    disabled: false
  },
  initPricing: function(pricingMap) {
    if (pricingMap != null) {
      this.set("pricing", pricingMap.get('price'));
      this.set("disabled", pricingMap.get('disabled'));
      return this.set("hasSetupFee", pricingMap.get('hasSetupFee'));
    } else {
      this.set("pricing", 0);
      this.set("disabled", true);
      return this.set("hasSetupFee", false);
    }
  },
  parse: function(data) {
    return data;
  },
  totalPricePerMonth: function() {
    var price, quantity;
    price = this.get("pricing");
    quantity = this.get("quantity");
    return price * quantity;
  }
});

module.exports = ServiceModel;


},{}],20:[function(require,module,exports){
module.exports = function(options) {
return (function() {
var $c, $e, $o;

$e = function(text, escape) {
  return ("" + text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/'/g, '&#39;').replace(/\//g, '&#47;').replace(/"/g, '&quot;');
};

$c = function(text) {
  switch (text) {
    case null:
    case void 0:
      return '';
    case true:
    case false:
      return '' + text;
    default:
      return text;
  }
};

$o = [];

$o.push("<td class='add-managed-app-cell table-cell' colspan='" + ($e($c(this.colspan))) + "'>\n  <div class='add-managed-button'>\n    <span class='plus'></span>\n    managed application\n    <span class='down-arrow'></span>\n    <div class='managed-app-options'>\n      <a class='redhat-app' href='#' data-key='apache' data-name='Apache HTTP Server'>Apache HTTP Server</a>\n      <a class='redhat-app' href='#' data-key='cloudera-cdh5-basic' data-name='Cloudera CDH5 Basic'>Cloudera CDH5 Basic</a>\n      <a class='redhat-app' href='#' data-key='cloudera-cdh5-basic-hbase' data-name='Cloudera CDH5 Basic + HBase'>Cloudera CDH5 Basic + HBase</a>\n      <a class='redhat-app' href='#' data-key='cloudera-enterprise-data-hub' data-name='Cloudera Enterprise Data Hub'>Cloudera Enterprise Data Hub</a>\n      <a class='redhat-app' href='#' data-key='mysql' data-name='MySQL'>MySQL</a>");

if (this.hasDualMySQL) {
  $o.push("      <a class='redhat-app' href='#' data-key='mysql-replication-master-master' data-name='MySQL Replication (Master/Master)'>MySQL Replication (Master/Master)</a>\n      <a class='redhat-app' href='#' data-key='mysql-replication-master-slave' data-name='MySQL Replication (Master/Slave)'>MySQL Replication (Master/Slave)</a>");
}

$o.push("      <a class='redhat-app' href='#' data-key='tomcat' data-name='Tomcat'>Tomcat</a>\n      <a class='redhat-app' href='#' data-key='kerberos' data-name='Kerberos'>Kerberos</a>\n      <a class='redhat-app' href='#' data-key='unlicensed-hadoop' data-name='Unlicensed Hadoop'>Unlicensed Hadoop</a>\n      <a class='windows-app' href='#' data-key='active-directory' data-name='Active Directory'>Active Directory</a>\n      <a class='windows-app' href='#' data-key='ms-sql' data-name='MS SQL'>MS SQL</a>\n      <a class='windows-app' href='#' data-key='iis' data-name='MS IIS'>MS IIS</a>\n      <a class='windows-app' href='#' data-key='kerberos' data-name='Kerberos'>Kerberos</a>\n      <!-- %a{:href => \"#\", data: {key: \"ssl\", name: \"GeoTrust Quick SSL Certificate\"}} GeoTrust Quick SSL Certificate -->\n    </div>\n  </div>\n</td>");

return $o.join("\n").replace(/\s(\w+)='true'/mg, ' $1').replace(/\s(\w+)='false'/mg, '').replace(/\s(?:id|class)=(['"])(\1)/mg, "");

}).call(options)
};
},{}],21:[function(require,module,exports){
module.exports = function(options) {
return (function() {
var $c, $e, $o;

$e = function(text, escape) {
  return ("" + text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/'/g, '&#39;').replace(/\//g, '&#47;').replace(/"/g, '&quot;');
};

$c = function(text) {
  switch (text) {
    case null:
    case void 0:
      return '';
    case true:
    case false:
      return '' + text;
    default:
      return text;
  }
};

$o = [];

$o.push("<td class='table-cell'>\n  Application" + this.model.collection.length + "\n</td>\n<td class='table-cell usage-cell'>\n  <input class='number' name='usage' value='" + ($e($c(this.model.get("usage")))) + "' type='text'>\n  <select name='usagePeriod'>\n    <option value='hours_per_month' selected='" + ($e($c(this.model.get('usagePeriod') === 'hours_per_month'))) + "'>hrs / month</option>\n    <option value='percentage_of_month' selected='" + ($e($c(this.model.get('usagePeriod') === 'percentage_of_month'))) + "'>% / month</option>\n    <option value='hours_per_week' selected='" + ($e($c(this.model.get('usagePeriod') === 'hours_per_week'))) + "'>hrs / week</option>\n    <option value='hours_per_day' selected='" + ($e($c(this.model.get('usagePeriod') === 'hours_per_day'))) + "'>hrs / day</option>\n  </select>\n</td>\n<td class='range-cell table-cell'>\n  <input class='number quantity-text-input' data-name='quantity'>\n  <input class='range-slider' type='range' name='quantity' min='" + ($e($c(1))) + "' max='" + ($e($c(100))) + "' value='" + ($e($c(this.model.get("quantity")))) + "'>\n</td>\n<td class='range-cell table-cell'>\n  <input class='memory-text-input number' data-name='memory'>\n  <input class='range-slider' type='range' name='memory' min='" + ($e($c(0))) + "' max='" + ($e($c(10240))) + "' value='" + ($e($c(this.model.get("memory")))) + "'>\n</td>\n<td class='price-cell table-cell'>\n  <span class='price'>");

$o.push("    " + $e($c(accounting.formatMoney(this.model.totalPricePerMonth() * this.app.currency.rate, {
  "symbol": this.app.currency.symbol
}))));

$o.push("  </span>\n  <a class='remove-button' href='#'>X</a>\n</td>");

return $o.join("\n").replace(/\s(\w+)='true'/mg, ' $1').replace(/\s(\w+)='false'/mg, '').replace(/\s(?:id|class)=(['"])(\1)/mg, "");

}).call(options)
};
},{}],22:[function(require,module,exports){
module.exports = function(options) {
return (function() {
var $c, $e, $o;

$e = function(text, escape) {
  return ("" + text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/'/g, '&#39;').replace(/\//g, '&#47;').replace(/"/g, '&quot;');
};

$c = function(text) {
  switch (text) {
    case null:
    case void 0:
      return '';
    case true:
    case false:
      return '' + text;
    default:
      return text;
  }
};

$o = [];

$o.push("<td class='quantity-cell table-cell'>\n  <input class='number' name='quantity' value='" + ($e($c(this.model.get("quantity")))) + "' type='text'>\n</td>\n<td class='table-cell usage-cell'>\n  <input class='number' name='usage' value='" + ($e($c(this.model.get("usage")))) + "' type='text'>\n  <select name='usagePeriod'>\n    <option value='hours_per_month' selected='" + ($e($c(this.model.get('usagePeriod') === 'hours_per_month'))) + "'>hrs / month</option>\n    <option value='percentage_of_month' selected='" + ($e($c(this.model.get('usagePeriod') === 'percentage_of_month'))) + "'>% / month</option>\n    <option value='hours_per_week' selected='" + ($e($c(this.model.get('usagePeriod') === 'hours_per_week'))) + "'>hrs / week</option>\n    <option value='hours_per_day' selected='" + ($e($c(this.model.get('usagePeriod') === 'hours_per_day'))) + "'>hrs / day</option>\n  </select>\n</td>\n<td class='config-cell table-cell'>\n  <select class='baremetal-select' name='config'>\n    <option value='" + ($e($c(1))) + "' selected='" + ($e($c(this.model.get('config') === 1))) + "'>" + (this.model.get('pricing').config['1'].name) + "</option>\n    <option value='" + ($e($c(2))) + "' selected='" + ($e($c(this.model.get('config') === 2))) + "'>" + (this.model.get('pricing').config['2'].name) + "</option>\n    <option value='" + ($e($c(3))) + "' selected='" + ($e($c(this.model.get('config') === 3))) + "'>" + (this.model.get('pricing').config['3'].name) + "</option>\n  </select>\n</td>\n<td class='os-cell table-cell'>\n  <select name='os'>\n    <option value='" + ($e($c(1))) + "' selected='" + ($e($c(this.model.get('os') === 1))) + "' title='" + ($e($c(this.model.get('pricing').os['1'].descriptionHtml))) + "'>" + (this.model.get('pricing').os['1'].shortName) + "</option>\n    <option value='" + ($e($c(2))) + "' selected='" + ($e($c(this.model.get('os') === 2))) + "' title='" + ($e($c(this.model.get('pricing').os['2'].descriptionHtml))) + "'>" + (this.model.get('pricing').os['2'].shortName) + "</option>\n    <option value='" + ($e($c(3))) + "' selected='" + ($e($c(this.model.get('os') === 3))) + "' title='" + ($e($c(this.model.get('pricing').os['3'].descriptionHtml))) + "'>" + (this.model.get('pricing').os['3'].shortName) + "</option>\n    <option value='" + ($e($c(4))) + "' selected='" + ($e($c(this.model.get('os') === 4))) + "' title='" + ($e($c(this.model.get('pricing').os['4'].descriptionHtml))) + "'>" + (this.model.get('pricing').os['4'].shortName) + "</option>\n  </select>\n</td>\n<td class='price-cell table-cell'>\n  <span class='price'>");

$o.push("    " + $e($c(accounting.formatMoney(this.model.totalPricePerMonth() * this.app.currency.rate, {
  "symbol": this.app.currency.symbol
}))));

$o.push("  </span>\n  <a class='remove-button' href='#'>X</a>\n</td>");

return $o.join("\n").replace(/\s(\w+)='true'/mg, ' $1').replace(/\s(\w+)='false'/mg, '').replace(/\s(?:id|class)=(['"])(\1)/mg, "");

}).call(options)
};
},{}],23:[function(require,module,exports){
module.exports = function(options) {
return (function() {
var $c, $e, $o;

$e = function(text, escape) {
  return ("" + text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/'/g, '&#39;').replace(/\//g, '&#47;').replace(/"/g, '&quot;');
};

$c = function(text) {
  switch (text) {
    case null:
    case void 0:
      return '';
    case true:
    case false:
      return '' + text;
    default:
      return text;
  }
};

$o = [];

$o.push("<td class='table-cell'>\n  IPS" + this.model.collection.length + "\n</td>\n<td class='table-cell usage-cell'>\n  <input class='number' name='usage' value='" + ($e($c(this.model.get("usage")))) + "' type='text'>\n  <select name='usagePeriod'>\n    <option value='hours_per_month' selected='" + ($e($c(this.model.get('usagePeriod') === 'hours_per_month'))) + "'>hrs / month</option>\n    <option value='percentage_of_month' selected='" + ($e($c(this.model.get('usagePeriod') === 'percentage_of_month'))) + "'>% / month</option>\n    <option value='hours_per_week' selected='" + ($e($c(this.model.get('usagePeriod') === 'hours_per_week'))) + "'>hrs / week</option>\n    <option value='hours_per_day' selected='" + ($e($c(this.model.get('usagePeriod') === 'hours_per_day'))) + "'>hrs / day</option>\n  </select>\n</td>\n<td class='range-cell table-cell'>\n  <input class='number quantity-text-input' data-name='quantity'>\n  <input class='range-slider' type='range' name='quantity' min='" + ($e($c(1))) + "' max='" + ($e($c(1000))) + "' value='" + ($e($c(this.model.get("quantity")))) + "'>\n</td>\n<td class='price-cell table-cell'>\n  <span class='price'>");

$o.push("    " + $e($c(accounting.formatMoney(this.model.totalPricePerMonth() * this.app.currency.rate, {
  "symbol": this.app.currency.symbol
}))));

$o.push("  </span>\n  <a class='remove-button' href='#'>X</a>\n</td>");

return $o.join("\n").replace(/\s(\w+)='true'/mg, ' $1').replace(/\s(\w+)='false'/mg, '').replace(/\s(?:id|class)=(['"])(\1)/mg, "");

}).call(options)
};
},{}],24:[function(require,module,exports){
module.exports = function(options) {
return (function() {
var $c, $e, $o, soft, _i, _len, _ref;

$e = function(text, escape) {
  return ("" + text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/'/g, '&#39;').replace(/\//g, '&#47;').replace(/"/g, '&quot;');
};

$c = function(text) {
  switch (text) {
    case null:
    case void 0:
      return '';
    case true:
    case false:
      return '' + text;
    default:
      return text;
  }
};

$o = [];

$o.push("<td class='managed-app-quantity-cell table-cell' colspan='1'>\n  <span class='managed-app-quantity'></span>\n</td>\n<td class='managed-app-usage-cell table-cell' colspan='2'>");

if (this.app.key === "mysql" || this.app.key === "ms-sql") {
  $o.push("  x\n  <input class='number' name='usage' value='" + ($e($c(1))) + "' type='text'>\n  instance(s) / server");
} else {
  $o.push("  &nbsp;");
}

$o.push("</td>");

if (this.app.key === "ms-sql") {
  $o.push("<td class='managed-app-cell table-cell' colspan='" + ($e($c(this.colspan))) + "'>\n  Managed " + this.app.name + " \n  <br>\n    <small>\n      <span class='managed-app-subnote managed-app-subnote--select'>with MS SQL Server Standard Edition License (per vCPU)</span>\n    </small>\n  <br>\n  <select class='hidden software' name='softwareId'>");
  _ref = this.software_options;
  for (_i = 0, _len = _ref.length; _i < _len; _i++) {
    soft = _ref[_i];
    if (soft.name === this.app.softwareId) {
      $o.push("    <option value='" + ($e($c(soft.name))) + "' selected>" + ($e($c(soft.name))) + "</option>");
    } else {
      $o.push("    <option value='" + ($e($c(soft.name))) + "'>" + ($e($c(soft.name))) + "</option>");
    }
  }
  $o.push("  </select>\n</td>");
} else {
  $o.push("<td class='managed-app-cell table-cell' colspan='" + ($e($c(this.colspan))) + "'>\n  Managed " + this.app.name + "\n</td>");
}

$o.push("<td class='price-cell table-cell' colspan='1'>\n  <span class='price'></span>\n  <a class='remove-button' href='#' data-key='" + ($e($c(this.app.key))) + "'>X</a>\n</td>");

return $o.join("\n").replace(/\s(\w+)='true'/mg, ' $1').replace(/\s(\w+)='false'/mg, '').replace(/\s(?:id|class)=(['"])(\1)/mg, "");

}).call(options)
};
},{}],25:[function(require,module,exports){
module.exports = function(options) {
return (function() {
var $c, $e, $o;

$e = function(text, escape) {
  return ("" + text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/'/g, '&#39;').replace(/\//g, '&#47;').replace(/"/g, '&quot;');
};

$c = function(text) {
  switch (text) {
    case null:
    case void 0:
      return '';
    case true:
    case false:
      return '' + text;
    default:
      return text;
  }
};

$o = [];

$o.push("<td class='quantity-cell table-cell'>\n  <input class='number' name='quantity' value='" + ($e($c(this.model.get("quantity")))) + "' type='text'>\n</td>\n<td class='table-cell usage-cell'>\n  <input class='number' name='usage' value='" + ($e($c(this.model.get("usage")))) + "' type='text'>\n  <select name='usagePeriod'>\n    <option value='hours_per_month' selected='" + ($e($c(this.model.get('usagePeriod') === 'hours_per_month'))) + "'>hrs / month</option>\n    <option value='percentage_of_month' selected='" + ($e($c(this.model.get('usagePeriod') === 'percentage_of_month'))) + "'>% / month</option>\n    <option value='hours_per_week' selected='" + ($e($c(this.model.get('usagePeriod') === 'hours_per_week'))) + "'>hrs / week</option>\n    <option value='hours_per_day' selected='" + ($e($c(this.model.get('usagePeriod') === 'hours_per_day'))) + "'>hrs / day</option>\n  </select>\n</td>\n<td class='table-cell type-cell'>\n  <select name='type'>\n    <option value='single' selected='" + ($e($c(this.model.get('type') === 'single'))) + "'>single</option>\n    <option value='replicated' selected='" + ($e($c(this.model.get('type') === 'replicated'))) + "'>replicated</option>\n  </select>\n</td>\n<td class='cpu-cell range-cell table-cell'>\n  <input class='cpu-text-input' data-name='cpu'>\n  <input class='range-slider' name='cpu' type='range' min='" + ($e($c(1))) + "' max='" + ($e($c(16))) + "' value='" + ($e($c(this.model.get("cpu")))) + "'>\n</td>\n<td class='memory-cell range-cell table-cell'>\n  <input class='memory-text-input' data-name='memory'>\n  <input class='range-slider' name='memory' type='range' min='" + ($e($c(1))) + "' max='" + ($e($c(128))) + "' value='" + ($e($c(this.model.get("memory")))) + "'>\n</td>\n<td class='range-cell storage-cell table-cell'>\n  <input class='storage-text-input' data-name='storage'>\n  <input class='range-slider' name='storage' type='range' min='" + ($e($c(1))) + "' max='" + ($e($c(4000))) + "' step='" + ($e($c(1))) + "' value='" + ($e($c(this.model.get("storage")))) + "'>\n</td>\n<td class='price-cell table-cell'>\n  <span class='price'>");

$o.push("    " + $e($c(accounting.formatMoney(this.model.totalPricePerMonth() * this.app.currency.rate, {
  "symbol": this.app.currency.symbol
}))));

$o.push("  </span>\n  <a class='remove-button' href='#'>X</a>\n</td>");

return $o.join("\n").replace(/\s(\w+)='true'/mg, ' $1').replace(/\s(\w+)='false'/mg, '').replace(/\s(?:id|class)=(['"])(\1)/mg, "");

}).call(options)
};
},{}],26:[function(require,module,exports){
module.exports = function(options) {
return (function() {
var $c, $e, $o;

$e = function(text, escape) {
  return ("" + text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/'/g, '&#39;').replace(/\//g, '&#47;').replace(/"/g, '&quot;');
};

$c = function(text) {
  switch (text) {
    case null:
    case void 0:
      return '';
    case true:
    case false:
      return '' + text;
    default:
      return text;
  }
};

$o = [];

$o.push("<td class='quantity-cell table-cell'>\n  <input class='number' name='quantity' value='" + ($e($c(this.model.get("quantity")))) + "' type='text'>\n</td>\n<td class='table-cell usage-cell'>\n  <input class='number' name='usage' value='" + ($e($c(this.model.get("usage")))) + "' type='text'>\n  <select name='usagePeriod'>\n    <option value='hours_per_month' selected='" + ($e($c(this.model.get('usagePeriod') === 'hours_per_month'))) + "'>hrs / month</option>\n    <option value='percentage_of_month' selected='" + ($e($c(this.model.get('usagePeriod') === 'percentage_of_month'))) + "'>% / month</option>\n    <option value='hours_per_week' selected='" + ($e($c(this.model.get('usagePeriod') === 'hours_per_week'))) + "'>hrs / week</option>\n    <option value='hours_per_day' selected='" + ($e($c(this.model.get('usagePeriod') === 'hours_per_day'))) + "'>hrs / day</option>\n  </select>\n</td>");

if (this.model.get("type") === "hyperscale") {
  $o.push("<input type='hidden' value='hyperscale'>");
} else {
  $o.push("<td class='table-cell type-cell'>\n  <select name='type'>\n    <option value='standard' selected='" + ($e($c(this.model.get('type') === 'standard'))) + "'>standard</option>\n    <option value='premium' selected='" + ($e($c(this.model.get('type') === 'premium'))) + "'>premium</option>\n  </select>\n</td>");
}

$o.push("<td class='os-cell table-cell'>\n  <select name='os'>\n    <option value='linux' selected='" + ($e($c(this.model.get('os') === 'linux'))) + "'>Linux</option>\n    <option value='redhat' selected='" + ($e($c(this.model.get('os') === 'redhat'))) + "'>Red Hat</option>\n    <option value='windows' selected='" + ($e($c(this.model.get('os') === 'windows'))) + "'>Windows</option>\n  </select>\n</td>\n<td class='" + (['table-cell', 'managed-cell', "" + ($e($c(this.disabledClass)))].sort().join(' ').replace(/^\s+|\s+$/g, '')) + "'>\n  <input class='managed-check' type='checkbox' name='managed'>\n</td>\n<td class='cpu-cell range-cell table-cell'>\n  <input class='cpu-text-input' data-name='cpu'>\n  <input class='range-slider' name='cpu' type='range' min='" + ($e($c(1))) + "' max='" + ($e($c(16))) + "' value='" + ($e($c(this.model.get("cpu")))) + "'>\n</td>\n<td class='memory-cell range-cell table-cell'>\n  <input class='memory-text-input' data-name='memory'>\n  <input class='range-slider' name='memory' type='range' min='" + ($e($c(1))) + "' max='" + ($e($c(128))) + "' value='" + ($e($c(this.model.get("memory")))) + "'>\n</td>\n<td class='range-cell storage-cell table-cell'>\n  <input class='storage-text-input' data-name='storage'>");

if (this.model.get("type") === "hyperscale") {
  $o.push("  <input class='range-slider' name='storage' type='range' min='" + ($e($c(1))) + "' max='" + ($e($c(1024))) + "' step='" + ($e($c(1))) + "' value='" + ($e($c(this.model.get("storage")))) + "'>");
} else {
  $o.push("  <input class='range-slider' name='storage' type='range' min='" + ($e($c(1))) + "' max='" + ($e($c(4000))) + "' step='" + ($e($c(1))) + "' value='" + ($e($c(this.model.get("storage")))) + "'>");
}

$o.push("</td>\n<td class='price-cell table-cell'>\n  <span class='price'>");

$o.push("    " + $e($c(accounting.formatMoney(this.model.totalPricePerMonth() * this.app.currency.rate, {
  "symbol": this.app.currency.symbol
}))));

$o.push("  </span>\n  <a class='remove-button' href='#'>X</a>\n</td>");

return $o.join("\n").replace(/\s(\w+)='true'/mg, ' $1').replace(/\s(\w+)='false'/mg, '').replace(/\s(?:id|class)=(['"])(\1)/mg, "");

}).call(options)
};
},{}],27:[function(require,module,exports){
module.exports = function(options) {
return (function() {
var $c, $e, $o;

$e = function(text, escape) {
  return ("" + text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/'/g, '&#39;').replace(/\//g, '&#47;').replace(/"/g, '&quot;');
};

$c = function(text) {
  switch (text) {
    case null:
    case void 0:
      return '';
    case true:
    case false:
      return '' + text;
    default:
      return text;
  }
};

$o = [];

$o.push("<form>\n  <div class='service__info'>\n    <h4>" + ($e($c(this.model.get("title")))) + "</h4>");

if (this.model.get("description")) {
  $o.push("    <div class='service__description'>\n      <p>");
  $o.push("        " + $e($c(this.model.get("description"))));
  if (this.model.get("link")) {
    $o.push("        <br>\n        <a href='" + ($e($c(this.model.get("link")))) + "' target='_blank'>more info</a>");
  }
  $o.push("      </p>\n    </div>");
}

$o.push("  </div>\n  <div class='" + (['service__inputs', "" + ($e($c(this.model.get("input"))))].sort().join(' ').replace(/^\s+|\s+$/g, '')) + "'>");

if (this.model.get("input") === "slider") {
  $o.push("    <div class='quantity-wrapper'>\n      <span class='quantity'>");
  $o.push("        " + $e($c(this.model.get("quantity"))));
  $o.push("      </span>\n      GB\n    </div>\n    <input class='range-slider' type='range' name='quantity' min='" + ($e($c(0))) + "' max='" + ($e($c(10000))) + "' value='" + ($e($c(this.model.get("quantity")))) + "'>");
} else {
  if (this.model.get("input") === "number") {
    $o.push("    <div class='quantity-wrapper'>\n      <span class='quantity'>");
    $o.push("        " + $e($c(this.model.get("quantity"))));
    $o.push("      </span>\n      GB\n    </div>\n    <input class='number' name='quantity' value='" + ($e($c(this.model.get("quantity")))) + "' type='number'>");
  } else {
    $o.push("    <span class='select'></span>\n    QTY\n      <select name='quantity'>\n        <option>0</option>\n        <option>1</option>\n        <option>2</option>\n        <option>3</option>\n        <option>4</option>\n        <option>5</option>\n      </select>\n      x\n      <span class='cost'>");
    $o.push("        " + $e($c(accounting.formatMoney(this.model.get("pricing") * this.app.currency.rate, {
      "symbol": this.app.currency.symbol
    }))));
    if (this.model.get("hasSetupFee")) {
      $o.push("        <span>\n          <sup>\n            *\n          </sup>\n        </span>");
    }
    $o.push("      </span>");
  }
}

$o.push("    <span class='price'>");

$o.push("      " + $e($c(accounting.formatMoney(this.model.totalPricePerMonth() * this.app.currency.rate, {
  "symbol": this.app.currency.symbol
}))));

$o.push("    </span>\n  </div>\n</form>");

return $o.join("\n").replace(/\s(\w+)='true'/mg, ' $1').replace(/\s(\w+)='false'/mg, '').replace(/\s(?:id|class)=(['"])(\1)/mg, "");

}).call(options)
};
},{}],28:[function(require,module,exports){
var AddManagedAppView;

AddManagedAppView = Backbone.View.extend({
  tagName: "tr",
  className: "table-row add-managed-app-row is-managed",
  initialize: function() {
    return this.listenTo(this.model, 'change:managedApps', (function(_this) {
      return function(model) {
        return _this.update();
      };
    })(this));
  },
  render: function() {
    this.template = require("../templates/addManagedApp.haml");
    this.colspan = this.model.get("type") === "hyperscale" ? 8 : 9;
    this.$el.html(this.template({
      os: this.model.get("os"),
      colspan: this.colspan,
      hasDualMySQL: this.hasDualMySQL()
    }));
    this.$el.addClass("managed-app-add-button-for-server_" + this.model.cid);
    this.updateOptions();
    return this;
  },
  update: function() {
    this.$el.html(this.template({
      os: this.model.get("os"),
      colspan: this.colspan,
      hasDualMySQL: this.hasDualMySQL()
    }));
    this.$el.addClass("managed-app-add-button-for-server_" + this.model.cid);
    this.updateOptions();
    return this;
  },
  events: function() {
    return {
      "click a": "addManagedApp"
    };
  },
  hasDualMySQL: function() {
    var managedApps, mysqlInstances;
    managedApps = this.model.get('managedApps') || [];
    mysqlInstances = 0;
    _.each(managedApps, function(app) {
      if (app.key === 'mysql') {
        return mysqlInstances = app.instances;
      }
    });
    return mysqlInstances >= 2;
  },
  addManagedApp: function(e) {
    var key, name;
    e.preventDefault();
    key = $(e.currentTarget).data("key");
    name = $(e.currentTarget).data("name");
    return this.model.addManagedApp(key, name);
  },
  updateOptions: function() {
    if (this.model.get("os") === "windows") {
      $(".redhat-app", this.$el).hide();
      return $(".windows-app", this.$el).css("display", "block");
    } else {
      $(".redhat-app", this.$el).css("display", "block");
      return $(".windows-app", this.$el).hide();
    }
  }
});

module.exports = AddManagedAppView;


},{"../templates/addManagedApp.haml":20}],29:[function(require,module,exports){
var AppfogView;

AppfogView = Backbone.View.extend({
  tagName: "tr",
  className: "table-row",
  events: {
    "click .remove-button": "removeDeployment",
    "change select": "onFormChanged",
    "keypress .number": "ensureNumber",
    "change select[name]": "onFormChanged",
    "change input[name]": "onFormChanged",
    "input input[name]": "onFormChanged",
    "keyup input[name]": "onFormChanged",
    "keypress input:not([name])": "ensureNumber",
    "input input:not([name])": "onSliderTextChanged"
  },
  initialize: function(options) {
    this.options = options || {};
    this.app = this.options.app;
    this.model.on("change", (function(_this) {
      return function(model) {
        return _this.onModelChange(model);
      };
    })(this));
    return this.app.on("currencyChange", (function(_this) {
      return function() {
        return _this.onModelChange(_this.model);
      };
    })(this));
  },
  render: function() {
    var template;
    template = require("../templates/appfog.haml");
    this.$el.html(template({
      model: this.model,
      app: this.app
    }));
    this.$el.attr("id", this.model.cid);
    _.defer((function(_this) {
      return function() {
        $('.range-slider', _this.$el).rangeslider({
          polyfill: false
        });
        return $('.range-slider', _this.$el).css("opacity", 1);
      };
    })(this));
    return this;
  },
  close: function() {
    this.remove();
    this.unbind();
    return this.$el.remove();
  },
  removeDeployment: function(e) {
    e.preventDefault();
    return this.model.destroy();
  },
  onFormChanged: function(e) {
    var data;
    e.preventDefault();
    data = Backbone.Syphon.serialize(this);
    return this.model.set(data);
  },
  onModelChange: function(model) {
    var newPrice;
    this.$el.removeClass("disabled");
    newPrice = accounting.formatMoney(model.totalPricePerMonth() * this.app.currency.rate, {
      symbol: this.app.currency.symbol
    });
    $(".price", this.$el).html(newPrice);
    $(".quantity", this.$el).html(model.get("quantity"));
    $(".memory", this.$el).html(model.get("memory"));
    $(".quantity-text-input", this.$el).val(model.get("quantity"));
    $(".memory-text-input", this.$el).val(model.get("memory"));
    if (model.get("memory") > 0) {
      return this.$el.addClass("active");
    } else {
      return this.$el.removeClass("active");
    }
  },
  ensureNumber: function(e) {
    var charCode;
    charCode = (e.which ? e.which : e.keyCode);
    return !(charCode > 31 && (charCode < 48 || charCode > 57));
  },
  onSliderTextChanged: function(e) {
    var $this, data, name, value;
    $this = $(e.currentTarget);
    name = $this.data("name");
    value = $this.val();
    if (value === "") {
      return;
    }
    data = Backbone.Syphon.serialize(this);
    data[name] = value;
    this.model.set(data);
    return $("[name=" + name + "]", this.$el).val(value).change();
  }
});

module.exports = AppfogView;


},{"../templates/appfog.haml":21}],30:[function(require,module,exports){
var AppfogModel, AppfogView, AppfogsView;

AppfogView = require('./AppfogView.coffee');

AppfogModel = require('../models/AppfogModel.coffee');

AppfogsView = Backbone.View.extend({
  events: {
    "click .add-button": "addDeployment"
  },
  initialize: function(options) {
    this.options = options || {};
    this.app = this.options.app;
    this.collection.on("add", (function(_this) {
      return function(model, collection, options) {
        return _this.onDeploymentAdded(model);
      };
    })(this));
    this.collection.on("remove", (function(_this) {
      return function(model, collection, options) {
        return _this.onDeploymentRemoved(model);
      };
    })(this));
    this.collection.on("change", (function(_this) {
      return function() {
        return _this.updateSubtotal();
      };
    })(this));
    this.app.on("currencyChange", (function(_this) {
      return function() {
        return _this.updateSubtotal();
      };
    })(this));
    this.collection.on("datacenterUpdate", (function(_this) {
      return function() {
        _this.checkPricingMap();
        return _this.updateSubtotal();
      };
    })(this));
    this.checkPricingMap();
    this.appfogViews = [];
    return $('.has-tooltip', this.$el).tooltip();
  },
  checkPricingMap: function() {
    if (!this.options.pricingMap) {
      this.$el.addClass("disabled");
      this.collection.removeAll();
      return false;
    } else {
      this.$el.removeClass("disabled");
      return true;
    }
  },
  addDeployment: function(e) {
    if (e) {
      e.preventDefault();
    }
    return this.collection.add({
      pricingMap: this.options.pricingMap
    });
  },
  onDeploymentAdded: function(model) {
    var appfogView;
    appfogView = new AppfogView({
      model: model,
      app: this.app,
      parentView: this
    });
    this.appfogViews[model.cid] = appfogView;
    $(".table", this.$el).append(appfogView.render().el);
    return this.updateSubtotal();
  },
  onDeploymentRemoved: function(model) {
    if (this.appfogViews[model.cid]) {
      this.appfogViews[model.cid].close();
    }
    return this.updateSubtotal();
  },
  updateSubtotal: function() {
    var newSubtotal, subTotal;
    subTotal = this.collection.subtotal() * this.app.currency.rate;
    newSubtotal = accounting.formatMoney(subTotal, {
      symbol: this.app.currency.symbol
    });
    return $(".subtotal", this.$el).html(newSubtotal);
  }
});

module.exports = AppfogsView;


},{"../models/AppfogModel.coffee":13,"./AppfogView.coffee":29}],31:[function(require,module,exports){
var BaremetalConfigsView, BaremetalModel, BaremetalView;

BaremetalView = require('./BaremetalView.coffee');

BaremetalModel = require('../models/BaremetalModel.coffee');

BaremetalConfigsView = Backbone.View.extend({
  events: {
    "click .add-button": "addConfig"
  },
  initialize: function(options) {
    this.options = options || {};
    this.app = this.options.app;
    this.collection.on("add", (function(_this) {
      return function(model, collection, options) {
        return _this.onConfigAdded(model);
      };
    })(this));
    this.collection.on("remove", (function(_this) {
      return function(model, collection, options) {
        return _this.onDeploymentRemoved(model);
      };
    })(this));
    this.collection.on("change", (function(_this) {
      return function() {
        return _this.updateSubtotal();
      };
    })(this));
    this.app.on("currencyChange", (function(_this) {
      return function() {
        return _this.updateSubtotal();
      };
    })(this));
    this.collection.on("datacenterUpdate", (function(_this) {
      return function() {
        _this.checkPricingMap();
        return _this.updateSubtotal();
      };
    })(this));
    this.checkPricingMap();
    this.baremetalViews = [];
    return $('.has-tooltip', this.$el).tooltip();
  },
  checkPricingMap: function() {
    if (_.isEmpty(this.options.pricingMap.get("options").config)) {
      this.$el.addClass("disabled");
      this.collection.removeAll();
      return false;
    } else {
      this.$el.removeClass("disabled");
      return true;
    }
  },
  addConfig: function(e) {
    if (e) {
      e.preventDefault();
    }
    return this.collection.add({
      pricingMap: this.options.pricingMap
    });
  },
  onConfigAdded: function(model) {
    var baremetalView;
    baremetalView = new BaremetalView({
      model: model,
      app: this.app,
      parentView: this
    });
    this.baremetalViews[model.cid] = baremetalView;
    $(".table", this.$el).append(baremetalView.render().el);
    return this.updateSubtotal();
  },
  onDeploymentRemoved: function(model) {
    if (this.baremetalViews[model.cid]) {
      this.baremetalViews[model.cid].close();
    }
    return this.updateSubtotal();
  },
  updateSubtotal: function() {
    var newSubtotal, subTotal;
    subTotal = this.collection.subtotal() * this.app.currency.rate;
    newSubtotal = accounting.formatMoney(subTotal, {
      symbol: this.app.currency.symbol
    });
    return $(".subtotal", this.$el).html(newSubtotal);
  }
});

module.exports = BaremetalConfigsView;


},{"../models/BaremetalModel.coffee":14,"./BaremetalView.coffee":32}],32:[function(require,module,exports){
var BaremetalView;

BaremetalView = Backbone.View.extend({
  tagName: "tr",
  className: "table-row",
  events: {
    "click .remove-button": "removeConfig",
    "keypress .number": "ensureNumber",
    "change select": "onFormChanged",
    "change input[name]": "onFormChanged",
    "input input[name]": "onFormChanged",
    "keyup input[name]": "onFormChanged"
  },
  initialize: function(options) {
    this.options = options || {};
    this.app = this.options.app;
    this.model.on("change", (function(_this) {
      return function(model) {
        return _this.onModelChange(model);
      };
    })(this));
    return this.app.on("currencyChange", (function(_this) {
      return function() {
        return _this.onModelChange(_this.model);
      };
    })(this));
  },
  render: function() {
    var template;
    template = require("../templates/baremetal.haml");
    this.$el.html(template({
      model: this.model,
      app: this.app
    }));
    this.$el.attr("id", this.model.cid);
    return this;
  },
  close: function() {
    this.remove();
    this.unbind();
    return this.$el.remove();
  },
  removeConfig: function(e) {
    e.preventDefault();
    return this.model.destroy();
  },
  onFormChanged: function(e) {
    var data;
    e.preventDefault();
    data = Backbone.Syphon.serialize(this);
    return this.model.set(data);
  },
  onModelChange: function(model) {
    var newPrice;
    this.$el.removeClass("disabled");
    newPrice = accounting.formatMoney(model.totalPricePerMonth() * this.app.currency.rate, {
      symbol: this.app.currency.symbol
    });
    $(".price", this.$el).html(newPrice);
    if (model.get("quantity") > 0) {
      return this.$el.addClass("active");
    } else {
      return this.$el.removeClass("active");
    }
  },
  ensureNumber: function(e) {
    var charCode;
    charCode = (e.which ? e.which : e.keyCode);
    return !(charCode > 31 && (charCode < 48 || charCode > 57));
  }
});

module.exports = BaremetalView;


},{"../templates/baremetal.haml":22}],33:[function(require,module,exports){
var IpServicesView, IpsModel, IpsView;

IpsView = require('./IpsView.coffee');

IpsModel = require('../models/IpsModel.coffee');

IpServicesView = Backbone.View.extend({
  events: {
    "click .add-button": "addService"
  },
  initialize: function(options) {
    this.options = options || {};
    this.app = this.options.app;
    this.collection.on("add", (function(_this) {
      return function(model, collection, options) {
        return _this.onServiceAdded(model);
      };
    })(this));
    this.collection.on("remove", (function(_this) {
      return function(model, collection, options) {
        return _this.onServiceRemoved(model);
      };
    })(this));
    this.collection.on("change", (function(_this) {
      return function() {
        return _this.updateSubtotal();
      };
    })(this));
    this.app.on("currencyChange", (function(_this) {
      return function() {
        return _this.updateSubtotal();
      };
    })(this));
    this.collection.on("datacenterUpdate", (function(_this) {
      return function() {
        _this.checkPricingMap();
        return _this.updateSubtotal();
      };
    })(this));
    this.checkPricingMap();
    this.ipsViews = [];
    return $('.has-tooltip', this.$el).tooltip();
  },
  checkPricingMap: function() {
    if (!this.options.pricingMap) {
      this.$el.addClass("disabled");
      this.collection.removeAll();
      return false;
    } else {
      this.$el.removeClass("disabled");
      return true;
    }
  },
  addService: function(e) {
    if (e) {
      e.preventDefault();
    }
    return this.collection.add({
      pricingMap: this.options.pricingMap
    });
  },
  onServiceAdded: function(model) {
    var ipsView;
    ipsView = new IpsView({
      model: model,
      app: this.app,
      parentView: this
    });
    this.ipsViews[model.cid] = ipsView;
    $(".table", this.$el).append(ipsView.render().el);
    return this.updateSubtotal();
  },
  onServiceRemoved: function(model) {
    if (this.ipsViews[model.cid]) {
      this.ipsViews[model.cid].close();
    }
    return this.updateSubtotal();
  },
  updateSubtotal: function() {
    var newSubtotal, subTotal;
    subTotal = this.collection.subtotal() * this.app.currency.rate;
    newSubtotal = accounting.formatMoney(subTotal, {
      symbol: this.app.currency.symbol
    });
    return $(".subtotal", this.$el).html(newSubtotal);
  }
});

module.exports = IpServicesView;


},{"../models/IpsModel.coffee":15,"./IpsView.coffee":34}],34:[function(require,module,exports){
var IpsView;

IpsView = Backbone.View.extend({
  tagName: "tr",
  className: "table-row",
  events: {
    "click .remove-button": "removeDeployment",
    "change select": "onFormChanged",
    "keypress .number": "ensureNumber",
    "change select[name]": "onFormChanged",
    "change input[name]": "onFormChanged",
    "input input[name]": "onFormChanged",
    "keyup input[name]": "onFormChanged",
    "keypress input:not([name])": "ensureNumber",
    "input input:not([name])": "onSliderTextChanged"
  },
  initialize: function(options) {
    this.options = options || {};
    this.app = this.options.app;
    this.model.on("change", (function(_this) {
      return function(model) {
        return _this.onModelChange(model);
      };
    })(this));
    return this.app.on("currencyChange", (function(_this) {
      return function() {
        return _this.onModelChange(_this.model);
      };
    })(this));
  },
  render: function() {
    var template;
    template = require("../templates/ips.haml");
    this.$el.html(template({
      model: this.model,
      app: this.app
    }));
    this.$el.attr("id", this.model.cid);
    _.defer((function(_this) {
      return function() {
        $('.range-slider', _this.$el).rangeslider({
          polyfill: false
        });
        return $('.range-slider', _this.$el).css("opacity", 1);
      };
    })(this));
    return this;
  },
  close: function() {
    this.remove();
    this.unbind();
    return this.$el.remove();
  },
  removeDeployment: function(e) {
    e.preventDefault();
    return this.model.destroy();
  },
  onFormChanged: function(e) {
    var data;
    e.preventDefault();
    data = Backbone.Syphon.serialize(this);
    return this.model.set(data);
  },
  onModelChange: function(model) {
    var newPrice;
    this.$el.removeClass("disabled");
    newPrice = accounting.formatMoney(model.totalPricePerMonth() * this.app.currency.rate, {
      symbol: this.app.currency.symbol
    });
    $(".price", this.$el).html(newPrice);
    $(".quantity", this.$el).html(model.get("quantity"));
    $(".quantity-text-input", this.$el).val(model.get("quantity"));
    if (model.get("memory") > 0) {
      return this.$el.addClass("active");
    } else {
      return this.$el.removeClass("active");
    }
  },
  ensureNumber: function(e) {
    var charCode;
    charCode = (e.which ? e.which : e.keyCode);
    return !(charCode > 31 && (charCode < 48 || charCode > 57));
  },
  onSliderTextChanged: function(e) {
    var $this, data, name, value;
    $this = $(e.currentTarget);
    name = $this.data("name");
    value = $this.val();
    if (value === "") {
      return;
    }
    data = Backbone.Syphon.serialize(this);
    data[name] = value;
    this.model.set(data);
    return $("[name=" + name + "]", this.$el).val(value).change();
  }
});

module.exports = IpsView;


},{"../templates/ips.haml":23}],35:[function(require,module,exports){
var LeadGenView;

LeadGenView = Backbone.View.extend({
  el: "#lead-gen",
  events: {
    "click .lead-gen__close": "closeLeadGen"
  },
  closeLeadGen: function() {
    this.$el.slideUp("fast");
    return $('body').removeClass("lead-gen-open");
  }
});

module.exports = LeadGenView;


},{}],36:[function(require,module,exports){
var ManagedAppView;

ManagedAppView = Backbone.View.extend({
  tagName: "tr",
  className: "table-row managed-app-row is-managed",
  events: function() {
    return {
      "click .remove-button": "onRemoveClick",
      "change input": "onFormChanged",
      "change select": "onFormChanged",
      "input input": "onFormChanged",
      "keyup input": "onFormChanged",
      "keypress input": "ensureNumber"
    };
  },
  initialize: function(options) {
    return this.options = options || {};
  },
  render: function() {
    var colspan, template;
    template = require("../templates/managedApp.haml");
    colspan = this.model.get("type") === "hyperscale" ? 4 : 5;
    this.$el.html(template({
      app: this.options.app,
      colspan: colspan,
      mainApp: this.options.mainApp,
      software_options: this.model.attributes.pricing.software
    }));
    this.$el.addClass("managed-row-for-server_" + this.model.cid);
    this.updateQuantityAndPrice();
    return this;
  },
  onRemoveClick: function(e) {
    var apps, key;
    e.preventDefault();
    key = $(e.currentTarget).data("key");
    apps = this.model.get("managedApps");
    apps = _.reject(apps, function(app) {
      return app.key === key;
    });
    return this.model.set("managedApps", apps);
  },
  updateQuantityAndPrice: function() {
    var instances, newPrice, price, quantity;
    quantity = this.model.get("quantity");
    price = this.model.managedAppPricePerMonth(this.options.app.key, this.options.app.instances, this.options.app.softwareId);
    instances = this.options.app.instances || 1;
    $(".managed-app-quantity", this.$el).html(quantity);
    newPrice = accounting.formatMoney(price * this.options.mainApp.currency.rate, {
      symbol: this.options.mainApp.currency.symbol
    });
    $(".price", this.$el).html(newPrice);
    return $("input[name=usage]", this.$el).val(instances);
  },
  onFormChanged: function() {
    var instances, softwareId;
    softwareId = $("select[name=softwareId]", this.$el).val();
    instances = $("input[name=usage]", this.$el).val() || 1;
    return this.model.updateManagedAppIntances(this.options.app.key, instances, softwareId);
  },
  ensureNumber: function(e) {
    var charCode;
    charCode = (e.which ? e.which : e.keyCode);
    return !(charCode > 31 && (charCode < 48 || charCode > 57));
  }
});

module.exports = ManagedAppView;


},{"../templates/managedApp.haml":24}],37:[function(require,module,exports){
var Config, MonthlyTotalView;

Config = require('../Config.coffee');

MonthlyTotalView = Backbone.View.extend({
  el: "#monthly-total",
  events: {
    "change .datacenter": "changeDatacenter",
    "change .currency": "changeCurrency"
  },
  initialize: function(options) {
    var mediaQueryList;
    this.options = options || {};
    this.app = this.options.app;
    this.app.on("totalPriceUpdated", (function(_this) {
      return function() {
        return _this.updateTotal();
      };
    })(this));
    $.getJSON(Config.DATACENTERS_URL, (function(_this) {
      return function(data) {
        return $.each(data, function(index, location) {
          var $option, alias, label, pricingSheetHref, selected;
          label = location.name.replace("_", " ");
          pricingSheetHref = location.links[0].href.replace("/prices/", "").replace(".json", "");
          alias = location.alias.toUpperCase();
          selected = options.datacenter === alias ? "selected" : "";
          $option = $("<option value='" + alias + "' " + selected + ">" + label + " - " + alias + "</option>").attr('data-pricing-map', pricingSheetHref);
          return $(".datacenter", _this.$el).append($option);
        });
      };
    })(this));
    $.each(this.app.currencyData['USD'], (function(_this) {
      return function(index, currency) {
        var $option, label, rate, selected, symbol;
        label = currency.id;
        rate = currency.rate;
        symbol = currency.symbol;
        selected = options.currency.id === label ? "selected" : "";
        $option = $("<option value='" + label + "' " + selected + ">" + label + "(" + symbol + ")</option>").attr('data-currency-symbol', symbol).attr('data-currency-rate', rate);
        return $(".currency", _this.$el).append($option);
      };
    })(this));
    mediaQueryList = window.matchMedia('print');
    mediaQueryList.addListener((function(_this) {
      return function(mql) {
        if (mql.matches) {
          return $('.green-section').clone().addClass('clone').css('position', 'relative').attr('id', '').appendTo('.page-form');
        } else {
          return $('.green-section.clone').remove();
        }
      };
    })(this));
    $(window.top).scroll((function(_this) {
      return function() {
        return _this.positionHeader();
      };
    })(this));
    $(".estimator-print", this.$el).on('click', function(e) {
      e.preventDefault();
      return window.print();
    });
    this.commandKey = false;
    $(document, '#estimator').on('keyup', (function(_this) {
      return function(e) {
        if (e.which === 91 || e.which === 93) {
          return _this.commandKey = false;
        }
      };
    })(this));
    return $(document, '#estimator').on('keydown', (function(_this) {
      return function(e) {
        if (e.which === 91 || e.which === 93) {
          _this.commandKey = true;
        }
        if (e.ctrlKey && e.which === 80) {
          e.preventDefault();
          window.print();
          return false;
        } else if (_this.commandKey && e.which === 80) {
          e.preventDefault();
          window.print();
          return false;
        }
      };
    })(this));
  },
  updateTotal: function() {
    var newTotal, total;
    total = this.app.totalPriceWithSupport * this.app.currency.rate;
    newTotal = accounting.formatMoney(total, {
      symbol: this.app.currency.symbol
    });
    return $(".price", this.$el).html(newTotal);
  },
  positionHeader: function() {
    if ($(window).scrollTop() > 289) {
      return this.$el.css("position", "fixed");
    } else {
      return this.$el.css("position", "absolute");
    }
  },
  changeDatacenter: function(e) {
    var $currencies, $selected, $target, currency, datasource;
    $target = $(e.target);
    $currencies = $(".currency", this.$el);
    currency = $currencies.val() || Config.DEFAULT_CURRENCY.id;
    this.app.trigger("datacenterChange");
    $selected = $target.find('option:selected');
    datasource = $selected.attr('data-pricing-map') || 'default';
    window.location.hash = "datacenter=" + ($target.val()) + "&datasource=" + datasource + "&currency=" + currency;
    return this.app.setPricingMap($target.val(), datasource);
  },
  changeCurrency: function(e) {
    var $selected, $target, currency_id, datacenter, datasource;
    $target = $(e.currentTarget);
    currency_id = $target.val() || Config.DEFAULT_CURRENCY.id;
    this.app.currency = this.app.currencyData['USD'][currency_id];
    this.app.trigger("currencyChange");
    $selected = $(".datacenter", this.$el).find('option:selected');
    datacenter = $selected.val();
    datasource = $selected.attr('data-pricing-map') || 'default';
    window.location.hash = "datacenter=" + datacenter + "&datasource=" + datasource + "&currency=" + currency_id;
    return false;
  }
});

module.exports = MonthlyTotalView;


},{"../Config.coffee":3}],38:[function(require,module,exports){
var RdbsView;

RdbsView = Backbone.View.extend({
  tagName: "tr",
  className: "table-row",
  events: {
    "keypress .number": "ensureNumber",
    "click .remove-button": "removeRdbs",
    "change select[name]": "onFormChanged",
    "change input[name]": "onFormChanged",
    "input input[name]": "onFormChanged",
    "keyup input[name]": "onFormChanged",
    "keypress input:not([name])": "ensureNumber",
    "input input:not([name])": "onSliderTextChanged"
  },
  initialize: function(options) {
    this.options = options || {};
    this.app = this.options.app;
    this.appViews = [];
    this.listenTo(this.model, 'change', (function(_this) {
      return function(model) {
        return _this.onModelChange(model);
      };
    })(this));
    return this.app.on("currencyChange", (function(_this) {
      return function() {
        return _this.onModelChange(_this.model);
      };
    })(this));
  },
  render: function() {
    var template;
    template = require("../templates/rdbs.haml");
    this.$el.html(template({
      model: this.model,
      app: this.app
    }));
    this.$el.attr("id", this.model.cid);
    _.defer((function(_this) {
      return function() {
        $('.range-slider', _this.$el).rangeslider({
          polyfill: false
        });
        return $('.range-slider', _this.$el).css("opacity", 1);
      };
    })(this));
    return this;
  },
  close: function() {
    this.remove();
    this.unbind();
    return this.$el.remove();
  },
  removeRdbs: function(e) {
    e.preventDefault();
    return this.model.destroy();
  },
  ensureNumber: function(e) {
    var charCode;
    charCode = (e.which ? e.which : e.keyCode);
    return !(charCode > 31 && (charCode < 48 || charCode > 57));
  },
  onSliderTextChanged: function(e) {
    var $this, data, name, value;
    $this = $(e.currentTarget);
    name = $this.data("name");
    value = $this.val();
    if (value === "") {
      return;
    }
    data = Backbone.Syphon.serialize(this);
    data.storage = value;
    this.model.set(data);
    return $("[name=" + name + "]", this.$el).val(value).change();
  },
  onFormChanged: function(e) {
    var data;
    e.preventDefault();
    data = Backbone.Syphon.serialize(this);
    return this.model.set(data);
  },
  onModelChange: function(model) {
    var newTotal, total;
    total = model.totalPricePerMonth() * this.app.currency.rate;
    newTotal = accounting.formatMoney(total, {
      symbol: this.app.currency.symbol
    });
    $(".price", this.$el).html(newTotal);
    $(".cpu", this.$el).html(model.get("cpu"));
    $(".memory", this.$el).html(model.get("memory"));
    $(".storage", this.$el).html(model.get("storage"));
    $(".storage-text-input", this.$el).val(model.get("storage"));
    $(".cpu-text-input", this.$el).val(model.get("cpu"));
    $(".memory-text-input", this.$el).val(model.get("memory"));
    this.$el.attr("id", this.model.cid);
    _.each(this.appViews, (function(_this) {
      return function(appView) {
        return appView.updateQuantityAndPrice();
      };
    })(this));
    return this.options.parentView.collection.trigger('change');
  }
});

module.exports = RdbsView;


},{"../templates/rdbs.haml":25}],39:[function(require,module,exports){
var RdbsModel, RdbsView, RdbssView;

RdbsView = require('./RdbsView.coffee');

RdbsModel = require('../models/RdbsModel.coffee');

RdbssView = Backbone.View.extend({
  events: {
    "click .add-button": "addRdbs"
  },
  initialize: function(options) {
    this.options = options || {};
    this.app = this.options.app;
    this.collection.on("add", (function(_this) {
      return function(model, collection, options) {
        return _this.onRdbsAdded(model);
      };
    })(this));
    this.collection.on("remove", (function(_this) {
      return function(model, collection, options) {
        return _this.onRdbsRemoved(model);
      };
    })(this));
    this.collection.on("change", (function(_this) {
      return function() {
        return _this.updateSubtotal();
      };
    })(this));
    this.app.on("currencyChange", (function(_this) {
      return function() {
        return _this.updateSubtotal();
      };
    })(this));
    this.collection.on("datacenterUpdate", (function(_this) {
      return function() {
        _this.checkPricingMap();
        return _this.updateSubtotal();
      };
    })(this));
    this.checkPricingMap();
    this.updateSubtotal();
    this.rdbsViews = [];
    return $('.has-tooltip', this.$el).tooltip();
  },
  checkPricingMap: function() {
    if (!this.options.pricingMap) {
      this.$el.addClass("disabled");
      this.collection.removeAll();
      return false;
    } else {
      this.$el.removeClass("disabled");
      return true;
    }
  },
  addRdbs: function(e) {
    if (e) {
      e.preventDefault();
    }
    return this.collection.add({
      pricingMap: this.options.pricingMap
    });
  },
  onRdbsAdded: function(model) {
    var rdbsView;
    rdbsView = new RdbsView({
      model: model,
      app: this.app,
      parentView: this
    });
    this.rdbsViews[model.cid] = rdbsView;
    $(".table", this.$el).append(rdbsView.render().el);
    return this.updateSubtotal();
  },
  onRdbsRemoved: function(model) {
    this.rdbsViews[model.cid].close();
    return this.updateSubtotal();
  },
  updateSubtotal: function() {
    var newSubtotal, subTotal;
    subTotal = this.collection.subtotal() * this.app.currency.rate;
    newSubtotal = accounting.formatMoney(subTotal, {
      symbol: this.app.currency.symbol
    });
    return $(".subtotal", this.$el).html(newSubtotal);
  }
});

module.exports = RdbssView;


},{"../models/RdbsModel.coffee":17,"./RdbsView.coffee":38}],40:[function(require,module,exports){
var AddManagedAppView, ManagedAppView, ServerView;

AddManagedAppView = require('./AddManagedAppView.coffee');

ManagedAppView = require('./ManagedAppView.coffee');

ServerView = Backbone.View.extend({
  tagName: "tr",
  className: "table-row",
  events: {
    "keypress .number": "ensureNumber",
    "click .remove-button": "removeServer",
    "click .managed-check": "onManagedCheckboxChanged",
    "change select[name]": "onFormChanged",
    "change input[name]": "onFormChanged",
    "input input[name]": "onFormChanged",
    "keyup input[name]": "onFormChanged",
    "keypress input:not([name])": "ensureNumber",
    "input input:not([name])": "onSliderTextChanged"
  },
  initialize: function(options) {
    this.options = options || {};
    this.app = this.options.app;
    this.appViews = [];
    this.listenTo(this.model, 'change', (function(_this) {
      return function(model) {
        return _this.onModelChange(model);
      };
    })(this));
    this.listenTo(this.model, 'change:managedApps', (function(_this) {
      return function(model) {
        return _this.onManagedChanged(model);
      };
    })(this));
    this.listenTo(this.model, 'change:os', (function(_this) {
      return function(model) {
        return model.set('managedApps', []);
      };
    })(this));
    return this.app.on("currencyChange", (function(_this) {
      return function() {
        return _this.onModelChange(_this.model);
      };
    })(this));
  },
  render: function() {
    var disabledClass, managedDisabled, template;
    template = require("../templates/server.haml");
    managedDisabled = this.model.get("pricingMap").get("options").os["redhat-managed"] === "disabled";
    disabledClass = "";
    if (managedDisabled) {
      disabledClass = "disabled";
    }
    this.$el.html(template({
      model: this.model,
      app: this.app,
      disabledClass: disabledClass
    }));
    this.$el.attr("id", this.model.cid);
    _.defer((function(_this) {
      return function() {
        $('.range-slider', _this.$el).rangeslider({
          polyfill: false
        });
        return $('.range-slider', _this.$el).css("opacity", 1);
      };
    })(this));
    return this;
  },
  close: function() {
    this.remove();
    this.unbind();
    this.$el.remove();
    if (this.addManagedAppView) {
      this.addManagedAppView.remove();
    }
    return this.removeAllManagedApps();
  },
  removeServer: function(e) {
    e.preventDefault();
    return this.model.destroy();
  },
  ensureNumber: function(e) {
    var charCode;
    charCode = (e.which ? e.which : e.keyCode);
    return !(charCode > 31 && (charCode < 48 || charCode > 57));
  },
  onSliderTextChanged: function(e) {
    var $this, data, name, value;
    $this = $(e.currentTarget);
    name = $this.data("name");
    value = $this.val();
    if (value === "") {
      return;
    }
    data = Backbone.Syphon.serialize(this);
    data.storage = value;
    this.model.set(data);
    return $("[name=" + name + "]", this.$el).val(value).change();
  },
  onFormChanged: function(e) {
    var data;
    e.preventDefault();
    data = Backbone.Syphon.serialize(this);
    return this.model.set(data);
  },
  onManagedCheckboxChanged: function(e) {
    var $check;
    $check = $(e.currentTarget);
    if ($check.is(":checked")) {
      return this.addMangedApps();
    } else {
      return this.removeAllManagedAppsAndAddButton();
    }
  },
  addMangedApps: function() {
    this.addManagedAppView = new AddManagedAppView({
      model: this.model
    });
    return this.$el.after(this.addManagedAppView.render().el);
  },
  removeAllManagedApps: function() {
    _.each(this.appViews, function(appView) {
      return appView.remove();
    });
    return this.appViews = [];
  },
  removeAllManagedAppsAndAddButton: function() {
    this.$el.removeClass("is-managed");
    this.model.set("managedApps", []);
    if (this.addManagedAppView) {
      this.addManagedAppView.remove();
    }
    return this.removeAllManagedApps();
  },
  onManagedChanged: function(model) {
    var managedApps;
    this.removeAllManagedApps();
    managedApps = model.get("managedApps");
    return _.each(managedApps, (function(_this) {
      return function(app) {
        var managedAppView;
        managedAppView = new ManagedAppView({
          model: model,
          app: app,
          mainApp: _this.app
        });
        _this.appViews.push(managedAppView);
        _this.addManagedAppView.$el.before(managedAppView.render().el);
        return _this.onModelChange(model);
      };
    })(this));
  },
  onModelChange: function(model) {
    var managedDisabled, newTotal, total;
    total = model.totalPricePerMonth() * this.app.currency.rate;
    newTotal = accounting.formatMoney(total, {
      symbol: this.app.currency.symbol
    });
    $(".price", this.$el).html(newTotal);
    $(".cpu", this.$el).html(model.get("cpu"));
    $(".memory", this.$el).html(model.get("memory"));
    $(".storage", this.$el).html(model.get("storage"));
    $(".storage-text-input", this.$el).val(model.get("storage"));
    $(".cpu-text-input", this.$el).val(model.get("cpu"));
    $(".memory-text-input", this.$el).val(model.get("memory"));
    managedDisabled = this.model.get("pricingMap").get("options").os["redhat-managed"] === "disabled";
    if (managedDisabled) {
      $(".managed-cell", this.$el).addClass('disabled');
    } else {
      $(".managed-cell", this.$el).removeClass('disabled');
    }
    this.$el.attr("id", this.model.cid);
    if (model.get("os") === "linux" || managedDisabled === true) {
      model.set("managed", false);
      $(".managed-check", this.$el).attr("disabled", true);
      $(".managed-check", this.$el).attr("checked", false);
      this.removeAllManagedAppsAndAddButton();
    } else {
      $(".managed-check", this.$el).attr("disabled", false);
    }
    _.each(this.appViews, (function(_this) {
      return function(appView) {
        return appView.updateQuantityAndPrice();
      };
    })(this));
    if (this.addManagedAppView) {
      this.addManagedAppView.updateOptions();
    }
    return this.options.parentView.collection.trigger('change');
  }
});

module.exports = ServerView;


},{"../templates/server.haml":26,"./AddManagedAppView.coffee":28,"./ManagedAppView.coffee":36}],41:[function(require,module,exports){
var ServerModel, ServerView, ServersView;

ServerView = require('./ServerView.coffee');

ServerModel = require('../models/ServerModel.coffee');

ServersView = Backbone.View.extend({
  events: {
    "click .add-button": "addServer"
  },
  initialize: function(options) {
    this.options = options || {};
    this.app = this.options.app;
    this.collection.on("add", (function(_this) {
      return function(model, collection, options) {
        return _this.onServerAdded(model);
      };
    })(this));
    this.collection.on("remove", (function(_this) {
      return function(model, collection, options) {
        return _this.onServerRemoved(model);
      };
    })(this));
    this.collection.on("change", (function(_this) {
      return function() {
        return _this.updateSubtotal();
      };
    })(this));
    this.app.on("currencyChange", (function(_this) {
      return function() {
        return _this.updateSubtotal();
      };
    })(this));
    this.collection.on("datacenterUpdate", (function(_this) {
      return function() {
        return _this.updateSubtotal();
      };
    })(this));
    this.updateSubtotal();
    this.serverViews = [];
    if (this.options.hyperscale) {
      if (this.options.pricingMap.get("options").storage.hyperscale === "disabled") {
        this.$el.addClass("disabled");
      }
    }
    return $('.has-tooltip', this.$el).tooltip();
  },
  addServer: function(e) {
    var type;
    if (e) {
      e.preventDefault();
    }
    type = this.options.hyperscale === true ? "hyperscale" : "standard";
    return this.collection.add({
      pricingMap: this.options.pricingMap,
      type: type
    });
  },
  onServerAdded: function(model) {
    var serverView;
    serverView = new ServerView({
      model: model,
      app: this.app,
      parentView: this
    });
    this.serverViews[model.cid] = serverView;
    $(".table", this.$el).append(serverView.render().el);
    return this.updateSubtotal();
  },
  onServerRemoved: function(model) {
    this.serverViews[model.cid].close();
    return this.updateSubtotal();
  },
  updateSubtotal: function() {
    var newSubtotal, subTotal;
    subTotal = this.collection.subtotal() * this.app.currency.rate;
    newSubtotal = accounting.formatMoney(subTotal, {
      symbol: this.app.currency.symbol
    });
    $(".subtotal", this.$el).html(newSubtotal);
    if (this.options.hyperscale) {
      if (this.options.pricingMap.get("options").storage.hyperscale === "disabled") {
        this.$el.addClass("disabled");
        return this.collection.removeAll();
      } else {
        return this.$el.removeClass("disabled");
      }
    }
  }
});

module.exports = ServersView;


},{"../models/ServerModel.coffee":18,"./ServerView.coffee":40}],42:[function(require,module,exports){
var ServiceView;

ServiceView = Backbone.View.extend({
  className: "service",
  events: {
    "change select": "onFormChanged",
    "change input": "onFormChanged",
    "input input": "onFormChanged"
  },
  initialize: function(options) {
    this.options = options || {};
    this.app = this.options.app;
    this.model.on("change", (function(_this) {
      return function(model) {
        return _this.onModelChange(model);
      };
    })(this));
    return this.app.on("currencyChange", (function(_this) {
      return function() {
        return _this.onModelChange(_this.model);
      };
    })(this));
  },
  render: function() {
    var template;
    template = require("../templates/service.haml");
    this.$el.html(template({
      model: this.model,
      app: this.app
    }));
    this.$el.attr("id", this.model.cid);
    this.$el.addClass(this.model.get("key"));
    if (this.options.disabled) {
      this.$el.addClass("disabled");
    }
    _.defer((function(_this) {
      return function() {
        $('.range-slider', _this.$el).rangeslider({
          polyfill: false
        });
        return $('.range-slider', _this.$el).css("opacity", 1);
      };
    })(this));
    return this;
  },
  onFormChanged: function(e) {
    var data;
    e.preventDefault();
    data = Backbone.Syphon.serialize(this);
    return this.model.set(data);
  },
  onModelChange: function(model) {
    var cost, newCost, newPrice;
    newCost = accounting.formatMoney(model.get("pricing") * this.app.currency.rate, {
      symbol: this.app.currency.symbol
    });
    newPrice = accounting.formatMoney(model.totalPricePerMonth() * this.app.currency.rate, {
      symbol: this.app.currency.symbol
    });
    cost = newCost;
    if (model.get("hasSetupFee")) {
      cost += "&nbsp;<span><sup>*</sup></span>";
    }
    $(".cost", this.$el).html(cost);
    $(".price", this.$el).html(newPrice);
    if (model.get("key") === "object-storage") {
      if (model.get("disabled") === true) {
        this.$el.addClass("disabled");
        $(".range-slider", this.$el).val(0).change();
      } else {
        this.$el.removeClass("disabled");
      }
    }
    $(".quantity", this.$el).html(model.get("quantity"));
    if (model.get("quantity") > 0) {
      return this.$el.addClass("active");
    } else {
      return this.$el.removeClass("active");
    }
  }
});

module.exports = ServiceView;


},{"../templates/service.haml":27}],43:[function(require,module,exports){
var ServiceModel, ServiceView, ServicesView;

ServiceView = require('./ServiceView.coffee');

ServiceModel = require('../models/ServiceModel.coffee');

ServicesView = Backbone.View.extend({
  initialize: function(options) {
    this.options = options || {};
    this.app = this.options.app;
    this.collection.on("reset", (function(_this) {
      return function(model, collection, options) {
        _this.$el.html("");
        return _this.addServices();
      };
    })(this));
    this.collection.on("change", (function(_this) {
      return function() {
        return _this.updateSubtotal();
      };
    })(this));
    this.app.on("currencyChange", (function(_this) {
      return function() {
        return _this.updateSubtotal();
      };
    })(this));
    this.addServices();
    return this.updateSubtotal();
  },
  addServices: function() {
    return this.collection.each((function(_this) {
      return function(service) {
        var disabled, serviceView;
        disabled = service.get('disabled');
        serviceView = new ServiceView({
          model: service,
          disabled: disabled,
          app: _this.app
        });
        return $(".services", _this.$el).append(serviceView.render().el);
      };
    })(this));
  },
  updateSubtotal: function() {
    var newSubtotal, subTotal;
    subTotal = this.collection.subtotal() * this.app.currency.rate;
    newSubtotal = accounting.formatMoney(subTotal, {
      symbol: this.app.currency.symbol
    });
    return $(".subtotal", this.$el).html(newSubtotal);
  }
});

module.exports = ServicesView;


},{"../models/ServiceModel.coffee":19,"./ServiceView.coffee":42}],44:[function(require,module,exports){
var Config, SupportView;

Config = require('../Config.coffee');

SupportView = Backbone.View.extend({
  el: "#support",
  supportPricing: {
    ranges: [10000, 80000, 250000, 1000000],
    percentages: [0.1, 0.07, 0.05, 0.03]
  },
  events: {
    "click .support-select": "onSupportSelectClick",
    "click .support-select a": "onSupportSelectInnerLinkClick"
  },
  initialize: function(options) {
    this.options = options || {};
    $.getJSON(Config.SUPPORT_PRICING_URL, (function(_this) {
      return function(data) {
        return _this.supportPricing = data;
      };
    })(this));
    return this.selectPlan("developer");
  },
  onSupportSelectClick: function(e) {
    var $this, plan;
    e.preventDefault();
    e.stopPropagation();
    $this = $(e.currentTarget);
    plan = $this.data("plan");
    this.selectPlan(plan);
    return this.options.app.updateTotalPrice();
  },
  onSupportSelectInnerLinkClick: function(e) {
    return e.stopPropagation();
  },
  selectPlan: function(plan) {
    this.currentPlan = plan;
    $(".support-select").removeClass("selected");
    $(".support-select .status-label").html("Select");
    $(".support-select[data-plan=" + plan + "]").addClass("selected");
    $(".support-select[data-plan=" + plan + "] .status-label").html("Selected");
    return this.updateSubtotal();
  },
  calculateSupportBill: function() {
    var amount, multipliers, percentages, ranges, total;
    if (this.currentPlan === "developer") {
      return 0;
    }
    amount = this.options.app.totalPrice - this.options.app.oSSubtotal || 0;
    amount -= this.options.app.managedTotal;
    ranges = this.supportPricing.ranges;
    percentages = this.supportPricing.percentages;
    multipliers = _.map(ranges, function(range, index) {
      var previousRange;
      previousRange = ranges[index - 1] || null;
      if (index === 0 && amount < range) {
        return [amount, percentages[index]];
      }
      if (previousRange > amount) {
        return null;
      } else if (amount < range) {
        return [amount - previousRange, percentages[index]];
      } else {
        return [range - previousRange, percentages[index]];
      }
    });
    total = 0;
    _.map(multipliers, function(range) {
      if (range) {
        return total = total + (range[0] * range[1]);
      }
    });
    return total;
  },
  updateSubtotal: function() {
    var newSubtotal;
    this.supportPrice = this.calculateSupportBill();
    newSubtotal = accounting.formatMoney(this.supportPrice * this.options.app.currency.rate, {
      symbol: this.options.app.currency.symbol
    });
    $(".subtotal", this.$el).html(newSubtotal);
    return this.supportPrice;
  }
});

module.exports = SupportView;


},{"../Config.coffee":3}],45:[function(require,module,exports){
var App, AppfogCollection, AppfogsView, BaremetalCollection, BaremetalConfigsView, Config, IpServicesView, IpsCollection, LeadGenView, MonthlyTotalView, PricingMapsCollection, Q, RdbssCollection, RdbssView, ServersCollection, ServersView, ServicesCollection, ServicesView, SupportView, Utils, cb;

Config = require('./app/Config.coffee');

ServersView = require('./app/views/ServersView.coffee');

RdbssView = require('./app/views/RdbssView.coffee');

SupportView = require('./app/views/SupportView.coffee');

ServicesView = require('./app/views/ServicesView.coffee');

IpServicesView = require('./app/views/IpServicesView.coffee');

AppfogsView = require('./app/views/AppfogsView.coffee');

BaremetalConfigsView = require('./app/views/BaremetalConfigsView.coffee');

MonthlyTotalView = require('./app/views/MonthlyTotalView.coffee');

LeadGenView = require('./app/views/LeadGenView.coffee');

PricingMapsCollection = require('./app/collections/PricingMapsCollection.coffee');

ServersCollection = require('./app/collections/ServersCollection.coffee');

RdbssCollection = require('./app/collections/RdbssCollection.coffee');

ServicesCollection = require('./app/collections/ServicesCollection.coffee');

IpsCollection = require('./app/collections/IpsCollection.coffee');

AppfogCollection = require('./app/collections/AppfogCollection.coffee');

BaremetalCollection = require('./app/collections/BaremetalCollection.coffee');

Utils = require('./app/Utils.coffee');

Q = require('q');

App = {
  initialized: false,
  init: function() {
    var currencyId, datacenter, datasource, dc, ds;
    _.extend(this, Backbone.Events);
    datacenter = Utils.getUrlParameterFromHash("datacenter");
    datasource = Utils.getUrlParameterFromHash("datasource");
    currencyId = Utils.getUrlParameterFromHash("currency") || Config.DEFAULT_CURRENCY.id;
    dc = datacenter || "VA1";
    ds = datasource || "va1";
    this.currency = this.currencyData['USD'][currencyId];
    this.currentDatacenter = dc;
    this.monthlyTotalView = new MonthlyTotalView({
      app: this,
      datacenter: dc,
      datasource: ds,
      currency: this.currency
    });
    this.supportView = new SupportView({
      app: this
    });
    this.pricingMaps = new PricingMapsCollection([], {
      app: this,
      datacenter: dc,
      datasource: ds,
      currency: this.currency,
      url: Config.PRICING_ROOT_PATH + ("" + ds + ".json")
    });
    this.leadGenView = new LeadGenView();
    this.pricingMaps.on("sync", (function(_this) {
      return function() {
        return _this.onPricingMapsSynced();
      };
    })(this));
    return this.on("currencyChange", (function(_this) {
      return function() {
        return _this.updateTotalPrice();
      };
    })(this));
  },
  onPricingMapsSynced: function() {
    this.initServers();
    this.initRdbss();
    this.initHyperscaleServers();
    this.initIpsServices();
    this.initAppfogServices();
    this.initBaremetalConfigs();
    this.networkingServices = new ServicesCollection({
      collectionUrl: "json/networking-services.json"
    });
    this.additionalServices = new ServicesCollection({
      collectionUrl: "json/additional-services.json"
    });
    this.bandwidthServices = new ServicesCollection({
      collectionUrl: "json/bandwidth.json"
    });
    this.networkingServices.on("sync", (function(_this) {
      return function() {
        return _this.initNetworkServices();
      };
    })(this));
    this.additionalServices.on("sync", (function(_this) {
      return function() {
        return _this.initAdditionalServices();
      };
    })(this));
    return this.bandwidthServices.on("sync", (function(_this) {
      return function() {
        return _this.initBandwidthServices();
      };
    })(this));
  },
  initNetworkServices: function() {
    this.networkingServices.initPricing(this.pricingMaps);
    this.networkingServicesView = new ServicesView({
      app: this,
      collection: this.networkingServices,
      el: "#networking-services"
    });
    this.networkingServices.on("change", (function(_this) {
      return function() {
        return _this.updateTotalPrice();
      };
    })(this));
    this.initialized = true;
    return this.updateTotalPrice();
  },
  initAdditionalServices: function() {
    this.additionalServices.initPricing(this.pricingMaps);
    this.additionalServicesView = new ServicesView({
      app: this,
      collection: this.additionalServices,
      el: "#additional-services"
    });
    this.additionalServices.on("change", (function(_this) {
      return function() {
        return _this.updateTotalPrice();
      };
    })(this));
    this.initialized = true;
    this.updateTotalPrice();
    $(".main-container").addClass("visible");
    return $(".spinner").hide();
  },
  initBandwidthServices: function() {
    this.bandwidthServices.initPricing(this.pricingMaps);
    this.bandwidthServicesView = new ServicesView({
      app: this,
      collection: this.bandwidthServices,
      el: "#bandwidth"
    });
    this.bandwidthServices.on("change", (function(_this) {
      return function() {
        return _this.updateTotalPrice();
      };
    })(this));
    this.initialized = true;
    return this.updateTotalPrice();
  },
  initServers: function() {
    this.serversCollection = new ServersCollection;
    this.serversCollection.on("change remove add", (function(_this) {
      return function() {
        return _this.updateTotalPrice();
      };
    })(this));
    return this.serversView = new ServersView({
      app: this,
      collection: this.serversCollection,
      el: "#servers",
      pricingMap: this.pricingMaps.forKey("server")
    });
  },
  initRdbss: function() {
    this.rdbssCollection = new RdbssCollection;
    this.rdbssCollection.on("change remove add", (function(_this) {
      return function() {
        return _this.updateTotalPrice();
      };
    })(this));
    return this.rdbssView = new RdbssView({
      app: this,
      collection: this.rdbssCollection,
      el: "#rdbss",
      pricingMap: this.pricingMaps.forKey("rdbs")
    });
  },
  initHyperscaleServers: function() {
    this.hyperscaleServersCollection = new ServersCollection;
    this.hyperscaleServersCollection.on("change remove add", (function(_this) {
      return function() {
        return _this.updateTotalPrice();
      };
    })(this));
    return this.hyperscaleServersView = new ServersView({
      app: this,
      collection: this.hyperscaleServersCollection,
      el: "#hyperscale-servers",
      pricingMap: this.pricingMaps.forKey("server"),
      hyperscale: true
    });
  },
  initIpsServices: function() {
    this.ipsCollection = new IpsCollection;
    this.ipsCollection.on("change remove add", (function(_this) {
      return function() {
        return _this.updateTotalPrice();
      };
    })(this));
    return this.ipServicesView = new IpServicesView({
      app: this,
      collection: this.ipsCollection,
      el: "#intrusion-prevention-service",
      pricingMap: this.pricingMaps.forKey("ips")
    });
  },
  initAppfogServices: function() {
    this.appfogServicesCollection = new AppfogCollection;
    this.appfogServicesCollection.on("change remove add", (function(_this) {
      return function() {
        return _this.updateTotalPrice();
      };
    })(this));
    return this.appfogsView = new AppfogsView({
      app: this,
      collection: this.appfogServicesCollection,
      el: "#appfog-services",
      pricingMap: this.pricingMaps.forKey("appfog")
    });
  },
  initBaremetalConfigs: function() {
    this.baremetalCollection = new BaremetalCollection;
    this.baremetalCollection.on("change remove add", (function(_this) {
      return function() {
        return _this.updateTotalPrice();
      };
    })(this));
    return this.BaremetalConfigsView = new BaremetalConfigsView({
      app: this,
      collection: this.baremetalCollection,
      el: "#baremetal-servers",
      pricingMap: this.pricingMaps.forKey("baremetal")
    });
  },
  updateTotalPrice: function() {
    if (!this.initialized) {
      return;
    }
    this.totalPrice = this.serversCollection.subtotal() + this.rdbssCollection.subtotal() + this.hyperscaleServersCollection.subtotal() + this.ipsCollection.subtotal() + this.appfogServicesCollection.subtotal() + this.baremetalCollection.subtotal() + this.networkingServices.subtotal() + this.additionalServices.subtotal() + this.bandwidthServices.subtotal();
    this.oSSubtotal = this.serversCollection.oSSubtotal() + this.hyperscaleServersCollection.oSSubtotal();
    this.managedTotal = this.serversCollection.managedTotal();
    this.totalPriceWithSupport = this.totalPrice + this.supportView.updateSubtotal();
    return this.trigger("totalPriceUpdated");
  },
  setPricingMap: function(dc, ds) {
    this.pricingMaps = new PricingMapsCollection([], {
      app: this,
      datacenter: dc,
      datasource: ds,
      currency: this.currency,
      url: Config.PRICING_ROOT_PATH + ("" + ds + ".json")
    });
    return this.pricingMaps.on("sync", (function(_this) {
      return function() {
        _this.hyperscaleServersView.options.pricingMap = _this.pricingMaps.forKey("server");
        _this.ipServicesView.options.pricingMap = _this.pricingMaps.forKey("ips");
        _this.appfogsView.options.pricingMap = _this.pricingMaps.forKey("appfog");
        _this.BaremetalConfigsView.options.pricingMap = _this.pricingMaps.forKey("baremetal");
        _this.serversView.options.pricingMap = _this.pricingMaps.forKey("server");
        _this.rdbssView.options.pricingMap = _this.pricingMaps.forKey("rdbs");
        _this.serversCollection.initPricing(_this.pricingMaps);
        _this.rdbssCollection.initPricing(_this.pricingMaps);
        _this.hyperscaleServersCollection.initPricing(_this.pricingMaps);
        _this.ipsCollection.initPricing(_this.pricingMaps.forKey("ips"));
        _this.appfogServicesCollection.initPricing(_this.pricingMaps.forKey("appfog"));
        _this.baremetalCollection.initPricing(_this.pricingMaps.forKey("baremetal"));
        _this.networkingServices.initPricing(_this.pricingMaps);
        _this.additionalServices.initPricing(_this.pricingMaps);
        return _this.bandwidthServices.initPricing(_this.pricingMaps);
      };
    })(this));
  }
};

cb = Q.defer();

$(function() {
  return Config.init(App, cb).then(function() {
    return App.init();
  });
});


},{"./app/Config.coffee":3,"./app/Utils.coffee":4,"./app/collections/AppfogCollection.coffee":5,"./app/collections/BaremetalCollection.coffee":6,"./app/collections/IpsCollection.coffee":7,"./app/collections/PricingMapsCollection.coffee":8,"./app/collections/RdbssCollection.coffee":9,"./app/collections/ServersCollection.coffee":10,"./app/collections/ServicesCollection.coffee":11,"./app/views/AppfogsView.coffee":30,"./app/views/BaremetalConfigsView.coffee":31,"./app/views/IpServicesView.coffee":33,"./app/views/LeadGenView.coffee":35,"./app/views/MonthlyTotalView.coffee":37,"./app/views/RdbssView.coffee":39,"./app/views/ServersView.coffee":41,"./app/views/ServicesView.coffee":43,"./app/views/SupportView.coffee":44,"q":2}]},{},[45])