"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var timeId = 0;
var UTime = /** @class */ (function () {
    function UTime() {
    }
    /**
     * 清理定时器对象的通用方法
     */
    UTime._cleanupTimer = function (timer) {
        // 只执行对象清理，不执行用户的 endcall
        if (timer.__objCleanup) {
            timer.__objCleanup();
            timer.__objCleanup = undefined;
        }
        // 清理回调函数引用，帮助垃圾回收
        timer.loopcall = function () { };
        timer.endcall = undefined;
        timer.next = undefined;
        // 清理其他属性，确保完全失效
        timer.id = -1;
        timer.duration = 0;
        timer.curtime = 0;
        timer.loopcount = 0;
        timer.loopcountcur = 0;
    };
    /**
     * 添加一个计时器
     * @param duration 间隔时间(毫秒)
     * @param loopcall 循环回调
     * @param loopcount 循环次数
     * @param endcall 结束回调
     * @returns 计时器ID
     */
    UTime.addTime = function (duration, loopcall, loopcount, endcall) {
        if (loopcount === void 0) { loopcount = Number.MAX_VALUE; }
        var id = ++timeId;
        var now = Date.now();
        var newTimer = {
            id: id,
            duration: duration,
            curtime: now,
            loopcall: loopcall,
            loopcount: loopcount,
            loopcountcur: 0,
            endcall: endcall,
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
        this._hasActiveTimers = true;
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
                this._cleanupTimer(current);
                this._hasActiveTimers = this._timeList !== undefined;
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
        if (loopcount === void 0) { loopcount = Number.MAX_VALUE; }
        if (!obj || typeof obj !== 'object') {
            if (!obj) {
                console.error("addObjTime: Object parameter is null or undefined");
            }
            else {
                console.error("addObjTime: Object parameter must be an object, got ".concat(typeof obj));
            }
            return -1;
        }
        if (!this._objTimeMap.has(obj)) {
            this._objTimeMap.set(obj, new Set());
        }
        // 创建对象清理函数
        var objCleanup = function () {
            var timerSet = _this._objTimeMap.get(obj);
            if (timerSet) {
                timerSet.delete(id);
                if (timerSet.size === 0) {
                    _this._objTimeMap.delete(obj);
                }
            }
        };
        var id = this.addTime(duration, callback, loopcount, function () {
            objCleanup();
            endcall === null || endcall === void 0 ? void 0 : endcall();
        });
        // 为对象定时器添加特殊的清理标记
        if (this._isUpdating) {
            // 如果是待处理队列中的定时器，直接标记
            var pendingTimer = this._pendingTimers[this._pendingTimers.length - 1];
            if (pendingTimer && pendingTimer.id === id) {
                pendingTimer.__objCleanup = objCleanup;
            }
        }
        else {
            // 如果是主链表中的定时器，标记
            var timer = this._timeList;
            if (timer && timer.id === id) {
                timer.__objCleanup = objCleanup;
            }
        }
        (_a = this._objTimeMap.get(obj)) === null || _a === void 0 ? void 0 : _a.add(id);
        return id;
    };
    /**
     * 为对象添加一次性计时器
     */
    UTime.addObjTimeOnce = function (obj, duration, callback) {
        if (!obj || typeof obj !== 'object') {
            if (!obj) {
                console.error("addObjTimeOnce: Object parameter is null or undefined");
            }
            else {
                console.error("addObjTimeOnce: Object parameter must be an object, got ".concat(typeof obj));
            }
            return -1;
        }
        return this.addObjTime(obj, duration, callback, 1);
    };
    /**
     * 移除对象的所有计时器
     */
    UTime.removeObjTime = function (obj) {
        var _this = this;
        if (!obj || typeof obj !== 'object') {
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
        if (!obj || typeof obj !== 'object' || id === -1) {
            if (!obj) {
                console.error("removeObjTimeById: Object parameter is null or undefined");
            }
            else if (typeof obj !== 'object') {
                console.error("removeObjTimeById: Object parameter must be an object, got ".concat(typeof obj));
            }
            return -1;
        }
        var timerSet = this._objTimeMap.get(obj);
        if (timerSet) {
            timerSet.delete(id);
            if (timerSet.size === 0) {
                this._objTimeMap.delete(obj);
            }
            this.removeTime(id);
        }
        return -1;
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
        this._timeList = undefined;
        this._objTimeMap.clear();
        this._hasActiveTimers = false;
        this._isUpdating = false;
        this._pendingTimers.length = 0;
        timeId = 0;
    };
    /**
     * 清理无效的对象引用（可选的手动清理）
     */
    UTime.cleanup = function () {
        var _this = this;
        // 清理可能已经被垃圾回收的对象
        this._objTimeMap.forEach(function (timerSet, obj) {
            if (!obj || timerSet.size === 0) {
                _this._objTimeMap.delete(obj);
            }
        });
        // 清理主链表中的无效定时器
        var current = this._timeList;
        var prev = null;
        while (current) {
            if (current.id === -1 || current.duration === 0) {
                if (prev) {
                    prev.next = current.next;
                }
                else {
                    this._timeList = current.next;
                }
                var next = current.next;
                this._cleanupTimer(current);
                current = next;
            }
            else {
                prev = current;
                current = current.next;
            }
        }
        // 清理待处理队列中的无效定时器
        this._pendingTimers = this._pendingTimers.filter(function (timer) {
            if (timer.id === -1 || timer.duration === 0) {
                _this._cleanupTimer(timer);
                return false;
            }
            return true;
        });
        this._hasActiveTimers = this._timeList !== undefined;
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
            objectTimers: this._objTimeMap.size,
            isUpdating: this._isUpdating,
            hasActiveTimers: this._hasActiveTimers
        };
    };
    /**
     * 更新所有计时器
     */
    UTime.update = function () {
        var _a;
        if (!this._hasActiveTimers)
            return;
        this._isUpdating = true;
        var now = Date.now();
        var current = this._timeList;
        var prev = null;
        while (current) {
            if (current.duration <= 0 || now - current.curtime >= current.duration) {
                var nextNode = current.next;
                current.loopcall();
                current.loopcountcur++;
                if (current.loopcount > current.loopcountcur) {
                    current.curtime = now;
                    prev = current;
                    current = nextNode;
                }
                else {
                    (_a = current.endcall) === null || _a === void 0 ? void 0 : _a.call(current);
                    if (prev) {
                        prev.next = nextNode;
                    }
                    else {
                        this._timeList = nextNode;
                    }
                    current = nextNode;
                }
            }
            else {
                prev = current;
                current = current.next;
            }
        }
        this._isUpdating = false;
        if (this._pendingTimers.length > 0) {
            for (var _i = 0, _b = this._pendingTimers; _i < _b.length; _i++) {
                var timer = _b[_i];
                timer.next = this._timeList || undefined;
                this._timeList = timer;
            }
            this._pendingTimers.length = 0;
        }
        this._hasActiveTimers = this._timeList !== undefined;
    };
    UTime._timeList = undefined;
    UTime._objTimeMap = new Map();
    UTime._hasActiveTimers = false;
    UTime._isUpdating = false;
    UTime._pendingTimers = [];
    return UTime;
}());
exports.default = UTime;
