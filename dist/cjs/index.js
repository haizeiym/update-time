"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var NONE = -1;
var INFINITY = Number.MAX_VALUE;
var timeId = 0;
var UTime = /** @class */ (function () {
    function UTime() {
    }
    /**
     * 添加一个计时器
     * @param duration 间隔时间(毫秒)
     * @param loopcall 循环回调
     * @param loopcount 循环次数
     * @param endcall 结束回调
     * @returns 计时器ID
     */
    UTime.addTime = function (duration, loopcall, loopcount, endcall, objcleanup) {
        if (loopcount === void 0) { loopcount = INFINITY; }
        var id = ++timeId;
        var now = Date.now();
        var newTimer = {
            id: id,
            duration: duration,
            curtime: now,
            loopcount: loopcount,
            loopcountcur: 0,
            loopcall: loopcall,
            endcall: endcall,
            objcleanup: objcleanup,
            next: undefined
        };
        // 如果正在更新中，将计时器加入待处理队列
        if (this._isUpdating) {
            this._pendingTimers.push(newTimer);
        }
        else {
            // 直接添加到链表头部
            newTimer.next = this._timeList || undefined;
            this._timeList = newTimer;
        }
        return id;
    };
    /**
     * 添加一个一次性计时器
     */
    UTime.addTimeOnce = function (duration, callback) {
        return this.addTime(duration, callback, 1);
    };
    /**
     * 移除指定ID的计时器
     */
    UTime.removeTime = function (id) {
        // 首先检查待处理队列
        var pendingIndex = this._pendingTimers.findIndex(function (timer) { return timer.id === id; });
        if (pendingIndex !== -1) {
            var timer = this._pendingTimers[pendingIndex];
            this._cleanupTimer(timer);
            this._pendingTimers.splice(pendingIndex, 1);
            return;
        }
        // 然后检查主链表
        var current = this._timeList;
        var prev = null;
        while (current) {
            if (current.id === id) {
                if (prev) {
                    prev.next = current.next;
                }
                else {
                    this._timeList = current.next;
                }
                this._pendingCleanupTimers.push(current);
                return;
            }
            prev = current;
            current = current.next;
        }
    };
    /**
     * 为对象添加计时器
     */
    UTime.addObjTime = function (obj, duration, callback, loopcount, endcall) {
        var _this = this;
        var _a;
        if (loopcount === void 0) { loopcount = INFINITY; }
        if (!obj || typeof obj !== "object") {
            if (!obj) {
                console.error("addObjTime: Object parameter is null or undefined");
            }
            else {
                console.error("addObjTime: Object parameter must be an object, got ".concat(typeof obj));
            }
            return NONE;
        }
        if (!this._objTimeMap.has(obj)) {
            this._objTimeMap.set(obj, new Set());
        }
        var id = this.addTime(duration, callback, loopcount, typeof endcall === "function" ? endcall : undefined, function () {
            var timerSet = _this._objTimeMap.get(obj);
            if (timerSet) {
                timerSet.delete(id);
                if (timerSet.size === 0) {
                    _this._objTimeMap.delete(obj);
                }
            }
        });
        (_a = this._objTimeMap.get(obj)) === null || _a === void 0 ? void 0 : _a.add(id);
        return id;
    };
    /**
     * 为对象添加一次性计时器
     */
    UTime.addObjTimeOnce = function (obj, duration, callback) {
        if (!obj || typeof obj !== "object") {
            if (!obj) {
                console.error("addObjTimeOnce: Object parameter is null or undefined");
            }
            else {
                console.error("addObjTimeOnce: Object parameter must be an object, got ".concat(typeof obj));
            }
            return NONE;
        }
        return this.addObjTime(obj, duration, callback, 1);
    };
    /**
     * 移除对象的所有计时器
     */
    UTime.removeObjTime = function (obj) {
        var _this = this;
        if (!obj || typeof obj !== "object") {
            if (!obj) {
                console.error("removeObjTime: Object parameter is null or undefined");
            }
            else {
                console.error("removeObjTime: Object parameter must be an object, got ".concat(typeof obj));
            }
            return;
        }
        var timerSet = this._objTimeMap.get(obj);
        if (timerSet) {
            timerSet.forEach(function (id) { return _this.removeTime(id); });
            this._objTimeMap.delete(obj);
        }
    };
    /**
     * 移除对象的指定计时器
     */
    UTime.removeObjTimeById = function (obj, id) {
        if (!obj || typeof obj !== "object" || id === NONE) {
            if (!obj) {
                console.error("removeObjTimeById: Object parameter is null or undefined");
            }
            else if (typeof obj !== "object") {
                console.error("removeObjTimeById: Object parameter must be an object, got ".concat(typeof obj));
            }
            return NONE;
        }
        this.removeTime(id);
        return NONE;
    };
    /**
     * 清除所有计时器
     */
    UTime.clear = function () {
        var _this = this;
        // 清理所有计时器的回调函数引用
        var current = this._timeList;
        while (current) {
            var next = current.next;
            this._cleanupTimer(current);
            current = next;
        }
        // 清理待处理队列中的计时器
        this._pendingTimers.forEach(function (timer) { return _this._cleanupTimer(timer); });
        // 清理待清理队列中的计时器
        this._pendingCleanupTimers.forEach(function (timer) { return _this._cleanupTimer(timer); });
        this._timeList = undefined;
        this._objTimeMap.clear();
        this._isUpdating = false;
        this._pendingTimers.length = 0;
        this._pendingCleanupTimers.length = 0;
        timeId = 0;
    };
    /**
     * 清理定时器对象的通用方法
     */
    UTime._cleanupTimer = function (timer) {
        if (timer.id === NONE)
            return;
        if (timer.objcleanup) {
            timer.objcleanup();
            timer.objcleanup = undefined;
        }
        timer.id = NONE;
        timer.duration = 0;
        timer.curtime = 0;
        timer.loopcount = 0;
        timer.loopcountcur = 0;
        timer.loopcall = function () { return void 0; };
        timer.endcall = undefined;
    };
    /**
     * 获取统计信息
     */
    UTime.getStats = function () {
        var activeTimerCount = 0;
        var current = this._timeList;
        while (current) {
            activeTimerCount++;
            current = current.next;
        }
        return {
            activeTimers: activeTimerCount,
            pendingTimers: this._pendingTimers.length,
            objectTimers: this._objTimeMap.size
        };
    };
    /**
     * 更新所有计时器
     */
    UTime.update = function () {
        var _a, _b, _c;
        if (((_a = this._timeList) === null || _a === void 0 ? void 0 : _a.id) === NONE) {
            this._timeList = (_b = this._timeList) === null || _b === void 0 ? void 0 : _b.next;
        }
        if (!this._timeList)
            return;
        this._isUpdating = true;
        var now = Date.now();
        var current = this._timeList;
        var prev = null;
        while (current) {
            if (current.id === NONE) {
                prev = current;
                current = current.next;
                continue;
            }
            if (current.duration === 0 || (current.duration > 0 && now - current.curtime >= current.duration)) {
                var nextNode = current.next;
                current.loopcall();
                current.loopcountcur++;
                if (current.loopcount > current.loopcountcur) {
                    current.curtime = now;
                    prev = current;
                    current = nextNode;
                }
                else {
                    if (current.objcleanup) {
                        current.objcleanup();
                        current.objcleanup = undefined;
                    }
                    (_c = current.endcall) === null || _c === void 0 ? void 0 : _c.call(current);
                    if (prev) {
                        prev.next = nextNode;
                    }
                    else {
                        this._timeList = nextNode;
                    }
                    this._pendingCleanupTimers.push(current);
                    current = nextNode;
                }
            }
            else {
                prev = current;
                current = current.next;
            }
        }
        this._isUpdating = false;
        for (var _i = 0, _d = this._pendingCleanupTimers; _i < _d.length; _i++) {
            var timer = _d[_i];
            this._cleanupTimer(timer);
        }
        this._pendingCleanupTimers.length = 0;
        if (this._pendingTimers.length > 0) {
            for (var _e = 0, _f = this._pendingTimers; _e < _f.length; _e++) {
                var timer = _f[_e];
                timer.next = this._timeList || undefined;
                this._timeList = timer;
            }
            this._pendingTimers.length = 0;
        }
    };
    UTime._timeList = undefined;
    UTime._objTimeMap = new Map();
    UTime._isUpdating = false;
    UTime._pendingTimers = [];
    UTime._pendingCleanupTimers = [];
    return UTime;
}());
exports.default = UTime;
