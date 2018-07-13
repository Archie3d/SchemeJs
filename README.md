# SchemeJs
Tiny Scheme interpreter in JavaScript.

Example:
```js
let scheme = new Scheme();
var res = scheme.do(`
    (define fact (lambda (n) (if (<= n 1) 1 (* n (fact (- n 1))))))
    (fact 10)
`);
console.log(res);
```

The interpreter implementation is inspired by [lis.py](https://github.com/norvig/pytudes/blob/master/py/lis.py).
