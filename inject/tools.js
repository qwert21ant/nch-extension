var MY_COST_LIMIT = COST_LIMIT;

CrowdScript.execute = function(parsed, funcName, args, sprites) {
    let compiledFuncs = {};

    let context = new function() {
        let self = this;
        this.sprites = sprites;
        this.vars = [];
        this.funcs = [];
        this.ret = null;
        this.stack = [];
        this.costSpent = 0;
        this.costLimit = MY_COST_LIMIT;

        this['return'] = function(a) {
            self.ret = a;
        };
        this['throw'] = function(e) {
            throw {
                'kind': 'runtime',
                'stack': _cloneObj(self.stack),
                'msg': e,
            }
        };
        this.makeDict = function() {
            let that = this;
            let ret = new AVLTree(function(e) { that['throw'](e) }, function(a, b) { return a.$less ? a.$less(a, b) : a < b });
            for (let i = 0; i < arguments.length; i += 2) {
                ret.set(arguments[i], arguments[i + 1]);
            }
            return ret;
        };
        this.makeRecord = function(lessFn) {
            return function() {
                let that = this;
                let ret = lessFn ? {'$less': lessFn} : {};
                for (let i = 0; i < arguments.length; i += 2) {
                    ret[arguments[i]] = arguments[i + 1];
                }
                return ret;
            }
        };
        this.dictKeys = function(dict) {
            let ret = dict.keys();
            self.costSpent += ret.length;
            if (self.costSpent >= self.costLimit) {
                self['throw']("Execution cost exceeded");
            }
            return ret;
        }
        this.divide = function(a, b) {
            try {
                return a / b
            } catch {
                self['throw']("Operation resulted in an invalid integer.");
            }
        }
        this.parseInt = function(a) {
            try {
                return BigInt(a);
            } catch {
                self['throw']("Operation resulted in an invalid integer.");
            }
        };
        this.listElem = function(t, list, idx) {
            let ret = new ElemAccessor();
            ret['throw'] = self['throw'];
            ret.t = t;
            ret.collection = list;
            ret.index = idx;
            return ret;
        }
        this.nullCheck = function(a) {
            if (a == null) {
                self['throw']("Null pointer exception");
            }
            return a;
        }
        this.funcCall = function(func, args) {
            let savedVars = self.vars;

            self.vars = args;
            self.ret = null;

            self.stack.push({'func': func.funcName});

            let gen = func.fn(self);
            while (true) {
                let n = gen.next();
                if (!n.done) /*console.log*/(_cloneObj(n.value));
                else break;
            }
            self.stack.pop();

            self.vars = savedVars;
            return self.ret;
        }
    };

    for (let funcName in parsed.funcs) {
        context.funcs[funcName] = { 'fn': eval("(function*(context) { " + parsed.funcs[funcName].body + "})"), 'name': funcName };
    }

    let argsProcessed = {};
    let argSpecs = parsed.funcs[funcName].args;
    for (let i = 0; i < argSpecs.length; ++ i) {
        let argSpec = argSpecs[i];
        argsProcessed[argSpec.name] = CrowdScript.processArgument(context, argSpec.name, argSpec.type, args[argSpec.name]);
    }

    return context.funcCall(context.funcs[funcName], argsProcessed);
}