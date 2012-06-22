// Generated by CoffeeScript 1.3.1

/*
  Copyright (C) 2012 Copperflake <http://www.copperflake.com>

  Permission is hereby granted, free of charge, to any person obtaining
  a copy of this software and associated documentation files (the
  "Software"), to deal in the Software without restriction, including
  without limitation the rights to use, copy, modify, merge, publish,
  distribute, sublicense, and/or sell copies of the Software, and to
  permit persons to whom the Software is furnished to do so, subject to
  the following conditions:

  The above copyright notice and this permission notice shall be included
  in all copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
  EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
  MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
  IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
  CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
  TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
  SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/


(function() {
  var FlowingContext, StepDelegate, delay, flowing, flowing_typeof, tag,
    __slice = [].slice;

  flowing_typeof = function(v) {
    if (Array.isArray(v)) {
      return "array";
    } else {
      return typeof v;
    }
  };

  delay = function(fn) {
    return process.nextTick(fn);
  };

  FlowingContext = (function() {

    FlowingContext.name = 'FlowingContext';

    function FlowingContext(steps, params, cb) {
      this.steps = steps;
      this.params = params;
      this.cb = cb;
      this.step = -1;
      this.data = {};
      this.done = false;
    }

    FlowingContext.prototype.jump = function(label) {
      var i, idx, step, _i, _len, _ref;
      _ref = this.steps;
      for (i = _i = 0, _len = _ref.length; _i < _len; i = ++_i) {
        step = _ref[i];
        if (step._label === label) {
          idx = i;
          break;
        }
      }
      if (!(idx != null)) {
        this.exit_fail(new Error("Jump to an undefined label '" + label + "'"));
        return false;
      }
      this.step = idx - 1;
      return true;
    };

    FlowingContext.prototype.exit_success = function(args) {
      if (this.done) {
        return;
      }
      if (typeof this.cb === "function") {
        args.unshift(void 0);
        this.cb.apply(null, args);
      }
      this.done = true;
    };

    FlowingContext.prototype.exit_fail = function(e) {
      if (this.done) {
        return;
      }
      if (typeof this.cb === "function") {
        this.cb(e);
      } else if (typeof flowing.trap === "function") {
        flowing.trap(e, new Error("Flowing Trap"));
      }
      this.done = true;
    };

    FlowingContext.prototype.exit = function(e, args) {
      if (e) {
        return this.exit_fail(e);
      } else {
        return this.exit_success(args);
      }
    };

    FlowingContext.prototype.next = function(e, args) {
      var step,
        _this = this;
      if (this.done) {
        return;
      }
      try {
        while (step = this.steps[++this.step]) {
          if ((!!e === !!step._error) && (!(step._filter != null) || step._filter(e))) {
            break;
          }
        }
        if (step) {
          if (step._flow) {
            step.apply(null, __slice.call(args).concat([function() {
              var args, e;
              e = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
              return _this.next(e, args);
            }]));
          } else if (step._delay) {
            delay(function() {
              return _this.run(step, e, args);
            });
          } else {
            this.run(step, e, args);
          }
        } else {
          this.exit(e, args);
        }
      } catch (e) {
        this.exit_fail(e);
      }
    };

    FlowingContext.prototype.run = function(step, e, args) {
      var delegate, result;
      delegate = new StepDelegate(this);
      if (e) {
        args = [e];
      }
      try {
        result = step.apply(delegate, args);
      } catch (e) {
        delegate.error(e);
      }
      delegate._parallel_unlock();
      if (delegate._done || delegate._async || step._async) {
        return;
      }
      return delegate.done(result);
    };

    return FlowingContext;

  })();

  StepDelegate = (function() {

    StepDelegate.name = 'StepDelegate';

    function StepDelegate(ctx) {
      this.ctx = ctx;
      this._done = false;
      this._async = false;
      this.data = this.ctx.data;
      this._p_count = 0;
      this._p_done = 0;
      this._p_idx = 0;
      this._p_args = [];
      this._p_lock = true;
    }

    StepDelegate.prototype.set = function(name, value) {
      var key, val;
      if (typeof name === "object") {
        for (key in name) {
          val = name[key];
          this.ctx.data[key] = val;
        }
      } else {
        this.ctx.data[name] = value;
      }
    };

    StepDelegate.prototype.get = function(name) {
      return this.ctx.data[name];
    };

    StepDelegate.prototype.next = function() {
      var _this = this;
      this._async = true;
      return function() {
        var args, e;
        e = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
        if (_this._done) {
          return;
        } else {
          _this._done = true;
        }
        _this.ctx.next(e, args);
      };
    };

    StepDelegate.prototype.goto = function() {
      var args, label;
      label = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      if (this._done) {
        return;
      } else {
        this._done = true;
      }
      if (this.ctx.jump(label)) {
        this.ctx.next(void 0, args);
      }
    };

    StepDelegate.prototype.jump = function() {
      var args, label;
      label = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      if (this._done) {
        return;
      }
      return this.ctx.jump(label);
    };

    StepDelegate.prototype.done = function() {
      var args;
      args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      if (this._done) {
        return;
      } else {
        this._done = true;
      }
      this.ctx.next(void 0, args);
    };

    StepDelegate.prototype.error = function(e) {
      if (this._done) {
        return;
      } else {
        this._done = true;
      }
      this.ctx.next(e, []);
    };

    StepDelegate.prototype.exit = function() {
      var args;
      args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      if (this._done) {
        return;
      } else {
        this._done = true;
      }
      this.ctx.exit_success(args);
    };

    StepDelegate.prototype.fail = function(e) {
      if (this._done) {
        return;
      } else {
        this._done = true;
      }
      this.ctx.exit_fail(e);
    };

    StepDelegate.prototype.partial = function() {
      var arg, args, _i, _len;
      args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      if (this._done) {
        return;
      }
      this._async = true;
      this._p_count++;
      this._p_done++;
      for (_i = 0, _len = args.length; _i < _len; _i++) {
        arg = args[_i];
        this._p_args[this._p_idx++] = arg;
      }
    };

    StepDelegate.prototype.parallel = function() {
      this._async = true;
      return this._parallel_callback(this._p_args, this._p_idx++);
    };

    StepDelegate.prototype.group = function() {
      var local_args, local_idx,
        _this = this;
      this._async = true;
      local_args = this._p_args[this._p_idx++] = [];
      local_idx = 0;
      return function() {
        return _this._parallel_callback(local_args, local_idx++);
      };
    };

    StepDelegate.prototype._parallel_callback = function(arr, idx) {
      var _this = this;
      this._p_count++;
      arr[idx] = void 0;
      return function() {
        var args, e;
        e = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
        if (_this._done) {
          return;
        }
        if (e) {
          _this.error(e);
        } else {
          if (args.length > 0) {
            arr[idx] = args.length === 1 ? args[0] : args;
          }
          _this._parallel_done();
        }
      };
    };

    StepDelegate.prototype._parallel_done = function() {
      this._p_done++;
      this._parallel_flush();
    };

    StepDelegate.prototype._parallel_unlock = function() {
      this._p_lock = false;
      this._parallel_flush();
    };

    StepDelegate.prototype._parallel_flush = function() {
      if (this._p_lock || this._done) {
        return;
      }
      if (this._p_count > 0 && this._p_count === this._p_done) {
        this._done = true;
        this.ctx.next(void 0, this._p_args);
      }
    };

    return StepDelegate;

  })();

  flowing = function() {
    var args, flow, steps, _ref;
    args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
    if (args.length === 1 && ((_ref = args[0]) != null ? _ref._flow : void 0)) {
      return args[0];
    }
    steps = flowing.normalize(args);
    flow = function() {
      var args, cb, ctx, _i;
      args = 2 <= arguments.length ? __slice.call(arguments, 0, _i = arguments.length - 1) : (_i = 0, []), cb = arguments[_i++];
      if (typeof cb !== "function") {
        args.push(cb);
        cb = void 0;
      }
      ctx = new FlowingContext(steps, args, cb);
      ctx.next(void 0, args);
    };
    flow._flow = true;
    flow.steps = steps;
    flow.exec = function() {
      var args;
      args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      return flow.apply(null, __slice.call(args).concat([void 0]));
    };
    return flow;
  };

  flowing.exec = function() {
    var flow;
    flow = flowing.apply(null, arguments);
    return flow.exec();
  };

  flowing.trap = null;

  flowing.normalize = function(step) {
    var fn, s, steps, tag, _i, _len;
    switch (flowing_typeof(step)) {
      case "function":
        return [step];
      case "array":
        steps = [];
        for (_i = 0, _len = step.length; _i < _len; _i++) {
          s = step[_i];
          steps = steps.concat(flowing.normalize(s));
        }
        return steps;
      case "object":
        steps = [];
        for (tag in step) {
          fn = step[tag];
          if (typeof fn !== "function") {
            throw new Error("Unable to label '" + fn + "'");
          }
          fn._label = tag;
          steps.push(fn);
        }
        return steps;
      default:
        throw new Error("Invalid flow step '" + step + "'");
    }
  };

  tag = function(step, tag) {
    var labels;
    switch (flowing_typeof(step)) {
      case "function":
        step["_" + tag] = true;
        break;
      case "object":
        labels = Object.keys(step);
        if (labels.length > 1) {
          throw new Error("Flow branching is not allowed");
        }
        step = step[labels[0]];
        step._label = labels[0];
        step["_" + tag] = true;
        break;
      default:
        throw new Error("Unable to tag '" + step + "'");
    }
    return step;
  };

  flowing.error = function(filter, step) {
    if (!(step != null)) {
      step = filter;
      filter = void 0;
    }
    step = tag(step, "error");
    if (typeof filter === "function") {
      step._filter = filter;
    }
    return step;
  };

  flowing.async = function(step) {
    return tag(step, "async");
  };

  flowing.delayed = function(step) {
    return tag(step, "delay");
  };

  flowing.version = "0.5.5";

  module.exports = flowing;

}).call(this);
