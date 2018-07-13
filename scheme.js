class Environment {

    constructor(parent) {
        this._parent = parent;
        this._symbols = {};
    }

    define(x, value) {
        this._symbols[x] = value;
    }

    define_map(xx) {
        for (var x in xx) {
            if (xx.hasOwnProperty(x)) {
                this.define(x, xx[x])                
            }
        }
    }

    set(x, value) {
        if (x in this._symbols) {
            this._symbols[x] = value;
        } else if (this._parent != null) {
            this._parent.set(x, value);
        }
    }

    get(x) {
        if (x in this._symbols) {
            return this._symbols[x];
        }
        if (this._parent != null) {
            return this._parent.get(x);
        }
        return null;
    }

}

class Scheme {
    constructor() {
        this._env = new Environment(null);
        this._init_env();
    }

    _init_env() {
        this._env.define_map({
            '#t': true,
            '#f': false,
            'list': function(x) { return x; },
            '+': function(x) { return x.reduce(function(acc, curr) { return acc + curr}); },
            '-': function(x) { return x[0] - x[1]; },
            '*': function(x) { return x[0] * x[1]; },
            '/': function(x) { return x[0] / x[1]; },
            '>': function(x) { return x[0] > x[1]; },
            '>=': function(x) { return x[0] >= x[1]; },
            '<=': function(x) { return x[0] <= x[1]; },
            'car': function(x) { return x[0][0]; },
            'cdr': function(x) { return x[0].slice(1); },
            'cons': function(x) { x[0].push(x[1]); return x[0]; },
            'apply': function(x) {
                    var f = x[0];
                    if (f == null)
                        throw new Error('Applying undefined function');
                    if (typeof(f) != 'function') {
                        throw new Error('Applying to non-function, but ' + typeof(f));
                    }
                    var arg = []
                    if (x[1] != null)
                        arg = [x[1]];
                    return f(arg, '<lambda>');
                },
            '=': function(x) { return x[0] == x[1]; },
            'eq?': function(x) { return x[0] === x[1]; },
            'equal?': function(x) { return x[0] == x[1]; },
            'null?': function(x) { return x == null || x.length == 0 || x[0] == null || x[0].length == 0; },
            'number?': function(x) { return typeof(x[0]) == 'number'; },
            'symbol?': function(x) { return typeof(x[0]) == 'string'; },
            'procedure?': function(x) { return typeof(x[0]) == 'function'; },
            'list?': function(x) { return x[0] instanceof Array; },
            'not': function(x) { return !x[0]; },
            'map': function(x) {
                    var f = args[0];
                    var list = [];
                    x[1].map(function(x) {
                        list.push(f([x]));
                    });
                    return list;
                },
            'print': function(x) {
                console.log(Scheme.prototype._stringinize(x))
            },
            '#': function(x) {
                // Dummy function to allow in-code comments              
            }
        });
    }

    _stringinize(list) {
        var str = '';
        for (var i = 0; i < list.length; i++) {
            if (i > 0)
                str += ' ';
            var item = list[i];
            if (item instanceof Array) {
                str += Scheme.prototype._stringinize(item)
            } else {
                str += item;
            }
        }
        return str;
    }

    _atom(token) {
        var v = parseFloat(token)
        if (isNaN(v)) {
            v = parseInt(token);
            if (isNaN(v)) {
                return token;
            }
        }
        return v;
    }

    _tokenize(s) {
        return s.replace(/(\r\n\t|\n|\r\t)/gm,"")
            .replace(/[(]/g, ' ( ')
            .replace(/[)]/g, ' ) ')
            .split(' ')
            .filter(function(s) { return s != ''});
    }

    _parse(tokens) {
        if (tokens.length == 0)
            throw new Error('Unexpected end of input');
        var token = tokens.shift();
        if (token == '(') {
            var list = [];
            while (tokens[0] != ')')
                list.push(this._parse(tokens));
            tokens.shift();
            return list;
        } else if (token == ')') {
            throw new Error('Unexpected )');
        } else {
            return this._atom(token);
        }
    }

    _eval(x, env) {
        if (x == null) {
            return null;
        } else if (typeof(x) == 'string') {
            return env.get(x);
        } else if (typeof(x) == 'number') {
            return x;
        } else if (!x instanceof Array) {
            return x;
        } else if (x.length == 0) {
            return null;
        } else if (x[0] == 'quote') {
            return x[1];
        } else if (x[0] == 'if') {
            var expr = x[3];
            if (this._eval(x[1], env)) {
                expr = x[2];
            }
            return this._eval(expr, env);
        } else if (x[0] == 'define') {
            env.define(x[1], this._eval(x[2], env));
        } else if (x[0] == 'set!') {
            env.set(x[1], this._eval(x[2], env));
        } else if (x[0] == 'lambda') {
            var params = x[1];
            var body = x[2];
            var self = this;
            return function(args, name) {
                if (params.length != args.length) 
                    throw new Error('Function ' + name + ' expects exactly ' + params.length + ' arguments (' + params
                        + '), but ' + args.length + ' provided (' + args + ')');

                // Extend the environment
                var penv = new Environment(env);
                for (var i = 0; i < params.length; i++) {
                    penv.define(params[i], args[i]);
                }

                return self._eval(body, penv);                
            }
        } else if (x[0] == 'begin') {
            var res = null;
            for (var i = 0; i < x.length; i++) {
                res = this._eval(x[i], env);
            }
            return res;
        } else {
            var caller = this._eval(x[0], env);
            if (typeof(caller) != 'function') {
                throw new Error('Function ' + x[0] + ' is not defined');
            }
            var local_args = [];
            for (var i = 1; i < x.length; i++) {
                var a = this._eval(x[i], env);
                local_args.push(a);
            }
            return caller(local_args, x[0]);
        }
    }

    do(code) {
        var tokens = this._tokenize(code);
        var res = null;
        while (tokens.length > 0) {
            var list = this._parse(tokens);
            res = this._eval(list, this._env);
        }
        return res;
    }

    env() { return this._env; }


}

let scheme = new Scheme();
scheme.do(`
    (define multiply-by (lambda (n) (lambda (y) (* y n))))
    (define doubler (multiply-by 2))
    (define tripler (multiply-by 3))
    (define fact (lambda (n) (if (<= n 1) 1 (* n (fact (- n 1))))))

    (print (quote (Factorial 10 is)) (fact 10))

    (# Repeat procedure call)
    (define repeat
        (lambda (n f)
            (if (> n 0)
                (begin
                    (apply f args)
                    (repeat (- n 1) f)
                )
            )
        )
    )
    
    (define greet (lambda () (print (quote (Hello)))))
    (repeat 5 greet)

`);
